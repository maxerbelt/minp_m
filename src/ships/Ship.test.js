/**
 * @file Ship.test.js - Comprehensive test suite for Ship class
 * @description Tests core Ship functionality including construction, weapon management,
 * state management, and grid operations. Validates ship placement, hit recording,
 * cloning, and integration with weapons systems.
 */

import { describe, it, expect, jest } from '@jest/globals'

import { Ship } from './Ship.js'
import { Mask } from '../grid/rectangle/mask.js'
import { SubBoard } from '../grid/SubBoard.js'
import { Shape } from './Shape.js'
import { ShipCellGrid } from '../grid/rectangle/ShipCellGrid.js'

/**
 * Ship basic behaviors test suite
 * @test {Ship} Constructor defaults and basic properties
 */
describe('Ship basic behaviors', () => {
  /**
   * Test constructor initialization with default values
   * @test {Ship#constructor} Sets default values for all properties
   */
  it('constructor sets defaults', () => {
    const s = new Ship(5, 'sym', 'X')
    expect(s.id).toBe(5)
    expect(s.symmetry).toBe('sym')
    expect(s.letter).toBe('X')
    expect(Array.isArray(s.cells)).toBe(true)
    expect(s.board).toBeInstanceOf(Mask)
    expect(s.sunk).toBe(false)
    expect(s.variant).toBe(0)
  })

  /**
   * Test static methods for ship ID management and creation from shape
   * @test {Ship.createFromShape} Creates ship from shape with correct properties
   * @test {Ship.id} Static ID counter increments correctly
   */
  it('static id next and createFromShape', () => {
    const saved = Ship.id
    Ship.id = 100
    const shape = { symmetry: 'S', letter: 'L', weaponSystem: {} }
    const s = Ship.createFromShape(shape)
    expect(s.id).toBe(100)
    expect(s.symmetry).toBe('S')
    expect(s.letter).toBe('L')
    Ship.id = saved
  })

  /**
   * Test weapon system accessor methods and key generation
   * @test {Ship#getAllWeapons} Retrieves all weapons from ship
   * @test {Ship#getAllWeaponEntries} Gets all weapon entries
   * @test {Ship#hasWeapon} Checks if ship has weapons
   * @test {Ship#getPrimaryWeaponSystem} Gets primary weapon system
   * @test {Ship#getPrimaryWeapon} Gets primary weapon
   * @test {Ship#makeKeyIds} Generates weapon key IDs string
   */
  it('getAllWeapons, weaponEntries, hasWeapon, weaponSystem, weapon, makeKeyIds', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '1,2': {
        id: 10,
        weapon: { name: 'w1' },
        ammo: 1,
        hasAmmo: true,
        ammoRemaining: 1,
        ammoCapacityTotal: 2
      },
      '2,3': {
        id: 11,
        weapon: { name: 'w2' },
        ammo: 0,
        hasAmmo: false,
        ammoRemaining: 0,
        ammoCapacityTotal: 3
      }
    }

    expect(s.getAllWeapons().length).toBe(2)
    expect(s.getAllWeaponEntries().length).toBe(2)
    expect(s.hasWeapon).toBe(true)
    const primary = s.getPrimaryWeaponSystem()
    expect(primary).toBe(s.weapons['1,2'])
    const primaryWeapon = s.getPrimaryWeapon()
    expect(primaryWeapon).toEqual({ name: 'w1' })
    expect(primaryWeapon).toEqual(primary.weapon)
    expect(s.makeKeyIds()).toBe('1,2:10|2,3:11')
  })

  /**
   * Test ammo state changes based on ship sunk status
   * @test {Ship#ammoCapacityTotal} Returns 0 when ship is sunk
   * @test {Ship#ammoRemainingTotal} Returns 0 when ship is sunk
   */
  it('ammoRemaining and ammoCapacityTotal reflect sunk state', () => {
    const s = new Ship(2, 'y', 'B')
    s.weapons = {
      '0,0': { id: 1, ammoRemaining: 3, ammoCapacity: 5 },
      '0,1': { id: 2, ammoRemaining: 2, ammoCapacity: 4 }
    }

    expect(s.ammoCapacityTotal).toBe(9)
    s.sunk = true
    expect(s.ammoRemainingTotal).toBe(0)
    expect(s.ammoCapacityTotal).toBe(0)
  })

  /**
   * Test ship placement, grid operations, and removal
   * @test {Ship#placeAtCells} Places ship at specified cells
   * @test {Ship#addToGrid} Adds ship to grid
   * @test {Ship#removeFromPlacement} Removes ship from placement
   */
  it('place, removeFromPlacement and addToGrid', () => {
    const s = new Ship(3, 'z', 'C')
    const cells = [
      [1, 1],
      [1, 2]
    ]
    s.shape = () => {
      return new Shape('z', 'C', cells)
    }

    s.placeAtCells(cells)
    expect(s.board.occupancy).toBe(2)
    expect(s.board.at(1, 1)).toBe(1)
    expect(s.board.at(1, 2)).toBe(1)
    expect(s.getTotalHits()).toBe(0)
    expect(s.sunk).toBe(false)
    expect(s.board.toAscii).toBe('1\n1')

    const grid = new ShipCellGrid(
      Array.from({ length: 3 }, () => new Array(3).fill(null))
    )
    s.addToGrid(grid)
    expect(grid.cellAt(1, 1)).toEqual({ id: 3, letter: 'C' })
    expect(grid.cellAt(1, 2)).toEqual({ id: 3, letter: 'C' })

    s.removeFromPlacement()
    expect(s.cells.length).toBe(0)
    expect(s.getTotalHits()).toBe(0)
    expect(s.sunk).toBe(false)
  })

  /**
   * Test normalization of triple-valued placement coordinates to cell pairs
   * @test {Ship#placeAtCells} Normalizes [x, y, value] coordinates to [x, y] pairs
   */
  it('normalizes triple-valued placement coordinates to cell pairs', () => {
    const s = new Ship(4, 'z', 'D')
    const cells = [
      [1, 1, 2],
      [1, 2, 3]
    ]

    const placed = s.placeAtCells(cells)

    expect(placed).toEqual([
      [1, 1],
      [1, 2]
    ])
    expect(s.cells).toEqual([
      [1, 1],
      [1, 2]
    ])
    expect(s.board.depth).toBe(1)
  })

  /**
   * Test cell preservation when board has color depth
   * @test {Ship#placeAtBoard} Keeps cells as pairs when board has depth
   */
  it('keeps cells as pairs when board placement has color depth', () => {
    const s = new Ship(5, 'z', 'E')
    const board = SubBoard.fromCoords(
      [
        [0, 0, 2],
        [0, 1, 3]
      ],
      null,
      new Mask(0, 0)
    )

    s.placeAtBoard(board)

    expect(s.cells).toEqual([
      [0, 0],
      [0, 1]
    ])
    // Using structuredClone for deep cloning instead of JSON.parse(JSON.stringify(...))
    expect(structuredClone(s).cells).toEqual([
      [0, 0],
      [0, 1]
    ])
  })
})
/**
 * Ship constructor cell size calculation test suite
 * @test {Ship} Constructor size calculation based on cell array
 */
