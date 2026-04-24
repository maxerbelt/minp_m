/**
 * KeyboardShortcutManager - Maps keyboard keys to handler functions
 * Provides centralized keyboard event management with case-insensitive key bindings
 *
 * @class KeyboardShortcutManager
 * @description Manages keyboard shortcuts with activation/deactivation lifecycle
 */
export class KeyboardShortcutManager {
  /**
   * Initialize keyboard shortcut manager
   */
  constructor () {
    /** @type {Map<string, Function>} Key-to-handler mappings (both cases) */
    this.shortcuts = new Map()

    /** @type {Function|null} Bound keydown handler for event listener cleanup */
    this.handler = null

    /** @type {boolean} Whether keyboard listener is currently active */
    this.isActive = false
  }

  /**
   * Register one or more keyboard shortcuts
   * Automatically registers both uppercase and lowercase variants
   * @param {string|string[]} key - Single key or array of keys to bind
   * @param {Function} handler - Handler function to invoke: (event) => void
   * @throws {TypeError} If handler is not a function
   * @throws {TypeError} If key is not string or array of strings
   */
  registerShortcut (key, handler) {
    this._validateHandler(handler)

    const keys = Array.isArray(key) ? key : [key]

    for (const singleKey of keys) {
      this._registerKeyVariant(singleKey, handler)
    }
  }

  /**
   * Register multiple shortcuts in bulk
   * @param {Object<string, Function>} shortcuts - Object mapping keys to handler functions
   * @throws {TypeError} If any handler is not a function
   * @throws {TypeError} If any key is not a string
   * @example
   * registerShortcuts({
   *   'R': () => reset(),
   *   'P': () => pause(),
   *   ['S', 'Space']: () => shoot()
   * })
   */
  registerShortcuts (shortcuts) {
    for (const [key, handler] of Object.entries(shortcuts)) {
      this.registerShortcut(key, handler)
    }
  }

  /**
   * Enable keyboard event listening
   * Sets up document keydown listener if not already active
   */
  activate () {
    if (this.isActive) return

    this.handler = event => this._handleKeyDown(event)
    document.addEventListener('keydown', this.handler)
    this.isActive = true
  }

  /**
   * Disable keyboard event listening
   * Removes keydown listener and cleans up bound handler reference
   */
  deactivate () {
    if (!this.isActive) return

    if (this.handler) {
      document.removeEventListener('keydown', this.handler)
      this.handler = null
    }
    this.isActive = false
  }

  /**
   * Check if keyboard listener is currently active
   * @returns {boolean} True if listening for keyboard events
   */
  isListening () {
    return this.isActive
  }

  /**
   * Remove all registered keyboard shortcuts
   */
  clearShortcuts () {
    this.shortcuts.clear()
  }

  /**
   * Clean up resources and deactivate
   * Stops listening and clears all shortcuts
   */
  cleanup () {
    this.deactivate()
    this.clearShortcuts()
  }

  /**
   * Register a single key variant (respects case sensitivity)
   * Stores both uppercase and lowercase versions for case-insensitive matching
   * @private
   * @param {string} key - Single key character
   * @param {Function} handler - Handler function to invoke
   */
  _registerKeyVariant (key, handler) {
    this.shortcuts.set(key.toUpperCase(), handler)
    this.shortcuts.set(key.toLowerCase(), handler)
  }

  /**
   * Validate handler is a callable function
   * @private
   * @param {*} handler - Value to validate as handler
   * @throws {TypeError} If handler is not a function
   */
  _validateHandler (handler) {
    if (typeof handler !== 'function') {
      throw new TypeError(
        `Handler must be a function, received ${typeof handler}`
      )
    }
  }

  /**
   * Process keydown events and invoke matching handler
   * Looks up handler for the pressed key (case-insensitive)
   * @private
   * @param {KeyboardEvent} event - DOM keydown event
   */
  _handleKeyDown (event) {
    const key = event.key
    const handler = this.shortcuts.get(key)

    if (handler && typeof handler === 'function') {
      try {
        handler(event)
      } catch (error) {
        console.error(`Error in keyboard handler for key '${key}':`, error)
      }
    }
  }
}
