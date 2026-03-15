/* eslint-env jest */

/* global describe, it, test, expect, beforeEach, afterEach, jest */

import { inRange, CustomBlankMap, SavedCustomMap } from './map.js'
import { oldToken } from './terrain.js'
import { jest } from '@jest/globals'

describe('map.js basic utilities', () => {
  let origLocalStorage

  beforeEach(() => {
    const store = new Map()
    origLocalStorage = globalThis.localStorage
    globalThis.localStorage = {
      getItem: key => (store.has(key) ? store.get(key) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k)
    }
  })
  afterEach(() => {
    globalThis.localStorage = origLocalStorage
  })

  test('inRange returns matcher for row and column span', () => {
    const matcher = inRange(2, 3)
    // element format [r, cmin, cmax]
    expect(matcher([2, 1, 3])).toBe(true)
    expect(matcher([2, 3, 4])).toBe(true)
    expect(matcher([1, 1, 5])).toBe(false)
    expect(matcher([2, 4, 6])).toBe(false)
  })

  test('CustomBlankMap indexToken uses oldToken and terrain key', () => {
    const terrain = {
      key: 'my-ter',
      title: 'My Terrain',
      subterrains: [],
      ships: { baseShapes: [] }
    }
    const cb = new CustomBlankMap(6, 8, terrain)
    const token = cb.indexToken(6, 8)
    expect(token).toBe(`${oldToken}.${terrain.key}-index-8x6`)
  })

  test('CustomBlankMap addLand and isLand work via withModifyable', () => {
    const terrain = { key: 'k', title: 'T', subterrains: [] }
    const cb = new CustomBlankMap(4, 5, terrain)
    // initially not land
    expect(cb.isLand(1, 2)).toBe(false)
    cb.addLand(1, 2)
    expect(cb.isLand(1, 2)).toBe(true)
    // out of bounds should be ignored
    cb.addLand(999, 999)
    expect(cb.isLand(999, 999)).toBe(false)
  })

  test('SavedCustomMap.loadObj/load and remove interact with localStorage and terrain', () => {
    const title = 'saved-map-1'
    const key = `${oldToken}.${title}`

    // ensure loadObj returns null when missing
    expect(SavedCustomMap.loadObj(title)).toBeNull()
    expect(SavedCustomMap.load(title)).toBeNull()

    // craft a minimal saved object and write to localStorage
    const data = {
      title: title,
      rows: 3,
      cols: 4,
      shipNum: 0,
      land: [],
      terrain: {
        title: 'T',
        subterrains: [],
        ships: {
          baseShapes: [],
          sunkDescriptions: {},
          letterColors: {},
          description: {},
          types: {},
          colors: {},
          shapesByLetter: {}
        }
      },
      weapons: [],
      example: false
    }

    localStorage.setItem(key, JSON.stringify(data))

    const loaded = SavedCustomMap.load(title)
    expect(loaded).not.toBeNull()
    expect(loaded.title).toBe(title)

    // patch terrain.deleteCustomMaps to observe call during remove
    const called = { deleted: false }
    loaded.terrain.deleteCustomMaps = t => {
      called.deleted = t === title
    }

    // ensure key exists then remove
    expect(localStorage.getItem(key)).not.toBeNull()
    loaded.remove()
    expect(localStorage.getItem(key)).toBeNull()
    expect(called.deleted).toBe(true)
  })
})
