import { CellsToBePlaced } from './CellsToBePlaced.js'

/**
 * Represents 3D cells to be placed with subgroups.
 */
export class Cell3sToBePlaced extends CellsToBePlaced {
  /**
   * Creates 3D cells to be placed.
   * @param {any} placeable3 - The placeable3 instance.
   * @param {number} r - The row.
   * @param {number} c - The column.
   */
  constructor (placeable3, r, c) {
    super(
      placeable3.board,
      r,
      c,
      placeable3.validator,
      placeable3.zoneDetail,
      placeable3.target
    )
    this.subGroups = placeable3.subGroups.map(g => g.placeAt(r, c))
  }

  /**
   * Checks if a position is in matching zone for subgroups.
   * @param {number} r - The row.
   * @param {number} c - The column.
   * @returns {boolean} True if in matching zone.
   */
  isInMatchingZone (r, c) {
    const zoneInfo = this.zoneInfo(r, c, 2)
    const result = this.subGroups.some(
      g => g.isCandidate(c, r) && g.validator(zoneInfo)
    )
    return result
  }

  /**
   * Checks if any cell is in wrong zone and sets notGood mask.
   * @returns {boolean} True if wrong zone.
   */
  isWrongZone () {
    const cells = [...this.board.occupiedLocations()]
    const result = cells.some(([c, r]) => {
      return this.isInMatchingZone(r, c) === false
    })
    for (const [c, r] of cells) {
      const match = this.isInMatchingZone(r, c) ? 1 : 0
      this.notGood.set(c, r, match)
    }
    return result
  }
}
