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
 * @typedef {import('./types/domain.types.js').MapContext} MapContext
 * Map context containing target and template maps.
 * @property {Object|null} targetMap - Map being edited, or null if creating new.
 * @property {Object|null} templateMap - Template map for copying defaults.
 */

/**
 * @typedef {import('./types/callbacks.types.js').BoardSetupCallback} BoardSetupCallback
 * Callback to initialize/reset the game board.
 */

/**
 * @typedef {import('./types/callbacks.types.js').RefreshCallback} RefreshCallback
 * Callback to refresh the display after changes.
 */

/**
 * @typedef {import('./types/callbacks.types.js').EditHandlerCallback} EditHandlerCallback
 * Callback invoked when editing an existing map.
 * @param {Object} targetMap - The map being edited.
 */

/**
 * @typedef {import('./types/domain.types.js').MapsInstance} MapsInstance
 * Maps manager instance with methods for accessing and modifying maps.
 */

/**
 * @typedef {import('./types/config.types.js').DimensionSetupConfig} DimensionSetupConfig
 * Configuration object for dimension setup containing callbacks and state.
 */

/**
 * @typedef {Object} MapContextResult
 * Result of resolving map context for initialization.
 * @property {Object|null} targetMap - The map to edit, or null if creating new map.
 * @property {Object|null} templateMap - Default template for copying values.
 */

/**
 * @typedef {Object} DimensionValuesResult
 * Resolved dimension values with fallback chain applied.
 * @property {number} mapWidth - Map width in columns (positive integer).
 * @property {number} mapHeight - Map height in rows (positive integer).
 */

/**
 * @typedef {Object} MapTypeChangeHandler
 * Handler for map type selection changes in the UI.
 * @callback
 * @param {string} selectedType - Selected map type string from mapTypes array.
 * @returns {void}
 */

/**
 * Create a new ParameterManager from current location search.
 * Extracts URL parameters and creates a manager instance for parsing.
 * @private
 * @returns {ParameterManager} Initialized parameter manager with URL search params.
 */
function _createParameterManager () {
  return new ParameterManager(new URLSearchParams(globalThis.location.search))
}

/**
 * Create UI number control for dimension (width or height).
 * Instantiates a number picker UI with min/max bounds from terrain config.
 * @private
 * @param {'width'|'height'} fieldName - Field name to create control for.
 * @throws Will create with default bounds if fieldName is invalid.
 * @returns {ChooseNumberUI} Configured number UI control ready for setup.
 */
function _createDimensionControl (fieldName) {
  const isWidth = fieldName === 'width'
  const min = isWidth ? terrains.minWidth : terrains.minHeight
  const max = isWidth ? terrains.maxWidth : terrains.maxHeight
  const elementId = isWidth ? 'chooseWidth' : 'chooseHeight'
  return new ChooseNumberUI(min, max, 1, elementId)
}

// Typedef moved to module typedefs section above

/**
 * Get initial map and template from parameters.
 * Resolves target map for editing or template map for defaults using fallback chain.
 * Fallback priority: targetMap > defaultMapName > lastMap.
 * @private
 * @param {ParameterManager} paramManager - Parameter manager with parsed URL params.
 * @param {MapsInstance} maps - Maps manager instance with available maps.
 * @returns {MapContextResult} Object with targetMap and templateMap references.
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
 * Resolves dimensions from: parameters > target map > template map > defaults.
 * @private
 * @param {number|undefined} paramHeight - Height from URL parameters (optional).
 * @param {number|undefined} paramWidth - Width from URL parameters (optional).
 * @param {Object|null} targetMap - Target map being edited, or null if creating new.
 * @param {Object|null} templateMap - Template map for copying dimension defaults.
 * @param {MapsInstance} maps - Maps manager for last stored dimension values.
 * @returns {DimensionValuesResult} Resolved mapWidth and mapHeight values.
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
 * Returns a closure that handles dimension changes by:
 * 1. Validating new dimensions
 * 2. Creating blank map with new dimensions
 * 3. Storing last used dimension
 * 4. Triggering callbacks and URL updates
 * @private
 * @param {'width'|'height'} dimensionField - The dimension being changed.
 * @param {DimensionSetupConfig} config - Setup configuration with callbacks and managers.
 * @returns {Function} Handler function accepting index parameter from UI.
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
 * Retrieves UI control, creates change handler, and initializes with starting value.
 * @private
 * @param {'width'|'height'} dimensionField - Which dimension to configure.
 * @param {DimensionSetupConfig} config - Setup configuration with UI and dimension values.
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
 * Used to determine whether to persist dimension changes to URL.
 * @private
 * @param {string} huntMode - Hunt mode identifier string.
 * @returns {boolean} True if mode is exactly 'build', false otherwise.
 */
