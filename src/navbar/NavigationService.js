import { storeShips } from '../waters/saveCustomMap.js'
import { trackTab, trackClick } from './gtag.js'

/**
 * @typedef {Object} NavigationModeConfig
 * @property {string} page - Target page identifier.
 * @property {string} trackLabel - Analytics label for this mode.
 */

/**
 * @typedef {Object} MapProvider
 * @property {() => (Object|null)} getCurrentMap - Returns current map or null.
 * @property {() => Object} getMaps - Returns maps collection.
 * @property {(string) => (Object|null)} getCustomMap - Returns custom map by name or null.
 */

/**
 * NavigationService - Centralized game mode switching and page navigation.
 * Manages navigation between different game modes with state preservation.
 *
 * @class NavigationService
 * @description Handles mode switching, file import, and external navigation.
 */
export class NavigationService {
  /**
   * Predefined game mode configurations.
   * @static
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
   * @static
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
   * @param {Object} paramManager - Parameter manager for state tracking.
   * @param {MapProvider} mapProvider - Map provider for current map access.
   */
  constructor (paramManager, mapProvider) {
    /** @type {Object} */
    this.paramManager = paramManager

    /** @type {MapProvider} */
    this.mapProvider = mapProvider
  }

  /**
   * Switch to seek/hunt mode.
   * @param {boolean} huntMode - Whether in hunt mode.
   * @returns {void}
   */
  switchToSeek (huntMode) {
    this._switchToMode(NavigationService.MODES.SEEK, huntMode)
  }

  /**
   * Switch to hide/play mode.
   * @param {boolean} huntMode - Whether in hunt mode.
   * @returns {void}
   */
  switchToHide (huntMode) {
    this._switchToMode(NavigationService.MODES.HIDE, huntMode)
  }

  /**
   * Switch to build/edit mode.
   * @param {boolean} huntMode - Whether in hunt mode.
   * @returns {void}
   */
  switchToBuild (huntMode) {
    this._switchToMode(NavigationService.MODES.BUILD, huntMode)
  }

  /**
   * Switch to map list mode.
   * @param {boolean} huntMode - Whether in hunt mode.
   * @returns {void}
   */
  switchToList (huntMode) {
    this._switchToMode(NavigationService.MODES.LIST, huntMode)
  }

  /**
   * Switch to rules/help mode.
   * @param {boolean} huntMode - Whether in hunt mode.
   * @returns {void}
   */
  switchToRules (huntMode) {
    this._switchToMode(NavigationService.MODES.RULES, huntMode)
  }

  /**
   * Switch to mode by target page name.
   * @param {string} target - Target page ('index', 'battleseek', 'battlebuild', 'maplist', 'rules', 'print').
   * @param {boolean} huntMode - Whether in hunt mode.
   * @param {string} [mapName] - Optional specific map name.
   * @returns {void}
   */
  switchToMode (target, huntMode, mapName) {
    const modeConfig = NavigationService.MODE_BY_PAGE[target]
    if (modeConfig) {
      this._switchToMode(modeConfig, huntMode, mapName)
    }
  }

  /**
   * Handle importing a map from JSON file.
   * Prompts user to select JSON file, validates format, and saves map.
   * @param {*} SavedCustomMapClass - Constructor for custom map class.
   * @param {MapProvider} mapProvider - Map provider for storing imported map.
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
   * Navigate to external URL with optional tracking.
   * @param {string} url - URL to navigate to.
   * @param {string} [trackingLabel] - Label for analytics tracking.
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
   * @returns {void}
   */
  printPage () {
    trackTab('print')
    globalThis.print()
  }

  /**
   * Navigate to project blog.
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
   * @private
   * @param {NavigationModeConfig} modeConfig - Mode configuration.
   * @param {boolean} huntMode - Hunt mode flag.
   * @param {string} [mapName] - Optional specific map name.
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
   * @private
   * @param {string} [mapName] - Optional map name.
   * @returns {URLSearchParams} Navigation parameters.
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
   * @private
   * @returns {Object|null} Current map or null.
   */
  _getCurrentMap () {
    return this.mapProvider?.getCurrentMap?.() || null
  }

