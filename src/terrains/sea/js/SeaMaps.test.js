/* eslint-env jest */

/* global describe, it, expect, jest */

import {
  jaggedXS,
  jaggedVS,
  jaggedS,
  jaggedMS,
  jaggedM,
  jaggedML,
  JaggedL,
  JaggedLL,
  JaggedVL,
  JaggedXL
} from '../scenario/Jagged_Coast.js'
import { BhMap } from '../../all/js/map.js'
import { NarrowS, NarrowM } from '../scenario/Narrow_Coast.js'
import { seaMapList, defaultMap } from './seaMaps.js'
// Jest it suite
describe('SeaMaps exports', () => {
  it('jaggedXS and jaggedVS are BhMap instances with weapons', () => {
    expect(jaggedXS).toBeInstanceOf(BhMap)
    expect(jaggedVS).toBeInstanceOf(BhMap)
    expect(jaggedXS.title).toBe('Jagged Coast XS')
    expect(jaggedVS.title).toBe('Jagged Coast VS')
    expect(Array.isArray(jaggedXS.weapons)).toBe(true)
    expect(jaggedXS.weapons.length).toBeGreaterThan(0)
  })

  it('all Jagged maps are BhMap instances', () => {
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

  it('Narrow maps are BhMap instances', () => {
    expect(NarrowS).toBeInstanceOf(BhMap)
    expect(NarrowM).toBeInstanceOf(BhMap)
    expect(NarrowS.title).toBe('Narrow Coast S')
    expect(NarrowM.title).toBe('Narrow Coast M')
  })

  it('JaggedLL is BhMap with correct title', () => {
    expect(JaggedLL).toBeInstanceOf(BhMap)
    expect(JaggedLL.title).toBe('Jagged Coast LL')
  })

  it('defaultMap is jaggedSS reference', () => {
    expect(defaultMap).toBeInstanceOf(BhMap)
    expect(defaultMap.title).toBe('Jagged Coast SS')
  })

  it('seaMapList contains all 13 maps', () => {
    expect(Array.isArray(seaMapList)).toBe(true)
    expect(seaMapList.length).toBe(13)
    expect(seaMapList).toContain(jaggedXS)
    expect(seaMapList).toContain(jaggedVS)
    expect(seaMapList).toContain(defaultMap)
    expect(seaMapList).toContain(NarrowM)
    expect(seaMapList).toContain(JaggedXL)
  })
})
