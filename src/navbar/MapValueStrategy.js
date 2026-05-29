/**
 * @typedef {import('./types/shared.types.ts').ValueMap} ValueMap
 * @typedef {import('./types/config.types.ts').ValueValidator} ValueValidator
 * @typedef {import('./types/config.types.ts').MapValueStrategyOptions} MapValueStrategyOptions
 * @typedef {import('./types/config.types.ts').MapEditStrategyOptions} MapEditStrategyOptions
 * @typedef {import('./types/callbacks.types.ts').ValueChangeCallback} ValueChangeCallback
 * @typedef {import('./types/callbacks.types.ts').MapSelectCallback} MapSelectCallback
 * @typedef {import('./types/domain.types.ts').MapObject} MapObject
 */

/**
 * Safely invoke a callback if it is a function.
 * Provides error handling and type checking for callback invocation.
 * If the callback is not a function or throws an error, logs to console.error.
 *
 * @private
 * @param {Function|null|undefined} callback - Callback function to invoke, or null/undefined to skip.
 * @param {*} arg - Argument to pass to the callback function.
 * @param {string} description - Description used for error logging context.
 * @returns {void}
 * @example
 * _safeInvokeCallback(onChange, 'new-value', 'value change')
 * // If onChange throws: logs "Error in value change callback: <error>"
 */
function _safeInvokeCallback (callback, arg, description) {
  if (typeof callback !== 'function') {
    return
  }

  try {
    callback(arg)
  } catch (error) {
    console.error(`Error in ${description} callback:`, error)
  }
}

/**
 * MapValueStrategy - Base strategy for managing map-related value selections.
 * Encapsulates value validation, selection, and change notification logic.
 * Provides generic value selection with optional validation and callbacks.
 * This class serves as a base for terrain, water, and other value-based selection strategies.
 *
 * @class
 * @public
 * @description Manages value selections with optional custom validators and change callbacks.
 */
export class MapValueStrategy {
  /**
   * Initialize map value strategy.
   * Sets up the strategy with a value map, default value, and optional validator and change callback.
   *
   * @constructor
   * @public
   * @param {MapValueStrategyOptions} [options={}] - Configuration options.
   * @param {ValueMap} [options.valueMap={}] - Map of value identifiers to display names.
   * @param {*} [options.defaultValue] - Default selected value (may be undefined).
   * @param {ValueChangeCallback} [options.onValueChange] - Callback invoked when value changes. Default is no-op.
   * @param {ValueValidator|null} [options.validator] - Optional custom validator function. If provided, overrides valueMap checking.
   * @example
   * const strategy = new MapValueStrategy({
   *   valueMap: { 'sea': 'Sea and Land', 'space': 'Space' },
   *   defaultValue: 'sea',
   *   onValueChange: (val) => console.log('Selected:', val),
   *   validator: (val) => ['sea', 'space'].includes(val)
   * });
   */
  constructor (options = {}) {
    const {
      valueMap = {},
      defaultValue,
      onValueChange = () => {},
      validator = null
    } = options

    /** @type {ValueMap} Map of value identifiers to display names */
    this.valueMap = valueMap

    /** @type {*} Default value to use when resetting */
    this.defaultValue = defaultValue

    /** @type {*} Currently selected value */
    this.currentValue = defaultValue

    /** @type {ValueChangeCallback} Callback invoked when value changes */
    this.onValueChange = onValueChange

    /** @type {ValueValidator|null} Optional custom validator for values */
    this.validator = validator
  }

  /**
   * Get all available value identifiers.
   * Returns all keys from the internal value map.
   *
   * @public
   * @returns {Array<string>} Array of value identifiers (keys from value map).
   * @example
   * const values = strategy.getValues();
   * // Returns: ['sea', 'space']
   */
  getValues () {
    return Object.keys(this.valueMap)
  }

  /**
   * Get display name for a value.
   * Returns the mapped display name from valueMap, or converts the value to string if not found.
   *
   * @public
   * @param {*} value - Value identifier to get display name for.
   * @returns {string} Display name from map, or string representation of original value.
   * @example
   * strategy.getDisplayName('sea');
   * // Returns: 'Sea and Land' (from valueMap)
   * strategy.getDisplayName('unknown');
   * // Returns: 'unknown' (not in map, returns original)
   */
  getDisplayName (value) {
    return this.valueMap[value] || value
  }

