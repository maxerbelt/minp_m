import { Actions } from './actions.js'
import { Indexer, deltaAndDirection } from './indexer.js'

function mod (n, m) {
  return ((n % m) + m) % m
}

const neighbors = {
  E: [+1, 0],
  W: [-1, 0],
  N: [0, +1],
  S: [0, -1],
  SE: [+1, +1],
  NW: [-1, -1],
  SW: [-1, +1],
  NE: [+1, -1]
}
const neighborValues = Object.values(neighbors)

const othoNeighbors = {
  E: [+1, 0],
  W: [-1, 0],
  N: [0, +1],
  S: [0, -1]
}

const othoNeighborValues = Object.values(othoNeighbors)
const diagNeighbors = {
  SE: [+1, +1],
  NW: [-1, -1],
  SW: [-1, +1],
  NE: [+1, -1]
}
const diagNeighborValues = Object.values(diagNeighbors)

const area = {
  C: [0, 0],
  E: [+1, 0],
  W: [-1, 0],
  N: [0, +1],
  S: [0, -1],
  SE: [+1, +1],
  NW: [-1, -1],
  SW: [-1, +1],
  NE: [+1, -1]
}
const areaValues = Object.values(area)

export class RectIndex extends Indexer {
  constructor (width, height) {
    super(width * height)
    this.width = width
    this.height = height
    this._wrap = false
    this.validate = this.validateClamp

    // ============================================================================
    // CONCEPT: Automatically generate Indices wrappers from base methods
    // ============================================================================
    // Each wrapper appends this.index as the indexer parameter to the base method.
    // This eliminates 12 nearly-identical manual wrapper method implementations.
    const wrapperPairs = [
      ['rayIndices', 'ray'],
      ['superCoverRayIndices', 'superCoverRay'],
      ['halfCoverRayIndices', 'halfCoverRay'],
      ['segmentToIndices', 'segmentTo'],
      ['superCoverSegmentToIndices', 'superCoverSegmentTo'],
      ['halfCoverSegmentToIndices', 'halfCoverSegmentTo'],
      ['fullLineIndices', 'fullLine'],
      ['superCoverFullLineIndices', 'superCoverFullLine'],
      ['halfCoverFullLineIndices', 'halfCoverFullLine'],
      ['segmentForIndices', 'segmentFor'],
      ['superCoverSegmentForIndices', 'superCoverSegmentFor'],
      ['halfCoverSegmentForIndices', 'halfCoverSegmentFor']
    ]

    for (const [wrapperName, baseName] of wrapperPairs) {
      this[wrapperName] = this._createIndicesWrapper(baseName)
    }
  }
  index (x, y) {
    return y * this.width + x
  }

  location (i) {
    const x = i % this.width
    const y = Math.floor(i / this.width)
    return [x, y]
  }

  isValid (x, y) {
    return x >>> 0 < this.width && y >>> 0 < this.height
  }
  wrap () {
    this._wrap = true
    this.validate = this.validateWrap
  }
  clamp () {
    this._wrap = false
    this.validate = this.validateClamp
  }
  validateClamp (x, y) {
    if (this.isValid(x, y)) return [x, y]
    return null
  }

  validateWrap (x, y) {
    const wrappedX = mod(x, this.width)
    const wrappedY = mod(y, this.height)
    return [wrappedX, wrappedY]
  }
  resized (width, height) {
    const rect = new RectIndex(width, height)
    if (this._wrap) {
      rect.wrap()
    } else {
      rect.clamp()
    }
    return rect
  }
  actions (bb) {
    // always create a fresh Actions instance so that symmetry/template
    // calculations reflect the *current* bitboard.  Caching caused the
    // classification to stay fixed to the original mask state (frequently
    // D4 when starting full), leading to an unchanging display.
    return new Actions(this.width, this.height, bb)
  }

  getTransformCapabilities (bb) {
    const actions = bb.actions
    const maps = actions.transformMaps
    const template = actions.template

    return {
      canRotateCW: actions.applyMap(maps.r90) !== template,
      canRotateCCW: actions.applyMap(maps.r270) !== template,
      canFlipH: actions.applyMap(maps.fx) !== template,
      canFlipV: actions.applyMap(maps.fy) !== template
    }
  }
  neighbors (q, r) {
    return neighborValues.map(([qq, rr]) => [q + qq, r + rr])
  }
  othoNeighbors (q, r) {
    return othoNeighborValues.map(([qq, rr]) => [q + qq, r + rr])
  }
  diagNeighbors (q, r) {
    return diagNeighborValues.map(([qq, rr]) => [q + qq, r + rr])
  }
  area (q, r) {
    return areaValues.map(([qq, rr]) => [q + qq, r + rr])
  }

