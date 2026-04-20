import { Random } from '../core/Random.js'
import { CellsToBePlaced } from './CellsToBePlaced.js'
import { Placeable } from './Placeable.js'

export class Variants {
  constructor (validator, zoneDetail, symmetry) {
    if (new.target === Variants) {
      throw new Error(
        'base class cannot be instantiated directly. Please extend it.'
      )
    }
    this.list = []
    this.index = 0
    this.canFlip = false
    this.canRotate = false
    this.validator = validator
    this.onChange = Function.prototype
    this.zoneDetail = zoneDetail
    this.symmetry = symmetry
  }
  numVariants () {
    return this.list.length
  }

  boardFor (index) {
    const idx = index == null ? this.index : index
    return this.list[idx]
  }
  indexUnder (cellHeight) {
    const hasMultipleVariants = this.list.length > 1
    const board0 = this.boardFor(0).shrinkToOccupied()
    if (board0.maxSize <= cellHeight) {
      if (board0.isWide && hasMultipleVariants) {
        return 1
      }
      return 0
    }
    if (board0.isTall && hasMultipleVariants) {
      return 1
    }
    return 0
  }
  shrunkUnder (cellHeight) {
    const index = this.indexUnder(cellHeight)
    const board = this.boardFor(index).shrinkToOccupied()
    return { index, board }
  }
  variant (index) {
    const idx = index == null ? this.index : index
    return this.boardFor(idx).toCoords
  }

  placeable (index) {
    const idx = index == null ? this.index : index
    return new Placeable(this.boardFor(idx), this.validator, this.zoneDetail)
  }
  variations () {
    let variants0 = this.list
    return Random.shuffleArray(variants0)
  }
  placeables () {
    let variants0 = this.variations()

    return variants0.map(v => new Placeable(v, this.validator, this.zoneDetail))
  }
  normalize () {
    return this.list.map(b => b.normalize())
  }
  get cells () {
    return this.list[0].toCoords
  }
  height () {
    return this.list[0].height
  }
  width () {
    return this.list[0].width
  }
  setByIndex (index) {
    this.index = index
    this.onChange()
    return this.boardFor(index)
  }
  placingAt (r, c) {
    return new CellsToBePlaced(this.board(), r, c, this.validator)
  }
}
