/* eslint-env jest */
import { expect, jest } from '@jest/globals'

/* global describe, jest, beforeEach, it, expect */

import { Mask } from '../grid/mask.js'
// Variables for dynamically imported modules
let Blinker, Invariant

jest.unstable_mockModule('./Invariant.js', () => {
  return {
    Invariant: {
      r: jest.fn(idx => idx)
    }
  }
})

beforeEach(async () => {
  const blinkerModule = await import('./Blinker.js')
  Blinker = blinkerModule.Blinker

  const invariantModule = await import('./Invariant.js')
  Invariant = invariantModule.Invariant

  jest.clearAllMocks()
})

describe('Blinker', () => {
  const validator = jest.fn()
  const zoneDetail = 5
  const cells = [
    [0, 1],
    [2, 3]
  ]
  const board = Mask.fromCoords(cells)
  //const rotatedBoard = board.clone.rotate()
  const rotatedCells = [
    [0, 0],
    [2, 0]
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('constructs with cells and generates default variants using variantsOf', () => {
    const blinker = new Blinker(board, validator, zoneDetail)

    expect(board.toAsciiWith()).toEqual('...\n1..\n...\n..1')
    expect(blinker.validator).toBe(validator)
    expect(blinker.zoneDetail).toBe(zoneDetail)
    expect(blinker.index).toBe(0)
    expect(blinker.list.length).toBe(2)
    expect(blinker.list[0].width).toEqual(3)
    expect(blinker.list[0].height).toEqual(3)
    expect(blinker.list[0].store.bitsPerCell).toEqual(1)
    expect(blinker.list[0].toAsciiWith()).toEqual('1..\n..1\n...') //'1..\n...\n..1'
    expect(blinker.list[1].toAsciiWith()).toEqual('..1\n1..\n...')
  })

  it('constructs with custom variants', () => {
    const customVariants = [cells, rotatedCells]
    const blinker = new Blinker(board, validator, zoneDetail, customVariants)

    expect(blinker.list[0].toCoords).toEqual(customVariants[0])
    expect(blinker.list[1].toCoords).toEqual(customVariants[1])
  })

  it('variantsOf returns cells and rotated cells', () => {
    const variants = Blinker.variantsOf(board.square)
    expect(board.toAsciiWith()).toEqual('...\n1..\n...\n..1')
    expect(board.store.bitsPerCell).toEqual(1)
    expect(variants.length).toBe(2)
    expect(variants[0].toAsciiWith()).toEqual('1..\n..1\n...')
    expect(variants[1].toAsciiWith()).toEqual('..1\n1..\n...')
  })

  it('variantsOf creates unrotated and rotated 3D cells', () => {
    const full = [
      [0, 1, 3],
      [1, 0, 2],
      [1, 2, 1]
    ]
    const unrotated = Mask.fromCoordsSquare(full)
    expect(unrotated.store.bitsPerCell).toEqual(2)
    expect(unrotated.width).toBe(3)
    expect(unrotated.height).toBe(3)
    expect(unrotated.at(1, 0)).toEqual(2)
    expect(unrotated.toAsciiWith()).toEqual('.2.\n3..\n.1.')
    const variants = Blinker.variantsOf(unrotated)
    expect(variants.length).toBe(2)
    expect(variants.length).toBe(2)
    expect(variants[0].store.bitsPerCell).toEqual(2)
    expect(variants[1].store.bitsPerCell).toEqual(2)
    //  expect(unrotated.bits).toEqual(0b10001001000n)
    expect(variants[0].toAsciiWith()).toEqual(
      `.2
3.
.1`
    )
    expect(variants[1].toAsciiWith()).toEqual(
      `.3.
1.2`
    )
  })

  it('setBehaviour configures rotation settings', () => {
    const rotatable = {}
    Blinker.setBehaviour(rotatable)

    expect(rotatable.canFlip).toBe(false)
    expect(rotatable.canRotate).toBe(true)
    expect(rotatable.r1).toBe(Blinker.r)
    expect(rotatable.f1).toBe(Invariant.r)
    expect(rotatable.rf1).toBe(Blinker.r)
  })

  it('variant returns the current variant based on index', () => {
    const blinker = new Blinker(cells, validator, zoneDetail, [
      cells,
      rotatedCells
    ])

    expect(blinker.variant()).toEqual(cells)

    blinker.index = 1
    expect(blinker.variant()).toEqual(rotatedCells)
  })

  it('r toggles between index 0 and 1', () => {
    expect(Blinker.r(0)).toBe(1)
    expect(Blinker.r(1)).toBe(0)
  })

  it('rotate toggles the index', () => {
    const blinker = new Blinker(board, validator, zoneDetail, [
      cells,
      rotatedCells
    ])
    expect(blinker.index).toBe(0)

    blinker.rotate()
    expect(blinker.index).toBe(1)

    blinker.rotate()
    expect(blinker.index).toBe(0)
  })

  it('leftRotate delegates to rotate', () => {
    const blinker = new Blinker(cells, validator, zoneDetail, [
      cells,
      rotatedCells
    ])
    expect(blinker.index).toBe(0)

    blinker.leftRotate()
    expect(blinker.index).toBe(1)
  })
})
