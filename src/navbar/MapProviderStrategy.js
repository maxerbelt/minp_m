/**
 * @typedef {import('./types/domain.types.js').MapObject} MapObject
 * @typedef {import('./types/config.types.js').MapProviderOptions} MapProviderOptions
 */

/**
 * @typedef {Object} MapSearchResult
 * @property {Array<MapObject>} results - Array of maps matching search criteria
 * @property {number} count - Total number of results found
 */

/**
 * @typedef {(map: MapObject) => boolean} MapMatcherFn
 * Function that tests if a map matches certain criteria.
 * Returns true if map should be included in results.
 */

/**
 * @typedef {(map: MapObject) => void} MapLoadCallbackFn
 * Callback function invoked when a map is loaded.
 * Called after successful map retrieval.
 */

/**
 * MapProviderStrategy - Base strategy for managing map data and operations.
 * Encapsulates map retrieval, filtering, and validation logic with extensible design.
 *
 * Architecture:
 * - Stores immutable maps collection
 * - Provides property-based filtering and search
 * - Supports optional lifecycle callbacks
 * - Implements null-safe property matching
 *
 * Strategy Pattern: Designed as base class for specialized providers
 * (MapListProvider, EditableMapProvider, MapSearchProvider)
 *
 * @class MapProviderStrategy
 * @description Provides core map access patterns with optional lifecycle callbacks.
 * Implements filtering, searching, and load notifications.
 */
export class MapProviderStrategy {
  /**
   * Initialize map provider strategy with optional configuration.
   * Sets up map collection, external provider reference, and load callback.
   *
   * @constructor
   * @param {MapProviderOptions} [options={}] - Configuration object with optional properties.
   * @param {Array<MapObject>} [options.maps=[]] - Initial collection of map objects.
   * @param {Object|null} [options.mapProvider=null] - External map provider reference for delegation.
   * @param {MapLoadCallbackFn} [options.onMapLoad=() => {}] - Callback invoked when maps are loaded.
   * @description Accepts partial configuration; omitted options receive defaults.
   *              onMapLoad errors are caught and logged without interrupting flow.
   */
  constructor (options = {}) {
    /**
     * Collection of available map objects.
     * Immutable at runtime; managed through provider methods.
     * @type {Array<MapObject>}
     */
    this.maps = maps

    /**
     * External map provider reference for delegation.
     * Can be null if not provided; used for advanced map retrieval patterns.
     * @type {Object|null}
     */
    this.mapProvider = mapProvider

    /**
     * Lifecycle callback invoked after successful map load.
     * Called synchronously after loadMap() retrieves a map.
     * Errors in callback are caught and logged.
     * @type {MapLoadCallbackFn}
     */
    this.onMapLoad = onMapLoad
  }

  /**
   * Retrieve all available maps without filtering.
   * Returns direct reference to internal maps collection.
   *
   * @public
   * @returns {Array<MapObject>} Complete unfiltered map array.
   * @description Safe to iterate; modifying returned array affects provider state.
   */
  getAllMaps () {
    return this.maps
  }

  /**
   * Find single map by name property.
   * Searches maps collection for first object with matching name.
   *
   * @public
   * @param {string} name - Map name identifier to search for.
   *                        Match is case-sensitive and exact.
   * @returns {(MapObject|undefined)} Map object if found, undefined if not found or collection empty.
   * @description Uses internal _findMapByProperty() with 'name' property.
   */
  getMapByName (name) {
    return this._findMapByProperty('name', name)
  }

  /**
   * Get all maps where specified property equals given value.
   * Filters maps collection by property match.
   *
   * @public
   * @param {string} property - Property name to filter by (e.g., 'terrain', 'difficulty').
   * @param {*} value - Value to match exactly (case-sensitive).
   * @returns {Array<MapObject>} Array of maps where property equals value.
   *                             Empty array if no matches found.
   * @description Uses strict equality (===) for matching.
   *              Null-safe: skips maps without the property.
   */
  getMapsByProperty (property, value) {
    return this._filterByProperty(property, value)
  }

