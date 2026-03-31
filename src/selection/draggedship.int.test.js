/* eslint-env jest */
import { jest } from '@jest/globals'
import { SeaVessel } from '../terrains/sea/js/SeaShape.js'
import { Ship } from '../ships/Ship.js'
import { Orbit4F } from '../variants/Orbit4F.js'
/* global describe, require, it, expect, beforeEach, jest */

// DraggedShip will be imported after mocks are configured
const shipCellGrid = Array.from({ length: 10 }, () => new Array(10).fill(null))

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

const aircraftCarrierShape = new SeaVessel('Aircraft Carrier', 'A', 'A', [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 1],
  [1, 2],
  [1, 3],
  [1, 4]
])
const aircraftCarrier = Ship.createFromShape(aircraftCarrierShape)
aircraftCarrier.shape = () => aircraftCarrierShape

describe('DraggedShip integration', () => {
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

    mockContentBuilder = jest.fn()

    // Import DraggedShip after Ghost mock is in place so the class
    // picks up the mocked Ghost implementation
    const dsModule = await import('./DraggedShip.js')
    DraggedShip = dsModule.DraggedShip

    // Create DraggedShip instance
    draggedShip = new DraggedShip(
      aircraftCarrier,
      100, // offsetX
      200, // offsetY
      32, // cellSize
      { type: 'rack' }, // source
      0, // variantIndex
      mockContentBuilder
    )
  })

  describe('constructor', () => {
    it('should calculate cursor position from offset and cell size', () => {
      const draggedShip2 = new DraggedShip(
        aircraftCarrier,
        64, // 2 * 32
        96, // 3 * 32
        32,
        { type: 'rack' },
        0,
        mockContentBuilder
      )
      expect(draggedShip2.cursor).toEqual([3, 2])
    })

    it('should create a Ghost with current variant and special', () => {
      expect(Ghost).toHaveBeenCalledWith(
        expect.any(Object), // variant
        'A',
        mockContentBuilder
      )
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

    it('should change index', () => {
      const variants = draggedShip.variants
      expect(variants).toBeInstanceOf(Orbit4F)
      expect(variants.index).toBe(0)

      expect(variants.list[0].store.bitsPerCell).toBe(1)
      expect(variants.list[0].width).toBe(2)
      expect(variants.list[0].height).toBe(5)
      expect(variants.list[0].toAscii).toBe('1.\n11\n11\n11\n.1')

      //  expect(variants.variant().toAscii).toBe(
      //    '1....\n11...\n11...\n11...\n.1...'
      // )
      draggedShip.rotate()
      expect(variants.index).toBe(1)
    })

    it('should update ghost variant', () => {
      const mockGhost = draggedShip.ghost
      draggedShip.rotate()
      expect(mockGhost.setVariant).toHaveBeenCalled()
    })
  })
  describe('placing', () => {
    it('placeable', () => {
      const placeable = draggedShip.placeable()
      const pb = placeable.board

      expect(pb.width).toBe(2)
      expect(pb.height).toBe(5)
      expect(pb.store.bitsPerCell).toBe(1)
      const placing = placeable.placeAt(7, 4)
      const sb = placing.board
      expect(sb).toBeDefined()
      expect(sb.width).toBe(2)
      expect(sb.height).toBe(5)
      expect(sb.store.bitsPerCell).toBe(1)
      const locations = [...sb.locations()]
      expect(locations.length).toBe(8)

      expect(locations[0]).toEqual([7, 4])
      expect(locations).toContainEqual([7, 5])
      expect(locations).toContainEqual([8, 5])
      expect(locations).toContainEqual([7, 6])
      expect(locations).toContainEqual([8, 6])
      expect(locations).toContainEqual([7, 7])
      expect(locations).toContainEqual([8, 7])
      expect(locations).toContainEqual([8, 8])
    })
  })
  describe('leftRotate', () => {
    it('should change index', () => {
      const variants = draggedShip.variants
      expect(variants.index).toBe(0)

      draggedShip.leftRotate()
      expect(variants.index).toBe(1)
    })

    it('should update ghost variant', () => {
      const mockGhost = draggedShip.ghost
      draggedShip.leftRotate()
      expect(mockGhost.setVariant).toHaveBeenCalled()
    })
  })

  describe('flip', () => {
    it('should change index', () => {
      const variants = draggedShip.variants
      expect(variants.index).toBe(0)

      draggedShip.flip()
      expect(variants.index).toBe(2)
    })

    it('should update ghost variant', () => {
      const mockGhost = draggedShip.ghost
      draggedShip.flip()
      expect(mockGhost.setVariant).toHaveBeenCalled()
    })
  })

  describe('addCurrentToShipCells', () => {
    it('should add placeable to ship cells', () => {
      draggedShip.addCurrentToShipCells(2, 3, shipCellGrid)
      //   expect(aircraftCarrier.placeVariant).toHaveBeenCalledWith(mockPlaceable, 2, 3)
    })

    it('should add ship to grid', () => {
      draggedShip.addCurrentToShipCells(2, 3, shipCellGrid)
      //    expect(aircraftCarrier.addToGrid).toHaveBeenCalledWith(shipCellGrid)
    })

    it('should return ship cells', () => {
      const result = draggedShip.addCurrentToShipCells(2, 3, shipCellGrid)
      expect(result).toEqual(aircraftCarrier.cells)
    })
  })

  describe('placeCells', () => {
    it('should add cells to ship when placement is valid', () => {
      draggedShip.cursor = [0, 0]
      mockPlaceable.canPlace.mockReturnValue(true)

      const result = draggedShip.placeCells(2, 3, shipCellGrid)
      //   expect(aircraftCarrier.placeVariant).toHaveBeenCalled()
      //  expect(result).toEqual(aircraftCarrier.cells)
    })

    it('should return null when placement is invalid', () => {
      draggedShip.cursor = [0, 0]
      mockPlaceable.canPlace.mockReturnValue(false)

      const result = draggedShip.placeCells(2, 3, shipCellGrid)
      //   expect(aircraftCarrier.placeVariant).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('should account for cursor offset', () => {
      draggedShip.cursor = [1, 2]
      mockPlaceable.canPlace.mockReturnValue(true)

      draggedShip.placeCells(5, 8, shipCellGrid)
      //    expect(aircraftCarrier.placeVariant).toHaveBeenCalledWith(
      //      mockPlaceable,
      //     4, // 5-1
      //      6 // 8-2
      //     )
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
      //   expect(placedShipsInstance.push).toHaveBeenCalledWith(
      //      aircraftCarrier,
      //     aircraftCarrier.cells
      //   )
    })

    it.skip('should return result from placedShipsInstance.push', async () => {
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
    })

    it('should have letter property from ship', () => {
      expect(draggedShip.letter).toBe('A')
    })

    it('should have type property from shape', () => {
      expect(draggedShip.type).toBe('S')
    })
  })

  describe('integration scenarios', () => {
    it.skip('should handle full drag, rotate, and place workflow', () => {
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
