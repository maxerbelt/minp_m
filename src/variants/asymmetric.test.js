/* eslint-env jest */
import { describe, jest, beforeEach, it, expect } from '@jest/globals'
import { Mask } from '../grid/rectangle/mask.js'
import { Asymmetric } from './asymmetric.js'

describe('Asymmetric', () => {
  let board
  let zoneDetail
  let validator

  beforeEach(() => {
    validator = jest.fn(() => true)
    zoneDetail = {}
    board = Mask.fromCoords([
      [0, 0],
      [1, 0]
    ])
  })

  it('rotates indices with r()', () => {
    expect(Asymmetric.r(0)).toBe(1)
    expect(Asymmetric.r(3)).toBe(0)
    expect(Asymmetric.r(4)).toBe(5)
    expect(Asymmetric.r(7)).toBe(4)
  })

  it('flips indices with f()', () => {
    expect(Asymmetric.f(0)).toBe(4)
    expect(Asymmetric.f(3)).toBe(7)
    expect(Asymmetric.f(4)).toBe(0)
    expect(Asymmetric.f(7)).toBe(3)
  })

  it('rotates and flips indices with rf()', () => {
    expect(Asymmetric.rf(0)).toBe(3)
    expect(Asymmetric.rf(1)).toBe(0)
    expect(Asymmetric.rf(4)).toBe(7)
    expect(Asymmetric.rf(5)).toBe(4)
  })

  it('constructs with default variants from the board', () => {
    const asymmetric = new Asymmetric(board, validator, zoneDetail)

    expect(asymmetric.list).toHaveLength(8)
    expect(asymmetric.symmetry).toBe('D')
  })

  it('constructs with provided variants', () => {
    const variants = [[[0, 0]], [[1, 0]]]
    const asymmetric = new Asymmetric(board, validator, zoneDetail, variants)

    expect(asymmetric.list).toHaveLength(2)
  })

  it('generates 8 variants from variantsOf()', () => {
    const variants = Asymmetric.variantsOf(board)

    expect(variants).toHaveLength(8)
  })

  it('collectRotatedVariants returns the four rotations', () => {
    const baseBoard = board.square.defaultVariant
    const rotations = Asymmetric.collectRotatedVariants(baseBoard)

    expect(rotations).toHaveLength(4)
  })

  it('setBehaviour configures the instance behaviour', () => {
    const asymmetric = new Asymmetric(board, validator, zoneDetail)

    Asymmetric.setBehaviour(Function, asymmetric)

    expect(asymmetric.canRotate).toBe(true)
    expect(asymmetric.canFlip).toBe(true)
  })
})
