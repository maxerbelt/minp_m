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
  describe('inheritance and clone', () => {
    it('should inherit clone method from SubShape', () => {
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
      const cloned = specialCells.clone()
      expect(cloned).toBeInstanceOf(SubShape)
    })

    it('should clone as SubShape not SpecialCells', () => {
      const cells = [[0, 0]]
      const specialCells = new SpecialCells(
        cells,
        mockValidator,
        mockZoneDetail,
        mockSubterrain
      )
      const cloned = specialCells.clone()
      expect(cloned).not.toBeInstanceOf(SpecialCells)
    })
  })
})
