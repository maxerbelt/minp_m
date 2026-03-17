/* eslint-env jest */
/* global describe, it, expect, beforeEach */

import { Actions } from './actions.js'
import { Mask } from './mask.js'
import { Packed } from './packed.js'
import { Store32 } from './store32.js'
BigInt.prototype.toJSON = function () {
  return this.toString()
}
describe('Actions (Store32 backend)', () => {
  describe('with Mask (Store32 backend)', () => {
    let mask
    let actions

    beforeEach(() => {
      const store = new Store32(1, 16, 1, 4, 4)
      mask = new Mask(4, 4, undefined, store)
      // Set a simple pattern
      mask.set(1, 1)
      mask.set(1, 2)
      mask.set(2, 2)
      actions = new Actions(mask.width, mask.height, mask)
    })

    it('constructs Actions with Mask + Store32', () => {
      expect(actions).toBeDefined()
      expect(actions.store).toBeInstanceOf(Store32)
    })

    it('computes template with Store32 backend', () => {
      const template = actions.template
      expect(template).toBeDefined()
      expect(template.constructor.name).toBe('Uint32Array')
    })

    it('applies transformations with Store32', () => {
      const identity = actions.applyMap(actions.transformMaps.id)
      expect(identity).toBeDefined()
      expect(identity.constructor.name).toBe('Uint32Array')
    })

    it('computes orbit with Store32', () => {
      const orbit = actions.orbit()
      expect(orbit).toHaveLength(8)
      expect(orbit.every(x => x instanceof Uint32Array)).toBe(true)
    })

    it('computes symmetry order with Store32', () => {
      const order = actions.order
      expect(Number.isInteger(order)).toBe(true)
      expect([1, 2, 4, 8]).toContain(order)
    })

    it('classifies symmetry with Store32', () => {
      const classification = actions.classifyOrbitType()
      expect(['SYM', 'O2R', 'O2F', 'O4R', 'O4F', 'ASYM']).toContain(
        classification
      )
    })
  })
  describe('with Packed (Store32 backend)', () => {
    let packed
    let actions

    beforeEach(() => {
      const store = new Store32(4, 16, 2, 4, 4)
      packed = new Packed(4, 4, undefined, store, 4)
      // Set a pattern
      packed.set(1, 1, 2)
      packed.set(1, 2, 3)
      packed.set(2, 2, 1)
      actions = new Actions(packed.width, packed.height, packed)
    })

    it('constructs Actions with Packed + Store32', () => {
      expect(actions).toBeDefined()
      expect(actions.store).toBeInstanceOf(Store32)
    })

    it('computes template with Packed + Store32', () => {
      const template = actions.template
      expect(template).toBeDefined()
      expect(template.constructor.name).toBe('Uint32Array')
    })

    it('applies transformations with Packed + Store32', () => {
      const flipped = actions.applyMap(actions.transformMaps.fx)
      expect(flipped).toBeDefined()
      expect(flipped.constructor.name).toBe('Uint32Array')
    })

    it('computes orbit with Packed + Store32', () => {
      const orbit = actions.orbit()
      expect(orbit).toHaveLength(8)
      expect(orbit.every(x => x instanceof Uint32Array)).toBe(true)
    })

    it('classifies symmetry with Packed + Store32', () => {
      const classification = actions.classifyOrbitType()
      expect(['SYM', 'O2R', 'O2F', 'O4R', 'O4F', 'ASYM']).toContain(
        classification
      )
    })
  })
})
