/* eslint-env jest */
/* global describe, it, expect, beforeEach, afterEach, jest */

import { CoordinateConversion } from './CoordinateConversion.js'
import { Mask } from '../rectangle/mask.js'

describe('CoordinateConversion', () => {
  let mask
  let conversion

  beforeEach(() => {
    mask = new Mask(5, 5)
    conversion = new CoordinateConversion(mask)
  })
  // ============================================================================
  // From/To Coordinates Properties
  // ============================================================================

  describe('fromCoordinates() and toCoordinates', () => {
    it('fromCoordinates() loads coordinates into mask bits', () => {
      const coords = [
        [1, 1],
        [2, 2],
        [3, 3]
      ]
      conversion.fromCoordinates(coords)

      expect(mask.at(1, 1)).toBeGreaterThan(0)
      expect(mask.at(2, 2)).toBeGreaterThan(0)
      expect(mask.at(3, 3)).toBeGreaterThan(0)
    })

    it('toCoordinates getter returns current bit coordinates', () => {
      mask.set(0, 0)
      mask.set(2, 2)

      const coords = conversion.toCoordinates
      expect(coords.length).toBe(2)
      expect(coords.some(c => c[0] === 0 && c[1] === 0)).toBe(true)
      expect(coords.some(c => c[0] === 2 && c[1] === 2)).toBe(true)
    })

    it('fromCoordinates() replaces existing bits', () => {
      mask.set(0, 0)
      mask.set(1, 1)

      conversion.fromCoordinates([[4, 4]])

      const coords = conversion.toCoordinates
      expect(coords.length).toBe(1)
      expect(coords[0][0]).toBe(4)
      expect(coords[0][1]).toBe(4)
    })

    it('roundtrip conversion preserves x,y values', () => {
      const coordsAsXY = [
        [0, 1],
        [2, 3],
        [4, 4]
      ]

      conversion.fromCoordinates(coordsAsXY)
      expect(conversion.mask.occupancy).toBe(3)
      const retrievedCoords = conversion.toCoordinates
      expect(retrievedCoords.length).toBe(3)
      expect(retrievedCoords.map(c => [c[0], c[1]])).toEqual(coordsAsXY)
    })
  })
})
