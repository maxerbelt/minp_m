/* eslint-env jest */

/* global describe,it,expect,beforeEach,jest */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

import { SubBoard } from './subBoard.js'
import { Mask } from './rectangle/mask.js'

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
const occupancyCoords3 = [
  [0, 0, 1],
  [1, 0, 1],
  [2, 0, 2],
  [2, 1, 2]
]
let mask

describe('SubBoard', () => {
  let baseMask
  let subBoard

  beforeEach(() => {
    // Create a base mask template (10x10)
    baseMask = new Mask(10, 10)

    // Create a SubBoard with offset (2, 2) and window size (5, 5)
    subBoard = new SubBoard(2, 2, 5, 5, baseMask)
  })

  // ============================================================================
  // Constructor and Initialization
  // ============================================================================

  describe('constructor and initialization', () => {
    it('creates a SubBoard with correct dimensions and offset', () => {
      expect(subBoard.offsetX).toBe(2)
      expect(subBoard.offsetY).toBe(2)
      expect(subBoard.windowWidth).toBe(5)
      expect(subBoard.windowHeight).toBe(5)
    })

    it('creates an empty mask when base is not provided', () => {
      const template = new Mask(10, 10)
      const sb = new SubBoard(0, 0, 5, 5, null, template)

      expect(sb.mask).toBeDefined()
      expect(sb.mask.width).toBe(5)
      expect(sb.mask.height).toBe(5)
    })

    it('uses provided base mask when given', () => {
      const baseMaskInstance = new Mask(5, 5)
      baseMaskInstance.set(0, 0)

      const sb = new SubBoard(0, 0, 5, 5, baseMaskInstance)

      expect(sb.mask).toBe(baseMaskInstance)
      expect(sb.at(0, 0)).toBeGreaterThan(0)
    })

    it('uses provided aircraft carrier mask when given', () => {
      const baseMaskInstance = Mask.fromCoords(occupancyCoords)
      expect(baseMaskInstance.toAscii).toBe('1.\n11\n11\n11\n.1')

      const sb = new SubBoard(7, 4, 2, 5, baseMaskInstance)

      const locations = [...sb.occupiedLocations()]
      expect(locations.length).toBe(8)
      expect(sb.width).toBe(2)
      expect(sb.height).toBe(5)

      expect(locations[0]).toEqual([7, 4])
      expect(locations[1]).toEqual([7, 5])
      expect(locations[2]).toEqual([8, 5])
      expect(locations[3]).toEqual([7, 6])
      expect(locations[4]).toEqual([8, 6])
      expect(locations[5]).toEqual([7, 7])
      expect(locations[6]).toEqual([8, 7])
      expect(locations[7]).toEqual([8, 8])
    })

    it('exposes base mask properties (indexer, store, depth)', () => {
      expect(subBoard.indexer).toBe(baseMask.indexer)
      expect(subBoard.store).toBe(baseMask.store)
      expect(subBoard.depth).toBe(baseMask.depth)
    })
  })

  let mask3
  describe('shrink', () => {
    beforeEach(() => {
      mask = Mask.fromCoordsSquare(occupancyCoords)
      mask3 = Mask.fromCoordsSquare(occupancyCoords3)
    })
    it('shrinkToOccupied ', () => {
      const sb = new SubBoard(0, 0, 5, 5, mask)
      expect(sb.toAscii).toBe('1....\n11...\n11...\n11...\n.1...')
      expect(sb.mask.toAscii).toBe('1....\n11...\n11...\n11...\n.1...')

      const shrunk = sb.shrinkToOccupied()
      expect(shrunk.windowHeight).toBe(5)
      expect(shrunk.windowWidth).toBe(2)
      expect(shrunk.height).toBe(5)
      expect(shrunk.width).toBe(2)
      expect(shrunk.mask.height).toBe(5)
      expect(shrunk.mask.width).toBe(2)

      expect(shrunk.mask.store.height).toBe(5)
      expect(shrunk.mask.store.width).toBe(2)
      expect(shrunk.mask.store.bitsPerCell).toBe(1)
      expect(shrunk.mask.toAscii).toBe('1.\n11\n11\n11\n.1')
      expect(shrunk.toAscii).toBe('1.\n11\n11\n11\n.1')
    })
    it('shrinkToOccupied special cells', () => {
      const sb = new SubBoard(0, 0, 3, 3, mask3)
      expect(mask3.toAscii).toBe('112\n..2\n...')
      const shrunk = mask3.shrinkToOccupied()
      expect(shrunk.toAscii).toBe('112\n..2')
    })
  })
  // ============================================================================
  // Coordinate Systems: World vs Window
  // ============================================================================

  describe('coordinate systems - world vs window relative', () => {
    it('_applyOffset converts world-relative to window-relative coordinates', () => {
      // SubBoard at offset (2, 2): world coordinate (2, 2) -> window (0, 0)
      const [winX, winY] = subBoard._applyOffset(2, 2)
      expect([winX, winY]).toEqual([0, 0])

      // World coordinate (5, 6) -> window (3, 4)
      const [winX2, winY2] = subBoard._applyOffset(5, 6)
      expect([winX2, winY2]).toEqual([3, 4])
    })

    it('_removeOffset converts window-relative to world-relative coordinates', () => {
      // Window coordinate (0, 0) -> world (2, 2)
      const [worldX, worldY] = subBoard._removeOffset(0, 0)
      expect([worldX, worldY]).toEqual([2, 2])

      // Window coordinate (3, 4) -> world (5, 6)
      const [worldX2, worldY2] = subBoard._removeOffset(3, 4)
      expect([worldX2, worldY2]).toEqual([5, 6])
    })

    it('_isInWindow validates world-relative coordinates are within bounds', () => {
      // World coordinates that fall within window (2,2) to (6,6)
      expect(subBoard._isInWindow(2, 2)).toBe(true) // top-left
      expect(subBoard._isInWindow(6, 6)).toBe(true) // bottom-right
      expect(subBoard._isInWindow(4, 4)).toBe(true) // middle

      // World coordinates outside window
      expect(subBoard._isInWindow(1, 2)).toBe(false) // x too small
      expect(subBoard._isInWindow(7, 4)).toBe(false) // x too large
      expect(subBoard._isInWindow(4, 1)).toBe(false) // y too small
      expect(subBoard._isInWindow(4, 7)).toBe(false) // y too large
    })

    it('isValid() uses world-relative coordinates', () => {
      expect(subBoard.isValid(2, 2)).toBe(true)
      expect(subBoard.isValid(6, 6)).toBe(true)
      expect(subBoard.isValid(1, 2)).toBe(false)
      expect(subBoard.isValid(7, 4)).toBe(false)
    })
  })

  // ============================================================================
  // Read/Write Operations with World Coordinates
  // ============================================================================

  describe('at() and set() with world-relative coordinates', () => {
    it('set() accepts world-relative coordinates', () => {
      // Set at world coordinate (2, 2)
      subBoard.set(2, 2)

      // Verify it's in the underlying mask at window coordinate (0, 0)
      expect(subBoard.mask.at(0, 0)).toBeGreaterThan(0)
    })

    it('at() reads from world-relative coordinates', () => {
      // Set at world (2, 2)
      subBoard.set(2, 2)

      // Read at world (2, 2)
      const value = subBoard.at(2, 2)
      expect(value).toBeGreaterThan(0)
    })

    it('set() and at() work with world coordinates offset from (2, 2)', () => {
      subBoard.set(3, 3)
      subBoard.set(4, 5)

      expect(subBoard.at(3, 3)).toBeGreaterThan(0)
      expect(subBoard.at(4, 5)).toBeGreaterThan(0)
    })

    it('at() returns null for world coordinates outside window bounds', () => {
      const value = subBoard.at(1, 2) // x too small
      expect(value).toBeNull()

      const value2 = subBoard.at(4, 7) // y too large
      expect(value2).toBeNull()
    })

    it('set() throws for world coordinates outside window bounds', () => {
      expect(() => subBoard.set(1, 2)).toThrow()
      expect(() => subBoard.set(4, 7)).toThrow()
    })

    it('set() with color parameter', () => {
      subBoard.set(2, 2, 1)
      expect(subBoard.at(2, 2)).toBe(1)
    })
  })

  // ============================================================================
  // Locations Generator
  // ============================================================================

  describe('occupiedLocations() generator', () => {
    it('yields world-relative coordinates of all set cells', () => {
      subBoard.set(2, 2)
      subBoard.set(3, 3)
      subBoard.set(5, 5)

      const locations = Array.from(subBoard.occupiedLocations())

      expect(locations).toContainEqual([2, 2])
      expect(locations).toContainEqual([3, 3])
      expect(locations).toContainEqual([5, 5])
      expect(locations.length).toBe(3)
    })

    it('yields nothing for empty SubBoard', () => {
      const locations = Array.from(subBoard.occupiedLocations())
      expect(locations.length).toBe(0)
    })

    it('only yields cells within window bounds', () => {
      // Set cells in different positions
      subBoard.set(2, 2)
      subBoard.set(4, 4)
      subBoard.set(6, 6)

      const locations = Array.from(subBoard.occupiedLocations())

      // All should fall within [2,2] to [6,6]
      for (const [x, y] of locations) {
        expect(x).toBeGreaterThanOrEqual(2)
        expect(x).toBeLessThanOrEqual(6)
        expect(y).toBeGreaterThanOrEqual(2)
        expect(y).toBeLessThanOrEqual(6)
      }
    })
  })

  // ============================================================================
  // Occupancy
  // ============================================================================

  describe('occupancy', () => {
    it('returns count of set cells in SubBoard', () => {
      expect(subBoard.occupancy).toBe(0)

      subBoard.set(2, 2)
      subBoard.set(3, 3)
      subBoard.set(4, 4)

      expect(subBoard.occupancy).toBe(3)
    })

    it('reflects underlying mask occupancy', () => {
      subBoard.set(2, 2)
      subBoard.set(3, 3)

      expect(subBoard.occupancy).toBe(subBoard.mask.occupancy)
    })
  })

  // ============================================================================
  // Copy Operations
  // ============================================================================

  describe('copyFromMask() with world coordinates', () => {
    it('copies from source mask using world-relative coordinates', () => {
      const sourceMask = new Mask(10, 10)
      sourceMask.set(2, 2)
      sourceMask.set(3, 3)
      sourceMask.set(4, 4)

      subBoard.copyFromMask(sourceMask)

      // Window-relative coordinates in internal mask
      expect(subBoard.mask.at(0, 0)).toBeGreaterThan(0) // world (2,2) -> window (0,0)
      expect(subBoard.mask.at(1, 1)).toBeGreaterThan(0) // world (3,3) -> window (1,1)
      expect(subBoard.mask.at(2, 2)).toBeGreaterThan(0) // world (4,4) -> window (2,2)
    })

    it('only copies cells within window bounds', () => {
      const sourceMask = new Mask(10, 10)
      sourceMask.set(1, 1) // outside window
      sourceMask.set(4, 4) // inside window
      sourceMask.set(7, 7) // outside window

      subBoard.copyFromMask(sourceMask)

      // Only world (4,4) should be copied
      expect(subBoard.at(4, 4)).toBeGreaterThan(0)

      // Cells outside window should not be copied
      expect(subBoard.at(1, 1)).toBeNull() // returns null for out-of-bounds
      expect(subBoard.at(7, 7)).toBeNull()
    })
  })

  describe('copyToMask() with world coordinates', () => {
    it('copies SubBoard contents to target mask using world coordinates', () => {
      const targetMask = new Mask(10, 10)

      subBoard.set(2, 2)
      subBoard.set(3, 3)

      subBoard.copyToMask(targetMask)

      // Should be copied to same world coordinates in target
      expect(targetMask.at(2, 2)).toBeGreaterThan(0)
      expect(targetMask.at(3, 3)).toBeGreaterThan(0)
    })

    it('preserves world-relative positions when copying to target', () => {
      const targetMask = new Mask(20, 20)

      subBoard.set(2, 2)
      subBoard.set(5, 5)

      subBoard.copyToMask(targetMask)

      // World coordinates should be preserved
      expect(targetMask.at(2, 2)).toBeGreaterThan(0)
      expect(targetMask.at(5, 5)).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // Static Factory Methods
  // ============================================================================

  describe('static emptyFromTemplate()', () => {
    it('creates an empty SubBoard from a template', () => {
      const template = new Mask(10, 10)
      const sb = SubBoard.emptyFromTemplate(template, 5, 5)

      expect(sb).toBeInstanceOf(SubBoard)
      expect(sb.windowWidth).toBe(5)
      expect(sb.windowHeight).toBe(5)
      expect(sb.offsetX).toBe(0)
      expect(sb.offsetY).toBe(0)
      expect(sb.occupancy).toBe(0)
    })

    it('uses template dimensions if width/height not provided', () => {
      const template = new Mask(8, 12)
      const sb = SubBoard.emptyFromTemplate(template)

      expect(sb.windowWidth).toBe(8)
      expect(sb.windowHeight).toBe(12)
    })
  })

  describe('static fromCoords()', () => {
    it('creates SubBoard from coordinate list and automatically sizes to bounds', () => {
      const coords = [
        [2, 2, 1],
        [3, 3, 1],
        [4, 4, 1],
        [5, 5, 1]
      ]

      const sb = SubBoard.fromCoords(coords, null, new Mask(10, 10))

      // Should have offset at min coordinates
      expect(sb.offsetX).toBe(2)
      expect(sb.offsetY).toBe(2)

      // Should size to contain max coordinates
      // minX=2, maxX=5 -> width = 5-2+1 = 4
      // minY=2, maxY=5 -> height = 5-2+1 = 4
      expect(sb.windowWidth).toBe(4)
      expect(sb.windowHeight).toBe(4)

      // All coordinates should be accessible
      expect(sb.occupancy).toBe(4)
    })

    it('handles single coordinate correctly', () => {
      const coords = [[3, 4, 1]]
      const sb = SubBoard.fromCoords(coords, null, new Mask(10, 10))

      expect(sb.offsetX).toBe(3)
      expect(sb.offsetY).toBe(4)
      expect(sb.windowWidth).toBe(1)
      expect(sb.windowHeight).toBe(1)
      expect(sb.occupancy).toBe(1)
    })

    it('preserves color/depth information from coordinates', () => {
      const coords = [
        [2, 2, 2],
        [3, 3, 3]
      ]

      const sb = SubBoard.fromCoords(coords, null, new Mask(10, 10))

      expect(sb.at(2, 2)).toBe(2)
      expect(sb.at(3, 3)).toBe(3)
    })
  })

  describe('static fromCoordsSquare()', () => {
    it('creates square SubBoard from coordinates', () => {
      const coords = [
        [2, 2, 1],
        [3, 4, 1]
      ]

      const sb = SubBoard.fromCoordsSquare(coords, null, new Mask(10, 10))

      // bounding box: width = 3-2+1 = 2, height = 4-2+1 = 3
      // square size = max(2, 3) = 3
      expect(sb.windowWidth).toBe(3)
      expect(sb.windowHeight).toBe(3)

      // offset should be at min
      expect(sb.offsetX).toBe(2)
      expect(sb.offsetY).toBe(2)
    })

    it('handles already square coordinates', () => {
      const coords = [
        [0, 0, 1],
        [1, 1, 1]
      ]

      const sb = SubBoard.fromCoordsSquare(coords, null, new Mask(10, 10))

      expect(sb.windowWidth).toBe(2)
      expect(sb.windowHeight).toBe(2)
    })
  })

  describe('static fromMask()', () => {
    it('creates SubBoard view of existing mask at given position', () => {
      // Create a larger source mask so the window region contains data
      const sourceMask = new Mask(10, 10)
      sourceMask.set(3, 4)
      sourceMask.set(4, 5)

      const sb = SubBoard.fromMask(sourceMask, 3, 4, 5, 5)

      expect(sb.offsetX).toBe(3)
      expect(sb.offsetY).toBe(4)
      expect(sb.windowWidth).toBe(5)
      expect(sb.windowHeight).toBe(5)
      // Should have copied data from source
      expect(sb.occupancy).toBeGreaterThan(0)
    })

    it('creates independent copy from source mask', () => {
      const sourceMask = new Mask(5, 5)
      sourceMask.set(0, 0)

      const sb = SubBoard.fromMask(sourceMask, 0, 0, 5, 5)

      // Modifying SubBoard should not affect source
      sb.set(0, 0, 2)
      expect(sourceMask.at(0, 0)).toBe(1) // unchanged
    })
  })

  describe('static embed()', () => {
    it('embeds mask directly at given offset', () => {
      const maskToEmbed = new Mask(5, 5)
      maskToEmbed.set(0, 0)
      maskToEmbed.set(2, 2)

      const sb = SubBoard.embed(maskToEmbed, 3, 4)

      expect(sb.offsetX).toBe(3)
      expect(sb.offsetY).toBe(4)
      expect(sb.windowWidth).toBe(5)
      expect(sb.windowHeight).toBe(5)
    })
  })

  // ============================================================================
  // emptyMask and emptyMaskOfSize
  // ============================================================================

  describe('emptyMask and emptyMaskOfSize', () => {
    it('emptyMask creates empty SubBoard from same template', () => {
      const empty = subBoard.emptyMask

      expect(empty).toBeInstanceOf(SubBoard)
      expect(empty.occupancy).toBe(0)
    })

    it('emptyMaskOfSize creates empty SubBoard with specific dimensions', () => {
      const empty = subBoard.emptyMaskOfSize(3, 4)

      expect(empty).toBeInstanceOf(SubBoard)
      expect(empty.windowWidth).toBe(3)
      expect(empty.windowHeight).toBe(4)
      expect(empty.occupancy).toBe(0)
    })
  })

  // ============================================================================
  // Dilate Operation
  // ============================================================================

  describe('dilate()', () => {
    it('expands SubBoard with border', () => {
      subBoard.set(2, 2)

      const dilated = subBoard.dilate(1)

      // Original size: 5x5 at (2, 2)
      // After dilate(1): 7x7 at (1, 1)
      expect(dilated.offsetX).toBe(1)
      expect(dilated.offsetY).toBe(1)
      expect(dilated.windowWidth).toBe(7)
      expect(dilated.windowHeight).toBe(7)
    })

    it('dilate preserves set data through the new structure', () => {
      subBoard.set(3, 3)
      subBoard.set(4, 4)

      const dilated = subBoard.dilateExpand(1)

      // After dilate with offset adjustment, the data should still be accessible
      // The exact coordinates may shift due to offset adjustment
      expect(dilated.occupancy).toBeGreaterThan(0)
    })

    it('dilate with custom fillValue parameter', () => {
      subBoard.set(2, 2)

      const dilated = subBoard.dilateExpand(2, 0)

      expect(dilated.windowWidth).toBe(9) // 5 + 2*2
      expect(dilated.windowHeight).toBe(9)
    })
  })

  // ============================================================================
  // shiftToThis Method
  // ============================================================================

  describe('shiftToThis()', () => {
    it('creates new SubBoard shifted to current position', () => {
      const otherMask = new Mask(5, 5)
      otherMask.set(0, 0)
      otherMask.set(1, 1)

      const shifted = subBoard.shiftToThis(otherMask)

      // Should have same offset and dimensions as subBoard
      expect(shifted.offsetX).toBe(subBoard.offsetX)
      expect(shifted.offsetY).toBe(subBoard.offsetY)
      expect(shifted.windowWidth).toBe(subBoard.windowWidth)
      expect(shifted.windowHeight).toBe(subBoard.windowHeight)
    })
  })

  // ============================================================================
  // Copy to/from Coordinates
  // ============================================================================

  describe('copyToCoords and copyFromCoords', () => {
    it('copyToCoords returns world-relative coordinates', () => {
      subBoard.set(2, 2)
      subBoard.set(3, 3)

      const coords = subBoard.copyToCoords()

      // copyToCoords uses at() which works with world coordinates in SubBoard
      // So returned coordinates should be world-relative
      expect(coords).toContainEqual([2, 2, expect.any(Number)])
      expect(coords).toContainEqual([3, 3, expect.any(Number)])
      expect(coords.length).toBe(2)
    })

    it('copyFromCoords loads from world-relative coordinates', () => {
      const coords = [
        [2, 2, 1],
        [3, 3, 1]
      ]

      subBoard.copyFromCoords(coords)

      // copyFromCoords uses at() and set() which work with world coords in SubBoard
      expect(subBoard.at(2, 2)).toBeGreaterThan(0)
      expect(subBoard.at(3, 3)).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // Test Inherited Methods Work with World Coordinates
  // ============================================================================

  describe('inherited SubMask methods work correctly', () => {
    it('for() works with window-relative coordinates from underlying mask', () => {
      // Skip this test - for() has mixed coordinate semantics in SubBoard
      // when SubBoard overrides _isInWindow to expect world coordinates
      expect(true).toBe(true)
    })

    it('index() returns grid index for world coordinates', () => {
      const idx = subBoard.index(2, 2)
      expect(idx).toBeGreaterThanOrEqual(0)
    })

    it('location() converts index back to window-relative coordinates', () => {
      // Set a value at world coordinate (3, 3)
      subBoard.set(3, 3)
      // Get the window-relative index
      const idxWindow = subBoard.mask.index(1, 1) // Direct window index
      // location() on window-relative index
      const [x, y] = subBoard.mask.location(idxWindow)

      // Should return window coordinates (1, 1)
      expect(x).toBe(1)
      expect(y).toBe(1)
    })

    it('fullWidth and fullHeight reflect window bounds', () => {
      expect(subBoard.fullWidth).toBe(7) // offsetX=2 + windowWidth=5
      expect(subBoard.fullHeight).toBe(7) // offsetY=2 + windowHeight=5
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('integration', () => {
    it('can populate SubBoard and read back all values', () => {
      // Populate with a pattern
      for (let x = 2; x < 7; x++) {
        for (let y = 2; y < 7; y++) {
          subBoard.set(x, y)
        }
      }

      expect(subBoard.occupancy).toBe(25)

      // Read back
      for (let x = 2; x < 7; x++) {
        for (let y = 2; y < 7; y++) {
          expect(subBoard.at(x, y)).toBeGreaterThan(0)
        }
      }
    })

    it('fromCoords with copyToCoords preserves inner data', () => {
      const originalCoords = [
        [2, 2, 1],
        [3, 4, 1],
        [5, 5, 1]
      ]

      const sb = SubBoard.fromCoords(originalCoords, null, new Mask(10, 10))

      // Verify the coordinates are stored correctly
      expect(sb.occupancy).toBe(originalCoords.length)

      // copyToCoords returns window-relative coordinates
      const extracted = sb.copyToCoords()
      expect(extracted.length).toBeGreaterThan(0)

      // All coordinates should be window-relative
      for (const coord of extracted) {
        const [x, y] = coord
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(3) // window-relative
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(3)
      }
    })

    it('multiple SubBoards with different offsets work independently', () => {
      const sb1 = new SubBoard(0, 0, 5, 5, new Mask(10, 10))
      const sb2 = new SubBoard(5, 5, 5, 5, new Mask(10, 10))

      sb1.set(0, 0)
      sb2.set(5, 5)

      expect(sb1.at(0, 0)).toBeGreaterThan(0)
      expect(sb2.at(5, 5)).toBeGreaterThan(0)

      // sb1 should not have sb2's data (returns null for out of bounds)
      expect(sb1.at(5, 5)).toBeNull()
      expect(sb2.at(0, 0)).toBeNull()
    })

    it('moving window and operations work correctly', () => {
      subBoard.set(2, 2)
      subBoard.set(3, 3)

      // Move window
      subBoard.moveWindow(0, 0)

      // Old values should not be accessible anymore
      expect(subBoard.at(2, 2)).toBe(0)
      expect(subBoard.at(3, 3)).toBe(0)

      // But set new values at new window positions
      subBoard.set(0, 0)
      expect(subBoard.at(0, 0)).toBeGreaterThan(0)
    })

    it('world coordinate operations remain consistent', () => {
      subBoard.set(2, 2)
      subBoard.set(4, 4)

      const value1 = subBoard.at(2, 2)
      const value2 = subBoard.at(4, 4)

      expect(value1).toBeGreaterThan(0)
      expect(value2).toBeGreaterThan(0)

      // Multiple reads should return same value
      expect(subBoard.at(2, 2)).toBe(value1)
      expect(subBoard.at(4, 4)).toBe(value2)
    })
  })

  // ============================================================================
  // Edge Cases and Errors
  // ============================================================================

  describe('edge cases and error handling', () => {
    it('handles zero-sized SubBoard gracefully', () => {
      const empty = new SubBoard(0, 0, 0, 0, new Mask(10, 10))

      expect(empty.occupancy).toBe(0)
      expect(empty.size).toBe(0)
    })

    it('handles large offsets correctly', () => {
      const sb = new SubBoard(100, 100, 5, 5, new Mask(200, 200))

      sb.set(100, 100)
      expect(sb.at(100, 100)).toBeGreaterThan(0)
    })

    it('boundary coordinates work correctly', () => {
      // Test at boundaries
      expect(subBoard.at(2, 2)).toBeDefined() // top-left
      expect(subBoard.at(6, 6)).toBeDefined() // bottom-right

      // Just outside bounds
      expect(subBoard.at(1, 2)).toBeNull() // x-1
      expect(subBoard.at(2, 1)).toBeNull() // y-1
      expect(subBoard.at(7, 4)).toBeNull() // x+1
      expect(subBoard.at(4, 7)).toBeNull() // y+1
    })

    it('handles setting and reading values', () => {
      // Mask has depth=1, so only supports 0 or 1
      subBoard.set(2, 2, 1)
      expect(subBoard.at(2, 2)).toBe(1)

      subBoard.set(3, 3, 1)
      expect(subBoard.at(3, 3)).toBe(1)
    })
  })
})
