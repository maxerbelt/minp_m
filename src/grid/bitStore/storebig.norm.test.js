/* eslint-env jest */
/* global describe, it, expect, beforeEach */
import { StoreBig } from './storeBig.js'
import { Mask } from '../rectangle/mask.js'

function ascii (width, height, bits, depth = 2) {
  const m = new Mask(width, height, bits, null, depth)
  return m.toAscii
}
BigInt.prototype.toJSON = function () {
  return this.toString()
}
describe('StoreBig normalize', () => {
  let store
  beforeEach(() => {
    store = new StoreBig(1, 100, 1, 10, 10)
  })

  describe('normalizeUpLeft', () => {
    it('should return zero for zero input', () => {
      const result = store.normalizeUpLeft(0n, 10, 10)
      expect(result).toBe(0n)
    })

    it('should normalize a single bit', () => {
      let result = store.normalizeUpLeft(1n, 10, 10)
      expect(result).toBe(1n)
      result = store.normalizeUpLeft(2n, 10, 10)
      expect(result).toBe(1n)
      result = store.normalizeUpLeft(32n, 3, 3)
      expect(result).toBe(1n)
    })
    it('should normalize a short pattern', () => {
      let unnormal = 52n
      expect(store.bitsPerCell).toBe(1)
      expect(ascii(3, 3, unnormal, 2)).toBe('..1\n.11\n...')
      let normal = store.normalizeUpLeft(unnormal, 3, 3)
      let { minRow: minRowIndex, minCol: minColIndex } = store.boundingBox(
        3,
        3,
        unnormal
      )
      expect(minRowIndex).toBe(0)
      expect(minColIndex).toBe(1)
      expect(normal).toBe(0b011010n)
      expect(ascii(3, 3, normal, 2)).toBe('.1.\n11.\n...')
      unnormal = 200n
      expect(ascii(3, 3, unnormal, 2)).toBe('...\n1..\n11.')
      ;({ minRow: minRowIndex, minCol: minColIndex } = store.boundingBox(
        3,
        3,
        unnormal
      ))
      expect(minRowIndex).toBe(1)
      expect(minColIndex).toBe(0)
      normal = store.normalizeUpLeft(unnormal, 3, 3)
      expect(normal).toBe(0b11001n)
      expect(ascii(3, 3, normal, 2)).toBe('1..\n11.\n...')
      unnormal = 416n
      expect(ascii(3, 3, unnormal, 2)).toBe('...\n..1\n.11')
      normal = store.normalizeUpLeft(unnormal, 3, 3)
      expect(ascii(3, 3, normal, 2)).toBe('.1.\n11.\n...')
      expect(normal).toBe(0b11010n)
    })
  })
  describe('normalizeUpLeft multibit', () => {
    beforeEach(() => {
      store = new StoreBig(3, 9, 2, 3, 3)
    })
    it('should return zero for zero input', () => {
      const result = store.normalizeUpLeft(0n, 10, 10)
      expect(result).toBe(0n)
    })

    it('should normalize a single cell', () => {
      let result = store.normalizeUpLeft(1n, 10, 10)
      expect(result).toBe(1n)

      result = store.normalizeUpLeft(2n, 10, 10)
      expect(result).toBe(2n)

      result = store.normalizeUpLeft(48n, 3, 3)
      expect(result).toBe(3n)
    })
    it('should normalize a short pattern', () => {
      let unnormal = 1296n
      expect(store.bitsPerCell).toBe(2)
      expect(ascii(3, 3, unnormal, 3)).toBe('..1\n.11\n...')
      let { minRow, minCol } = store.boundingBox(3, 3, unnormal)
      expect(minRow).toBe(0)
      expect(minCol).toBe(1)
      unnormal = 20544n
      expect(ascii(3, 3, unnormal, 3)).toBe('...\n1..\n11.')
      ;({ minRow, minCol } = store.boundingBox(3, 3, unnormal))
      expect(minRow).toBe(1)
      expect(minCol).toBe(0)
      let normal = store.normalizeUpLeft(unnormal, 3, 3)
      expect(ascii(3, 3, normal, 3)).toBe('1..\n11.\n...')
      normal = store.normalizeUpLeft(unnormal, 3, 3)
      expect(ascii(3, 3, normal, 3)).toBe('1..\n11.\n...')
      unnormal = 82944n
      expect(ascii(3, 3, unnormal, 3)).toBe('...\n..1\n.11')
      normal = store.normalizeUpLeft(unnormal, 3, 3)
      expect(ascii(3, 3, normal, 3)).toBe('.1.\n11.\n...')
    })
  })
})