  /**
   * Load a map by name and trigger lifecycle callback.
   * Retrieves map via getMapByName() and invokes onMapLoad callback if found.
   * Callback errors are caught and logged; map is still returned.
   *
   * @public
   * @param {string} mapName - Name identifier of map to load.
   * @returns {(MapObject|null)} Loaded map object if found; null if not found or error occurs.
   * @description Side effect: onMapLoad callback is invoked if map exists.
   *              Callback exceptions are logged but don't affect return value.
   */
  loadMap (mapName) {
    const map = this.getMapByName(mapName)
    if (map) {
      this._invokeMapLoadCallback(map)
    }
    return map || null
  }

  /**
   * Check whether a map exists in collection by name.
   * Performs existence check using getMapByName().
   *
   * @public
   * @param {string} mapName - Map name identifier to verify.
   * @returns {boolean} True if map exists in collection; false otherwise.
   */
  hasMap (mapName) {
    return this._findMapByProperty('name', mapName) !== undefined
  }

  /**
   * Find first map in collection matching property criteria.
   * Iterates through maps and returns first match or undefined.
   *
   * @private
   * @param {string} property - Property name to test on each map.
   * @param {*} value - Value to match against property (strict equality).
   * @returns {(MapObject|undefined)} First matching map object or undefined if no match.
   * @description Null-safe: skips null/undefined maps and maps missing property.
   *              Uses _matchesProperty() for each comparison.
   */
  _findMapByProperty (property, value) {
    return this.maps.find(map => this._matchesProperty(map, property, value))
  }

  /**
   * Filter maps collection by property criteria.
   * Collects all maps matching property value into new array.
   *
   * @private
   * @param {string} property - Property name to filter by.
   * @param {*} value - Value to match against property (strict equality).
   * @returns {Array<MapObject>} New array with all matching maps.
   *                             Empty array if no matches or maps empty.
   * @description Null-safe: filters out null/undefined maps and missing properties.
   *              Uses _matchesProperty() for each comparison.
   */
  _filterByProperty (property, value) {
    return this.maps.filter(map => this._matchesProperty(map, property, value))
  }

  /**
   * Test whether a map object has matching property value.
   * Performs null-safe property comparison.
   *
   * @private
   * @param {(MapObject|undefined|null)} map - Map object to inspect (may be null).
   * @param {string} property - Property name to check on map.
   * @param {*} value - Value to compare against (strict equality ===).
   * @returns {boolean} True if map exists and map[property] === value;
   *                    false if map is null/undefined or property doesn't match.
   * @description Safe: returns false for null/undefined inputs without throwing.
   */
  _matchesProperty (map, property, value) {
    return Boolean(map && map[property] === value)
  }

  /**
   * Safely invoke map load lifecycle callback.
   * Executes onMapLoad with error isolation.
   *
   * @private
   * @param {MapObject} map - Map object to pass to callback.
   * @returns {void}
   * @description Side effect: onMapLoad is called with map parameter.
   *              If callback throws, error is logged to console but not re-thrown.
   *              Exception handling ensures loadMap() completes successfully.
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
 * MapListProvider - Specialized provider organizing maps into named collections.
 * Manages map groups with filtering and collection access patterns.
 *
 * Architecture:
 * - Extends MapProviderStrategy for base functionality
 * - Adds secondary index mapping collection names to map arrays
 * - Enables organization of maps by category/theme
 *
 * Use Cases:
 * - Grouping maps by terrain type, difficulty, or custom category
 * - Quick access to themed map collections
 * - Organization of map catalogs with multiple categories
 *
 * @class MapListProvider
 * @extends MapProviderStrategy
 * @description Adds support for organizing maps into named list categories.
 * Provides collection-based access patterns alongside inherited search methods.
 */
export class MapListProvider extends MapProviderStrategy {
  /**
   * Initialize map list provider with collections.
   * Calls parent constructor and sets up collection mappings.
   *
   * @constructor
   * @param {MapProviderOptions} [options={}] - Configuration object with options.
   * @param {Object<string, Array<MapObject>>} [options.mapLists={}] - Object mapping
   *                                             collection names to map arrays.
   *                                             Example: { 'standard': [...], 'advanced': [...] }
   * @description Inherits base configuration (maps, mapProvider, onMapLoad).
   *              mapLists defaults to empty object if not provided.
   */
  constructor (options = {}) {
    super(options)

    /**
     * Index mapping collection names to map arrays.
     * Enables O(1) lookup of map collections by name.
     * @type {Object<string, Array<MapObject>>}
     */
    this.mapLists = options.mapLists || {}
  }

