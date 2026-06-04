/**
 * @fileoverview Hexagonal Grid Indexing using Cube Coordinates
 *
 * Implements cube coordinate system for hexagonal grids with support for
 * efficient spatial indexing, neighbor finding, line drawing, and morphological operations.
 *
 * @module grid/hexagon/CubeIndex
 */

import { ActionsHex } from './actionHex.js'
import { lazy } from '../../core/utilities.js'
import { buildTransformHexMaps } from './buildTransformHexMaps.js'
import { Indexer } from '../indexer.js'
import { Connect6 } from './Connect6.js'
import { HexNormalCover } from './HexNormalCover.js'
import { HexHalfCover } from './HexHalfCover.js'
import { HexSuperCover } from './HexSuperCover.js'

/**
 * Cube coordinate as [q, r, s] tuple where q + r + s = 0
 * @typedef {[number, number, number]} CubeCoord
 */

/**
 * Cube coordinate pair [q, r] (s is computed as -q - r)
 * @typedef {[number, number]} QRCoord
 */

/**
 * Neighbor indices for each hex cell (array of arrays where each subarray is neighbor list)
 * @typedef {number[][]} NeighborMap
 */

/**
 * Axis direction maps for separable morphology operations (array of neighbor maps per axis)
 * @typedef {number[][][]} AxisMaps
 */

/**
 * Result from buildCube: cube coordinate mappings and metadata
 * @typedef {Object} CubeData
 * @property {Array<CubeCoord>} coords - All valid cube coordinates in radius
 * @property {Map<string, number>} qrsToI - Map from "q,r,s" string to index
 * @property {Map<string, number>} qrToI - Map from "q,r" string to index
 * @property {Map<number, CubeCoord>} iToQrs - Map from index to [q,r,s]
 * @property {number} size - Total number of cells
 */

/** @type {Map<number, CubeIndex>} */
const cache = new Map()

/**
 * Builds cube coordinate system for a given radius.
 * Generates all valid hex cells within radius and creates bidirectional mappings.
 *
 * @param {number} radius - Maximum distance from origin in cube coordinates
 * @returns {CubeData} Object containing coordinate arrays and lookup maps
 * @private
 */
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
  // @ts-ignore - coords is array of [number, number, number] tuples (CubeCoord)
  return { coords, qrsToI, qrToI, iToQrs, size: i }
}

/**
 * Hexagonal grid indexer using cube coordinates (q, r, s).
 * Provides efficient spatial indexing and neighbor finding for hexagonal grids.
 *
 * @class CubeIndex
 * @extends {Indexer}
 */
export class CubeIndex extends Indexer {
  /**
   * Creates a CubeIndex for a hex grid of given radius.
   * Builds coordinate mappings, neighbor connections, and transformation maps.
   *
   * @param {number} radius - Maximum distance from origin (determines grid size)
   */
  constructor (radius) {
    const { coords, qrsToI, qrToI, iToQrs, size } = buildCube(radius)
    super(size)

    /** @type {number} - Hex grid radius */
    this.radius = radius

    /** @type {CubeCoord[]} - All valid cube coordinates in grid */
    this.coords = coords

    /** @type {Map<string, number>} - Lookup: "q,r,s" string -> index */
    this.qrsToI = qrsToI

    /** @type {Map<string, number>} - Lookup: "q,r" string -> index */
    this.qrToI = qrToI

    /** @type {Map<number, CubeCoord>} - Lookup: index -> [q,r,s] */
    this.iToQrs = iToQrs

    /** @type {number} - Total cells in grid */
    this.size = size

    /** @type {Object} - Connection graph indexed by neighbor count */
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

    /** @type {Object} - Line cover algorithms for hex rasterization */
    this.cover = {
      normal: new HexNormalCover(this),
      half: new HexHalfCover(this),
      super: new HexSuperCover(this)
    }

    // @ts-ignore - Calling protected parent method for iterator setup
    this._installIndexIteratorWrappers()
    /** @type {function(number, number): boolean|undefined} */
    this._boundaryExitCondition = undefined
  }

