import { Cell3sToBePlaced } from './Cell3sToBePlaced.js'
import { Placeable } from './Placeable.js'

/**
 * @typedef {import('./Placeable.js').Placeable} PlaceableType
 * Represents a single placeable unit with board configuration and validation.
 */

/**
 * @typedef {import('./CellsToBePlaced.js').PlacementTarget} PlacementTarget
 * Specifies the target location and validation for cell placement operations.
 */

/**
 * @typedef {(zoneInfo: any) => boolean} PlacementValidator
 * Validation function that accepts zone information and returns placement validity.
 * @param {any} zoneInfo - Zone-specific configuration or state information
 * @returns {boolean} True if placement is valid, false otherwise
 */

/**
 * Represents a placeable with multiple subgroups (layers).
 *
 * Extends the base {@link Placeable} class to support hierarchical placement
 * with a standard group and multiple special groups for complex layered objects.
 * Useful for multi-layer structures such as fortifications or compound objects
 * that require coordinated placement across multiple visual or functional layers.
 *
 * @extends Placeable
 * @example
 * const full = new Placeable(board, validator, zoneDetail, target)
 * const subGroups = [mainLayer, specialLayer1, specialLayer2]
 * const placeable3 = new Placeable3(full, subGroups)
 * const placement = placeable3.placeAt(5, 10)
 *
 * @see {@link Cell3sToBePlaced} for placement result structure
 * @see {@link Placeable} for base class functionality
 */
export class Placeable3 extends Placeable {
  /**
   * Array of all subgroups (layers) including standard and special groups.
   * Contains both the primary structure and any additional specialized layers.
   * Organized with the standard group at index 0 and special groups at indices 1+.
   *
   * @type {PlaceableType[]}
   * @public
   */
  subGroups

  /**
   * The standard (primary) subgroup, typically the main structure.
   * Represents the foundational or central element of the placeable,
   * extracted from the first element of the subGroups array during construction.
   *
   * @type {PlaceableType|undefined}
   * @public
   */
  standardGroup

  /**
   * Array of special (secondary) subgroups for additional structures.
   * Contains all subgroups beyond the standard group, enabling support
   * for auxiliary or overlay layers that enhance the primary structure.
   *
   * @type {PlaceableType[]}
   * @public
   */
  specialGroups

  /**
   * Creates a placeable3 instance with hierarchical subgroups.
   *
   * Decomposes the subGroups array into a standard group (first element)
   * and special groups (remaining elements) for organized layer management.
   * The standard group acts as the primary structure while special groups
   * provide additional functional or visual layers.
   *
   * @param {PlaceableType} full - The full placeable with board and validation configuration.
   *                               Must contain board, validator, zoneDetail, and target properties.
   * @param {PlaceableType[]} [subGroups=[]] - Array of subgroups to organize into standard and special groups.
   *                                          First element becomes standardGroup, rest become specialGroups.
   *                                          Defaults to empty array if not provided.
   *
   * @throws {Error} If full parameter does not have required board property
   *
   * @example
   * const full = new Placeable(board, validator, zoneDetail, target)
   * const placeable3 = new Placeable3(full, [mainLayer, extraLayer])
   * // placeable3.standardGroup === mainLayer
   * // placeable3.specialGroups === [extraLayer]
   *
   * @public
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
   *
   * Returns a {@link Cell3sToBePlaced} instance containing the placement configuration
   * for the cells and all subgroups at the given coordinates. This method respects
   * the hierarchical structure defined during construction, including both the
   * standard group and all special groups.
   *
   * @param {number} x - The x (column) position for placement. Must be a non-negative integer
   *                     within the valid board dimensions.
   * @param {number} y - The y (row) position for placement. Must be a non-negative integer
   *                     within the valid board dimensions.
   *
   * @returns {Cell3sToBePlaced} The cells to be placed with subgroup information.
   *                             Contains references to the standard group, special groups,
   *                             and placement coordinates for execution.
   *
   * @throws {Error} If coordinates are outside valid board bounds
   *
   * @example
   * const placement = placeable3.placeAt(5, 10)
   * // placement.x === 5, placement.y === 10
   * // placement includes all subgroups
   *
   * @see {@link Cell3sToBePlaced} for the structure of returned placement
   * @public
   */
  placeAt (x, y) {
    return new Cell3sToBePlaced(this, x, y)
  }
}
