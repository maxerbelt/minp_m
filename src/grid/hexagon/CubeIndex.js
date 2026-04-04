import { ActionsHex } from './actionHex.js'
import { lazy } from '../../core/utilities.js'
import { buildTransformHexMaps } from './buildTransformHexMaps.js'
import { Indexer, deltaAndDirection } from '../indexer.js'

function direction (endX, startX, endY, startY) {
  const dxDir = endX - startX
  const dyDir = endY - startY
  return { dxDir, dyDir }
}

function bresenhamStep (
  errorTerm,
  deltaQ,
  deltaR,
  currentQ,
  currentR,
  stepQ,
  stepR
) {
  const doubledError = errorTerm << 1
  const moveInQ = +(doubledError > -deltaR)
  const moveInR = +(doubledError < deltaQ)
  currentQ += moveInQ * stepQ
  currentR += moveInR * stepR
  errorTerm -= moveInQ * deltaR
  errorTerm += moveInR * deltaQ
  return { errorTerm, currentQ, currentR }
}

/**
 * Bresenham step that tracks movement direction for corner detection.
 * Used by super-cover and half-cover algorithms that need to detect
 * when both axes move simultaneously (corner crossing).
 */
function bresenhamStepMove (
  errorTerm,
  deltaQ,
  deltaR,
  currentQ,
  currentR,
  stepQ,
  stepR
) {
  const doubledError = errorTerm << 1
  const moveInQ = +(doubledError > -deltaR)
  const moveInR = +(doubledError < deltaQ)
  currentQ += moveInQ * stepQ
  currentR += moveInR * stepR
  errorTerm -= moveInQ * deltaR
  errorTerm += moveInR * deltaQ
  return { errorTerm, currentQ, currentR, moveInQ, moveInR }
}

const cache = new Map()

function buildCube (radius) {
  const coords = []
  const qrsToI = new Map()
  const qrToI = new Map()
  const iToQrs = new Map()
  let i = 0

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r
      if (Math.abs(s) <= radius) {
        coords.push([q, r, s])
        qrsToI.set(`${q},${r},${s}`, i)
        qrToI.set(`${q},${r}`, i)
        iToQrs.set(i, [q, r, s])
        i++
      }
    }
  }
  return { coords, qrsToI, qrToI, iToQrs, size: i }
}

const neighbors = {
  E: [+1, 0, -1],
  W: [-1, 0, +1],
  SE: [0, +1, -1],
  NW: [0, -1, +1],
  SW: [-1, +1, 0],
  NE: [+1, -1, 0]
}

const area = {
  C: [0, 0, 0],
  E: [+1, 0, -1],
  W: [-1, 0, +1],
  SE: [0, +1, -1],
  NW: [0, -1, +1],
  SW: [-1, +1, 0],
  NE: [+1, -1, 0]
}

const neighborValues = Object.values(neighbors)

const areaValues = Object.values(area)

