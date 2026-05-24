const cache = new Map()

/**
 * @typedef {Object<string, number[]>} TransformMaps
 * @property {number[]} id - Identity: no transformation
 * @property {number[]} r90 - Rotate 90° clockwise
 * @property {number[]} r180 - Rotate 180°
 * @property {number[]} r270 - Rotate 270° clockwise
 * @property {number[]} fx - Reflect vertically (flip across vertical axis)
 * @property {number[]} fy - Reflect horizontally (flip across horizontal axis)
 * @property {number[]} fd1 - Reflect along main diagonal (↘ direction)
 * @property {number[]} fd2 - Reflect along anti-diagonal (↙ direction)
 */

/**
 * Build D4 dihedral symmetry transformation maps for rectangular grids.
 *
 * Creates index transformation maps for all 8 elements of the D4 symmetry group:
 * 4 rotations (0°, 90°, 180°, 270°) and 4 reflections (vertical, horizontal, both diagonals).
 * Each transformation is represented as an array where array[oldIndex] = newIndex.
 *
 * **Performance:** Square grids (width === height) are cached for reuse.
 * Rectangular grids compute fresh maps each call.
 *
 * **D4 Group Structure:**
 * - Rotations: id, r90, r180, r270
 * - Reflections: fx (vertical), fy (horizontal), fd1 (main diagonal), fd2 (anti-diagonal)
 * - All combinations are composable: r90 ∘ fx generates all group elements
 *
 * **Memory Layout:**
 * Grid indices are computed as: `index = y * width + x`
 * Transformations recalculate (x, y) coordinates, then recompute indices.
 *
 * @param {number} width - Grid width in cells (positive integer)
 * @param {number} height - Grid height in cells (positive integer)
 * @returns {TransformMaps} Object with 8 transformation mapping arrays.
 *   Each array maps [oldIndex] → newIndex under the corresponding transformation.
 *
 * @example
 * // Build maps for 4×4 grid
 * const maps = buildTransformMaps(4, 4);
 * const oldIndex = 5;
 * const rotated90Index = maps.r90[oldIndex];  // Cell at (1,1) → (3,1)
 * const flipped = maps.fx[oldIndex];          // Cell at (1,1) → (2,1)
 */
export function buildTransformMaps (width, height) {
  const cacheKey = getCacheKey(width, height)
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  const gridSize = width * height
  const maps = createEmptyTransformMaps(gridSize)

  populateTransformMaps(maps, width, height)

  if (cacheKey !== undefined) {
    cache.set(cacheKey, maps)
  }

  return maps
}

/**
 * Build an empty transform map object with pre-allocated arrays.
 *
 * Creates an object with 8 pre-allocated arrays, one for each transformation.
 * Arrays are sized to grid dimensions for direct index-based access.
 *
 * @param {number} size - Total number of cells in the grid (width × height)
 * @returns {TransformMaps} Object with 8 empty typed arrays ready for population
 * @private
 */
function createEmptyTransformMaps (size) {
  return {
    id: new Array(size),
    r90: new Array(size),
    r180: new Array(size),
    r270: new Array(size),
    fx: new Array(size),
    fy: new Array(size),
    fd1: new Array(size),
    fd2: new Array(size)
  }
}

/**
 * Populate all transformation maps for each cell in the grid.
 *
 * Iterates through every cell (x, y) and computes its transformed index
 * under each of the 8 D4 transformations. Results are stored in the provided maps.
 *
 * @param {TransformMaps} maps - Transform maps object to populate (mutated in place)
 * @param {number} width - Grid width in cells
 * @param {number} height - Grid height in cells
 * @private
 */
function populateTransformMaps (maps, width, height) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      maps.id[index] = index
      maps.r90[index] = getR90Index(x, y, width, height)
      maps.r180[index] = getR180Index(x, y, width, height)
      maps.r270[index] = getR270Index(x, y, width, height)
      maps.fx[index] = getFxIndex(x, y, width)
      maps.fy[index] = getFyIndex(x, y, width, height)
      maps.fd1[index] = getFd1Index(x, y, width)
      maps.fd2[index] = getFd2Index(x, y, width, height)
    }
  }
}

/**
 * Return the cache key for a grid, or undefined if not cacheable.
 *
 * Only square grids (width === height) are cached for performance reuse.
 * Rectangular grids are computed fresh each call since they're less common.
 *
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @returns {number|undefined} Cache key (grid size) for square grids, undefined for rectangular
 * @private
 */
function getCacheKey (width, height) {
  return width === height ? width : undefined
}

