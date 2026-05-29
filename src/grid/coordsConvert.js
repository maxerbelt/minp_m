// ==================== BIT ENCODING/DECODING ====================
import { BigOne } from './bitStore/helpers/bigbits.js'

/**
 * Coordinate conversion utilities for grid representations.
 * Supports conversions between:
 * - Bit indices and 2D coordinates
 * - Coordinate lists and BigInt occupancy masks
 * - Coordinate lists and 2D grid arrays
 *
 * @module grid/coordsConvert
 *
 * @typedef {[number, number]} Coordinate
 * A [x, y] coordinate pair where x is column, y is row
 *
 * @typedef {[number, number, number]} CoordinateWithValue
 * A [x, y, value] coordinate tuple with associated cell value
 *
 * @typedef {Array<Coordinate>} CoordinateList
 * Array of coordinate pairs
 *
 * @typedef {Array<CoordinateWithValue>} CoordinateValueList
 * Array of coordinate pairs with values
 *
 * @typedef {Array<Array<number>>} Grid2D
 * 2D array [height][width] representing a grid
 */

/**
 * Decode a linear bit index into 2D grid coordinates.
 * Converts sequential bit position to (x, y) using row-major layout.
 * Formula: x = bitIndex % width, y = bitIndex / width
 *
 * @private
 * @param {number} bitIndex - Linear index from bit position (0-based)
 * @param {number} width - Grid width in cells
 * @returns {Object} Object with x and y coordinates
 * @returns {number} returns.x - Column coordinate
 * @returns {number} returns.y - Row coordinate (top-to-bottom)
 */
function _decodeBitIndexToCoords (bitIndex, width) {
  return {
    x: bitIndex % width,
    y: Math.trunc(bitIndex / width)
  }
}

/**
 * Iterate over all set bits in occupancy mask and collect results.
 * For each set bit, decodes coordinates and calls valueResolver to compute value.
 * Accumulates results as [x, y, value] tuples.
 *
 * @private
 * @param {bigint} occupancyBits - Bit pattern where set bits represent occupied cells
 * @param {number} width - Grid width in cells
 * @param {number} height - Grid height in cells
 * @param {(x: number, y: number, bitIndex: number) => *} valueResolver - Function to compute value for each set bit
 *        Takes (x, y, bitIndex) and returns computed value
 * @returns {Array<[number, number, *]>} Array of [x, y, value] tuples for all set bits
 */
function _collectBitsAsCoords (occupancyBits, width, height, valueResolver) {
  const result = []
  const totalCells = width * height

  for (let bitIndex = 0; bitIndex < totalCells; bitIndex++) {
    if (occupancyBits & BigOne.bitMaskByPos(bitIndex)) {
      const { x, y } = _decodeBitIndexToCoords(bitIndex, width)
      const value = valueResolver(x, y, bitIndex)
      result.push([x, y, value])
    }
  }

  return result
}

// ==================== COORDINATE CONVERSIONS ====================

/**
 * Convert list of coordinates to BigInt occupancy representation.
 * Each coordinate's position becomes a set bit in the result.
 * Uses row-major layout: bitIndex = y * width + x
 *
 * @public
 * @param {CoordinateList} coordinateList - Array of [x, y] coordinate pairs
 * @param {number} width - Grid width in cells (used to calculate linear index)
 * @returns {bigint} Occupancy pattern where each set bit represents a coordinate
 * @example
 * const coords = [[0, 0], [2, 1], [3, 3]];
 * const occupancy = coordsToOccBig(coords, 4); // 4-wide grid
 */
export function coordsToOccBig (coordinateList, width) {
  let occupancyBits = 0n
  for (const [x, y] of coordinateList) {
    const linearIndex = y * width + x
    occupancyBits |= BigOne.bitMaskByPos(linearIndex)
  }
  return occupancyBits
}

/**
 * Convert BigInt occupancy mask to coordinate list with computed values
 * Uses a function to compute the value for each occupied cell
 * @param {bigint} occupancyBits - Bit pattern where set bits represent occupied cells
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @param {Function} colorResolver - Function to compute value for each cell
 *                                    Signature: (x, y, bitIndex) => value
 *                                    Return value is masked to 2 bits (& 3)
 * @returns {Array<[number, number, number]>} Array of [x, y, color] tuples
 */
export function occBigToCoordsWithFn (
  occupancyBits,
  width,
  height,
  colorResolver
) {
  return _collectBitsAsCoords(
    occupancyBits,
    width,
    height,
    (x, y, bitIndex) => colorResolver(x, y, bitIndex) & 3
  )
}

// ==================== GRID CONVERSIONS ====================

/**
 * Convert coordinate list to 2D grid array
 * Grid initialized with 0; coordinate values placed at their positions
 * @param {Array<[number, number, *]>} coordinateList - Array of [x, y, value] tuples
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @returns {Array<Array<*>>} 2D array [height][width] with values placed at coordinates
 */
export function coordsToGrid (coordinateList, width, height) {
  const grid = Array.from({ length: height }, () => new Array(width).fill(0))
  for (const [x, y, cellValue] of coordinateList) {
    grid[y][x] = cellValue
  }
  return grid
}

/**
 * Convert 2D grid array to coordinate list
 * Only includes non-zero cells; zero cells are excluded
 * @param {Array<Array<*>>} grid - 2D array [height][width]
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @returns {Array<[number, number, *]>} Array of [x, y, value] tuples for non-zero cells
 */
export function gridToCoords (grid, width, height) {
  const result = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cellValue = grid[y][x]
      if (cellValue) {
        result.push([x, y, cellValue])
      }
    }
  }
  return result
}
