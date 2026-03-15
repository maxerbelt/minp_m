/* eslint-env jest */

/* global beforeEach, describe, it, expect */
import { Mask } from './mask.js'
import { beforeEach, describe, it, expect, jest } from '@jest/globals'
import { Packed } from './packed.js'

let mask
// Jest test suite
describe('erode vertical bug', () => {
  beforeEach(() => {
    mask = new Mask(8, 5)
  })

  it('erode should shrink at the corners', () => {
    mask.set(0, 0)
    mask.set(0, 1)
    expect(mask.occupancy).toBe(2)
    mask.dilate(2)
    expect(mask.occupancy).toBe(12)
    expect(mask.toAscii).toBe(
      '111.....\n111.....\n111.....\n111.....\n........'
    )

    mask.set(4, 0)
    mask.set(5, 0)
    mask.set(6, 0)

    expect(mask.occupancy).toBe(15)
    expect(mask.toAscii).toBe(
      '111.111.\n111.....\n111.....\n111.....\n........'
    )
    mask.erode(1)
    expect(mask.toAscii).toBe(
      '11......\n11......\n11......\n........\n........'
    )
    expect(mask.occupancy).toBe(6)
  })
})

describe('erode vertical bug packed', () => {
  beforeEach(() => {
    mask = new Packed(8, 5)
  })

  it('erode should shrink at the corners', () => {
    mask.set(0, 0)
    mask.set(0, 1)
    expect(mask.occupancy).toBe(2)
    mask.dilate(2)
    expect(mask.toAscii.trim()).toBe(
      '111.....\n111.....\n111.....\n111.....\n........'
    )
    expect(mask.occupancy).toBe(12)

    mask.set(4, 0)
    mask.set(5, 0)
    mask.set(6, 0)
    ;('111.....\n111.....\n111.....\n111.....\n........')
    expect(mask.occupancy).toBe(15)
    expect(mask.toAscii.trim()).toBe(
      '111.111.\n111.....\n111.....\n111.....\n........'
    )
    mask.erode(1)
    expect(mask.toAscii.trim()).toBe(
      '11......\n11......\n11......\n........\n........'
    )
    expect(mask.occupancy).toBe(6)
  })
})
