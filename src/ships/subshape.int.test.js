/* eslint-env jest */

/* global describe, jest, it, expect, beforeEach */

import { SubShape, StandardCells, SpecialCells } from './SubShape.js'
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
  describe('integration scenarios', () => {
    it('should allow mixing StandardCells and SpecialCells', () => {
      const standard = new StandardCells(
        mockValidator,
        mockZoneDetail,
        mockSubterrain
      )
      const special = new SpecialCells(
        [[5, 5]],
        mockValidator,
        mockZoneDetail,
        mockSubterrain
      )
      expect(standard).toBeInstanceOf(SubShape)
      expect(special).toBeInstanceOf(SubShape)
    })

    it('should allow using StandardCells with SpecialCells as secondary', () => {
      const secondary = new SpecialCells(
        [
          [1, 1],
          [2, 2]
        ],
        mockValidator,
        mockZoneDetail,
        mockSubterrain
      )
      const standard = new StandardCells(
        mockValidator,
        mockZoneDetail,
        mockSubterrain
      )
      const allCells = [
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3]
      ]
      standard.setCells(allCells, secondary)
      expect(standard.cells).toEqual([
        [0, 0],
        [3, 3]
      ])
    })

    it('should maintain faction property across inheritance', () => {
      const standard = new StandardCells(
        mockValidator,
        mockZoneDetail,
        mockSubterrain
      )
      const special = new SpecialCells(
        [],
        mockValidator,
        mockZoneDetail,
        mockSubterrain
      )
      standard.faction = 2
      special.faction = 3
      expect(standard.faction).toBe(2)
      expect(special.faction).toBe(3)
    })

    it('should handle multiple subterrains', () => {
      const terrain1 = { title: 'Water' }
      const terrain2 = { title: 'Land' }
      const subShape1 = new SubShape(mockValidator, mockZoneDetail, terrain1)
      const standard = new StandardCells(
        mockValidator,
        mockZoneDetail,
        terrain2
      )
      expect(subShape1.subterrain).not.toBe(standard.subterrain)
    })
  })
})
