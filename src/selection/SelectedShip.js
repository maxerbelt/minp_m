/**
 * Represents a selected ship with variant management capabilities.
 */
export class SelectedShip {
  /**
   * Creates a SelectedShip instance.
   * @param {Object} ship - The ship object
   * @param {number} variantIndex - Index of the current variant
   * @param {Function} contentBuilder - Function to build content for the ship
   */
  constructor (ship, variantIndex, contentBuilder) {
    this.ship = ship
    this.contentBuilder = contentBuilder
    const shape = ship.shape()
    this.shape = shape
    this.type = shape.type()
    this.id = ship.id
    this.letter = ship.letter
    this.variants = shape.variants()
    this.variants.index = variantIndex
  }

  /**
   * Checks if the ship can be flipped.
   * @returns {boolean} True if flipping is allowed
   */
  canFlip () {
    return this.variants.canFlip
  }

  /**
   * Checks if the ship can be rotated.
   * @returns {boolean} True if rotation is allowed
   */
  canRotate () {
    return this.variants.canRotate
  }

  /**
   * Checks if the ship can be transformed.
   * @returns {boolean} True if transformation is allowed
   */
  canTransform () {
    return this.variants.canTransform
  }

  /**
   * Gets the current placeable variant.
   * @returns {Object} The placeable variant
   */
  placeable () {
    return this.variants.placeable()
  }

  /**
   * Gets the current variant.
   * @returns {Object} The current variant
   */
  variant () {
    return this.variants.variant()
  }

  /**
   * Gets the board for the current variant.
   * @returns {Object} The board
   */
  board () {
    return this.variants.boardFor()
  }

  /**
   * Rotates the ship variant.
   * @returns {Object} The rotated variant
   */
  rotate () {
    return this.variants.rotate()
  }

  /**
   * Rotates the ship variant left.
   * @returns {Object} The left-rotated variant
   */
  leftRotate () {
    return this.variants.leftRotate()
  }

  /**
   * Flips the ship variant.
   * @returns {Object} The flipped variant
   */
  flip () {
    return this.variants.flip()
  }

  /**
   * Advances to the next form of the ship variant.
   * @returns {Object} The next form variant
   */
  nextForm () {
    return this.variants.nextForm()
  }
}
