/**
 * MapValueStrategy - Strategy for handling map value selections
 * Encapsulates logic for terrain, water, and other map-specific selections
 */
export class MapValueStrategy {
  constructor (options = {}) {
    this.valueMap = options.valueMap || {}
    this.defaultValue = options.defaultValue
    this.onValueChange = options.onValueChange || (() => {})
    this.validator = options.validator
  }

  /**
   * Get available values for selection
   */
  getValues () {
    return Object.keys(this.valueMap)
  }

  /**
   * Get display name for a value
   */
  getDisplayName (value) {
    return this.valueMap[value] || value
  }

  /**
   * Select a value and execute handlers
   */
  selectValue (value) {
    if (this._isValidValue(value)) {
      this.currentValue = value
      this.onValueChange(value)
      return true
    }
    return false
  }

  /**
   * Validate a value
   * @private
   */
  _isValidValue (value) {
    if (this.validator && typeof this.validator === 'function') {
      return this.validator(value)
    }
    return value in this.valueMap
  }
}

/**
 * TerrainStrategy - Specialized strategy for terrain selection
 * Manages terrain type selection with validation
 */
export class TerrainStrategy extends MapValueStrategy {
  constructor (options = {}) {
    super(options)
    this.terrainTypes = options.terrainTypes || []
  }

  /**
   * Get valid terrain types for current map size
   */
  getValidTerrains (mapSize) {
    return this.terrainTypes.filter(terrain =>
      this._isTerrainValidForSize(terrain, mapSize)
    )
  }

  /**
   * Check if terrain is valid for map size
   * @private
   */
  _isTerrainValidForSize (terrain, mapSize) {
    if (!this.validator) return true
    return this.validator(terrain, mapSize)
  }
}

/**
 * WaterStrategy - Specialized strategy for water/sea selection
 * Manages water type selection
 */
export class WaterStrategy extends MapValueStrategy {
  constructor (options = {}) {
    super(options)
    this.waterTypes = options.waterTypes || []
  }

  /**
   * Get available water types
   */
  getWaterTypes () {
    return this.waterTypes
  }
}

/**
 * MapEditStrategy - Strategy for handling map editing mode selection
 * Manages which maps are available for editing
 */
export class MapEditStrategy {
  constructor (options = {}) {
    this.maps = options.maps || []
    this.onMapSelect = options.onMapSelect || (() => {})
  }

  /**
   * Get editable maps
   */
  getEditableMaps () {
    return this.maps.filter(map => this._canEdit(map))
  }

  /**
   * Check if map can be edited
   * @private
   */
  _canEdit (map) {
    return map && map.editable !== false
  }

  /**
   * Get map by name
   */
  getMapByName (name) {
    return this.maps.find(map => map.name === name)
  }

  /**
   * Select map for editing
   */
  selectForEdit (mapName) {
    const map = this.getMapByName(mapName)
    if (map && this._canEdit(map)) {
      this.onMapSelect(map)
      return true
    }
    return false
  }
}

/**
 * Create terrain strategy with predefined validation
 */
export function createTerrainStrategy (terrainTypes, options = {}) {
  return new TerrainStrategy({
    ...options,
    terrainTypes,
    valueMap: terrainTypes.reduce((map, terrain) => {
      map[terrain] = terrain
      return map
    }, {})
  })
}

/**
 * Create water strategy with predefined validation
 */
export function createWaterStrategy (waterTypes, options = {}) {
  return new WaterStrategy({
    ...options,
    waterTypes,
    valueMap: waterTypes.reduce((map, water) => {
      map[water] = water
      return map
    }, {})
  })
}

/**
 * Create map edit strategy
 */
export function createMapEditStrategy (maps, options = {}) {
  return new MapEditStrategy({
    maps,
    ...options
  })
}
