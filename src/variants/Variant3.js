import { SpecialVariant } from './SpecialVariant.js'

export class Variant3 extends SpecialVariant {
  constructor (board, subGroups, symmetry) {
    super(symmetry)
    this.subGroups = subGroups || []
    const [head, ...tail] = subGroups
    this.standardGroup = head
    this.specialGroups = tail
    this.buildBoard3(symmetry, board)
  }

  static setBehaviour = SpecialVariant.setBehaviourTo
}
