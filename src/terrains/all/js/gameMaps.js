import { TerrainMaps } from './TerrainMaps.js'
import { seaAndLandMaps } from '../../sea/js/seaAndLandMaps.js'
import { spaceAndAsteroidsMaps } from '../../space/js/spaceAndAsteroidsMaps.js'

/**
 * Default terrain map configurations available in the system.
 * @type {Object<string, Object>}
 */
const DEFAULT_TERRAIN_MAPS = {
  seaAndLand: seaAndLandMaps,
  spaceAndAsteroids: spaceAndAsteroidsMaps
}

/**
 * Assembles and registers all available terrain map configurations.
 * Ensures that sea and land, and space and asteroids terrains are loaded.
 * Only runs once to avoid duplicate registrations.
 */
export function assembleTerrains () {
  if (TerrainMaps.numTerrains > 1) return

  TerrainMaps.currentTerrainMaps(DEFAULT_TERRAIN_MAPS.seaAndLand)
  TerrainMaps.currentTerrainMaps(DEFAULT_TERRAIN_MAPS.spaceAndAsteroids)
}

/**
 * Ensures that terrain maps are assembled and available.
 * @private
 */
function _ensureTerrainsAssembled () {
  assembleTerrains()
}

/**
 * Gets the current terrain maps configuration, ensuring terrains are assembled first.
 * @private
 * @returns {Object} The current terrain maps configuration
 */
function _getCurrentTerrainMaps () {
  _ensureTerrainsAssembled()
  return TerrainMaps.currentTerrainMaps()
}

/**
 * Sets default terrain maps if none are currently set.
 * @private
 * @param {Object} currentMaps - The current terrain maps configuration
 * @returns {Object} The terrain maps configuration (current or default)
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
 * @param {Object} [maps] - Optional terrain maps to set as current
 * @returns {Object} The current terrain maps configuration
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
 * @param {Object} [map] - Optional map to set as current
 * @returns {Object} The current map
 */
export function gameMap (map) {
  const terrainMaps = _getCurrentTerrainMaps()

  if (map) {
    terrainMaps.setToMap(map)
  }

  return terrainMaps.current
}
