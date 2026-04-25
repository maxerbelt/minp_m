import { Variants } from './variants.js'

/**
 * Invariant variant that has no transformations.
 */
export class Invariant extends Variants {
  /**
   * Creates an invariant variant instance.
   * @param {any} board - The base board.
   * @param {Function} validator - Validation function.
   * @param {object} zoneDetail - Zone details.
   */
  constructor (board, validator, zoneDetail) {
    super(validator, zoneDetail, 'S')
    this.list = [board.shrinkToOccupied()]
  }

  /**
   * Returns the single invariant variant.
   * @param {any} board - The base board.
   * @returns {any[]} The single variant.
   */
  static variantsOf (board) {
    return [board.shrinkToOccupied()]
  }

  /**
   * Configures an invariant variant so it cannot transform.
   * @param {Function} VariantClass - The variant class.
   * @param {Invariant} instance - The instance to configure.
   */
  static setBehaviour (VariantClass, instance) {
    instance.canFlip = false
    instance.canRotate = false
    instance.canTransform = false
    instance.r1 = Invariant.r
    instance.f1 = Invariant.r
    instance.rf1 = Invariant.r
  }

  /**
   * Always returns the invariant coordinate set.
   * @param {number | undefined | null} _index - Ignored for invariant.
   * @returns {any} The coordinates.
   */
  variant (_index) {
    return this.list[0].toCoords
  }

  /**
   * Prevents changing the active variant for an invariant type.
   * @param {number} _index - Ignored.
   * @throws {Error} Always throws an error.
   */
  setByIndex (_index) {
    throw new Error('can not change this variant')
  }

  static r = idx => idx
}
