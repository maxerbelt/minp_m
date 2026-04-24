import { storeShips } from '../waters/saveCustomMap.js'
import { trackTab, trackClick } from './gtag.js'

/**
 * NavigationService - Centralized game mode switching and page navigation
 * Manages navigation between different game modes with state preservation
 *
 * @class NavigationService
 * @description Handles mode switching, file import, and external navigation
 */
export class NavigationService {
  /**
   * Predefined game mode configurations
   * @static
   * @type {Object<string, {page: string, trackLabel: string}>}
   */
  static MODES = {
    SEEK: { page: 'battleseek', trackLabel: 'switch to seek' },
    HIDE: { page: 'index', trackLabel: 'switch to hide' },
    BUILD: { page: 'battlebuild', trackLabel: 'switch to build' },
    LIST: { page: 'maplist', trackLabel: 'switch to list' },
    RULES: { page: 'rules', trackLabel: 'switch to rules' }
  }

  /**
   * Initialize navigation service
   * @param {Object} paramManager - Parameter manager for state tracking
   * @param {Object} mapProvider - Map provider for current map access
   */
  constructor (paramManager, mapProvider) {
    /** @type {Object} Parameter manager instance */
    this.paramManager = paramManager

    /** @type {Object} Map provider instance */
    this.mapProvider = mapProvider
  }

  /**
   * Switch to seek/hunt mode
   * @param {boolean} huntMode - Whether in hunt mode
   * @returns {void}
   */
  switchToSeek (huntMode) {
    this._switchToMode(NavigationService.MODES.SEEK, huntMode)
  }

  /**
   * Switch to hide/play mode
   * @param {boolean} huntMode - Whether in hunt mode
   * @returns {void}
   */
  switchToHide (huntMode) {
    this._switchToMode(NavigationService.MODES.HIDE, huntMode)
  }

  /**
   * Switch to build/edit mode
   * @param {boolean} huntMode - Whether in hunt mode
   * @returns {void}
   */
  switchToBuild (huntMode) {
    this._switchToMode(NavigationService.MODES.BUILD, huntMode)
  }

  /**
   * Switch to map list mode
   * @param {boolean} huntMode - Whether in hunt mode
   * @returns {void}
   */
  switchToList (huntMode) {
    this._switchToMode(NavigationService.MODES.LIST, huntMode)
  }

  /**
   * Switch to rules/help mode
   * @param {boolean} huntMode - Whether in hunt mode
   * @returns {void}
   */
  switchToRules (huntMode) {
    this._switchToMode(NavigationService.MODES.RULES, huntMode)
  }

  /**
   * Handle importing a map from JSON file
   * Prompts user to select JSON file, validates format, and saves map
   * @param {Function} SavedCustomMapClass - Constructor for custom map class
   * @param {Object} mapProvider - Map provider for storing imported map
   * @returns {void}
   */
  switchToImportMode (SavedCustomMapClass, mapProvider) {
    const fileInput = this._createFileInput()

    fileInput.onchange = async event => {
      await this._handleImportFile(event, SavedCustomMapClass, mapProvider)
    }

    fileInput.click()
  }

  /**
   * Navigate to external URL with optional tracking
   * @param {string} url - URL to navigate to
   * @param {string} [trackingLabel] - Label for analytics tracking
   * @returns {void}
   */
  navigateExternal (url, trackingLabel) {
    if (trackingLabel) {
      trackTab(trackingLabel)
    }

    globalThis.location.href = url
  }

  /**
   * Open browser print dialog
   * @returns {void}
   */
  printPage () {
    trackTab('print')
    globalThis.print()
  }

  /**
   * Navigate to project blog
   * @returns {void}
   */
  navigateToBlog () {
    const blogUrl =
      'https://geoffburns.blogspot.com/2015/10/pencil-and-paper-battleships.html'
    this.navigateExternal(blogUrl, 'go to blog')
  }

  /**
   * Navigate to project source code repository
   * @returns {void}
   */
  navigateToSource () {
    const sourceUrl = 'https://github.com/GeoffBurns/battleship'
    this.navigateExternal(sourceUrl, 'go to source code')
  }

  /**
   * Switch to game mode with state preservation
   * @private
   * @param {Object} modeConfig - Mode configuration {page, trackLabel}
   * @param {boolean} huntMode - Hunt mode flag
   * @param {string} [mapName] - Optional specific map name
   * @returns {void}
   */
  _switchToMode (modeConfig, huntMode, mapName = null) {
    if (!modeConfig?.page) return

    const params = this._buildModeParams(mapName)
    this._storeAndNavigate(params, huntMode, modeConfig.page)
  }

  /**
   * Build URL parameters for mode switch
   * @private
   * @param {string} [mapName] - Optional map name
   * @returns {URLSearchParams} Navigation parameters
   */
  _buildModeParams (mapName = null) {
    const params = new URLSearchParams()
    const map = this.mapProvider.getCurrentMap()

    // Add map dimensions if no specific map name provided
    if (!mapName && map) {
      params.append('height', map.rows || '')
      params.append('width', map.cols || '')
    }

    // Add map name
    const finalMapName = mapName || map?.title
    if (finalMapName) {
      params.append('mapName', finalMapName)
    }

    return params
  }

  /**
   * Store game state and navigate to new page
   * @private
   * @param {URLSearchParams} params - URL parameters
   * @param {boolean} huntMode - Hunt mode flag
   * @param {string} targetPage - Target page identifier
   * @returns {void}
   */
  _storeAndNavigate (params, huntMode, targetPage) {
    try {
      const map = this.mapProvider.getCurrentMap()
      const result = storeShips(params, huntMode, targetPage, map)

      if (result) {
        globalThis.location.href = result
      }
    } catch (error) {
      console.error('Error during navigation:', error)
    }
  }

  /**
   * Create file input element for JSON import
   * @private
   * @returns {HTMLInputElement} Configured file input element
   */
  _createFileInput () {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    return input
  }

  /**
   * Handle map file import with validation and storage
   * @private
   * @param {Event} event - File input change event
   * @param {Function} SavedCustomMapClass - Custom map constructor
   * @param {Object} mapProvider - Map provider for storage
   * @returns {Promise<void>}
   */
  async _handleImportFile (event, SavedCustomMapClass, mapProvider) {
    const file = event.target.files?.[0]
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
   * Parse and validate JSON file contents as map object
   * @private
   * @param {File} file - JSON file to parse
   * @param {Function} SavedCustomMapClass - Map class constructor
   * @returns {Promise<Object|null>} Parsed map or null if invalid
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
   * Validate map uniqueness and save to storage with conflict resolution
   * @private
   * @param {Object} map - Map object to validate and save
   * @param {Object} mapProvider - Map provider for storage access
   * @returns {Promise<void>}
   */
  async _validateAndSaveMap (map, mapProvider) {
    const maps = mapProvider.getMaps()
    const isDuplicate = maps.getMap(map.title) || maps.getCustomMap(map.title)

    if (isDuplicate) {
      const shouldOverwrite = confirm(
        `A map with title "${map.title}" already exists. Overwrite it?`
      )

      if (!shouldOverwrite) {
        return
      }
    }

    map.saveToLocalStorage()
    trackClick(map, 'import map')
    alert('Map imported successfully.')
  }

  /**
   * Display import error to user
   * @private
   * @param {Error} error - Error object from import process
   * @returns {void}
   */
  _showImportError (error) {
    const message = error.message || 'Failed to import map'
    alert(`Import error: ${message}`)
  }
}
