import { CellsToBePlaced } from './CellsToBePlaced.js'

export class Cell3sToBePlaced extends CellsToBePlaced {
  constructor (placable3, r, c) {
    super(
      placable3.board,
      r,
      c,
      placable3.validator,
      placable3.zoneDetail,
      placable3.target
    )
    this.subGroups = placable3.subGroups.map(g => g.placeAt(r, c))
  }

  isInMatchingZone (r, c) {
    const zoneInfo = this.zoneInfo(r, c, 2)
    const result = this.subGroups.some(
      g => g.isCandidate(c, r) && g.validator(zoneInfo)
    )
    return result
  }
  isWrongZone () {
    const cells = [...this.board.locations()]
    const result = cells.some(([c, r]) => {
      return this.isInMatchingZone(r, c) === false
    })
    for (const [c, r] of cells) {
      const match = this.isInMatchingZone(r, c) ? 1 : 0
      this.notGood.set(c, r, match)
    }
    return result
  }
}
