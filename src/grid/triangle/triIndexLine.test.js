/* eslint-env jest */
/* global describe, it, expect */

import { TriIndex } from './TriIndex.js'

describe('TriIndex line helpers', () => {
  it('segmentTo yields start and end and only valid coords', () => {
    const idx = new TriIndex(5)
    const seg = Array.from(idx.segmentTo(0, 0, 4, 8))
    expect(seg.length).toBeGreaterThan(0)
    expect(seg[0][0]).toBe(0)
    expect(seg[0][1]).toBe(0)
    const last = seg[seg.length - 1]
    expect(last[0]).toBe(4)
    expect(last[1]).toBe(8)
    for (const [r, c] of seg) {
      expect(idx.isValid(r, c)).toBe(true)
    }
  })

  it('segmentFor stops after requested distance', () => {
    const idx = new TriIndex(5)
    const seg = Array.from(idx.segmentFor(0, 0, 4, 8, 3))
    expect(seg.length).toBeGreaterThan(0)
    expect(seg.length).toBeLessThanOrEqual(3)
  })
})
