/* eslint-env jest */
/* global describe, it, expect, beforeEach */

import { MaskTri } from './maskTri.js'
import { ActionsTri } from './actionsTri.js'
import { TriIndex } from './TriIndex.js'

function allTriCoords (side) {
  const arr = []
  for (let r = 0; r < side; r++) {
    for (let c = 0; c <= 2 * r; c++) {
      arr.push([r, c])
    }
  }
  return arr
}

describe('MaskTri', () => {
  let mask

  beforeEach(() => {
    mask = new MaskTri(3)
  })

  it('constructs with given side', () => {
    expect(mask.side).toBe(3)
    expect(mask.indexer.size).toBe(allTriCoords(3).length)
    expect(mask.bits).toBe(0n)
  })

  it('index and bitPos agree and throw on invalid', () => {
    const idx = mask.index(0, 0)
    expect(typeof idx).toBe('number')
    expect(mask.bitPos(0, 0)).toBe(idx)
    expect(() => mask.index(5, 5)).toThrow(/Invalid triangle coordinates/)
  })

  it('set/test/clear operate on triangle coordinates', () => {
    expect(mask.test(0, 0)).toBe(false)
    mask.set(0, 0)
    expect(mask.test(0, 0)).toBe(true)
    expect(mask.at(0, 0)).toBe(1)
    mask.clear(0, 0)
    expect(mask.test(0, 0)).toBe(false)
  })

  it('keys/entries/values iterate in size order', () => {
    mask.set(1, 2)
    let kcount = 0
    for (const k of mask.keys()) {
      expect(k.length).toBe(3)
      kcount++
    }
    expect(kcount).toBe(mask.indexer.size)
    let ecount = 0
    for (const e of mask.entries()) {
      expect(e.length).toBe(5)
      ecount++
    }
    expect(ecount).toBe(mask.indexer.size)
    let vcount = 0
    for (const v of mask.values()) {
      expect(typeof v).toBe('number')
      vcount++
    }
    expect(vcount).toBe(mask.indexer.size)
  })

  it('fromCoords and static fromCoords', () => {
    const coords = [
      [0, 0],
      [1, 0]
    ]
    mask.fromCoords(coords)
    expect(mask.test(0, 0)).toBe(true)
    expect(mask.test(1, 0)).toBe(true)
    const mask2 = MaskTri.fromCoords(3, coords)
    expect(mask2.test(0, 0)).toBe(true)
  })

  it('toCoords returns list of set coords', () => {
    mask.set(0, 0)
    mask.set(1, 1)
    const coords = mask.toCoords
    expect(coords.some(c => c[0] === 0 && c[1] === 0)).toBe(true)
    expect(coords.some(c => c[0] === 1 && c[1] === 1)).toBe(true)
  })

  it('actions getter returns ActionsTri instance', () => {
    const actions = mask.actions
    expect(actions).toBeInstanceOf(ActionsTri)
    expect(mask.actions).toBe(actions)
  })

  describe('setIndex - regression tests for clear/toggle actions', () => {
    it('setIndex with color=1 sets bit at index', () => {
      const idx = mask.index(0, 0)
      mask.setIndex(idx, 1)
      expect(mask.at(0, 0)).toBe(1)
    })

    it('setIndex with color=0 clears bit at index', () => {
      // First set the bit
      mask.setIndex(mask.index(0, 0), 1)
      expect(mask.at(0, 0)).toBe(1)
      // Now clear it
      mask.setIndex(mask.index(0, 0), 0)
      expect(mask.at(0, 0)).toBe(0)
    })

    it('setIndex preserves other bits when setting', () => {
      const idx0 = mask.index(0, 0)
      const idx1 = mask.index(1, 1)
      const idx2 = mask.index(1, 2)

      // Set three different bits
      mask.setIndex(idx0, 1)
      mask.setIndex(idx1, 1)
      mask.setIndex(idx2, 1)

      // Clear middle one
      mask.setIndex(idx1, 0)

      // Check that others are still set
      expect(mask.at(0, 0)).toBe(1)
      expect(mask.at(1, 1)).toBe(0)
      expect(mask.at(1, 2)).toBe(1)
    })

    it('setIndex preserves other bits when clearing', () => {
      const idx0 = mask.index(0, 0)
      const idx1 = mask.index(1, 1)

      // Set both bits
      mask.setIndex(idx0, 1)
      mask.setIndex(idx1, 1)
      expect(mask.at(0, 0)).toBe(1)
      expect(mask.at(1, 1)).toBe(1)

      // Clear first bit
      mask.setIndex(idx0, 0)

      // Check first is cleared, second still set
      expect(mask.at(0, 0)).toBe(0)
      expect(mask.at(1, 1)).toBe(1)
    })

    it('setIndex correctly handles repeated set/clear cycles', () => {
      const idx = mask.index(0, 0)

      // Set, clear, set again
      mask.setIndex(idx, 1)
      expect(mask.at(0, 0)).toBe(1)

      mask.setIndex(idx, 0)
      expect(mask.at(0, 0)).toBe(0)

      mask.setIndex(idx, 1)
      expect(mask.at(0, 0)).toBe(1)
    })
  })
})
