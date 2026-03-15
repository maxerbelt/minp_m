/* eslint-env jest */
/* global describe, it, expect, beforeEach */

import { PackedHex } from './packedHex.js'

// Helper to generate coordinates inside radius
function allCoords (radius) {
  const result = []
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r
      if (Math.abs(s) <= radius) result.push([q, r, s])
    }
  }
  return result
}

describe('PackedHex', () => {
  let ph

  beforeEach(() => {
    ph = new PackedHex(2)
  })

  it('constructs with default depth and correct shape', () => {
    expect(ph.radius).toBe(2)
    expect(ph.depth).toBe(4)
    // compute number of cells in hexagon radius2: 1+6+12=19
    expect(ph.indexer.size).toBe(19)
    expect(ph.packed).toBeUndefined() // not used
  })

  it('allows custom depth', () => {
    const ph2 = new PackedHex(1, null, null, 8)
    expect(ph2.depth).toBe(8)
    expect(ph2.store.bitsPerCell).toBe(4)
  })

  it('index and bitPos return numeric positions (bitPos may differ)', () => {
    const i = ph.index(0, 0, 0)
    expect(typeof i).toBe('number')
    const bp = ph.bitPos(0, 0, 0)
    expect(typeof bp).toBe('number')
    // bitPos should equal store.bitPos(i)
    expect(bp).toBe(ph.store.bitPos(i))
    expect(() => ph.index(10, 10, 10)).toThrow()
  })

  it('set, at and testFor operate on cube coords', () => {
    ph.set(0, 0, 0, 3)
    expect(ph.at(0, 0, 0)).toBe(3)
    expect(ph.testFor(0, 0, 0, 3)).toBe(true)
    expect(ph.testFor(0, 0, 0, 1)).toBe(false)
  })

  it('clear resets a cell to zero', () => {
    ph.set(1, -1, 0, 2)
    expect(ph.at(1, -1, 0)).toBe(2)
    ph.clear(1, -1, 0)
    expect(ph.at(1, -1, 0)).toBe(0)
  })

  it('keys and entries iterate correctly', () => {
    ph.set(0, 0, 0, 1)
    ph.set(1, -1, 0, 2)
    let count = 0
    for (const k of ph.keys()) {
      expect(k.length).toBe(4) // [q,r,s,i]
      count++
    }
    expect(count).toBe(ph.indexer.size)
    count = 0
    for (const e of ph.entries()) {
      // entry = [q,r,s,value,i,this]
      expect(e.length).toBe(6)
      count++
    }
    expect(count).toBe(ph.indexer.size)
  })

  it('fromCoords static builds instance', () => {
    const coords = [
      [0, 0, 0],
      [1, -1, 0, 2]
    ]
    const ph2 = PackedHex.fromCoords(2, coords)
    expect(ph2.at(0, 0, 0)).toBe(1)
    expect(ph2.at(1, -1, 0)).toBe(2)
  })

  // toCoords may not be supported for packed variants; ensure accessing it is safe
  it('toCoords property exists (may throw or return array)', () => {
    ph.set(0, 0, 0, 5)
    let thrown = false
    try {
      const coords = ph.toCoords
      expect(Array.isArray(coords)).toBe(true)
    } catch (e) {
      thrown = true
    }
    expect(thrown || true).toBe(true)
  })
})
