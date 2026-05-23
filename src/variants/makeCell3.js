/**
 * Checks if a position is in the cells array.
 * @param {number} r - The row.
 * @param {number} c - The column.
 * @param {Array<Array<number>>} cells - The cells array.
 * @returns {boolean} True if in cells.
 */
function isIn (r, c, cells) {
  return cells.some(([rr, cc]) => rr === r && cc === c)
}

/**
 * Finds the subgroup index for a position.
 * @param {number} r - The row.
 * @param {number} c - The column.
 * @param {Array<Array<Array<number>>>} subGroups - The subgroups.
 * @returns {number} The subgroup index.
 */
export function subGroupIndex (r, c, subGroups) {
  let idx = 1
  for (const subGroup of subGroups) {
    if (isIn(r, c, subGroup)) return idx
    idx++
  }
  return 0
}

/**
 * Zone information for a specific position on the board.
 * @typedef {Object} ZoneInfo
 * @property {*} [detail] - Zone detail information
 */

/**
 * Target placement area with bounds checking and zone information.
 * @typedef {Object} PlacementTarget
 * @property {(r: number, c: number) => boolean} boundsChecker
 *   Validates if a single cell position is within bounds.
 * @property {(r: number, c: number, h?: number, w?: number) => boolean} allBoundsChecker
 *   Checks if an area (height × width) starting at (r, c) is within bounds.
 * @property {(r: number, c: number, zoneDetail?: number) => ZoneInfo} getZone
 *   Gets zone information for a position with optional detail level.
 */

/**
 * Default placing target with placeholder functions.
 * This is a default implementation that considers all positions invalid.
 * Should be replaced with an actual target in CellsToBePlaced constructor.
 * @type {PlacementTarget}
 */
export const placingTarget = {
  boundsChecker: (_r, _c) => false,
  allBoundsChecker: (_r, _c, _h, _w) => false,
  /**
   * @param {number} _r - The row coordinate (unused in placeholder).
   * @param {number} _c - The column coordinate (unused in placeholder).
   * @param {number} [_zoneDetail] - The zone detail level (unused in placeholder).
   * @returns {ZoneInfo} Empty zone info object.
   */
  getZone: (_r, _c, _zoneDetail) => ({})
}

/**
 * Dispatches a cell to the appropriate subgroup.
 * @param {Array<number>} cell - The cell [r, c, z].
 * @param {Array<Array<Array<number>>>} subGroupCells - The subgroup cells.
 */
export function dispatchCell3 (cell, subGroupCells) {
  const [r, c, z] = cell
  subGroupCells[z].push([r, c])
}
