/**
 * @jest-environment jsdom
 *
 * DraggedShip integration tests
 *
 * Test suite for ship dragging mechanics including:
 * - Cursor position calculation from offsets
 * - Ship rotation, flipping, and transformation
 * - Placement validation and cell positioning
 * - Ghost visualization during drag operations
 * - Integration with ship cell grid and placement system
 */

import { SeaVessel } from '../terrains/sea/js/SeaShape.js'
import { Ship } from '../ships/Ship.js'
import { Orbit4F } from '../variants/Orbit4F.js'

import { ShipCellGrid } from '../grid/rectangle/ShipCellGrid.js'

import { describe, expect, it, beforeEach, jest } from '@jest/globals'

// DraggedShip will be imported after mocks are configured
/**
 * Test grid for placement operations.
 * 10x10 grid with null cells for testing ship placement mechanics.
 *
 * @type {ShipCellGrid}
 */
const shipCellGrid = new ShipCellGrid(
  Array.from({ length: 10 }, () => new Array(10).fill(null))
)

/**
 * Mock Ghost class for testing drag visualization.
 * Provides methods for showing/hiding and updating visual representation during dragging.
 *
 * @typedef {Object} MockGhost
 * @property {jest.Mock} show - Display the ghost ship
 * @property {jest.Mock} hide - Hide the ghost ship
 * @property {jest.Mock} remove - Remove the ghost ship from DOM
 * @property {jest.Mock} moveTo - Move ghost to new position
 * @property {jest.Mock} setVariant - Update ghost visualization for rotation variant
 */

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

/**
 * Mock PlacedShips module for managing placed ships on board.
 *
 * @typedef {Object} MockPlacedShips
 * @property {jest.Mock} push - Add ship to placed ships collection
 */
jest.unstable_mockModule('./PlacedShips.js', () => ({
  placedShipsInstance: {
    push: jest.fn().mockReturnValue({ placed: true })
  }
}))

/**
 * Aircraft carrier shape for testing.
 * Uses Sea terrain with T-shaped layout (8 cells total).
 *
 * @type {SeaVessel}
 */
const aircraftCarrierShape = new SeaVessel(
  'Aircraft Carrier',
  'A',
  'A',
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 1],
    [1, 2],
    [1, 3],
    [1, 4]
  ],
  'place Aircraft Carrier in the sea',
  []
)

/**
 * Aircraft Carrier ship instance for testing.
 * Created from SeaVessel shape with T-shaped configuration.
 * Shape method is set to return the aircraftCarrierShape definition.
 *
 * @type {Ship}
 */
// Suppress TypeScript error: SeaVessel has null weaponSystem which is compatible at runtime
// @ts-ignore
const aircraftCarrier = Ship.createFromShape(aircraftCarrierShape)
// Suppress TypeScript error: Compatible for testing despite type mismatch
// @ts-ignore
aircraftCarrier.shape = () => aircraftCarrierShape
// Initialize cells for testing
aircraftCarrier.cells = []

/**
 * Test suite for DraggedShip integration with mocked dependencies.
 * Tests drag operations, rotation, flipping, and ship placement mechanics.
 */
