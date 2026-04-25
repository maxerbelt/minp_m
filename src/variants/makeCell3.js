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
 * Default placing target with placeholder functions.
 */
export const placingTarget = {
  boundsChecker: Function.prototype,
  allBoundsChecker: Function.prototype,
  getZone: () => []
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
