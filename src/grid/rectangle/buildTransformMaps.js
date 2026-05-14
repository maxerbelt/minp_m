const cache = new Map()

/**
 * @typedef {Object<string, Array<number>>} TransformMaps
 */

/**
 * Build D4 symmetry transformation maps for rectangular grids.
 * Maps define how each cell index transforms under rotations and reflections.
 * Results are cached for square grids (width === height) for performance.
 *
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @returns {TransformMaps} Transform maps:
 *   - id: identity (no change)
 *   - r90: rotate 90° clockwise
 *   - r180: rotate 180°
 *   - r270: rotate 270° clockwise (or 90° counter-clockwise)
 *   - fx: reflect vertically (flip x-axis)
 *   - fy: reflect horizontally (flip y-axis)
 *   - fd1: reflect along main diagonal (top-left to bottom-right)
 *   - fd2: reflect along anti-diagonal (top-right to bottom-left)
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
 * @param {number} size - Number of cells in the grid
 * @returns {TransformMaps}
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
 * Populate the transform maps for each cell in the grid.
 *
 * @param {TransformMaps} maps - Transform maps to populate
 * @param {number} width - Grid width
 * @param {number} height - Grid height
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
 * Return the cache key for a grid.
 * Only square grids are cached.
 *
 * @param {number} width
 * @param {number} height
 * @returns {number|undefined}
 */
function getCacheKey (width, height) {
  return width === height ? width : undefined
}

/**
 * Compute the target index for a 90° clockwise rotation.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
function getR90Index (x, y, width, height) {
  return x * height + (height - 1 - y)
}

/**
 * Compute the target index for a 180° rotation.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
function getR180Index (x, y, width, height) {
  return (height - 1 - y) * width + (width - 1 - x)
}

/**
 * Compute the target index for a 270° clockwise rotation.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
function getR270Index (x, y, width, height) {
  return (width - 1 - x) * height + y
}

/**
 * Compute the target index for a vertical flip (mirror across the vertical axis).
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @returns {number}
 */
function getFxIndex (x, y, width) {
  return y * width + (width - 1 - x)
}

/**
 * Compute the target index for a horizontal flip (mirror across the horizontal axis).
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
function getFyIndex (x, y, width, height) {
  return (height - 1 - y) * width + x
}

/**
 * Compute the target index for the main diagonal flip.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @returns {number}
 */
function getFd1Index (x, y, width) {
  return x * width + y
}

/**
 * Compute the target index for the anti-diagonal flip.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
function getFd2Index (x, y, width, height) {
  return (width - 1 - x) * width + (height - 1 - y)
}
