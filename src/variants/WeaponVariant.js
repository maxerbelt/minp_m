import { parsePair } from '../core/utilities.js'
import { StandardCells, SpecialCells } from '../ships/SubShape.js'
import { Placeable } from './Placeable.js'
import { PlaceableW } from './PlaceableW.js'
import { SpecialVariant } from './SpecialVariant.js'

/**
 * Variant class for weapons with special placement rules.
 */
export class WeaponVariant extends SpecialVariant {
  /**
   * Creates a weapon variant instance.
   * @param {any} board - The base board.
   * @param {object} weapons - The weapons object.
   * @param {string} symmetry - The symmetry type.
   * @param {Function} validator - Validation function.
   * @param {object} zoneDetail - Zone details.
   * @param {object} subterrain - Subterrain details.
   */
  constructor (board, weapons, symmetry, validator, zoneDetail, subterrain) {
    super(symmetry)
    this.validator = validator
    this.zoneDetail = zoneDetail
    this.subterrain = subterrain
    this.board = board
    const weaponObj = Object.keys(weapons)
    const weaponGroup = weaponObj.map(p => parsePair(p))
    this.weapons = weaponObj.map(k => weapons[k])
    this.standardGroup = new StandardCells(validator, zoneDetail, subterrain)
    const specialGroup = new SpecialCells(
      weaponGroup,
      validator,
      zoneDetail,
      subterrain
    )
    this.specialGroups = [specialGroup]
    this.standardGroup.faction = 1
    this.specialGroups.faction = 0

    if (specialGroup) {
      specialGroup.board = specialGroup.board.expand(
        this.board.width,
        this.board.height
      )
      this.standardGroup.setBoardFromSecondary(this.board, specialGroup.board)
      this.board.addLayers([specialGroup.board])
    }

    this.subGroups = [this.standardGroup, specialGroup]
    this.buildBoard3(symmetry, board)
  }

  /**
   * Configures behavior for weapon variants.
   * @param {Function} v3 - The variant class.
   * @param {WeaponVariant} symmetry - The instance.
   */
  static setBehaviour = SpecialVariant.setBehaviourTo

  /**
   * Creates a weapon placeable.
   * @param {number | undefined | null} index - The index.
   * @returns {PlaceableW} The placeable.
   */
  placeable (index, fullIndex) {
    const idx = index || this.index
    const grandparentPrototype = Object.getPrototypeOf(SpecialVariant.prototype)
    const result = new PlaceableW(
      grandparentPrototype.placeable.call(this, idx),
      this.subGroups.map(
        (g, i) =>
          new Placeable(this.specialBoard(idx, i), g.validator, g.zoneDetail)
      ),
      idx,
      this.weapons,
      fullIndex
    )

    return result
  }

  /**
   * Gets shuffled placeables.
   * @returns {PlaceableW[]} The placeables.
   */
  placeables () {
    return this.shuffledPlaceables()
  }
}

/**
 * Mixin to add weapon variants to a base class.
 * @param {Function} Base - The base class.
 * @returns {Function} The extended class.
 */
export const Armed = Base =>
  class extends Base {
    /**
     * Gets the weapon variants.
     * @returns {WeaponVariant} The variants.
     */
    variants () {
      if (this._variants) return this._variants
      this._variants = new WeaponVariant(
        this.board,
        this.weaponSystem,
        this.symmetry,
        this.validator,
        this.zoneDetail,
        this.subterrain
      )
      return this._variants
    }
  }
