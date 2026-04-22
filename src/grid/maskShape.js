// ============================================================================
// CONSTANTS
// ============================================================================

const BRESENHAM_MAX_STEPS = 100
const PIE_SPREAD_DEFAULT = 22.5
const PIE_NARROW_SPREAD = 8

// ============================================================================
// BRESENHAM LINE ALGORITHM
// ============================================================================

/**
 * Generate points along a line using Bresenham's algorithm.
 * @generator
 * @param {number} x0 - Starting x coordinate
 * @param {number} y0 - Starting y coordinate
 * @param {number} deltaX - Absolute horizontal distance
 * @param {number} deltaY - Absolute vertical distance
 * @param {number} stepX - Step direction for x (-1, 0, or 1)
 * @param {number} stepY - Step direction for y (-1, 0, or 1)
 * @param {number} width - Canvas width boundary
 * @param {number} height - Canvas height boundary
 * @yields {Array<number>} [x, y, steps] - Coordinate and step count
 */
function* bresenhamSteps (x0, y0, deltaX, deltaY, stepX, stepY, width, height) {
  let err = deltaX - deltaY
  let steps = 1
  if (deltaX === 0 && deltaY === 0) {
    yield [x0, y0, 1]
    return
  }
  while (
    x0 >= 0 &&
    x0 < width &&
    y0 >= 0 &&
    y0 < height &&
    steps < BRESENHAM_MAX_STEPS
  ) {
    yield [x0, y0, steps]
    steps++
    const e2 = 2 * err

    if (e2 > -deltaY) {
      err -= deltaY
      x0 += stepX
    }
    if (e2 < deltaX) {
      err += deltaX
      y0 += stepY
    }
  }
}

// ============================================================================
// VECTOR MATH HELPERS
// ============================================================================

/**
 * Calculate dot product of two vectors.
 * @param {number} ax - X component of vector A
 * @param {number} ay - Y component of vector A
 * @param {number} bx - X component of vector B
 * @param {number} by - Y component of vector B
 * @returns {number} Dot product
 * @private
 */
function _dotProduct (ax, ay, bx, by) {
  return ax * bx + ay * by
}

/**
 * Calculate vector length (magnitude).
 * @param {number} x - X component
 * @param {number} y - Y component
 * @returns {number} Vector length
 * @private
 */
function _length (x, y) {
  return Math.hypot(x, y)
}

/**
 * Calculate squared vector length (avoid sqrt when possible).
 * @param {number} x - X component
 * @param {number} y - Y component
 * @returns {number} Squared length
 * @private
 */
function _lengthSquared (x, y) {
  return x * x + y * y
}
// ============================================================================
// RAY DRAWING
// ============================================================================

/**
 * Draw a ray from one point through another to the canvas boundary.
 * @param {number} x0 - Start x coordinate
 * @param {number} y0 - Start y coordinate
 * @param {number} x1 - Direction point x coordinate
 * @param {number} y1 - Direction point y coordinate
 * @param {Object} canvas - Canvas object with set(x, y, color) method
 * @param {number} color - Color value (default: 1)
 * @example
 * drawRay(5, 5, 10, 10, canvas, 2)
 */
export function drawRay (x0, y0, x1, y1, canvas, color) {
  const { directionX, directionY } = _calculateDirection(x1, x0, y1, y0)
  _drawRayInDirection(x0, y0, directionX, directionY, canvas, color)
}

/**
 * Draw a ray in a specific direction.
 * @param {number} x0 - Start x coordinate
 * @param {number} y0 - Start y coordinate
 * @param {number} directionX - X component of direction
 * @param {number} directionY - Y component of direction
 * @param {Object} canvas - Canvas object
 * @param {number} color - Color value
 * @private
 */
function _drawRayInDirection (x0, y0, directionX, directionY, canvas, color) {
  const { deltaX, deltaY, stepX, stepY } = _initLineParameters(
    directionX,
    directionY
  )

  for (const [x, y] of bresenhamSteps(
    x0,
    y0,
    deltaX,
    deltaY,
    stepX,
    stepY,
    canvas.width,
    canvas.height
  )) {
    canvas.set(x, y, color)
  }
}
// ============================================================================
// INTERCEPT/BOUNDARY DETECTION
// ============================================================================

