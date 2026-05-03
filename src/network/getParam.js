/**
 * Utility functions for extracting URL parameters.
 */

/**
 * Gets the first value of a URL parameter.
 * @private
 * @param {URLSearchParams} urlParams - URL search parameters
 * @param {string} key - Parameter key
 * @returns {string|undefined} First parameter value or undefined
 */
function getFirstParam (urlParams, key) {
  return urlParams.getAll(key)[0]
}

/**
 * Gets the size parameters (height and width) from URL.
 * @param {URLSearchParams} urlParams - URL search parameters
 * @returns {[number, number]} Array with height and width
 */
export function getParamSize (urlParams) {
  const height = Number.parseInt(getFirstParam(urlParams, 'height'), 10)
  const width = Number.parseInt(getFirstParam(urlParams, 'width'), 10)
  return [height, width]
}

/**
 * Gets the map name parameter from URL.
 * @param {URLSearchParams} urlParams - URL search parameters
 * @returns {string|undefined} Map name
 */
export function getParamMap (urlParams) {
  return getFirstParam(urlParams, 'mapName')
}

/**
 * Checks if the application is in edit mode.
 * @param {URLSearchParams} urlParams - URL search parameters
 * @returns {boolean} True if in edit mode
 */
export function isEditMode (urlParams) {
  const edit = getParamEditMap(urlParams)
  return !!edit
}

/**
 * Gets the edit map parameter from URL.
 * @param {URLSearchParams} urlParams - URL search parameters
 * @returns {string|undefined} Edit map value
 */
function getParamEditMap (urlParams) {
  return getFirstParam(urlParams, 'edit')
}

/**
 * Gets the map type parameter from URL.
 * @param {URLSearchParams} urlParams - URL search parameters
 * @returns {string|undefined} Map type
 */
export function getParamMapType (urlParams) {
  return getFirstParam(urlParams, 'mapType')
}
