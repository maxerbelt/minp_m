/* eslint-env jest */

/* global describe,   test, expect,   */

import { seaAndLandGroups } from './seaAndLandGroups.js'
import { ShipGroups } from '../../../ships/ShipGroups.js'

describe('seaAndLandGroups', () => {
  test('seaAndLandGroups is a ShipGroups instance', () => {
    expect(seaAndLandGroups).toBeInstanceOf(ShipGroups)
  })

  test('seaAndLandGroups has correct shipSunkDescriptions', () => {
    const desc = seaAndLandGroups.shipSunkDescriptions
    expect(desc.A).toBe('Shot Down')
    expect(desc.G).toBe('Destroyed')
    expect(desc.M).toBe('Destroyed')
    expect(desc.T).toBe('Destroyed')
    expect(desc.X).toBe('Destroyed')
    expect(desc.S).toBe('Sunk')
  })

  test('seaAndLandGroups has correct unitDescriptions', () => {
    const units = seaAndLandGroups.unitDescriptions
    expect(units.A).toBe('Air')
    expect(units.G).toBe('Land')
    expect(units.M).toBe('Hybrid')
    expect(units.T).toBe('Transformer')
    expect(units.X).toBe('Special')
    expect(units.S).toBe('Sea')
    expect(units.W).toBe('Weapon')
  })

  test('seaAndLandGroups has correct unitInfo for all types', () => {
    const info = seaAndLandGroups.unitInfo
    expect(info.A).toMatch(/any area/)
    expect(info.G).toMatch(/green|land/)
    expect(info.M).toMatch(/special rules/)
    expect(info.T).toMatch(/special rules/)
    expect(info.X).toMatch(/special rules/)
    expect(info.S).toMatch(/blue|sea/)
    expect(info.W).toMatch(/special rules/)
  })

  test('unitInfo describes sea units as blue areas', () => {
    expect(seaAndLandGroups.unitInfo.S).toContain('blue areas (sea)')
  })

  test('unitInfo describes land units as green areas', () => {
    expect(seaAndLandGroups.unitInfo.G).toContain('greens areas (land)')
  })

  test('all combat unit type letters are covered in sunk descriptions', () => {
    const combatTypes = ['A', 'G', 'M', 'T', 'X', 'S']
    combatTypes.forEach(type => {
      expect(seaAndLandGroups.shipSunkDescriptions[type]).toBeDefined()
    })
  })

  test('all unit type letters are covered in descriptions and info', () => {
    const types = ['A', 'G', 'M', 'T', 'X', 'S', 'W']
    types.forEach(type => {
      expect(seaAndLandGroups.unitDescriptions[type]).toBeDefined()
      expect(seaAndLandGroups.unitInfo[type]).toBeDefined()
    })
  })
})
