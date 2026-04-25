import { Blinker } from './Blinker.js'
import { Orbit4R } from './Orbit4R.js'
import { Asymmetric } from './asymmetric.js'
import { Diagonal } from './Diagonal.js'
import { Invariant } from './Invariant.js'
import { Orbit4F } from './Orbit4F.js'

/**
 * Returns the appropriate variant class based on symmetry type.
 * @param {string} symmetry - The symmetry identifier.
 * @returns {Function} The variant class constructor.
 * @throws {Error} If the symmetry type is unknown.
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
