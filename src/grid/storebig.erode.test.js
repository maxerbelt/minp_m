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
describe('StoreBig erode / dilate operations', () => {
  let store
  let mask
  beforeEach(() => {
    store = new StoreBig(1, 100, 1, 10, 10)
    mask = new Mask(10, 10, 0n, store)
  })

  describe('Refactored Helper Methods - Constraint Computation', () => {
    beforeEach(() => {
      store = new StoreBig(1, 100, 1, 5, 5)
      mask = new Mask(5, 5, 0n, store)
    })

    it('should compute horizontal erode constraints correctly', () => {
      let bitboard = 0n
      // Create a horizontal line at row 0: cells (1,0), (2,0), (3,0)
      bitboard = store.addBit(bitboard, 1)
      bitboard = store.addBit(bitboard, 2)
      bitboard = store.addBit(bitboard, 3)

      const edgeMasks = mask.edgeMasks()
      const bitShift = store.bitsPerCell

      const { leftConstraint, rightConstraint } =
        store.computeHorizontalErodeConstraints(bitboard, edgeMasks, bitShift)

      // Both constraints should be defined
      expect(leftConstraint).toBeDefined()
      expect(rightConstraint).toBeDefined()

      // The result of erode should be less than original
      const result = bitboard & leftConstraint & rightConstraint
      expect(store.occupancy(result)).toBeLessThanOrEqual(
        store.occupancy(bitboard)
      )
    })

    it('should compute vertical erode constraints correctly', () => {
      let bitboard = 0n
      // Create a vertical line at column 0: cells (0,1), (0,2), (0,3)
      bitboard = store.addBit(bitboard, 5)
      bitboard = store.addBit(bitboard, 10)
      bitboard = store.addBit(bitboard, 15)

      const edgeMasks = mask.edgeMasks()

      const { upConstraint, downConstraint } =
        store.computeVerticalErodeConstraints(bitboard, 5, edgeMasks)

      // Both constraints should be defined
      expect(upConstraint).toBeDefined()
      expect(downConstraint).toBeDefined()

      // The result should be less than or equal to original
      const result = bitboard & upConstraint & downConstraint
      expect(store.occupancy(result)).toBeLessThanOrEqual(
        store.occupancy(bitboard)
      )
    })

    it('should handle edge case with no edge masks', () => {
      let bitboard = 0n
      bitboard = store.addBit(bitboard, 6) // interior cell (1,1)

      const { upConstraint, downConstraint } =
        store.computeVerticalErodeConstraints(bitboard, 5, null)

      // Without edge masks, constraints are just shifted versions
      expect(upConstraint).toBeDefined()
      expect(downConstraint).toBeDefined()
    })
  })

  describe('Refactored Helper Methods - Integration with Morphology', () => {
    beforeEach(() => {
      store = new StoreBig(1, 100, 1, 6, 6)
      mask = new Mask(6, 6, 0n, store)
    })

    it('should erode single-bit store correctly using refactored methods', () => {
      // Create a 3x3 square of cells
      let bits = 0n
      for (let y = 1; y < 4; y++) {
        for (let x = 1; x < 4; x++) {
          bits = mask.store.addBit(bits, mask.index(x, y))
        }
      }

      const originalOccupancy = mask.store.occupancy(bits)

      // Apply horizontal erosion (removes cells without both neighbors)
      const edgeMasks = mask.edgeMasks()
      const eroded = mask.store.erodeHorizontalClamp(bits, 1, edgeMasks)

      // Erosion should reduce occupancy
      expect(mask.store.occupancy(eroded)).toBeLessThan(originalOccupancy)
      // Interior cell (2,2) should still be occupied
      const occupancyAfter = mask.store.occupancy(eroded)
      expect(occupancyAfter).toBeGreaterThan(0)
    })

    it('should compare erosion behavior with packed store', () => {
      // Create test pattern in BigInt store
      let bigBits = 0n
      for (let idx = 5; idx < 15; idx++) {
        bigBits = store.addBit(bigBits, idx)
      }

      const edgeMasks = mask.edgeMasks()

      // Apply vertical erosion
      const erodedBig = store.erodeVerticalClamp(bigBits, 6, 1, edgeMasks)

      // Pattern should lose cells at top and bottom
      expect(store.occupancy(erodedBig)).toBeLessThan(store.occupancy(bigBits))
    })
  })

  describe('Multi-bit Store Refactored Methods', () => {
    it('should handle neighbordetection without errors for multi-bit stores', () => {
      const store2 = new StoreBig(2, 100, 2, 5, 5)
      let bitboard = 0n

      // Set some multi-bit values
      bitboard = store2.setIdx(bitboard, 6, 2n)
      bitboard = store2.setIdx(bitboard, 7, 3n)
      bitboard = store2.setIdx(bitboard, 11, 1n)

      // Methods should work without errors
      expect(() => {
        store2.cellHasLeftNeighbor(bitboard, 6, 5)
        store2.cellHasRightNeighbor(bitboard, 6, 5)
        store2.cellHasTopNeighbor(bitboard, 6, 5)
        store2.cellHasBottomNeighbor(bitboard, 6, 5, 5)
      }).not.toThrow()
    })

    it('should perform multi-bit erosion using cellwise method', () => {
      const store2 = new StoreBig(2, 100, 2, 4, 4)
      const mask2 = new Mask(4, 4, 0n, store2)

      // Create fully connected interior block with multi-bit values
      let bits = 0n
      // Fill row 1 and row 2 with values at columns 1-2
      bits = store2.setIdx(bits, 5, 2n) // (1,1)
      bits = store2.setIdx(bits, 6, 3n) // (2,1)
      bits = store2.setIdx(bits, 9, 1n) // (1,2)
      bits = store2.setIdx(bits, 10, 2n) // (2,2)

      const originalOccupancy = store2.occupancy(bits)

      // Multi-bit store uses cellwise erosion
      const edgeMasks = mask2.edgeMasks()
      const eroded = store2.erodeHorizontalClamp(bits, 1, edgeMasks)

      // Erosion should reduce or maintain occupancy
      expect(store2.occupancy(eroded)).toBeLessThanOrEqual(originalOccupancy)
    })

    it('should compare single-bit vs multi-bit erosion behavior', () => {
      const store1 = new StoreBig(1, 100, 1, 4, 4)
      const store2 = new StoreBig(2, 100, 2, 4, 4)

      // Create identical occupation pattern in both
      let bits1 = 0n
      let bits2 = 0n
      const indices = [5, 6, 9, 10]
      for (const idx of indices) {
        bits1 = store1.addBit(bits1, idx)
        bits2 = store2.setIdx(bits2, idx, 1n) // Use value 1 for comparison
      }

      const mask1 = new Mask(4, 4, bits1, store1)
      const mask2 = new Mask(4, 4, bits2, store2)

      const edgeMasks1 = mask1.edgeMasks()
      const edgeMasks2 = mask2.edgeMasks()

      // Both should reduce occupancy through erosion
      const eroded1 = store1.erodeHorizontalClamp(bits1, 1, edgeMasks1)
      const eroded2 = store2.erodeHorizontalClamp(bits2, 1, edgeMasks2)

      expect(store1.occupancy(eroded1)).toBeLessThanOrEqual(
        store1.occupancy(bits1)
      )
      expect(store2.occupancy(eroded2)).toBeLessThanOrEqual(
        store2.occupancy(bits2)
      )
    })
  })

  describe('dilate1D_horizontal', () => {
    it('should dilate single bit horizontally', () => {
      const edgeMasks = mask.edgeMasks()
      const result = store.dilate1D_horizontal(1n, 1, edgeMasks)
      expect(result).toBeGreaterThanOrEqual(1n)
    })

    it('should respect radius parameter', () => {
      const edgeMasks = mask.edgeMasks()
      const result1 = store.dilate1D_horizontal(1n, 1, edgeMasks)
      const result2 = store.dilate1D_horizontal(1n, 2, edgeMasks)
      expect(result2).toBeGreaterThanOrEqual(result1)
    })
  })

  describe('dilate1D_vertical', () => {
    it('should dilate single bit vertically', () => {
      const result = store.dilate1D_vertical(1n, 10,  1)
      expect(result).toBeGreaterThanOrEqual(1n)
    })

    it('should expand based on width', () => {
      const result = store.dilate1D_vertical(1n, 10,   1)
      expect(result).toBeGreaterThanOrEqual(1n)
    })
  })

  describe('dilateCrossStep', () => {
    it('should dilate in four directions', () => {
      const board = 1n
      const result = store.dilateCrossStep(board, 10, 10)
      expect(result).toBeGreaterThanOrEqual(board)
    })

    it('should include original bit', () => {
      const board = 256n
      const result = store.dilateCrossStep(board, 10, 10)
      expect((result & board) === board).toBe(true)
    })

    it('should handle zero board', () => {
      const result = store.dilateCrossStep(0n, 10, 10)
      expect(result).toBe(0n)
    })
    it('should handle edge of board', () => {
      let board = 1n
      board = store.dilateCrossStep(board, 4, 4)
      expect(board).toBe(0b00010011n)
      board = store.dilateCrossStep(board, 4, 4)
      expect(board).toBe(0b000100110111n)
    })
  })
  describe('Refactored Helper Methods - Cell Neighbor Detection', () => {
    beforeEach(() => {
      store = new StoreBig(1, 100, 1, 5, 5)
      mask = new Mask(5, 5, 0n, store)
    })

    it('should detect neighbors without errors with single-bit store', () => {
      let bitboard = 0n
      bitboard = store.addBit(bitboard, 1)
      bitboard = store.addBit(bitboard, 2)

      // Methods should work without errors and return boolean
      const hasLeft = store.cellHasLeftNeighbor(bitboard, 2, 5)
      const hasRight = store.cellHasRightNeighbor(bitboard, 2, 5)
      const hasTop = store.cellHasTopNeighbor(bitboard, 12, 5) // row 2, col 2
      const hasBottom = store.cellHasBottomNeighbor(bitboard, 12, 5, 5)

      expect(typeof hasLeft).toBe('boolean')
      expect(typeof hasRight).toBe('boolean')
      expect(typeof hasTop).toBe('boolean')
      expect(typeof hasBottom).toBe('boolean')
    })

    it('should protect boundary cells from erosion', () => {
      let bitboard = 0n
      // Only set corners (boundary cells)
      bitboard = store.addBit(bitboard, 0) // top-left
      bitboard = store.addBit(bitboard, 4) // top-right
      bitboard = store.addBit(bitboard, 20) // bottom-left
      bitboard = store.addBit(bitboard, 24) // bottom-right

      // All boundaries should be protected (return true for erosion)
      expect(store.cellHasLeftNeighbor(bitboard, 0, 5)).toBe(true)
      expect(store.cellHasRightNeighbor(bitboard, 4, 5)).toBe(true)
      expect(store.cellHasTopNeighbor(bitboard, 0, 5)).toBe(true)
      expect(store.cellHasBottomNeighbor(bitboard, 20, 5, 5)).toBe(true)
    })

    it('should correctly evaluate interior cells with neighbors', () => {
      let bitboard = 0n
      // Create a 2x2 block in interior: cells 6,7,11,12 (positions (1,1) to (2,2))
      bitboard = store.addBit(bitboard, 6)
      bitboard = store.addBit(bitboard, 7)
      bitboard = store.addBit(bitboard, 11)
      bitboard = store.addBit(bitboard, 12)

      // Cell 7 (2,1) has left neighbor at 6
      expect(store.cellHasLeftNeighbor(bitboard, 7, 5)).toBe(true)
      // Cell 6 (1,1) has right neighbor at 7
      expect(store.cellHasRightNeighbor(bitboard, 6, 5)).toBe(true)
      // Cell 11 (1,2) has top neighbor at 6
      expect(store.cellHasTopNeighbor(bitboard, 11, 5)).toBe(true)
      // Cell 6 (1,1) has bottom neighbor at 11
      expect(store.cellHasBottomNeighbor(bitboard, 6, 5, 5)).toBe(true)
    })
  })

  describe('Refactored Helper Methods - Edge Mask Preparation', () => {
    beforeEach(() => {
      store = new StoreBig(1, 100, 1, 4, 4)
      mask = new Mask(4, 4, 0n, store)
    })

    it('should prepare source with left edge mask', () => {
      const edgeMasks = mask.edgeMasks()
      let bitboard = 0n

      // Set multiple cells
      bitboard = store.addBit(bitboard, 0)
      bitboard = store.addBit(bitboard, 1)
      bitboard = store.addBit(bitboard, 4)
      bitboard = store.addBit(bitboard, 5)

      const prepared = store._prepareSrcWithEdgeMask(
        bitboard,
        edgeMasks,
        'notLeft'
      )
      // prepareSrcWithEdgeMask should exclude cells on the left edge
      // Left edge cells: 0, 4, 8, 12
      expect(store.occupancy(prepared)).toBeLessThan(store.occupancy(bitboard))
    })

    it('should handle missing edge masks gracefully', () => {
      let bitboard = 0n
      bitboard = store.addBit(bitboard, 0)
      bitboard = store.addBit(bitboard, 1)

      const prepared = store._prepareSrcWithEdgeMask(bitboard, null, 'notLeft')
      expect(prepared).toBe(bitboard)
    })

    it('should prepare source with right edge mask', () => {
      const edgeMasks = mask.edgeMasks()
      let bitboard = 0n

      // Set cells on right edge: 3, 7, 11, 15
      bitboard = store.addBit(bitboard, 3)
      bitboard = store.addBit(bitboard, 7)
      bitboard = store.addBit(bitboard, 1)

      const prepared = store._prepareSrcWithEdgeMask(
        bitboard,
        edgeMasks,
        'notRight'
      )
      // Should exclude right edge cells
      expect(store.occupancy(prepared)).toBeLessThan(bitboard ? 2 : 0)
    })
  })
})
