import { bh } from '../terrains/all/js/bh.js'
import { terrains } from '../terrains/all/js/terrains.js'
import { ChooseFromListUI, ChooseNumberUI } from './chooseUI.js'
import { saveCustomMap } from '../waters/saveCustomMap.js'
import { setupTabs } from './setupTabs.js'
import {
  terrainSelect,
  setTerrainParams
} from '../terrains/all/js/terrainUI.js'
import { setupMapSelection, setupMapControl } from './setupMapSelection.js'
import { validateWidth, validateHeight } from '../validSize.js'
import { ParameterManager } from './ParameterManager.js'
import { MapValueStrategy } from './MapValueStrategy.js'

function setupMapOptions (boardSetup, refresh, huntMode = 'build') {
  const paramManager = new ParameterManager(
    new URLSearchParams(globalThis.location.search)
  )
  const { height, width } = paramManager.getSize()

  terrainSelect()

  // Create UI controls for width and height
  bh.widthUI = new ChooseNumberUI(
    terrains.minWidth,
    terrains.maxWidth,
    1,
    'chooseWidth'
  )
  bh.heightUI = new ChooseNumberUI(
    terrains.minHeight,
    terrains.maxHeight,
    1,
    'chooseHeight'
  )

  // Get map context from parameters and maps
  const maps = bh.maps
  const editMapName = paramManager.getEditMap()
  const targetMap = maps.getEditableMap(editMapName)

  const defaultMapName = paramManager.getMapName()
  const templateMap =
    targetMap ||
    (defaultMapName ? maps.getMap(defaultMapName) : null) ||
    maps.getLastMap()

  // Determine initial dimensions
  let mapWidth =
    width || targetMap?.cols || maps.getLastWidth(templateMap?.cols)
  let mapHeight =
    height || targetMap?.rows || maps.getLastHeight(templateMap?.rows)

  // Initialize tabs
  setupTabs(huntMode)

  // Setup width control with size strategy
  _setupWidthControl(
    mapWidth,
    mapHeight,
    boardSetup,
    refresh,
    huntMode,
    paramManager,
    maps
  )

  // Setup height control with size strategy
  _setupHeightControl(
    mapWidth,
    mapHeight,
    boardSetup,
    refresh,
    huntMode,
    paramManager,
    maps
  )

  // Apply target map if editing, otherwise blank map
  if (targetMap) {
    bh.map = targetMap
    boardSetup()
    refresh()
  } else {
    maps.setToBlank(mapHeight, mapWidth)
  }

  // Update parameters for initial state
  _updateSizeParameters(mapHeight, mapWidth, huntMode, paramManager)

  return targetMap
}

/**
 * Setup width control handler
 * @private
 */
function _setupWidthControl (
  mapWidth,
  mapHeight,
  boardSetup,
  refresh,
  huntMode,
  paramManager,
  maps
) {
  bh.widthUI.setup(function (_index) {
    const newWidth = validateWidth()
    const newHeight = validateHeight()
    maps.setToBlank(newHeight, newWidth)
    maps.storeLastWidth(newWidth)

    boardSetup()
    refresh()
    _updateSizeParameters(newHeight, newWidth, huntMode, paramManager)
  }, mapWidth)
}

/**
 * Setup height control handler
 * @private
 */
function _setupHeightControl (
  mapWidth,
  mapHeight,
  boardSetup,
  refresh,
  huntMode,
  paramManager,
  maps
) {
  bh.heightUI.setup(function (_index) {
    const newWidth = validateWidth()
    const newHeight = validateHeight()
    maps.setToBlank(newHeight, newWidth)
    maps.storeLastHeight(newHeight)

    boardSetup()
    refresh()
    _updateSizeParameters(newHeight, newWidth, huntMode, paramManager)
  }, mapHeight)
}

/**
 * Update size parameters in URL if in build mode
 * @private
 */
function _updateSizeParameters (height, width, huntMode, paramManager) {
  if (huntMode === 'build') {
    paramManager.setSize(height, width)
    paramManager.updateHistoryState()
  }
}

const mapTypes = ['Custom Maps Only', 'All Maps', 'Pre-Defined Maps Only']

/**
 * Get map type index from map type string
 * @private
 */
function _mapTypeIndex (mapType) {
  const mapTypeIdx = mapTypes.findIndex(m => m.split(' ', 1)[0] === mapType)
  return mapTypeIdx >= 0 ? mapTypeIdx : 0
}

let mapTypeIncludes = '0'

export function setupMapListOptions (refresh) {
  const paramManager = new ParameterManager(
    new URLSearchParams(globalThis.location.search)
  )
  const mapType = paramManager.getMapType()
  const mapTypeIdx = _mapTypeIndex(mapType)

  // Create map type strategy
  const mapTypeStrategy = new MapValueStrategy({
    valueMap: {
      'Custom Maps Only': mapTypes[0],
      'All Maps': mapTypes[1],
      'Pre-Defined Maps Only': mapTypes[2]
    },
    onValueChange: selectedType => {
      mapTypeIncludes = mapTypes.indexOf(selectedType).toString()
      paramManager.setMapType(selectedType)
      paramManager.updateHistoryState()
      refresh(mapTypes.indexOf(selectedType), selectedType)
    }
  })

  const listUI = new ChooseFromListUI(mapTypes, 'chooseList')

  listUI.setup(function (index, text) {
    mapTypeIncludes = index.toString()
    mapTypeStrategy.selectValue(text)
  }, mapTypeIdx)

  mapTypeIncludes = mapTypeIdx.toString()
  terrainSelect()

  return mapTypeIncludes
}

export function setupGameOptions (boardSetup, refresh) {
  const placedShips = setupMapSelection(boardSetup, refresh)
  boardSetup()
  return placedShips
}

export function setupPrintOptions (boardSetup, refresh) {
  const targetMap = setupMapSelectionPrint(boardSetup, refresh)
  boardSetup()
  setTerrainParams(bh.maps)
  return targetMap
}
function setupMapSelectionPrint (boardSetup, refresh) {
  const urlParams = new URLSearchParams(globalThis.location.search)

  return setupMapControl(urlParams, boardSetup, refresh)
}

export function setupBuildOptions (boardSetup, refresh, huntMode, editHandler) {
  const targetMap = setupMapOptions(boardSetup, refresh, huntMode)
  const maps = bh.maps
  maps.onChange = resetCustomMap
  if (targetMap && editHandler) {
    editHandler(targetMap)
  } else {
    boardSetup()
  }
  return targetMap
}
export function resetCustomMap () {
  const map = bh.map
  saveCustomMap(map)

  bh.maps.setToBlank(map.rows, map.cols)
}
