/**
 * Zone information for a specific position on the board.
 * @typedef {Object} ZoneInfo
 * @property {*} [detail] - Zone detail information
 */

/**
 * Target placement area with bounds checking and zone information.
 * @typedef {Object} PlacementTarget
 * @property {(y: number, x: number) => boolean} boundsChecker
 *   Validates if a single cell position is within bounds.
 * @property {(y: number, x: number, h?: number, w?: number) => boolean} allBoundsChecker
 *   Checks if an area (height × width) starting at (y, x) is within bounds.
 * @property {(x: number, y: number, zoneDetail?: number) => ZoneInfo} getZone
 *   Gets zone information for a position with optional detail level.
 */

/**
 * Default placing target with placeholder functions.
 * This is a default implementation that considers all positions invalid.
 * Should be replaced with an actual target in CellsToBePlaced constructor.
 * @type {PlacementTarget}
 */
export const placingTarget = {
  boundsChecker: (_y, _x) => false,
  allBoundsChecker: (_y, _x, _h, _w) => false,
  /**
   * @param {number} _y - The row coordinate (unused in placeholder).
   * @param {number} _x - The column coordinate (unused in placeholder).
   * @param {number} [_zoneDetail] - The zone detail level (unused in placeholder).
   * @returns {ZoneInfo} Empty zone info object.
   */
  getZone: (_x, _y, _zoneDetail) => ({})
}
