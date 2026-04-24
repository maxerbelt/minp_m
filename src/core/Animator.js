import { Delay } from './Delay.js'

/**
 * Animator class for managing CSS-based animations on DOM elements.
 * Handles creation, positioning, scaling, and lifecycle of animated elements.
 */
export class Animator {
  /**
   * @typedef {Object} Position
   * @property {number} x - X coordinate
   * @property {number} y - Y coordinate
   */

  /**
   * Creates an Animator instance for managing animations.
   * @param {string} className - CSS class name(s) for the animation element
   * @param {string|null} [containerId=null] - ID of the container element
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
    this.el = this._createElement(className)
    this.container = container || document.getElementById(containerId)
    this.innerEl = this._createInnerElement(innerDivClassNames)
    this.running = false
    this.innerDelay = null
  }

  /**
   * Removes existing elements with the given class name.
   * @private
   * @param {string} className - Class name to remove elements for
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
   * Creates the main animation element.
   * @private
   * @param {string} className - Class name for the element
   * @returns {HTMLDivElement} Created element
   */
  _createElement (className) {
    const el = document.createElement('div')
    el.className = className
    return el
  }

  /**
   * Creates the inner element if class names are provided.
   * @private
   * @param {string[]} classNames - Class names for inner element
   * @returns {HTMLDivElement|null} Inner element or null
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
   * Moves the animation element to the specified position relative to the container.
   * @param {Position} end - Target position with x and y coordinates
   */
  moveTo (end) {
    const containerRect = this.containerRect
    const relX = end.x - containerRect.left
    const relY = end.y - containerRect.top
    this.el.style.setProperty('--x', `${relX}px`)
    this.el.style.setProperty('--y', `${relY}px`)
  }

  /**
   * Sets scale properties for the inner element.
   * @param {number|string} start - Starting scale value
   * @param {number|string} end - Ending scale value
   */
  scaleInner (start, end) {
    this.setInnerProperty('--scale-start', `${start}`)
    this.setInnerProperty('--scale-end', `${end}`)
  }

  /**
   * Sets a CSS property on the inner element.
   * @param {string} name - Property name
   * @param {string} value - Property value
   */
  setInnerProperty (name, value) {
    this.innerEl?.style?.setProperty(name, value)
  }

  /**
   * Applies default styling to the inner element.
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
   * Sets a delay for the inner element animation.
   * @param {number} delay - Delay in milliseconds
   */
  delayInner (delay) {
    this.innerDelay = delay
  }

  /**
   * Gets the bounding rectangle of the container.
   * @returns {DOMRect} Container's bounding rectangle
   */
  get containerRect () {
    return this.container.getBoundingClientRect()
  }

  /**
   * Adds a shake class to the container.
   * @param {string} shakeClass - CSS class for shaking effect
   */
  shake (shakeClass) {
    this.container.classList.add(shakeClass)
  }

  /**
   * Removes a shake class from the container.
   * @param {string} shakeClass - CSS class to remove
   */
  endShake (shakeClass) {
    this.container.classList.remove(shakeClass)
  }

  /**
   * Gets the element that should be animated (inner or main element).
   * @returns {HTMLElement} The playable element
   */
  get playable () {
    return this.innerEl || this.el
  }
  /**
   * Runs the animation sequence.
   * @param {...string} animationClasses - CSS classes to trigger the animation
   */
  async run (...animationClasses) {
    if (this.running) return
    this.running = true
    this._startAnimation(...animationClasses)
    await this._waitForAnimation()
    await this._handleInnerDelay()
    this._cleanupElements()
    this.running = false
  }

  /**
   * Starts the animation by playing the classes.
   * @private
   * @param {...string} animationClasses - Classes to animate
   */
  _startAnimation (...animationClasses) {
    this.play(...animationClasses)
  }

  /**
   * Waits for the animation to complete.
   * @private
   * @returns {Promise<void>}
   */
  async _waitForAnimation () {
    await Animator.wait(this.playable)
  }

