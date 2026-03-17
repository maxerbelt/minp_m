import { Variants } from './variants.js'

export class RotatableVariant extends Variants {
  constructor (validator, zoneDetail, symmetry) {
    super(validator, zoneDetail, symmetry)
    if (new.target === RotatableVariant) {
      throw new Error(
        'base class cannot be instantiated directly. Please extend it.'
      )
    }
    this.constructor.setBehaviour(this, symmetry)
    this.canRotate = true
  }

  rotate () {
    return this.setByIndex(this.r1(this.index))
  }
  flip () {
    this.setByIndex(this.f1(this.index))
  }
  leftRotate () {
    return this.setByIndex(this.rf1(this.index))
  }
}
