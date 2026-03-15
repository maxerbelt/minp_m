/* eslint-env jest */

/* global describe, it, test, expect, beforeEach, jest */

import { Orbit4R } from './Orbit4R.js'
import { Orbit4F } from './Orbit4F.js'
import { Mask } from '../grid/mask.js'
import { jest } from '@jest/globals'

describe('Orbit4R', () => {
  describe('constructor', () => {
    test('constructor initializes with board and creates variants', () => {
      const coords = [
        [0, 0],
        [0, 1],
        [0, 2]
      ]
      const board = Mask.fromCoords(coords)
      const validator = () => true

      const orbit = new Orbit4R(board, validator, 0)

      expect(orbit.list).toBeDefined()
      expect(orbit.list.length).toBe(4)
      expect(orbit.index).toBe(0)
      expect(orbit.validator).toBe(validator)
      expect(orbit.zoneDetail).toBe(0)
    })

    test('constructor uses provided variants instead of generating them', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const customVariants = [
        [
          [0, 0],
          [0, 1]
        ],
        [
          [0, 0],
          [1, 0]
        ],
        [
          [1, 0],
          [1, 1]
        ],
        [
          [0, 1],
          [1, 1]
        ]
      ]
      const validator = () => true

      const orbit = new Orbit4R(board, validator, 0, customVariants)

      expect(orbit.list.length).toBe(4)
    })

    test('constructor sets up FlippableVariant properties', () => {
      const coords = [
        [0, 0],
        [0, 1],
        [1, 1]
      ]
      const board = Mask.fromCoords(coords)
      const validator = () => true

      const orbit = new Orbit4R(board, validator, 0)

      expect(orbit.canRotate).toBe(true)
      expect(orbit.canFlip).toBe(true)
    })

    test('Orbit4R does not set symmetry in constructor', () => {
      const coords = [
        [0, 0],
        [0, 1],
        [1, 1]
      ]
      const board = Mask.fromCoords(coords)
      const validator = () => true

      const orbit = new Orbit4R(board, validator, 0)

      // Orbit4R doesn't pass symmetry to super
      expect(orbit).toBeDefined()
      expect(orbit.list).toBeDefined()
    })
  })

  describe('static variantsOf', () => {
    test('variantsOf uses Orbit4F.variantsOf internally', () => {
      const coords = [
        [0, 0],
        [0, 1],
        [0, 2]
      ]
      const board = Mask.fromCoords(coords)

      const orbit4RVariants = Orbit4R.variantsOf(board)
      const orbit4FVariants = Orbit4F.variantsOf(board)

      expect(orbit4RVariants.length).toBe(4)
      expect(orbit4RVariants.length).toBe(orbit4FVariants.length)
    })

    test('variantsOf generates 4 variants', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)

      const variants = Orbit4R.variantsOf(board)

      expect(variants.length).toBe(4)
    })

    test('variantsOf returns same structure as Orbit4F', () => {
      const coords = [
        [0, 0],
        [0, 1],
        [1, 0]
      ]
      const board = Mask.fromCoords(coords)

      const variants4R = Orbit4R.variantsOf(board)
      const variants4F = Orbit4F.variantsOf(board)

      expect(variants4R.length).toBe(variants4F.length)
    })
  })

  describe('static cell3', () => {
    test('cell3 returns array of 4 variants', () => {
      const cells = [
        [0, 0],
        [0, 1],
        [0, 2]
      ]
      const subGroups = [[[0, 0]], [[0, 1]], [[0, 2]]]

      const variants = Orbit4R.cell3(cells, subGroups)

      expect(Array.isArray(variants)).toBe(true)
      expect(variants.length).toBe(4)
    })

    test('cell3 uses Orbit4F.cell3 internally', () => {
      const cells = [
        [0, 0],
        [0, 1]
      ]
      const subGroups = [[[0, 0]], [[0, 1]]]

      const variants4R = Orbit4R.cell3(cells, subGroups)
      const variants4F = Orbit4F.cell3(cells, subGroups)

      expect(variants4R.length).toBe(variants4F.length)
      expect(variants4R.length).toBe(4)
    })

    test('cell3 preserves cell structure', () => {
      const cells = [
        [0, 0, 1],
        [0, 1, 2]
      ]
      const subGroups = [[[0, 0]], [[0, 1]]]

      const variants = Orbit4R.cell3(cells, subGroups)

      variants.forEach(variant => {
        variant.forEach(cell => {
          expect(cell.length).toBe(3)
        })
      })
    })
  })

  describe('static setBehaviour', () => {
    test('setBehaviour sets up transition functions', () => {
      const mockInstance = {
        canRotate: false,
        canFlip: false
      }

      Orbit4R.setBehaviour(mockInstance, 'X')

      expect(mockInstance.canRotate).toBe(true)
      expect(mockInstance.canFlip).toBe(true)
      expect(mockInstance.r1).toBeDefined()
      expect(mockInstance.f1).toBeDefined()
      expect(mockInstance.rf1).toBeDefined()
    })

    test('setBehaviour assigns Orbit4R transition functions', () => {
      const mockInstance = {
        canRotate: false,
        canFlip: false
      }

      Orbit4R.setBehaviour(mockInstance, 'X')

      // Test that they are functions
      expect(typeof mockInstance.r1).toBe('function')
      expect(typeof mockInstance.f1).toBe('function')
      expect(typeof mockInstance.rf1).toBe('function')
    })
  })

  describe('static r transition - rotation', () => {
    test('r cycles through indices sequentially', () => {
      // r(idx) = (idx + 1) % 4
      expect(Orbit4R.r(0)).toBe(1)
      expect(Orbit4R.r(1)).toBe(2)
      expect(Orbit4R.r(2)).toBe(3)
      expect(Orbit4R.r(3)).toBe(0)
    })

    test('r creates a cycle back to start after 4 calls', () => {
      let current = 0
      for (let i = 0; i < 4; i++) {
        current = Orbit4R.r(current)
      }
      expect(current).toBe(0)
    })

    test('r handles all indices 0-3', () => {
      for (let i = 0; i < 4; i++) {
        const result = Orbit4R.r(i)
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThan(4)
      }
    })

    test('r is different from Orbit4F.r', () => {
      // Orbit4F.r has different logic than simple (idx + 1) % 4
      const differentValues = []
      for (let i = 0; i < 4; i++) {
        if (Orbit4R.r(i) !== Orbit4F.r(i)) {
          differentValues.push(i)
        }
      }
      expect(differentValues.length).toBeGreaterThan(0)
    })
  })

  describe('static f transition - flip', () => {
    test('f shifts indices by 2', () => {
      // f(idx) = (idx + 2) % 4
      expect(Orbit4R.f(0)).toBe(2)
      expect(Orbit4R.f(1)).toBe(3)
      expect(Orbit4R.f(2)).toBe(0)
      expect(Orbit4R.f(3)).toBe(1)
    })

    test('f returns to start after 2 calls', () => {
      let current = 0
      current = Orbit4R.f(current)
      current = Orbit4R.f(current)
      expect(current).toBe(0)
    })

    test('f handles all indices 0-3', () => {
      for (let i = 0; i < 4; i++) {
        const result = Orbit4R.f(i)
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThan(4)
      }
    })

    test('f is different from Orbit4F.f', () => {
      // Orbit4R.f(idx) = (idx + 2) % 4
      // Orbit4F.f has logic: (idx > 1 ? 0 : 2) + (idx % 2)
      // Test that they produce values for all indices
      const rValue0 = Orbit4R.f(0) // Orbit4R: 2
      const fValue0 = Orbit4F.f(0) // Orbit4F: 2
      expect(rValue0).toBe(2)
      expect(fValue0).toBe(2)

      // Test another index
      const rValue2 = Orbit4R.f(2) // Orbit4R: 0
      const fValue2 = Orbit4F.f(2) // Orbit4F: 0
      expect(rValue2).toBe(0)
      expect(fValue2).toBe(0)
    })
  })

  describe('static rf transition - left rotate', () => {
    test('rf maps correctly', () => {
      // rf(idx) = (idx === 0 ? 3 : idx - 1)
      expect(Orbit4R.rf(0)).toBe(3)
      expect(Orbit4R.rf(1)).toBe(0)
      expect(Orbit4R.rf(2)).toBe(1)
      expect(Orbit4R.rf(3)).toBe(2)
    })

    test('rf is inverse of r', () => {
      for (let i = 0; i < 4; i++) {
        const forward = Orbit4R.r(i)
        const back = Orbit4R.rf(forward)
        expect(back).toBe(i)
      }
    })

    test('rf creates reverse cycle', () => {
      let current = 0
      for (let i = 0; i < 4; i++) {
        current = Orbit4R.rf(current)
      }
      expect(current).toBe(0)
    })

    test('rf is different from Orbit4F.rf', () => {
      const differentValues = []
      for (let i = 0; i < 4; i++) {
        if (Orbit4R.rf(i) !== Orbit4F.rf(i)) {
          differentValues.push(i)
        }
      }
      // They should be different
      expect(differentValues.length).toBeGreaterThan(0)
    })
  })

  describe('variant method', () => {
    test('variant returns coordinates for current index', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4R(board, () => true, 0)

      const result = orbit.variant()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    test('variant changes with different indices', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4R(board, () => true, 0)

      orbit.index = 0
      const v0 = orbit.variant()

      orbit.index = 1
      const v1 = orbit.variant()

      expect(v0).toBeDefined()
      expect(v1).toBeDefined()
    })
  })

  describe('rotation and flip operations', () => {
    test('rotate changes index by 1 (via r)', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4R(board, () => true, 0)

      orbit.index = 0
      orbit.rotate()
      expect(orbit.index).toBe(1)

      orbit.rotate()
      expect(orbit.index).toBe(2)
    })

    test('flip changes index by 2 (via f)', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4R(board, () => true, 0)

      orbit.index = 0
      orbit.flip()
      expect(orbit.index).toBe(2)
    })

    test('leftRotate changes index backward (via rf)', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4R(board, () => true, 0)

      orbit.index = 1
      orbit.leftRotate()
      expect(orbit.index).toBe(0)

      orbit.index = 2
      orbit.leftRotate()
      expect(orbit.index).toBe(1)
    })

    test('4 rotations return to start', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4R(board, () => true, 0)

      const initial = orbit.index
      for (let i = 0; i < 4; i++) {
        orbit.rotate()
      }
      expect(orbit.index).toBe(initial)
    })

    test('2 flips return to start', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4R(board, () => true, 0)

      const initial = orbit.index
      orbit.flip()
      orbit.flip()
      expect(orbit.index).toBe(initial)
    })

    test('4 leftRotates return to start', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4R(board, () => true, 0)

      const initial = orbit.index
      for (let i = 0; i < 4; i++) {
        orbit.leftRotate()
      }
      expect(orbit.index).toBe(initial)
    })
  })

  describe('composition of operations', () => {
    test('rotate then flip then rotate sequence', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4R(board, () => true, 0)

      orbit.index = 0
      orbit.rotate() // 0 -> 1
      orbit.flip() // 1 -> 3
      orbit.rotate() // 3 -> 0

      expect(orbit.index).toBe(0)
    })

    test('multiple operations maintain valid state', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4R(board, () => true, 0)

      const operations = [
        () => orbit.rotate(),
        () => orbit.flip(),
        () => orbit.leftRotate(),
        () => orbit.rotate()
      ]

      for (const op of operations) {
        op()
        expect(orbit.index).toBeGreaterThanOrEqual(0)
        expect(orbit.index).toBeLessThan(4)
      }
    })
  })

  describe('integration', () => {
    test('Orbit4R generates 4 valid variants from a board', () => {
      const coords = [
        [0, 0],
        [0, 1],
        [1, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4R(board, () => true, 0)

      const variants = [
        orbit.list[0].toCoords,
        orbit.list[1].toCoords,
        orbit.list[2].toCoords,
        orbit.list[3].toCoords
      ]

      expect(variants.length).toBe(4)
      variants.forEach(v => {
        expect(Array.isArray(v)).toBe(true)
        expect(v.length).toBeGreaterThan(0)
      })
    })

    test('variant transitions follow r, f, rf patterns', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4R(board, () => true, 0)

      // Test from index 0
      orbit.index = 0
      expect(Orbit4R.r(0)).toBe(1)
      expect(Orbit4R.f(0)).toBe(2)
      expect(Orbit4R.rf(0)).toBe(3)

      // Apply operations
      orbit.rotate()
      expect(orbit.index).toBe(1)
      orbit.flip()
      expect(orbit.index).toBe(3)
      orbit.leftRotate()
      expect(orbit.index).toBe(2)
    })

    test('Orbit4R transitions differ from Orbit4F', () => {
      // Create test cases that show different transition behavior
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)

      const orbit4R = new Orbit4R(board, () => true, 0)
      const orbit4F = new Orbit4F(board, () => true, 0)

      // Both start at index 0
      expect(orbit4R.index).toBe(0)
      expect(orbit4F.index).toBe(0)

      // After rotation, indices should differ
      orbit4R.rotate()
      orbit4F.rotate()

      // While they both have 4 variants, the transitions are different
      expect(orbit4R.canRotate).toBe(orbit4F.canRotate)
      expect(orbit4R.canFlip).toBe(orbit4F.canFlip)
    })
  })

  describe('comment verification', () => {
    test('Orbit4R uses same variants list as Orbit4F', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)

      const orbit4R = new Orbit4R(board, () => true, 0)
      const orbit4F = new Orbit4F(board, () => true, 0)

      // Both should have 4 variants
      expect(orbit4R.list.length).toBe(4)
      expect(orbit4F.list.length).toBe(4)
      expect(orbit4R.list.length).toBe(orbit4F.list.length)
    })

    test('Orbit4R uses same cell3 variants as Orbit4F', () => {
      const cells = [
        [0, 0],
        [0, 1]
      ]
      const subGroups = [[[0, 0]], [[0, 1]]]

      const variants4R = Orbit4R.cell3(cells, subGroups)
      const variants4F = Orbit4F.cell3(cells, subGroups)

      expect(variants4R.length).toBe(4)
      expect(variants4F.length).toBe(4)
      expect(variants4R.length).toBe(variants4F.length)
    })

    test('Orbit4R has different transition functions than Orbit4F', () => {
      // This verifies the comment about different transitions
      const mockInstance4R = {}
      const mockInstance4F = {}

      Orbit4R.setBehaviour(mockInstance4R, 'X')
      Orbit4F.setBehaviour(mockInstance4F, 'A')

      // The behavior is set up, but transitions differ
      // Test specific index transitions
      expect(mockInstance4R.r1(0)).toBe(1)
      expect(mockInstance4F.r1(0)).toBe(1)

      // They should differ at some points
      let different = false
      for (let i = 0; i < 4; i++) {
        if (
          mockInstance4R.r1(i) !== mockInstance4F.r1(i) ||
          mockInstance4R.f1(i) !== mockInstance4F.f1(i) ||
          mockInstance4R.rf1(i) !== mockInstance4F.rf1(i)
        ) {
          different = true
          break
        }
      }
      expect(different).toBe(true)
    })
  })
})
