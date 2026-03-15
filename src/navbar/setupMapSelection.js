import { bh } from '../terrain/bh.js'
import { terrainSelect } from '../terrain/terrainUI.js'
import { ChooseFromListUI } from './chooseUI.js'
import { ParameterManager } from './ParameterManager.js'
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
 * Setup map selector UI
 * @private
 */
function _setMapSelector (
  boardSetup = Function.prototype,
  refresh = Function.prototype,
  mapName,
  paramManager
) {
  const maps = bh.maps
  const mapTitles = (() => {
    if (!maps || typeof maps.mapTitles !== 'function') {
      return []
    }
    try {
      const t = maps.mapTitles()
      return Array.isArray(t) ? t : []
    } catch (_error) {
      // suppress errors during setup, fallback to empty list
      return []
    }
  })()

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
 * Extract and validate map from URL parameters
 * @private
 */
function _setMapFromParams (paramManager) {
  const maps = bh.maps
  let mapName = paramManager.getMapName()
  const { height, width } = paramManager.getSize()
  let targetMap = null

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
    if (maps && typeof maps.getLastMapTitle === 'function') {
      try {
        mapName = maps.getLastMapTitle()
      } catch (_error) {
        // ignore failure
        mapName = null
      }
    }
  }

  return { mapName, targetMap }
}

export function setupMapSelection (boardSetup, refresh) {
  const urlParams = new URLSearchParams(globalThis.location.search)
  const paramManager = new ParameterManager(urlParams)

  const placedShips = paramManager.hasPlacedShips()

  setupMapControl(urlParams, boardSetup, refresh)

  return placedShips
}
