import { RotatableVariant } from './RotatableVariant.js'

export class FlippableVariant extends RotatableVariant {
  constructor (validator, zoneDetail, symmetry) {
    super(validator, zoneDetail, symmetry)
    if (new.target === FlippableVariant) {
      throw new Error(
        'base class cannot be instantiated directly. Please extend it.'
      )
    }
    this.canFlip = true
  }
  static setBehaviour (subType, flippable) {
    flippable.canFlip = true
    flippable.canRotate = true
    flippable.r1 = subType.r
    flippable.f1 = subType.f
    flippable.rf1 = subType.rf
  }
}
