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
        expect(specialCells.board.toAscii).toBe('1..\n.1.\n..1')
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
        expect(specialCells.board.occupancy).toBe(0)
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
          [0, 1],
          [0, 2],
          [0, 3]
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
        expect(special1.board.toAscii).toBe('1.\n.1')
        expect(special2.board.toAscii).toBe('....\n1...\n1...\n1...')
      })
    })
  })
})