  /**
   * Get all maps in a specific named collection.
   * Retrieves map array by collection identifier.
   *
   * @public
   * @param {string} listName - Collection/list identifier to retrieve.
   * @returns {Array<MapObject>} Maps in collection; empty array if collection not found.
   * @description Safe: returns empty array for unknown list names without throwing.
   */
  getListMaps (listName) {
    return this.mapLists[listName] || []
  }

  /**
   * Get list of all available collection identifiers.
   * Returns keys from the mapLists index.
   *
   * @public
   * @returns {Array<string>} Array of collection names.
   *                          Empty array if no collections defined.
   */
  getListNames () {
    return Object.keys(this.mapLists)
  }

  /**
   * Check whether a named collection exists.
   * Verifies collection identifier in mapLists index.
   *
   * @public
   * @param {string} listName - Collection identifier to verify.
   * @returns {boolean} True if collection exists and has been defined; false otherwise.
   */
  hasMapList (listName) {
    return Object.hasOwn(this.mapLists, listName)
  }
}

/**
 * EditableMapProvider - Specialized provider filtering to only editable maps.
 * Manages mutable map collection with edit permission validation.
 *
 * Architecture:
 * - Extends MapProviderStrategy for base search functionality
 * - Maintains separate editableMaps collection (filtered from maps)
 * - Validates edit permissions (editable !== false) on add operations
 * - Keeps both filtered and unfiltered collections in sync
 *
 * Use Cases:
 * - Restricting UI to editable maps only
 * - Maintaining separate read-only and editable collections
 * - Permission-based map filtering
 *
 * @class EditableMapProvider
 * @extends MapProviderStrategy
 * @description Restricts map access to editable maps via permission checks.
 * Enforces edit permissions on retrieval and addition operations.
 */
export class EditableMapProvider extends MapProviderStrategy {
  /**
   * Initialize editable map provider with permission filtering.
   * Calls parent constructor and filters to editable maps only.
   *
   * @constructor
   * @param {MapProviderOptions} [options={}] - Configuration object with options.
   * @param {Array<MapObject>} [options.maps=[]] - Initial map objects to filter.
   * @description Inherits base configuration from parent class.
   *              Automatically filters initial maps to only editable ones.
   *              editableMaps excludes maps where editable === false.
   */
  constructor (options = {}) {
    super(options)

    /**
     * Filtered collection of editable maps.
     * Subset of maps where editable !== false.
     * Kept in sync with main maps collection via addEditableMap().
     * @type {Array<MapObject>}
     */
    this.editableMaps = this._filterEditableMaps(this.maps)
  }

  /**
   * Get all maps with edit permission.
   * Returns filtered collection of editable maps.
   *
   * @public
   * @returns {Array<MapObject>} Maps where editable !== false.
   *                             Empty array if no editable maps.
   */
  getEditableMaps () {
    return this.editableMaps
  }

  /**
   * Find editable map by name property.
   * Searches editableMaps collection for matching name.
   *
   * @public
   * @param {string} name - Map name identifier to search for.
   * @returns {(MapObject|undefined)} Editable map if found; undefined otherwise.
   * @description Returns undefined if map exists but is not editable.
   */
  getEditableMapByName (name) {
    return this._findEditableMapByProperty('name', name)
  }

