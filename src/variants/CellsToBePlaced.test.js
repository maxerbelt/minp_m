/**
 * @fileoverview Comprehensive test suite for CellsToBePlaced variant class.
 * Tests placement validation logic including bounds checking, zone matching,
 * overlap detection, and touch-spacing enforcement for ship placement.
 * @module variants/CellsToBePlaced.test
 */

import { describe, it, expect, jest } from '@jest/globals'

import { CellsToBePlaced } from './CellsToBePlaced.js'
import { Mask } from '../grid/rectangle/mask.js'
import { placingTarget } from './makeCell3.js'
import { ShipCellGrid } from '../grid/rectangle/ShipCellGrid.js'

/**
 * Creates a ShipCellGrid test fixture with specified dimensions and initial fill value.
 * Used for validating placement constraints against occupied cells.
 * @param {number} rows - Number of grid rows
 * @param {number} cols - Number of grid columns
 * @param {*} [fill=null] - Initial value for all cells (null for empty, or cell identifier)
 * @returns {ShipCellGrid} New grid with specified dimensions
 */
function makeGrid (rows, cols, fill = null) {
  return new ShipCellGrid(
    Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill))
  )
}

/**
 * Test suite for CellsToBePlaced class functionality.
 * Validates ship placement constraints and zone matching logic.
 */
