import { ActionsHex } from './actionHex.js'
import { lazy } from '../../core/utilities.js'
import { buildTransformHexMaps } from './buildTransformHexMaps.js'
import { Indexer } from '../indexer.js'
import { Connect6 } from './Connect6.js'
import { HexNormalCover } from './HexNormalCover.js'
import { HexHalfCover } from './HexHalfCover.js'
import { HexSuperCover } from './HexSuperCover.js'

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
    this.connection = {
      6: new Connect6(this)
    }
    lazy(this, 'transformMaps', () => {
      return buildTransformHexMaps(
        this.coords,
        this.index.bind(this),
        this.size
      )
    })

    this.cover = {
      normal: new HexNormalCover(this),
      half: new HexHalfCover(this),
      super: new HexSuperCover(this)
    }

    this._installIndexIteratorWrappers()
    this._boundaryExitCondition = this._createBoundaryExitCondition()
  }
  index (q, r) {
    return this.qrToI.get(`${q},${r}`)
  }
  indexQR (q, r) {
    return this.index(q, r)
  }
  indexQS (q, s) {
    return this.index(q, CubeIndex.qsToR(q, s))
  }
  indexRS (r, s) {
    return this.index(CubeIndex.rsToQ(r, s), r)
  }
  location (i) {
    return this.iToQrs.get(i)
  }

  isValid (q, r, s) {
    return this.qrsToI.has(`${q},${r},${s}`)
  }
  isValidQR (q, r) {
    return this.qrToI.has(`${q},${r}`)
  }
  isValidQS (q, s) {
    return this.isValidQR(q, CubeIndex.qsToR(q, s))
  }
  isValidRS (r, s) {
    return this.isValidQR(CubeIndex.rsToQ(r, s), r)
  }
  /**
   * Override boundary exit condition to handle 3D cube coordinates.
   * Converts (q, r) to (q, r, s) before checking validity.
   */
  _createBoundaryExitCondition () {
    if (!this._boundaryExitCondition) {
      this._boundaryExitCondition = (q, r) => {
        const s = -q - r
        return !this.isValid(q, r, s)
      }
    }
    return this._boundaryExitCondition
  }

  /**
   * Gets neighbors or area from a specific connection type
   * @param {string|number} connectionKey - Connection type key
   * @param {string} methodName - Method name ('neighbors' or 'area')
   * @param {number} q - Q coordinate
   * @param {number} r - R coordinate
   * @returns {Array} Neighbor coordinates or area coordinates
   * @private
   */
  _getConnectionResult (connectionKey, methodName, q, r) {
    return this.connection[connectionKey][methodName](q, r)
  }

  neighbors (q, r) {
    return this._getConnectionResult(6, 'neighbors', q, r)
  }

  area (q, r) {
    return this._getConnectionResult(6, 'area', q, r)
  }

  direction (start, end) {
    return this._getConnectionResult(6, 'direction', start, end)
  }

  _axisStepVector (axis, sign, currentQ, currentR, targetQ, targetR) {
    const targetS = CubeIndex.qrToS(targetQ, targetR)
    const currentS = CubeIndex.qrToS(currentQ, currentR)
    const candidates = this._axisStepCandidates(axis, sign)
    let bestCandidate = candidates[0]
    let bestDistance = Number.POSITIVE_INFINITY

    for (const [dq, dr] of candidates) {
      const nextQ = currentQ + dq
      const nextR = currentR + dr
      const nextS = CubeIndex.qrToS(nextQ, nextR)
      const dQ = targetQ - nextQ
      const dR = targetR - nextR
      const dS = targetS - nextS
      const distance = dQ * dQ + dR * dR + dS * dS
      if (distance < bestDistance) {
        bestDistance = distance
        bestCandidate = [dq, dr]
      }
    }
    return bestCandidate
  }

  _axisStepCandidates (axis, sign) {
    switch (axis) {
      case 'q':
        return sign === 1
          ? [
              [1, 0],
              [1, -1]
            ]
          : [
              [-1, 0],
              [-1, 1]
            ]
      case 'r':
        return sign === 1
          ? [
              [0, 1],
              [-1, 1]
            ]
          : [
              [0, -1],
              [1, -1]
            ]
      case 's':
        return sign === 1
          ? [
              [-1, 0],
              [0, -1]
            ]
          : [
              [1, 0],
              [0, 1]
            ]
      default:
        return [[0, 0]]
    }
  }

  _cubeRound (q, r, s) {
    let rq = Math.round(q)
    let rr = Math.round(r)
    let rs = Math.round(s)

    const qDiff = Math.abs(rq - q)
    const rDiff = Math.abs(rr - r)
    const sDiff = Math.abs(rs - s)

    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs
    } else if (rDiff > sDiff) {
      rr = -rq - rs
    } else {
      rs = -rq - rr
    }

    return [rq, rr]
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

  // ============================================================================
  // Bresenham Line Drawing (Reusable pattern across all indexers)
  // ============================================================================

  /**
   * Detects and yields corner-crossing cells for super-cover algorithm.
   * Delegates to cover.super implementation for consistency.
   */
  *yieldSuperCoverCornerCells (...args) {
    return yield* this.cover.super.yieldSuperCoverCornerCells(...args)
  }

  /**
   * Detects and yields corner-crossing cells for half-cover algorithm.
   * Delegates to cover.half implementation for consistency.
   */
  *yieldHalfCoverCornerCells (...args) {
    return yield* this.cover.half.yieldHalfCoverCornerCells(...args)
  }

  /**
   * Apply offset to all bits in a bitboard container
   * @param {Object} bbc - Bitboard container with store and bits
   * @param {number} dq - Q-axis offset
   * @param {number} dr - R-axis offset
   * @returns {bigint} New bitboard with offset applied
   */
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

  static qrToS (q, r) {
    return -q - r
  }

  static qsToR (q, s) {
    return -q - s
  }

  static rsToQ (r, s) {
    return -r - s
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
