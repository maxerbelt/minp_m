/**
 * @fileoverview Variant system type definitions.
 * Defines interfaces and types for the variant management system including variant classes,
 * transformations, symmetry types, and variant groups used in placement hierarchies.
 */

import type { PlacementValidator, VariantTransitionFn, OnChangeCallback } from './callbacks.types'
import type { ZoneInfo } from './placement.types'

/**
 * Variant index - identifies which variant is selected in a variant list.
 * Numeric index into the variants array (0-based).
 * Can be undefined/null when referring to the currently active variant.
 */

/**
 * Zone detail level for variant placement queries.
 * Numeric or object type allowing flexible detail specification.
 * 0 = no zone detail (no zone validation)
 * 1 = subterrain level (terrain type based constraints)
 * 2 = zone level (specific zone identifier based constraints)
 * Can be Record<string, any> for complex zone metadata.
 *
 * @typedef {number | Record<string, any>} ZoneDetailType
 */
export type ZoneDetailType = number | Record<string, any>

/**
 * Variant group configuration - represents a placement layer with its own validation.
 * Used in hierarchical variants (Variant3, SpecialVariant) to define multiple placement areas.
 * Each group can have independent validation rules and zone constraints.
 *
 * @interface VariantGroup
 */
export interface VariantGroup {
  /**
   * Validation function for zone constraints specific to this group.
   * Determines which zones are valid for cells in this specific layer.
   * May differ from parent variant's validator for specialized placement rules.
   *
   * @type {PlacementValidator}
   */
  validator: PlacementValidator

  /**
   * Zone detail level for this group's placement queries.
   * Controls granularity of zone information retrieved for this layer.
   * Independent of parent variant's zone detail level.
   *
   * @type {ZoneDetailType}
   */
  zoneDetail: ZoneDetailType

  /**
   * Optional parent variant reference.
   * Used to link subgroups back to their parent variant for cascading updates.
   * Set during initialization for hierarchical variant systems.
   *
   * @type {any}
   * @optional
   */
  parent?: any
}

/**
 * Variant type handler - static methods for managing a specific variant type.
 * Each symmetry type (S, L, D, A, H, G) has a corresponding handler with these methods.
 * Used by the variant factory (variantType) to create and configure variant instances.
 *
 * @interface VariantTypeHandler
 */
export interface VariantTypeHandler {
  /**
   * Generates all variant boards for a given base board.
   * Optional method - not all variant types implement it.
   * Used by SpecialVariant and others to build variant lists from base boards.
   *
   * @type {((board: any) => any[]) | undefined}
   * @optional
   */
  variantsOf?: (board: any) => any[]

  /**
   * Maps variant index to its rotation equivalent.
   * Defines rotation transformation for this variant type's symmetry.
   *
   * @type {VariantTransitionFn}
   */
  r: VariantTransitionFn

  /**
   * Maps variant index to its flip equivalent.
   * Defines flip/reflection transformation for this variant type's symmetry.
   *
   * @type {VariantTransitionFn}
   */
  f: VariantTransitionFn

  /**
   * Maps variant index to its rotate-then-flip equivalent.
   * Defines combined rotation and flip transformation for this variant type's symmetry.
   *
   * @type {VariantTransitionFn}
   */
  rf: VariantTransitionFn

  /**
   * Configures behavior of a variant instance based on its symmetry type.
   * Sets up transition functions and transformation capabilities on the variant instance.
   *
   * @type {(VariantClass: any, instance: any) => void}
   */
  setBehaviour: (VariantClass: any, instance: any) => void
}

/**
 * Symmetry type identifier - one-letter code for variant symmetry class.
 * Enum-like values for different symmetry types supported by the variant system:
 * - 'S' = Invariant (no transformation)
 * - 'L' = Blinker (2 rotations)
 * - 'D' = Asymmetric (8 orientations: 4 rotations + 4 flipped)
 * - 'A' = Orbit4F (4 variants with flip)
 * - 'H' = Orbit4R (4 rotations)
 * - 'G' = Diagonal (diagonal flip)
 *
 * @typedef {('S' | 'L' | 'D' | 'A' | 'H' | 'G')} SymmetryType
 */
export type SymmetryType = 'S' | 'L' | 'D' | 'A' | 'H' | 'G'

/**
 * Variant board type - represents a specific orientation/variant of a shape.
 * Typically a Mask instance or compatible bitboard structure.
 * Stored in Variants.list array and indexed by numeric variant index.
 * External Mask type from grid/rectangle/mask.js
 */

