import { Variants } from './variants.js'

export class RotatableVariant extends Variants {
  /**
   * @param {any} validator
   * @param {any} zoneDetail
   * @param {string} [symmetry]
   */
  constructor (validator, zoneDetail, symmetry = undefined) {
    super(validator, zoneDetail, symmetry)
    if (new.target === RotatableVariant) {
      throw new Error(
        'base class cannot be instantiated directly. Please extend it.'
      )
    }
    const ctor = /** @type {any} */ (this.constructor)
    ctor.setBehaviour(this, symmetry)
    this.canRotate = true
  }

  /**
   * Rotate the active variant and update the current index.
   * @returns {unknown}
   */
  rotate () {
    return this.setByIndex(this.r1(this.index))
  }

  /**
   * Flip the active variant in place.
   * @returns {unknown}
   */
  flip () {
    return this.setByIndex(this.f1(this.index))
  }

  /**
   * Rotate in the opposite direction from `rotate()`.
   * @returns {unknown}
   */
  leftRotate () {
    return this.setByIndex(this.rf1(this.index))
  }
}
