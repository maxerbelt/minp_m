/**
 * @fileoverview Game Map Configuration Module
 *
 * Central registry for managing available terrain map configurations and the currently
 * active terrain maps. Provides initialization and accessor functions for working with
 * game maps in the battleship system.
 *
 * Handles:
 * - Registration of default terrain map configurations (Sea/Land, Space/Asteroids)
 * - Lazy initialization of terrain maps on first access
 * - Getting and setting the current terrain maps configuration
 * - Getting and setting the current map within a terrain configuration
 * - Default fallback when no terrain maps are set
 *
 * @module terrains/all/js/gameMaps
 */

import { TerrainMaps } from './TerrainMaps.js'
import { seaAndLandMaps } from '../../sea/js/seaAndLandMaps.js'
import { spaceAndAsteroidsMaps } from '../../space/js/spaceAndAsteroidsMaps.js'

/**
 * @typedef {import('./TerrainMaps.js').TerrainMaps} TerrainMapsType
 * @typedef {Object} TerrainMapType
 * @description Terrain map type from TerrainMaps configuration
 */

/**
 * Default terrain map configurations available in the system.
 *
 * Pre-built configurations for the two primary terrain environments supported
 * by the game:
 * - seaAndLand: Sea terrain with optional land overlay (traditional battleship)
 * - spaceAndAsteroids: Space terrain with asteroid field overlay
 *
 * These are loaded and registered during initialization via assembleTerrains().
 *
 * @type {Record<string, TerrainMapsType>}
 * @private
 * @constant
 * @remarks
 * - Keys are arbitrary but descriptive identifiers
 * - Values are pre-configured TerrainMaps instances
 * - Used for both lazy initialization and as default fallback
 * - Should be immutable after initial creation
 */
const DEFAULT_TERRAIN_MAPS = {
  seaAndLand: seaAndLandMaps,
  spaceAndAsteroids: spaceAndAsteroidsMaps
}

/**
 * Assembles and registers all available terrain map configurations.
 *
 * Initializes the TerrainMaps registry with all default terrain configurations.
 * This function should be called once during application startup to ensure all
 * terrain maps are available for use. Subsequent calls are no-ops to prevent
 * duplicate registrations.
 *
 * Registers:
 * 1. Sea and Land terrain maps (traditional battleship terrain)
 * 2. Space and Asteroids terrain maps (space-based variant)
 *
 * The check `TerrainMaps.numTerrains > 1` ensures this is only run once,
 * allowing safe idempotent calls throughout the application.
 *
 * @returns {void}
 * @public
 *
 * @example
 * // Called during application initialization
 * assembleTerrains()
 * // Now TerrainMaps.currentTerrainMaps() returns seaAndLand by default
 *
 * @example
 * // Safe to call multiple times
 * assembleTerrains()
 * assembleTerrains()  // No-op, already assembled
 * assembleTerrains()  // No-op, already assembled
 *
 * @remarks
 * - Idempotent: Safe to call multiple times without side effects
 * - Registers terrains in order: seaAndLand, then spaceAndAsteroids
 * - After first call, TerrainMaps.numTerrains will be 2
 * - Uses TerrainMaps.currentTerrainMaps() to register each configuration
 * - No return value; modifies global TerrainMaps state
 *
 * @see _ensureTerrainsAssembled for automatic initialization
 * @see gameMaps for accessing current terrain maps
 */
export function assembleTerrains () {
  if (TerrainMaps.numTerrains > 1) return

  TerrainMaps.currentTerrainMaps(DEFAULT_TERRAIN_MAPS.seaAndLand)
  TerrainMaps.currentTerrainMaps(DEFAULT_TERRAIN_MAPS.spaceAndAsteroids)
}

/**
 * Ensures that terrain maps are assembled and available.
 *
 * Private helper that guarantees terrains are initialized before operations
 * that depend on them. Calls assembleTerrains() if not already done.
 * Used internally to implement lazy initialization patterns.
 *
 * @returns {void}
 * @private
 *
 * @remarks
 * - Idempotent: Safe to call multiple times
 * - Used as initialization guard in other private helpers
 * - Delegates to assembleTerrains() for actual registration
 * - No return value; modifies global TerrainMaps state
 */
function _ensureTerrainsAssembled () {
  assembleTerrains()
}

/**
 * Gets the current terrain maps configuration, ensuring terrains are assembled first.
 *
 * Private helper that retrieves the currently active TerrainMaps configuration
 * after ensuring the terrain registry has been initialized. Implements lazy
 * initialization to guarantee terrains are available on first access.
 *
 * @returns {TerrainMapsType}
 *   The current terrain maps configuration (e.g., seaAndLand or spaceAndAsteroids).
 *   Never returns null; falls back to default if unset.
 * @private
 *
 * @remarks
 * - Initializes terrains if not already done
 * - Always returns a valid TerrainMaps instance
 * - Used internally by gameMaps() and gameMap()
 * - Guarantees consistent state for subsequent operations
 */
function _getCurrentTerrainMaps () {
  _ensureTerrainsAssembled()
  return TerrainMaps.currentTerrainMaps()
}

