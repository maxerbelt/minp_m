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
 * @typedef {Object} MapContext
 * @property {Object|null} targetMap - Map being edited, if any.
 * @property {Object|null} templateMap - Template map for defaults.
 */

/**
 * @typedef {Object} DimensionValues
 * @property {number} mapWidth - Initial map width.
 * @property {number} mapHeight - Initial map height.
 */

/**
 * @typedef {Function} BoardSetupCallback
 * @returns {void}
 */

/**
 * @typedef {Function} RefreshCallback
 * @returns {void}
 */

/**
 * @typedef {Function} EditHandlerCallback
 * @param {Object} targetMap - The map being edited.
 * @returns {void}
 */

/**
 * @typedef {Object} MapsInstance
 * @property {Function} getEditableMap - Get editable map by name.
 * @property {Function} getMap - Get map by name.
 * @property {Function} getLastMap - Get last used map.
 * @property {Function} getLastWidth - Get last used width.
 * @property {Function} getLastHeight - Get last used height.
 * @property {Function} setToBlank - Set to blank map.
 * @property {Function} storeLastWidth - Store last width.
 * @property {Function} storeLastHeight - Store last height.
 * @property {Function} onChange - Change handler.
 */

/**
 * Create a new ParameterManager from current location search.
 * @private
 * @returns {ParameterManager} Initialized parameter manager.
 */
function _createParameterManager () {
  return new ParameterManager(new URLSearchParams(globalThis.location.search))
}

/**
 * Create UI number control for dimension (width or height).
 * @private
 * @param {string} fieldName - Field name ('width' or 'height').
 * @returns {ChooseNumberUI} Number UI control.
 */
function _createDimensionControl (fieldName) {
  const isWidth = fieldName === 'width'
  const min = isWidth ? terrains.minWidth : terrains.minHeight
  const max = isWidth ? terrains.maxWidth : terrains.maxHeight
  const elementId = isWidth ? 'chooseWidth' : 'chooseHeight'
  return new ChooseNumberUI(min, max, 1, elementId)
}

/**
 * Get initial map and template from parameters.
 * @private
 * @param {ParameterManager} paramManager - Parameter manager.
 * @param {MapsInstance} maps - Maps instance.
 * @returns {MapContext} Object with targetMap and templateMap.
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
 * Determine initial dimensions with fallback chain.
 * @private
 * @param {number|undefined} paramHeight - Height from parameters.
 * @param {number|undefined} paramWidth - Width from parameters.
 * @param {Object|null} targetMap - Target map if editing.
 * @param {Object|null} templateMap - Template map for defaults.
 * @param {MapsInstance} maps - Maps instance.
 * @returns {DimensionValues} Object with mapWidth and mapHeight.
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
 * Setup dimension control with change handler.
 * @private
 * @param {string} dimensionField - 'width' or 'height'.
 * @param {number} currentWidth - Current map width.
 * @param {number} currentHeight - Current map height.
 * @param {BoardSetupCallback} boardSetup - Board setup callback.
 * @param {RefreshCallback} refresh - Refresh callback.
 * @param {string} huntMode - Hunt mode ('build', etc.).
 * @param {ParameterManager} paramManager - Parameter manager.
 * @param {MapsInstance} maps - Maps instance.
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
 * Update size parameters in URL if in build mode.
 * @private
 * @param {number} height - Map height.
 * @param {number} width - Map width.
 * @param {string} huntMode - Hunt mode identifier.
 * @param {ParameterManager} paramManager - Parameter manager.
 * @returns {void}
 */
function _updateSizeParameters (height, width, huntMode, paramManager) {
  if (huntMode === 'build') {
    paramManager.setSize(height, width)
    paramManager.updateHistoryState()
  }
}

/**
 * Initialize dimension UI controls.
 * @private
 * @returns {void}
 */
function _initializeDimensionControls () {
  bh.widthUI = _createDimensionControl('width')
  bh.heightUI = _createDimensionControl('height')
}

/**
 * Apply initial map state.
 * @private
 * @param {Object|null} targetMap - Target map if editing.
 * @param {number} mapHeight - Map height.
 * @param {number} mapWidth - Map width.
 * @param {BoardSetupCallback} boardSetup - Board setup callback.
 * @param {RefreshCallback} refresh - Refresh callback.
 * @param {MapsInstance} maps - Maps instance.
 * @returns {void}
 */
