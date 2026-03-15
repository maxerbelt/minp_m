/**
 * PageRefreshStrategy - Strategy for managing page refresh operations
 * Handles different types of page refreshes and state preservation
 */
export class PageRefreshStrategy {
  constructor (options = {}) {
    this.refreshHandlers = []
    this.beforeRefresh = options.beforeRefresh || (() => {})
    this.afterRefresh = options.afterRefresh || (() => {})
  }

  /**
   * Register a refresh handler that executes before refresh
   */
  addRefreshHandler (handler) {
    if (typeof handler === 'function') {
      this.refreshHandlers.push(handler)
    }
  }

  /**
   * Execute full page refresh
   */
  refreshPage () {
    this.beforeRefresh()
    this.refreshHandlers.forEach(handler => {
      try {
        handler()
      } catch (error) {
        console.error('Refresh handler error:', error)
      }
    })
    this.afterRefresh()
    globalThis.location.reload()
  }

  /**
   * Execute soft refresh (without page reload)
   */
  softRefresh () {
    this.beforeRefresh()
    this.refreshHandlers.forEach(handler => {
      try {
        handler()
      } catch (error) {
        console.error('Refresh handler error:', error)
      }
    })
    this.afterRefresh()
  }

  /**
   * Clear refresh handlers
   */
  clearHandlers () {
    this.refreshHandlers = []
  }
}

/**
 * StateRefreshStrategy - Specifically for refreshing game state
 */
export class StateRefreshStrategy extends PageRefreshStrategy {
  constructor (options = {}) {
    super(options)
    this.boardSetupCallback = options.boardSetup || (() => {})
    this.clearStarfieldCallback = options.clearStarfield || (() => {})
  }

  /**
   * Refresh game board state
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
   * Clear and refresh
   */
  clearAndRefresh () {
    this.refreshWithStarfield()
  }
}

/**
 * NavStateManager - Manages navigation and refresh state together
 */
export class NavStateManager {
  constructor (options = {}) {
    this.paramManager = options.paramManager
    this.refreshStrategy = options.refreshStrategy
    this.navigationService = options.navigationService
  }

  /**
   * Navigate and refresh
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
   */
  updateParamsAndRefresh (updates) {
    if (this.paramManager && typeof this.paramManager.update === 'function') {
      this.paramManager.update(updates)
      this.paramManager.updateHistoryState()
      this.refreshStrategy?.softRefresh()
    }
  }

  /**
   * Build and apply params
   */
  buildAndApplyParams (paramBuilder) {
    if (typeof paramBuilder === 'function') {
      const params = paramBuilder()
      this.updateParamsAndRefresh(params)
    }
  }
}

/**
 * Create page refresh strategy
 */
export function createPageRefreshStrategy (options = {}) {
  return new PageRefreshStrategy(options)
}

/**
 * Create state refresh strategy
 */
export function createStateRefreshStrategy (options = {}) {
  return new StateRefreshStrategy(options)
}

/**
 * Create navigation state manager
 */
export function createNavStateManager (options = {}) {
  return new NavStateManager(options)
}
