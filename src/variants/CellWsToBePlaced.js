import { Cell3sToBePlaced } from './Cell3sToBePlaced.js'
import { makeKey } from '../core/utilities.js'

/**
 * @typedef {import('./CellsToBePlaced.js').ZoneInfo} ZoneInfo
 * @typedef {any} Weapon
 * @typedef {Object} WeaponCellMap
 * @property {Weapon} [key] - Weapon mapped by cell coordinate key.
 */

/**
 * Represents weapon cells to be placed on the grid.
 * Extends Cell3sToBePlaced to associate weapons with specific cell positions
 * using a coordinate-keyed mapping system.
 */
export class CellWsToBePlaced extends Cell3sToBePlaced {
  /**
   * The variant index identifying which weapon variant this represents.
   * @type {number}
   */
  variant

  /**
   * Map of weapons indexed by cell coordinate key.
   * Keys are created from cell coordinates using makeKey utility.
   * @type {WeaponCellMap}
   */
  weapons

  /**
   * Creates weapon cells to be placed.
   * Extracts special cells from subgroups and creates weapon-to-cell mappings
   * using coordinate keys for efficient lookup.
   * @param {any} placeable3 - The placeable3 instance with board and subgroups.
   * @param {number} x - The x (column) position for embedding.
   * @param {number} y - The y (row) position for embedding.
   * @param {Weapon[]} weapons - Array of weapons to associate with cells.
   * @param {number} variant - The variant index for tracking which variant this is.
   */
  constructor (placeable3, x, y, weapons, variant) {
    super(placeable3, x, y)
    this.variant = variant
    const special = this.subGroups[1].cells
    this.weapons = special.reduce((acc, [r, c], i) => {
      acc[makeKey(r, c)] = weapons[i]
      return acc
    }, {})
  }

  /**
   * Checks if a position is in a matching zone for weapon placement.
   * Validates the position against zone requirements inherited from parent class.
   * @param {number} r - The row coordinate.
   * @param {number} c - The column coordinate.
   * @returns {boolean} True if the position is in a valid zone for this weapon variant.
   */
  isInMatchingZone (r, c) {
    const zoneInfo = this.zoneInfo(r, c)
    return this.validator(zoneInfo)
  }

  /**
   * Checks if any cell is positioned in an invalid zone.
   * Iterates through all placed cells and validates their zone compliance.
   * Note: Uses coordinate order [c, r] from cells array iteration.
   * @returns {boolean} True if any cell is in a zone that fails validation.
   */
  isWrongZone () {
    const result = this.cells.some(([r, c]) => {
      return this.isInMatchingZone(r, c) === false
    })
    return result
  }
}
