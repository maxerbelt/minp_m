import { Cell3sToBePlaced } from './Cell3sToBePlaced.js'
import { makeKey } from '../utilities.js'

export class CellWsToBePlaced extends Cell3sToBePlaced {
  constructor (placable3, rr, cc, weapons, variant) {
    super(placable3, rr, cc)
    this.variant = variant
    const special = this.subGroups[1].cells
    this.weapons = special.reduce((acc, [r, c], i) => {
      acc[makeKey(r, c)] = weapons[i]
      return acc
    }, {})
  }
  isInMatchingZone (r, c) {
    const zoneInfo = this.zoneInfo(r, c)
    return this.validator(zoneInfo)
  }

  isWrongZone () {
    const result = this.cells.some(([r, c]) => {
      return this.isInMatchingZone(r, c) === false
    })
    return result
  }
}
