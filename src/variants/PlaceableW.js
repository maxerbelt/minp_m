import { CellWsToBePlaced } from './CellWsToBePlaced.js'
import { Placeable3 } from './Placeable3.js'

/**
 * @typedef {import('./Placeable.js').Placeable} PlaceableType
 * @typedef {any} Weapon
 */

/**
 * Represents a placeable with weapon variants.
 * Extends Placeable3 to support weapon placement with variant tracking
 * and weapon-specific cell placement logic.
 */
export class PlaceableW extends Placeable3 {
  /**
   * The variant index used to identify which variant configuration this represents.
   * @type {number}
   */
  variantIndex

  /**
   * The full/absolute index, defaults to variantIndex if not specified.
   * Used for tracking the complete placement index across all configurations.
   * @type {number}
   */
  fullIndex

  /**
   * Array of weapon objects to place with the cells.
   * Each weapon is associated with specific cell positions.
   * @type {Weapon[]}
   */
  weapons

  /**
   * Creates a placeableW instance with weapon variant configuration.
   * @param {PlaceableType} full - The full placeable with board and validation configuration.
   * @param {PlaceableType[]|undefined} subGroups - Array of subgroups for hierarchical placement.
   * @param {number} variantIndex - The variant index identifying this weapon variant.
   * @param {Weapon[]} weapons - Array of weapons to place with the cells.
   * @param {number|undefined} [fullIndex] - Optional full index (defaults to variantIndex if not provided).
   */
  constructor (full, subGroups, variantIndex, weapons, fullIndex) {
    super(full, subGroups)
    this.variantIndex = variantIndex
    this.fullIndex = fullIndex ?? variantIndex
    this.weapons = weapons
  }

  /**
   * Creates a weapon placement at the specified position.
   * Returns a CellWsToBePlaced instance that combines cell placement
   * with weapon assignment for the given coordinates.
   * @param {number} x - The x (column) position for placement.
   * @param {number} y - The y (row) position for placement.
   * @returns {CellWsToBePlaced} The weapon cells to be placed with weapon assignments.
   */
  placeAt (x, y) {
    return new CellWsToBePlaced(this, x, y, this.weapons, this.fullIndex)
  }
}
