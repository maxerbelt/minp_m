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
 * @typedef {Function} BoardSetupCallback
 * Callback for setting up the game board.
 * @returns {void}
 */

/**
 * @typedef {Function} RefreshCallback
 * Callback for refreshing the display.
 * @returns {void}
 */

/**
 * @typedef {Function} EditHandlerCallback
 * Callback when editing an existing map.
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
 * @typedef {Object} DimensionSetupConfig
 * Configuration for setting up dimension controls.
 * @property {BoardSetupCallback} boardSetup - Board setup callback.
 * @property {RefreshCallback} refresh - Refresh callback.
 * @property {string} huntMode - Hunt mode identifier.
 * @property {ParameterManager} paramManager - Parameter manager instance.
 * @property {MapsInstance} maps - Maps instance.
 * @property {number} mapWidth - Current map width.
 * @property {number} mapHeight - Current map height.
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
 * @typedef {Object} DimensionValues
 * Dimension measurements for a map.
 * @property {number} mapWidth - Map width in columns.
 * @property {number} mapHeight - Map height in rows.
 */

/**
 * Get initial map and template from parameters.
 * Resolves target map for editing or template map for defaults.
 * @private
 * @param {ParameterManager} paramManager - Parameter manager instance.
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
 * Resolves dimensions from parameters, target map, template map, or defaults.
 * @private
 * @param {number|undefined} paramHeight - Height from URL parameters.
 * @param {number|undefined} paramWidth - Width from URL parameters.
 * @param {Object|null} targetMap - Target map if editing.
 * @param {Object|null} templateMap - Template map for defaults.
 * @param {MapsInstance} maps - Maps instance for fallback values.
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
 * Create dimension change handler.
 * Handler updates map state, stores dimensions, and triggers callbacks.
 * @private
 * @param {string} dimensionField - 'width' or 'height'.
 * @param {DimensionSetupConfig} config - Setup configuration.
 * @returns {Function} Handler function for dimension change.
 */
function _createDimensionChangeHandler (dimensionField, config) {
  return function (_index) {
    const newWidth = validateWidth()
    const newHeight = validateHeight()
    config.maps.setToBlank(newHeight, newWidth)

    // Store the changed dimension
    if (dimensionField === 'width') {
      config.maps.storeLastWidth(newWidth)
    } else {
      config.maps.storeLastHeight(newHeight)
    }

    config.boardSetup()
    config.refresh()
    _updateSizeParameters(
      newHeight,
      newWidth,
      config.huntMode,
      config.paramManager
    )
  }
}

/**
 * Setup a single dimension control (width or height).
 * Attaches event handler and sets initial value.
 * @private
 * @param {string} dimensionField - 'width' or 'height'.
 * @param {DimensionSetupConfig} config - Setup configuration.
 * @returns {void}
 */
function _setupDimensionControl (dimensionField, config) {
  const ui = dimensionField === 'width' ? bh.widthUI : bh.heightUI
  const initialValue =
    dimensionField === 'width' ? config.mapWidth : config.mapHeight

  ui.setup(_createDimensionChangeHandler(dimensionField, config), initialValue)
}

/**
 * Check if hunt mode is build mode.
 * @private
 * @param {string} huntMode - Hunt mode identifier.
 * @returns {boolean} True if mode is 'build'.
 */
function _isBuildMode (huntMode) {
  return huntMode === 'build'
}

/**
 * Update size parameters in URL if in build mode.
 * Persists dimension changes to browser history.
 * @private
 * @param {number} height - Map height.
 * @param {number} width - Map width.
 * @param {string} huntMode - Hunt mode identifier.
 * @param {ParameterManager} paramManager - Parameter manager instance.
 * @returns {void}
 */
function _updateSizeParameters (height, width, huntMode, paramManager) {
  if (_isBuildMode(huntMode)) {
    paramManager.setSize(height, width)
    paramManager.updateHistoryState()
  }
}

/**
 * Initialize dimension UI controls.
 * Creates and registers width and height UI controls globally.
 * @private
 * @returns {void}
 */
function _initializeDimensionControls () {
  bh.widthUI = _createDimensionControl('width')
  bh.heightUI = _createDimensionControl('height')
}

/**
 * Setup both dimension controls (width and height).
 * Reduces duplication by handling both dimensions in one call.
 * @private
 * @param {DimensionSetupConfig} config - Setup configuration.
 * @returns {void}
 */