  /**
   * Gets index for cube coordinates [q, r] (s computed as -q - r)
   *
   * @param {number} q - Q coordinate (axial)
   * @param {number} r - R coordinate (axial)
   * @returns {number|undefined} Index if valid, undefined if out of bounds
   * @override
   */
  // @ts-ignore - Signature differs from parent (3D cube coords vs 2D)
  index (q, r) {
    return this.qrToI.get(`${q},${r}`)
  }

  /**
   * Alias for index() using explicit QR notation.
   *
   * @param {number} q - Q coordinate
   * @param {number} r - R coordinate
   * @returns {number|undefined} Cell index
   */
  indexQR (q, r) {
    return this.index(q, r)
  }

  /**
   * Gets index for QS coordinates (converts to QR).
   *
   * @param {number} q - Q coordinate
   * @param {number} s - S coordinate
   * @returns {number|undefined} Cell index
   */
  indexQS (q, s) {
    return this.index(q, CubeIndex.qsToR(q, s))
  }

  /**
   * Gets index for RS coordinates (converts to QR).
   *
   * @param {number} r - R coordinate
   * @param {number} s - S coordinate
   * @returns {number|undefined} Cell index
   */
  indexRS (r, s) {
    return this.index(CubeIndex.rsToQ(r, s), r)
  }

  /**
   * Gets cube coordinates for cell at given index.
   *
   * @param {number} i - Cell index
   * @returns {CubeCoord|undefined} [q, r, s] or undefined if invalid
   * @override
   */
  // @ts-ignore - Signature differs from parent (returns CubeCoord vs Coordinate)
  location (i) {
    return this.iToQrs.get(i)
  }

  /**
   * Checks if cube coordinates are valid in this grid.
   *
   * @param {number} q - Q coordinate
   * @param {number} r - R coordinate
   * @param {number} s - S coordinate
   * @returns {boolean} True if cell exists in grid
   * @override
   */
  // @ts-ignore - Signature differs from parent (3 coords vs 2)
  isValid (q, r, s) {
    return this.qrsToI.has(`${q},${r},${s}`)
  }

  /**
   * Checks if QR coordinates are valid (doesn't verify s).
   *
   * @param {number} q - Q coordinate
   * @param {number} r - R coordinate
   * @returns {boolean} True if cell exists
   */
  isValidQR (q, r) {
    return this.qrToI.has(`${q},${r}`)
  }

  /**
   * Checks if QS coordinates are valid.
   *
   * @param {number} q - Q coordinate
   * @param {number} s - S coordinate
   * @returns {boolean} True if cell exists
   */
  isValidQS (q, s) {
    return this.isValidQR(q, CubeIndex.qsToR(q, s))
  }

  /**
   * Checks if RS coordinates are valid.
   *
   * @param {number} r - R coordinate
   * @param {number} s - S coordinate
   * @returns {boolean} True if cell exists
   */
  isValidRS (r, s) {
    return this.isValidQR(CubeIndex.rsToQ(r, s), r)
  }

  /**
   * Creates boundary exit condition for pathfinding.
   * Converts (q, r) to 3D cube and checks validity.
   *
   * @returns {Function} Function to test if coords out of bounds
   * @private
   */
  _createBoundaryExitCondition () {
    if (!this._boundaryExitCondition) {
      this._boundaryExitCondition = (
        /** @type {number} */ q,
        /** @type {number} */ r
      ) => {
        const s = -q - r
        return !this.isValid(q, r, s)
      }
    }
    return this._boundaryExitCondition
  }

  /**
   * Gets all 6 hex neighbors for a cell.
   *
   * @param {number} q - Q coordinate
   * @param {number} r - R coordinate
   * @returns {number[]} Indices of neighboring cells
   */
  neighbors (q, r) {
    // @ts-ignore - Calling protected parent method
    return this._getConnectionResult(6, 'neighbors', q, r)
  }

