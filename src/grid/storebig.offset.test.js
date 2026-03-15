/* eslint-env jest */
/* global describe, it, expect, beforeEach */
import { StoreBig } from './storeBig.js'
import { Mask } from './mask.js'

function ascii (width, height, bits, depth = 2) {
  const m = new Mask(width, height, bits, null, depth)
  return m.toAscii
}
BigInt.prototype.toJSON = function () {
  return this.toString()
}
describe('StoreBig expand with offset', () => {
  describe('expandToWidthWithOffset', () => {
    it('should expand with zero offset (same as expandToWidth)', () => {
      const store1 = new StoreBig(3, 4, 2, 4, 1)
      const bitboard = 0b1010101n
      const resultNoOffset = store1.expandToWidthWithOffset(
        4,
        1,
        bitboard,
        8,
        0
      )
      const resultBase = store1.expandToWidth(4, 1, bitboard, 8)
      expect(resultNoOffset).toBe(resultBase)
    })

    it('should shift bits by offset amount', () => {
      const store1 = new StoreBig(3, 4, 2, 4, 1)
      const bitboard = 0b1111n
      const resultNoOffset = store1.expandToWidthWithOffset(
        4,
        1,
        bitboard,
        8,
        0
      )
      const resultWithOffset = store1.expandToWidthWithOffset(
        4,
        1,
        bitboard,
        8,
        2
      )
      // Result with offset should be shifted left by 2 bits
      expect(resultWithOffset).toBe(resultNoOffset << 4n)
    })

    it('should preserve occupancy with offset', () => {
      const store1 = new StoreBig(3, 6, 2, 2, 3)
      const bitboard = 0b10100010001n
      const resultNoOffset = store1.expandToWidthWithOffset(
        2,
        3,
        bitboard,
        4,
        0
      )
      const resultWithOffset = store1.expandToWidthWithOffset(
        2,
        3,
        bitboard,
        4,
        3
      )
      expect(store1.occupancy(resultNoOffset)).toBe(
        store1.occupancy(resultWithOffset)
      )
    })

    it('should handle default offset parameter', () => {
      const store1 = new StoreBig(3, 8, 2, 4, 2)
      const bitboard = 0b101010100010001n
      const resultDefault = store1.expandToWidthWithOffset(4, 2, bitboard, 8)
      const resultExplicit = store1.expandToWidthWithOffset(
        4,
        2,
        bitboard,
        8,
        0
      )
      expect(resultDefault).toBe(resultExplicit)
    })
  })
})
