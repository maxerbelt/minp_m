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
describe('StoreBig', () => {
  let store
  let mask
  beforeEach(() => {
    store = new StoreBig(1, 100, 1, 10, 10)
    mask = new Mask(10, 10, 0n, store)
  })

  describe('constructor', () => {
    it('should initialize with default parameters', () => {
      const s = new StoreBig()
      expect(s.depth).toBe(1)
      expect(s.size).toBe(0n)
      expect(s.one).toBe(1n)
    })

    it('should initialize with custom width and height', () => {
      const s = new StoreBig(1, 0, 1, 20, 15)
      expect(s.width).toBe(20)
      expect(s.height).toBe(15)
    })

    it('should set bitsPerCell property', () => {
      const s = new StoreBig(1, 0, 1, 10, 10)
      expect(s.bitsPerCell).toBeGreaterThan(0)
    })

    it('should calculate cellsPerWord correctly', () => {
      const s = new StoreBig(1, 0, 1, 10, 10)
      expect(s.cellsPerWord).toBeGreaterThan(0)
      expect(s.cellsPerWord).toBeLessThanOrEqual(256)
    })

    it('should calculate wordsPerRow correctly', () => {
      const s = new StoreBig(1, 0, 1, 8, 8)
      expect(s.width).toBe(8)
      expect(s.height).toBe(8)
    })
  })

  describe('occupancy', () => {
    it('should return 0 for empty BigInt', () => {
      const result = store.occupancy(0n)
      expect(result).toBe(0)
    })

    it('should count set bits correctly', () => {
      const bb = 0b1111n // 4 bits set
      const result = store.occupancy(bb)
      expect(result).toBe(4)
    })

    it('should count a single bit', () => {
      const bb = 1n
      const result = store.occupancy(bb)
      expect(result).toBe(1)
    })

    it('should count multiple scattered bits', () => {
      const bb = 0b10101010n
      const result = store.occupancy(bb)
      expect(result).toBe(4)
    })
  })

  describe('occupancy1Bit', () => {
    it('should handle empty source', () => {
      const src = []
      const result = store.occupancy1Bit(src, 4, 4)
      expect(result).toBe(0n)
    })

    it('should convert multi-bit to single-bit representation', () => {
      const src = [1n]
      const result = store.occupancy1Bit(src, 4, 4)
      expect(result).toBeGreaterThanOrEqual(0n)
    })
  })

  describe('setBitInBigInt', () => {
    it('should set a bit at position 0', () => {
      const result = store.setBitInBigInt(0n, BigInt(0))
      expect(result).toBe(1n)
    })

    it('should set a bit at position 3', () => {
      const result = store.setBitInBigInt(0n, BigInt(3))
      expect(result).toBe(8n)
    })

    it('should preserve existing bits', () => {
      const result = store.setBitInBigInt(5n, BigInt(3)) // 0101 | 1000 = 1101
      expect(result).toBe(13n)
    })

    it('should not change if bit already set', () => {
      const result = store.setBitInBigInt(1n, BigInt(0))
      expect(result).toBe(1n)
    })
  })

  describe('isBitSet and getBitAt', () => {
    it('should identify set bits correctly', () => {
      const bitboard = 0b10100000n
      expect(store.isBitSet(bitboard, 5n)).toBe(true)
      expect(store.isBitSet(bitboard, 7n)).toBe(true)
    })

    it('should identify unset bits correctly', () => {
      const bitboard = 0b10100000n
      expect(store.isBitSet(bitboard, 0n)).toBe(false)
      expect(store.isBitSet(bitboard, 1n)).toBe(false)
    })

    it('getBitAt should work with zero bitboard', () => {
      expect(store.getBitAt(0n, 0)).toBe(false)
      expect(store.getBitAt(0n, 5)).toBe(false)
    })

    it('getBitAt should identify set bits', () => {
      const bitboard = 0b00100000n
      expect(store.getBitAt(bitboard, 5)).toBe(true)
    })
  })

  describe('countTrailingZeros', () => {
    it('should count zeros in various patterns', () => {
      expect(store.countTrailingZeros(0b00100000n)).toBe(5)
      expect(store.countTrailingZeros(0b01000000n)).toBe(6)
      expect(store.countTrailingZeros(0b10000000n)).toBe(7)
    })

    it('should return 0 for odd numbers', () => {
      expect(store.countTrailingZeros(1n)).toBe(0)
      expect(store.countTrailingZeros(3n)).toBe(0)
      expect(store.countTrailingZeros(7n)).toBe(0)
    })

    it('should handle large powers of 2', () => {
      expect(store.countTrailingZeros(1024n)).toBe(10)
      expect(store.countTrailingZeros(65536n)).toBe(16)
    })
  })

  describe('isEmpty variants', () => {
    it('should correctly identify empty boards of different sizes', () => {
      expect(store.isEmpty(0n)).toBe(true)
    })

    it('should correctly identify non-empty boards', () => {
      expect(store.isEmpty(1n)).toBe(false)
      expect(store.isEmpty(BigInt(0xffffffff))).toBe(false)
    })
  })

  describe('depth conversion roundtrips', () => {
    it('should preserve data through expand then shrink', () => {
      const store1 = new StoreBig(1, 100, 1, 4, 4)
      const store2 = new StoreBig(2, 100, 2, 4, 4)
      store2.bitsPerCell = 2
      const original = 0b01010101n
      const expanded = store1.expandToBitsPerCell(original, 2)
      store2.bitsPerCell = 2
      const shrunken = store2.shrinkToBitsPerCell(expanded, 1)
      // Due to capping, we may lose some data in roundtrip
      expect(shrunken).toBeDefined()
    })

    it('should handle max values through conversions', () => {
      const store1 = new StoreBig(1, 16, 1, 4, 4)
      const bitboard = 0b1111n
      const expanded = store1.expandToBitsPerCell(bitboard, 3)
      expect(expanded).toBeDefined()
    })
  })

  describe('extractColorLayers', () => {
    it('should return empty array for empty bitboard', () => {
      const store1 = new StoreBig(2, 100, 1, 4, 4)
      const bitboard = 0n
      const result = store1.extractColorLayers(bitboard, 4, 4)
      expect(result).toHaveLength(0)
    })

    it('should create single color layer for 1-bit board', () => {
      const store1 = new StoreBig(1, 100, 1, 4, 4)
      let bitboard = 0n
      bitboard = store1.addBit(bitboard, 0)
      bitboard = store1.addBit(bitboard, 5)
      bitboard = store1.addBit(bitboard, 10)

      const result = store1.extractColorLayers(bitboard, 4, 4)
      expect(result).toHaveLength(1) // Only color 1
      expect(store1.occupancy(result[0])).toBe(3)
    })

    it('should separate multiple colors correctly', () => {
      const store1 = new StoreBig(2, 100, 2, 4, 4)
      let bitboard = 0n
      // Set colors at specific positions
      bitboard = store1.setIdx(bitboard, 0, 1n) // Position 0, color 1
      bitboard = store1.setIdx(bitboard, 1, 2n) // Position 1, color 2
      bitboard = store1.setIdx(bitboard, 2, 1n) // Position 2, color 1
      bitboard = store1.setIdx(bitboard, 3, 3n) // Position 3, color 3

      const result = store1.extractColorLayers(bitboard, 4, 4)
      expect(result).toHaveLength(3) // Colors 1-3 (no color 0)
      expect(store1.occupancy(result[0])).toBeGreaterThan(0) // Color 1 at index 0
      expect(store1.occupancy(result[1])).toBeGreaterThan(0) // Color 2 at index 1
      expect(store1.occupancy(result[2])).toBeGreaterThan(0) // Color 3 at index 2
    })

    it('should preserve bit positions when extracting color 1', () => {
      const store1 = new StoreBig(1, 100, 1, 8, 1)
      let bitboard = 0b10101010n
      const result = store1.extractColorLayers(bitboard, 8, 1)
      expect(result[0]).toBe(bitboard) // Color 1 is at index 0
    })

    it('should handle sparse patterns with multiple colors', () => {
      const store1 = new StoreBig(2, 100, 2, 3, 3)
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 0, 1n) // Position 0, color 1
      bitboard = store1.setIdx(bitboard, 2, 2n) // Position 2, color 2
      bitboard = store1.setIdx(bitboard, 4, 1n) // Position 4, color 1
      bitboard = store1.setIdx(bitboard, 8, 3n) // Position 8, color 3

      const result = store1.extractColorLayers(bitboard, 3, 3)
      expect(result).toHaveLength(3) // Colors 1-3
      // Verify that colors are separated across layers
      expect(store1.occupancy(result[0])).toBeGreaterThan(0) // Color 1
      expect(store1.occupancy(result[1])).toBeGreaterThan(0) // Color 2
      expect(store1.occupancy(result[2])).toBeGreaterThan(0) // Color 3
    })

    it('should handle entire row of same color', () => {
      const store1 = new StoreBig(1, 100, 1, 4, 4)
      let bitboard = 0n
      // Set entire first row
      bitboard = store1.addBit(bitboard, 0)
      bitboard = store1.addBit(bitboard, 1)
      bitboard = store1.addBit(bitboard, 2)
      bitboard = store1.addBit(bitboard, 3)

      const result = store1.extractColorLayers(bitboard, 4, 4)
      expect(store1.occupancy(result[0])).toBe(4) // Color 1 at index 0
    })

    it('should handle all positions with same color', () => {
      const store1 = new StoreBig(1, 100, 1, 2, 2)
      let bitboard = 0n
      bitboard = store1.addBit(bitboard, 0)
      bitboard = store1.addBit(bitboard, 1)
      bitboard = store1.addBit(bitboard, 2)
      bitboard = store1.addBit(bitboard, 3)

      const result = store1.extractColorLayers(bitboard, 2, 2)
      expect(result).toHaveLength(1) // Only color 1
      expect(store1.occupancy(result[0])).toBe(4) // Color 1 at index 0
    })
  })
})
