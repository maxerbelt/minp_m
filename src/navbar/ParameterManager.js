/**
 * @typedef {import('./types/domain.types.js').SizeParams} SizeParams
 * @typedef {import('./types/shared.types.js').StringMap<string|number|boolean>} ParamMap
 * @typedef {import('./types/shared.types.js').StringMap<string>} ParamObject
 */

/**
 * ParameterManager - Centralized URL parameter management.
 * Handles getting and setting URL search parameters with validation.
 * Provides safe, validated access to URL search parameters with automatic type conversion.
 *
 * @class
 * @public
 */
export class ParameterManager {
  /**
   * Creates a new ParameterManager instance.
   * Initializes URL and parameters from the current window location if not provided.
   *
   * @constructor
   * @public
   * @param {URLSearchParams} [urlParams] - Optional URLSearchParams instance. Defaults to current window location search params.
   * @throws {Error} If URL parsing fails due to invalid format.
   * @example
   * // Use current window location
   * const manager = new ParameterManager();
   * // Use custom URL params
   * const customParams = new URLSearchParams('width=50&height=50');
   * const manager = new ParameterManager(customParams);
   */
  constructor (urlParams = new URLSearchParams(globalThis.location.search)) {
    /** @type {URL} Current window location as URL object */
    this.url = new URL(globalThis.location.href)
    /** @type {URLSearchParams} URL search parameters */
    this.params = urlParams
  }

  // ============================================================================
  // Getters - Extract URL parameters
  // ============================================================================

  /**
   * Get size parameters (height, width) from the URL.
   * Extracts and validates numeric dimensions from URL parameters.
   *
   * @public
   * @returns {SizeParams} Object containing height and width as numbers (may be NaN if not set).
   * @example
   * const size = manager.getSize();
   * // { height: 50, width: 50 }
   */
  getSize () {
    return {
      height: this._parseIntegerParam('height'),
      width: this._parseIntegerParam('width')
    }
  }

  /**
   * Get map name from parameters.
   * Retrieves the mapName parameter value if present.
   *
   * @public
   * @returns {string|undefined} Map name parameter value, or undefined if not set.
   */
  getMapName () {
    return this._getParam('mapName')
  }

  /**
   * Get edit mode map name.
   * Retrieves the edit parameter for editing an existing map.
   *
   * @public
   * @returns {string|undefined} Edit map parameter value, or undefined if not in edit mode.
   */
  getEditMap () {
    return this._getParam('edit')
  }

  /**
   * Get map type filter.
   * Retrieves the mapType parameter for filtering maps.
   *
   * @public
   * @returns {string|undefined} Map type parameter value, or undefined if not set.
   */
  getMapType () {
    return this._getParam('mapType')
  }

  /**
   * Get terrain tag.
   * Retrieves the terrain parameter for terrain-specific filtering.
   *
   * @public
   * @returns {string|undefined} Terrain tag parameter value, or undefined if not set.
   */
  getTerrain () {
    return this._getParam('terrain')
  }

  /**
   * Check if in edit mode.
   * Convenience method to check if edit mode is active.
   *
   * @public
   * @returns {boolean} True if edit map parameter exists and is non-empty.
   */
  isEditMode () {
    return Boolean(this.getEditMap())
  }

  /**
   * Check if placed ships parameter exists.
   * Determines whether the URL contains placed ships data.
   *
   * @public
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
   * Side effect: modifies internal URL parameters and clears map selection params.
   *
   * @public
   * @param {number} height - Map height in rows. Must be a valid number, not NaN.
   * @param {number} width - Map width in columns. Must be a valid number, not NaN.
   * @returns {void}
   * @throws {TypeError} If height or width is not a valid number or is NaN.
   * @example
   * manager.setSize(50, 75);
   * // Sets height=50 and width=75 in URL, clears mapName
   */
  setSize (height, width) {
    this._validateNumbers(height, width)
    this._clearMapSelectionParams()
    this._setParam('height', String(height))
    this._setParam('width', String(width))
  }

  /**
   * Set map name parameter.
   * Clears width/height when setting map name to prefer named maps over dimensions.
   * Side effect: modifies internal URL parameters and clears map dimension params.
   *
   * @public
   * @param {string} mapName - Name of the map. Empty strings are ignored.
   * @returns {void}
   * @example
   * manager.setMapName('my-custom-map');
   * // Sets mapName=my-custom-map, clears width and height
   */
  setMapName (mapName) {
    if (this._hasValue(mapName)) {
      this._clearMapDimensionParams()
      this._setParam('mapName', mapName)
    }
  }

  /**
   * Set terrain parameter.
   * Adds or updates the terrain filter parameter.
   * Side effect: modifies internal URL parameters.
   *
   * @public
   * @param {string} terrainTag - Terrain identifier tag. Empty strings are ignored.
   * @returns {void}
   * @example
   * manager.setTerrain('sea-and-land');
   * // Sets terrain=sea-and-land in URL
   */
  setTerrain (terrainTag) {
    if (this._hasValue(terrainTag)) {
      this._setParam('terrain', terrainTag)
    }
  }

