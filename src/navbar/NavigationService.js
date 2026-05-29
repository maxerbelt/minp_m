import { storeShips } from '../waters/saveCustomMap.js'
import { trackTab, trackClick } from './gtag.js'

/**
 * @typedef {import('./types/config.types.ts').NavigationModeConfig} NavigationModeConfig
 * @typedef {import('./types/domain.types.ts').MapProvider} MapProvider
 * @typedef {import('./types/domain.types.ts').MapObject} MapObject
 */

/**
 * @typedef {Object} TerrainConfig
 * @property {string} [bodyTag] - Body tag identifier for terrain.
 * @property {string} [tag] - Tag identifier for terrain.
 */

/**
 * @typedef {Object} MapWithTerrain
 * @property {string} [title] - Display title of the map.
 * @property {number} [rows] - Map height in rows.
 * @property {number} [cols] - Map width in columns.
 * @property {string|TerrainConfig} [terrain] - Terrain type or configuration object.
 * @property {() => void} [saveToLocalStorage] - Method to save map to local storage.
 */

/**
 * @typedef {Object} MapsCollectionInterface
 * @property {(name?: string) => MapWithTerrain|null} getMap - Get map by name.
 * @property {(name?: string) => MapWithTerrain|null} getCustomMap - Get custom map by name.
 */

/**
 * @typedef {Object} MapProviderInterface
 * @property {() => MapWithTerrain|null} getCurrentMap - Get currently selected map.
 * @property {() => MapsCollectionInterface} getMaps - Get maps collection instance.
 */

/**
 * NavigationService - Centralized game mode switching and page navigation.
 * Manages navigation between different game modes with state preservation.
 * Handles map import, external navigation, and analytics tracking.
 *
 * @class NavigationService
 * @description Core service for navigating between game modes (Seek, Hide, Build, List, Rules, Print)
 * with automatic state preservation and URL parameter management.
 */
export class NavigationService {
  /**
   * Predefined game mode configurations.
   * Maps mode identifiers to page names and tracking labels.
   *
   * @static
   * @readonly
   * @type {Object<string, NavigationModeConfig>}
   */
  static MODES = {
    SEEK: { page: 'battleseek', trackLabel: 'switch to seek' },
    HIDE: { page: 'index', trackLabel: 'switch to hide' },
    BUILD: { page: 'battlebuild', trackLabel: 'switch to build' },
    LIST: { page: 'maplist', trackLabel: 'switch to list' },
    RULES: { page: 'rules', trackLabel: 'switch to rules' },
    PRINT: { page: 'print', trackLabel: 'switch to print' }
  }

  /**
   * Mapping of page names to navigation modes.
   * Used to look up mode configuration from page identifiers.
   *
   * @static
   * @readonly
   * @type {Record<string, NavigationModeConfig>}
   */
  static MODE_BY_PAGE = {
    index: NavigationService.MODES.HIDE,
    battleseek: NavigationService.MODES.SEEK,
    battlebuild: NavigationService.MODES.BUILD,
    maplist: NavigationService.MODES.LIST,
    rules: NavigationService.MODES.RULES,
    print: NavigationService.MODES.PRINT
  }

  /**
   * Initialize navigation service.
   * Sets up dependencies for state management and map access.
   *
   * @param {Object} paramManager - Parameter manager for state tracking.
   * @param {MapProviderInterface} mapProvider - Map provider for current map access.
   */
  constructor (paramManager, mapProvider) {
    /** @type {Object} */
    this.paramManager = paramManager

    /** @type {MapProviderInterface} */
    this.mapProvider = mapProvider
  }

  /**
   * Switch to seek/hunt mode.
   * Preserves current game state and navigates to seek battle page.
   *
   * @param {string|boolean} [huntMode=''] - Whether in hunt mode or mode identifier.
   * @returns {void}
   */
  switchToSeek (huntMode = '') {
    this._switchToMode(NavigationService.MODES.SEEK, huntMode)
  }

