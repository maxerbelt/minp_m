/* eslint-env jest */
import { jest } from '@jest/globals'
import { Mask } from '../grid/rectangle/mask.js'
import { SubBoard } from '../grid/subBoard.js'
/* global describe, jest, it, expect, beforeEach */

import { Placeable } from './Placeable.js'
import { CellsToBePlaced } from './CellsToBePlaced.js'

describe('Placeable integration', () => {
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
    expect(placed).toBeInstanceOf(CellsToBePlaced)
    expect(placed.cells.length).toBe(3)
    expect(placed.validator).toBe(validator)
    expect(placed.zoneDetail).toBe(7)
    expect(typeof placed.canPlace).toBe('function')
  })

  it('placeAt returns a CellsToBePlaced-like object with aircraft carrier', () => {
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

    //  const placing = new CellsToBePlaced(board, 7, 4, validator)
    const p = new Placeable(board, validator, 0)
    expect(p.board.toAscii).toBe('1.\n11\n11\n11\n.1')
    const placing = p.placeAt(7, 4)
    expect(placing).toBeInstanceOf(CellsToBePlaced)
    const sb = placing.board
    expect(sb).toBeDefined()
    expect(sb).toBeInstanceOf(SubBoard)
    expect(sb.mask.toAscii).toBe('1.\n11\n11\n11\n.1')
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
  it('placeAt returns a CellsToBePlaced-like object with aircraft carrier - Square', () => {
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

    //  const placing = new CellsToBePlaced(board, 7, 4, validator)
    const p = new Placeable(board, validator, 0)
    const pb = p.board
    expect(pb.width).toBe(2)
    expect(pb.height).toBe(5)
    expect(pb.store.bitsPerCell).toBe(1)
    expect(pb.toAscii).toBe('1.\n11\n11\n11\n.1')
    const placing = p.placeAt(7, 4)
    expect(placing).toBeInstanceOf(CellsToBePlaced)
    const sb = placing.board
    expect(sb).toBeDefined()
    expect(sb).toBeInstanceOf(SubBoard)
    expect(sb.mask.toAscii).toBe('1.\n11\n11\n11\n.1')
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
})
