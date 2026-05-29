/**
 * @fileoverview Map selection and initialization module for navigation UI.
 * Handles map selection from URL parameters with fallback strategies,
 * initializes map selector UI, and manages map state transitions.
 * @module navbar/setupMapSelection
 */

import { bh } from '../terrains/all/js/bh.js'
import { terrainSelect } from '../terrains/all/js/terrainUI.js'
import { ChooseFromListUI } from './chooseUI.js'
import { ParameterManager } from './ParameterManager.js'

/**
 * @typedef {Object} MapSelectionResult
 * @property {string|undefined} mapName - The resolved map name identifier.
 * @property {Object|null} targetMap - The map object or null if not found.
 */

/**
 * @typedef {Object} MapObject
 * @property {string} title - Display title of the map.
 * @property {string} name - Identifier name of the map.
 * @property {string} [terrain] - Terrain type identifier.
 * @property {*} [key] - Additional properties from the map provider.
 */

/**
 * @typedef {import('./types/domain.types.js').MapSelectionResult} MapSelectionResult
 */

/**
 * Safely retrieve a value from a function with fallback.
 * Catches exceptions and returns fallback value instead of throwing.
 * Provides defensive access to potentially unsafe operations.
 *
 * @private
 * @param {Function} fn - Function to execute (no arguments).
 * @param {*} fallback - Fallback value returned if function throws.
 * @returns {*} Result from function execution or fallback value.
 * @throws {never} Exceptions are caught and converted to fallback value.
 *
 * @description Pure function: no side effects except fn() invocation.
 *              Used for defensive access to potentially unsafe operations.
 *
 * @example
 * const title = _safeCall(() => map.title, 'Unknown');
 * // Returns map.title if valid, or 'Unknown' on error
 * const size = _safeCall(() => calculateSize(), 0);
 * // Returns calculated size or 0 if calculation fails
 */
function _safeCall (fn, fallback) {
  try {
    return fn()
  } catch {
    return fallback
  }
}

/**
 * Setup map control - initializes map selection UI and applies initial map.
 * Creates the map selector UI widget, resolves the initial map from URL parameters,
 * and sets the global map state. Primary entry point for map initialization.
 *
 * @param {URLSearchParams} urlParams - URL search parameters containing map configuration.
 * @returns {Object|null} Target map object if found and resolved, null otherwise.
 * @throws {Error} Propagates errors from terrainSelect() or map resolution failures.
 *
 * @description Executes the following steps in order:
 *              1. Initialize terrain selector UI
 *              2. Create ParameterManager from URL params
 *              3. Resolve map from parameters with fallback strategy
 *              4. Initialize map selector UI widget
 *              5. Set current map in global state
 *              6. Return resolved map object or null
 *
 * @example
 * const urlParams = new URLSearchParams(location.search);
 * const map = setupMapControl(urlParams);
 * if (map) {
 *   console.log('Map loaded:', map.title);
 * }
 */
export function setupMapControl (urlParams) {
  terrainSelect()

  const paramManager = new ParameterManager(urlParams)
  const { mapName, targetMap } = _resolveMapFromParams(paramManager)

  _initializeMapSelector(mapName, paramManager)
  bh.maps.setTo(mapName)

  return targetMap
}

/**
 * Initialize the map selector widget.
 * Creates ChooseFromListUI with available maps and sets up selection handler.
 * Handles UI setup and wires change callback to perform full map selection workflow.
 *
 * @private
 * @param {string|undefined} currentMapName - Initial map name to select (or undefined).
 * @param {ParameterManager} paramManager - Parameter manager instance for state updates.
 * @returns {void}
 * @throws {Error} Propagates errors from _safeGetMapTitles or ChooseFromListUI constructor.
 *
 * @description Side effects: creates and registers map selector UI widget.
 *              Retrieves map titles, creates UI widget, and configures selection callback.
 *              Callback updates paramManager, map selection, and triggers page reload.
 *
 * @example
 * _initializeMapSelector('desert-battle', paramManager);
 * // Creates dropdown UI with all available maps, pre-selecting 'desert-battle'
 * // Clicking a map triggers full map selection workflow
 */