  /**
   * Add map to editable collection if edit permissions allow.
   * Validates edit permission before adding to both collections.
   *
   * @public
   * @param {MapObject} map - Map object to add.
   * @returns {boolean} True if map was successfully added;
   *                    false if map lacks edit permission (editable === false).
   * @description Side effect: On success, map is added to both editableMaps and maps.
   *              Permissions check uses _canEdit() method.
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
   * Selects maps where editable property is not false.
   *
   * @private
   * @param {Array<MapObject>} maps - Maps to evaluate and filter.
   * @returns {Array<MapObject>} New array with only editable maps.
   *                             Empty array if no maps or none editable.
   * @description Uses _canEdit() to validate each map's edit status.
   */
  _filterEditableMaps (maps) {
    return maps.filter(map => this._canEdit(map))
  }

  /**
   * Find first editable map matching property criteria.
   * Searches editableMaps collection for property match.
   *
   * @private
   * @param {string} property - Property name to test on each map.
   * @param {*} value - Value to match against property (strict equality).
   * @returns {(MapObject|undefined)} First matching editable map or undefined.
   * @description Uses inherited _matchesProperty() for comparison.
   */
  _findEditableMapByProperty (property, value) {
    return this.editableMaps.find(map =>
      this._matchesProperty(map, property, value)
    )
  }

  /**
   * Check whether a map has edit permission.
   * Validates editable property value.
   *
   * @private
   * @param {MapObject} map - Map object to check.
   * @returns {boolean} True if map exists and editable !== false;
   *                    false if map is falsy or editable is explicitly false.
   * @description Safe: returns false for null/undefined inputs.
   */
  _canEdit (map) {
    return Boolean(map && map.editable !== false)
  }
}

/**
 * MapSearchProvider - Specialized provider with full-text search capabilities.
 * Provides multiple search strategies including indexed and custom matching.
 *
 * Architecture:
 * - Extends MapProviderStrategy for base functionality
 * - Maintains searchIndex for O(1) lookups by lowercase name
 * - Supports substring matching and custom matcher functions
 * - Case-insensitive search via lowercase normalization
 *
 * Use Cases:
 * - User-facing search interfaces (e.g., map search bar)
 * - Quick lookup by map name (quickLookup vs search)
 * - Custom filtering with matcher functions
 * - Full-text search by name or displayName
 *
 * @class MapSearchProvider
 * @extends MapProviderStrategy
 * @description Enables searching maps by name with both built-in and custom matchers.
 * Provides indexed and substring search patterns.
 */
export class MapSearchProvider extends MapProviderStrategy {
  /**
   * Initialize searchable map provider with indexed search.
   * Calls parent constructor and builds search index.
   *
   * @constructor
   * @param {MapProviderOptions} [options={}] - Configuration object with options.
   * @description Inherits base configuration from parent class.
   *              Automatically builds searchIndex for O(1) lookups.
   *              Index maps lowercase map names to map objects.
   */
  constructor (options = {}) {
    super(options)

    /**
     * Search index for O(1) lookups by lowercase name.
     * Maps lowercase map names to map objects for fast retrieval.
     * Built from maps collection during initialization.
     * @type {Record<string, MapObject>}
     */
    this.searchIndex = this._buildSearchIndex()
  }

