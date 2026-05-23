import { Delay } from './Delay.js'

/**
 * @typedef {Object} Position
 * @property {number} x - X coordinate in pixels
 * @property {number} y - Y coordinate in pixels
 */

/**
 * Animator class for managing CSS-based animations on DOM elements
 *
 * Provides instance-based animation management with element lifecycle (creation,
 * positioning, scaling) and class-based static utilities for common animation
 * patterns. Handles animation timing via animationend events and forceful style
 * recalculation for restarting CSS animations.
 *
 * @class Animator
 */
export class Animator {
  /**
   * Creates an Animator instance for managing CSS-based animations
   *
   * Initializes animation element(s) with optional inner element for complex
   * animations. Can optionally remove existing elements with the same class
   * to prevent duplicates. Container can be specified by ID or element reference.
   *
   * @constructor
   * @param {string} className - CSS class name(s) for the animation element
   * @param {string|null|undefined} [containerId=null] - ID of the container element
   * @param {HTMLElement|null} [container=null] - Container element (takes precedence over containerId)
   * @param {boolean} [removeExisting=true] - Whether to remove existing elements with the same class
   * @param {...string} innerDivClassNames - Additional class names for inner div elements
   */
  constructor (
    className,
    containerId,
    container,
    removeExisting = true,
    ...innerDivClassNames
  ) {
    if (removeExisting) {
      this._removeExistingElements(className)
    }
    /** @type {HTMLDivElement} */
    this.el = this._createElement(className)
    /** @type {HTMLElement|null} */
    this.container =
      container ||
      (typeof containerId === 'string'
        ? document.getElementById(containerId)
        : null)
    /** @type {HTMLDivElement|null} */
    this.innerEl = this._createInnerElement(innerDivClassNames)
    /** @type {boolean} */
    this.running = false
    /** @type {number|null} */
    this.innerDelay = null
  }

  /**
   * Removes existing elements with the given class name
   *
   * Selects all elements matching all classes (multiple classes use AND logic)
   * and removes them from the DOM.
   *
   * @private
   * @param {string} className - Space-separated CSS class names to remove elements for
   * @returns {void}
   */
  _removeExistingElements (className) {
    const selector = className
      .trim()
      .split(/\s+/)
      .map(c => `.${c}`)
      .join('')
    const nodes = document.querySelectorAll(selector)
    nodes.forEach(el => el.remove())
  }

  /**
   * Creates the main animation element
   *
   * Creates a div element and applies the provided CSS classes.
   *
   * @private
   * @param {string} className - Space-separated CSS classes for the element
   * @returns {HTMLDivElement} The created div element
   */
  _createElement (className) {
    const el = document.createElement('div')
    el.className = className
    return el
  }

  /**
   * Creates the inner element if class names are provided
   *
   * Creates a nested div with specified classes and appends to main element.
   * Used for complex animations with separate inner/outer scaling or effects.
   *
   * @private
   * @param {string[]} classNames - CSS class names for inner element
   * @returns {HTMLDivElement|null} Inner element or null if no class names provided
   */
  _createInnerElement (classNames) {
    if (!classNames.length) return null
    const innerEl = document.createElement('div')
    innerEl.className = classNames[0]
    innerEl.classList.add(...classNames.slice(1))
    this.el.appendChild(innerEl)
    return innerEl
  }
  /**
   * Moves the animation element to the specified position relative to the container
   *
   * Calculates relative coordinates based on container's bounding rectangle
   * and sets CSS custom properties --x and --y for animation positioning.
   *
   * @param {Position} end - Target position with x and y coordinates (absolute page coordinates)
   * @returns {void}
   *
   * @example
   * animator.moveTo({ x: 100, y: 200 })
   */
  moveTo (end) {
    const containerRect = this.containerRect
    const relX = end.x - containerRect.left
    const relY = end.y - containerRect.top
    this.el.style.setProperty('--x', `${relX}px`)
    this.el.style.setProperty('--y', `${relY}px`)
  }

  /**
   * Sets scale properties for the inner element animation
   *
   * Sets CSS custom properties --scale-start and --scale-end for use in
   * scaling animations via CSS keyframes.
   *
   * @param {number|string} start - Starting scale value (e.g., 0, '0.5')
   * @param {number|string} end - Ending scale value (e.g., 1, '1.5')
   * @returns {void}
   */
  scaleInner (start, end) {
    this.setInnerProperty('--scale-start', `${start}`)
    this.setInnerProperty('--scale-end', `${end}`)
  }

  /**
   * Sets a CSS custom property on the inner element
   *
   * Sets a CSS property via setProperty() method. Safe to call even if
   * innerEl is null (operation is skipped).
   *
   * @param {string} name - CSS custom property name (e.g., '--color', '--duration')
   * @param {string} value - CSS property value
   * @returns {void}
   */
  setInnerProperty (name, value) {
    this.innerEl?.style?.setProperty(name, value)
  }