  /**
   * Select a value with validation and change notification.
   * Validates the value using validator (if provided) or checks valueMap membership.
   * If valid, updates currentValue and invokes onValueChange callback.
   * Side effect: modifies this.currentValue and invokes this.onValueChange on success.
   *
   * @public
   * @param {*} value - Value to select.
   * @returns {boolean} True if value was selected successfully, false if validation failed.
   * @example
   * const success = strategy.selectValue('sea');
   * // true if 'sea' is valid, and onValueChange callback was invoked
   */
  selectValue (value) {
    if (!this._isValidValue(value)) {
      return false
    }

    this._setCurrentValue(value)
    return true
  }

  /**
   * Validate a value for selection.
   * Uses custom validator function if provided, otherwise checks if value exists in valueMap.
   * Side effect: none (pure validation).
   *
   * @private
   * @param {*} value - Value to validate.
   * @returns {boolean} True if value is valid for selection, false otherwise.
   */
  _isValidValue (value) {
    if (typeof this.validator === 'function') {
      return this.validator(value)
    }

    return value in this.valueMap
  }

  /**
   * Update the current selected value and notify listeners.
   * Safely invokes the onValueChange callback with error handling via _safeInvokeCallback.
   * Side effect: updates this.currentValue and invokes this.onValueChange callback.
   *
   * @private
   * @param {*} value - Value to set as current selection.
   * @returns {void}
   */
  _setCurrentValue (value) {
    this.currentValue = value
    _safeInvokeCallback(this.onValueChange, value, 'value change')
  }
}

/**
 * TerrainStrategy - Specialized strategy for terrain type selection.
 * Manages terrain selection with optional map size-based validation.
 * Extends MapValueStrategy to add terrain-specific functionality.
 *
 * @class
 * @extends MapValueStrategy
 * @public
 * @description Provides terrain selection with optional size constraints and validation.
 */
export class TerrainStrategy extends MapValueStrategy {
  /**
   * Initialize terrain strategy.
   * Creates a new terrain strategy instance with optional validators and callbacks.
   *
   * @constructor
   * @public
   * @param {Object} [options={}] - Configuration options.
   * @param {Array<string>} [options.terrainTypes=[]] - Available terrain type identifiers.
   * @param {ValueMap} [options.valueMap] - Map of terrain identifiers to display names (inherited from MapValueStrategy).
   * @param {ValueValidator|null} [options.validator] - Optional custom validator: (terrain) => boolean.
   * @param {ValueChangeCallback} [options.onValueChange] - Callback invoked on terrain change (inherited from MapValueStrategy).
   * @param {*} [options.defaultValue] - Default selected terrain value.
   * @example
   * const strategy = new TerrainStrategy({
   *   terrainTypes: ['sea-and-land', 'space'],
   *   valueMap: { 'sea-and-land': 'Sea and Land', 'space': 'Space' },
   *   defaultValue: 'sea-and-land'
   * });
   */
  constructor (options = {}) {
    const { terrainTypes = [], valueMap = {}, ...rest } = options

    super({
      valueMap: /** @type {ValueMap} */ (valueMap),
      ...rest
    })

    /** @type {Array<string>} Available terrain type identifiers */
    this.terrainTypes = terrainTypes
  }
}

/**
 * WaterStrategy - Specialized strategy for water/sea type selection.
 * Manages water configuration selection with optional validation.
 * Extends MapValueStrategy to add water-specific functionality.
 *
 * @class
 * @extends MapValueStrategy
 * @public
 * @description Provides water type selection management with validators and callbacks.
 */
