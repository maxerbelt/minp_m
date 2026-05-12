/**
   * Convert number of colors to bits per cell
   * @param {number} numOfColors - Number of colors (2, 4, 16, or 256)
   * @returns {number} Bits per cell
 
   */
export function numOfColorsToBitsPerCell (numOfColors) {
  for (const bits of SUPPORTED_BITS_PER_CELL_REV) {
    const maxColors = 1 << bits
    if (numOfColors <= maxColors) {
      return bits
    }
  }
  throw new Error(
    `Unsupported number of colors: ${numOfColors}. Supported numbers: ${SUPPORTED_DEPTHS.join(
      ', '
    )}`
  )
}

export function maxColorsToBitsPerCell (maxColors) {
  for (const bits of SUPPORTED_BITS_PER_CELL_REV) {
    const colors = 1 << bits
    if (maxColors === colors) {
      return bits
    }
  }
  throw new Error(
    `Unsupported number of colors: ${maxColors}. Supported numbers upto 256`
  )
}

const SUPPORTED_BITS_PER_CELL = [1, 2, 4, 8]
const SUPPORTED_DEPTHS = SUPPORTED_BITS_PER_CELL.map(bits => 1 << bits) // [2, 4, 16, 256]

const SUPPORTED_DEPTHS_REV = SUPPORTED_DEPTHS.slice().reverse()
const SUPPORTED_BITS_PER_CELL_REV = SUPPORTED_BITS_PER_CELL.slice().reverse()
