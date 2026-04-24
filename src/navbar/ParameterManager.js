/**
 * ParameterManager - Centralized URL parameter management
 * Handles getting and setting URL search parameters with validation
 *
 * @class
 */
export class ParameterManager {
  /**
   * @typedef {Object} SizeParams
   * @property {number} height - Map height in rows
   * @property {number} width - Map width in columns
   */

  /**
   * Creates a new ParameterManager instance
   * @param {URLSearchParams} [urlParams] - Optional URLSearchParams instance
   */
  constructor (urlParams) {
    /** @type {URL} Current window location as URL */
    this.url = new URL(globalThis.location)
    /** @type {URLSearchParams} URL search parameters */
    this.params = urlParams || new URLSearchParams(globalThis.location.search)
  }

  // ============================================================================
  // Getters - Extract URL parameters
  // ============================================================================

  /**
   * Get size parameters (height, width) from URL
   * @returns {SizeParams} Object containing height and width
   */
  getSize () {
    const height = Number.parseInt(this.params.getAll('height')[0], 10)
    const width = Number.parseInt(this.params.getAll('width')[0], 10)
    return { height, width }
  }

  /**
   * Get map name from parameters
   * @returns {string|undefined} Map name parameter value
   */
  getMapName () {
    return this.params.getAll('mapName')[0]
  }

  /**
   * Get edit mode map name
   * @returns {string|undefined} Edit map parameter value
   */
  getEditMap () {
    return this.params.getAll('edit')[0]
  }

  /**
   * Get map type filter
   * @returns {string|undefined} Map type parameter value
   */
  getMapType () {
    return this.params.getAll('mapType')[0]
  }

  /**
   * Get terrain tag
   * @returns {string|undefined} Terrain tag parameter value
   */
  getTerrain () {
    return this.params.getAll('terrain')[0]
  }

  /**
   * Check if in edit mode
   * @returns {boolean} True if edit map parameter exists
   */
  isEditMode () {
    return !!this.getEditMap()
  }

  /**
   * Check if placed ships parameter exists
   * @returns {boolean} True if placedShips parameter is present
   */
  hasPlacedShips () {
    return this.params.has('placedShips')
  }

  // ============================================================================
  // Setters - Update URL parameters
  // ============================================================================

  /**
   * Set size parameters (height, width)
   * Clears mapName when setting explicit dimensions
   * @param {number} height - Map height in rows
   * @param {number} width - Map width in columns
   * @returns {void}
   * @throws {Error} If height or width is not a valid number
   */
  setSize (height, width) {
    this._validateNumbers(height, width)
    this.params.delete('mapName')
    this.params.set('height', height)
    this.params.set('width', width)
  }

  /**
   * Set map name parameter
   * Clears width/height when setting map name
   * @param {string} mapName - Name of the map
   * @returns {void}
   */
  setMapName (mapName) {
    if (mapName) {
      this.params.delete('width')
      this.params.delete('height')
      this.params.set('mapName', mapName)
    }
  }

  /**
   * Set terrain parameter
   * @param {string} terrainTag - Terrain identifier tag
   * @returns {void}
   */
  setTerrain (terrainTag) {
    if (terrainTag) {
      this.params.set('terrain', terrainTag)
    }
  }

  /**
   * Set map type filter
   * Clears mapName, height, width when setting mapType
   * @param {string} mapType - Map type filter string
   * @returns {void}
   */
  setMapType (mapType) {
    mapType = this._extractFirstWord(mapType)
    if (mapType) {
      this.params.delete('mapName')
      this.params.delete('height')
      this.params.delete('width')
      this.params.set('mapType', mapType)
    }
  }

  /**
   * Clear map-related parameters (mapName, height, width)
   * @returns {void}
   */
  clearMapParams () {
    this.params.delete('mapName')
    this.params.delete('width')
    this.params.delete('height')
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * Set all parameters at once from a map object
   * @param {Object.<string, *>} paramMap - Map of parameter keys to values
   * @returns {void}
   */
  setAll (paramMap) {
    for (const [key, value] of Object.entries(paramMap)) {
      if (value !== null && value !== undefined) {
        this.params.set(key, value)
      }
    }
  }

  /**
   * Delete multiple parameters at once
   * @param {string[]} keys - Array of parameter keys to delete
   * @returns {void}
   */
  deleteAll (keys) {
    for (const key of keys) {
      this.params.delete(key)
    }
  }

  /**
   * Update browser history with current parameters
   * @param {string} [pageTitle=''] - Optional page title for history
   * @returns {void}
   */
  updateHistoryState (pageTitle = '') {
    this.url.search = this.params.toString()
    history.pushState({}, pageTitle, this.url.toString())
  }

  /**
   * Update history and refresh page
   * @param {string} [pageTitle=''] - Optional page title for history
   * @returns {void}
   */
  updateAndRefresh (pageTitle = '') {
    this.updateHistoryState(pageTitle)
    globalThis.location.reload()
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Get current parameters as plain object
   * @returns {Object.<string, string>} Parameters as key-value object
   */
  toObject () {
    const obj = {}
    for (const [key, value] of this.params) {
      obj[key] = value
    }
    return obj
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Extract first word from string (for map type)
   * @private
   * @param {string} text - Text to extract from
   * @returns {string|undefined} First word or undefined
   */
  _extractFirstWord (text) {
    return text?.split(' ', 1)[0]
  }

  /**
   * Validate that values are numbers and not NaN
   * @private
   * @param {...number} numbers - Numbers to validate
   * @returns {void}
   * @throws {Error} If any number is not valid
   */
  _validateNumbers (...numbers) {
    for (const num of numbers) {
      if (!Number.isNaN(num) && typeof num !== 'number') {
        throw new Error(`Invalid number: ${num}`)
      }
    }
  }
}
