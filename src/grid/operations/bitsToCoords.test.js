/**
 * @jest-environment jsdom
 *
 * CoordinateConversion bitsToCoordinates tests
 *
 * Test suite for bit-to-coordinate conversion operations:
 * - Empty bit set handling
 * - Single cell conversion
 * - Multiple cell conversions
 * - Coordinate format validation
 */

import { CoordinateConversion } from './CoordinateConversion.js'
import { Mask } from '../rectangle/mask.js'

/**
 * Test suite for CoordinateConversion.bitsToCoordinates() method.
 * Tests conversion of bit masks to coordinate arrays with validation.
 *
 * @description
 * The bitsToCoordinates() method converts a bit mask representation of set cells
 * into an array of coordinate tuples [x, y, index] for each set bit.
 * This is essential for translating between bitboard and coordinate representations.
 */
describe('CoordinateConversion bitsToCoordinates', () => {
  /**
   * Bit mask instance for testing set cells.
   * 5x5 grid used for coordinate conversion tests.
   *
   * @type {Mask}
   */
  let mask

  /**
   * CoordinateConversion instance for testing.
   * Initialized with test mask for bit-to-coordinate operations.
   *
   * @type {CoordinateConversion}
   */
  let conversion

  /**
   * Setup test fixture before each test.
   * Initializes a 5x5 Mask and creates a CoordinateConversion instance
   * bound to that mask for testing coordinate transformations.
   *
   * @returns {void}
   */
  beforeEach(() => {
    mask = new Mask(5, 5)
    conversion = new CoordinateConversion(mask)
  })
  // ============================================================================
  // Bit to Coordinate Conversion
  // ============================================================================

  /**
   * bitsToCoordinates() method tests.
   * Tests conversion of bit representations to coordinate arrays.
   *
   * @description
   * Tests validate that the bitsToCoordinates() method correctly:
   * - Returns empty array for empty bit set
   * - Converts single cell bit to coordinate array
   * - Converts multiple cell bits to coordinate arrays
   * - Includes index in coordinate tuples
   */
  describe('bitsToCoordinates()', () => {
    /**
     * Test empty bit set conversion.
     * Verifies that an empty mask with no set bits converts to empty coordinate array.
     *
     * @returns {void}
     */
    it('converts empty bits to empty coordinate array', () => {
      mask.bits = conversion.store.empty
      const coords = conversion.bitsToCoordinates()
      expect(coords).toEqual([])
    })

    /**
     * Test single cell conversion.
     * Verifies that a single set cell at (2, 2) converts to coordinate array
     * with proper x, y, and index values.
     *
     * @returns {void}
     */
    it('converts bits with single set cell to coordinate array', () => {
      mask.set(2, 2)
      const coords = conversion.bitsToCoordinates()
      expect(coords.length).toBe(1)
      expect(coords[0][0]).toBe(2) // x
      expect(coords[0][1]).toBe(2) // y
      expect(coords[0].length).toBe(3) // [x, y, index]
    })

    /**
     * Test multiple cell conversion.
     * Verifies that multiple set cells convert to coordinate arrays
     * containing all cell positions in correct format.
     *
     * @returns {void}
     */
    it('converts bits with multiple set cells to coordinate array', () => {
      mask.set(0, 0)
      mask.set(1, 2)
      mask.set(2, 0)
      const coords = conversion.bitsToCoordinates()
      expect(coords.length).toBe(3)
      expect(coords.some(c => c[0] === 0 && c[1] === 0)).toBe(true)
      expect(coords.some(c => c[0] === 1 && c[1] === 2)).toBe(true)
      expect(coords.some(c => c[0] === 2 && c[1] === 0)).toBe(true)
    })
  })
})