  /**
   * Gets area covered by all cells within radius distance.
   *
   * @param {number} q - Q coordinate
   * @param {number} r - R coordinate
   * @returns {number[]} Indices in area
   */
  area (q, r) {
    // @ts-ignore - Calling protected parent method
    return this._getConnectionResult(6, 'area', q, r)
  }

  /**
   * Gets direction from one cell to another.
   *
   * @param {number} start - Starting cell index or coordinate
   * @param {number} end - Ending cell index or coordinate
   * @returns {number} Direction indicator
   */
  direction (start, end) {
    // @ts-ignore - Calling protected parent method
    return this._getConnectionResult(6, 'direction', start, end)
  }

  /**
   * Finds best step vector along axis to move toward target.
   * Used for pathfinding and line drawing.
   *
   * @param {string} axis - Axis to step along ('q', 'r', or 's')
   * @param {number} sign - Direction (-1 or 1)
   * @param {number} currentQ - Current Q coordinate
   * @param {number} currentR - Current R coordinate
   * @param {number} targetQ - Target Q coordinate
   * @param {number} targetR - Target R coordinate
   * @returns {[number, number]} [dq, dr] step vector
   * @private
   */
  _axisStepVector (axis, sign, currentQ, currentR, targetQ, targetR) {
    const targetS = CubeIndex.qrToS(targetQ, targetR)
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

  /**
   * Gets candidate step vectors for moving along an axis in a direction.
   *
   * @param {string} axis - Axis identifier ('q', 'r', or 's')
   * @param {number} sign - Direction sign (-1 or 1)
   * @returns {Array<[number, number]>} Array of [dq, dr] candidates
   * @private
   */
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

  /**
   * Rounds floating-point hex coordinates to nearest valid integer coordinates.
   * Maintains constraint that q + r + s = 0.
   *
   * @param {number} q - Q coordinate (may be fractional)
   * @param {number} r - R coordinate (may be fractional)
   * @param {number} s - S coordinate (may be fractional)
   * @returns {QRCoord} [rq, rr] rounded to integers maintaining sum constraint
   */
  cubeRound (q, r, s) {
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
    }

    return [rq, rr]
  }

  /**
   * Generator: yields all cells in grid with their values from bitboard.
   *
   * @param {any} bb - Bitboard container with at() method
   * @yields {Array} [q, r, s, value, index, bb]
   */
  *entries (bb) {
    for (const [loc, i] of this.qrsToI) {
      // @ts-ignore - Property 'at' may not exist on all bitboard types
      yield [...loc, bb.at(...loc), i, bb]
    }
  }

  /**
   * Generator: yields all valid row indices from -radius to +radius.
   *
   * @yields {number} Row coordinate r
   */
  *rows () {
    for (let r = -this.radius; r <= this.radius; r++) {
      yield r
    }
  }

  /**
   * Gets padding string for ASCII art display of a row.
   *
   * @param {number} r - Row coordinate
   * @returns {string} Spaces to offset row based on coordinate
   */
  rowPadding (r) {
    return ' '.repeat(Math.abs(r))
  }

  /**
   * Gets padding string between cells in ASCII art display.
   *
   * @returns {string} Single space separator
   */
  cellPadding () {
    return ' '
  }

  /**
   * Generator: yields all valid cube coordinates in a row.
   *
   * @param {number} r - Row coordinate
   * @yields {CubeCoord} [q, r, s] for each valid cell in row
   */
  *row (r) {
    for (let q = -this.radius; q <= this.radius; q++) {
      const s = -q - r
      if (this.isValid(q, r, s)) {
        yield [q, r, s]
      }
    }
  }

  /**
   * Generator: yields all cell values from bitboard.
   *
   * @param {any} bb - Bitboard container with at() method
   * @yields {*} Value at each location
   */
  *values (bb) {
    for (const loc of this.qrsToI) {
      // @ts-ignore - Property 'at' may not exist on all bitboard types
      yield bb.at(...loc)
    }
  }

