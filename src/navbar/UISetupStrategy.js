/**
 * UISetupStrategy - Base strategy for setting up UI controls
 * Provides template for control setup with validation and state management
 */
export class UISetupStrategy {
  constructor (options = {}) {
    this.setupFunctions = []
    this.stateDefaults = options.stateDefaults || {}
    this.validators = options.validators || {}
  }

  /**
   * Register a setup function to execute during initialization
   */
  registerSetup (setupFn) {
    if (typeof setupFn === 'function') {
      this.setupFunctions.push(setupFn)
    }
  }

  /**
   * Execute all registered setup functions
   */
  executeSetup () {
    for (const setupFn of this.setupFunctions) {
      try {
        setupFn()
      } catch (error) {
        console.error('Setup function error:', error)
      }
    }
  }

  /**
   * Validate a value using registered validators
   */
  validate (key, value) {
    const validator = this.validators[key]
    if (validator && typeof validator === 'function') {
      return validator(value)
    }
    return value
  }

  /**
   * Get default state value
   */
  getDefaultState (key) {
    return this.stateDefaults[key]
  }
}

/**
 * SizeControlStrategy - Specialized strategy for size selection UI
 * Manages height and width UI controls with synchronized updates
 */
export class SizeControlStrategy extends UISetupStrategy {
  constructor (heightUI, widthUI, options = {}) {
    super(options)
    this.heightUI = heightUI
    this.widthUI = widthUI
    this.onSizeChange = options.onSizeChange || (() => {})
    this.onBoardSetup = options.onBoardSetup || (() => {})
    this.onRefresh = options.onRefresh || (() => {})
  }

  /**
   * Setup height control with change handler
   */
  setupHeightControl (initialHeight) {
    this.heightUI.setup(_index => this._handleHeightChange(), initialHeight)
  }

  /**
   * Setup width control with change handler
   */
  setupWidthControl (initialWidth) {
    this.widthUI.setup(_index => this._handleWidthChange(), initialWidth)
  }

  /**
   * Handle height change event
   * @private
   */
  _handleHeightChange () {
    this._executeOnSizeChange()
  }

  /**
   * Handle width change event
   * @private
   */
  _handleWidthChange () {
    this._executeOnSizeChange()
  }

  /**
   * Execute all callbacks when size changes
   * @private
   */
  _executeOnSizeChange () {
    this.onSizeChange()
    this.onBoardSetup()
    this.onRefresh()
  }
}

/**
 * MapSelectionStrategy - Specialized strategy for map selection UI
 * Manages map selection and filtering
 */
export class MapSelectionStrategy extends UISetupStrategy {
  constructor (options = {}) {
    super(options)
    this.onMapSelect = options.onMapSelect || (() => {})
    this.onRefresh = options.onRefresh || (() => {})
    this.paramManager = options.paramManager
  }

  /**
   * Setup map selector with selection handler
   */
  setupMapSelector (mapSelectUI, currentMapName) {
    mapSelectUI.setup(
      (index, title) => this._handleMapSelected(title),
      null,
      currentMapName
    )
  }

  /**
   * Handle map selection
   * @private
   */
  _handleMapSelected (title) {
    this.onMapSelect(title)
    this.onRefresh()
  }
}

/**
 * ControlSetupOptions - Initialize UI controls with common options
 */
export function createSizeControls (heightUI, widthUI, options) {
  const strategy = new SizeControlStrategy(heightUI, widthUI, options)

  strategy.registerSetup(() => {
    const { initialHeight, initialWidth } = options
    strategy.setupHeightControl(initialHeight)
    strategy.setupWidthControl(initialWidth)
  })

  return strategy
}

/**
 * Create map selection strategy
 */
export function createMapSelectionStrategy (options) {
  return new MapSelectionStrategy(options)
}
