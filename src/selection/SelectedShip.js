/**
 * @typedef {Object} Board
 * @property {function(): Array<Object>} occupiedLocations
 */

/**
 * @typedef {Object} Variants
 * @property {boolean} canFlip
 * @property {boolean} canRotate
 * @property {boolean} canTransform
 * @property {number} index
 * @property {function(): Object} placeable
 * @property {function(): Object} variant
 * @property {function(): Board} boardFor
 * @property {function(): Object} rotate
 * @property {function(): Object} leftRotate
 * @property {function(): Object} flip
 * @property {function(): Object} nextForm
 * @property {function(): void} [onChange]
 */

/**
 * @typedef {Object} Shape
 * @property {function(): Variants} variants
 * @property {function(): string} type
 */

/**
 * @typedef {Object} Ship
 * @property {string} id
 * @property {string} letter
 * @property {function(): Shape} shape
 */

/**
 * @typedef {function(Element, Board, string): void} ContentBuilder
 */

/**
 * Represents a selected ship with variant management capabilities.
 * Delegates variant operations to the underlying shape variant manager.
 * @class SelectedShip
 */
export class SelectedShip {
  /**
   * Creates a SelectedShip instance.
   * @param {Ship} ship - The ship object with id, letter, shape() method.
   * @param {number} variantIndex - Index of the current variant.
   * @param {function(Element, Board, string): void} contentBuilder - Function to render the ship.
   */
  constructor (ship, variantIndex, contentBuilder) {
    this._ship = ship
    this._contentBuilder = contentBuilder
    this.ship = ship
    this._shape = ship.shape()
    this._variants = this._shape.variants()
    this._variants.index = variantIndex
    this.variants = this._variants
    this._contentBuilder = contentBuilder
    this.contentBuilder = contentBuilder

    this.id = ship.id
    this.letter = ship.letter
    this.shape = this._shape
    this.type = this._shape.type()
  }

  /**
   * Delegates calls to the variant manager.
   * @param {string} operationName - The variant operation name.
   * @returns {*} The delegated value or result.
   * @private
   */
  _delegateVariantOperation (operationName) {
    const operation = this._variants[operationName]
    return typeof operation === 'function'
      ? operation.call(this._variants)
      : operation
  }

  /**
   * Checks whether the current variant can be flipped.
   * @returns {boolean}
   */
  canFlip () {
    return this._delegateVariantOperation('canFlip')
  }

  /**
   * Checks whether the current variant can be rotated.
   * @returns {boolean}
   */
  canRotate () {
    return this._delegateVariantOperation('canRotate')
  }

  /**
   * Checks whether the current variant can be transformed.
   * @returns {boolean}
   */
  canTransform () {
    return this._delegateVariantOperation('canTransform')
  }

  /**
   * Gets the current variant representation for placement operations.
   * @returns {Object}
   */
  placeable () {
    return this._delegateVariantOperation('placeable')
  }

  /**
   * Gets the current variant object.
   * @returns {Object}
   */
  variant () {
    return this._delegateVariantOperation('variant')
  }

  /**
   * Gets the board representation for the current variant.
   * @returns {Board}
   */
  board () {
    return this._delegateVariantOperation('boardFor')
  }

  /**
   * Rotates the current variant clockwise.
   * @returns {Object}
   */
  rotate () {
    return this._delegateVariantOperation('rotate')
  }

  /**
   * Rotates the current variant counter-clockwise.
   * @returns {Object}
   */
  leftRotate () {
    return this._delegateVariantOperation('leftRotate')
  }

  /**
   * Flips the current variant horizontally.
   * @returns {Object}
   */
  flip () {
    return this._delegateVariantOperation('flip')
  }

  /**
   * Advances the current variant to its next form.
   * @returns {Object}
   */
  nextForm () {
    return this._delegateVariantOperation('nextForm')
  }
}
