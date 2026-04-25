import { Variants } from './variants.js'

export class RotatableVariant extends Variants {
  /**
   * @param {unknown} validator
   * @param {unknown} zoneDetail
   * @param {string} [symmetry]
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
   * Configure rotation behavior for a rotatable variant.
   * @param {Function} VariantClass
   * @param {RotatableVariant} instance
   */
  static setBehaviour (VariantClass, instance) {
    instance.canRotate = true
    instance.canTransform = true
    instance.r1 = VariantClass.r
    instance.f1 = VariantClass.f
    instance.rf1 = VariantClass.rf
  }

  /**
   * @param {VariantTransitionFn} transitionFn
   * @returns {unknown}
   */
  applyTransition (transitionFn) {
    return this.setByIndex(transitionFn(this.index))
  }

  /**
   * Rotate the active variant and update the current index.
   * @returns {unknown}
   */
  rotate () {
    return this.applyTransition(this.r1)
  }

  /**
   * Flip the active variant in place.
   * @returns {unknown}
   */
  flip () {
    return this.applyTransition(this.f1)
  }

  /**
   * Rotate in the opposite direction from `rotate()`.
   * @returns {unknown}
   */
  leftRotate () {
    return this.applyTransition(this.rf1)
  }
}
