/**
 * @fileoverview UI setup strategy pattern implementation for control initialization.
 * Provides base strategy class and specialized strategies for managing UI control setup,
 * validation, state management, and event handling with extensible callback system.
 * @module navbar/UISetupStrategy
 */

/**
 * @typedef {import('./types/callbacks.types.js').SetupCallback} SetupCallback
 * @typedef {import('./types/ui.types.js').UIControl} UIControl
 * @typedef {import('./types/config.types.js').UISetupStrategyOptions} StrategyOptions
 * @typedef {import('./types/form.types.js').ParameterManager} ParameterManager
 */

/**
 * UISetupStrategy - Base strategy for setting up UI controls.
 * Provides template method pattern for control setup with validation and state management.
 * Extensible base class supporting setup function registration and validation registration.
 *
 * @class
 * @description Implements the Strategy pattern for UI initialization. Subclasses specialize
 *              this template for specific UI control types. Provides core functionality for:
 *              - Registering and executing setup functions
 *              - Managing default state values
 *              - Validating values using registered validators
 *              - Error handling during setup execution
 */
export class UISetupStrategy {
  /**
   * Creates a new UISetupStrategy instance.
   * Initializes empty setup functions array and optional state defaults/validators from options.
   *
   * @param {StrategyOptions} [options={}] - Configuration options.
   * @param {Object.<string, *>} [options.stateDefaults={}] - Default state values by key.
   * @param {Object.<string, Function>} [options.validators={}] - Validator functions by key.
   *
   * @example
   * const strategy = new UISetupStrategy({
   *   stateDefaults: { size: 10, mode: 'normal' },
   *   validators: { size: (v) => Math.max(1, Math.min(20, v)) }
   * });
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
   * Validates that the function is callable before registering.
   * Setup functions execute in registration order during executeSetup().
   *
   * @param {SetupCallback} setupFn - Setup function to register (called with no arguments).
   * @returns {void}
   *
   * @example
   * strategy.registerSetup(() => {
   *   console.log('Setting up height control...');
   *   heightUI.setup(onHeightChange, initialHeight);
   * });
   */
  registerSetup (setupFn) {
    if (typeof setupFn === 'function') {
      this.setupFunctions.push(setupFn)
    }
  }

  /**
   * Execute all registered setup functions in order.
   * Runs setup functions with error handling to prevent one failure blocking others.
   * Errors are logged but do not prevent subsequent setup functions from executing.
   *
   * @returns {void}
   * @throws {never} Exceptions from setup functions are caught and logged.
   *
   * @description Iterates through setupFunctions array and executes each with
   *              _executeSetupFunction() for consistent error handling.
   *
   * @example
   * strategy.registerSetup(() => heightUI.setup(...));
   * strategy.registerSetup(() => widthUI.setup(...));
   * strategy.executeSetup(); // Both setup functions run in sequence
   */
  executeSetup () {
    for (const setupFn of this.setupFunctions) {
      this._executeSetupFunction(setupFn)
    }
  }

  /**
   * Validate a value using registered validators.
   * Looks up validator by key and applies it if found, otherwise returns value unchanged.
   * Safe lookup with type checking to prevent invalid validator execution.
   *
   * @param {string} key - Validator key to use for lookup.
   * @param {*} value - Value to validate.
   * @returns {*} Result from validator function or original value if no validator found.
   *
   * @description Used for input validation and normalization. Validators are responsible
   *              for returning the processed value. If validation fails, it's the
   *              validator's responsibility to throw or return a default.
   *
   * @example
   * strategy.validators.height = (v) => Math.max(1, Math.min(100, v));
   * const validated = strategy.validate('height', 150); // Returns 100 (max)
   * const unvalidated = strategy.validate('unknown', 42); // Returns 42 (no validator)
   */
  validate (key, value) {
    const validator = this._findValidator(key)
    return validator ? validator(value) : value
  }