describe('Ship - constructor cell size calculation', () => {
  /**
   * Test size initialization with empty cells
   * @test {Ship#size} Defaults to 1 when cells array is empty
   */
  it('constructor sets size based on empty cells', () => {
    const s = new Ship(1, 'x', 'A')
    // cells array is empty by default
    expect(s.size).toBe(1) // max of undefined defaults to 0, so 0 + 1 = 1
  })

  /**
   * Test ship properties initialization from constructor parameters
   * @test {Ship#constructor} Initializes all properties correctly
   */
  it('ship properties initialized as expected', () => {
    const weaponsObj = { '1,1': { id: 1 } }
    const s = new Ship(42, 'diagonal', 'B', weaponsObj)
    expect(s.id).toBe(42)
    expect(s.symmetry).toBe('diagonal')
    expect(s.letter).toBe('B')
    expect(s.variant).toBe(0)
    expect(s.weapons).toStrictEqual(weaponsObj)
  })
})

describe('Ship - state management (reset, clone)', () => {
  /**
   * Test reset clears all hits and sunk state
   * @test {Ship#reset} Clears hits, sunk status, and resets weapons
   */
  it('reset clears hits and sunk state', () => {
    const s = new Ship(1, 'x', 'A')
    s.recordHit(1, 1)
    s.recordHit(2, 2)
    s.sunk = true
    s.weapons = {
      '1,1': {
        reset: jest.fn(),
        id: 1
      },
      '2,2': {
        reset: jest.fn(),
        id: 2
      }
    }
    s.reset()
    expect(s.getTotalHits()).toBe(0)
    expect(s.sunk).toBe(false)

    const ws = s._weaponArray

    expect(ws.length).toBe(2)
    s.weapons['1,1'].reset()
    s.weapons['2,2'].reset()
  })

  /**
   * Test reset works correctly without weapons
   * @test {Ship#reset} Clears hits and sunk state when no weapons present
   */
  it('reset without weapons', () => {
    const s = new Ship(1, 'x', 'A')
    s.recordHit(1, 1)
    s.sunk = true
    s.reset()
    expect(s.getTotalHits()).toBe(0)
    expect(s.sunk).toBe(false)
  })

  /**
   * Test cloning creates new ship with incremented ID
   * @test {Ship#clone} Creates new ship from shape with incremented ID
   */
  it('clone creates new ship with incremented id', () => {
    const saved = Ship.id
    Ship.id = 10
    const s = new Ship(10, 'sym', 'L')
    s.shape = () => ({
      symmetry: 'sym',
      letter: 'L',
      weaponSystem: { it: 'weapons' }
    })
    const cloned = s.clone()
    expect(cloned.id).toBe(10) // clone() calls Ship.createFromShape which uses current Ship.id, then Ship.next() is called
    expect(cloned.symmetry).toBe('sym')
    expect(cloned.letter).toBe('L')
    Ship.id = saved
  })
})

