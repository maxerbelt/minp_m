import { standardShot } from '../../../weapon/Weapon.js'
import { BhMap } from '../../all/js/map.js'
import { spaceAndAsteroids } from './space.js'

/**
 * Creates a space terrain battle map.
 * @param {string} title - Display title for the map
 * @param {number} size - Size of the map grid
 * @param {number} shipNum - Number of ships to place on the map
 * @param {number} landArea - Amount of land/asteroid area on the map
 * @param {string} name - Internal name identifier for the map
 * @returns {BhMap} Configured space terrain map
 */
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
