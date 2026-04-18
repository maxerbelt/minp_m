import { standardShot } from '../../../weapon/Weapon.js'
import { BhMap } from '../../all/js/map.js'
import { seaAndLand } from './seaAndLand.js'
import { Megabomb } from './SeaWeapons.js'

export function seaMap (title, size, shipNum, landArea, name) {
  const seaMap = new BhMap(title, size, shipNum, landArea, name, seaAndLand)
  seaMap.weapons = [standardShot, new Megabomb(3)]
  return seaMap
}
