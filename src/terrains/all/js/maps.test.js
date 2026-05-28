/**
 * @fileoverview Test suite for terrainsMaps terrain configuration management.
 * Tests terrain map registration, selection, and integration with the placing target
 * validator system for ship placement constraints.
 * @module terrains/all/js/maps.test
 */

import { terrainsMaps } from './maps.js'
import { placingTarget } from '../../../variants/placingTarget.js'
import { terrains } from './terrains.js'
import { jest } from '@jest/globals'

/**
 * Test suite for terrainsMaps registry functionality.
 * Validates terrain map registration, selection by various criteria,
 * and integration with placement validation system.
 */
describe('terrainsMaps behaviors', () => {
  /**
   * Snapshot of original terrainsMaps.list state.
   * Restored after each test to prevent test pollution.
   * @type {*}
   */
  let origList

  /**
   * Snapshot of original terrainsMaps.current state.
   * Restored after each test to prevent test pollution.
   * @type {*}
   */
  let origCurrent

  /**
   * Snapshot of original terrainsMaps.onChange callback.
   * Restored after each test to prevent test pollution.
   * @type {*}
   */
  let origOnChange

  /**
   * Snapshot of original terrains.terrains list.
   * Restored after each test to prevent test pollution.
   * @type {*}
   */
  let origTerrainsList

  /**
   * Setup before each test: capture state snapshots and reset to clean state.
   * Ensures test isolation by preventing cross-test state contamination.
   */
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

  /**
   * Cleanup after each test: restore original state from snapshots.
   * Ensures test isolation and no side effects on subsequent tests.
   */
  afterEach(() => {
    terrainsMaps.list = origList
    terrainsMaps.current = origCurrent
    terrainsMaps.onChange = origOnChange
    terrains.terrains = origTerrainsList
  })

  /**
   * Verifies terrainsMaps.add() registers terrain maps and associated terrain in registry.
   * Tests that adding a terrain map includes it in the maps list and registers
   * its terrain property in the terrains registry.
   */
  test('add pushes terrainMaps and registers terrain', () => {
    /** @type {any} */
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

  /**
   * Verifies terrainsMaps.setCurrent() updates current map and binds placingTarget validators.
   * Tests that setting a terrain map as current updates the internal state and
   * properly configures the placingTarget with terrain-specific validation functions.
   */
  test('setCurrent updates current and binds placingTarget checkers', () => {
    /** @type {any} */
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

  /**
   * Verifies terrainsMaps.setByIndex() selects terrain map by list index.
   * Tests that setByIndex returns the terrain map at the specified index,
   * sets it as current, and returns null for invalid indices.
   */
  test('setByIndex returns element or null', () => {
    /** @type {any} */
    const tm1 = {
      terrain: { tag: 'a', title: 'A' },
      title: 'one',
      inBounds: () => true,
      inAllBounds: () => true,
      zoneInfo: () => []
    }
    /** @type {any} */
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

  /**
   * Verifies terrainsMaps.setByTitle() and setByTagBase() match by terrain properties.
   * Tests that setByTitle finds terrain maps by terrain.title,
   * and setByTagBase matches by terrain.tag or terrain.bodyTag (case-insensitive).
   */
  test('setByTitle and setByTagBase find terrains by title or tag/bodyTag', () => {
    /** @type {any} */
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

  /**
   * Verifies terrainsMaps.setByTerrain() and setByTag() handle matching and fallback.
   * Tests that setByTerrain matches terrain maps by tag property,
   * and setByTag falls back to default when no match is found.
   */
  test('setByTerrain matches by tag property on list entries and setByTag falls back', () => {
    /** @type {any} */
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
    /** @type {any} */
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
