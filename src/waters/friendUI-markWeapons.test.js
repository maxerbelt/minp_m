import { FriendUI } from './friendUI.js'
import { GridBoard } from './gridBoard.js'
import { jest } from '@jest/globals'

describe('FriendUI - markFleetWeapons', () => {
  let friendUI
  let mockShips
  let mockMap

  beforeEach(() => {
    friendUI = new FriendUI()

    // Mock the board and grid cells
    const boardDiv = document.createElement('div')
    boardDiv.id = 'friend-board'
    document.body.appendChild(boardDiv)
    friendUI.grid = GridBoard.create('friend')

    // Create mock cells
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cell = document.createElement('div')
        cell.id = `friend-cell-${r}-${c}`
        cell.dataset.r = r
        cell.dataset.c = c
        boardDiv.appendChild(cell)
      }
    }

    // Mock gridCellAt
    friendUI.gridCellAt = jest.fn((r, c) => {
      return boardDiv.querySelector(`[data-r="${r}"][data-c="${c}"]`)
    })

    friendUI.grid.nodeAt = jest.fn((r, c) => {
      return boardDiv.querySelector(`[data-r="${r}"][data-c="${c}"]`)
    })

    friendUI.grid.node = jest.fn((r, c) => {
      return boardDiv.querySelector(`[data-r="${r}"][data-c="${c}"]`)
    })
    mockMap = {
      rows: 9,
      cols: 18
    }
   
    friendUI.grid._map = mockMap
    // Create mock ships with weapons at specific positions
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

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('should add weapon class to cells with weapons', () => {
    friendUI.grid.markFleetWeapons(mockShips )

    // Check that cells with weapons have the 'weapon' class
    const cell_0_0 = friendUI.gridCellAt(0, 0)
    const cell_2_0 = friendUI.gridCellAt(0, 2)
    const cell_0_1 = friendUI.gridCellAt(1, 0)

    expect(cell_0_0.classList.contains('weapon')).toBe(true)
    expect(cell_2_0.classList.contains('weapon')).toBe(true)
    expect(cell_0_1.classList.contains('weapon')).toBe(true)
  })

  it('should not add weapon class to cells without weapons', () => {
    friendUI.grid.markFleetWeapons(mockShips )

    // Check that cells without weapons don't have the 'weapon' class
    const cell_1_0 = friendUI.gridCellAt(0, 1) // Ship 1 cell without weapon
    const cell_1_1 = friendUI.gridCellAt(1, 1) // Ship 3 cells (no weapons)
    const cell_1_2 = friendUI.gridCellAt(2, 1)
    const cell_1_3 = friendUI.gridCellAt(3, 1)

    expect(cell_1_0.classList.contains('weapon')).toBe(false)
    expect(cell_1_1.classList.contains('weapon')).toBe(false)
    expect(cell_1_2.classList.contains('weapon')).toBe(false)
    expect(cell_1_3.classList.contains('weapon')).toBe(false)
  })

  it('should handle null ships gracefully', () => {
    expect(() => {
      friendUI.grid.markFleetWeapons(null)
    }).not.toThrow()
  })

  it('should handle ships with no cells', () => {
    const shipsNoCells = [
      { id: 'ship-1', rackAt: jest.fn(() => null) }
      // No cells property
    ]

    expect(() => {
      friendUI.grid.markFleetWeapons(shipsNoCells)
    }).not.toThrow()
  })

  it('should only call gridCellAt for cells with weapons', () => {
    friendUI.grid.markFleetWeapons(mockShips)
    // gridCellAt should be called for cells with weapons only
    // Ship 1: 3 cells, 2 with weapons
    // Ship 2: 2 cells, 1 with weapons
    // Ship 3: 3 cells, 0 with weapons
    // Total: 3 calls (2 + 1 + 0)
    expect(friendUI.grid.node).toHaveBeenCalledTimes(3)
  })
})
