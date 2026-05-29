/**
 * @typedef {import('./types/callbacks.types.js').RefreshCallback} RefreshCallback
 * @typedef {import('./types/callbacks.types.js').VoidCallback} VoidCallback
 * @typedef {import('./types/callbacks.types.js').BeforeCallback} BeforeCallback
 * @typedef {import('./types/callbacks.types.js').AfterCallback} AfterCallback
 * @typedef {import('./types/config.types.js').RefreshStrategyOptions} RefreshStrategyOptions
 */

/**
 * @typedef {Object} StateRefreshCallbacks
 * @property {VoidCallback} [boardSetup] - Board setup callback.
 * @property {VoidCallback} [clearStarfield] - Starfield clear callback.
 */

/**
 * @typedef {Object} StateRefreshOptions
 * @property {BeforeCallback} [beforeRefresh] - Callback before refresh.
 * @property {AfterCallback} [afterRefresh] - Callback after refresh.
 * @property {VoidCallback} [boardSetup] - Board setup callback.
 * @property {VoidCallback} [clearStarfield] - Starfield clear callback.
 */

/**
 * @typedef {Object} NavigationServiceInterface
 * @property {(targetMode: string, huntMode?: string|undefined, mapName?: string|null) => void} switchToMode - Switch to target mode.
 */

/**
 * @typedef {Object} ParameterManagerInterface
 * @property {(paramMap: Object) => void} setAll - Set all parameters at once.
 * @property {() => void} updateHistoryState - Update browser history state.
 */

/**
 * @typedef {Object} NavStateManagerOptionsObj
 * @property {ParameterManagerInterface} [paramManager] - Parameter manager instance.
 * @property {PageRefreshStrategy} [refreshStrategy] - Refresh strategy instance.
 * @property {NavigationServiceInterface} [navigationService] - Navigation service instance.
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
   * @param {RefreshCallback} callback - Callback to invoke.
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
 * StateRefreshStrategy - Specifically for refreshing game state.
 * Extends PageRefreshStrategy with board and starfield management.
 *
 * @class
 * @extends {PageRefreshStrategy}
 */
export class StateRefreshStrategy extends PageRefreshStrategy {
  /**
   * Creates a new StateRefreshStrategy instance.
   * @param {StateRefreshCallbacks & RefreshStrategyOptions} options - Configuration options.
   */
  constructor (options = {}) {
    super(options)

    /** @type {VoidCallback} Callback to setup board. */
    this.boardSetupCallback = options.boardSetup || (() => {})

    /** @type {VoidCallback} Callback to clear starfield. */
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
 * NavStateManager - Manages navigation and refresh state together.
 * Coordinates parameter management, navigation, and refresh strategies.
 *
 * @class
 */
export class NavStateManager {
  /**
   * Creates a new NavStateManager instance.
   * @param {NavStateManagerOptionsObj} options - Configuration options.
   */
  constructor (options = {}) {
    /** @type {ParameterManagerInterface|undefined} */
    this.paramManager = options.paramManager

    /** @type {PageRefreshStrategy|undefined} */
    this.refreshStrategy = options.refreshStrategy

    /** @type {NavigationServiceInterface|undefined} */
    this.navigationService = options.navigationService
  }

  /**
   * Navigate to target mode and refresh.
   * @param {string} targetMode - Target navigation mode.
   * @param {string|null} [mapName=null] - Optional map name for navigation.
   * @returns {void}
   */
  navigateAndRefresh (targetMode, mapName = null) {
    if (
      this.navigationService &&
      this._hasFunction(this.navigationService.switchToMode)
    ) {
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
    if (this.paramManager && this._hasFunction(this.paramManager.setAll)) {
      this.paramManager.setAll(updates)
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
 * @typedef {Object} NavStateManagerOptions
 * @property {ParameterManagerInterface} [paramManager] - Parameter manager instance.
 * @property {PageRefreshStrategy} [refreshStrategy] - Refresh strategy instance.
 * @property {NavigationServiceInterface} [navigationService] - Navigation service instance.
 */

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
 * @param {NavStateManagerOptionsObj} options - Configuration options.
 * @returns {NavStateManager} New NavStateManager instance.
 */
export function createNavStateManager (options = {}) {
  return new NavStateManager(options)
}
