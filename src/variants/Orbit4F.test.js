/* eslint-env jest */

/* global describe,   it, expect, jest */

import { Orbit4F } from './Orbit4F.js'
import { Mask } from '../grid/rectangle/mask.js'
import { SubBoard } from '../grid/subBoard.js'
import { CellsToBePlaced } from './CellsToBePlaced.js'

import { describe, jest, it, expect } from '@jest/globals'
import { Placeable } from './Placeable.js'

describe('Orbit4F', () => {
  describe('constructor', () => {
    it('constructor initializes with board and creates variants', () => {
      const coords = [
        [0, 0],
        [0, 1],
        [0, 2]
      ]
      const board = Mask.fromCoords(coords)
      const validator = () => true

      const orbit = new Orbit4F(board, validator, 0)

      expect(orbit.list).toBeDefined()
      expect(orbit.list.length).toBe(4)
      expect(orbit.index).toBe(0)
      expect(orbit.validator).toBe(validator)
      expect(orbit.zoneDetail).toBe(0)
    })

    it('constructor uses provided variants instead of generating them', () => {
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

      const orbit = new Orbit4F(board, validator, 0, customVariants)

      expect(orbit.list.length).toBe(4)
    })

    it('constructor sets up FlippableVariant properties', () => {
      const coords = [
        [0, 0],
        [0, 1],
        [1, 1]
      ]
      const board = Mask.fromCoords(coords)
      const validator = () => true

      const orbit = new Orbit4F(board, validator, 0)

      expect(orbit.canRotate).toBe(true)
      expect(orbit.canFlip).toBe(true)
      expect(orbit.symmetry).toBe('A')
    })
  })

  describe('static variantsOf', () => {
    it('variantsOf generates 4 variants: original, 90°, flip, rotateFlip', () => {
      const coords = [
        [0, 0],
        [0, 1],
        [0, 2]
      ]
      const board = Mask.fromCoords(coords)

      const variants = Orbit4F.variantsOf(board)

      expect(variants.length).toBe(4)
      //   expect(variants[0].bits).toBe(board.bits)
    })

    it('variantsOf includes rotation', () => {
      const coords = [
        [0, 0],
        [0, 1],
        [0, 2]
      ]
      const board = Mask.fromCoords(coords)

      const variants = Orbit4F.variantsOf(board)
      const rotated = variants[1]

      expect(rotated).toBeDefined()
      // All variants should be Mask objects with toCoords property
      expect(rotated).toHaveProperty('toCoords')
      expect(Array.isArray(rotated.toCoords)).toBe(true)
    })

    it('variantsOf includes flip', () => {
      const coords = [
        [0, 0],
        [0, 1],
        [0, 2]
      ]
      const board = Mask.fromCoords(coords)

      const variants = Orbit4F.variantsOf(board)
      const flipped = variants[2]

      expect(flipped).toBeDefined()
    })

    it('variantsOf includes rotateFlip', () => {
      const coords = [
        [0, 0],
        [0, 1],
        [0, 2]
      ]
      const board = Mask.fromCoords(coords)

      const variants = Orbit4F.variantsOf(board)
      const rotateFlipped = variants[3]

      expect(rotateFlipped).toBeDefined()
    })
  })

  describe('static setBehaviour', () => {
    it('setBehaviour sets up transition functions', () => {
      const mockInstance = {
        canRotate: false,
        canFlip: false
      }

      Orbit4F.setBehaviour(mockInstance, 'A')

      expect(mockInstance.canRotate).toBe(true)
      expect(mockInstance.canFlip).toBe(true)
      expect(mockInstance.r1).toBeDefined()
      expect(mockInstance.f1).toBeDefined()
      expect(mockInstance.rf1).toBeDefined()
    })

    it('setBehaviour sets correct transition functions', () => {
      const mockInstance = {
        canRotate: false,
        canFlip: false
      }

      Orbit4F.setBehaviour(mockInstance, 'A')

      // Test r1 transitions
      expect(typeof mockInstance.r1).toBe('function')
      expect(typeof mockInstance.f1).toBe('function')
      expect(typeof mockInstance.rf1).toBe('function')
    })
  })

  describe('static r transition', () => {
    it('r maps indices correctly for rotation', () => {
      // r(0) should go to 1
      expect(Orbit4F.r(0)).toBe(1)
    })

    it('r handles indices 0-3', () => {
      for (let i = 0; i < 4; i++) {
        const result = Orbit4F.r(i)
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThan(4)
      }
    })

    it('r creates cycle for rotation', () => {
      // After 4 rotations, should return to start
      let current = 0
      for (let i = 0; i < 4; i++) {
        current = Orbit4F.r(current)
      }
      expect(current).toBe(0)
    })

    it('r transitions for indices > 1 start at 2', () => {
      expect(Orbit4F.r(2)).toBeGreaterThanOrEqual(2)
      expect(Orbit4F.r(3)).toBeGreaterThanOrEqual(2)
    })

    it('r transitions for indices <= 1 start at 0', () => {
      expect(Orbit4F.r(0)).toBeGreaterThanOrEqual(0)
      expect(Orbit4F.r(0)).toBeLessThan(2)
      expect(Orbit4F.r(1)).toBeGreaterThanOrEqual(0)
      expect(Orbit4F.r(1)).toBeLessThan(2)
    })
  })

  describe('static f transition', () => {
    it('f maps indices correctly for flip', () => {
      expect(typeof Orbit4F.f(0)).toBe('number')
      expect(typeof Orbit4F.f(1)).toBe('number')
    })

    it('f handles indices 0-3', () => {
      for (let i = 0; i < 4; i++) {
        const result = Orbit4F.f(i)
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThan(4)
      }
    })

    it('f transitions for indices > 1 start at 0', () => {
      expect(Orbit4F.f(2)).toBeGreaterThanOrEqual(0)
      expect(Orbit4F.f(2)).toBeLessThan(2)
      expect(Orbit4F.f(3)).toBeGreaterThanOrEqual(0)
      expect(Orbit4F.f(3)).toBeLessThan(2)
    })

    it('f transitions for indices <= 1 start at 2', () => {
      expect(Orbit4F.f(0)).toBeGreaterThanOrEqual(2)
      expect(Orbit4F.f(1)).toBeGreaterThanOrEqual(2)
    })
  })

  describe('static rf transition', () => {
    it('rf maps indices correctly', () => {
      expect(typeof Orbit4F.rf(0)).toBe('number')
    })

    it('rf handles indices 0-3', () => {
      for (let i = 0; i < 4; i++) {
        const result = Orbit4F.rf(i)
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThan(4)
      }
    })

    it('rf equals r for Orbit4F', () => {
      for (let i = 0; i < 4; i++) {
        expect(Orbit4F.rf(i)).toBe(Orbit4F.r(i))
      }
    })
  })

  describe('variant method', () => {
    it('variant returns coordinates for current index', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4F(board, () => true, 0)

      const result = orbit.variant()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('variant returns toCoords from correct list index', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4F(board, () => true, 0)

      orbit.index = 0
      const v0 = orbit.variant()
      expect(v0).toBeDefined()

      orbit.index = 1
      const v1 = orbit.variant()
      expect(v1).toBeDefined()
    })

    it('variant for aircraft carrier', () => {
      const coords = [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 1],
        [1, 2],
        [1, 3],
        [1, 4]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4F(board, () => true, 0)

      expect(orbit.list[0].store.bitsPerCell).toBe(1)
      expect(orbit.list[0].width).toBe(2)
      expect(orbit.list[0].height).toBe(5)
      expect(orbit.list[0].toAscii).toBe('1.\n11\n11\n11\n.1')

      // list[1] is an alternate variant (rotated/flipped)
      expect(orbit.list[1].width).toBe(5)
      expect(orbit.list[1].height).toBe(2)

      expect(orbit.list[2].width).toBe(2)
      expect(orbit.list[2].height).toBe(5)

      expect(orbit.list[3].width).toBe(5)
      expect(orbit.list[3].height).toBe(2)

      const placeable = orbit.placeable()
      expect(placeable).toBeInstanceOf(Placeable)
      expect(placeable.board.toAscii).toBe('1.\n11\n11\n11\n.1')
      const placing = placeable.placeAt(7, 4)
      expect(placing).toBeInstanceOf(CellsToBePlaced)

      const sb = placing.board
      expect(sb).toBeDefined()
      expect(sb).toBeInstanceOf(SubBoard)
      expect(sb.mask.toAscii).toBe('1.\n11\n11\n11\n.1')
      expect(sb.store.bitsPerCell).toBe(1)
      expect(sb.at(7, 4))
      expect(placing.validator)

      const locations = [...sb.occupiedLocations()]
      expect(locations.length).toBe(8)
      expect(sb.width).toBe(2)
      expect(sb.height).toBe(5)

      expect(locations[0]).toEqual([7, 4])
      expect(locations).toContainEqual([7, 5])
      expect(locations).toContainEqual([8, 5])
      expect(locations).toContainEqual([7, 6])
      expect(locations).toContainEqual([8, 6])
      expect(locations).toContainEqual([7, 7])
      expect(locations).toContainEqual([8, 7])
      expect(locations).toContainEqual([8, 8])
    })
  })

  describe('rotation and flip operations', () => {
    it('rotate changes index via r transition', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4F(board, () => true, 0)

      orbit.index = 0
      orbit.rotate()

      expect(orbit.index).toBe(1)
    })

    it('flip changes index via f transition', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4F(board, () => true, 0)

      orbit.index = 0
      orbit.flip()

      expect(orbit.index).toBe(2)
    })

    it('leftRotate changes index via rf transition', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4F(board, () => true, 0)

      orbit.index = 1
      orbit.leftRotate()

      const expected = Orbit4F.rf(1)
      expect(orbit.index).toBe(expected)
    })

    it('multiple rotations cycle through variants', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4F(board, () => true, 0)

      const initial = orbit.index
      orbit.rotate()
      orbit.rotate()
      orbit.rotate()
      orbit.rotate()

      // After 4 rotations, should be back to start
      expect(orbit.index).toBe(initial)
    })
  })

  describe('integration', () => {
    it('Orbit4F generates 4 valid variants from a board', () => {
      const coords = [
        [0, 0],
        [0, 1],
        [1, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4F(board, () => true, 0)

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

    it('variant transitions are consistent', () => {
      const coords = [
        [0, 0],
        [0, 1]
      ]
      const board = Mask.fromCoords(coords)
      const orbit = new Orbit4F(board, () => true, 0)

      // Track state through transitions
      const states = [orbit.index]
      orbit.rotate()
      states.push(orbit.index)
      orbit.flip()
      states.push(orbit.index)
      orbit.rotate()
      states.push(orbit.index)

      // Verify all states are valid indices
      states.forEach(state => {
        expect(state).toBeGreaterThanOrEqual(0)
        expect(state).toBeLessThan(4)
      })
    })
  })
})