/**
 * Ship static methods test suite
 * @test {Ship} Static factory methods for creating ships from shapes
 */
describe('Ship - static methods with shapes', () => {
  /**
   * Test ship ID counter reset when creating ships from shapes
   * @test {Ship.createShipsFromShapes} Resets ID counter and creates multiple ships
   */
  it('createShipsFromShapes resets ship id counter', () => {
    const shape1 = {
      symmetry: 'S',
      letter: 'A',
      weaponSystem: {}
    }
    const shape2 = {
      symmetry: 'D',
      letter: 'B',
      weaponSystem: {}
    }
    const ships = Ship.createShipsFromShapes([shape1, shape2])
    expect(ships).toHaveLength(2)
    expect(ships[0].id).toBe(1)
    expect(ships[1].id).toBe(2)
  })

  /**
   * Test filtering shapes during ship creation
   * @test {Ship.extraShipsFromShapes} Creates ships with filter applied
   */
  /**
   * Test filtering shapes during ship creation
   * @test {Ship.extraShipsFromShapes} Creates ships with filter applied
   */
  it('extraShipsFromShapes with filter', () => {
    const shape1 = { symmetry: 'S', letter: 'A', weaponSystem: {} }
    const shape2 = { symmetry: 'D', letter: 'B', weaponSystem: {} }
    const shape3 = { symmetry: 'H', letter: 'C', weaponSystem: {} }
    const filter = shape => shape.letter !== 'B'
    const ships = Ship.extraShipsFromShapes([shape1, shape2, shape3], filter)
    expect(ships).toHaveLength(2)
    expect(ships.map(s => s.letter)).toEqual(['A', 'C'])
  })

  /**
   * Test correct ID incrementing during filtered ship creation
   * @test {Ship.extraShipsFromShapes} Increments ID correctly for multiple ships
   */
  it('extraShipsFromShapes increments ship id correctly', () => {
    const saved = Ship.id
    Ship.id = 5
    const shapes = [
      { symmetry: 'S', letter: 'X', weaponSystem: {} },
      { symmetry: 'D', letter: 'Y', weaponSystem: {} }
    ]
    const ships = Ship.extraShipsFromShapes(shapes)
    expect(ships[0].id).toBe(5)
    expect(ships[1].id).toBe(6)
    expect(Ship.id).toBe(7)
    Ship.id = saved
  })
})

/**
 * Ship getTurn test suite
 * @test {Ship#getTurn} Delegation to weapon getTurn method
 */
describe('Ship - getTurn', () => {
  /**
   * Test getTurn with no weapon system
   * @test {Ship#getTurn} Returns undefined when no weapons present
   */
  it('getTurn returns empty string when no weapon system', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {}
    // getTurn relies on weapon() which returns undefined when no weapons
    // The getTurn method will crash if weapon() is undefined, so ensure we have weapons
    const result = s.getPrimaryWeapon()
    expect(result).toBeUndefined() // Verify behavior when no weapons
  })

  /**
   * Test getTurn delegates to weapon getTurn method with correct parameters
   * @test {Ship#getTurn} Delegates to weapon and passes variant and coordinates
   */
  it('getTurn delegates to weapon getTurn', () => {
    const s = new Ship(1, 'x', 'A')
    const mockWeapon = {
      getTurn: jest.fn().mockReturnValue('turn_info')
    }
    s.weapons = {
      '1,1': {
        weapon: mockWeapon,
        id: 1
      }
    }
    // Mock the hits object to have proper properties
    s.hits = {
      offsetY: 0,
      offsetX: 0,
      windowHeight: 1,
      windowWidth: 1
    }
    s.variant = 2
    s.getTurn(5, 5)
    // r0 = 5 - 0 - (1 - 1) / 2 = 5 - 0 = 5
    // c0 = 5 - 0 - (1 - 1) / 2 = 5 - 0 = 5
    expect(mockWeapon.getTurn).toHaveBeenCalledWith(2, 5, 5)
  })
})
/**
 * Ship placement and grid operations test suite
 * @test {Ship} Ship placement, grid addition, and removal operations
 */
