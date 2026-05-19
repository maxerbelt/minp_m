import { standardShot } from '../../../weapon/Weapon.js'
import { BhMap } from '../../all/js/map.js'
import { spaceAndAsteroids } from './space.js'
import { spaceWeaponsCatalogue } from './spaceWeapons.js'

/**
 * Creates a space terrain battle map.
 * @param {string} title - Display title for the map.
 * @param {[number, number]} size - Grid dimensions in [rows, cols] format.
 * @param {number|Object<string, number>} shipNum - Number of ships or ship-count map.
 * @param {Array<Array<number>>} landArea - Land/asteroid placement rows for the scenario.
 * @param {string} name - Internal name identifier for the map.
 * @returns {BhMap} Configured space terrain map.
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
  spaceMap.weapons = [standardShot, ...spaceWeaponsCatalogue.getAllWeapons()]
  return spaceMap
}