export class WaterStrategy extends MapValueStrategy {
  /**
   * Initialize water strategy.
   * Creates a new water strategy instance with optional validators and callbacks.
   *
   * @constructor
   * @public
   * @param {Object} [options={}] - Configuration options.
   * @param {Array<string>} [options.waterTypes=[]] - Available water type identifiers.
   * @param {ValueMap} [options.valueMap] - Map of water identifiers to display names (inherited from MapValueStrategy).
   * @param {ValueValidator|null} [options.validator] - Optional custom validator: (water) => boolean.
   * @param {ValueChangeCallback} [options.onValueChange] - Callback invoked on water change (inherited from MapValueStrategy).
   * @param {*} [options.defaultValue] - Default selected water value.
   * @example
   * const strategy = new WaterStrategy({
   *   waterTypes: ['calm', 'rough'],
   *   valueMap: { 'calm': 'Calm Seas', 'rough': 'Rough Seas' },
   *   defaultValue: 'calm'
   * });
   */
  constructor (options = {}) {
    const { waterTypes = [], valueMap = {}, ...rest } = options

    super({
      valueMap: /** @type {ValueMap} */ (valueMap),
      ...rest
    })

    /** @type {Array<string>} Available water type identifiers */
    this.waterTypes = waterTypes
  }

  /**
   * Get all available water types.
   * Returns the array of water type identifiers managed by this strategy.
   *
   * @public
   * @returns {Array<string>} Water type identifiers.
   * @example
   * const types = strategy.getWaterTypes();
   * // Returns: ['calm', 'rough']
   */
  getWaterTypes () {
    return this.waterTypes
  }
}

/**
 * MapEditStrategy - Strategy for managing map editing mode and selection.
 * Handles which maps are available for editing and selection tracking.
 * Manages permission checking and map selection notifications.
 *
 * @class
 * @public
 * @description Manages map availability for editing with selection callbacks and permission checking.
 */
export class MapEditStrategy {
  /**
   * Initialize map edit strategy.
   * Creates a new map edit strategy instance with map list and selection callback.
   *
   * @constructor
   * @public
   * @param {MapEditStrategyOptions} [options={}] - Configuration options.
   * @param {Array<MapObject>} [options.maps=[]] - Array of map objects to manage.
   * @param {MapSelectCallback} [options.onMapSelect] - Callback invoked when map is selected. Default is no-op.
   * @example
   * const strategy = new MapEditStrategy({
   *   maps: [
   *     { name: 'map1', editable: true },
   *     { name: 'map2', editable: false }
   *   ],
   *   onMapSelect: (map) => console.log('Selected:', map.name)
   * });
   */
  constructor (options = {}) {
    const { maps = [], onMapSelect = () => {} } = options

    /** @type {Array<MapObject>} Array of map objects managed by this strategy */
    this.maps = maps

    /** @type {MapSelectCallback} Callback invoked when a map is selected */
    this.onMapSelect = onMapSelect
  }

  /**
   * Get all maps that can be edited.
   * Filters the maps array to return only those with edit permission.
   *
   * @public
   * @returns {Array<MapObject>} Maps with edit permission enabled.
   * @example
   * const editable = strategy.getEditableMaps();
   * // Returns only maps where editable !== false
   */
  getEditableMaps () {
    return this.maps.filter(map => this._canEdit(map))
  }

  /**
   * Find map by name.
   * Searches the maps array for a map with matching name.
   *
   * @public
   * @param {string} name - Map name to find.
   * @returns {MapObject|undefined} Map object if found, undefined otherwise.
   * @example
   * const map = strategy.getMapByName('my-map');
   * // Returns map object or undefined
   */
  getMapByName (name) {
    return this._findMapByName(name)
  }

  /**
   * Select a map for editing if permissions allow.
   * Validates that the map exists and has edit permission before selecting.
   * If valid, invokes onMapSelect callback with the map object.
   * Side effect: may invoke this.onMapSelect callback on success.
   *
   * @public
   * @param {string} mapName - Map name to select.
   * @returns {boolean} True if map was found and selected, false if not found or not editable.
   * @example
   * const success = strategy.selectForEdit('my-map');
   * // true if 'my-map' found and editable, onMapSelect callback invoked
   */
  selectForEdit (mapName) {
    const map = this._findMapByName(mapName)

    if (!map || !this._canEdit(map)) {
      return false
    }

    _safeInvokeCallback(this.onMapSelect, map, 'map select')
    return true
  }

  /**
   * Find a map by its name.
   * Searches the maps array using optional chaining for safe name comparison.
   * Side effect: none (pure search).
   *
   * @private
   * @param {string} name - Map name to search for.
   * @returns {MapObject|undefined} Map object if found, undefined otherwise.
   */
  _findMapByName (name) {
    return this.maps.find(map => map?.name === name)
  }