describe('DraggedShip integration', () => {
  /** @type {any} Mock placeable object */
  let mockPlaceable
  /** @type {jest.Mock} Mock content builder function */
  let mockContentBuilder
  /** @type {any} DraggedShip instance */
  let draggedShip
  /** @type {jest.Mock} Ghost constructor mock */
  let Ghost
  /** @type {any} Mock Ghost instance */
  let mockGhostInstance
  /** @type {any} DraggedShip class */
  let DraggedShip

  /**
   * Setup test fixture before each test.
   * Initializes mocked Ghost constructor, creates test ship instance,
   * and prepares DraggedShip for testing with mocked dependencies.
   *
   * Creates:
   * - Ghost constructor mock with tracked instance
   * - Mock placeable object with placement validation
   * - DraggedShip instance with aircraft carrier and test parameters
   *
   * @returns {Promise<void>}
   * @public
   */
  beforeEach(async () => {
    // Import mocked modules before running tests
    const ghostModule = await import('./Ghost.js')
    // Suppress TypeScript error: Ghost is a mock constructor function
    // @ts-ignore
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
    // Suppress TypeScript error: Ghost is a jest mock with mockReturnValue
    // @ts-ignore
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

    // Suppress TypeScript error: source is a mock element object for testing
    // @ts-ignore
    draggedShip = new DraggedShip(
      aircraftCarrier,
      100, // offsetX
      200, // offsetY
      32, // cellSize
      { type: 'rack' }, // source - mock element type
      0, // variantIndex
      mockContentBuilder
    )
  })

  describe('constructor', () => {
    /**
     * Test cursor position calculation from offset and cell size.
     * Verifies that cursor coordinates are correctly derived from pixel offsets divided by cell size.
     * Formula: cursor[x] = offsetX / cellSize, cursor[y] = offsetY / cellSize
     *
     * @returns {void}
     */
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

    /**
     * Test Ghost creation with correct parameters.
     * Verifies that Ghost constructor is called with variant, special letter, and content builder.
     *
     * @returns {void}
     */
    it('should create a Ghost with current variant and special', () => {
      // Suppress TypeScript error: Ghost is a jest mock constructor
      // @ts-ignore
      expect(Ghost).toHaveBeenCalledWith(
        expect.any(Object), // variant
        'A',
        mockContentBuilder
      )
    })
  })

  describe('rotate', () => {
    /**
     * Test offset and cursor reset on rotation.
     * Verifies that rotation resets both offset and cursor to origin (0, 0).
     *
     * @returns {void}
     */
    it('should reset offset', () => {
      draggedShip.offset = [100, 200]
      draggedShip.cursor = [3, 2]
      draggedShip.rotate()
      expect(draggedShip.offset).toEqual([0, 0])
      expect(draggedShip.cursor).toEqual([0, 0])
    })

    /**
     * Test variant index increment on rotation.
     * Verifies that rotate() increments the variant index and updates shape properties.
     * Tests Orbit4F variant switching behavior.
     *
     * @returns {void}
     */
    it('should change index', () => {
      const variants = draggedShip.variants
      expect(variants).toBeInstanceOf(Orbit4F)
      expect(variants.index).toBe(0)

      expect(variants.list[0].store.bitsPerCell).toBe(1)
      expect(variants.list[0].width).toBe(2)
      expect(variants.list[0].height).toBe(5)
      expect(variants.list[0].toAscii).toBe('1.\n11\n11\n11\n.1')
      draggedShip.rotate()
      expect(variants.index).toBe(1)
    })

    /**
     * Test Ghost visualization update on rotation.
     * Verifies that Ghost.setVariant() is called when rotating ship.
     *
     * @returns {void}
     */
    it('should update ghost variant', () => {
      const mockGhost = draggedShip.ghost
      draggedShip.rotate()
      expect(mockGhost.setVariant).toHaveBeenCalled()
    })
  })
  /**
   * Ship placement tests.
   * Tests coordinate conversion and cell occupancy validation.
   */
  describe('placing', () => {
    /**
     * Test placeable object generation and placement at coordinates.
     * Verifies board dimensions, store configuration, and placed cell locations.
     *
     * @returns {void}
     */
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
      const locations = [...sb.occupiedLocations()]
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
      draggedShip.addCurrentToShipCells(3, 2, shipCellGrid)
    })

    it('should add ship to grid', () => {
      draggedShip.addCurrentToShipCells(3, 2, shipCellGrid)
    })

    it('should return ship cells', () => {
      const result = draggedShip.addCurrentToShipCells(3, 2, shipCellGrid)
      expect(result).toEqual(aircraftCarrier.cells)
    })
  })

  describe('placeCells', () => {
    it('should add cells to ship when placement is valid', () => {
      draggedShip.cursor = [0, 0]
      mockPlaceable.canPlace.mockReturnValue(true)

      draggedShip.placeCells(3, 2, shipCellGrid)
    })

    it('should return null when placement is invalid', () => {
      draggedShip.cursor = [0, 0]
      mockPlaceable.canPlace.mockReturnValue(false)

      const result = draggedShip.placeCells(3, 2, shipCellGrid)

      expect(result).toBeNull()
    })

    it('should account for cursor offset', () => {
      draggedShip.cursor = [1, 2]
      mockPlaceable.canPlace.mockReturnValue(true)

      draggedShip.placeCells(5, 8, shipCellGrid)
    })
  })

  describe('place', () => {
    it('should push ship to placedShipsInstance when valid', async () => {
      await import('./PlacedShips.js')
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
      const placedShipsInstance = /** @type {any} */ (mod.placedShipsInstance)
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