export class CubeIndex extends Indexer {
  constructor (radius) {
    const { coords, qrsToI, qrToI, iToQrs, size } = buildCube(radius)
    super(size)
    this.radius = radius

    this.coords = coords
    this.qrsToI = qrsToI
    this.qrToI = qrToI
    this.iToQrs = iToQrs
    this.size = size
    lazy(this, 'transformMaps', () => {
      return buildTransformHexMaps(
        this.coords,
        this.index.bind(this),
        this.size
      )
    })

    // ============================================================================
    // CONCEPT: Automatically generate Indices wrappers from base methods
    // ============================================================================
    // Each wrapper appends this.index as the indexer parameter to the base method.
    // This eliminates nearly-identical manual wrapper method implementations.
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
  index (q, r, s) {
    if (s === undefined) {
      return this.qrToI.get(`${q},${r}`)
    } else {
      return this.qrsToI.get(`${q},${r},${s}`)
    }
  }
  location (i) {
    return this.iToQrs.get(i)
  }

  isValid (q, r, s) {
    return this.qrsToI.has(`${q},${r},${s}`)
  }

  /**
   * Override boundary exit condition to handle 3D cube coordinates.
   * Converts (q, r) to (q, r, s) before checking validity.
   */
  _createBoundaryExitCondition () {
    return (q, r) => {
      const s = -q - r
      return !this.isValid(q, r, s)
    }
  }

  neighbors (q, r) {
    return neighborValues.map(([qq, rr]) => [q + qq, r + rr])
  }
  area (q, r) {
    return areaValues.map(([qq, rr]) => [q + qq, r + rr])
  }

  *entries (bb) {
    for (const [loc, i] of this.qrsToI) {
      yield [...loc, bb.at(...loc), i, bb]
    }
  }

  *rows () {
    for (let r = -this.radius; r <= this.radius; r++) {
      yield r
    }
  }
  rowPadding (r) {
    return ' '.repeat(Math.abs(r))
  }
  cellPadding () {
    return ' '
  }
  *row (r) {
    for (let q = -this.radius; q <= this.radius; q++) {
      const s = -q - r
      if (this.isValid(q, r, s)) {
        yield [q, r, s]
      }
    }
  }
  *values (bb) {
    for (const loc of this.qrsToI) {
      yield bb.at(...loc)
    }
  }

  get actions () {
    if (this._actions && this._actions?.original?.bits === this.bits) {
      return this._actions
    }
    this._actions = new ActionsHex(this.radius, this)
    return this._actions
  }

  applyOffset (bbc, dq, dr) {
    let out = bbc.store.empty
    for (const i of this.bitsIndices(bbc.bits)) {
      const [q, r] = this.iToQrs.get(i)
      const nq = q + dq
      const nr = r + dr
      const ns = -nq - nr
      const j = this.index(nq, nr, ns)
      if (j !== undefined) {
        out = bbc.store.setIdx(out, j, 1n)
      }
    }
    return out
  }

  // ------------------------------------------------------------------
  // neighbor/axis lookup maps (used for morphology helpers)
  // ------------------------------------------------------------------
  /**
   * Map from index -> array of neighbor indices (6 directions).
   * computed lazily and cached on the instance.
   */
  get neighborMap () {
    if (!this._neighborMap) {
      this._neighborMap = buildHexNeighborMap(this)
    }
    return this._neighborMap
  }

  /**
   * Maps for each of the three hex axes used by separable operations.
   */
  get axisMaps () {
    if (!this._axisMaps) {
      this._axisMaps = buildHexAxisMaps(this)
    }
    return this._axisMaps
  }

  // ------------------------------------------------------------------
  // convenience wrappers around the exported free functions.  callers
  // need only supply a bitboard (Uint32Array) and radius; the indexer
  // provides the correct maps automatically and default helpers handle
  // cloning/merging.
  // ------------------------------------------------------------------
  dilateHexManhattan (
    board,
    radius,
    bitOrInto = (dest, src) => {
      for (let i = 0; i < dest.length; i++) dest[i] |= src[i]
    }
  ) {
    return dilateHexManhattan(board, radius, this.neighborMap, bitOrInto)
  }

  dilateHexSeparable (board, radius, store) {
    return dilateHexSeparable(board, radius, this.axisMaps, store)
  }

  erodeHexSeparable (board, radius, store) {
    return erodeHexSeparable(board, radius, this.axisMaps, store)
  }

  setRange (bb, y, left, right, mode = 'or') {
    for (let x = left; x <= right; x++) {
      const shifted = this.bitMask(x, y)
      if (mode === 'or') {
        bb |= shifted
      } else if (mode === 'and') {
        bb &= shifted
      } else if (mode === 'xor') {
        bb ^= shifted
      } else if (mode === 'copy') {
        bb = (bb & ~shifted) | shifted
      }
    }
    return bb
  }
  erode (board, radius = 1, store) {
    return erodeHexManhattan(board, radius, this.neighborMap, store)
  }

  // ============================================================================
  // CONCEPT: Bresenham Line Drawing (Reusable pattern across all indexers)
  // ============================================================================

  /**
   * Core Bresenham line without corner detection.
   * Used by standard line algorithm.
   */
  *line (startQ, startR, endQ, endR, exitCondition) {
    exitCondition = this._ensureExitCondition(exitCondition, endQ, endR)
    // Delta and direction setup
    const { deltaX, deltaY, stepX, stepY } = deltaAndDirection(
      endQ,
      startQ,
      endR,
      startR
    )

    // Special case: start == end, return empty (no line segment to draw)
    if (deltaX === 0 && deltaY === 0) {
      return
    }

    // Bresenham error accumulator
    let errorTerm = deltaX - deltaY

    // Current traversal position
    let currentQ = startQ
    let currentR = startR
    let step = 1
    // Main traversal loop
    while (true) {
      // Bounds check using unsigned comparison trick (avoids two separate >= 0 checks)
      const s = -currentQ - currentR
      if (!this.isValid(currentQ, currentR, s)) {
        break
      }
      if (step > 60) {
        console.warn(
          `Bresenham line exceeded 60 steps, likely infinite loop.  Current position: (${currentQ}, ${currentR}), end position: (${endQ}, ${endR})`
        )
        break
      }
      yield [currentQ, currentR, step]
      step++
      // Exit condition
      if (exitCondition(currentQ, currentR, step)) break
      ;({ errorTerm, currentQ, currentR } = bresenhamStep(
        errorTerm,
        deltaX,
        deltaY,
        currentQ,
        currentR,
        stepX,
        stepY
      ))
    }
  }

  /**
   * Super-cover line: emits all cells touched by the line segment.
   * Detects corner crossings and emits extra cells when both axes move simultaneously.
   */
  *superCoverLine (startQ, startR, endQ, endR, exitCondition) {
    exitCondition = this._ensureExitCondition(exitCondition, endQ, endR)
    // Delta and direction setup
    const { deltaX, deltaY, stepX, stepY } = deltaAndDirection(
      endQ,
      startQ,
      endR,
      startR
    )

    // Bresenham error accumulator
    let errorTerm = deltaX - deltaY

    // Current traversal position
    let currentQ = startQ
    let currentR = startR
    let step = 1
    let moveInQ = 0
    let moveInR = 0
    // Main traversal loop
    while (true) {
      // Bounds check
      const s = -currentQ - currentR
      if (!this.isValid(currentQ, currentR, s)) {
        break
      }
      if (step > 60) {
        console.warn(
          `Bresenham line exceeded 60 steps, likely infinite loop.  Current position: (${currentQ}, ${currentR}), end position: (${endQ}, ${endR})`
        )
        break
      }
      yield [currentQ, currentR, step]
      step++
      // Exit condition
      if (exitCondition(currentQ, currentR, step)) break

      // Store previous position (needed for supercover extras)
      const previousQ = currentQ
      const previousR = currentR

      ;({ errorTerm, currentQ, currentR, moveInQ, moveInR } = bresenhamStepMove(
        errorTerm,
        deltaX,
        deltaY,
        currentQ,
        currentR,
        stepX,
        stepY
      ))

      // Emit extra cells when corner crossing detected
      step = yield* this.yieldSuperCoverCornerCells(
        moveInQ,
        moveInR,
        previousQ,
        stepX,
        previousR,
        stepY,
        step
      )
    }
  }

  /**
   * Half-cover line: emits cells with rightward bias at corners.
   * Detects corner crossings but only emits one extra cell per corner (with bias).
   */
  *halfCoverLine (startQ, startR, endQ, endR, exitCondition) {
    exitCondition = this._ensureExitCondition(exitCondition, endQ, endR)

    // Delta and direction setup
    const { deltaX, deltaY, stepX, stepY } = deltaAndDirection(
      endQ,
      startQ,
      endR,
      startR
    )

    // Bresenham error accumulator
    let errorTerm = deltaX - deltaY

    // Current traversal position
    let currentQ = startQ
    let currentR = startR
    let step = 1
    let moveInQ = 0
    let moveInR = 0
    // Main traversal loop
    while (true) {
      // Bounds check
      const s = -currentQ - currentR
      if (!this.isValid(currentQ, currentR, s)) {
        break
      }
      if (step > 60) {
        console.warn(
          `Bresenham line exceeded 60 steps, likely infinite loop.  Current position: (${currentQ}, ${currentR}), end position: (${endQ}, ${endR})`
        )
        break
      }
      yield [currentQ, currentR, step]
      step++
      // Exit condition
      if (exitCondition(currentQ, currentR, step)) break

      // Store previous position (needed for half cover extras)
      const previousQ = currentQ
      const previousR = currentR

      ;({ errorTerm, currentQ, currentR, moveInQ, moveInR } = bresenhamStepMove(
        errorTerm,
        deltaX,
        deltaY,
        currentQ,
        currentR,
        stepX,
        stepY
      ))

      // Emit extra cells when corner crossing detected (max 1 cell for half-cover)
      step = yield* this.yieldHalfCoverCornerCells(
        moveInQ,
        moveInR,
        previousQ,
        stepX,
        previousR,
        stepY,
        step
      )
    }
  }

  // ============================================================================
  // CONCEPT: Corner Crossing Detection (Algorithm-specific handlers)
  // ============================================================================

  /**
   * Detects and yields corner-crossing cells for super-cover algorithm.
   * Pattern: Both axes moved = diagonal step = corner was crossed.
   */
  *yieldSuperCoverCornerCells (
    moveInQ,
    moveInR,
    previousQ,
    stepQ,
    previousR,
    stepR,
    step
  ) {
    const crossedCorner = moveInQ & moveInR

    if (crossedCorner) {
      const extraCell1Q = previousQ + stepQ
      const extraCell1R = previousR

      const extraCell2Q = previousQ
      const extraCell2R = previousR + stepR

      const s1 = -extraCell1Q - extraCell1R
      if (this.isValid(extraCell1Q, extraCell1R, s1)) {
        yield [extraCell1Q, extraCell1R, step]
        step++
      }
      const s2 = -extraCell2Q - extraCell2R
      if (this.isValid(extraCell2Q, extraCell2R, s2)) {
        yield [extraCell2Q, extraCell2R, step]
        step++
      }
    }
    return step
  }

  /**
   * Detects and yields corner-crossing cells for half-cover algorithm.
   * Half-cover only emits one extra cell (with Q-direction bias).
   */
  *yieldHalfCoverCornerCells (
    moveInQ,
    moveInR,
    previousQ,
    stepQ,
    previousR,
    stepR,
    step
  ) {
    const crossedCorner = moveInQ & moveInR

    if (crossedCorner) {
      const extraCell1Q = previousQ + stepQ
      const extraCell1R = previousR

      const extraCell2Q = previousQ
      const extraCell2R = previousR + stepR

      const right = this.isValid(
        extraCell1Q,
        extraCell1R,
        -extraCell1Q - extraCell1R
      )
      if (right) {
        yield [extraCell1Q, extraCell1R, step]
        step++
        return step
      }

      const below = this.isValid(
        extraCell2Q,
        extraCell2R,
        -extraCell2Q - extraCell2R
      )
      if (below) {
        yield [extraCell2Q, extraCell2R, step]
        step++
      }
    }
    return step
  }

  // ============================================================================
  // CONCEPT: Ray Casting (Start from a point, traverse until boundary)
  // ============================================================================

  *ray (startQ, startR, endQ, endR) {
    return yield* this.line(
      startQ,
      startR,
      endQ,
      endR,
      this._createBoundaryExitCondition()
    )
  }

  *superCoverRay (startQ, startR, endQ, endR) {
    return yield* this.superCoverLine(
      startQ,
      startR,
      endQ,
      endR,
      this._createBoundaryExitCondition()
    )
  }

  *halfCoverRay (startQ, startR, endQ, endR) {
    return yield* this.halfCoverLine(
      startQ,
      startR,
      endQ,
      endR,
      this._createBoundaryExitCondition()
    )
  }

  // ============================================================================
  // CONCEPT: Shape-Specific Segment Methods (segmentTo and fullLine variants)
  // ============================================================================

  *segmentTo (startQ, startR, endQ, endR) {
    return yield* this.line(
      startQ,
      startR,
      endQ,
      endR,
      this._createEndpointExitCondition(endQ, endR)
    )
  }

  *superCoverSegmentTo (startQ, startR, endQ, endR) {
    return yield* this.superCoverLine(
      startQ,
      startR,
      endQ,
      endR,
      this._createEndpointExitCondition(endQ, endR)
    )
  }

  *halfCoverSegmentTo (startQ, startR, endQ, endR) {
    return yield* this.halfCoverLine(
      startQ,
      startR,
      endQ,
      endR,
      this._createEndpointExitCondition(endQ, endR)
    )
  }

  *fullLine (startQ, startR, endQ, endR) {
    const { x0, y0, x1, y1 } = this.intercepts(startQ, startR, endQ, endR)
    return yield* this.segmentTo(x0, y0, x1, y1)
  }

  *superCoverFullLine (startQ, startR, endQ, endR) {
    const { x0, y0, x1, y1 } = this.intercepts(startQ, startR, endQ, endR)
    return yield* this.superCoverSegmentTo(x0, y0, x1, y1)
  }

  *halfCoverFullLine (startQ, startR, endQ, endR) {
    const { x0, y0, x1, y1 } = this.intercepts(startQ, startR, endQ, endR)
    return yield* this.halfCoverSegmentTo(x0, y0, x1, y1)
  }

  // ============================================================================
  // CONCEPT: Distance-Limited Segments (segmentFor variants)
  // ============================================================================

  *segmentFor (startQ, startR, endQ, endR, distance) {
    return yield* this.line(
      startQ,
      startR,
      endQ,
      endR,
      this._createDistanceLimitExitCondition(distance)
    )
  }

  *superCoverSegmentFor (startQ, startR, endQ, endR, distance) {
    return yield* this.superCoverLine(
      startQ,
      startR,
      endQ,
      endR,
      this._createDistanceLimitExitCondition(distance)
    )
  }

  *halfCoverSegmentFor (startQ, startR, endQ, endR, distance) {
    return yield* this.halfCoverLine(
      startQ,
      startR,
      endQ,
      endR,
      this._createDistanceLimitExitCondition(distance)
    )
  }

  intercept (startQ, startR, endQ, endR) {
    let mq = startQ
    let mr = startR

    for (const [q, r] of this.ray(startQ, startR, endQ, endR)) {
      mq = q
      mr = r
    }
    return [mq, mr]
  }

  intercepts (startQ, startR, endQ, endR) {
    const [q1, r1] = this.intercept(startQ, startR, endQ, endR)
    const [q0, r0] = this.intercept(endQ, endR, startQ, startR)
    return { x0: q0, y0: r0, x1: q1, y1: r1 }
  }

  static getInstance (radius) {
    if (cache.has(radius)) {
      return cache.get(radius)
    }

    const cube = new CubeIndex(radius)
    cache.set(radius, cube)
    return cube
  }

  dilate (board, radius = 1, store) {
    return dilateHexManhattan(board, radius, this.neighborMap, store)
  }
}

const AXIS_DIRS = [
  [
    [1, -1, 0],
    [-1, 1, 0]
  ], // q axis
  [
    [1, 0, -1],
    [-1, 0, 1]
  ], // r axis
  [
    [0, 1, -1],
    [0, -1, 1]
  ] // s axis
]

const axisCache = new Map()
function buildHexAxisMaps (indexer) {
  if (axisCache.has(indexer.radius)) {
    return axisCache.get(indexer.radius)
  }

  const maps = []

  for (const axis of AXIS_DIRS) {
    const axisMap = new Array(indexer.size)

    for (let i = 0; i < indexer.size; i++) {
      const [q, r, s] = indexer.location(i)
      const list = []

      for (const [dq, dr, ds] of axis) {
        const j = indexer.index(q + dq, r + dr, s + ds)
        if (j !== undefined) list.push(j)
      }
      axisMap[i] = list
    }
    maps.push(axisMap)
  }
  axisCache.set(indexer.radius, maps)
  return maps
}
const HEX_DIRS = [
  [1, -1, 0],
  [-1, 1, 0],
  [1, 0, -1],
  [-1, 0, 1],
  [0, 1, -1],
  [0, -1, 1]
]
const nbCache = new Map()
function buildHexNeighborMap (indexer) {
  if (nbCache.has(indexer.radius)) {
    return nbCache.get(indexer.radius)
  }
  const n = indexer.size
  const neighbors = new Array(n)

  for (let i = 0; i < n; i++) {
    const [q, r, s] = indexer.location(i)

    const list = []
    for (const [dq, dr, ds] of HEX_DIRS) {
      const j = indexer.index(q + dq, r + dr, s + ds)
      if (j !== undefined) list.push(j)
    }
    neighbors[i] = list
  }
  nbCache.set(indexer.radius, neighbors)
  return neighbors
}

function propagateFromNeighbors (src, neighborMap, store) {
  // propagate bits from each set source position into its neighbors
  let out = store.createEmptyBitboard(src)

  for (let i = 0; i < neighborMap.length; i++) {
    if (!store.getIdx(src, i)) continue

    for (const j of neighborMap[i]) {
      out = store.setIdx(out, j, 1)
    }
  }
  return out
}
export function dilateHexManhattan (board, radius, neighborMap, store) {
  let result = store.clone(board)

  for (let r = 0; r < radius; r++) {
    const grow = propagateFromNeighbors(result, neighborMap, store)
    result = store.bitOr(result, grow)
  }
  return result
}
export function dilateHexSeparable (board, radius, axisMaps, store) {
  let result = store.clone(board)

  for (const axis of axisMaps) {
    for (let r = 0; r < radius; r++) {
      const grow = propagateFromNeighbors(result, axis, store)
      result = store.bitOr(result, grow)
    }
  }
  return result
}
function erodeAxisStep (src, axisMap, store) {
  let out = store.createEmptyBitboard(src)

  for (let i = 0; i < axisMap.length; i++) {
    if (!store.getIdx(src, i)) continue

    let ok = true
    for (const j of axisMap[i]) {
      if (!store.getIdx(src, j)) {
        ok = false
        break
      }
    }
    if (ok) out = store.setIdx(out, i, 1)
  }
  return out
}
function erodeAxisStepManhattan (src, neighborMap, store) {
  // Erosion using all 6 neighbors (Manhattan distance)
  let out = store.createEmptyBitboard(src)

  for (let i = 0; i < neighborMap.length; i++) {
    if (!store.getIdx(src, i)) continue

    let ok = true
    for (const j of neighborMap[i]) {
      if (!store.getIdx(src, j)) {
        ok = false
        break
      }
    }
    if (ok) {
      const result = store.setIdx(out, i, 1)
      // setIdx may return the updated bitboard (StoreBig) or mutate in-place (Uint32Array)
      if (result !== undefined) {
        out = result
      }
    }
  }
  return out
}
export function erodeHexManhattan (board, radius, neighborMap, store) {
  let result = store.clone(board)

  for (let r = 0; r < radius; r++) {
    result = erodeAxisStepManhattan(result, neighborMap, store)
  }
  return result
}
export function erodeHexSeparable (board, radius, axisMaps, store) {
  let result = store.clone(board)

  for (const axis of axisMaps) {
    for (let r = 0; r < radius; r++) {
      result = erodeAxisStep(result, axis, store)
    }
  }
  return result
}
