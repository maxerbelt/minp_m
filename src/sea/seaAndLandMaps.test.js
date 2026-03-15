/* eslint-env jest */
/* global describe, test, expect */

// Import only what we can test without localStorage issues
import { seaAndLand } from './seaAndLand'
import { seaShipsCatalogue } from './SeaShips'
import { seaWeaponsCatalogue } from './SeaWeapons'

describe('seaAndLandMaps module setup', () => {
  test('seaAndLand terrain is defined', () => {
    expect(seaAndLand).toBeDefined()
    expect(seaAndLand.title).toBe('Sea and Land')
  })

  test('seaShipsCatalogue has baseShapes', () => {
    expect(Array.isArray(seaShipsCatalogue.baseShapes)).toBe(true)
    expect(seaShipsCatalogue.baseShapes.length).toBeGreaterThan(0)
  })

  test('seaWeaponsCatalogue has weapons array', () => {
    expect(Array.isArray(seaWeaponsCatalogue.weapons)).toBe(true)
    expect(seaWeaponsCatalogue.weapons.length).toBeGreaterThan(0)
  })

  test('seaWeaponsCatalogue has defaultWeapon', () => {
    expect(seaWeaponsCatalogue.defaultWeapon).toBeDefined()
  })
})