function _isBuildMode (huntMode) {
  return huntMode === 'build'
}

/**
 * Update size parameters in URL if in build mode.
 * Only persists changes to browser history when in build mode.
 * Uses History API to update URL without page reload.
 * @private
 * @param {number} height - Map height in rows (positive integer).
 * @param {number} width - Map width in columns (positive integer).
 * @param {string} huntMode - Hunt mode identifier ('build' triggers update).
 * @param {ParameterManager} paramManager - Parameter manager to persist changes.
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
 * Creates ChooseNumberUI instances for width and height and attaches to bh singleton.
 * Must be called before _setupAllDimensionControls.
 * @private
 * @returns {void}
 */
function _initializeDimensionControls () {
  bh.widthUI = _createDimensionControl('width')
  bh.heightUI = _createDimensionControl('height')
}

/**
 * Setup both dimension controls (width and height).
 * Convenience function to configure width and height controls together.
 * Reduces code duplication by batching both dimension setups.
 * @private
 * @param {DimensionSetupConfig} config - Setup configuration with callbacks and values.
 * @returns {void}
 */
function _setupAllDimensionControls (config) {
  _setupDimensionControl('width', config)
  _setupDimensionControl('height', config)
}

/**
 * Apply initial map state.
 * If editing: loads targetMap and triggers callbacks.
 * If creating: initializes blank map with dimensions and triggers callbacks.
 * @private
 * @param {Object|null} targetMap - Map being edited, or null if creating new.
 * @param {number} mapHeight - Height for blank map creation (positive integer).
 * @param {number} mapWidth - Width for blank map creation (positive integer).
 * @param {BoardSetupCallback} boardSetup - Callback to initialize board state.
 * @param {RefreshCallback} refresh - Callback to refresh display after setup.
 * @param {MapsInstance} maps - Maps manager instance for creating blank maps.
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
 * Orchestrates full initialization sequence:
 * 1. Creates dimension controls and parameter manager
 * 2. Resolves map context (target/template maps)
 * 3. Determines initial dimensions with fallback chain
 * 4. Configures all UI controls with handlers
 * 5. Applies initial map state
 * @private
 * @param {BoardSetupCallback} boardSetup - Board setup callback for initialization.
 * @param {RefreshCallback} refresh - Refresh callback after changes.
 * @param {string} [huntMode='build'] - Hunt mode identifier for URL persistence.
 * @returns {Object|null} Target map if editing existing map, null if creating new.
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

/**
 * Available map type filter options for the map selection UI.
 * Used as display strings and as keys for filtering map lists.
 * @type {string[]}
 */
const mapTypes = ['Custom Maps Only', 'All Maps', 'Pre-Defined Maps Only']

/**
 * Get map type index from map type string.
 * Searches for matching map type by first word to find index in mapTypes array.
 * Returns 0 (first element) as fallback if mapType not found.
 * @private
 * @param {string} mapType - Map type string to search for.
 * @returns {number} Index in mapTypes array (0-2), defaults to 0 if not found.
 */
