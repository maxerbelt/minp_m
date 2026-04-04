/* eslint-env jest */
/* global describe, it, expect */

import { CubeIndex } from './CubeIndex.js'

describe('CubeIndex line helpers', () => {
  it('segmentTo yields start and end and only valid coords', () => {
    const idx = new CubeIndex(2)
    // horizontal-ish line across cube
    const seg = Array.from(idx.segmentTo(-2, 0, 2, 0))
    expect(seg.length).toBeGreaterThan(0)
    expect(seg[0][0]).toBe(-2)
    expect(seg[0][1]).toBe(0)
    const last = seg[seg.length - 1]
    expect(last[0]).toBe(2)
    expect(last[1]).toBe(0)
    for (const [q, r] of seg) {
      const s = -q - r
      expect(idx.isValid(q, r, s)).toBe(true)
    }
  })

  it('segmentFor stops after requested distance', () => {
    const idx = new CubeIndex(2)
    const seg = Array.from(idx.segmentFor(-2, 0, 2, 0, 2))
    expect(seg.length).toBeGreaterThan(0)
    expect(seg.length).toBeLessThanOrEqual(2)
  })
})
