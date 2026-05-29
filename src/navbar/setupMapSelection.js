import { bh } from '../terrains/all/js/bh.js'
import { terrainSelect } from '../terrains/all/js/terrainUI.js'
import { ChooseFromListUI } from './chooseUI.js'
import { ParameterManager } from './ParameterManager.js'

const noop = Function.prototype

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
 *
 * @private
 * @param {Function} fn - Function to execute (no arguments).
 * @param {*} fallback - Fallback value returned if function throws.
 * @returns {*} Result from function execution or fallback value.
 * @description Pure function: no side effects except fn() invocation.
 *              Used for defensive access to potentially unsafe operations.
 * @example
 * const title = _safeCall(() => map.title, 'Unknown');
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
 * @param {URLSearchParams} urlParams - URL search parameters.
 * @param {Function} [boardSetup=noop] - Callback to setup board.
 * @param {Function} [refresh=noop] - Callback to refresh display.
 * @returns {Object|null} Target map object if found, null otherwise.
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
 * Side effect: creates and registers map selector UI widget.
 *
 * @private
 * @param {string|undefined} currentMapName - Initial map name to select (or undefined).
 * @param {ParameterManager} paramManager - Parameter manager instance for updates.
 * @returns {void}
 * @description Retrieves map titles, creates UI widget, and configures selection callback.
 *              Callback updates paramManager, map selection, and triggers page reload.
 * @example
 * _initializeMapSelector('desert-battle', paramManager);
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
 * Side effect: modifies global state and location.
 *
 * @private
 * @param {string} title - Selected map title identifier.
 * @param {ParameterManager} paramManager - Parameter manager for state updates.
 * @returns {void}
 * @description Executes full map selection workflow: sets map, updates parameters,
 *              updates browser history state, stores last map, and reloads page.
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
 * Side effect: none (pure function).
 *
 * @private
 * @param {Object} maps - Maps instance with mapTitles() method.
 * @returns {string[]} Array of map titles or empty array if unavailable.
 * @description Validates maps object, verifies mapTitles is a function,
 *              executes safely with fallback to empty array.
 * @example
 * const titles = _safeGetMapTitles(bh.maps);
 * // Returns ['desert-battle', 'sea-and-land', ...] or []
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
 * Side effect: updates paramManager if map found by size or last used.
 *
 * @private
 * @param {ParameterManager} paramManager - Parameter manager for reading/updating params.
 * @returns {MapSelectionResult} Object with resolved mapName (string|undefined) and targetMap (Object|null).
 * @description Attempts resolution in priority order with fallback strategy.
 *              Updates parameters and history when resolving by size or last used.
 * @example
 * const { mapName, targetMap } = _resolveMapFromParams(paramManager);
 * // Returns { mapName: 'desert-battle', targetMap: {...} }
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
 * Side effect: none (pure function).
 *
 * @private
 * @param {Object} maps - Maps instance with getMap() method.
 * @param {string|undefined} mapName - Map name identifier to retrieve.
 * @returns {Object|null} Map object if found and valid; null otherwise.
 * @description Validates maps object and method availability, executes safely
 *              with exception handling and null fallback.
 * @example
 * const map = _loadMapByName(bh.maps, 'desert-battle');
 * // Returns { title: 'Desert Battle', ... } or null
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
 * Side effect: none (pure function).
 *
 * @private
 * @param {Object} maps - Maps instance with getMapOfSize() method.
 * @param {ParameterManager} paramManager - Parameter manager for size extraction.
 * @returns {string|undefined} Map title if found by size; undefined if not available.
 * @description Validates maps object, extracts dimensions from parameters,
 *              safely calls getMapOfSize() with fallback to undefined.
 * @example
 * const mapTitle = _loadMapBySize(bh.maps, paramManager);
 * // Returns 'medium-battle' if map with matching height/width exists, or undefined
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
 * Side effect: none (pure function).
 *
 * @private
 * @param {Object} maps - Maps instance with getLastMapTitle() method.
 * @returns {string|undefined} Last used map title or undefined if unavailable.
 * @description Validates maps object and method availability, executes safely
 *              with exception handling and undefined fallback.
 * @example
 * const mapTitle = _loadLastMapTitle(bh.maps);
 * // Returns last selected map title or undefined
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
 * and checks for existing placed ships. Callbacks provided for extensibility.
 * Side effect: initializes map selection UI and terrain selection.
 *
 * @public
 * @param {Function} [_boardSetup] - Board setup callback (reserved for future use).
 * @param {Function} [_refresh] - Refresh display callback (reserved for future use).
 * @returns {boolean} True if placedShips parameter exists in URL; false otherwise.
 * @description Reads URL search parameters, creates ParameterManager, initializes
 *              map control, and checks placedShips state. Callbacks are not used
 *              by this function but can be utilized by future enhancements.
 * @example
 * const hasPlacedShips = setupMapSelection(
 *   () => board.setup(),
 *   () => display.refresh()
 * );
 * // Returns true if ships were previously placed
 */
export function setupMapSelection (_boardSetup, _refresh) {
  const urlParams = new URLSearchParams(globalThis.location.search)
  const paramManager = new ParameterManager(urlParams)

  const placedShips = paramManager.hasPlacedShips()
  setupMapControl(urlParams)

  return placedShips
}
