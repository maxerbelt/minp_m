/* eslint-env jest */
/* global describe, it, expect */

import { TriRectIndex } from './TriRectIndex.js'

// helper for manually computing expected size using odd-row pattern
function computeSize (h, w) {
  let s = 0
  for (let r = 0; r < h; r++) {
    s += Math.min(2 * r + 1, w)
  }
  return s
}

describe('TriRectIndex', () => {
  it('calculates size correctly for various dimensions', () => {
    const idx1 = new TriRectIndex(4, 5) // width >= height
    expect(idx1.size).toBe(computeSize(4, 5))
    expect(idx1.size).toBe(14) // rows:1,3,5,5 due to width cap

    const idx2 = new TriRectIndex(5, 3) // width < height
    expect(idx2.size).toBe(computeSize(5, 3))
    // rows:1,3,3,3,3 => total 13
    expect(idx2.size).toBe(13)
  })

  it('indexes and locates cells in bounds', () => {
    const idx = new TriRectIndex(5, 3)
    // manually check a few coordinates with odd pattern
    expect(idx.index(0, 0)).toBe(0)
    expect(idx.index(1, 0)).toBe(1)
    expect(idx.index(1, 2)).toBe(3) // row1 has three columns
    // row two has max width 3, rowCount = 3
    expect(idx.index(2, 0)).toBe(4)
    expect(idx.index(2, 2)).toBe(6)
    // location reverse
    expect(idx.location(0)).toEqual([0, 0])
    expect(idx.location(3)).toEqual([1, 2])
    expect(idx.location(6)).toEqual([2, 2])
  })

  it('returns undefined for out-of-bounds queries', () => {
    const idx = new TriRectIndex(3, 2)
    expect(idx.index(-1, 0)).toBeUndefined()
    expect(idx.index(0, 2)).toBeUndefined()
    expect(idx.index(2, 2)).toBeUndefined()
    expect(idx.location(-1)).toBeUndefined()
    expect(idx.location(idx.size)).toBeUndefined()
  })

  it('isValid only allows coordinates inside triangular region', () => {
    const idx = new TriRectIndex(4, 3)
    expect(idx.isValid(0, 0)).toBe(true)
    expect(idx.isValid(3, 2)).toBe(true) // row3 max col =2*3=6 but width=3 forces 2
    expect(idx.isValid(3, 3)).toBe(false) // width limit
    expect(idx.isValid(2, 3)).toBe(false)
    expect(idx.isValid(4, 0)).toBe(false)
  })

  it('keys iterator produces correct triples', () => {
    const idx = new TriRectIndex(3, 2)
    const keys = Array.from(idx.keys())
    // width=2 truncates rows greater than 2 elements
    expect(keys).toEqual([
      [0, 0, 0],
      [1, 0, 1],
      [1, 1, 2],
      [2, 0, 3],
      [2, 1, 4]
    ])
  })
})
