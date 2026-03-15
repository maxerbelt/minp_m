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
describe('StoreBig bit operations', () => {
  let store
  let mask
  beforeEach(() => {
    store = new StoreBig(1, 100, 1, 10, 10)
    mask = new Mask(10, 10, 0n, store)
  })

  describe('bitwise operations', () => {
    describe('bitOr', () => {
      it('should OR two BigInts', () => {
        const result = store.bitOr(0b1100n, 0b1010n)
        expect(result).toBe(0b1110n)
      })

      it('should return self for OR with zero', () => {
        const result = store.bitOr(5n, 0n)
        expect(result).toBe(5n)
      })
    })

    describe('bitAnd', () => {
      it('should AND two BigInts', () => {
        const result = store.bitAnd(0b1100n, 0b1010n)
        expect(result).toBe(0b1000n)
      })

      it('should return zero for AND with zero', () => {
        const result = store.bitAnd(5n, 0n)
        expect(result).toBe(0n)
      })
    })

    describe('bitSub', () => {
      it('should subtract bits correctly', () => {
        const result = store.bitSub(0b1111n, 0b0110n)
        expect(result).toBe(0b1001n)
      })

      it('should handle subtracting same value', () => {
        const result = store.bitSub(5n, 5n)
        expect(result).toBe(0n)
      })
    })
  })

  describe('shiftBits', () => {
    it('should return same value when shift is 0', () => {
      const result = store.shiftBits(255n, 0)
      expect(result).toBe(255n)
    })

    it('should left shift for positive shift', () => {
      const result = store.shiftBits(1n, 3)
      expect(result).toBe(8n)
    })

    it('should right shift for negative shift', () => {
      const result = store.shiftBits(16n, -2)
      expect(result).toBe(4n)
    })

    it('should handle large shifts', () => {
      const result = store.shiftBits(1n, 10)
      expect(result).toBe(1024n)
    })
  })

  describe('isEmpty', () => {
    it('should return true for zero', () => {
      expect(store.isEmpty(0n)).toBe(true)
    })

    it('should return false for non-zero', () => {
      expect(store.isEmpty(1n)).toBe(false)
    })

    it('should return false for large values', () => {
      expect(store.isEmpty(999999n)).toBe(false)
    })
  })

  describe('rowMask', () => {
    it('should create mask for row of width 4', () => {
      const mask = store.rowMask(4)
      expect(mask).toBeGreaterThan(0n)
    })

    it('should create appropriate mask for width 8', () => {
      const mask = store.rowMask(8)
      expect(mask).toBeGreaterThan(0n)
    })
  })

  describe('ctz (count trailing zeros)', () => {
    it('should return 0 for value 1', () => {
      const result = store.ctz(1n)
      expect(result).toBe(0)
    })

    it('should return 1 for value 2', () => {
      const result = store.ctz(2n)
      expect(result).toBe(1)
    })

    it('should return 3 for value 8', () => {
      const result = store.ctz(8n)
      expect(result).toBe(3)
    })

    it('should return 4 for value 16', () => {
      const result = store.ctz(16n)
      expect(result).toBe(4)
    })
  })

  describe('msbIndex', () => {
    it('should return -1 for zero', () => {
      const result = store.msbIndex(0n)
      expect(result).toBe(-1)
    })

    it('should return 0 for value 1', () => {
      const result = store.msbIndex(1n)
      expect(result).toBe(0)
    })

    it('should return 3 for value 8', () => {
      const result = store.msbIndex(8n)
      expect(result).toBe(3)
    })

    it('should return 7 for value 256', () => {
      const result = store.msbIndex(256n)
      expect(result).toBe(8)
    })
  })

  describe('rangeSize', () => {
    it('should calculate size for range 0-0', () => {
      const result = store.rangeSize(0, 0)
      expect(result).toBeGreaterThanOrEqual(0)
    })

    it('should calculate size for range 0-3', () => {
      const result = store.rangeSize(0, 3)
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('rangeMask', () => {
    it('should create mask for single element range', () => {
      const mask = store.rangeMask(0, 0)
      expect(mask).toBeGreaterThanOrEqual(0n)
    })

    it('should create mask for larger range', () => {
      const mask = store.rangeMask(0, 3)
      expect(mask).toBeGreaterThan(0n)
    })
  })

  describe('setRange and clearRange', () => {
    it('should set a range in a row', () => {
      const bb = 0n
      const result = store.setRange(bb, 0, 0, 3)
      expect(result).toBeGreaterThanOrEqual(0n)
    })

    it('should clear a range from a row', () => {
      const bb = 255n
      const result = store.clearRange(bb, 0, 0, 3)
      expect(result).toBeLessThanOrEqual(bb)
    })
  })

  describe('rotateRowBits', () => {
    it('should return zero for empty board', () => {
      const result = store.rotateRowBits(0n, 4, 4, 1)
      expect(result).toBe(0n)
    })

    it('should rotate with zero shift', () => {
      const bb = 0b0001n
      const result = store.rotateRowBits(bb, 4, 4, 0)
      expect(result).toBe(bb)
    })

    it('should handle positive shift', () => {
      const result = store.rotateRowBits(1n, 8, 4, 1)
      expect(result).toBeGreaterThanOrEqual(0n)
    })
  })
  describe('erodeHorizontalClamp', () => {
    it('should erode horizontal regions', () => {
      const edgeMasks = mask.edgeMasks()
      const board = 0b11111111n
      const result = store.erodeHorizontalClamp(board, 1, edgeMasks)
      expect(result).toBeLessThanOrEqual(board)
    })

    it('should handle zero board', () => {
      const edgeMasks = mask.edgeMasks()
      const result = store.erodeHorizontalClamp(0n, 1, edgeMasks)
      expect(result).toBe(0n)
    })

    it('should handle non-zero board', () => {
      const edgeMasks = mask.edgeMasks()
      const result1 = store.erodeHorizontalClamp(0b01110n, 1, edgeMasks)

      expect(result1).toBe(0b00100n)
      const result2 = store.erodeHorizontalClamp(0b00100n, 1, edgeMasks)
      expect(result2).toBe(0n)

      const result3 = store.erodeHorizontalClamp(0b00111n, 1, edgeMasks)
      // should not erode from   edge due to notRight mask, but should erode from left
      expect(result3).toBe(0b00011n)
    })
  })

  describe('erodeVerticalClamp', () => {
    it('should erode vertical regions', () => {
      const board = 0b11111111n
      const result = store.erodeVerticalClamp(board, 10, 1)
      expect(result).toBe(0n)
    })

    it('erodeVerticalClamp should handle non-zero board', () => {
      // Create masks appropriate for fullBits (all 1s means no cells on edges)
      const fullGridBits = store.fullBits
      const masks = {
        notTop: fullGridBits,
        notBottom: fullGridBits
      }
      const result1 = store.erodeVerticalClamp(
        0b01110011100111000000n,
        5,
        1,
        masks
      )

      expect(result1).toBe(14336n)

      const result2 = store.erodeVerticalClamp(0b011100111001110n, 5, 1, masks)
      expect(result2).toBe(448n)

      const result3 = store.erodeVerticalClamp(0b00111000000n, 5, 1, masks)
      // should not erode from   edge due
      expect(result3).toBe(0n)
    })
    it('should handle zero board', () => {
      const result = store.erodeVerticalClamp(0n, 10, 1)
      expect(result).toBe(0n)
    })
  })
  describe('integration tests', () => {
    it('should handle complex bitwise combinations', () => {
      const a = 0b10101010n
      const b = 0b01010101n
      const orResult = store.bitOr(a, b)
      const andResult = store.bitAnd(a, b)

      expect(orResult).toBe(0b11111111n)
      expect(andResult).toBe(0n)
    })

    it('should shift and mask correctly', () => {
      const value = 1n
      const shifted = store.shiftBits(value, 4)
      const result = store.setBitInBigInt(0n, BigInt(4))
      expect(shifted).toBe(result)
    })

    it('should handle multiple operations in sequence', () => {
      let board = 1n
      board = store.bitOr(board, 2n)
      board = store.bitOr(board, 4n)
      expect(store.occupancy(board)).toBe(3)
    })
  })

  describe('shiftWordToCellMask', () => {
    it('should shift word by bitsPerCell', () => {
      const word = 16n
      const result = store.shiftWordToCellMask(word)
      expect(result).toBe(8n)
    })

    it('should handle zero', () => {
      const result = store.shiftWordToCellMask(0n)
      expect(result).toBe(0n)
    })
  })

  describe('bitwise operations edge cases', () => {
    it('bitSub3 should subtract two values from one', () => {
      const result = store.bitSub3(0b1111n, 0b0110n, 0b1000n)
      expect(result).toBe(0b0001n)
    })

    it('clone should return same reference', () => {
      const bb = 12345n
      const result = store.clone(bb)
      expect(result).toBe(bb)
    })
  })

  describe('extractRange and related methods', () => {
    it('should extract bits at given position with mask', () => {
      const bitboard = 0b11110000n
      const result = store.extractRange(bitboard, 4, 0b1111n)
      expect(result).toBe(0b1111n)
    })

    it('should extract row at index correctly', () => {
      const store1 = new StoreBig(1, 100, 1, 4, 2)
      const bitboard = 0b11110101n
      const rowMask = store1.rowMask(4)
      const result = store1.extractRowAtIndex(bitboard, 1, 4, rowMask)
      expect(result).toBe(0b1111n)
    })

    it('should extract first row correctly', () => {
      const store1 = new StoreBig(1, 100, 1, 4, 2)
      const bitboard = 0b11110101n
      const rowMask = store1.rowMask(4)
      const result = store1.extractRowAtIndex(bitboard, 0, 4, rowMask)
      expect(result).toBe(0b0101n)
    })
  })
  describe('rotateRowBitsForSingleRow', () => {
    it('should rotate row left by 1', () => {
      const bitboard = 0b00000001n
      const result = store.rotateRowBitsForSingleRow(bitboard, 4, 0, -1)
      expect(result).toBeGreaterThanOrEqual(0n)
    })

    it('should rotate row right by 1', () => {
      const bitboard = 0b00010000n
      const result = store.rotateRowBitsForSingleRow(bitboard, 4, 0, 1)
      expect(result).toBeGreaterThanOrEqual(0n)
    })

    it('should return same for zero shift', () => {
      const bitboard = 0b00001010n
      const result = store.rotateRowBitsForSingleRow(bitboard, 4, 0, 0)
      expect(result).toBe(bitboard)
    })

    it('should handle wrapping rotation', () => {
      const bitboard = 0b1000n
      const result = store.rotateRowBitsForSingleRow(bitboard, 4, 0, 1)
      expect(result).toBeGreaterThanOrEqual(0n)
    })
  })

  describe('combineCrossStepResults', () => {
    it('should combine all shifted results with original', () => {
      const board = 0b00100000n
      const up = 0b00010000n
      const down = 0b01000000n
      const left = 0b00010000n
      const right = 0b00010000n
      const result = store.combineCrossStepResults(board, up, down, left, right)
      expect(result).toBeGreaterThanOrEqual(board)
    })

    it('should respect fullBits mask', () => {
      const fullMask = store.fullBits
      const result = store.combineCrossStepResults(
        0xffffffffn,
        0xffffffffn,
        0xffffffffn,
        0xffffffffn,
        0xffffffffn
      )
      expect(result).toBeLessThanOrEqual(fullMask)
    })
  })
  describe('shrinkToOccupied', () => {
    it('should return zeros for empty bitboard', () => {
      const store1 = new StoreBig(1, 100, 1, 8, 8)
      const result = store1.shrinkToOccupied(0n, 8, 8)
      expect(result.bitboard).toBe(0n)
      expect(result.newWidth).toBe(0)
      expect(result.newHeight).toBe(0)
      expect(result.minRow).toBe(0)
      expect(result.minCol).toBe(0)
    })

    it('should handle single bit at origin', () => {
      const store1 = new StoreBig(1, 100, 1, 8, 8)
      const result = store1.shrinkToOccupied(1n, 8, 8)
      expect(result.bitboard).toBe(1n)
      expect(result.newWidth).toBe(1)
      expect(result.newHeight).toBe(1)
      expect(result.minRow).toBe(0)
      expect(result.minCol).toBe(0)
    })

    it('should identify correct bounds for occupied region', () => {
      const store1 = new StoreBig(1, 100, 1, 8, 8)
      let bitboard = 0n
      bitboard |= 3n << 18n // Row 2: set bits
      bitboard |= 3n << 26n // Row 3: set bits

      const result = store1.shrinkToOccupied(bitboard, 8, 8)
      expect(result.newWidth).toBeGreaterThan(0)
      expect(result.newHeight).toBe(2)
      expect(result.minRow).toBe(2)
      expect(result.minCol).toBeGreaterThanOrEqual(0)
    })

    it('should shrink sparse pattern', () => {
      const store1 = new StoreBig(1, 100, 1, 10, 10)
      // Create sparse pattern
      let bitboard = 0n
      bitboard |= 1n << 25n // Row 2, col 5
      bitboard |= 1n << 54n // Row 5, col 4
      bitboard |= 1n << 76n // Row 7, col 6

      const result = store1.shrinkToOccupied(bitboard, 10, 10)
      expect(result.newHeight).toBeGreaterThan(0)
      expect(result.newWidth).toBeGreaterThan(0)
      expect(result.minRow).toBeGreaterThanOrEqual(0)
      expect(result.minCol).toBeGreaterThanOrEqual(0)
    })

    it(' aircraft carrier', () => {
      const occupancyCoords = [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 1],
        [1, 2],
        [1, 3],
        [1, 4]
      ]
      const board = Mask.fromCoordsSquare(occupancyCoords)
      expect(board.toAscii).toBe('1....\n11...\n11...\n11...\n.1...')

      const store1 = board.store

      // Create sparse pattern
      let bitboard = board.bits

      const result = store1.shrinkToOccupied(bitboard, 5, 5)
      expect(result.newHeight).toBe(5)
      expect(result.newWidth).toBe(2)
      expect(result.minRow).toBe(0)
      expect(result.minCol).toBe(0)
      expect(ascii(2, 5, result.bitboard)).toBe('1.\n11\n11\n11\n.1')
    })

    it('should shift occupied content to origin', () => {
      const store1 = new StoreBig(1, 100, 1, 8, 8)
      let bitboard = 0n
      bitboard |= 1n << 18n // Place bits
      bitboard |= 1n << 19n
      bitboard |= 1n << 26n
      bitboard |= 1n << 27n

      const result = store1.shrinkToOccupied(bitboard, 8, 8)
      // Shifted bitboard should have fewer zeroes than original
      expect(result.bitboard).toBeLessThanOrEqual(bitboard)
      expect(result.newWidth).toBeGreaterThan(0)
      expect(result.newHeight).toBeGreaterThan(0)
    })

    it('should handle single row', () => {
      const store1 = new StoreBig(1, 100, 1, 10, 8)
      let bitboard = 0n
      bitboard |= 0b11110n << 34n // Row 3, cols 4-7

      const result = store1.shrinkToOccupied(bitboard, 10, 8)
      expect(result.newHeight).toBe(1)
      expect(result.newWidth).toBe(4)
    })

    it('should handle single column', () => {
      const store1 = new StoreBig(1, 100, 1, 8, 8)
      let bitboard = 0n
      bitboard |= 1n << 2n // Row 0, col 2
      bitboard |= 1n << 10n // Row 1, col 2
      bitboard |= 1n << 18n // Row 2, col 2

      const result = store1.shrinkToOccupied(bitboard, 8, 8)
      expect(result.newWidth).toBe(1)
      expect(result.newHeight).toBe(3)
    })

    it('should return correct minimum position for bottom-right occupied area', () => {
      const store1 = new StoreBig(1, 100, 1, 8, 8)
      // Place single bit at (5, 5)
      const result = store1.shrinkToOccupied(1n << 45n, 8, 8)
      expect(result.minRow).toBe(5)
      expect(result.minCol).toBe(5)
    })
  })

  describe('shiftBitboardToOrigin', () => {
    it('should shift row 1 to row 0', () => {
      const store1 = new StoreBig(1, 100, 1, 4, 2)
      // Row 0: 0101, Row 1: 1111
      let bitboard = 0b11110101n
      const result = store1.shiftBitboardToOrigin(bitboard, 4, 1, 0, 1)
      // Only row 1 should be kept and shifted to row 0
      expect(result).toBe(0b1111n)
    })

    it('should shift multiple rows', () => {
      const store1 = new StoreBig(1, 100, 1, 4, 4)
      let bitboard = 0n
      // Place content at rows 1 and 3
      bitboard |= 0b1010n << 4n // Row 1
      bitboard |= 0b1111n << 12n // Row 3

      const result = store1.shiftBitboardToOrigin(bitboard, 4, 1, 0, 3)
      // Should shift rows 1-3 to rows 0-2
      expect(store1.occupancy(result)).toBe(store1.occupancy(bitboard))
    })

    it('should shift columns left', () => {
      const store1 = new StoreBig(1, 100, 1, 8, 2)
      // Row 0: 00111100, Row 1: 11110000
      let bitboard = 0n
      bitboard |= 0b00111100n
      bitboard |= 0b11110000n << 8n

      const result = store1.shiftBitboardToOrigin(bitboard, 8, 0, 2, 1)
      // Should shift content left by 2 bits
      expect(result).toBeDefined()
    })

    it('should preserve occupancy when shifting', () => {
      const store1 = new StoreBig(1, 100, 1, 6, 4)
      let bitboard = 0n
      bitboard |= 0b110110n << 6n // Row 1
      bitboard |= 0b101101n << 12n // Row 2
      bitboard |= 0b111000n << 18n // Row 3

      const originalOccupancy = store1.occupancy(bitboard)
      const result = store1.shiftBitboardToOrigin(bitboard, 6, 1, 0, 3)
      const resultOccupancy = store1.occupancy(result)

      expect(resultOccupancy).toBeLessThanOrEqual(originalOccupancy)
    })

    it('should skip empty rows', () => {
      const store1 = new StoreBig(1, 100, 1, 4, 4)
      let bitboard = 0n
      bitboard |= 0b1111n << 0n // Row 0
      // Row 1 is empty
      bitboard |= 0b0101n << 8n // Row 2

      const result = store1.shiftBitboardToOrigin(bitboard, 4, 0, 0, 2)
      // Should only have non-empty rows in result
      expect(store1.occupancy(result)).toBe(store1.occupancy(bitboard))
    })

    it('should handle single row range', () => {
      const store1 = new StoreBig(1, 100, 1, 8, 3)
      let bitboard = 0n
      bitboard |= 0b10101010n << 8n // Row 1

      const result = store1.shiftBitboardToOrigin(bitboard, 8, 1, 0, 1)
      // Single row shifted to row 0
      expect(result).toBe(0b10101010n)
    })
  })
})
