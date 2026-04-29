/* eslint-env jest */

/* global describe,it,expect,beforeEach,jest */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

import { MaskTri } from './maskTri.js'
import { ActionsTri } from './actionsTri.js'

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

  it('dilateBits expands across triangle axes beyond the same row', () => {
    mask.set(1, 1)
    const dilated = new MaskTri(3)
    dilated.bits = mask.dilateBits(1)

    expect(dilated.test(0, 0)).toBe(true)
    expect(dilated.test(2, 1)).toBe(true)
    expect(dilated.test(1, 0)).toBe(true)
    expect(dilated.test(1, 2)).toBe(true)
  })

  it('dilateBits from a down-oriented triangle includes all 12 neighbors', () => {
    const maskDown = new MaskTri(10)
    maskDown.set(4, 5)
    const dilated = new MaskTri(10)
    dilated.bits = maskDown.dilateBits(1)

    expect(dilated.test(4, 5)).toBe(true)
    expect(dilated.toCoords.length).toBe(13)
  })

  it('dilateBits from a centered cell includes all 12 triangle neighbors', () => {
    const large = new MaskTri(8)
    large.set(4, 4)
    const dilated = new MaskTri(8)
    dilated.bits = large.dilateBits(1)

    expect(dilated.bits).not.toBe(0n)
    expect(dilated.test(4, 4)).toBe(true)
    expect(dilated.toCoords.length).toBe(13)
  })

  it('dilateCrossBits expands only to the 3 edge neighbors of a triangle cell', () => {
    const large = new MaskTri(5)
    large.set(2, 1)
    const dilated = new MaskTri(5)
    dilated.bits = large.dilateCrossBits()

    expect(dilated.test(2, 1)).toBe(true)
    expect(dilated.toCoords.length).toBe(4)
  })

  it('erodeBits removes cells missing triangle neighbors at the edge', () => {
    mask.set(1, 1)
    mask.set(1, 0)
    mask.set(1, 2)
    mask.set(2, 1)
    mask.set(2, 2)
    // intentionally omit one valid neighbor so center cell should erode
    const eroded = new MaskTri(3)
    eroded.bits = mask.erodeBits(1)

    expect(eroded.test(1, 1)).toBe(false)
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

  it('clone creates a valid triangular mask with same side and bits', () => {
    mask.set(0, 0)
    mask.set(1, 1)
    const clone = mask.clone
    expect(clone).toBeInstanceOf(MaskTri)
    expect(clone.side).toBe(mask.side)
    expect(clone.test(0, 0)).toBe(true)
    expect(clone.test(1, 1)).toBe(true)
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
