/* eslint-env jest */
/* global describe, it, expect, beforeEach, afterEach, jest */
import { CoordinateConversion } from './CoordinateConversion.js'
import { Mask } from '../rectangle/mask.js'

describe('CoordinateConversion coordinatesToBits', () => {
  let mask
  let conversion

  beforeEach(() => {
    mask = new Mask(5, 5)
    conversion = new CoordinateConversion(mask)
  })
  // ============================================================================
  // Coordinate to Bit Conversion
  // ============================================================================

  describe('coordinatesToBits()', () => {
    it('converts empty coordinate array to empty bits', () => {
      const coords = []
      const bits = conversion.coordinatesToBits(coords)
      expect(bits).toBe(conversion.store.empty)
    })

    it('converts single coordinate to bits', () => {
      const coords = [[1, 1]]
      const bits = conversion.coordinatesToBits(coords)
      expect(bits).not.toBe(conversion.store.empty)
    })

    it('converts multiple coordinates to bits', () => {
      const coords = [
        [0, 0],
        [1, 1],
        [2, 2]
      ]
      const bits = conversion.coordinatesToBits(coords)
      expect(bits).not.toBe(conversion.store.empty)
    })

    it('ignores invalid coordinates', () => {
      const coords = [
        [0, 0],
        [10, 10]
      ] // (10,10) is out of bounds
      const bits = conversion.coordinatesToBits(coords)
      // Should only include (0,0)
      mask.bits = conversion.store.empty
      mask.set(0, 0)
      const expectedBits = mask.bits
      expect(bits).toBe(expectedBits)
    })

    it('handles duplicate coordinates correctly', () => {
      const coords = [
        [1, 1],
        [1, 1]
      ]
      const bits = conversion.coordinatesToBits(coords)

      expect(bits).not.toBe(conversion.store.empty)
      conversion.mask.bits = bits
      expect(conversion.mask.occupancy).toBe(1) // Should only count (1,1) once
    })
  })
})
