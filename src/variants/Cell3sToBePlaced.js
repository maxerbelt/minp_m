import { CellsToBePlaced } from './CellsToBePlaced.js'

/**
 * @typedef {import('./Placeable.js').Placeable} PlaceableType
 * @typedef {import('./placingTarget.js').ZoneInfo} ZoneInfo
 * @typedef {import('./placingTarget.js').PlacementTarget} PlacementTarget
 * @typedef {import('../grid/MaskBase.js').MaskBase} MaskBase
 */

/**
 * Subgroup placement cell for 3D placement validation.
 * Represents a subgroup of cells with placement and validation methods.
 * Each subgroup validates placement constraints for a specific placement area.
 *
 * @typedef {Object} SubGroupPlaced
 * @property {Array<[number, number]>} [cells] - Optional array of cell coordinates [row, column]
 * @property {(x: number, y: number) => boolean} isCandidate - Checks if position is a candidate cell
 * @property {(zoneInfo: ZoneInfo) => boolean} validator - Validates zone constraints for the position
 */

/**
 * 3D placeable configuration with board, validator, zone detail, target, and subgroups.
 * Contains all information needed for 3D cell placement with subgroup support.
 * The board parameter must be compatible with Board interface (see CellsToBePlaced.js).
 *
 * @typedef {Object} Placeable3Type
 * @property {any} board - The board to embed cells into (Board-compatible object)
 *   Expected to have: embed(x, y), emptyMask, at(x, y, depth?), occupiedLocations(),
 *   occupiedLocationsAndValues(), toCoords, toMask(w, h), copyToMask(m), flatDilate(),
 *   width, height, occupancy
 * @property {(zoneInfo: ZoneInfo) => boolean} validator - Zone validation function
 * @property {number} zoneDetail - Zone detail level for validation queries (0=none, 1=subterrain, 2=zone)
 * @property {PlacementTarget} target - Placement target with bounds checking and zone info
 * @property {Array<{placeAt:(r:number,c:number)=>SubGroupPlaced}>} subGroups - Array of subgroup factories
 *   Each factory returns a SubGroupPlaced with isCandidate and validator methods
 */

/**
 * Represents 3D cells to be placed with subgroup validation support.
 * Extends CellsToBePlaced with additional subgroup management for multi-part placement constraints.
 * Uses subgroups to validate that cells are placed in matching zones across multiple placement areas.
 *
 * @class Cell3sToBePlaced
 * @extends CellsToBePlaced
 */
export class Cell3sToBePlaced extends CellsToBePlaced {
  /**
   * Array of placed subgroups with candidate checking and zone validation.
   * Each subgroup represents a related placement area that must satisfy zone constraints.
   *
   * @type {Array<SubGroupPlaced>}
   */
  subGroups

  /**
   * Creates 3D cells to be placed with subgroup support.
   * Initializes parent CellsToBePlaced instance and creates subgroup instances
   * for the given row and column position.
   *
   * @param {Placeable3Type} placeable3 - The 3D placeable configuration containing board,
   *   validator, zone detail level, target, and subgroup factories
   * @param {number} x - The x-coordinate for embedding cells (0-based index)
   * @param {number} y - The y-coordinate for embedding cells (0-based index)
   * @throws {Error} If placeable3 lacks required properties or subGroups are invalid
   */
  constructor (placeable3, x, y) {
    // @ts-ignore - placeable3.board is Board-compatible at runtime
    super(
      placeable3.board,
      x,
      y,
      placeable3.validator,
      placeable3.zoneDetail,
      placeable3.target
    )
    this.subGroups = placeable3.subGroups.map(g => g.placeAt(x, y))
  }

  /**
   * Checks if a position is in a matching zone for all subgroups.
   * A position is considered in a matching zone if all subgroups report it as
   * a candidate cell AND their zone validators approve the zone information at that position.
   *
   * @param {number} x - The column coordinate to check (0-based index)
   * @param {number} y - The row coordinate to check (0-based index)
   * @returns {boolean} True if position is a candidate in all subgroups AND passes validation,
   *   false otherwise
   * @public
   */
  isInMatchingZone (x, y) {
    const zoneInfo = this.zoneInfo(x, y, 2)
    const result = this.subGroups.some(
      // @ts-ignore - SubGroupPlaced guarantees isCandidate and validator exist
      g => g.isCandidate(x, y) && g.validator(zoneInfo)
    )
    return result
  }

  /**
   * Validates that all occupied cells are in matching zones for subgroups.
   * Identifies cells that are in wrong zones and marks them in the notGood mask.
   * A cell is considered in a wrong zone if it does not satisfy any subgroup placement constraint.
   *
   * The notGood mask is updated with:
   * - 1 for cells in matching zone (passes subgroup validation)
   * - 0 for cells in wrong zone (fails subgroup validation)
   *
   * @returns {boolean} True if any cell is found to be in a wrong zone,
   *   false if all cells pass subgroup validation
   * @public
   */
  isWrongZone () {
    const cells = [...this.board.occupiedLocations()]
    const result = cells.some(([x, y]) => {
      return this.isInMatchingZone(x, y) === false
    })
    for (const [x, y] of cells) {
      const match = this.isInMatchingZone(x, y) ? 1 : 0
      // @ts-expect-error - notGood is typed as Board in parent but runtime type is MaskBase with set() method
      this.notGood.set(x, y, match)
    }
    return result
  }
}
