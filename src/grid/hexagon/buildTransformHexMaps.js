const cache = new Map()

/**
 * Reflect a cube coordinate across the q-r plane in hex coordinate system.
 * Cube coordinates [q, r, s] satisfy q + r + s = 0.
 * @private
 * @param {Array<number>} cube - [q, r, s] cube coordinate
 * @returns {Array<number>} Reflected [q, s, r] coordinate
 */
function reflectCube ([q, r, s]) {
  return [q, s, r]
}

/**
 * Rotate a cube coordinate 60° clockwise in hex coordinate system.
 * Cube coordinates [q, r, s] satisfy q + r + s = 0.
 * @private
 * @param {Array<number>} cube - [q, r, s] cube coordinate
 * @returns {Array<number>} Rotated [-s, -q, -r] coordinate
 */
function rotateCube ([q, r, s]) {
  return [-s, -q, -r]
}

/**
 * Build D6 symmetry transformation maps for hexagonal grids.
 * Generates all 12 D6 symmetries (6 rotations × 2 reflection states).
 * Results are cached for performance.
 *
 * @param {Array<Array<number>>} coords - Array of cube coordinates [q, r, s] for each cell
 * @param {Function} indexFn - Function to convert cube coordinates to linear cell index
 * @param {number} size - Total number of cells
 * @returns {Array<Array<number>>} Array of 12 transform maps (6 rotations + 6 reflections)
 */
export function buildTransformHexMaps (coords, indexFn, size) {
  if (cache.has(size)) {
    return cache.get(size)
  }

  const transformMaps = []

  // Generate all 6 rotation angles × 2 reflection states
  for (let rotationCount = 0; rotationCount < 6; rotationCount++) {
    const rotationMap = new Array(size)
    const reflectionMap = new Array(size)

    // For each coordinate, apply the rotation and reflection
    coords.forEach((coordinate, cellIndex) => {
      // Apply pure rotation
      let rotatedCoord = coordinate
      for (let i = 0; i < rotationCount; i++) {
        rotatedCoord = rotateCube(rotatedCoord)
      }
      rotationMap[cellIndex] = indexFn(...rotatedCoord)

      // Apply reflection, then rotation
      let reflectedCoord = reflectCube(coordinate)
      for (let i = 0; i < rotationCount; i++) {
        reflectedCoord = rotateCube(reflectedCoord)
      }
      reflectionMap[cellIndex] = indexFn(...reflectedCoord)
    })

    transformMaps.push(rotationMap, reflectionMap)
  }

  cache.set(size, transformMaps)
  return transformMaps
}