  /**
   * Switch to hide/play mode.
   * Preserves current game state and navigates to hide battle page.
   *
   * @param {string|boolean} [huntMode=''] - Whether in hunt mode or mode identifier.
   * @returns {void}
   */
  switchToHide (huntMode = '') {
    this._switchToMode(NavigationService.MODES.HIDE, huntMode)
  }

  /**
   * Switch to build/edit mode.
   * Preserves current game state and navigates to build battle page.
   *
   * @param {string|boolean} [huntMode=''] - Whether in hunt mode or mode identifier.
   * @returns {void}
   */
  switchToBuild (huntMode = '') {
    this._switchToMode(NavigationService.MODES.BUILD, huntMode)
  }

  /**
   * Switch to map list mode.
   * Preserves current game state and navigates to map list page.
   *
   * @param {string|boolean} [huntMode=''] - Whether in hunt mode or mode identifier.
   * @returns {void}
   */
  switchToList (huntMode = '') {
    this._switchToMode(NavigationService.MODES.LIST, huntMode)
  }

  /**
   * Switch to rules/help mode.
   * Navigates to rules documentation page.
   *
   * @param {string|boolean} [huntMode=''] - Whether in hunt mode or mode identifier.
   * @returns {void}
   */
  switchToRules (huntMode = '') {
    this._switchToMode(NavigationService.MODES.RULES, huntMode)
  }

  /**
   * Switch to mode by target page name.
   * Resolves page name to mode configuration and performs navigation.
   *
   * @param {string} target - Target page identifier: 'index', 'battleseek', 'battlebuild', 'maplist', 'rules', or 'print'.
   * @param {string|boolean} [huntMode=''] - Whether in hunt mode or mode identifier.
   * @param {string|null} [mapName=null] - Optional specific map name for navigation.
   * @returns {void}
   */
  switchToMode (target, huntMode = '', mapName = null) {
    const modeConfig = NavigationService.MODE_BY_PAGE[target]
    if (modeConfig) {
      this._switchToMode(modeConfig, huntMode, mapName)
    }
  }

  /**
   * Handle importing a map from JSON file.
   * Prompts user to select JSON file, validates format, saves map to storage,
   * and provides user feedback on success or error.
   *
   * @param {*} SavedCustomMapClass - Constructor for custom map class for validation.
   * @param {MapProviderInterface} mapProvider - Map provider for storing imported map.
   * @returns {void}
   */
  switchToImportMode (SavedCustomMapClass, mapProvider) {
    const fileInput = this._createFileInput()
    fileInput.addEventListener(
      'change',
      async event => {
        await this._handleImportFile(event, SavedCustomMapClass, mapProvider)
      },
      { once: true }
    )
    fileInput.click()
  }

  /**
   * Navigate to external URL with optional analytics tracking.
   * Updates browser location and optionally logs navigation event.
   *
   * @param {string} url - Full URL to navigate to.
   * @param {string} [trackingLabel] - Optional label for analytics tracking.
   * @returns {void}
   */
  navigateExternal (url, trackingLabel) {
    if (trackingLabel) {
      trackTab(trackingLabel)
    }

    globalThis.location.href = url
  }

  /**
   * Open browser print dialog.
   * Logs print action to analytics before opening dialog.
   *
   * @returns {void}
   */
  printPage () {
    trackTab('print')
    globalThis.print()
  }

  /**
   * Navigate to project blog.
   * External link to blog post about the game.
   *
   * @returns {void}
   */
  navigateToBlog () {
    this.navigateExternal(
      'https://geoffburns.blogspot.com/2015/10/pencil-and-paper-battleships.html',
      'go to blog'
    )
  }

  /**
   * Navigate to project source code repository.
   * External link to GitHub repository.
   *
   * @returns {void}
   */
  navigateToSource () {
    this.navigateExternal(
      'https://github.com/GeoffBurns/battleship',
      'go to source code'
    )
  }

