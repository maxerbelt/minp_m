/* eslint-env jest */

/* global describe, it, expect, beforeEach, afterEach */
import { jest } from '@jest/globals'
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
  })

  describe('shuffleArray', () => {
    it('shuffles the array in place and returns the same object', () => {
      const source = [1, 2, 3, 4, 5]
      const array = [...source]
      jest.spyOn(Math, 'random')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0)
      const result = Random.shuffleArray(array)
      expect(result).toBe(array)
      expect(result).toEqual([2, 4, 5, 3, 1])
      expect(result.sort((a, b) => a - b)).toEqual(source)
    })

    it('returns empty array when passed an empty array', () => {
      const empty = []
      expect(Random.shuffleArray(empty)).toBe(empty)
    })
  })
})
