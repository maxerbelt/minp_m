/* eslint-env jest */
import { jest } from '@jest/globals'

/* global describe, jest, it, expect, beforeEach */

// Weapon will be imported dynamically after mocks are set up
let Weapon, StandardShot, standardShot, WeaponCatelogue, bh

jest.unstable_mockModule('../terrain/bh.js', () => {
  return {
    bh: {
      seekingMode: false,
      mapHeading: 'Grid'
    }
  }
})

jest.unstable_mockModule('../grid/errorMsg.js', () => ({
  errorMsg: jest.fn()
}))

beforeEach(async () => {
  const weaponModule = await import('./Weapon.js')
  Weapon = weaponModule.Weapon
  StandardShot = weaponModule.StandardShot
  standardShot = weaponModule.standardShot
  WeaponCatelogue = weaponModule.WeaponCatelogue

  const bhModule = await import('../terrain/bh.js')
  bh = bhModule.bh
})

describe('Weapon', () => {
  it('cannot be instantiated directly', () => {
    expect(() => new Weapon('Test', 'T', false, true, 1)).toThrow(
      'base class cannot be instantiated directly. Please extend it.'
    )
  })

  it('initializes properties correctly', () => {
    const weapon = new StandardShot()

    expect(weapon.name).toBe('Standard Shot')
    expect(weapon.letter).toBe('-')
    expect(weapon.isLimited).toBe(false)
    expect(weapon.destroys).toBe(true)
    expect(weapon.points).toBe(1)
    expect(weapon.hasFlash).toBe(false)
    expect(weapon.totalCursors).toBe(1)
    expect(weapon.splashPower).toBe(-1)
  })

  it('sets plural name', () => {
    const weapon = new StandardShot()
    expect(weapon.plural).toBe('Standard Shots')
  })

  it('getTurn returns empty string by default', () => {
    const weapon = new StandardShot()
    expect(weapon.getTurn()).toBe('')
  })

  it('stepIdx returns numCoords in seeking mode', () => {
    const weapon = new StandardShot()
    bh.seekingMode = true
    expect(weapon.stepIdx(5, 2)).toBe(5)
    bh.seekingMode = false
  })

  it('stepIdx returns numCoords + selectOffset when launchCursor exists', () => {
    const weapon = new StandardShot()
    weapon.launchCursor = true
    weapon.postSelectCursor = 1
    expect(weapon.stepIdx(5, 3)).toBe(7)
  })

  it('stepIdx clamps selectOffset to 0', () => {
    const weapon = new StandardShot()
    weapon.launchCursor = true
    weapon.postSelectCursor = 5
    expect(weapon.stepIdx(5, 2)).toBe(5)
  })

  it('stepHint returns correct message for step 0', () => {
    const weapon = new StandardShot()
    weapon.launchCursor = null
    expect(weapon.stepHint(0)).toContain('Enemy Grid')
  })

  it('stepHint returns launch hint when launchCursor exists', () => {
    const weapon = new StandardShot()
    weapon.launchCursor = { id: 1 }
    expect(weapon.stepHint(0)).toContain('Friendly Grid')
  })

  it('numStep returns cursors length in seeking mode', () => {
    const weapon = new StandardShot()
    weapon.cursors = [1, 2, 3]
    bh.seekingMode = true
    expect(weapon.numStep).toBe(3)
    bh.seekingMode = false
  })

  it('numStep returns totalCursors when not in seeking mode', () => {
    const weapon = new StandardShot()
    weapon.totalCursors = 5
    bh.seekingMode = false
    expect(weapon.numStep).toBe(5)
  })

  it('hasExtraSelectCursor is true when launchCursor differs from first cursor', () => {
    const weapon = new StandardShot()
    weapon.launchCursor = '3'
    weapon.cursors = ['2']
    expect(weapon.hasExtraSelectCursor).toBe(true)
  })

  it('hasExtraSelectCursor is false when launchCursor is first cursor', () => {
    const weapon = new StandardShot()
    weapon.launchCursor = '2'
    weapon.cursors = ['2']
    try {
      expect(weapon.hasExtraSelectCursor).toBe(false)
    } catch (err) {
      err.message += errorMsg('weapon', weapon)
      throw err
    }
  })

  it('ammoStatus returns weapon name', () => {
    const weapon = new StandardShot()
    expect(weapon.ammoStatus(5)).toBe('Single Shot Mode')
  })

  it('info returns name and letter', () => {
    const weapon = new StandardShot()
    expect(weapon.info()).toBe('Standard Shot (-)')
  })

  it('addSplash throws error', () => {
    const weapon = new StandardShot()
    expect(() => weapon.addSplash()).toThrow('override in derided class')
  })

  it('addOrthogonal calls addSplash for 4 adjacent cells', () => {
    const weapon = new StandardShot()
    weapon.addSplash = jest.fn()
    const map = {}
    weapon.addOrthogonal(map, 5, 5, 10, {})
    expect(weapon.addSplash).toHaveBeenCalledTimes(4)
  })

  it('addDiagonal calls addSplash for 4 diagonal cells', () => {
    const weapon = new StandardShot()
    weapon.addSplash = jest.fn()
    const map = {}
    weapon.addDiagonal(map, 5, 5, 10, {})
    expect(weapon.addSplash).toHaveBeenCalledTimes(4)
  })

  it('addNeighbours calls addOrthogonal and addDiagonal', () => {
    const weapon = new StandardShot()
    weapon.addOrthogonal = jest.fn()
    weapon.addDiagonal = jest.fn()
    const map = {}
    const newEffect = {}
    weapon.addNeighbours(map, 5, 5, 10, 5, newEffect)
    expect(weapon.addOrthogonal).toHaveBeenCalledWith(map, 5, 5, 10, newEffect)
    expect(weapon.addDiagonal).toHaveBeenCalledWith(map, 5, 5, 5, newEffect)
  })

  it('redoCoords returns base and first coord', () => {
    const weapon = new StandardShot()
    const result = weapon.redoCoords({}, [1, 2], [[3, 4], 'target'])
    expect(result).toEqual([
      [1, 2],
      [3, 4]
    ])
  })

  it('centerOf returns center point of element', () => {
    const weapon = new StandardShot()
    const el = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 50,
        width: 40,
        height: 30
      })
    }
    const center = weapon.centerOf(el)
    expect(center.x).toBe(120)
    expect(center.y).toBe(65)
  })

  it('classname is lowercase name with spaces replaced by dashes', () => {
    const weapon = new StandardShot()
    expect(weapon.classname).toBe('standard-shot')
  })
})

