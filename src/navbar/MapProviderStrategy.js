/**
 * @typedef {Object} MapObject
 * @property {string} name - Unique map identifier.
 * @property {string} [displayName] - Human-readable map label.
 * @property {boolean} [editable] - Indicates whether the map is editable.
 */

/**
 * @typedef {Object} MapProviderOptions
 * @property {Array<MapObject>} [maps]
 * @property {Object<string, Array<MapObject>>} [mapLists]
 * @property {Object} [mapProvider]
 * @property {(map: MapObject) => void} [onMapLoad]
 */

/**
 * MapProviderStrategy - Base strategy for managing map data and operations.
 * Encapsulates map retrieval, filtering, and validation logic.
 *
 * @class MapProviderStrategy
 * @description Provides core map access patterns with optional lifecycle callbacks.
 */
export class MapProviderStrategy {
  /**
   * Initialize map provider strategy.
   * @param {MapProviderOptions} [options={}] - Configuration options.
   */
  constructor (options = {}) {
    const { maps = [], mapProvider = null, onMapLoad = () => {} } = options

    /** @type {Array<MapObject>} Collection of available maps. */
    this.maps = maps

    /** @type {Object|null} External map provider reference. */
    this.mapProvider = mapProvider

    /** @type {(map: MapObject) => void} Callback invoked on map load. */
    this.onMapLoad = onMapLoad
  }

  /**
   * Retrieve all available maps.
   * @returns {Array<MapObject>} Complete map array.
   */
  getAllMaps () {
    return this.maps
  }

  /**
   * Find map by name property.
   * @param {string} name - Map name to search for.
   * @returns {MapObject|undefined} Map object if found, undefined otherwise.
   */
  getMapByName (name) {
    return this._findMapByProperty('name', name)
  }

  /**
   * Get maps matching a property value.
   * @param {string} property - Property name to filter by.
   * @param {*} value - Value to match.
   * @returns {Array<MapObject>} Array of matching maps.
   */
  getMapsByProperty (property, value) {
    return this._filterByProperty(property, value)
  }

  /**
   * Load a map and trigger onMapLoad callback.
   * @param {string} mapName - Name of map to load.
   * @returns {MapObject|null} Loaded map object or null if not found.
   */
  loadMap (mapName) {
    const map = this.getMapByName(mapName)
    if (map) {
      this._invokeMapLoadCallback(map)
    }
    return map || null
  }

  /**
   * Check if map exists by name.
   * @param {string} mapName - Map name to check.
   * @returns {boolean} True if map exists.
   */
  hasMap (mapName) {
    return this._findMapByProperty('name', mapName) !== undefined
  }

  /**
   * Find first map matching a property value.
   * @private
   * @param {string} property - Property name.
   * @param {*} value - Value to match.
   * @returns {MapObject|undefined} First matching map or undefined.
   */
  _findMapByProperty (property, value) {
    return this.maps.find(map => this._matchesProperty(map, property, value))
  }

  /**
   * Get all maps matching a property value.
   * @private
   * @param {string} property - Property name.
   * @param {*} value - Value to match.
   * @returns {Array<MapObject>} All matching maps.
   */
  _filterByProperty (property, value) {
    return this.maps.filter(map => this._matchesProperty(map, property, value))
  }

  /**
   * Determine whether a map object contains a given property value.
   * @private
   * @param {MapObject|undefined|null} map - Map object to inspect.
   * @param {string} property - Property name.
   * @param {*} value - Value to compare.
   * @returns {boolean} True when the map matches.
   */
  _matchesProperty (map, property, value) {
    return Boolean(map && map[property] === value)
  }

  /**
   * Safely invoke map load callback.
   * @private
   * @param {MapObject} map - Map object to pass to callback.
   */
  _invokeMapLoadCallback (map) {
    try {
      this.onMapLoad(map)
    } catch (error) {
      console.error('Error in map load callback:', error)
    }
  }
}