  // ============================================================================
  // CONCEPT: Bresenham Line Step Calculation (Reusable across indexers)
  // ============================================================================

  /**
   * Core Bresenham step without tracking movement direction.
   * Used by normal line algorithm.
   * Reusable: CubeIndex and TriIndex have similar implementations.
   */
  step (errorTerm, deltaY, deltaX, currentX, stepX, currentY, stepY) {
    const doubledError = errorTerm << 1
    const moveInX = +(doubledError > -deltaY)
    const moveInY = +(doubledError < deltaX)
    currentX += moveInX * stepX
    currentY += moveInY * stepY
    errorTerm -= moveInX * deltaY
    errorTerm += moveInY * deltaX
    return { errorTerm, currentX, currentY }
  }

  /**
   * Bresenham step that tracks movement direction for corner detection.
   * Used by super-cover and half-cover algorithms that need to detect
   * when both axes move simultaneously (corner crossing).
   */
  stepMove (errorTerm, deltaY, deltaX, currentX, stepX, currentY, stepY) {
    const doubledError = errorTerm << 1
    const moveInX = +(doubledError > -deltaY)
    const moveInY = +(doubledError < deltaX)
    currentX += moveInX * stepX
    currentY += moveInY * stepY
    errorTerm -= moveInX * deltaY
    errorTerm += moveInY * deltaX
    return { errorTerm, currentX, currentY, moveInX, moveInY }
  }

  // ============================================================================
  // CONCEPT: Exit Conditions (Inherited from base Indexer class)
  // ============================================================================

  // ============================================================================
  // CONCEPT: Indexer Defaults (Inherited from base Indexer class)
  // ============================================================================

  // ============================================================================
  // CONCEPT: Corner Crossing Detection (Algorithm-specific handlers)
  // ============================================================================

  /**
   * Detects and yields corner-crossing cells for super-cover algorithm.
   * Pattern: Both axes moved = diagonal step = corner was crossed.
   */
  *yieldSuperCoverCornerCells (
    moveInX,
    moveInY,
    previousX,
    stepX,
    previousY,
    stepY,
    step,
    indexer
  ) {
    const crossedCorner = moveInX & moveInY

    if (crossedCorner) {
      const extraCell1X = previousX + stepX
      const extraCell1Y = previousY

      const extraCell2X = previousX
      const extraCell2Y = previousY + stepY

      const right = this.validate(extraCell1X, extraCell1Y)
      if (right !== null) {
        yield indexer(right[0], right[1], step)
        step++
      }
      const down = this.validate(extraCell2X, extraCell2Y)
      if (down !== null) {
        yield indexer(down[0], down[1], step)
        step++
      }
    }
    return step
  }

  /**
   * Detects and yields corner-crossing cells for half-cover algorithm.
   * Half-cover only emits one extra cell (rightward bias).
   */
  *yieldHalfCoverCornerCells (
    moveInX,
    moveInY,
    previousX,
    stepX,
    previousY,
    stepY,
    step,
    indexer
  ) {
    const crossedCorner = moveInX & moveInY

    if (crossedCorner) {
      const extraCell1X = previousX + stepX
      const extraCell1Y = previousY

      const extraCell2X = previousX
      const extraCell2Y = previousY + stepY
      const right = this.validate(extraCell1X, extraCell1Y)
      if (right !== null) {
        yield indexer(right[0], right[1], step)
        step++
        return step
      }
      const down = this.validate(extraCell2X, extraCell2Y)
      if (down !== null) {
        yield indexer(down[0], down[1], step)
        step++
      }
    }
    return step
  }

  // ============================================================================
  // CONCEPT: Grid Traversal (Key generators organized by algorithm type)
  // ============================================================================

