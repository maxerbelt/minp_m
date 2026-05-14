import { bh } from '../terrains/all/js/bh.js'
import { terrainSelect } from '../terrains/all/js/terrainUI.js'
import { ChooseFromListUI } from './chooseUI.js'
import { ParameterManager } from './ParameterManager.js'

const noop = Function.prototype

/**
 * @typedef {Object} MapSelectionResult
 * @property {string|undefined} mapName - Resolved map name.
 * @property {Object|null} targetMap - Map object when found, otherwise null.
 */

/**
 * Safely retrieve a value from a function with fallback.
 * @private
 * @param {Function} fn - Function to execute.
 * @param {*} fallback - Fallback value if function fails.
 * @returns {*} Result from function or fallback value.
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
export function setupMapControl (urlParams, boardSetup = noop, refresh = noop) {
  terrainSelect()

  const paramManager = new ParameterManager(urlParams)
  const { mapName, targetMap } = _resolveMapFromParams(paramManager)

  _initializeMapSelector(mapName, paramManager)
  bh.maps.setTo(mapName)

  return targetMap
}

/**
 * Initialize the map selector widget.
 * @private
 * @param {string|undefined} currentMapName - Initial map name to select.
 * @param {ParameterManager} paramManager - Parameter manager instance.
 * @returns {void}
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
 * @private
 * @param {string} title - Selected map title.
 * @param {ParameterManager} paramManager - Parameter manager instance.
 * @returns {void}
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
 * @private
 * @param {Object} maps - Maps instance.
 * @returns {string[]} Array of map titles or empty array.
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
 * Fallback order: named map → size-based map → last used map.
 * @private
 * @param {ParameterManager} paramManager - Parameter manager instance.
 * @returns {MapSelectionResult} Resolved map name and target map.
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
 * @private
 * @param {Object} maps - Maps instance.
 * @param {string|undefined} mapName - Map name to load.
 * @returns {Object|null} Map object or null.
 */
function _loadMapByName (maps, mapName) {
  if (!maps || typeof maps.getMap !== 'function') {
    return null
  }

  return _safeCall(() => maps.getMap(mapName), null)
}

/**
 * Load a map by size when no name is provided.
 * @private
 * @param {Object} maps - Maps instance.
 * @param {ParameterManager} paramManager - Parameter manager instance.
 * @returns {string|undefined} Map title if found.
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
 * @private
 * @param {Object} maps - Maps instance.
 * @returns {string|undefined} Last used map title or undefined.
 */
function _loadLastMapTitle (maps) {
  if (!maps || typeof maps.getLastMapTitle !== 'function') {
    return undefined
  }

  return _safeCall(() => maps.getLastMapTitle(), undefined)
}

/**
 * Setup map selection and return placedShips state.
 * @param {Function} boardSetup - Callback to setup board.
 * @param {Function} refresh - Callback to refresh display.
 * @returns {boolean} True if placedShips parameter exists.
 */
export function setupMapSelection (boardSetup, refresh) {
  const urlParams = new URLSearchParams(globalThis.location.search)
  const paramManager = new ParameterManager(urlParams)

  const placedShips = paramManager.hasPlacedShips()
  setupMapControl(urlParams, boardSetup, refresh)

  return placedShips
}
