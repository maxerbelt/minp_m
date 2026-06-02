/**
 * @fileoverview Tests for FriendUI weapon marking functionality
 * Validates that weapon cells are correctly identified and marked on the game board
 * @module friendUI-markWeapons.test
 * @requires @jest/globals
 * @requires src/waters/friendUI.js
 * @requires src/waters/gridBoard.js
 */

import { FriendUI } from './friendUI.js'
import { GridBoard } from './gridBoard.js'
import { jest } from '@jest/globals'

/**
 * @typedef {Object} MockWeapon
 * @property {string} letter - Weapon identifier letter
 */

/**
 * @typedef {Object} MockWeaponRack
 * @property {MockWeapon} weapon - Weapon information
 * @property {number} ammo - Ammo count
 */

/**
 * @typedef {Object} MockCell
 * @property {number} 0 - Row coordinate
 * @property {number} 1 - Column coordinate
 */

/**
 * @typedef {Object} MockShip
 * @property {string} id - Ship unique identifier
 * @property {string} letter - Ship letter designation
 * @property {MockCell[]} cells - Array of cell coordinates occupied by ship
 * @property {Function} rackAt - Returns weapon rack at position or null
 */

/**
 * @typedef {Object} MockMap
 * @property {number} rows - Number of board rows
 * @property {number} cols - Number of board columns
 */

/**
 * Test suite for FriendUI weapon marking.
 * Validates that weapon cells are correctly identified and marked during game setup.
 * Tests include single weapons per ship, multi-weapon configuration, null handling, and edge cases.
 *
 * @suite FriendUI Weapon Marking
 */
