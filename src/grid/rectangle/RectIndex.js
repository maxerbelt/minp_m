import { Actions } from './actions.js'
import { Indexer } from '../indexer.js'
import { RectNormalCover } from './RectNormalCover.js'
import { RectHalfCover } from './RectHalfCover.js'
import { RectSuperCover } from './RectSuperCover.js'

function mod (n, m) {
  return ((n % m) + m) % m
}

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

const neighborValues = [...othoNeighborValues, ...diagNeighborValues]

const center = {
  C: [0, 0]
}
const centerValues = Object.values(center)
const areaValues = [...neighborValues, ...centerValues]
export class RectIndex extends Indexer {
  constructor (width, height) {
    super(width * height)
    this.width = width
    this.height = height
    this._wrap = false
    this.validate = this.validateClamp

    this.cover = {
      normal: new RectNormalCover(this),
      half: new RectHalfCover(this),
      super: new RectSuperCover(this)
    }
  }

  step (...args) {
    return this.cover.normal.step(...args)
  }

  stepMove (...args) {
    return this.cover.normal.stepMove(...args)
  }

  *yieldSuperCoverCornerCells (...args) {
    return yield* this.cover.super.yieldSuperCoverCornerCells(...args)
  }

  *yieldHalfCoverCornerCells (...args) {
    return yield* this.cover.half.yieldHalfCoverCornerCells(...args)
  }

  *line (...args) {
    return yield* this.cover.normal.line(...args)
  }
  *superCoverLine (...args) {
    return yield* this.cover.super.superCoverLine(...args)
  }
  *halfCoverLine (...args) {
    return yield* this.cover.half.halfCoverLine(...args)
  }
  *ray (...args) {
    return yield* this.cover.normal.ray(...args)
  }
  *superCoverRay (...args) {
    return yield* this.cover.super.superCoverRay(...args)
  }
  *halfCoverRay (...args) {
    return yield* this.cover.half.halfCoverRay(...args)
  }
  *segmentTo (...args) {
    return yield* this.cover.normal.segmentTo(...args)
  }
  *superCoverSegmentTo (...args) {
    return yield* this.cover.super.superCoverSegmentTo(...args)
  }
  *halfCoverSegmentTo (...args) {
    return yield* this.cover.half.halfCoverSegmentTo(...args)
  }
  *fullLine (...args) {
    return yield* this.cover.normal.fullLine(...args)
  }
  *superCoverFullLine (...args) {
    return yield* this.cover.super.superCoverFullLine(...args)
  }
  *halfCoverFullLine (...args) {
    return yield* this.cover.half.halfCoverFullLine(...args)
  }
  *segmentFor (...args) {
    return yield* this.cover.normal.segmentFor(...args)
  }
  *superCoverSegmentFor (...args) {
    return yield* this.cover.super.superCoverSegmentFor(...args)
  }
  *halfCoverSegmentFor (...args) {
    return yield* this.cover.half.halfCoverSegmentFor(...args)
  }

  rayIndices (...args) {
    return this.cover.normal.rayIndices(...args)
  }
  superCoverRayIndices (...args) {
    return this.cover.super.superCoverRayIndices(...args)
  }
  halfCoverRayIndices (...args) {
    return this.cover.half.halfCoverRayIndices(...args)
  }
  segmentToIndices (...args) {
    return this.cover.normal.segmentToIndices(...args)
  }
  superCoverSegmentToIndices (...args) {
    return this.cover.super.superCoverSegmentToIndices(...args)
  }
  halfCoverSegmentToIndices (...args) {
    return this.cover.half.halfCoverSegmentToIndices(...args)
  }
  fullLineIndices (...args) {
    return this.cover.normal.fullLineIndices(...args)
  }
  superCoverFullLineIndices (...args) {
    return this.cover.super.superCoverFullLineIndices(...args)
  }
  halfCoverFullLineIndices (...args) {
    return this.cover.half.halfCoverFullLineIndices(...args)
  }
  segmentForIndices (...args) {
    return this.cover.normal.segmentForIndices(...args)
  }
  superCoverSegmentForIndices (...args) {
    return this.cover.super.superCoverSegmentForIndices(...args)
  }
  halfCoverSegmentForIndices (...args) {
    return this.cover.half.halfCoverSegmentForIndices(...args)
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
  // CONCEPT: Grid Traversal (Key generators organized by algorithm type)
  // ============================================================================

  *keys () {
    const n = this.size
    for (let i = 0; i < n; i++) {
      const lc = this.location(i)
      yield [...lc, i]
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

  intercept (startX, startY, endX, endY) {
    let mx = startX
    let my = startY

    for (const [x, y] of this.cover.normal.ray(
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
