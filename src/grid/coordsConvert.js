// ==================== BIT ENCODING/DECODING ====================

const ONE = 1n

/**
 * Convert a bit index to a BigInt bit flag
 * @private
 * @param {number} bitIndex - Position of the bit (0-based)
 * @returns {bigint} BigInt with single bit set at bitIndex position
 */
function _createBitFlag (bitIndex) {
  return ONE << BigInt(bitIndex)
}

/**
 * Decode a linear bit index into 2D grid coordinates
 * @private
 * @param {number} bitIndex - Linear index from bit position
 * @param {number} width - Grid width
 * @returns {{x: number, y: number}} Decoded x,y coordinates
 */
function _decodeBitIndexToCoords (bitIndex, width) {
  return {
    x: bitIndex % width,
    y: Math.trunc(bitIndex / width)
  }
}

/**
 * Iterate over all set bits in occupancy mask and collect results
 * @private
 * @param {bigint} occupancyBits - Bit pattern where set bits represent occupied cells
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @param {Function} valueResolver - Function to determine value for each set bit
 *                                    Signature: (x, y, bitIndex) => value
 * @returns {Array<[number, number, *]>} Array of [x, y, value] tuples
 */
function _collectBitsAsCoords (occupancyBits, width, height, valueResolver) {
  const result = []
  const totalCells = width * height

  for (let bitIndex = 0; bitIndex < totalCells; bitIndex++) {
    if (occupancyBits & _createBitFlag(bitIndex)) {
      const { x, y } = _decodeBitIndexToCoords(bitIndex, width)
      const value = valueResolver(x, y, bitIndex)
      result.push([x, y, value])
    }
  }

  return result
}

// ==================== COORDINATE CONVERSIONS ====================

/**
 * Convert list of coordinates to BigInt occupancy representation
 * Each coordinate's position becomes a set bit in the result
 * @param {Array<[number, number]>} coordinateList - Array of [x, y] coordinate pairs
 * @param {number} width - Grid width (used to calculate linear index)
 * @returns {bigint} Occupancy pattern where each set bit represents a coordinate
 */
export function coordsToOccBig (coordinateList, width) {
  let occupancyBits = 0n
  for (const [x, y] of coordinateList) {
    const linearIndex = y * width + x
    occupancyBits |= _createBitFlag(linearIndex)
  }
  return occupancyBits
}

/**
 * Convert BigInt occupancy mask to coordinate list with constant value
 * @param {bigint} occupancyBits - Bit pattern where set bits represent occupied cells
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @param {*} constantValue - Value to assign to all occupied cells
 * @returns {Array<[number, number, *]>} Array of [x, y, value] tuples
 */
function occBigToCoords (occupancyBits, width, height, constantValue) {
  return _collectBitsAsCoords(occupancyBits, width, height, () => constantValue)
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