  *keys () {
    const n = this.size
    for (let i = 0; i < n; i++) {
      const lc = this.location(i)
      yield [...lc, i]
    }
  }
  *line (startX, startY, endX, endY, exitCondition, indexer, validate) {
    indexer = this._ensureIndexer(indexer)
    exitCondition = this._ensureExitCondition(exitCondition, endX, endY)
    validate = this._ensureValidate(validate)
    // --------------------------------------------------
    // Delta and direction setup
    // --------------------------------------------------
    const { deltaX, deltaY, stepX, stepY } = deltaAndDirection(
      endX,
      startX,
      endY,
      startY
    )

    // Special case: start == end, return empty (no line segment to draw)
    if (deltaX === 0 && deltaY === 0) {
      return
    }

    // Bresenham error accumulator
    let errorTerm = deltaX - deltaY

    // Current traversal position
    let currentX = startX
    let currentY = startY
    let step = 1
    // --------------------------------------------------
    // Main traversal loop
    // --------------------------------------------------
    while (true) {
      const valid = validate(currentX, currentY)
      if (valid == null) {
        break
      }
      ;[currentX, currentY] = valid
      if (step > 60) {
        console.warn(
          `Bresenham line exceeded 60 steps, likely infinite loop.  Current position: (${currentX}, ${currentY}), end position: (${endX}, ${endY})`
        )
        break
      }
      yield indexer(currentX, currentY, step)
      step++
      // Exit condition
      if (exitCondition(currentX, currentY, step)) break
      ;({ errorTerm, currentX, currentY } = this.step(
        errorTerm,
        deltaY,
        deltaX,
        currentX,
        stepX,
        currentY,
        stepY
      ))
    }
  }

  *superCoverLine (
    startX,
    startY,
    endX,
    endY,
    exitCondition,
    indexer,
    validate
  ) {
    indexer = this._ensureIndexer(indexer)
    exitCondition = this._ensureExitCondition(exitCondition, endX, endY)
    validate = this._ensureValidate(validate)
    // --------------------------------------------------
    // Delta and direction setup
    // --------------------------------------------------
    const { deltaX, deltaY, stepX, stepY } = deltaAndDirection(
      endX,
      startX,
      endY,
      startY
    )

    // Bresenham error accumulator
    let errorTerm = deltaX - deltaY

    // Current traversal position
    let currentX = startX
    let currentY = startY
    let step = 1
    let moveInX = 0
    let moveInY = 0
    // --------------------------------------------------
    // Main traversal loop
    // --------------------------------------------------
    while (true) {
      const valid = validate(currentX, currentY)
      if (valid == null) {
        break
      }
      ;[currentX, currentY] = valid
      if (step > 60) {
        console.warn(
          `Bresenham line exceeded 60 steps, likely infinite loop.  Current position: (${currentX}, ${currentY}), end position: (${endX}, ${endY})`
        )
        break
      }
      yield indexer(currentX, currentY, step)
      step++
      // Exit condition
      if (exitCondition(currentX, currentY, step)) break

      // Store previous position (needed for supercover extras)
      const previousX = currentX
      const previousY = currentY

      ;({ errorTerm, currentX, currentY, moveInX, moveInY } = this.stepMove(
        errorTerm,
        deltaY,
        deltaX,
        currentX,
        stepX,
        currentY,
        stepY
      ))

      // Emit extra cells when corner crossing detected
      step = yield* this.yieldSuperCoverCornerCells(
        moveInX,
        moveInY,
        previousX,
        stepX,
        previousY,
        stepY,
        step,
        indexer
      )
    }
  }

  *halfCoverLine (startX, startY, endX, endY, exitCondition, indexer, validate) {
    indexer = this._ensureIndexer(indexer)
    exitCondition = this._ensureExitCondition(exitCondition, endX, endY)
    validate = this._ensureValidate(validate)

    // --------------------------------------------------
    // Delta and direction setup
    // --------------------------------------------------
    const { deltaX, deltaY, stepX, stepY } = deltaAndDirection(
      endX,
      startX,
      endY,
      startY
    )

    // Bresenham error accumulator
    let errorTerm = deltaX - deltaY

    // Current traversal position
    let currentX = startX
    let currentY = startY
    let step = 1
    let moveInX = 0
    let moveInY = 0
    // --------------------------------------------------
    // Main traversal loop
    // --------------------------------------------------
    while (true) {
      const valid = validate(currentX, currentY)
      if (valid == null) {
        break
      }
      ;[currentX, currentY] = valid
      if (step > 60) {
        console.warn(
          `Bresenham line exceeded 60 steps, likely infinite loop.  Current position: (${currentX}, ${currentY}), end position: (${endX}, ${endY})`
        )
        break
      }
      yield indexer(currentX, currentY, step)
      step++
      // Exit condition
      if (exitCondition(currentX, currentY, step)) break

      // Store previous position (needed for half cover extras)
      const previousX = currentX
      const previousY = currentY

      ;({ errorTerm, currentX, currentY, moveInX, moveInY } = this.stepMove(
        errorTerm,
        deltaY,
        deltaX,
        currentX,
        stepX,
        currentY,
        stepY
      ))

      // Emit extra cells when corner crossing detected (max 1 cell for half-cover)
      step = yield* this.yieldHalfCoverCornerCells(
        moveInX,
        moveInY,
        previousX,
        stepX,
        previousY,
        stepY,
        step,
        indexer,
        validate
      )
    }
  }
  *rows () {
    for (let y = 0; y < this.height; y++) {
      yield y
    }
  }
  rowPadding () {
    return ''
  }
  cellPadding () {
    return ''
  }