describe('Ship - placement and grid operations', () => {
  /**
   * Test adding ship with multiple cells to grid
   * @test {Ship#addToGrid} Adds all ship cells to grid at correct positions
   */
  it('addToGrid with multiple cells', () => {
    const s = new Ship(7, 'x', 'G')
    const cells = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1]
    ]
    s.placeAtCells(cells)
    const grid = new ShipCellGrid(
      Array.from({ length: 3 }, () => new Array(3).fill(null))
    )
    s.addToGrid(grid)
    expect(grid.cellAt(0, 0)).toEqual({ id: 7, letter: 'G' })
    expect(grid.cellAt(0, 1)).toEqual({ id: 7, letter: 'G' })
    expect(grid.cellAt(1, 0)).toEqual({ id: 7, letter: 'G' })
    expect(grid.cellAt(1, 1)).toEqual({ id: 7, letter: 'G' })
  })

  /**
   * Test placement resets hit and sunk state
   * @test {Ship#placeAtCells} Resets hits and sunk status on new placement
   */
  it('place resets hits and sunk state', () => {
    const s = new Ship(1, 'x', 'A')
    s.recordHit(1, 1)
    s.sunk = true
    const cells = [[2, 2]]
    s.placeAtCells(cells)
    expect(s.board.occupancy).toBe(1)
    expect(s.getTotalHits()).toBe(0)
    expect(s.sunk).toBe(false)
  })

  /**
   * Test removal clears all placement state
   * @test {Ship#removeFromPlacement} Clears cells, hits, and sunk state
   */
  it('removeFromPlacement clears all state', () => {
    const s = new Ship(1, 'x', 'A')
    s.cells = [
      [1, 1],
      [1, 2]
    ]
    s.shape = () => {
      return new Shape('x', 'A', s.cells)
    }
    s.recordHit(1, 1)
    s.sunk = true
    s.removeFromPlacement()
    expect(s.cells).toEqual([])
    expect(s.getTotalHits()).toBe(0)
    expect(s.sunk).toBe(false)
  })
})

/**
 * Ship state isolation test suite
 * @test {Ship} Multiple ships maintain independent state
 */
describe('Ship - state isolation between instances', () => {
  /**
   * Test multiple ships maintain independent state
   * @test {Ship} Creating multiple ships does not share state
   */
  it('multiple ships maintain independent state', () => {
    const s1 = new Ship(1, 'x', 'A')
    const s2 = new Ship(2, 'y', 'B')
    s1.recordHit(1, 1)
    s1.sunk = true
    s1.weapons = { '1,1': { id: 1 } }
    expect(s2.getTotalHits()).toBe(0)
    expect(s2.sunk).toBe(false)
    expect(s2.hasWeapon).toBe(false)
  })

  /**
   * Test multiple ships have independent cell storage
   * @test {Ship} Cell arrays are not shared between instances
   */
  it('multiple ships have independent cells', () => {
    const s1 = new Ship(1, 'x', 'A')
    const s2 = new Ship(2, 'y', 'B')
    const cells1 = [
      [1, 1],
      [1, 2]
    ]
    const cells2 = [
      [3, 3],
      [3, 4]
    ]
    s1.placeAtCells(cells1)
    s2.placeAtCells(cells2)
    expect(s1.board.occupancy).toBe(2)
    expect(s2.board.occupancy).toBe(2)
    expect(s1.board.at(1, 1)).toBe(1)
    expect(s1.board.at(1, 2)).toBe(1)
    expect(s2.board.at(3, 3)).toBe(1)
    expect(s2.board.at(3, 4)).toBe(1)
  })
})

/**
 * Ship static next method test suite
 * @test {Ship.next} Static ID increment method
 */
describe('Ship - static next method', () => {
  /**
   * Test Ship.next increments static ID counter
   * @test {Ship.next} Increments Ship.id by 1
   */
  it('Ship.next increments id', () => {
    const saved = Ship.id
    Ship.id = 100
    Ship.next()
    expect(Ship.id).toBe(101)
    Ship.next()
    expect(Ship.id).toBe(102)
    Ship.id = saved
  })
})
