import { Cell3sToBePlaced } from './Cell3sToBePlaced.js'
import { makeKey } from '../core/utilities.js'

/**
 * @typedef {import('./CellsToBePlaced.js').ZoneInfo} ZoneInfo
 * @typedef {any} Weapon
 *
 * @typedef {Object} SubGroupWithCells
 * @property {Array<[number, number]>} cells - Array of cell coordinates [row, column]
 * @property {(x: number, y: number) => boolean} [isCandidate] - Optional: Checks if position is a candidate cell
 * @property {(zoneInfo: ZoneInfo) => boolean} [validator] - Optional: Validates zone constraints
 *
 * @typedef {Object.<string, Weapon>} WeaponCellMap
 */

/**
 * Represents weapon cells to be placed on the grid with weapon associations.
 * Extends Cell3sToBePlaced to associate weapons with specific cell positions
 * using a coordinate-keyed mapping system. The second subgroup provides the cell
 * positions where weapons will be placed, and weapons are mapped to these positions
 * using coordinate keys for efficient lookup.
 *
 * @class CellWsToBePlaced
 * @extends Cell3sToBePlaced
 */
export class CellWsToBePlaced extends Cell3sToBePlaced {
  /**
   * The variant index identifying which weapon variant this represents.
   * Used to track and distinguish between different weapon placement variants.
   * Can be null if variant tracking is not required.
   * @type {number | null}
   */
  variant

  /**
   * Map of weapons indexed by cell coordinate key.
   * Keys are created from cell coordinates using makeKey utility.
   * Each weapon is associated with a specific cell position for lookup efficiency.
   * @type {WeaponCellMap}
   */
  weapons

  /**
   * Creates weapon cells to be placed with weapon-to-cell associations.
   * Initializes the parent Cell3sToBePlaced and extracts special cells from
   * the second subgroup. Creates a weapon-to-cell mapping using coordinate keys
   * for efficient lookup of weapons by position.
   *
   * @param {import('./Cell3sToBePlaced.js').Placeable3Type} placeable3 - The placeable3 instance
   *   with board, validator, zone detail, target, and subgroups. Must include at least
   *   two subgroups where the second contains the special weapon cell positions.
   * @param {number} x - The x-coordinate (column) position for embedding cells (0-based index)
   * @param {number} y - The y-coordinate (row) position for embedding cells (0-based index)
   * @param {Weapon[]} weapons - Array of weapons to associate with cells.
   *   Must have length equal to the number of cells in the second subgroup.
   * @param {number | null} variant - The variant index for tracking which variant this is.
   *   Can be null if variant tracking is not needed.
   * @throws {TypeError} If subGroups[1] is missing or lacks cells property
   * @throws {Error} If weapons array length doesn't match special cells count
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
   * Validates the position against zone requirements inherited from parent class.
   * A position is valid if it passes the zone info validation.
   *
   * @param {number} x - The x-coordinate (column) to check (0-based index)
   * @param {number} y - The y-coordinate (row) to check (0-based index)
   * @returns {boolean} True if the position is in a valid zone for this weapon variant,
   *   false otherwise
   * @public
   */
  isInMatchingZone (x, y) {
    const zoneInfo = this.zoneInfo(x, y)
    return this.validator(zoneInfo)
  }

  /**
   * Checks if any cell is positioned in an invalid zone.
   * Iterates through all placed cells and validates their zone compliance.
   * Returns true if any single cell fails zone validation.
   *
   * @returns {boolean} True if any cell is in a zone that fails validation,
   *   false if all cells pass validation
   * @public
   */
  isWrongZone () {
    const result = this.cells.some(([x, y]) => {
      return this.isInMatchingZone(x, y) === false
    })
    return result
  }
}
