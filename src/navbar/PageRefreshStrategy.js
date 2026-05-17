/**
 * @typedef {() => void} RefreshCallback
 * @typedef {() => void} ErrorableCallback
 *
 * @typedef {Object} RefreshStrategyOptions
 * @property {RefreshCallback} [beforeRefresh] - Callback before refresh.
 * @property {RefreshCallback} [afterRefresh] - Callback after refresh.
 */

/**
 * @typedef {import('./ParameterManager.js').ParameterManager} ParameterManager
 */

/**
 * PageRefreshStrategy - Strategy for managing page refresh operations.
 * Handles different types of page refreshes and state preservation.
 *
 * @class PageRefreshStrategy
 */
export class PageRefreshStrategy {
  /**
   * Creates a new PageRefreshStrategy instance.
   * @param {RefreshStrategyOptions} options - Configuration options.
   */
  constructor (options = {}) {
    /** @type {RefreshCallback[]} Array of handlers to execute during refresh. */
    this.refreshHandlers = []

    /** @type {RefreshCallback} Callback to execute before refresh. */
    this.beforeRefresh = options.beforeRefresh || (() => {})

    /** @type {RefreshCallback} Callback to execute after refresh. */
    this.afterRefresh = options.afterRefresh || (() => {})
  }

  /**
   * Register a refresh handler that executes during refresh.
   * @param {RefreshCallback} handler - Handler function to register.
   * @returns {void}
   */
  addRefreshHandler (handler) {
    if (typeof handler === 'function') {
      this.refreshHandlers.push(handler)
    }
  }

  /**
   * Execute full page refresh with handlers and page reload.
   * @returns {void}
   */
  refreshPage () {
    this._runRefreshCycle()
    globalThis.location.reload()
  }

  /**
   * Execute soft refresh (without page reload).
   * @returns {void}
   */
  softRefresh () {
    this._runRefreshCycle()
  }

  /**
   * Clear all registered refresh handlers.
   * @returns {void}
   */
  clearHandlers () {
    this.refreshHandlers = []
  }

  /**
   * Execute refresh lifecycle callbacks and registered handlers.
   * @private
   * @returns {void}
   */
  _runRefreshCycle () {
    this._safeInvokeCallback(this.beforeRefresh, 'before refresh')
    this._executeHandlers()
    this._safeInvokeCallback(this.afterRefresh, 'after refresh')
  }

  /**
   * Execute all refresh handlers with error handling.
   * @private
   * @returns {void}
   */
  _executeHandlers () {
    this.refreshHandlers.forEach(handler => {
      this._safeInvokeCallback(handler, 'refresh handler')
    })
  }

  /**
   * Safely invoke a callback and log any errors.
   * @private
   * @param {ErrorableCallback} callback - Callback to invoke.
   * @param {string} description - Context description for error logging.
   * @returns {void}
   */
  _safeInvokeCallback (callback, description) {
    if (typeof callback !== 'function') {
      return
    }

    try {
      callback()
    } catch (error) {
      console.error(`${description} error:`, error)
    }
  }
}

/**
 * @typedef {Object} StateRefreshOptions
 * @property {RefreshCallback} [beforeRefresh] - Callback before refresh.
 * @property {RefreshCallback} [afterRefresh] - Callback after refresh.
 * @property {RefreshCallback} [boardSetup] - Board setup callback.
 * @property {RefreshCallback} [clearStarfield] - Starfield clear callback.
 */

/**
 * StateRefreshStrategy - Specifically for refreshing game state.
 * Extends PageRefreshStrategy with board and starfield management.
 *
 * @class
 * @extends {PageRefreshStrategy}
 */
export class StateRefreshStrategy extends PageRefreshStrategy {
  /**
   * Creates a new StateRefreshStrategy instance.
   * @param {StateRefreshOptions} options - Configuration options.
   */
  constructor (options = {}) {
    super(options)

    /** @type {RefreshCallback} Callback to setup board. */
    this.boardSetupCallback = options.boardSetup || (() => {})

    /** @type {RefreshCallback} Callback to clear starfield. */
    this.clearStarfieldCallback = options.clearStarfield || (() => {})
  }

