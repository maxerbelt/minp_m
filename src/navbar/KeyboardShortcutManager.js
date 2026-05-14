/**
 * Handler called when a registered keyboard shortcut is triggered.
 * @typedef {(event: KeyboardEvent) => void} ShortcutHandler
 */

/**
 * Valid shortcut key or array of shortcut keys.
 * @typedef {string|string[]} ShortcutKey
 */

/**
 * Map of shortcut keys to handler functions.
 * @typedef {Object<string, ShortcutHandler>} ShortcutMap
 */

/**
 * KeyboardShortcutManager - Maps keyboard keys to handler functions.
 * Provides centralized keyboard event management with case-insensitive key bindings.
 *
 * @class KeyboardShortcutManager
 * @description Manages keyboard shortcuts with activation/deactivation lifecycle.
 */
export class KeyboardShortcutManager {
  /**
   * Initialize keyboard shortcut manager.
   */
  constructor () {
    /** @type {Map<string, ShortcutHandler>} */
    this.shortcuts = new Map()

    /** @type {((event: KeyboardEvent) => void)|null} */
    this.handler = null

    /** @type {boolean} */
    this.isActive = false
  }

  /**
   * Register one or more keyboard shortcuts.
   * @param {ShortcutKey} key - Single key or array of keys to bind.
   * @param {ShortcutHandler} handler - Handler function to invoke.
   * @throws {TypeError} If handler is not a function.
   * @throws {TypeError} If key is not a string or array of strings.
   */
  registerShortcut (key, handler) {
    this._validateHandler(handler)

    for (const normalizedKey of this._normalizeKeys(key)) {
      this._registerKeyVariant(normalizedKey, handler)
    }
  }

  /**
   * Register multiple shortcuts in bulk.
   * @param {ShortcutMap} shortcuts - Object mapping keys to handler functions.
   * @throws {TypeError} If any handler is not a function.
   */
  registerShortcuts (shortcuts) {
    for (const [key, handler] of Object.entries(shortcuts)) {
      this.registerShortcut(key, handler)
    }
  }

  /**
   * Enable keyboard event listening.
   * Sets up document keydown listener if not already active.
   */
  activate () {
    if (this.isActive) return

    this.handler = event => this._handleKeyDown(event)
    document.addEventListener('keydown', this.handler)
    this.isActive = true
  }

  /**
   * Disable keyboard event listening.
   * Removes keydown listener and clears the internal handler reference.
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
   * Check if keyboard listener is currently active.
   * @returns {boolean} True if listening for keyboard events.
   */
  isListening () {
    return this.isActive
  }

  /**
   * Remove all registered keyboard shortcuts.
   */
  clearShortcuts () {
    this.shortcuts.clear()
  }

  /**
   * Clean up resources and deactivate.
   * Stops listening and clears all shortcuts.
   */
  cleanup () {
    this.deactivate()
    this.clearShortcuts()
  }

  /**
   * Normalize a shortcut key or key array into a validated string list.
   * @private
   * @param {ShortcutKey} key - Key or keys to normalize.
   * @returns {string[]} Normalized list of key strings.
   */
  _normalizeKeys (key) {
    if (Array.isArray(key)) {
      return key.map(this._validateAndReturnKey.bind(this))
    }

    return [this._validateAndReturnKey(key)]
  }

  /**
   * Validate that key is a string and return it unchanged.
   * @private
   * @param {*} key - Candidate key value.
   * @returns {string} Validated key string.
   * @throws {TypeError} If key is not a string.
   */
  _validateAndReturnKey (key) {
    if (typeof key !== 'string') {
      throw new TypeError(
        `Shortcut key must be a string, received ${typeof key}`
      )
    }
    return key
  }

  /**
   * Register a single key variant (case-insensitive).
   * Stores both uppercase and lowercase versions for matching.
   * @private
   * @param {string} key - Single key string.
   * @param {ShortcutHandler} handler - Handler function to invoke.
   */
  _registerKeyVariant (key, handler) {
    this.shortcuts.set(key.toUpperCase(), handler)
    this.shortcuts.set(key.toLowerCase(), handler)
  }

  /**
   * Validate handler is a callable function.
   * @private
   * @param {*} handler - Value to validate as handler.
   * @throws {TypeError} If handler is not a function.
   */
  _validateHandler (handler) {
    if (typeof handler !== 'function') {
      throw new TypeError(
        `Handler must be a function, received ${typeof handler}`
      )
    }
  }

  /**
   * Process keydown events and invoke the matching handler.
   * @private
   * @param {KeyboardEvent} event - DOM keydown event.
   */
  _handleKeyDown (event) {
    const handler = this.shortcuts.get(event.key)

    if (handler) {
      try {
        handler(event)
      } catch (error) {
        console.error(
          `Error in keyboard handler for key '${event.key}':`,
          error
        )
      }
    }
  }
}
