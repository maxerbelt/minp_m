/**
 * PageRefreshStrategy - Strategy for managing page refresh operations
 * Handles different types of page refreshes and state preservation
 *
 * @class
 */
export class PageRefreshStrategy {
  /**
   * @typedef {Object} RefreshStrategyOptions
   * @property {Function} [beforeRefresh] - Callback before refresh
   * @property {Function} [afterRefresh] - Callback after refresh
   */

  /**
   * Creates a new PageRefreshStrategy instance
   * @param {RefreshStrategyOptions} options - Configuration options
   */
  constructor (options = {}) {
    /** @type {Function[]} Array of handlers to execute during refresh */
    this.refreshHandlers = []
    /** @type {Function} Callback to execute before refresh */
    this.beforeRefresh = options.beforeRefresh || (() => {})
    /** @type {Function} Callback to execute after refresh */
    this.afterRefresh = options.afterRefresh || (() => {})
  }

  /**
   * Execute all refresh handlers with error handling
   * @private
   * @returns {void}
   */
  _executeHandlers () {
    this.refreshHandlers.forEach(handler => {
      try {
        handler()
      } catch (error) {
        console.error('Refresh handler error:', error)
      }
    })
  }

  /**
   * Register a refresh handler that executes during refresh
   * @param {Function} handler - Handler function to register
   * @returns {void}
   */
  addRefreshHandler (handler) {
    if (typeof handler === 'function') {
      this.refreshHandlers.push(handler)
    }
  }

  /**
   * Execute full page refresh with handlers and page reload
   * @returns {void}
   */
  refreshPage () {
    this.beforeRefresh()
    this._executeHandlers()
    this.afterRefresh()
    globalThis.location.reload()
  }

  /**
   * Execute soft refresh (without page reload)
   * @returns {void}
   */
  softRefresh () {
    this.beforeRefresh()
    this._executeHandlers()
    this.afterRefresh()
  }

  /**
   * Clear all registered refresh handlers
   * @returns {void}
   */
  clearHandlers () {
    this.refreshHandlers = []
  }
}

/**
 * StateRefreshStrategy - Specifically for refreshing game state
 * Extends PageRefreshStrategy with board and starfield management
 *
 * @class
 * @extends {PageRefreshStrategy}
 */
export class StateRefreshStrategy extends PageRefreshStrategy {
  /**
   * @typedef {Object} StateRefreshOptions
   * @property {Function} [beforeRefresh] - Callback before refresh
   * @property {Function} [afterRefresh] - Callback after refresh
   * @property {Function} [boardSetup] - Board setup callback
   * @property {Function} [clearStarfield] - Starfield clear callback
   */

  /**
   * Creates a new StateRefreshStrategy instance
   * @param {StateRefreshOptions} options - Configuration options
   */
  constructor (options = {}) {
    super(options)
    /** @type {Function} Callback to setup board */
    this.boardSetupCallback = options.boardSetup || (() => {})
    /** @type {Function} Callback to clear starfield */
    this.clearStarfieldCallback = options.clearStarfield || (() => {})
  }

  /**
   * Refresh game board state
   * @returns {void}
   * @throws {Error} If board setup fails
   */
  refreshBoardState () {
    try {
      this.boardSetupCallback()
      this.softRefresh()
    } catch (error) {
      console.error('Board state refresh error:', error)
    }
  }

  /**
   * Refresh with starfield clearing
   * @returns {void}
   * @throws {Error} If refresh fails
   */
  refreshWithStarfield () {
    try {
      this.clearStarfieldCallback()
      this.boardSetupCallback()
      this.softRefresh()
    } catch (error) {
      console.error('Starfield refresh error:', error)
    }
  }

  /**
   * Alias for refreshWithStarfield - clear and refresh
   * @returns {void}
   */
  clearAndRefresh () {
    this.refreshWithStarfield()
  }
}

/**
 * NavStateManager - Manages navigation and refresh state together
 * Coordinates parameter management, navigation, and refresh strategies
 *
 * @class
 */
export class NavStateManager {
  /**
   * @typedef {Object} NavStateManagerOptions
   * @property {ParameterManager} [paramManager] - Parameter manager instance
   * @property {PageRefreshStrategy} [refreshStrategy] - Refresh strategy instance
   * @property {Object} [navigationService] - Navigation service instance
   */

  /**
   * Creates a new NavStateManager instance
   * @param {NavStateManagerOptions} options - Configuration options
   */
  constructor (options = {}) {
    /** @type {ParameterManager} Parameter manager for URL parameters */
    this.paramManager = options.paramManager
    /** @type {PageRefreshStrategy} Strategy for page refreshes */
    this.refreshStrategy = options.refreshStrategy
    /** @type {Object} Service for navigation mode switching */
    this.navigationService = options.navigationService
  }

  /**
   * Navigate to target mode and refresh
   * @param {string} targetMode - Target navigation mode
   * @param {string|null} [mapName=null] - Optional map name for navigation
   * @returns {void}
   */
  navigateAndRefresh (targetMode, mapName = null) {
    if (
      this.navigationService &&
      typeof this.navigationService.switchToMode === 'function'
    ) {
      this.navigationService.switchToMode(targetMode, undefined, mapName)
      this.refreshStrategy?.softRefresh()
    }
  }

  /**
   * Update parameters and refresh
   * @param {Object} updates - Parameter updates to apply
   * @returns {void}
   */
  updateParamsAndRefresh (updates) {
    if (this.paramManager && typeof this.paramManager.update === 'function') {
      this.paramManager.update(updates)
      this.paramManager.updateHistoryState()
      this.refreshStrategy?.softRefresh()
    }
  }

  /**
   * Build parameters using builder function and apply them with refresh
   * @param {Function} paramBuilder - Function that builds parameter object
   * @returns {void}
   */
  buildAndApplyParams (paramBuilder) {
    if (typeof paramBuilder === 'function') {
      const params = paramBuilder()
      this.updateParamsAndRefresh(params)
    }
  }
}

/**
 * Factory function to create a PageRefreshStrategy instance
 * @param {RefreshStrategyOptions} options - Configuration options
 * @returns {PageRefreshStrategy} New PageRefreshStrategy instance
 */
export function createPageRefreshStrategy (options = {}) {
  return new PageRefreshStrategy(options)
}

/**
 * Factory function to create a StateRefreshStrategy instance
 * @param {StateRefreshOptions} options - Configuration options
 * @returns {StateRefreshStrategy} New StateRefreshStrategy instance
 */
export function createStateRefreshStrategy (options = {}) {
  return new StateRefreshStrategy(options)
}

/**
 * Factory function to create a NavStateManager instance
 * @param {NavStateManagerOptions} options - Configuration options
 * @returns {NavStateManager} New NavStateManager instance
 */
export function createNavStateManager (options = {}) {
  return new NavStateManager(options)
}
