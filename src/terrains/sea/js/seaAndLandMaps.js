import { seaAndLand } from './seaAndLand.js'
import { defaultMap, seaMapList } from './SeaMaps.js'
import { TerrainMaps } from '../../all/js/TerrainMaps.js'
import { seaShipsCatalogue } from './SeaShips.js'
import { seaWeaponsCatalogue } from './SeaWeapons.js'

seaAndLand.ships = seaShipsCatalogue
seaAndLand.weapons = seaWeaponsCatalogue

class SeaAndLandMaps extends TerrainMaps {
  constructor () {
    super(
      seaAndLand,
      seaMapList,
      defaultMap,
      [
        ['K', 'DestroyOne'],
        ['F', 'Bomb'],
        ['M', 'Bomb'],
        ['+', 'DestroyOne'],
        ['W', 'Scan']
      ],
      seaShipsCatalogue,
      seaWeaponsCatalogue
    )
    this.allShipsAndWeaponsMap = this.createAllShipsAndWeaponsMap(
      seaMapList,
      seaShipsCatalogue,
      seaWeaponsCatalogue
    )
  }
}
export const seaAndLandMaps = new SeaAndLandMaps()
