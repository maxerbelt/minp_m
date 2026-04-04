/* eslint-env jest */
import { jest } from '@jest/globals'
import { Mask } from '../grid/rectangle/mask.js'

/* global describe, jest, it, expect, beforeEach */

// Placeable will be imported dynamically after mocks are set up
let Placeable

jest.unstable_mockModule('./CellsToBePlaced.js', () => {
  const mockCtor = jest
    .fn()
    .mockImplementation((board, r, c, validator, zoneDetail) => {
      return {
        board,
        r,
        c,
        validator,
        zoneDetail,
        canPlace: shipGrid => {
          if (typeof validator === 'function') return validator(shipGrid)
          return !!shipGrid.valid
        }
      }
    })
  return {
    placingTarget: {
      allBoundsChecker: jest.fn(
        (r, c, h, w) => r >= 0 && c >= 0 && r + h <= 10 && c + w <= 10
      )
    },
    CellsToBePlaced: mockCtor
  }
})

beforeEach(async () => {
  const module = await import('./Placeable.js')
  Placeable = module.Placeable
})

describe('Placeable', () => {
  const variant = [
    [1, 2],
    [3, 4],
    [2, 5]
  ]
  const board = Mask.fromCoords(variant)
  it('computes height and width as max coordinates', () => {
    const p = new Placeable(board, null)
    expect(p.height()).toBe(6)
    expect(p.width()).toBe(4)
  })

  it('placeAt returns a CellsToBePlaced-like object with correct params', () => {
    const validator = jest.fn()
    const p = new Placeable(board, validator, 7)
    const placed = p.placeAt(2, 3)
    expect(placed.board).toBe(p.board)
    expect(placed.r).toBe(2)
    expect(placed.c).toBe(3)
    expect(placed.validator).toBe(validator)
    expect(placed.zoneDetail).toBe(7)
    expect(typeof placed.canPlace).toBe('function')
  })

  it.skip('placeAt returns a CellsToBePlaced-like object with aircraft carrier', () => {
    const validator = jest.fn()
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
    const board = Mask.fromCoords(occupancyCoords)
    expect(board.toAscii).toBe('1.\n11\n11\n11\n.1')

    const p = new Placeable(board, validator, 7)
    const placing = p.placeAt(7, 4)
    const sb = placing.board
    expect(sb).toBeDefined()
    expect(sb.store.bitsPerCell).toBe(1)
    expect(sb.at(7, 4))
    expect(placing.validator).toBe(validator)

    const locations = [...sb.locations()]
    expect(locations.length).toBe(8)
    expect(sb.width).toBe(2)
    expect(sb.height).toBe(5)

    expect(locations[0]).toEqual([7, 4])
    expect(locations[1]).toEqual([7, 5])
    expect(locations[2]).toEqual([8, 5])
    expect(locations[3]).toEqual([7, 6])
    expect(locations[4]).toEqual([8, 6])
    expect(locations[5]).toEqual([7, 7])
    expect(locations[6]).toEqual([8, 7])
    expect(locations[7]).toEqual([8, 8])
  })
  it('inAllBounds delegates to target.allBoundsChecker and returns its result', () => {
    const target = {
      allBoundsChecker: jest.fn((r, c, h, w) => r === 0 && c === 0)
    }
    const p = new Placeable(board, null, 0, target)
    expect(p.inAllBounds(0, 0)).toBe(true)
    expect(target.allBoundsChecker).toHaveBeenCalled()
    expect(p.inAllBounds(1, 0)).toBe(false)
  })

  it('canPlace calls placed.canPlace and returns its boolean', () => {
    const validator = g => !!g?.valid
    const p = new Placeable(board, validator)
    expect(p.canPlace(0, 0, { valid: true })).toBe(true)
    expect(p.canPlace(0, 0, { valid: false })).toBe(false)
  })
})
