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
 * @private
 * @param {Function|null|undefined} callback - Callback to invoke.
 * @param {*} arg - Argument to pass to the callback.
 * @param {string} description - Description used for logging.
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
 *
 * @class MapValueStrategy
 * @description Provides generic value selection with optional validation and callbacks.
 * This class serves as a base for terrain, water, and other value-based selection strategies.
 */
export class MapValueStrategy {
  /**
   * Initialize map value strategy.
   * @param {MapValueStrategyOptions} [options={}] - Configuration options with valueMap, defaultValue, onValueChange, and validator.
   */
  constructor (options = {}) {
    const {
      valueMap = {},
      defaultValue,
      onValueChange = () => {},
      validator = null
    } = options

    /** @type {ValueMap} */
    this.valueMap = valueMap

    /** @type {*} */
    this.defaultValue = defaultValue

    /** @type {*} */
    this.currentValue = defaultValue

    /** @type {ValueChangeCallback} */
    this.onValueChange = onValueChange

    /** @type {ValueValidator|null} */
    this.validator = validator
  }

  /**
   * Get all available value identifiers.
   * @returns {Array<string>} Array of value keys from the value map.
   */
  getValues () {
    return Object.keys(this.valueMap)
  }

  /**
   * Get display name for a value.
   * Returns the mapped display name or the original value if not in map.
   *
   * @param {*} value - Value identifier to get display name for.
   * @returns {string} Display name or string representation of original value.
   */
  getDisplayName (value) {
    return this.valueMap[value] || value
  }

  /**
   * Select a value with validation and change notification.
   * If a validator is provided, the value must pass validation.
   *
   * @param {*} value - Value to select.
   * @returns {boolean} True if value was selected successfully, false if validation failed.
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
   * Uses custom validator if provided, otherwise checks if value exists in valueMap.
   *
   * @private
   * @param {*} value - Value to validate.
   * @returns {boolean} True if value is valid for selection.
   */
  _isValidValue (value) {
    if (typeof this.validator === 'function') {
      return this.validator(value)
    }

    return value in this.valueMap
  }

  /**
   * Update the current selected value and notify listeners.
   * Safely invokes the onValueChange callback with error handling.
   *
   * @private
   * @param {*} value - Value to set as current.
   */
  _setCurrentValue (value) {
    this.currentValue = value
    _safeInvokeCallback(this.onValueChange, value, 'value change')
  }
}

/**
 * TerrainStrategy - Specialized strategy for terrain type selection.
 * Manages terrain selection with map size-based validation.
 *
 * @class TerrainStrategy
 * @extends MapValueStrategy
 * @description Provides terrain selection with optional size constraints.
 */
export class TerrainStrategy extends MapValueStrategy {
  /**
   * Initialize terrain strategy.
   * @param {Object} [options={}] - Configuration options.
   * @param {Array<string>} [options.terrainTypes=[]] - Available terrain identifiers.
   * @param {ValueMap} [options.valueMap] - Inherited from MapValueStrategy.
   * @param {ValueValidator|null} [options.validator] - Validator: (terrain, mapSize?) => boolean.
   * @param {ValueChangeCallback} [options.onValueChange] - Inherited from MapValueStrategy.
   * @param {*} [options.defaultValue] - Default selected value.
   */
  constructor (options = {}) {
    const { terrainTypes = [], valueMap = {}, ...rest } = options

    super({
      valueMap: /** @type {ValueMap} */ (valueMap),
      ...rest
    })

    /** @type {Array<string>} */
    this.terrainTypes = terrainTypes
  }
}

/**
 * WaterStrategy - Specialized strategy for water/sea type selection.
 * Manages water configuration selection.
 *
 * @class WaterStrategy
 * @extends MapValueStrategy
 * @description Provides water type selection management.
 */
