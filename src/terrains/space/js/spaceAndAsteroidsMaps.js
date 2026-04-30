import { TerrainMaps } from '../../all/js/TerrainMaps.js'
import { spaceAndAsteroids } from './space.js'
import { spaceMapList, defaultSpaceMap } from './spaceMaps.js'
import { spaceShipsCatalogue } from './spaceShips.js'
import { spaceWeaponsCatalogue } from './spaceWeapons.js'

spaceAndAsteroids.ships = spaceShipsCatalogue
spaceAndAsteroids.weapons = spaceWeaponsCatalogue

/**
 * Space and asteroids terrain maps manager.
 * Handles map generation, ship/weapon placement, and terrain-specific rules for space combat.
 */
class SpaceAndAsteroidsMaps extends TerrainMaps {
  /**
   * Creates a new space and asteroids maps instance.
   */
  constructor () {
    super(
      spaceAndAsteroids,
      spaceMapList,
      defaultSpaceMap,
      [
        ['|', 'DestroyOne'],
        ['+', 'Bomb'],
        ['^', 'DestroyOne']
      ],
      spaceShipsCatalogue,
      spaceWeaponsCatalogue
    )
    this.allShipsAndWeaponsMap = this.createAllShipsAndWeaponsMap(
      spaceMapList,
      spaceShipsCatalogue,
      spaceWeaponsCatalogue
    )
  }
}
export const spaceAndAsteroidsMaps = new SpaceAndAsteroidsMaps()
