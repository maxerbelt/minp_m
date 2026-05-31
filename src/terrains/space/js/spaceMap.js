import { standardShot } from '../../../weapon/Weapon.js'
import { BhMap } from '../../all/js/map.js'
import { spaceAndAsteroids } from './space.js'
import { spaceWeaponsCatalogue } from './spaceWeapons.js'

/**
 * Space and asteroid terrain map factory and configuration.
 *
 * Provides factory function for creating configured battle maps for the Space and Asteroids
 * terrain. Maps are pre-configured with:
 * - Space and asteroid terrain configuration
 * - Complete weapon catalogue (standard shots + space weapons)
 * - Grid dimensions and ship placement constraints
 * - Asteroid/terrain zone layout
 *
 * Maps created by this module are ready for immediate use in space combat scenarios.
 *
 * @module terrains/space/spaceMap
 * @requires BhMap
 * @requires spaceAndAsteroids
 * @requires spaceWeaponsCatalogue
 * @requires standardShot
 *
 * @example
 * import { spaceMap } from './spaceMap.js'
 * const battleMap = spaceMap(
 *   'Asteroid Field',
 *   [20, 20],
 *   { S: 3, A: 2 },
 *   [[5, 6, 7], [12, 13, 14]],
 *   'asteroidField'
 * )
 * console.log(battleMap.title)     // 'Asteroid Field'
 * console.log(battleMap.weapons)   // Array of all available weapons
 */

/**
 * @typedef {[number, number]} GridSize
 * Two-dimensional grid dimensions in [rows, columns] format.
 *
 * @example
 * const size = [20, 20]  // 20 rows, 20 columns
 * const size = [16, 24]  // 16 rows, 24 columns
 */

/**
 * @typedef {Object<string, number>} ShipCountMap
 * Map of ship type codes to number of ships of that type.
 *
 * Maps single-letter ship type codes (from spaceGroups) to the count of
 * units of that type to be placed on the map during battle setup.
 *
 * Example codes:
 * - 'S': Space vessels (destroyers, cruisers, etc.)
 * - 'A': Shuttles (mobile units, flexible placement)
 * - 'G': Ground installations (on asteroids)
 * - 'M': Hybrid installations (mixed terrain)
 * - 'T': Transformer units (multiple forms)
 * - 'X': Special units (custom rules)
 * - 'W': Weapons (mines, offensive systems)
 *
 * @example
 * {
 *   S: 3,    // 3 space vessels
 *   A: 2,    // 2 shuttles
 *   G: 1,    // 1 installation
 *   M: 0     // No hybrids
 * }
 */

/**
 * @typedef {number|ShipCountMap} ShipCountConfig
 * Ship placement configuration as either total count or breakdown by type.
 *
 * Can be specified as:
 * - **number**: Total number of ships (all types combined)
 * - **ShipCountMap**: Detailed breakdown by ship type code
 *
 * Using ShipCountMap provides finer control over unit distribution on the map.
 *
 * @example
 * 10                              // Total 10 ships (types auto-distributed)
 * { S: 3, A: 2, G: 1 }           // Specific distribution by type
 */

/**
 * @typedef {Array<Array<number>>} AsteroidLayout
 * Asteroid zone layout specification for terrain placement.
 *
 * Two-dimensional array where each sub-array represents a row of asteroid zones.
 * Values indicate which columns contain asteroid (beige) terrain in that row.
 * Empty rows indicate rows with only space (lavender) terrain.
 *
 * Used to generate the terrain map with appropriate zone distribution.
 *
 * @example
 * [
 *   [5, 6, 7],           // Row 5: Asteroids in columns 5, 6, 7
 *   [12, 13, 14],        // Row 12: Asteroids in columns 12, 13, 14
 *   []                    // Other rows: All space terrain
 * ]
 */

/**
 * @typedef {Object} MapConfig
 * Complete configuration for a space terrain battle map.
 *
 * Encapsulates all parameters needed to create a configured battle map.
 *
 * @property {string} title - Display title shown in menus and UI
 * @property {GridSize} size - Map dimensions in [rows, cols] format
 * @property {ShipCountConfig} shipNum - Ship placement configuration
 * @property {AsteroidLayout} landArea - Asteroid terrain layout
 * @property {string} name - Internal identifier for map lookup
 *
 * @example
 * {
 *   title: 'Asteroid Field Combat',
 *   size: [20, 20],
 *   shipNum: { S: 3, A: 2 },
 *   landArea: [[5, 6, 7], [12, 13, 14]],
 *   name: 'asteroidField'
 * }
 */

/**
 * Creates a configured space terrain battle map.
 *
 * Factory function that initializes a battle map with:
 * - Space and asteroids terrain configuration
 * - Complete weapon arsenal (standard shots + space-specific weapons)
 * - Grid dimensions and placement constraints
 * - Asteroid/terrain zone layout
 *
 * The returned map is fully configured and ready for use in space combat scenarios.
 * All weapons from the space catalogue are automatically loaded and attached.
 *
 * @function spaceMap
 * @param {string} title - Display title for the map (e.g., 'Asteroid Field')
 * @param {GridSize} size - Grid dimensions as [rows, columns] (e.g., [20, 20])
 * @param {ShipCountConfig} shipNum - Ship count or type distribution for placement
 *   - Number: Total ships (e.g., 10)
 *   - Object: Breakdown by type (e.g., {S: 3, A: 2, G: 1})
 * @param {AsteroidLayout} landArea - Asteroid terrain placement rows
 *   - Array of row indices containing asteroid zones
 *   - Example: [[5, 6, 7], [12, 13, 14]]
 * @param {string} name - Internal identifier for map (e.g., 'asteroidField')
 *
 * @returns {BhMap} Fully configured space terrain battle map with:
 *   - Space and asteroids terrain configuration
 *   - Complete weapon catalogue attached
 *   - Grid dimensions and constraints set
 *   - Ready for immediate use in combat
 *
 * @example
 * import { spaceMap } from './spaceMap.js'
 *
 * // Create asteroid field map with mixed units
 * const asteroidField = spaceMap(
 *   'Asteroid Field',
 *   [20, 20],
 *   { S: 3, A: 2, G: 1 },
 *   [[5, 6, 7], [12, 13, 14]],
 *   'asteroidField'
 * )
 *
 * // Use map in battle setup
 * console.log(asteroidField.title)        // 'Asteroid Field'
 * console.log(asteroidField.terrain.name) // 'Space and Asteroids'
 * console.log(asteroidField.weapons.length) // Weapon count
 *
 * @example
 * // Create open space map with simple ship count
 * const openSpace = spaceMap(
 *   'Open Space Combat',
 *   [16, 24],
 *   8,
 *   [],  // No asteroids
 *   'openSpace'
 * )
 *
 * @see spaceAndAsteroids - Terrain configuration
 * @see spaceWeaponsCatalogue - Weapon definitions
 * @see BhMap - Parent class providing map functionality
 */
export function spaceMap (title, size, shipNum, landArea, name) {
  // Initialize base map with space and asteroids terrain configuration
  const spaceMap = new BhMap(
    title,
    size,
    shipNum,
    landArea,
    name,
    spaceAndAsteroids
  )

  // Attach complete weapon arsenal: standard shots + all space-specific weapons
  // standardShot provides basic weapon, space weapons add specialized options
  spaceMap.weapons = [standardShot, ...spaceWeaponsCatalogue.allWeapons]

  return spaceMap
}
