/* eslint-env jest */
/* global describe, it, expect, beforeEach, afterEach, jest */
import { CoordinateConversion } from './CoordinateConversion.js'
import { Mask } from './rectangle/mask.js'

describe('CoordinateConversion bitsToCoordinates', () => {
  let mask
  let conversion

  beforeEach(() => {
    mask = new Mask(5, 5)
    conversion = new CoordinateConversion(mask)
  })
  // ============================================================================
  // Bit to Coordinate Conversion
  // ============================================================================

  describe('bitsToCoordinates()', () => {
    it('converts empty bits to empty coordinate array', () => {
      mask.bits = conversion.store.empty
      const coords = conversion.bitsToCoordinates()
      expect(coords).toEqual([])
    })

    it('converts bits with single set cell to coordinate array', () => {
      mask.set(2, 2)
      const coords = conversion.bitsToCoordinates()
      expect(coords.length).toBe(1)
      expect(coords[0][0]).toBe(2) // x
      expect(coords[0][1]).toBe(2) // y
      expect(coords[0].length).toBe(3) // [x, y, index]
    })

    it('converts bits with multiple set cells to coordinate array', () => {
      mask.set(0, 0)
      mask.set(1, 1)
      mask.set(2, 2)
      const coords = conversion.bitsToCoordinates()
      expect(coords.length).toBe(3)
      expect(coords.some(c => c[0] === 0 && c[1] === 0)).toBe(true)
      expect(coords.some(c => c[0] === 1 && c[1] === 1)).toBe(true)
      expect(coords.some(c => c[0] === 2 && c[1] === 2)).toBe(true)
    })
  })
})