  *row (y) {
    for (let x = 0; x < this.width; x++) {
      yield [x, y]
    }
  }

  // ============================================================================
  // CONCEPT: Ray Casting (Start from a point, traverse until boundary)
  // ============================================================================

  *ray (startX, startY, endX, endY, indexer, validate) {
    // stop once the current position is outside validity to avoid endless
    // traversal.  Use the same exit condition pattern as in other generators.
    return yield* this.line(
      startX,
      startY,
      endX,
      endY,
      this._createBoundaryExitCondition(),
      indexer,
      validate
    )
  }

  *superCoverRay (startX, startY, endX, endY, indexer, validate) {
    // stop once the current position is outside validity to avoid endless
    // traversal.  Use the same exit condition pattern as in other generators.
    return yield* this.superCoverLine(
      startX,
      startY,
      endX,
      endY,
      this._createBoundaryExitCondition(),
      indexer,
      validate
    )
  }

  *halfCoverRay (startX, startY, endX, endY, indexer, validate) {
    // stop once the current position is outside validity to avoid endless
    // traversal.  Use the same exit condition pattern as in other generators.
    return yield* this.halfCoverLine(
      startX,
      startY,
      endX,
      endY,
      this._createBoundaryExitCondition(),
      indexer,
      validate
    )
  }

  // ============================================================================
  // CONCEPT: Shape-Specific Segment Methods (fullLine and segmentTo variants)
  // ============================================================================

  *segmentTo (startX, startY, endX, endY, indexer, validate) {
    return yield* this.line(startX, startY, endX, endY, null, indexer, validate)
  }

  *superCoverSegmentTo (startX, startY, endX, endY, indexer, validate) {
    return yield* this.superCoverLine(
      startX,
      startY,
      endX,
      endY,
      null,
      indexer,
      validate
    )
  }

  *halfCoverSegmentTo (startX, startY, endX, endY, indexer, validate) {
    return yield* this.halfCoverLine(
      startX,
      startY,
      endX,
      endY,
      null,
      indexer,
      validate
    )
  }

  *fullLine (startX, startY, endX, endY, indexer, validate) {
    const { x0, y0, x1, y1 } = this.intercepts(startX, startY, endX, endY)
    return yield* this.segmentTo(x0, y0, x1, y1, indexer, validate)
  }

  *superCoverFullLine (startX, startY, endX, endY, indexer, validate) {
    const { x0, y0, x1, y1 } = this.intercepts(startX, startY, endX, endY)
    return yield* this.superCoverSegmentTo(x0, y0, x1, y1, indexer, validate)
  }

  *halfCoverFullLine (startX, startY, endX, endY, indexer, validate) {
    const { x0, y0, x1, y1 } = this.intercepts(startX, startY, endX, endY)
    return yield* this.halfCoverSegmentTo(x0, y0, x1, y1, indexer, validate)
  }

  // ============================================================================
  // CONCEPT: Distance-Limited Segments (segmentFor variants)
  // ============================================================================

  *segmentFor (startX, startY, endX, endY, distance, indexer, validate) {
    return yield* this.line(
      startX,
      startY,
      endX,
      endY,
      this._createDistanceLimitExitCondition(distance),
      indexer,
      validate
    )
  }

  *superCoverSegmentFor (
    startX,
    startY,
    endX,
    endY,
    distance,
    indexer,
    validate
  ) {
    return yield* this.superCoverLine(
      startX,
      startY,
      endX,
      endY,
      this._createDistanceLimitExitCondition(distance),
      indexer,
      validate
    )
  }

  *halfCoverSegmentFor (
    startX,
    startY,
    endX,
    endY,
    distance,
    indexer,
    validate
  ) {
    return yield* this.halfCoverLine(
      startX,
      startY,
      endX,
      endY,
      this._createDistanceLimitExitCondition(distance),
      indexer,
      validate
    )
  }

  intercept (startX, startY, endX, endY) {
    let mx = startX
    let my = startY

    for (const [x, y] of this.ray(
      startX,
      startY,
      endX,
      endY,
      null,
      this.validateClamp.bind(this)
    )) {
      mx = x
      my = y
    }
    return [mx, my]
  }
  intercepts (startX, startY, endX, endY) {
    const [x1, y1] = this.intercept(startX, startY, endX, endY)
    const [x0, y0] = this.intercept(endX, endY, startX, startY)
    return { x0, y0, x1, y1 }
  }
}
