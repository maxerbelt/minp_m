/* eslint-env jest */

/* global beforeEach, describe, it, expect */
import { Mask } from './mask.js'
import { coordsToZMasks } from '../maskConvert.js'

import { beforeEach, describe, it, expect, jest } from '@jest/globals'

// Jest test suite
describe('Mask', () => {
  let mask

  beforeEach(() => {
    mask = new Mask(10, 10)
  })

  describe('drawSegment', () => {
    it('should draw a line segment', () => {
      mask.drawSegmentTo(0, 0, 5, 0)
      for (let x = 0; x <= 5; x++) {
        expect(mask.for(x, 0).test()).toBe(true)
      }
    })

    it('should draw diagonal segment', () => {
      mask.drawSegmentTo(0, 0, 3, 3)
      expect(mask.for(0, 0).test()).toBe(true)
      expect(mask.for(3, 3).test()).toBe(true)
    })
  })

  describe('fullBits', () => {
    it('should return mask with all bits set', () => {
      const full = mask.fullBits
      expect(full).toBe((1n << BigInt(100)) - 1n)
    })
  })

  // Jest test suite
  describe('coordsToZMasks', () => {
    it('should group coordinates by z value', () => {
      const coords = [
        [0, 0, 1],
        [1, 1, 1],
        [2, 2, 2]
      ]
      const masks = coordsToZMasks(coords, 10, 10)
      expect(masks.has(1)).toBe(true)
      expect(masks.has(2)).toBe(true)
    })

    it('should ignore out of bounds coordinates', () => {
      const coords = [
        [0, 0, 1],
        [15, 15, 1]
      ]
      const masks = coordsToZMasks(coords, 10, 10)
      expect(masks.size).toBe(1)
    })
  })
})