  /**
   * Refresh game board state.
   * @returns {void}
   */
  refreshBoardState () {
    this._safeRefreshOperation(() => {
      this.boardSetupCallback()
      this.softRefresh()
    }, 'Board state refresh')
  }

  /**
   * Refresh with starfield clearing.
   * @returns {void}
   */
  refreshWithStarfield () {
    this._safeRefreshOperation(() => {
      this.clearStarfieldCallback()
      this.boardSetupCallback()
      this.softRefresh()
    }, 'Starfield refresh')
  }

  /**
   * Alias for refreshWithStarfield - clear and refresh.
   * @returns {void}
   */
  clearAndRefresh () {
    this.refreshWithStarfield()
  }

  /**
   * Invoke a refresh operation and log failures.
   * @private
   * @param {Function} operation - Operation to perform.
   * @param {string} label - Descriptive label for logging.
   * @returns {void}
   */
  _safeRefreshOperation (operation, label) {
    try {
      operation()
    } catch (error) {
      console.error(`${label} error:`, error)
    }
  }
}

/**
 * @typedef {Object} NavStateManagerOptions
 * @property {ParameterManager} [paramManager] - Parameter manager instance.
 * @property {PageRefreshStrategy} [refreshStrategy] - Refresh strategy instance.
 * @property {Object} [navigationService] - Navigation service instance.
 */

/**
 * NavStateManager - Manages navigation and refresh state together.
 * Coordinates parameter management, navigation, and refresh strategies.
 *
 * @class
 */
export class NavStateManager {
  /**
   * Creates a new NavStateManager instance.
   * @param {NavStateManagerOptions} options - Configuration options.
   */
  constructor (options = {}) {
    /** @type {ParameterManager} */
    this.paramManager = options.paramManager

    /** @type {PageRefreshStrategy} */
    this.refreshStrategy = options.refreshStrategy

    /** @type {Object} */
    this.navigationService = options.navigationService
  }

  /**
   * Navigate to target mode and refresh.
   * @param {string} targetMode - Target navigation mode.
   * @param {string|null} [mapName=null] - Optional map name for navigation.
   * @returns {void}
   */
  navigateAndRefresh (targetMode, mapName = null) {
    if (this._hasFunction(this.navigationService?.switchToMode)) {
      this.navigationService.switchToMode(targetMode, undefined, mapName)
      this.refreshStrategy?.softRefresh()
    }
  }

  /**
   * Update parameters and refresh.
   * @param {Object} updates - Parameter updates to apply.
   * @returns {void}
   */
  updateParamsAndRefresh (updates) {
    if (this._hasFunction(this.paramManager?.update)) {
      this.paramManager.update(updates)
      this.paramManager.updateHistoryState()
      this.refreshStrategy?.softRefresh()
    }
  }

  /**
   * Build parameters using builder function and apply them with refresh.
   * @param {Function} paramBuilder - Function that builds parameter object.
   * @returns {void}
   */
  buildAndApplyParams (paramBuilder) {
    if (this._hasFunction(paramBuilder)) {
      const params = paramBuilder()
      this.updateParamsAndRefresh(params)
    }
  }

  /**
   * Determine whether a given value is a function.
   * @private
   * @param {*} value - Value to test.
   * @returns {boolean} True if the value is callable.
   */
  _hasFunction (value) {
    return typeof value === 'function'
  }
}

/**
 * Factory function to create a PageRefreshStrategy instance.
 * @param {RefreshStrategyOptions} options - Configuration options.
 * @returns {PageRefreshStrategy} New PageRefreshStrategy instance.
 */
export function createPageRefreshStrategy (options = {}) {
  return new PageRefreshStrategy(options)
}

/**
 * Factory function to create a StateRefreshStrategy instance.
 * @param {StateRefreshOptions} options - Configuration options.
 * @returns {StateRefreshStrategy} New StateRefreshStrategy instance.
 */
export function createStateRefreshStrategy (options = {}) {
  return new StateRefreshStrategy(options)
}

/**
 * Factory function to create a NavStateManager instance.
 * @param {NavStateManagerOptions} options - Configuration options.
 * @returns {NavStateManager} New NavStateManager instance.
 */
export function createNavStateManager (options = {}) {
  return new NavStateManager(options)
}
