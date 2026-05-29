import { BigBits } from './bitStore/helpers/bigbits.js'

/**
 * @module grid/placeTools
 * @description Utility functions for shape placement on grids using bitmask-based algorithms.
 * Provides efficient shape-to-bitmask conversion, placement validation with forbidden/mandatory
 * cell constraints, and bit-counting operations optimized for BigInt values.
 * Uses row-major bit encoding for grid coordinates and bitwise operations for fast placement checks.
 */

/**
 * @typedef {[number, number]} GridCoordinate
 * @description A coordinate pair [x, y] where x is the column (0..gridWidth-1)
 * and y is the row (0..gridHeight-1).
 */

/**
 * @typedef {Iterable<GridCoordinate>} ShapeCoordinates
 * @description An iterable collection of [x, y] coordinate pairs defining the cells
 * occupied by a shape in a grid, relative to its origin point.
 */

/**
 * @typedef {Object} Placement
 * @description Represents a valid placement offset for a shape on a grid.
 * @property {number} x - Column offset (0..gridWidth-shapeWidth) for the placement anchor.
 * @property {number} y - Row offset (0..gridHeight-shapeHeight) for the placement anchor.
 */

/**
 * Converts a list of shape coordinates into a BigInt bitmask.
 *
 * Encodes grid coordinates into a single BigInt where each set bit represents
 * a cell occupied by the shape. Uses row-major indexing: bit position = y * width + x.
 * This format is compatible with bitmask-based placement validation.
 *
 * @param {ShapeCoordinates} shape - Iterable of [x, y] coordinate pairs defining shape cells.
 * Each coordinate is relative to the shape's origin (0, 0).
 * @param {number} width - Width of the grid in cells, used to calculate bit positions.
 * Must be positive. Typically matches the grid width where the shape will be placed.
 * @returns {bigint} The resulting bitmask with set bits for each shape coordinate.
 * Bit i is set if there is a shape cell at coordinate (i % width, Math.floor(i / width)).
 *
 * @example
 * // Create a bitmask for a 2x2 square at origin
 * const square = [[0, 0], [1, 0], [0, 1], [1, 1]];
 * const mask = shapeToMask(square, 10); // width=10
 * // Bits 0, 1, 10, 11 are set (positions of the four cells in row-major order)
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
 * Iterates over all possible offset positions within the grid and tests whether
 * the shape can be placed at each position without overlapping forbidden cells and
 * covering all mandatory cells. Uses bitwise AND operations for O(1) collision detection.
 *
 * Algorithm: For each candidate position (x, y), shift the shape mask to that position
 * and verify: (1) no overlap with forbidden cells, and (2) complete coverage of mandatory cells.
 * Time complexity is O(gridWidth * gridHeight) assuming shape fits.
 *
 * @param {bigint} shapeMask - Bitmask of the shape in its canonical origin.
 * Each set bit represents a cell occupied by the shape.
 * @param {number} shapeWidth - Width of the bounding box of the shape in cells.
 * Must be positive and less than or equal to gridWidth.
 * @param {number} shapeHeight - Height of the bounding box of the shape in cells.
 * Must be positive and less than or equal to gridHeight.
 * @param {number} gridWidth - Width of the target grid in cells. Must be positive.
 * @param {number} gridHeight - Height of the target grid in cells. Must be positive.
 * @param {bigint} forbiddenMask - Bitmask of disallowed cells on the grid.
 * Shape placement fails if any occupied cell overlaps a forbidden cell (bitwise AND != 0).
 * @param {bigint} mandatoryMask - Bitmask of required covered cells on the grid.
 * Shape placement fails if any mandatory cell is not covered by the shape.
 * @returns {Placement[]} Array of valid placements as {x, y} offsets.
 * Empty array if no valid placements exist.
 *
 * @example
 * // Find placements for a 2x2 ship on a 10x10 grid
 * // with a forbidden zone at bottom-right
 * const shipMask = 0b0011000011n; // rows 0 and 1, columns 0-1
 * const forbidden = 0xFFFFFFFFF0000000n; // bottom half forbidden
 * const mandatory = 0n; // no mandatory cells
 * const placements = findPlacementsBitmask(
 *   shipMask, 2, 2, 10, 10, forbidden, mandatory
 * );
 * // Returns [{x:0, y:0}, {x:1, y:0}, ..., {x:8, y:0}]
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
      const shifted = BigBits.shiftLeft(shapeMask, BigInt(y * gridWidth + x))

      if (shifted & forbiddenMask) continue
      if ((shifted & mandatoryMask) !== mandatoryMask) continue

      placements.push({ x, y })
    }
  }

  return placements
}

/**
 * Counts the number of set bits (population count) in a BigInt.
 *
 * Efficiently counts bit set using the Brian Kernighan + Hamming Weight method
 * adapted for 32-bit chunks. Processes the BigInt by shifting and masking 32-bit
 * sections since JavaScript bitwise operations are defined on 32-bit integers.
 *
 * Algorithm: Iteratively extract lower 32 bits, count with popcount32, then
 * shift right by 32 bits. Repeat until all bits are processed.
 * Time complexity is O(log n) where n is the number of bits.
 *
 * @param {bigint} n - BigInt value whose set bits will be counted.
 * Must be non-negative.
 * @returns {number} The total number of set bits in n.
 * Returns 0 for n = 0n.
 *
 * @example
 * const bits = 0b1111n; // four bits set
 * console.log(popcountBigInt(bits)); // 4
 *
 * @example
 * const bigValue = 0xFFFFFFFFFFFFFFFFn; // 64-bit value, all bits set
 * console.log(popcountBigInt(bigValue)); // 64
 */
export function popcountBigInt (n) {
  let count = 0
  while (n > 0n) {
    count += popcount32(Number(n & 0xffffffffn))
    n >>= 32n
  }
  return count
}

// The popcount algorithm processes the BigInt in 32-bit chunks because
// JavaScript bitwise operations work on 32-bit integers. This approach
// allows efficient counting of bits for arbitrarily large BigInt values
// while keeping each chunk within native JS numeric ranges.

/**
 * Counts bits in the lower 32-bit chunk of a number using Hamming weight.
 *
 * Implements the "bit twiddling hacks" popcount algorithm optimized for 32-bit values.
 * Uses a series of parallel bit counting operations to efficiently compute population count.
 *
 * Algorithm: Reduces adjacent bit pairs, then 4-bit groups, then 8-bit groups, etc.,
 * via bit shifting and masking operations. Final multiplication by 0x01010101 sums all
 * bytes, with the right shift extracting the result from the high byte.
 *
 * @param {number} x - 32-bit unsigned integer (0 to 0xFFFFFFFF).
 * @returns {number} The number of set bits in x (0 to 32).
 * @private
 *
 * @example
 * console.log(popcount32(0xFF)); // 8
 * console.log(popcount32(0xFFFFFFFF)); // 32
 */
function popcount32 (x) {
  x -= (x >>> 1) & 0x55555555
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333)
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
}
