/* eslint-env jest */
/* global describe, it, expect, beforeEach */

import { jest } from '@jest/globals'
import { buildTransformHexMaps } from './buildTransformHexMaps.js'

// Jest test suite
describe('buildTransformHexMaps', () => {
  let mockCoords
  let mockIndex

  beforeEach(() => {
    mockCoords = [
      [0, 0, 0],
      [1, 0, -1],
      [1, -1, 0],
      [0, 1, -1]
    ]
    mockIndex = (q, r, s) => q * 100 + r * 10 + s
  })

  it('returns array with 12 elements (6 rot/ref pairs)', () => {
    const result = buildTransformHexMaps(mockCoords, mockIndex, 4)
    expect(result.length).toBe(12)
  })

  it('each element is an array of size matching coords', () => {
    const result = buildTransformHexMaps(mockCoords, mockIndex, 4)
    result.forEach(arr => {
      expect(Array.isArray(arr)).toBe(true)
      expect(arr.length).toBe(4)
    })
  })

  it('caches results and returns same reference on second call', () => {
    const result1 = buildTransformHexMaps(mockCoords, mockIndex, 4)
    const result2 = buildTransformHexMaps(mockCoords, mockIndex, 4)
    expect(result1).toBe(result2)
  })

  it('applies k=0 rotations (no rotation)', () => {
    const result = buildTransformHexMaps(mockCoords, mockIndex, 4)
    const rot0 = result[0]
    const expected = mockCoords.map(c => mockIndex(...c))
    expect(rot0).toEqual(expected)
  })

  it('applies k=1 rotation correctly', () => {
    const result = buildTransformHexMaps(mockCoords, mockIndex, 4)
    const rot1 = result[2]
    const [q, r, s] = mockCoords[0]
    const rotated = [-s, -q, -r]
    expect(rot1[0]).toBe(mockIndex(...rotated))
  })

  it('reflection produces different values than rotation', () => {
    const result = buildTransformHexMaps(mockCoords, mockIndex, 4)
    const rot0 = result[0]
    const ref0 = result[1]
    expect(rot0).not.toEqual(ref0)
  })

  it('reflection at k=0 swaps r and s', () => {
    const result = buildTransformHexMaps(mockCoords, mockIndex, 4)
    const ref0 = result[1]
    const [q, r, s] = mockCoords[0]
    const reflected = mockIndex(q, s, r)
    expect(ref0[0]).toBe(reflected)
  })

  it('handles different coordinate sets', () => {
    const coords2 = [
      [2, 1, -3],
      [0, 0, 0]
    ]
    const result = buildTransformHexMaps(coords2, mockIndex, 2)
    expect(result.length).toBe(12)
    result.forEach(arr => expect(arr.length).toBe(2))
  })

  it('all 12 transforms are present (0-5 rotations, each with ref variant)', () => {
    const result = buildTransformHexMaps(mockCoords, mockIndex, 4)
    for (let k = 0; k < 6; k++) {
      expect(Array.isArray(result[k * 2])).toBe(true)
      expect(Array.isArray(result[k * 2 + 1])).toBe(true)
    }
  })

  it('fills arrays with index function results', () => {
    const result = buildTransformHexMaps(mockCoords, mockIndex, 4)
    result.forEach(arr => {
      arr.forEach(val => {
        expect(typeof val).toBe('number')
      })
    })
  })
})
