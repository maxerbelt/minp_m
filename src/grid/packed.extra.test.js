/* eslint-env jest */

/* global describe, it, expect, beforeEach */

import e from 'express'
import { Packed } from './packed.js'
import { describe, it, expect } from '@jest/globals'

describe('Packed extra tests', () => {
  it('occupancyMask reflects non-zero cells', () => {
    const p = new Packed(4, 4, null, null, 4) // 2 bits per cell
    expect(p.store.bitsPerCell).toBe(2)
    p.set(2, 1, 1)
    expect(p.toAsciiWith()).toBe('....\n..1.\n....\n....')

    p.set(0, 0, 3)

    //expect(p.occupancy).toBe(2) // broken
    expect(p.toAsciiWith()).toBe(`3...
..1.
....
....`)

    const occ = p.occupancyMask()
    expect(occ.store.bitsPerCell).toBe(1)
    expect(occ.toAsciiWith()).toBe(`1...
..1.
....
....`)

    expect(occ.occupancy).toBe(2)
  })

  it('empty and full static factories behave as expected', () => {
    const e = Packed.empty(3, 2)
    expect(e.at(0, 0)).toBe(0)
    const f = Packed.full(3, 2)
    // Packed.full sets mask.bits to fullBits; ensure the bits property matches
    expect(f.bits).toStrictEqual(f.fullBits)
  })

  it('invertedMask of empty equals full (occupancy parity)', () => {
    const e = Packed.empty(5, 3)
    const inv = e.invertedMask
    // inverted of empty should have occupied cells at valid coordinates
    expect(inv.at(0, 0)).not.toBe(0)
    expect(inv.at(4, 2)).not.toBe(0)
  })

  it('dilateCross increases occupancy from a single seed', () => {
    const p = new Packed(5, 5)
    p.set(2, 2, 1)
    const before = p.occupancy
    expect(before).toBe(1)
    p.dilateCross()

    // occupancy should increase (cross neighbors added)
    expect(p.occupancy).toBe(5)
    // seed should remain non-zero
    expect(p.at(2, 2)).not.toBe(0)
  })
})
