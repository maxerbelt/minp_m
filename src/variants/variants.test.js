/* eslint-env jest */

/* global describe, it, expect */
import { Asymmetric } from './asymmetric.js'
import { Orbit4R } from './Orbit4R.js' //
import { Invariant } from './Invariant.js' //
import { Mask } from '../grid/mask.js'
import { jest } from '@jest/globals'

function allHasLength (received, expectedLength) {
  return received.every(el => Array.isArray(el) && el.length === expectedLength)
}
BigInt.prototype.toJSON = function () {
  return this.toString()
}
expect.extend({
  allToHaveLength (received, expectedLength) {
    if (!Array.isArray(received)) {
      return {
        pass: false,
        message: () => `expected an array but got ${typeof received}`
      }
    }

    const pass = allHasLength(received, expectedLength)

    return {
      pass,
      message: () =>
        pass
          ? `expected not all elements to have length ${expectedLength}`
          : `expected all elements to be arrays of length ${expectedLength}, but got ${JSON.stringify(
              received
            )}`
    }
  }
})

function getArrayDepth (arr) {
  if (!Array.isArray(arr)) return 0
  return Math.max(0, ...arr.map(getArrayDepth))
}
expect.extend({
  allToHaveLengthAtDepth (received, expectedLength, depth) {
    if (!Array.isArray(received)) {
      return {
        pass: false,
        message: () => `expected an array but got ${typeof received}`
      }
    }

    const realDepth = getArrayDepth(received)
    if (realDepth >= depth) {
      return {
        pass: false,
        message: () =>
          `expected an array of depth ${depth} got depth ${realDepth}`
      }
    }
    function check (arr, currentDepth) {
      if (currentDepth === depth) {
        return Array.isArray(arr) && arr.length === expectedLength
      }
      return (
        Array.isArray(arr) && arr.every(inner => check(inner, currentDepth + 1))
      )
    }

    const pass = check(received, 1)

    return {
      pass,
      message: () =>
        pass
          ? `expected not all arrays at depth ${depth} to have length ${expectedLength}`
          : `expected all arrays at depth ${depth} to have length ${expectedLength}, but got ${JSON.stringify(
              received
            )}`
    }
  }
})
expect.extend({
  toBeBoardCellEqual (received, expected, dimension = 2) {
    if (!(received instanceof Mask)) {
      return {
        pass: false,
        message: () => `expected a MaskBase instance but got ${typeof received}`
      }
    }
    const realDepth = received.depth
    if (realDepth === dimension) {
      return {
        pass: false,
        message: () => `expected an board of depth 2 got depth ${realDepth}`
      }
    }
    if (!allHasLength(received, dimension)) {
      return {
        pass: false,
        message: () =>
          `expected an board of cells but got ${typeof received} - ${JSON.stringify(
            received
          )} `
      }
    }
    let expectedBoard = received.emptyMask
    expectedBoard.fromCoordsSquare(expected)
    const pass = received.bits === expectedBoard.bits
    if (pass) {
      return {
        message: () =>
          `expected boards not to be equal:\nReceived: ${received}\nExpected: ${expected}`,
        pass: true
      }
    } else {
      return {
        message: () =>
          `expected boards to be equal:\nReceived: ${JSON.stringify(
            received
          )}\nExpected: ${JSON.stringify(expected)}`,
        pass: false
      }
    }
  }
})
expect.extend({
  toBeBoardEqual (received, expected, dimension = 2) {
    if (!(received instanceof Mask)) {
      return {
        pass: false,
        message: () => `expected a MaskBase instance but got ${typeof received}`
      }
    }
    const realDepth = received.depth
    if (realDepth === dimension) {
      return {
        pass: false,
        message: () => `expected an board of depth 2 got depth ${realDepth}`
      }
    }
    if (!allHasLength(received, dimension)) {
      return {
        pass: false,
        message: () =>
          `expected an board of cells but got ${typeof received} - ${JSON.stringify(
            received
          )} `
      }
    }

    const pass =
      received.bits === expected.bits && received.width === expected.width

    if (pass) {
      return {
        message: () =>
          `expected boards not to be equal:\nReceived: ${received}\nExpected: ${expected}`,
        pass: true
      }
    } else {
      return {
        message: () =>
          `expected boards to be equal:\nReceived: ${JSON.stringify(
            received
          )}\nExpected: ${JSON.stringify(expected)}`,
        pass: false
      }
    }
  }
})
expect.extend({
  toBeCellEqual (received, expected, dimension = 2) {
    if (!Array.isArray(received)) {
      return {
        pass: false,
        message: () => `expected an array but got ${typeof received}`
      }
    }
    const realDepth = getArrayDepth(received)
    if (realDepth === dimension) {
      return {
        pass: false,
        message: () => `expected an array of depth 2 got depth ${realDepth}`
      }
    }
    if (!allHasLength(received, dimension)) {
      return {
        pass: false,
        message: () =>
          `expected an array of cells but got ${typeof received} - ${JSON.stringify(
            received
          )} `
      }
    }
    const sorter = (a, b) => a[0] - b[0] || a[1] - b[1]
    const receivedSorted = received.toSorted(sorter)
    const expectedSorted = expected.toSorted(sorter)

    const pass =
      received.length === expected.length &&
      JSON.stringify(receivedSorted) === JSON.stringify(expectedSorted)

    if (pass) {
      return {
        message: () =>
          `expected arrays not to be equal:\nReceived: ${received}\nExpected: ${expected}`,
        pass: true
      }
    } else {
      return {
        message: () =>
          `expected arrays to be equal:\nReceived: ${JSON.stringify(
            received
          )}\nExpected: ${JSON.stringify(expected)}`,
        pass: false
      }
    }
  }
})

