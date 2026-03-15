/**
 * ButtonManager - Declarative button setup and event listener management
 * Provides centralized button wiring with handler registration and cleanup
 *
 * Usage:
 *   const btnMgr = new ButtonManager(customUI)
 *   btnMgr.registerButtons({
 *     acceptBtn: () => onClickAccept(),
 *     rotateBtn: () => onClickRotate(),
 *     newPlacementBtn: () => onClickClear()
 *   })
 *   btnMgr.wireUp()
 */
export class ButtonManager {
  constructor (uiObject = {}) {
    this.uiObject = uiObject
    this.buttonHandlers = new Map()
  }

  /**
   * Register a single button with its handler
   * @param {string} buttonPropertyName - Property name on uiObject (e.g., 'acceptBtn')
   * @param {Function} handler - Click handler function
   */
  registerButton (buttonPropertyName, handler) {
    if (typeof handler === 'function') {
      this.buttonHandlers.set(buttonPropertyName, handler)
    }
  }

  /**
   * Register multiple buttons at once
   * @param {Object} handlerMap - Map of button names to handlers { acceptBtn: fn, rotateBtn: fn, ... }
   */
  registerButtons (handlerMap) {
    for (const [buttonName, handler] of Object.entries(handlerMap)) {
      this.registerButton(buttonName, handler)
    }
  }

  /**
   * Attach all registered event listeners to buttons
   * Safely handles missing buttons (won't throw if button doesn't exist)
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
   * Cleanup is safe and idempotent
   */
  cleanup () {
    for (const [buttonName] of this.buttonHandlers) {
      const button = this.uiObject[buttonName]
      if (button && button.__handlers && Array.isArray(button.__handlers)) {
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
   * @param {string} buttonName - Button property name
   * @returns {Function|undefined}
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
