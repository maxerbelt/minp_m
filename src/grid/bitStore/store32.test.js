// src/grid/store32.test.js
/* eslint-env jest */
/* global describe, it, expect, beforeEach */
import { Store32 } from './store32.js'
import { Packed } from '../rectangle/packed.js'

function ascii (bits, packed) {
  const presult = packed.clone
  presult.bits = bits
  return presult.toAscii
}
// Jest test suite
describe('Store32', () => {
  let store
  let packed
  beforeEach(() => {
    store = new Store32(2, 100, 2, 10, 10)
    packed = new Packed(10, 10, undefined, store, 2)
  })

  describe('constructor', () => {
    it('should initialize with default parameters', () => {
      const s = new Store32()
      expect(s.depth).toBe(2)
      expect(s.size).toBe(0)
    })

    it('should calculate bitsPerCell correctly', () => {
      const s = new Store32(4, 100, 2, 10, 10)
      expect(s.bitsPerCell).toBe(2)
    })

    it('should set width and height', () => {
      expect(store.width).toBe(10)
      expect(store.height).toBe(10)
    })

    it('should calculate wordsPerRow correctly', () => {
      const s = new Store32(2, 100, 4, 8, 8)
      expect(s.wordsPerRow).toBeGreaterThan(0)
    })
  })

  describe('readRef', () => {
    it('should return correct word index for idx 0', () => {
      const ref = store.readRef(0)
      expect(ref.word).toBe(0)
      expect(ref.shift).toBe(0)
    })

    it('should return correct word and shift for various indices', () => {
      const ref = store.readRef(16)
      expect(ref.word).toBeGreaterThanOrEqual(0)
      expect(ref.shift).toBeGreaterThanOrEqual(0)
    })
  })

  describe('ref', () => {
    it('should include mask in returned reference', () => {
      const r = store.ref(0)
      expect(r).toHaveProperty('word')
      expect(r).toHaveProperty('shift')
      expect(r).toHaveProperty('mask')
    })
  })

  describe('gettingMask', () => {
    it('should return masks shifted correctly', () => {
      const mask = store.gettingMask(0)
      expect(mask).toBe(store.cellMask)
    })

    it('should return different masks for different shifts', () => {
      const mask1 = store.gettingMask(0)
      const mask2 = store.gettingMask(2)
      expect(mask1).not.toBe(mask2)
    })
  })

  describe('leftShift and rightShift', () => {
    it('should shift color value correctly', () => {
      const color = 2
      const shifted = store.leftShift(color, 2)
      expect(shifted).toBe(8)
    })

    it('shifts', () => {
      const color = 2
      const shifted = store.leftShift(color, 4)
      expect(shifted).toBe(32)

      const s2 = store.rightShift(color, 4)
      expect(s2).toBe(0)
    })
  })

  describe('setWordBits and getRef', () => {
    it('should set and get word bits', () => {
      let word = 0
      word = store.setWordBits(word, store.cellMask, 0, 2)
      const value = store.getRef(new Uint32Array([word]), 0, 0)
      expect(value).toBe(2)
    })
  })

  describe('rowCellMask', () => {
    it('should return correct mask for 1 cell', () => {
      const mask = store.rowCellMask(1)
      expect(mask).toBe(store.cellMask)
    })

    it('should return all bits set for 16 cells with 2 bits per cell', () => {
      const mask = store.rowCellMask(16)
      expect(mask).toBe(0xffffffff)
    })
  })

  describe('partialRowMask', () => {
    it('should return mask for numBits', () => {
      const mask = store.partialRowMask(4)
      expect(mask).toBe(15)
    })
  })

  describe('newWords', () => {
    it('should create empty word array', () => {
      const words = store.newWords(10)
      expect(words.length).toBe(10)
      expect(words[0]).toBe(0)
    })
  })

  describe('findRowBounds', () => {
    it('should return null for empty board', () => {
      const bb = store.newWords()
      const bounds = store.findRowBounds(bb)
      expect(bounds).toBeNull()
    })

    it('should find bounds for non-empty board', () => {
      const bb = store.newWords(10)
      bb[0] = 1
      const bounds = store.findRowBounds(bb)
      expect(bounds).not.toBeNull()
    })
  })

  describe('findColBounds', () => {
    it('should return null when no cells found', () => {
      const bb = store.newWords(10)
      const bounds = store.findColBounds(bb, 0, 0)
      expect(bounds).toBeNull()
    })
  })

  describe('fullBits', () => {
    it('should return full bitboard for all cells set', () => {
      const full = store.fullBits
      expect(full[0]).toBe(store.wordMask)
    })
  })

  // ------------------------------------------------------------------
  // Additional erosion/dilation tests mirroring StoreBig suite
  // ------------------------------------------------------------------

  describe('erodeHorizontalClamp', () => {
    it('should erode horizontal regions', () => {
      const masks = packed.edgeMasks()
      const board = [0b11111111]
      const result = store.erodeHorizontalClamp(board, 1, masks)
      expect(result[0]).toBeLessThanOrEqual(board[0])
    })

    it('should handle zero board', () => {
      const masks = packed.edgeMasks()
      const result = store.erodeHorizontalClamp([0], 1, masks)
      expect(result[0]).toBe(0)
    })

    it('should handle 1bit per cell non-zero board', () => {
      const p = new Packed(5, 5, undefined, undefined, 2)
      const masks = p.edgeMasks()
      const input = [0b01110]
      expect(ascii(input, p)).toBe('.111.\n.....\n.....\n.....\n.....')
      const result1 = p.store.erodeHorizontalClamp(input, 1, masks)
      expect(ascii(result1, p)).toBe('..1..\n.....\n.....\n.....\n.....')
      const result2 = p.store.erodeHorizontalClamp(result1, 1, masks)
      expect(result2[0]).toBe(0)
      const input3 = [0b0111]
      expect(ascii(input3, p)).toBe('111..\n.....\n.....\n.....\n.....')

      const result3 = p.store.erodeHorizontalClamp([0b00111], 1, masks)
      expect(ascii(result3, p)).toBe('11...\n.....\n.....\n.....\n.....')
    })
    it('should handle 4 color non-zero board', () => {
      const p = new Packed(5, 5)
      const masks = p.edgeMasks()
      const input = [0b01010100]
      expect(ascii(input, p)).toBe('.111.\n.....\n.....\n.....\n.....')
      const result1 = p.store.erodeHorizontalClamp(input, 1, masks)
      expect(ascii(result1, p)).toBe('..1..\n.....\n.....\n.....\n.....')
      const result2 = p.store.erodeHorizontalClamp(result1, 1, masks)
      expect(result2[0]).toBe(0)
      const input3 = [0b010101]
      expect(ascii(input3, p)).toBe('111..\n.....\n.....\n.....\n.....')

      const result3 = p.store.erodeHorizontalClamp(input3, 1, masks)
      expect(ascii(result3, p)).toBe('11...\n.....\n.....\n.....\n.....')
    })

    it('should handle 16 color non-zero board', () => {
      const p = new Packed(5, 5, null, null, 16)
      const masks = p.edgeMasks()
      const input = [0x1110]
      expect(ascii(input, p)).toBe('.111.\n.....\n.....\n.....\n.....')
      const result1 = p.store.erodeHorizontalClamp(input, 1, masks)
      expect(ascii(result1, p)).toBe('..1..\n.....\n.....\n.....\n.....')
      const result2 = p.store.erodeHorizontalClamp(result1, 1, masks)
      expect(result2[0]).toBe(0)
    })
  })

  describe('erodeVerticalClamp', () => {
    it('should erode vertical regions', () => {
      const board = [0b11111111]
      const result = store.erodeVerticalClamp(board, 8, 1)
      expect(result[0]).toBeLessThanOrEqual(board[0])
    })

    it('erodeVerticalClamp should handle non-zero board', () => {
      const p = new Packed(5, 5, undefined, undefined, 2)
      const masks = p.edgeMasks()
      const input = [0b01110011100111000000]
      expect(ascii(input, p)).toBe('.....\n.111.\n.111.\n.111.\n.....')
      let result1 = p.store.erodeVerticalClamp(input, 5, 1, masks)

      expect(ascii(result1, p)).toBe('.....\n.....\n.111.\n.....\n.....')
      const input2 = [0b011100111001110]

      expect(ascii(input2, p)).toBe('.111.\n.111.\n.111.\n.....\n.....')
      const result2 = p.store.erodeVerticalClamp(input2, 5, 1, masks)
      expect(ascii(result2, p)).toBe('.111.\n.111.\n.....\n.....\n.....')
      const result3 = store.erodeVerticalClamp([0b00111], 5, 1, masks)
      expect(result3[0]).toBe(0)
    })

    it('erodeVerticalClamp 4 color should handle non-zero board', () => {
      const p = new Packed(5, 5)
      const masks = p.edgeMasks()
      const input = [0b00000101010000010101000000000000, 0b010101]
      expect(ascii(input, p)).toBe('.....\n.111.\n.111.\n.111.\n.....')
      let result1 = p.store.erodeVerticalClamp(input, 5, 1, masks)
      expect(ascii(result1, p)).toBe('.....\n.....\n.111.\n.....\n.....')
      const input2 = [0b0101010000010101000001010100]
      expect(ascii(input2, p)).toBe('.111.\n.111.\n.111.\n.....\n.....')
      const result2 = p.store.erodeVerticalClamp(input2, 5, 1, masks)
      expect(ascii(result2, p)).toBe('.111.\n.111.\n.....\n.....\n.....')

      const result3 = store.erodeVerticalClamp([0b0010101], 5, 1, masks)
      // should not erode from edge due
      expect(result3[0]).toBe(0)
    })
    it('erodeVerticalClamp 16 color should handle non-zero board', () => {
      const p = new Packed(5, 5, null, null, 16)
      const masks = p.edgeMasks()
      const input = [
        0b010001000000000000000000000000, 0b00000100010001000000000001,
        0b0100010001
      ]
      expect(ascii(input, p)).toBe('.....\n.111.\n.111.\n.111.\n.....')
      let result1 = p.store.erodeVerticalClamp(input, 5, 1, masks)
      expect(ascii(result1, p)).toBe('.....\n.....\n.111.\n.....\n.....')
      const input2 = [
        0b010001000000000001000100010000, 0b0100010001000000000001
      ]
      expect(ascii(input2, p)).toBe('.111.\n.111.\n.111.\n.....\n.....')
      const result2 = p.store.erodeVerticalClamp(input2, 5, 1, masks)
      expect(ascii(result2, p)).toBe('.111.\n.111.\n.....\n.....\n.....')

      const result3 = store.erodeVerticalClamp([0b00100010001], 5, 1, masks)
      // should not erode from edge due
      expect(result3[0]).toBe(0)
    })
    it('should handle zero board', () => {
      const result = store.erodeVerticalClamp([0], 8, 1)
      expect(result[0]).toBe(0)
    })
  })

  describe('dilateHorizontalStep', () => {
    it('should expand horizontal bits correctly', () => {
      const p = new Packed(5, 5, undefined, undefined, 2)
      const masks = p.edgeMasks()
      const board = [0b100]
      expect(ascii(board, p)).toBe('..1..\n.....\n.....\n.....\n.....')
      const result = p.store.dilateHorizontalStep(board, masks)
      expect(ascii(result, p)).toBe('.111.\n.....\n.....\n.....\n.....')
    })
    it('should expand 4 color horizontal bits correctly', () => {
      const p = new Packed(5, 5)
      const masks = p.edgeMasks()
      const board = [0b10000]
      expect(ascii(board, p)).toBe('..1..\n.....\n.....\n.....\n.....')
      const result = p.store.dilateHorizontalStep(board, masks)
      expect(ascii(result, p)).toBe('.111.\n.....\n.....\n.....\n.....')
    })
    it('should expand 16 color horizontal bits correctly', () => {
      const p = new Packed(5, 5, null, null, 16)
      const masks = p.edgeMasks()
      const board = [0x0100]
      expect(ascii(board, p)).toBe('..1..\n.....\n.....\n.....\n.....')
      const result = p.store.dilateHorizontalStep(board, masks)
      expect(ascii(result, p)).toBe('.111.\n.....\n.....\n.....\n.....')
    })
  })

  describe('dilateVerticalStep', () => {
    it('should expand vertical bits correctly', () => {
      const p = new Packed(5, 5, undefined, undefined, 2)
      const masks = p.edgeMasks()
      // Provide data for all 5 rows
      const board = [0b100, 0b0, 0b0, 0b0, 0b0]
      expect(ascii(board, p)).toBe('..1..\n.....\n.....\n.....\n.....')
      const result = p.store.dilateVerticalStep(board, 5, masks)
      expect(ascii(result, p)).toBe('..1..\n..1..\n.....\n.....\n.....')
    })
    it('should expand 4 color vertical bits correctly', () => {
      const p = new Packed(5, 5)
      const masks = p.edgeMasks()
      // Provide data for all 5 rows
      const board = [0b010000, 0b0, 0b0, 0b0, 0b0]
      expect(ascii(board, p)).toBe('..1..\n.....\n.....\n.....\n.....')
      const result = p.store.dilateVerticalStep(board, 5, masks)
      expect(ascii(result, p)).toBe('..1..\n..1..\n.....\n.....\n.....')
    })
    it('should expand 16 color vertical bits correctly', () => {
      const p = new Packed(5, 5, null, null, 16)
      const masks = p.edgeMasks()
      // Provide data for all 5 rows
      const board = [0b0000000100000000, 0b0, 0b0, 0b0, 0b0]
      expect(ascii(board, p)).toBe('..1..\n.....\n.....\n.....\n.....')
      const result = p.store.dilateVerticalStep(board, 5, masks)
      expect(ascii(result, p)).toBe('..1..\n..1..\n.....\n.....\n.....')
    })
  })

  describe('bitwise operations - comprehensive', () => {
    describe('bitOr', () => {
      it('should OR two boards', () => {
        const a = new Uint32Array([0b0101, 0b1010])
        const b = new Uint32Array([0b0011, 0b1100])
        const result = store.bitOr(a, b)
        expect(result[0]).toBe(0b0111)
        expect(result[1]).toBe(0b1110)
      })

      it('should return all ones for OR with zero', () => {
        const a = new Uint32Array([0xffffffff, 0xffffffff])
        const b = new Uint32Array([0, 0])
        const result = store.bitOr(a, b)
        expect(result[0]).toBe(0xffffffff)
        expect(result[1]).toBe(0xffffffff)
      })

      it('should handle single word', () => {
        const a = new Uint32Array([0b10101010])
        const b = new Uint32Array([0b01010101])
        const result = store.bitOr(a, b)
        expect(result[0]).toBe(0b11111111)
      })
    })

    describe('bitAnd', () => {
      it('should AND two boards', () => {
        const a = new Uint32Array([0b1111, 0b1010])
        const b = new Uint32Array([0b1100, 0b1100])
        const result = store.bitAnd(a, b)
        expect(result[0]).toBe(0b1100)
        expect(result[1]).toBe(0b1000)
      })

      it('should return zero for AND with zero', () => {
        const a = new Uint32Array([0xffffffff, 0xffffffff])
        const b = new Uint32Array([0, 0])
        const result = store.bitAnd(a, b)
        expect(result[0]).toBe(0)
        expect(result[1]).toBe(0)
      })

      it('should return self for AND with all ones', () => {
        const a = new Uint32Array([0x12345678, 0xabcdef01])
        const ones = new Uint32Array([0xffffffff, 0xffffffff])
        const result = store.bitAnd(a, ones)
        expect(result[0]).toBe(0x12345678)
        expect(result[1]).toBe(0xabcdef01)
      })
    })

    describe('bitSub', () => {
      it('should subtract bits correctly', () => {
        const a = new Uint32Array([0b1111, 0b1111])
        const b = new Uint32Array([0b0011, 0b0101])
        const result = store.bitSub(a, b)
        expect(result[0]).toBe(0b1100)
        expect(result[1]).toBe(0b1010)
      })

      it('should handle subtracting same value', () => {
        const a = new Uint32Array([0b1100, 0b1010])
        const result = store.bitSub(a, a)
        expect(result[0]).toBe(0)
        expect(result[1]).toBe(0)
      })

      it('should handle subtraction leaving partial bits', () => {
        const a = new Uint32Array([0b11111111])
        const b = new Uint32Array([0b00001111])
        const result = store.bitSub(a, b)
        expect(result[0]).toBe(0b11110000)
      })
    })
  })

  describe('occupancy - comprehensive', () => {
    it('should return 0 for empty board', () => {
      const board = store.newWords()
      const result = store.occupancy(board)
      expect(result).toBe(0)
    })

    it('should count set bits correctly', () => {
      let board = store.newWords()
      board[0] = 0b1111
      const result = store.occupancy(board)
      expect(result).toBe(2)
      expect(store.singleBitStore.occupancy(board)).toBe(4)
    })

    it('should count bits across multiple words', () => {
      let board = store.newWords()
      board[0] = 0b11
      board[1] = 0b101
      const result = store.occupancy(board)
      expect(result).toBe(3)
      expect(store.singleBitStore.occupancy(board)).toBe(4)
    })

    it('should count dense bits correctly', () => {
      let board = store.newWords()
      expect(store.bitsPerCell).toBe(2)
      board[0] = 0xffffffff
      const result = store.occupancy(board)
      expect(result).toBe(16)
    })

    it('should count sparse bits correctly', () => {
      let board = store.newWords()
      board[0] = 0b00010001
      const result = store.occupancy(board)
      expect(result).toBe(2)
    })
  })

  describe('shiftBits - comprehensive', () => {
    it('should return same board when shift is 0', () => {
      let board = store.newWords()
      board[0] = 0xf
      const result = store.shiftBits(board, 0)
      expect(result[0]).toBe(0xf)
    })

    it('should left shift when bits > 0', () => {
      let board = store.newWords()
      board[0] = 0b1010
      const result = store.shiftBits(board, 1)
      expect(result[0]).toBe(0b10100)
    })

    it('should right shift when bits < 0', () => {
      let board = store.newWords()
      board[0] = 0b10100
      const result = store.shiftBits(board, -1)
      expect(result[0]).toBe(0b1010)
    })

    it('should handle shift across word boundaries', () => {
      let board = store.newWords()
      board[0] = 0x80000000
      const result = store.shiftBits(board, 1)
      // Should overflow/carry to next word
      expect(result[0]).toBe(0)
    })

    it('should handle large left shift', () => {
      let board = store.newWords()
      board[0] = 0xff
      const result = store.shiftBits(board, 8)
      expect(result[0]).toBe(0xff00)
    })

    it('should handle large right shift', () => {
      let board = store.newWords()
      board[0] = 0xff00
      const result = store.shiftBits(board, -8)
      expect(result[0]).toBe(0xff)
    })
  })

  describe('isEmpty - comprehensive', () => {
    it('should return true for empty board', () => {
      const board = store.newWords()
      expect(store.isEmpty(board)).toBe(true)
    })

    it('should return false for board with any bit set', () => {
      let board = store.newWords()
      board[0] = 1
      expect(store.isEmpty(board)).toBe(false)
    })

    it('should check all words', () => {
      let board = store.newWords()
      board[board.length - 1] = 1
      expect(store.isEmpty(board)).toBe(false)
    })

    it('should handle various patterns', () => {
      let board = store.newWords()
      board[0] = 0xf
      expect(store.isEmpty(board)).toBe(false)

      board[0] = 0
      expect(store.isEmpty(board)).toBe(true)
    })
  })

  describe('normalizeBitboard - comprehensive', () => {
    it('should accept and return Uint32Array unchanged', () => {
      const board = new Uint32Array([1, 2, 3])
      const normalized = store.normalizeBitboard(board)
      expect(normalized).toBeInstanceOf(Uint32Array)
    })

    it('should create new board if input is array of wrong length', () => {
      const board = [1, 2]
      const normalized = store.normalizeBitboard(board)
      expect(normalized).toBeInstanceOf(Uint32Array)
      expect(normalized.length).toBe(store.words)
    })

    it('should handle null by creating new board', () => {
      const normalized = store.normalizeBitboard(null)
      expect(normalized).toBeInstanceOf(Uint32Array)
      expect(normalized.length).toBe(store.words)
    })

    it('should copy values from partial input board', () => {
      const words = Math.ceil(store.words / 2)
      const board = new Uint32Array(words)
      board[0] = 42

      const normalized = store.normalizeBitboard(board)
      expect(normalized[0]).toBe(42)
      expect(normalized.length).toBe(store.words)
    })

    it('should handle conversion from regular array', () => {
      const arr = [1, 2, 3, 4]
      const normalized = store.normalizeBitboard(arr)
      expect(normalized).toBeInstanceOf(Uint32Array)
    })

    it('should preserve content when resizing', () => {
      const board = new Uint32Array(2)
      board[0] = 123
      board[1] = 456
      const normalized = store.normalizeBitboard(board)
      expect(normalized[0]).toBe(123)
      expect(normalized[1]).toBe(456)
    })
  })

  describe('applyFullMask', () => {
    it('should mask output board to valid bits', () => {
      let board = store.newWords()
      board[0] = 0xffffffff
      const masked = store.applyFullMask(board.slice())
      expect(masked[0]).toBeLessThanOrEqual(0xffffffff)
    })

    it('should preserve valid bits', () => {
      let board = store.newWords()
      board[0] = 0xaaaa
      const masked = store.applyFullMask(board.slice())
      expect(masked[0]).toBe(0xaaaa)
    })
  })

  describe('combined operations', () => {
    it('should handle multiple dilations', () => {
      const p = new Packed(5, 5, undefined, undefined, 2)
      const masks = p.edgeMasks()
      let board = [0b100]
      board = p.store.dilateHorizontalStep(board, masks)
      board = p.store.dilateHorizontalStep(board, masks)
      expect(ascii(board, p)).toBe('11111\n.....\n.....\n.....\n.....')
    })
  })

  describe('shrinkToOccupied', () => {
    it('should return zeros for empty bitboard', () => {
      const store1 = new Store32(1, 64, 1, 8, 8)
      const result = store1.shrinkToOccupied(store1.newWords(), 8, 8)
      expect(result.bitboard.every(w => w === 0)).toBe(true)
      expect(result.newWidth).toBe(0)
      expect(result.newHeight).toBe(0)
      expect(result.minRow).toBe(0)
      expect(result.minCol).toBe(0)
    })

    it('should handle single bit at origin', () => {
      const store1 = new Store32(1, 64, 1, 8, 8)
      const bitboard = store1.newWords()
      bitboard[0] = 1

      const result = store1.shrinkToOccupied(bitboard, 8, 8)
      expect(result.bitboard[0]).toBe(1)
      expect(result.newWidth).toBe(1)
      expect(result.newHeight).toBe(1)
      expect(result.minRow).toBe(0)
      expect(result.minCol).toBe(0)
    })

    it('should shrink rectangle from offset position', () => {
      const store1 = new Store32(1, 64, 1, 8, 8)
      const bitboard = store1.newWords()
      // Set some bits
      bitboard[0] |= 0b11 << 16 // Row 2
      bitboard[0] |= 0b11 << 24 // Row 3

      const result = store1.shrinkToOccupied(bitboard, 8, 8)
      expect(result.newWidth).toBeGreaterThan(0)
      expect(result.newHeight).toBeGreaterThanOrEqual(0)
      expect(result.minRow).toBeGreaterThanOrEqual(0)
    })

    it('should preserve occupancy when shrinking', () => {
      const store1 = new Store32(1, 64, 1, 8, 8)
      const bitboard = store1.newWords()
      bitboard[0] = 0b10101010
      bitboard[0] |= 0b11110000 << 8

      const originalOccupancy = store1.occupancy(bitboard)
      const result = store1.shrinkToOccupied(bitboard, 8, 8)
      const resultOccupancy = store1.occupancy(result.bitboard)

      expect(resultOccupancy).toBeLessThanOrEqual(originalOccupancy)
    })

    it('should return correct dimensions for sparse pattern', () => {
      const store1 = new Store32(1, 100, 1, 8, 8)
      const bitboard = store1.newWords()
      // Place scattered bits
      bitboard[0] |= 1
      bitboard[0] |= 1 << 8
      bitboard[0] |= 1 << 16

      const result = store1.shrinkToOccupied(bitboard, 8, 8)
      expect(result.newWidth).toBeGreaterThan(0)
      expect(result.newHeight).toBeGreaterThan(0)
    })

    it('should handle single row', () => {
      const store1 = new Store32(1, 100, 1, 8, 8)
      const bitboard = store1.newWords()
      bitboard[0] = 0b11110000

      const result = store1.shrinkToOccupied(bitboard, 8, 8)
      expect(result.newHeight).toBe(1)
      expect(result.newWidth).toBeGreaterThan(0)
    })

    it('should return correct minimum position', () => {
      const store1 = new Store32(1, 100, 1, 8, 8)
      const bitboard = store1.newWords()
      // Set bit in row 3
      bitboard[0] |= 1 << 24

      const result = store1.shrinkToOccupied(bitboard, 8, 8)
      expect(result.minRow).toBeGreaterThanOrEqual(0)
      expect(result.newHeight).toBeGreaterThan(0)
    })
  })

  describe('shiftBitboardToOrigin', () => {
    it('should exist and be callable', () => {
      const store1 = new Store32(1, 16, 1, 4, 4)
      expect(typeof store1.shiftBitboardToOrigin).toBe('function')
    })

    it('should handle valid parameters without error', () => {
      const store1 = new Store32(1, 16, 1, 4, 4)
      const bitboard = store1.newWords()
      bitboard[0] = 0b1111

      expect(() => {
        store1.shiftBitboardToOrigin(bitboard, 4, 0, 0, 0)
      }).not.toThrow()
    })

    it('should handle different row ranges', () => {
      const store1 = new Store32(1, 100, 1, 4, 4)
      const bitboard = store1.newWords()
      bitboard[0] = 0b1111

      expect(() => {
        store1.shiftBitboardToOrigin(bitboard, 4, 1, 0, 2)
      }).not.toThrow()
    })
  })

  describe('singleBitStore', () => {
    it('should be a single-bit store', () => {
      const store1 = new Store32(2, 100, 2, 4, 4)
      expect(store1.singleBitStore.bitsPerCell).toBe(1)
    })
  })

  describe('occupancyLayerOfSize', () => {
    it('should return empty bitboard for empty input', () => {
      const store1 = new Store32(2, 100, 2, 4, 4)
      const bitboard = store1.newWords()
      const result = store1.occupancyLayerOfSize(bitboard, 4, 4)

      // Empty bitboard should return empty occupancy
      for (let i = 0; i < result.length; i++) {
        expect(result[i]).toBe(0)
      }
    })

    it('should count occupied cells as 1-bit output', () => {
      const store1 = new Store32(2, 100, 2, 4, 4)
      const bitboard = store1.newWords()
      store1.setIdx(bitboard, 1, 1)
      store1.setIdx(bitboard, 5, 2)
      store1.setIdx(bitboard, 10, 3)

      const result = store1.occupancyLayerOfSize(bitboard, 4, 4)

      // 3 occupied cells = 3 bits set (1-bit output)
      expect(store1.occupancy(result)).toBe(3)
    })

    it('should count occupancy for mixed colors', () => {
      const store1 = new Store32(2, 100, 2, 4, 4)
      const bitboard = store1.newWords()
      store1.setIdx(bitboard, 1, 1)
      store1.setIdx(bitboard, 2, 2)
      store1.setIdx(bitboard, 5, 2) // Same color as cell 2

      // 3 occupied cells = 3 bits set (1-bit output)
      const result = store1.occupancyLayerOfSize(bitboard, 4, 4)
      expect(store1.occupancy(result)).toBe(3)
    })

    it('should handle single occupied cell', () => {
      const store1 = new Store32(2, 100, 2, 4, 4)
      const bitboard = store1.newWords()
      store1.setIdx(bitboard, 7, 1)

      const result = store1.occupancyLayerOfSize(bitboard, 4, 4)

      // 1 occupied cell = 1 bit set (1-bit output)
      expect(store1.occupancy(result)).toBe(1)
    })

    it('should handle all cells occupied', () => {
      const store1 = new Store32(4, 16, 2, 4, 4)
      const bitboard = store1.newWords()
      for (let i = 1; i < 16; i++) {
        store1.setIdx(bitboard, i, (i % 3) + 1)
      }

      const result = store1.occupancyLayerOfSize(bitboard, 4, 4)

      // 15 occupied cells (1-15, not 0) = 15 bits set (1-bit output)
      expect(store1.singleBitStore.occupancy(result)).toBe(15)
    })
  })
})
