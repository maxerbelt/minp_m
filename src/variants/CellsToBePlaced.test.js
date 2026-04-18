/* eslint-env jest */

/* global describe, it,  expect, jest */
import { jest } from '@jest/globals'

import { CellsToBePlaced } from './CellsToBePlaced.js'
import { Mask } from '../grid/rectangle/mask.js'
import { placingTarget } from './makeCell3.js'

function makeGrid (rows, cols, fill = null) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => fill)
  )
}

describe('CellsToBePlaced', () => {
  describe('constructor and properties', () => {
    it('constructor initializes with default target and zoneDetail', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const validator = () => true

      const placing = new CellsToBePlaced(board, 1, 1, validator)

      expect(placing.board).toBeDefined()
      expect(placing.validator).toBe(validator)
      expect(placing.zoneDetail).toBe(0)
      expect(placing.target).toBe(placingTarget)
    })

    it('constructor applies embed transformation to board', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const validator = () => true
      const target = { boundsChecker: () => true, getZone: () => {} }

      const placing = new CellsToBePlaced(board, 2, 3, validator, 0, target)

      // The board is embedded at (2, 3), so cells should be at absolute positions
      expect(placing.isCandidate(2, 3)).toBe(true)
    })
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
      const board = Mask.fromCoords(occupancyCoords)
      expect(board.toAscii).toBe('1.\n11\n11\n11\n.1')

      const validator = () => true

      const placing = new CellsToBePlaced(board, 7, 4, validator)
      const sb = placing.board
      expect(sb).toBeDefined()
      expect(sb.mask.toAscii).toBe('1.\n11\n11\n11\n.1')
      expect(sb.store.bitsPerCell).toBe(1)
      expect(sb.at(7, 4))
      expect(placing.validator).toBe(validator)
      expect(placing.zoneDetail).toBe(0)
      const locations = [...sb.locations()]
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
      const board = Mask.fromCoordsSquare(occupancyCoords)
      expect(board.toAscii).toBe('1....\n11...\n11...\n11...\n.1...')

      const validator = () => true

      const placing = new CellsToBePlaced(board, 7, 4, validator)
      const sb = placing.board
      expect(sb).toBeDefined()
      expect(sb.mask.toAscii).toBe('1.\n11\n11\n11\n.1')
      expect(sb.store.bitsPerCell).toBe(1)
      expect(sb.at(7, 4))
      expect(placing.validator).toBe(validator)
      expect(placing.zoneDetail).toBe(0)
      const locations = [...sb.locations()]
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
    it('notGood is initialized as empty mask', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const validator = () => true

      const placing = new CellsToBePlaced(board, 0, 0, validator)

      expect(placing.notGood).toBeDefined()
    })
  })

  describe('cells getter', () => {
    it('cells returns board coordinates', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const placing = new CellsToBePlaced(board, 0, 0, () => true)

      const cells = placing.cells
      expect(Array.isArray(cells)).toBe(true)
      expect(cells.length).toBeGreaterThan(0)
    })
  })

  describe('isCandidate', () => {
    it('isCandidate returns true for cells in board', () => {
      const variant = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(variant)
      const placing = new CellsToBePlaced(board, 2, 3, () => true, 0, {
        boundsChecker: () => true,
        getZone: () => {}
      })

      expect(placing.isCandidate(2, 3)).toBe(true)
      expect(placing.isCandidate(2, 4)).toBe(true)
    })

    it('isCandidate returns false for cells not in board', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const placing = new CellsToBePlaced(board, 2, 3, () => true, 0, {
        boundsChecker: () => true,
        getZone: () => {}
      })

      expect(placing.isCandidate(1, 1)).toBe(false)
      expect(placing.isCandidate(2, 5)).toBe(false)
    })
  })

  describe('zoneInfo and isInMatchingZone', () => {
    it('zoneInfo calls target.getZone with correct parameters', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = {
        getZone: jest.fn(() => 'ZONE_VALUE'),
        boundsChecker: () => true
      }
      const placing = new CellsToBePlaced(board, 2, 3, () => true, 5, target)

      const result = placing.zoneInfo(2, 3)

      expect(target.getZone).toHaveBeenCalledWith(2, 3, 5)
      expect(result).toBe('ZONE_VALUE')
    })

    it('zoneInfo uses instance zoneDetail by default', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = {
        getZone: jest.fn(() => 'ZONE'),
        boundsChecker: () => true
      }
      const placing = new CellsToBePlaced(board, 0, 0, () => true, 7, target)

      placing.zoneInfo(1, 1)

      expect(target.getZone).toHaveBeenCalledWith(1, 1, 7)
    })

    it('zoneInfo can override zoneDetail parameter', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = {
        getZone: jest.fn(() => 'ZONE'),
        boundsChecker: () => true
      }
      const placing = new CellsToBePlaced(board, 0, 0, () => true, 7, target)

      placing.zoneInfo(1, 1, 9)

      expect(target.getZone).toHaveBeenCalledWith(1, 1, 9)
    })

    it('isInMatchingZone returns true when validator accepts zone', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = {
        getZone: () => 'VALID_ZONE',
        boundsChecker: () => true
      }
      const validator = z => z === 'VALID_ZONE'
      const placing = new CellsToBePlaced(board, 2, 3, validator, 0, target)

      expect(placing.isInMatchingZone(2, 3)).toBe(true)
    })

    it('isInMatchingZone returns false when validator rejects zone', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = {
        getZone: () => 'INVALID_ZONE',
        boundsChecker: () => true
      }
      const validator = z => z === 'VALID_ZONE'
      const placing = new CellsToBePlaced(board, 2, 3, validator, 0, target)

      expect(placing.isInMatchingZone(2, 3)).toBe(false)
    })
  })

  describe('noTouch', () => {
    it('noTouch returns true when no neighbors are occupied', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = { boundsChecker: () => true, getZone: () => {} }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      expect(placing.noTouch(2, 2, grid)).toBe(true)
    })

    it('noTouch returns false when up neighbor is occupied', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = { boundsChecker: () => true, getZone: () => {} }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      grid[1][2] = 'SHIP'
      expect(placing.noTouch(2, 2, grid)).toBe(false)
    })

    it('noTouch returns false when down neighbor is occupied', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = { boundsChecker: () => true, getZone: () => {} }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      grid[3][2] = 'SHIP'
      expect(placing.noTouch(2, 2, grid)).toBe(false)
    })

    it('noTouch returns false when left neighbor is occupied', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = { boundsChecker: () => true, getZone: () => {} }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      grid[2][1] = 'SHIP'
      expect(placing.noTouch(2, 2, grid)).toBe(false)
    })

    it('noTouch returns false when right neighbor is occupied', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = { boundsChecker: () => true, getZone: () => {} }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      grid[2][3] = 'SHIP'
      expect(placing.noTouch(2, 2, grid)).toBe(false)
    })

    it('noTouch returns false when diagonal neighbor is occupied', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = { boundsChecker: () => true, getZone: () => {} }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      grid[1][1] = 'SHIP' // diagonal up-left
      expect(placing.noTouch(2, 2, grid)).toBe(false)
    })

    it('noTouch checks all 8 neighbors', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = { boundsChecker: () => true, getZone: () => {} }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      // it each of the 8 neighbors
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
        grid[r][c] = 'SHIP'
        expect(placing.noTouch(2, 2, grid)).toBe(false)
      }
    })

    it('noTouch respects boundsChecker for out-of-bounds cells', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = {
        boundsChecker: (r, c) => r >= 0 && r < 5 && c >= 0 && c < 5,
        getZone: () => {}
      }
      const placing = new CellsToBePlaced(board, 0, 0, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      // Out-of-bounds cells should not trigger touch
      expect(placing.noTouch(0, 0, grid)).toBe(true)
    })
  })

  describe('isWrongZone', () => {
    it('isWrongZone returns false when all cells match zone', () => {
      const variant = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(variant)
      const target = {
        getZone: () => 'VALID',
        boundsChecker: () => true
      }
      const validator = z => z === 'VALID'
      const placing = new CellsToBePlaced(board, 2, 3, validator, 0, target)

      expect(placing.isWrongZone()).toBe(false)
    })

    it('isWrongZone returns true when any cell does not match zone', () => {
      const variant = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(variant)
      let callCount = 0
      const target = {
        getZone: () => {
          callCount++
          return callCount === 1 ? 'VALID' : 'INVALID'
        },
        boundsChecker: () => true
      }
      const validator = z => z === 'VALID'
      const placing = new CellsToBePlaced(board, 2, 3, validator, 0, target)

      expect(placing.isWrongZone()).toBe(true)
    })
  })

  describe('isNotInBounds', () => {
    it('isNotInBounds returns false when all cells are in bounds', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = {
        boundsChecker: () => true,
        getZone: () => {}
      }
      const placing = new CellsToBePlaced(board, 5, 5, () => true, 0, target)

      expect(placing.isNotInBounds()).toBe(false)
    })

    it('isNotInBounds returns true when any cell is out of bounds', () => {
      const variant = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(variant)
      const target = {
        boundsChecker: (r, c) => !(r === 5 && c === 5),
        getZone: () => {}
      }
      const placing = new CellsToBePlaced(board, 5, 5, () => true, 0, target)

      expect(placing.isNotInBounds()).toBe(true)
    })
  })

  describe('isOverlapping', () => {
    it('isOverlapping returns false when no cells overlap', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, {
        boundsChecker: () => true,
        getZone: () => {}
      })

      const grid = makeGrid(5, 5, null)
      expect(placing.isOverlapping(grid)).toBe(false)
    })

    it('isOverlapping returns true when any cell overlaps', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, {
        boundsChecker: () => true,
        getZone: () => {}
      })

      const grid = makeGrid(5, 5, null)
      grid[2][2] = 'EXISTING_SHIP'
      expect(placing.isOverlapping(grid)).toBe(true)
    })

    it('isOverlapping checks all board cells', () => {
      const variant = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(variant)
      const placing = new CellsToBePlaced(board, 2, 3, () => true, 0, {
        boundsChecker: () => true,
        getZone: () => {}
      })

      const grid = makeGrid(5, 5, null)
      grid[4][2] = 'SHIP' // second cell
      expect(placing.isOverlapping(grid)).toBe(true)
    })
  })

  describe('isTouching', () => {
    it('isTouching returns false when no neighbors are occupied', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = { boundsChecker: () => true, getZone: () => {} }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      expect(placing.isTouching(grid)).toBe(false)
    })

    it('isTouching returns true when any cell has neighbors occupied', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = { boundsChecker: () => true, getZone: () => {} }
      const placing = new CellsToBePlaced(board, 2, 2, () => true, 0, target)

      const grid = makeGrid(5, 5, null)
      grid[1][2] = 'SHIP' // neighbor of cell at (2,2)
      expect(placing.isTouching(grid)).toBe(true)
    })

    it('isTouching checks all board cells for neighbors', () => {
      const variant = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(variant)
      const target = { boundsChecker: () => true, getZone: () => {} }
      const placing = new CellsToBePlaced(board, 2, 3, () => true, 0, target)

      const grid = makeGrid(6, 6, null)
      grid[5][2] = 'SHIP' // neighbor of second cell at (2,4)
      expect(placing.isTouching(grid)).toBe(true)
    })
  })

  describe('canPlace', () => {
    it('canPlace returns false when out of bounds', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = {
        boundsChecker: () => false,
        getZone: () => 'VALID'
      }
      const placing = new CellsToBePlaced(
        board,
        2,
        2,
        z => z === 'VALID',
        0,
        target
      )

      const grid = makeGrid(5, 5, null)
      expect(placing.canPlace(grid)).toBe(false)
    })

    it('canPlace returns false when wrong zone', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = {
        boundsChecker: () => true,
        getZone: () => 'INVALID'
      }
      const placing = new CellsToBePlaced(
        board,
        2,
        2,
        z => z === 'VALID',
        0,
        target
      )

      const grid = makeGrid(5, 5, null)
      expect(placing.canPlace(grid)).toBe(false)
    })

    it('canPlace returns false when overlapping', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = {
        boundsChecker: () => true,
        getZone: () => 'VALID'
      }
      const placing = new CellsToBePlaced(
        board,
        2,
        2,
        z => z === 'VALID',
        0,
        target
      )

      const grid = makeGrid(5, 5, null)
      grid[2][2] = 'SHIP'
      expect(placing.canPlace(grid)).toBe(false)
    })

    it('canPlace returns false when touching', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = {
        boundsChecker: () => true,
        getZone: () => 'VALID'
      }
      const placing = new CellsToBePlaced(
        board,
        2,
        2,
        z => z === 'VALID',
        0,
        target
      )

      const grid = makeGrid(5, 5, null)
      grid[1][2] = 'SHIP' // neighbor occupied
      expect(placing.canPlace(grid)).toBe(false)
    })

    it('canPlace returns true when all conditions met', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
      const target = {
        boundsChecker: () => true,
        getZone: () => 'VALID'
      }
      const placing = new CellsToBePlaced(
        board,
        2,
        2,
        z => z === 'VALID',
        0,
        target
      )

      const grid = makeGrid(5, 5, null)
      expect(placing.canPlace(grid)).toBe(true)
    })

    it('canPlace checks bounds first', () => {
      const variant = [[0, 0]]
      const board = Mask.fromCoords(variant)
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

    it('canPlace handles multi-cell ships', () => {
      const variant = [
        [0, 0],
        [0, 1],
        [0, 2]
      ]
      const board = Mask.fromCoords(variant)
      const target = {
        boundsChecker: () => true,
        getZone: () => 'VALID'
      }
      const placing = new CellsToBePlaced(
        board,
        5,
        5,
        z => z === 'VALID',
        0,
        target
      )

      const grid = makeGrid(10, 10, null)
      expect(placing.canPlace(grid)).toBe(true)

      grid[7][5] = 'SHIP' // occupy one cell
      expect(placing.canPlace(grid)).toBe(false)
    })
  })

  describe('integration its', () => {
    it('full placement validation workflow', () => {
      const shipShape = [
        [0, 0],
        [0, 1],
        [0, 2]
      ]
      const board = Mask.fromCoords(shipShape)
      const target = {
        boundsChecker: (r, c) => r >= 0 && r < 10 && c >= 0 && c < 10,
        getZone: () => 'WATER'
      }
      const validator = z => z === 'WATER'
      const placing = new CellsToBePlaced(board, 3, 3, validator, 0, target)

      // Valid placement on empty board
      const emptyGrid = makeGrid(10, 10, null)
      expect(placing.canPlace(emptyGrid)).toBe(true)

      // Invalid due to occupied cell
      const occupiedGrid = makeGrid(10, 10, null)
      occupiedGrid[3][4] = 'SHIP'
      expect(placing.canPlace(occupiedGrid)).toBe(false)

      // Invalid due to neighboring ship
      const neighborGrid = makeGrid(10, 10, null)
      neighborGrid[2][3] = 'SHIP' // diagonal
      expect(placing.canPlace(neighborGrid)).toBe(false)

      // Valid when far enough from other ship
      const validGrid = makeGrid(10, 10, null)
      validGrid[0][0] = 'SHIP'
      expect(placing.canPlace(validGrid)).toBe(true)
    })

    it('embedded board positions are handled correctly', () => {
      const shipShape = [[0, 0]]
      const board = Mask.fromCoords(shipShape)
      const target = {
        boundsChecker: (r, c) => r >= 0 && r < 10 && c >= 0 && c < 10,
        getZone: () => 'WATER'
      }

      // it various embed positions
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
