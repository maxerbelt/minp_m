/**
 * @typedef {import('./types/callbacks.types.js').ShortcutHandler} ShortcutHandler
 * @typedef {import('./types/config.types.js').ShortcutKey} ShortcutKey
 * @typedef {import('./types/config.types.js').ShortcutMap} ShortcutMap
 */

/**
 * @typedef {Map<string, ShortcutHandler>} KeyboardShortcutRegistry
 * Centralized registry mapping normalized keyboard keys to handler functions.
 * Keys are stored in both uppercase and lowercase variants for case-insensitive matching.
 */

/**
 * KeyboardShortcutManager - Maps keyboard keys to handler functions.
 * Provides centralized keyboard event management with case-insensitive key bindings.
 * Manages keyboard event listeners and dispatches to registered handlers.
 *
 * Key Features:
 * - Case-insensitive key binding (stores both upper/lower variants)
 * - Bulk registration and cleanup
 * - Activation/deactivation lifecycle
 * - Error isolation for handler execution
 * - Proper resource cleanup with removeEventListener
 *
 * Keyboard Event Handling:
 * - Listens to 'keydown' events on document
 * - Normalizes event.key to uppercase for lookup
 * - Executes matching handler synchronously
 * - Catches and logs handler errors without interrupting event flow
 *
 * @class KeyboardShortcutManager
 * @description Manages keyboard shortcuts with case-insensitive key bindings.
 * Centralizes keyboard event listening with safe error isolation.
 */
export class KeyboardShortcutManager {
  /**
   * Initialize a new keyboard shortcut manager.
   * Creates empty shortcuts registry and prepares for activation.
   * No keyboard events are listened to until activate() is called.
   *
   * @constructor
   */
  constructor () {
    /**
     * Registry of keyboard shortcuts.
     * Maps normalized key strings (both cases) to handler functions.
     * Both uppercase and lowercase variants point to the same handler.
     * @type {KeyboardShortcutRegistry}
     */
    this.shortcuts = new Map()

    /**
     * Reference to the bound keydown event handler.
     * Stored to enable proper removal via removeEventListener.
     * Is null when inactive; a bound function when active.
     * @type {((event: KeyboardEvent) => void)|null}
     */
    this.handler = null

    /**
     * Flag indicating whether keyboard event listener is active.
     * Controls activate/deactivate lifecycle.
     * @type {boolean}
     */
    this.isActive = false
  }

  /**
   * Register one or more keyboard shortcuts to the same handler.
   * Accepts a single key or array of keys; all map to the provided handler.
   * Keys are case-insensitive - both uppercase and lowercase variants are registered.
   *
   * @public
   * @param {ShortcutKey} key - Single key string or array of key strings.
   *                            Each key is normalized and stored in both cases.
   *                            Examples: 'A', 'Enter', ['a', 'b'], ['Escape']
   * @param {ShortcutHandler} handler - Handler function invoked when key is pressed.
   *                                    Called with KeyboardEvent as argument.
   *                                    Must be a callable function.
   * @returns {void}
   * @throws {TypeError} If handler is not a function.
   *                     Error message: "Handler must be a function, received [type]"
   * @throws {TypeError} If key is not a string or array of strings.
   *                     Error message: "Shortcut key must be a string, received [type]"
   * @description Each key in the array receives its own handler registration.
   *              Case variants stored: 'A' registers both 'A' and 'a' keys.
   */
  registerShortcut (key, handler) {
    this._validateHandler(handler)

    for (const normalizedKey of this._normalizeKeys(key)) {
      this._registerKeyVariant(normalizedKey, handler)
    }
  }

  /**
   * Register multiple keyboard shortcuts in a single bulk operation.
   * Iterates through key-handler pairs in the shortcuts object.
   * Each shortcut is registered independently via registerShortcut().
   *
   * @public
   * @param {ShortcutMap} shortcuts - Object mapping key(s) to handler functions.
   *                                  Format: { 'key': handler, 'key2': handler2 }
   *                                  or { 'key': handler, 'key3': [handler1, handler2] }
   * @returns {void}
   * @throws {TypeError} If any handler is not a function.
   * @throws {TypeError} If any key is not a string or array of strings.
   * @description Continues processing even if individual registrations fail;
   *              errors are thrown immediately and stop processing.
   */
  registerShortcuts (shortcuts) {
    for (const [key, handler] of Object.entries(shortcuts)) {
      this.registerShortcut(key, handler)
    }
  }