  /**
   * Get default state value for a key.
   * Retrieves pre-configured state default from stateDefaults map.
   * Returns undefined if key is not found in defaults.
   *
   * @param {string} key - State key to retrieve default for.
   * @returns {*} Default value from stateDefaults or undefined if not set.
   *
   * @example
   * strategy.stateDefaults.boardSize = 8;
   * const size = strategy.getDefaultState('boardSize'); // Returns 8
   * const missing = strategy.getDefaultState('unknown');  // Returns undefined
   */
  getDefaultState (key) {
    return this.stateDefaults[key]
  }

  /**
   * Run a setup function with error handling.
   * Wraps function execution in try-catch to prevent errors from propagating.
   * Caught errors are logged to console for debugging without stopping execution.
   *
   * @private
   * @param {SetupCallback} setupFn - Setup function to execute.
   * @returns {void}
   * @throws {never} All exceptions are caught and logged to console.error.
   *
   * @description Helper method used by executeSetup() to safely run each registered
   *              setup function. Enables robust setup that continues even if
   *              individual functions fail.
   *
   * @example
   * this._executeSetupFunction(() => { throw new Error('Failed'); });
   * // Error logged: 'Setup function error: Error: Failed'
   * // Execution continues
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
   * Safely retrieves and validates that the validator is a function.
   * Returns undefined if key not found or value is not callable.
   *
   * @private
   * @param {string} key - Validator key.
   * @returns {Function|undefined} Validator function if found and valid, undefined otherwise.
   *
   * @description Defensive helper ensuring only callable validators are returned.
   *              Used by validate() to safely execute validator logic.
   *
   * @example
   * this.validators.clamp = (v) => Math.min(10, v);
   * const validator = this._findValidator('clamp');
   * // Returns the clamp function
   * const notFound = this._findValidator('missing');
   * // Returns undefined
   */
  _findValidator (key) {
    const validator = this.validators[key]
    return typeof validator === 'function' ? validator : undefined
  }
}

/**
 * @typedef {Object} SizeControlOptions
 * @property {Object.<string, *>} [stateDefaults] - Default state values by key.
 * @property {Object.<string, Function>} [validators] - Validation functions by key.
 * @property {Function} [onSizeChange] - Callback when size changes (no parameters).
 * @property {Function} [onBoardSetup] - Callback to setup board (no parameters).
 * @property {Function} [onRefresh] - Callback to refresh display (no parameters).
 */

/**
 * SizeControlStrategy - Specialized strategy for size selection UI.
 * Manages height and width UI controls with synchronized dimension updates.
 * Orchestrates dual-dimension controls with unified change event handling.
 *
 * @class
 * @extends {UISetupStrategy}
 * @description Extends base strategy to handle coordinated height/width control setup.
 *              Implements template method pattern where dimension changes trigger
 *              a synchronized callback sequence. Used for board/grid sizing UI.
 */
export class SizeControlStrategy extends UISetupStrategy {
  /**
   * Creates a new SizeControlStrategy instance.
   * Initializes with height/width UI controls and optional callbacks.
   * Callback functions are pre-validated to be callable, defaulting to no-op if not provided.
   *
   * @param {UIControl} heightUI - Height UI control instance with setup(callback, initialValue) method.
   * @param {UIControl} widthUI - Width UI control instance with setup(callback, initialValue) method.
   * @param {SizeControlOptions} [options={}] - Configuration options.
   *
   * @example
   * const heightControl = createHeightUI();
   * const widthControl = createWidthUI();
   * const strategy = new SizeControlStrategy(heightControl, widthControl, {
   *   stateDefaults: { height: 10, width: 10 },
   *   onSizeChange: () => console.log('Size changed'),
   *   onBoardSetup: () => board.initialize(),
   *   onRefresh: () => display.redraw()
   * });
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
   * Registers the height UI control with unified dimension change callback.
   * The callback triggers the full dimension change workflow (size change → board setup → refresh).
   *
   * @param {number} initialHeight - Initial height value to display in control.
   * @returns {void}
   *
   * @description Convenience method that calls _setupControl() for the height UI.
   *              Changes to height trigger _handleDimensionChange() callback sequence.
   *
   * @example
   * strategy.setupHeightControl(10);
   * // Height control now displays 10 and calls _handleDimensionChange on user input
   */
  setupHeightControl (initialHeight) {
    this._setupControl(this.heightUI, initialHeight)
  }

