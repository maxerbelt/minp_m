import { TerrainMaps } from '../../all/js/TerrainMaps.js'
import { spaceAndAsteroids } from './space.js'
import { spaceMapList, defaultSpaceMap } from './spaceMaps.js'
import { spaceShipsCatalogue } from './spaceShips.js'
import { spaceWeaponsCatalogue } from './spaceWeapons.js'

// Assign late-initialized catalogues to the terrain (may be populated later)
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
    // Cast catalogues to any for the TerrainMaps constructor to avoid
    // structural typing mismatches between terrain-specific catalogues
    // and the more strict TerrainShipCatalogue typedef used by TerrainMaps.
    super(
      spaceAndAsteroids,
      spaceMapList,
      defaultSpaceMap,
      [
        ['|', 'DestroyOne'],
        ['+', 'Bomb'],
        ['^', 'DestroyOne']
      ],
      /** @type {any} */ (spaceShipsCatalogue),
      /** @type {any} */ (spaceWeaponsCatalogue)
    )
    this.allShipsAndWeaponsMap = this.createAllShipsAndWeaponsMap(
      spaceMapList,
      /** @type {any} */ (spaceShipsCatalogue),
      /** @type {any} */ (spaceWeaponsCatalogue)
    )
  }
}
export const spaceAndAsteroidsMaps = new SpaceAndAsteroidsMaps()
