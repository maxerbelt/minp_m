/* eslint-env jest */

/* global jest, describe, it, expect, beforeEach */

import { PlacedShips } from './PlacedShips.js'
import { jest } from '@jest/globals'

describe('PlacedShips', () => {
  let placedShips
  let mockShip1
  let mockShip2
  let mockShip3
  let mockUndoBtn
  let mockResetBtn

  beforeEach(() => {
    placedShips = new PlacedShips()

    // Create mock ships with required methods
    mockShip1 = {
      id: 'ship-1',
      placeAtCells: jest.fn().mockReturnValue({ placed: true }),
      removeFromPlacement: jest.fn(),
      addToGrid: jest.fn()
    }

    mockShip2 = {
      id: 'ship-2',
      placeAtCells: jest.fn().mockReturnValue({ placed: true }),
      removeFromPlacement: jest.fn(),
      addToGrid: jest.fn()
    }

    mockShip3 = {
      id: 'ship-3',
      placeAtCells: jest.fn().mockReturnValue({ placed: true }),
      removeFromPlacement: jest.fn(),
      addToGrid: jest.fn()
    }

    // Create mock buttons
    mockUndoBtn = { disabled: false }
    mockResetBtn = { disabled: false }
  })

  describe('constructor', () => {
    it('should initialize with empty ships array', () => {
      expect(placedShips.ships).toEqual([])
    })

    it('should initialize with null undoBtn', () => {
      expect(placedShips.undoBtn).toBeNull()
    })

    it('should initialize with null resetBtn', () => {
      expect(placedShips.resetBtn).toBeNull()
    })
  })

  describe('reset', () => {
    it('should clear the ships array', () => {
      placedShips.ships = [mockShip1, mockShip2, mockShip3]
      placedShips.reset()
      expect(placedShips.ships).toEqual([])
    })

    it('should work on empty array', () => {
      placedShips.reset()
      expect(placedShips.ships).toEqual([])
    })

    it('should not affect button references', () => {
      placedShips.registerUndo(mockUndoBtn, mockResetBtn)
      placedShips.ships = [mockShip1]
      placedShips.reset()
      expect(placedShips.undoBtn).toBe(mockUndoBtn)
      expect(placedShips.resetBtn).toBe(mockResetBtn)
    })
  })

  describe('registerUndo', () => {
    it('should store undo button reference', () => {
      placedShips.registerUndo(mockUndoBtn, mockResetBtn)
      expect(placedShips.undoBtn).toBe(mockUndoBtn)
    })

    it('should store reset button reference', () => {
      placedShips.registerUndo(mockUndoBtn, mockResetBtn)
      expect(placedShips.resetBtn).toBe(mockResetBtn)
    })

    it('should update button references', () => {
      const btn1 = { disabled: false }
      const btn2 = { disabled: false }
      placedShips.registerUndo(btn1, btn2)
      expect(placedShips.undoBtn).toBe(btn1)

      const btn3 = { disabled: true }
      const btn4 = { disabled: true }
      placedShips.registerUndo(btn3, btn4)
      expect(placedShips.undoBtn).toBe(btn3)
      expect(placedShips.resetBtn).toBe(btn4)
    })
  })

  describe('updateUndo', () => {
    it('should disable buttons when ships array is empty', () => {
      placedShips.registerUndo(mockUndoBtn, mockResetBtn)
      mockUndoBtn.disabled = false
      mockResetBtn.disabled = false

      placedShips.updateUndo()
      expect(mockUndoBtn.disabled).toBe(true)
      expect(mockResetBtn.disabled).toBe(true)
    })

    it('should enable buttons when ships exist', () => {
      placedShips.registerUndo(mockUndoBtn, mockResetBtn)
      placedShips.ships = [mockShip1]
      mockUndoBtn.disabled = true
      mockResetBtn.disabled = true

      placedShips.updateUndo()
      expect(mockUndoBtn.disabled).toBe(false)
      expect(mockResetBtn.disabled).toBe(false)
    })

    it('should work with only undo button', () => {
      placedShips.registerUndo(mockUndoBtn, null)
      placedShips.updateUndo()
      expect(mockUndoBtn.disabled).toBe(true)
    })

    it('should work with only reset button', () => {
      placedShips.registerUndo(null, mockResetBtn)
      placedShips.updateUndo()
      expect(mockResetBtn.disabled).toBe(true)
    })

    it('should work with no buttons', () => {
      placedShips.registerUndo(null, null)
      // Should not throw
      placedShips.updateUndo()
      expect(placedShips.undoBtn).toBeNull()
      expect(placedShips.resetBtn).toBeNull()
    })
  })

  describe('push', () => {
    beforeEach(() => {
      placedShips.registerUndo(mockUndoBtn, mockResetBtn)
    })

    it('should add ship to ships array', () => {
      placedShips.push(mockShip1, { row: 0, col: 0 })
      expect(placedShips.ships).toContain(mockShip1)
      expect(placedShips.ships.length).toBe(1)
    })

    it('should call ship.place with placement', () => {
      const placement = { row: 5, col: 5 }
      placedShips.push(mockShip1, placement)
      expect(mockShip1.placeAtCells).toHaveBeenCalledWith(placement)
    })

    it('should return result of ship.place', () => {
      const expected = { placed: true, id: 'test' }
      mockShip1.placeAtCells.mockReturnValue(expected)
      const result = placedShips.push(mockShip1, {})
      expect(result).toEqual(expected)
    })

    it('should update button states after push', () => {
      mockUndoBtn.disabled = true
      mockResetBtn.disabled = true
      placedShips.push(mockShip1, {})
      expect(mockUndoBtn.disabled).toBe(false)
      expect(mockResetBtn.disabled).toBe(false)
    })

    it('should handle multiple ships', () => {
      placedShips.push(mockShip1, {})
      placedShips.push(mockShip2, {})
      placedShips.push(mockShip3, {})
      expect(placedShips.ships.length).toBe(3)
      expect(placedShips.ships).toEqual([mockShip1, mockShip2, mockShip3])
    })
  })

  describe('pop', () => {
    beforeEach(() => {
      placedShips.registerUndo(mockUndoBtn, mockResetBtn)
      placedShips.ships = [mockShip1, mockShip2, mockShip3]
    })

    it('should remove and return last ship', () => {
      const result = placedShips.pop()
      expect(result).toBe(mockShip3)
      expect(placedShips.ships.length).toBe(2)
    })

    it('should call removeFromPlacement on the removed ship', () => {
      placedShips.pop()
      expect(mockShip3.removeFromPlacement).toHaveBeenCalled()
    })

    it('should pop from the end in order', () => {
      expect(placedShips.pop()).toBe(mockShip3)
      expect(placedShips.pop()).toBe(mockShip2)
      expect(placedShips.pop()).toBe(mockShip1)
      expect(placedShips.ships.length).toBe(0)
    })

    it('should throw when popping from empty array', () => {
      placedShips.ships = []
      expect(() => placedShips.pop()).toThrow()
    })
  })

  describe('popAndRefresh', () => {
    let mockShipCellGrid
    let mockMark
    let mockReturnShip

    beforeEach(() => {
      placedShips.registerUndo(mockUndoBtn, mockResetBtn)
      placedShips.ships = [mockShip1, mockShip2, mockShip3]

      mockShipCellGrid = { grid: 'data' }
      mockMark = jest.fn()
      mockReturnShip = jest.fn()
    })

    it('should remove last ship and return it', () => {
      const result = placedShips.popAndRefresh(
        mockShipCellGrid,
        mockMark,
        mockReturnShip
      )
      expect(result).toBe(mockShip3)
      expect(placedShips.ships.length).toBe(2)
    })

    it('should call removeFromPlacement on removed ship', () => {
      placedShips.popAndRefresh(mockShipCellGrid, mockMark, mockReturnShip)
      expect(mockShip3.removeFromPlacement).toHaveBeenCalled()
    })

    it('should call returnShip with removed ship', () => {
      placedShips.popAndRefresh(mockShipCellGrid, mockMark, mockReturnShip)
      expect(mockReturnShip).toHaveBeenCalledWith(mockShip3)
    })

    it('should add remaining ships to grid', () => {
      placedShips.popAndRefresh(mockShipCellGrid, mockMark, mockReturnShip)
      expect(mockShip1.addToGrid).toHaveBeenCalledWith(mockShipCellGrid)
      expect(mockShip2.addToGrid).toHaveBeenCalledWith(mockShipCellGrid)
      // mockShip3 was removed, so should not be added
      expect(mockShip3.addToGrid).not.toHaveBeenCalled()
    })

    it('should mark remaining ships', () => {
      placedShips.popAndRefresh(mockShipCellGrid, mockMark, mockReturnShip)
      expect(mockMark).toHaveBeenCalledWith(mockShip1)
      expect(mockMark).toHaveBeenCalledWith(mockShip2)
      expect(mockMark).not.toHaveBeenCalledWith(mockShip3)
    })

    it('should update undo buttons', () => {
      mockUndoBtn.disabled = false
      mockResetBtn.disabled = false
      placedShips.popAndRefresh(mockShipCellGrid, mockMark, mockReturnShip)
      expect(mockUndoBtn.disabled).toBe(false) // Still ships left
    })

    it('should disable buttons when all ships removed', () => {
      placedShips.ships = [mockShip1]
      mockUndoBtn.disabled = false
      mockResetBtn.disabled = false

      placedShips.popAndRefresh(mockShipCellGrid, mockMark, mockReturnShip)
      expect(mockUndoBtn.disabled).toBe(true)
      expect(mockResetBtn.disabled).toBe(true)
    })
  })

  describe('popAll', () => {
    let mockReturnShip

    beforeEach(() => {
      placedShips.registerUndo(mockUndoBtn, mockResetBtn)
      placedShips.ships = [mockShip1, mockShip2, mockShip3]
      mockReturnShip = jest.fn()
    })

    it('should call returnShip for all ships', () => {
      placedShips.popAll(mockReturnShip)
      expect(mockReturnShip).toHaveBeenCalledWith(mockShip1)
      expect(mockReturnShip).toHaveBeenCalledWith(mockShip2)
      expect(mockReturnShip).toHaveBeenCalledWith(mockShip3)
      expect(mockReturnShip).toHaveBeenCalledTimes(3)
    })

    it('should clear the ships array', () => {
      placedShips.popAll(mockReturnShip)
      expect(placedShips.ships).toEqual([])
    })

    it('should disable undo buttons', () => {
      mockUndoBtn.disabled = false
      mockResetBtn.disabled = false
      placedShips.popAll(mockReturnShip)
      expect(mockUndoBtn.disabled).toBe(true)
      expect(mockResetBtn.disabled).toBe(true)
    })

    it('should work with empty array', () => {
      placedShips.ships = []
      placedShips.popAll(mockReturnShip)
      expect(mockReturnShip).not.toHaveBeenCalled()
      expect(placedShips.ships).toEqual([])
    })

    it('should not call removeFromPlacement', () => {
      placedShips.popAll(mockReturnShip)
      expect(mockShip1.removeFromPlacement).not.toHaveBeenCalled()
      expect(mockShip2.removeFromPlacement).not.toHaveBeenCalled()
      expect(mockShip3.removeFromPlacement).not.toHaveBeenCalled()
    })
  })

  describe('numPlaced', () => {
    it('should return 0 when no ships placed', () => {
      expect(placedShips.numPlaced()).toBe(0)
    })

    it('should return correct count of placed ships', () => {
      placedShips.ships = [mockShip1, mockShip2, mockShip3]
      expect(placedShips.numPlaced()).toBe(3)
    })

    it('should update as ships are added', () => {
      placedShips.ships = [mockShip1]
      expect(placedShips.numPlaced()).toBe(1)
      placedShips.ships.push(mockShip2)
      expect(placedShips.numPlaced()).toBe(2)
    })
  })

  describe('getAll', () => {
    it('should return copy of ships array', () => {
      placedShips.ships = [mockShip1, mockShip2]
      const result = placedShips.getAll()
      expect(result).toEqual([mockShip1, mockShip2])
    })

    it('should return independent copy', () => {
      placedShips.ships = [mockShip1, mockShip2]
      const result = placedShips.getAll()
      result.push(mockShip3)
      expect(placedShips.ships.length).toBe(2)
      expect(result.length).toBe(3)
    })

    it('should return empty array when no ships', () => {
      const result = placedShips.getAll()
      expect(result).toEqual([])
    })

    it('should not be affected by internal changes', () => {
      placedShips.ships = [mockShip1]
      const result = placedShips.getAll()
      placedShips.ships.push(mockShip2)
      expect(result).toEqual([mockShip1])
    })
  })

  describe('integration scenarios', () => {
    beforeEach(() => {
      placedShips.registerUndo(mockUndoBtn, mockResetBtn)
    })

    it('should handle full placement and removal workflow', () => {
      // Place ships
      placedShips.push(mockShip1, {})
      placedShips.push(mockShip2, {})
      expect(placedShips.numPlaced()).toBe(2)
      expect(mockUndoBtn.disabled).toBe(false)

      // Remove one
      const removed = placedShips.pop()
      expect(removed).toBe(mockShip2)
      expect(placedShips.numPlaced()).toBe(1)

      // Place another
      placedShips.push(mockShip3, {})
      expect(placedShips.numPlaced()).toBe(2)

      // Remove all
      placedShips.popAll(() => {})
      expect(placedShips.numPlaced()).toBe(0)
      expect(mockUndoBtn.disabled).toBe(true)
    })

    it('should maintain ship order through operations', () => {
      placedShips.push(mockShip1, {})
      placedShips.push(mockShip2, {})
      placedShips.push(mockShip3, {})

      const all = placedShips.getAll()
      expect(all[0]).toBe(mockShip1)
      expect(all[1]).toBe(mockShip2)
      expect(all[2]).toBe(mockShip3)
    })

    it('should sync button state through multiple operations', () => {
      // Initialize button states properly
      placedShips.updateUndo()
      expect(mockUndoBtn.disabled).toBe(true)

      placedShips.push(mockShip1, {})
      expect(mockUndoBtn.disabled).toBe(false)

      placedShips.push(mockShip2, {})
      expect(mockUndoBtn.disabled).toBe(false)

      // Note: pop() doesn't call updateUndo(), so button state won't change
      // after pop(). This would need to be called separately.
      placedShips.pop()
      placedShips.updateUndo() // Manual update
      expect(mockUndoBtn.disabled).toBe(false)

      placedShips.pop()
      placedShips.updateUndo() // Manual update
      expect(mockUndoBtn.disabled).toBe(true)
    })
  })
})
