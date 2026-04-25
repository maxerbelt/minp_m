import { Cell3sToBePlaced } from './Cell3sToBePlaced.js'
import { Placeable } from './Placeable.js'

/**
 * Represents a placeable with multiple subgroups (layers).
 */
export class Placeable3 extends Placeable {
  /**
   * Creates a placeable3 instance.
   * @param {Placeable} full - The full placeable.
   * @param {Placeable[]} subGroups - The subgroups.
   */
  constructor (full, subGroups) {
    let board = full.board
    subGroups = subGroups || []
    const [head, ...tail] = subGroups

    super(board, full.validator, full.zoneDetail, full.target)

    this.subGroups = subGroups
    this.standardGroup = head
    this.specialGroups = tail
  }

  /**
   * Creates a placement at the specified position.
   * @param {number} r - The row position.
   * @param {number} c - The column position.
   * @returns {Cell3sToBePlaced} The cells to be placed.
   */
  placeAt (r, c) {
    return new Cell3sToBePlaced(this, r, c)
  }
}