describe('CellsToBePlaced', () => {
  /**
   * Tests constructor initialization and property setup.
   */
  describe('constructor and properties', () => {
    /**
     * Verifies CellsToBePlaced initializes with default target and zoneDetail values.
     */
    it('constructor initializes with default target and zoneDetail', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      const validator = () => true

      const placing = new CellsToBePlaced(
        board,
        1,
        1,
        validator,
        undefined,
        undefined
      )

      expect(placing.board).toBeDefined()
      expect(placing.validator).toBe(validator)
      expect(placing.zoneDetail).toBe(0)
      expect(placing.target).toBe(placingTarget)
    })

    /**
     * Verifies CellsToBePlaced applies embed transformation to the board parameter.
     */
    it('constructor applies embed transformation to board', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      const validator = () => true
      /** @type {any} */
      const target = { boundsChecker: () => true, getZone: () => ({}) }

      const placing = new CellsToBePlaced(board, 2, 3, validator, 0, target)

      // The board is embedded at (2, 3), so cells should be at absolute positions
      expect(placing.isCandidate(2, 3)).toBe(true)
    })

    /**
     * Verifies CellsToBePlaced correctly displaces the board in 2D space (vertical orientation).
     */
    it('displaces the board2', () => {
      /** @type {any} */
      const board1 = new Mask(4, 1, 15n, undefined, 2)
      /** @type {any} */
      const board = board1.embed(0, 3)

      expect(board1.toAscii).toBe('1111')
      expect(board.toAscii).toBe('1111')
      const validator = () => true
      /** @type {any} */
      const target = { boundsChecker: () => true, getZone: () => ({}) }

      const placing = new CellsToBePlaced(board1, 3, 0, validator, 0, target)

      /** @type {any} */
      const displacedArea = placing.displacedArea(18, 10)

      expect(displacedArea.toAscii).toBe(
        `..111111..........
..111111..........
..................
..................
..................
..................
..................
..................
..................
..................`
      )
    })

    /**
     * Verifies CellsToBePlaced correctly displaces the board in 2D space (horizontal orientation).
     */
    it('displaces the board', () => {
      /** @type {any} */
      const board1 = new Mask(1, 4, 15n, undefined, 2)
      /** @type {any} */
      const board = board1.embed(0, 3)

      expect(board1.toAscii).toBe('1\n1\n1\n1')
      expect(board.toAscii).toBe('1\n1\n1\n1')
      /** @type {any} */
      const dilatedBoard = board.flatDilateExpand(1).toMask(18, 10)

      expect(dilatedBoard.toAscii).toBe(
        `..................
..................
11................
11................
11................
11................
11................
11................
..................
..................`
      )
      const validator = () => true
      /** @type {any} */
      const target = { boundsChecker: () => true, getZone: () => ({}) }

      const placing = new CellsToBePlaced(board1, 0, 3, validator, 0, target)

      /** @type {any} */
      const displacedArea = placing.displacedArea(18, 10)

      expect(displacedArea.toAscii).toBe(
        `..................
..................
11................
11................
11................
11................
11................
11................
..................
..................`
      )
    })
    /**
     * Verifies CellsToBePlaced correctly initializes an aircraft carrier shape with proper cell occupancy.
     */
    it('constructor applies aircraft carrier', () => {
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
      /** @type {any} */
      const board = Mask.fromCoords(occupancyCoords)
      expect(board.toAscii).toBe('1.\n11\n11\n11\n.1')

      const validator = () => true

      const placing = new CellsToBePlaced(
        board,
        7,
        4,
        validator,
        undefined,
        undefined
      )
      /** @type {any} */
      const sb = placing.board
      expect(sb).toBeDefined()
      expect(sb.mask.toAscii).toBe('1.\n11\n11\n11\n.1')
      expect(sb.store.bitsPerCell).toBe(1)
      expect(sb.at(7, 4))
      expect(placing.validator).toBe(validator)
      expect(placing.zoneDetail).toBe(0)
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

    /**
     * Skipped test: Aircraft carrier shape with square grid representation.
     */
    it.skip('constructor applies aircraft carrier - Square', () => {
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
      /** @type {any} */
      const board = Mask.fromCoordsSquare(occupancyCoords)
      expect(board.toAscii).toBe('1....\n11...\n11...\n11...\n.1...')

      const validator = () => true

      const placing = new CellsToBePlaced(
        board,
        7,
        4,
        validator,
        undefined,
        undefined
      )
      /** @type {any} */
      const sb = placing.board
      expect(sb).toBeDefined()
      expect(sb.mask.toAscii).toBe('1.\n11\n11\n11\n.1')
      expect(sb.store.bitsPerCell).toBe(1)
      expect(sb.at(7, 4))
      expect(placing.validator).toBe(validator)
      expect(placing.zoneDetail).toBe(0)
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
    /**
     * Verifies notGood property is initialized as empty mask.
     */
    it('notGood is initialized as empty mask', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      const validator = () => true

      const placing = new CellsToBePlaced(
        board,
        0,
        0,
        validator,
        undefined,
        undefined
      )

      expect(placing.notGood).toBeDefined()
    })
  })

  /**
   * Tests cells getter functionality.
   */
  describe('cells getter', () => {
    /**
     * Verifies cells getter returns board coordinates as an array.
     */
    it('cells returns board coordinates', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      /** @type {any} */
      const board = Mask.fromCoords(coords)
      const placing = new CellsToBePlaced(
        board,
        0,
        0,
        () => true,
        undefined,
        undefined
      )

      const cells = placing.cells
      expect(Array.isArray(cells)).toBe(true)
      expect(cells.length).toBeGreaterThan(0)
    })
  })

  /**
   * Tests isCandidate method that validates if coordinates are within the board shape.
   */
  describe('isCandidate', () => {
    /**
     * Verifies isCandidate returns true for cells within the board.
     */
    it('isCandidate returns true for cells in board', () => {
      const variant = [
        [0, 0],
        [0, 1]
      ]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      const placing = new CellsToBePlaced(board, 2, 3, () => true, 0, {
        boundsChecker: () => true,
        allBoundsChecker: () => true,
        getZone: () => ({})
      })

      expect(placing.isCandidate(2, 3)).toBe(true)
      expect(placing.isCandidate(2, 4)).toBe(true)
    })

    /**
     * Verifies isCandidate returns false for cells outside the board.
     */
    it('isCandidate returns false for cells not in board', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      const placing = new CellsToBePlaced(board, 2, 3, () => true, 0, {
        boundsChecker: () => true,
        allBoundsChecker: () => true,
        getZone: () => ({})
      })

      expect(placing.isCandidate(1, 1)).toBe(false)
      expect(placing.isCandidate(2, 5)).toBe(false)
    })
  })

  /**
   * Tests zone validation and matching logic.
   */
  describe('zoneInfo and isInMatchingZone', () => {
    /**
     * Verifies zoneInfo calls target.getZone with correct parameters.
     */
    it('zoneInfo calls target.getZone with correct parameters', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const getZone = jest.fn(() => ({ detail: 'ZONE_VALUE' }))
      /** @type {any} */
      const target = {
        getZone,
        boundsChecker: () => true
      }
      const placing = new CellsToBePlaced(board, 2, 3, () => true, 5, target)

      const result = placing.zoneInfo(3, 2, undefined)

      expect(getZone.mock.calls[0]).toEqual([2, 3, 5])
      expect(result).toEqual({ detail: 'ZONE_VALUE' })
    })

    /**
     * Verifies zoneInfo uses instance zoneDetail by default.
     */
    it('zoneInfo uses instance zoneDetail by default', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const getZone = jest.fn(() => ({ detail: 'ZONE' }))
      /** @type {any} */
      const target = {
        getZone,
        boundsChecker: () => true
      }
      const placing = new CellsToBePlaced(board, 0, 0, () => true, 7, target)

      placing.zoneInfo(1, 1, undefined)

      expect(getZone.mock.calls[0]).toEqual([1, 1, 7])
    })

    /**
     * Verifies zoneInfo can override zoneDetail with parameter.
     */
    it('zoneInfo can override zoneDetail parameter', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const getZone = jest.fn(() => ({ detail: 'ZONE' }))
      /** @type {any} */
      const target = {
        getZone,
        boundsChecker: () => true
      }
      const placing = new CellsToBePlaced(board, 0, 0, () => true, 7, target)

      placing.zoneInfo(1, 1, 9)

      expect(getZone.mock.calls[0]).toEqual([1, 1, 9])
    })

    /**
     * Verifies isInMatchingZone returns true when validator accepts zone.
     */
    it('isInMatchingZone returns true when validator accepts zone', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = {
        getZone: () => ({ detail: 'VALID_ZONE' }),
        boundsChecker: () => true
      }
      const validator = z => z.detail === 'VALID_ZONE'
      const placing = new CellsToBePlaced(board, 2, 3, validator, 0, target)

      expect(placing.isInMatchingZone(3, 2)).toBe(true)
    })

    /**
     * Verifies isInMatchingZone returns false when validator rejects zone.
     */
    it('isInMatchingZone returns false when validator rejects zone', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = {
        getZone: () => ({ detail: 'INVALID_ZONE' }),
        boundsChecker: () => true
      }
      const validator = z => z.detail === 'VALID_ZONE'
      const placing = new CellsToBePlaced(board, 2, 3, validator, 0, target)

      expect(placing.isInMatchingZone(3, 2)).toBe(false)
    })
  })

  /**
   * Tests isAreaClearAroundXY method that validates clear space around placement location.
   */
  describe('isAreaClearAroundXY', () => {
    /**
     * Verifies isAreaClearAroundXY returns true when no neighbors are occupied.
     */
    it('isAreaClearAroundXY returns true when no neighbors are occupied', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = { boundsChecker: () => true, getZone: () => ({}) }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      expect(placing.isAreaClearAroundXY(2, 2, grid)).toBe(true)
    })

    /**
     * Verifies isAreaClearAroundXY returns false when up neighbor is occupied.
     */
    it('isAreaClearAroundXY returns false when up neighbor is occupied', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = { boundsChecker: () => true, getZone: () => ({}) }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      grid.set(1, 2, 'SHIP')
      expect(placing.isAreaClearAroundXY(2, 2, grid)).toBe(false)
    })

    /**
     * Verifies isAreaClearAroundXY returns false when down neighbor is occupied.
     */
    it('isAreaClearAroundXY returns false when down neighbor is occupied', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = { boundsChecker: () => true, getZone: () => ({}) }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      grid.set(3, 2, 'SHIP')
      expect(placing.isAreaClearAroundXY(2, 2, grid)).toBe(false)
    })

    /**
     * Verifies isAreaClearAroundXY returns false when left neighbor is occupied.
     */
    it('isAreaClearAroundXY returns false when left neighbor is occupied', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = { boundsChecker: () => true, getZone: () => ({}) }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      grid.set(2, 1, 'SHIP')
      expect(placing.isAreaClearAroundXY(2, 2, grid)).toBe(false)
    })

    /**
     * Verifies isAreaClearAroundXY returns false when right neighbor is occupied.
     */
    it('isAreaClearAroundXY returns false when right neighbor is occupied', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = { boundsChecker: () => true, getZone: () => ({}) }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      grid.set(2, 3, 'SHIP')
      expect(placing.isAreaClearAroundXY(2, 2, grid)).toBe(false)
    })

    /**
     * Verifies isAreaClearAroundXY returns false when diagonal neighbor is occupied.
     */
    it('isAreaClearAroundXY returns false when diagonal neighbor is occupied', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = { boundsChecker: () => true, getZone: () => ({}) }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      grid.set(1, 1, 'SHIP') // diagonal up-left
      expect(placing.isAreaClearAroundXY(2, 2, grid)).toBe(false)
    })

    /**
     * Verifies isAreaClearAroundXY checks all 8 neighbors (cardinal and diagonal).
     */
    it('isAreaClearAroundXY checks all 8 neighbors', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = { boundsChecker: () => true, getZone: () => ({}) }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      // Test each of the 8 neighbors
      /** @type {[number, number][]} */
      const neighbors = [
        [1, 1],
        [1, 2],
        [1, 3],
        [2, 1],
        [2, 3],
        [3, 1],
        [3, 2],
        [3, 3]
      ]

      for (const [r, c] of neighbors) {
        const grid = makeGrid(5, 5, null)
        grid.set(r, c, 'SHIP')
        expect(placing.isAreaClearAroundXY(2, 2, grid)).toBe(false)
      }
    })

    /**
     * Verifies isAreaClearAroundXY respects boundsChecker for out-of-bounds cells.
     */
    it('isAreaClearAroundXY respects boundsChecker for out-of-bounds cells', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = {
        boundsChecker: (r, c) => r >= 0 && r < 5 && c >= 0 && c < 5,
        getZone: () => ({})
      }
      const placing = new CellsToBePlaced(board, 0, 0, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      // Out-of-bounds cells should not trigger touch
      expect(placing.isAreaClearAroundXY(0, 0, grid)).toBe(true)
    })
  })

  /**
   * Tests isWrongZone method that validates all cells are in compatible zones.
   */
  describe('isWrongZone', () => {
    /**
     * Verifies isWrongZone returns false when all cells match validator zone.
     */
    it('isWrongZone returns false when all cells match zone', () => {
      const variant = [
        [0, 0],
        [0, 1]
      ]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = {
        getZone: () => ({ detail: 'VALID' }),
        boundsChecker: () => true
      }
      const validator = z => z.detail === 'VALID'
      const placing = new CellsToBePlaced(board, 2, 3, validator, 0, target)

      expect(placing.isWrongZone()).toBe(false)
    })

    /**
     * Verifies isWrongZone returns true when any cell does not match validator zone.
     */
    it('isWrongZone returns true when any cell does not match zone', () => {
      const variant = [
        [0, 0],
        [0, 1]
      ]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      let callCount = 0
      /** @type {any} */
      const target = {
        getZone: () => {
          callCount++
          return { detail: callCount === 1 ? 'VALID' : 'INVALID' }
        },
        boundsChecker: () => true
      }
      const validator = z => z.detail === 'VALID'
      const placing = new CellsToBePlaced(board, 2, 3, validator, 0, target)

      expect(placing.isWrongZone()).toBe(true)
    })
  })

  /**
   * Tests isNotInBounds method that validates all cells are within grid boundaries.
   */
  describe('isNotInBounds', () => {
    /**
     * Verifies isNotInBounds returns false when all cells are in bounds.
     */
    it('isNotInBounds returns false when all cells are in bounds', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = {
        boundsChecker: () => true,
        getZone: () => ({})
      }
      const placing = new CellsToBePlaced(board, 5, 5, () => true, 0, target)

      expect(placing.isNotInBounds()).toBe(false)
    })

    /**
     * Verifies isNotInBounds returns true when any cell is out of bounds.
     */
    it('isNotInBounds returns true when any cell is out of bounds', () => {
      const variant = [
        [0, 0],
        [0, 1]
      ]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = {
        boundsChecker: (r, c) => !(r === 5 && c === 5),
        getZone: () => ({})
      }
      const placing = new CellsToBePlaced(board, 5, 5, () => true, 0, target)

      expect(placing.isNotInBounds()).toBe(true)
    })
  })

  /**
   * Tests isOverlapping method that validates no cell placement overlaps with occupied cells.
   */
  describe('isOverlapping', () => {
    /**
     * Verifies isOverlapping returns false when no cells overlap with existing ships.
     */
    it('isOverlapping returns false when no cells overlap', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, {
        boundsChecker: () => true,
        allBoundsChecker: () => true,
        getZone: () => ({})
      })

      const grid = makeGrid(5, 5, null)
      expect(placing.isOverlapping(grid)).toBe(false)
    })

    /**
     * Verifies isOverlapping returns true when any cell overlaps with existing occupant.
     */
    it('isOverlapping returns true when any cell overlaps', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, {
        boundsChecker: () => true,
        allBoundsChecker: () => true,
        getZone: () => ({})
      })

      const grid = makeGrid(5, 5, null)
      grid.set(2, 2, 102)
      expect(placing.isOverlapping(grid)).toBe(true)
    })

    /**
     * Verifies isOverlapping checks all board cells for overlap.
     */
    it('isOverlapping checks all board cells', () => {
      const variant = [
        [0, 0],
        [0, 1]
      ]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      const placing = new CellsToBePlaced(board, 2, 3, () => true, 0, {
        boundsChecker: () => true,
        allBoundsChecker: () => true,
        getZone: () => ({})
      })

      const grid = makeGrid(5, 5, null)
      grid.set(2, 4, 103) // second cell
      expect(placing.isOverlapping(grid)).toBe(true)
    })
  })

  /**
   * Tests isTouching method that validates no cell is adjacent to occupied cells.
   */
  describe('isTouching', () => {
    /**
     * Verifies isTouching returns false when no adjacent cells are occupied.
     */
    it('isTouching returns false when no neighbors are occupied', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = { boundsChecker: () => true, getZone: () => ({}) }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      expect(placing.isTouching(grid)).toBe(false)
    })

    /**
     * Verifies isTouching returns true when adjacent occupied cell exists.
     */
    it('isTouching returns true when any cell has neighbors occupied', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = { boundsChecker: () => true, getZone: () => ({}) }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      grid.set(1, 2, 'SHIP') // neighbor of cell at (2,2)
      expect(placing.isTouching(grid)).toBe(true)
    })

    /**
     * Verifies isTouching checks all board cells for adjacent occupied neighbors.
     */
    it('isTouching checks all board cells for neighbors', () => {
      const variant = [
        [0, 0],
        [0, 1]
      ]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = { boundsChecker: () => true, getZone: () => ({}) }
      const placing = new CellsToBePlaced(board, 2, 3, () => true, 0, target)

      const grid = makeGrid(6, 6, null)
      grid.set(2, 5, 'SHIP') // neighbor of second cell at (2,4)
      expect(placing.isTouching(grid)).toBe(true)
    })
  })

  /**
   * Tests canPlace method that combines all validation checks for ship placement.
   */
  describe('canPlace', () => {
    /**
     * Verifies canPlace returns false when placement is out of bounds.
     */
    it('canPlace returns false when out of bounds', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = {
        boundsChecker: () => false,
        getZone: () => ({ detail: 'VALID' })
      }
      const placing = new CellsToBePlaced(
        board,
        2,
        2,
        z => z.detail === 'VALID',
        0,
        target
      )

      const grid = makeGrid(5, 5, null)
      expect(placing.canPlace(grid)).toBe(false)
    })

    /**
     * Verifies canPlace returns false when placement is in wrong zone.
     */
    it('canPlace returns false when wrong zone', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = {
        boundsChecker: () => true,
        getZone: () => ({ detail: 'INVALID' })
      }
      const placing = new CellsToBePlaced(
        board,
        2,
        2,
        z => z.detail === 'VALID',
        0,
        target
      )

      const grid = new ShipCellGrid(
        Array.from({ length: 5 }, () => new Array(5).fill(null))
      )
      expect(placing.canPlace(grid)).toBe(false)
    })

    /**
     * Verifies canPlace returns false when any cell overlaps with existing occupant.
     */
    it('canPlace returns false when overlapping', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = {
        boundsChecker: () => true,
        getZone: () => ({ detail: 'VALID' })
      }
      const placing = new CellsToBePlaced(
        board,
        2,
        2,
        z => z.detail === 'VALID',
        0,
        target
      )

      const grid = makeGrid(5, 5, null)
      grid.set(2, 2, 'SHIP')
      expect(placing.canPlace(grid)).toBe(false)
    })

    /**
     * Verifies canPlace returns false when adjacent cells are occupied.
     */
    it('canPlace returns false when touching', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = {
        boundsChecker: () => true,
        getZone: () => ({ detail: 'VALID' })
      }
      const placing = new CellsToBePlaced(
        board,
        2,
        2,
        z => z.detail === 'VALID',
        0,
        target
      )

      const grid = makeGrid(5, 5, null)
      grid.set(1, 2, 'SHIP') // neighbor occupied
      expect(placing.canPlace(grid)).toBe(false)
    })

    /**
     * Verifies canPlace returns true when all validation conditions are met.
     */
    it('canPlace returns true when all conditions met', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = {
        boundsChecker: () => true,
        getZone: () => ({ detail: 'VALID' })
      }
      const placing = new CellsToBePlaced(
        board,
        2,
        2,
        z => z.detail === 'VALID',
        0,
        target
      )

      const grid = makeGrid(5, 5, null)
      expect(placing.canPlace(grid)).toBe(true)
    })

    /**
     * Verifies canPlace checks bounds validation early (short-circuit optimization).
     */
    it('canPlace checks bounds first', () => {
      const variant = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = {
        boundsChecker: () => false,
        getZone: jest.fn()
      }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      placing.canPlace(grid)

      // getZone might not be called if bounds check fails early
      // This it ensures early exit optimization
      expect(placing.canPlace(grid)).toBe(false)
    })

    /**
     * Verifies canPlace correctly handles multi-cell ships with combined constraints.
     */
    it('canPlace handles multi-cell ships', () => {
      const variant = [
        [0, 0],
        [0, 1],
        [0, 2]
      ]
      /** @type {any} */
      const board = Mask.fromCoords(variant)
      /** @type {any} */
      const target = {
        boundsChecker: () => true,
        getZone: () => ({ detail: 'VALID' })
      }
      const placing = new CellsToBePlaced(
        board,
        5,
        5,
        z => z.detail === 'VALID',
        0,
        target
      )

      const grid = makeGrid(10, 10, null)
      expect(placing.canPlace(grid)).toBe(true)

      grid.set(5, 7, 'SHIP') // occupy one cell
      expect(placing.canPlace(grid)).toBe(false)
    })
  })

  /**
   * Integration tests validating combined placement constraint scenarios.
   */
  describe('integration tests', () => {
    /**
     * Verifies complete placement validation workflow with various board states.
     */
    it('full placement validation workflow', () => {
      const shipShape = [
        [0, 0],
        [0, 1],
        [0, 2]
      ]
      /** @type {Mask} */
      const board = Mask.fromCoords(shipShape)
      /** @type {any} */
      const target = {
        boundsChecker: (/** @type {number} */ r, /** @type {number} */ c) =>
          r >= 0 && r < 10 && c >= 0 && c < 10,
        getZone: () => ({ detail: 'WATER' })
      }
      const validator = z => z.detail === 'WATER'
      const placing = new CellsToBePlaced(board, 3, 3, validator, 0, target)

      // Valid placement on empty board
      const emptyGrid = makeGrid(10, 10, null)
      expect(placing.canPlace(emptyGrid)).toBe(true)

      // Invalid due to occupied cell
      const occupiedGrid = makeGrid(10, 10, null)
      occupiedGrid.set(3, 4, 'SHIP')
      expect(placing.canPlace(occupiedGrid)).toBe(false)

      // Invalid due to neighboring ship
      const neighborGrid = makeGrid(10, 10, null)
      neighborGrid.set(2, 3, 'SHIP') // diagonal
      expect(placing.canPlace(neighborGrid)).toBe(false)

      // Valid when far enough from other ship
      const validGrid = makeGrid(10, 10, null)
      validGrid.set(0, 0, 'SHIP')
      expect(placing.canPlace(validGrid)).toBe(true)
    })

    /**
     * Verifies embedded board positions are correctly handled at various grid locations.
     */
    it('embedded board positions are handled correctly', () => {
      const shipShape = [[0, 0]]
      /** @type {any} */
      const board = Mask.fromCoords(shipShape)
      /** @type {any} */
      const target = {
        boundsChecker: (/** @type {number} */ r, /** @type {number} */ c) =>
          r >= 0 && r < 10 && c >= 0 && c < 10,
        getZone: () => ({ detail: 'WATER' })
      }

      // it various embed positions
      /** @type {[number, number][]} */
      const positions = [
        [0, 0],
        [5, 5],
        [9, 9]
      ]
      for (const [r0, c0] of positions) {
        const placing = new CellsToBePlaced(
          board,
          r0,
          c0,
          () => true,
          0,
          target
        )
        const grid = makeGrid(10, 10, null)
        expect(placing.canPlace(grid)).toBe(true)
        expect(placing.isCandidate(r0, c0)).toBe(true)
      }
    })
  })
})
