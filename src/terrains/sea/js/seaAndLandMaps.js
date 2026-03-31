import { seaAndLand } from './seaAndLand.js'
import { defaultMap, seaMapList } from './SeaMaps.js'
import { TerrainMaps } from '../../all/js/TerrainMaps.js'
import { seaShipsCatalogue } from './SeaShips.js'
import { seaWeaponsCatalogue } from './SeaWeapons.js'

seaAndLand.ships = seaShipsCatalogue
seaAndLand.weapons = seaWeaponsCatalogue

const allSeaShipsAndWeapons = seaMapList
  .at(-1)
  .clone('All Sea Ships and Weapons')
allSeaShipsAndWeapons.shipNum = seaShipsCatalogue.baseShapes.reduce(
  (acc, shape) => {
    acc[shape.letter] = 1
    return acc
  },
  {}
)
allSeaShipsAndWeapons.name = 'All Sea Ships and Weapons Map'
allSeaShipsAndWeapons.weapons = [
  seaWeaponsCatalogue.defaultWeapon,
  ...seaWeaponsCatalogue.weapons
]
class SeaAndLandMaps extends TerrainMaps {
  constructor () {
    super(seaAndLand, seaMapList, defaultMap, [
      ['K', 'DestroyOne'],
      ['F', 'Bomb'],
      ['M', 'Bomb'],
      ['+', 'DestroyOne'],
      ['W', 'Scan']
    ])
  }
}
export const seaAndLandMaps = new SeaAndLandMaps()
seaAndLandMaps.allShipsAndWeaponsMap = allSeaShipsAndWeapons