/**
 * Find where a ray in a direction hits the canvas boundary.
 * @param {number} x0 - Start x coordinate
 * @param {number} y0 - Start y coordinate
 * @param {number} directionX - X component of direction
 * @param {number} directionY - Y component of direction
 * @param {Object} canvas - Canvas object
 * @returns {Array<number>} [x, y] - Last valid point before boundary
 * @private
 */
function _interceptInDirection (x0, y0, directionX, directionY, canvas) {
  const { deltaX, deltaY, stepX, stepY } = _initLineParameters(
    directionX,
    directionY
  )
  let mx = x0
  let my = y0

  for (const [x, y] of bresenhamSteps(
    x0,
    y0,
    deltaX,
    deltaY,
    stepX,
    stepY,
    canvas.width,
    canvas.height
  )) {
    mx = x
    my = y
  }
  return [mx, my]
}

/**
 * Find intercepts in both directions from a point.
 * @param {number} x - Center x coordinate
 * @param {number} y - Center y coordinate
 * @param {number} directionX - X component of direction
 * @param {number} directionY - Y component of direction
 * @param {Object} canvas - Canvas object
 * @returns {Object} {x0, y0, x1, y1} - Start and end intercepts
 * @private
 */
function _interceptsInDirection (x, y, directionX, directionY, canvas) {
  const [x1, y1] = _interceptInDirection(x, y, directionX, directionY, canvas)
  const [x0, y0] = _interceptInDirection(x, y, -directionX, -directionY, canvas)
  return { x0, y0, x1, y1 }
}

/**
 * Find where a line through two points intercepts the canvas boundaries.
 * @param {number} x0 - Start x coordinate
 * @param {number} y0 - Start y coordinate
 * @param {number} x1 - End x coordinate
 * @param {number} y1 - End y coordinate
 * @param {Object} canvas - Canvas object
 * @returns {Object} {x0, y0, x1, y1} - Boundary intercepts
 * @example
 * const bounds = intercepts(5, 5, 10, 10, canvas)
 */
export function intercepts (x0, y0, x1, y1, canvas) {
  const { directionX, directionY } = _calculateDirection(x1, x0, y1, y0)
  return _interceptsInDirection(x0, y0, directionX, directionY, canvas)
}
// ============================================================================
// LINE AND SEGMENT DRAWING
// ============================================================================

/**
 * Draw an infinite line extended through canvas boundaries.
 * @param {number} sx - Start x coordinate
 * @param {number} sy - Start y coordinate
 * @param {number} ex - End x coordinate
 * @param {number} ey - End y coordinate
 * @param {Object} canvas - Canvas object
 * @param {number} color - Color value
 * @example
 * drawLineInfinite(0, 5, 10, 5, canvas, 1)
 */
export function drawLineInfinite (sx, sy, ex, ey, canvas, color) {
  const { x0, y0, x1, y1 } = intercepts(sx, sy, ex, ey, canvas)
  _drawSegmentTo(x0, y0, x1, y1, canvas, color)
}

/**
 * Draw a line segment from start to end coordinates (inclusive).
 * @param {number} x0 - Start x coordinate
 * @param {number} y0 - Start y coordinate
 * @param {number} x1 - End x coordinate
 * @param {number} y1 - End y coordinate
 * @param {Object} canvas - Canvas object
 * @param {number} color - Color value
 * @example
 * drawSegmentTo(5, 5, 10, 10, canvas, 1)
 */
export function drawSegmentTo (x0, y0, x1, y1, canvas, color) {
  _drawSegmentTo(x0, y0, x1, y1, canvas, color)
}

/**
 * Draw segment to endpoint (internal helper).
 * @private
 */
function _drawSegmentTo (x0, y0, x1, y1, canvas, color) {
  const { deltaX, deltaY, stepX, stepY, directionX, directionY } =
    _initLineParameters(x1 - x0, y1 - y0)
  for (const [x, y] of bresenhamSteps(
    x0,
    y0,
    deltaX,
    deltaY,
    stepX,
    stepY,
    canvas.width,
    canvas.height
  )) {
    canvas.set(x, y, color)
    if (x === directionX && y === directionY) break
  }
}

