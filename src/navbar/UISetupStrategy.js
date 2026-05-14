/**
 * @typedef {Function} SetupCallback
 * @returns {void}
 */

/**
 * @typedef {Object} UIControl
 * @property {Function} setup - Setup handler registration function.
 */

/**
 * @typedef {Object} StrategyOptions
 * @property {Object.<string, *>} [stateDefaults={}] - Default state values.
 * @property {Object.<string, Function>} [validators={}] - Validation functions by key.
 */

/**
 * UISetupStrategy - Base strategy for setting up UI controls.
 * Provides template for control setup with validation and state management.
 * @class
 */
export class UISetupStrategy {
  /**
   * Creates a new UISetupStrategy instance.
   * @param {StrategyOptions} options - Configuration options.
   */
  constructor (options = {}) {
    /** @type {SetupCallback[]} Array of setup functions to execute */
    this.setupFunctions = []
    /** @type {Object.<string, *>} Default state values by key */
    this.stateDefaults = options.stateDefaults || {}
    /** @type {Object.<string, Function>} Validator functions by key */
    this.validators = options.validators || {}
  }

  /**
   * Register a setup function to execute during initialization.
   * @param {SetupCallback} setupFn - Setup function to register.
   * @returns {void}
   */
  registerSetup (setupFn) {
    if (typeof setupFn === 'function') {
      this.setupFunctions.push(setupFn)
    }
  }

  /**
   * Execute all registered setup functions.
   * Runs setup functions with error handling.
   * @returns {void}
   */
  executeSetup () {
    for (const setupFn of this.setupFunctions) {
      this._executeSetupFunction(setupFn)
    }
  }

  /**
   * Validate a value using registered validators.
   * @param {string} key - Validator key to use.
   * @param {*} value - Value to validate.
   * @returns {*} Validated value.
   */
  validate (key, value) {
    const validator = this._findValidator(key)
    return validator ? validator(value) : value
  }

  /**
   * Get default state value for a key.
   * @param {string} key - State key to retrieve default for.
   * @returns {*} Default value or undefined.
   */
  getDefaultState (key) {
    return this.stateDefaults[key]
  }

  /**
   * Run a setup function with error handling.
   * @private
   * @param {SetupCallback} setupFn - Setup function to execute.
   * @returns {void}
   */
  _executeSetupFunction (setupFn) {
    try {
      setupFn()
    } catch (error) {
      console.error('Setup function error:', error)
    }
  }

  /**
   * Find a validator function by key.
   * @private
   * @param {string} key - Validator key.
   * @returns {Function|undefined} Validator function.
   */
  _findValidator (key) {
    const validator = this.validators[key]
    return typeof validator === 'function' ? validator : undefined
  }
}

/**
 * @typedef {Object} SizeControlOptions
 * @property {Object.<string, *>} [stateDefaults] - Default state values.
 * @property {Object.<string, Function>} [validators] - Validation functions.
 * @property {Function} [onSizeChange] - Callback when size changes.
 * @property {Function} [onBoardSetup] - Callback to setup board.
 * @property {Function} [onRefresh] - Callback to refresh display.
 */

/**
 * SizeControlStrategy - Specialized strategy for size selection UI.
 * Manages height and width UI controls with synchronized updates.
 * @class
 * @extends {UISetupStrategy}
 */
export class SizeControlStrategy extends UISetupStrategy {
  /**
   * Creates a new SizeControlStrategy instance.
   * @param {UIControl} heightUI - Height UI control instance.
   * @param {UIControl} widthUI - Width UI control instance.
   * @param {SizeControlOptions} options - Configuration options.
   */
  constructor (heightUI, widthUI, options = {}) {
    super(options)
    /** @type {UIControl} Height UI control */
    this.heightUI = heightUI
    /** @type {UIControl} Width UI control */
    this.widthUI = widthUI
    /** @type {Function} Callback when size changes */
    this.onSizeChange = options.onSizeChange || (() => {})
    /** @type {Function} Callback to setup board */
    this.onBoardSetup = options.onBoardSetup || (() => {})
    /** @type {Function} Callback to refresh display */
    this.onRefresh = options.onRefresh || (() => {})
  }

  /**
   * Setup height control with change handler.
   * @param {number} initialHeight - Initial height value.
   * @returns {void}
   */
  setupHeightControl (initialHeight) {
    this._setupControl(this.heightUI, initialHeight)
  }

  /**
   * Setup width control with change handler.
   * @param {number} initialWidth - Initial width value.
   * @returns {void}
   */
  setupWidthControl (initialWidth) {
    this._setupControl(this.widthUI, initialWidth)
  }

  /**
   * Setup a dimension control.
   * @private
   * @param {UIControl} uiControl - UI control instance.
   * @param {number} initialValue - Initial numeric value.
   * @returns {void}
   */
  _setupControl (uiControl, initialValue) {
    uiControl.setup(() => this._handleDimensionChange(), initialValue)
  }

  /**
   * Handle dimension change - unified handler for both height and width.
   * Executes all registered callbacks in sequence.
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
 * @typedef {Object} MapSelectionOptions
 * @property {Object.<string, *>} [stateDefaults] - Default state values.
 * @property {Object.<string, Function>} [validators] - Validation functions.
 * @property {Function} [onMapSelect] - Callback when map selected.
 * @property {Function} [onRefresh] - Callback to refresh display.
 * @property {ParameterManager} [paramManager] - Parameter manager instance.
 */

/**
 * MapSelectionStrategy - Specialized strategy for map selection UI.
 * Manages map selection and filtering.
 * @class
 * @extends {UISetupStrategy}
 */
export class MapSelectionStrategy extends UISetupStrategy {
  /**
   * Creates a new MapSelectionStrategy instance.
   * @param {MapSelectionOptions} options - Configuration options.
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
   * Setup map selector with selection handler.
   * @param {UIControl} mapSelectUI - Map selection UI control.
   * @param {string} currentMapName - Currently selected map name.
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
   * Handle map selection event.
   * Executes callbacks in sequence.
   * @private
   * @param {string} title - Selected map title.
   * @returns {void}
   */
  _handleMapSelected (title) {
    this.onMapSelect(title)
    this.onRefresh()
  }
}

/**
 * Create a SizeControlStrategy with common setup.
 * Factory function for creating size control strategy with registered setup.
 * @param {UIControl} heightUI - Height UI control instance.
 * @param {UIControl} widthUI - Width UI control instance.
 * @param {Object} options - Configuration options.
 * @returns {SizeControlStrategy} Configured SizeControlStrategy instance.
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
 * Create a MapSelectionStrategy instance.
 * Factory function for creating map selection strategy.
 * @param {Object} options - Configuration options.
 * @returns {MapSelectionStrategy} MapSelectionStrategy instance.
 */
export function createMapSelectionStrategy (options) {
  return new MapSelectionStrategy(options)
}
