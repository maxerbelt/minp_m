/* eslint-env jest */

/* global describe, it, test, expect, beforeEach, jest */

import {
  jaggedXS,
  jaggedVS,
  defaultMap,
  jaggedS,
  jaggedMS,
  jaggedM,
  jaggedML,
  JaggedL,
  NarrowS,
  JaggedLL,
  NarrowM,
  JaggedVL,
  JaggedXL,
  seaMapList
} from './SeaMaps'
import { BhMap } from '../terrain/map'

// Jest test suite
describe('SeaMaps exports', () => {
  test('jaggedXS and jaggedVS are BhMap instances with weapons', () => {
    expect(jaggedXS).toBeInstanceOf(BhMap)
    expect(jaggedVS).toBeInstanceOf(BhMap)
    expect(jaggedXS.title).toBe('Jagged Coast XS')
    expect(jaggedVS.title).toBe('Jagged Coast VS')
    expect(Array.isArray(jaggedXS.weapons)).toBe(true)
    expect(jaggedXS.weapons.length).toBeGreaterThan(0)
  })

  test('all Jagged maps are BhMap instances', () => {
    const maps = [
      jaggedS,
      jaggedMS,
      jaggedM,
      jaggedML,
      JaggedL,
      JaggedVL,
      JaggedXL
    ]
    maps.forEach(map => {
      expect(map).toBeInstanceOf(BhMap)
      expect(map.title).toMatch(/Jagged Coast/)
      expect(Array.isArray(map.weapons)).toBe(true)
    })
  })

  test('Narrow maps are BhMap instances', () => {
    expect(NarrowS).toBeInstanceOf(BhMap)
    expect(NarrowM).toBeInstanceOf(BhMap)
    expect(NarrowS.title).toBe('Narrow Coast S')
    expect(NarrowM.title).toBe('Narrow Coast M')
  })

  test('JaggedLL is BhMap with correct title', () => {
    expect(JaggedLL).toBeInstanceOf(BhMap)
    expect(JaggedLL.title).toBe('Jagged Coast LL')
  })

  test('defaultMap is jaggedSS reference', () => {
    expect(defaultMap).toBeInstanceOf(BhMap)
    expect(defaultMap.title).toBe('Jagged Coast SS')
  })

  test('seaMapList contains all 13 maps', () => {
    expect(Array.isArray(seaMapList)).toBe(true)
    expect(seaMapList.length).toBe(13)
    expect(seaMapList).toContain(jaggedXS)
    expect(seaMapList).toContain(jaggedVS)
    expect(seaMapList).toContain(defaultMap)
    expect(seaMapList).toContain(NarrowM)
    expect(seaMapList).toContain(JaggedXL)
  })
})
