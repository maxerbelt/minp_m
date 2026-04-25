import { FlippableVariant } from './FlippableVariant.js'

export class Orbit4R extends FlippableVariant {
  /**
   * @param {unknown} board
   * @param {unknown} validator
   * @param {unknown} zoneDetail
   * @param {unknown} variants
   */
  constructor (board, validator, zoneDetail, variants) {
    super(validator, zoneDetail)
    this.list = this.constructor.createVariantList(board, variants)
  }

  /**
   * @param {unknown} board
   * @returns {unknown[]}
   */
  static variantsOf (board) {
    return [
      board.square.defaultVariant.shrinkToOccupied(),
      board.square.r90().shrinkToOccupied(),
      board.square.r180().shrinkToOccupied(),
      board.square.r270().shrinkToOccupied()
    ]
  }

  static r = idx => (idx + 1) % 4
  static f = idx => (idx + 2) % 4
  static rf = idx => (idx === 0 ? 3 : idx - 1)
}
