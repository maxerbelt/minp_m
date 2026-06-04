/**
 * @typedef {Object} ModeCallbacks
 * @property {Function|null} [onEnter] - Callback when entering mode
 * @property {Function|null} [onExit] - Callback when exiting mode
 * @property {Function|null} [onInit] - Callback for first-time mode initialization
 */

/**
 * @typedef {Object} SwitchModeOptions
 * @property {Function|null} [onBefore] - Callback before mode switch
 * @property {Function|null} [onAfter] - Callback after mode switch
 * @property {boolean} [updateURL] - Whether to update browser history (default: false)
 */

/**
 * @typedef {Object} ModeHistoryEntry
 * @property {string} mode - Mode name
 * @property {number} timestamp - Timestamp in milliseconds
 */

/**
 * @typedef {Object} UIManager
 * @property {Function} show - Show an element by ID
 * @property {Function} hide - Hide an element by ID
 */

/**
 * @typedef {Object} Manager
 * @property {Function} [cleanup] - Method to cleanup manager resources
 * @property {Function} [deactivate] - Alternative method to cleanup manager
 */

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
  /**
   * Creates a new GameStateManager instance
   * @param {string} [initialMode='build'] - Initial game mode
   */
  constructor (initialMode = 'build') {
    /** @type {string} */
    this.currentMode = initialMode
    /** @type {string|null} */
    this.previousMode = null
    /** @type {Map<string, ModeCallbacks>} */
    this.modeCallbacks = new Map()
    /** @type {Map<string, *>} */
    this.stateData = new Map()
    /** @type {ModeHistoryEntry[]} */
    this.modeHistory = []
    /** @type {Map<string, Manager[]>} */
    this.modeManagers = new Map()
    /** @type {Map<string, Object>} */
    this.uiVisibilityState = new Map()
  }

  /**
   * Register callbacks for a game mode
   * @param {string} mode - Mode name (e.g., 'build', 'seek', 'hide')
   * @param {Partial<ModeCallbacks>} [callbacks={}] - Mode callbacks object
   * @returns {void}
   */
  registerModeCallbacks (mode, callbacks = {}) {
    /** @type {ModeCallbacks} */
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
   * @param {Manager} manager - Manager instance with cleanup/deactivate method
   * @returns {void}
   */
  registerModeManager (mode, manager) {
    if (!manager) return

    if (!this.modeManagers.has(mode)) {
      this.modeManagers.set(mode, [])
    }
    const managers = this.modeManagers.get(mode)
    if (managers) {
      managers.push(manager)
    }
  }

  /**
   * Attempt to call a manager's cleanup method
   * @private
   * @param {Manager} manager - Manager instance to cleanup
   * @returns {void}
   */
  _callManagerCleanup (manager) {
    if (typeof manager.cleanup === 'function') {
      try {
        manager.cleanup()
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`Error cleaning up manager: ${errorMsg}`)
      }
    }
  }

  /**
   * Attempt to call a manager's deactivate method
   * @private
   * @param {Manager} manager - Manager instance to deactivate
   * @returns {void}
   */
  _callManagerDeactivate (manager) {
    if (typeof manager.deactivate === 'function') {
      try {
        manager.deactivate()
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`Error deactivating manager: ${errorMsg}`)
      }
    }
  }

  /**
   * Cleanup all managers for a given mode
   * @private
   * @param {string} mode - Mode to cleanup
   * @returns {void}
   */
  _cleanupModeManagers (mode) {
    const managers = this.modeManagers.get(mode)
    if (!managers) return

    for (const manager of managers) {
      this._callManagerCleanup(manager)
      this._callManagerDeactivate(manager)
    }
  }

  /**
   * Save UI visibility state for a mode
   * @param {string} mode - Mode name
   * @param {Object} [visibilityConfig={}] - Map of elementId -> visible (boolean)
   * @returns {void}
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
   * @param {UIManager} uiManager - UIVisibilityManager instance
   * @param {string|null} [mode=null] - Mode name (optional, defaults to currentMode)
   * @returns {void}
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
   * @param {Partial<SwitchModeOptions>} [options={}] - Switch options
   * @returns {boolean} - Success indicator
   */
  switchToMode (newMode, options = {}) {
    /** @type {Function|null} */
    const onBefore = options.onBefore || null
    /** @type {Function|null} */
    const onAfter = options.onAfter || null
    /** @type {boolean} */
    const updateURL = options.updateURL === true

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

  /**
   * Safely call a function with error handling
   * @param {Function|null} [fn=null] - Function to call
   * @param {string} [fnName=''] - Function name for error reporting
   * @returns {void}
   */
  call (fn = null, fnName = '') {
    if (fn && typeof fn === 'function') {
      try {
        fn()
      } catch (error) {
        const funcName = fn.name || fnName || 'anonymous'
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`Error in ${funcName} callback: ${errorMsg}`)
      }
    }
  }

  /**
   * Get current game mode
   * @returns {string} - Current mode name
   */
  getCurrentMode () {
    return this.currentMode
  }

  /**
   * Get previous game mode
   * @returns {string|null} - Previous mode name or null
   */
  getPreviousMode () {
    return this.previousMode
  }

  /**
   * Check if in specific mode
   * @param {string} mode - Mode to check
   * @returns {boolean} - True if current mode matches
   */
  isMode (mode) {
    return this.currentMode === mode
  }

  /**
   * Save state value with optional namespace
   * @param {string} key - State key
   * @param {*} value - State value
   * @param {string} [namespace='default'] - Optional namespace (e.g., 'game', 'ui')
   * @returns {void}
   */
  saveState (key, value, namespace = 'default') {
    const fullKey = namespace ? `${namespace}:${key}` : key
    this.stateData.set(fullKey, value)
  }

  /**
   * Retrieve state value
   * @param {string} key - State key
   * @param {string} [namespace='default'] - Optional namespace
   * @returns {*} - State value or undefined
   */
  getState (key, namespace = 'default') {
    const fullKey = namespace ? `${namespace}:${key}` : key
    return this.stateData.get(fullKey)
  }

  /**
   * Check if state key exists
   * @param {string} key - State key
   * @param {string} [namespace='default'] - Optional namespace
   * @returns {boolean} - True if state exists
   */
  hasState (key, namespace = 'default') {
    const fullKey = namespace ? `${namespace}:${key}` : key
    return this.stateData.has(fullKey)
  }

  /**
   * Clear specific state or all state
   * @param {string|null} [key=null] - State key to clear, or null for all
   * @param {string} [namespace='default'] - Optional namespace
   * @returns {void}
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
   * @param {number} [limit=10] - Limit number of entries
   * @returns {ModeHistoryEntry[]} - Mode history with timestamps
   */
  getModeHistory (limit = 10) {
    return this.modeHistory.slice(-limit)
  }

  /**
   * Update browser history state for mode tracking
   * @private
   * @param {Object} params - State parameters
   * @param {string} params.mode - Mode name
   * @returns {void}
   */
  _updateHistoryState (params) {
    try {
      const urlString = globalThis.location.href
      const newUrl = new URL(urlString)
      newUrl.searchParams.set('mode', params.mode)
      globalThis.history.replaceState({ mode: params.mode }, '', newUrl)
    } catch (error) {
      // Silently fail in test environments without proper history API
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.debug('History update skipped:', errorMsg)
    }
  }
}
