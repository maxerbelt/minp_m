/**
 * GameStateManager - Manages game mode transitions and state persistence
 * Coordinates mode changes, URL updates, and callback execution
 *
 * Usage:
 *   const stateManager = new GameStateManager('build')
 *   stateManager.switchToMode('seek', {
 *     onBefore: () => console.log('leaving build'),
 *     onAfter: () => console.log('entered seek'),
 *     updateURL: true
 *   })
 *   stateManager.saveState('shipCount', 5)
 *   const count = stateManager.getState('shipCount')
 *   stateManager.registerModeManager('build', buttonManager)
 *   stateManager.registerModeManager('build', keyboardManager)
 */
export class GameStateManager {
  constructor (initialMode = 'build') {
    this.currentMode = initialMode
    this.previousMode = null
    this.modeCallbacks = new Map()
    this.stateData = new Map()
    this.modeHistory = []
    this.modeManagers = new Map() // Maps mode -> array of managers with cleanup
    this.uiVisibilityState = new Map() // Maps mode -> visibility config
  }

  /**
   * Register callbacks for a game mode
   * @param {string} mode - Mode name (e.g., 'build', 'seek', 'hide')
   * @param {Object} callbacks - { onEnter, onExit, onInit }
   */
  registerModeCallbacks (mode, callbacks = {}) {
    const modeCallbacks = {
      onEnter: callbacks.onEnter || null,
      onExit: callbacks.onExit || null,
      onInit: callbacks.onInit || null
    }
    this.modeCallbacks.set(mode, modeCallbacks)
  }

  /**
   * Register a manager (ButtonManager, KeyboardShortcutManager, etc.) for a mode
   * Manager must have a cleanup() or deactivate() method for automatic cleanup on mode exit
   * @param {string} mode - Mode name
   * @param {Object} manager - Manager instance with cleanup/deactivate method
   */
  registerModeManager (mode, manager) {
    if (!manager) return

    if (!this.modeManagers.has(mode)) {
      this.modeManagers.set(mode, [])
    }
    this.modeManagers.get(mode).push(manager)
  }

  /**
   * Cleanup all managers for a given mode
   * @private
   * @param {string} mode - Mode to cleanup
   */
  _cleanupModeManagers (mode) {
    const managers = this.modeManagers.get(mode)
    if (!managers) return

    for (const manager of managers) {
      if (typeof manager.cleanup === 'function') {
        try {
          manager.cleanup()
        } catch (error) {
          console.error(`Error cleaning up manager: ${error.message}`)
        }
      } else if (typeof manager.deactivate === 'function') {
        try {
          manager.deactivate()
        } catch (error) {
          console.error(`Error deactivating manager: ${error.message}`)
        }
      }
    }
  }

  /**
   * Save UI visibility state for a mode
   * @param {string} mode - Mode name
   * @param {Object} visibilityConfig - Map of elementId -> visible (boolean)
   */
  saveUIVisibility (mode, visibilityConfig = {}) {
    this.uiVisibilityState.set(mode, visibilityConfig)
  }

  /**
   * Get UI visibility state for a mode
   * @param {string} mode - Mode name
   * @returns {Object} - Visibility configuration
   */
  getUIVisibility (mode) {
    return this.uiVisibilityState.get(mode) || {}
  }

  /**
   * Apply UI visibility state for current mode
   * @param {Object} uiManager - UIVisibilityManager instance
   * @param {string} mode - Mode name (optional, defaults to currentMode)
   */
  applyUIVisibility (uiManager, mode = null) {
    if (!uiManager) return

    const targetMode = mode || this.currentMode
    const visibility = this.getUIVisibility(targetMode)

    for (const [elementId, shouldShow] of Object.entries(visibility)) {
      if (shouldShow) {
        uiManager.show(elementId)
      } else {
        uiManager.hide(elementId)
      }
    }
  }