/**
 * Compute the target index for a 90° clockwise rotation.
 *
 * **Transformation:** (x, y) → (y, width - 1 - x)
 * The rotated grid has dimensions (height × width).
 * New linear index: x * height + (height - 1 - y)
 *
 * @param {number} x - Original X coordinate
 * @param {number} y - Original Y coordinate
 * @param {number} _width - Original grid width (not used, included for consistency)
 * @param {number} height - Original grid height (becomes width after rotation)
 * @returns {number} Transformed index in the rotated grid
 * @private
 */
function getR90Index (x, y, _width, height) {
  return x * height + (height - 1 - y)
}

/**
 * Compute the target index for a 180° rotation.
 *
 * **Transformation:** (x, y) → (width - 1 - x, height - 1 - y)
 * Grid dimensions remain the same (width × height).
 * New linear index: (height - 1 - y) * width + (width - 1 - x)
 *
 * @param {number} x - Original X coordinate
 * @param {number} y - Original Y coordinate
 * @param {number} width - Grid width (unchanged)
 * @param {number} height - Grid height (unchanged)
 * @returns {number} Transformed index (same grid dimensions)
 * @private
 */
function getR180Index (x, y, width, height) {
  return (height - 1 - y) * width + (width - 1 - x)
}

/**
 * Compute the target index for a 270° clockwise rotation (90° counter-clockwise).
 *
 * **Transformation:** (x, y) → (height - 1 - y, x)
 * The rotated grid has dimensions (height × width).
 * New linear index: (width - 1 - x) * height + y
 *
 * @param {number} x - Original X coordinate
 * @param {number} y - Original Y coordinate
 * @param {number} width - Original grid width (becomes height after rotation)
 * @param {number} height - Original grid height (becomes width after rotation)
 * @returns {number} Transformed index in the rotated grid
 * @private
 */
function getR270Index (x, y, width, height) {
  return (width - 1 - x) * height + y
}

/**
 * Compute the target index for a vertical flip (mirror across vertical axis).
 *
 * **Transformation:** (x, y) → (width - 1 - x, y)
 * Grid dimensions remain the same (width × height).
 * Reflects left↔right, Y-coordinates unchanged.
 * New linear index: y * width + (width - 1 - x)
 *
 * @param {number} x - Original X coordinate
 * @param {number} y - Original Y coordinate (unchanged)
 * @param {number} width - Grid width (unchanged)
 * @returns {number} Transformed index (same grid dimensions)
 * @private
 */
function getFxIndex (x, y, width) {
  return y * width + (width - 1 - x)
}

/**
 * Compute the target index for a horizontal flip (mirror across horizontal axis).
 *
 * **Transformation:** (x, y) → (x, height - 1 - y)
 * Grid dimensions remain the same (width × height).
 * Reflects top↔bottom, X-coordinates unchanged.
 * New linear index: (height - 1 - y) * width + x
 *
 * @param {number} x - Original X coordinate (unchanged)
 * @param {number} y - Original Y coordinate
 * @param {number} width - Grid width (unchanged)
 * @param {number} height - Grid height (unchanged)
 * @returns {number} Transformed index (same grid dimensions)
 * @private
 */
function getFyIndex (x, y, width, height) {
  return (height - 1 - y) * width + x
}

/**
 * Compute the target index for the main diagonal flip (↘ direction).
 *
 * **Transformation:** (x, y) → (y, x)
 * Also known as matrix transpose operation.
 * For rectangular grids, this swaps width and height.
 * New linear index: x * width + y
 *
 * @param {number} x - Original X coordinate
 * @param {number} y - Original Y coordinate
 * @param {number} width - Grid width (unchanged in linear calc)
 * @returns {number} Transformed index with coordinates swapped
 * @private
 */
function getFd1Index (x, y, width) {
  return x * width + y
}

/**
 * Compute the target index for the anti-diagonal flip (↙ direction).
 *
 * **Transformation:** (x, y) → (height - 1 - y, width - 1 - x)
 * Combines transpose with 180° rotation.
 * For rectangular grids, this swaps width and height.
 * New linear index: (width - 1 - x) * width + (height - 1 - y)
 *
 * @param {number} x - Original X coordinate
 * @param {number} y - Original Y coordinate
 * @param {number} width - Grid width (unchanged in linear calc)
 * @param {number} height - Grid height (unchanged in linear calc)
 * @returns {number} Transformed index with coordinates swapped and inverted
 * @private
 */
function getFd2Index (x, y, width, height) {
  return (width - 1 - x) * width + (height - 1 - y)
}
