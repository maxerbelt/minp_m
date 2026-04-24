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
import { validateWidth, validateHeight } from '../terrains/all/js/validSize.js'
import { ParameterManager } from './ParameterManager.js'
import { MapValueStrategy } from './MapValueStrategy.js'

/**
 * Create UI number control for dimension (width or height)
 * @private
 * @param {string} fieldName - Field name ('width' or 'height')
 * @returns {ChooseNumberUI} Number UI control
 */
function _createDimensionControl (fieldName) {
  const isWidth = fieldName === 'width'
  const min = isWidth ? terrains.minWidth : terrains.minHeight
  const max = isWidth ? terrains.maxWidth : terrains.maxHeight
  const elementId = isWidth ? 'chooseWidth' : 'chooseHeight'
  return new ChooseNumberUI(min, max, 1, elementId)
}

/**
 * Get initial map and template from parameters
 * @private
 * @param {ParameterManager} paramManager - Parameter manager
 * @param {Object} maps - Maps instance
 * @returns {Object} Object with targetMap and templateMap
 */
function _getMapContext (paramManager, maps) {
  const editMapName = paramManager.getEditMap()
  const targetMap = maps.getEditableMap(editMapName)
  const defaultMapName = paramManager.getMapName()
  const templateMap =
    targetMap ||
    (defaultMapName ? maps.getMap(defaultMapName) : null) ||
    maps.getLastMap()

  return { targetMap, templateMap }
}

/**
 * Determine initial dimensions with fallback chain
 * @private
 * @param {number|undefined} paramHeight - Height from parameters
 * @param {number|undefined} paramWidth - Width from parameters
 * @param {Object} targetMap - Target map if editing
 * @param {Object} templateMap - Template map for defaults
 * @param {Object} maps - Maps instance
 * @returns {Object} Object with mapWidth and mapHeight
 */
function _getInitialDimensions (
  paramHeight,
  paramWidth,
  targetMap,
  templateMap,
  maps
) {
  const mapWidth =
    paramWidth || targetMap?.cols || maps.getLastWidth(templateMap?.cols)
  const mapHeight =
    paramHeight || targetMap?.rows || maps.getLastHeight(templateMap?.rows)

  return { mapWidth, mapHeight }
}

/**
 * Setup dimension control with change handler
 * @private
 * @param {string} dimensionField - 'width' or 'height'
 * @param {number} currentWidth - Current map width
 * @param {number} currentHeight - Current map height
 * @param {Function} boardSetup - Board setup callback
 * @param {Function} refresh - Refresh callback
 * @param {string} huntMode - Hunt mode ('build', etc.)
 * @param {ParameterManager} paramManager - Parameter manager
 * @param {Object} maps - Maps instance
 * @returns {void}
 */
function _setupDimensionControl (
  dimensionField,
  currentWidth,
  currentHeight,
  boardSetup,
  refresh,
  huntMode,
  paramManager,
  maps
) {
  const ui = dimensionField === 'width' ? bh.widthUI : bh.heightUI
  const initialValue = dimensionField === 'width' ? currentWidth : currentHeight

  ui.setup(function (_index) {
    const newWidth = validateWidth()
    const newHeight = validateHeight()
    maps.setToBlank(newHeight, newWidth)

    // Store the changed dimension
    if (dimensionField === 'width') {
      maps.storeLastWidth(newWidth)
    } else {
      maps.storeLastHeight(newHeight)
    }

    boardSetup()
    refresh()
    _updateSizeParameters(newHeight, newWidth, huntMode, paramManager)
  }, initialValue)
}

/**
 * Setup map options (custom/blank maps)
 * @private
 * @param {Function} boardSetup - Board setup callback
 * @param {Function} refresh - Refresh callback
 * @param {string} [huntMode='build'] - Hunt mode identifier
 * @returns {Object|null} Target map if editing, null otherwise
 */
