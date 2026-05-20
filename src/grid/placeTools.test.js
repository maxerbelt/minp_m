/**
 * @jest-environment jsdom
 */

import { describe, it, expect } from '@jest/globals'
import {
  shapeToMask,
  findPlacementsBitmask,
  popcountBigInt
} from './placeTools.js'
import { BigBits } from './bitStore/helpers/bigbits.js'

describe('placeTools', () => {
  it('shapeToMask encodes coordinates as BigInt bit positions', () => {
    const shape = [
      [0, 0],
      [1, 1]
    ]
    const width = 10
    const mask = shapeToMask(shape, width)
    // positions: 0 and (1*10 + 1) = 11 => 1 + 2^11 = 2049
    expect(mask).toBe(2049n)
  })

  it('popcountBigInt counts set bits across BigInt chunks', () => {
    const mask = 2049n
    expect(popcountBigInt(mask)).toBe(2)
  })

  it('findPlacementsBitmask finds all valid placements for a 1x1 shape', () => {
    const shapeMask = 1n // single-cell shape at origin
    const placements = findPlacementsBitmask(shapeMask, 1, 1, 3, 3, 0n, 0n)

    // 3x3 grid, 1x1 shape => 9 placements
    expect(placements).toHaveLength(9)
    expect(placements).toContainEqual({ x: 0, y: 0 })
    expect(placements).toContainEqual({ x: 2, y: 2 })
  })

  it('findPlacementsBitmask respects forbiddenMask and mandatoryMask', () => {
    const shapeMask = 1n // single-cell shape
    const gridW = 3
    const gridH = 3
    // forbid the center cell at (1,1) -> position 4
    const forbiddenMask = BigBits.shiftLeft(1n, 4n)

    const placements = findPlacementsBitmask(
      shapeMask,
      1,
      1,
      gridW,
      gridH,
      forbiddenMask,
      0n
    )

    expect(placements).toHaveLength(8)
    expect(placements).not.toContainEqual({ x: 1, y: 1 })
  })
})