  /**
   * Setup width control with change handler.
   * Registers the width UI control with unified dimension change callback.
   * The callback triggers the full dimension change workflow (size change → board setup → refresh).
   *
   * @param {number} initialWidth - Initial width value to display in control.
   * @returns {void}
   *
   * @description Convenience method that calls _setupControl() for the width UI.
   *              Changes to width trigger _handleDimensionChange() callback sequence.
   *
   * @example
   * strategy.setupWidthControl(10);
   * // Width control now displays 10 and calls _handleDimensionChange on user input
   */
  setupWidthControl (initialWidth) {
    this._setupControl(this.widthUI, initialWidth)
  }

  /**
   * Setup a dimension control with unified change handler.
   * Registers the UI control with _handleDimensionChange as the change callback.
   * Both height and width controls use this common setup path for consistency.
   *
   * @private
   * @param {UIControl} uiControl - UI control instance with setup(callback, initialValue) method.
   * @param {number} initialValue - Initial numeric value for the control.
   * @returns {void}
   *
   * @description Helper method used by setupHeightControl() and setupWidthControl().
   *              Ensures consistent callback binding for both dimension controls.
   *              Any dimension change triggers the full callback sequence.
   *
   * @example
   * this._setupControl(this.heightUI, 8);
   * // heightUI.setup(_handleDimensionChange, 8) is called internally
   */
  _setupControl (uiControl, initialValue) {
    uiControl.setup(() => this._handleDimensionChange(), initialValue)
  }

  /**
   * Handle dimension change - unified handler for both height and width changes.
   * Executes all registered callbacks in sequence: onSizeChange → onBoardSetup → onRefresh.
   * Single point of coordination for dimension-based UI updates.
   *
   * @private
   * @returns {void}
   * @throws {never} Individual callback errors are not caught; any error propagates.
   *
   * @description Called by both height and width UI controls on change.
   *              Provides consistent callback execution order regardless of which
   *              dimension changed. Ensures UI and state stay synchronized.
   *
   * @example
   * // User changes height from 8 to 10:
   * this._handleDimensionChange();
   * // Calls: this.onSizeChange() → this.onBoardSetup() → this.onRefresh()
   */
  _handleDimensionChange () {
    this.onSizeChange()
    this.onBoardSetup()
    this.onRefresh()
  }
}

/**
 * @typedef {Object} MapSelectionOptions
 * @property {Object.<string, *>} [stateDefaults] - Default state values by key.
 * @property {Object.<string, Function>} [validators] - Validation functions by key.
 * @property {Function} [onMapSelect] - Callback when map selected (receives map title parameter).
 * @property {Function} [onRefresh] - Callback to refresh display (no parameters).
 * @property {ParameterManager} [paramManager] - Parameter manager instance for state updates.
 */

/**
 * MapSelectionStrategy - Specialized strategy for map selection UI.
 * Manages map selection and filtering with parameter persistence.
 * Orchestrates map selector UI with state updates and refresh callbacks.
 *
 * @class
 * @extends {UISetupStrategy}
 * @description Extends base strategy for map selection workflows. Coordinates map
 *              selection UI with state management and display refresh. Supports
 *              optional ParameterManager for map choice persistence.
 */
