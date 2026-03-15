/* eslint-env jest */
import { jest } from '@jest/globals'

/* global describe, require, it, expect, beforeEach, jest */

// DraggedShip will be imported after mocks are configured

// Mock the dependencies
jest.unstable_mockModule('./Ghost.js', () => ({
  Ghost: jest.fn().mockImplementation(() => ({
    show: jest.fn(),
    hide: jest.fn(),
    remove: jest.fn(),
    moveTo: jest.fn(),
    setVariant: jest.fn()
  }))
}))
jest.unstable_mockModule('./PlacedShips.js', () => ({
  placedShipsInstance: {
    push: jest.fn().mockReturnValue({ placed: true })
  }
}))

describe('DraggedShip', () => {
  let mockShip
  // let mockSelectedShipVariant
  //  let mockSelectedShipSpecial
  let mockPlaceable
  let mockContentBuilder
  let draggedShip
  let Ghost
  let mockGhostInstance
  let DraggedShip

  beforeEach(async () => {
    // Import mocked modules before running tests
    const ghostModule = await import('./Ghost.js')
    Ghost = ghostModule.Ghost

    // reset mocks then create a single tracked ghost instance
    jest.clearAllMocks()
    mockGhostInstance = {
      show: jest.fn(),
      hide: jest.fn(),
      remove: jest.fn(),
      moveTo: jest.fn(),
      setVariant: jest.fn()
    }
    Ghost.mockReturnValue(mockGhostInstance)

    // Create mock placeable object
    mockPlaceable = {
      canPlace: jest.fn().mockReturnValue(true),
      inAllBounds: jest.fn().mockReturnValue(true)
    }

    // Create mock ship object
    mockShip = {
      id: 'ship-1',
      letter: 'B',
      shape: jest.fn().mockReturnValue({
        type: jest.fn().mockReturnValue('battleship'),
        variants: jest.fn().mockReturnValue({
          index: 0,
          canFlip: true,
          canRotate: true,
          canTransform: true,
          placeable: jest.fn().mockReturnValue(mockPlaceable),
          variant: jest.fn().mockReturnValue({ variant: 'test' }),
          boardFor: jest.fn().mockReturnValue({ board: 'test' }),
          special: jest.fn().mockReturnValue({ special: 'prop' }),
          rotate: jest.fn(),
          leftRotate: jest.fn(),
          flip: jest.fn(),
          nextForm: jest.fn()
        })
      }),
      placeVariant: jest.fn().mockReturnValue([{ cell: 'data' }]),
      addToGrid: jest.fn(),
      cells: [{ r: 0, c: 0 }]
    }

    mockContentBuilder = jest.fn()

    // Import DraggedShip after Ghost mock is in place so the class
    // picks up the mocked Ghost implementation
    const dsModule = await import('./DraggedShip.js')
    DraggedShip = dsModule.DraggedShip

    // Create DraggedShip instance
    draggedShip = new DraggedShip(
      mockShip,
      100, // offsetX
      200, // offsetY
      32, // cellSize
      { type: 'rack' }, // source
      0, // variantIndex
      mockContentBuilder
    )
  })

  describe('constructor', () => {
    it('should initialize with ship and variant index', () => {
      expect(draggedShip.ship).toBe(mockShip)
    })

    it('should calculate cursor position from offset and cell size', () => {
      const draggedShip2 = new DraggedShip(
        mockShip,
        64, // 2 * 32
        96, // 3 * 32
        32,
        { type: 'rack' },
        0,
        mockContentBuilder
      )
      expect(draggedShip2.cursor).toEqual([3, 2])
    })

    it('should store source reference', () => {
      const source = { type: 'placement', id: 5 }
      const draggedShip2 = new DraggedShip(
        mockShip,
        0,
        0,
        32,
        source,
        0,
        mockContentBuilder
      )
      expect(draggedShip2.source).toBe(source)
    })

    it('should store offset values', () => {
      expect(draggedShip.offset).toEqual([100, 200])
    })

    it('should create a Ghost with current variant and special', () => {
      expect(Ghost).toHaveBeenCalledWith(
        expect.any(Object), // variant
        'B',
        mockContentBuilder
      )
    })

    it('should initialize shown as true', () => {
      expect(draggedShip.shown).toBe(true)
    })

    it('should handle zero offset', () => {
      const draggedShip2 = new DraggedShip(
        mockShip,
        0,
        0,
        32,
        { type: 'rack' },
        0,
        mockContentBuilder
      )
      expect(draggedShip2.offset).toEqual([0, 0])
      expect(draggedShip2.cursor).toEqual([0, 0])
    })
  })

  describe('isNotShown', () => {
    it('should return false when shown is true', () => {
      draggedShip.shown = true
      expect(draggedShip.isNotShown()).toBe(false)
    })

    it('should return true when shown is false', () => {
      draggedShip.shown = false
      expect(draggedShip.isNotShown()).toBe(true)
    })
  })

  describe('show', () => {
    it('should set shown to true', () => {
      draggedShip.shown = false
      draggedShip.show()
      expect(draggedShip.shown).toBe(true)
    })

    it('should call ghost.show()', () => {
      const mockGhost = draggedShip.ghost
      draggedShip.show()
      expect(mockGhost.show).toHaveBeenCalled()
    })
  })

  describe('hide', () => {
    it('should set shown to false', () => {
      draggedShip.shown = true
      draggedShip.hide()
      expect(draggedShip.shown).toBe(false)
    })

    it('should call ghost.hide()', () => {
      const mockGhost = draggedShip.ghost
      draggedShip.hide()
      expect(mockGhost.hide).toHaveBeenCalled()
    })

    it('should handle null ghost', () => {
      draggedShip.ghost = null
      // Should not throw
      draggedShip.hide()
      expect(draggedShip.shown).toBe(false)
    })
  })

  describe('remove', () => {
    it('should call ghost.remove()', () => {
      const mockGhost = draggedShip.ghost
      draggedShip.remove()
      expect(mockGhost.remove).toHaveBeenCalled()
    })

    it('should set ghost to null', () => {
      draggedShip.remove()
      expect(draggedShip.ghost).toBeNull()
    })

    it('should handle null ghost', () => {
      draggedShip.ghost = null
      // Should not throw
      draggedShip.remove()
      expect(draggedShip.ghost).toBeNull()
    })
  })

  describe('moveTo', () => {
    it('should call ghost.moveTo with coordinates', () => {
      const mockGhost = draggedShip.ghost
      draggedShip.moveTo(150, 250)
      expect(mockGhost.moveTo).toHaveBeenCalledWith(150, 250)
    })

    it('should handle null ghost', () => {
      draggedShip.ghost = null
      // Should not throw
      draggedShip.moveTo(100, 100)
      expect(draggedShip.ghost).toBeNull()
    })
  })

  describe('move', () => {
    it('should calculate position from mouse event and offset', () => {
      const mockGhost = draggedShip.ghost
      const event = {
        clientX: 200,
        clientY: 350
      }
      draggedShip.move(event)
      // clientX - offsetX[0] - 13 = 200 - 100 - 13 = 87
      // clientY - offsetY[1] - 13 = 350 - 200 - 13 = 137
      expect(mockGhost.moveTo).toHaveBeenCalledWith(87, 137)
    })

    it('should handle large mouse coordinates', () => {
      const mockGhost = draggedShip.ghost
      const event = {
        clientX: 1000,
        clientY: 1500
      }
      draggedShip.move(event)
      expect(mockGhost.moveTo).toHaveBeenCalledWith(
        1000 - 100 - 13,
        1500 - 200 - 13
      )
    })
  })

  describe('resetOffset', () => {
    it('should reset offset to [0, 0]', () => {
      draggedShip.offset = [100, 200]
      draggedShip.resetOffset()
      expect(draggedShip.offset).toEqual([0, 0])
    })

    it('should reset cursor to [0, 0]', () => {
      draggedShip.cursor = [3, 4]
      draggedShip.resetOffset()
      expect(draggedShip.cursor).toEqual([0, 0])
    })
  })

  describe('setGhostVariant', () => {
    it('should call ghost.setVariant with current variant', () => {
      const mockGhost = draggedShip.ghost
      draggedShip.setGhostVariant()
      expect(mockGhost.setVariant).toHaveBeenCalled()
    })

    it('should handle null ghost', () => {
      draggedShip.ghost = null
      // Should not throw
      draggedShip.setGhostVariant()
      expect(draggedShip.ghost).toBeNull()
    })
  })

  describe('rotate', () => {
    it('should reset offset', () => {
      draggedShip.offset = [100, 200]
      draggedShip.cursor = [3, 2]
      draggedShip.rotate()
      expect(draggedShip.offset).toEqual([0, 0])
      expect(draggedShip.cursor).toEqual([0, 0])
    })

    it('should call parent rotate', () => {
      const variantsMock = draggedShip.variants
      draggedShip.rotate()
      expect(variantsMock.rotate).toHaveBeenCalled()
    })

    it('should update ghost variant', () => {
      const mockGhost = draggedShip.ghost
      draggedShip.rotate()
      expect(mockGhost.setVariant).toHaveBeenCalled()
    })
  })

  describe('leftRotate', () => {
    it('should reset offset', () => {
      draggedShip.offset = [100, 200]
      draggedShip.cursor = [3, 2]
      draggedShip.leftRotate()
      expect(draggedShip.offset).toEqual([0, 0])
      expect(draggedShip.cursor).toEqual([0, 0])
    })

    it('should call parent leftRotate', () => {
      const variantsMock = draggedShip.variants
      draggedShip.leftRotate()
      expect(variantsMock.leftRotate).toHaveBeenCalled()
    })

    it('should update ghost variant', () => {
      const mockGhost = draggedShip.ghost
      draggedShip.leftRotate()
      expect(mockGhost.setVariant).toHaveBeenCalled()
    })
  })

  describe('flip', () => {
    it('should reset offset', () => {
      draggedShip.offset = [100, 200]
      draggedShip.cursor = [3, 2]
      draggedShip.flip()
      expect(draggedShip.offset).toEqual([0, 0])
      expect(draggedShip.cursor).toEqual([0, 0])
    })

    it('should call parent flip', () => {
      const variantsMock = draggedShip.variants
      draggedShip.flip()
      expect(variantsMock.flip).toHaveBeenCalled()
    })

    it('should update ghost variant', () => {
      const mockGhost = draggedShip.ghost
      draggedShip.flip()
      expect(mockGhost.setVariant).toHaveBeenCalled()
    })
  })

  describe('offsetCell', () => {
    it('should calculate cell offset from cursor', () => {
      draggedShip.cursor = [3, 4]
      const result = draggedShip.offsetCell(5, 7)
      expect(result).toEqual([2, 3]) // [5-3, 7-4]
    })

    it('should handle negative offsets', () => {
      draggedShip.cursor = [5, 7]
      const result = draggedShip.offsetCell(3, 2)
      expect(result).toEqual([-2, -5]) // [3-5, 2-7]
    })

    it('should handle zero cursor', () => {
      draggedShip.cursor = [0, 0]
      const result = draggedShip.offsetCell(2, 3)
      expect(result).toEqual([2, 3])
    })
  })

  describe('canPlaceRaw', () => {
    it('should return true when placement is valid', () => {
      mockPlaceable.canPlace.mockReturnValue(true)
      const result = draggedShip.canPlaceRaw(1, 2, {})
      expect(result).toBe(true)
    })

    it('should return false when placement is invalid', () => {
      mockPlaceable.canPlace.mockReturnValue(false)
      const result = draggedShip.canPlaceRaw(1, 2, {})
      expect(result).toBe(false)
    })

    it('should return false when ghost is null', () => {
      draggedShip.ghost = null
      const result = draggedShip.canPlaceRaw(1, 2, {})
      expect(result).toBe(false)
    })

    it('should pass shipCellGrid to canPlace', () => {
      const shipCellGrid = { grid: 'data' }
      draggedShip.canPlaceRaw(3, 4, shipCellGrid)
      expect(mockPlaceable.canPlace).toHaveBeenCalledWith(3, 4, shipCellGrid)
    })
  })

  describe('canPlace', () => {
    it('should calculate offset from cursor', () => {
      draggedShip.cursor = [2, 3]
      mockPlaceable.canPlace.mockReturnValue(true)
      draggedShip.canPlace(5, 8, {})
      // Should call canPlaceRaw with [5-2, 8-3] = [3, 5]
      expect(mockPlaceable.canPlace).toHaveBeenCalledWith(3, 5, {})
    })

    it('should return result from canPlaceRaw', () => {
      mockPlaceable.canPlace.mockReturnValue(true)
      const result = draggedShip.canPlace(5, 8, {})
      expect(result).toBe(true)

      mockPlaceable.canPlace.mockReturnValue(false)
      const result2 = draggedShip.canPlace(5, 8, {})
      expect(result2).toBe(false)
    })
  })

  describe('addCurrentToShipCells', () => {
    it('should add placeable to ship cells', () => {
      const shipCellGrid = { grid: 'data' }
      draggedShip.addCurrentToShipCells(2, 3, shipCellGrid)
      expect(mockShip.placeVariant).toHaveBeenCalledWith(mockPlaceable, 2, 3)
    })

    it('should add ship to grid', () => {
      const shipCellGrid = { grid: 'data' }
      draggedShip.addCurrentToShipCells(2, 3, shipCellGrid)
      expect(mockShip.addToGrid).toHaveBeenCalledWith(shipCellGrid)
    })

    it('should return ship cells', () => {
      const shipCellGrid = { grid: 'data' }
      const result = draggedShip.addCurrentToShipCells(2, 3, shipCellGrid)
      expect(result).toEqual(mockShip.cells)
    })
  })

  describe('placeCells', () => {
    it('should add cells to ship when placement is valid', () => {
      const shipCellGrid = { grid: 'data' }
      draggedShip.cursor = [0, 0]
      mockPlaceable.canPlace.mockReturnValue(true)

      const result = draggedShip.placeCells(2, 3, shipCellGrid)
      expect(mockShip.placeVariant).toHaveBeenCalled()
      expect(result).toEqual(mockShip.cells)
    })

    it('should return null when placement is invalid', () => {
      const shipCellGrid = { grid: 'data' }
      draggedShip.cursor = [0, 0]
      mockPlaceable.canPlace.mockReturnValue(false)

      const result = draggedShip.placeCells(2, 3, shipCellGrid)
      expect(mockShip.placeVariant).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('should account for cursor offset', () => {
      const shipCellGrid = { grid: 'data' }
      draggedShip.cursor = [1, 2]
      mockPlaceable.canPlace.mockReturnValue(true)

      draggedShip.placeCells(5, 8, shipCellGrid)
      expect(mockShip.placeVariant).toHaveBeenCalledWith(
        mockPlaceable,
        4, // 5-1
        6 // 8-2
      )
    })
  })

  describe('place', () => {
    it('should push ship to placedShipsInstance when valid', async () => {
      const mod = await import('./PlacedShips.js')
      const { placedShipsInstance } = mod
      const shipCellGrid = { grid: 'data' }
      draggedShip.cursor = [0, 0]
      mockPlaceable.canPlace.mockReturnValue(true)

      draggedShip.place(2, 3, shipCellGrid)
      expect(placedShipsInstance.push).toHaveBeenCalledWith(
        mockShip,
        mockShip.cells
      )
    })

    it('should return result from placedShipsInstance.push', async () => {
      const mod = await import('./PlacedShips.js')
      const { placedShipsInstance } = mod
      const shipCellGrid = { grid: 'data' }
      draggedShip.cursor = [0, 0]
      mockPlaceable.canPlace.mockReturnValue(true)

      placedShipsInstance.push.mockReturnValue({ placed: true, id: 123 })
      const result = draggedShip.place(2, 3, shipCellGrid)
      expect(result).toEqual({ placed: true, id: 123 })
    })

    it('should return null when placement fails', () => {
      const shipCellGrid = { grid: 'data' }
      draggedShip.cursor = [0, 0]
      mockPlaceable.canPlace.mockReturnValue(false)

      const result = draggedShip.place(2, 3, shipCellGrid)
      expect(result).toBeNull()
    })
  })

  describe('inheritance from SelectedShip', () => {
    it('should have access to SelectedShip methods', () => {
      expect(draggedShip.canFlip).toBeDefined()
      expect(draggedShip.canRotate).toBeDefined()
      expect(draggedShip.variant).toBeDefined()
      expect(draggedShip.special).toBeDefined()
    })

    it('should have letter property from ship', () => {
      expect(draggedShip.letter).toBe('B')
    })

    it('should have type property from shape', () => {
      expect(draggedShip.type).toBe('battleship')
    })
  })

  describe('integration scenarios', () => {
    it('should handle full drag, rotate, and place workflow', () => {
      const shipCellGrid = { grid: 'data' }
      const event = { clientX: 200, clientY: 350 }

      // Move the ship
      draggedShip.move(event)
      expect(draggedShip.ghost.moveTo).toHaveBeenCalled()

      // Rotate it
      draggedShip.rotate()
      expect(draggedShip.offset).toEqual([0, 0])
      expect(draggedShip.ghost.setVariant).toHaveBeenCalled()

      // Place it
      draggedShip.cursor = [0, 0]
      mockPlaceable.canPlace.mockReturnValue(true)
      const result = draggedShip.place(5, 7, shipCellGrid)
      expect(result).not.toBeNull()
    })

    it('should handle show/hide during drag', () => {
      draggedShip.hide()
      expect(draggedShip.shown).toBe(false)
      expect(draggedShip.ghost.hide).toHaveBeenCalled()

      draggedShip.show()
      expect(draggedShip.shown).toBe(true)
      expect(draggedShip.ghost.show).toHaveBeenCalled()
    })

    it('should handle remove after placement', () => {
      draggedShip.remove()
      expect(draggedShip.ghost).toBeNull()
    })
  })
})
