/* eslint-env jest */

/* global describe, it, expect */
import {
  coordsToZMasks,
  coordsToPacked,
  packedToCoords,
  packedCoordsSteps
} from './maskConvert.js'

describe('maskConvert', () => {
  describe('coordsToZMasks', () => {
    it('should convert coordinates to z-indexed masks', () => {
      const coords = [
        [0, 0, 1],
        [1, 0, 1],
        [0, 0, 2]
      ]
      const masks = coordsToZMasks(coords, 10, 10)
      expect(masks.has(1)).toBe(true)
      expect(masks.has(2)).toBe(true)
    })

    it('should ignore out-of-bounds coordinates', () => {
      const coords = [
        [0, 0, 1],
        [15, 15, 1]
      ]
      const masks = coordsToZMasks(coords, 10, 10)
      expect(masks.size).toBe(1)
    })

    it('should combine coordinates with same z', () => {
      const coords = [
        [0, 0, 1],
        [1, 1, 1]
      ]
      const masks = coordsToZMasks(coords, 10, 10)
      expect(masks.size).toBe(1)
      const mask1 = masks.get(1)
      expect(mask1).toBeTruthy()
    })

    it('should handle empty coordinates', () => {
      const masks = coordsToZMasks([], 10, 10)
      expect(masks.size).toBe(0)
    })

    it('should work with different grid sizes', () => {
      const coords = [
        [0, 0, 1],
        [9, 9, 1]
      ]
      const masks = coordsToZMasks(coords, 10, 10)
      expect(masks.has(1)).toBe(true)
    })
  })

  describe('coordsToPacked', () => {
    it('should convert coordinates to packed format', () => {
      const coords = [
        [0, 0, 1],
        [1, 0, 2]
      ]
      const board = coordsToPacked(coords, 10, 10)
      expect(board).toBeInstanceOf(Uint32Array)
    })

    it('should handle different color values', () => {
      const coords = [
        [0, 0, 1],
        [0, 1, 2],
        [1, 0, 3]
      ]
      const board = coordsToPacked(coords, 10, 10)
      expect(board.length).toBeGreaterThan(0)
    })

    it('should handle empty coordinates', () => {
      const board = coordsToPacked([], 10, 10)
      expect(board).toBeInstanceOf(Uint32Array)
    })

    it('should calculate correct board size', () => {
      const board = coordsToPacked([], 10, 10)
      const expectedWords = Math.ceil((10 * 10) / 16)
      expect(board.length).toBe(expectedWords)
    })
  })

  describe('packedToCoords and packedCoordsSteps', () => {
    it('should convert packed board back to coordinates', () => {
      const original = [
        [0, 0, 1],
        [1, 1, 2],
        [2, 2, 3]
      ]
      const board = coordsToPacked(original, 10, 10)
      const result = packedToCoords(board, 10, 10)
      expect(result).toContainEqual([0, 0, 1])
      expect(result).toContainEqual([1, 1, 2])
    })

    it('should iterate through packed coordinates', () => {
      const coords = [
        [0, 0, 1],
        [1, 0, 2]
      ]
      const board = coordsToPacked(coords, 10, 10)
      const steps = Array.from(packedCoordsSteps(board, 10, 10))
      expect(steps.length).toBeGreaterThan(0)
      expect(steps[0]).toHaveLength(3)
    })

    it('should skip zero-valued cells', () => {
      const coords = [[0, 0, 1]]
      const board = coordsToPacked(coords, 10, 10)
      const result = packedToCoords(board, 10, 10)
      expect(result.length).toBe(1)
    })

    it('should handle full packed board roundtrip', () => {
      const original = [
        [0, 0, 1],
        [5, 5, 2],
        [9, 9, 3]
      ]
      const board = coordsToPacked(original, 10, 10)
      const result = packedToCoords(board, 10, 10)
      expect(result.length).toBe(original.length)
    })

    it('packedCoordsSteps should be a generator', () => {
      const board = coordsToPacked([[0, 0, 1]], 10, 10)
      const gen = packedCoordsSteps(board, 10, 10)
      expect(gen[Symbol.iterator]).toBeDefined()
    })
  })
})
