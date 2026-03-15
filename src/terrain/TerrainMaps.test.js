/* eslint-env jest */

/* global describe, it, test, expect, beforeEach, afterEach, jest */

import { TerrainMaps } from './TerrainMaps.js'
import { jest } from '@jest/globals'

describe('TerrainMaps basic behaviors', () => {
  let origLocalStorage

  beforeEach(() => {
    // simple localStorage mock
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

  test('mapWithSize and hasMapSize find maps by dimensions', () => {
    const terrain = {
      title: 'T',
      key: 't',
      ships: {
        baseShapes: [],
        sunkDescriptions: {},
        letterColors: {},
        description: {},
        types: {},
        colors: {},
        shapesByLetter: {}
      },
      minWidth: 1,
      maxWidth: 10,
      minHeight: 1,
      maxHeight: 10,
      getCustomMaps: () => [],
      getCustomMapTitles: () => []
    }
    const list = [{ rows: 2, cols: 3, title: 'm1' }]
    const tm = new TerrainMaps(terrain, list, list[0], 'wp')

    expect(tm.mapWithSize(2, 3)).toBe(list[0])
    expect(tm.hasMapSize(2, 3)).toBe(true)
    expect(tm.hasMapSize(5, 5)).toBe(false)
  })

  test('prefilledMapIndex and mapTitles and maps combine custom titles', () => {
    const terrain = {
      title: 'T',
      key: 't',
      ships: {
        baseShapes: [],
        sunkDescriptions: {},
        letterColors: {},
        description: {},
        types: {},
        colors: {},
        shapesByLetter: {}
      },
      minWidth: 1,
      maxWidth: 10,
      minHeight: 1,
      maxHeight: 10,
      getCustomMaps: () => [{ rows: 4, cols: 5, title: 'cm' }],
      getCustomMapTitles: () => ['cm']
    }
    const list = [{ rows: 2, cols: 3, title: 'm1' }]
    const tm = new TerrainMaps(terrain, list, list[0], 'wp')

    expect(tm.prefilledMapIndex('m1')).toBe(0)
    expect(tm.mapTitles()).toEqual(['m1', 'cm'])
    expect(tm.maps()).toEqual([
      { rows: 2, cols: 3, title: 'm1' },
      { rows: 4, cols: 5, title: 'cm' }
    ])
  })

  test('getLastWidth/Height and storeLastWidth/Height interact with localStorage and ranges', () => {
    const terrain = {
      title: 'T',
      key: 't',
      tag: 'tg',
      ships: {
        baseShapes: [],
        sunkDescriptions: {},
        letterColors: {},
        description: {},
        types: {},
        colors: {},
        shapesByLetter: {}
      },
      minWidth: 2,
      maxWidth: 8,
      minHeight: 2,
      maxHeight: 8,
      getCustomMaps: () => [],
      getCustomMapTitles: () => []
    }
    const list = [{ rows: 2, cols: 3, title: 'm1' }]
    const tm = new TerrainMaps(terrain, list, list[0], 'wp')

    // no stored values -> returns default or min
    expect(tm.getLastWidth(5)).toBe(5)
    expect(tm.getLastHeight(6)).toBe(6)

    // store values and read back
    tm.storeLastWidth(4)
    tm.storeLastHeight(3)
    expect(tm.getLastWidth(5)).toBe(4)
    expect(tm.getLastHeight(6)).toBe(3)

    // out of range (too small) should return default or min
    tm.storeLastWidth(1)
    expect(tm.getLastWidth(5)).toBe(5)
  })
})
