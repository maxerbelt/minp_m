import { RotatableVariant } from './RotatableVariant.js'

export class FlippableVariant extends RotatableVariant {
  /**
   * @param {any} validator
   * @param {any} zoneDetail
   * @param {string} symmetry
   */
  constructor (validator, zoneDetail, symmetry) {
    super(validator, zoneDetail, symmetry)
    if (new.target === FlippableVariant) {
      throw new Error(
        'base class cannot be instantiated directly. Please extend it.'
      )
    }
    this.canFlip = true
  }

  /**
   * Configure rotation and flip transition functions for a flippable variant.
   * @param {any} VariantClass
   * @param {any} instance
   */
  static setBehaviour (VariantClass, instance) {
    instance.canFlip = true
    instance.canRotate = true
    instance.r1 = VariantClass.r
    instance.f1 = VariantClass.f
    instance.rf1 = VariantClass.rf
  }
}
