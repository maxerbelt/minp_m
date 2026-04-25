const cache = new Map()

/**
 * Build D4 symmetry transformation maps for rectangular grids.
 * Maps define how each cell index transforms under rotations and reflections.
 * Results are cached for square grids (W === H) for performance.
 *
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @returns {Object<string, Array<number>>} Transform maps:
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
  const gridSize = width * height

  // Return cached result for square grids
  if (width === height && cache.has(width)) {
    return cache.get(width)
  }

  const maps = {
    id: new Array(gridSize),
    r90: new Array(gridSize),
    r180: new Array(gridSize),
    r270: new Array(gridSize),
    fx: new Array(gridSize),
    fy: new Array(gridSize),
    fd1: new Array(gridSize),
    fd2: new Array(gridSize)
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cellIndex = y * width + x

      // Identity: no transformation
      maps.id[cellIndex] = cellIndex

      // Rotations (clockwise)
      maps.r90[cellIndex] = x * height + (height - 1 - y)
      maps.r180[cellIndex] = (height - 1 - y) * width + (width - 1 - x)
      maps.r270[cellIndex] = (width - 1 - x) * height + y

      // Reflections
      maps.fx[cellIndex] = y * width + (width - 1 - x) // vertical flip
      maps.fy[cellIndex] = (height - 1 - y) * width + x // horizontal flip
      maps.fd1[cellIndex] = x * width + y // main diagonal flip
      maps.fd2[cellIndex] = (width - 1 - x) * width + (height - 1 - y) // anti-diagonal flip
    }
  }

  // Cache square grid transforms for reuse
  if (width === height) {
    cache.set(width, maps)
  }

  return maps
}
