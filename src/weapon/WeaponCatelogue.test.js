/**
 * @fileoverview Unit tests for WeaponCatalogue repository class.
 * Tests catalogue initialization, weapon indexing, lookup methods, and collection management.
 * Uses Jest mocking for Weapon.js module dependencies.
 */

import { jest } from '@jest/globals'

/**
 * @typedef {Object} MockWeapon
 * @property {string} letter - Single-character weapon identifier
 * @property {string} tag - Weapon name/tag identifier
 * @property {string[]} cursors - Array of cursor graphics
 * @property {string} launchCursor - Launch/fire cursor graphic
 */

/**
 * WeaponCatalogue class under test
 * Assigned in beforeEach after dynamic module import
 * Type is not fully known at compile time due to dynamic import with jest mocking
 * @type {any}
 */
let WeaponCatalogue

/**
 * Standard shot mock weapon - used as default weapon in catalogue
 * Represents the fallback weapon when no other weapon is available
 * @type {MockWeapon}
 */
const standardShot = {
  letter: '-',
  tag: 'single',
  cursors: [''],
  launchCursor: 'crosshair'
}

jest.unstable_mockModule('./Weapon.js', () => ({ standardShot }))

/**
 * Setup hook: Dynamically imports WeaponCatalogue module after mocking
 * Resets module state before each test to ensure isolation
 * Required because Weapon.js is mocked with jest.unstable_mockModule
 */
beforeEach(async () => {
  const module = await import('./WeaponCatalogue.js')
  WeaponCatalogue = module.WeaponCatalogue
})

/**
 * Test suite for WeaponCatalogue repository class
 * Tests core functionality: initialization, indexing, lookups, and updates
 */
describe('WeaponCatelogue', () => {
  /**
   * Test: Constructor initialization
   * Verifies that weapons array is properly stored and default weapon is set
   */
  it('constructs with weapons array and default weapon', () => {
    const weapons = [
      { letter: 'A', tag: 'alpha', cursors: ['a'], launchCursor: 'launchA' }
    ]
    const catalogue = new WeaponCatelogue(weapons)

    expect(catalogue.weapons).toBe(weapons)
    expect(catalogue.defaultWeapon).toBe(standardShot)
  })

  /**
   * Test: addWeapons method
   * Verifies that adding weapons updates the collection and rebuilds the index
   */
  it('addWeapons sets weapons and creates weaponsByLetter map', () => {
    const catalogue = new WeaponCatelogue([])
    const shot = {
      letter: 'B',
      tag: 'beta',
      cursors: ['b'],
      launchCursor: 'launchB'
    }

    catalogue.addWeapons([shot])

    expect(catalogue.weapons).toEqual([shot])
    expect(catalogue.weaponsByLetter).toEqual({ B: shot })
  })

  /**
   * Test: tags getter property
   * Verifies that getter returns array of all weapon tag identifiers
   */
  it('tags returns array of weapon tags', () => {
    const weapons = [
      { letter: 'A', tag: 'alpha', cursors: ['a'], launchCursor: 'launchA' },
      { letter: 'B', tag: 'beta', cursors: ['b'], launchCursor: 'launchB' }
    ]
    const catalogue = new WeaponCatelogue(weapons)

    expect(catalogue.tags).toEqual(['alpha', 'beta'])
  })

  /**
   * Test: cursors getter property
   * Verifies that getter returns flattened array of all cursor graphics
   * Includes both targeting cursors and launch cursors from all weapons
   */
  it('cursors returns all weapon cursors plus launch cursors', () => {
    const weapons = [
      {
        letter: 'X',
        tag: 'test',
        cursors: ['cursor1', 'cursor2'],
        launchCursor: 'launch'
      },
      { letter: 'Y', tag: 'other', cursors: ['cursor3'], launchCursor: 'go' }
    ]
    const catalogue = new WeaponCatelogue(weapons)

    expect(catalogue.cursors).toEqual([
      'cursor1',
      'cursor2',
      'launch',
      'cursor3',
      'go'
    ])
  })
})