  /**
   * Applies default styling to the inner element
   *
   * Sets position, inset (all sides to 0), transform, width, and height
   * to fill the parent element. Prepares inner element for CSS animations.
   *
   * @returns {void}
   */
  styleInner () {
    if (!this.innerEl) return
    this.innerEl.style.position = 'absolute'
    this.innerEl.style.inset = '0'
    this.innerEl.style.transform = 'none'
    this.innerEl.style.width = '100%'
    this.innerEl.style.height = '100%'
  }

  /**
   * Sets a delay for the inner element animation
   *
   * Stores the delay value (in milliseconds) for use with CSS animation-delay.
   * Actual application to CSS is caller's responsibility.
   *
   * @param {number} delay - Delay in milliseconds
   * @returns {void}
   */
  delayInner (delay) {
    this.innerDelay = delay
  }

  /**
   * Gets the bounding rectangle of the container
   *
   * Returns container's bounding rect, or document element rect if
   * container is not available. Throws if neither is available.
   *
   * @returns {DOMRect} Container's bounding rectangle
   * @throws {Error} If container is not available
   */
  get containerRect () {
    const container = this.container || document.documentElement
    if (!container) {
      throw new Error('Animator container is not available')
    }
    return container.getBoundingClientRect()
  }

  /**
   * Adds a shake effect class to the container
   *
   * Adds a CSS class to the container element to trigger shake/vibration effects.
   * Safe to call if container is null.
   *
   * @param {string} shakeClass - CSS class name for shaking effect
   * @returns {void}
   */
  shake (shakeClass) {
    this.container?.classList.add(shakeClass)
  }

  /**
   * Removes a shake effect class from the container
   *
   * Removes a CSS class from the container element to stop shake/vibration effects.
   * Safe to call if container is null.
   *
   * @param {string} shakeClass - CSS class name to remove
   * @returns {void}
   */
  endShake (shakeClass) {
    this.container?.classList.remove(shakeClass)
  }
  /**
   * Gets the element that should be animated
   *
   * Returns inner element if it exists (for complex animations),
   * otherwise returns main element.
   *
   * @returns {HTMLElement} The playable element (inner or main)
   */
  get playable () {
    return this.innerEl || this.el
  }
  /**
   * Runs the complete animation sequence from start to finish
   *
   * Manages full animation lifecycle: starts animation, waits for completion,
   * allows brief delay, then removes element from DOM. Guards against concurrent
   * runs via running flag.
   *
   * @async
   * @param {...string} animationClasses - CSS classes to trigger the animation
   * @returns {Promise<void>} Resolves when animation and cleanup complete
   *
   * @example
   * await animator.run('fade-in', 'slide')
   */
  async run (...animationClasses) {
    if (this.running) return
    this.running = true
    this._startAnimation(...animationClasses)
    await this._waitForAnimation()
    await Delay.wait(5)
    this.el.remove()
    this.running = false
  }

  /**
   * Starts the animation by playing the animation classes
   *
   * Internal method that invokes play() with animation classes.
   *
   * @private
   * @param {...string} animationClasses - CSS classes to animate
   * @returns {void}
   */
  _startAnimation (...animationClasses) {
    this.play(...animationClasses)
  }

  /**
   * Waits for the animation to complete on the playable element
   *
   * Uses static wait() method to listen for animationend event.
   *
   * @private
   * @async
   * @returns {Promise<void>} Resolves when animation ends
   */
  async _waitForAnimation () {
    await Animator.wait(this.playable)
  }

  /**
   * Handles delay for inner element if set.
   * @private
   * @returns {Promise<void>}
   */
  /**
   * Plays the animation by adding classes and forcing style recalculation
   *
   * Resets animation classes, appends element to container, forces style recalculation
   * to restart CSS animations, then adds animation classes. Does nothing if container
   * is unavailable.
   *
   * @param {...string} animationClasses - CSS classes to trigger animation (defaults to 'play')
   * @returns {void}
   */
  play (...animationClasses) {
    const classes = animationClasses.length ? animationClasses : ['play']
    this._resetClasses(classes)
    const container =
      this.container || document.body || document.documentElement
    if (!container) {
      return
    }
    container.appendChild(this.el)
    this._forceStyleRecalculation()
    this._addClasses(classes)
  }
  /**
   * Resets animation classes on elements
   *
   * Removes animation classes from both main and inner elements.
   * Used to allow re-triggering of CSS animations.
   *
   * @private
   * @param {string[]} classes - CSS class names to remove
   * @returns {void}
   */
  _resetClasses (classes) {
    this.el.classList.remove(...classes)
    this.innerEl?.classList.remove(...classes)
  }

  /**
   * Forces CSS style recalculation to restart animations
   *
   * Triggers a forced reflow by reading bounding rect, which forces the browser
   * to recalculate styles. Allows CSS animations to restart even if classes
   * were already present.
   *
   * @private
   * @returns {void}
   */
  _forceStyleRecalculation () {
    this.playable.getBoundingClientRect()
  }