  /**
   * Enable keyboard event listening.
   * Attaches a keydown event listener to the document.
   * Safe to call multiple times - guards against duplicate listeners via isActive check.
   *
   * @public
   * @returns {void}
   * @description If already active, returns immediately without re-attaching.
   *              After this call, keyboard shortcuts will trigger their handlers.
   *              Side effect: document.addEventListener('keydown', ...) called.
   */
  activate () {
    if (this.isActive) return

    this.handler = event => this._handleKeyDown(event)
    document.addEventListener('keydown', this.handler)
    this.isActive = true
  }

  /**
   * Disable keyboard event listening.
   * Removes the keydown event listener from the document.
   * Safe to call multiple times - guards against multiple removals via isActive check.
   *
   * @public
   * @returns {void}
   * @description If not active, returns immediately without attempting removal.
   *              After this call, keyboard shortcuts will not trigger handlers.
   *              Side effect: document.removeEventListener('keydown', ...) called.
   *              Clears internal handler reference to allow garbage collection.
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
   * Check if keyboard event listener is currently active.
   * Returns the state of the isActive flag.
   *
   * @public
   * @returns {boolean} True if keyboard listener is active and listening for events;
   *                    false if deactivated or never activated.
   * @description Use this to determine whether keyboard shortcuts are currently enabled.
   */
  isListening () {
    return this.isActive
  }

  /**
   * Remove all registered keyboard shortcuts.
   * Clears the shortcuts Map completely.
   * Does not affect activation state - listener remains active if running.
   *
   * @public
   * @returns {void}
   * @description After this call, no shortcuts will trigger handlers.
   *              Call registerShortcut() to add shortcuts again.
   */
  clearShortcuts () {
    this.shortcuts.clear()
  }

  /**
   * Clean up all resources and reset to initial state.
   * Performs full lifecycle cleanup: deactivates listener and clears shortcuts.
   * After cleanup, manager is ready for new registrations and activation.
   *
   * @public
   * @returns {void}
   * @description Recommended to call before discarding the manager instance.
   *              Ensures proper removeEventListener call and garbage collection.
   *              Side effects: deactivate() and clearShortcuts() are called.
   */
  cleanup () {
    this.deactivate()
    this.clearShortcuts()
  }

  /**
   * Normalize a shortcut key or array of keys into a validated string list.
   * Converts single key to array format; validates all keys are strings.
   *
   * @private
   * @param {ShortcutKey} key - Single key string or array of key strings.
   * @returns {string[]} Normalized array of validated key strings.
   * @throws {TypeError} If any key is not a string.
   * @description Input: 'a' → Output: ['a']
   *              Input: ['a', 'b'] → Output: ['a', 'b']
   */
  _normalizeKeys (key) {
    if (Array.isArray(key)) {
      return key.map(this._validateAndReturnKey.bind(this))
    }

    return [this._validateAndReturnKey(key)]
  }

  /**
   * Validate that a key is a string and return it unchanged.
   * Performs type checking for string keys before registration.
   *
   * @private
   * @param {*} key - Candidate key value to validate.
   * @returns {string} The same key if validation passes.
   * @throws {TypeError} If key is not typeof 'string'.
   *                     Error message: "Shortcut key must be a string, received [type]"
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
   * Register both uppercase and lowercase variants of a single key.
   * Maps both cases to the same handler function for case-insensitive matching.
   *
   * @private
   * @param {string} key - Single key string to register (e.g., 'a', 'Enter').
   * @param {ShortcutHandler} handler - Handler function for this key.
   * @returns {void}
   * @description Stores two Map entries:
   *              shortcuts.set('A', handler) and shortcuts.set('a', handler)
   *              This enables case-insensitive key matching in _handleKeyDown().
   */
  _registerKeyVariant (key, handler) {
    this.shortcuts.set(key.toUpperCase(), handler)
    this.shortcuts.set(key.toLowerCase(), handler)
  }

  /**
   * Validate that a value is a callable function.
   * Used to ensure all registered handlers are functions before storage.
   *
   * @private
   * @param {*} handler - Value to validate as handler function.
   * @returns {void}
   * @throws {TypeError} If handler is not typeof 'function'.
   *                     Error message: "Handler must be a function, received [type]"
   */
  _validateHandler (handler) {
    if (typeof handler !== 'function') {
      throw new TypeError(
        `Handler must be a function, received ${typeof handler}`
      )
    }
  }

  /**
   * Process keydown events and invoke matching handler.
   * Called on every keydown event; looks up handler by event.key.
   * Synchronously executes handler if found; errors are caught and logged.
   *
   * @private
   * @param {KeyboardEvent} event - DOM keydown event from document listener.
   * @returns {void}
   * @description Lookup strategy: event.key (e.g., 'a', 'A', 'Enter')
   *              Maps directly to shortcuts Map (both cases stored).
   *              If handler throws error, logs to console but doesn't re-throw.
   *              Error isolation ensures one handler error doesn't break others.
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