  /**
   * Search for maps by name or displayName (case-insensitive).
   * Performs substring matching on both name and displayName properties.
   *
   * @public
   * @param {string} query - Search query string to match against map properties.
   *                         Lowercase normalized for case-insensitive matching.
   * @returns {Array<MapObject>} Maps matching query in name or displayName.
   *                             Empty array if query empty, non-string, or no matches.
   * @description Substring matching: 'arch' matches 'archipelago', 'monarch'.
   *              Case-insensitive: 'ARCH' and 'arch' produce identical results.
   *              Safe: returns empty array for invalid query types.
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
   * Applies custom filtering logic to maps collection.
   *
   * @public
   * @param {MapMatcherFn} matcher - Function that returns true for maps to include.
   *                                 Called with each map; exceptions caught and logged.
   * @returns {Array<MapObject>} Maps where matcher returns true.
   *                             Empty array if matcher not function or no matches.
   * @description Matcher function is called for each map; exceptions are caught.
   *              Maps causing matcher errors are excluded from results.
   *              Warning logged to console if matcher not function.
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
   * Fast indexed lookup by map name.
   * Uses prebuilt searchIndex for O(1) retrieval.
   *
   * @public
   * @param {string} name - Map name to lookup (case-insensitive).
   * @returns {(MapObject|undefined)} Map if found in index; undefined if not found.
   *                                   Safe: returns undefined for null/non-string input.
   * @description Much faster than search() for exact name match.
   *              Use when you know the exact map name.
   *              Case-insensitive: 'MyMap' and 'mymap' return same result.
   */
  quickLookup (name) {
    if (!name || typeof name !== 'string') {
      return undefined
    }

    return this.searchIndex[name.toLowerCase()]
  }

  /**
   * Test whether a map matches a search query string.
   * Checks substring match in name and displayName (case-insensitive).
   *
   * @private
   * @param {(MapObject|undefined|null)} map - Map to test (may be null).
   * @param {string} queryLower - Search query already normalized to lowercase.
   * @returns {boolean} True if map exists and query matches name or displayName;
   *                    false if map null/undefined or no substring match.
   * @description Performs substring matching: 'ch' matches 'archipelago'.
   *              Safe: returns false for null/undefined maps without throwing.
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
   * Creates object mapping lowercase map names to map references.
   *
   * @private
   * @returns {Record<string, MapObject>} Index object.
   *                                      Keys: lowercase map names.
   *                                      Values: corresponding map objects.
   * @description Skips maps with missing or empty names.
   *              Multiple maps with same lowercase name: last one wins.
   *              Index keys are lowercase; use name.toLowerCase() for lookups.
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
 * Convenient instantiation without 'new' keyword.
 *
 * @public
 * @param {Array<MapObject>} maps - Map objects to manage.
 * @param {Object} [options={}] - Additional configuration options.
 *                               Merged with maps parameter into options object.
 * @returns {MapProviderStrategy} New map provider instance.
 *                                Ready for map queries and loading.
 */
export function createMapProvider (maps, options = {}) {
  return new MapProviderStrategy({
    maps,
    ...options
  })
}

/**
 * Factory function to create a map list provider.
 * Convenient instantiation for collection-based organization.
 *
 * @public
 * @param {Object<string, Array<MapObject>>} mapLists - Object mapping list names to map arrays.
 *                                                       Example: { 'standard': [...], 'advanced': [...] }
 * @param {Object} [options={}] - Additional configuration options.
 * @returns {MapListProvider} New map list provider instance.
 *                            Configured with collection mappings.
 */
export function createMapListProvider (mapLists, options = {}) {
  return new MapListProvider({
    mapLists,
    ...options
  })
}

/**
 * Factory function to create an editable map provider.
 * Convenient instantiation with automatic edit permission filtering.
 *
 * @public
 * @param {Array<MapObject>} maps - Map objects to filter for edit permission.
 * @param {Object} [options={}] - Additional configuration options.
 * @returns {EditableMapProvider} New editable map provider instance.
 *                                Pre-filtered to contain only editable maps.
 */
export function createEditableMapProvider (maps, options = {}) {
  return new EditableMapProvider({
    maps,
    ...options
  })
}

/**
 * Factory function to create a searchable map provider.
 * Convenient instantiation with automatic index building.
 *
 * @public
 * @param {Array<MapObject>} maps - Map objects to index and search.
 * @param {Object} [options={}] - Additional configuration options.
 * @returns {MapSearchProvider} New searchable map provider instance.
 *                              Pre-indexed for fast searches and lookups.
 */
export function createSearchableMapProvider (maps, options = {}) {
  return new MapSearchProvider({
    maps,
    ...options
  })
}
