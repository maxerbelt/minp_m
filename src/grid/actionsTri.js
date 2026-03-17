import { lazy } from '../utilities.js'
import { buildTransformTriMap } from './buildTransformTriMap.js'
import { ActionsBase } from './ActionsBase.js'

export class ActionsTri extends ActionsBase {
  constructor (side, mask = null) {
    // bounding rectangle width covers full base (2*side-1) and
    // height equals side
    super(2 * side - 1, side, mask)
    this.side = side
    this.size = this.original?.indexer?.size || 0

    lazy(this, 'transformMaps', () => {
      const t = buildTransformTriMap(this.side)
      return t.maps
    })

    lazy(this, 'template', () => {
      return this.normalized(this.original.bits)
    })
  }

  normalized (bits) {
    const b = bits === undefined ? this.template : bits
    if (b === 0n || b === 0) return 0n

    const cells = []
    for (const i of this._bitsIndices(b)) {
      const loc = this.indexer.location(i)
      if (loc) cells.push(loc)
    }

    if (cells.length === 0) return 0n

    let minR = cells[0][0]
    let minC = cells[0][1]
    for (const [r, c] of cells) {
      if (r < minR) minR = r
      if (c < minC) minC = c
    }

    let normalized = 0n
    for (const [r, c] of cells) {
      const nr = r - minR
      const nc = c - minC
      const j = this.indexer.index(nr, nc)
      if (j !== undefined) {
        normalized |= 1n << BigInt(j)
      }
    }
    return normalized
  }

  classifyOrbitType () {
    const k = this.order
    if (k === 6) return 'D3'
    if (k === 3) return 'C3'
    if (k === 2) return 'C2'
    return 'SYM'
  }

  // For potential UI or debugging
  static D3_NAMES = ['E', 'R120', 'R240', 'F0', 'F1', 'F2']
  static D3_LABELS = [
    'identity',
    'rotate 120°',
    'rotate 240°',
    'reflect (axis 0)',
    'reflect (axis 120)',
    'reflect (axis 240)'
  ]
}
