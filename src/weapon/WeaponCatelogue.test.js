/* eslint-env jest */
import { jest } from '@jest/globals'

/* global describe, jest, it, expect, beforeEach */

let WeaponCatelogue
const standardShot = {
  letter: '-',
  tag: 'single',
  cursors: [''],
  launchCursor: 'crosshair'
}

jest.unstable_mockModule('./Weapon.js', () => ({ standardShot }))

beforeEach(async () => {
  const module = await import('./WeaponCatelogue.js')
  WeaponCatelogue = module.WeaponCatelogue
})

describe('WeaponCatelogue', () => {
  it('constructs with weapons array and default weapon', () => {
    const weapons = [
      { letter: 'A', tag: 'alpha', cursors: ['a'], launchCursor: 'launchA' }
    ]
    const catalogue = new WeaponCatelogue(weapons)

    expect(catalogue.weapons).toBe(weapons)
    expect(catalogue.defaultWeapon).toBe(standardShot)
  })

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

  it('tags returns array of weapon tags', () => {
    const weapons = [
      { letter: 'A', tag: 'alpha', cursors: ['a'], launchCursor: 'launchA' },
      { letter: 'B', tag: 'beta', cursors: ['b'], launchCursor: 'launchB' }
    ]
    const catalogue = new WeaponCatelogue(weapons)

    expect(catalogue.tags).toEqual(['alpha', 'beta'])
  })

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