/**
 * Draw a line segment up to (but not including) the endpoint.
 * @param {number} x0 - Start x coordinate
 * @param {number} y0 - Start y coordinate
 * @param {number} x1 - End x coordinate
 * @param {number} y1 - End y coordinate
 * @param {Object} canvas - Canvas object
 * @param {number} color - Color value
 * @example
 * drawSegmentUpTo(5, 5, 10, 10, canvas, 1)
 */
export function drawSegmentUpTo (x0, y0, x1, y1, canvas, color) {
  const { deltaX, deltaY, stepX, stepY, directionX, directionY } =
    _initLineParameters(x1 - x0, y1 - y0)
  for (const [x, y] of bresenhamSteps(
    x0,
    y0,
    deltaX,
    deltaY,
    stepX,
    stepY,
    canvas.width,
    canvas.height
  )) {
    if (x === directionX && y === directionY) break
    canvas.set(x, y, color)
  }
}
// ============================================================================
// LINE INITIALIZATION HELPERS
// ============================================================================

/**
 * Calculate direction components between two points.
 * @param {number} x1 - End x coordinate
 * @param {number} x0 - Start x coordinate
 * @param {number} y1 - End y coordinate
 * @param {number} y0 - Start y coordinate
 * @returns {Object} {directionX, directionY} - Direction components
 * @private
 */
function _calculateDirection (x1, x0, y1, y0) {
  const directionX = x1 - x0
  const directionY = y1 - y0
  return { directionX, directionY }
}

/**
 * Initialize line drawing parameters from direction.
 * Computes absolute deltas and step directions for Bresenham algorithm.
 * @param {number} directionX - X component of direction
 * @param {number} directionY - Y component of direction
 * @returns {Object} {deltaX, deltaY, stepX, stepY, directionX, directionY}
 * @private
 */
function _initLineParameters (directionX, directionY) {
  const deltaX = Math.abs(directionX)
  const deltaY = Math.abs(directionY)
  const stepX = Math.sign(directionX)
  const stepY = Math.sign(directionY)
  return { deltaX, deltaY, stepX, stepY, directionX, directionY }
}

/**
 * Draw a line segment for a specific distance.
 * @param {number} x0 - Start x coordinate
 * @param {number} y0 - Start y coordinate
 * @param {number} x1 - End x coordinate
 * @param {number} y1 - End y coordinate
 * @param {number} distance - Maximum steps to draw
 * @param {Object} canvas - Canvas object
 * @param {number} color - Color value
 * @example
 * drawSegmentFor(5, 5, 10, 10, 5, canvas, 1)
 */
export function drawSegmentFor (x0, y0, x1, y1, distance, canvas, color) {
  const { deltaX, deltaY, stepX, stepY } = _initLineParameters(x1 - x0, y1 - y0)

  for (const [x, y, steps] of bresenhamSteps(
    x0,
    y0,
    deltaX,
    deltaY,
    stepX,
    stepY,
    canvas.width,
    canvas.height
  )) {
    canvas.set(x, y, color)

    if (steps >= distance) break
  }
}

// ============================================================================
// PIE/SECTOR DRAWING
// ============================================================================

/**
 * Calculate bounding box for a circular region.
 * @param {number} sourceX - Center x coordinate
 * @param {number} radius - Circle radius
 * @param {number} sourceY - Center y coordinate
 * @param {Object} canvas - Canvas object
 * @returns {Object} {minX, maxX, minY, maxY} - Clamped bounds
 * @private
 */
function _calculatePieBounds (sourceX, radius, sourceY, canvas) {
  const minX = Math.max(0, sourceX - radius)
  const maxX = Math.min(canvas.width - 1, sourceX + radius)
  const minY = Math.max(0, sourceY - radius)
  const maxY = Math.min(canvas.height - 1, sourceY + radius)
  return { minY, maxY, minX, maxX }
}

