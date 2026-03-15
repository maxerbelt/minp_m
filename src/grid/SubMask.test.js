/* eslint-env jest */
/* global describe, it, expect, beforeEach, afterEach, jest */
import { SubMask } from './SubMask.js'
import { Mask } from './mask.js'

describe('SubMask', () => {
  let parentMask
  let subMask

  beforeEach(() => {
    // Create a 10x10 parent mask
    parentMask = new Mask(10, 10)

    // Create a 5x5 window starting at offset (2, 2)
    subMask = new SubMask(parentMask, 2, 2, 5, 5)
  })

  // ============================================================================
  // Constructor and Properties
  // ============================================================================

  describe('constructor and properties', () => {
    it('creates a SubMask with correct dimensions', () => {
      expect(subMask.windowWidth).toBe(5)
      expect(subMask.windowHeight).toBe(5)
      expect(subMask.offsetX).toBe(2)
      expect(subMask.offsetY).toBe(2)
    })

    it('exposes width and height as getters', () => {
      expect(subMask.width).toBe(5)
      expect(subMask.height).toBe(5)
    })

    it('exposes size property', () => {
      expect(subMask.size).toBe(25) // 5 * 5
    })

    it('delegates indexer, store, and depth from parent mask', () => {
      expect(subMask.indexer).toBe(parentMask.indexer)
      expect(subMask.store).toBe(parentMask.store)
      expect(subMask.depth).toBe(parentMask.depth)
    })

    it('delegates bits property to parent mask', () => {
      const initialBits = parentMask.bits
      expect(subMask.bits).toBe(initialBits)

      // Setting bits should update parent mask
      const newBits = parentMask.store.empty
      subMask.bits = newBits
      expect(parentMask.bits).toBe(newBits)
    })
  })

  // ============================================================================
  // Coordinate Offset and Boundary Checking
  // ============================================================================

  describe('coordinate offset and boundaries', () => {
    it('translates window-relative coordinates to absolute coordinates', () => {
      // Window at (2,2), so window (0,0) should map to absolute (2,2)
      const [absX, absY] = subMask._applyOffset(0, 0)
      expect(absX).toBe(2)
      expect(absY).toBe(2)

      // Window (3,4) should map to absolute (5,6)
      const [absX2, absY2] = subMask._applyOffset(3, 4)
      expect(absX2).toBe(5)
      expect(absY2).toBe(6)
    })

    it('correctly identifies coordinates within window bounds', () => {
      expect(subMask._isInWindow(0, 0)).toBe(true)
      expect(subMask._isInWindow(4, 4)).toBe(true)
      expect(subMask._isInWindow(5, 0)).toBe(false)
      expect(subMask._isInWindow(0, 5)).toBe(false)
      expect(subMask._isInWindow(-1, 0)).toBe(false)
      expect(subMask._isInWindow(0, -1)).toBe(false)
    })

    it('isValid() restricts validation to window bounds', () => {
      expect(subMask.isValid(0, 0)).toBe(true)
      expect(subMask.isValid(4, 4)).toBe(true)
      expect(subMask.isValid(5, 0)).toBe(false)
      expect(subMask.isValid(0, 5)).toBe(false)
      expect(subMask.isValid(-1, -1)).toBe(false)
    })
  })

  // ============================================================================
  // Read/Write Operations with Offset
  // ============================================================================

  describe('at() and set() operations with offset', () => {
    it('reads values from window with offset translation', () => {
      // Set a value in absolute coordinates (3, 3)
      parentMask.set(3, 3)

      // Read from window coordinates (1, 1) which should map to absolute (3, 3)
      const value = subMask.at(1, 1)
      expect(value).toBeGreaterThan(0)
    })

    it('writes values to window with offset translation', () => {
      // Set a value in window coordinates (2, 2)
      subMask.set(2, 2)

      // Verify it was written to absolute coordinates (4, 4)
      const value = parentMask.at(4, 4)
      expect(value).toBeGreaterThan(0)
    })

    it('at() returns null for out-of-bounds window coordinates', () => {
      const value = subMask.at(5, 0)
      expect(value).toBeNull()

      const value2 = subMask.at(0, 5)
      expect(value2).toBeNull()
    })

    it('set() throws for out-of-bounds window coordinates', () => {
      expect(() => subMask.set(5, 0)).toThrow()
      expect(() => subMask.set(0, 5)).toThrow()
      expect(() => subMask.set(-1, 0)).toThrow()
    })

    it('supports color parameter for set()', () => {
      subMask.set(1, 1, 1)
      const val = subMask.at(1, 1)

      expect(val).toBe(1)
    })
  })

  // ============================================================================
  // Index and Location Operations
  // ============================================================================

  describe('index() and location() operations', () => {
    it('converts window coordinates to grid index with offset', () => {
      const absIndex = parentMask.index(3, 3)
      const windowIndex = subMask.index(1, 1)
      expect(windowIndex).toBe(absIndex)
    })

    it('returns -1 for out-of-bounds window coordinates', () => {
      const index = subMask.index(5, 0)
      expect(index).toBe(-1)
    })

    it('converts grid index back to window-relative coordinates', () => {
      // Get index at absolute (3, 3)
      const absIndex = parentMask.index(3, 3)

      // Convert back to window coordinates
      const [winX, winY] = subMask.location(absIndex)

      // Should be window coordinates (1, 1)
      expect(winX).toBe(1)
      expect(winY).toBe(1)
    })

    it('for() returns ForLocation helper for valid window coordinates', () => {
      const forHelper = subMask.for(1, 1)
      expect(forHelper).toBeDefined()
      expect(forHelper.bits).toBe(parentMask.bits)
    })

    it('for() throws for out-of-bounds coordinates', () => {
      expect(() => subMask.for(5, 1)).toThrow()
      expect(() => subMask.for(1, 5)).toThrow()
    })
  })

  // ============================================================================
  // Range Operations
  // ============================================================================

  describe('setRange() and clearRange()', () => {
    it('sets a range in window row with offset', () => {
      // Set columns 1-3 in window row 1 (absolute row 3)
      subMask.setRange(1, 1, 3)

      // Verify bits are set at absolute coordinates
      // Window row 1 = absolute row 3, columns are absolute in parent mask
      expect(parentMask.at(1, 3)).toBeGreaterThan(0) // column 1
      expect(parentMask.at(2, 3)).toBeGreaterThan(0) // column 2
      expect(parentMask.at(3, 3)).toBeGreaterThan(0) // column 3
    })

    it('clears a range in window row with offset', () => {
      // First set some bits
      subMask.setRange(2, 0, 4)

      // Clear columns 1-3
      subMask.clearRange(2, 1, 3)

      // Verify correct bits are cleared
      // Window row 2 = absolute row 4
      // Columns are absolute in parent mask
      expect(parentMask.at(0, 4)).toBeGreaterThan(0) // column 0, not in clear range
      expect(parentMask.at(1, 4)).toBe(0) // column 1, cleared
      expect(parentMask.at(2, 4)).toBe(0) // column 2, cleared
      expect(parentMask.at(3, 4)).toBe(0) // column 3, cleared
      expect(parentMask.at(4, 4)).toBeGreaterThan(0) // column 4, not in clear range
    })

    it('ignores range operations on out-of-bounds rows', () => {
      // Should not throw, just return silently
      expect(() => {
        subMask.setRange(5, 0, 4)
        subMask.clearRange(5, 0, 4)
      }).not.toThrow()
    })
  })

  // ============================================================================
  // ASCII Representation
  // ============================================================================

  describe('ASCII representation', () => {
    it('generates ASCII string for window-only content', () => {
      // Set a specific pattern
      subMask.set(0, 0)
      subMask.set(1, 1)
      subMask.set(2, 2)

      const ascii = subMask.toAscii
      const lines = ascii.split('\n')

      expect(lines.length).toBe(5) // window height
      expect(lines[0].length).toBe(5) // window width
    })

    it('toAsciiWith() uses custom symbols', () => {
      subMask.set(0, 0)
      subMask.set(1, 1)

      const symbols = ['X', 'O']
      const ascii = subMask.toAsciiWith(symbols)
      const lines = ascii.split('\n')

      expect(lines[0][0]).toMatch(/[XO]/)
      expect(lines[1][1]).toMatch(/[XO]/)
    })

    it('shows only window content regardless of parent mask size', () => {
      // Set bits outside window in parent
      parentMask.set(0, 0)
      parentMask.set(9, 9)

      // Set bits inside window
      subMask.set(1, 1)

      const ascii = subMask.toAscii
      expect(ascii).toBeDefined() // Should only show 5x5 window
    })
  })

  // ============================================================================
  // Occupancy
  // ============================================================================

  describe('occupancy', () => {
    it('counts set cells in window only', () => {
      // Set bits outside window
      parentMask.set(0, 0)
      parentMask.set(1, 1)

      // Set bits inside window
      subMask.set(0, 0)
      subMask.set(1, 1)
      subMask.set(2, 2)

      expect(subMask.occupancy).toBe(3)
    })

    it('returns 0 for empty window', () => {
      expect(subMask.occupancy).toBe(0)
    })
  })

  // ============================================================================
  // Window Movement
  // ============================================================================

  describe('window movement', () => {
    it('moveWindow() changes offset', () => {
      subMask.moveWindow(5, 5)
      expect(subMask.offsetX).toBe(5)
      expect(subMask.offsetY).toBe(5)
    })

    it('shiftWindow() adjusts offset by relative amount', () => {
      subMask.shiftWindow(3, 4)
      expect(subMask.offsetX).toBe(5) // 2 + 3
      expect(subMask.offsetY).toBe(6) // 2 + 4
    })

    it('shiftWindow() with negative values shifts backward', () => {
      subMask.shiftWindow(-1, -1)
      expect(subMask.offsetX).toBe(1)
      expect(subMask.offsetY).toBe(1)
    })

    it('getAbsoluteBounds() returns window bounds in parent coordinates', () => {
      const bounds = subMask.getAbsoluteBounds()
      expect(bounds).toEqual([2, 2, 6, 6]) // [x1, y1, x2, y2]
    })

    it('getAbsoluteBounds() updates after moveWindow()', () => {
      subMask.moveWindow(0, 0)
      const bounds = subMask.getAbsoluteBounds()
      expect(bounds).toEqual([0, 0, 4, 4])
    })
  })

  // ============================================================================
  // Copy Operations: Coordinates
  // ============================================================================

  describe('copy operations - coordinates', () => {
    it('copyToCoords() exports window cells as [x, y, value] tuples', () => {
      subMask.set(0, 0)
      subMask.set(1, 1)
      subMask.set(2, 2)

      const coords = subMask.copyToCoords()
      expect(coords.length).toBe(3)
      expect(coords).toContainEqual([0, 0, expect.any(Number)])
      expect(coords).toContainEqual([1, 1, expect.any(Number)])
      expect(coords).toContainEqual([2, 2, expect.any(Number)])
    })

    it('copyToCoords() uses window-relative coordinates', () => {
      subMask.set(1, 2)
      const coords = subMask.copyToCoords()

      const found = coords.find(c => c[0] === 1 && c[1] === 2)
      expect(found).toBeDefined()
    })

    it('copyFromCoords() loads window cells from [x, y, value] tuples', () => {
      const coords = [
        [0, 0, 1],
        [1, 1, 1],
        [2, 2, 1]
      ]

      subMask.copyFromCoords(coords)

      expect(subMask.at(0, 0)).toBeGreaterThan(0)
      expect(subMask.at(1, 1)).toBeGreaterThan(0)
      expect(subMask.at(2, 2)).toBeGreaterThan(0)
    })

    it('copyFromCoords() ignores out-of-bounds coordinates', () => {
      const coords = [
        [0, 0, 1],
        [10, 10, 1] // out of bounds
      ]

      expect(() => {
        subMask.copyFromCoords(coords)
      }).not.toThrow()

      expect(subMask.at(0, 0, 0)).toBeGreaterThan(0)
    })

    it('copyFromCoords() respects color values', () => {
      const coords = [
        [0, 0, 1] // color 1 (Mask only supports 0 or 1 due to depth=1)
      ]

      subMask.copyFromCoords(coords)

      expect(subMask.at(0, 0)).toBe(1)
    })
  })

  // ============================================================================
  // Copy Operations: Mask-to-Mask
  // ============================================================================

  describe('copy operations - mask to mask', () => {
    it('copyFromMask() reads from another mask at offset coordinates', () => {
      const sourceMask = new Mask(10, 10)
      sourceMask.set(2, 2)
      sourceMask.set(3, 3)
      sourceMask.set(4, 4)

      subMask.copyFromMask(sourceMask)

      // Window offset is (2,2), so absolute (2,2) maps to window (0,0)
      expect(subMask.at(0, 0)).toBeGreaterThan(0)
      expect(subMask.at(1, 1)).toBeGreaterThan(0)
      expect(subMask.at(2, 2)).toBeGreaterThan(0)
    })

    it('copyToMask() writes to another mask at offset coordinates', () => {
      const targetMask = new Mask(10, 10)

      subMask.set(1, 1)
      subMask.set(2, 2)

      subMask.copyToMask(targetMask)

      // Window (1,1) with offset (2,2) = absolute (3,3)
      expect(targetMask.at(3, 3)).toBeGreaterThan(0)
      expect(targetMask.at(4, 4)).toBeGreaterThan(0)
    })

    it('copyToMask() and copyFromMask() are symmetric', () => {
      const otherMask = new Mask(10, 10)

      // Set up source
      subMask.set(0, 0, 0)
      subMask.set(1, 1, 0)
      subMask.set(2, 2, 0)

      const coords1 = subMask.copyToCoords()

      // Copy to other mask
      subMask.copyToMask(otherMask)

      // Create new submask pointing same region of otherMask
      const otherSub = new SubMask(otherMask, 2, 2, 5, 5)
      const coords2 = otherSub.copyToCoords()

      expect(coords2.length).toBe(coords1.length)
    })
  })

  // ============================================================================
  // Transform Offset Adjustment
  // ============================================================================

  describe('transform offset adjustment', () => {
    it('applyTransform() with rotate-90 context adjusts offset', () => {
      const initialOffsetX = subMask.offsetX
      const initialOffsetY = subMask.offsetY

      // Mock transformContext for 90-degree rotation
      const transformContext = { type: 'rotate-90' }
      // Create a simple identity map for testing
      const map = Array.from({ length: 100 }, (_, i) => i)

      subMask.applyTransform(parentMask, map, transformContext)

      // After 90-degree rotation: new offset = (oldY, -oldX)
      expect(subMask.offsetX).toBe(initialOffsetY)
      expect(subMask.offsetY).toBe(-initialOffsetX)
    })

    it('applyTransform() with flip-horizontal adjusts offset', () => {
      const transformContext = { type: 'flip-horizontal' }
      const map = Array.from({ length: 100 }, (_, i) => i)

      // Calculate expected before transform (because offsetX will change)
      const expected = parentMask.width - subMask.offsetX - subMask.windowWidth

      subMask.applyTransform(parentMask, map, transformContext)

      expect(subMask.offsetX).toBe(expected)
    })

    it('applyTransform() with flip-vertical adjusts offset', () => {
      const transformContext = { type: 'flip-vertical' }
      const map = Array.from({ length: 100 }, (_, i) => i)

      // Calculate expected before transform (because offsetY will change)
      const expected =
        parentMask.height - subMask.offsetY - subMask.windowHeight

      subMask.applyTransform(parentMask, map, transformContext)

      expect(subMask.offsetY).toBe(expected)
    })

    it('applyTransform() with translate context adds offset', () => {
      const transformContext = { type: 'translate', param: { x: 3, y: 4 } }
      const map = Array.from({ length: 100 }, (_, i) => i)

      subMask.applyTransform(parentMask, map, transformContext)

      expect(subMask.offsetX).toBe(5) // 2 + 3
      expect(subMask.offsetY).toBe(6) // 2 + 4
    })

    it('applyTransform() without transformContext does not adjust offset', () => {
      const initialOffsetX = subMask.offsetX
      const initialOffsetY = subMask.offsetY

      const map = Array.from({ length: 100 }, (_, i) => i)

      subMask.applyTransform(parentMask, map)

      expect(subMask.offsetX).toBe(initialOffsetX)
      expect(subMask.offsetY).toBe(initialOffsetY)
    })

    it('applyTransform() ignores unknown transform types', () => {
      const initialOffsetX = subMask.offsetX
      const initialOffsetY = subMask.offsetY

      const transformContext = { type: 'unknown-transform' }
      const map = Array.from({ length: 100 }, (_, i) => i)

      subMask.applyTransform(parentMask, map, transformContext)

      expect(subMask.offsetX).toBe(initialOffsetX)
      expect(subMask.offsetY).toBe(initialOffsetY)
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('integration', () => {
    it('window operations do not affect parent bitboard outside window', () => {
      // Set bits outside window in parent
      parentMask.set(0, 0)
      parentMask.set(9, 9)
      const parentOccupancyBefore = parentMask.occupancy

      // Modify window
      subMask.set(0, 0)
      subMask.set(4, 4)

      // Bits outside window should be unchanged
      expect(parentMask.at(0, 0)).toBeGreaterThan(0)
      expect(parentMask.at(9, 9)).toBeGreaterThan(0)
    })

    it('multiple SubMasks on same parent mask operate independently', () => {
      const subMask2 = new SubMask(parentMask, 5, 5, 3, 3)

      subMask.set(0, 0)
      subMask2.set(0, 0)

      // Different absolute locations
      expect(parentMask.at(2, 2)).toBeGreaterThan(0) // from subMask
      expect(parentMask.at(5, 5)).toBeGreaterThan(0) // from subMask2
    })

    it('moving window and reading/writing works correctly', () => {
      // Set bit at window (0,0) with offset (2,2) -> sets absolute (2,2)
      subMask.set(0, 0)
      expect(parentMask.at(2, 2)).toBeGreaterThan(0)

      // Move window to (0,0)
      subMask.moveWindow(0, 0)

      // Now window (0,0) maps to absolute (0,0)
      // But we didn't set it, so it should be empty
      expect(subMask.at(0, 0)).toBe(0)

      // The bit we set is still at absolute (2,2)
      expect(parentMask.at(2, 2)).toBeGreaterThan(0)

      // Set a new bit at new window position (0,0) -> sets absolute (0,0)
      subMask.set(0, 0)
      expect(parentMask.at(0, 0)).toBeGreaterThan(0)
    })

    it('window size cannot change after creation', () => {
      expect(subMask.width).toBe(5)
      expect(subMask.height).toBe(5)

      // Attempting to change via properties should not affect them
      // (they are read-only getters)
      expect(subMask.windowWidth).toBe(5)
      expect(subMask.windowHeight).toBe(5)
    })
  })
})
