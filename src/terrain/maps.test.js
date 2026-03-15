/* eslint-env jest */

/* global describe,   test, expect, beforeEach, afterEach, jest */

import { terrainsMaps } from './maps.js'
import { placingTarget } from '../variants/makeCell3.js'
import { terrains } from './terrains.js'
import { jest } from '@jest/globals'

describe('terrainsMaps behaviors', () => {
  let origList, origCurrent, origOnChange, origTerrainsList

  beforeEach(() => {
    // snapshot and reset
    origList = terrainsMaps.list
    origCurrent = terrainsMaps.current
    origOnChange = terrainsMaps.onChange
    origTerrainsList = terrains.terrains

    terrainsMaps.list = []
    terrainsMaps.current = null
    terrainsMaps.onChange = jest.fn()
    terrains.terrains = []
  })
  afterEach(() => {
    terrainsMaps.list = origList
    terrainsMaps.current = origCurrent
    terrainsMaps.onChange = origOnChange
    terrains.terrains = origTerrainsList
  })

  test('add pushes terrainMaps and registers terrain', () => {
    const tm = {
      terrain: { tag: 't1', title: 'T1' },
      inBounds: (r, c) => r >= 0,
      inAllBounds: (r, c, h, w) => true,
      zoneInfo: () => []
    }

    terrainsMaps.add(tm)
    expect(terrainsMaps.list.includes(tm)).toBe(true)
    expect(terrains.terrains.includes(tm.terrain)).toBe(true)
  })

  test('setCurrent updates current and binds placingTarget checkers', () => {
    const tm = {
      terrain: { tag: 't2', title: 'T2', bodyTag: 'bt' },
      inBounds: (r, c) => r === 1 && c === 2,
      inAllBounds: (r, c, h, w) => h === 1 && w === 2,
      zoneInfo: () => ['z']
    }

    terrainsMaps.setCurrent(tm)
    expect(terrainsMaps.current).toBe(tm)
    // placingTarget functions should call through to tm methods
    expect(placingTarget.boundsChecker(1, 2)).toBe(true)
    expect(placingTarget.allBoundsChecker(0, 0, 1, 2)).toBe(true)
    expect(placingTarget.getZone(0, 0)).toEqual(['z'])
  })

  test('setByIndex returns element or null', () => {
    const tm1 = {
      terrain: { tag: 'a', title: 'A' },
      title: 'one',
      inBounds: () => true,
      inAllBounds: () => true,
      zoneInfo: () => []
    }
    const tm2 = {
      terrain: { tag: 'b', title: 'B' },
      title: 'two',
      inBounds: () => true,
      inAllBounds: () => true,
      zoneInfo: () => []
    }
    terrainsMaps.list = [tm1, tm2]

    const r = terrainsMaps.setByIndex(1)
    expect(r).toBe(tm2)
    expect(terrainsMaps.current).toBe(tm2)
    expect(terrainsMaps.setByIndex(null)).toBeNull()
  })

  test('setByTitle and setByTagBase find terrains by title or tag/bodyTag', () => {
    const tm = {
      terrain: { tag: 'TagX', title: 'Special', bodyTag: 'BodyX' },
      title: 'SpecialMap',
      inBounds: () => true,
      inAllBounds: () => true,
      zoneInfo: () => []
    }
    terrainsMaps.list = [tm]

    expect(terrainsMaps.setByTitle('Special')).toBe(tm)
    // setByTagBase should match either tag or bodyTag
    expect(terrainsMaps.setByTagBase('tagx')).toBe(tm)
    expect(terrainsMaps.setByTagBase('bodyx')).toBe(tm)
  })

  test('setByTerrain matches by tag property on list entries and setByTag falls back', () => {
    const tmDefault = {
      terrain: { tag: 'd', title: 'D' },
      title: 'default',
      inBounds: () => true,
      inAllBounds: () => true,
      zoneInfo: () => []
    }
    terrainsMaps.default = tmDefault
    terrainsMaps.list = [tmDefault]

    // setByTerrain looks for t.tag === terrain
    const tmEntry = {
      tag: 'entry',
      terrain: { tag: 'entry' },
      title: 'e',
      inBounds: () => true,
      inAllBounds: () => true,
      zoneInfo: () => []
    }
    terrainsMaps.list.push(tmEntry)
    expect(terrainsMaps.setByTerrain('entry')).toBe(tmEntry)

    // setByTag should fallback to default when no match
    expect(terrainsMaps.setByTag('nope')).toBe(tmDefault)
  })
})
