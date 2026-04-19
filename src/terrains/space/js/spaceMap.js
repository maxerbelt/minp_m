import { standardShot } from '../../../weapon/Weapon'
import { BhMap } from '../../all/js/map'
import { spaceAndAsteroids } from './space'

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