  /**
   * Append width and height parameters for a map.
   * @private
   * @param {URLSearchParams} params - URL parameters.
   * @param {Object} map - Map object.
   * @returns {void}
   */
  _appendMapDimensions (params, map) {
    if (map.rows || map.cols) {
      params.set('height', map.rows || '')
      params.set('width', map.cols || '')
    }
  }

  /**
   * Append terrain parameter for a map.
   * @private
   * @param {URLSearchParams} params - URL parameters.
   * @param {Object} map - Map object.
   * @returns {void}
   */
  _appendTerrainParam (params, map) {
    const terrainTag = map.terrain?.bodyTag || map.terrain?.tag
    if (terrainTag) {
      params.set('terrain', terrainTag)
    }
  }

  /**
   * Append map name parameter when available.
   * @private
   * @param {URLSearchParams} params - URL parameters.
   * @param {string|null} mapName - Optional map name.
   * @returns {void}
   */
  _appendMapName (params, mapName) {
    if (mapName) {
      params.set('mapName', mapName)
    }
  }

  /**
   * Store game state and navigate to new page.
   * @private
   * @param {URLSearchParams} params - URL parameters.
   * @param {boolean|string} huntMode - Hunt mode flag or mode identifier.
   * @param {string} targetPage - Target page identifier.
   * @returns {void}
   */
  _storeAndNavigate (params, huntMode, targetPage) {
    try {
      const map = this._getCurrentMap()
      const url = storeShips(params, huntMode, targetPage, map)
      if (typeof url === 'string') {
        globalThis.location.href = url
      }
    } catch (error) {
      console.error('Error during navigation:', error)
    }
  }

  /**
   * Create file input element for JSON import.
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
   * @private
   * @param {Event} event - File input change event.
   * @param {*} SavedCustomMapClass - Custom map constructor class.
   * @param {MapProvider} mapProvider - Map provider for storage.
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
      this._showImportError(err)
    }
  }

  /**
   * Get the selected file from a file change event.
   * @private
   * @param {Event} event - File input change event.
   * @returns {File|null} Selected file or null.
   */
  _getSelectedFile (event) {
    const target = /** @type {HTMLInputElement} */ (event.target)
    return target?.files?.[0] || null
  }

  /**
   * Parse and validate JSON file contents as map object.
   * @private
   * @param {File} file - JSON file to parse.
   * @param {*} SavedCustomMapClass - Map class constructor.
   * @returns {Promise<Object|null>} Parsed map or null if invalid.
   */
  async _parseMapFromFile (file, SavedCustomMapClass) {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      return new SavedCustomMapClass(data)
    } catch (err) {
      throw new Error(`Invalid map file format: ${err.message}`)
    }
  }

  /**
   * Validate map uniqueness and save to storage with conflict resolution.
   * @private
   * @param {Object} map - Map object to validate and save.
   * @param {MapProvider} mapProvider - Map provider for storage access.
   * @returns {Promise<void>}
   */
  async _validateAndSaveMap (map, mapProvider) {
    const maps = mapProvider.getMaps()
    const isDuplicate = maps.getMap(map.title) || maps.getCustomMap(map.title)

    if (isDuplicate && !this._confirmOverwrite(map.title)) {
      return
    }

    map.saveToLocalStorage()
    trackClick(map, 'import map')
    alert('Map imported successfully.')
  }

  /**
   * Confirm whether to overwrite an existing map.
   * @private
   * @param {string} title - Title of the map.
   * @returns {boolean} True if user confirms overwrite.
   */
  _confirmOverwrite (title) {
    return confirm(`A map with title "${title}" already exists. Overwrite it?`)
  }

  /**
   * Display import error to user.
   * @private
   * @param {Error} error - Error object from import process.
   * @returns {void}
   */
  _showImportError (error) {
    const message = error?.message || 'Failed to import map'
    alert(`Import error: ${message}`)
  }
}