  /**
   * Switch to a new game mode with optional callbacks
   * Automatically cleans up managers from previous mode
   * @param {string} newMode - Target game mode
   * @param {Object} options - { onBefore, onAfter, updateURL }
   * @returns {boolean} - Success indicator
   */
  switchToMode (newMode, options = {}) {
    const { onBefore = null, onAfter = null, updateURL = false } = options

    this.call(onBefore, 'before')

    // Call exit callback for previous mode
    const prevCallbacks = this.modeCallbacks.get(this.currentMode)
    this.call(prevCallbacks?.onExit, 'exit')

    // Cleanup managers from previous mode
    this._cleanupModeManagers(this.currentMode)

    // Update mode tracking
    this.previousMode = this.currentMode
    this.currentMode = newMode
    this.modeHistory.push({ mode: newMode, timestamp: Date.now() })
    const newCallbacks = this.modeCallbacks.get(newMode)
    if (!this.hasState('init', newMode)) {
      this.call(newCallbacks?.onInit, 'init')
      this.saveState('init', newMode, 'init')
    }
    // Call enter callback for new mode
    this.call(newCallbacks?.onEnter, 'enter')

    // Update URL if requested
    if (updateURL) {
      this._updateHistoryState({ mode: newMode })
    }

    this.call(onAfter, 'after')

    return true
  }

  call (fn = null, fnName = '') {
    if (fn && typeof fn === 'function') {
      try {
        fn()
      } catch (error) {
        console.error(
          `Error in ${fn.name || fnName || 'anonymous'} callback: ${
            error.message
          }`
        )
      }
    }
  }

  /**
   * Get current game mode
   * @returns {string}
   */
  getCurrentMode () {
    return this.currentMode
  }

  /**
   * Get previous game mode
   * @returns {string|null}
   */
  getPreviousMode () {
    return this.previousMode
  }

  /**
   * Check if in specific mode
   * @param {string} mode - Mode to check
   * @returns {boolean}
   */
  isMode (mode) {
    return this.currentMode === mode
  }

  /**
   * Save state value with optional namespace
   * @param {string} key - State key
   * @param {*} value - State value
   * @param {string} namespace - Optional namespace (e.g., 'game', 'ui')
   */
  saveState (key, value, namespace = 'default') {
    const fullKey = namespace ? `${namespace}:${key}` : key
    this.stateData.set(fullKey, value)
  }

  /**
   * Retrieve state value
   * @param {string} key - State key
   * @param {string} namespace - Optional namespace
   * @returns {*}
   */
  getState (key, namespace = 'default') {
    const fullKey = namespace ? `${namespace}:${key}` : key
    return this.stateData.get(fullKey)
  }

  /**
   * Check if state key exists
   * @param {string} key - State key
   * @param {string} namespace - Optional namespace
   * @returns {boolean}
   */
  hasState (key, namespace = 'default') {
    const fullKey = namespace ? `${namespace}:${key}` : key
    return this.stateData.has(fullKey)
  }

  /**
   * Clear specific state or all state
   * @param {string|null} key - State key to clear, or null for all
   * @param {string} namespace - Optional namespace
   */
  clearState (key = null, namespace = 'default') {
    if (key === null) {
      this.stateData.clear()
    } else {
      const fullKey = namespace ? `${namespace}:${key}` : key
      this.stateData.delete(fullKey)
    }
  }

  /**
   * Get mode history (last N entries)
   * @param {number} limit - Limit number of entries
   * @returns {Array} - Mode history with timestamps
   */
  getModeHistory (limit = 10) {
    return this.modeHistory.slice(-limit)
  }

  /**
   * Update browser history state for mode tracking
   * @private
   * @param {Object} params - State parameters
   */
  _updateHistoryState (params) {
    try {
      const newUrl = new URL(window.location)
      newUrl.searchParams.set('mode', params.mode)
      window.history.replaceState({ mode: params.mode }, '', newUrl)
    } catch (error) {
      // Silently fail in test environments without proper history API
      console.debug('History update skipped:', error.message)
    }
  }
}
