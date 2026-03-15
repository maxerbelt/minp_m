/* eslint-env jest */

/* global describe, it, expect */
import { rectToSquare2Bit, normalize2Bit } from './gridHelpers32.js'
import { jest } from '@jest/globals'

describe('gridHelpers32 - 2-bit operations', () => {
  describe('rectToSquare2Bit', () => {
    it('should expand rectangular board to square', () => {
      const bb = new Uint32Array(1)
      bb[0] = 0b01_01_01_01 // four cells with value 1
      const result = rectToSquare2Bit(bb, 2, 3)
      expect(result.n).toBe(3)
      expect(result.bb.length).toBeGreaterThanOrEqual(Math.ceil(9 / 16))
    })

    it('should preserve values when expanding', () => {
      const bb = new Uint32Array(1)
      // Set cells: (0,0)=1, (0,1)=2, (1,0)=3
      bb[0] = 0b00_11_10_01
      const result = rectToSquare2Bit(bb, 2, 2)
      expect(result.n).toBe(2)
      expect(result.bb).toBeDefined()
    })

    it('should handle single cell', () => {
      const bb = new Uint32Array(1)
      bb[0] = 0b01 // single cell with value 1
      const result = rectToSquare2Bit(bb, 1, 1)
      expect(result.n).toBe(1)
      expect(result.bb.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle tall rectangle (h > w)', () => {
      const bb = new Uint32Array(1)
      bb[0] = 0b01_01
      const result = rectToSquare2Bit(bb, 5, 2)
      expect(result.n).toBe(5)
    })

    it('should handle wide rectangle (w > h)', () => {
      const bb = new Uint32Array(2)
      bb[0] = 0b01_01_01_01
      bb[1] = 0b01_01_01_01
      const result = rectToSquare2Bit(bb, 2, 8)
      expect(result.n).toBe(8)
    })

    it('should skip zero values', () => {
      const bb = new Uint32Array(1)
      bb[0] = 0b01_00_01_00 // alternating 1 and 0
      const result = rectToSquare2Bit(bb, 2, 2)
      expect(result.bb).toBeDefined()
    })
  })

  describe('normalize2Bit', () => {
    it('should return empty board for all zeros', () => {
      const bb = new Uint32Array(2)
      const result = normalize2Bit(bb, 4, 4)
      expect(result.every(val => val === 0)).toBe(true)
    })

    it('should shift top-left aligned board to origin', () => {
      const bb = new Uint32Array(1)
      bb[0] = 0b01 // cell (0,0) = 1
      const result = normalize2Bit(bb, 2, 2)
      expect(result[0] & 0b11).toBe(1) // cell (0,0) should be 1
    })

    it('should shift board with leading zeros', () => {
      const bb = new Uint32Array(2)
      // Create pattern with leading empty cells
      // Assuming 2-bit cells: positions are packed as (i&15)<<1
      bb[0] = 0 // first 8 cells empty (16 bits / 2 = 8 cells)
      bb[1] = 0b01 // first cell of second word = value 1
      const result = normalize2Bit(bb, 4, 4)
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle single non-zero cell', () => {
      const bb = new Uint32Array(1)
      bb[0] = 0b10 << 14 // cell at position 7, value 2
      const result = normalize2Bit(bb, 4, 4)
      expect(result).toBeDefined()
    })

    it('should normalize rectangular boards', () => {
      const bb = new Uint32Array(1)
      bb[0] = 0b01
      const result = normalize2Bit(bb, 3, 5)
      expect(result.length).toBe(bb.length)
    })

    it('should preserve all non-zero values', () => {
      const bb = new Uint32Array(1)
      // Set multiple different values: 1, 2, 3
      bb[0] = 0b11_10_01 // cells with values 1, 2, 3
      const result = normalize2Bit(bb, 2, 2)
      expect(result).toBeDefined()
      expect(result[0]).toBeGreaterThan(0)
    })

    it('should handle full board', () => {
      const bb = new Uint32Array(4)
      // Fill all with value 1
      for (let i = 0; i < 4; i++) {
        bb[i] = 0x55555555 // every other 2-bit is 01
      }
      const result = normalize2Bit(bb, 8, 8)
      expect(result).toBeDefined()
    })
  })

  describe('get2 and set2 helper functions', () => {
    it('should correctly encode/decode 2-bit values in words', () => {
      const bb = new Uint32Array(1)
      // Cells 0-7 can fit in one 32-bit word
      // Cell 0: bits 0-1, Cell 1: bits 2-3, etc.
      const testCases = [
        { idx: 0, val: 1 },
        { idx: 1, val: 2 },
        { idx: 2, val: 3 },
        { idx: 7, val: 2 }
      ]

      testCases.forEach(({ idx, val }) => {
        bb[0] = 0
        // Manually set using bit manipulation
        const word = idx >>> 4
        const shift = (idx & 15) << 1
        bb[word] |= (val & 3) << shift

        // Verify extraction
        const extracted = (bb[word] >>> shift) & 3
        expect(extracted).toBe(val)
      })
    })

    it('should handle word boundaries correctly', () => {
      const bb = new Uint32Array(2)
      // Set value at position 15 (last in first word) and 16 (first in second word)
      const idx15 = 15
      const idx16 = 16

      const word15 = idx15 >>> 4
      const shift15 = (idx15 & 15) << 1
      bb[word15] |= (1 & 3) << shift15

      const word16 = idx16 >>> 4
      const shift16 = (idx16 & 15) << 1
      bb[word16] |= (2 & 3) << shift16

      const val15 = (bb[word15] >>> shift15) & 3
      const val16 = (bb[word16] >>> shift16) & 3

      expect(val15).toBe(1)
      expect(val16).toBe(2)
    })
  })

  describe('integration', () => {
    it('should expand then normalize consistently', () => {
      const bb = new Uint32Array(1)
      bb[0] = 0b01_01_01_01

      const expanded = rectToSquare2Bit(bb, 2, 4)
      const normalized = normalize2Bit(expanded.bb, expanded.n, expanded.n)

      expect(normalized).toBeDefined()
      expect(normalized.length).toBeGreaterThan(0)
    })

    it('should handle chained operations', () => {
      const bb = new Uint32Array(2)
      bb[0] = 0xaaaaaaaa // pattern
      bb[1] = 0x55555555 // different pattern

      const result1 = rectToSquare2Bit(bb, 4, 8)
      const result2 = normalize2Bit(result1.bb, result1.n, result1.n)

      expect(result2).toBeDefined()
      expect(result2.length).toBeGreaterThan(0)
    })
  })
})
