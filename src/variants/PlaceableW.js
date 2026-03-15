import { CellWsToBePlaced } from './CellWsToBePlaced.js'
import { Placeable3 } from './Placeable3.js'

export class PlaceableW extends Placeable3 {
  constructor (full, subGroups) {
    super(full, subGroups)
  }

  placeAt (r, c) {
    return new CellWsToBePlaced(this, r, c, this.weapons, this.variantIndex)
  }
}