function _initializeMapSelector (currentMapName, paramManager) {
  const maps = bh.maps
  const mapTitles = _safeGetMapTitles(maps)
  const mapSelectUI = new ChooseFromListUI(mapTitles, 'chooseMap')

  mapSelectUI.setup(
    function (_index, title) {
      _selectMap(title, paramManager)
    },
    null,
    currentMapName
  )
}

/**
 * Perform the map selection side effects.
 * Updates map state, parameters, history, and triggers page reload.
 * Executes full map selection workflow including persistence and UI refresh.
 *
 * @private
 * @param {string} title - Selected map title identifier.
 * @param {ParameterManager} paramManager - Parameter manager for state updates.
 * @returns {void}
 * @throws {Error} Propagates errors from map methods or parameter updates.
 *
 * @description Side effects: modifies global state and location.
 *              Executes full map selection workflow:
 *              1. Sets map in global map store
 *              2. Updates URL parameter manager
 *              3. Updates browser history state
 *              4. Persists last used map
 *              5. Reloads page to reflect changes
 *
 * @example
 * _selectMap('desert-battle', paramManager);
 * // Triggers globalThis.location.reload() at end
 */
function _selectMap (title, paramManager) {
  const maps = bh.maps
  maps.setTo(title)
  paramManager.setMapName(title)
  paramManager.updateHistoryState()
  maps.storeLastMap()
  globalThis.location.reload()
}

/**
 * Safely retrieve map titles from the map provider.
 * Performs defensive checks and returns empty array on any failure.
 * Validates both the maps object and its mapTitles method before invocation.
 *
 * @private
 * @param {Object} maps - Maps instance with mapTitles() method.
 * @returns {string[]} Array of map titles or empty array if unavailable.
 * @throws {never} Exceptions are caught and converted to empty array.
 *
 * @description Pure function: validates maps object, verifies mapTitles is a function,
 *              executes safely with fallback to empty array. Defensive programming
 *              pattern for accessing potentially unsafe operations.
 *
 * @example
 * const titles = _safeGetMapTitles(bh.maps);
 * // Returns ['desert-battle', 'sea-and-land', ...] or []
 * const titles = _safeGetMapTitles(null);
 * // Returns [] safely without throwing
 */
function _safeGetMapTitles (maps) {
  if (!maps || typeof maps.mapTitles !== 'function') {
    return []
  }

  return _safeCall(() => {
    const titles = maps.mapTitles()
    return Array.isArray(titles) ? titles : []
  }, [])
}

/**
 * Resolve the map name and target map from URL parameters.
 * Implements fallback resolution order: named map → size-based map → last used map.
 * Returns both the resolved map name and the map object for maximum flexibility.
 *
 * @private
 * @param {ParameterManager} paramManager - Parameter manager for reading/updating params.
 * @returns {MapSelectionResult} Object with resolved mapName (string|undefined) and targetMap (Object|null).
 * @throws {Error} Propagates errors from parameter or map resolution operations.
 *
 * @description Attempts resolution in priority order with fallback strategy.
 *              1. Try to load map by name from parameters
 *              2. If not found, try to load map by size (height/width)
 *              3. If still not found, try to load last used map
 *              Updates parameters and history when resolving by size or last used.
 *
 * @example
 * const { mapName, targetMap } = _resolveMapFromParams(paramManager);
 * // Returns { mapName: 'desert-battle', targetMap: {...} }
 * const { mapName, targetMap } = _resolveMapFromParams(emptyParams);
 * // Returns { mapName: 'last-used-map', targetMap: null }
 */
function _resolveMapFromParams (paramManager) {
  const maps = bh.maps
  let mapName = paramManager.getMapName()
  let targetMap = _loadMapByName(maps, mapName)

  if (targetMap) {
    mapName = targetMap.title
  }

  if (!mapName) {
    mapName = _loadMapBySize(maps, paramManager)
    if (mapName) {
      paramManager.setMapName(mapName)
      paramManager.updateHistoryState()
    }
  }

  if (!mapName) {
    mapName = _loadLastMapTitle(maps)
  }

  return { mapName, targetMap }
}

