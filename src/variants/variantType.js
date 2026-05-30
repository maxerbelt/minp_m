import { Blinker } from './Blinker.js'
import { Orbit4R } from './Orbit4R.js'
import { Asymmetric } from './asymmetric.js'
import { Diagonal } from './Diagonal.js'
import { Invariant } from './Invariant.js'
import { Orbit4F } from './Orbit4F.js'

/**
 * @fileoverview Variant class factory dispatcher.
 * Provides runtime resolution of variant class constructors based on symmetry identifiers.
 * Enables dynamic variant instantiation and type-safe class selection.
 *
 * Symmetry type identifiers:
 * - S: Invariant (no transformation, single variant)
 * - L: Blinker (2 variants, rotation only)
 * - D: Asymmetric (8 variants, full transformation)
 * - A: Orbit4F (4 variants via flipping)
 * - H: Orbit4R (4 variants via rotation)
 * - G: Diagonal (custom diagonal symmetry)
 *
 * @typedef {import('./types/variants.types.ts').SymmetryType} SymmetryType
 */

/**
 * Returns the appropriate variant class constructor based on symmetry type.
 * Factory function that maps symmetry identifiers to their corresponding variant classes.
 * Used during board configuration to instantiate the correct variant handler for a shape.
 *
 * @param {SymmetryType} symmetry - Symmetry type identifier (single character code).
 *   Valid values: 'S' (invariant), 'L' (blinker), 'D' (asymmetric),
 *   'A' (orbit4f), 'H' (orbit4r), 'G' (diagonal).
 *
 * @returns {Function} Variant class constructor for instantiation.
 *   Returns constructor function (not instance) ready for `new` operator.
 *   Returned class inherits from Variants base class with transformation support.
 *
 * @throws {Error} Unknown symmetry type provided.
 *   Error message format: "Unknown symmetry type: {symmetry}"
 *   Verify symmetry value is one of: S, L, D, A, H, G.
 *
 * @example
 * // Get variant class and instantiate
 * const VariantClass = variantType('D')  // Returns Asymmetric
 * const variant = new VariantClass(validator, zoneDetail)
 *
 * @example
 * // All symmetry types
 * variantType('S')  // → Invariant
 * variantType('L')  // → Blinker
 * variantType('D')  // → Asymmetric
 * variantType('A')  // → Orbit4F
 * variantType('H')  // → Orbit4R
 * variantType('G')  // → Diagonal
 *
 * @see {@link types/variants.types.ts} for SymmetryType definition
 * @see {@link Variants} for base class interface
 *
 * @public
 */
export function variantType (symmetry) {
  switch (symmetry) {
    case 'D':
      return Asymmetric
    case 'A':
      return Orbit4F
    case 'S':
      return Invariant
    case 'H':
      return Orbit4R
    case 'L':
      return Blinker
    case 'G':
      return Diagonal
    default:
      throw new Error(`Unknown symmetry type: ${symmetry}`)
  }
}
