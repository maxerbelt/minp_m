import { TerrainMaps } from '../../all/js/TerrainMaps.js'
import { spaceAndAsteroids } from './space.js'
import { spaceMapList, defaultSpaceMap } from './spaceMaps.js'
import { spaceShipsCatalogue } from './spaceShips.js'
import { spaceWeaponsCatalogue } from './spaceWeapons.js'

spaceAndAsteroids.ships = spaceShipsCatalogue
spaceAndAsteroids.weapons = spaceWeaponsCatalogue

class SpaceAndAsteroidsMaps extends TerrainMaps {
  constructor () {
    super(
      spaceAndAsteroids,
      spaceMapList,
      defaultSpaceMap,
      [
        ['|', 'DestroyOne'],
        ['+', 'Bomb']
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
