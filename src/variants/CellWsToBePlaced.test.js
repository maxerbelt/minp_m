/* eslint-env jest */

/* global describe, it, test, expect, beforeEach, afterEach, jest */

import { CellWsToBePlaced } from './CellWsToBePlaced.js'
import { makeKey } from '../core/utilities.js'
import { Mask } from '../grid/rectangle/mask.js'
import { jest } from '@jest/globals'

describe('CellWsToBePlaced behaviors', () => {
  test('weapons mapping formed from special subgroup cells and provided weapons array', () => {
    const placable3 = {
      board: Mask.fromCoords([
        [0, 0],
        [0, 1],
        [0, 2]
      ]),
      cells: [
        [0, 0],
        [0, 1],
        [0, 2]
      ],
      validator: () => true,
      zoneDetail: 0,
      target: { getZone: () => {}, boundsChecker: () => true },
      subGroups: [
        { placeAt: (r, c) => ({ cells: [[r, c]] }) },
        {
          placeAt: (r, c) => ({
            cells: [
              [r, c + 1],
              [r, c + 2]
            ]
          })
        }
      ]
    }

    const weapons = ['W1', 'W2']
    const placed = new CellWsToBePlaced(placable3, 5, 6, weapons, null)

    // keys should correspond to the coordinates of special group cells
    const expectedKeys = [makeKey(5, 7), makeKey(5, 8)]
    expect(Object.keys(placed.weapons).sort()).toEqual(expectedKeys.sort())
    expect(placed.weapons[expectedKeys[0]]).toBe('W1')
    expect(placed.weapons[expectedKeys[1]]).toBe('W2')
  })

  test('isInMatchingZone delegates to CellsToBePlaced zoneInfo and validator', () => {
    const placable3 = {
      board: Mask.fromCoords([[0, 0]]),
      cells: [[0, 0]],
      validator: z => z === 'MATCH',
      zoneDetail: 0,
      target: { getZone: (r, c) => 'MATCH', boundsChecker: () => true },
      subGroups: [
        {
          placeAt: (r, c) => ({
            isCandidate: () => true,
            validator: () => true
          })
        },
        {
          placeAt: (r, c) => ({
            isCandidate: () => true,
            cells: [[r, c]],
            validator: () => true
          })
        }
      ]
    }

    const placed = new CellWsToBePlaced(placable3, 1, 1, [])
    expect(placed.isInMatchingZone(1, 1)).toBe(true)
  })
})
