/**
 * Utility functions for extracting and parsing URL parameters.
 * Provides helpers for accessing URL query string parameters by key,
 * with type conversions for size parameters and boolean edit flags.
 *
 * @module network/getParam
 * @typedef {import('./types/params.types.js').MapDimensions} MapDimensions
 * @typedef {import('./types/params.types.js').ParameterResult} ParameterResult
 * @typedef {import('./types/params.types.js').ParamKey} ParamKey
 * @typedef {import('./types/params.types.js').MapConfiguration} MapConfiguration
 */

/**
 * Gets the first value of a URL parameter.
 * Retrieves the first occurrence of a parameter from the URL search string,
 * or undefined if the parameter is not present. When a parameter appears multiple
 * times in the query string, only the first value is returned.
 *
 * @private
 * @param {URLSearchParams} urlParams - URL search parameters object from location.search
 * @param {string} key - Parameter key to retrieve (case-sensitive)
 * @returns {string|undefined} First parameter value, or undefined if key not found
 * @throws {TypeError} If urlParams is not a URLSearchParams object
 *
 * @example
 * const params = new URLSearchParams('color=red&color=blue');
 * getFirstParam(params, 'color'); // returns 'red'
 *
 * @example
 * const params = new URLSearchParams('size=10');
 * getFirstParam(params, 'missing'); // returns undefined
 */
function getFirstParam (urlParams, key) {
  return urlParams.getAll(key)[0]
}

/**
 * Gets the size parameters (height and width) from URL.
 * Extracts and parses height and width parameters from the URL query string,
 * converting them to integers using radix 10. Returns NaN for missing or invalid
 * parameters, allowing callers to validate parsed values independently.
 *
 * The function always returns a tuple even if parameters are missing or invalid,
 * with NaN values indicating parse failures or missing parameters.
 *
 * @param {URLSearchParams} urlParams - URL search parameters object from location.search
 * @returns {MapDimensions} Array tuple with [height, width] as parsed integers
 *   - Each dimension is a valid number or NaN if missing/invalid
 *   - Use Number.isNaN() to check for invalid values
 *   - Negative numbers are parsed successfully; validation is caller's responsibility
 *
 * @throws {TypeError} If urlParams is not a URLSearchParams object
 *
 * @example
 * const params = new URLSearchParams('height=8&width=10');
 * const [height, width] = getParamSize(params);
 * console.log(height, width); // logs: 8, 10
 *
 * @example
 * const params = new URLSearchParams('height=invalid&width=10');
 * const [height, width] = getParamSize(params);
 * console.log(Number.isNaN(height), width); // logs: true, 10
 *
 * @example
 * const params = new URLSearchParams('');
 * const [height, width] = getParamSize(params);
 * console.log(Number.isNaN(height), Number.isNaN(width)); // logs: true, true
 */
export function getParamSize (urlParams) {
  const height = Number.parseInt(getFirstParam(urlParams, 'height'), 10)
  const width = Number.parseInt(getFirstParam(urlParams, 'width'), 10)
  return [height, width]
}

/**
 * Gets the map name parameter from URL.
 * Retrieves the mapName query parameter, which identifies a predefined or custom map.
 * Returns undefined if the parameter is not present in the URL.
 *
 * @param {URLSearchParams} urlParams - URL search parameters object from location.search
 * @returns {string|undefined} Map name identifier, or undefined if mapName parameter not present
 *   - Returned value is the unencoded map name
 *   - Empty string '' is returned if mapName= is present with no value
 *   - undefined is returned if mapName is not in query string
 *
 * @throws {TypeError} If urlParams is not a URLSearchParams object
 *
 * @example
 * const params = new URLSearchParams('mapName=MyCustomMap');
 * getParamMap(params); // returns 'MyCustomMap'
 *
 * @example
 * const params = new URLSearchParams('mapName=');
 * getParamMap(params); // returns ''
 *
 * @example
 * const params = new URLSearchParams('other=value');
 * getParamMap(params); // returns undefined
 */
export function getParamMap (urlParams) {
  return getFirstParam(urlParams, 'mapName')
}

/**
 * Gets the edit map parameter from URL.
 * Retrieves the 'edit' query parameter, which indicates map editing/creation mode.
 * Returns undefined if not present, or a string value if present.
 *
 * @private
 * @param {URLSearchParams} urlParams - URL search parameters object from location.search
 * @returns {string|undefined} Edit parameter value or undefined if not present
 *   - undefined: 'edit' parameter not in URL
 *   - empty string '': 'edit=' present with no value
 *   - non-empty string: 'edit=<value>' present in URL
 *
 * @throws {TypeError} If urlParams is not a URLSearchParams object
 */
function getParamEditMap (urlParams) {
  return getFirstParam(urlParams, 'edit')
}

/**
 * Checks if the application is in edit mode.
 * Determines whether the application should enter map editing/creation mode by checking
 * for the presence of the 'edit' query parameter. The parameter's value is not validated;
 * any non-falsy value is considered to enable edit mode.
 *
 * **Truthy values that enable edit mode**:
 * - 'edit=true', 'edit=1', 'edit=yes', or any non-empty string
 *
 * **Falsy values that disable edit mode**:
 * - 'edit' parameter not present in URL
 * - 'edit=' present with empty string value
 *
 * @param {URLSearchParams} urlParams - URL search parameters object from location.search
 * @returns {boolean} True if 'edit' parameter is present with non-empty value, false otherwise
 *
 * @throws {TypeError} If urlParams is not a URLSearchParams object
 *
 * @example
 * const params = new URLSearchParams('edit=true');
 * isEditMode(params); // returns true
 *
 * @example
 * const params = new URLSearchParams('edit=1');
 * isEditMode(params); // returns true (any truthy value works)
 *
 * @example
 * const params = new URLSearchParams('edit=');
 * isEditMode(params); // returns false (empty string is falsy)
 *
 * @example
 * const params = new URLSearchParams('other=value');
 * isEditMode(params); // returns false (parameter not present)
 */
export function isEditMode (urlParams) {
  const edit = getParamEditMap(urlParams)
  return !!edit
}

/**
 * Gets the map type parameter from URL.
 * Retrieves the mapType query parameter, which specifies the terrain type.
 * Terrain types are identifiers like 'sea', 'space', 'asteroid'.
 * Returns undefined if the parameter is not present.
 *
 * **Common map type values**:
 * - 'sea': Ocean/water terrain
 * - 'space': Space/cosmic terrain
 * - 'asteroid': Asteroid/rock terrain
 *
 * @param {URLSearchParams} urlParams - URL search parameters object from location.search
 * @returns {string|undefined} Map type identifier, or undefined if mapType parameter not present
 *   - Returned value is the unencoded map type
 *   - Empty string '' is returned if mapType= is present with no value
 *   - undefined is returned if mapType is not in query string
 *
 * @throws {TypeError} If urlParams is not a URLSearchParams object
 *
 * @example
 * const params = new URLSearchParams('mapType=space');
 * getParamMapType(params); // returns 'space'
 *
 * @example
 * const params = new URLSearchParams('mapType=asteroid');
 * getParamMapType(params); // returns 'asteroid'
 *
 * @example
 * const params = new URLSearchParams('');
 * getParamMapType(params); // returns undefined
 */
export function getParamMapType (urlParams) {
  return getFirstParam(urlParams, 'mapType')
}
