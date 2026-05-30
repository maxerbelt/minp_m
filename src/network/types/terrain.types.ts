/**
 * Terrain configuration and state types.
 * Defines interfaces for terrain-related data structures used across network operations.
 *
 * @module network/types/terrain
 */

/**
 * Terrain data from the terrain system.
 * Contains terrain identification and CSS class information.
 * Properties are optional to handle various terrain system states.
 *
 * @typedef {Object} TerrainData
 * @property {string} [tag] - Terrain tag identifier (e.g., 'sea', 'space', 'asteroid')
 * @property {string} [bodyTag] - HTML body tag for terrain-specific CSS class
 */
export interface TerrainData {
  readonly tag?: string
  readonly bodyTag?: string
}

/**
 * Current terrain state from the global terrain manager.
 * Represents the active terrain configuration.
 *
 * @typedef {Object} TerrainState
 * @property {TerrainData} terrain - Terrain configuration data
 * @property {string} [currentTag] - Currently active terrain tag
 */
export interface TerrainState extends TerrainData {
  readonly currentTag?: string
}

/**
 * Terrain map configuration.
 * Maps terrain tags to their display configurations.
*
 * @typedef {Object} TerrainMap
 * @property {TerrainData} [terrain] - Terrain configuration for this map
 * @property {boolean} [enabled] - Whether this terrain is available
 */
export interface TerrainMap {
  readonly terrain?: TerrainData
  readonly enabled?: boolean
}

/**
 * Supported terrain types as constants.
 * Used for type-safe terrain tag references.
 */
export const TERRAIN_TYPES = {
  SEA: 'sea',
  SPACE: 'space',
  ASTEROID: 'asteroid'
} as const

/**
 * Terrain system defaults and configuration.
 * Provides fallback values and standard configuration.
 *
 * @example
 * const defaultTerrain = TERRAIN_DEFAULTS.FALLBACK_TERRAIN // 'sea'
 * const cssPrefix = TERRAIN_DEFAULTS.BODY_TAG_PREFIX       // 'terrain-'
 */
export const TERRAIN_DEFAULTS = {
  FALLBACK_TERRAIN: 'sea' as const,
  FALLBACK_BODY_TAG: 'sea',
  BODY_TAG_PREFIX: 'terrain-',
  INITIALIZATION_TIMEOUT_MS: 5000,
  WARN_ON_MISSING: true
} as const

/**
 * Union type of all valid terrain type values.
 * Derived from TERRAIN_TYPES constants.
 */
export type TerrainType = typeof TERRAIN_TYPES[keyof typeof TERRAIN_TYPES]

/**
 * Terrain configuration from URL or application state.
 * Complete terrain context for map operations.
 *
 * @typedef {Object} TerrainContext
 * @property {TerrainType} type - Current terrain type
 * @property {string} bodyTag - HTML body tag for CSS
 * @property {boolean} isSupported - Whether this terrain is supported
 */
export interface TerrainContext {
  readonly type: TerrainType
  readonly bodyTag: string
  readonly isSupported: boolean
}
