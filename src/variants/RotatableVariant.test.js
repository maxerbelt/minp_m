/* eslint-env jest */

/* global describe, it, expect */

import { RotatableVariant } from './RotatableVariant.js'
import { describe, it, expect } from '@jest/globals'

describe('RotatableVariant base behaviors', () => {
  it('cannot be instantiated directly', () => {
    expect(() => new RotatableVariant(() => true, 0, null)).toThrow()
  })

  it('subclass setBehaviour is invoked and rotate/flip change index via setByIndex', () => {
    class TestRV extends RotatableVariant {
      constructor (validator, zoneDetail, symmetry) {
        super(validator, zoneDetail, symmetry)
        this.index = 1
        this._set = []
      }
      setByIndex (i) {
        this._set.push(i)
        this.index = i
      }
      static setBehaviour (ctor, inst) {
        // r1 increments by 1, f1 increments by 2, rf1 increments by 3
        inst.r1 = i => i + 1
        inst.f1 = i => i + 2
        inst.rf1 = i => i + 3
      }
    }

    const rv = new TestRV(() => true, 0, null)
    expect(rv.canRotate).toBe(true)

    rv.rotate()
    expect(rv._set.pop()).toBe(2)

    rv.flip()
    // flip uses f1 on the already-rotated index (2)
    expect(rv._set.pop()).toBe(4)

    rv.leftRotate()
    // leftRotate uses rf1 on the index after flip (4)
    expect(rv._set.pop()).toBe(7)
  })
})
