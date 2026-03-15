import { flip3, rotate3 } from './normalize.js'
import { FlippableVariant } from './FlippableVariant.js'
import { makeCell3 } from './makeCell3.js'
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
    const rightList = [right]
    const leftList = [left]
    for (let i = 0; i < 3; i++) {
      right = right.clone.rotate()
      rightList.push(right)
      left = left.clone.rotate()
      leftList.push(left)
    }

    return rightList.concat(leftList)
  }
  static cell3 (full, subGroups) {
    const unrotated = makeCell3(full, subGroups)
    let flipped = flip3(unrotated)

    let right = unrotated
    let left = flipped
    const rightList = [right]
    const leftList = [left]
    for (let i = 0; i < 3; i++) {
      right = rotate3(right)
      rightList.push(right)
      left = rotate3(left)
      leftList.push(left)
    }

    return rightList.concat(leftList)
  }

  static r (idx) {
    return (idx > 3 ? 4 : 0) + (idx % 4 === 3 ? 0 : (idx + 1) % 4)
  }
  static f = idx => (idx > 3 ? 0 : 4) + (idx % 4)
  static rf = idx => (idx > 3 ? 4 : 0) + (idx % 4 === 0 ? 3 : (idx - 1) % 4)
}
