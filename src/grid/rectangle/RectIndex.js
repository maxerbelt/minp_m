import { Actions } from './actions.js'
import { Indexer } from '../indexer.js'
import { RectNormalCover } from './RectNormalCover.js'
import { RectHalfCover } from './RectHalfCover.js'
import { RectSuperCover } from './RectSuperCover.js'
import { Connect4 } from './Connect4.js'
import { Connect4Diagonal } from './Connect4Diagonal.js'
import { Connect8 } from './Connect8.js'

function mod (n, m) {
  return ((n % m) + m) % m
}

export class RectIndex extends Indexer {
  constructor (width, height) {
    super(width * height)
    this.width = width
    this.height = height
    this._wrap = false
    this.validate = this.validateClamp
    this.connectType = '8'
    this.cover = {
      normal: new RectNormalCover(this),
      half: new RectHalfCover(this),
      super: new RectSuperCover(this)
    }
    this.connection = {
      4: new Connect4(this),
      '4diag': new Connect4Diagonal(this),
      8: new Connect8(this)
    }
    this._installIndexIteratorWrappers()
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

  /**
   * Gets neighbors or area from a specific connection type
   * @param {string} connectionKey - Connection type key
   * @param {string} methodName - Method name ('neighbors' or 'area')
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Array} Neighbor coordinates or area coordinates
   * @private
   */
  _getConnectionResult (connectionKey, methodName, x, y) {
    return this.connection[connectionKey][methodName](x, y)
  }

  neighbors (x, y) {
    return this._getConnectionResult(this.connectType, 'neighbors', x, y)
  }

  othoNeighbors (x, y) {
    return this._getConnectionResult('4', 'neighbors', x, y)
  }

  diagNeighbors (x, y) {
    return this._getConnectionResult('4diag', 'neighbors', x, y)
  }

  area (x, y) {
    return this._getConnectionResult('8', 'area', x, y)
  }

  // ============================================================================
  // CONCEPT: Grid Traversal (Key generators organized by algorithm type)
  // ============================================================================

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
}
