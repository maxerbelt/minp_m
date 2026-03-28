import { Cell3sToBePlaced } from './Cell3sToBePlaced.js'
import { Placeable } from './Placeable.js'

export class Placeable3 extends Placeable {
  constructor (full, subGroups) {
    let board = full.board
    subGroups = subGroups || []
    const [head, ...tail] = subGroups

    super(board, full.validator, full.zoneDetail, full.target)

    this.subGroups = subGroups
    this.standardGroup = head
    this.specialGroups = tail
  }

  placeAt (r, c) {
    return new Cell3sToBePlaced(this, r, c)
  }
}
