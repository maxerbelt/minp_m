import { describe, it, expect, afterEach, jest } from '@jest/globals'
import { Delay } from './Delay.js'
import { Random } from './Random.js'

describe('Delay', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('randomWait', () => {
    it('defaults to silent values when minDelay and maxDelay are null', async () => {
      jest.spyOn(Random, 'integerWithRange').mockReturnValue(500)
      jest.spyOn(Delay, 'wait').mockResolvedValue()

      await expect(Delay.randomWait(null, null)).resolves.toBeUndefined()
      expect(Random.integerWithRange).toHaveBeenCalledWith(
        Delay.DEFAULT_MIN_DELAY,
        Delay.DEFAULT_MAX_DELAY
      )
      expect(Delay.wait).toHaveBeenCalledWith(500)
    })
  })
})
