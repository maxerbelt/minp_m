/* eslint-env jest */

/* global beforeEach, describe, it, expect */
import { Mask } from './mask.js'
import { Packed } from './packed.js'

/**
 * Comprehensive interface tests for both Mask and Packed grid implementations
 * These tests ensure the public API is consistent across both classes
 */
describe('MaskBase Interface - Consistency Tests', () => {
  // Test both Mask and Packed with the same test suite
  const implementations = [
    { name: 'Mask', Factory: (w, h) => new Mask(w, h), depth: 1 },
    { name: 'Packed', Factory: (w, h) => new Packed(w, h), depth: 4 }
  ]

  implementations.forEach(({ name, Factory, depth }) => {
    describe(`${name} - Grid Fundamentals`, () => {
      let grid

      beforeEach(() => {
        grid = Factory(8, 8)
      })

      // ============================================================================
      // Constructor and Properties
      // ============================================================================

      describe('constructor and properties', () => {
        it('initializes with correct dimensions', () => {
          expect(grid.width).toBe(8)
          expect(grid.height).toBe(8)
          expect(grid.depth).toBeGreaterThanOrEqual(1)
        })

        it('starts with zero occupancy', () => {
          expect(grid.occupancy).toBe(0)
        })

        it('has store instance', () => {
          expect(grid.store).toBeDefined()
        })

        it('has indexer instance', () => {
          expect(grid.indexer).toBeDefined()
        })

        it('has empty bits at start', () => {
          expect(grid.occupancy).toBe(0)
        })
      })

      // ============================================================================
      // Basic Cell Access - set, at, test, clear
      // ============================================================================

      describe('cell access (set, at, test, clear)', () => {
        it('set marks a cell with value', () => {
          grid.set(0, 0, 1)
          expect(grid.occupancy).toBe(1)
        })

        it('at returns cell value', () => {
          grid.set(3, 3, 1)
          expect(grid.at(3, 3)).toBe(1)
        })

        it('at returns 0 for empty cell', () => {
          expect(grid.at(0, 0)).toBe(0)
        })

        it('test checks if cell is set', () => {
          grid.set(2, 2, 1)
          expect(grid.test(2, 2)).toBe(true)
          expect(grid.test(3, 3)).toBe(false)
        })

        it('clear removes a cell', () => {
          grid.set(1, 1, 1)
          expect(grid.occupancy).toBe(1)
          grid.clear(1, 1)
          expect(grid.occupancy).toBe(0)
          expect(grid.at(1, 1)).toBe(0)
        })

        it('handles multiple cells independently', () => {
          grid.set(0, 0, 1)
          grid.set(1, 1, 1)
          grid.set(2, 2, 1)
          expect(grid.occupancy).toBe(3)
          grid.clear(1, 1)
          expect(grid.occupancy).toBe(2)
          expect(grid.at(0, 0)).toBe(1)
          expect(grid.at(1, 1)).toBe(0)
          expect(grid.at(2, 2)).toBe(1)
        })
      })

      // ============================================================================
      // Coordinate System
      // ============================================================================

      describe('coordinate system', () => {
        it('index calculates linear position from coordinates', () => {
          const idx0 = grid.index(0, 0)
          const idx1 = grid.index(1, 0)
          const idx2 = grid.index(0, 1)
          expect(idx0).toBeLessThan(idx1)
          expect(idx1).toBeLessThan(idx2)
        })

        it('index is consistent for same coordinates', () => {
          expect(grid.index(3, 5)).toBe(grid.index(3, 5))
        })

        it('set and at use index consistently', () => {
          const x = 2
          const y = 3
          grid.set(x, y, 1)
          expect(grid.at(x, y)).toBe(1)
        })

        it('boundaries are respected', () => {
          // These should not throw even at boundaries
          grid.set(0, 0, 1)
          grid.set(7, 7, 1)
          expect(grid.at(0, 0)).toBe(1)
          expect(grid.at(7, 7)).toBe(1)
        })
      })

      // ============================================================================
      // Range Operations
      // ============================================================================

      describe('range operations (setRange, clearRange)', () => {
        it('setRange sets multiple cells in a row', () => {
          grid.setRange(0, 0, 2)
          expect(grid.at(0, 0)).toBe(1)
          expect(grid.at(1, 0)).toBe(1)
          expect(grid.at(2, 0)).toBe(1)
          expect(grid.at(3, 0)).toBe(0)
        })

        it('clearRange clears multiple cells', () => {
          grid.setRange(0, 0, 5)
          expect(grid.occupancy).toBe(6) // 0,1,2,3,4,5
          grid.clearRange(0, 2, 4)
          expect(grid.at(2, 0)).toBe(0)
          expect(grid.at(3, 0)).toBe(0)
          expect(grid.at(4, 0)).toBe(0)
          expect(grid.at(1, 0)).toBe(1)
        })

        it('clearRange on empty range does nothing', () => {
          expect(grid.occupancy).toBe(0)
          grid.clearRange(2, 0, 2)
          expect(grid.occupancy).toBe(0)
        })

        it('setRange across multiple rows works independently', () => {
          grid.setRange(0, 1, 3)
          grid.setRange(1, 0, 2)
          expect(grid.at(1, 0)).toBe(1) // row 0 cols 1-3
          expect(grid.at(2, 0)).toBe(1) // row 0 col 2
          expect(grid.at(0, 1)).toBe(1) // row 1 cols 0-2
          expect(grid.at(1, 1)).toBe(1) // row 1 col 1
          expect(grid.at(3, 1)).toBe(0) // row 1 col 3 not set
        })
      })

      // ============================================================================
      // Occupancy and Statistics
      // ============================================================================

      describe('occupancy tracking', () => {
        it('occupancy increases when cells are set', () => {
          expect(grid.occupancy).toBe(0)
          grid.set(0, 0, 1)
          expect(grid.occupancy).toBe(1)
          grid.set(1, 1, 1)
          expect(grid.occupancy).toBe(2)
        })

        it('occupancy decreases when cells are cleared', () => {
          grid.set(0, 0, 1)
          grid.set(1, 1, 1)
          expect(grid.occupancy).toBe(2)
          grid.clear(0, 0)
          expect(grid.occupancy).toBe(1)
        })

        it('occupancy is 0 for empty grid', () => {
          expect(grid.occupancy).toBe(0)
        })

        it('occupancy reflects current state', () => {
          grid.setRange(0, 0, 3)
          expect(grid.occupancy).toBe(4)
          grid.setRange(2, 0, 5)
          expect(grid.occupancy).toBe(10) // 4 from first range + 6 from second range
        })
      })

      // ============================================================================
      // Coordinate Conversion
      // ============================================================================

      describe('coordinate conversion (toCoords, fromCoords)', () => {
        it('toCoords returns array of [x, y] pairs', () => {
          grid.set(0, 0, 1)
          grid.set(2, 2, 1)
          const coords = grid.toCoords
          expect(Array.isArray(coords)).toBe(true)
          expect(coords.length).toBe(2)
          expect(coords[0]).toEqual([0, 0])
          expect(coords[1]).toEqual([2, 2])
        })

        it('toCoords for empty grid is empty array', () => {
          expect(grid.toCoords).toEqual([])
        })

        it('fromCoords loads coordinates into grid', () => {
          const coords = [
            [1, 1],
            [3, 3],
            [5, 5]
          ]
          grid.fromCoords(coords)
          expect(grid.at(1, 1)).toBe(1)
          expect(grid.at(3, 3)).toBe(1)
          expect(grid.at(5, 5)).toBe(1)
          expect(grid.occupancy).toBe(3)
        })

        it('round-trip coordinates are preserved', () => {
          const original = [
            [0, 0],
            [1, 2],
            [5, 3],
            [7, 7]
          ]
          grid.fromCoords(original)
          const result = grid.toCoords
          const sorted = result.sort((a, b) => a[0] - b[0] || a[1] - b[1])
          const sortedOrig = original.sort((a, b) => a[0] - b[0] || a[1] - b[1])
          expect(sorted).toEqual(sortedOrig)
        })

        it('fromCoords with empty array clears grid', () => {
          grid.set(2, 2, 1)
          expect(grid.occupancy).toBe(1)
          grid.fromCoords([])
          expect(grid.occupancy).toBe(0)
        })
      })

      // ============================================================================
      // Factory Methods
      // ============================================================================

      describe('factory methods (empty, clone, etc)', () => {
        it('creates empty mask of same dimensions', () => {
          grid.set(2, 2, 1)
          const empty = grid.emptyMask
          expect(empty.width).toBe(grid.width)
          expect(empty.height).toBe(grid.height)
          expect(empty.occupancy).toBe(0)
        })

        it('clone creates independent copy', () => {
          grid.set(1, 1, 1)
          const cloned = grid.clone
          expect(cloned.width).toBe(grid.width)
          expect(cloned.height).toBe(grid.height)
          expect(cloned.occupancy).toBe(grid.occupancy)
          expect(cloned.at(1, 1)).toBe(grid.at(1, 1))

          // Modifying clone doesn't affect original
          cloned.set(3, 3, 1)
          expect(grid.at(3, 3)).toBe(0)
          expect(cloned.at(3, 3)).toBe(1)
        })

        it('static empty factory creates empty grid', () => {
          const emptyGrid = Factory(5, 5)
          expect(emptyGrid.width).toBe(5)
          expect(emptyGrid.height).toBe(5)
          expect(emptyGrid.occupancy).toBe(0)
        })
      })

      // ============================================================================
      // Bitwise Operations
      // ============================================================================

      describe('bitwise operations (join, overlap, subtract)', () => {
        it('bitOr combines two grids', () => {
          const grid2 = Factory(8, 8)
          grid.set(0, 0, 1)
          grid.set(1, 1, 1)
          grid2.set(2, 2, 1)
          grid2.set(3, 3, 1)

          const union = grid.joinFromBits(grid2.bits)
          expect(union.occupancy).toBeGreaterThanOrEqual(3)
        })

        it('bitAnd finds overlap', () => {
          const grid2 = Factory(8, 8)
          grid.set(0, 0, 1)
          grid.set(1, 1, 1)
          grid2.set(0, 0, 1)
          grid2.set(2, 2, 1)

          const overlap = grid.overlapFromBits(grid2.bits)
          expect(overlap.occupancy).toBeGreaterThanOrEqual(1)
        })

        it('bitSub removes cells', () => {
          const grid2 = Factory(8, 8)
          grid.setRange(0, 0, 4)
          grid2.set(2, 0, 1)

          const diff = grid.bitSub(grid2.bits)
          expect(diff).toBeDefined()
        })
      })

      // ============================================================================
      // Dimension Information
      // ============================================================================

      describe('dimension properties', () => {
        it('size getter returns cell count', () => {
          expect(grid.size).toBe(0) // Empty grid
          grid.set(0, 0, 1)
          grid.set(1, 1, 1)
          expect(grid.size).toBe(2)
        })

        it('width and height match constructor', () => {
          const w = 5
          const h = 6
          const g = Factory(w, h)
          expect(g.width).toBe(w)
          expect(g.height).toBe(h)
        })

        it('total cells equals width * height', () => {
          const expectedCells = 8 * 8
          expect(grid.indexer.size).toBe(expectedCells)
        })
      })

      // ============================================================================
      // Bit Access and Manipulation
      // ============================================================================

      describe('bit-level access', () => {
        it('bits property holds the bitboard', () => {
          expect(grid.bits).toBeDefined()
          grid.set(0, 0, 1)
          expect(grid.bits).not.toBe(0n)
        })

        it('bits can be cloned and used in operations', () => {
          grid.set(1, 1, 1)
          const gridCopy = Factory(8, 8)
          gridCopy.bits = grid.bits
          expect(gridCopy.occupancy).toBe(grid.occupancy)
          expect(gridCopy.at(1, 1)).toBe(1)
        })

        it('clearing bits works', () => {
          grid.setRange(0, 0, 7)
          expect(grid.occupancy).toBeGreaterThan(0)
          grid.bits = grid.store.empty
          expect(grid.occupancy).toBe(0)
        })
      })
    })

    // Most morphological and complex operations are in their specific test files
    // but we test the interface exists
    describe(`${name} - Advanced Operations Interface`, () => {
      let grid

      beforeEach(() => {
        grid = Factory(8, 8)
      })

      describe('morphological operations interface', () => {
        it('has dilate method', () => {
          expect(grid.dilate).toBeDefined()
          expect(typeof grid.dilate).toBe('function')
        })

        it('has erode method', () => {
          expect(grid.erode).toBeDefined()
          expect(typeof grid.erode).toBe('function')
        })

        it('has dilateCross method', () => {
          expect(grid.dilateCross).toBeDefined()
          expect(typeof grid.dilateCross).toBe('function')
        })
      })

      describe('transformation interface', () => {
        it('has rotate method', () => {
          expect(grid.rotate).toBeDefined() ||
            expect(grid.canRotate).toBeDefined()
        })

        it('has flip method', () => {
          expect(grid.flip).toBeDefined() || expect(grid.canFlip).toBeDefined()
        })
      })

      describe('utility methods', () => {
        it('has toAscii property for visualization', () => {
          expect(grid.toAscii).toBeDefined()
          expect(typeof grid.toAscii).toBe('string')
        })

        it('has normalize method', () => {
          expect(grid.normalize).toBeDefined() ||
            expect(typeof grid.normalize).toBe('function')
        })
      })
    })
  })

  // ============================================================================
  // Comparative Behavior Tests
  // ============================================================================

  describe('Comparative Behavior - Mask vs Packed', () => {
    let mask
    let packed

    beforeEach(() => {
      mask = new Mask(8, 8)
      packed = new Packed(8, 8)
    })

    it('same operations produce same occupancy', () => {
      mask.set(0, 0, 1)
      packed.set(0, 0, 1)
      expect(mask.occupancy).toBe(packed.occupancy)

      mask.set(3, 3, 1)
      packed.set(3, 3, 1)
      expect(mask.occupancy).toBe(packed.occupancy)
    })

    it('same range operations affect dimensions', () => {
      mask.setRange(0, 0, 3)
      packed.setRange(0, 0, 3)
      expect(mask.occupancy).toBe(packed.occupancy)
    })

    it('same coordinates produce same results', () => {
      const coords = [
        [1, 1],
        [2, 2],
        [5, 5]
      ]
      mask.fromCoords(coords)
      packed.fromCoords(coords)
      expect(mask.occupancy).toBe(packed.occupancy)

      coords.forEach(([x, y]) => {
        expect(mask.at(x, y)).toBe(packed.at(x, y))
        expect(mask.test(x, y)).toBe(packed.test(x, y))
      })
    })

    it('clone independence is consistent', () => {
      mask.set(1, 1, 1)
      packed.set(1, 1, 1)

      const maskClone = mask.clone
      const packedClone = packed.clone

      maskClone.set(3, 3, 1)
      packedClone.set(3, 3, 1)

      expect(mask.at(3, 3)).toBe(0)
      expect(packed.at(3, 3)).toBe(0)
      expect(maskClone.occupancy).toBe(packedClone.occupancy)
    })
  })

  // ============================================================================
  // Edge Cases and Boundary Conditions
  // ============================================================================

  describe('Edge Cases and Boundary Conditions', () => {
    let mask
    let packed

    beforeEach(() => {
      mask = new Mask(8, 8)
      packed = new Packed(8, 8)
    })

    it('handles all corners correctly', () => {
      ;[
        [0, 0],
        [7, 0],
        [0, 7],
        [7, 7]
      ].forEach(([x, y]) => {
        mask.set(x, y, 1)
        packed.set(x, y, 1)
      })

      expect(mask.occupancy).toBe(4)
      expect(packed.occupancy).toBe(4)
    })

    it('handles full grid conversion', () => {
      const coords = []
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          coords.push([x, y])
        }
      }

      mask.fromCoords(coords)
      packed.fromCoords(coords)

      expect(mask.occupancy).toBe(64)
      expect(packed.occupancy).toBe(64)
    })

    it('clears and refills correctly', () => {
      mask.set(1, 1, 1)
      packed.set(1, 1, 1)

      mask.bits = mask.store.empty
      packed.bits = packed.store.empty

      expect(mask.occupancy).toBe(0)
      expect(packed.occupancy).toBe(0)

      mask.set(5, 5, 1)
      packed.set(5, 5, 1)

      expect(mask.at(5, 5)).toBe(1)
      expect(packed.at(5, 5)).toBe(1)
    })

    it('handles sequential operations consistently', () => {
      const operations = [
        () => {
          mask.set(0, 0, 1)
          packed.set(0, 0, 1)
        },
        () => {
          mask.set(2, 3, 1)
          packed.set(2, 3, 1)
        },
        () => {
          mask.clear(0, 0)
          packed.clear(0, 0)
        },
        () => {
          mask.setRange(1, 1, 3)
          packed.setRange(1, 1, 3)
        }
      ]

      operations.forEach(op => {
        op()
        expect(mask.occupancy).toBe(packed.occupancy)
      })
    })
  })
})
