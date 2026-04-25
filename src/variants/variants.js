import { Random } from '../core/Random.js'
import { CellsToBePlaced } from './CellsToBePlaced.js'
import { Placeable } from './Placeable.js'

export class Variants {
  /**
   * @param {any} validator
   * @param {any} zoneDetail
   * @param {string} symmetry
   */
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
    this.canTransform = true
    this.validator = validator
    this.onChange = Function.prototype
    this.zoneDetail = zoneDetail
    this.symmetry = symmetry
    this.r1 = Function.prototype
    this.f1 = Function.prototype
    this.rf1 = Function.prototype
  }

  /**
   * @returns {number}
   */
  numVariants () {
    return this.list.length
  }

  /**
   * Resolve a possibly undefined variant index into an explicit number.
   * @param {number|undefined|null} index
   * @returns {number}
   */
  resolveIndex (index) {
    return index == null ? this.index : index
  }

  /**
   * @param {number|undefined|null} [index]
   * @returns {any}
   */
  board (index) {
    return this.boardFor(index)
  }

  /**
   * Return the board at the requested index, or the active board when index is omitted.
   * @param {number|undefined|null} [index]
   * @returns {any}
   */
  boardFor (index) {
    return this.list[this.resolveIndex(index)]
  }

  /**
   * @returns {any}
   */
  get firstBoard () {
    return this.list[0]
  }

  /**
   * @returns {boolean}
   */
  get hasMultipleVariants () {
    return this.list.length > 1
  }

  /**
   * Choose the best variant index for a given cell height.
   * @param {number} cellHeight
   * @returns {number}
   */
  indexUnder (cellHeight) {
    const board0 = this.firstBoard.shrinkToOccupied()
    if (board0.maxSize <= cellHeight) {
      return board0.isWide && this.hasMultipleVariants ? 1 : 0
    }
    return board0.isTall && this.hasMultipleVariants ? 1 : 0
  }

  /**
   * Return the occupied board and chosen index for a placement height.
   * @param {number} cellHeight
   * @returns {{index: number, board: unknown}}
   */
  shrunkUnder (cellHeight) {
    const index = this.indexUnder(cellHeight)
    const board = this.boardFor(index).shrinkToOccupied()
    return { index, board }
  }

  /**
   * Return the coordinates for a variant board.
   * @param {number|undefined|null} index
   * @returns {unknown}
   */
  variant (index) {
    return this.boardFor(index).toCoords
  }

  /**
   * @param {number|undefined|null} index
   * @returns {Placeable}
   */
  placeable (index) {
    return new Placeable(this.boardFor(index), this.validator, this.zoneDetail)
  }

  /**
   * Shuffle the available variants and return a new randomized list.
   * @returns {unknown[]}
   */
  variations () {
    return Random.shuffleArray(this.list)
  }

  /**
   * Create Placeable instances for all shuffled variants.
   * @returns {Placeable[]}
   */
  placeables () {
    return this.variations().map(
      v => new Placeable(v, this.validator, this.zoneDetail)
    )
  }

  /**
   * Normalize all boards in the variant list.
   * @returns {unknown[]}
   */
  normalize () {
    return this.list.map(b => b.normalize())
  }

  /**
   * @returns {any}
   */
  get cells () {
    return this.firstBoard.toCoords
  }

  /**
   * @returns {number}
   */
  height () {
    return this.firstBoard.height
  }

  /**
   * @returns {number}
   */
  width () {
    return this.firstBoard.width
  }

  /**
   * Activate the variant at the requested index and notify listeners.
   * @param {number} index
   * @returns {unknown}
   */
  setByIndex (index) {
    this.index = index
    this.onChange()
    return this.boardFor(index)
  }

  /**
   * Create a placement helper for the active board.
   * @param {number} r
   * @param {number} c
   * @returns {CellsToBePlaced}
   */
  placingAt (r, c) {
    return new CellsToBePlaced(this.board(), r, c, this.validator)
  }
}