/**
 * Convert spread angle (degrees) to cosine limit for angle comparison.
 * @param {number} spreadDeg - Spread angle in degrees
 * @returns {number} Cosine of spread angle
 * @private
 */
function _convertSpreadToCosine (spreadDeg) {
  return Math.cos((spreadDeg * Math.PI) / 180)
}

/**
 * Draw a pie/sector shape (internal implementation).
 * @param {number} x0 - Center x coordinate
 * @param {number} y0 - Center y coordinate
 * @param {number} x1 - Direction point x coordinate
 * @param {number} y1 - Direction point y coordinate
 * @param {number} radius - Sector radius
 * @param {Object} canvas - Canvas object
 * @param {Function} drawer - Function(canvas, cosAngle, distance, x, y) to draw pixels
 * @param {number} spreadDeg - Spread angle in degrees
 * @private
 */
function _drawPieBase (
  x0,
  y0,
  x1,
  y1,
  radius,
  canvas,
  drawer,
  spreadDeg = PIE_SPREAD_DEFAULT
) {
  const ox = x0
  const oy = y0
  const dx = x1 - x0
  const dy = y1 - y0
  const dirLen = _length(dx, dy)
  const cosLimit = _convertSpreadToCosine(spreadDeg)

  const r2 = radius * radius

  const { minY, maxY, minX, maxX } = _calculatePieBounds(ox, radius, oy, canvas)

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const vx = x - ox
      const vy = y - oy

      const d2 = _lengthSquared(vx, vy)
      if (d2 > r2 || d2 === 0) continue

      const vLen = Math.sqrt(d2)
      const cosAngle = _dotProduct(vx, vy, dx, dy) / (vLen * dirLen)

      if (cosAngle >= cosLimit) {
        drawer(canvas, cosAngle, vLen, x, y)
      }
    }
  }
}

/**
 * Draw a pie/sector shape with a single color.
 * @param {number} x0 - Center x coordinate
 * @param {number} y0 - Center y coordinate
 * @param {number} x1 - Direction point x coordinate
 * @param {number} y1 - Direction point y coordinate
 * @param {number} radius - Sector radius
 * @param {Object} canvas - Canvas object
 * @param {number} spreadDeg - Spread angle in degrees (default: 22.5)
 * @param {number} color - Color value (default: 1)
 * @example
 * drawPie(10, 10, 15, 15, 5, canvas, 22.5, 1)
 */
export function drawPie (
  x0,
  y0,
  x1,
  y1,
  radius,
  canvas,
  spreadDeg = PIE_SPREAD_DEFAULT,
  color = 1
) {
  _drawPieBase(
    x0,
    y0,
    x1,
    y1,
    radius,
    canvas,
    (canvas, cosAngle, vLen, x, y) => {
      canvas.set(x, y, color)
    },
    spreadDeg
  )
}

/**
 * Draw a pie/sector shape with two color zones (inner and outer).
 * @param {number} x0 - Center x coordinate
 * @param {number} y0 - Center y coordinate
 * @param {number} x1 - Direction point x coordinate
 * @param {number} y1 - Direction point y coordinate
 * @param {number} radius - Sector radius
 * @param {Object} canvas - Canvas object
 * @param {number} spread - Main spread angle in degrees (default: 22.5)
 * @param {number} narrowSpread - Inner zone spread angle in degrees (default: 8)
 * @example
 * drawPie2(10, 10, 15, 15, 5, canvas, 22.5, 8)
 */
export function drawPie2 (
  x0,
  y0,
  x1,
  y1,
  radius,
  canvas,
  spread = PIE_SPREAD_DEFAULT,
  narrowSpread = PIE_NARROW_SPREAD
) {
  const narrowLimit = _convertSpreadToCosine(narrowSpread)
  _drawPieBase(
    x0,
    y0,
    x1,
    y1,
    radius,
    canvas,
    (canvas, cosAngle, vLen, x, y) => {
      if (cosAngle > narrowLimit) {
        canvas.set(x, y, 2)
      } else {
        canvas.set(x, y, 1)
      }
    },
    spread
  )
}
