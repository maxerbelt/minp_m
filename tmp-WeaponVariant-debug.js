import { SpecialVariant } from './src/variants/SpecialVariant.js'
import { Mask } from './src/grid/rectangle/mask.js'
import { parsePair } from './src/core/utilities.js'
import { StandardCells, SpecialCells } from './src/ships/SubShape.js'
import { Placeable } from './src/variants/Placeable.js'
import { PlaceableW } from './src/variants/PlaceableW.js'

/**
 * Variant class for weapons with special placement rules.
 * @extends {SpecialVariant}
 */
export class WeaponVariant extends SpecialVariant {
  /**
   * Creates a weapon variant instance.
   * @param {Mask} board - The base board.
   * @param {Object<string, any>} weapons - The weapons object.
   * @param {string} symmetry - The symmetry type.
   * @param {(zoneInfo: any) => boolean} validator - Validation function.
   * @param {any} zoneDetail - Zone details.
   * @param {any} subterrain - Subterrain details.
   */
  constructor (board, weapons, symmetry, validator, zoneDetail, subterrain) {
    super(symmetry)
    if (Array.isArray(board)) {
      board = Mask.fromCoordsSquare(board)
    }
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
    specialGroup.faction = 0

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
   * @param {Function} VariantClass - The variant class constructor.
   * @param {import('./RotatableVariant.js').RotatableVariant} symmetry - The instance.
   */
  static setBehaviour (VariantClass, symmetry) {
    return SpecialVariant.setBehaviourTo(VariantClass, symmetry)
  }

  /**
   * Creates a weapon placeable.
   * @param {number | undefined | null} [index] - The index.
   * @param {number | undefined} [fullIndex] - The full variant index.
   * @returns {*} The placeable.
   */
  placeable (index = this.index, fullIndex) {
    const idx = index == null ? this.index : index
    const grandparentPrototype = Object.getPrototypeOf(SpecialVariant.prototype)
    return new PlaceableW(
      grandparentPrototype.placeable.call(this, idx),
      this.subGroups.map(
        (g, i) =>
          new Placeable(this.specialBoard(idx, i), g.validator, g.zoneDetail)
      ),
      idx,
      this.weapons,
      fullIndex ?? idx
    )
  }

  /**
   * Gets shuffled weapon placeables.
   * @returns {*} The placeables.
   */
  placeables () {
    const indices = this.list.map((_, i) => i)
    return indices.map(i => this.placeable(i))
  }
}
