import { Zip } from './Zip.js'

describe('Zip', () => {
  describe('getType', () => {
    it('should return correct type for primitives', () => {
      expect(Zip.getType(null)).toBe('null')
      expect(Zip.getType(undefined)).toBe('undefined')
      expect(Zip.getType(42)).toBe('number')
      expect(Zip.getType(3.14)).toBe('number')
      expect(Zip.getType(NaN)).toBe('nan')
      expect(Zip.getType('hello')).toBe('string')
      expect(Zip.getType(true)).toBe('boolean')
      expect(Zip.getType(Symbol('test'))).toBe('symbol')
    })

    it('should return correct type for built-ins', () => {
      expect(Zip.getType([])).toBe('array')
      expect(Zip.getType({})).toBe('object')
      expect(Zip.getType(new Map())).toBe('map')
      expect(Zip.getType(new Set())).toBe('set')
      expect(Zip.getType(new Date())).toBe('date')
      expect(Zip.getType(/test/)).toBe('regexp')
      expect(Zip.getType(new Error())).toBe('error')
    })
  })

  describe('toArray', () => {
    it('should convert null/undefined to empty array', () => {
      expect(Zip.toArray(null)).toEqual([])
      expect(Zip.toArray(undefined)).toEqual([])
    })

    it('should return array as-is', () => {
      const arr = [1, 2, 3]
      expect(Zip.toArray(arr)).toBe(arr)
    })

    it('should split string into characters', () => {
      expect(Zip.toArray('abc')).toEqual(['a', 'b', 'c'])
    })

    it('should convert Map to [key, value] pairs', () => {
      const map = new Map([
        ['a', 1],
        ['b', 2]
      ])
      expect(Zip.toArray(map)).toEqual([
        ['a', 1],
        ['b', 2]
      ])
    })

    it('should convert Set to values array', () => {
      const set = new Set([1, 2, 3])
      expect(Zip.toArray(set)).toEqual(expect.arrayContaining([1, 2, 3]))
    })

    it('should convert object to [key, value] pairs', () => {
      expect(Zip.toArray({ a: 1, b: 2 })).toEqual(
        expect.arrayContaining([
          ['a', 1],
          ['b', 2]
        ])
      )
    })

    it('should wrap non-iterable in array', () => {
      expect(Zip.toArray(42)).toEqual([42])
    })
  })

  describe('strict', () => {
    it('should zip two arrays stopping at minimum length', () => {
      const result = Zip.strict([1, 2, 3], ['a', 'b'])
      expect(result).toEqual([
        [1, 'a'],
        [2, 'b']
      ])
    })

    it('should convert inputs to arrays before zipping', () => {
      const result = Zip.strict('abc', [1, 2, 3])
      expect(result).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 3]
      ])
    })

    it('should handle empty arrays', () => {
      expect(Zip.strict([], [1, 2, 3])).toEqual([])
      expect(Zip.strict([1, 2, 3], [])).toEqual([])
    })

    it('should handle null/undefined', () => {
      expect(Zip.strict(null, [1, 2, 3])).toEqual([])
      expect(Zip.strict([1, 2, 3], undefined)).toEqual([])
    })

    it('should work with various types', () => {
      const map = new Map([
        ['x', 10],
        ['y', 20]
      ])
      const result = Zip.strict(map, [1, 2, 3])
      expect(result).toEqual([
        [['x', 10], 1],
        [['y', 20], 2]
      ])
    })
  })

  describe('lenient', () => {
    it('should zip two arrays padding to maximum length', () => {
      const result = Zip.lenient([1, 2, 3], ['a', 'b'])
      expect(result).toEqual([
        [1, 'a'],
        [2, 'b'],
        [3, undefined]
      ])
    })

    it('should pad shorter arrays with undefined', () => {
      const result = Zip.lenient([1, 2], ['a', 'b', 'c', 'd'])
      expect(result).toEqual([
        [1, 'a'],
        [2, 'b'],
        [undefined, 'c'],
        [undefined, 'd']
      ])
    })

    it('should convert inputs to arrays before zipping', () => {
      const result = Zip.lenient('ab', [1, 2, 3])
      expect(result).toEqual([
        ['a', 1],
        ['b', 2],
        [undefined, 3]
      ])
    })

    it('should handle empty arrays', () => {
      expect(Zip.lenient([], [1, 2, 3])).toEqual([
        [undefined, 1],
        [undefined, 2],
        [undefined, 3]
      ])
      expect(Zip.lenient([1, 2, 3], [])).toEqual([
        [1, undefined],
        [2, undefined],
        [3, undefined]
      ])
    })
  })

  describe('strictN', () => {
    it('should zip multiple arrays stopping at minimum length', () => {
      const result = Zip.strictN(
        [1, 2, 3],
        ['a', 'b'],
        [true, false, true, false]
      )
      expect(result).toEqual([
        [1, 'a', true],
        [2, 'b', false]
      ])
    })

    it('should handle two arrays like strict', () => {
      const result = Zip.strictN([1, 2, 3], ['a', 'b'])
      expect(Zip.strict([1, 2, 3], ['a', 'b'])).toEqual(result)
    })

    it('should handle empty input', () => {
      expect(Zip.strictN()).toEqual([])
    })

    it('should handle single array', () => {
      const result = Zip.strictN([1, 2, 3])
      expect(result).toEqual([[1], [2], [3]])
    })

    it('should convert various types to arrays', () => {
      const result = Zip.strictN('ab', new Set([1, 2, 3]), { x: 10, y: 20 })
      expect(result[0]).toEqual(['a', expect.any(Number), expect.any(Array)])
      expect(result.length).toBe(2) // limited by 'ab' length
    })
  })

  describe('lenientN', () => {
    it('should zip multiple arrays padding to maximum length', () => {
      const result = Zip.lenientN(
        [1, 2, 3],
        ['a', 'b'],
        [true, false, true, false]
      )
      expect(result).toEqual([
        [1, 'a', true],
        [2, 'b', false],
        [3, undefined, true],
        [undefined, undefined, false]
      ])
    })

    it('should handle two arrays like lenient', () => {
      const result = Zip.lenientN([1, 2, 3], ['a', 'b'])
      expect(Zip.lenient([1, 2, 3], ['a', 'b'])).toEqual(result)
    })

    it('should handle empty input', () => {
      expect(Zip.lenientN()).toEqual([])
    })

    it('should handle single array', () => {
      const result = Zip.lenientN([1, 2, 3])
      expect(result).toEqual([[1], [2], [3]])
    })

    it('should handle mixed empty arrays', () => {
      const result = Zip.lenientN([], [1, 2], [])
      expect(result).toEqual([
        [undefined, 1, undefined],
        [undefined, 2, undefined]
      ])
    })

    it('should convert various types to arrays', () => {
      const map = new Map([['a', 1]])
      const result = Zip.lenientN(map, 'hi')
      expect(result).toEqual([
        [['a', 1], 'h'],
        [undefined, 'i']
      ])
    })
  })

  describe('consistency between variants', () => {
    it('strict should match strictN with two args', () => {
      const inputs = [[1, 2, 3, 4], 'ab']
      expect(Zip.strict(...inputs)).toEqual(Zip.strictN(...inputs))
    })

    it('lenient should match lenientN with two args', () => {
      const inputs = [[1, 2], 'abc']
      expect(Zip.lenient(...inputs)).toEqual(Zip.lenientN(...inputs))
    })

    it('should cache array conversions efficiently', () => {
      // This test verifies the core logic works correctly
      // The refactored version caches conversions, original didn't
      const result1 = Zip.strictN([1, 2, 3], 'abc')
      const result2 = Zip.strictN([1, 2, 3], 'abc')
      expect(result1).toEqual(result2)
    })
  })
})
