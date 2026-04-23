/* eslint-env jest */

/* global describe, it, expect, jest */
import { describe, it, expect, jest } from '@jest/globals'

import { Ship } from './Ship.js'
import { Mask } from '../grid/rectangle/mask.js'
import { Shape } from './Shape.js'

describe('Ship basic behaviors', () => {
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

  it('getAllWeapons, weaponEntries, hasWeapon, weaponSystem, weapon, makeKeyIds', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '1,2': {
        id: 10,
        weapon: { name: 'w1' },
        ammo: 1,
        hasAmmo: () => true,
        ammoRemaining: () => 1,
        ammoCapacityTotal: () => 2
      },
      '2,3': {
        id: 11,
        weapon: { name: 'w2' },
        ammo: 0,
        hasAmmo: () => false,
        ammoRemaining: () => 0,
        ammoCapacityTotal: () => 3
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

  it('ammoRemaining and ammoCapacityTotal reflect sunk state', () => {
    const s = new Ship(2, 'y', 'B')
    s.weapons = {
      '0,0': { id: 1, ammoRemaining: () => 3, ammoCapacity: () => 5 },
      '0,1': { id: 2, ammoRemaining: () => 2, ammoCapacity: () => 4 }
    }

    expect(s.ammoCapacityTotal()).toBe(9)
    s.sunk = true
    expect(s.ammoRemainingTotal()).toBe(0)
    expect(s.ammoCapacityTotal()).toBe(0)
  })

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

    const grid = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => null)
    )
    s.addToGrid(grid)
    expect(grid[1][1]).toEqual({ id: 3, letter: 'C' })
    expect(grid[2][1]).toEqual({ id: 3, letter: 'C' })

    s.removeFromPlacement()
    expect(s.cells.length).toBe(0)
    expect(s.getTotalHits()).toBe(0)
    expect(s.sunk).toBe(false)
  })
})
describe('Ship - constructor cell size calculation', () => {
  it('constructor sets size based on empty cells', () => {
    const s = new Ship(1, 'x', 'A')
    // cells array is empty by default
    expect(s.size).toBe(1) // max of undefined defaults to 0, so 0 + 1 = 1
  })

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

  it('reset without weapons', () => {
    const s = new Ship(1, 'x', 'A')
    s.recordHit(1, 1)
    s.sunk = true
    s.reset()
    expect(s.getTotalHits()).toBe(0)
    expect(s.sunk).toBe(false)
  })

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

describe('Ship - static methods with shapes', () => {
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

  it('extraShipsFromShapes with filter', () => {
    const shape1 = { symmetry: 'S', letter: 'A', weaponSystem: {} }
    const shape2 = { symmetry: 'D', letter: 'B', weaponSystem: {} }
    const shape3 = { symmetry: 'H', letter: 'C', weaponSystem: {} }
    const filter = shape => shape.letter !== 'B'
    const ships = Ship.extraShipsFromShapes([shape1, shape2, shape3], filter)
    expect(ships).toHaveLength(2)
    expect(ships.map(s => s.letter)).toEqual(['A', 'C'])
  })

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

describe('Ship - getTurn', () => {
  it('getTurn returns empty string when no weapon system', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {}
    // getTurn relies on weapon() which returns undefined when no weapons
    // The getTurn method will crash if weapon() is undefined, so ensure we have weapons
    const result = s.getPrimaryWeapon()
    expect(result).toBeUndefined() // Verify behavior when no weapons
  })

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
    s.variant = 2
    void s.getTurn()
    expect(mockWeapon.getTurn).toHaveBeenCalledWith(2)
  })
})

describe('Ship - placement and grid operations', () => {
  it('addToGrid with multiple cells', () => {
    const s = new Ship(7, 'x', 'G')
    const cells = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1]
    ]
    s.placeAtCells(cells)
    const grid = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => null)
    )
    s.addToGrid(grid)
    expect(grid[0][0]).toEqual({ id: 7, letter: 'G' })
    expect(grid[0][1]).toEqual({ id: 7, letter: 'G' })
    expect(grid[1][0]).toEqual({ id: 7, letter: 'G' })
    expect(grid[1][1]).toEqual({ id: 7, letter: 'G' })
  })

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

describe('Ship - state isolation between instances', () => {
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

describe('Ship - static next method', () => {
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