function _getMapTypeIndex (mapType) {
  const mapTypeIdx = mapTypes.findIndex(m => m.split(' ', 1)[0] === mapType)
  return Math.max(mapTypeIdx, 0)
}

/**
 * Current map type filter as string index.
 * Tracks which map type filter is active ('0', '1', or '2').
 * @type {string}
 */
let mapTypeIncludes = '0'

/**
 * Create map type change handler.
 * Returns a closure that:
 * 1. Updates global mapTypeIncludes state
 * 2. Persists selection to URL parameters
 * 3. Updates browser history
 * 4. Triggers refresh callback with new filter
 * @private
 * @param {ParameterManager} paramManager - Parameter manager to persist changes.
 * @param {RefreshCallback} refresh - Callback to refresh display with new filter index.
 * @returns {MapTypeChangeHandler} Handler function for map type selection changes.
 */
function _createMapTypeChangeHandler (paramManager, refresh) {
  return selectedType => {
    const selectedIndex = mapTypes.indexOf(selectedType)
    const selectedIndexStr = selectedIndex.toString()
    mapTypeIncludes = selectedIndexStr
    paramManager.setMapType(selectedType)
    paramManager.updateHistoryState()
    refresh(selectedIndexStr)
  }
}

/**
 * Setup map list options (Custom/Pre-Defined/All maps filter).
 * Creates and configures map type filter UI using strategy pattern.
 * Initializes UI with persisted selection from URL parameters.
 * @param {RefreshCallback} refresh - Callback invoked when filter selection changes.
 * @returns {string} Current mapTypeIncludes as string index ('0', '1', or '2').
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
 * Initializes map selection from URL params and triggers board setup callbacks.
 * @param {BoardSetupCallback} boardSetup - Callback to initialize board state.
 * @param {RefreshCallback} refresh - Callback to refresh display.
 * @returns {boolean} True if placedShips query parameter was present in URL.
 */
export function setupGameOptions (boardSetup, refresh) {
  const placedShips = setupMapSelection(boardSetup, refresh)
  boardSetup()
  return placedShips
}

/**
 * Setup print options (map selection for printing).
 * Initializes map selection for print preview and sets terrain display parameters.
 * @param {BoardSetupCallback} boardSetup - Callback to initialize board for printing.
 * @param {RefreshCallback} refresh - Callback to refresh display.
 * @returns {Object|null} Target map object if found, null if not available.
 */
export function setupPrintOptions (boardSetup, refresh) {
  const targetMap = _setupMapSelectionForPrint(boardSetup, refresh)
  boardSetup()
  setTerrainParams(bh.maps)
  return targetMap
}

/**
 * Setup map selection for print mode.
 * Configures map control UI with URL parameters for print preview display.
 * @private
 * @param {BoardSetupCallback} boardSetup - Callback to initialize board for printing.
 * @param {RefreshCallback} refresh - Callback to refresh display.
 * @returns {Object|null} Target map object if found, null if not available.
 */
function _setupMapSelectionForPrint (boardSetup, refresh) {
  const urlParams = new URLSearchParams(globalThis.location.search)
  return setupMapControl(urlParams, boardSetup, refresh)
}

/**
 * Setup build options (map and dimension controls).
 * Initializes map options, configures change handlers, and invokes edit handler if editing.
 * Orchestrates full map builder UI setup sequence.
 * @param {BoardSetupCallback} boardSetup - Callback to initialize board state.
 * @param {RefreshCallback} refresh - Callback to refresh display after changes.
 * @param {string} [huntMode='build'] - Hunt mode identifier for URL persistence.
 * @param {EditHandlerCallback} [editHandler] - Optional callback when editing existing map.
 * @returns {Object|null} Target map if editing existing map, null if creating new.
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
 * Persists current map to storage using saveCustomMap, then clears board.
 * Triggered when custom map changes are made during editing.
 * @returns {void}
 */
export function resetCustomMap () {
  const map = bh.map
  saveCustomMap(map)
  bh.maps.setToBlank(map.rows, map.cols)
}