  /**
   * Switch to game mode with state preservation.
   * Builds navigation parameters from current map, stores state via storeShips,
   * and updates browser location to new page.
   *
   * @private
   * @param {NavigationModeConfig} modeConfig - Mode configuration with page and tracking info.
   * @param {string|boolean} huntMode - Hunt mode flag or mode identifier string.
   * @param {string|null} [mapName=null] - Optional specific map name for navigation.
   * @returns {void}
   */
  _switchToMode (modeConfig, huntMode, mapName = null) {
    if (!modeConfig?.page) return

    trackTab(modeConfig.trackLabel)
    const params = this._buildModeParams(mapName)
    this._storeAndNavigate(params, huntMode, modeConfig.page)
  }

  /**
   * Build URL parameters for mode switch.
   * Extracts map metadata and constructs URLSearchParams for navigation.
   * Includes map dimensions, terrain type, and map name when available.
   *
   * @private
   * @param {string|null} [mapName=null] - Optional map name to override current map.
   * @returns {URLSearchParams} Navigation parameters ready for URL.
   */
  _buildModeParams (mapName = null) {
    const params = new URLSearchParams()
    const map = this._getCurrentMap()

    if (map) {
      this._appendMapDimensions(params, map)
      this._appendTerrainParam(params, map)
    }

    const finalMapName = mapName || map?.title
    this._appendMapName(params, finalMapName)
    return params
  }

  /**
   * Return the current map from the provider.
   * Safely accesses the map provider's current map method.
   *
   * @private
   * @returns {MapWithTerrain|null} Current map object or null if none selected.
   */
  _getCurrentMap () {
    return this.mapProvider?.getCurrentMap?.() || null
  }

  /**
   * Append width and height parameters for a map.
   * Sets 'height' and 'width' URL parameters from map row/col properties.
   *
   * @private
   * @param {URLSearchParams} params - URL parameters to modify.
   * @param {MapWithTerrain} map - Map object with dimensions.
   * @returns {void}
   */
  _appendMapDimensions (params, map) {
    if (map.rows || map.cols) {
      params.set('height', String(map.rows || ''))
      params.set('width', String(map.cols || ''))
    }
  }

  /**
   * Append terrain parameter for a map.
   * Extracts terrain identifier from map terrain property.
   * Handles both string and object terrain configurations.
   *
   * @private
   * @param {URLSearchParams} params - URL parameters to modify.
   * @param {MapWithTerrain} map - Map object with terrain info.
   * @returns {void}
   */
  _appendTerrainParam (params, map) {
    let terrainTag = null

    if (typeof map.terrain === 'string') {
      terrainTag = map.terrain
    } else if (map.terrain && typeof map.terrain === 'object') {
      terrainTag = map.terrain.bodyTag || map.terrain.tag
    }

    if (terrainTag) {
      params.set('terrain', terrainTag)
    }
  }

  /**
   * Append map name parameter when available.
   * Sets 'mapName' URL parameter if provided or from current map.
   *
   * @private
   * @param {URLSearchParams} params - URL parameters to modify.
   * @param {string|null} [mapName=null] - Optional map name to append.
   * @returns {void}
   */
  _appendMapName (params, mapName) {
    if (mapName) {
      params.set('mapName', mapName)
    }
  }

  /**
   * Store game state and navigate to new page.
   * Calls storeShips to persist game state and updates browser location.
   * Handles errors with console logging.
   *
   * @private
   * @param {URLSearchParams} params - URL parameters for navigation.
   * @param {string|boolean} huntMode - Hunt mode flag or mode identifier.
   * @param {string} targetPage - Target page identifier.
   * @returns {void}
   */
  _storeAndNavigate (params, huntMode, targetPage) {
    try {
      const map = this._getCurrentMap()
      const huntModeStr = String(huntMode)
      const url = storeShips(params, huntModeStr, targetPage, map || {})
      if (typeof url === 'string') {
        globalThis.location.href = url
      }
    } catch (error) {
      console.error('Error during navigation:', error)
    }
  }