  /**
   * Check if map has edit permission.
   * Maps are considered editable if they exist and editable property is not explicitly false.
   * Null/undefined maps return false. Missing editable property defaults to true.
   * Side effect: none (pure check).
   *
   * @private
   * @param {MapObject|undefined} map - Map object to check for edit permission.
   * @returns {boolean} True if map exists and is editable (editable !== false).
   */
  _canEdit (map) {
    return Boolean(map && map.editable !== false)
  }
}

/**
 * Factory function to create a terrain strategy with predefined types.
 * Creates a terrain strategy with a valueMap automatically derived from terrain identifiers.
 * Each terrain identifier is mapped to itself as the display name.
 *
 * @public
 * @param {Array<string>} terrainTypes - Available terrain type identifiers.
 * @param {Object} [options={}] - Additional configuration options.
 * @param {ValueValidator|null} [options.validator] - Optional custom validator function.
 * @param {ValueChangeCallback} [options.onValueChange] - Optional change notification callback.
 * @param {*} [options.defaultValue] - Optional default selected value.
 * @returns {TerrainStrategy} New terrain strategy instance.
 * @example
 * const strategy = createTerrainStrategy(
 *   ['sea-and-land', 'space'],
 *   {
 *     defaultValue: 'sea-and-land',
 *     onValueChange: (terrain) => console.log('Terrain:', terrain)
 *   }
 * );
 * // Creates strategy with valueMap: { 'sea-and-land': 'sea-and-land', 'space': 'space' }
 */
export function createTerrainStrategy (terrainTypes, options = {}) {
  const valueMap = terrainTypes.reduce((map, terrain) => {
    map[terrain] = terrain
    return map
  }, /** @type {ValueMap} */ ({}))

  return new TerrainStrategy({
    ...options,
    terrainTypes,
    valueMap
  })
}

/**
 * Factory function to create a water strategy with predefined types.
 * Creates a water strategy with a valueMap automatically derived from water type identifiers.
 * Each water identifier is mapped to itself as the display name.
 *
 * @public
 * @param {Array<string>} waterTypes - Available water type identifiers.
 * @param {Object} [options={}] - Additional configuration options.
 * @param {ValueValidator|null} [options.validator] - Optional custom validator function.
 * @param {ValueChangeCallback} [options.onValueChange] - Optional change notification callback.
 * @param {*} [options.defaultValue] - Optional default selected value.
 * @returns {WaterStrategy} New water strategy instance.
 * @example
 * const strategy = createWaterStrategy(
 *   ['calm', 'rough'],
 *   {
 *     defaultValue: 'calm',
 *     onValueChange: (water) => console.log('Water:', water)
 *   }
 * );
 * // Creates strategy with valueMap: { 'calm': 'calm', 'rough': 'rough' }
 */
export function createWaterStrategy (waterTypes, options = {}) {
  const valueMap = waterTypes.reduce((map, water) => {
    map[water] = water
    return map
  }, /** @type {ValueMap} */ ({}))

  return new WaterStrategy({
    ...options,
    waterTypes,
    valueMap
  })
}

/**
 * Factory function to create a map edit strategy.
 * Creates a map edit strategy instance for managing map editing and selection.
 * Provides a convenient way to initialize a MapEditStrategy with common options.
 *
 * @public
 * @param {Array<MapObject>} maps - Array of map objects to manage.
 * @param {Object} [options={}] - Additional configuration options.
 * @param {MapSelectCallback} [options.onMapSelect] - Optional map selection callback.
 * @returns {MapEditStrategy} New map edit strategy instance.
 * @example
 * const strategy = createMapEditStrategy(
 *   [
 *     { name: 'map1', editable: true },
 *     { name: 'map2', editable: false }
 *   ],
 *   {
 *     onMapSelect: (map) => console.log('Selected map:', map.name)
 *   }
 * );
 * const editable = strategy.getEditableMaps();
 * // Only map1 is editable
 */
export function createMapEditStrategy (maps, options = {}) {
  return new MapEditStrategy({
    maps,
    ...options
  })
}
