/**
 * @fileoverview D3 Symmetry transformation maps for triangular grids.
 *
 * This module generates geometric transformation maps for triangular grids using D3 symmetry group operations.
 * The D3 symmetry group includes 3 rotational symmetries (120°, 240°, 360°/identity) and 3 reflection symmetries,
 * totaling 6 transformation types (dihedral group of order 6).
 *
 * **Grid Structure**: Triangular grid arranged as pyramid with apex at top:
 * - Row 0: 1 cell
 * - Row 1: 3 cells
 * - Row r: 2r+1 cells
 * - Total cells for side length N: N²
 *
 * **Transformations**:
 * - `id`: Identity (no transformation)
 * - `r120`, `r240`: Rotations around grid centroid by 120° and 240°
 * - `f0`: Vertical reflection across centroid axis
 * - `f1`, `f2`: Compositions of reflection and rotation
 *
 * **Performance**: Results are cached by sideLength to avoid recomputation.
 *
 * @typedef {Object} TriangleCell
 * @property {number} row - Row index (0-based from apex)
 * @property {number} col - Column index within row (0 to 2*row)
 * @property {number} x - Pixel X coordinate (center-relative)
 * @property {number} y - Pixel Y coordinate (center-relative)
 * @property {number} i - Linear cell index (triangularIndex(row, col))
 *
 * @typedef {Function} CoordinateTransformer
 * @description Function that transforms [x, y] coordinates through geometric operation
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Array<number>} Transformed [x, y] coordinates
 *
 * @typedef {Object.<string, Array<number>>} TransformMapSet
 * @property {Array<number>} id - Identity mapping (index to index, no change)
 * @property {Array<number>} r120 - 120° rotation mapping
 * @property {Array<number>} r240 - 240° rotation mapping
 * @property {Array<number>} f0 - Vertical reflection mapping
 * @property {Array<number>} f1 - Reflection+120° rotation mapping
 * @property {Array<number>} f2 - Reflection+240° rotation mapping
 *
 * @typedef {Object} TriTransformResult
 * @property {number} size - Triangle side length (sideLength parameter)
 * @property {number} count - Total cell count (size²)
 * @property {TransformMapSet} maps - D3 symmetry transformation maps
 */

/**
 * Cache for computed transformation maps.
 * Key: sideLength, Value: TriTransformResult object
 * @type {Map<number, TriTransformResult>}
 * @private
 */
const cache = new Map()

/**
 * Calculate linear index from row and column in triangular grid.
 * Row r contains 2*r+1 cells, so index = r² + c
 *
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
 * Inverse operation of triangularIndex(row, col) = row² + col.
 * Given index i, find row r where r² ≤ i < (r+1)², then col = i - r².
 *
 * @param {number} index - Linear cell index
 * @returns { number[]} [row, col] coordinates
 */
function recoverRowColFromIndex (index) {
  // Find row: row = floor(sqrt(index))
  const row = Math.floor(Math.sqrt(index))
  // Find column: col = index - row²
  const col = index - row * row
  return [row, col]
}

/**
 * Create geometric transformation function: rotation around center.
 * Returns a new function that rotates [x, y] coordinates around (centerX, centerY)
 * by angleRadians using 2D rotation matrix.
 *
 * @private
 * @param {number} angleRadians - Rotation angle in radians (positive = counterclockwise)
 * @param {number} centerX - X coordinate of rotation center
 * @param {number} centerY - Y coordinate of rotation center
 * @returns {CoordinateTransformer} Function that transforms [x, y] coordinates
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
 * Returns a function that reflects [x, y] coordinates across a vertical line at x = centerX.
 * Formula: x' = 2*centerX - x, y' = y (unchanged)
 *
 * @private
 * @param {number} centerX - X coordinate of reflection axis
 * @returns {CoordinateTransformer} Function that transforms [x, y] coordinates
 */
function createVerticalReflectionTransform (centerX) {
  return (x, y) => [2 * centerX - x, y]
}

/**
 * Compose two transformation functions into a single transformation.
 * Returns a new function that first applies second(x,y), then applies first() to result.
 * Composition order: first(second(x, y)) = first ∘ second
 *
 * @private
 * @param {CoordinateTransformer} first - First transformation to apply (outer)
 * @param {CoordinateTransformer} second - Second transformation to apply (inner)
 * @returns {CoordinateTransformer} Composed transformation function
 */
function composeTransforms (first, second) {
  return (x, y) => {
    const [x1, y1] = second(x, y)
    return first(x1, y1)
  }
}

/**
 * Find the nearest original cell to a transformed coordinate using Euclidean distance.
 * Iterates through all cells and finds minimum distance from (transformedX, transformedY)
 * to cell center (cell.x, cell.y). Returns the index of closest cell.
 *
 * @private
 * @param {number} transformedX - Transformed X coordinate
 * @param {number} transformedY - Transformed Y coordinate
 * @param {Array<TriangleCell>} cells - Array of cell objects with {x, y, i} properties
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
 *
 * **Algorithm**:
 * 1. Generate pixel coordinates for all cells in triangular grid with unit side length
 * 2. Compute geometric centroid as center for rotations and reflections
 * 3. Define 6 D3 symmetry transformations (3 rotations + 3 reflections)
 * 4. For each transformation, apply it to all cell coordinates
 * 5. Use nearest-neighbor matching to map transformed coordinates back to original cells
 * 6. Cache result for performance on future calls
 *
 * **Transformations Generated**:
 * - `id`: Identity (each cell maps to itself)
 * - `r120`: 120° rotation around centroid
 * - `r240`: 240° rotation around centroid
 * - `f0`: Vertical reflection across centroid
 * - `f1`: Vertical reflection + 120° rotation
 * - `f2`: Vertical reflection + 240° rotation
 *
 * **Performance**: Results cached by sideLength. Repeated calls with same sideLength
 * return cached object without recomputation.
 *
 * @param {number} sideLength - Number of rows in triangle pyramid (pyramid height)
 * @returns {TriTransformResult} Result object containing:
 *   - `size`: sideLength parameter
 *   - `count`: Total cell count (sideLength²)
 *   - `maps`: TransformMapSet object with 6 transformation arrays
 *
 * @example
 * const result = buildTransformTriMap(4);
 * // result.size === 4
 * // result.count === 16
 * // result.maps.r120 is Array<number> of length 16 mapping indices
 * // result.maps.r120[0] === ?   // Which cell is at rotation center?
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

  /**
   * Transformation definitions.
   * @type {Object.<string, CoordinateTransformer>}
   */
  const transformations = {
    id: identity,
    r120: rotate120,
    r240: rotate240,
    f0: verticalReflect,
    f1: reflect120,
    f2: reflect240
  }

  // Build transform maps using nearest-neighbor matching
  /**
   * Computed transformation maps.
   * @type {TransformMapSet}
   */
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
