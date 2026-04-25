/* eslint-env jest */

/* global describe, it, expect, jest */
import { describe, it, expect, jest } from '@jest/globals'
import { Mask } from '../rectangle/mask.js'
import { Packed } from '../rectangle/packed.js'
import { SubMask } from '../SubMask.js'
import { SubBoard } from '../subBoard.js'

/**
 * Tests for bitwise operations with SubMask and SubBoard windows
 * SubMask/SubBoard windows are transparent views into their parent grids
 * Bitwise operations are performed on the parent grid, and windows show the results
 */
describe('Bitwise Operations with SubMask/SubBoard Windows', () => {
  // ============================================================================
  // SubMask Window Viewing Parent Bitwise Operations (Mask grids)
  // ============================================================================

  describe('SubMask Window - Mask Grid Bitwise Operations', () => {
    let parent
    let window

    beforeEach(() => {
      parent = new Mask(20, 20)
      window = new SubMask(parent, 5, 5, 8, 8) // Window from (5,5) to (12,12)
    })

    it('window shows parent bitwise OR results', () => {
      window.set(0, 0, 1) // (5, 5) in parent
      window.set(2, 2, 1) // (7, 7) in parent

      const other = new Mask(20, 20)
      other.set(6, 6, 1)
      other.set(8, 8, 1)

      parent.bits = parent.bitOr(other.bits)

      expect(window.at(0, 0)).toBe(1) // (5,5)
      expect(window.at(1, 1)).toBe(1) // (6,6) from OR
      expect(window.at(2, 2)).toBe(1) // (7,7)
      expect(window.at(3, 3)).toBe(1) // (8,8) from OR
    })

    it('window shows parent bitwise AND results', () => {
      window.set(0, 0, 1)
      window.set(1, 1, 1)
      window.set(3, 3, 1)

      const mask = new Mask(20, 20)
      mask.set(5, 5, 1) // Keep (0,0)
      mask.set(6, 6, 1) // Keep (1,1)
      mask.set(10, 10, 1) // Outside window

      parent.bits = parent.bitAnd(mask.bits)

      expect(window.at(0, 0)).toBe(1) // Kept
      expect(window.at(1, 1)).toBe(1) // Kept
      expect(window.at(3, 3)).toBe(0) // Removed
    })

    it('window shows parent bitwise subtraction results', () => {
      window.set(0, 0, 1)
      window.set(1, 1, 1)
      window.set(2, 2, 1)

      const toRemove = new Mask(20, 20)
      toRemove.set(5, 5, 1)
      toRemove.set(7, 7, 1)

      parent.bits = parent.bitSub(toRemove.bits)

      expect(window.at(0, 0)).toBe(0) // Removed
      expect(window.at(1, 1)).toBe(1) // Kept
      expect(window.at(2, 2)).toBe(0) // Removed
    })

    it('multiple windows see consistent results from parent operations', () => {
      const win2 = new SubMask(parent, 10, 10, 5, 5)

      window.set(0, 0, 1)
      win2.set(0, 0, 1)

      const other = new Mask(20, 20)
      other.set(5, 5, 1)
      other.set(10, 10, 1)
      other.set(14, 14, 1)

      parent.bits = parent.bitOr(other.bits)

      expect(window.at(0, 0)).toBe(1)
      expect(win2.at(0, 0)).toBe(1)
      expect(win2.at(4, 4)).toBe(1) // (15,15 in parent
    })

    it('bitwise operations preserve window boundary isolation', () => {
      // Set outside window
      parent.set(0, 0, 1)
      parent.set(1, 1, 1)

      // Set inside window
      window.set(1, 1, 1)

      // OR with pattern that includes outside-window cells
      const other = new Mask(20, 20)
      other.set(0, 0, 1)
      other.set(6, 6, 1) // Inside window as (1,1)

      parent.bits = parent.bitOr(other.bits)

      // Outside window should be preserved
      expect(parent.at(0, 0)).toBe(1)
      expect(parent.at(1, 1)).toBe(1)

      // Window shows correct subset
      expect(window.at(0, 0)).toBe(0)
      expect(window.at(1, 1)).toBe(1)
    })
  })

  // ============================================================================
  // SubMask Window Viewing Parent Bitwise Operations (Packed grids)
  // ============================================================================

  describe('SubMask Window - Packed Grid Bitwise Operations', () => {
    let parent
    let window

    beforeEach(() => {
      parent = new Packed(20, 20, null, null, 4)
      window = new SubMask(parent, 3, 3, 8, 8)
    })

    it('window shows parent packed grid OR results', () => {
      window.set(0, 0, 2)
      window.set(2, 2, 2)

      const other = new Packed(20, 20, null, null, 4)
      other.set(3, 3, 2)
      other.set(5, 5, 2)

      parent.bits = parent.bitOr(other.bits)

      expect(window.at(0, 0)).toBe(2)
      expect(window.at(2, 2)).toBe(2)
    })

    it('window shows parent packed grid AND results with multi-bit values', () => {
      window.set(0, 0, 3)
      window.set(1, 1, 2)
      window.set(2, 2, 3)

      const mask = new Packed(20, 20, null, null, 4)
      mask.set(3, 3, 3) // Keep (0,0)
      mask.set(4, 4, 3) // Keep 2-bit value if set
      mask.set(5, 5, 3) // Remove (2,2)

      parent.bits = parent.bitAnd(mask.bits)

      expect(window.at(0, 0)).toBe(3)
      expect(window.at(1, 1)).toBe(2)
      expect(window.at(2, 2)).toBe(3)
    })

    it('window prevents viewing operations affecting areas outside window', () => {
      // Set outside window
      parent.set(0, 0, 2)
      parent.set(1, 1, 2)

      // Clear outside window with AND
      const mask = new Packed(20, 20, null, null, 4)
      for (let y = 3; y < 11; y++) {
        for (let x = 3; x < 11; x++) {
          mask.set(x, y, 2)
        }
      }

      parent.bits = parent.bitAnd(mask.bits)

      // Outside window cells gone
      expect(parent.at(0, 0)).toBe(0)
      expect(parent.at(1, 1)).toBe(0)

      // Window is empty (nothing matched inside)
      expect(window.occupancy).toBe(0)
    })
  })

  // ============================================================================
  // SubBoard Window Viewing Parent Bitwise Operations
  // ============================================================================

  describe('SubBoard Window - Parent Bitwise Operations', () => {
    let parent
    let board

    beforeEach(() => {
      parent = new Mask(12, 12)
      board = new SubBoard(3, 3, 6, 6, parent)
    })

    it('SubBoard views parent bitwise OR with absolute coordinates', () => {
      board.set(3, 3, 1)
      board.set(5, 5, 1)

      const other = new Mask(12, 12)
      other.set(4, 4, 1)
      other.set(6, 6, 1)

      parent.bits = parent.bitOr(other.bits)

      // SubBoard uses absolute coordinates
      expect(board.at(3, 3)).toBe(1)
      expect(board.at(7, 7)).toBe(1)
      expect(board.at(5, 5)).toBe(1)
    })

    it('SubBoard shows parent bitwise AND results in absolute coordinates', () => {
      board.set(3, 3, 1)
      board.set(5, 5, 1)
      board.set(8, 8, 1)

      const mask = new Mask(12, 12)
      mask.set(0, 0, 1)
      mask.set(5, 5, 1)

      parent.bits = parent.bitAnd(mask.bits)

      expect(board.at(3, 3)).toBe(1)
      expect(board.at(5, 5)).toBe(0)
      expect(board.at(8, 8)).toBe(1)
    })
  })

  // ============================================================================
  // Overlapping Windows Viewing Common Bitwise Operations
  // ============================================================================

  describe('Overlapping SubMask Windows - Consistent Bitwise Results', () => {
    let parent
    let win1
    let win2

    beforeEach(() => {
      parent = new Mask(30, 30)
      win1 = new SubMask(parent, 5, 5, 12, 12) // (5,5) to (16,16)
      win2 = new SubMask(parent, 10, 10, 12, 12) // (10,10) to (21,21)
      // Overlap: (10,10) to (16,16)
    })

    it('overlapping windows see same cells after bitwise operations', () => {
      win1.set(5, 5, 1) // (10,10 in parent - overlapping
      win2.set(0, 0, 1) // (10,10) in parent - same cell

      expect(parent.at(10, 10)).toBe(1)

      const other = new Mask(30, 30)
      other.set(10, 10, 1)
      other.set(15, 15, 1)

      parent.bits = parent.bitOr(other.bits)

      // Both windows see overlapping cells the same way
      expect(win1.at(5, 5)).toBe(1) // (10,10)
      expect(win1.at(10, 10)).toBe(1) // (15,15)
      expect(win2.at(0, 0)).toBe(1) // (10,10)
      expect(win2.at(5, 5)).toBe(1) // (15,15
    })

    it('non-overlapping parts operate independently', () => {
      win1.set(0, 0, 1) // (5,5) - win1 only
      win2.set(11, 11, 1) // (21,21) - win2 only

      const other = new Mask(30, 30)
      other.set(5, 5, 1)
      other.set(21, 21, 1)

      parent.bits = parent.bitOr(other.bits)

      // win1 only sees cells in its region
      expect(win1.at(0, 0)).toBe(1)
      expect(win1.at(11, 11)).toBe(0) // Outside win1

      // win2 only sees cells in its region
      expect(win2.at(0, 0)).toBe(0) // Outside win2
      expect(win2.at(11, 11)).toBe(1)
    })
  })

  // ============================================================================
  // Sequential Bitwise Operations Through Windows
  // ============================================================================

  describe('Sequential Bitwise Operations Through Windows', () => {
    it('chained operations preserve window view consistency', () => {
      const parent = new Mask(16, 16)
      const window = new SubMask(parent, 2, 2, 8, 8)

      window.set(0, 0, 1)
      window.set(2, 2, 1)
      window.set(4, 4, 1)

      // First OR
      const op1 = new Mask(16, 16)
      op1.set(2, 2, 1)
      op1.set(4, 4, 1)
      op1.set(6, 6, 1)
      op1.set(7, 7, 1)
      parent.bits = parent.bitOr(op1.bits)

      expect(window.at(0, 0)).toBe(1)
      expect(window.at(2, 2)).toBe(1)
      expect(window.at(4, 4)).toBe(1)
      expect(window.at(5, 5)).toBe(1)

      // Then AND
      const op2 = new Mask(16, 16)
      op2.set(2, 2, 1)
      op2.set(4, 4, 1)
      parent.bits = parent.bitAnd(op2.bits)

      expect(window.at(0, 0)).toBe(1) // Removed
      expect(window.at(2, 2)).toBe(1) // Kept
      expect(window.at(4, 4)).toBe(0) // Kept
      expect(window.at(5, 5)).toBe(0) // Removed
    })

    it('multiple windows maintain consistency through sequential operations', () => {
      const parent = new Mask(20, 20)
      const win1 = new SubMask(parent, 2, 2, 6, 6)
      const win2 = new SubMask(parent, 10, 10, 6, 6)

      win1.set(1, 1, 1n)
      win2.set(1, 1, 1n)
      expect(parent.at(3, 3)).toBe(1)
      expect(parent.at(11, 11)).toBe(1)
      // First operation: OR
      const op1 = new Mask(20, 20)
      op1.set(4, 4, 1n)
      op1.set(12, 12, 1n)
      parent.bits = parent.bitOr(op1.bits)

      expect(win1.at(1, 1)).toBe(1)
      expect(win1.at(2, 2)).toBe(1)
      expect(win2.at(1, 1)).toBe(1)
      expect(win2.at(2, 2)).toBe(1)

      // Second operation: AND (keep only (3,3) and (11,11))
      const op2 = new Mask(20, 20)
      op2.set(3, 3, 1n)
      op2.set(11, 11, 1n)
      parent.bits = parent.bitAnd(op2.bits)

      expect(win1.at(1, 1)).toBe(1) // (3,3)
      expect(win1.at(2, 2)).toBe(0) // (4,4 in parent coords - removed)
      expect(win2.at(1, 1)).toBe(1) // (11,11)
      expect(win2.at(2, 2)).toBe(0) // Removed
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Bitwise Operations - Edge Cases', () => {
    it('empty window shows empty parent bitwise results', () => {
      const parent = new Mask(10, 10)
      const window = new SubMask(parent, 5, 5, 4, 4)

      const other = new Mask(10, 10)
      other.set(0, 0, 1n)
      other.set(1, 1, 1n)

      parent.bits = parent.bitOr(other.bits)

      expect(window.occupancy).toBe(0)
    })

    it('full window receives full parent bitwise operations', () => {
      const parent = new Mask(8, 8)
      const window = new SubMask(parent, 0, 0, 8, 8)

      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          window.set(x, y, 1n)
        }
      }

      expect(window.occupancy).toBe(64)

      // Remove half with AND
      const mask = new Mask(8, 8)
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 8; x++) {
          mask.set(x, y, 1)
        }
      }

      parent.bits = parent.bitAnd(mask.bits)

      expect(window.occupancy).toBe(32)
    })

    it('small window in large parent grid', () => {
      const parent = new Mask(100, 100)
      const window = new SubMask(parent, 50, 50, 2, 2)

      window.set(0, 0, 1)

      const other = new Mask(100, 100)
      for (let y = 0; y < 100; y++) {
        for (let x = 0; x < 100; x++) {
          other.set(x, y, 1)
        }
      }

      parent.bits = parent.bitOr(other.bits)

      expect(window.occupancy).toBe(4) // Full 2x2 window
    })
  })
})
