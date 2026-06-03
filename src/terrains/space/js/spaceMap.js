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
 * All maps use the spaceAndAsteroids terrain system with lavender space and beige
 * asteroid zones. Weapons are automatically merged from standardShot and space catalogue.
 *
 * @module terrains/space/spaceMap
 * @requires BhMap from terrains/all/js/map.js
 * @requires spaceAndAsteroids from ./space.js
 * @requires spaceWeaponsCatalogue from ./spaceWeapons.js
 * @requires standardShot from weapon/Weapon.js
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
 * console.log(battleMap.weapons)   // Array with standardShot + all space weapons
 *
 * @since 1.0.0
 */

/**
 * @typedef {[number, number]} GridSize
 * Two-dimensional grid dimensions in [rows, columns] format.
 *
 * Specifies the battle map grid dimensions in a fixed 2-element array.
 * Valid dimensions depend on terrain constraints:
 * - Minimum: [3, 3] (requires space for ship placement)
 * - Recommended: [12, 12] to [24, 24]
 * - Maximum: Limited by browser memory and UI rendering
 *
 * @example
 * const small = [10, 10]   // 10x10 grid (100 cells)
 * const medium = [20, 20]  // 20x20 grid (400 cells)
 * const large = [24, 32]   // 24x32 grid (768 cells)
 */

/**
 * @typedef {Object<string, number>} ShipCountMap
 * Map of ship type codes to number of ships of that type.
 *
 * Maps single-letter ship type codes (from spaceGroups) to the count of
 * units of that type to be placed on the map during battle setup.
 * Each key is a single uppercase letter representing a ship type category,
 * each value is a non-negative integer count.
 *
 * Standard ship type codes in Space and Asteroids:
 * - 'S': Space vessels (destroyers, cruisers, battleships - large combat ships)
 * - 'A': Shuttles (small mobile units, flexible placement, escorts)
 * - 'G': Ground installations (stationary on asteroids, defensive)
 * - 'M': Hybrid installations (mixed terrain mobile units)
 * - 'T': Transformer units (multiple forms, special rules)
 * - 'X': Special units (custom rules, experimental)
 * - 'W': Weapons (mines, offensive systems, area control)
 *
 * Note: Only defined types for the current terrain are valid keys.
 * Undefined type codes are silently ignored during placement.
 *
 * @example
 * {
 *   S: 3,    // 3 space vessels
 *   A: 2,    // 2 shuttles
 *   G: 1,    // 1 installation
 *   M: 0,    // 0 hybrids (can omit zero values)
 *   T: 1     // 1 transformer
 * }
 *
 * @example
 * {
 *   S: 5     // Only space vessels, no other types
 * }
 */

/**
 * @typedef {number|ShipCountMap} ShipCountConfig
 * Ship placement configuration as either total count or breakdown by type.
 *
 * Flexible configuration allowing both simple and detailed ship placement specifications:
 * - **number**: Total number of ships (all types combined, auto-distributed by terrain)
 * - **ShipCountMap**: Detailed breakdown by ship type code for precise control
 *
 * The terrain's ship placement system will distribute ships according to the specification.
 * If a number is provided, the distribution among ship types is handled by terrain logic.
 * If a ShipCountMap is provided, exact counts are used for each specified type.
 *
 * Performance: Both forms result in O(n) placement where n = total ships.
 *
 * @example
 * // Simple total count (auto-distributed):
 * 10                              // 10 total ships, distributed by terrain
 *
 * @example
 * // Detailed breakdown (precise control):
 * { S: 3, A: 2, G: 1 }           // Exactly: 3 vessels, 2 shuttles, 1 installation
 *
 * @example
 * // Mixed specification:
 * { S: 2, A: 4, G: 0 }           // Vessels and shuttles, no installations
 */

/**
 * @typedef {Array<Array<number>>} AsteroidLayout
 * Asteroid zone layout specification for terrain placement.
 *
 * Two-dimensional array representation of asteroid field distribution.
 * Each sub-array represents a row index that contains asteroid zones.
 * Within each row's array, numbers indicate column indices with asteroids.
 * Empty rows are implicitly all space (no asteroids).
 *
 * Format details:
 * - Outer array: Each element represents a row with asteroid zones
 * - Inner arrays: Column indices where asteroids appear in that row
 * - Array length can vary (represents different row densities)
 * - Empty inner arrays indicate rows with only space terrain
 * - Indices outside grid bounds are ignored by placement logic
 *
 * The resulting grid has:
 * - Lavender space terrain in non-asteroid areas
 * - Beige asteroid terrain in asteroid zones
 * - Grid integrity preserved across all coordinates
 *
 * Performance: O(a) where a = total asteroid zones to place
 *
 * @example
 * // Sparse asteroids
 * [
 *   [5, 6, 7],           // Row 5: Asteroids in columns 5, 6, 7
 *   [12, 13, 14],        // Row 12: Asteroids in columns 12, 13, 14
 *   []                    // All other rows: Space terrain only
 * ]
 *
 * @example
 * // Dense asteroid field
 * [
 *   [0, 1, 2, 3, 4, 5],  // Top rows: Heavy asteroid coverage
 *   [1, 2, 3, 4, 5, 6],
 *   [2, 3, 4, 5, 6, 7]
 * ]
 *
 * @example
 * // No asteroids (open space)
 * []                                    // All space terrain
 */

