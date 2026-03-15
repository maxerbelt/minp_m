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
describe('StoreBig color operations', () => {
  let store3
  let store4
  let store5
  beforeEach(() => {
    store3 = new StoreBig(2, 9, 2, 3, 3)
    store4 = new StoreBig(2, 16, 2, 4, 4)
    store5 = new StoreBig(2, 25, 2, 5, 5)
  })
  describe('edge cases and boundary conditions', () => {
    it('should handle empty grid', () => {
      let bitboard = 0n

      const layers = store5.extractColorLayers(bitboard, 5, 5)
      expect(layers).toHaveLength(0)
    })

    it('should handle grid with only background (color 0)', () => {
      let bitboard = 0n
      // Set all cells to 0 (background)
      for (let i = 1; i < 9; i++) {
        bitboard = store3.setIdx(bitboard, i, 0n)
      }

      const layers = store3.extractColorLayers(bitboard, 3, 3)
      expect(layers).toHaveLength(0) // No non-zero colors set, so no colors to extract
    })

    it('should handle single cell occupied', () => {
      const store1 = new StoreBig(2, 100, 2, 4, 4)
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 5, 3n)

      const layers = store1.extractColorLayers(bitboard, 4, 4)
      expect(layers).toHaveLength(3) // Array length = max color (3)
      expect(store1.occupancy(layers[0])).toBe(0) // Color 1: empty
      expect(store1.occupancy(layers[1])).toBe(0) // Color 2: empty
      expect(store1.occupancy(layers[2])).toBe(1) // Color 3: 1 cell
    })

    it('should handle single row', () => {
      const store1 = new StoreBig(2, 5, 2, 5, 1)
      let bitboard = 0n
      for (let i = 1; i < 5; i++) {
        bitboard = store1.setIdx(bitboard, i, BigInt((i % 2) + 1))
      }

      const layers = store1.extractColorLayers(bitboard, 5, 1)
      const reassembled = store1.assembleColorLayers(layers, 5, 1)

      for (let i = 1; i < 5; i++) {
        expect(store1.getIdx(reassembled, i)).toBe(store1.getIdx(bitboard, i))
      }
    })

    it('should handle single column', () => {
      const store1 = new StoreBig(2, 5, 2, 1, 5)
      let bitboard = 0n
      for (let i = 1; i < 5; i++) {
        bitboard = store1.setIdx(bitboard, i, BigInt((i % 2) + 1))
      }

      const layers = store1.extractColorLayers(bitboard, 1, 5)
      const reassembled = store1.assembleColorLayers(layers, 1, 5)

      for (let i = 1; i < 5; i++) {
        expect(store1.getIdx(reassembled, i)).toBe(store1.getIdx(bitboard, i))
      }
    })

    it('should handle all cells with same non-zero color', () => {
      let bitboard = 0n
      for (let i = 1; i < 9; i++) {
        bitboard = store3.setIdx(bitboard, i, 2n)
      }

      const layers = store3.extractColorLayers(bitboard, 3, 3)
      expect(layers).toHaveLength(2) // Array length = max color (2)
      expect(store3.occupancy(layers[0])).toBe(0) // Color 1: empty
      expect(store3.occupancy(layers[1])).toBe(8)

      const reassembled = store3.assembleColorLayers(layers, 3, 3)
      for (let i = 1; i < 9; i++) {
        expect(store3.getIdx(reassembled, i)).toBe(2n)
      }
    })
  })

  describe('complex color patterns', () => {
    it('should handle alternating colors in grid', () => {
      let bitboard = 0n
      // Create alternating 1 and 2 pattern (15 cells, 8 get color 2, 7 get color 1)
      for (let i = 1; i < 16; i++) {
        bitboard = store4.setIdx(bitboard, i, i % 2 === 0 ? 1n : 2n)
      }

      const layers = store4.extractColorLayers(bitboard, 4, 4)
      expect(layers).toHaveLength(2)
      expect(store4.occupancy(layers[0])).toBe(7)
      expect(store4.occupancy(layers[1])).toBe(8)
    })

    it('should handle stripe pattern (horizontal)', () => {
      let bitboard = 0n
      // Rows alternate between color 1 and 2
      for (let row = 0; row < 4; row++) {
        const color = row % 2 === 0 ? 1n : 2n
        for (let col = 0; col < 4; col++) {
          const idx = row * 4 + col
          if (idx !== 0) {
            bitboard = store4.setIdx(bitboard, idx, color)
          }
        }
      }

      const layers = store4.extractColorLayers(bitboard, 4, 4)
      const reassembled = store4.assembleColorLayers(layers, 4, 4)

      for (let i = 1; i < 16; i++) {
        expect(store4.getIdx(reassembled, i)).toBe(store4.getIdx(bitboard, i))
      }
    })

    it('should handle gradient pattern (max color increasing)', () => {
      let bitboard = 0n
      // Create gradient where color increases across grid
      let color = 1n
      for (let i = 1; i < 9; i++) {
        bitboard = store3.setIdx(bitboard, i, color)
        if (i % 2 === 0 && color < 3n) color += 1n
      }

      const layers = store3.extractColorLayers(bitboard, 3, 3)
      expect(layers.length).toBeGreaterThan(0)

      const reassembled = store3.assembleColorLayers(layers, 3, 3)
      for (let i = 1; i < 9; i++) {
        expect(store3.getIdx(reassembled, i)).toBe(store3.getIdx(bitboard, i))
      }
    })

    it('should handle sparse scattered pattern', () => {
      let bitboard = 0n
      // Place scattered colors at irregular intervals
      bitboard = store5.setIdx(bitboard, 1, 2n)
      bitboard = store5.setIdx(bitboard, 3, 1n)
      bitboard = store5.setIdx(bitboard, 8, 3n)
      bitboard = store5.setIdx(bitboard, 12, 2n)
      bitboard = store5.setIdx(bitboard, 18, 1n)
      bitboard = store5.setIdx(bitboard, 23, 3n)

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
      const store1 = new StoreBig(2, 100, 2, 6, 6)
      let original = 0n

      // Dense region (colors 1, 2)
      for (let i = 1; i < 10; i++) {
        original = store1.setIdx(original, i, (i + 1) % 2 === 0 ? 1n : 2n)
      }

      // Sparse region (color 3)
      original = store1.setIdx(original, 20, 3n)
      original = store1.setIdx(original, 25, 3n)
      original = store1.setIdx(original, 35, 1n)

      const layers = store1.extractColorLayers(original, 6, 6)
      const reassembled = store1.assembleColorLayers(layers, 6, 6)

      for (let i = 1; i < 36; i++) {
        expect(store1.getIdx(reassembled, i)).toBe(store1.getIdx(original, i))
      }
    })

    it('should roundtrip all occupancy via extractColorLayer concatenation', () => {
      let original = 0n
      original = store4.setIdx(original, 1, 1n)
      original = store4.setIdx(original, 5, 2n)
      original = store4.setIdx(original, 7, 1n)
      original = store4.setIdx(original, 10, 3n)
      original = store4.setIdx(original, 15, 2n)

      // Extract each color individually
      const color1 = store4.extractColorLayer(original, 1, 4, 4)
      const color2 = store4.extractColorLayer(original, 2, 4, 4)
      const color3 = store4.extractColorLayer(original, 3, 4, 4)

      // Verify total occupancy equals sum of individual colors
      const totalOccupancy =
        store4.occupancy(color1) +
        store4.occupancy(color2) +
        store4.occupancy(color3)
      expect(totalOccupancy).toBe(5) // 5 occupied cells
    })

    it('should preserve color order in multi-step assembly', () => {
      let original = 0n
      const expectedOrder = [0, 1, 2, 1, 3, 2, 1, 3, 2]

      for (let i = 1; i < 9; i++) {
        original = store3.setIdx(original, i, BigInt(expectedOrder[i]))
      }

      // Extract, reassemble, and verify original color sequence
      const layers = store3.extractColorLayers(original, 3, 3)
      const reassembled = store3.assembleColorLayers(layers, 3, 3)

      for (let i = 1; i < 9; i++) {
        expect(store3.getIdx(reassembled, i)).toBe(BigInt(expectedOrder[i]))
      }
    })

    it('should handle multi-step extraction and reconstruction', () => {
      let bitboard = 0n

      // Build a pattern
      bitboard = store4.setIdx(bitboard, 1, 1n)
      bitboard = store4.setIdx(bitboard, 2, 2n)
      bitboard = store4.setIdx(bitboard, 3, 3n)
      bitboard = store4.setIdx(bitboard, 5, 2n)
      bitboard = store4.setIdx(bitboard, 6, 1n)
      bitboard = store4.setIdx(bitboard, 10, 3n)

      // First pass: extract layers
      const layers1 = store4.extractColorLayers(bitboard, 4, 4)
      const reassembled1 = store4.assembleColorLayers(layers1, 4, 4)

      // Second pass: extract layers from reassembled
      const layers2 = store4.extractColorLayers(reassembled1, 4, 4)
      const reassembled2 = store4.assembleColorLayers(layers2, 4, 4)

      // Should match original
      for (let i = 1; i < 16; i++) {
        expect(store4.getIdx(reassembled2, i)).toBe(store4.getIdx(bitboard, i))
      }
    })
  })

  describe('additional verification tests', () => {
    it('should handle 10x10 grid roundtrip', () => {
      const store1 = new StoreBig(2, 100, 2, 10, 10)
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 1, 1n)
      bitboard = store1.setIdx(bitboard, 50, 2n)
      bitboard = store1.setIdx(bitboard, 99, 1n)

      const layers = store1.extractColorLayers(bitboard, 10, 10)
      const reassembled = store1.assembleColorLayers(layers, 10, 10)

      expect(store1.getIdx(reassembled, 1)).toBe(1n)
      expect(store1.getIdx(reassembled, 50)).toBe(2n)
      expect(store1.getIdx(reassembled, 99)).toBe(1n)
    })

    it('should verify layers bits', () => {
      let bitboard = 0n
      // Fill 10 cells with alternating colors
      for (let i = 0; i < 10; i++) {
        bitboard = store5.setIdx(bitboard, i, i % 2 === 0 ? 1n : 2n)
      }
      expect(ascii(5, 5, bitboard, 3)).toBe('12121\n21212\n.....\n.....\n.....')
      const layers = store5.extractColorLayers(bitboard, 5, 5)

      expect(layers).toHaveLength(2) // Colors 1 and 2
      expect(ascii(5, 5, layers[0], 2)).toBe(
        '1.1.1\n.1.1.\n.....\n.....\n.....'
      )
      expect(ascii(5, 5, layers[1], 2)).toBe(
        '.1.1.\n1.1.1\n.....\n.....\n.....'
      )
    })

    it('should handle multiple complete roundtrips consistently', () => {
      let bitboard = 0n
      // Create checkered pattern
      for (let i = 1; i < 16; i++) {
        if (i % 2 === 1) bitboard = store4.setIdx(bitboard, i, 1n)
        else bitboard = store4.setIdx(bitboard, i, 2n)
      }

      const original = bitboard
      let current = bitboard

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

    it('should preserve corners and center of 6x6grid', () => {
      const store1 = new StoreBig(2, 100, 2, 6, 6)
      let bitboard = 0n
      // Set corners and center (6x6 grid: indices 0-35)
      bitboard = store1.setIdx(bitboard, 1, 1n) // top-left
      bitboard = store1.setIdx(bitboard, 5, 2n) // top-right
      bitboard = store1.setIdx(bitboard, 30, 2n) // bottom-left
      bitboard = store1.setIdx(bitboard, 34, 1n) // bottom-right
      bitboard = store1.setIdx(bitboard, 18, 3n) // center

      const layers = store1.extractColorLayers(bitboard, 6, 6)
      const reassembled = store1.assembleColorLayers(layers, 6, 6)

      expect(store1.getIdx(reassembled, 1)).toBe(1n)
      expect(store1.getIdx(reassembled, 5)).toBe(2n)
      expect(store1.getIdx(reassembled, 30)).toBe(2n)
      expect(store1.getIdx(reassembled, 34)).toBe(1n)
      expect(store1.getIdx(reassembled, 18)).toBe(3n)
    })

    it('should verify occupancy1Bit output consistency', () => {
      let bitboard = 0n
      for (let i = 1; i < 8; i++) {
        bitboard = store4.setIdx(bitboard, i, 1n)
      }

      // occupancy1Bit expects an array of words, so wrap bitboard in array
      const singleBit = store4.occupancy1Bit([bitboard], 4, 4)
      expect(store4.occupancy(singleBit)).toBe(7) // 7 occupied cells
    })

    it('should handle all three colors in 3x3 grid', () => {
      let bitboard = 0n
      bitboard = store3.setIdx(bitboard, 1, 1n)
      bitboard = store3.setIdx(bitboard, 2, 2n)
      bitboard = store3.setIdx(bitboard, 3, 3n)
      bitboard = store3.setIdx(bitboard, 4, 1n)
      bitboard = store3.setIdx(bitboard, 5, 2n)
      bitboard = store3.setIdx(bitboard, 6, 3n)

      const layers = store3.extractColorLayers(bitboard, 3, 3)
      expect(layers).toHaveLength(3)

      const reassembled = store3.assembleColorLayers(layers, 3, 3)
      for (let i = 1; i <= 6; i++) {
        expect(store3.getIdx(reassembled, i)).toBe(store3.getIdx(bitboard, i))
      }
    })

    it('should verify extractColorLayer produces occupancy from color 1', () => {
      let bitboard = 0n
      for (let i = 1; i < 10; i++) {
        bitboard = store5.setIdx(bitboard, i, 1n)
      }

      const singleColor = store5.extractColorLayer(bitboard, 1, 5, 5)
      // Should have occupancy for the cells with color 1
      expect(store5.occupancy(singleColor)).toBeGreaterThan(0)
    })

    it('should maintain color consistency across extract-modify-reassemble', () => {
      let bitboard = 0n
      // Set initial colors
      bitboard = store4.setIdx(bitboard, 1, 1n)
      bitboard = store4.setIdx(bitboard, 5, 2n)
      bitboard = store4.setIdx(bitboard, 9, 1n)
      bitboard = store4.setIdx(bitboard, 13, 2n)

      // Extract and reassemble
      const original = bitboard
      const layers = store4.extractColorLayers(bitboard, 4, 4)
      bitboard = store4.assembleColorLayers(layers, 4, 4)

      // All colored cells should match
      for (const idx of [1, 5, 9, 13]) {
        expect(store4.getIdx(bitboard, idx)).toBe(store4.getIdx(original, idx))
      }
    })
  })
  describe('occupancyLayer', () => {
    it('should return empty bitboard for empty input', () => {
      const store1 = new StoreBig(2, 100, 2, 4, 4)
      const result = store1.occupancyLayer(0n, 4, 4)
      expect(result).toBe(0n)
    })

    it('should count occupied cells as 1-bit output', () => {
      const store1 = new StoreBig(2, 100, 2, 4, 4)
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 1, 1n)
      bitboard = store1.setIdx(bitboard, 5, 2n)
      bitboard = store1.setIdx(bitboard, 10, 3n)

      const result = store1.occupancyLayer(bitboard, 4, 4)

      // 3 occupied cells = 3 bits set (1-bit output)
      expect(store1.occupancy(result)).toBe(3)
    })

    it('should count occupancy for mixed colors', () => {
      const store1 = new StoreBig(2, 100, 2, 4, 4)
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 1, 1n)
      bitboard = store1.setIdx(bitboard, 2, 2n)
      bitboard = store1.setIdx(bitboard, 5, 2n) // Same color as cell 2

      // 3 occupied cells = 3 bits set (1-bit output)
      const result = store1.occupancyLayer(bitboard, 4, 4)
      expect(store1.occupancy(result)).toBe(3)
    })

    it('should handle single occupied cell', () => {
      const store1 = new StoreBig(2, 100, 2, 4, 4)
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 7, 1n)

      const result = store1.occupancyLayer(bitboard, 4, 4)

      // 1 occupied cell = 1 bit set (1-bit output)
      expect(store1.occupancy(result)).toBe(1)
    })

    it('should handle all cells occupied', () => {
      const store1 = new StoreBig(2, 100, 2, 4, 4)
      let bitboard = 0n
      for (let i = 1; i < 16; i++) {
        bitboard = store1.setIdx(bitboard, i, BigInt((i % 3) + 1))
      }

      const result = store1.occupancyLayer(bitboard, 4, 4)

      // 15 occupied cells (1-15, not 0) = 15 bits set (1-bit output)
      expect(store1.occupancy(result)).toBe(15)
    })
  })

  describe('multibit bitboard operations', () => {
    it('should handle large color values with extractColorLayer', () => {
      const store1 = new StoreBig(3, 100, 2, 4, 4) // depth=3, bitsPerCell=2
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 1, 3n) // max color value for depth=3
      bitboard = store1.setIdx(bitboard, 5, 2n)
      bitboard = store1.setIdx(bitboard, 10, 3n)

      const result = store1.extractColorLayer(bitboard, 3, 4, 4)

      // Should capture both cells with color 3 (1-bit representation, no depth scaling)
      expect(store1.occupancy(result)).toBe(2) // 2 cells with color 3
    })
    describe('singleBitStore', () => {
      it('should be a single-bit store', () => {
        const store1 = new StoreBig(2, 100, 2, 4, 4)
        expect(store1.singleBitStore.bitsPerCell).toBe(1)
      })
    })
    it('should extract all colors and reassemble to original', () => {
      const store1 = new StoreBig(2, 100, 2, 3, 3)
      let original = 0n
      original = store1.setIdx(original, 0, 1n)
      original = store1.setIdx(original, 2, 3n)
      original = store1.setIdx(original, 4, 2n)
      original = store1.setIdx(original, 8, 3n)

      // Extract all colors separately
      const color1 = store1.extractColorLayer(original, 1, 3, 3)
      const color2 = store1.extractColorLayer(original, 2, 3, 3)
      const color3 = store1.extractColorLayer(original, 3, 3, 3)

      // Reassemble using extractColorLayers + assembleColorLayers
      const layers = store1.extractColorLayers(original, 3, 3)
      expect(layers).toHaveLength(3) // Colors 1-3
      expect(color1).toBe(layers[0]) // Color 1 at index 0
      expect(color2).toBe(layers[1]) // Color 2 at index 1
      expect(color3).toBe(layers[2]) // Color 3 at index 2
      const reassembled = store1.assembleColorLayers(layers, 3, 3)

      // Verify original matches reassembled
      for (let i = 0; i < 9; i++) {
        expect(store1.getIdx(reassembled, i)).toBe(store1.getIdx(original, i))
      }
    })

    it('should handle multiple colors in dense pattern', () => {
      const store1 = new StoreBig(2, 100, 2, 3, 3) // Use 3x3 grid to avoid cell 0
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 1, 1n)
      bitboard = store1.setIdx(bitboard, 2, 2n)
      bitboard = store1.setIdx(bitboard, 3, 3n)
      bitboard = store1.setIdx(bitboard, 4, 2n)

      const layers = store1.extractColorLayers(bitboard, 3, 3)

      expect(layers).toHaveLength(3) // Colors 1-3
      expect(store1.occupancy(layers[0])).toBe(1) // Color 1 at 1 cell
      expect(store1.occupancy(layers[1])).toBe(2) // Color 2 at 2 cells
      expect(store1.occupancy(layers[2])).toBe(1) // Color 3 at 1 cell
    })

    it('should preserve color values during assembly with background', () => {
      const store1 = new StoreBig(2, 100, 2, 3, 3) // Use 3x3 grid to avoid cell 0
      let original = 0n
      original = store1.setIdx(original, 1, 0n) // background
      original = store1.setIdx(original, 2, 2n)
      original = store1.setIdx(original, 3, 1n)
      original = store1.setIdx(original, 4, 0n) // background

      // Extract using extractColorLayers (which returns depth-scaled layers)
      const layers = store1.extractColorLayers(original, 3, 3)

      // Use assembleColorLayersWithBackground to include color 0
      // First create background layer from color 0 cells
      let backgroundLayer = 0n
      for (let i = 0; i < 9; i++) {
        if (store1.getIdx(original, i) === 0n) {
          backgroundLayer = store1.addBit(backgroundLayer, i)
        }
      }
      layers.unshift(backgroundLayer)

      const reassembled = store1.assembleColorLayersWithBackground(layers, 3, 3)

      // Verify color 0 is preserved
      expect(store1.getIdx(reassembled, 1)).toBe(0n)
      expect(store1.getIdx(reassembled, 4)).toBe(0n)
      // Verify other colors are preserved too
      expect(store1.getIdx(reassembled, 2)).toBe(2n)
      expect(store1.getIdx(reassembled, 3)).toBe(1n)
    })

    it('should roundtrip complex multicolor pattern', () => {
      const store1 = new StoreBig(2, 100, 2, 4, 4)
      let original = 0n
      // Create checkered pattern with two colors
      for (let i = 0; i < 16; i++) {
        if (i % 4 === 0 || i % 4 === 3) {
          original = store1.setIdx(original, i, 1n)
        } else if (i % 4 === 1 || i % 4 === 2) {
          original = store1.setIdx(original, i, 2n)
        }
      }

      // Extract and reassemble
      const layers = store1.extractColorLayers(original, 4, 4)
      const reassembled = store1.assembleColorLayers(layers, 4, 4)

      // Every cell should match
      for (let i = 0; i < 16; i++) {
        expect(store1.getIdx(reassembled, i)).toBe(store1.getIdx(original, i))
      }
    })
  })
  describe('extractColorLayer', () => {
    it('should return empty bitboard for empty input', () => {
      const store1 = new StoreBig(2, 16, 2, 4, 4)
      const bitboard = 0n
      const result = store1.extractColorLayer(bitboard, 1, 4, 4)
      expect(result).toBe(0n)
    })

    it('should extract single color from multi-color bitboard', () => {
      const store1 = new StoreBig(2, 16, 2, 4, 4)
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 1, 1n)
      bitboard = store1.setIdx(bitboard, 2, 2n)
      bitboard = store1.setIdx(bitboard, 5, 2n)
      bitboard = store1.setIdx(bitboard, 10, 3n)

      // Extract color 2
      const result = store1.extractColorLayer(bitboard, 2, 4, 4)

      // Should have 2 cells with color 2 (1-bit representation, no depth scaling)
      expect(store1.occupancy(result)).toBe(2)
    })

    it('should extract color 1 from bitboard', () => {
      const store1 = new StoreBig(2, 100, 2, 4, 4)
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 1, 1n)
      bitboard = store1.setIdx(bitboard, 2, 2n)
      bitboard = store1.setIdx(bitboard, 7, 1n)

      const result = store1.extractColorLayer(bitboard, 1, 4, 4)

      // Should have 2 cells with color 1 (1-bit representation, no depth scaling)
      expect(store1.occupancy(result)).toBe(2)
    })

    it('should return empty for non-existent color', () => {
      const store1 = new StoreBig(2, 100, 2, 4, 4)
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 1, 1n)
      bitboard = store1.setIdx(bitboard, 2, 1n)

      const result = store1.extractColorLayer(bitboard, 5, 4, 4) // Color 5 doesn't exist

      expect(result).toBe(0n)
    })

    it('should handle sparse patterns', () => {
      const store1 = new StoreBig(2, 100, 2, 3, 3)
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 0, 1n)
      bitboard = store1.setIdx(bitboard, 2, 2n)
      bitboard = store1.setIdx(bitboard, 4, 1n)
      bitboard = store1.setIdx(bitboard, 8, 2n)

      const result2 = store1.extractColorLayer(bitboard, 2, 3, 3)

      // Should have 2 cells with color 2 (1-bit representation, no depth scaling)
      expect(store1.occupancy(result2)).toBe(2)
    })

    it('should match extractColorLayers output for same color', () => {
      const store1 = new StoreBig(2, 100, 2, 4, 4)
      let bitboard = 0n
      bitboard = store1.setIdx(bitboard, 1, 1n)
      bitboard = store1.setIdx(bitboard, 2, 2n)
      bitboard = store1.setIdx(bitboard, 5, 1n)

      // extractColorLayer returns 1-bit representation
      const singleLayer = store1.extractColorLayer(bitboard, 1, 4, 4)

      // Should have 2 cells with color 1 (cells 1 and 5)
      expect(store1.occupancy(singleLayer)).toBe(2)

      // Verify the correct cells are marked (1-bit representation, each cell = 1 bit)
      expect((singleLayer >> 1n) & 1n).toBe(1n) // bit at position 1
      expect((singleLayer >> 5n) & 1n).toBe(1n) // bit at position 5
      expect((singleLayer >> 2n) & 1n).toBe(0n) // bit at position 2
    })
  })
})
