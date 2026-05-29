import { describe, it, expect, afterEach, jest } from '@jest/globals'
import { Delay } from './Delay.js'
import { Random } from './Random.js'

/**
 * Test suite for Delay utility class
 *
 * Tests async timing utilities including promise-based delays, yield operations,
 * and random wait functionality with fallback behavior.
 */
describe('Delay', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  /**
   * Test suite for randomWait method
   *
   * Verifies random wait behavior and fallback to default values
   */
  describe('randomWait', () => {
    /**
     * Tests that randomWait falls back to default values when null is provided
     *
     * Verifies that when minDelay and maxDelay are null, the method uses
     * DEFAULT_MIN_DELAY and DEFAULT_MAX_DELAY constants instead.
     *
     * @test
     * @returns {Promise<void>}
     */
    it('defaults to silent values when minDelay and maxDelay are undefined', async () => {
      jest.spyOn(Random, 'integerWithRange').mockReturnValue(500)
      jest.spyOn(Delay, 'wait').mockResolvedValue()

      await expect(Delay.randomWait()).resolves.toBeUndefined()
      expect(Random.integerWithRange).toHaveBeenCalledWith(
        Delay.DEFAULT_MIN_DELAY,
        Delay.DEFAULT_MAX_DELAY
      )
      expect(Delay.wait).toHaveBeenCalledWith(500)
    })
  })
})
