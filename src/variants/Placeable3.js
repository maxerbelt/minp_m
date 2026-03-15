import { Cell3sToBePlaced } from './Cell3sToBePlaced.js'
import { dispatchCell3 } from './makeCell3.js'
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

    this.subCells = this.subGroups.map(_g => [])
    this.board.locations(cell => {
      dispatchCell3(cell, this.subCells)
    })
    let idx = 0
    for (const subCell of this.subCells) {
      this.subGroups[idx].cells = subCell
      idx++
    }
  }

  placeAt (r, c) {
    return new Cell3sToBePlaced(this, r, c)
  }
}