describe('FriendUI - markFleetWeapons', () => {
  /** @type {FriendUI} Friendly UI instance under test */
  let friendUI
  /** @type {MockShip[]} Array of mock ships with weapons configuration */
  let mockShips
  /** @type {MockMap} Mock game map with dimensions */
  let mockMap

  /**
   * Setup test environment before each test.
   * Initializes FriendUI with mock board, cells, grid, and ship configurations.
   * Creates 4x4 cell grid with mock ship data for weapon marking tests.
   *
   * @returns {void}
   */
  beforeEach(() => {
    /** @type {FriendUI} Initialize friendly UI for test */
    friendUI = new FriendUI()

    // Mock the board and grid cells
    /** @type {HTMLElement} Mock board element */
    const boardDiv = document.createElement('div')
    boardDiv.id = 'friend-board'
    document.body.appendChild(boardDiv)
    friendUI.grid = GridBoard.create('friend')

    // Create mock cells
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        /** @type {HTMLElement} Mock board cell */
        const cell = document.createElement('div')
        cell.id = `friend-cell-${r}-${c}`
        cell.dataset.r = r
        cell.dataset.c = c
        boardDiv.appendChild(cell)
      }
    }

    // Mock gridCellAt
    /** @type {jest.Mock<HTMLElement>} Mock grid cell accessor */
    friendUI.gridCellAt = jest.fn((r, c) => {
      return boardDiv.querySelector(`[data-r="${r}"][data-c="${c}"]`)
    })

    /** @type {jest.Mock<HTMLElement>} Mock node accessor by coordinates */
    friendUI.grid.nodeAt = jest.fn((x, y) => {
      return boardDiv.querySelector(`[data-r="${y}"][data-c="${x}"]`)
    })

    /** @type {jest.Mock<HTMLElement>} Mock node accessor */
    friendUI.grid.node = jest.fn((x, y) => {
      return boardDiv.querySelector(`[data-r="${y}"][data-c="${x}"]`)
    })
    /** @type {MockMap} Mock map configuration */
    mockMap = {
      rows: 9,
      cols: 18
    }

    /** @type {MockMap} Assign map to grid */
    friendUI.grid._map = mockMap
    // Create mock ships with weapons at specific positions
    /** @type {MockShip[]} Initialize mock ships array */
    mockShips = [
      {
        id: 'ship-1',
        letter: 'A',
        cells: [
          [0, 0],
          [1, 0],
          [2, 0]
        ],
        rackAt: jest.fn((column, row) => {
          // Weapon at position (0, 0) and (2, 0)
          if ((column === 0 && row === 0) || (column === 2 && row === 0)) {
            return { weapon: { letter: 'X' }, ammo: 5 }
          }
          return null
        })
      },
      {
        id: 'ship-2',
        letter: 'B',
        cells: [
          [0, 1],
          [0, 2]
        ],
        rackAt: jest.fn((column, row) => {
          // Weapon at position (0, 1)
          if (column === 0 && row === 1) {
            return { weapon: { letter: 'Y' }, ammo: 3 }
          }
          return null
        })
      },
      {
        id: 'ship-3',
        letter: 'C',
        cells: [
          [1, 1],
          [1, 2],
          [1, 3]
        ],
        rackAt: jest.fn(() => null) // No weapons
      }
    ]
  })

  /**
   * Cleanup test environment after each test.
   * Removes all DOM elements created during test execution.
   *
   * @returns {void}
   */
  afterEach(() => {
    document.body.innerHTML = ''
  })

  /**
   * Test: Cells with weapons receive 'weapon' class marker.
   * Validates that markFleetWeapons() correctly identifies and marks cells
   * that contain weapons from the mock ship fleet.
   * Checks: Cell (0,0), Cell (0,2), Cell (1,0) all marked with 'weapon' class.
   *
   * @returns {void}
   */
  it('should add weapon class to cells with weapons', () => {
    friendUI.grid.markFleetWeapons(mockShips)

    // Check that cells with weapons have the 'weapon' class
    /** @type {HTMLElement} Cell at row 0, col 0 (Ship 1 with weapon) */
    const cell_0_0 = friendUI.gridCellAt(0, 0)
    /** @type {HTMLElement} Cell at row 0, col 2 (Ship 1 with weapon) */
    const cell_2_0 = friendUI.gridCellAt(0, 2)
    /** @type {HTMLElement} Cell at row 1, col 0 (Ship 2 with weapon) */
    const cell_0_1 = friendUI.gridCellAt(1, 0)

    expect(cell_0_0.classList.contains('weapon')).toBe(true)
    expect(cell_2_0.classList.contains('weapon')).toBe(true)
    expect(cell_0_1.classList.contains('weapon')).toBe(true)
  })

  /**
   * Test: Cells without weapons do NOT receive 'weapon' class marker.
   * Validates that markFleetWeapons() correctly excludes cells that lack weapons
   * even when they belong to ships in the fleet.
   * Checks: Multiple cells from different ships verified negative.
   *
   * @returns {void}
   */
  it('should not add weapon class to cells without weapons', () => {
    friendUI.grid.markFleetWeapons(mockShips)

    // Check that cells without weapons don't have the 'weapon' class
    /** @type {HTMLElement} Cell at row 0, col 1 (Ship 1, no weapon here) */
    const cell_1_0 = friendUI.gridCellAt(0, 1) // Ship 1 cell without weapon (col 1, row 0)
    /** @type {HTMLElement} Cell at row 0, col 2 (Ship 2, no weapon here) */
    const cell_2_0 = friendUI.gridCellAt(2, 0) // Ship 2 cell without weapon (col 0, row 2)
    /** @type {HTMLElement} Cell at row 1, col 1 (Ship 3, no weapons) */
    const cell_3_1 = friendUI.gridCellAt(1, 1) // Ship 3 cells (no weapons)
    /** @type {HTMLElement} Cell at row 1, col 2 (Ship 3, no weapons) */
    const cell_3_2 = friendUI.gridCellAt(1, 2)

    expect(cell_1_0.classList.contains('weapon')).toBe(false)
    expect(cell_2_0.classList.contains('weapon')).toBe(false)
    expect(cell_3_1.classList.contains('weapon')).toBe(false)
    expect(cell_3_2.classList.contains('weapon')).toBe(false)
  })

  /**
   * Test: Null ships array handled without error.
   * Validates that markFleetWeapons() gracefully handles null input
   * without throwing exceptions.
   *
   * @returns {void}
   */
  it('should handle null ships gracefully', () => {
    expect(() => {
      friendUI.grid.markFleetWeapons(null)
    }).not.toThrow()
  })

  /**
   * Test: Ships without cells property handled gracefully.
   * Validates that markFleetWeapons() handles ships missing the cells property
   * without throwing exceptions.
   *
   * @returns {void}
   */
  it('should handle ships with no cells', () => {
    /** @type {Object[]} Array of ships with missing cells property */
    const shipsNoCells = [
      { id: 'ship-1', rackAt: jest.fn(() => null) }
      // No cells property
    ]

    expect(() => {
      friendUI.grid.markFleetWeapons(shipsNoCells)
    }).not.toThrow()
  })

  /**
   * Test: gridCellAt invoked only for cells with weapons.
   * Validates that markFleetWeapons() optimizes by only processing cells
   * that actually contain weapons (3 total: 2 from Ship 1, 1 from Ship 2).
   * Confirms no unnecessary DOM queries for empty cells.
   *
   * @returns {void}
   */
  it('should only call gridCellAt for cells with weapons', () => {
    friendUI.grid.markFleetWeapons(mockShips)
    // gridCellAt should be called for cells with weapons only
    // Ship 1: 3 cells, 2 with weapons
    // Ship 2: 2 cells, 1 with weapons
    // Ship 3: 3 cells, 0 with weapons
    // Total: 3 calls (2 + 1 + 0)
    /** @type {number} Expected call count for weapons across all ships */
    const expectedCalls = 3
    expect(friendUI.grid.node).toHaveBeenCalledTimes(expectedCalls)
  })
})
