/* eslint-env jest */

/* global describe, it, expect, jest */

import { describe, it, expect } from '@jest/globals'
import { Ship } from './Ship'

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
        ammoCapacityTotal: () => 5
      },
      '5,5': {
        id: 2,
        hasAmmo: () => true,
        ammoRemaining: () => 1,
        ammoCapacityTotal: () => 3
      },
      '0,0': {
        id: 3,
        hasAmmo: () => false,
        ammoRemaining: () => 0,
        ammoCapacityTotal: () => 0
      }
    }
    const [key, weapon] = s.findClosestLoadedRack(2, 2)
    expect(key).toBeDefined()
    expect(weapon).toBeDefined()
  })

  it('getWeaponBySystemId returns weapon by id', () => {
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

  it('getFirstLoadedWeapon returns first loaded weapon', () => {
    const s = new Ship(1, 'x', 'A')
    const wp1 = { id: 1, hasAmmo: () => true }
    const wp2 = { id: 2, hasAmmo: () => false }
    const wp3 = { id: 3, hasAmmo: () => true }
    s.weapons = {
      '1,2': wp2,
      '2,3': wp1,
      '3,4': wp3
    }
    const loaded = s.getFirstLoadedWeapon()
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
      '1,2': { ammoRemaining: () => 5, id: 1 },
      '2,3': { ammoRemaining: () => 3, id: 2 }
    }
    expect(s.hasAmmoRemaining()).toBe(true)
    s.weapons['1,2'].ammoRemaining = () => 0
    s.weapons['2,3'].ammoRemaining = () => 0
    expect(s.hasAmmoRemaining()).toBe(false)
  })
})
describe('Ship - hasWeapons edge cases', () => {
  it('hasWeapon returns false when null', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = null
    expect(s.hasWeapon).toBe(false)
  })

  it('hasWeapons returns false when undefined', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = undefined
    expect(s.hasWeapon).toBe(false)
  })

  it('hasWeapons returns false for empty object', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {}
    expect(s.hasWeapon).toBe(false)
  })

  it('hasWeapons returns true when weapons present', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '1,2': { id: 1 }
    }
    expect(s.hasWeapon).toBe(true)
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
    expect(s.ammoRemainingTotal()).toBe(0)
  })

  it('ammoCapacityTotal with no weapons', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {}
    expect(s.ammoCapacityTotal()).toBe(0)
  })

  it('ammoRemaining sums across all weapons', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '1,1': { ammoRemaining: () => 10, ammoCapacityTotal: () => 20 },
      '2,2': { ammoRemaining: () => 5, ammoCapacityTotal: () => 10 },
      '3,3': { ammoRemaining: () => 0, ammoCapacityTotal: () => 5 }
    }
    expect(s.ammoRemainingTotal()).toBe(15)
  })

  it('ammoCapacityTotal sums across all weapons', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '1,1': { ammoRemaining: () => 5, ammoCapacity: () => 20 },
      '2,2': { ammoRemaining: () => 3, ammoCapacity: () => 10 },
      '3,3': { ammoRemaining: () => 0, ammoCapacity: () => 5 }
    }
    expect(s.ammoCapacityTotal()).toBe(35)
  })

  it('ammoRemaining is zero when sunk', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '1,1': { ammoRemaining: () => 50, ammoCapacityTotal: () => 100 }
    }
    expect(s.ammoRemainingTotal()).toBe(50)
    s.sunk = true
    expect(s.ammoRemainingTotal()).toBe(0)
  })

  it('ammoCapacityTotal is zero when sunk', () => {
    const s = new Ship(1, 'x', 'A')
    s.weapons = {
      '1,1': { ammoRemaining: () => 50, ammoCapacity: () => 100 }
    }
    expect(s.ammoCapacityTotal()).toBe(100)
    s.sunk = true
    expect(s.ammoCapacityTotal()).toBe(0)
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