function _applyInitialMapState (
  targetMap,
  mapHeight,
  mapWidth,
  boardSetup,
  refresh,
  maps
) {
  if (targetMap) {
    bh.map = targetMap
    boardSetup()
    refresh()
  } else {
    maps.setToBlank(mapHeight, mapWidth)
  }
}

/**
 * Setup map options (custom/blank maps).
 * @private
 * @param {BoardSetupCallback} boardSetup - Board setup callback.
 * @param {RefreshCallback} refresh - Refresh callback.
 * @param {string} [huntMode='build'] - Hunt mode identifier.
 * @returns {Object|null} Target map if editing, null otherwise.
 */
function setupMapOptions (boardSetup, refresh, huntMode = 'build') {
  const paramManager = _createParameterManager()
  const { height, width } = paramManager.getSize()

  terrainSelect()
  _initializeDimensionControls()

  const maps = bh.maps
  const { targetMap, templateMap } = _getMapContext(paramManager, maps)
  const { mapWidth, mapHeight } = _getInitialDimensions(
    height,
    width,
    targetMap,
    templateMap,
    maps
  )

  setupTabs(huntMode)

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

  _applyInitialMapState(
    targetMap,
    mapHeight,
    mapWidth,
    boardSetup,
    refresh,
    maps
  )
  _updateSizeParameters(mapHeight, mapWidth, huntMode, paramManager)

  return targetMap
}

/** @type {string[]} Available map type options */
const mapTypes = ['Custom Maps Only', 'All Maps', 'Pre-Defined Maps Only']

/**
 * Get map type index from map type string.
 * @private
 * @param {string} mapType - Map type string.
 * @returns {number} Index in mapTypes array, or 0 if not found.
 */
function _mapTypeIndex (mapType) {
  const mapTypeIdx = mapTypes.findIndex(m => m.split(' ', 1)[0] === mapType)
  return mapTypeIdx >= 0 ? mapTypeIdx : 0
}

/** @type {string} Current map type filter as string index */
let mapTypeIncludes = '0'

/**
 * Setup map list options (Custom/Pre-Defined/All maps filter).
 * @param {RefreshCallback} refresh - Callback when filter changes.
 * @returns {string} Current mapTypeIncludes as string.
 */
export function setupMapListOptions (refresh) {
  const paramManager = _createParameterManager()
  const mapType = paramManager.getMapType()
  const mapTypeIdx = _mapTypeIndex(mapType)

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

  listUI.setup(
    function (index, text) {
      mapTypeIncludes = index.toString()
      mapTypeStrategy.selectValue(text)
    },
    mapTypeIdx,
    undefined
  )

  mapTypeIncludes = mapTypeIdx.toString()
  terrainSelect()

  return mapTypeIncludes
}

/**
 * Setup game options (map selection with board setup).
 * @param {BoardSetupCallback} boardSetup - Board setup callback.
 * @param {RefreshCallback} refresh - Refresh callback.
 * @returns {boolean} True if placedShips parameter exists.
 */
export function setupGameOptions (boardSetup, refresh) {
  const placedShips = setupMapSelection(boardSetup, refresh)
  boardSetup()
  return placedShips
}

/**
 * Setup print options (map selection for printing).
 * @param {BoardSetupCallback} boardSetup - Board setup callback.
 * @param {RefreshCallback} refresh - Refresh callback.
 * @returns {Object|null} Target map if found.
 */
export function setupPrintOptions (boardSetup, refresh) {
  const targetMap = setupMapSelectionPrint(boardSetup, refresh)
  boardSetup()
  setTerrainParams(bh.maps)
  return targetMap
}

/**
 * Setup map selection for print mode.
 * @private
 * @param {BoardSetupCallback} boardSetup - Board setup callback.
 * @param {RefreshCallback} refresh - Refresh callback.
 * @returns {Object|null} Target map if found.
 */
function setupMapSelectionPrint (boardSetup, refresh) {
  const urlParams = new URLSearchParams(globalThis.location.search)
  return setupMapControl(urlParams, boardSetup, refresh)
}

/**
 * Setup build options (map and dimension controls).
 * @param {BoardSetupCallback} boardSetup - Board setup callback.
 * @param {RefreshCallback} refresh - Refresh callback.
 * @param {string} [huntMode='build'] - Hunt mode identifier.
 * @param {EditHandlerCallback} [editHandler] - Optional callback when editing existing map.
 * @returns {Object|null} Target map if editing.
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
 * Reset custom map to blank state and save.
 * @returns {void}
 */
export function resetCustomMap () {
  const map = bh.map
  saveCustomMap(map)
  bh.maps.setToBlank(map.rows, map.cols)
}
