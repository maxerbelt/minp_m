import { TerrainMaps } from './TerrainMaps.js'
import { seaAndLandMaps } from '../sea/seaAndLandMaps.js'
import { spaceAndAsteroidsMaps } from '../space/spaceAndAsteroidsMaps.js'

export function assembleTerrains () {
  if (TerrainMaps.numTerrains > 1) return
  TerrainMaps.currentTerrainMaps(seaAndLandMaps)
  TerrainMaps.currentTerrainMaps(spaceAndAsteroidsMaps)
}

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

export function gameMap (map) {
  assembleTerrains()
  if (map) {
    gameMaps().setToMap(map)
  }
  return gameMaps().current
}
