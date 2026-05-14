/**
 * ParameterManager - Centralized URL parameter management.
 * Handles getting and setting URL search parameters with validation.
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
   * @typedef {Object.<string, string|number|boolean>} ParamMap
   */

  /**
   * @typedef {Object.<string, string>} ParamObject
   */

  /**
   * Creates a new ParameterManager instance.
   * @param {URLSearchParams} [urlParams] - Optional URLSearchParams instance.
   */
  constructor (urlParams = new URLSearchParams(globalThis.location.search)) {
    /** @type {URL} Current window location as URL */
    this.url = new URL(globalThis.location)
    /** @type {URLSearchParams} URL search parameters */
    this.params = urlParams
  }

  // ============================================================================
  // Getters - Extract URL parameters
  // ============================================================================

  /**
   * Get size parameters (height, width) from the URL.
   * @returns {SizeParams} Object containing height and width.
   */
  getSize () {
    return {
      height: this._parseIntegerParam('height'),
      width: this._parseIntegerParam('width')
    }
  }

  /**
   * Get map name from parameters.
   * @returns {string|undefined} Map name parameter value.
   */
  getMapName () {
    return this._getParam('mapName')
  }

  /**
   * Get edit mode map name.
   * @returns {string|undefined} Edit map parameter value.
   */
  getEditMap () {
    return this._getParam('edit')
  }

  /**
   * Get map type filter.
   * @returns {string|undefined} Map type parameter value.
   */
  getMapType () {
    return this._getParam('mapType')
  }

  /**
   * Get terrain tag.
   * @returns {string|undefined} Terrain tag parameter value.
   */
  getTerrain () {
    return this._getParam('terrain')
  }

  /**
   * Check if in edit mode.
   * @returns {boolean} True if edit map parameter exists.
   */
  isEditMode () {
    return Boolean(this.getEditMap())
  }

  /**
   * Check if placed ships parameter exists.
   * @returns {boolean} True if placedShips parameter is present.
   */
  hasPlacedShips () {
    return this.params.has('placedShips')
  }

  // ============================================================================
  // Setters - Update URL parameters
  // ============================================================================

  /**
   * Set size parameters (height, width).
   * Clears mapName when setting explicit dimensions.
   * @param {number} height - Map height in rows.
   * @param {number} width - Map width in columns.
   * @returns {void}
   * @throws {Error} If height or width is not a valid number.
   */
  setSize (height, width) {
    this._validateNumbers(height, width)
    this._clearMapSelectionParams()
    this._setParam('height', String(height))
    this._setParam('width', String(width))
  }

  /**
   * Set map name parameter.
   * Clears width/height when setting map name.
   * @param {string} mapName - Name of the map.
   * @returns {void}
   */
  setMapName (mapName) {
    if (this._hasValue(mapName)) {
      this._clearMapDimensionParams()
      this._setParam('mapName', mapName)
    }
  }

  /**
   * Set terrain parameter.
   * @param {string} terrainTag - Terrain identifier tag.
   * @returns {void}
   */
  setTerrain (terrainTag) {
    if (this._hasValue(terrainTag)) {
      this._setParam('terrain', terrainTag)
    }
  }

  /**
   * Set map type filter.
   * Clears mapName, height, width when setting mapType.
   * @param {string} mapType - Map type filter string.
   * @returns {void}
   */
  setMapType (mapType) {
    const normalizedMapType = this._extractFirstWord(mapType)
    if (this._hasValue(normalizedMapType)) {
      this._clearMapSelectionParams()
      this._setParam('mapType', normalizedMapType)
    }
  }

  /**
   * Clear map-related parameters (mapName, height, width).
   * @returns {void}
   */
  clearMapParams () {
    this._clearMapDimensionParams()
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * Set all parameters at once from a map object.
   * @param {ParamMap} paramMap - Map of parameter keys to values.
   * @returns {void}
   */
  setAll (paramMap) {
    for (const [key, value] of Object.entries(paramMap)) {
      if (this._isValueDefined(value)) {
        this.params.set(key, String(value))
      }
    }
  }

  /**
   * Delete multiple parameters at once.
   * @param {string[]} keys - Array of parameter keys to delete.
   * @returns {void}
   */
  deleteAll (keys) {
    this._deleteParams(keys)
  }

  /**
   * Update browser history with current parameters.
   * @param {string} [pageTitle=''] - Optional page title for history.
   * @returns {void}
   */
  updateHistoryState (pageTitle = '') {
    this._refreshUrlSearch()
    history.pushState({}, pageTitle, this.url.toString())
  }

  /**
   * Update history and refresh page.
   * @param {string} [pageTitle=''] - Optional page title for history.
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
   * Get current parameters as plain object.
   * @returns {ParamObject} Parameters as key-value object.
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
   * Get the first string value for a parameter key.
   * @private
   * @param {string} key - Parameter key.
   * @returns {string|undefined} Parameter value.
   */
  _getParam (key) {
    return this.params.get(key) ?? undefined
  }

  /**
   * Parse an integer parameter value.
   * @private
   * @param {string} key - Parameter key.
   * @returns {number} Parsed integer or NaN.
   */
  _parseIntegerParam (key) {
    return Number.parseInt(this._getParam(key), 10)
  }

  /**
   * Set a parameter value.
   * @private
   * @param {string} key - Parameter key.
   * @param {string} value - Parameter value.
   * @returns {void}
   */
  _setParam (key, value) {
    this.params.set(key, value)
  }

  /**
   * Delete multiple parameters.
   * @private
   * @param {string[]} keys - Keys to delete.
   * @returns {void}
   */
  _deleteParams (keys) {
    for (const key of keys) {
      this.params.delete(key)
    }
  }

  /**
   * Clear map selection parameters: mapName, height, width.
   * @private
   * @returns {void}
   */
  _clearMapSelectionParams () {
    this._deleteParams(['mapName', 'height', 'width'])
  }

  /**
   * Clear map dimension parameters: height, width.
   * @private
   * @returns {void}
   */
  _clearMapDimensionParams () {
    this._deleteParams(['width', 'height'])
  }

  /**
   * Extract the first word from a string.
   * @private
   * @param {string|undefined} text - Text to extract from.
   * @returns {string|undefined} First word or undefined.
   */
  _extractFirstWord (text) {
    return String(text || '').split(' ', 1)[0] || undefined
  }

  /**
   * Validate that values are numbers and not NaN.
   * @private
   * @param {...number} numbers - Numbers to validate.
   * @returns {void}
   * @throws {Error} If any number is not valid.
   */
  _validateNumbers (...numbers) {
    for (const num of numbers) {
      if (typeof num !== 'number' || Number.isNaN(num)) {
        throw new Error(`Invalid number: ${num}`)
      }
    }
  }

  /**
   * Determine if a value is defined.
   * @private
   * @param {*} value - Value to check.
   * @returns {boolean} True when the value is not null or undefined.
   */
  _isValueDefined (value) {
    return value !== null && value !== undefined
  }

  /**
   * Determine if a value is present and non-empty.
   * @private
   * @param {string|undefined} value - Value to check.
   * @returns {boolean} True when the value is a non-empty string.
   */
  _hasValue (value) {
    return typeof value === 'string' && value.length > 0
  }

  /**
   * Refresh stored URL search string on the instance URL.
   * @private
   * @returns {void}
   */
  _refreshUrlSearch () {
    this.url.search = this.params.toString()
  }
}
