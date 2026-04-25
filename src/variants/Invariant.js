import { Variants } from './variants.js'

export class Invariant extends Variants {
  /**
   * @param {object} board
   * @param {unknown} validator
   * @param {unknown} zoneDetail
   */
  constructor (board, validator, zoneDetail) {
    super(validator, zoneDetail, 'S')
    this.list = [board.shrinkToOccupied()]
  }

  /**
   * @param {object} board
   * @returns {unknown[]}
   */
  static variantsOf (board) {
    return [board.shrinkToOccupied()]
  }

  /**
   * Configure an invariant variant so it cannot transform.
   * @param {object} instance
   */
  static setBehaviour (instance) {
    instance.canFlip = false
    instance.canRotate = false
    instance.canTransform = false
    instance.r1 = Invariant.r
    instance.f1 = Invariant.r
    instance.rf1 = Invariant.r
  }

  /**
   * Always return the invariant coordinate set.
   * @param {number|undefined|null} _index
   * @returns {unknown}
   */
  variant (_index) {
    return this.list[0].toCoords
  }

  /**
   * Prevent changing the active variant for an invariant type.
   * @param {number} _index
   */
  setByIndex (_index) {
    throw new Error('can not change this variant')
  }

  static r = idx => idx
}
