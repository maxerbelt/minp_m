/* eslint-env jest */

/* global describe, it, expect, beforeEach, test */

import { Mask } from './rectangle/mask.js'

BigInt.prototype.toJSON = function () {
  return this.toString()
}

describe('MaskBase square getter', () => {
  describe('basic functionality', () => {
    test('square getter exists and is callable', () => {
      const mask = Mask.empty(4, 2)
      expect(mask).toHaveProperty('square')
      expect(typeof mask.square).not.toBe('undefined')
    })

    test('square getter returns a Mask instance', () => {
      const mask = Mask.empty(4, 2)
      const squared = mask.square
      expect(squared).toBeInstanceOf(Mask)
    })

    test('returns square dimensions for rectangular mask', () => {
      const mask = Mask.empty(4, 2)
      const squared = mask.square

      const size = Math.max(4, 2)
      expect(squared.width).toBe(size)
      expect(squared.height).toBe(size)
    })
  })

  describe('square dimension calculation', () => {
    test('should return 4x4 for 4x2 mask', () => {
      const mask = Mask.empty(4, 2)
      const squared = mask.square

      expect(squared.width).toBe(4)
      expect(squared.height).toBe(4)
    })

    test('should return 4x4 for 2x4 mask', () => {
      const mask = Mask.empty(2, 4)
      const squared = mask.square

      expect(squared.width).toBe(4)
      expect(squared.height).toBe(4)
    })

    test('should return same dimensions for square mask', () => {
      const mask = Mask.empty(5, 5)
      const squared = mask.square

      expect(squared.width).toBe(5)
      expect(squared.height).toBe(5)
    })

    test('should handle 1x1 mask', () => {
      const mask = Mask.empty(1, 1)
      const squared = mask.square

      expect(squared.width).toBe(1)
      expect(squared.height).toBe(1)
    })

    test('should use Math.max for size calculation', () => {
      const testCases = [
        { w: 3, h: 7, expected: 7 },
        { w: 10, h: 5, expected: 10 },
        { w: 6, h: 6, expected: 6 }
      ]

      for (const testCase of testCases) {
        const mask = Mask.empty(testCase.w, testCase.h)
        const squared = mask.square

        expect(squared.width).toBe(testCase.expected)
        expect(squared.height).toBe(testCase.expected)
      }
    })
  })

  describe('depth preservation', () => {
    test('should preserve depth on rectangular to square conversion', () => {
      const mask = Mask.empty(4, 2)
      const squared = mask.square

      expect(squared.depth).toBe(1)
    })

    test('should preserve depth for multi-depth masks', () => {
      const depthTests = [1, 2, 3, 4]

      for (const depth of depthTests) {
        const mask = new Mask(4, 2, 0n, null, depth)
        const squared = mask.square

        expect(squared.depth).toBe(depth)
      }
    })

    test('should preserve depth when already square', () => {
      const mask = new Mask(5, 5, 0n, null, 3)
      const squared = mask.square

      expect(squared.depth).toBe(3)
    })
  })

  describe('bit content preservation', () => {
    test('should preserve non-zero bits when expanding narrow mask', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const mask = Mask.fromCoords(coords, 2, 1)
      const squared = mask.square

      // Check that original cells are occupied
      expect(squared.at(0, 0)).toBeGreaterThan(0)
      expect(squared.at(0, 1)).toBeGreaterThan(0)
    })

    test('should expand to square with low occupancy', () => {
      const coords = [[0, 0]]
      const mask = Mask.fromCoords(coords, 4, 1)
      const squared = mask.square

      // Should have same occupancy  (1 occupied cell)
      expect(squared.occupancy).toBe(1)
    })

    test('should preserve occupancy count', () => {
      const coords = [
        [0, 0],
        [0, 1],
        [0, 2]
      ]
      const mask = Mask.fromCoords(coords, 3, 1)
      const original_occupancy = mask.occupancy

      const squared = mask.square
      expect(squared.occupancy).toBe(original_occupancy)
    })

    test('should handle empty mask expansion', () => {
      const mask = Mask.empty(4, 1)
      const squared = mask.square

      expect(squared.occupancy).toBe(0)
      expect(squared.width).toBe(4)
      expect(squared.height).toBe(4)
    })
  })

  describe('constructor and type consistency', () => {
    test('should create masks of same type', () => {
      const mask = Mask.empty(4, 2)
      const squared = mask.square

      expect(squared.constructor).toBe(mask.constructor)
      expect(squared).toBeInstanceOf(Mask)
    })

    test('should be a new instance, not reference to original', () => {
      const mask = Mask.empty(4, 2)
      const squared = mask.square

      expect(squared).not.toBe(mask)
    })

    test('should be a new instance even for already-square masks', () => {
      const mask = Mask.empty(5, 5)
      const squared = mask.square

      expect(squared).not.toBe(mask)
    })
  })

  describe('idempotence and consistency', () => {
    test('applying square twice should be consistent', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const mask = Mask.fromCoords(coords, 2, 1)

      const squared1 = mask.square
      const squared2 = squared1.square

      expect(squared2.width).toBe(squared1.width)
      expect(squared2.height).toBe(squared1.height)
      expect(squared2.occupancy).toBe(squared1.occupancy)
    })

    test('multiple calls should produce consistent results', () => {
      const mask = Mask.empty(3, 1)

      const squared1 = mask.square
      const squared2 = mask.square

      expect(squared1.width).toBe(squared2.width)
      expect(squared1.height).toBe(squared2.height)
      expect(squared1.depth).toBe(squared2.depth)
    })

    test('store properties should be consistent', () => {
      const mask = Mask.empty(4, 2)
      const squared = mask.square

      expect(squared.store).toBeDefined()
      expect(squared.store.width).toBe(4)
      expect(squared.store.height).toBe(4)
    })
  })

  describe('rectangular dimensions', () => {
    test('handles very wide mask', () => {
      const mask = Mask.empty(20, 1)
      const squared = mask.square

      expect(squared.width).toBe(20)
      expect(squared.height).toBe(20)
    })

    test('handles very tall mask', () => {
      const mask = Mask.empty(1, 20)
      const squared = mask.square

      expect(squared.width).toBe(20)
      expect(squared.height).toBe(20)
    })

    test('handles nearly-square mask with width > height', () => {
      const mask = Mask.empty(10, 8)
      const squared = mask.square

      expect(squared.width).toBe(10)
      expect(squared.height).toBe(10)
    })

    test('handles nearly-square mask with height > width', () => {
      const mask = Mask.empty(8, 10)
      const squared = mask.square

      expect(squared.width).toBe(10)
      expect(squared.height).toBe(10)
    })
  })

  describe('with occupied cells', () => {
    test('expands row of cells to square', () => {
      const coords = [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3]
      ]
      const mask = Mask.fromCoords(coords, 4, 1)
      const squared = mask.square

      expect(squared.width).toBe(4)
      expect(squared.height).toBe(4)
      expect(squared.occupancy).toBe(4)
    })

    test('expands column of cells to square', () => {
      const coords = [
        [0, 0],
        [1, 0],
        [2, 0]
      ]
      const mask = Mask.fromCoords(coords, 1, 3)
      const squared = mask.square

      expect(squared.width).toBe(3)
      expect(squared.height).toBe(3)
      expect(squared.occupancy).toBe(3)
    })

    test('preserves cell colors in multi-depth mask', () => {
      const mask = new Mask(2, 3, null, null, 1)
      mask.set(0, 0)
      mask.set(1, 1)

      const squared = mask.square

      expect(squared.at(0, 0)).toBe(1)
      expect(squared.at(1, 1)).toBe(1)
      expect(squared.at(0, 1)).toBe(0)
    })
  })
})
