import { TerrainMaps } from '../terrain/TerrainMaps.js'
import { spaceAndAsteroids } from './space.js'
import { spaceMapList, defaultSpaceMap } from './spaceMaps.js'
import { spaceShipsCatalogue } from './spaceShips.js'
import { spaceWeaponsCatalogue } from './spaceWeapons.js'

spaceAndAsteroids.ships = spaceShipsCatalogue
spaceAndAsteroids.weapons = spaceWeaponsCatalogue

const allSpaceShipsAndWeapons = spaceMapList
  .at(-1)
  .clone('All Space Ships and Weapons')
//allSpaceShipsAndWeapons.title = 'All Space Ships and Weapons'
allSpaceShipsAndWeapons.shipNum = spaceShipsCatalogue.baseShapes.reduce(
  (acc, shape) => {
    acc[shape.letter] = 1
    return acc
  },
  {}
)
allSpaceShipsAndWeapons.name = 'All Space Ships and Weapons Map'

class SpaceAndAsteroidsMaps extends TerrainMaps {
  constructor () {
    super(spaceAndAsteroids, spaceMapList, defaultSpaceMap, [
      ['|', 'DestroyOne'],
      ['+', 'Bomb']
    ])
  }
}

export const spaceAndAsteroidsMaps = new SpaceAndAsteroidsMaps()
spaceAndAsteroidsMaps.allShipsAndWeaponsMap = allSpaceShipsAndWeapons