/**
 * Load a named map safely.
 * Performs defensive checks and returns null on any failure.
 * Validates the maps object and getMap method before invocation.
 *
 * @private
 * @param {Object} maps - Maps instance with getMap() method.
 * @param {string|undefined} mapName - Map name identifier to retrieve.
 * @returns {Object|null} Map object if found and valid; null otherwise.
 * @throws {never} Exceptions are caught and converted to null.
 *
 * @description Pure function: validates maps object and method availability,
 *              executes safely with exception handling and null fallback.
 *              Defensive programming pattern for accessing potentially unsafe operations.
 *
 * @example
 * const map = _loadMapByName(bh.maps, 'desert-battle');
 * // Returns { title: 'Desert Battle', ... } or null
 * const map = _loadMapByName(bh.maps, undefined);
 * // Returns null safely
 */
function _loadMapByName (maps, mapName) {
  if (!maps || typeof maps.getMap !== 'function') {
    return null
  }

  return _safeCall(() => maps.getMap(mapName), null)
}

/**
 * Load a map by size when no name is provided.
 * Retrieves height and width from paramManager, finds matching map by dimensions.
 * Returns the title of the first map matching the requested dimensions.
 *
 * @private
 * @param {Object} maps - Maps instance with getMapOfSize() method.
 * @param {ParameterManager} paramManager - Parameter manager for size extraction.
 * @returns {string|undefined} Map title if found by size; undefined if not available.
 * @throws {never} Exceptions are caught and converted to undefined.
 *
 * @description Pure function: validates maps object, extracts dimensions from parameters,
 *              safely calls getMapOfSize() with fallback to undefined.
 *              Returns optional chaining result: map?.title for null-safe access.
 *
 * @example
 * const mapTitle = _loadMapBySize(bh.maps, paramManager);
 * // Returns 'medium-battle' if map with matching height/width exists, or undefined
 * const mapTitle = _loadMapBySize(bh.maps, emptyParams);
 * // Returns undefined if no size parameters provided
 */
function _loadMapBySize (maps, paramManager) {
  if (!maps || typeof maps.getMapOfSize !== 'function') {
    return undefined
  }

  const { height, width } = paramManager.getSize()
  if (!height || !width) {
    return undefined
  }

  const map = _safeCall(() => maps.getMapOfSize(height, width), null)
  return map?.title
}

/**
 * Load the last used map title safely.
 * Performs defensive access to getLastMapTitle() with exception handling.
 * Validates the maps object and method before invocation.
 *
 * @private
 * @param {Object} maps - Maps instance with getLastMapTitle() method.
 * @returns {string|undefined} Last used map title or undefined if unavailable.
 * @throws {never} Exceptions are caught and converted to undefined.
 *
 * @description Pure function: validates maps object and method availability,
 *              executes safely with exception handling and undefined fallback.
 *              Used as the final fallback when no other map resolution succeeds.
 *
 * @example
 * const mapTitle = _loadLastMapTitle(bh.maps);
 * // Returns last selected map title or undefined
 * const mapTitle = _loadLastMapTitle(null);
 * // Returns undefined safely without throwing
 */
function _loadLastMapTitle (maps) {
  if (!maps || typeof maps.getLastMapTitle !== 'function') {
    return undefined
  }

  return _safeCall(() => maps.getLastMapTitle(), undefined)
}

/**
 * Setup map selection and return placedShips state.
 * Main export function: extracts URL parameters, initializes map control,
 * and checks for existing placed ships. Primary public API for map initialization.
 *
 * @public
 * @param {Function} [_boardSetup] - Board setup callback (reserved for future use).
 * @param {Function} [_refresh] - Refresh display callback (reserved for future use).
 * @returns {boolean} True if placedShips parameter exists in URL; false otherwise.
 * @throws {Error} Propagates errors from setupMapControl() or parameter operations.
 *
 * @description Reads URL search parameters, creates ParameterManager, initializes
 *              map control, and checks placedShips state. Callbacks are not used
 *              by this function but can be utilized by future enhancements.
 *              Returns boolean indicating whether ships were previously placed,
 *              useful for determining if board state should be restored.
 *
 * @example
 * const hasPlacedShips = setupMapSelection(
 *   () => board.setup(),
 *   () => display.refresh()
 * );
 * // Returns true if ships were previously placed
 * if (hasPlacedShips) {
 *   loadPreviousShipPlacement();
 * }
 */
export function setupMapSelection (_boardSetup, _refresh) {
  const urlParams = new URLSearchParams(globalThis.location.search)
  const paramManager = new ParameterManager(urlParams)

  const placedShips = paramManager.hasPlacedShips()
  setupMapControl(urlParams)

  return placedShips
}
