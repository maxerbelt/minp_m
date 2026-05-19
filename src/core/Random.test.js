import { describe, it, expect, afterEach, jest } from '@jest/globals'
import { Random } from './Random.js'

describe('Random', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('integerWithMax', () => {
    it('returns 0 when Math.random is 0', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0)
      expect(Random.integerWithMax(10)).toBe(0)
    })

    it('returns max - 1 when Math.random is just below 1', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.9999999999)
      expect(Random.integerWithMax(10)).toBe(9)
    })

    it('throws when max is not a positive finite number', () => {
      expect(() => Random.integerWithMax(0)).toThrow(RangeError)
      expect(() => Random.integerWithMax(-1)).toThrow(RangeError)
      expect(() => Random.integerWithMax(Number.NaN)).toThrow(RangeError)
    })
  })

  describe('floatWithRange', () => {
    it('returns min when Math.random is 0', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0)
      expect(Random.floatWithRange(1.5, 4.5)).toBe(1.5)
    })

    it('returns max when Math.random is 1', () => {
      jest.spyOn(Math, 'random').mockReturnValue(1)
      expect(Random.floatWithRange(1.5, 4.5)).toBe(4.5)
    })

    it('throws when min is greater than max', () => {
      expect(() => Random.floatWithRange(5, 2)).toThrow(RangeError)
      expect(() => Random.floatWithRange(Number.NaN, 2)).toThrow(RangeError)
    })
  })

  describe('integerWithRange', () => {
    it('returns min when Math.random is 0', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0)
      expect(Random.integerWithRange(5, 10)).toBe(5)
    })

    it('returns max - 1 when Math.random is just below 1', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.9999999999)
      expect(Random.integerWithRange(5, 10)).toBe(9)
    })

    it('throws when min is greater than or equal to max', () => {
      expect(() => Random.integerWithRange(5, 5)).toThrow(RangeError)
      expect(() => Random.integerWithRange(10, 5)).toThrow(RangeError)
    })
  })

  describe('element', () => {
    it('returns the selected element based on Math.random', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5)
      const array = ['a', 'b', 'c', 'd']
      expect(Random.element(array)).toBe('c')
    })

    it('returns the first element when the array length is 1', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0)
      expect(Random.element(['solo'])).toBe('solo')
    })

    it('returns undefined for an empty array', () => {
      expect(Random.element([])).toBeUndefined()
    })
  })

  describe('shuffleArray', () => {
    it('shuffles the array in place and returns the same object', () => {
      const source = [1, 2, 3, 4, 5]
      const array = [...source]
      jest
        .spyOn(Math, 'random')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0)
      const result = Random.shuffleArray(array)
      expect(result).toBe(array)
      expect(result).toEqual([2, 4, 5, 3, 1])
      expect(result.toSorted((a, b) => a - b)).toEqual(source)
    })

    it('returns empty array when passed an empty array', () => {
      const empty = []
      expect(Random.shuffleArray(empty)).toBe(empty)
    })
  })
})
