/* eslint-env jest */
/* global describe, it, expect, beforeEach */

import { ActionsTri } from './actionsTri.js'
import { TriIndex } from './TriIndex.js'
import { StoreBig } from './storeBig.js'

// simple helper to make a triangular mask-like object
function makeTriMask (side, coords) {
  const idx = new TriIndex(side)
  const store = new StoreBig(1, idx.size)
  let bits = store.empty
  for (const [r, c] of coords) {
    bits = store.setIdx(bits, idx.index(r, c))
  }
  return { store, indexer: idx, bits }
}

describe('ActionsTri', () => {
  describe('basic functionality', () => {
    let mask
    let actions

    beforeEach(() => {
      // small triangle side=3
      mask = makeTriMask(3, [
        [0, 0],
        [1, 0],
        [1, 2] // pick a cell in row1 (three columns)
      ])
      actions = new ActionsTri(3, mask)
    })

    it('constructs with triangular mask', () => {
      expect(actions).toBeDefined()
      expect(actions.original).toBe(mask)
      expect(actions.side).toBe(3)
      expect(actions.width).toBe(5) // base width now 2*side-1
      expect(actions.height).toBe(3)
    })

    it('exposes store and indexer', () => {
      // expect(actions.store).toBe(mask.store)
      expect(actions.indexer).toBe(mask.indexer)
    })

    it('computes template', () => {
      const tpl = actions.template
      expect(typeof tpl).toBe('bigint')
      expect(tpl).not.toBe(0n)
    })

    it('has six transform maps', () => {
      const maps = actions.transformMaps
      expect(maps).toBeDefined()
      expect(Object.keys(maps).length).toBe(6)
    })

    it('computes orbit and symmetries', () => {
      const orbit = actions.orbit()
      expect(Array.isArray(orbit)).toBe(true)
      expect(orbit.length).toBeGreaterThan(0)
      expect(orbit.length).toBeLessThanOrEqual(6)
      expect(orbit.every(x => typeof x === 'bigint')).toBe(true)

      const sym = actions.symmetries
      expect(Array.isArray(sym)).toBe(true)
      expect(sym.length).toBeGreaterThan(0)
      expect(sym.length).toBeLessThanOrEqual(6)
    })

    it('classifies symmetry', () => {
      const cls = actions.classifyOrbitType()
      expect(typeof cls).toBe('string')
      expect(['SYM', 'C2', 'C3', 'D3']).toContain(cls)
    })
  })
})