describe('StandardShot', () => {
  it('constructs with correct defaults', () => {
    const shot = new StandardShot()
    expect(shot.name).toBe('Standard Shot')
    expect(shot.letter).toBe('-')
    expect(shot.isLimited).toBe(false)
    expect(shot.cursors).toEqual([''])
    expect(shot.tag).toBe('single')
  })

  it('aoe returns single cell with power 4', () => {
    const shot = new StandardShot()
    const result = shot.aoe({}, [[5, 10]])
    expect(result).toEqual([[5, 10, 4]])
  })
})

describe('WeaponCatelogue', () => {
  it('constructs with weapons array and default weapon', () => {
    const weapons = [new StandardShot()]
    const catalogue = new WeaponCatelogue(weapons)

    expect(catalogue.weapons).toEqual(weapons)
    expect(catalogue.defaultWeapon).toBe(standardShot)
  })

  it('addWeapons sets weapons and creates weaponsByLetter map', () => {
    const catalogue = new WeaponCatelogue([])
    const shot = new StandardShot()
    const weapons = [shot]

    catalogue.addWeapons(weapons)

    expect(catalogue.weapons).toEqual(weapons)
    expect(catalogue.weaponsByLetter['-']).toBe(shot)
  })

  it('tags returns array of weapon tags', () => {
    const shot = new StandardShot()
    const catalogue = new WeaponCatelogue([shot])

    expect(catalogue.tags).toEqual(['single'])
  })
})