  /**
   * Adds animation classes to the playable element
   *
   * Applies CSS classes to trigger animation. Classes should be defined
   * in CSS with @keyframes animations.
   *
   * @private
   * @param {string[]} classes - CSS class names to add
   * @returns {void}
   */
  _addClasses (classes) {
    this.playable.classList.add(...classes)
  }
  /**
   * Runs animation on a given element
   *
   * Plays animation classes on an element, waits for completion via animationend event,
   * then removes the animation classes. Does not remove the element.
   *
   * @static
   * @async
   * @param {HTMLElement} el - Element to animate
   * @param {...string} animationClasses - CSS class names to trigger animation
   * @returns {Promise<void>} Resolves when animation completes
   *
   * @example
   * await Animator.run(element, 'fade-in')
   */
  static async run (el, ...animationClasses) {
    Animator.play(el, ...animationClasses)
    await Animator.wait(el)
    el.classList.remove(...animationClasses)
  }

  /**
   * Runs animation on an element with a specified delay
   *
   * Waits for the delay period, then runs the animation.
   * Useful for sequential or staggered animations.
   *
   * @static
   * @async
   * @param {HTMLElement} el - Element to animate
   * @param {number} delay - Delay in milliseconds before starting animation
   * @param {...string} animationClasses - CSS class names to trigger animation
   * @returns {Promise<void>} Resolves when animation completes
   */
  static async runWithDelay (el, delay, ...animationClasses) {
    await Delay.wait(delay)
    await Animator.run(el, ...animationClasses)
  }

  /**
   * Runs animation on an element with a random delay
   *
   * Generates random delay within specified range, then runs the animation.
   * Useful for creating staggered group animations with variation.
   *
   * @static
   * @async
   * @param {HTMLElement} el - Element to animate
   * @param {number} [minDelay=380] - Minimum delay in milliseconds
   * @param {number} [maxDelay=730] - Maximum delay in milliseconds
   * @param {...string} animationClasses - CSS class names to trigger animation
   * @returns {Promise<void>} Resolves when animation completes
   *
   * @example
   * await Animator.runWithRandomDelay(element, 100, 500, 'fade-in')
   */
  static async runWithRandomDelay (
    el,
    minDelay = 380,
    maxDelay = 730,
    ...animationClasses
  ) {
    await Delay.randomWait(minDelay, maxDelay)
    await Animator.runWithDelay(el, 0, ...animationClasses)
  }

  /**
   * Runs animation on an element by ID
   *
   * Looks up element by ID and runs animation. Returns silently if element
   * with given ID is not found.
   *
   * @static
   * @async
   * @param {string} id - Element ID to animate
   * @param {...string} animationClasses - CSS class names to trigger animation
   * @returns {Promise<void>} Resolves when animation completes or immediately if not found
   *
   * @example
   * await Animator.runId('my-element', 'slide-in')
   */
  static async runId (id, ...animationClasses) {
    const el = document.getElementById(id)
    if (!el) return
    await Animator.run(el, ...animationClasses)
  }

  /**
   * Runs animation on an element by ID with a delay
   *
   * Waits for delay, looks up element by ID, then runs animation.
   * Returns silently if element not found.
   *
   * @static
   * @async
   * @param {string} id - Element ID to animate
   * @param {number} delay - Delay in milliseconds before animation
   * @param {...string} animationClasses - CSS class names to trigger animation
   * @returns {Promise<void>} Resolves when animation completes
   */
  static async runIdWithDelay (id, delay, ...animationClasses) {
    await Delay.wait(delay)
    await Animator.runId(id, ...animationClasses)
  }

  /**
   * Plays animation classes on an element via reset and re-add
   *
   * Removes animation classes, forces style recalculation to trigger reflow,
   * then adds animation classes back. Allows retriggering CSS animations
   * without removing the element.
   *
   * @static
   * @param {HTMLElement} el - Element to animate
   * @param {...string} animationClasses - CSS class names to play
   * @returns {void}
   */
  static play (el, ...animationClasses) {
    el.classList.remove(...animationClasses)
    // Force style recalculation to restart animation
    el.getBoundingClientRect()
    el.classList.add(...animationClasses)
  }

  /**
   * Waits for an animation to complete on an element
   *
   * Listens for animationend event or uses computed animation duration + delay
   * as a safety timeout. Handles cases with no animation (immediate resolve).
   * Optional trigger function allows starting animation within promise creation.
   *
   * @static
   * @param {HTMLElement} el - Element with animation to wait for
   * @param {Function} [trigger] - Optional callback to invoke to start animation
   * @returns {Promise<void>} Resolves when animation ends or timeout fires
   *
   * @example
   * await Animator.wait(element, () => element.classList.add('animate'))
   */
  static wait (el, trigger) {
    return new Promise(resolve => {
      const computed = getComputedStyle(el)
      const duration =
        Number.parseFloat(computed.animationDuration) * 1000 +
        Number.parseFloat(computed.animationDelay) * 1000

      if (!duration) {
        trigger?.()
        resolve()
        return
      }

      let resolved = false

      const handler = () => {
        if (resolved) return
        resolved = true
        el.removeEventListener('animationend', handler)
        resolve()
      }

      el.addEventListener('animationend', handler)
      trigger?.()
      setTimeout(handler, duration + 50)
    })
  }
}
