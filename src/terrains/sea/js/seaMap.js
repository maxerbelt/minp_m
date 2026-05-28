import { standardShot } from '../../../weapon/Weapon.js'
import { BhMap } from '../../all/js/map.js'
import { seaAndLand } from './seaAndLand.js'
import { Megabomb } from './SeaWeapons.js'

/**
 * @typedef {import('../../../weapon/Weapon.js').Weapon} Weapon
 * Weapon instance that can be fired on a map with ammunition and targeting.
 */

/**
 * Creates a sea-themed game map with battleship gameplay.
 * Initializes a BhMap with sea/land terrain, standard shot weapon, and megabomb.
 * The megabomb has an area of effect radius of 3 cells.
 *
 * @param {string} title - Display title of the map shown to players
 * @param {number} size - Board dimensions (size × size grid)
 * @param {number} shipNum - Number of ships to place on the map
 * @param {Array<number>} landArea - Configuration for land area coverage and distribution
 * @param {string} name - Unique identifier/name for the map in the system
 *
 * @returns {BhMap} Configured sea map instance ready for gameplay with weapons array
 * containing standardShot and Megabomb(3) weapons
 *
 * @example
 * const battleMap = seaMap('Battle Zone', 10, 6, [2, 3, 4], 'zone-1')
 * // Returns a 10×10 map with 6 ships, configured with sea/land terrain and megabomb
 *
 * @see {@link BhMap} for map configuration and gameplay mechanics
 * @see {@link seaAndLand} for terrain generation configuration
 * @see {@link Megabomb} for weapon radius and explosion mechanics
 */
export function seaMap (title, size, shipNum, landArea, name) {
  const seaMap = new BhMap(title, size, shipNum, landArea, name, seaAndLand)
  seaMap.weapons = [standardShot, new Megabomb(3)]
  return seaMap
}