/**
 * @typedef {Object} MapConfig
 * Complete configuration for a space terrain battle map.
 *
 * Encapsulates all parameters needed to create a configured battle map.
 * These parameters define the map's physical layout, entity placement rules,
 * and identification for the battle system.
 *
 * @property {string} title - Display title shown in menus, UI, and battle summary
 *   Format: Human-readable string (e.g., 'Asteroid Field', 'Outer Rim Station')
 *   Used for: Menu selection, battle identification, player communication
 * @property {GridSize} size - Map dimensions in [rows, cols] format
 *   Format: Two-element array of positive integers
 *   Used for: Grid initialization, coordinate validation, rendering bounds
 * @property {ShipCountConfig} shipNum - Ship placement configuration
 *   Format: Either total count (number) or breakdown by type (object)
 *   Used for: Fleet setup, entity placement during initialization
 * @property {AsteroidLayout} landArea - Asteroid terrain layout specification
 *   Format: Array of arrays with column indices
 *   Used for: Terrain generation, collision detection, movement constraints
 * @property {string} name - Internal identifier for map lookup and persistence
 *   Format: Machine-readable slug (e.g., 'asteroidField', 'openSpace')
 *   Used for: Configuration storage, save files, programmatic reference
 *
 * @example
 * {
 *   title: 'Asteroid Field Combat',
 *   size: [20, 20],
 *   shipNum: { S: 3, A: 2 },
 *   landArea: [[5, 6, 7], [12, 13, 14]],
 *   name: 'asteroidField'
 * }
 *
 * @example
 * {
 *   title: 'Open Space',
 *   size: [16, 24],
 *   shipNum: 8,
 *   landArea: [],
 *   name: 'openSpace'
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
 * Implementation details:
 * - Initializes BhMap with spaceAndAsteroids terrain
 * - Merges standardShot with spaceWeaponsCatalogue.allWeapons
 * - Result is ready for player/enemy setup without further configuration
 *
 * Performance: O(w) where w = number of weapons to merge (typically < 20)
 * Memory: Shallow copies weapons array to avoid external mutation
 *
 * @function spaceMap
 * @access public
 * @param {string} title - Display title for the map
 *   Requirements: Non-empty string, preferably < 50 chars
 *   Examples: 'Asteroid Field', 'Outer Rim Station', 'Debris Field'
 * @param {GridSize} size - Grid dimensions as [rows, columns]
 *   Requirements: [rows >= 3, cols >= 3] for valid ship placement
 *   Typical: [12, 12] to [24, 24]
 * @param {ShipCountConfig} shipNum - Ship count or type distribution for placement
 *   - Number: Total ships (e.g., 10) - distributed by terrain logic
 *   - Object: Breakdown by type (e.g., {S: 3, A: 2, G: 1}) - exact placement
 *   Requirements: Non-negative integers
 * @param {AsteroidLayout} landArea - Asteroid terrain placement rows
 *   Format: Array of row indices containing asteroid zones
 *   Example: [[5, 6, 7], [12, 13, 14]] for asteroids at those grid positions
 *   Special: Empty array [] for open space (no asteroids)
 *   Requirements: Valid indices within [0, size[0])
 * @param {string} name - Internal identifier for map
 *   Requirements: Unique, machine-readable (no spaces)
 *   Format: camelCase or snake_case recommended
 *   Examples: 'asteroidField', 'asteroid_field', 'field1'
 *
 * @returns {BhMap} Fully configured space terrain battle map
 *   Properties set:
 *   - title: Display name
 *   - terrain: spaceAndAsteroids configuration
 *   - size: Grid dimensions
 *   - weapons: Array with [standardShot, ...spaceWeapons]
 *   - shipNum: Placement configuration
 *   - landArea: Asteroid terrain zones
 *   - name: Map identifier
 *   Status: Ready for immediate use
 *
 * @throws {Error} (indirect) BhMap constructor may throw on invalid terrain
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
 * // Verify map configuration
 * console.log(asteroidField.title)        // 'Asteroid Field'
 * console.log(asteroidField.terrain.tag)  // 'spaceAndAsteroids'
 * console.log(asteroidField.weapons.length) // >= 2 (standard + space)
 * console.log(asteroidField.weapons[0].tag) // 'Standard Shot' (standardShot first)
 *
 * @example
 * // Create open space map with simple ship count
 * const openSpace = spaceMap(
 *   'Open Space Combat',
 *   [16, 24],
 *   8,
 *   [],  // No asteroids - all space terrain
 *   'openSpace'
 * )
 *
 * // Use map for battle initialization
 * console.log(openSpace.title)      // 'Open Space Combat'
 * console.log(openSpace.size)       // [16, 24]
 * console.log(openSpace.landArea.length) // 0 (open space)
 *
 * @see spaceAndAsteroids - Terrain configuration for this map type
 * @see spaceWeaponsCatalogue - Source of space-specific weapons
 * @see BhMap - Parent class providing complete map functionality
 * @see standardShot - Base weapon included in all space maps
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
