/**
 * KeyboardShortcutManager - Handles keyboard events and shortcuts
 * Uses map-based approach for declaring shortcuts with handlers
 */
export class KeyboardShortcutManager {
  constructor () {
    this.shortcuts = new Map()
    this.handler = null
    this.isActive = false
  }

  /**
   * Register a keyboard shortcut with its handler
   * Key can be single char or array of chars for multiple keys
   */
  registerShortcut (key, handler) {
    if (Array.isArray(key)) {
      for (const k of key) {
        this.shortcuts.set(k.toUpperCase(), handler)
        this.shortcuts.set(k.toLowerCase(), handler)
      }
    } else {
      this.shortcuts.set(key.toUpperCase(), handler)
      this.shortcuts.set(key.toLowerCase(), handler)
    }
  }

  /**
   * Register multiple shortcuts at once
   * shortcuts: { key: handler, ... } or { key: [handlers...], ... }
   */
  registerShortcuts (shortcuts) {
    for (const [key, handler] of Object.entries(shortcuts)) {
      this.registerShortcut(key, handler)
    }
  }

  /**
   * Activate keyboard listening
   */
  activate () {
    if (this.isActive) return

    this.handler = event => this._handleKeyDown(event)
    document.addEventListener('keydown', this.handler)
    this.isActive = true
  }

  /**
   * Deactivate keyboard listening
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
   * Check if shortcut manager is active
   */
  isListening () {
    return this.isActive
  }

  /**
   * Clear all registered shortcuts
   */
  clearShortcuts () {
    this.shortcuts.clear()
  }

  /**
   * Handle keydown event
   * @private
   */
  _handleKeyDown (event) {
    const key = event.key
    const handler = this.shortcuts.get(key)

    if (handler && typeof handler === 'function') {
      handler(event)
    }
  }

  /**
   * Clean up resources
   */
  cleanup () {
    this.deactivate()
    this.clearShortcuts()
  }
}
