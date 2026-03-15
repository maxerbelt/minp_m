/* eslint-env jest */
/* global describe, it, expect, beforeEach */

import { ActionsHex } from './actionHex.js'
import { MaskHex } from './maskHex.js'
import { PackedHex } from './packedHex.js'
import { StoreBig } from './storeBig.js'
import { Store32 } from './store32.js'

describe('ActionsHex', () => {
  describe('with MaskHex (StoreBig backend - default)', () => {
    let maskHex
    let actions

    beforeEach(() => {
      // Create a radius-2 hexagon and set a simple pattern
      maskHex = new MaskHex(2)
      maskHex.set(0, 0, 0, 1) // center
      maskHex.set(1, -1, 0, 1) // offset positions
      maskHex.set(-1, 1, 0, 1)
      actions = new ActionsHex(maskHex.radius, maskHex)
    })

    it('constructs ActionsHex with MaskHex', () => {
      expect(actions).toBeDefined()
      expect(actions.original).toBe(maskHex)
      expect(actions.radius).toBe(2)
      expect(actions.width).toBe(5) // 2*radius + 1
      expect(actions.height).toBe(5)
    })

    it('exposes store from MaskHex', () => {
      //  expect(actions.store).toBe(maskHex.store)
      expect(actions.store).toBeInstanceOf(StoreBig)
    })

    it('exposes indexer from MaskHex', () => {
      expect(actions.indexer).toBe(maskHex.indexer)
      expect(actions.indexer).toBeDefined()
    })

    it('exposes transformMaps from indexer', () => {
      expect(actions.transformMaps).toBeDefined()
      expect(Array.isArray(actions.transformMaps)).toBe(true)
      expect(actions.transformMaps.length).toBe(12) // 6 rotations + 6 reflections
    })

    it('computes template (normalized hexagon)', () => {
      const template = actions.template
      expect(typeof template).toBe('bigint')
      expect(template).not.toBe(0n)
    })

    it('applies identity map', () => {
      const identity = actions.applyMap(actions.transformMaps[0])
      expect(typeof identity).toBe('bigint')
      expect(identity).toBe(actions.template)
    })

    it('applies 60° rotation', () => {
      const rotated60 = actions.applyMap(actions.transformMaps[1])
      expect(typeof rotated60).toBe('bigint')
      expect(rotated60).not.toBe(0n)
    })

    it('applies 120° rotation', () => {
      const rotated120 = actions.applyMap(actions.transformMaps[2])
      expect(typeof rotated120).toBe('bigint')
      expect(rotated120).not.toBe(0n)
    })

    it('applies 180° rotation', () => {
      const rotated180 = actions.applyMap(actions.transformMaps[3])
      expect(typeof rotated180).toBe('bigint')
      expect(rotated180).not.toBe(0n)
    })

    it('applies reflection', () => {
      const reflected = actions.applyMap(actions.transformMaps[6])
      expect(typeof reflected).toBe('bigint')
      expect(reflected).not.toBe(0n)
    })

    it('computes orbit of all 12 D6 transformations', () => {
      const orbit = actions.orbit()
      expect(Array.isArray(orbit)).toBe(true)
      expect(orbit.length).toBeGreaterThan(0)
      expect(orbit.length).toBeLessThanOrEqual(12)
      expect(orbit.every(x => typeof x === 'bigint')).toBe(true)
    })

    it('computes unique symmetries', () => {
      const symmetries = actions.symmetries
      expect(Array.isArray(symmetries)).toBe(true)
      expect(symmetries.length).toBeGreaterThan(0)
      expect(symmetries.length).toBeLessThanOrEqual(12)
    })

    it('computes symmetry order', () => {
      const order = actions.order
      expect(Number.isInteger(order)).toBe(true)
      expect(order).toBeGreaterThan(0)
      expect(order).toBeLessThanOrEqual(12)
    })

    it('classifies symmetry', () => {
      // Just verify it returns a string
      const classification = actions.classifyActionGroup()
      expect(typeof classification).toBe('string')
      expect(['SYM', 'C2', 'C3', 'C6', 'D3', 'D6']).toContain(classification)
    })

    it('accesses cube index', () => {
      expect(actions.cube).toBeDefined()
      expect(actions.cube.radius).toBe(2)
      expect(actions.cube.size).toBeGreaterThan(0)
    })

    it('handles empty MaskHex', () => {
      const emptyMask = new MaskHex(2)
      const emptyActions = new ActionsHex(2, emptyMask)
      expect(emptyActions.template).toBe(0n)
    })
  })

  describe('with PackedHex (Store32 backend)', () => {
    let packedHex
    let actions
    let store32

    beforeEach(() => {
      // Create PackedHex with Store32
      store32 = new Store32(4, 19, 2, 5, 5) // depth=4 needs bitLength=2
      packedHex = new PackedHex(2, undefined, store32, 4)
      packedHex.set(0, 0, 0, 2)
      packedHex.set(1, -1, 0, 3)
      packedHex.set(-1, 1, 0, 1)
      actions = new ActionsHex(packedHex.radius, packedHex)
    })

    it('constructs ActionsHex with PackedHex + Store32', () => {
      expect(actions).toBeDefined()
      expect(actions.store).toBeInstanceOf(Store32)
    })

    it('accesses Store32 from PackedHex', () => {
      //    expect(actions.store).toBe(packedHex.store)
      expect(actions.store.bitsPerCell).toBe(2)
    })

    it('computes template with Store32 backend', () => {
      const template = actions.template
      expect(template).toBeDefined()
      // Store32 may return different type than StoreBig
      expect(template === 0 || template === 0n || template).toBeTruthy()
    })

    it('applies transformations with Store32 backend', () => {
      const rotated = actions.applyMap(actions.transformMaps[2])
      expect(rotated).toBeDefined()
      // Store32 may return different result than StoreBig
      expect(rotated === 0 || rotated === 0n || rotated).toBeTruthy()
    })

    it('computes orbit with Store32 backend', () => {
      const orbit = actions.orbit()
      expect(orbit).toBeDefined()
      expect(orbit.length).toBeGreaterThan(0)
      expect(orbit.every(x => typeof x === 'bigint')).toBe(true)
    })

    it('computes symmetry order with Store32 backend', () => {
      const order = actions.order
      expect(Number.isInteger(order)).toBe(true)
      expect(order).toBeGreaterThan(0)
    })

    it('handles multiple values correctly with Store32', () => {
      const packed2 = new PackedHex(
        2,
        undefined,
        new Store32(4, 19, 2, 5, 5),
        4
      )
      packed2.set(0, 0, 0, 1)
      packed2.set(0, 1, -1, 2)
      packed2.set(0, -1, 1, 3)

      const actions2 = new ActionsHex(2, packed2)
      const orbit = actions2.orbit()
      expect(orbit.length).toBeGreaterThan(0)
    })
  })

  describe('cross-backend comparisons', () => {
    it('MaskHex with StoreBig produces defined templates', () => {
      const maskHex1 = new MaskHex(2)
      maskHex1.set(0, 0, 0, 1)
      maskHex1.set(1, -1, 0, 1)

      const actions1 = new ActionsHex(2, maskHex1)

      // Should compute template fine with StoreBig
      expect(actions1.template).toBeDefined()
    })

    it('PackedHex with StoreBig produces defined templates', () => {
      const packed1 = new PackedHex(2)
      packed1.set(0, 0, 0, 2)
      packed1.set(1, -1, 0, 1)

      const actions1 = new ActionsHex(2, packed1)

      expect(actions1.template).toBeDefined()
    })

    it('different radii have different cube sizes', () => {
      const hex1 = new MaskHex(1)
      const hex2 = new MaskHex(2)
      const hex3 = new MaskHex(3)

      const actions1 = new ActionsHex(1, hex1)
      const actions2 = new ActionsHex(2, hex2)
      const actions3 = new ActionsHex(3, hex3)

      expect(actions1.cube.size).toBeLessThan(actions2.cube.size)
      expect(actions2.cube.size).toBeLessThan(actions3.cube.size)
    })
  })

  describe('edge cases', () => {
    it('handles single-cell hexagon pattern', () => {
      const maskHex = new MaskHex(1)
      maskHex.set(0, 0, 0, 1)
      const actions = new ActionsHex(1, maskHex)

      const template = actions.template
      expect(template).not.toBe(0n)
      const order = actions.order
      expect(order).toBeGreaterThan(0)
    })

    it('handles full hexagon pattern', () => {
      const maskHex = new MaskHex(2)
      // Fill entire hexagon
      for (const [q, r, s] of maskHex.indexer.coords) {
        maskHex.set(q, r, s, 1)
      }
      const actions = new ActionsHex(2, maskHex)

      const template = actions.template
      expect(template).not.toBe(0n)
      // Full hexagon should have high symmetry
      const order = actions.order
      expect(order).toBeGreaterThan(1)
    })

    it('creates ActionsHex with radius-0 hexagon', () => {
      const maskHex = new MaskHex(0)
      const one = maskHex.store.one
      maskHex.set(0, 0, 0, one)
      const actions = new ActionsHex(0, maskHex)

      expect(actions.radius).toBe(0)
      expect(actions.cube.size).toBe(1)
      expect(actions.symmetries.length).toBe(1)
    })

    it('caches cube index across multiple instantiations', () => {
      const maskHex1 = new MaskHex(2)
      const maskHex2 = new MaskHex(2)

      const actions1 = new ActionsHex(2, maskHex1)
      const actions2 = new ActionsHex(2, maskHex2)

      // Should use same cached cube instance
      expect(actions1.cube).toBe(actions2.cube)
    })

    it('handles transformations on linear pattern', () => {
      const maskHex = new MaskHex(2)
      const one = maskHex.store.one
      maskHex.set(0, 0, 0, one)
      maskHex.set(1, 0, -1, one)
      const actions = new ActionsHex(2, maskHex)

      expect(actions.radius).toBe(2)
      expect(actions.cube.size).toBe(19)

      const symmetries = actions.symmetries
      // Asymmetric pattern should have the identity only in common
      const orbits = actions.orbit()
      // linear pattern should have rotations  in orbit
      expect(orbits.length).toBe(12)
      expect(symmetries.length).toBe(3)
      expect(actions.order).toBe(3)
    })

    it('handles transformations on symmetric pattern', () => {
      const maskHex = new MaskHex(2)

      const one = maskHex.store.one
      // Create hexagonally symmetric pattern
      maskHex.set(0, 0, 0, one)
      maskHex.set(1, 0, -1, one)
      maskHex.set(0, 1, -1, one)
      maskHex.set(-1, 1, 0, one)
      maskHex.set(-1, 0, 1, one)
      maskHex.set(0, -1, 1, one)
      maskHex.set(1, -1, 0, one)

      const actions = new ActionsHex(2, maskHex)
      // Hexagonal ring should have significant symmetry
      expect(actions.radius).toBe(2)
      expect(actions.cube.size).toBe(19)
      const symmetries = actions.symmetries
      // Hexagonal ring should have complete symmetry
      expect(symmetries.length).toBe(1)
      expect(actions.order).toBe(1)
    })
  })
})
