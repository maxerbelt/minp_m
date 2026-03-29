/* eslint-env jest */
import { jest } from '@jest/globals'

/* global describe, it, expect, jest, beforeEach */
import { Mask } from '../grid/mask.js'

// Score will be imported after mocking bh so that our mock takes effect
let Score

// Mock dependencies
jest.unstable_mockModule('../terrain/bh.js', async () => {
  const { Mask } = await import('../grid/mask.js')
  return {
    bh: {
      map: {
        get blankMask () {
          return new Mask(8, 8)
        }
      }
    }
  }
})

describe('Score', () => {
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
    it('should return key for new shot location', () => {
      const key = score.newShotKey(0, 0)
      expect(key).toBe(true)
    })

    it('should return key for different coordinates', () => {
      const key = score.newShotKey(5, 7)
      expect(key).toBe(true)
    })

    it('should return null if shot already exists at location', () => {
      score.createShotKey(3, 4)
      const key = score.newShotKey(3, 4)
      expect(key).toBeNull()
    })

    it('should not add to shot set', () => {
      score.newShotKey(1, 2)
      expect(score.shot.occupancy).toBe(0)
    })

    it('should handle negative coordinates', () => {
      const key = score.newShotKey(-1, -2)
      expect(key).toBe(true)
    })
  })

  describe('createShotKey', () => {
    it('should create and add a new shot key', () => {
      const key = score.createShotKey(0, 0)
      expect(key).toBe(true)
      expect(score.shot.test(0, 0)).toBe(true)
    })

    it('should return null if location already shot', () => {
      score.createShotKey(2, 3)
      const key = score.createShotKey(2, 3)
      expect(key).toBeNull()
    })

    it('should increase shot set size', () => {
      score.createShotKey(1, 1)
      expect(score.shot.size).toBe(1)
      score.createShotKey(2, 2)
      expect(score.shot.size).toBe(2)
    })

    it('should not add duplicate shots', () => {
      score.createShotKey(3, 3)
      score.createShotKey(3, 3)
      expect(score.shot.occupancy).toBe(1)
    })

    it('should add multiple different shots', () => {
      score.createShotKey(0, 0)
      score.createShotKey(1, 1)
      score.createShotKey(2, 2)
      expect(score.shot.occupancy).toBe(3)
      expect(score.shot.test(0, 0)).toBe(true)
      expect(score.shot.test(1, 1)).toBe(true)
      expect(score.shot.test(2, 2)).toBe(true)
    })
  })

  describe('shotReveal', () => {
    it('should move shot from shot set to reveal mask', () => {
      score.shot.set(0, 0)
      score.shotReveal(0, 0)
      expect(score.shot.test(0, 0)).toBe(false)
      expect(score.reveal.test(0, 0)).toBe(true)
    })

    it('should remove from shot set', () => {
      score.createShotKey(1, 2)
      const initialSize = score.shot.occupancy
      score.shotReveal(1, 2)
      expect(score.shot.occupancy).toBe(initialSize - 1)
    })

    it('should handle multiple reveals', () => {
      score.shot.set(0, 0)
      score.shot.set(1, 1)
      score.shot.set(2, 2)
      score.shotReveal(0, 0)
      score.shotReveal(1, 1)
      expect(score.shot.occupancy).toBe(1)
      expect(score.reveal.occupancy).toBe(2)
    })

    it('should not affect autoMisses', () => {
      score.auto.set(1, 2)
      score.auto.set(2, 2)
      score.shot.set(3, 3)
      score.shotReveal(3, 3)
      expect(score.autoMisses).toBe(2)
    })
  })

  describe('noOfShots', () => {
    it('should return 0 when no shots fired', () => {
      expect(score.noOfShots()).toBe(0)
    })

    it('should return number of shots without auto misses', () => {
      score.shot.set(0, 0)
      score.shot.set(1, 1)
      expect(score.noOfShots()).toBe(2)
    })

    it('should subtract auto misses from shot count', () => {
      score.shot.set(0, 0)
      score.shot.set(1, 1)
      score.shot.set(2, 2)
      score.auto.set(1, 1)
      expect(score.noOfShots()).toBe(2)
    })

    it('should return 0 when auto misses equal shots', () => {
      score.shot.set(0, 0)
      score.shot.set(1, 1)
      score.auto.set(1, 2)
      score.auto.set(1, 3)
      expect(score.noOfShots()).toBe(0)
    })

    it('should not be affected by reveal set', () => {
      score.shot.set(0, 0)
      score.reveal.set(1, 1)
      expect(score.noOfShots()).toBe(1)
    })
  })

  describe('addAutoMiss', () => {
    it('should create and add auto miss shot', () => {
      const isCreated = score.addAutoMiss(0, 0)
      expect(isCreated).toBe(true)
      expect(score.shot.test(0, 0)).toBe(true)
    })

    it('should increment autoMisses counter', () => {
      expect(score.autoMisses).toBe(0)
      score.addAutoMiss(1, 1)
      expect(score.autoMisses).toBe(1)
      score.addAutoMiss(2, 2)
      expect(score.autoMisses).toBe(2)
    })

    it('should return null if location already shot', () => {
      score.shot.set(3, 3)
      const isCreated = score.addAutoMiss(3, 3)
      expect(isCreated).toBeNull()
      expect(score.autoMisses).toBe(0) // Not incremented
    })

    it('should add multiple auto misses', () => {
      score.addAutoMiss(0, 0)
      score.addAutoMiss(1, 1)
      score.addAutoMiss(2, 2)
      expect(score.autoMisses).toBe(3)
      expect(score.shot.occupancy).toBe(3)
    })

    it('should add auto miss to shot set', () => {
      score.addAutoMiss(4, 5)
      expect(score.newShotKey(4, 5)).toBe(null)
    })

    it('should prevent duplicate auto misses', () => {
      score.addAutoMiss(5, 5)
      const isCreated = score.addAutoMiss(5, 5)
      expect(isCreated).toBeNull()
      expect(score.autoMisses).toBe(1)
      expect(score.shot.occupancy).toBe(1)
    })
  })

  describe('integration scenarios', () => {
    it('should track mixed shots and auto misses', () => {
      score.createShotKey(0, 0) // regular shot
      score.addAutoMiss(1, 1) // auto miss
      score.createShotKey(2, 2) // regular shot
      expect(score.shot.occupancy).toBe(3)
      expect(score.autoMisses).toBe(1)
      expect(score.noOfShots()).toBe(2) // 3 total - 1 auto miss
    })

    it('should handle shot reveal workflow', () => {
      score.createShotKey(0, 0)
      score.createShotKey(1, 1)
      score.shotReveal(0, 0)
      expect(score.shot.size).toBe(1)
      expect(score.reveal.size).toBe(1)
      expect(score.noOfShots()).toBe(1)
    })

    it('should handle full game scenario', () => {
      // Player fires shots
      score.createShotKey(3, 4)
      score.createShotKey(5, 6)
      score.addAutoMiss(7, 8)
      expect(score.noOfShots()).toBe(2)

      // Some shots are revealed
      score.shotReveal(3, 4)
      expect(score.shot.occupancy).toBe(2) // (5,6) and (7,8)
      expect(score.reveal.occupancy).toBe(1) // (3,4)

      // Reset for new game
      score.reset()
      expect(score.shot.occupancy).toBe(0)
      expect(score.reveal.occupancy).toBe(0)
      expect(score.autoMisses).toBe(0)
      expect(score.noOfShots()).toBe(0)
    })

    it('should prevent duplicate shots across different methods', () => {
      score.createShotKey(2, 2)
      const autoMissKey = score.addAutoMiss(2, 2)
      expect(autoMissKey).toBeNull()
      expect(score.shot.occupancy).toBe(1)
      expect(score.autoMisses).toBe(0)
    })

    it('should maintain state through multiple operations', () => {
      // Add several shots
      for (let i = 0; i < 5; i++) {
        score.createShotKey(i, i)
      }
      expect(score.noOfShots()).toBe(5)

      // Add some auto misses
      for (let i = 0; i < 2; i++) {
        score.addAutoMiss(5 + i, 5 + i)
      }
      expect(score.noOfShots()).toBe(5) // Regular shots only
      expect(score.autoMisses).toBe(2)

      // Reveal some shots
      score.shotReveal(0, 0)
      score.shotReveal(1, 1)
      expect(score.reveal.occupancy).toBe(2)
      expect(score.shot.occupancy).toBe(5) // 3 unrevealed regulars + 2 autos
    })

    it('should handle edge case of all shots being auto misses', () => {
      score.addAutoMiss(0, 0)
      score.addAutoMiss(1, 1)
      score.addAutoMiss(2, 2)
      expect(score.shot.occupancy).toBe(3)
      expect(score.autoMisses).toBe(3)
      expect(score.noOfShots()).toBe(0)
    })
  })

  it('should maintain reveal as a Mask', () => {
    expect(score.reveal instanceof Mask).toBe(true)
  })

  it('should not have overlapping keys between shot and reveal', () => {
    score.createShotKey(0, 0)
    score.shotReveal(0, 0)
    expect(score.shot.test(0, 0)).toBe(false)
    expect(score.reveal.test(0, 0)).toBe(true)
  })

  it('should maintain integer autoMisses count', () => {
    score.addAutoMiss(0, 0)
    score.addAutoMiss(1, 1)
    expect(Number.isInteger(score.autoMisses)).toBe(true)
    expect(score.autoMisses).toBe(2)
  })
})