// Jest test suite
describe(
  'Asymmetric',
  () => {
    const cells = [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1]
    ]
    const board = Mask.fromCoordsSquare(cells)
    const validator = () => true
    const zoneDetail = 0
    const d4Variants = [
      [
        [0, 0],
        [1, 0]
      ],
      [
        [0, 2],
        [0, 1]
      ],

      [
        [1, 1],
        [2, 1]
      ],
      [
        [1, 0],
        [1, 1]
      ],
      [
        [1, 0],
        [2, 0]
      ],
      [
        [0, 2],
        [1, 2]
      ],
      [
        [0, 1],
        [1, 1]
      ],
      [
        [1, 1],
        [1, 2]
      ]
    ]

    it('should create 8 subvariants for a shape', () => {
      const d4 = new Asymmetric(null, validator, zoneDetail, d4Variants)
      expect(d4.list).toHaveLength(8)

      expect(d4.list[0].toCoords).toBeCellEqual([
        [0, 0],
        [1, 0]
      ])
      expect(d4.list[1].toCoords).toBeCellEqual([
        [0, 1],
        [0, 2]
      ])
      expect(d4.list[2].toCoords).toBeCellEqual([
        [1, 1],
        [2, 1]
      ])
      expect(d4.list[3].toCoords).toBeCellEqual([
        [1, 0],
        [1, 1]
      ])
      expect(d4.list[4].toCoords).toBeCellEqual([
        [1, 0],
        [2, 0]
      ])
      expect(d4.list[5].toCoords).toBeCellEqual([
        [0, 2],
        [1, 2]
      ])
      expect(d4.list[6].toCoords).toBeCellEqual([
        [0, 1],
        [1, 1]
      ])
      expect(d4.list[7].toCoords).toBeCellEqual([
        [1, 1],
        [1, 2]
      ])
    })

    it('should create 8 variants for a shape', () => {
      const d4 = new Asymmetric(board, validator, zoneDetail)
      expect(d4.list).toHaveLength(8)

      expect(d4.list[1].toCoords).toBeCellEqual([
        [1, 0],
        [1, 1],
        [0, 2],
        [1, 2]
      ])
      expect(d4.list[2].bits).toBe(
        Mask.fromCoordsSquare([
          [2, 1],
          [1, 1],
          [0, 1],
          [0, 0]
        ]).bits
      )
      expect(d4.list[3].toCoords).toBeCellEqual([
        [0, 0],
        [1, 0],
        [0, 1],
        [0, 2]
      ])
      expect(d4.list[4].toCoords).toBeCellEqual([
        [0, 0],
        [1, 0],
        [2, 0],
        [0, 1]
      ])
      expect(d4.list[5].toCoords).toBeCellEqual([
        [0, 0],
        [1, 0],
        [1, 1],
        [1, 2]
      ])
      expect(d4.list[6].toCoords).toBeCellEqual([
        [0, 1],
        [1, 1],
        [2, 0],
        [2, 1]
      ])
      expect(d4.list[7].toCoords).toBeCellEqual([
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 2]
      ])
    })
    it('should create variants with 4 cells', () => {
      const d4 = new Asymmetric(board, validator, zoneDetail)
      expect(d4.list).toHaveLength(8)
      expect(d4.list.map(v => v.toCoords)).allToHaveLength(4)
      expect(d4.list.map(v => v.toCoords)).allToHaveLengthAtDepth(2, 3)
    })

    it('variant() should return the current variant', () => {
      const d4 = new Asymmetric(board, validator, zoneDetail)
      expect(d4.variant()).toEqual(d4.list[0].toCoords)
      d4.index = 3
      expect(d4.variant()).toEqual(d4.list[3].toCoords)
    })

    it('should rotate index using static r', () => {
      expect(Asymmetric.r(0)).toBe(1)
      expect(Asymmetric.r(4)).toBe(5)
      expect(Asymmetric.r(3)).toBe(0)
      expect(Asymmetric.r(7)).toBe(4)
    })

    it('should flip index using static f', () => {
      expect(Asymmetric.f(0)).toBe(4)
      expect(Asymmetric.f(5)).toBe(1)
    })

    it('should left rotate index using static rf', () => {
      expect(Asymmetric.rf(0)).toBe(3)
      expect(Asymmetric.rf(1)).toBe(0)
      expect(Asymmetric.rf(5)).toBe(4)
      expect(Asymmetric.rf(4)).toBe(7)
    })

    it('should update index and variant on rotate()', () => {
      const d4 = new Asymmetric(board, validator, zoneDetail)
      d4.index = 0
      d4.rotate()
      expect(d4.index).toBe(Asymmetric.r(0))
      expect(d4.variant()).toEqual(d4.list[d4.index].toCoords)
    })

    it('should update index and variant on flip()', () => {
      const d4 = new Asymmetric(board, validator, zoneDetail)
      d4.index = 0
      d4.flip()
      expect(d4.index).toBe(Asymmetric.f(0))
      expect(d4.variant()).toEqual(d4.list[d4.index].toCoords)
    })

    it('should update index and variant on leftRotate()', () => {
      const d4 = new Asymmetric(board, validator, zoneDetail)
      d4.index = 0
      d4.leftRotate()
      expect(d4.index).toBe(Asymmetric.rf(0))
      expect(d4.variant()).toEqual(d4.list[d4.index].toCoords)
    })
  },
  describe(
    'Invariant',
    () => {
      const cells = [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1]
      ]
      const board = Mask.fromCoordsSquare(cells)
      const validator = () => true
      const zoneDetail = 0

      it('should create an Invariant with the given cells', () => {
        const inv = new Invariant(board, validator, zoneDetail)
        expect(inv.list[0].bits).toEqual(board.bits)
      })

      it('variant() should always return the first variant', () => {
        const inv = new Invariant(board, validator, zoneDetail)
        expect(inv.variant()).toBeCellEqual(cells)
        inv.index = 1
        expect(inv.variant()).toBeCellEqual(cells)
      })

      it('setByIndex() should throw an error', () => {
        const inv = new Invariant(board, validator, zoneDetail)
        expect(() => inv.setByIndex(1)).toThrow('can not change this variant')
      })

      it('static r should return the same index', () => {
        expect(Invariant.r(0)).toBe(0)
        expect(Invariant.r(1)).toBe(1)
      })
    },
    describe('Orbit4R', () => {
      const cells = [
        [0, 0],
        [0, 1],
        [1, 0]
      ]
      const board = Mask.fromCoordsSquare(cells)
      const validator = () => true
      const zoneDetail = 0

      it('should create 4 cyclic variants for a shape', () => {
        const c4 = new Orbit4R(board, validator, zoneDetail)
        expect(c4.list).toHaveLength(4)
      })

      it('variant() should return the current variant', () => {
        const c4 = new Orbit4R(board, validator, zoneDetail)
        expect(c4.variant()).toEqual(c4.list[0].toCoords)
        c4.index = 2
        expect(c4.variant()).toEqual(c4.list[2].toCoords)
      })

      it('should rotate index using static r', () => {
        expect(Orbit4R.r(0)).toBe(1)
        expect(Orbit4R.r(3)).toBe(0)
      })

      it('should flip index using static f', () => {
        expect(Orbit4R.f(0)).toBe(2)
        expect(Orbit4R.f(1)).toBe(3)
      })

      it('should left rotate index using static rf', () => {
        expect(Orbit4R.rf(0)).toBe(3)
        expect(Orbit4R.rf(2)).toBe(1)
      })

      it('should update index and variant on rotate()', () => {
        const c4 = new Orbit4R(board, validator, zoneDetail)
        c4.index = 0
        c4.rotate()
        expect(c4.index).toBe(Orbit4R.r(0))
        expect(c4.variant()).toBeCellEqual(c4.list[c4.index].toCoords)
      })

      it('should update index and variant on flip()', () => {
        const c4 = new Orbit4R(board, validator, zoneDetail)
        c4.index = 1
        c4.flip()
        expect(c4.index).toBe(Orbit4R.f(1))
        expect(c4.variant()).toEqual(c4.list[c4.index].toCoords)
      })

      it('should update index and variant on leftRotate()', () => {
        const c4 = new Orbit4R(board, validator, zoneDetail)
        c4.index = 2
        c4.leftRotate()
        expect(c4.index).toBe(Orbit4R.rf(2))
        expect(c4.variant()).toEqual(c4.list[c4.index].toCoords)
      })
    })
  )
)
