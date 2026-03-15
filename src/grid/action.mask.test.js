/* eslint-env jest */
/* global describe, it, expect, beforeEach */

import { Actions } from './actions.js'
import { Mask } from './mask.js'

BigInt.prototype.toJSON = function () {
  return this.toString()
}
describe('Actions with Mask (StoreBig backend)', () => {
  describe('with Mask (StoreBig backend)', () => {
    let mask
    let actions

    beforeEach(() => {
      mask = new Mask(4, 4)
      // Set a simple pattern: a small L shape
      mask.set(0, 0)
      mask.set(0, 1)
      mask.set(0, 2)
      mask.set(1, 2)
      actions = new Actions(mask.width, mask.height, mask)
    })

    it('constructs Actions with Mask', () => {
      expect(actions).toBeDefined()
      expect(actions.original).toBe(mask)
      expect(actions.width).toBe(4)
      expect(actions.height).toBe(4)
    })

    it('computes template (normalized shape)', () => {
      const template = actions.template
      expect(typeof template).toBe('bigint')
      expect(template).not.toBe(0n)
      expect(actions.original.toAsciiWith()).toBe('1...\n1...\n11..\n....')
      expect(actions.ascii(template)).toBe('1...\n1...\n11..\n....')
    })

    it('applies identity map', () => {
      const identity = actions.applyMap(actions.transformMaps.id)
      expect(identity).toBe(actions.template)
      expect(actions.ascii(identity)).toBe('1...\n1...\n11..\n....')
    })

    it('applies 90° rotation', () => {
      const rotated = actions.applyMap(actions.transformMaps.r90)
      expect(typeof rotated).toBe('bigint')
      expect(rotated).not.toBe(0n)

      expect(actions.ascii(rotated)).toBe('111.\n1...\n....\n....')
    })

    it('applies flip transformations', () => {
      const flipped = actions.applyMap(actions.transformMaps.fx)
      expect(typeof flipped).toBe('bigint')
      expect(flipped).not.toBe(0n)

      expect(actions.ascii(flipped)).toBe('.1..\n.1..\n11..\n....')
    })

    it('computes orbit of all 8 transformations', () => {
      const orbit = actions.orbit()
      expect(orbit).toHaveLength(8)
      expect(orbit.every(x => typeof x === 'bigint')).toBe(true)
    })

    it('computes unique symmetries', () => {
      const symmetries = actions.symmetries
      expect(Array.isArray(symmetries)).toBe(true)
      expect(symmetries.length).toBe(8)
    })

    it('computes symmetry order', () => {
      const order = actions.order
      expect(Number.isInteger(order)).toBe(true)
      expect([1, 2, 4, 8]).toContain(order)
    })

    it('classifies symmetry correctly', () => {
      const classification = actions.classifyActionGroup()
      expect(classification).toBe('ASYM')
    })
  })
  describe('with Mask non Square (StoreBig backend)', () => {
    let mask
    let actions

    beforeEach(() => {
      mask = new Mask(2, 3)
      // Set a simple pattern: a small L shape
      mask.set(0, 0)
      mask.set(0, 1)
      mask.set(0, 2)
      mask.set(1, 2)
      actions = new Actions(mask.width, mask.height, mask)
    })

    it('constructs Actions with Mask', () => {
      expect(actions).toBeDefined()
      expect(actions.original).toBe(mask)
      expect(actions.width).toBe(3)
      expect(actions.height).toBe(3)
    })

    it('computes template (normalized shape)', () => {
      const template = actions.template
      expect(typeof template).toBe('bigint')
      expect(template).not.toBe(0n)
      expect(actions.original.toAsciiWith()).toBe('1.\n1.\n11')
      const temp = new Mask(3, 3, template, null, 2)
      expect(temp.toAsciiWith()).toBe('1..\n1..\n11.')
    })

    it('applies identity map', () => {
      const id = actions.transformMaps.id
      const template = actions.template
      expect(id.length).toBe(9)
      for (let i = 0; i < id.length; i++) {
        expect(id[i]).toBe(i)
      }
      const tempMask = new Mask(3, 3, template, null, 2)
      expect(tempMask.toAsciiWith()).toBe('1..\n1..\n11.')
      const identity1 = actions.applyMap(id, template)
      const temp1 = new Mask(3, 3, identity1, null, 2)
      expect(temp1.toAsciiWith()).toBe('1..\n1..\n11.')
      const identity = actions.applyMap(id)
      const temp = new Mask(3, 3, identity, null, 2)
      expect(temp.toAsciiWith()).toBe('1..\n1..\n11.')
    })

    it('applies 90° rotation', () => {
      const rotated = actions.applyMap(actions.transformMaps.r90)
      expect(typeof rotated).toBe('bigint')
      expect(rotated).not.toBe(0n)
      const temp = new Mask(3, 3, rotated, null, 2)
      expect(temp.toAsciiWith()).toBe('111\n1..\n...')
    })

    it('applies flip transformations', () => {
      const flipped = actions.applyMap(actions.transformMaps.fx)
      expect(typeof flipped).toBe('bigint')
      expect(flipped).not.toBe(0n)
      const temp = new Mask(3, 3, flipped, null, 2)
      expect(temp.toAsciiWith()).toBe('.1.\n.1.\n11.')
    })

    it('computes orbit of all 8 transformations', () => {
      const orbit = actions.orbit()
      expect(orbit).toHaveLength(8)
      expect(orbit.every(x => typeof x === 'bigint')).toBe(true)
    })

    it('computes unique symmetries', () => {
      const symmetries = actions.symmetries
      expect(Array.isArray(symmetries)).toBe(true)
      expect(symmetries.length).toBe(8)
    })

    it('computes symmetry order', () => {
      const order = actions.order
      expect(Number.isInteger(order)).toBe(true)
      expect([1, 2, 4, 8]).toContain(order)
    })

    it('classifies symmetry correctly', () => {
      const classification = actions.classifyActionGroup()
      expect(classification).toBe('ASYM')
    })
  })
  describe('with Mask (StoreBig backend) 2 bit', () => {
    let mask
    let actions

    beforeEach(() => {
      mask = new Mask(3, 3, 2n, null, 3)
      // Set a simple pattern: a small L shape
      mask.set(0, 0, 2n)
      mask.set(0, 1, 2n)
      mask.set(0, 2, 1n)
      mask.set(1, 2, 1n)
      actions = new Actions(mask.width, mask.height, mask)
    })

    it('constructs Actions with Mask', () => {
      expect(actions).toBeDefined()
      expect(actions.original).toBe(mask)
      expect(actions.width).toBe(3)
      expect(actions.height).toBe(3)
    })

    it('computes template (normalized shape)', () => {
      const template = actions.template
      expect(typeof template).toBe('bigint')
      expect(template).not.toBe(0n)
      expect(actions.original.toAsciiWith()).toBe('2..\n2..\n11.')
      const normalized = actions.normalized(actions.original.bits)

      expect(actions.ascii(normalized)).toBe('2..\n2..\n11.')
      const square = actions.store.expandToSquare(
        actions.original.bits,
        actions.original.height,
        actions.original.width
      )
      const normalizedSquare = actions.normalized(square)
      expect(typeof normalizedSquare).toBe('bigint')

      expect(actions.ascii(square)).toBe('2..\n2..\n11.')
    })

    it('applies identity map', () => {
      const identity = actions.applyMap(actions.transformMaps.id)
      expect(identity).toBe(actions.template)
      expect(actions.ascii(identity)).toBe('2..\n2..\n11.')
    })

    it('applies 90° rotation', () => {
      const rotated = actions.applyMap(actions.transformMaps.r90)
      expect(typeof rotated).toBe('bigint')
      expect(rotated).not.toBe(0n)

      expect(actions.ascii(rotated)).toBe('122\n1..\n...')
    })

    it('applies flip transformations', () => {
      const flipped = actions.applyMap(actions.transformMaps.fx)
      expect(typeof flipped).toBe('bigint')
      expect(flipped).not.toBe(0n)

      expect(actions.ascii(flipped)).toBe('.2.\n.2.\n11.')
    })

    it('computes orbit of all 8 transformations', () => {
      const orbit = actions.orbit()
      expect(orbit).toHaveLength(8)
      expect(orbit.every(x => typeof x === 'bigint')).toBe(true)
    })

    it('computes unique symmetries', () => {
      const symmetries = actions.symmetries
      expect(Array.isArray(symmetries)).toBe(true)
      expect(symmetries.length).toBe(8)
    })

    it('computes symmetry order', () => {
      const order = actions.order
      expect(Number.isInteger(order)).toBe(true)
      expect([1, 2, 4, 8]).toContain(order)
    })

    it('classifies symmetry correctly', () => {
      const classification = actions.classifyActionGroup()
      expect(['SYM', 'O2R', 'O2F', 'O4R', 'O4F', 'ASYM']).toContain(
        classification
      )
    })
  })
})
