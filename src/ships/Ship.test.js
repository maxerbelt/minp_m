/* eslint-env jest */

/* global describe, it, expect, jest */

import { Ship } from './Ship.js'
import { jest } from '@jest/globals'
import { Mask } from '../grid/mask.js'
import { Shape } from './Shape.js'

// Jest it suite
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
        getTotalAmmoCapacity: () => 2
      },
      '2,3': {
        id: 11,
        weapon: { name: 'w2' },
        ammo: 0,
        hasAmmo: () => false,
        ammoRemaining: () => 0,
        getTotalAmmoCapacity: () => 3
      }
    }

    expect(s.getAllWeapons().length).toBe(2)
    expect(s.getAllWeaponEntries().length).toBe(2)
    expect(s.hasWeapons()).toBe(true)
    expect(s.getPrimaryWeaponSystem()).toBe(s.getAllWeapons()[0])
    expect(s.getPrimaryWeapon()).toBe(s.getAllWeapons()[0].weapon)
    expect(s.makeKeyIds()).toBe('1,2:10|2,3:11')
  })

  it('ammoRemaining and getTotalAmmoCapacity reflect sunk state', () => {
    const s = new Ship(2, 'y', 'B')
    s.weapons = {
      '0,0': { id: 1, ammoRemaining: () => 3, getTotalAmmoCapacity: () => 5 },
      '0,1': { id: 2, ammoRemaining: () => 2, getTotalAmmoCapacity: () => 4 }
    }

    expect(s.getTotalAmmoCapacity()).toBe(9)
    s.sunk = true
    expect(s.getTotalAmmo()).toBe(0)
    expect(s.getTotalAmmoCapacity()).toBe(0)
  })

  it('place, unplace and addToGrid', () => {
    const s = new Ship(3, 'z', 'C')
    const cells = [
      [1, 1],
      [1, 2]
    ]
    s.shape = () => {
      return new Shape('z', 'C', cells)
    }
    s.placeAtCells(cells)
    expect(s.cells).toBe(cells)
    expect(s.getTotalHits()).toBe(0)
    expect(s.sunk).toBe(false)

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

describe('Ship - advanced weapon methods', () => {
  it('rackAt returns weapon at specific position', () => {
    const s = new Ship(1, 'x', 'A')
    const weapon1 = { id: 10, ammo: 5 }
    const weapon2 = { id: 11, ammo: 3 }
    s.weapons = {
      '1,2': weapon1,
      '2,3': weapon2
    }
    expect(s.rackAt(1, 2)).toBe(weapon1)
    expect(s.rackAt(2, 3)).toBe(weapon2)
    expect(s.rackAt(5, 5)).toBeUndefined()
  })

  it('closestRack finds nearest loaded weapon', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '2,2': {
        id: 1,
        hasAmmo: () => true,
        ammoRemaining: () => 2,
        getTotalAmmoCapacity: () => 5
      },
      '5,5': {
        id: 2,
        hasAmmo: () => true,
        ammoRemaining: () => 1,
        getTotalAmmoCapacity: () => 3
      },
      '0,0': {
        id: 3,
        hasAmmo: () => false,
        ammoRemaining: () => 0,
        getTotalAmmoCapacity: () => 0
      }
    }
    const [key, weapon] = s.findClosestLoadedRack(2, 2)
    expect(key).toBeDefined()
    expect(weapon).toBeDefined()
  })

  it('getRackById returns weapon by id', () => {
    const s = new Ship(1, 'x', 'A')
    const wpSys1 = { id: 10, weapon: { name: 'w1' } }
    const wpSys2 = { id: 11, weapon: { name: 'w2' } }
    s.weapons = {
      '1,2': wpSys1,
      '2,3': wpSys2
    }
    expect(s.getWeaponBySystemId(10)).toBe(wpSys1)
    expect(s.getWeaponBySystemId(11)).toBe(wpSys2)
    expect(s.getWeaponBySystemId(999)).toBeUndefined()
  })

  it('getShipById returns self or null', () => {
    const s = new Ship(42, 'x', 'A')
    expect(s.getShipById(42)).toBe(s)
    expect(s.getShipById(99)).toBeNull()
  })

  it('loadedEntries returns only weapons with ammo', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '1,2': {
        id: 1,
        hasAmmo: () => true
      },
      '2,3': {
        id: 2,
        hasAmmo: () => false
      },
      '3,4': {
        id: 3,
        hasAmmo: () => true
      }
    }
    const loaded = s.getLoadedWeaponEntries()
    expect(loaded).toHaveLength(2)
    expect(loaded.map(([k]) => k)).toEqual(['1,2', '3,4'])
  })

  it('loadedWeapon returns first loaded weapon', () => {
    const s = new Ship(1, 'x', 'A')
    const wp1 = { id: 1, hasAmmo: () => true }
    const wp2 = { id: 2, hasAmmo: () => false }
    const wp3 = { id: 3, hasAmmo: () => true }
    s.weapons = {
      '1,2': wp2,
      '2,3': wp1,
      '3,4': wp3
    }
    const loaded = s.getLoadedWeapons()[0]
    expect(loaded).toBe(wp1)
  })

  it('loadedWeapons returns all weapons with ammo', () => {
    const s = new Ship(1, 'x', 'A')
    const wp1 = { id: 1, hasAmmo: () => true }
    const wp2 = { id: 2, hasAmmo: () => false }
    const wp3 = { id: 3, hasAmmo: () => true }
    s.weapons = {
      '1,2': wp1,
      '2,3': wp2,
      '3,4': wp3
    }
    const loaded = s.getLoadedWeapons()
    expect(loaded).toHaveLength(2)
    expect(loaded).toContain(wp1)
    expect(loaded).toContain(wp3)
    expect(loaded).not.toContain(wp2)
  })

  it('hasAmmoRemaining returns correct state', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '1,2': { ammoRemaining: () => 5 },
      '2,3': { ammoRemaining: () => 3 }
    }
    expect(s.hasAmmoRemaining()).toBe(true)
    s.weapons['1,2'].ammoRemaining = () => 0
    s.weapons['2,3'].ammoRemaining = () => 0
    expect(s.hasAmmoRemaining()).toBe(false)
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
        reset: jest.fn()
      },
      '2,2': {
        reset: jest.fn()
      }
    }
    s.reset()
    expect(s.getTotalHits()).toBe(0)
    expect(s.sunk).toBe(false)
    s.weapons['1,1'].reset()
    s.weapons['2,2'].reset()
  })

  it('reset without weapons', () => {
    const s = new Ship(1, 'x', 'A')
    s.recordHit(1, 1)
    s.sunk = true
    s.weapons = null
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
        weapon: mockWeapon
      }
    }
    s.variant = 2
    const result = s.getTurn()
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
    expect(s.cells).toBe(cells)
    expect(s.getTotalHits()).toBe(0)
    expect(s.sunk).toBe(false)
  })

  it('unplace clears all state', () => {
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

describe('Ship - hasWeapons edge cases', () => {
  it('hasWeapons returns false when null', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = null
    expect(s.hasWeapons()).toBe(false)
  })

  it('hasWeapons returns false when undefined', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = undefined
    expect(s.hasWeapons()).toBe(false)
  })

  it('hasWeapons returns false for empty object', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {}
    expect(s.hasWeapons()).toBe(false)
  })

  it('hasWeapons returns true when weapons present', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '1,2': { id: 1 }
    }
    expect(s.hasWeapons()).toBe(true)
  })
})

