import { shuffleArray } from '../core/utilities.js'
import { Placeable } from './Placeable.js'
import { Placeable3 } from './Placeable3.js'
import { RotatableVariant } from './RotatableVariant.js'
import { variantType } from './variantType.js'
import { Mask } from '../grid/rectangle/mask.js'

export class SpecialVariant extends RotatableVariant {
  constructor (symmetry) {
    super(Function.prototype, 0, symmetry)
  }
  buildBoard3 (symmetry, board) {
    if (Array.isArray(board)) {
      board = Mask.fromCoordsSquare(board)
    }
    if (!(board instanceof Mask)) {
      throw new Error(
        'Board must be a Mask instance or an array of coordinates'
      )
    }
    const unrotated = board.square.defaultVariant
    const VariantType = variantType(symmetry)
    let boards = []
    if (typeof VariantType.variantsOf === 'function') {
      boards = VariantType.variantsOf(unrotated)
    } else {
      //   boards = [unrotated]
      throw new TypeError(
        `Variant '${symmetry}' does not support variantsOf method`,
        JSON.stringify({ VariantType })
      )
    }
    this.list = boards
    this.specialGroups.forEach(g => {
      g.parent = this
    })
  }

  boardFor (index) {
    const idx = index == null ? this.index : index
    return this.list[idx]
  }

  specialBoard (index, groupIndex) {
    const board = this.boardFor(index)
    return board.extractColorLayer(groupIndex + 1)
  }

  placeable (index) {
    const idx = index == null ? this.index : index
    return new Placeable3(
      super.placeable(idx),
      this.subGroups.map(
        (g, i) =>
          new Placeable(this.specialBoard(idx, i), g.validator, g.zoneDetail)
      )
    )
  }
  static setBehaviourTo (v3, symmetry) {
    const VariantType = variantType(symmetry || this.symmetry)
    VariantType.setBehaviour(v3)
  }
  placeables () {
    return this.shuffledPlaceables()
  }

  shuffledPlaceables () {
    let shuffled
    switch (this.list.length) {
      case 8:
        shuffled = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7])
        break
      case 4:
        shuffled = shuffleArray([0, 1, 2, 3])
        break
      case 2:
        shuffled = shuffleArray([0, 1])
        break
      case 1:
        shuffled = [0]
        break
      default:
        throw new Error('Unknown no of variants')
    }

    return shuffled.map(i => this.placeable(i))
  }
}
