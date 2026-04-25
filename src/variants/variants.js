import { Random } from '../core/Random.js'
import { CellsToBePlaced } from './CellsToBePlaced.js'
import { Placeable } from './Placeable.js'

/**
 * @typedef {import('./Placeable.js').Placeable} PlaceableType
 * @typedef {import('./CellsToBePlaced.js').CellsToBePlaced} CellsToBePlacedType
 * @typedef {number} VariantIndex
 * @typedef {(index: VariantIndex) => VariantIndex} VariantTransitionFn
 */

/**
 * Base class for managing variant boards with transformation capabilities.
 */
export class Variants {
  /**
   * Creates a new Variants instance.
   * @param {Function} validator - Function to validate placements.
   * @param {object} zoneDetail - Details about the zone.
   * @param {string} symmetry - Symmetry type identifier.
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
    this.zoneDetail = zoneDetail
    this.symmetry = symmetry
    this.onChange = Function.prototype
    this.r1 = Function.prototype
    this.f1 = Function.prototype
    this.rf1 = Function.prototype
  }

  /**
   * Gets the number of available variants.
   * @returns {number} The count of variants.
   */
  numVariants () {
    return this.list.length
  }

  /**
   * Resolves a possibly undefined variant index into an explicit number.
   * @param {VariantIndex | undefined | null} index - The index to resolve.
   * @returns {VariantIndex} The resolved index.
   */
  resolveIndex (index) {
    return index == null ? this.index : index
  }

  /**
   * Gets the board at the specified index or the active board.
   * @param {number | undefined | null} [index] - The variant index.
   * @returns {any} The board at the index.
   */
  board (index) {
    return this.boardFor(index)
  }

  /**
   * Returns the board at the requested index, or the active board when index is omitted.
   * @param {number | undefined | null} [index] - The variant index.
   * @returns {any} The board.
   */
  boardFor (index) {
    return this.list[this.resolveIndex(index)]
  }

  /**
   * Gets the first board in the variant list.
   * @returns {any} The first board.
   */
  get firstBoard () {
    return this.list[0]
  }

  /**
   * Checks if there are multiple variants available.
   * @returns {boolean} True if more than one variant exists.
   */
  get hasMultipleVariants () {
    return this.list.length > 1
  }

  /**
   * Gets the currently active board.
   * @returns {any} The active board.
   */
  get activeBoard () {
    return this.boardFor(this.index)
  }

  /**
   * Chooses the best variant index for a given cell height.
   * @param {number} cellHeight - The height constraint.
   * @returns {VariantIndex} The chosen index.
   */
  indexUnder (cellHeight) {
    if (!this.hasMultipleVariants) {
      return 0
    }

    const occupiedBoard = this.firstBoard.shrinkToOccupied()
    if (occupiedBoard.maxSize <= cellHeight) {
      return occupiedBoard.isWide ? 1 : 0
    }

    return occupiedBoard.isTall ? 1 : 0
  }

  /**
   * Returns the occupied board and chosen index for a placement height.
   * @param {number} cellHeight - The height constraint.
   * @returns {{index: number, board: any}} The index and shrunk board.
   */
  shrunkUnder (cellHeight) {
    const index = this.indexUnder(cellHeight)
    const board = this.boardFor(index).shrinkToOccupied()
    return { index, board }
  }

  /**
   * Returns the coordinates for a variant board.
   * @param {number | undefined | null} index - The variant index.
   * @returns {any} The coordinates.
   */
  variant (index) {
    return this.boardFor(index).toCoords
  }

  /**
   * Creates a Placeable instance for the specified variant.
   * @param {number | undefined | null} index - The variant index.
   * @returns {Placeable} The placeable instance.
   */
  placeable (index) {
    return new Placeable(this.boardFor(index), this.validator, this.zoneDetail)
  }

  /**
   * Shuffles the available variants and returns a new randomized list.
   * @returns {any[]} The shuffled boards.
   */
  variations () {
    return Random.shuffleArray(this.list)
  }

  /**
   * Creates Placeable instances for all shuffled variants.
   * @returns {Placeable[]} The placeable instances.
   */
  placeables () {
    return this.variations().map(
      v => new Placeable(v, this.validator, this.zoneDetail)
    )
  }

  /**
   * Normalizes all boards in the variant list.
   * @returns {any[]} The normalized boards.
   */
  normalize () {
    return this.list.map(b => b.normalize())
  }

  /**
   * Gets the coordinates of the first board.
   * @returns {any} The coordinates.
   */
  get cells () {
    return this.firstBoard.toCoords
  }

  /**
   * Gets the height of the first board.
   * @returns {number} The height.
   */
  height () {
    return this.firstBoard.height
  }

  /**
   * Gets the width of the first board.
   * @returns {number} The width.
   */
  width () {
    return this.firstBoard.width
  }

  /**
   * Activates the variant at the requested index and notifies listeners.
   * @param {number} index - The index to set.
   * @returns {any} The board at the new index.
   */
  setByIndex (index) {
    this.index = index
    this.onChange()
    return this.boardFor(index)
  }

  /**
   * Creates a placement helper for the active board at the given position.
   * @param {number} r - Row position.
   * @param {number} c - Column position.
   * @returns {CellsToBePlaced} The placement helper.
   */
  placingAt (r, c) {
    return new CellsToBePlaced(this.board(), r, c, this.validator)
  }
}