  /**
   * Set map type filter.
   * Clears mapName, height, width when setting mapType to avoid conflicts.
   * Only uses the first word of the mapType string.
   * Side effect: modifies internal URL parameters and clears map selection params.
   *
   * @public
   * @param {string} mapType - Map type filter string (only first word is used). Empty strings are ignored.
   * @returns {void}
   * @example
   * manager.setMapType('predefined square');
   * // Sets mapType=predefined (only first word), clears mapName/width/height
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
   * Removes all parameters related to map selection.
   * Side effect: modifies internal URL parameters.
   *
   * @public
   * @returns {void}
   * @example
   * manager.clearMapParams();
   * // Removes mapName, height, and width from URL
   */
  clearMapParams () {
    this._clearMapDimensionParams()
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * Set all parameters at once from a map object.
   * Only sets parameters with defined (non-null, non-undefined) values.
   * Side effect: modifies internal URL parameters.
   *
   * @public
   * @param {ParamMap} paramMap - Map of parameter keys to values (strings, numbers, or booleans).
   * @returns {void}
   * @example
   * manager.setAll({ width: 50, height: 50, mapType: 'predefined' });
   * // Sets all three parameters in URL
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
   * Removes the specified keys from URL parameters.
   * Side effect: modifies internal URL parameters.
   *
   * @public
   * @param {string[]} keys - Array of parameter keys to delete.
   * @returns {void}
   * @example
   * manager.deleteAll(['mapName', 'height', 'width']);
   * // Removes those three parameters from URL
   */
  deleteAll (keys) {
    this._deleteParams(keys)
  }

  /**
   * Update browser history with current parameters.
   * Pushes the current state to browser history without reloading.
   * Side effect: modifies browser history and internal URL.
   *
   * @public
   * @param {string} [pageTitle=''] - Optional page title for history state.
   * @returns {void}
   * @example
   * manager.setSize(50, 50);
   * manager.updateHistoryState('Custom Map 50x50');
   * // URL is updated in browser history
   */
  updateHistoryState (pageTitle = '') {
    this._refreshUrlSearch()
    history.pushState({}, pageTitle, this.url.toString())
  }

  /**
   * Update history and refresh page.
   * Combines history update with page reload to apply URL changes.
   * Side effect: reloads the page with new URL parameters.
   *
   * @public
   * @param {string} [pageTitle=''] - Optional page title for history state.
   * @returns {void}
   * @example
   * manager.setMapName('custom-map');
   * manager.updateAndRefresh('Custom Map');
   * // URL is updated and page reloads
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
   * Converts the internal URLSearchParams to a simple key-value object.
   *
   * @public
   * @returns {ParamObject} Parameters as key-value object with all values as strings.
   * @example
   * const params = manager.toObject();
   * // { width: '50', height: '50', mapName: 'my-map' }
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
   * Returns undefined if the key does not exist.
   *
   * @private
   * @param {string} key - Parameter key to retrieve.
   * @returns {string|undefined} Parameter value or undefined if not present.
   */
  _getParam (key) {
    return this.params.get(key) ?? undefined
  }

  /**
   * Parse an integer parameter value.
   * Returns NaN if the parameter is not set or cannot be parsed as an integer.
   *
   * @private
   * @param {string} key - Parameter key to retrieve and parse.
   * @returns {number} Parsed integer (radix 10) or NaN if not a valid integer.
   */
  _parseIntegerParam (key) {
    return Number.parseInt(this._getParam(key), 10)
  }

  /**
   * Set a parameter value in the internal URLSearchParams.
   * Automatically converts the value to a string.
   * Side effect: modifies internal params object.
   *
   * @private
   * @param {string} key - Parameter key to set.
   * @param {string} value - Parameter value (will be stored as string).
   * @returns {void}
   */
  _setParam (key, value) {
    this.params.set(key, value)
  }

  /**
   * Delete multiple parameters from the internal URLSearchParams.
   * Side effect: modifies internal params object.
   *
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
   * Removes all parameters related to selecting a specific map.
   * Side effect: modifies internal params object.
   *
   * @private
   * @returns {void}
   */
  _clearMapSelectionParams () {
    this._deleteParams(['mapName', 'height', 'width'])
  }

  /**
   * Clear map dimension parameters: height, width.
   * Removes only the dimension parameters, not mapName.
   * Side effect: modifies internal params object.
   *
   * @private
   * @returns {void}
   */
  _clearMapDimensionParams () {
    this._deleteParams(['width', 'height'])
  }

  /**
   * Extract the first word from a string.
   * Returns undefined if the string is empty, null, or undefined.
   *
   * @private
   * @param {string|undefined|null} text - Text to extract from.
   * @returns {string|undefined} First word (up to first space) or undefined.
   */
  _extractFirstWord (text) {
    return String(text || '').split(' ', 1)[0] || undefined
  }

  /**
   * Validate that values are numbers and not NaN.
   * Throws TypeError if any value is not a valid number.
   *
   * @private
   * @param {...number} numbers - Numbers to validate.
   * @returns {void}
   * @throws {TypeError} If any number is not typeof 'number' or is NaN.
   */
  _validateNumbers (...numbers) {
    for (const num of numbers) {
      if (typeof num !== 'number' || Number.isNaN(num)) {
        throw new TypeError(`Invalid number: ${num}`)
      }
    }
  }

  /**
   * Determine if a value is defined (not null and not undefined).
   * Used to filter out falsy values when setting parameters.
   *
   * @private
   * @param {*} value - Value to check.
   * @returns {boolean} True when the value is not null or undefined.
   */
  _isValueDefined (value) {
    return value !== null && value !== undefined
  }

  /**
   * Determine if a value is present and non-empty string.
   * Used for validation before setting string parameters.
   *
   * @private
   * @param {string|undefined|null} value - Value to check.
   * @returns {boolean} True when the value is a non-empty string.
   */
  _hasValue (value) {
    return typeof value === 'string' && value.length > 0
  }

  /**
   * Refresh stored URL search string on the instance URL object.
   * Updates the URL's search property to match current params.
   * Side effect: modifies internal URL object.
   *
   * @private
   * @returns {void}
   */
  _refreshUrlSearch () {
    this.url.search = this.params.toString()
  }
}
