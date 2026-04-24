import { bh } from '../terrains/all/js/bh.js'
import { terrainSelect } from '../terrains/all/js/terrainUI.js'
import { ChooseFromListUI } from './chooseUI.js'
import { ParameterManager } from './ParameterManager.js'

/**
 * Safely retrieve a value from a function with fallback
 * @private
 * @param {Function} fn - Function to execute
 * @param {*} fallback - Fallback value if function fails
 * @returns {*} Result from function or fallback value
 */
function _safeCall (fn, fallback) {
  try {
    return fn()
  } catch {
    return fallback
  }
}

/**
 * Setup map control - initializes map selection UI and applies initial map
 * @param {URLSearchParams} urlParams - URL search parameters
 * @param {Function} [boardSetup=() => {}] - Callback to setup board
 * @param {Function} [refresh=() => {}] - Callback to refresh display
 * @returns {Object|null} Target map object if found, null otherwise
 */
export function setupMapControl (
  urlParams,
  boardSetup = Function.prototype,
  refresh = Function.prototype
) {
  terrainSelect()

  const paramManager = new ParameterManager(urlParams)
  const { mapName, targetMap } = _setMapFromParams(paramManager)

  _setMapSelector(boardSetup, refresh, mapName, paramManager)

  bh.maps.setTo(mapName)
  return targetMap
}

/**
 * Setup map selector UI with change handler
 * @private
 * @param {Function} _boardSetup - Callback to setup board (unused)
 * @param {Function} _refresh - Callback to refresh display (unused)
 * @param {string} mapName - Initial map name to select
 * @param {ParameterManager} paramManager - Parameter manager instance
 * @returns {void}
 */
function _setMapSelector (
  _boardSetup = Function.prototype,
  _refresh = Function.prototype,
  mapName,
  paramManager
) {
  const maps = bh.maps
  const mapTitles = _getMapTitles(maps)

  const mapSelectUI = new ChooseFromListUI(mapTitles, 'chooseMap')
  mapSelectUI.setup(
    function (_index, title) {
      maps.setTo(title)
      paramManager.setMapName(title)
      paramManager.updateHistoryState()
      maps.storeLastMap()
      globalThis.location.reload()
    },
    null,
    mapName
  )
}

/**
 * Get map titles with error handling
 * @private
 * @param {Object} maps - Maps instance
 * @returns {string[]} Array of map titles or empty array if error
 */
function _getMapTitles (maps) {
  if (!maps || typeof maps.mapTitles !== 'function') {
    return []
  }
  return _safeCall(() => {
    const t = maps.mapTitles()
    return Array.isArray(t) ? t : []
  }, [])
}

/**
 * Extract and validate map from URL parameters
 * Falls back through: map by name → map by size → last used map
 * @private
 * @param {ParameterManager} paramManager - Parameter manager instance
 * @returns {Object} Object with mapName and targetMap
 */
function _setMapFromParams (paramManager) {
  const maps = bh.maps
  let mapName = paramManager.getMapName()
  const { height, width } = paramManager.getSize()
  let targetMap = null

  // Try to get map by name
  try {
    targetMap = maps.getMap(mapName)
    mapName = targetMap?.title
  } catch (error) {
    console.log(error)
  }

  // Fallback to map of matching size if name not found
  if (!mapName && height && width) {
    const map = maps.getMapOfSize(height, width)
    mapName = map?.title
    if (mapName) {
      paramManager.setMapName(mapName)
      paramManager.updateHistoryState()
    }
  }

  // Fallback to last used map
  if (!mapName) {
    mapName = _safeCall(() => {
      if (maps && typeof maps.getLastMapTitle === 'function') {
        return maps.getLastMapTitle()
      }
      return null
    }, null)
  }

  return { mapName, targetMap }
}

/**
 * Setup map selection and return placedShips state
 * @param {Function} boardSetup - Callback to setup board
 * @param {Function} refresh - Callback to refresh display
 * @returns {boolean} True if placedShips parameter exists
 */
export function setupMapSelection (boardSetup, refresh) {
  const urlParams = new URLSearchParams(globalThis.location.search)
  const paramManager = new ParameterManager(urlParams)

  const placedShips = paramManager.hasPlacedShips()

  setupMapControl(urlParams, boardSetup, refresh)

  return placedShips
}