/**
 * Sets default terrain maps if none are currently set.
 *
 * Private helper that ensures a default TerrainMaps configuration is active.
 * If the provided currentMaps is null, registers and returns the seaAndLand
 * default. Otherwise returns the provided maps unchanged.
 *
 * Used as a fallback mechanism to guarantee valid terrain maps are always active.
 *
 * @param {TerrainMapsType|null} currentMaps
 *   The current terrain maps configuration, possibly null if none is set.
 *   If null, replaced with seaAndLand default.
 * @returns {TerrainMapsType}
 *   Either the input currentMaps if not null, or the seaAndLand default.
 *   Always returns a valid (non-null) TerrainMaps instance.
 * @private
 *
 * @remarks
 * - Fallback mechanism to prevent null terrain maps
 * - Only registers default if currentMaps is explicitly null
 * - Safe to call with non-null values (returns input unchanged)
 * - Used at end of gameMaps() to ensure valid return value
 *
 * @example
 * // With null input
 * const maps = _ensureDefaultMaps(null)
 * // Returns: seaAndLand maps, and sets them as current
 *
 * @example
 * // With existing maps
 * const current = TerrainMaps.currentTerrainMaps()
 * const maps = _ensureDefaultMaps(current)
 * // Returns: current unchanged
 */
function _ensureDefaultMaps (currentMaps) {
  if (currentMaps === null) {
    TerrainMaps.currentTerrainMaps(DEFAULT_TERRAIN_MAPS.seaAndLand)
    return TerrainMaps.currentTerrainMaps()
  }
  return currentMaps
}

/**
 * Gets or sets the current terrain maps configuration.
 *
 * Accessor function for managing which terrain maps are currently active.
 * Supports both getter and setter patterns via optional parameter:
 * - Called with no argument: returns the current terrain maps
 * - Called with maps argument: sets the provided maps as current and returns it
 *
 * Ensures terrain initialization on first call and provides a default fallback
 * to guarantee valid terrain maps are always active.
 *
 * This is the main entry point for accessing and switching between terrain
 * configurations (e.g., switching from Sea/Land to Space/Asteroids).
 *
 * @param {TerrainMapsType} [maps]
 *   Optional terrain maps configuration to set as current.
 *   If provided, these maps become the active configuration.
 *   If omitted, the current configuration is returned.
 * @returns {TerrainMapsType}
 *   The current terrain maps configuration (after any setter operation).
 *   Always returns a valid (non-null) TerrainMaps instance.
 * @public
 *
 * @example
 * // Get current terrain maps
 * const current = gameMaps()
 * // Returns seaAndLand by default
 *
 * @example
 * // Switch to space terrain maps
 * gameMaps(spaceAndAsteroidsMaps)
 * // Now gameMaps() returns spaceAndAsteroidsMaps
 *
 * @example
 * // Toggle between terrains
 * const current = gameMaps()
 * const next = current === seaAndLandMaps ? spaceAndAsteroidsMaps : seaAndLandMaps
 * gameMaps(next)
 *
 * @remarks
 * - Initializes terrains lazily on first call
 * - Supports both getter (no args) and setter (with args) patterns
 * - Returns new value if setter, current value if getter
 * - Guarantees default terrain maps if none explicitly set
 * - Safe to call repeatedly; no side effects for getter
 * - Modifies global TerrainMaps state when used as setter
 *
 * @see assembleTerrains for terrain initialization
 * @see gameMap for accessing the current map within terrain maps
 */
export function gameMaps (maps) {
  const currentMaps = _getCurrentTerrainMaps()

  if (maps) {
    TerrainMaps.currentTerrainMaps(maps)
    return TerrainMaps.currentTerrainMaps()
  }

  return _ensureDefaultMaps(currentMaps)
}

/**
 * Gets or sets the current map within the current terrain maps.
 *
 * Accessor function for managing which specific map is currently active
 * within the active terrain configuration. Supports both getter and setter
 * patterns via optional parameter:
 * - Called with no argument: returns the current map
 * - Called with map argument: sets the provided map as current and returns it
 *
 * Operates on the current terrain maps (from gameMaps()), ensuring terrain
 * initialization first. Typically used after switching terrain configurations
 * to select a specific map within that configuration.
 *
 * @param {TerrainMapType} [map]
 *   Optional map to set as current within the active terrain maps.
 *   If provided, this map becomes the active map.
 *   If omitted, the current map is returned.
 * @returns {TerrainMapType}
 *   The current map (after any setter operation).
 *   Map from the active terrain maps configuration.
 * @public
 *
 * @example
 * // Get current map
 * const current = gameMap()
 * // Returns the active map from active terrain maps
 *
 * @example
 * // Switch to a specific map
 * gameMap(mapConfiguration)
 * // Now gameMap() returns mapConfiguration
 *
 * @example
 * // Usage flow: switch terrain, then select map
 * gameMaps(spaceAndAsteroidsMaps)     // Switch to space terrain
 * gameMap(spaceMapConfig)             // Select specific space map
 *
 * @remarks
 * - Works with current terrain maps from gameMaps()
 * - Initializes terrains lazily on first call
 * - Supports both getter and setter patterns
 * - Returns new value if setter, current value if getter
 * - Safe to call repeatedly for getter operations
 * - Modifies terrain maps state when used as setter
 * - Map must be valid for current terrain configuration
 *
 * @see gameMaps for accessing terrain maps and switching configurations
 * @see assembleTerrains for terrain initialization
 */
export function gameMap (map) {
  const terrainMaps = _getCurrentTerrainMaps()

  if (map) {
    terrainMaps.setToMap(map)
  }

  return terrainMaps.current
}
