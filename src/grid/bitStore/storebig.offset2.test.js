/* eslint-env jest */
/* global describe, it, expect */
import { StoreBig } from './storeBig.js'
import { Mask } from '../rectangle/mask.js'

function ascii (width, height, bits, depth = 2) {
  const m = new Mask(width, height, bits, null, depth)
  return m.toAscii
}
BigInt.prototype.toJSON = function () {
  return this.toString()
}
describe('StoreBig expand with offset 2', () => {
  describe('expandToWidthWithXYOffset', () => {
    it('should expand with zero X and Y offsets (same as expandToWidth)', () => {
      const store1 = new StoreBig(1, 8, 1, 4, 2)
      const bitboard = 0b11110101n
      const resultNoOffset = store1.expandToWidthWithXYOffset(
        4,
        2,
        bitboard,
        8,
        0,
        0
      )
      const resultBase = store1.expandToWidth(4, 2, bitboard, 8)
      expect(resultNoOffset).toBe(resultBase)
    })

    it('should shift bits by X offset', () => {
      const store1 = new StoreBig(1, 4, 1, 4, 1)
      const bitboard = 0b1111n
      const resultNoOffset = store1.expandToWidthWithXYOffset(
        4,
        1,
        bitboard,
        8,
        0,
        0
      )
      const resultWithOffsetX = store1.expandToWidthWithXYOffset(
        4,
        1,
        bitboard,
        8,
        2,
        0
      )
      // Result with X offset should be shifted left by 2 bits on the row
      expect(resultWithOffsetX).toBe(resultNoOffset << 2n)
    })

    it('should shift bits by Y offset', () => {
      const store1 = new StoreBig(1, 8, 1, 4, 2)
      const bitboard = 0b11110101n // Row 0: 0101, Row 1: 1111
      const resultNoOffset = store1.expandToWidthWithXYOffset(
        4,
        2,
        bitboard,
        8,
        0,
        0
      )
      const resultWithOffsetY = store1.expandToWidthWithXYOffset(
        4,
        2,
        bitboard,
        8,
        0,
        1
      )
      expect(resultWithOffsetY).toBe(resultNoOffset << 8n)
    })

    it('should shift bits by both X and Y offsets', () => {
      const store1 = new StoreBig(1, 4, 1, 2, 2)
      const bitboard = 0b1101n // Row 0: 01, Row 1: 11
      const resultNoOffset = store1.expandToWidthWithXYOffset(
        2,
        2,
        bitboard,
        4,
        0,
        0
      )
      const resultWithOffsets = store1.expandToWidthWithXYOffset(
        2,
        2,
        bitboard,
        4,
        1,
        1
      )
      // With offsetX=1, offsetY=1: row 0 shifts by (0+1)*4+1 = 5, row 1 shifts by (1+1)*4+1 = 9
      // The result should be different as bits are placed in different positions
      expect(resultWithOffsets).not.toBe(resultNoOffset)
    })

    it('should preserve occupancy with offsets', () => {
      const store1 = new StoreBig(1, 9, 1, 3, 3)
      const bitboard = 0b101010101n
      expect(store1.occupancy(bitboard)).toBe(5)
      expect(ascii(3, 3, bitboard, 1)).toBe('1.1\n.1.\n1.1')
      const resultNoOffset = store1.expandToWidthWithXYOffset(
        3,
        3,
        bitboard,
        6,
        0,
        0
      )
      expect(ascii(6, 3, resultNoOffset, 1)).toBe('1.1...\n.1....\n1.1...')
      expect(store1.occupancy(resultNoOffset)).toBe(5)
      const resultWithXOffset = store1.expandToWidthWithXYOffset(
        3,
        3,
        bitboard,
        6,
        2,
        0
      )

      expect(store1.occupancy(resultWithXOffset)).toBe(5)
      expect(ascii(6, 3, resultWithXOffset, 1)).toBe('..1.1.\n...1..\n..1.1.')
      const resultWithXYOffset = store1.expandToWidthWithXYOffset(
        3,
        3,
        bitboard,
        6,
        2,
        1
      )
      expect(ascii(6, 4, resultWithXYOffset, 1)).toBe(
        '......\n..1.1.\n...1..\n..1.1.'
      )

      expect(store1.occupancy(resultWithXYOffset)).toBe(5)
    })

    it('should preserve occupancy with offsets 4x4', () => {
      const store1 = new StoreBig(1, 9, 1, 4, 4)
      const bitboard = 0b11101110111n
      expect(store1.occupancy(bitboard)).toBe(9)
      expect(ascii(4, 4, bitboard, 1)).toBe('111.\n111.\n111.\n....')
      const result = store1.expandToWidthWithXYOffset(4, 4, bitboard, 6, 1, 1)
      expect(ascii(6, 4, result, 1)).toBe('......\n.111..\n.111..\n.111..')
      expect(store1.occupancy(result)).toBe(9)
    })
    it('should preserve occupancy with offsets 3x2', () => {
      const store1 = new StoreBig(1, 9, 1, 3, 2)
      const bitboard = 0b11111n
      expect(store1.occupancy(bitboard)).toBe(5)
      expect(ascii(3, 2, bitboard, 1)).toBe('111\n11.')
      const result = store1.expandToWidthWithXYOffset(3, 2, bitboard, 6, 1, 1)
      expect(ascii(6, 3, result, 1)).toBe('......\n.111..\n.11...')
      expect(store1.occupancy(result)).toBe(5)
    })
    it('should handle default offset parameters', () => {
      const store1 = new StoreBig(1, 8, 1, 4, 2)
      const bitboard = 0b11110101n
      const resultDefault = store1.expandToWidthWithXYOffset(4, 2, bitboard, 8)
      const resultExplicit = store1.expandToWidthWithXYOffset(
        4,
        2,
        bitboard,
        8,
        0,
        0
      )
      expect(resultDefault).toBe(resultExplicit)
    })
  })
})
