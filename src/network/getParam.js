/**
 * Utility functions for extracting and parsing URL parameters.
 * Provides helpers for accessing URL query string parameters by key,
 * with type conversions for size parameters and boolean edit flags.
 *
 * @module network/getParam
 * @typedef {import('./types/params.types.js').MapDimensions} MapDimensions
 * @typedef {import('./types/params.types.js').ParameterResult} ParameterResult
 */

/**
 * Gets the first value of a URL parameter.
 * Retrieves the first occurrence of a parameter from the URL search string,
 * or undefined if the parameter is not present.
 *
 * @private
 * @param {URLSearchParams} urlParams - URL search parameters object
 * @param {string} key - Parameter key to retrieve
 * @returns {string|undefined} First parameter value or undefined if not found
 * @example
 * const params = new URLSearchParams('color=red&color=blue');
 * getFirstParam(params, 'color'); // returns 'red'
 */
function getFirstParam (urlParams, key) {
  return urlParams.getAll(key)[0]
}

/**
 * Gets the size parameters (height and width) from URL.
 * Extracts and parses height and width parameters from the URL query string,
 * converting them to integers using base 10. Returns NaN for missing or invalid parameters.
 *
 * @param {URLSearchParams} urlParams - URL search parameters object from location.search
 * @returns {MapDimensions} Array tuple with [height, width] as parsed integers
 * @example
 * const params = new URLSearchParams('height=8&width=10');
 * getParamSize(params); // returns [8, 10]
 */
export function getParamSize (urlParams) {
  const height = Number.parseInt(getFirstParam(urlParams, 'height'), 10)
  const width = Number.parseInt(getFirstParam(urlParams, 'width'), 10)
  return [height, width]
}

/**
 * Gets the map name parameter from URL.
 * Retrieves the mapName query parameter, which identifies a predefined or custom map.
 *
 * @param {URLSearchParams} urlParams - URL search parameters object from location.search
 * @returns {string|undefined} Map name identifier or undefined if not present
 * @example
 * const params = new URLSearchParams('mapName=MyCustomMap');
 * getParamMap(params); // returns 'MyCustomMap'
 */
export function getParamMap (urlParams) {
  return getFirstParam(urlParams, 'mapName')
}

/**
 * Checks if the application is in edit mode.
 * Determines whether the application should enter map editing mode by checking
 * for the presence of the 'edit' query parameter.
 *
 * @param {URLSearchParams} urlParams - URL search parameters object from location.search
 * @returns {boolean} True if 'edit' parameter is present and non-empty, false otherwise
 * @example
 * const params = new URLSearchParams('edit=true');
 * isEditMode(params); // returns true
 */
export function isEditMode (urlParams) {
  const edit = getParamEditMap(urlParams)
  return !!edit
}

/**
 * Gets the edit map parameter from URL.
 * Retrieves the 'edit' query parameter, which indicates map editing mode.
 *
 * @private
 * @param {URLSearchParams} urlParams - URL search parameters object from location.search
 * @returns {string|undefined} Edit parameter value or undefined if not present
 */
function getParamEditMap (urlParams) {
  return getFirstParam(urlParams, 'edit')
}

/**
 * Gets the map type parameter from URL.
 * Retrieves the mapType query parameter, which specifies the terrain type
 * (e.g., 'sea', 'space', 'asteroid').
 *
 * @param {URLSearchParams} urlParams - URL search parameters object from location.search
 * @returns {string|undefined} Map type identifier or undefined if not present
 * @example
 * const params = new URLSearchParams('mapType=space');
 * getParamMapType(params); // returns 'space'
 */
export function getParamMapType (urlParams) {
  return getFirstParam(urlParams, 'mapType')
}
