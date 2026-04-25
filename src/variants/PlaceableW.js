import { CellWsToBePlaced } from './CellWsToBePlaced.js'
import { Placeable3 } from './Placeable3.js'

/**
 * Represents a placeable with weapon variants.
 */
export class PlaceableW extends Placeable3 {
  /**
   * Creates a placeableW instance.
   * @param {Placeable} full - The full placeable.
   * @param {Placeable[]} subGroups - The subgroups.
   * @param {number} variantIndex - The variant index.
   * @param {any} weapons - The weapons.
   */
  constructor (full, subGroups, variantIndex, weapons) {
    super(full, subGroups)
    this.variantIndex = variantIndex
    this.weapons = weapons
  }

  /**
   * Creates a placement at the specified position.
   * @param {number} r - The row position.
   * @param {number} c - The column position.
   * @returns {CellWsToBePlaced} The cells to be placed.
   */
  placeAt (r, c) {
    return new CellWsToBePlaced(this, r, c, this.weapons, this.variantIndex)
  }
}
