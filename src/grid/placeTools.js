/**
 * @typedef {[number, number]} GridCoordinate
 */

/**
 * @typedef {Iterable<GridCoordinate>} ShapeCoordinates
 */

/**
 * @typedef {Object} Placement
 * @property {number} x - Column offset for the placement.
 * @property {number} y - Row offset for the placement.
 */

/**
 * Converts a list of shape coordinates into a BigInt bitmask.
 * Coordinates are encoded in row-major order using the provided grid width.
 *
 * @param {ShapeCoordinates} shape - Iterable of [x, y] coordinate pairs.
 * @param {number} width - Width of the target grid used for bit indexing.
 * @returns {bigint} The resulting bitmask.
 */
export function shapeToMask (shape, width) {
  let mask = 0n
  for (const [x, y] of shape) {
    const bit = BigInt(y * width + x)
    mask |= 1n << bit
  }

  return mask
}

/**
 * Finds all valid placements for a shape on a grid using bitmask tests.
 *
 * @param {bigint} shapeMask - Bitmask of the shape in its canonical origin.
 * @param {number} shapeWidth - Width of the shape mask.
 * @param {number} shapeHeight - Height of the shape mask.
 * @param {number} gridWidth - Width of the target grid.
 * @param {number} gridHeight - Height of the target grid.
 * @param {bigint} forbiddenMask - Mask of disallowed cells on the grid.
 * @param {bigint} mandatoryMask - Mask of required covered cells on the grid.
 * @returns {Placement[]} Valid placement offsets for the shape.
 */
export function findPlacementsBitmask (
  shapeMask,
  shapeWidth,
  shapeHeight,
  gridWidth,
  gridHeight,
  forbiddenMask,
  mandatoryMask
) {
  const placements = []

  for (let y = 0; y <= gridHeight - shapeHeight; y++) {
    for (let x = 0; x <= gridWidth - shapeWidth; x++) {
      const shifted = shapeMask << BigInt(y * gridWidth + x)

      if (shifted & forbiddenMask) continue
      if ((shifted & mandatoryMask) !== mandatoryMask) continue

      placements.push({ x, y })
    }
  }

  return placements
}

/**
 * Counts the number of set bits in a BigInt.
 *
 * @param {bigint} n - BigInt value to count bits for.
 * @returns {number} Number of set bits.
 */
export function popcountBigInt (n) {
  let count = 0
  while (n > 0n) {
    count += popcount32(Number(n & 0xffffffffn))
    n >>= 32n
  }
  return count
}

/**
 * Counts bits in the lower 32-bit chunk of a number.
 *
 * @param {number} x - 32-bit unsigned integer.
 * @returns {number} Number of set bits.
 * @private
 */
function popcount32 (x) {
  x -= (x >>> 1) & 0x55555555
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333)
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
}