  /**
   * Handles delay for inner element if set.
   * @private
   * @returns {Promise<void>}
   */
  async _handleInnerDelay () {
    if (this.innerEl && this.innerDelay) {
      await Delay.wait(this.innerDelay)
    }
  }

  /**
   * Cleans up animation elements.
   * @private
   */
  _cleanupElements () {
    this.innerEl?.remove()
    // Small delay before removing main element
    setTimeout(() => this.el.remove(), 10)
  }

  /**
   * Plays the animation by adding classes and forcing recalculation.
   * @param {...string} animationClasses - Classes to add for animation
   */
  play (...animationClasses) {
    const classes = animationClasses.length ? animationClasses : ['play']
    this._resetClasses(classes)
    this.container.appendChild(this.el)
    this._forceStyleRecalculation()
    this._addClasses(classes)
  }

  /**
   * Resets animation classes on elements.
   * @private
   * @param {string[]} classes - Classes to reset
   */
  _resetClasses (classes) {
    this.el.classList.remove(...classes)
    this.innerEl?.classList.remove(...classes)
  }

  /**
   * Forces CSS style recalculation to restart animations.
   * @private
   */
  _forceStyleRecalculation () {
    this.playable.getBoundingClientRect()
  }

  /**
   * Adds animation classes to the playable element.
   * @private
   * @param {string[]} classes - Classes to add
   */
  _addClasses (classes) {
    this.playable.classList.add(...classes)
  }
  /**
   * Runs animation on a given element.
   * @static
   * @param {HTMLElement} el - Element to animate
   * @param {...string} animationClasses - CSS classes for animation
   * @returns {Promise<void>}
   */
  static async run (el, ...animationClasses) {
    Animator.play(el, ...animationClasses)
    await Animator.wait(el)
    el.classList.remove(...animationClasses)
  }

  /**
   * Runs animation on an element with a delay.
   * @static
   * @param {HTMLElement} el - Element to animate
   * @param {number} delay - Delay in milliseconds
   * @param {...string} animationClasses - CSS classes for animation
   * @returns {Promise<void>}
   */
  static async runWithDelay (el, delay, ...animationClasses) {
    await Delay.wait(delay)
    await Animator.run(el, ...animationClasses)
  }

  /**
   * Runs animation on an element with a random delay.
   * @static
   * @param {HTMLElement} el - Element to animate
   * @param {number} [minDelay=380] - Minimum delay
   * @param {number} [maxDelay=730] - Maximum delay
   * @param {...string} animationClasses - CSS classes for animation
   * @returns {Promise<void>}
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
   * Runs animation on an element by ID.
   * @static
   * @param {string} id - Element ID
   * @param {...string} animationClasses - CSS classes for animation
   * @returns {Promise<void>}
   */
  static async runId (id, ...animationClasses) {
    const el = document.getElementById(id)
    if (!el) return
    await Animator.run(el, ...animationClasses)
  }

  /**
   * Runs animation on an element by ID with delay.
   * @static
   * @param {string} id - Element ID
   * @param {number} delay - Delay in milliseconds
   * @param {...string} animationClasses - CSS classes for animation
   * @returns {Promise<void>}
   */
  static async runIdWithDelay (id, delay, ...animationClasses) {
    await Delay.wait(delay)
    await Animator.runId(id, ...animationClasses)
  }

  /**
   * Plays animation classes on an element by resetting and adding them.
   * @static
   * @param {HTMLElement} el - Element to animate
   * @param {...string} animationClasses - CSS classes to play
   */
  static play (el, ...animationClasses) {
    el.classList.remove(...animationClasses)
    // Force style recalculation to restart animation
    void el.offsetWidth
    el.classList.add(...animationClasses)
  }

  /**
   * Waits for an animation to complete on an element.
   * @static
   * @param {HTMLElement} el - Element to wait for
   * @param {Function} [trigger] - Optional function to call to start animation
   * @returns {Promise<void>}
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
