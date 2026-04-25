const cache = new Map()

/**
 * Calculate linear index from row and column in triangular grid.
 * Row r contains 2*r+1 cells, so index = r² + c
 * @private
 * @param {number} row - Row index (0-based from apex)
 * @param {number} col - Column index within row
 * @returns {number} Linear cell index
 */
function triangularIndex (row, col) {
  return row * row + col
}

/**
 * Recover row and column from linear index in triangular grid.
 * @private
 * @param {number} index - Linear cell index
 * @returns {Array<number>} [row, col]
 */
function indexToRowCol (index) {
  const row = Math.floor(Math.sqrt(index))
  const col = index - row * row
  return [row, col]
}

/**
 * Create geometric transformation function: rotation around center.
 * @private
 * @param {number} angleRadians - Rotation angle in radians
 * @param {number} centerX - X coordinate of rotation center
 * @param {number} centerY - Y coordinate of rotation center
 * @returns {Function} Function that transforms [x, y] coordinates
 */
function createRotationTransform (angleRadians, centerX, centerY) {
  const cos = Math.cos(angleRadians)
  const sin = Math.sin(angleRadians)
  return (x, y) => {
    const dx = x - centerX
    const dy = y - centerY
    const rotatedX = dx * cos - dy * sin
    const rotatedY = dx * sin + dy * cos
    return [rotatedX + centerX, rotatedY + centerY]
  }
}

/**
 * Create geometric transformation function: reflection across vertical axis.
 * @private
 * @param {number} centerX - X coordinate of reflection axis
 * @returns {Function} Function that transforms [x, y] coordinates
 */
function createVerticalReflectionTransform (centerX) {
  return (x, y) => [2 * centerX - x, y]
}

/**
 * Compose two transformation functions.
 * @private
 * @param {Function} first - First transformation to apply
 * @param {Function} second - Second transformation to apply
 * @returns {Function} Composed transformation
 */
function composeTransforms (first, second) {
  return (x, y) => {
    const [x1, y1] = second(x, y)
    return first(x1, y1)
  }
}

/**
 * Find the nearest original cell to a transformed coordinate using Euclidean distance.
 * @private
 * @param {number} transformedX - Transformed X coordinate
 * @param {number} transformedY - Transformed Y coordinate
 * @param {Array<Object>} cells - Array of cell objects with {x, y, i} properties
 * @returns {number} Index of nearest cell
 */
function findNearestCell (transformedX, transformedY, cells) {
  let closestIndex = null
  let minDistance = Infinity

  for (const cell of cells) {
    const dx = cell.x - transformedX
    const dy = cell.y - transformedY
    const distanceSq = dx * dx + dy * dy

    if (distanceSq < minDistance) {
      minDistance = distanceSq
      closestIndex = cell.i
    }
  }

  return closestIndex
}

/**
 * Build D3 symmetry transformation maps for triangular grids.
 * Generates maps for: 3 rotations (120°, 240°, 360°) × 2 reflection states = 6 total.
 * Results are cached for performance.
 *
 * @param {number} sideLength - Number of rows in triangle (pyramid height)
 * @returns {Object} Result object containing:
 *   - size: sideLength
 *   - count: total number of cells (sideLength²)
 *   - maps: Object with keys {id, r120, r240, f0, f1, f2} mapping old indices to new
 */
export function buildTransformTriMap (sideLength) {
  if (sideLength && cache.has(sideLength)) {
    return cache.get(sideLength)
  }

  const cellCount = sideLength * sideLength
  const triangleHeight = Math.sqrt(3) / 2 // Height for unit side length

  // Generate pixel coordinates for each cell with unit side length
  const cells = []
  for (let row = 0; row < sideLength; row++) {
    for (let col = 0; col <= 2 * row; col++) {
      const x = (col - row) * 0.5
      const y = row * triangleHeight
      cells.push({
        row,
        col,
        x,
        y,
        i: triangularIndex(row, col)
      })
    }
  }

  // Compute centroid of all cells as the rotation/reflection center
  let sumX = 0
  let sumY = 0
  for (const cell of cells) {
    sumX += cell.x
    sumY += cell.y
  }
  const centerX = sumX / cells.length
  const centerY = sumY / cells.length

  // Define D3 transformations (3 rotations + 3 reflections)
  const identity = (x, y) => [x, y]
  const rotate120 = createRotationTransform((2 * Math.PI) / 3, centerX, centerY)
  const rotate240 = createRotationTransform((4 * Math.PI) / 3, centerX, centerY)
  const verticalReflect = createVerticalReflectionTransform(centerX)
  const reflect120 = composeTransforms(verticalReflect, rotate120)
  const reflect240 = composeTransforms(verticalReflect, rotate240)

  const transformations = {
    id: identity,
    r120: rotate120,
    r240: rotate240,
    f0: verticalReflect,
    f1: reflect120,
    f2: reflect240
  }

  // Build transform maps using nearest-neighbor matching
  const maps = {}
  for (const [transformName, transform] of Object.entries(transformations)) {
    const map = new Array(cellCount)

    for (const cell of cells) {
      const [transformedX, transformedY] = transform(cell.x, cell.y)
      map[cell.i] = findNearestCell(transformedX, transformedY, cells)
    }

    maps[transformName] = map
  }

  const result = {
    size: sideLength,
    count: cellCount,
    maps
  }

  cache.set(sideLength, result)
  return result
}
