import { Cell3sToBePlaced } from './Cell3sToBePlaced.js'
import { Placeable } from './Placeable.js'

/**
 * @typedef {import('./Placeable.js').Placeable} PlaceableType
 * @typedef {import('./CellsToBePlaced.js').PlacementTarget} PlacementTarget
 * @typedef {(zoneInfo: any) => boolean} PlacementValidator
 */

/**
 * Represents a placeable with multiple subgroups (layers).
 * Extends the base Placeable class to support hierarchical placement
 * with a standard group and multiple special groups for complex layered objects.
 */
export class Placeable3 extends Placeable {
  /**
   * Array of all subgroups (layers) including standard and special groups.
   * @type {PlaceableType[]}
   */
  subGroups

  /**
   * The standard (primary) subgroup, typically the main structure.
   * @type {PlaceableType}
   */
  standardGroup

  /**
   * Array of special (secondary) subgroups for additional structures.
   * @type {PlaceableType[]}
   */
  specialGroups

  /**
   * Creates a placeable3 instance with hierarchical subgroups.
   * Decomposes the subGroups array into a standard group (first element)
   * and special groups (remaining elements) for organized layer management.
   * @param {PlaceableType} full - The full placeable with board and validation configuration.
   * @param {PlaceableType[]} [subGroups=[]] - Array of subgroups to organize into standard and special groups.
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
   * Returns a Cell3sToBePlaced instance containing the placement configuration
   * for the cells and all subgroups at the given coordinates.
   * @param {number} x - The x (column) position for placement.
   * @param {number} y - The y (row) position for placement.
   * @returns {Cell3sToBePlaced} The cells to be placed with subgroup information.
   */
  placeAt (x, y) {
    return new Cell3sToBePlaced(this, x, y)
  }
}