/**
 * MapListProvider - Specialized provider for organizing maps into named collections.
 * Manages map groups with filtering and collection access.
 *
 * @class MapListProvider
 * @extends MapProviderStrategy
 * @description Adds support for organizing maps into named list categories.
 */
export class MapListProvider extends MapProviderStrategy {
  /**
   * Initialize map list provider.
   * @param {MapProviderOptions} [options={}] - Configuration options.
   */
  constructor (options = {}) {
    super(options)

    /** @type {Object<string, Array<MapObject>>} Map name to collections mapping. */
    this.mapLists = options.mapLists || {}
  }

  /**
   * Get all maps in a specific collection.
   * @param {string} listName - Collection name.
   * @returns {Array<MapObject>} Maps in collection, or empty array if not found.
   */
  getListMaps (listName) {
    return this.mapLists[listName] || []
  }

  /**
   * Get all available collection names.
   * @returns {Array<string>} List of collection identifiers.
   */
  getListNames () {
    return Object.keys(this.mapLists)
  }

  /**
   * Check if a collection exists.
   * @param {string} listName - Collection name to check.
   * @returns {boolean} True if collection exists.
   */
  hasMapList (listName) {
    return Object.hasOwn(this.mapLists, listName)
  }
}

/**
 * EditableMapProvider - Specialized provider filtering to only editable maps.
 * Manages mutable map collection with edit permission validation.
 *
 * @class EditableMapProvider
 * @extends MapProviderStrategy
 * @description Restricts map access to editable maps via permission checks.
 */
export class EditableMapProvider extends MapProviderStrategy {
  /**
   * Initialize editable map provider.
   * @param {MapProviderOptions} [options={}] - Configuration options.
   */
  constructor (options = {}) {
    super(options)

    /** @type {Array<MapObject>} Filtered collection of editable maps only. */
    this.editableMaps = this._filterEditableMaps(this.maps)
  }

  /**
   * Get all editable maps.
   * @returns {Array<MapObject>} Maps with edit permission.
   */
  getEditableMaps () {
    return this.editableMaps
  }

  /**
   * Find editable map by name.
   * @param {string} name - Map name.
   * @returns {MapObject|undefined} Editable map if found.
   */
  getEditableMapByName (name) {
    return this._findEditableMapByProperty('name', name)
  }

  /**
   * Add map to editable collection if permissions allow.
   * @param {MapObject} map - Map object to add.
   * @returns {boolean} True if map was added.
   */
  addEditableMap (map) {
    if (!this._canEdit(map)) {
      return false
    }

    this.editableMaps.push(map)
    this.maps.push(map)
    return true
  }

  /**
   * Filter maps to only those with edit permission.
   * @private
   * @param {Array<MapObject>} maps - Maps to evaluate.
   * @returns {Array<MapObject>} Maps where editable !== false.
   */
  _filterEditableMaps (maps) {
    return maps.filter(map => this._canEdit(map))
  }

  /**
   * Find first editable map matching a property value.
   * @private
   * @param {string} property - Property name.
   * @param {*} value - Value to match.
   * @returns {MapObject|undefined} First matching editable map or undefined.
   */
  _findEditableMapByProperty (property, value) {
    return this.editableMaps.find(map =>
      this._matchesProperty(map, property, value)
    )
  }

  /**
   * Check if map has edit permission.
   * @private
   * @param {MapObject} map - Map to check.
   * @returns {boolean} True if map is editable.
   */
  _canEdit (map) {
    return Boolean(map && map.editable !== false)
  }
}

/**
 * MapSearchProvider - Specialized provider with full-text search capabilities.
 * Provides multiple search strategies including indexed and custom matching.
 *
 * @class MapSearchProvider
 * @extends MapProviderStrategy
 * @description Enables searching maps by name with both built-in and custom matchers.
 */
