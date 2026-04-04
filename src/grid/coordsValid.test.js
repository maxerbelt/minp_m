/* eslint-env jest */
/* global describe, it, expect, beforeEach, afterEach, jest */
import { CoordinateConversion } from './CoordinateConversion.js'
import { Mask } from './rectangle/mask.js'

describe('CoordinateConversion', () => {
  let mask
  let conversion

  beforeEach(() => {
    mask = new Mask(5, 5)
    conversion = new CoordinateConversion(mask)
  })

  // ============================================================================
  // Single Coordinate Operations
  // ============================================================================

  describe('coordinate validation', () => {
    it('isValidCoordinate() returns true for valid coordinates', () => {
      expect(conversion.isValidCoordinate(0, 0)).toBe(true)
      expect(conversion.isValidCoordinate(2, 2)).toBe(true)
      expect(conversion.isValidCoordinate(4, 4)).toBe(true)
    })

    it('isValidCoordinate() returns false for out-of-bounds coordinates', () => {
      expect(conversion.isValidCoordinate(-1, 0)).toBe(false)
      expect(conversion.isValidCoordinate(5, 5)).toBe(false)
      expect(conversion.isValidCoordinate(10, 10)).toBe(false)
    })

    it('isValidCoordinate() returns false for negative coordinates', () => {
      expect(conversion.isValidCoordinate(-1, -1)).toBe(false)
      expect(conversion.isValidCoordinate(0, -1)).toBe(false)
    })
  })
})
