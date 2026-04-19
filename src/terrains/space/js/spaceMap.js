import { standardShot } from '../../../weapon/Weapon.js'
import { BhMap } from '../../all/js/map.js'
import { spaceAndAsteroids } from './space.js'

export function spaceMap (title, size, shipNum, landArea, name) {
  const spaceMap = new BhMap(
    title,
    size,
    shipNum,
    landArea,
    name,
    spaceAndAsteroids
  )
  spaceMap.weapons = [standardShot]
  return spaceMap
}
