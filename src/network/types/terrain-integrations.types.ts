/**
 * Types for terrain system integration with network module.
 * Provides interfaces for external terrain system interactions and adapters.
 *
 * @module network/types/terrain-integrations
 */

import type { TerrainData, TerrainType } from './terrain.types.js'

/**
 * Terrain handler interface from terrain system.
 * Provides methods to query and modify the active terrain.
 * This is an adapter type for the external `bh` object from terrains/all/js/bh.js
 *
 * @typedef {Object} TerrainHandler
 * @property {TerrainData} [terrain] - Current terrain configuration
 * @property {(tag: string) => TerrainMap} setTerrainByTag - Switch to terrain by tag
 */
export interface TerrainHandler {
  readonly terrain?: TerrainData
  readonly terrainMaps?: Record<string, unknown>
  setTerrainByTag(tag: string): TerrainMap
}

/**
 * Result of setting terrain by tag.
 * Returned when terrain system is updated.
 *
 * @typedef {Object} TerrainMap
 * @property {TerrainData} [terrain] - New terrain configuration
 * @property {boolean} [enabled] - Whether this terrain is supported
 */
export interface TerrainMap {
  readonly terrain?: TerrainData
  readonly enabled?: boolean
}

/**
 * Terrain catalog interface from terrain system.
 * Provides access to the current active terrain and available terrains.
 * This is an adapter type for the external `terrains` object from terrains/all/js/terrains.js
 *
 * @typedef {Object} TerrainCatalog
 * @property {(TerrainData & {tag: string})} [current] - Currently active terrain
 * @property {Map<string, TerrainData>} [availableTerrains] - All available terrains
 */
export interface TerrainCatalog {
  readonly current?: TerrainData & { readonly tag: string }
  readonly availableTerrains?: Map<string, TerrainData>
}

/**
 * Terrain context with validation.
 * Enhanced terrain state with validation flags and compatibility checks.
 *
 * @typedef {Object} ValidatedTerrainContext
 * @property {TerrainType} type - Current terrain type
 * @property {string} bodyTag - HTML body tag for CSS
 * @property {boolean} isSupported - Whether terrain is available
 * @property {boolean} isInitialized - Whether terrain system is ready
 * @property {Error | null} initError - Error during terrain initialization
 */
export interface ValidatedTerrainContext {
  readonly type: TerrainType
  readonly bodyTag: string
  readonly isSupported: boolean
  readonly isInitialized: boolean
  readonly initError: Error | null
}

/**
 * Terrain fallback strategy.
 * Specifies behavior when terrain is unavailable or invalid.
 *
 * @typedef {Object} TerrainFallbackStrategy
 * @property {TerrainType} defaultTerrain - Fallback terrain if current is invalid
 * @property {string} defaultBodyTag - Fallback body tag
 * @property {boolean} warnOnFallback - Whether to console.warn when fallback is used
 * @property {(tag: string | undefined) => TerrainType} resolveFallback - Function to determine fallback
 */
export interface TerrainFallbackStrategy {
  readonly defaultTerrain: TerrainType
  readonly defaultBodyTag: string
  readonly warnOnFallback?: boolean
  readonly resolveFallback?: (tag: string | undefined) => TerrainType
}

/**
 * Terrain initialization options.
 * Configuration for setting up terrain system access.
 *
 * @typedef {Object} TerrainInitOptions
 * @property {TerrainHandler} handler - Reference to terrain handler object
 * @property {TerrainCatalog} catalog - Reference to terrain catalog object
 * @property {TerrainFallbackStrategy} [fallback] - Fallback strategy if provided
 * @property {boolean} [validateOnInit=true] - Validate terrain state on initialization
 */
export interface TerrainInitOptions {
  readonly handler: TerrainHandler
  readonly catalog: TerrainCatalog
  readonly fallback?: TerrainFallbackStrategy
  readonly validateOnInit?: boolean
}

/**
 * Result of terrain initialization.
 * Indicates success/failure and provides context.
 *
 * @typedef {Object} TerrainInitResult
 * @property {boolean} success - Whether initialization succeeded
 * @property {ValidatedTerrainContext | null} context - Terrain context if successful
 * @property {Error | null} error - Error details if initialization failed
 */
export interface TerrainInitResult {
  readonly success: boolean
  readonly context: ValidatedTerrainContext | null
  readonly error: Error | null
}
