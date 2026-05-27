import { Cell3sToBePlaced } from './Cell3sToBePlaced.js'
import { makeKey } from '../core/utilities.js'

/**
 * @typedef {import('./Cell3sToBePlaced.js').ZoneInfo} ZoneInfo
 * @typedef {import('./Cell3sToBePlaced.js').Placeable3Type} Placeable3Type
 * @typedef {import('./Cell3sToBePlaced.js').SubGroupPlaced} SubGroupPlaced
 */

/**
 * Generic weapon type - represents any weapon object.
 * Can be extended by consumers to more specific weapon types.
 * @typedef {Object} Weapon
 * @property {*} [key] - Weapons may have any properties as determined by the game rules
 */

/**
 * Coordinate-keyed mapping of weapons to cell positions.
 * Maps string keys (created from cell coordinates) to weapon objects.
 * Enables O(1) lookup of weapons by their grid position.
 * @typedef {Object.<string, Weapon>} WeaponCellMap
 */

/**
 * Represents weapon cells to be placed on the grid with weapon-to-cell associations.
 *
 * This class extends Cell3sToBePlaced to manage weapon placement by:
 * - Extracting special weapon cell positions from the second subgroup
 * - Maintaining a coordinate-keyed weapon mapping for efficient lookup
 * - Validating weapon placement zones using parent class validation methods
 * - Tracking variant information for different weapon placement strategies
 *
 * The weapon mapping uses coordinate keys for efficient O(1) access to find which
 * weapon is associated with a given cell position.
 *
 * @class CellWsToBePlaced
 * @extends Cell3sToBePlaced
 */
export class CellWsToBePlaced extends Cell3sToBePlaced {
  /**
   * The variant index identifying which weapon variant this represents.
   * Used to distinguish between different weapon placement variants in the game.
   * When null, variant tracking is disabled.
   *
   * @type {number | null}
   * @public
   */
  variant

  /**
   * Map of weapons indexed by coordinate key.
   * Keys are created from cell coordinates using the makeKey utility function.
   * Provides O(1) lookup of the weapon associated with a cell position.
   *
   * Format: Key = makeKey(row, column), Value = Weapon object
   *
   * @type {WeaponCellMap}
   * @public
   */
  weapons

  /**
   * Creates weapon cells to be placed with weapon-to-cell associations.
   *
   * Initializes the parent Cell3sToBePlaced class and creates a weapon-to-cell
   * mapping using coordinate keys from the second subgroup's cell positions.
   * Each weapon in the array is associated with the corresponding cell in the
   * second subgroup by array index.
   *
   * @param {Placeable3Type} placeable3 - The 3D placeable configuration
   *   - board: The board to embed cells into (Board-compatible object)
   *   - validator: Zone validation function (zoneInfo: ZoneInfo) => boolean
   *   - zoneDetail: Zone detail level for validation (0=none, 1=subterrain, 2=zone)
   *   - target: Placement target with bounds and zone info
   *   - subGroups: Array of subgroup factories; subGroups[1] must contain weapon cells
   * @param {number} x - The x-coordinate (column) position for embedding cells (0-based index)
   * @param {number} y - The y-coordinate (row) position for embedding cells (0-based index)
   * @param {Weapon[]} weapons - Array of weapons to associate with cells.
   *   Length MUST equal the number of cells in subGroups[1].cells.
   *   Index i maps to cell i in the second subgroup.
   * @param {number | null} variant - The variant index for tracking placement strategy.
   *   Pass null if variant tracking is not needed.
   *
   * @throws {Error} If subGroups[1] is missing or lacks cells property
   * @throws {Error} If weapons array length does not match special cells count
   *
   * @public
   */
  constructor (placeable3, x, y, weapons, variant) {
    super(placeable3, x, y)
    this.variant = variant
    const special = this.subGroups[1].cells
    if (!special) {
      throw new Error('Subgroup at index 1 must have cells property')
    }
    this.weapons = special.reduce((acc, [r, c], i) => {
      acc[makeKey(r, c)] = weapons[i]
      return acc
    }, /** @type {WeaponCellMap} */ ({}))
  }

  /**
   * Checks if a position is in a matching zone for weapon placement.
   *
   * Validates the position against zone requirements by:
   * 1. Getting the zone information at the position
   * 2. Passing it to the inherited validator function
   * 3. Returning the validation result
   *
   * A position is valid if the zone validator approves it for weapon placement.
   *
   * @param {number} x - The x-coordinate (column) to check (0-based index)
   * @param {number} y - The y-coordinate (row) to check (0-based index)
   *
   * @returns {boolean} True if the position is in a valid zone for this weapon variant,
   *   false if the position fails zone validation
   *
   * @public
   */
  isInMatchingZone (x, y) {
    const zoneInfo = this.zoneInfo(x, y)
    return this.validator(zoneInfo)
  }

  /**
   * Checks if any cell is positioned in an invalid zone.
   *
   * Validates all placed cells against zone requirements by:
   * 1. Iterating through this.cells (inherited from parent CellsToBePlaced)
   * 2. Checking each cell with isInMatchingZone()
   * 3. Returning true if any cell fails validation
   *
   * This is a simplified zone validation method that differs from the parent
   * Cell3sToBePlaced.isWrongZone() in that it does not update the notGood mask.
   *
   * @returns {boolean} True if any cell is in a zone that fails validation,
   *   false if all cells pass zone validation
   *
   * @public
   */
  isWrongZone () {
    const result = this.cells.some(([x, y]) => {
      return this.isInMatchingZone(x, y) === false
    })
    return result
  }
}