export class MapSelectionStrategy extends UISetupStrategy {
  /**
   * Creates a new MapSelectionStrategy instance.
   * Initializes with optional callbacks and parameter manager.
   * Callback functions are pre-validated to be callable, defaulting to no-op if not provided.
   *
   * @param {MapSelectionOptions} [options={}] - Configuration options.
   *
   * @example
   * const strategy = new MapSelectionStrategy({
   *   paramManager: paramManager,
   *   onMapSelect: (title) => { maps.setTo(title); },
   *   onRefresh: () => { ui.redraw(); }
   * });
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
   * Initializes the map selection UI control with unified selection callback.
   * Pre-selects the current map if provided.
   *
   * @param {UIControl} mapSelectUI - Map selection UI control with setup(callback, null, initial) method.
   * @param {string} currentMapName - Currently selected map name (used as pre-selection).
   * @returns {void}
   *
   * @description Wires the map selector UI to trigger _handleMapSelected() on user selection.
   *              The null parameter is reserved for a cancel handler (not currently used).
   *              The currentMapName pre-selects the map in the dropdown.
   *
   * @example
   * const mapUI = new ChooseFromListUI(mapTitles, 'mapSelector');
   * strategy.setupMapSelector(mapUI, 'desert-battle');
   * // Map selector now pre-selects 'desert-battle' and triggers callbacks on selection
   */
  setupMapSelector (mapSelectUI, currentMapName) {
    mapSelectUI.setup(
      (_index, title) => this._handleMapSelected(title),
      null,
      currentMapName
    )
  }

  /**
   * Handle map selection event triggered by UI.
   * Executes callbacks in sequence: onMapSelect(title) → onRefresh().
   * Single point of coordination for map selection workflows.
   *
   * @private
   * @param {string} title - Selected map title identifier.
   * @returns {void}
   * @throws {never} Individual callback errors are not caught; any error propagates.
   *
   * @description Called by map selector UI when user selects a map.
   *              Passes map title to onMapSelect for state updates, then calls
   *              onRefresh to update display. Ensures consistent callback order.
   *
   * @example
   * // User selects 'sea-map' from dropdown:
   * this._handleMapSelected('sea-map');
   * // Calls: this.onMapSelect('sea-map') → this.onRefresh()
   */
  _handleMapSelected (title) {
    this.onMapSelect(title)
    this.onRefresh()
  }
}

/**
 * Create a SizeControlStrategy with common setup.
 * Factory function for creating and configuring a SizeControlStrategy instance.
 * Registers a setup function that initializes both height and width controls.
 *
 * @param {UIControl} heightUI - Height UI control instance.
 * @param {UIControl} widthUI - Width UI control instance.
 * @param {Object} options - Configuration options including initialHeight and initialWidth.
 * @param {number} options.initialHeight - Initial height value for control setup.
 * @param {number} options.initialWidth - Initial width value for control setup.
 * @returns {SizeControlStrategy} Configured SizeControlStrategy instance ready to executeSetup().
 *
 * @description Creates a new SizeControlStrategy and pre-registers a setup function
 *              that initializes both dimension controls. Caller should invoke
 *              strategy.executeSetup() to trigger initialization.
 *
 * @example
 * const strategy = createSizeControls(heightUI, widthUI, {
 *   initialHeight: 8,
 *   initialWidth: 8,
 *   onSizeChange: () => console.log('Size updated'),
 *   onBoardSetup: () => board.resetSize(),
 *   onRefresh: () => display.redraw()
 * });
 * strategy.executeSetup(); // Initializes height and width controls
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
 * Factory function for creating a MapSelectionStrategy with provided options.
 * Does not pre-register any setup functions (caller can add via registerSetup if needed).
 *
 * @param {Object} options - Configuration options for map selection strategy.
 * @returns {MapSelectionStrategy} MapSelectionStrategy instance ready for configuration.
 *
 * @description Creates a new MapSelectionStrategy configured with provided callbacks
 *              and parameter manager. Unlike createSizeControls, this factory does not
 *              pre-register setup functions, giving callers full control over setup.
 *
 * @example
 * const strategy = createMapSelectionStrategy({
 *   onMapSelect: (title) => maps.setTo(title),
 *   onRefresh: () => ui.redraw()
 * });
 * strategy.registerSetup(() => setupMapUI());
 * strategy.executeSetup();
 */
export function createMapSelectionStrategy (options) {
  return new MapSelectionStrategy(options)
}
