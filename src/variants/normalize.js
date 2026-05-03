/**
 * @typedef {[number, number]} Cell2D
 * @typedef {[number, number, number]} Cell3D
 */

/**
 * Gets the minimum row value from cells.
 * @param {Cell2D[]} cells - The cells.
 * @returns {number} The minimum row.
 */
function minR (cells) {
  return Math.min(...cells.map(s => s[0]))
}

/**
 * Gets the minimum column value from cells.
 * @param {Cell2D[]} cells - The cells.
 * @returns {number} The minimum column.
 */
function minC (cells) {
  return Math.min(...cells.map(s => s[1]))
}

/**
 * Normalizes 2D cells by translating to origin.
 * @param {Cell2D[]} cells - The cells to normalize.
 * @param {number} [mr] - Optional minimum row offset.
 * @param {number} [mc] - Optional minimum column offset.
 * @returns {Cell2D[]} The normalized cells.
 */
function normalize (cells, mr, mc) {
  const r0 = mr || minR(cells)
  const c0 = mc || minC(cells)
  return cells.map(([r, c]) => [r - r0, c - c0])
}

/**
 * Checks if two arrays are ordered and equal.
 * @param {any[]} arr1 - First array.
 * @param {any[]} arr2 - Second array.
 * @returns {boolean} True if equal.
 */
export const areArraysOrderedAndEqual = (arr1, arr2) => {
  if (arr1.length !== arr2.length) {
    return false
  }
  return arr1.every((element, index) => element === arr2[index])
}

/**
 * Checks if two arrays are unordered and equal.
 * @param {any[]} arr1 - First array.
 * @param {any[]} arr2 - Second array.
 * @returns {boolean} True if equal.
 */
const areArraysUnorderedEqual = (arr1, arr2) => {
  if (arr1.length !== arr2.length) {
    return false
  }
  const sortedArr1 = [...arr1].sort()
  const sortedArr2 = [...arr2].sort()
  return sortedArr1.every((element, index) =>
    areArraysOrderedAndEqual(element, sortedArr2[index])
  )
}

/**
 * Flips cells vertically or horizontally based on which changes them.
 * @param {Cell2D[]} cells - The cells to flip.
 * @param {number} [mr] - Optional minimum row offset.
 * @param {number} [mc] - Optional minimum column offset.
 * @returns {Cell2D[]} The flipped cells.
 */
export function flip (cells, mr, mc) {
  const flipped = flipV(cells, mr, mc)
  return areArraysUnorderedEqual(flipped, cells)
    ? flipH(cells, mr, mc)
    : flipped
}

/**
 * Flips cells vertically.
 * @param {Cell2D[]} cells - The cells to flip.
 * @param {number} [mr] - Optional minimum row offset.
 * @param {number} [mc] - Optional minimum column offset.
 * @returns {Cell2D[]} The flipped cells.
 */
function flipV (cells, mr, mc) {
  return normalize(
    cells.map(([r, c]) => [-r, c]),
    mr,
    mc
  )
}

/**
 * Flips cells horizontally.
 * @param {Cell2D[]} cells - The cells to flip.
 * @param {number} [mr] - Optional minimum row offset.
 * @param {number} [mc] - Optional minimum column offset.
 * @returns {Cell2D[]} The flipped cells.
 */
function flipH (cells, mr, mc) {
  return normalize(
    cells.map(([r, c]) => [r, -c]),
    mr,
    mc
  )
}
