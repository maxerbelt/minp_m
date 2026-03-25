/* eslint-env jest */
/* global describe, it, expect, beforeEach, afterEach, jest */
import { CoordinateConversion } from './CoordinateConversion.js'
import { Mask } from './mask.js'

describe('CoordinateConversion', () => {
  let mask
  let conversion

  beforeEach(() => {
    mask = new Mask(5, 5)
    conversion = new CoordinateConversion(mask)
  })

  // ============================================================================
  // Constructor and Properties
  // ============================================================================

  describe('constructor and properties', () => {
    it('stores reference to mask instance', () => {
      expect(conversion.mask).toBe(mask)
    })

    it('exposes store from mask', () => {
      expect(conversion.store).toBe(mask.store)
    })

    it('has access to mask indexer through store', () => {
      expect(conversion.store).toBeDefined()
    })
  })

  // ============================================================================
  // Coordinate to Bit Index Conversion
  // ============================================================================

  describe('coordinateToBitIndex()', () => {
    it('converts coordinate to bit index', () => {
      const index = conversion.coordinateToBitIndex(0, 0)
      expect(typeof index).toBe('number')
      expect(index).toBe(0)
    })

    it('returns different indices for different coordinates', () => {
      const index1 = conversion.coordinateToBitIndex(0, 0)
      const index2 = conversion.coordinateToBitIndex(1, 1)
      expect(index1).not.toBe(index2)
    })

    it('returns same index for same coordinate', () => {
      const index1 = conversion.coordinateToBitIndex(2, 3)
      const index2 = conversion.coordinateToBitIndex(2, 3)
      expect(index1).toBe(index2)
    })

    it('handles edge coordinates', () => {
      const cornerIndex = conversion.coordinateToBitIndex(4, 4)
      expect(cornerIndex).toBeGreaterThanOrEqual(0)
    })
  })

  // ============================================================================
  // Bit Index to Coordinate Conversion
  // ============================================================================

  describe('bitIndexToCoordinates()', () => {
    it('converts bit index back to coordinates', () => {
      const index = conversion.coordinateToBitIndex(1, 2)
      const [x, y] = conversion.bitIndexToCoordinates(index)
      expect(x).toBe(1)
      expect(y).toBe(2)
    })

    it('roundtrip conversion preserves coordinates', () => {
      const originalCoord = [3, 2]
      const index = conversion.coordinateToBitIndex(...originalCoord)
      const retrievedCoord = conversion.bitIndexToCoordinates(index)
      expect(retrievedCoord).toEqual(originalCoord)
    })

    it('handles edge coordinates correctly', () => {
      const cornerCoord = [4, 4]
      const index = conversion.coordinateToBitIndex(...cornerCoord)
      const retrieved = conversion.bitIndexToCoordinates(index)
      expect(retrieved).toEqual(cornerCoord)
    })
  })

  // ============================================================================
  // Iterator: Coordinates of Set Bits
  // ============================================================================

  describe('coordinatesOfSetBits()', () => {
    it('yields nothing for empty mask', () => {
      mask.bits = conversion.store.empty
      const coords = [...conversion.coordinatesOfSetBits()]
      expect(coords).toEqual([])
    })

    it('yields single coordinate for single set bit', () => {
      mask.set(2, 2)
      const coords = [...conversion.coordinatesOfSetBits()]
      expect(coords.length).toBe(1)
      expect(coords[0][0]).toBe(2)
      expect(coords[0][1]).toBe(2)
    })

    it('yields multiple coordinates in order', () => {
      mask.set(0, 0)
      mask.set(1, 1)
      mask.set(2, 2)

      const coords = [...conversion.coordinatesOfSetBits()]
      expect(coords.length).toBe(3)
      expect(coords.some(c => c[0] === 0 && c[1] === 0)).toBe(true)
      expect(coords.some(c => c[0] === 1 && c[1] === 1)).toBe(true)
      expect(coords.some(c => c[0] === 2 && c[1] === 2)).toBe(true)
    })

    it('is iterable multiple times', () => {
      mask.set(1, 1)
      mask.set(3, 3)

      const coords1 = [...conversion.coordinatesOfSetBits()]
      const coords2 = [...conversion.coordinatesOfSetBits()]

      expect(coords1).toEqual(coords2)
    })

    it('can be used in for...of loop', () => {
      mask.set(0, 0)
      mask.set(2, 2)

      const coords = []
      for (const coord of conversion.coordinatesOfSetBits()) {
        coords.push(coord)
      }

      expect(coords.length).toBe(2)
    })
  })

  // ============================================================================
  // Mask Creation from Coordinates
  // ============================================================================

  describe('createMaskFromCoordinates()', () => {
    it('creates empty mask from empty coordinate array', () => {
      const newMask = conversion.createMaskFromCoordinates([])
      expect(newMask.occupancy).toBe(0)
    })

    it('creates mask with single cell from one coordinate', () => {
      const newMask = conversion.createMaskFromCoordinates([[1, 1]])
      expect(newMask.at(1, 1)).toBe(1)
      expect(newMask.occupancy).toBe(1)
    })

    it('creates mask with multiple cells from multiple coordinates', () => {
      const coords = [
        [0, 0],
        [2, 2],
        [4, 4]
      ] // [x, y]
      const newMask = conversion.createMaskFromCoordinates(coords)

      for (const [x, y] of coords) {
        expect(newMask.at(x, y)).toBe(1)
      }
      expect(newMask.occupancy).toBe(3)
    })

    it('returns new mask instance, not original', () => {
      const newMask = conversion.createMaskFromCoordinates([[1, 1]])
      expect(newMask).not.toBe(mask)
    })

    it('filters invalid coordinates when creating mask', () => {
      const coords = [
        [0, 0],
        [10, 10]
      ] // (10,10) is invalid [x, y]
      const newMask = conversion.createMaskFromCoordinates(coords)

      expect(newMask.at(0, 0)).toBe(1)
      expect(newMask.occupancy).toBe(1)
      // (10, 10) should not be in the mask
    })

    it('created mask is independent from original', () => {
      const newMask = conversion.createMaskFromCoordinates([[1, 1]]) // [x, y]
      mask.set(0, 0)

      expect(newMask.at(0, 0)).toBe(0)
      expect(newMask.occupancy).toBe(1)
      expect(mask.occupancy).toBe(1)
      expect(mask.at(0, 0)).toBe(1)
    })

    it('ignores duplicates in coordinate array', () => {
      const coords = [
        [2, 2],
        [2, 2],
        [2, 2]
      ]
      const newMask = conversion.createMaskFromCoordinates(coords)

      expect(newMask.at(2, 2)).toBe(1)
      expect(newMask.occupancy).toBe(1)
    })
  })

  // ============================================================================
  // Bounding Box Computation
  // ============================================================================

  describe('getBoundingBox()', () => {
    it('returns null for empty mask', () => {
      mask.bits = conversion.store.empty
      const bbox = conversion.getBoundingBox()
      expect(bbox).toBeNull()
    })

    it('returns single point bbox for single cell', () => {
      mask.set(2, 2)
      const bbox = conversion.getBoundingBox()

      expect(bbox.min[0]).toBe(2) // x
      expect(bbox.min[1]).toBe(2) // y
      expect(bbox.max[0]).toBe(2) // x
      expect(bbox.max[1]).toBe(2) // y
    })

    it('computes bbox for multiple cells', () => {
      mask.set(1, 1)
      mask.set(3, 2)
      mask.set(2, 4)

      const bbox = conversion.getBoundingBox()

      expect(bbox.min[0]).toBe(1) // min x
      expect(bbox.min[1]).toBe(1) // min y
      expect(bbox.max[0]).toBe(3) // max x
      expect(bbox.max[1]).toBe(4) // max y
    })

    it('bbox includes all set coordinates', () => {
      const coords = [
        [0, 0],
        [4, 4],
        [2, 2]
      ]
      conversion.fromCoordinates(coords)

      const bbox = conversion.getBoundingBox()

      expect(bbox.min[0]).toBeLessThanOrEqual(0)
      expect(bbox.min[1]).toBeLessThanOrEqual(0)
      expect(bbox.max[0]).toBeGreaterThanOrEqual(4)
      expect(bbox.max[1]).toBeGreaterThanOrEqual(4)
    })

    it('bbox width and height are correct', () => {
      mask.set(1, 2)
      mask.set(3, 4)

      const bbox = conversion.getBoundingBox()
      const width = bbox.max[0] - bbox.min[0] + 1
      const height = bbox.max[1] - bbox.min[1] + 1

      expect(width).toBe(3) // columns 1, 2, 3
      expect(height).toBe(3) // rows 2, 3, 4
    })

    it('computes correct bbox for edge cases', () => {
      // Single cell at corner
      mask.set(0, 0)
      let bbox = conversion.getBoundingBox()
      // bbox contains [x, y], check x, y values
      expect(bbox.min[0]).toBe(0)
      expect(bbox.min[1]).toBe(0)
      expect(bbox.max[0]).toBe(0)
      expect(bbox.max[1]).toBe(0)

      // Multiple cells spanning entire grid
      const allCoords = []
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          allCoords.push([x, y])
        }
      }
      conversion.fromCoordinates(allCoords)
      bbox = conversion.getBoundingBox()

      expect(bbox.min[0]).toBe(0)
      expect(bbox.min[1]).toBe(0)
      expect(bbox.max[0]).toBe(4)
      expect(bbox.max[1]).toBe(4)
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('integration', () => {
    it('coordinate operations work with larger patterns', () => {
      // Create a pattern
      const coordsAsXY = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1]
      ]

      conversion.fromCoordinates(coordsAsXY)
      const retrieved = conversion.toCoordinates

      expect(retrieved.length).toBe(4)
      for (const [x, y] of coordsAsXY) {
        expect(retrieved.some(c => c[0] === x && c[1] === y)).toBe(true)
      }
    })

    it('mask creation and coordinate retrieval roundtrip', () => {
      const originalCoordsAsXY = [
        [1, 1],
        [2, 3],
        [4, 0]
      ]

      // Create mask from coords
      const newMask = conversion.createMaskFromCoordinates(originalCoordsAsXY)
      const newConversion = new CoordinateConversion(newMask)

      // Retrieve coords from new mask
      const retrievedCoords = newConversion.toCoordinates

      // Compare x,y values (coordinates may be in different order)
      const retrievedXY = retrievedCoords.map(c => [c[0], c[1]]).sort()
      const expectedXY = originalCoordsAsXY.slice().sort()
      expect(retrievedXY).toEqual(expectedXY)
    })

    it('bounding box accurately describes occupied region', () => {
      const coordsAsXY = [
        [1, 2],
        [3, 3],
        [2, 1]
      ]

      conversion.fromCoordinates(coordsAsXY)

      const bbox = conversion.getBoundingBox()

      // Verify all original coordinates are within bbox
      for (const [x, y] of coordsAsXY) {
        expect(x).toBeGreaterThanOrEqual(bbox.min[0])
        expect(x).toBeLessThanOrEqual(bbox.max[0])
        expect(y).toBeGreaterThanOrEqual(bbox.min[1])
        expect(y).toBeLessThanOrEqual(bbox.max[1])
      }
    })

    it('coordinate conversion handles complex patterns', () => {
      // Create a line
      for (let i = 0; i < 5; i++) {
        mask.set(i, 2)
      }

      const coords = [...conversion.coordinatesOfSetBits()]
      expect(coords.length).toBe(5)

      // All should be at y=2
      for (const [, y] of coords) {
        expect(y).toBe(2)
      }
    })

    it('coordinate operations preserve occupancy count', () => {
      const coordsAsXY = [
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3]
      ]

      conversion.fromCoordinates(coordsAsXY)

      const occupancy = mask.occupancy
      const retrievedCoords = conversion.toCoordinates

      expect(retrievedCoords.length).toBe(occupancy)
    })
  })
})
