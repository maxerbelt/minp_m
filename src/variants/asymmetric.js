import { FlippableVariant } from './FlippableVariant.js'
import { Mask } from '../grid/mask.js'
// asymmetric
export class Asymmetric extends FlippableVariant {
  constructor (board, validator, zoneDetail, variants) {
    super(validator, zoneDetail, 'D')
    this.list = Mask.listFromCoords(variants) || Asymmetric.variantsOf(board)
  }
  static setBehaviour = FlippableVariant.setBehaviour.bind(null, Asymmetric)

  static variantsOf (board) {
    const unrotated = board.square.defaultVariant
    let flipped = unrotated.clone.flip()

    let right = unrotated
    let left = flipped
    const rightList = [right.shrinkToOccupied()]
    const leftList = [left.shrinkToOccupied()]
    for (let i = 0; i < 3; i++) {
      right = right.clone.rotate()
      rightList.push(right.shrinkToOccupied())
      left = left.clone.rotate()
      leftList.push(left.shrinkToOccupied())
    }

    return rightList.concat(leftList)
  }

  static r (idx) {
    return (idx > 3 ? 4 : 0) + (idx % 4 === 3 ? 0 : (idx + 1) % 4)
  }
  static f = idx => (idx > 3 ? 0 : 4) + (idx % 4)
  static rf = idx => (idx > 3 ? 4 : 0) + (idx % 4 === 0 ? 3 : (idx - 1) % 4)
}
