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
  // CONCEPT: Reusable adapters for subclass behaviors
  // ============================================================================

  /**
   * Converts an iterable of coordinate tuples into an iterable of indices.
   * This is used by the common *Indices methods across all indexers.
   */
  _createIndexIteratorWrapper (baseMethodName) {
    const baseMethod = this[baseMethodName]
    return function* (...args) {
      for (const coordinate of baseMethod.call(this, ...args)) {
        const x = coordinate[0]
        const y = coordinate[1]
        const index = this.index(x, y)
        if (index !== undefined) {
          yield index
        }
      }
    }
  }

  _installIndexIteratorWrappers () {
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

    for (const [wrapperName, baseMethodName] of wrapperPairs) {
      this[wrapperName] = this._createIndexIteratorWrapper(baseMethodName)
    }
  }

  _createIndicesWrapper (baseMethodName) {
    return this._createIndexIteratorWrapper(baseMethodName)
  }

  _resolveCoordinateMapper (indexer) {
    if (indexer == null || typeof indexer !== 'function') {
      return (x, y, step) => [x, y, step]
    }
    return indexer
  }

  _ensureIndexer (indexer) {
    return this._resolveCoordinateMapper(indexer)
  }

  _resolveExitCondition (exitCondition, endX, endY) {
    if (exitCondition == null || typeof exitCondition !== 'function') {
      return (x, y) => x === endX && y === endY
    }
    return exitCondition
  }

  _ensureExitCondition (exitCondition, endX, endY) {
    return this._resolveExitCondition(exitCondition, endX, endY)
  }

  _resolveValidationStrategy (validate) {
    if (validate == null || typeof validate !== 'function') {
      return this.validate.bind(this)
    }
    return validate
  }

  _ensureValidate (validate) {
    return this._resolveValidationStrategy(validate)
  }

  _delegateCoverMethod (coverType, baseName, args) {
    const cover = this?.cover?.[coverType]
    if (!cover) {
      throw new Error(`Missing cover object for type ${coverType}`)
    }
    const method = cover[baseName]
    if (typeof method !== 'function') {
      throw new TypeError(`Missing cover delegate ${coverType}.${baseName}`)
    }
    return method.apply(cover, args)
  }

  *_delegateCoverGenerator (coverType, baseName, ...args) {
    return yield* this._delegateCoverMethod(coverType, baseName, args)
  }

  *line (...args) {
    return yield* this._delegateCoverGenerator('normal', 'line', ...args)
  }

  *superCoverLine (...args) {
    return yield* this._delegateCoverGenerator('super', 'line', ...args)
  }

  *halfCoverLine (...args) {
    return yield* this._delegateCoverGenerator('half', 'line', ...args)
  }

  *ray (...args) {
    return yield* this._delegateCoverGenerator('normal', 'ray', ...args)
  }

  *superCoverRay (...args) {
    return yield* this._delegateCoverGenerator('super', 'ray', ...args)
  }

  *halfCoverRay (...args) {
    return yield* this._delegateCoverGenerator('half', 'ray', ...args)
  }

  *segmentTo (...args) {
    return yield* this._delegateCoverGenerator('normal', 'segmentTo', ...args)
  }

  *superCoverSegmentTo (...args) {
    return yield* this._delegateCoverGenerator('super', 'segmentTo', ...args)
  }

  *halfCoverSegmentTo (...args) {
    return yield* this._delegateCoverGenerator('half', 'segmentTo', ...args)
  }

  *fullLine (...args) {
    return yield* this._delegateCoverGenerator('normal', 'fullLine', ...args)
  }

  *superCoverFullLine (...args) {
    return yield* this._delegateCoverGenerator('super', 'fullLine', ...args)
  }

  *halfCoverFullLine (...args) {
    return yield* this._delegateCoverGenerator('half', 'fullLine', ...args)
  }

  *segmentFor (...args) {
    return yield* this._delegateCoverGenerator('normal', 'segmentFor', ...args)
  }

  *superCoverSegmentFor (...args) {
    return yield* this._delegateCoverGenerator('super', 'segmentFor', ...args)
  }

  *halfCoverSegmentFor (...args) {
    return yield* this._delegateCoverGenerator('half', 'segmentFor', ...args)
  }

  intercept (startX, startY, endX, endY) {
    let lastX = startX
    let lastY = startY

    for (const [x, y] of this.ray(startX, startY, endX, endY)) {
      lastX = x
      lastY = y
    }
    return [lastX, lastY]
  }

  intercepts (startX, startY, endX, endY) {
    const [x1, y1] = this.intercept(startX, startY, endX, endY)
    const [x0, y0] = this.intercept(endX, endY, startX, startY)
    return { x0, y0, x1, y1 }
  }

  *list (coords) {
    for (const point of coords) {
      const i = this.index(...point)
      if (i !== undefined) {
        yield i
      }
    }
  }

  *indicesFromCoords (coords) {
    yield* this.list(coords)
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

  coordinatesFromBitboard (bb) {
    return this.bitsToCoords(bb)
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
