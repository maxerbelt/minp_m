/* eslint-env jest */

/* global beforeEach, describe, it, expect */
import { Mask } from './mask.js'

import { beforeEach, describe, it, expect, jest } from '@jest/globals'

// Jest test suite
describe('Mask', () => {
  let mask

  beforeEach(() => {
    mask = new Mask(10, 10)
  })

  describe('index', () => {
    it('should calculate correct bit index', () => {
      expect(mask.index(0, 0)).toBe(0)
      expect(mask.index(1, 0)).toBe(1)
      expect(mask.index(0, 1)).toBe(10)
      expect(mask.index(5, 5)).toBe(55)
    })
  })

  describe('set and test', () => {
    it('should set and test bits correctly', () => {
      expect(mask.for(0, 0).test()).toBe(false)
      mask.set(0, 0)
      expect(mask.for(0, 0).test()).toBe(true)
      //  mask.set(5, 5)
      const forloc = mask.for(5, 5)
      mask.bits = forloc.set()
      expect(forloc.pos).toBe(55n)
      expect(forloc.at()).toBe(1)
      expect(forloc.test()).toBe(true)
    })
  })

  describe('clear', () => {
    it('should clear a bit', () => {
      mask.set(3, 3)
      expect(mask.for(3, 3).test()).toBe(true)
      mask.clear(3, 3)
      expect(mask.for(3, 3).test()).toBe(false)
    })
  })

  describe('occupancy', () => {
    it('should return correct popcount', () => {
      expect(mask.occupancy).toBe(0)
      mask.set(0, 0)
      expect(mask.occupancy).toBe(1)
      mask.set(1, 1)
      expect(mask.occupancy).toBe(2)
    })
  })
  describe('setRange and clearRange', () => {
    it('should set range of bits in a row', () => {
      mask.setRange(0, 0, 3)
      expect(mask.for(0, 0).test()).toBe(true)
      expect(mask.for(1, 0).test()).toBe(true)
      expect(mask.for(3, 0).test()).toBe(true)
      expect(mask.for(4, 0).test()).toBe(false)
    })

    it('should clear range of bits in a row', () => {
      mask.setRange(0, 0, 5)
      mask.clearRange(0, 1, 3)
      expect(mask.test(0, 0)).toBe(true)
      expect(mask.test(1, 0)).toBe(false)
      expect(mask.test(4, 0)).toBe(true)
    })
  })

  describe('fromCoords and toCoords', () => {
    it('should convert from and to coordinates', () => {
      const coords = [
        [0, 0],
        [5, 5],
        [9, 9]
      ]
      mask.fromCoords(coords)

      expect(mask.test(0, 0)).toBe(true)
      expect(mask.test(1, 0)).toBe(false)
      expect(mask.test(5, 0)).toBe(false)
      expect(mask.test(5, 5)).toBe(true)
      expect(mask.test(9, 9)).toBe(true)
      const result = mask.toCoords
      // Use toSorted for non-mutating sort and compare arrays of arrays
      expect(result.toSorted((a, b) => a[0] - b[0] || a[1] - b[1])).toEqual(
        coords.toSorted((a, b) => a[0] - b[0] || a[1] - b[1])
      )
    })

    it('should handle empty coordinates', () => {
      mask.fromCoords([])
      expect(mask.toCoords).toEqual([])
    })
  })
})
