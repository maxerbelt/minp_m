/**
 * UISetupStrategy - Base strategy for setting up UI controls
 * Provides template for control setup with validation and state management
 *
 * @class
 */
export class UISetupStrategy {
  /**
   * @typedef {Object} StrategyOptions
   * @property {Object.<string, *>} [stateDefaults={}] - Default state values
   * @property {Object.<string, Function>} [validators={}] - Validation functions by key
   */

  /**
   * Creates a new UISetupStrategy instance
   * @param {StrategyOptions} options - Configuration options
   */
  constructor (options = {}) {
    /** @type {Function[]} Array of setup functions to execute */
    this.setupFunctions = []
    /** @type {Object.<string, *>} Default state values by key */
    this.stateDefaults = options.stateDefaults || {}
    /** @type {Object.<string, Function>} Validator functions by key */
    this.validators = options.validators || {}
  }

  /**
   * Register a setup function to execute during initialization
   * @param {Function} setupFn - Setup function to register
   * @returns {void}
   */
  registerSetup (setupFn) {
    if (typeof setupFn === 'function') {
      this.setupFunctions.push(setupFn)
    }
  }

  /**
   * Execute all registered setup functions
   * Runs setup functions with error handling
   * @returns {void}
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
   * @param {string} key - Validator key to use
   * @param {*} value - Value to validate
   * @returns {*} Validated value
   */
  validate (key, value) {
    const validator = this.validators[key]
    if (validator && typeof validator === 'function') {
      return validator(value)
    }
    return value
  }

  /**
   * Get default state value for a key
   * @param {string} key - State key to retrieve default for
   * @returns {*} Default value or undefined
   */
  getDefaultState (key) {
    return this.stateDefaults[key]
  }
}

/**
 * SizeControlStrategy - Specialized strategy for size selection UI
 * Manages height and width UI controls with synchronized updates
 *
 * @class
 * @extends {UISetupStrategy}
 */
export class SizeControlStrategy extends UISetupStrategy {
  /**
   * @typedef {Object} SizeControlOptions
   * @property {Object.<string, *>} [stateDefaults] - Default state values
   * @property {Object.<string, Function>} [validators] - Validation functions
   * @property {Function} [onSizeChange] - Callback when size changes
   * @property {Function} [onBoardSetup] - Callback to setup board
   * @property {Function} [onRefresh] - Callback to refresh display
   */

  /**
   * Creates a new SizeControlStrategy instance
   * @param {Object} heightUI - Height UI control instance
   * @param {Object} widthUI - Width UI control instance
   * @param {SizeControlOptions} options - Configuration options
   */
  constructor (heightUI, widthUI, options = {}) {
    super(options)
    /** @type {Object} Height UI control */
    this.heightUI = heightUI
    /** @type {Object} Width UI control */
    this.widthUI = widthUI
    /** @type {Function} Callback when size changes */
    this.onSizeChange = options.onSizeChange || (() => {})
    /** @type {Function} Callback to setup board */
    this.onBoardSetup = options.onBoardSetup || (() => {})
    /** @type {Function} Callback to refresh display */
    this.onRefresh = options.onRefresh || (() => {})
  }

  /**
   * Setup height control with change handler
   * @param {number} initialHeight - Initial height value
   * @returns {void}
   */
  setupHeightControl (initialHeight) {
    this.heightUI.setup(() => this._handleDimensionChange(), initialHeight)
  }

  /**
   * Setup width control with change handler
   * @param {number} initialWidth - Initial width value
   * @returns {void}
   */
  setupWidthControl (initialWidth) {
    this.widthUI.setup(() => this._handleDimensionChange(), initialWidth)
  }

  /**
   * Handle dimension change - unified handler for both height and width
   * Executes all registered callbacks in sequence
   * @private
   * @returns {void}
   */
  _handleDimensionChange () {
    this.onSizeChange()
    this.onBoardSetup()
    this.onRefresh()
  }
}

/**
 * MapSelectionStrategy - Specialized strategy for map selection UI
 * Manages map selection and filtering
 *
 * @class
 * @extends {UISetupStrategy}
 */
export class MapSelectionStrategy extends UISetupStrategy {
  /**
   * @typedef {Object} MapSelectionOptions
   * @property {Object.<string, *>} [stateDefaults] - Default state values
   * @property {Object.<string, Function>} [validators] - Validation functions
   * @property {Function} [onMapSelect] - Callback when map selected
   * @property {Function} [onRefresh] - Callback to refresh display
   * @property {ParameterManager} [paramManager] - Parameter manager instance
   */

  /**
   * Creates a new MapSelectionStrategy instance
   * @param {MapSelectionOptions} options - Configuration options
   */
  constructor (options = {}) {
    super(options)
    /** @type {Function} Callback when map is selected */
    this.onMapSelect = options.onMapSelect || (() => {})
    /** @type {Function} Callback to refresh display */
    this.onRefresh = options.onRefresh || (() => {})
    /** @type {ParameterManager|undefined} Parameter manager instance */
    this.paramManager = options.paramManager
  }

  /**
   * Setup map selector with selection handler
   * @param {Object} mapSelectUI - Map selection UI control
   * @param {string} currentMapName - Currently selected map name
   * @returns {void}
   */
  setupMapSelector (mapSelectUI, currentMapName) {
    mapSelectUI.setup(
      (_index, title) => this._handleMapSelected(title),
      null,
      currentMapName
    )
  }

  /**
   * Handle map selection event
   * Executes callbacks in sequence
   * @private
   * @param {string} title - Selected map title
   * @returns {void}
   */
  _handleMapSelected (title) {
    this.onMapSelect(title)
    this.onRefresh()
  }
}

/**
 * Create a SizeControlStrategy with common setup
 * Factory function for creating size control strategy with registered setup
 * @param {Object} heightUI - Height UI control instance
 * @param {Object} widthUI - Width UI control instance
 * @param {Object} options - Configuration options
 * @returns {SizeControlStrategy} Configured SizeControlStrategy instance
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
 * Create a MapSelectionStrategy instance
 * Factory function for creating map selection strategy
 * @param {Object} options - Configuration options
 * @returns {MapSelectionStrategy} MapSelectionStrategy instance
 */
export function createMapSelectionStrategy (options) {
  return new MapSelectionStrategy(options)
}
