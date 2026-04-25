import { TerrainMaps } from './TerrainMaps.js'
import { seaAndLandMaps } from '../../sea/js/seaAndLandMaps.js'
import { spaceAndAsteroidsMaps } from '../../space/js/spaceAndAsteroidsMaps.js'

/**
 * Assembles and registers all available terrain map configurations.
 * Ensures that sea and land, and space and asteroids terrains are loaded.
 * Only runs once to avoid duplicate registrations.
 */
export function assembleTerrains () {
  if (TerrainMaps.numTerrains > 1) return
  TerrainMaps.currentTerrainMaps(seaAndLandMaps)
  TerrainMaps.currentTerrainMaps(spaceAndAsteroidsMaps)
}

/**
 * Gets or sets the current terrain maps configuration.
 * @param {Object} [maps] - Optional terrain maps to set as current
 * @returns {Object} The current terrain maps configuration
 */
export function gameMaps (maps) {
  assembleTerrains()
  if (maps) {
    TerrainMaps.currentTerrainMaps(maps)
  }
  if (TerrainMaps.currentTerrainMaps() === null) {
    TerrainMaps.currentTerrainMaps(seaAndLandMaps)
  }
  return TerrainMaps.currentTerrainMaps()
}

/**
 * Gets or sets the current map within the current terrain maps.
 * @param {Object} [map] - Optional map to set as current
 * @returns {Object} The current map
 */
export function gameMap (map) {
  assembleTerrains()
  if (map) {
    gameMaps().setToMap(map)
  }
  return gameMaps().current
}
