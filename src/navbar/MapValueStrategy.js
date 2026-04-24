/**
 * MapValueStrategy - Base strategy for managing map-related value selections
 * Encapsulates value validation, selection, and change notification logic
 *
 * @class MapValueStrategy
 * @description Provides generic value selection with optional validation and callbacks
 */
export class MapValueStrategy {
  /**
   * Initialize map value strategy
   * @param {Object} [options={}] - Configuration options
   * @param {Object} [options.valueMap={}] - Map of value identifiers to display names
   * @param {*} [options.defaultValue] - Default selected value
   * @param {Function} [options.onValueChange] - Callback: (value) => void
   * @param {Function} [options.validator] - Validator function: (value, ...args) => boolean
   */
  constructor (options = {}) {
    /** @type {Object<string, string>} Value to display name mapping */
    this.valueMap = options.valueMap || {}

    /** @type {*} Current default value */
    this.defaultValue = options.defaultValue

    /** @type {*} Currently selected value */
    this.currentValue = options.defaultValue

    /** @type {Function} Change notification callback */
    this.onValueChange = options.onValueChange || (() => {})

    /** @type {Function|null} Optional validation function */
    this.validator = options.validator || null
  }

  /**
   * Get all available value identifiers
   * @returns {Array<string>} Array of value keys
   */
  getValues () {
    return Object.keys(this.valueMap)
  }

  /**
   * Get display name for a value
   * @param {*} value - Value identifier
   * @returns {string} Display name or original value
   */
  getDisplayName (value) {
    return this.valueMap[value] || value
  }

  /**
   * Select a value with validation and change notification
   * @param {*} value - Value to select
   * @returns {boolean} True if value was selected successfully
   */
  selectValue (value) {
    if (!this._isValidValue(value)) {
      return false
    }

    this.currentValue = value
    this._notifyValueChange(value)
    return true
  }

  /**
   * Validate a value for selection
   * @private
   * @param {*} value - Value to validate
   * @returns {boolean} True if value is valid
   */
  _isValidValue (value) {
    if (this.validator && typeof this.validator === 'function') {
      return this.validator(value)
    }

    return value in this.valueMap
  }

  /**
   * Safely invoke value change callback
   * @private
   * @param {*} value - New value to report
   */
  _notifyValueChange (value) {
    try {
      this.onValueChange(value)
    } catch (error) {
      console.error('Error in value change callback:', error)
    }
  }
}

/**
 * TerrainStrategy - Specialized strategy for terrain type selection
 * Manages terrain selection with map size-based validation
 *
 * @class TerrainStrategy
 * @extends MapValueStrategy
 * @description Provides terrain selection with optional size constraints
 */
export class TerrainStrategy extends MapValueStrategy {
  /**
   * Initialize terrain strategy
   * @param {Object} [options={}] - Configuration options
   * @param {Array<string>} [options.terrainTypes=[]] - Available terrain identifiers
   * @param {Object} [options.valueMap={}] - Inherited from MapValueStrategy
   * @param {Function} [options.validator] - Validator: (terrain, mapSize?) => boolean
   * @param {Function} [options.onValueChange] - Inherited from MapValueStrategy
   */
  constructor (options = {}) {
    super(options)

    /** @type {Array<string>} Available terrain identifiers */
    this.terrainTypes = options.terrainTypes || []
  }

  /**
   * Get terrain types valid for a specific map size
   * @param {*} mapSize - Map size constraint (passed to validator if present)
   * @returns {Array<string>} Valid terrains for given size
   */
  getValidTerrains (mapSize) {
    return this.terrainTypes.filter(terrain =>
      this._isTerrainValidForSize(terrain, mapSize)
    )
  }

  /**
   * Check if terrain is valid for given map size
   * @private
   * @param {string} terrain - Terrain identifier
   * @param {*} mapSize - Map size constraint
   * @returns {boolean} True if terrain is valid for size
   */
  _isTerrainValidForSize (terrain, mapSize) {
    if (!this.validator || typeof this.validator !== 'function') {
      return true
    }

    try {
      return this.validator(terrain, mapSize)
    } catch (error) {
      console.error('Error in terrain validator:', error)
      return false
    }
  }
}

