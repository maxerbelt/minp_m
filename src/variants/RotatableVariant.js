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
    this.setByIndex(this.r1(this.index))
  }
  flip () {
    this.setByIndex(this.f1(this.index))
  }
  leftRotate () {
    this.setByIndex(this.rf1(this.index))
  }
}
