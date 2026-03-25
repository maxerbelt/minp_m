/* eslint-env jest */
import { jest } from '@jest/globals'

/* global describe, jest, beforeEach, it, expect */

jest.unstable_mockModule('../ships/SubShape.js', () => {
  return {
    StandardCells: jest
      .fn()
      .mockImplementation(function (validator, zoneDetail, subterrain) {
        this.validator = validator
        this.zoneDetail = zoneDetail
        this.subterrain = subterrain
        this.faction = undefined
        this.setCells = jest.fn()
        this.setBoardFromSecondary = jest.fn()
      }),
    SpecialCells: jest
      .fn()
      .mockImplementation(function (cells, validator, zoneDetail, subterrain) {
        this.cells = cells
        this.validator = validator
        this.zoneDetail = zoneDetail
        this.subterrain = subterrain
        this.faction = undefined
        this.board = Mask.fromCoords(cells)
      })
  }
})

jest.unstable_mockModule('../utilities.js', () => {
  return {
    parsePair: jest.fn(p => p)
  }
})

jest.unstable_mockModule('./Placeable.js', () => {
  return {
    Placeable: jest
      .fn()
      .mockImplementation(function (cells, validator, zoneDetail, target) {
        this.cells = cells
        this.validator = validator
        this.zoneDetail = zoneDetail
        this.target = target
      })
  }
})

jest.unstable_mockModule('./PlaceableW.js', () => {
  return {
    PlaceableW: jest.fn().mockImplementation(function (parentPlaceable, arr) {
      this.parentPlaceable = parentPlaceable
      this.arr = arr
    })
  }
})

// Mock a parent prototype that has placeable so grandparentPrototype.placeable exists
const Parent = function () {}
Parent.prototype.placeable = function (idx) {
  return { parentPlaceableCalled: true, idxArg: idx || this.index }
}

jest.unstable_mockModule('./SpecialVariant.js', () => {
  class SpecialVariant extends Parent {
    constructor (symmetry) {
      super()
      this.symmetry = symmetry
      this.specialGroups = []
      this.subGroups = []
    }
    buildCell3 (_symmetry, _full) {
      this.list = []
    }
    buildBoard3 (symmetry, board) {
      this.list = [board]
    }

    static setBehaviourTo () {}
  }
  return { SpecialVariant }
})

import { Mask } from '../grid/mask.js'
// Variables for dynamically imported modules
let WeaponVariant,
  StandardCells,
  SpecialCells,
  parsePair,
  Placeable,
  PlaceableW,
  SpecialVariant,
  Armed

describe.skip('WeaponVariant', () => {
  const full = Mask.fromCoords([
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1]
  ])
  const weapons = { wp1: { name: 'X' }, wp2: { name: 'Y' } }
  const symmetry = 'SYM'
  const validator = () => true
  const zoneDetail = 9
  const subterrain = 'sub'

  beforeEach(async () => {
    const weaponVariantModule = await import('./WeaponVariant.js')
    WeaponVariant = weaponVariantModule.WeaponVariant
    Armed = weaponVariantModule.Armed

    const subShapeModule = await import('../ships/SubShape.js')
    StandardCells = subShapeModule.StandardCells
    SpecialCells = subShapeModule.SpecialCells

    const utilitiesModule = await import('../utilities.js')
    parsePair = utilitiesModule.parsePair

    const placeableModule = await import('./Placeable.js')
    Placeable = placeableModule.Placeable

    const placeableWModule = await import('./PlaceableW.js')
    PlaceableW = placeableWModule.PlaceableW

    const specialVariantModule = await import('./SpecialVariant.js')
    SpecialVariant = specialVariantModule.SpecialVariant

    jest.clearAllMocks()
  })

  it('constructs and maps weapons keys/values and sets up groups', () => {
    const wv = new WeaponVariant(
      full,
      weapons,
      symmetry,
      validator,
      zoneDetail,
      subterrain
    )

    // parsePair called for each weapon key
    expect(parsePair).toHaveBeenCalled()
    expect(parsePair.mock.calls.length).toBe(Object.keys(weapons).length)

    // weapons array should contain the values from the input map in same key order
    expect(Array.isArray(wv.weapons)).toBe(true)
    expect(wv.weapons).toEqual(Object.keys(weapons).map(k => weapons[k]))

    // standardGroup and specialGroups created and setCells called
    expect(StandardCells).toHaveBeenCalled()
    expect(SpecialCells).toHaveBeenCalled()
    expect(wv.standardGroup.setCells).toHaveBeenCalledWith(
      full,
      expect.any(Object)
    )

    // faction assignments
    expect(wv.standardGroup.faction).toBe(1)
    // specialGroups is an array — code assigns a .faction property on the array
    expect(wv.specialGroups.faction).toBe(0)
  })

  it('placeable returns a PlaceableW with variantIndex and weapons and arr for each subgroup', () => {
    let wv
    try {
      wv = new WeaponVariant(
        full,
        weapons,
        symmetry,
        validator,
        zoneDetail,
        subterrain
      )
    } catch (err) {
      console.log(err.stack)
      throw err
    }
    // ensure instance index exists for fallback when no arg
    wv.index = 7

    const result = wv.placeable()
    // PlaceableW constructed
    expect(PlaceableW).toHaveBeenCalled()

    // variantIndex set on returned object
    expect(result.variantIndex).toBe(7)
    // weapons prop copied
    expect(result.weapons).toEqual(wv.weapons)

    // the second arg to PlaceableW should be an array of Placeable instances
    expect(Array.isArray(result.arr)).toBe(true)
    expect(result.arr.length).toBe(wv.subGroups.length)
    result.arr.forEach(p => {
      expect(p).toBeInstanceOf(Placeable)
      // Each Placeable should have been constructed from WeaponVariant.special(...) output
      expect(typeof p.cells[0]).toBe('string')
    })

    // parentPlaceable provided to PlaceableW should include parentPlaceableCalled true
    expect(result.parentPlaceable.parentPlaceableCalled).toBe(true)
    expect(result.parentPlaceable.idxArg).toBe(7)
  })

  it('placeable with explicit index uses that index', () => {
    let wv
    try {
      wv = new WeaponVariant(
        full,
        weapons,
        symmetry,
        validator,
        zoneDetail,
        subterrain
      )
    } catch (err) {
      console.log(err.stack)
      throw err
    }
    const result = wv.placeable(3)
    expect(result.variantIndex).toBe(3)
    // parentPlaceable idxArg should reflect explicit index
    expect(result.parentPlaceable.idxArg).toBe(3)
  })

  it('static setBehaviour is delegated to SpecialVariant.setBehaviourTo', () => {
    expect(WeaponVariant.setBehaviour).toBe(SpecialVariant.setBehaviourTo)
  })

  it('Armed mixin returns a class whose variants() builds a WeaponVariant', () => {
    class Base {
      constructor () {
        this.cells = full
        this.weaponSystem = weapons
        this.symmetry = symmetry
        this.validator = validator
        this.zoneDetail = zoneDetail
        this.subterrain = subterrain
      }
    }
    const ArmedClass = Armed(Base)
    const inst = new ArmedClass()
    const variants = inst.variants()
    expect(variants).toBeInstanceOf(WeaponVariant)
    expect(variants.weapons).toEqual(Object.keys(weapons).map(k => weapons[k]))
  })
})
