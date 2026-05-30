import { parsePair } from '../core/utilities.js'
import { Random } from '../core/Random.js'
import { StandardCells, SpecialCells } from '../ships/SubShape.js'
import { Placeable } from './Placeable.js'
import { PlaceableW } from './PlaceableW.js'
import { SpecialVariant } from './SpecialVariant.js'
import { Mask } from '../grid/rectangle/mask.js'

/**
 * Type definitions extracted to dedicated type files:
 * - {@link PlaceableType} from ./Placeable.js
 * - {@link Placeable3Type} from ./Placeable3.js
 * - {@link PlaceableWType} from ./PlaceableW.js
 * - {@link VariantGroup} from types/variants.types.ts
 * - {@link WeaponCellMap} from types/variants.types.ts
 * @typedef {import('./Placeable.js').Placeable} PlaceableType
 * @typedef {import('./Placeable3.js').Placeable3} Placeable3Type
 * @typedef {import('./PlaceableW.js').PlaceableW} PlaceableWType
 * @typedef {import('../ships/SubShape.js').StandardCells} StandardCellsType
 * @typedef {import('../ships/SubShape.js').SpecialCells} SpecialCellsType
 * @typedef {import('./types/variants.types.ts').WeaponCellMap} WeaponMap
 * @typedef {import('./types/variants.types.ts').VariantGroup} VariantGroup
 */

/**
 * Variant class for weapons with special placement rules.
 * @extends {SpecialVariant}
 */
export class WeaponVariant extends SpecialVariant {
  /**
   * Creates a weapon variant instance.
   * @param {Mask} board - The base board.
   * @param {WeaponMap} weapons - The weapons object.
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
   * @param {*} VariantClass - The variant class constructor.
   * @param {import('./RotatableVariant.js').RotatableVariant} symmetry - The instance.
   */
  static setBehaviour (VariantClass, symmetry) {
    return SpecialVariant.setBehaviourTo(
      VariantClass,
      /** @type {SpecialVariant} */ (symmetry)
    )
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
    const result = new PlaceableW(
      grandparentPrototype.placeable.call(this, idx),
      this.subGroups.map(
        (g, i) =>
          new Placeable(this.specialBoard(idx, i), g.validator, g.zoneDetail)
      ),
      idx,
      this.weapons,
      fullIndex ?? idx
    )

    return result
  }

  /**
   * Gets shuffled weapon placeables.
   * @returns {*} The placeables.
   */
  placeables () {
    const indices = this.list.map((_, i) => i)
    return Random.shuffleArray(indices).map(i => this.placeable(i))
  }
}

/**
 * Mixin to add weapon variants to a base class.
 * @param {new (...args: any[]) => { board: any; weaponSystem: any; symmetry: any; validator: any; zoneDetail: any; subterrain: any; _variants?: WeaponVariant }} Base - The base class constructor.
 * @returns {new (...args: any[]) => { variants(): WeaponVariant }} The extended class.
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
