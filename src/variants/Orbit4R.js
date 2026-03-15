import { FlippableVariant } from './FlippableVariant.js'
import { Orbit4F } from './Orbit4F.js'
import { Mask } from '../grid/mask.js'

export class Orbit4R extends FlippableVariant {
  constructor (board, validator, zoneDetail, variants) {
    super(validator, zoneDetail)
    this.list = Mask.listFromCoordsSquare(variants) || Orbit4F.variantsOf(board)
  }
  static variantsOf (board) {
    // same variants as Orbit4R, but different transitions  e.g. r,f,rf
    return Orbit4F.variantsOf(board)
  }
  static cell3 (full, subGroups) {
    // same variants as Orbit4R, but different transitions  e.g. r,f,rf
    return Orbit4F.cell3(full, subGroups)
  }

  static setBehaviour = FlippableVariant.setBehaviour.bind(null, Orbit4R)

  static r = idx => (idx + 1) % 4
  static f = idx => (idx + 2) % 4
  static rf = idx => (idx === 0 ? 3 : idx - 1)
}