function setupMapOptions (boardSetup, refresh, huntMode = 'build') {
  const paramManager = new ParameterManager(
    new URLSearchParams(globalThis.location.search)
  )
  const { height, width } = paramManager.getSize()

  terrainSelect()

  // Create UI controls for width and height
  bh.widthUI = _createDimensionControl('width')
  bh.heightUI = _createDimensionControl('height')

  // Get map context from parameters and maps
  const maps = bh.maps
  const { targetMap, templateMap } = _getMapContext(paramManager, maps)

  // Determine initial dimensions
  const { mapWidth, mapHeight } = _getInitialDimensions(
    height,
    width,
    targetMap,
    templateMap,
    maps
  )

  // Initialize tabs
  setupTabs(huntMode)

  // Setup dimension controls
  _setupDimensionControl(
    'width',
    mapWidth,
    mapHeight,
    boardSetup,
    refresh,
    huntMode,
    paramManager,
    maps
  )
  _setupDimensionControl(
    'height',
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
 * Update size parameters in URL if in build mode
 * @private
 * @param {number} height - Map height
 * @param {number} width - Map width
 * @param {string} huntMode - Hunt mode identifier
 * @param {ParameterManager} paramManager - Parameter manager
 * @returns {void}
 */
function _updateSizeParameters (height, width, huntMode, paramManager) {
  if (huntMode === 'build') {
    paramManager.setSize(height, width)
    paramManager.updateHistoryState()
  }
}

/** @type {string[]} Available map type options */
const mapTypes = ['Custom Maps Only', 'All Maps', 'Pre-Defined Maps Only']

/**
 * Get map type index from map type string
 * @private
 * @param {string} mapType - Map type string
 * @returns {number} Index in mapTypes array, or 0 if not found
 */
function _mapTypeIndex (mapType) {
  const mapTypeIdx = mapTypes.findIndex(m => m.split(' ', 1)[0] === mapType)
  return mapTypeIdx >= 0 ? mapTypeIdx : 0
}

/** @type {string} Current map type filter as string index */
let mapTypeIncludes = '0'

/**
 * Setup map list options (Custom/Pre-Defined/All maps filter)
 * @param {Function} refresh - Callback when filter changes
 * @returns {string} Current mapTypeIncludes as string
 */
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

/**
 * Setup game options (map selection with board setup)
 * @param {Function} boardSetup - Board setup callback
 * @param {Function} refresh - Refresh callback
 * @returns {boolean} True if placedShips parameter exists
 */
export function setupGameOptions (boardSetup, refresh) {
  const placedShips = setupMapSelection(boardSetup, refresh)
  boardSetup()
  return placedShips
}

/**
 * Setup print options (map selection for printing)
 * @param {Function} boardSetup - Board setup callback
 * @param {Function} refresh - Refresh callback
 * @returns {Object|null} Target map if found
 */
export function setupPrintOptions (boardSetup, refresh) {
  const targetMap = setupMapSelectionPrint(boardSetup, refresh)
  boardSetup()
  setTerrainParams(bh.maps)
  return targetMap
}

/**
 * Setup map selection for print mode
 * @private
 * @param {Function} boardSetup - Board setup callback
 * @param {Function} refresh - Refresh callback
 * @returns {Object|null} Target map if found
 */
function setupMapSelectionPrint (boardSetup, refresh) {
  const urlParams = new URLSearchParams(globalThis.location.search)
  return setupMapControl(urlParams, boardSetup, refresh)
}

/**
 * Setup build options (map and dimension controls)
 * @param {Function} boardSetup - Board setup callback
 * @param {Function} refresh - Refresh callback
 * @param {string} [huntMode='build'] - Hunt mode identifier
 * @param {Function} [editHandler] - Optional callback when editing existing map
 * @returns {Object|null} Target map if editing
 */
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

/**
 * Reset custom map to blank state and save
 * @returns {void}
 */
export function resetCustomMap () {
  const map = bh.map
  saveCustomMap(map)
  bh.maps.setToBlank(map.rows, map.cols)
}