export class WaterStrategy extends MapValueStrategy {
  /**
   * Initialize water strategy.
   * @param {Object} [options={}] - Configuration options.
   * @param {Array<string>} [options.waterTypes=[]] - Available water type identifiers.
   * @param {ValueMap} [options.valueMap] - Inherited from MapValueStrategy.
   * @param {ValueValidator|null} [options.validator] - Inherited from MapValueStrategy.
   * @param {ValueChangeCallback} [options.onValueChange] - Inherited from MapValueStrategy.
   * @param {*} [options.defaultValue] - Default selected value.
   */
  constructor (options = {}) {
    const { waterTypes = [], valueMap = {}, ...rest } = options

    super({
      valueMap: /** @type {ValueMap} */ (valueMap),
      ...rest
    })

    /** @type {Array<string>} */
    this.waterTypes = waterTypes
  }

  /**
   * Get all available water types.
   * @returns {Array<string>} Water type identifiers.
   */
  getWaterTypes () {
    return this.waterTypes
  }
}

/**
 * MapEditStrategy - Strategy for managing map editing mode and selection.
 * Handles which maps are available for editing and selection tracking.
 *
 * @class MapEditStrategy
 * @description Manages map availability for editing with selection callbacks.
 */
export class MapEditStrategy {
  /**
   * Initialize map edit strategy.
   * @param {MapEditStrategyOptions} [options={}] - Configuration options.
   */
  constructor (options = {}) {
    const { maps = [], onMapSelect = () => {} } = options

    /** @type {Array<MapObject>} */
    this.maps = maps

    /** @type {MapSelectCallback} */
    this.onMapSelect = onMapSelect
  }

  /**
   * Get all maps that can be edited.
   * @returns {Array<MapObject>} Maps with edit permission.
   */
  getEditableMaps () {
    return this.maps.filter(map => this._canEdit(map))
  }

  /**
   * Find map by name.
   * @param {string} name - Map name to find.
   * @returns {MapObject|undefined} Map if found.
   */
  getMapByName (name) {
    return this._findMapByName(name)
  }

  /**
   * Select a map for editing if permissions allow.
   * @param {string} mapName - Map name to select.
   * @returns {boolean} True if map was selected.
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
   * @private
   * @param {string} name - Map name.
   * @returns {MapObject|undefined} Map if found.
   */
  _findMapByName (name) {
    return this.maps.find(map => map?.name === name)
  }

  /**
   * Check if map has edit permission.
   * @private
   * @param {MapObject|undefined} map - Map to check.
   * @returns {boolean} True if map is editable.
   */
  _canEdit (map) {
    return Boolean(map && map.editable !== false)
  }
}

/**
 * Factory function to create a terrain strategy with predefined types.
 * Creates a terrain strategy with a valueMap derived from terrain identifiers.
 *
 * @param {Array<string>} terrainTypes - Available terrain identifiers.
 * @param {Object} [options={}] - Additional configuration options.
 * @param {ValueValidator|null} [options.validator] - Custom validator function.
 * @param {ValueChangeCallback} [options.onValueChange] - Change notification callback.
 * @param {*} [options.defaultValue] - Default selected value.
 * @returns {TerrainStrategy} New terrain strategy instance.
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
 * Creates a water strategy with a valueMap derived from water type identifiers.
 *
 * @param {Array<string>} waterTypes - Available water type identifiers.
 * @param {Object} [options={}] - Additional configuration options.
 * @param {ValueValidator|null} [options.validator] - Custom validator function.
 * @param {ValueChangeCallback} [options.onValueChange] - Change notification callback.
 * @param {*} [options.defaultValue] - Default selected value.
 * @returns {WaterStrategy} New water strategy instance.
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
 *
 * @param {Array<MapObject>} maps - Map objects to manage.
 * @param {Object} [options={}] - Additional configuration options.
 * @param {MapSelectCallback} [options.onMapSelect] - Map selection callback.
 * @returns {MapEditStrategy} New map edit strategy instance.
 */
export function createMapEditStrategy (maps, options = {}) {
  return new MapEditStrategy({
    maps,
    ...options
  })
}
