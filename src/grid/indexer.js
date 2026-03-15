import { bitsSafe } from './bitHelpers.js'

/**
 * Shared utility: Calculate delta (distance) and step direction for line drawing.
 * Used by Bresenham algorithm across all indexer types.
 */
export function deltaAndDirection (endX, startX, endY, startY) {
  let deltaX = Math.abs(endX - startX)
  let deltaY = Math.abs(endY - startY)

  // Convert boolean comparison into +1 or -1
  const stepX = (startX < endX) * 2 - 1
  const stepY = (startY < endY) * 2 - 1
  return { deltaX, deltaY, stepX, stepY }
}

export class Indexer {
  constructor (size) {
    this.size = size
    this.checkInstantiation()
  }
  index () {
    throw new Error('index method in derived class must be implemented')
  }
  location () {
    throw new Error('location method in derived class must be implemented')
  }
  checkInstantiation () {
    if (new.target === Indexer) {
      throw new Error(
        'base class cannot be instantiated directly. Please extend it.'
      )
    }
  }
  set () {
    throw new Error('set method in derived class must be implemented')
  }

  isValid (x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }

  // ============================================================================
  // CONCEPT: Exit Conditions (Reusable helper factories)
  // ============================================================================

  /**
   * Creates an exit condition for rays: stops at grid boundary.
   * Pattern: Works with any coordinate system (rect, hex, tri).
   */
  _createBoundaryExitCondition () {
    return (x, y) => !this.isValid(x, y)
  }

  /**
   * Creates an exit condition for distance-limited segments.
   * Pattern: Works with any coordinate system (rect, hex, tri).
   */
  _createDistanceLimitExitCondition (distance) {
    return (x, y, steps) => steps >= distance
  }

  /**
   * Creates an exit condition for segments: stops at exact endpoint.
   * Pattern: Works with any coordinate system (rect, hex, tri).
   */
  _createEndpointExitCondition (endX, endY) {
    return (x, y) => x === endX && y === endY
  }

  // ============================================================================
  // CONCEPT: Indexer Defaults (Validation helpers, reusable pattern)
  // ============================================================================

  /**
   * Ensures indexer is a valid function, defaults to coordinate tuple.
   * Pattern: Identical across RectIndex, CubeIndex, and TriIndex.
   */
  _ensureIndexer (indexer) {
    if (indexer == null || typeof indexer !== 'function') {
      return (x, y, step) => [x, y, step]
    }
    return indexer
  }

  /**
   * Ensures exit condition is valid, defaults to exact endpoint match.
   * Pattern: Identical across RectIndex, CubeIndex, and TriIndex.
   */
  _ensureExitCondition (exitCondition, endX, endY) {
    if (exitCondition == null || typeof exitCondition !== 'function') {
      return (x, y) => x === endX && y === endY
    }
    return exitCondition
  }
  _ensureValidate (validate) {
    if (validate == null || typeof validate !== 'function') {
      return this.validate.bind(this)
    }
    return validate
  }
  /**
   * Creates a wrapper generator that converts coordinates to indices.
   * Used to generate *Indices methods from base *line/*ray/*segment methods.
   * Pattern: Works identically for RectIndex, CubeIndex, and TriIndex.
   *
   * Example:
   *   this.rayIndices = this._createIndicesWrapper('ray')
   *   yield* this.rayIndices(startX, startY, endX, endY)
   *   // Internally calls: yield* this.ray(startX, startY, endX, endY)
   *   // And converts each coordinate yielded into an index
   */
  _createIndicesWrapper (baseName) {
    const baseMethod = this[baseName]
    return function* (...args) {
      for (const coord of baseMethod.call(this, ...args)) {
        // coord could be [x, y] or [x, y, step] - extract x and y
        const x = coord[0]
        const y = coord[1]
        const idx = this.index(x, y)
        if (idx !== undefined) {
          yield idx
        }
      }
    }
  }

  *list (coords) {
    for (const point of coords) {
      const i = this.index(...point)
      if (i !== undefined) {
        yield i
      }
    }
  }

  bitsFromCoords (bbc, coords) {
    // generic helper used by various classes; make sure we update the bitboard
    let bits = bbc.store.empty

    for (const i of this.list(coords)) {
      bits = bbc.store.setIdx(bits, i, 1)
    }
    return bits
  }

  bitsToCoords (bb) {
    const coords = []
    for (const args of this.bitKeys(bb)) {
      coords.push(args)
    }
    return coords
  }

  *keys () {
    const n = this.size
    for (let i = 0; i < n; i++) {
      const lc = this.location(i)
      yield [...lc, i]
    }
  }
  *indices () {
    const n = this.size
    for (let i = 0; i < n; i++) {
      yield i
    }
  }
  *entries (bb) {
    for (const key of this.keys()) {
      yield [...key, bb.at(...key), bb]
    }
  }

  *values (bb) {
    for (const key of this.keys()) {
      yield bb.at(...key)
    }
  }
  *bitsIndices (bb) {
    yield* bitsSafe(bb, this.size)
  }

  *bitKeys (bb) {
    for (const i of this.bitsIndices(bb)) {
      const loc = this.location(i)
      yield [...loc, i]
    }
  }
  *indicesValues (bb) {
    for (const i of this.bitsIndices(bb)) {
      const loc = this.location(i)
      const value = bb.at(...loc)
      yield [i, value]
    }
  }
}
