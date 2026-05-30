import { it, describe, expect, beforeEach, jest } from '@jest/globals'

import { Mask } from '../grid/rectangle/mask.js'

/**
 * @typedef {import('./Score.js').Score} Score
 */

// Test coordinate constants to replace magic numbers
const COORDS = {
  ORIGIN: [0, 0],
  DIAGONAL_1: [1, 1],
  DIAGONAL_2: [2, 2],
  DIAGONAL_3: [3, 3],
  DIAGONAL_4: [4, 4],
  DIAGONAL_5: [5, 5],
  POS_2_3: [2, 3],
  POS_4_5: [4, 5],
  POS_5_7: [5, 7],
  POS_3_4: [3, 4],
  POS_7_8: [7, 8],
  POS_5_6: [5, 6],
  NEGATIVE: [-1, -2]
}

// Score will be imported after mocking bh so that our mock takes effect
let Score

// Mock dependencies
jest.unstable_mockModule('../terrains/all/js/bh.js', async () => {
  const { Mask: MaskClass } = await import('../grid/rectangle/mask.js')
  return {
    bh: {
      map: {
        get blankMask () {
          return new MaskClass(8, 8)
        }
      }
    }
  }
})

describe('Score', () => {
  /**
   * Instance of Score class for testing.
   * @type {Score}
   */
  let score

  beforeEach(async () => {
    // import Score with mocks active
    const module = await import('./Score.js')
    Score = module.Score
    score = new Score()
  })

  describe('constructor', () => {
    it('should initialize with empty shot mask', () => {
      expect(score.shot instanceof Mask).toBe(true)
      expect(score.shot.occupancy).toBe(0)
    })

    it('should initialize with empty reveal set', () => {
      expect(score.reveal instanceof Mask).toBe(true)
      expect(score.reveal.size).toBe(0)
    })

    it('should initialize autoMisses to 0', () => {
      expect(score.autoMisses).toBe(0)
    })
  })

  describe('reset', () => {
    it('should clear shot set', () => {
      score.shot.set(0, 0)
      score.shot.set(1, 1)
      score.reset()
      expect(score.shot.occupancy).toBe(0)
    })

    it('should clear reveal set', () => {
      score.reveal.set(2, 3)
      score.reveal.set(4, 5)
      expect(score.reveal.occupancy).toBe(2)
      score.reset()
      expect(score.reveal.occupancy).toBe(0)
    })

    it('should reset all properties together', () => {
      score.shot.set(0, 0)
      score.reveal.set(1, 1)
      score.reset()
      expect(score.shot.occupancy).toBe(0)
      expect(score.reveal.occupancy).toBe(0)
      expect(score.autoMisses).toBe(0)
    })
  })

  describe('newShotKey', () => {
    it('should return true for new shot location', () => {
      const key = score.newShotKey(...COORDS.ORIGIN)
      expect(key).toBe(true)
    })

    it('should return true for different coordinates', () => {
      const key = score.newShotKey(...COORDS.POS_5_7)
      expect(key).toBe(true)
    })

    it('should return null if shot already exists', () => {
      score.createShotKey(...COORDS.POS_3_4)
      const key = score.newShotKey(...COORDS.POS_3_4)
      expect(key).toBeNull()
    })

    it('should not add to shot set', () => {
      score.newShotKey(...COORDS.DIAGONAL_1)
      expect(score.shot.occupancy).toBe(0)
    })

    it('should handle negative coordinates', () => {
      const key = score.newShotKey(...COORDS.NEGATIVE)
      expect(key).toBe(true)
    })
  })

  describe('createShotKey', () => {
    it('should create and add a new shot key', () => {
      const key = score.createShotKey(...COORDS.ORIGIN)
      expect(key).toBe(true)
      expect(score.shot.test(...COORDS.ORIGIN)).toBe(true)
    })

    it('should return null if location already shot', () => {
      score.createShotKey(...COORDS.POS_2_3)
      const key = score.createShotKey(...COORDS.POS_2_3)
      expect(key).toBeNull()
    })

    it('should increase shot set size', () => {
      score.createShotKey(...COORDS.DIAGONAL_1)
      expect(score.shot.size).toBe(1)
      score.createShotKey(...COORDS.DIAGONAL_2)
      expect(score.shot.size).toBe(2)
    })

    it('should not add duplicate shots', () => {
      score.createShotKey(...COORDS.DIAGONAL_3)
      score.createShotKey(...COORDS.DIAGONAL_3)
      expect(score.shot.occupancy).toBe(1)
    })

    it('should add multiple different shots', () => {
      score.createShotKey(...COORDS.ORIGIN)
      score.createShotKey(...COORDS.DIAGONAL_1)
      score.createShotKey(...COORDS.DIAGONAL_2)
      expect(score.shot.occupancy).toBe(3)
      expect(score.shot.test(...COORDS.ORIGIN)).toBe(true)
      expect(score.shot.test(...COORDS.DIAGONAL_1)).toBe(true)
      expect(score.shot.test(...COORDS.DIAGONAL_2)).toBe(true)
    })
  })

  describe('shotReveal', () => {
    it('should move shot from shot set to reveal mask', () => {
      score.shot.set(...COORDS.ORIGIN)
      score.shotReveal(...COORDS.ORIGIN)
      expect(score.shot.test(...COORDS.ORIGIN)).toBe(false)
      expect(score.reveal.test(...COORDS.ORIGIN)).toBe(true)
    })

    it('should remove from shot set', () => {
      score.createShotKey(...COORDS.DIAGONAL_1)
      const initialSize = score.shot.occupancy
      score.shotReveal(1, 1) // swapped coordinates
      expect(score.shot.occupancy).toBe(initialSize - 1)
    })

    it('should handle multiple reveals', () => {
      score.shot.set(...COORDS.ORIGIN)
      score.shot.set(...COORDS.DIAGONAL_1)
      score.shot.set(...COORDS.DIAGONAL_2)
      score.shotReveal(...COORDS.ORIGIN)
      score.shotReveal(...COORDS.DIAGONAL_1)
      expect(score.shot.occupancy).toBe(1)
      expect(score.reveal.occupancy).toBe(2)
    })

    it('should not affect autoMisses', () => {
      score.auto.set(1, 2)
      score.auto.set(...COORDS.DIAGONAL_2)
      score.shot.set(...COORDS.DIAGONAL_3)
      score.shotReveal(...COORDS.DIAGONAL_3)
      expect(score.autoMisses).toBe(2)
    })
  })

  describe('noOfShots', () => {
    it('should return 0 when no shots fired', () => {
      expect(score.noOfShots()).toBe(0)
    })

    it('should return number of shots without auto misses', () => {
      score.shot.set(...COORDS.ORIGIN)
      score.shot.set(...COORDS.DIAGONAL_1)
      expect(score.noOfShots()).toBe(2)
    })

    it('should subtract auto misses from shot count', () => {
      score.shot.set(...COORDS.ORIGIN)
      score.shot.set(...COORDS.DIAGONAL_1)
      score.shot.set(...COORDS.DIAGONAL_2)
      score.auto.set(...COORDS.DIAGONAL_1)
      expect(score.noOfShots()).toBe(2)
    })

    it('should return 0 when auto misses equal shots', () => {
      score.shot.set(...COORDS.ORIGIN)
      score.shot.set(...COORDS.DIAGONAL_1)
      score.auto.set(1, 2)
      score.auto.set(2, 3)
      expect(score.noOfShots()).toBe(0)
    })

    it('should not be affected by reveal set', () => {
      score.shot.set(...COORDS.ORIGIN)
      score.reveal.set(...COORDS.DIAGONAL_1)
      expect(score.noOfShots()).toBe(1)
    })
  })

  describe('addAutoMiss', () => {
    it('should create and add auto miss shot', () => {
      const isCreated = score.addAutoMiss(...COORDS.ORIGIN)
      expect(isCreated).toBe(true)
      expect(score.shot.test(...COORDS.ORIGIN)).toBe(true)
    })

    it('should increment autoMisses counter', () => {
      expect(score.autoMisses).toBe(0)
      score.addAutoMiss(...COORDS.DIAGONAL_1)
      expect(score.autoMisses).toBe(1)
      score.addAutoMiss(...COORDS.DIAGONAL_2)
      expect(score.autoMisses).toBe(2)
    })

    it('should return null if location already shot', () => {
      score.shot.set(...COORDS.DIAGONAL_3)
      const isCreated = score.addAutoMiss(...COORDS.DIAGONAL_3)
      expect(isCreated).toBeNull()
      expect(score.autoMisses).toBe(0) // Not incremented
    })

    it('should add multiple auto misses', () => {
      score.addAutoMiss(...COORDS.ORIGIN)
      score.addAutoMiss(...COORDS.DIAGONAL_1)
      score.addAutoMiss(...COORDS.DIAGONAL_2)
      expect(score.autoMisses).toBe(3)
      expect(score.shot.occupancy).toBe(3)
    })

    it('should add auto miss to shot set', () => {
      score.addAutoMiss(...COORDS.POS_4_5)
      expect(score.newShotKey(...COORDS.POS_4_5)).toBeNull()
    })

    it('should prevent duplicate auto misses', () => {
      score.addAutoMiss(...COORDS.DIAGONAL_5)
      const isCreated = score.addAutoMiss(...COORDS.DIAGONAL_5)
      expect(isCreated).toBeNull()
      expect(score.autoMisses).toBe(1)
      expect(score.shot.occupancy).toBe(1)
    })
  })

  describe('integration scenarios', () => {
    it('should track mixed shots and auto misses', () => {
      score.createShotKey(...COORDS.ORIGIN) // regular shot
      score.addAutoMiss(...COORDS.DIAGONAL_1) // auto miss
      score.createShotKey(...COORDS.DIAGONAL_2) // regular shot
      expect(score.shot.occupancy).toBe(3)
      expect(score.autoMisses).toBe(1)
      expect(score.noOfShots()).toBe(2) // 3 total - 1 auto miss
    })

    it('should handle shot reveal workflow', () => {
      score.createShotKey(...COORDS.ORIGIN)
      score.createShotKey(...COORDS.DIAGONAL_1)
      score.shotReveal(...COORDS.ORIGIN)
      expect(score.shot.size).toBe(1)
      expect(score.reveal.size).toBe(1)
      expect(score.noOfShots()).toBe(1)
    })

    it('should handle full game scenario', () => {
      // Player fires shots
      score.createShotKey(...COORDS.POS_3_4)
      score.createShotKey(...COORDS.POS_5_6)
      score.addAutoMiss(...COORDS.POS_7_8)
      expect(score.noOfShots()).toBe(2)

      // Some shots are revealed
      score.shotReveal(4, 3)
      expect(score.shot.occupancy).toBe(2) // [5,6] and [7,8]
      expect(score.reveal.occupancy).toBe(1) // [3,4]

      // Reset for new game
      score.reset()
      expect(score.shot.occupancy).toBe(0)
      expect(score.reveal.occupancy).toBe(0)
      expect(score.autoMisses).toBe(0)
      expect(score.noOfShots()).toBe(0)
    })

    it('should prevent duplicate shots across different methods', () => {
      score.createShotKey(...COORDS.DIAGONAL_2)
      const autoMissKey = score.addAutoMiss(...COORDS.DIAGONAL_2)
      expect(autoMissKey).toBeNull()
      expect(score.shot.occupancy).toBe(1)
      expect(score.autoMisses).toBe(0)
    })

    it('should maintain state through multiple operations', () => {
      const maxShots = 5
      // Add several shots
      for (let i = 0; i < maxShots; i++) {
        score.createShotKey(i, i)
      }
      expect(score.noOfShots()).toBe(maxShots)

      // Add some auto misses
      const maxAutoMisses = 2
      for (let i = 0; i < maxAutoMisses; i++) {
        score.addAutoMiss(5 + i, 5 + i)
      }
      expect(score.noOfShots()).toBe(maxShots) // Regular shots only
      expect(score.autoMisses).toBe(maxAutoMisses)

      // Reveal some shots
      score.shotReveal(...COORDS.ORIGIN)
      score.shotReveal(...COORDS.DIAGONAL_1)
      expect(score.reveal.occupancy).toBe(2)
      expect(score.shot.occupancy).toBe(5) // 3 unrevealed regulars + 2 autos
    })

    it('should handle edge case of all shots being auto misses', () => {
      score.addAutoMiss(...COORDS.ORIGIN)
      score.addAutoMiss(...COORDS.DIAGONAL_1)
      score.addAutoMiss(...COORDS.DIAGONAL_2)
      expect(score.shot.occupancy).toBe(3)
      expect(score.autoMisses).toBe(3)
      expect(score.noOfShots()).toBe(0)
    })
  })

  it('should maintain reveal as a Mask', () => {
    expect(score.reveal instanceof Mask).toBe(true)
  })

  it('should not have overlapping keys between shot and reveal', () => {
    score.createShotKey(...COORDS.ORIGIN)
    score.shotReveal(...COORDS.ORIGIN)
    expect(score.shot.test(...COORDS.ORIGIN)).toBe(false)
    expect(score.reveal.test(...COORDS.ORIGIN)).toBe(true)
  })

  it('should maintain integer autoMisses count', () => {
    score.addAutoMiss(...COORDS.ORIGIN)
    score.addAutoMiss(...COORDS.DIAGONAL_1)
    expect(Number.isInteger(score.autoMisses)).toBe(true)
    expect(score.autoMisses).toBe(2)
  })
})
