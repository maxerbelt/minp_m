import { Cell3sToBePlaced } from './Cell3sToBePlaced.js'
import { makeKey } from '../core/utilities.js'

/**
 * Represents weapon cells to be placed.
 */
export class CellWsToBePlaced extends Cell3sToBePlaced {
  /**
   * Creates weapon cells to be placed.
   * @param {any} placeable3 - The placeable3 instance.
   * @param {number} row - The row.
   * @param {number} col - The column.
   * @param {any} weapons - The weapons.
   * @param {number} variant - The variant index.
   */
  constructor (placeable3, row, col, weapons, variant) {
    super(placeable3, row, col)
    this.variant = variant
    const special = this.subGroups[1].cells
    this.weapons = special.reduce((acc, [r, c], i) => {
      acc[makeKey(r, c)] = weapons[i]
      return acc
    }, {})
  }

  /**
   * Checks if a position is in matching zone.
   * @param {number} r - The row.
   * @param {number} c - The column.
   * @returns {boolean} True if in matching zone.
   */
  isInMatchingZone (r, c) {
    const zoneInfo = this.zoneInfo(r, c)
    return this.validator(zoneInfo)
  }

  /**
   * Checks if any cell is in wrong zone.
   * @returns {boolean} True if wrong zone.
   */
  isWrongZone () {
    const result = this.cells.some(([r, c]) => {
      return this.isInMatchingZone(c, r) === false
    })
    return result
  }
}
