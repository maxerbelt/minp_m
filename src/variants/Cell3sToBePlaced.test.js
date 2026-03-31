/* eslint-env jest */

/* global describe, it, test, expect, beforeEach, afterEach, jest */

import { Mask } from '../grid/mask.js'
import { Cell3sToBePlaced } from './Cell3sToBePlaced.js'
import { expect, jest } from '@jest/globals'

describe('Cell3sToBePlaced behaviors', () => {
  test('isInMatchingZone returns true when subgroup candidate and validator match', () => {
    const cells = [
      [0, 0],
      [0, 1],
      [0, 2]
    ]
    const board = Mask.fromCoords(cells)
    // target.getZone will return 'OK' only for the middle cell
    const target = {
      getZone: (r, c, z) => (c === 11 && z === 2 ? 'OK' : 'NO')
    }

    const placable3 = {
      board,
      cells,
      validator: () => false,
      zoneDetail: 2,
      target,
      subGroups: [
        // first subgroup: matches only at column offset 0
        {
          placeAt: (r0, c0) => ({
            isCandidate: (r, c) => r === r0 && c === c0,
            validator: z => z === 'NO'
          })
        },
        // second subgroup: matches only at column offset 1 (the middle cell)
        {
          placeAt: (r0, c0) => ({
            isCandidate: (r, c) => r === r0 + 1 && c === c0,
            validator: z => z === 'OK'
          })
        }
      ]
    }

    const placed = new Cell3sToBePlaced(placable3, 10, 10)

    // absolute middle cell is at (10, 11) — validator returns true there
    expect(placed.isInMatchingZone(10, 11)).toBe(true)
    // both first and middle are candidates that validate true/false depending on subgroup
    expect(placed.isInMatchingZone(10, 10)).toBe(true)
    // a non-candidate cell should be false
    expect(placed.isInMatchingZone(10, 12)).toBe(false)
  })

  test('isWrongZone annotates cells with match flags and returns true when some wrong', () => {
    const cells = [
      [0, 0, 1],
      [0, 1, 2],
      [0, 2, 1]
    ]
    const board = Mask.fromCoords(cells)
    const target = {
      getZone: (r, c, z) => (r === 21 && z === 2 ? 'YES' : 'NO')
    }

    const placable3 = {
      board,
      cells,
      validator: () => false,
      zoneDetail: 2,
      target,
      subGroups: [
        {
          placeAt: (r0, c0) => ({
            isCandidate: (c, r) => r === r0 && c === c0,
            validator: z => z === 'X'
          })
        },
        {
          placeAt: (r0, c0) => ({
            isCandidate: (c, r) => r === r0 + 1 && c === c0,
            validator: z => z === 'YES'
          })
        }
      ]
    }

    const placed = new Cell3sToBePlaced(placable3, 20, 20)
    expect(placed.board.occupancy).toBe(3)
    expect([...placed.board.locations()].length).toBe(3)
    expect([...placed.board.locations()]).toEqual([
      [20, 20],
      [20, 21],
      [20, 22]
    ])
    expect(placed.board.fullWidth).toBe(21)
    expect(placed.board.fullHeight).toBe(23)
    // Before calling isWrongZone, notGood should be empty (all cells are untested)
    expect(placed.notGood.occupancy).toBe(0)

    const result = placed.isWrongZone()
    // one cell (the middle) matches, others don't => should return true
    expect(result).toBe(true)
    expect(placed.notGood.occupancy).toBe(1)
    expect(placed.notGood.test(20, 21)).toBe(true)
    // First and last should be 0
    expect(placed.notGood.test(20, 20)).toBe(false)
    expect(placed.notGood.test(20, 22)).toBe(false)
  })
})
