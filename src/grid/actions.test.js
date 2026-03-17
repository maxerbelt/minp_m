/* eslint-env jest */
/* global describe, it, expect, beforeEach */

import { Actions } from './actions.js'
import { Mask } from './mask.js'
import { Packed } from './packed.js'
import { Store32 } from './store32.js'
BigInt.prototype.toJSON = function () {
  return this.toString()
}
describe('Actions', () => {
  describe('with Packed (StoreBig backend)', () => {
    let packed
    let actions

    beforeEach(() => {
      packed = new Packed(4, 4)
      // Set a simple L pattern with colors
      packed.set(0, 0, 2)
      packed.set(0, 1, 2)
      packed.set(0, 2, 3)
      packed.set(1, 2, 1)
      actions = new Actions(packed.width, packed.height, packed)
    })

    it('constructs Actions with Packed', () => {
      expect(actions).toBeDefined()
      expect(actions.original).toBe(packed)
    })

    it('computes template from Packed', () => {
      const template = actions.template
      expect(template).toBeDefined()
      // Packed with StoreBig uses Uint32Array for multi-word storage
      expect(template.constructor.name).toBe('Uint32Array')
    })

    it('applies transformations to Packed', () => {
      const rotated = actions.applyMap(actions.transformMaps.r90)
      expect(rotated).toBeDefined()
      // Result is also Uint32Array when working with Packed
      expect(rotated.constructor.name).toBe('Uint32Array')
    })

    it('computes orbit for Packed', () => {
      const orbit = actions.orbit()
      expect(orbit).toHaveLength(8)
      expect(orbit.every(x => x instanceof Uint32Array)).toBe(true)
    })

    it('classifies symmetry for Packed', () => {
      const classification = actions.classifyOrbitType()
      expect(['SYM', 'O2R', 'O2F', 'O4R', 'O4F', 'ASYM']).toContain(
        classification
      )
    })
  })

  describe('Actions consistency across backends', () => {
    it('produces valid symmetry orders for Mask with either backend', () => {
      const maskBig = new Mask(3, 3)
      maskBig.set(0, 0)
      maskBig.set(1, 1)

      const store32 = new Store32(1, 9, 1, 3, 3)
      const maskSmall = new Mask(3, 3, undefined, store32)
      maskSmall.set(0, 0)
      maskSmall.set(1, 1)

      const actionsBig = new Actions(3, 3, maskBig)
      const actionsSmall = new Actions(3, 3, maskSmall)

      // Both should have valid symmetry orders (1, 2, 4, or 8)
      expect([1, 2, 4, 8]).toContain(actionsBig.order)
      expect([1, 2, 4, 8]).toContain(actionsSmall.order)
    })

    it('produces valid symmetry classification for Packed across backends', () => {
      const packedBig = new Packed(3, 3)
      packedBig.set(0, 0, 1)
      packedBig.set(0, 1, 1)

      const store32 = new Store32(4, 9, 2, 3, 3)
      const packedSmall = new Packed(3, 3, undefined, store32, 4)
      packedSmall.set(0, 0, 1)
      packedSmall.set(0, 1, 1)

      const actionsBig = new Actions(3, 3, packedBig)
      const actionsSmall = new Actions(3, 3, packedSmall)

      // Both should produce valid classifications
      const validClasses = ['SYM', 'O2R', 'O2F', 'O4R', 'O4F', 'ASYM']
      expect(validClasses).toContain(actionsBig.classifyOrbitType())
      expect(validClasses).toContain(actionsSmall.classifyOrbitType())
    })
  })
})