/**
 * Variant transformation capabilities interface.
 * Describes what transformations a variant instance supports.
 * Used to determine which UI controls are available for variant selection.
 *
 * @interface VariantCapabilities
 */
export interface VariantCapabilities {
  /**
   * Whether this variant can be rotated.
   * If true, rotation functions (r, r1) are available.
   *
   * @type {boolean}
   */
  canRotate: boolean

  /**
   * Whether this variant can be flipped.
   * If true, flip functions (f, f1) are available.
   *
   * @type {boolean}
   */
  canFlip: boolean

  /**
   * Whether this variant can be transformed (rotated/flipped).
   * True if variant has any transformation capability.
   * Used to determine if variant selection UI should be shown.
   *
   * @type {boolean}
   */
  canTransform: boolean
}

/**
 * Variant state configuration interface.
 * Encapsulates the runtime state of a variant instance including current selection,
 * transformation functions, and capabilities.
 *
 * @interface VariantState
 * @extends {VariantCapabilities}
 */
export interface VariantState extends VariantCapabilities {
  /**
   * Current selected variant index.
   * The index into the variants list of the active variant.
   * Updates when variant is changed via setByIndex or transitions.
   *
   * @type {number}
   */
  index: number

  /**
   * Rotation transition function for this instance.
   * Maps current index to next rotated variant index.
   * Bound to this specific variant's transformation schema.
   *
   * @type {VariantTransitionFn}
   */
  r1: VariantTransitionFn

  /**
   * Flip transition function for this instance.
   * Maps current index to flipped variant index.
   * Bound to this specific variant's transformation schema.
   *
   * @type {VariantTransitionFn}
   */
  f1: VariantTransitionFn

  /**
   * Rotate-then-flip transition function for this instance.
   * Maps current index to rotated-and-flipped variant index.
   * Bound to this specific variant's transformation schema.
   *
   * @type {VariantTransitionFn}
   */
  rf1: VariantTransitionFn

  /**
   * Change event handler - called when variant or state changes.
   * Allows observers to react to variant transformations.
   *
   * @type {OnChangeCallback}
   */
  onChange: OnChangeCallback
}

/**
 * Weapon type - represents a weapon object with placement and game properties.
 * Generic weapon interface that can be extended with game-specific properties.
 * Used in weapon placement variants (PlaceableW, CellWsToBePlaced, WeaponVariant).
 *
 * @interface Weapon
 */
export interface Weapon {
  /**
   * Optional unique weapon identifier for tracking and reference.
   *
   * @type {string}
   * @optional
   */
  id?: string

  /**
   * Optional weapon type classification (missile, cannon, laser, etc.).
   *
   * @type {string}
   * @optional
   */
  type?: string

  /**
   * Optional damage value (points dealt per successful hit).
   *
   * @type {number}
   * @optional
   */
  damage?: number

  /**
   * Optional maximum effective range in grid units.
   *
   * @type {number}
   * @optional
   */
  range?: number

  /**
   * Optional special effect description or identifier.
   *
   * @type {string}
   * @optional
   */
  effect?: string

  /**
   * Allow any additional game-specific weapon properties.
   *
   * @type {*}
   */
  [key: string]: any
}

/**
 * Weapon mapping keyed by coordinate string - maps cell positions to weapon objects.
 * Uses coordinate keys (created from cell coordinates) to enable O(1) weapon lookup by position.
 * Used internally by CellWsToBePlaced and weapon placement variants.
 *
 * @typedef {Object.<string, Weapon>} WeaponCellMap
 */
export type WeaponCellMap = Record<string, Weapon>

/**
 * SubGroup placed configuration - represents a placed subgroup with candidate checking.
 * Used in Cell3sToBePlaced and Cell-based placement variants.
 *
 * @interface SubGroupPlaced
 */
export interface SubGroupPlaced {
  /**
   * Optional array of cell coordinates in [row, column] format.
   * The actual cell positions that make up this subgroup.
   * May be undefined if subgroup has no cells.
   *
   * @type {Array<[number, number]>}
   * @optional
   */
  cells?: Array<[number, number]>

  /**
   * Checks if a position is a candidate cell for placement.
   * Returns true if position contains a placeable cell in this subgroup.
   *
   * @type {(x: number, y: number) => boolean}
   */
  isCandidate: (x: number, y: number) => boolean

  /**
   * Validates zone constraints for a position in this subgroup.
   * Returns true if zone is valid for placement in this subgroup.
   *
   * @type {(zoneInfo: ZoneInfo) => boolean}
   */
  validator: (zoneInfo: ZoneInfo) => boolean
}
