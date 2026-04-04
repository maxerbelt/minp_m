import { ActionsTri } from './triangle/actionsTri.js'
import { Indexer } from './indexer.js'

// indexes a right triangle that fits inside an HxW rectangle
// rows follow the odd pattern 1,3,5,... truncated by width
// each row r has columns 0..min(2*r,width-1)
export class TriRectIndex extends Indexer {
  constructor (height, width) {
    const size = TriRectIndex.calcSize(height, width)
    super(size)
    this.height = height
    this.width = width
  }

  static calcSize (height, width) {
    let s = 0
    for (let r = 0; r < height; r++) {
      s += Math.min(2 * r + 1, width)
    }
    return s
  }

  index (r, c) {
    if (!this.isValid(r, c)) return undefined
    let base = 0
    for (let i = 0; i < r; i++) {
      base += Math.min(2 * i + 1, this.width)
    }
    return base + c
  }

  location (i) {
    if (i < 0 || i >= this.size) return undefined
    let sum = 0
    for (let r = 0; r < this.height; r++) {
      const rowCount = Math.min(2 * r + 1, this.width)
      if (i < sum + rowCount) {
        return [r, i - sum]
      }
      sum += rowCount
    }
    return undefined
  }

  isValid (r, c) {
    return r >= 0 && r < this.height && c >= 0 && c < this.width && c <= 2 * r
  }

  actions (bb) {
    if (this._actions && this._actions?.original?.bits === bb.bits) {
      return this._actions
    }
    // use height as the "side" for the underlying triangular transforms;
    // invalid cells will be dropped by normalization
    this._actions = new ActionsTri(this.height, bb)
    return this._actions
  }

  *keys () {
    let idx = 0
    for (let r = 0; r < this.height; r++) {
      const rowCount = Math.min(r + 1, this.width)
      for (let c = 0; c < rowCount; c++) {
        yield [r, c, idx++]
      }
    }
  }
}
