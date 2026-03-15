/**
 * MapProviderStrategy - Strategy for managing map data and operations
 * Encapsulates map retrieval, filtering, and validation logic
 */
export class MapProviderStrategy {
  constructor (options = {}) {
    this.maps = options.maps || []
    this.mapProvider = options.mapProvider
    this.onMapLoad = options.onMapLoad || (() => {})
  }

  /**
   * Get all available maps
   */
  getAllMaps () {
    return this.maps
  }

  /**
   * Get map by name
   */
  getMapByName (name) {
    return this.maps.find(map => map.name === name)
  }

  /**
   * Get maps with specific property
   */
  getMapsByProperty (property, value) {
    return this.maps.filter(map => map[property] === value)
  }

  /**
   * Load map data
   */
  loadMap (mapName) {
    const map = this.getMapByName(mapName)
    if (map) {
      this.onMapLoad(map)
      return map
    }
    return null
  }

  /**
   * Check if map exists
   */
  hasMap (mapName) {
    return this.getMapByName(mapName) !== undefined
  }
}

/**
 * MapListProvider - Specialized provider for a list of maps
 * Manages map collections with filtering
 */
export class MapListProvider extends MapProviderStrategy {
  constructor (options = {}) {
    super(options)
    this.mapLists = options.mapLists || {}
  }

  /**
   * Get maps for a specific list
   */
  getListMaps (listName) {
    return this.mapLists[listName] || []
  }

  /**
   * Get all list names
   */
  getListNames () {
    return Object.keys(this.mapLists)
  }

  /**
   * Check if list exists
   */
  hasMapList (listName) {
    return listName in this.mapLists
  }
}

/**
 * EditableMapProvider - Provider that filters to only editable maps
 */
export class EditableMapProvider extends MapProviderStrategy {
  constructor (options = {}) {
    super(options)
    this.editableMaps = this._filterEditable()
  }

  /**
   * Get editable maps
   */
  getEditableMaps () {
    return this.editableMaps
  }

  /**
   * Filter maps to only editable ones
   * @private
   */
  _filterEditable () {
    return this.maps.filter(map => map && map.editable !== false)
  }

  /**
   * Add editable map
   */
  addEditableMap (map) {
    if (map && map.editable !== false) {
      this.editableMaps.push(map)
      this.maps.push(map)
    }
  }

  /**
   * Get editable map by name
   */
  getEditableMapByName (name) {
    return this.editableMaps.find(map => map.name === name)
  }
}

/**
 * MapSearchProvider - Provider with search capabilities
 */
export class MapSearchProvider extends MapProviderStrategy {
  constructor (options = {}) {
    super(options)
    this.searchIndex = this._buildSearchIndex()
  }

  /**
   * Search for maps by name or property
   */
  search (query) {
    const lowercase = query.toLowerCase()
    return this.maps.filter(
      map =>
        map.name.toLowerCase().includes(lowercase) ||
        (map.displayName && map.displayName.toLowerCase().includes(lowercase))
    )
  }

  /**
   * Search with custom matcher
   */
  searchCustom (matcher) {
    if (typeof matcher !== 'function') {
      return []
    }
    return this.maps.filter(matcher)
  }

  /**
   * Build search index for optimization
   * @private
   */
  _buildSearchIndex () {
    return this.maps.reduce((index, map) => {
      const key = map.name.toLowerCase()
      index[key] = map
      return index
    }, {})
  }

  /**
   * Quick lookup from index
   */
  quickLookup (name) {
    return this.searchIndex[name.toLowerCase()]
  }
}

/**
 * Create map provider strategy
 */
export function createMapProvider (maps, options = {}) {
  return new MapProviderStrategy({
    maps,
    ...options
  })
}

/**
 * Create map list provider
 */
export function createMapListProvider (mapLists, options = {}) {
  return new MapListProvider({
    mapLists,
    ...options
  })
}

/**
 * Create editable map provider
 */
export function createEditableMapProvider (maps, options = {}) {
  return new EditableMapProvider({
    maps,
    ...options
  })
}

/**
 * Create searchable map provider
 */
export function createSearchableMapProvider (maps, options = {}) {
  return new MapSearchProvider({
    maps,
    ...options
  })
}