  /**
   * Create file input element for JSON import.
   * Constructs a hidden input element configured for JSON file selection.
   *
   * @private
   * @returns {HTMLInputElement} Configured file input element.
   */
  _createFileInput () {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    return input
  }

  /**
   * Handle map file import with validation and storage.
   * Reads file, parses JSON, validates as map, confirms overwrite if duplicate,
   * saves to local storage, and shows user feedback.
   * Catches and displays any errors encountered.
   *
   * @private
   * @param {Event} event - File input change event with file data.
   * @param {*} SavedCustomMapClass - Custom map constructor class for validation.
   * @param {MapProviderInterface} mapProvider - Map provider for storage access.
   * @returns {Promise<void>}
   */
  async _handleImportFile (event, SavedCustomMapClass, mapProvider) {
    const file = this._getSelectedFile(event)
    if (!file) return

    try {
      const map = await this._parseMapFromFile(file, SavedCustomMapClass)
      if (!map) return
      await this._validateAndSaveMap(map, mapProvider)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this._showImportError(error)
    }
  }

  /**
   * Get the selected file from a file change event.
   * Safely extracts the first file from the input element.
   *
   * @private
   * @param {Event} event - File input change event.
   * @returns {File|null} Selected file or null if none found.
   */
  _getSelectedFile (event) {
    const target = /** @type {HTMLInputElement} */ (event.target)
    return target?.files?.[0] || null
  }

  /**
   * Parse and validate JSON file contents as map object.
   * Reads file text, parses JSON, and constructs map instance.
   * Throws error if file format is invalid.
   *
   * @private
   * @param {File} file - JSON file to parse.
   * @param {*} SavedCustomMapClass - Map class constructor for instantiation.
   * @returns {Promise<MapWithTerrain|null>} Parsed map instance or null if invalid.
   * @throws {Error} If file parsing or JSON validation fails.
   */
  async _parseMapFromFile (file, SavedCustomMapClass) {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      return new SavedCustomMapClass(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Invalid map file format: ${message}`)
    }
  }

  /**
   * Validate map uniqueness and save to storage with conflict resolution.
   * Checks for duplicate map titles, prompts for overwrite confirmation if needed,
   * saves map to local storage, and shows success feedback.
   *
   * @private
   * @param {MapWithTerrain} map - Map object to validate and save.
   * @param {MapProviderInterface} mapProvider - Map provider for storage access and duplication check.
   * @returns {Promise<void>}
   */
  async _validateAndSaveMap (map, mapProvider) {
    const maps = mapProvider.getMaps()
    const mapTitle = map.title || ''
    const isDuplicate = maps.getMap(mapTitle) || maps.getCustomMap(mapTitle)

    if (isDuplicate && !this._confirmOverwrite(mapTitle)) {
      return
    }

    if (
      map.saveToLocalStorage &&
      typeof map.saveToLocalStorage === 'function'
    ) {
      map.saveToLocalStorage()
    }
    trackClick(map, 'import map')
    alert('Map imported successfully.')
  }

  /**
   * Confirm whether to overwrite an existing map.
   * Prompts user with confirmation dialog for duplicate map titles.
   *
   * @private
   * @param {string} title - Title of the map being imported.
   * @returns {boolean} True if user confirms overwrite, false otherwise.
   */
  _confirmOverwrite (title) {
    return confirm(`A map with title "${title}" already exists. Overwrite it?`)
  }

  /**
   * Display import error to user.
   * Shows alert dialog with error message from import process.
   *
   * @private
   * @param {Error} error - Error object from import process.
   * @returns {void}
   */
  _showImportError (error) {
    const message = error?.message || 'Failed to import map'
    alert(`Import error: ${message}`)
  }
}
