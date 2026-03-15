/* eslint-env jest */

/* global describe, jest, it, expect, beforeEach */

import { SubShape, SpecialCells } from './SubShape.js'
import { jest } from '@jest/globals'

describe('SubShape special cells', () => {
  let mockValidator
  let mockZoneDetail
  let mockSubterrain

  beforeEach(() => {
    mockValidator = { validate: jest.fn() }
    mockZoneDetail = { zoneId: 1, name: 'Zone A' }
    mockSubterrain = { title: 'Water', type: 'sea' }
  })

  describe('SpecialCells', () => {
    describe('constructor', () => {
      it('should initialize with cells in constructor', () => {
        const cells = [
          [0, 0],
          [1, 1],
          [2, 2]
        ]
        const specialCells = new SpecialCells(
          cells,
          mockValidator,
          mockZoneDetail,
          mockSubterrain
        )
        expect(specialCells.cells).toBe(cells)
      })

      it('should initialize with parent properties', () => {
        const cells = [[0, 0]]
        const specialCells = new SpecialCells(
          cells,
          mockValidator,
          mockZoneDetail,
          mockSubterrain
        )
        expect(specialCells.validator).toBe(mockValidator)
        expect(specialCells.zoneDetail).toBe(mockZoneDetail)
        expect(specialCells.subterrain).toBe(mockSubterrain)
        expect(specialCells.faction).toBe(1)
      })

      it('should accept empty cells array', () => {
        const specialCells = new SpecialCells(
          [],
          mockValidator,
          mockZoneDetail,
          mockSubterrain
        )
        expect(specialCells.cells).toEqual([])
      })

      it('should be instance of SpecialCells and SubShape', () => {
        const specialCells = new SpecialCells(
          [],
          mockValidator,
          mockZoneDetail,
          mockSubterrain
        )
        expect(specialCells).toBeInstanceOf(SpecialCells)
        expect(specialCells).toBeInstanceOf(SubShape)
      })

      it('should store different cell arrays', () => {
        const cells1 = [
          [0, 0],
          [1, 1]
        ]
        const cells2 = [
          [5, 5],
          [6, 6],
          [7, 7]
        ]
        const special1 = new SpecialCells(
          cells1,
          mockValidator,
          mockZoneDetail,
          mockSubterrain
        )
        const special2 = new SpecialCells(
          cells2,
          mockValidator,
          mockZoneDetail,
          mockSubterrain
        )
        expect(special1.cells).toBe(cells1)
        expect(special2.cells).toBe(cells2)
      })

      it('should maintain cell array reference', () => {
        const cells = [
          [0, 0],
          [1, 1]
        ]
        const specialCells = new SpecialCells(
          cells,
          mockValidator,
          mockZoneDetail,
          mockSubterrain
        )
        cells.push([2, 2])
        expect(specialCells.cells).toContainEqual([2, 2])
      })

      it('should handle cells with various coordinate values', () => {
        const cells = [
          [-100, 200],
          [0, 0],
          [999, 999],
          [-1, -1]
        ]
        const specialCells = new SpecialCells(
          cells,
          mockValidator,
          mockZoneDetail,
          mockSubterrain
        )
        expect(specialCells.cells).toEqual(cells)
      })
    })
  })
})
