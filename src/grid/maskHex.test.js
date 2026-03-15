/* eslint-env jest */
/* global describe, it, expect, beforeEach */

import { MaskHex } from './maskHex.js'
import { ActionsHex } from './actionHex.js'

// helper: generate all cube coords within radius
function allCoords (radius) {
  const arr = []
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r
      if (Math.abs(s) <= radius) arr.push([q, r, s])
    }
  }
  return arr
}

describe.skip('MaskHex', () => {
  let mask

  beforeEach(() => {
    mask = new MaskHex(2)
  })

  it('constructs with given radius', () => {
    expect(mask.radius).toBe(2)
    expect(mask.indexer.size).toBe(allCoords(2).length)
    expect(mask.bits).toBe(0n)
  })

  it('index and bitPos agree and throw on invalid', () => {
    const idx = mask.index(0, 0, 0)
    expect(typeof idx).toBe('number')
    expect(mask.bitPos(0, 0, 0)).toBe(idx)
    expect(() => mask.index(5, 5, 5)).toThrow(/Invalid cube coordinates/)
  })

  it('set/test/clear operate on cube coordinates', () => {
    expect(mask.test(0, 0, 0)).toBe(false)
    mask.set(0, 0, 0)
    expect(mask.test(0, 0, 0)).toBe(true)
    expect(mask.at(0, 0, 0)).toBe(1)
    mask.clear(0, 0, 0)
    expect(mask.test(0, 0, 0)).toBe(false)
  })

  it('keys/entries/values iterate in size order', () => {
    mask.set(0, 0, 0)
    let kcount = 0
    for (const k of mask.keys()) {
      expect(k.length).toBe(4)
      kcount++
    }
    expect(kcount).toBe(mask.indexer.size)
    let ecount = 0
    for (const e of mask.entries()) {
      expect(e.length).toBe(6)
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
      [0, 0, 0],
      [1, -1, 0]
    ]
    mask.fromCoords(coords)
    expect(mask.test(0, 0, 0)).toBe(true)
    expect(mask.test(1, -1, 0)).toBe(true)
    const mask2 = MaskHex.fromCoords(2, coords)
    expect(mask2.test(0, 0, 0)).toBe(true)
  })

  it('toCoords returns list of set coords', () => {
    mask.set(0, 0, 0)
    mask.set(1, -1, 0)
    const coords = mask.toCoords
    expect(coords.some(c => c[0] === 0 && c[1] === 0 && c[2] === 0)).toBe(true)
    expect(coords.some(c => c[0] === 1 && c[1] === -1 && c[2] === 0)).toBe(true)
  })

  it('actions getter returns ActionsHex instance', () => {
    const actions = mask.actions
    expect(actions).toBeInstanceOf(ActionsHex)
    // repeated call returns same object when bits unchanged
    expect(mask.actions).toBe(actions)
  })

  describe('setIndex - regression tests for clear/toggle actions', () => {
    it('setIndex with color=1 sets bit at index', () => {
      const idx = mask.index(0, 0, 0)
      mask.setIndex(idx, 1)
      expect(mask.at(0, 0, 0)).toBe(1)
    })

    it('setIndex with color=0 clears bit at index', () => {
      // First set the bit
      mask.setIndex(mask.index(0, 0, 0), 1)
      expect(mask.at(0, 0, 0)).toBe(1)
      // Now clear it
      mask.setIndex(mask.index(0, 0, 0), 0)
      expect(mask.at(0, 0, 0)).toBe(0)
    })

    it('setIndex preserves other bits when setting', () => {
      const idx0 = mask.index(0, 0, 0)
      const idx1 = mask.index(1, -1, 0)
      const idx2 = mask.index(0, 1, -1)

      // Set three different bits
      mask.setIndex(idx0, 1)
      mask.setIndex(idx1, 1)
      mask.setIndex(idx2, 1)

      // Clear middle one
      mask.setIndex(idx1, 0)

      // Check that others are still set
      expect(mask.at(0, 0, 0)).toBe(1)
      expect(mask.at(1, -1, 0)).toBe(0)
      expect(mask.at(0, 1, -1)).toBe(1)
    })

    it('setIndex preserves other bits when clearing', () => {
      const idx0 = mask.index(0, 0, 0)
      const idx1 = mask.index(1, -1, 0)

      // Set both bits
      mask.setIndex(idx0, 1)
      mask.setIndex(idx1, 1)
      expect(mask.at(0, 0, 0)).toBe(1)
      expect(mask.at(1, -1, 0)).toBe(1)

      // Clear first bit
      mask.setIndex(idx0, 0)

      // Check first is cleared, second still set
      expect(mask.at(0, 0, 0)).toBe(0)
      expect(mask.at(1, -1, 0)).toBe(1)
    })

    it('setIndex correctly handles repeated set/clear cycles', () => {
      const idx = mask.index(0, 0, 0)

      // Set, clear, set again
      mask.setIndex(idx, 1)
      expect(mask.at(0, 0, 0)).toBe(1)

      mask.setIndex(idx, 0)
      expect(mask.at(0, 0, 0)).toBe(0)

      mask.setIndex(idx, 1)
      expect(mask.at(0, 0, 0)).toBe(1)
    })
  })
})
