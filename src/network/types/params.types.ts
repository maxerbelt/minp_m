/**
 * URL parameter type definitions and configuration.
 * Contains types for URL parameter extraction, validation, and state management.
 *
 * @module network/types/params
 */

/**
 * Map dimensions extracted from URL parameters.
 * Represents the height and width of a map in cells.
 * Both dimensions are numbers; may be NaN if parameters were invalid or missing.
 *
 * @typedef {Object} MapDimensions
 * @property {number} height - Map height in cells (may be NaN if missing/invalid)
 * @property {number} width - Map width in cells (may be NaN if missing/invalid)
 */
export interface MapDimensions {
  readonly height: number
  readonly width: number
}

/**
 * Parameters for modifying URL query string.
 * Specifies which parameters to delete and which to add/update.
 * Designed for batch parameter updates.
 *
 * @typedef {Object} ParameterChanges
 * @property {string[]} [delete] - Array of parameter keys to remove from URL
 * @property {Record<string, string>} [set] - Map of parameter keys to values to add/update
 */
export interface ParameterChanges {
  readonly delete?: readonly string[]
  readonly set?: Readonly<Record<string, string>>
}

/**
 * URL parameter extraction result.
 * Returned by parameter getter functions with optional value and validation status.
 *
 * @typedef {Object} ParameterResult
 * @property {string | undefined} value - Parameter value or undefined if not found
 * @property {boolean} found - Whether parameter exists in URL
 */
export interface ParameterResult {
  readonly value: string | undefined
  readonly found: boolean
}

/**
 * Map configuration derived from URL parameters.
 * Contains all map-related parameters extracted and normalized from URL.
 *
 * @typedef {Object} MapConfiguration
 * @property {string | undefined} name - Map name/identifier from URL
 * @property {number} height - Map height from URL (may be NaN)
 * @property {number} width - Map width from URL (may be NaN)
 * @property {string | undefined} type - Map type from URL (terrain type)
 * @property {string | undefined} terrain - Terrain identifier from URL
 * @property {boolean} editMode - Whether application is in edit/creation mode
 */
export interface MapConfiguration {
  readonly name: string | undefined
  readonly height: number
  readonly width: number
  readonly type: string | undefined
  readonly terrain: string | undefined
  readonly editMode: boolean
}

/**
 * Valid URL parameter mode values.
 * Discriminated union for parameter modification contexts.
 */
export type ParameterMode = 'edit' | 'create' | 'view'

/**
 * URL parameter key constants.
 * Type-safe references to all supported URL parameter names.
 * Eliminates magic strings and provides IDE autocompletion.
 *
 * @example
 * urlParams.set(PARAM_KEYS.HEIGHT, '8')
 * urlParams.delete(PARAM_KEYS.MAP_NAME)
 */
export const PARAM_KEYS = {
  HEIGHT: 'height',
  WIDTH: 'width',
  MAP_NAME: 'mapName',
  TERRAIN: 'terrain',
  MAP_TYPE: 'mapType',
  EDIT: 'edit'
} as const

/**
 * Union type of all valid parameter key values.
 * Useful for type-safe parameter key validation.
 */
export type ParamKey = typeof PARAM_KEYS[keyof typeof PARAM_KEYS]

/**
 * Default values and constraints for map parameters.
 * Provides baseline values and validation bounds.
 *
 * @example
 * const minHeight = PARAM_DEFAULTS.DIMENSIONS.MIN_HEIGHT // 1
 * const maxWidth = PARAM_DEFAULTS.DIMENSIONS.MAX_WIDTH   // 256
 */
export const PARAM_DEFAULTS = {
  DIMENSIONS: {
    MIN_HEIGHT: 1,
    MAX_HEIGHT: 256,
    MIN_WIDTH: 1,
    MAX_WIDTH: 256,
    DEFAULT_HEIGHT: 8,
    DEFAULT_WIDTH: 10
  },
  TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    DEFAULT: 'New Map'
  },
  TERRAIN: {
    FALLBACK: 'sea'
  }
} as const
