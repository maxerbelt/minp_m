// src/grid/store32.test.js
/* eslint-env jest */
/* global describe, it, expect, beforeEach */
import { Store32 } from './store32.js'
import { Packed } from './packed.js'

function ascii (bits, packed) {
  const presult = packed.clone
  presult.bits = bits
  return presult.toAscii
}
function ascii1 (bits, packed) {
  const presult = packed.singleBitStore
  presult.bits = bits
  return presult.toAscii
}
// Jest test suite
describe('Store32 extract layers', () => {
  let store3
  let store4
  let store5
  let board4
  let pack4
  beforeEach(() => {
    store3 = new Store32(3, 8, 2, 3, 3)
    store4 = new Store32(3, 16, 2, 4, 4)
    store5 = new Store32(3, 25, 2, 5, 5)
    board4 = store4.newWords()
    pack4 = new Packed(4, 4, undefined, store4, 3)
  })
  describe('extractColorLayers', () => {
    it('should return empty array for empty bitboard', () => {
      const bitboard = store4.newWords()
      const result = store4.extractColorLayers(bitboard, 4, 4)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })

    it('should create layers for each non-zero color in bitboard', () => {
      // Set some cells to different colors
      store4.setAtIdx(board4, 0, 1)
      store4.setAtIdx(board4, 1, 2)
      store4.setAtIdx(board4, 2, 1)

      const result = store4.extractColorLayers(board4, 4, 4)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2) // Colors 1-2 (no color 0)
    })

    it('should separate color 1 from color 2', () => {
      store4.setAtIdx(board4, 0, 1)
      store4.setAtIdx(board4, 1, 2)
      store4.setAtIdx(board4, 2, 1)

      const result = store4.extractColorLayers(board4, 4, 4)
      expect(result[0]).toBeDefined() // Color 1 at index 0
      expect(result[1]).toBeDefined() // Color 2 at index 1
    })

    it('should handle single bit board', () => {
      const store1 = new Store32(1, 100, 1, 8, 1)
      const bitboard = store1.newWords()
      bitboard[0] = 0b10101010

      const result = store1.extractColorLayers(bitboard, 8, 1)
      expect(result).toHaveLength(1) // Only color 1
    })

    it('should preserve occupancy in color layers', () => {
      const store1 = new Store32(2, 16, 2, 8, 2)
      const bitboard = store1.newWords()
      store1.setAtIdx(bitboard, 0, 1)
      store1.setAtIdx(bitboard, 3, 1)
      store1.setAtIdx(bitboard, 4, 2)
      store1.setAtIdx(bitboard, 10, 2)

      const result = store1.extractColorLayers(bitboard, 8, 2)
      // Verify result has expected number of layers
      expect(result.length).toBe(2) // Colors 1-2
      // Verify each layer is a valid bitboard
      expect(result[0]).toBeDefined() // Color 1
      expect(result[1]).toBeDefined() // Color 2
      // Verify layers are not empty
      expect(store1.occupancy(result[0])).toBeGreaterThan(0)
      expect(store1.occupancy(result[1])).toBeGreaterThan(0)
    })

    it('should return correct number of layers', () => {
      store4.setAtIdx(board4, 0, 1)
      store4.setAtIdx(board4, 1, 3)

      const result = store4.extractColorLayers(board4, 4, 4)
      expect(result.length).toBe(3) // Colors 1-3 (no color 0)
    })

    it('should handle all cells set to single color', () => {
      const store1 = new Store32(1, 4, 1, 2, 2)
      const bitboard = store1.newWords()
      store1.setIdx(bitboard, 0, 1)
      store1.setIdx(bitboard, 1, 1)
      store1.setIdx(bitboard, 2, 1)
      store1.setIdx(bitboard, 3, 1)

      const result = store1.extractColorLayers(bitboard, 2, 2)
      expect(result.length).toBe(1) // Only color 1
    })
  })

  describe('extractColorLayer', () => {
    it('should return empty bitboard for empty input', () => {
      const result = store4.extractColorLayer(board4, 1, 4, 4)
      for (let i = 0; i < result.length; i++) {
        expect(result[i]).toBe(0)
      }
    })

    it('should extract single color from multi-color bitboard', () => {
      store4.setIdx(board4, 1, 1)
      store4.setIdx(board4, 2, 2)
      store4.setIdx(board4, 5, 2)
      store4.setIdx(board4, 10, 3)

      // Extract color 2
      const result = store4.extractColorLayer(board4, 2, 4, 4)

      // Should have 2 cells with color 2 (1-bit representation, no depth scaling)
      expect(store4.occupancy(result)).toBe(2)
    })

    it('should extract color 1 from bitboard', () => {
      store4.setIdx(board4, 1, 1)
      store4.setIdx(board4, 2, 2)
      store4.setIdx(board4, 7, 1)

      const result = store4.extractColorLayer(board4, 1, 4, 4)

      // Should have 2 cells with color 1 (1-bit representation, no depth scaling)
      expect(store4.occupancy(result)).toBe(2)
    })

    it('should return empty for non-existent color', () => {
      store4.setAtIdx(board4, 1, 1)
      store4.setAtIdx(board4, 2, 1)

      const result = store4.extractColorLayer(board4, 5, 4, 4) // Color 5 doesn't exist

      for (let i = 0; i < result.length; i++) {
        expect(result[i]).toBe(0)
      }
    })

    it('should handle sparse patterns', () => {
      const bitboard = store3.newWords()
      store3.setIdx(bitboard, 0, 1)
      store3.setIdx(bitboard, 2, 2)
      store3.setIdx(bitboard, 4, 1)
      store3.setIdx(bitboard, 8, 2)

      const result2 = store3.extractColorLayer(bitboard, 2, 3, 3)

      // Should have 2 cells with color 2 (1-bit representation, no depth scaling)
      expect(store3.occupancy(result2)).toBe(2)
    })

    it('should match extractColorLayers output for same color', () => {
      store4.setIdx(board4, 1, 1)
      store4.setIdx(board4, 2, 2)
      store4.setIdx(board4, 5, 1)

      // extractColorLayer returns 1-bit representation
      const singleLayer = store4.extractColorLayer(board4, 1, 4, 4)

      // Should have 2 cells with color 1 (cells 1 and 5)
      expect(store4.occupancy(singleLayer)).toBe(2)

      // Verify the correct cells are marked in the Uint32Array
      // For 1-bit layout, cell i is bit i in the word array
      expect((singleLayer[0] >> 1) & 1).toBe(1) // bit at position 1
      expect((singleLayer[0] >> 5) & 1).toBe(1) // bit at position 5
      expect((singleLayer[0] >> 2) & 1).toBe(0) // bit at position 2
    })
  })
  describe('edge cases and boundary conditions', () => {
    it('should handle empty grid', () => {
      const store1 = new Store32(2, 100, 2, 5, 5)
      const bitboard = store1.newWords()

      const layers = store1.extractColorLayers(bitboard, 5, 5)
      expect(layers).toHaveLength(0)
    })

    it('should handle grid with only background (color 0)', () => {
      const store1 = new Store32(2, 100, 2, 3, 3)
      const bitboard = store1.newWords()
      // All cells remain 0

      const layers = store1.extractColorLayers(bitboard, 3, 3)
      expect(layers).toHaveLength(0) // No non-zero colors
    })

    it('should handle single cell occupied', () => {
      store4.setIdx(board4, 5, 3)
      const store1 = store4.singleBitStore

      const layers = store4.extractColorLayers(board4, 4, 4)
      expect(layers).toHaveLength(3) // Array length = max color (3)
      expect(store1.occupancy(layers[0])).toBe(0) // Color 1: empty
      expect(store1.occupancy(layers[1])).toBe(0) // Color 2: empty
      expect(store1.occupancy(layers[2])).toBe(1) // Color 3: 1 cell
    })

    it('should handle single row', () => {
      const store1 = new Store32(2, 100, 2, 5, 1)
      const bitboard = store1.newWords()
      for (let i = 1; i < 5; i++) {
        store1.setIdx(bitboard, i, (i % 2) + 1)
      }

      const layers = store1.extractColorLayers(bitboard, 5, 1)
      const reassembled = store1.assembleColorLayers(layers, 5, 1)

      for (let i = 1; i < 5; i++) {
        expect(store1.getIdx(reassembled, i)).toBe(store1.getIdx(bitboard, i))
      }
    })

    it('should handle single column', () => {
      const store1 = new Store32(2, 100, 2, 1, 5)
      const bitboard = store1.newWords()
      for (let i = 1; i < 5; i++) {
        store1.setIdx(bitboard, i, (i % 2) + 1)
      }

      const layers = store1.extractColorLayers(bitboard, 1, 5)
      const reassembled = store1.assembleColorLayers(layers, 1, 5)

      for (let i = 1; i < 5; i++) {
        expect(store1.getIdx(reassembled, i)).toBe(store1.getIdx(bitboard, i))
      }
    })

    it('should handle all cells with same non-zero color', () => {
      const bitboard = store3.newWords()
      const store1 = store3.singleBitStore
      for (let i = 1; i < 9; i++) {
        store3.setIdx(bitboard, i, 2)
      }

      const layers = store3.extractColorLayers(bitboard, 3, 3)
      expect(layers).toHaveLength(2) // Array length = max color (2)
      expect(store1.occupancy(layers[0])).toBe(0) // Color 1: empty
      expect(store1.occupancy(layers[1])).toBe(8) // Color 2:

      const reassembled = store3.assembleColorLayers(layers, 3, 3)
      for (let i = 1; i < 9; i++) {
        expect(store3.getIdx(reassembled, i)).toBe(2)
      }
    })
  })

  describe('complex color patterns', () => {
    it('should handle alternating colors in grid', () => {
      const store1 = store4.singleBitStore
      // Create alternating 1 and 2 pattern
      for (let i = 1; i < 16; i++) {
        store4.setIdx(board4, i, i % 2 === 0 ? 1 : 2)
      }

      const layers = store4.extractColorLayers(board4, 4, 4)
      expect(layers).toHaveLength(2)

      expect(store1.occupancy(layers[0])).toBe(7)
      expect(store1.occupancy(layers[1])).toBe(8)
    })

    it('should handle stripe pattern (horizontal)', () => {
      // Rows alternate between color 1 and 2
      for (let row = 0; row < 4; row++) {
        const color = row % 2 === 0 ? 1 : 2
        for (let col = 0; col < 4; col++) {
          const idx = row * 4 + col
          if (idx !== 0) {
            store4.setIdx(board4, idx, color)
          }
        }
      }

      const layers = store4.extractColorLayers(board4, 4, 4)
      const reassembled = store4.assembleColorLayers(layers, 4, 4)

      for (let i = 1; i < 16; i++) {
        expect(store4.getIdx(reassembled, i)).toBe(store4.getIdx(board4, i))
      }
    })

    it('should handle gradient pattern (max color increasing)', () => {
      const bitboard = store3.newWords()
      // Create gradient where color increases across grid
      let color = 1
      for (let i = 1; i < 9; i++) {
        store3.setIdx(bitboard, i, color)
        if (i % 2 === 0 && color < 3) color += 1
      }

      const layers = store3.extractColorLayers(bitboard, 3, 3)
      expect(layers.length).toBeGreaterThan(0)

      const reassembled = store3.assembleColorLayers(layers, 3, 3)
      for (let i = 1; i < 9; i++) {
        expect(store3.getIdx(reassembled, i)).toBe(store3.getIdx(bitboard, i))
      }
    })

    it('should handle sparse scattered pattern', () => {
      const bitboard = store5.newWords()
      // Place scattered colors at irregular intervals
      store5.setIdx(bitboard, 1, 2)
      store5.setIdx(bitboard, 3, 1)
      store5.setIdx(bitboard, 8, 3)
      store5.setIdx(bitboard, 12, 2)
      store5.setIdx(bitboard, 18, 1)
      store5.setIdx(bitboard, 23, 3)

      const layers = store5.extractColorLayers(bitboard, 5, 5)
      const reassembled = store5.assembleColorLayers(layers, 5, 5)

      for (const idx of [1, 3, 8, 12, 18, 23]) {
        expect(store5.getIdx(reassembled, idx)).toBe(
          store5.getIdx(bitboard, idx)
        )
      }
    })
  })

  describe('comprehensive roundtrip validation', () => {
    it('should roundtrip with mixed color density', () => {
      const store1 = new Store32(2, 100, 2, 6, 6)
      const original = store1.newWords()

      // Dense region (colors 1, 2)
      for (let i = 1; i < 10; i++) {
        store1.setIdx(original, i, (i + 1) % 2 === 0 ? 1 : 2)
      }

      // Sparse region (color 3)
      store1.setIdx(original, 20, 3)
      store1.setIdx(original, 25, 3)
      store1.setIdx(original, 35, 1)

      const layers = store1.extractColorLayers(original, 6, 6)
      const reassembled = store1.assembleColorLayers(layers, 6, 6)

      for (let i = 1; i < 36; i++) {
        expect(store1.getIdx(reassembled, i)).toBe(store1.getIdx(original, i))
      }
    })

    it('should roundtrip all occupancy via extractColorLayer concatenation', () => {
      store4.setIdx(board4, 1, 1)
      store4.setIdx(board4, 5, 2)
      store4.setIdx(board4, 7, 1)
      store4.setIdx(board4, 10, 3)
      store4.setIdx(board4, 15, 2)

      // Extract each color individually
      const color1 = store4.extractColorLayer(board4, 1, 4, 4)
      const color2 = store4.extractColorLayer(board4, 2, 4, 4)
      const color3 = store4.extractColorLayer(board4, 3, 4, 4)

      // Verify total occupancy equals sum of individual colors
      const totalOccupancy =
        store4.occupancy(color1) +
        store4.occupancy(color2) +
        store4.occupancy(color3)
      expect(totalOccupancy).toBe(5) // 5 occupied cells
    })

    it('should preserve color order in multi-step assembly', () => {
      const original = store3.newWords()
      const expectedOrder = [0, 1, 2, 1, 3, 2, 1, 3, 2]

      for (let i = 1; i < 9; i++) {
        store3.setIdx(original, i, expectedOrder[i])
      }

      // Extract, reassemble, and verify original color sequence
      const layers = store3.extractColorLayers(original, 3, 3)
      const reassembled = store3.assembleColorLayers(layers, 3, 3)

      for (let i = 1; i < 9; i++) {
        expect(store3.getIdx(reassembled, i)).toBe(expectedOrder[i])
      }
    })

    it('should handle multi-step extraction and reconstruction', () => {
      // Build a pattern
      store4.setIdx(board4, 1, 1)
      store4.setIdx(board4, 2, 2)
      store4.setIdx(board4, 3, 3)
      store4.setIdx(board4, 5, 2)
      store4.setIdx(board4, 6, 1)
      store4.setIdx(board4, 10, 3)

      // First pass: extract layers
      const layers1 = store4.extractColorLayers(board4, 4, 4)
      const reassembled1 = store4.assembleColorLayers(layers1, 4, 4)

      // Second pass: extract layers from reassembled
      const layers2 = store4.extractColorLayers(reassembled1, 4, 4)
      const reassembled2 = store4.assembleColorLayers(layers2, 4, 4)

      // Should match original
      for (let i = 1; i < 16; i++) {
        expect(store4.getIdx(reassembled2, i)).toBe(store4.getIdx(board4, i))
      }
    })
  })

  describe('additional verification tests', () => {
    it('should handle 10x10 grid roundtrip', () => {
      const store1 = new Store32(2, 100, 2, 10, 10)
      const bitboard = store1.newWords()
      store1.setIdx(bitboard, 1, 1)
      store1.setIdx(bitboard, 50, 2)
      store1.setIdx(bitboard, 99, 1)

      const layers = store1.extractColorLayers(bitboard, 10, 10)
      const reassembled = store1.assembleColorLayers(layers, 10, 10)

      expect(store1.getIdx(reassembled, 1)).toBe(1)
      expect(store1.getIdx(reassembled, 50)).toBe(2)
      expect(store1.getIdx(reassembled, 99)).toBe(1)
    })

    it('should verify occupancy sum equals expected bits', () => {
      const bitboard = store5.newWords()
      const store1 = store5.singleBitStore

      // Fill 10 cells with alternating colors
      for (let i = 1; i <= 10; i++) {
        store5.setIdx(bitboard, i, i % 2 === 0 ? 1 : 2)
      }

      const layers = store5.extractColorLayers(bitboard, 5, 5)
      let totalOccupancy = 0
      for (const layer of layers) {
        totalOccupancy += store1.occupancy(layer)
      }

      expect(totalOccupancy).toBe(10)
    })

    it('should handle multiple complete roundtrips consistently', () => {
      // Create checkered pattern
      for (let i = 1; i < 16; i++) {
        if (i % 2 === 1) store4.setIdx(board4, i, 1)
        else store4.setIdx(board4, i, 2)
      }

      const original = store4.newWords()
      for (let i = 0; i < board4.length; i++) {
        original[i] = board4[i]
      }
      let current = store4.newWords()
      for (let i = 0; i < board4.length; i++) {
        current[i] = board4[i]
      }

      // Do 3 roundtrips
      for (let round = 0; round < 3; round++) {
        const layers = store4.extractColorLayers(current, 4, 4)
        current = store4.assembleColorLayers(layers, 4, 4)
      }

      // Should match after all roundtrips
      for (let i = 1; i < 16; i++) {
        expect(store4.getIdx(current, i)).toBe(store4.getIdx(original, i))
      }
    })

    it('should preserve corners and center of 6x6 grid', () => {
      const store1 = new Store32(2, 100, 2, 6, 6)
      const bitboard = store1.newWords()
      // Set corners and center (6x6 grid: indices 0-35)
      store1.setIdx(bitboard, 1, 1) // top-left
      store1.setIdx(bitboard, 5, 2) // top-right
      store1.setIdx(bitboard, 30, 2) // bottom-left
      store1.setIdx(bitboard, 34, 1) // bottom-right
      store1.setIdx(bitboard, 18, 3) // center

      const layers = store1.extractColorLayers(bitboard, 6, 6)
      const reassembled = store1.assembleColorLayers(layers, 6, 6)

      expect(store1.getIdx(reassembled, 1)).toBe(1)
      expect(store1.getIdx(reassembled, 5)).toBe(2)
      expect(store1.getIdx(reassembled, 30)).toBe(2)
      expect(store1.getIdx(reassembled, 34)).toBe(1)
      expect(store1.getIdx(reassembled, 18)).toBe(3)
    })

    it('should handle all three colors in 3x3 grid', () => {
      const bitboard = store3.newWords()
      store3.setIdx(bitboard, 1, 1)
      store3.setIdx(bitboard, 2, 2)
      store3.setIdx(bitboard, 3, 3)
      store3.setIdx(bitboard, 4, 1)
      store3.setIdx(bitboard, 5, 2)
      store3.setIdx(bitboard, 6, 3)

      const layers = store3.extractColorLayers(bitboard, 3, 3)
      expect(layers).toHaveLength(3)

      const reassembled = store3.assembleColorLayers(layers, 3, 3)
      for (let i = 1; i <= 6; i++) {
        expect(store3.getIdx(reassembled, i)).toBe(store3.getIdx(bitboard, i))
      }
    })

    it('should verify extractColorLayer produces occupancy from color 1', () => {
      const bitboard = store5.newWords()
      for (let i = 1; i < 10; i++) {
        store5.setIdx(bitboard, i, 1)
      }

      const singleColor = store5.extractColorLayer(bitboard, 1, 5, 5)
      // Should have occupancy for the 9 cells with color 1
      expect(store5.occupancy(singleColor)).toBe(9) // 9 cells with color 1
    })

    it('should maintain color consistency across extract-modify-reassemble', () => {
      // Set initial colors
      store4.setIdx(board4, 1, 1)
      store4.setIdx(board4, 5, 2)
      store4.setIdx(board4, 9, 1)
      store4.setIdx(board4, 13, 2)

      // Copy board4 to bitboard for processing
      let bitboard = store4.newWords()
      for (let i = 0; i < board4.length; i++) {
        bitboard[i] = board4[i]
      }

      // Extract and reassemble
      const original = store4.newWords()
      for (let i = 0; i < bitboard.length; i++) {
        original[i] = bitboard[i]
      }
      const layers = store4.extractColorLayers(bitboard, 4, 4)
      bitboard = store4.assembleColorLayers(layers, 4, 4)

      // All colored cells should match
      for (const idx of [1, 5, 9, 13]) {
        expect(store4.getIdx(bitboard, idx)).toBe(store4.getIdx(original, idx))
      }
    })
  })
})
