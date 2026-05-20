import { SpecialVariant } from './SpecialVariant.js'

/**
 * @typedef {import('../grid/rectangle/mask.js').Mask} Mask
 * @typedef {import('./SpecialVariant.js').SpecialVariant} SpecialVariantType
 * @typedef {Object} VariantGroup
 * @property {(zoneInfo: any) => boolean} validator
 * @property {any} zoneDetail
 * @property {any} [parent]
 *
 * Variant class for handling three-layer variants with subgroups.
 */
export class Variant3 extends SpecialVariant {
  /**
   * Creates a variant3 instance.
   * @param {Mask|Array<Array<number>>} board - The base board or coordinate list.
   * @param {VariantGroup[]|undefined} subGroups - The subgroups.
   * @param {string} symmetry - The symmetry type.
   */
  constructor (board, subGroups, symmetry) {
    super(symmetry)
    /** @type {VariantGroup[]} */
    this.subGroups = Array.isArray(subGroups) ? subGroups : []
    const [head, ...tail] = this.subGroups
    /** @type {VariantGroup|undefined} */
    this.standardGroup = head
    /** @type {VariantGroup[]} */
    this.specialGroups = tail
    this.buildBoard3(symmetry, board)
  }

  // Configures behavior for Variant3 using the shared special variant helper.
  static setBehaviour (VariantClass, instance) {
    return SpecialVariant.setBehaviourTo(VariantClass, instance)
  }
}
