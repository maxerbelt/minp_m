import { Variants } from './variants.js'

/**
 * Variant class that supports rotation transformations.
 */
export class RotatableVariant extends Variants {
  /**
   * Creates a rotatable variant instance.
   * @param {Function} validator - Validation function.
   * @param {object} zoneDetail - Zone details.
   * @param {string} [symmetry] - Symmetry type.
   */
  constructor (validator, zoneDetail, symmetry = undefined) {
    super(validator, zoneDetail, symmetry)
    if (new.target === RotatableVariant) {
      throw new Error(
        'base class cannot be instantiated directly. Please extend it.'
      )
    }
    const ctor = /** @type {typeof RotatableVariant} */ (this.constructor)
    ctor.setBehaviour(ctor, this)
    this.canRotate = true
  }

  /**
   * Configures rotation behavior for a rotatable variant.
   * @param {Function} VariantClass - The variant class.
   * @param {RotatableVariant} instance - The instance to configure.
   */
  static setBehaviour (VariantClass, instance) {
    instance.canRotate = true
    instance.canTransform = true
    instance.r1 = VariantClass.r
    instance.f1 = VariantClass.f
    instance.rf1 = VariantClass.rf
  }

  /**
   * Applies a transition function to change the active variant.
   * @param {(index: number) => number} transitionFn - The transition function.
   * @returns {any} The new board.
   */
  applyTransition (transitionFn) {
    return this.setByIndex(transitionFn(this.index))
  }

  /**
   * Rotates the active variant clockwise.
   * @returns {any} The rotated board.
   */
  rotate () {
    return this.applyTransition(this.r1)
  }

  /**
   * Flips the active variant in place.
   * @returns {any} The flipped board.
   */
  flip () {
    return this.applyTransition(this.f1)
  }

  /**
   * Rotates the active variant counter-clockwise.
   * @returns {any} The rotated board.
   */
  leftRotate () {
    return this.applyTransition(this.rf1)
  }
}