  /**
   * Gets or creates cached actions controller for this grid.
   *
   * @type {ActionsHex}
   * @override
   */
  // @ts-ignore - Signature differs from parent (getter vs function)
  get actions () {
    // @ts-ignore - Property 'bits' may not exist or may vary by bitboard type
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
   * Applies offset to all bits in a bitboard container.
   * Transforms all set cells by (dq, dr) offset.
   *
   * @param {any} bbc - Bitboard container with store and bits
   * @param {number} dq - Q-axis offset
   * @param {number} dr - R-axis offset
   * @returns {bigint} New bitboard with offset applied
   */
  applyOffset (bbc, dq, dr) {
    // @ts-ignore - bbc.store and bbc.bits properties vary by bitboard type
    let out = bbc.store.empty
    // @ts-ignore - bitsIndices and other methods vary
    for (const i of this.bitsIndices(bbc.bits)) {
      const coords = this.iToQrs.get(i)
      if (!coords) continue
      const [q, r] = coords
      const nq = q + dq
      const nr = r + dr
      const ns = -nq - nr
      // @ts-ignore - index() override has 3 params
      const j = this.index(nq, nr, ns)
      if (j !== undefined) {
        // @ts-ignore - bbc.store varies by bitboard type
        out = bbc.store.setIdx(out, j, 1n)
      }
    }
    return out
  }

  // ------------------------------------------------------------------
  // neighbor/axis lookup maps (used for morphology helpers)
  // ------------------------------------------------------------------
  /**
   * Gets or creates neighbor map: index -> array of neighbor indices.
   * Computed lazily and cached on instance.
   *
   * @type {NeighborMap}
   */
  get neighborMap () {
    if (!this._neighborMap) {
      this._neighborMap = buildHexNeighborMap(this)
    }
    return this._neighborMap
  }

  /**
   * Gets or creates axis maps for separable morphology operations.
   * Maps for each of the three hex axes used by separable operations.
   *
   * @type {AxisMaps}
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
  /**
   * Dilates bitboard using Manhattan distance with custom merge function.
   *
   * @param {Object} board - Bitboard to dilate
   * @param {number} radius - Dilation radius
   * @param {function} bitOrInto - Custom merge function (default: bitwise OR)
   * @returns {Object} Dilated bitboard
   */
  dilateHexManhattan (
    board,
    radius,
    bitOrInto = (/** @type {any} */ dest, /** @type {any} */ src) => {
      for (let i = 0; i < dest.length; i++) dest[i] |= src[i]
    }
  ) {
    return dilateHexManhattan(board, radius, this.neighborMap, bitOrInto)
  }

  /**
   * Dilates bitboard using separable operations on each axis.
   *
   * @param {Object} board - Bitboard to dilate
   * @param {number} radius - Dilation radius
   * @param {Object} store - Bitboard store with operations
   * @returns {Object} Dilated bitboard
   */
  dilateHexSeparable (board, radius, store) {
    return dilateHexSeparable(board, radius, this.axisMaps, store)
  }

  /**
   * Erodes bitboard using separable operations on each axis.
   *
   * @param {Object} board - Bitboard to erode
   * @param {number} radius - Erosion radius
   * @param {Object} store - Bitboard store with operations
   * @returns {Object} Eroded bitboard
   */
  erodeHexSeparable (board, radius, store) {
    return erodeHexSeparable(board, radius, this.axisMaps, store)
  }

  /**
   * Sets range of bits in a bitboard using specified mode.
   *
   * @param {bigint} bb - Bitboard to modify
   * @param {number} y - Y coordinate (row)
   * @param {number} left - Left boundary (inclusive)
   * @param {number} right - Right boundary (inclusive)
   * @param {string} mode - Operation mode: 'or', 'and', 'xor', 'copy'
   * @returns {bigint} Modified bitboard
   */
  setRange (bb, y, left, right, mode = 'or') {
    for (let x = left; x <= right; x++) {
      // @ts-ignore - bitMask may not exist on all indexer types
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

  /**
   * Erodes bitboard by Manhattan distance.
   *
   * @param {Object} board - Bitboard to erode
   * @param {Object} store - Bitboard store with operations
   * @param {number} radius - Erosion radius (default: 1)
   * @returns {Object} Eroded bitboard
   */
  erode (board, store, radius = 1) {
    return erodeHexManhattan(board, radius, this.neighborMap, store)
  }

  // ============================================================================
  // CONCEPT: Bresenham Line Drawing (Reusable pattern across all indexers)
  // ============================================================================

  /**
   * Converts QR coordinates to S coordinate.
   * Maintains cube constraint: q + r + s = 0.
   *
   * @static
   * @param {number} q - Q coordinate
   * @param {number} r - R coordinate
   * @returns {number} S coordinate
   */
  static qrToS (q, r) {
    return -q - r
  }

  /**
   * Converts QS coordinates to R coordinate.
   *
   * @static
   * @param {number} q - Q coordinate
   * @param {number} s - S coordinate
   * @returns {number} R coordinate
   */
  static qsToR (q, s) {
    return -q - s
  }

  /**
   * Converts RS coordinates to Q coordinate.
   *
   * @static
   * @param {number} r - R coordinate
   * @param {number} s - S coordinate
   * @returns {number} Q coordinate
   */
  static rsToQ (r, s) {
    return -r - s
  }

  /**
   * Gets or creates cached CubeIndex instance for given radius.
   *
   * @static
   * @param {number} radius - Grid radius
   * @returns {CubeIndex} Cached grid instance
   */
  static getInstance (radius) {
    if (cache.has(radius)) {
      // @ts-ignore - cache.get() is guaranteed to exist if cache.has() is true
      return cache.get(radius)
    }

    const cube = new CubeIndex(radius)
    cache.set(radius, cube)
    return cube
  }

  /**
   * Dilates bitboard by Manhattan distance.
   *
   * @param {Object} board - Bitboard to dilate
   * @param {Object} store - Bitboard store with operations
   * @param {number} radius - Dilation radius (default: 1)
   * @returns {Object} Dilated bitboard
   */
  dilate (board, store, radius = 1) {
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

/**
 * Builds or retrieves cached axis maps for separable morphology operations.
 * Each axis map contains neighbors along one of the three hex axes.
 *
 * @param {CubeIndex} indexer - Grid indexer instance
 * @returns {AxisMaps} Array of axis maps
 * @private
 */
function buildHexAxisMaps (indexer) {
  if (axisCache.has(indexer.radius)) {
    return axisCache.get(indexer.radius)
  }

  const maps = []

  for (const axis of AXIS_DIRS) {
    const axisMap = new Array(indexer.size)

    for (let i = 0; i < indexer.size; i++) {
      const coords = indexer.location(i)
      if (!coords) continue
      const [q, r, s] = coords
      const list = []

      for (const [dq, dr, ds] of axis) {
        // @ts-ignore - index() override has 3 params
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

/**
 * Builds or retrieves cached neighbor map for all cells in grid.
 * Maps each cell index to array of its 6 neighboring indices.
 *
 * @param {CubeIndex} indexer - Grid indexer instance
 * @returns {NeighborMap} Map of index to neighbor arrays
 * @private
 */
function buildHexNeighborMap (indexer) {
  if (nbCache.has(indexer.radius)) {
    return nbCache.get(indexer.radius)
  }
  const n = indexer.size
  const neighbors = new Array(n)

  for (let i = 0; i < n; i++) {
    const coords = indexer.location(i)
    if (!coords) continue
    const [q, r, s] = coords

    const list = []
    for (const [dq, dr, ds] of HEX_DIRS) {
      // @ts-ignore - index() override has 3 params
      const j = indexer.index(q + dq, r + dr, s + ds)
      if (j !== undefined) list.push(j)
    }
    neighbors[i] = list
  }
  nbCache.set(indexer.radius, neighbors)
  return neighbors
}

/**
 * Propagates set bits from each position to its neighbors.
 * Used as building block for dilation operations.
 *
 * @param {any} src - Source bitboard
 * @param {NeighborMap|AxisMaps} neighborMap - Neighbors for each cell
 * @param {any} store - Bitboard store with operations
 * @returns {any} New bitboard with propagated bits
 * @private
 */
function propagateFromNeighbors (src, neighborMap, store) {
  // propagate bits from each set source position into its neighbors
  // @ts-ignore - store and src types vary by bitboard implementation
  let out = store.createEmptyBitboard(src)

  for (let i = 0; i < neighborMap.length; i++) {
    // @ts-ignore - store methods vary by type
    if (!store.getIdx(src, i)) continue

    for (const j of neighborMap[i]) {
      // @ts-ignore - store.setIdx varies by type
      out = store.setIdx(out, j, 1)
    }
  }
  return out
}
/**
 * Dilates bitboard using Manhattan distance (all 6 neighbors).
 * Expands set cells outward by radius distance.
 *
 * @param {any} board - Bitboard to dilate
 * @param {number} radius - Dilation radius
 * @param {NeighborMap} neighborMap - Neighbor map for all cells
 * @param {any} store - Bitboard store with operations
 * @returns {any} Dilated bitboard
 */
export function dilateHexManhattan (board, radius, neighborMap, store) {
  // @ts-ignore - store.clone varies by type
  let result = store.clone(board)

  for (let r = 0; r < radius; r++) {
    const grow = propagateFromNeighbors(result, neighborMap, store)
    // @ts-ignore - store.bitOr varies by type
    result = store.bitOr(result, grow)
  }
  return result
}
/**
 * Dilates bitboard using separable operations along each of 3 axes.
 * More efficient than full Manhattan dilation for large radii.
 *
 * @param {Object} board - Bitboard to dilate
 * @param {number} radius - Dilation radius
 * @param {AxisMaps} axisMaps - Axis neighbor maps
 * @param {Object} store - Bitboard store with operations
 * @returns {Object} Dilated bitboard
 */
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
/**
 * Performs one erosion step along a single axis.
 * Keeps cell set only if all its axis neighbors are set.
 *
 * @param {Object} src - Source bitboard
 * @param {Array<Array<number>>} axisMap - Neighbors for each cell along axis
 * @param {Object} store - Bitboard store with operations
 * @returns {Object} Eroded bitboard
 * @private
 */
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
/**
 * Performs one erosion step using all 6 neighbors (Manhattan distance).
 * Keeps cell set only if all its neighbors are set.
 *
 * @param {Object} src - Source bitboard
 * @param {NeighborMap} neighborMap - Neighbors for each cell
 * @param {Object} store - Bitboard store with operations
 * @returns {Object} Eroded bitboard
 * @private
 */
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
/**
 * Erodes bitboard using Manhattan distance (all 6 neighbors).
 * Shrinks set cells inward by radius distance.
 *
 * @param {Object} board - Bitboard to erode
 * @param {number} radius - Erosion radius
 * @param {NeighborMap} neighborMap - Neighbor map for all cells
 * @param {Object} store - Bitboard store with operations
 * @returns {Object} Eroded bitboard
 */
export function erodeHexManhattan (board, radius, neighborMap, store) {
  let result = store.clone(board)

  for (let r = 0; r < radius; r++) {
    result = erodeAxisStepManhattan(result, neighborMap, store)
  }
  return result
}
/**
 * Erodes bitboard using separable operations along each of 3 axes.
 * More efficient than full Manhattan erosion for large radii.
 *
 * @param {Object} board - Bitboard to erode
 * @param {number} radius - Erosion radius
 * @param {AxisMaps} axisMaps - Axis neighbor maps
 * @param {Object} store - Bitboard store with operations
 * @returns {Object} Eroded bitboard
 */
export function erodeHexSeparable (board, radius, axisMaps, store) {
  let result = store.clone(board)

  for (const axis of axisMaps) {
    for (let r = 0; r < radius; r++) {
      result = erodeAxisStep(result, axis, store)
    }
  }
  return result
}
