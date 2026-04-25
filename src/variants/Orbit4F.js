import { FlippableVariant } from './FlippableVariant.js'

export class Orbit4F extends FlippableVariant {
  /**
   * @param {unknown} board
   * @param {unknown} validator
   * @param {unknown} zoneDetail
   * @param {unknown} variants
   */
  constructor (board, validator, zoneDetail, variants) {
    super(validator, zoneDetail, 'A')
    this.list = this.constructor.createVariantList(board, variants)
  }

  /**
   * @param {unknown} board
   * @returns {unknown[]}
   */
  static variantsOf (board) {
    return [
      board.square.defaultVariant.shrinkToOccupied(),
      board.square.rotate().shrinkToOccupied(),
      board.square.flip().shrinkToOccupied(),
      board.square.rotateFlip().shrinkToOccupied()
    ]
  }

  static r = idx => (idx > 1 ? 2 : 0) + (idx % 2 === 0 ? 1 : 0)
  static f = idx => (idx > 1 ? 0 : 2) + (idx % 2)
  static rf = idx => (idx > 1 ? 2 : 0) + (idx % 2 === 0 ? 1 : 0)
}
