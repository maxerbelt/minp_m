/* eslint-env jest */

/* global describe, it, expect, beforeEach */
import { describe, it, expect, beforeEach } from '@jest/globals'
import {
  randomElement,
  dedupCSV,
  makeKey,
  parsePair,
  makeKeyId,
  makeKeyAndId,
  parseTriple,
  first,
  findClosestCoord,
  findClosestCoordKey,
  shuffleArray,
  lazy,
  coordsFromCell,
  listFromCell,
  keyListFromCell,
  keyIdsListFromCell,
  addKeyToCell,
  addKeysToCell,
  setCellCoords,
  setCellList,
  minMaxXY
} from './utilities.js'

describe('utilities', () => {
  describe('randomElement', () => {
    it('should return an element from an array', () => {
      const arr = [1, 2, 3, 4, 5]
      const elem = randomElement(arr)
      expect(arr).toContain(elem)
    })

    it('should handle single element array', () => {
      const arr = ['solo']
      expect(randomElement(arr)).toBe('solo')
    })

    it('should return elements from larger arrays', () => {
      const arr = Array.from({ length: 100 }, (_, i) => i)
      const elem = randomElement(arr)
      expect(elem).toBeGreaterThanOrEqual(0)
      expect(elem).toBeLessThan(100)
    })
  })

  describe('dedupCSV', () => {
    it('should remove duplicates from CSV string', () => {
      const result = dedupCSV('a,b,a,c,b', ',')
      const parts = result.split(',')
      expect(parts).toContain('a')
      expect(parts).toContain('b')
      expect(parts).toContain('c')
      expect(parts.length).toBe(3)
    })

    it('should handle single value', () => {
      expect(dedupCSV('a,a,a', ',')).toBe('a')
    })

    it('should work with custom delimiter', () => {
      const result = dedupCSV('x|y|x|z', '|')
      const parts = result.split('|')
      expect(parts.length).toBe(3)
      expect(parts).toContain('x')
    })

    it('should handle empty string', () => {
      const result = dedupCSV('', ',')
      expect(result).toBe('')
    })
  })

  describe('makeKey', () => {
    it('should create key from row and column', () => {
      expect(makeKey(0, 0)).toBe('0,0')
      expect(makeKey(5, 10)).toBe('5,10')
      expect(makeKey(-1, 99)).toBe('-1,99')
    })
  })

  describe('parsePair', () => {
    it('should parse key into [r, c]', () => {
      expect(parsePair('0,0')).toEqual([0, 0])
      expect(parsePair('5,10')).toEqual([5, 10])
    })

    it('should handle negative coordinates', () => {
      expect(parsePair('-1,99')).toEqual([-1, 99])
    })

    it('should return numbers not strings', () => {
      const [r, c] = parsePair('3,7')
      expect(typeof r).toBe('number')
      expect(typeof c).toBe('number')
    })
  })

  describe('makeKeyId', () => {
    it('should create keyid from r, c, id', () => {
      expect(makeKeyId(0, 0, 1)).toBe('0,0:1')
      expect(makeKeyId(5, 10, 99)).toBe('5,10:99')
    })
  })

  describe('makeKeyAndId', () => {
    it('should combine key and id with colon', () => {
      expect(makeKeyAndId('0,0', 1)).toBe('0,0:1')
      expect(makeKeyAndId('5,10', 99)).toBe('5,10:99')
    })
  })

  describe('parseTriple', () => {
    it('should parse keyid into [r, c, id]', () => {
      expect(parseTriple('0,0:1')).toEqual([0, 0, 1])
      expect(parseTriple('5,10:99')).toEqual([5, 10, 99])
    })

    it('should handle null input', () => {
      expect(parseTriple(null)).toBe(null)
      expect(parseTriple(undefined)).toBe(null)
    })

    it('should return numbers not strings', () => {
      const [r, c, id] = parseTriple('3,7:42')
      expect(typeof r).toBe('number')
      expect(typeof c).toBe('number')
      expect(typeof id).toBe('number')
    })
  })

  describe('minMaxXY', () => {
    it('should handle BigInt coordinates without mixing types', () => {
      const coords = [
        [1n, 2n, 1n],
        [3n, 4n, 2n]
      ]
      const result = minMaxXY(coords)

      expect(result).toEqual({
        minX: 1,
        maxX: 3,
        minY: 2,
        maxY: 4,
        depth: 3,
        hasColor: true
      })
    })

    it('should ignore empty or falsy color values', () => {
      const coords = [
        [1n, 2n, 0n],
        [3n, 4n, 0n]
      ]
      const result = minMaxXY(coords)

      expect(result).toEqual({
        minX: 1,
        maxX: 3,
        minY: 2,
        maxY: 4,
        depth: 2,
        hasColor: false
      })
    })
  })

  describe('first', () => {
    it('should return first element of array', () => {
      expect(first([1, 2, 3])).toBe(1)
      expect(first(['a', 'b'])).toBe('a')
    })

    it('should return null for empty array', () => {
      expect(first([])).toBe(null)
    })

    it('should return null for null input', () => {
      expect(first(null)).toBe(null)
    })

    it('should return null for undefined input', () => {
      expect(first(undefined)).toBe(null)
    })
  })

  describe('findClosestCoord', () => {
    it('should find closest coordinate', () => {
      const coords = [
        [0, 0],
        [5, 5],
        [9, 9]
      ]
      const closest = findClosestCoord(coords, 4, 4)
      expect(closest).toEqual([5, 5])
    })

    it('should find closest with custom getter', () => {
      const coords = [
        { r: 0, c: 0 },
        { r: 5, c: 5 },
        { r: 10, c: 10 }
      ]
      const getter = item => [item.r, item.c]
      const closest = findClosestCoord(coords, 4, 4, getter)
      expect(closest).toEqual({ r: 5, c: 5 })
    })

    it('should return first match when tie', () => {
      const coords = [
        [1, 1],
        [2, 2]
      ]
      const closest = findClosestCoord(coords, 1, 1)
      expect(closest).toEqual([1, 1])
    })

    it('should handle single coordinate', () => {
      const coords = [[5, 5]]
      expect(findClosestCoord(coords, 10, 10)).toEqual([5, 5])
    })
  })

  describe('findClosestCoordKey', () => {
    it('should find closest coord from keys', () => {
      const keys = ['0,0', '5,5', '10,10']
      const closest = findClosestCoordKey(keys, 4, 4)
      expect(closest).toBe('5,5')
    })
  })

  describe('shuffleArray', () => {
    it('should shuffle array in place', () => {
      const arr = [1, 2, 3, 4, 5]
      const shuffled = shuffleArray([...arr])
      expect(shuffled).toHaveLength(5)
      expect(shuffled.sort((a, b) => a - b)).toEqual(arr.sort((a, b) => a - b))
    })

    it('should handle single element', () => {
      expect(shuffleArray([1])).toEqual([1])
    })

    it('should handle empty array', () => {
      expect(shuffleArray([])).toEqual([])
    })

    it('should return the array', () => {
      const arr = [1, 2, 3]
      expect(shuffleArray(arr)).toBe(arr)
    })
  })

  describe('lazy', () => {
    it('should compute property lazily', () => {
      const obj = {}
      let computeCount = 0
      lazy(obj, 'prop', function () {
        computeCount++
        return 'computed'
      })

      expect(computeCount).toBe(0)
      expect(obj.prop).toBe('computed')
      expect(computeCount).toBe(1)
    })

    it('should cache the computed value', () => {
      const obj = {}
      let computeCount = 0
      lazy(obj, 'prop', function () {
        computeCount++
        return 'value'
      })

      const first = obj.prop
      const second = obj.prop
      expect(first).toBe(second)
      expect(computeCount).toBe(1)
    })

    it('should work with this context', () => {
      const obj = { x: 10 }
      lazy(obj, 'computed', function () {
        return this.x * 2
      })

      expect(obj.computed).toBe(20)
    })
  })

  describe('cell utilities', () => {
    let mockCell

    beforeEach(() => {
      mockCell = {
        dataset: {}
      }
    })

    describe('coordsFromCell', () => {
      it('should extract r and c from cell dataset', () => {
        mockCell.dataset.r = '5'
        mockCell.dataset.c = '10'
        const [r, c] = coordsFromCell(mockCell)
        expect(r).toBe(5)
        expect(c).toBe(10)
      })

      it('should return numbers not strings', () => {
        mockCell.dataset.r = '3'
        mockCell.dataset.c = '7'
        const [r, c] = coordsFromCell(mockCell)
        expect(typeof r).toBe('number')
        expect(typeof c).toBe('number')
      })
    })

    describe('setCellCoords', () => {
      it('should set r and c in cell dataset', () => {
        setCellCoords(mockCell, 5, 10)
        expect(mockCell.dataset.r).toBe(5)
        expect(mockCell.dataset.c).toBe(10)
      })
    })

    describe('listFromCell and setCellList', () => {
      it('should set and get list from cell', () => {
        const list = [1, 2, 3, 4]
        setCellList(mockCell, list)
        const result = listFromCell(mockCell)
        expect(result).toEqual([1, 2, 3, 4])
      })

      it('should return null if no numbers dataset', () => {
        expect(listFromCell(mockCell)).toBe(null)
      })

      it('should handle empty list', () => {
        setCellList(mockCell, [])
        expect(listFromCell(mockCell)).toEqual([])
      })
    })

    describe('keyListFromCell and keyIdsListFromCell', () => {
      it('should retrieve pipe-delimited key list', () => {
        mockCell.dataset.myKeys = 'key1|key2|key3'
        const result = keyListFromCell(mockCell, 'myKeys')
        expect(result).toEqual(['key1', 'key2', 'key3'])
      })

      it('should return null if key not in dataset', () => {
        expect(keyListFromCell(mockCell, 'missing')).toBe(null)
      })

      it('should work with keyIdsListFromCell', () => {
        mockCell.dataset.ids = '1|2|3'
        const result = keyIdsListFromCell(mockCell, 'ids')
        expect(result).toEqual(['1', '2', '3'])
      })
    })

    describe('addKeyToCell and addKeysToCell', () => {
      it('should add single key to cell', () => {
        addKeyToCell(mockCell, 'tags', 'tag1')
        expect(mockCell.dataset.tags).toBe('tag1')
      })

      it('should append key without duplicates', () => {
        addKeyToCell(mockCell, 'tags', 'tag1')
        addKeyToCell(mockCell, 'tags', 'tag2')
        addKeyToCell(mockCell, 'tags', 'tag1')
        const parts = mockCell.dataset.tags.split('|')
        expect(parts).toContain('tag1')
        expect(parts).toContain('tag2')
        expect(parts.length).toBe(2)
      })

      it('should add multiple keys at once', () => {
        addKeysToCell(mockCell, 'tags', ['tag1', 'tag2', 'tag3'])
        const result = keyListFromCell(mockCell, 'tags')
        expect(result).toEqual(['tag1', 'tag2', 'tag3'])
      })

      it('should append multiple keys to existing ones', () => {
        addKeysToCell(mockCell, 'tags', ['tag1'])
        addKeysToCell(mockCell, 'tags', ['tag2', 'tag3'])
        const result = keyListFromCell(mockCell, 'tags')
        expect(result).toContain('tag1')
        expect(result).toContain('tag2')
        expect(result).toContain('tag3')
      })
    })
  })
})
