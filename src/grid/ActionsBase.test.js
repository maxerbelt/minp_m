/* eslint-env jest */

import { describe, expect, it } from '@jest/globals'
import { ActionsBase } from './ActionsBase.js'

class TestActions extends ActionsBase {
  normalized (bits) {
    return bits
  }

  classifyOrbitType () {
    return 'test'
  }
}

describe('ActionsBase', () => {
  const store = {
    empty: 0n,
    isOccupied (bitboard, index) {
      return ((bitboard >> BigInt(index)) & 1n) === 1n
    },
    getIdx (bitboard, index) {
      return this.isOccupied(bitboard, index) ? 1 : 0
    },
    setIdx (output, index, color) {
      return color ? output | (1n << BigInt(index)) : output
    },
    normalizeUpLeft (bitboard) {
      return bitboard
    }
  }

  const indexer = {
    size: 4,
    indices () {
      return (function* () {
        for (let i = 0; i < 4; i++) yield i
      })()
    },
    bitsIndices (bitboard) {
      return (function* () {
        for (let i = 0; i < 4; i++) {
          if (((bitboard >> BigInt(i)) & 1n) === 1n) {
            yield i
          }
        }
      })()
    }
  }

  const mask = {
    store,
    indexer: {
      ...indexer,
      transformMaps: {
        id: [0, 1, 2, 3],
        r90: [1, 2, 3, 0],
        r180: [3, 2, 1, 0],
        f: [1, 0, 3, 2]
      }
    },
    cube: null,
    bits: 0b1001n
  }

  const actions = new TestActions(2, 2, mask)

  it('derives rotation and flip tags from transform maps', () => {
    expect(actions.rotTags).toEqual(['r90', 'r180'])
    expect(actions.flpTags).toEqual(['f'])
  })

  it('computes defaultVariant and non-symmetric transform variants', () => {
    expect(actions.defaultVariant).toBe(0b1001n)
    expect(actions.canRotate()).toBe(true)
    expect(actions.canFlip()).toBe(true)
    expect(actions.rotationVariants).toEqual([0b0011n])
    expect(actions.flipVariants).toEqual([0b0110n])
  })

  it('applies named transforms via rotate, rotateCCW, flip, and rotateFlip', () => {
    expect(actions.rotate(0b1001n)).toBe(0b0011n)
    expect(actions.rotateCCW(0b1001n)).toBe(0b0011n)
    expect(actions.flip(0b1001n)).toBe(0b0110n)
    expect(actions.rotateFlip(0b1001n)).toBe(0b1100n)
  })

  it('returns the canonical form and symmetry order correctly', () => {
    expect(actions.canonicalForm()).toBe('3')
    expect(actions.order).toBe(3)
    expect(actions.symmetries).toEqual([0b1001n, 0b0011n, 0b0110n])
  })
})
