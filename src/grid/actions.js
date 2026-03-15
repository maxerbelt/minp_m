import { lazy } from '../utilities.js'
import { buildTransformMaps } from './buildTransformMaps.js'
import { ActionsBase } from './ActionsBase.js'

export class Actions extends ActionsBase {
  constructor (width, height, mask = null) {
    // square grid always uses a square dimension
    super(Math.max(width, height), Math.max(width, height), mask)

    // lazily build the transform maps for the square
    lazy(this, 'transformMaps', () => {
      return buildTransformMaps(this.width, this.height)
    })

    // template needs to be normalized after converting to a square bitboard
    lazy(this, 'template', () => {
      const square = this.original.store.expandToSquare(
        this.original.bits,
        this.original.height,
        this.original.width
      )

      return this.normalized(square)
    })
  }
  get store () {
    if (this._store) return this._store
    this._store = this.original?.store.resized(this.width, this.height)
    return this._store
  }

  get indexer () {
    if (this._indexer) return this._indexer
    this._indexer = this.original?.indexer.resized(this.width, this.height)
    return this._indexer
  }
  get emptyMask () {
    if (this._emptyMask) return this._emptyMask
    this._emptyMask = this.original?.emptyOfSize(this.width, this.height)
    return this._emptyMask
  }
  ascii (bits) {
    const temp = this.emptyMask
    temp.bits = bits
    return temp.toAsciiWith()
  }
  // override normalization to use store helper
  normalized (bits) {
    const b = bits === undefined ? this.template : bits
    return this.store.normalizeUpLeft(b, this.height, this.width)
  }

  // square-specific symmetry classification logic
  classifyActionGroup () {
    const maps = this.transformMaps
    const b = this.template
    const k = this.order
    if (k === 8) return 'ASYM'
    if (k === 4) {
      if (this.applyMap(maps.r180) === b) return 'O4F' // (diagonal Klein four)'
      return 'O4R'
    }
    if (k === 2) {
      if (
        this.applyMap(maps.r90) === this.applyMap(maps.fx) &&
        this.applyMap(maps.r90) === this.applyMap(maps.fy)
      )
        return 'O2F' // (single mirror)'

      return 'O2R' // (half-turn)'
    }
    return 'SYM'
  }

  classifyOrbitType () {
    const maps = this.transformMaps
    const b = this.template
    const k = this.order
    if (k === 8) return 'ASYM' // (full asymmetry / Stabilizer C1 / allowed transfroms D4)'
    if (k === 4) {
      if (this.applyMap(maps.r180) === b) return 'O4F' // stabilizer C1 orbit V4 / O4F (diagonal Klein four)'
      return 'O4R' // stabilizer C2R orbit C4 / O4R
    }
    if (k === 2) {
      if (
        this.applyMap(maps.r90) === this.applyMap(maps.fx) &&
        this.applyMap(maps.r90) === this.applyMap(maps.fy)
      )
        return 'O2F' // (flip blinker) symmetry V4

      return 'O2R' // (half-turn blinker) symmetry C4
    }
    return 'SYM'
  }
  classifyStabilizer () {
    const maps = this.transformMaps
    const b = this.template
    const k = this.order
    if (k === 8) return 'C1' // (full asymmetry // stabilizer C1 orbit D4 / SYM'
    if (k === 4) {
      if (this.applyMap(maps.r180) === b) return 'C2F' // stabilizer C1 orbit V4 / O4F (diagonal Klein four)'
      return 'C2R' // stabilizer C2R orbit C4 / O4R
    }
    if (k === 2) {
      if (
        this.applyMap(maps.r90) === this.applyMap(maps.fx) &&
        this.applyMap(maps.r90) === this.applyMap(maps.fy)
      )
        return 'V4' // (single mirror) / stabilizer V4 orbit O2F / C2F

      return 'C4' // (half-turn blinker) / stabilizer C4 orbit O2R / C2R
    }
    return 'D4' // (full symmetry / stabilizer D4 orbit SYM / C1)'
  }
}