export class MapSearchProvider extends MapProviderStrategy {
  /**
   * Initialize searchable map provider.
   * @param {MapProviderOptions} [options={}] - Configuration options.
   */
  constructor (options = {}) {
    super(options)

    /** @type {Record<string, MapObject>} Lowercase map name to map object index. */
    this.searchIndex = this._buildSearchIndex()
  }

  /**
   * Search for maps by name or displayName (case-insensitive).
   * @param {string} query - Search query string.
   * @returns {Array<MapObject>} Maps matching query in name or displayName.
   */
  search (query) {
    if (!query || typeof query !== 'string') {
      return []
    }

    const normalizedQuery = query.toLowerCase()
    return this.searchCustom(map =>
      this._matchesSearchQuery(map, normalizedQuery)
    )
  }

  /**
   * Search using a custom matcher function.
   * @param {(map: MapObject) => boolean} matcher - Matcher function.
   * @returns {Array<MapObject>} Maps where matcher returns true.
   */
  searchCustom (matcher) {
    if (typeof matcher !== 'function') {
      console.warn('searchCustom: matcher must be a function')
      return []
    }

    return this.maps.filter(map => {
      try {
        return matcher(map)
      } catch (error) {
        console.error('Error in custom map matcher:', error)
        return false
      }
    })
  }

  /**
   * Fast lookup by name using prebuilt index.
   * @param {string} name - Map name to lookup.
   * @returns {MapObject|undefined} Map if found in index.
   */
  quickLookup (name) {
    if (!name || typeof name !== 'string') {
      return undefined
    }

    return this.searchIndex[name.toLowerCase()]
  }

  /**
   * Check if map matches search query.
   * @private
   * @param {MapObject|undefined|null} map - Map to test.
   * @param {string} queryLower - Search query already lowercased.
   * @returns {boolean} True if map matches query.
   */
  _matchesSearchQuery (map, queryLower) {
    if (!map) return false

    const nameMatches = map?.name?.toLowerCase().includes(queryLower)
    const displayNameMatches = map?.displayName
      ?.toLowerCase()
      .includes(queryLower)

    return Boolean(nameMatches || displayNameMatches)
  }

  /**
   * Build search index for O(1) lookups by name.
   * @private
   * @returns {Record<string, MapObject>} Index mapping lowercase names to maps.
   */
  _buildSearchIndex () {
    return this.maps.reduce((index, map) => {
      if (map?.name) {
        index[map.name.toLowerCase()] = map
      }
      return index
    }, /** @type {Record<string, MapObject>} */ ({}))
  }
}

/**
 * Factory function to create a basic map provider.
 * @param {Array<MapObject>} maps - Map objects to manage.
 * @param {Object} [options={}] - Additional configuration options.
 * @returns {MapProviderStrategy} New map provider instance.
 */
export function createMapProvider (maps, options = {}) {
  return new MapProviderStrategy({
    maps,
    ...options
  })
}

/**
 * Factory function to create a map list provider.
 * @param {Object<string, Array<MapObject>>} mapLists - Object mapping list names to map arrays.
 * @param {Object} [options={}] - Additional configuration options.
 * @returns {MapListProvider} New map list provider instance.
 */
export function createMapListProvider (mapLists, options = {}) {
  return new MapListProvider({
    mapLists,
    ...options
  })
}

/**
 * Factory function to create an editable map provider.
 * @param {Array<MapObject>} maps - Map objects to filter.
 * @param {Object} [options={}] - Additional configuration options.
 * @returns {EditableMapProvider} New editable map provider instance.
 */
export function createEditableMapProvider (maps, options = {}) {
  return new EditableMapProvider({
    maps,
    ...options
  })
}

/**
 * Factory function to create a searchable map provider.
 * @param {Array<MapObject>} maps - Map objects to index and search.
 * @param {Object} [options={}] - Additional configuration options.
 * @returns {MapSearchProvider} New searchable map provider instance.
 */
export function createSearchableMapProvider (maps, options = {}) {
  return new MapSearchProvider({
    maps,
    ...options
  })
}