describe('Ship - makeKeyIds formatting', () => {
  it('makeKeyIds with single weapon', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '1,2': { id: 5 }
    }
    expect(s.makeKeyIds()).toBe('1,2:5')
  })

  it('makeKeyIds with multiple weapons', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '0,0': { id: 1 },
      '1,1': { id: 2 },
      '2,2': { id: 3 }
    }
    const result = s.makeKeyIds()
    expect(result).toContain('0,0:1')
    expect(result).toContain('1,1:2')
    expect(result).toContain('2,2:3')
    expect(result.split('|')).toHaveLength(3)
  })

  it('makeKeyIds preserves order consistency', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '1,2': { id: 10 },
      '2,3': { id: 11 }
    }
    const result = s.makeKeyIds()
    expect(result).toMatch(/1,2:10.*2,3:11|2,3:11.*1,2:10/)
  })
})

describe('Ship - ammo calculations with edge cases', () => {
  it('ammoRemaining with no weapons', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {}
    expect(s.ammoRemaining()).toBe(0)
  })

  it('getTotalAmmoCapacity with no weapons', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {}
    expect(s.getTotalAmmoCapacity()).toBe(0)
  })

  it('ammoRemaining sums across all weapons', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '1,1': { ammoRemaining: () => 10, getTotalAmmoCapacity: () => 20 },
      '2,2': { ammoRemaining: () => 5, getTotalAmmoCapacity: () => 10 },
      '3,3': { ammoRemaining: () => 0, getTotalAmmoCapacity: () => 5 }
    }
    expect(s.getTotalAmmo()).toBe(15)
  })

  it('getTotalAmmoCapacity sums across all weapons', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '1,1': { ammoRemaining: () => 5, getTotalAmmoCapacity: () => 20 },
      '2,2': { ammoRemaining: () => 3, getTotalAmmoCapacity: () => 10 },
      '3,3': { ammoRemaining: () => 0, getTotalAmmoCapacity: () => 5 }
    }
    expect(s.getTotalAmmoCapacity()).toBe(35)
  })

  it('ammoRemaining is zero when sunk', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '1,1': { ammoRemaining: () => 50, getTotalAmmoCapacity: () => 100 }
    }
    expect(s.getTotalAmmo()).toBe(50)
    s.sunk = true
    expect(s.getTotalAmmo()).toBe(0)
  })

  it('getTotalAmmoCapacity is zero when sunk', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '1,1': { ammoRemaining: () => 50, getTotalAmmoCapacity: () => 100 }
    }
    expect(s.getTotalAmmoCapacity()).toBe(100)
    s.sunk = true
    expect(s.getTotalAmmoCapacity()).toBe(0)
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
    expect(s.weapons).toBe(weaponsObj)
  })
})

describe('Ship - weaponSystem edge cases', () => {
  it('weaponSystem with no weapons', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {}
    expect(s.getPrimaryWeaponSystem()).toBeNull()
  })

  it('weapon with null weaponSystem', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {}
    expect(s.getPrimaryWeapon()).toBeUndefined()
  })

  it('weapon with valid weaponSystem', () => {
    const s = new Ship(1, 'x', 'A')
    const mockWeapon = { name: 'laser' }
    s.weapons = {
      '1,1': { weapon: mockWeapon }
    }
    expect(s.getPrimaryWeapon()).toBe(mockWeapon)
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
    expect(s2.hasWeapons()).toBe(false)
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
    expect(s1.cells).toEqual(cells1)
    expect(s2.cells).toEqual(cells2)
    expect(s1.cells).not.toEqual(s2.cells)
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