/**
 * WaterStrategy - Specialized strategy for water/sea type selection
 * Manages water configuration selection
 *
 * @class WaterStrategy
 * @extends MapValueStrategy
 * @description Provides water type selection management
 */
export class WaterStrategy extends MapValueStrategy {
  /**
   * Initialize water strategy
   * @param {Object} [options={}] - Configuration options
   * @param {Array<string>} [options.waterTypes=[]] - Available water type identifiers
   * @param {Object} [options.valueMap={}] - Inherited from MapValueStrategy
   * @param {Function} [options.validator] - Inherited from MapValueStrategy
   * @param {Function} [options.onValueChange] - Inherited from MapValueStrategy
   */
  constructor (options = {}) {
    super(options)

    /** @type {Array<string>} Available water type identifiers */
    this.waterTypes = options.waterTypes || []
  }

  /**
   * Get all available water types
   * @returns {Array<string>} Water type identifiers
   */
  getWaterTypes () {
    return this.waterTypes
  }
}

/**
 * MapEditStrategy - Strategy for managing map editing mode and selection
 * Handles which maps are available for editing and selection tracking
 *
 * @class MapEditStrategy
 * @description Manages map availability for editing with selection callbacks
 */
export class MapEditStrategy {
  /**
   * Initialize map edit strategy
   * @param {Object} [options={}] - Configuration options
   * @param {Array<Object>} [options.maps=[]] - Map objects to manage
   * @param {Function} [options.onMapSelect] - Callback: (map) => void
   */
  constructor (options = {}) {
    /** @type {Array<Object>} Collection of maps */
    this.maps = options.maps || []

    /** @type {Function} Selection notification callback */
    this.onMapSelect = options.onMapSelect || (() => {})
  }

  /**
   * Get all maps that can be edited
   * @returns {Array<Object>} Maps with edit permission
   */
  getEditableMaps () {
    return this.maps.filter(map => this._canEdit(map))
  }

  /**
   * Find map by name
   * @param {string} name - Map name to find
   * @returns {Object|undefined} Map if found
   */
  getMapByName (name) {
    return this.maps.find(map => map && map.name === name)
  }

  /**
   * Select a map for editing if permissions allow
   * @param {string} mapName - Map name to select
   * @returns {boolean} True if map was selected
   */
  selectForEdit (mapName) {
    const map = this.getMapByName(mapName)

    if (!map || !this._canEdit(map)) {
      return false
    }

    this._notifyMapSelect(map)
    return true
  }

  /**
   * Check if map has edit permission
   * @private
   * @param {Object} map - Map to check
   * @returns {boolean} True if map is editable
   */
  _canEdit (map) {
    return map && map.editable !== false
  }

  /**
   * Safely invoke map selection callback
   * @private
   * @param {Object} map - Map to report
   */
  _notifyMapSelect (map) {
    try {
      this.onMapSelect(map)
    } catch (error) {
      console.error('Error in map select callback:', error)
    }
  }
}

/**
 * Factory function to create a terrain strategy with predefined types
 * @param {Array<string>} terrainTypes - Available terrain identifiers
 * @param {Object} [options={}] - Additional configuration options
 * @returns {TerrainStrategy} New terrain strategy instance
 */
export function createTerrainStrategy (terrainTypes, options = {}) {
  const valueMap = terrainTypes.reduce((map, terrain) => {
    map[terrain] = terrain
    return map
  }, {})

  return new TerrainStrategy({
    ...options,
    terrainTypes,
    valueMap
  })
}

/**
 * Factory function to create a water strategy with predefined types
 * @param {Array<string>} waterTypes - Available water type identifiers
 * @param {Object} [options={}] - Additional configuration options
 * @returns {WaterStrategy} New water strategy instance
 */
export function createWaterStrategy (waterTypes, options = {}) {
  const valueMap = waterTypes.reduce((map, water) => {
    map[water] = water
    return map
  }, {})

  return new WaterStrategy({
    ...options,
    waterTypes,
    valueMap
  })
}

/**
 * Factory function to create a map edit strategy
 * @param {Array<Object>} maps - Map objects to manage
 * @param {Object} [options={}] - Additional configuration options
 * @returns {MapEditStrategy} New map edit strategy instance
 */
export function createMapEditStrategy (maps, options = {}) {
  return new MapEditStrategy({
    maps,
    ...options
  })
}
