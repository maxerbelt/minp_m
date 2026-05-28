/**
 * @typedef {Object} ButtonHandlerMap
 * @property {Function} [buttonPropertyName] - Click handler function for a button
 */

/**
 * @typedef {Object} UIObject
 * @property {HTMLButtonElement} [buttonPropertyName] - Button element by property name
 */

/**
 * ButtonManager - Declarative button setup and event listener management
 * Provides centralized button wiring with handler registration and cleanup
 *
 * Manages a map of button element references and their associated click handlers,
 * providing safe registration, event listener attachment, and cleanup.
 *
 * Usage:
 *   const btnMgr = new ButtonManager(customUI)
 *   btnMgr.registerButtons({
 *     acceptBtn: () => onClickAccept(),
 *     rotateBtn: () => onClickRotate(),
 *     newPlacementBtn: () => onClickClear()
 *   })
 *   btnMgr.wireUp()
 *   // Later: btnMgr.cleanup() to remove all event listeners
 *
 * @class
 * @param {UIObject} [uiObject={}] - Object containing button element references
 */
export class ButtonManager {
  constructor (uiObject = {}) {
    /** @type {UIObject} */
    this.uiObject = uiObject
    /** @type {Map<string, Function>} */
    this.buttonHandlers = new Map()
  }
  /**
   * Set the disabled state for multiple button elements
   * Safely handles null/undefined elements by skipping them
   *
   * @static
   * @param {Array<HTMLButtonElement>} elements - Button elements to modify
   * @param {boolean} disabled - Whether buttons should be disabled
   * @returns {void}
   */
  static setButtonsDisabled (elements, disabled) {
    elements.forEach(element => {
      if (element) {
        element.disabled = disabled
      }
    })
  }
  /**
   * Register a single button with its click handler
   * Only stores the handler if it's a valid function
   *
   * @param {string} buttonPropertyName - Property name on uiObject (e.g., 'acceptBtn')
   * @param {Function} handler - Click handler function to invoke on button click
   * @returns {void}
   */
  registerButton (buttonPropertyName, handler) {
    if (typeof handler === 'function') {
      this.buttonHandlers.set(buttonPropertyName, handler)
    }
  }

  /**
   * Register multiple buttons at once
   * Calls registerButton for each handler to ensure validation
   *
   * @param {ButtonHandlerMap} handlerMap - Map of button names to handlers { acceptBtn: fn, rotateBtn: fn, ... }
   * @returns {void}
   */
  registerButtons (handlerMap) {
    for (const [buttonName, handler] of Object.entries(handlerMap)) {
      this.registerButton(buttonName, handler)
    }
  }

  /**
   * Attach all registered event listeners to buttons
   * Safely handles missing buttons (won't throw if button doesn't exist)
   * Stores handler references on button elements for later cleanup
   *
   * @returns {void}
   */
  wireUp () {
    for (const [buttonName, handler] of this.buttonHandlers) {
      const button = this.uiObject[buttonName]
      if (button && typeof button.addEventListener === 'function') {
        // Store handler reference for cleanup
        if (!button.__handlers) {
          button.__handlers = []
        }
        button.__handlers.push(handler)
        button.addEventListener('click', handler)
      }
    }
  }

  /**
   * Remove all event listeners from registered buttons
   * Cleanup is safe and idempotent - can be called multiple times
   * Clears handler array on each button element
   *
   * @returns {void}
   */
  cleanup () {
    for (const [buttonName] of this.buttonHandlers) {
      const button = this.uiObject[buttonName]
      if (button?.__handlers && Array.isArray(button.__handlers)) {
        for (const handler of button.__handlers) {
          if (typeof button.removeEventListener === 'function') {
            button.removeEventListener('click', handler)
          }
        }
        button.__handlers = []
      }
    }
  }

  /**
   * Get registered handler for a button
   *
   * @param {string} buttonName - Button property name
   * @returns {Function|undefined} The handler function if registered, undefined otherwise
   */
  getHandler (buttonName) {
    return this.buttonHandlers.get(buttonName)
  }

  /**
   * Check if button is registered
   * @param {string} buttonName - Button property name
   * @returns {boolean}
   */
  isRegistered (buttonName) {
    return this.buttonHandlers.has(buttonName)
  }

  /**
   * Get count of registered buttons
   * @returns {number}
   */
  getCount () {
    return this.buttonHandlers.size
  }
}
