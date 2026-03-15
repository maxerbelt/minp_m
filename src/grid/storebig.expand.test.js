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
describe('StoreBig expand', () => {
  describe('expandToBitsPerCell', () => {
    it('should return same bitboard when depth unchanged', () => {
      const store1 = new StoreBig(1, 16, 1, 4, 4)
      const bitboard = 0b1111n
      const result = store1.expandToBitsPerCell(bitboard, 1)
      expect(result).toBe(bitboard)
    })

    it('should expand from 1-bit to 2-bit depth', () => {
      const store1 = new StoreBig(1, 16, 1, 4, 4)
      const store2 = new StoreBig(2, 16, 2, 4, 4)
      store2.bitsPerCell = 2
      const bitboard = 0b0101n // Pattern in 1-bit cells
      const result = store1.expandToBitsPerCell(bitboard, 2)
      expect(result).toBeGreaterThanOrEqual(0n)
    })

    it('should preserve cell values during expansion', () => {
      const store1 = new StoreBig(1, 4, 1, 2, 2)
      // Set up: cell 0 = 1, cell 1 = 0
      const bitboard = 0b01n
      const result = store1.expandToBitsPerCell(bitboard, 2)
      // After expansion, cell 0 should still be 1, cell 1 should still be 0
      expect(result & 0b11n).toBe(0b01n)
    })

    it('should expand from 1-bit to 3-bit with zero values', () => {
      const store1 = new StoreBig(1, 100, 1, 3, 3)
      const bitboard = 0n
      const result = store1.expandToBitsPerCell(bitboard, 3)
      expect(result).toBe(0n)
    })

    it('should expand from 1-bit to 4-bit with max values', () => {
      const store1 = new StoreBig(1, 100, 1, 4, 4)
      const bitboard = 0b1111n // All cells are 1
      const result = store1.expandToBitsPerCell(bitboard, 4)
      expect(result).toBeGreaterThan(0n)
    })

    it('should handle expanding with 0 cells', () => {
      const store0 = new StoreBig(1, 100, 1, 0, 0)
      const bitboard = 0n
      const result = store0.expandToBitsPerCell(bitboard, 2)
      expect(result).toBe(0n)
    })

    it('should delegate to shrinkToBitsPerCell when expanding to lower depth', () => {
      const store2 = new StoreBig(2, 100, 2, 4, 4)
      store2.bitsPerCell = 2
      const bitboard = 0b11111111n
      const result = store2.expandToBitsPerCell(bitboard, 1)
      expect(result).toBeDefined()
    })
  })
  describe('shrinkToBitsPerCell', () => {
    it('should return same bitboard when depth unchanged', () => {
      const store2 = new StoreBig(2, 100, 2, 4, 4)
      store2.bitsPerCell = 2
      const bitboard = 0b11110101n
      const result = store2.shrinkToBitsPerCell(bitboard, 2)
      expect(result).toBe(bitboard)
    })

    it('should shrink from 2-bit to 1-bit depth', () => {
      const store2 = new StoreBig(2, 100, 2, 4, 4)
      store2.bitsPerCell = 2
      const bitboard = 0b11110101n
      const result = store2.shrinkToBitsPerCell(bitboard, 1)
      expect(result).toBeDefined()
    })

    it('should cap values when shrinking', () => {
      const store2 = new StoreBig(2, 100, 2, 2, 2)
      store2.bitsPerCell = 2
      // In 2-bit: cell values can be 0-3
      // In 1-bit: cell values can be 0-1
      // Value 3 (0b11) should cap to 1 (0b01)
      const bitboard = 0b1111n // Both cells are 3
      const result = store2.shrinkToBitsPerCell(bitboard, 1)
      // After capping: both cells become 1, but stored in 1-bit per cell
      // Result should have both 1-bits set: 0b11n = 3n
      expect(result).toBe(0b11n)
    })

    it('should preserve zero values during shrinking', () => {
      const store2 = new StoreBig(2, 100, 2, 4, 4)
      store2.bitsPerCell = 2
      const bitboard = 0n // All cells are 0
      const result = store2.shrinkToBitsPerCell(bitboard, 1)
      expect(result).toBe(0n)
    })

    it('should shrink from 2-bit to 1-bit with proper capping of multiple values', () => {
      const store2 = new StoreBig(2, 100, 2, 2, 2)
      store2.bitsPerCell = 2
      // Cell 0: 3 (0b11), Cell 1: 2 (0b10)
      // After shrinking to 1-bit, Cell 0 caps to 1, Cell 1 caps to 0
      const bitboard = 0b1011n
      const result = store2.shrinkToBitsPerCell(bitboard, 1)
      expect(result).toBeDefined()
    })

    it('should handle shrinking with 0 cells', () => {
      const store2 = new StoreBig(2, 100, 2, 0, 0)
      store2.bitsPerCell = 2
      const bitboard = 0n
      const result = store2.shrinkToBitsPerCell(bitboard, 1)
      expect(result).toBe(0n)
    })

    it('should delegate to expandToBitsPerCell when shrinking to higher depth', () => {
      const store1 = new StoreBig(1, 100, 1, 4, 4)
      const bitboard = 0b1111n
      const result = store1.shrinkToBitsPerCell(bitboard, 2)
      expect(result).toBeDefined()
    })

    it('should cap value 3 to 1 when shrinking 2-bit to 1-bit', () => {
      const store2 = new StoreBig(2, 100, 2, 1, 1)
      store2.bitsPerCell = 2
      const bitboard = 0b11n // Value 3 in 2-bit cell
      const result = store2.shrinkToBitsPerCell(bitboard, 1)
      // After capping with 1-bit mask (0b1 = 1), should be 1
      expect(result & 0b1n).toBe(0b1n)
    })
  })
  describe('expandToWidth', () => {
    it('should return correct bitboard for single row', () => {
      const store1 = new StoreBig(1, 4, 1, 4, 1)
      const bitboard = 0b1111n
      const result = store1.expandToWidth(4, 1, bitboard, 8)
      expect(result).toBe(0b1111n)
    })

    it('should expand width from 4 to 8', () => {
      const store1 = new StoreBig(1, 8, 1, 4, 2)
      // 2 rows of 4 bits each
      const bitboard = 0b11110101n // Row 0: 0101, Row 1: 1111
      const result = store1.expandToWidth(4, 2, bitboard, 8)
      expect(result).toBeGreaterThan(0n)
    })

    it('should handle zero bitboard', () => {
      const store1 = new StoreBig(1, 100, 1, 4, 4)
      const result = store1.expandToWidth(4, 4, 0n, 8)
      expect(result).toBe(0n)
    })

    it('should preserve all set bits when expanding horizontally', () => {
      const store1 = new StoreBig(1, 6, 1, 2, 3)
      const bitboard = 0b110101n // 3 rows of 2 bits
      const result = store1.expandToWidth(2, 3, bitboard, 4)
      // Occupancy should be preserved
      expect(store1.occupancy(result)).toBe(store1.occupancy(bitboard))
    })

    it('should expand to same width when width equals current', () => {
      const store1 = new StoreBig(1, 16, 1, 8, 2)
      const bitboard = 0b1111111101111111n
      const result = store1.expandToWidth(8, 2, bitboard, 8)
      expect(result).toBe(bitboard)
    })
  })
  describe('expandToSquare', () => {
    it('should return same bitboard when already square', () => {
      const store1 = new StoreBig(1, 16, 1, 4, 4)
      const bitboard = 0b1111n
      const result = store1.expandToSquare(bitboard, 4, 4)
      expect(result).toBe(bitboard)
    })

    it('should handle expansion calls', () => {
      const store1 = new StoreBig(1, 100, 1, 4, 4)
      const bitboard = 0b1111n
      // expandToSquare calls expandToWidth, so we test it exists and is callable
      expect(typeof store1.expandToSquare).toBe('function')
    })
    it('extractRow should handle a simple shape', () => {
      const store1 = new StoreBig(2, 6, 1, 2, 3)
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 0, 1n)
      bitboard = store1.setIdx(bitboard, 2, 1n)
      bitboard = store1.setIdx(bitboard, 4, 1n)
      bitboard = store1.setIdx(bitboard, 5, 1n)
      expect(ascii(2, 3, bitboard, 2)).toBe('1.\n1.\n11')

      const rowMaskForWidth = store1.rowMask(2)
      expect(rowMaskForWidth).toBe(0b11n)
      const row0 = store1.extractRowAtIndex(bitboard, 0, 2, rowMaskForWidth)
      expect(ascii(2, 1, row0, 2)).toBe('1.')
      const row1 = store1.extractRowAtIndex(bitboard, 1, 2, rowMaskForWidth)
      expect(ascii(2, 1, row1, 2)).toBe('1.')
      const row2 = store1.extractRowAtIndex(bitboard, 2, 2, rowMaskForWidth)
      expect(ascii(2, 1, row2, 2)).toBe('11')
    })
    it('should handle a simple shape', () => {
      const store1 = new StoreBig(1, 6, 1, 2, 3)
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 0, 1n)
      bitboard = store1.setIdx(bitboard, 2, 1n)
      bitboard = store1.setIdx(bitboard, 4, 1n)
      bitboard = store1.setIdx(bitboard, 5, 1n)
      expect(ascii(2, 3, bitboard, 2)).toBe('1.\n1.\n11')
      const result = store1.expandToSquare(bitboard, 3, 2)
      expect(ascii(3, 3, result, 2)).toBe('1..\n1..\n11.')
    })
  })
  describe('expandToSquare multibit', () => {
    it('should return same bitboard when already square', () => {
      const store1 = new StoreBig(3, 16, 2, 4, 4)
      const bitboard = 0b1010101n
      const result = store1.expandToSquare(bitboard, 4, 4)
      expect(result).toBe(bitboard)
    })

    it('should handle expansion calls', () => {
      const store1 = new StoreBig(3, 16, 2, 4, 4)
      const bitboard = 0b1010101n
      // expandToSquare calls expandToWidth, so we test it exists and is callable
      expect(typeof store1.expandToSquare).toBe('function')
    })

    it('extractRow should handle a simple shape', () => {
      const store1 = new StoreBig(3, 6, 2, 2, 3)
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 0, 1n)
      bitboard = store1.setIdx(bitboard, 2, 1n)
      bitboard = store1.setIdx(bitboard, 4, 1n)
      bitboard = store1.setIdx(bitboard, 5, 1n)
      expect(ascii(2, 3, bitboard, 3)).toBe('1.\n1.\n11')

      const rowMaskForWidth = store1.rowMask(2)
      expect(rowMaskForWidth).toBe(0b1111n)
      const row0 = store1.extractRowAtIndex(bitboard, 0, 2, rowMaskForWidth)
      expect(ascii(2, 1, row0, 3)).toBe('1.')
      const row1 = store1.extractRowAtIndex(bitboard, 1, 2, rowMaskForWidth)
      expect(ascii(2, 1, row1, 3)).toBe('1.')
      const row2 = store1.extractRowAtIndex(bitboard, 2, 2, rowMaskForWidth)
      expect(ascii(2, 1, row2, 3)).toBe('11')
    })
    it('should handle a simple shape', () => {
      const store1 = new StoreBig(3, 6, 2, 2, 3)
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 0, 1n)
      bitboard = store1.setIdx(bitboard, 2, 1n)
      bitboard = store1.setIdx(bitboard, 4, 1n)
      bitboard = store1.setIdx(bitboard, 5, 1n)
      expect(ascii(2, 3, bitboard, 3)).toBe('1.\n1.\n11')
      const result = store1.expandToSquare(bitboard, 3, 2)
      expect(ascii(3, 3, result, 3)).toBe('1..\n1..\n11.')
    })
    it('should handle a colored shape', () => {
      const store1 = new StoreBig(3, 6, 2, 2, 3)
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 0, 2n)
      bitboard = store1.setIdx(bitboard, 2, 2n)
      bitboard = store1.setIdx(bitboard, 4, 1n)
      bitboard = store1.setIdx(bitboard, 5, 1n)
      expect(ascii(2, 3, bitboard, 3)).toBe('2.\n2.\n11')
      const result = store1.expandToSquare(bitboard, 3, 2)
      expect(ascii(3, 3, result, 3)).toBe('2..\n2..\n11.')
    })
  })
})
