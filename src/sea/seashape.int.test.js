/* eslint-env jest */

/* global describe, it, expect, beforeEach, jest */

import { expect, jest } from '@jest/globals'
import { SeaVessel } from './SeaShape.js'
import { Mask } from '../grid/mask.js'
import { Orbit4F } from '../variants/Orbit4F.js'

const occupancyCoords = [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 1],
  [1, 2],
  [1, 3],
  [1, 4]
]
describe('Sea Shape', () => {
  let aCarrier
  let carrierMask

  beforeEach(() => {
    aCarrier = new SeaVessel(
      'Aircraft Carrier',
      'A',
      'A',
      occupancyCoords,
      'A large ship that can carry aircraft.'
    )

    carrierMask = Mask.fromCoordsSquare(occupancyCoords, 5)
  })

  it('test  carrier mask', () => {
    expect(carrierMask instanceof Mask).toBe(true)
    expect(carrierMask.toAsciiWith()).toBe('1....\n11...\n11...\n11...\n.1...')
    expect(carrierMask.occupancy).toBe(8)
    expect(carrierMask.width).toBe(5)
    expect(carrierMask.height).toBe(5)
  })

  it('should produce variants with correct symmetries', () => {
    /// pre-condition: subGroups and board are set up correctly before calling variants()
    /// board should have both layers combined and subGroups should have correct boards for Variant3 to work properly
    /// board should have classifyActionGroup give to 'ASYM' for Variant3 work with a shape with  symmetry = 'D'

    expect(carrierMask.store.bitsPerCell).toBe(1)

    const orbit = carrierMask.actions.orbit()
    expect(orbit).toBeDefined()
    expect(orbit.length).toBe(8)
    expect(typeof orbit[0]).toBe('bigint')
    const a = carrierMask.actions

    const symmetries = carrierMask.actions.symmetries
    expect(symmetries.length).toBe(4)
    expect(a.ascii(orbit[0])).toBe('1....\n11...\n11...\n11...\n.1...')
    expect(a.ascii(symmetries[0])).toBe('1....\n11...\n11...\n11...\n.1...')
    expect(carrierMask.store.bitsPerCell).toBe(1)
    expect(a.ascii(symmetries[1])).toBe('.1111\n1111.\n.....\n.....\n.....')
    expect(a.ascii(symmetries[2])).toBe('.1...\n11...\n11...\n11...\n1....')
    expect(a.ascii(symmetries[3])).toBe('1111.\n.1111\n.....\n.....\n.....')

    expect(a.ascii(orbit[2])).toBe('1....\n11...\n11...\n11...\n.1...')
    const symmetry = carrierMask.actions.classifyActionGroup()
    expect(symmetry).toBe('O4F')
  })

  it('should produce variants that can be rotated', () => {
    /// pre-condition: subGroups and board are set up correctly before calling variants()
    /// board should have both layers combined and subGroups should have correct boards for Variant3 to work properly
    /// board should have classifyActionGroup give to 'ASYM' for Variant3 work with a shape with  symmetry = 'D'

    const variants = aCarrier.variants()
    expect(variants).toBeDefined()
    expect(variants).toBeInstanceOf(Orbit4F)

    expect(variants.list.length).toBe(4)
    const id = variants.list[0]
    expect(id).toBeInstanceOf(Mask)
    expect(id.toAsciiWith()).toBe('1.\n11\n11\n11\n.1')
    const rotate = variants.list[1]
    expect(rotate).toBeInstanceOf(Mask)
    expect(rotate.toAsciiWith()).toBe('.1111\n1111.')
    const flip = variants.list[2]
    expect(flip).toBeInstanceOf(Mask)
    expect(flip.toAsciiWith()).toBe('.1\n11\n11\n11\n1.')
    const flipRotate = variants.list[3]
    expect(flipRotate).toBeInstanceOf(Mask)
    expect(flipRotate.toAsciiWith()).toBe('1111.\n.1111')
  })

  it('should initialize with correct board', () => {
    expect(carrierMask).toBeDefined()
    expect(carrierMask instanceof Mask).toBe(true)
    expect(typeof carrierMask.bits).toBe('bigint')
    expect(carrierMask.width).toBe(5)
    expect(carrierMask.height).toBe(5)
    expect(carrierMask.store.width).toBe(5)
    expect(carrierMask.store.height).toBe(5)

    expect(carrierMask.store.bitsPerCell).toBe(1)
    expect(carrierMask.store.size).toBe(25n)
    expect(carrierMask.store.depth).toBe(2)
    expect(carrierMask.toAsciiWith()).toBe('1....\n11...\n11...\n11...\n.1...')
    expect(carrierMask.occupancy).toBe(8)
    expect(carrierMask.depth).toBe(2)
  })
})