function _setupAllDimensionControls (config) {
  _setupDimensionControl('width', config)
  _setupDimensionControl('height', config)
}

/**
 * Apply initial map state.
 * Loads target map if editing, otherwise creates blank map.
 * @private
 * @param {Object|null} targetMap - Target map if editing, null otherwise.
 * @param {number} mapHeight - Map height for blank map.
 * @param {number} mapWidth - Map width for blank map.
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
 * Orchestrates initialization of UI controls, parameter management, and map state.
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

  // Setup dimension controls with configuration
  const dimensionConfig = {
    boardSetup,
    refresh,
    huntMode,
    paramManager,
    maps,
    mapWidth,
    mapHeight
  }
  _setupAllDimensionControls(dimensionConfig)

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
 * Searches for matching map type by first word.
 * @private
 * @param {string} mapType - Map type string to find.
 * @returns {number} Index in mapTypes array, or 0 if not found.
 */
function _getMapTypeIndex (mapType) {
  const mapTypeIdx = mapTypes.findIndex(m => m.split(' ', 1)[0] === mapType)
  return Math.max(mapTypeIdx, 0)
}

/** @type {string} Current map type filter as string index */
let mapTypeIncludes = '0'

/**
 * Create map type change handler.
 * Handles map type selection and parameter updates.
 * @private
 * @param {ParameterManager} paramManager - Parameter manager instance.
 * @param {RefreshCallback} refresh - Callback when filter changes.
 * @returns {(value: string) => void} Handler function for map type changes.
 */
function _createMapTypeChangeHandler (paramManager, refresh) {
  return selectedType => {
    const selectedIndex = mapTypes.indexOf(selectedType)
    mapTypeIncludes = selectedIndex.toString()
    paramManager.setMapType(selectedType)
    paramManager.updateHistoryState()
    refresh(selectedIndex, selectedType)
  }
}

/**
 * Setup map list options (Custom/Pre-Defined/All maps filter).
 * Creates and configures map type filter UI with strategy pattern.
 * @param {RefreshCallback} refresh - Callback when filter changes.
 * @returns {string} Current mapTypeIncludes as string index.
 */
export function setupMapListOptions (refresh) {
  const paramManager = _createParameterManager()
  const mapType = paramManager.getMapType()
  const mapTypeIdx = _getMapTypeIndex(mapType)

  const mapTypeStrategy = new MapValueStrategy({
    valueMap: {
      'Custom Maps Only': mapTypes[0],
      'All Maps': mapTypes[1],
      'Pre-Defined Maps Only': mapTypes[2]
    },
    onValueChange: _createMapTypeChangeHandler(paramManager, refresh)
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
 * Initializes map selection and applies initial board state.
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
 * Initializes map selection for print mode with terrain parameters.
 * @param {BoardSetupCallback} boardSetup - Board setup callback.
 * @param {RefreshCallback} refresh - Refresh callback.
 * @returns {Object|null} Target map if found, null otherwise.
 */
export function setupPrintOptions (boardSetup, refresh) {
  const targetMap = _setupMapSelectionForPrint(boardSetup, refresh)
  boardSetup()
  setTerrainParams(bh.maps)
  return targetMap
}

/**
 * Setup map selection for print mode.
 * Configures map control UI with URL parameters for print preview.
 * @private
 * @param {BoardSetupCallback} boardSetup - Board setup callback.
 * @param {RefreshCallback} refresh - Refresh callback.
 * @returns {Object|null} Target map if found, null otherwise.
 */
function _setupMapSelectionForPrint (boardSetup, refresh) {
  const urlParams = new URLSearchParams(globalThis.location.search)
  return setupMapControl(urlParams, boardSetup, refresh)
}

/**
 * Setup build options (map and dimension controls).
 * Initializes map options, configures change handlers, and applies edit handler.
 * @param {BoardSetupCallback} boardSetup - Board setup callback.
 * @param {RefreshCallback} refresh - Refresh callback.
 * @param {string} [huntMode='build'] - Hunt mode identifier.
 * @param {EditHandlerCallback} [editHandler] - Optional callback when editing existing map.
 * @returns {Object|null} Target map if editing, null otherwise.
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
 * Persists current map to storage and clears the board.
 * @returns {void}
 */
export function resetCustomMap () {
  const map = bh.map
  saveCustomMap(map)
  bh.maps.setToBlank(map.rows, map.cols)
}
