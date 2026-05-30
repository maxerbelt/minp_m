import { SpecialVariant } from './SpecialVariant.js'

/**
 * @fileoverview Three-layer variant management with hierarchical subgroup support.
 * Extends SpecialVariant to provide multi-layer placement validation and configuration.
 * Manages a standard group (primary placement layer) and special groups (secondary layers).
 * Used for complex shapes requiring multi-component validation and placement constraints.
 *
 * Type definitions extracted to dedicated type files:
 * - {@link Mask} from ../grid/rectangle/mask.js
 * - {@link SpecialVariant} from ./SpecialVariant.js
 * - {@link VariantGroup} from types/variants.types.ts
 *
 * @typedef {import('../grid/rectangle/mask.js').Mask} Mask
 * @typedef {import('./SpecialVariant.js').SpecialVariant} SpecialVariantType
 * @typedef {import('./types/variants.types.ts').VariantGroup} VariantGroup
 */

/**
 * Variant class for handling three-layer variants with hierarchical subgroups.
 * Extends SpecialVariant to support multiple placement layers with independent validation.
 * Splits subgroups into a primary (standard) group and secondary (special) groups.
 * Used for complex board shapes where different components have different placement rules.
 *
 * @class Variant3
 * @extends SpecialVariant
 *
 * @example
 * // Create a 3-layer variant with weapon support
 * const board = shipMask          // Primary ship placement board
 * const subGroups = [
 *   { validator: canPlaceHull, zoneDetail: 1 },     // Standard group (hull)
 *   { validator: canPlaceEngine, zoneDetail: 1 },   // Special group 1 (engines)
 *   { validator: canPlaceWeapon, zoneDetail: 2 }    // Special group 2 (weapons)
 * ]
 * const variant = new Variant3(board, subGroups, 'D')
 *
 * @see {@link SpecialVariant} for parent class documentation
 * @see {@link types/variants.types.ts} for VariantGroup interface
 */
export class Variant3 extends SpecialVariant {
  /**
   * Creates a new Variant3 instance with three-layer hierarchical structure.
   * Splits provided subgroups into primary (standard) and secondary (special) layers.
   * Initializes boards for all variants using the symmetry type's transformation rules.
   *
   * @constructor
   * @param {Mask | Array<Array<number>>} board - Base board for all variants.
   *   Can be a Mask instance or coordinate array [[x1, y1], [x2, y2], ...].
   *   Represents the primary/standard placement layer for this variant set.
   * @param {VariantGroup[] | undefined} subGroups - Array of validation group configurations.
   *   First element becomes standardGroup, remaining become specialGroups.
   *   Each VariantGroup has validator and zoneDetail for constraint checking.
   *   If undefined or empty, standardGroup is undefined and specialGroups is [].
   * @param {string} symmetry - Symmetry type identifier.
   *   Determines transformation capabilities (rotation/flip rules).
   *   Passed to SpecialVariant parent class constructor.
   *
   * @throws {Error} If parent SpecialVariant.buildBoard3() encounters invalid board data.
   *   Error propagated from parent class board initialization.
   *
   * @example
   * // Basic 3-layer variant
   * const variant = new Variant3(shipBoard, [hullGroup, engineGroup, weaponGroup], 'D')
   *
   * @example
   * // Variant with no subgroups
   * const variant = new Variant3(board, undefined, 'S')
   * // standardGroup is undefined, specialGroups is []
   *
   * @example
   * // Single subgroup (all goes to standardGroup)
   * const variant = new Variant3(board, [primaryGroup], 'H')
   * // standardGroup = primaryGroup, specialGroups = []
   *
   * @protected
   */
  constructor (board, subGroups, symmetry) {
    super(symmetry)

    /**
     * Array of placement validation groups for this variant.
     * Includes both standard and special groups - used for comprehensive layer management.
     * Typically populated from parameter subGroups during construction.
     *
     * @type {VariantGroup[]}
     * @public
     */
    this.subGroups = Array.isArray(subGroups) ? subGroups : []

    const [head, ...tail] = this.subGroups

    /**
     * Primary/standard placement validation group.
     * First element of subGroups - represents main component layer (e.g., ship hull).
     * Contains validator function and zoneDetail for base placement constraints.
     * May be undefined if no subgroups provided.
     *
     * @type {VariantGroup | undefined}
     * @public
     */
    this.standardGroup = head

    /**
     * Secondary/special placement validation groups.
     * All elements of subGroups after the first (standardGroup).
     * Each represents an additional placement layer (e.g., engines, weapons, equipment).
     * Empty array if fewer than 2 subgroups provided.
     * Each group can have independent validation rules and zone constraints.
     *
     * @type {VariantGroup[]}
     * @public
     */
    this.specialGroups = tail

    this.buildBoard3(symmetry, board)
  }

  /**
   * Configures behavior for Variant3 using the shared special variant helper.
   * Static factory method that applies SpecialVariant behavior configuration.
   * Sets up transformation functions and variant management for the given instance.
   *
   * @static
   * @param {Function} VariantClass - Variant3 class or subclass to configure.
   *   Used to identify the class being configured for behavior setup.
   * @param {Variant3} instance - Instance to configure with behavior.
   *   Passed to SpecialVariant.setBehaviourTo() for setup.
   *
   * @returns {*} Result from SpecialVariant.setBehaviourTo().
   *   Typically returns instance or configuration object.
   *
   * @example
   * // Called by SpecialVariant static setup
   * Variant3.setBehaviour(Variant3, variantInstance)
   *
   * @see {@link SpecialVariant.setBehaviourTo} for behavior configuration details
   *
   * @public
   */
  static setBehaviour (VariantClass, instance) {
    return SpecialVariant.setBehaviourTo(VariantClass, instance)
  }
}
