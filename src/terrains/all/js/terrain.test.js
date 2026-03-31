/* eslint-env jest */

/* global describe, it, test, expect, beforeEach, afterEach, jest */
import { addCellToFootPrint } from './terrain.js'
import { SubTerrainTracker, SubTerrainTrackers } from './SubTerrainTrackers.js'
import { Zone } from './Zone.js'
import { SubTerrain } from './SubTerrain.js'

describe('terrain utilities', () => {
  test('addCellToFootPrint adds 9 neighbor keys including center', () => {
    const fp = new Set()
    addCellToFootPrint(2, 3, fp)
    expect(fp.has('2,3')).toBe(true)
    expect(fp.size).toBe(9)
    expect(fp.has('1,2')).toBe(true)
  })

  test('SubTerrain properties and validators', () => {
    const zMargin = new Zone('margin', 'M', true)
    const zCore = new Zone('core', 'C', false)
    const sub = new SubTerrain('Land', '#fff', '#000', 'L', true, true, [
      zMargin,
      zCore
    ])

    expect(sub.tag).toBe('land')
    expect(sub.margin).toBe(zMargin)
    expect(sub.core).toBe(zCore)
    // canBe should return true when same subterrain
    expect(sub.canBe(sub)).toBe(true)
    // validator uses canBe via zoneInfo
    expect(sub.validator([sub])).toBe(true)
    expect(sub.zoneDetail).toBe(1)
  })

  test('SubTerrainTracker set, recalc and footprint behaviors', () => {
    const zMargin = new Zone('margin', 'M', true)
    const zCore = new Zone('core', 'C', false)
    const sub = new SubTerrain('Land', '#fff', '#000', 'L', true, true, [
      zMargin,
      zCore
    ])

    const tracker = new SubTerrainTracker(sub)

    const map = {
      rows: 3,
      cols: 3,
      inBounds: (r, c) => r >= 0 && r < 3 && c >= 0 && c < 3,
      isLand: (r, c) => r === 1 && c === 1
    }

    // set single land cell
    tracker.set(1, 1, map)
    expect(tracker.total.has('1,1')).toBe(true)
    // because neighbors differ, it should be in margin
    expect(tracker.margin.has('1,1')).toBe(true)
    expect(tracker.core.size).toBe(0)

    // recalc will clear and recalc totals from map
    tracker.recalc(map)
    expect(tracker.totalSize).toBe(1)

    // calcFootPrint produces a footprint containing neighbors
    tracker.calcFootPrint()
    expect(tracker.footprint.has('1,1')).toBe(true)
    expect(tracker.footprint.has('0,0')).toBe(true)
  })

  test('SubTerrainTrackers helpers locate subterrain by coords', () => {
    const zMargin = new Zone('m', 'M', true)
    const zCore = new Zone('c', 'C', false)
    const a = new SubTerrain('A', '#a', '#b', 'A', false, false, [
      zMargin,
      zCore
    ])
    const b = new SubTerrain('B', '#a', '#b', 'B', false, true, [
      zMargin,
      zCore
    ])

    const sts = new SubTerrainTrackers([a, b])
    // manually populate first tracker total
    sts.list[0].total.add('0,0')
    expect(sts.subterrain(0, 0)).toBe(sts.list[0].subterrain)
  })
})
