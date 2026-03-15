/* eslint-env jest */

/* global describe, jest, it, expect, beforeEach */

import { SubShape } from './SubShape.js'
import { jest } from '@jest/globals'

describe('SubShape', () => {
  let mockValidator
  let mockZoneDetail
  let mockSubterrain

  beforeEach(() => {
    mockValidator = { validate: jest.fn() }
    mockZoneDetail = { zoneId: 1, name: 'Zone A' }
    mockSubterrain = { title: 'Water', type: 'sea' }
  })

  describe('constructor', () => {
    it('should initialize with provided parameters', () => {
      const subShape = new SubShape(
        mockValidator,
        mockZoneDetail,
        mockSubterrain
      )
      expect(subShape.validator).toBe(mockValidator)
      expect(subShape.zoneDetail).toBe(mockZoneDetail)
      expect(subShape.subterrain).toBe(mockSubterrain)
    })

    it('should set faction to 1 by default', () => {
      const subShape = new SubShape(
        mockValidator,
        mockZoneDetail,
        mockSubterrain
      )
      expect(subShape.faction).toBe(1)
    })

    it('should handle different validator types', () => {
      const validator1 = {}
      const validator2 = { validate: jest.fn(), check: jest.fn() }
      const subShape1 = new SubShape(validator1, mockZoneDetail, mockSubterrain)
      const subShape2 = new SubShape(validator2, mockZoneDetail, mockSubterrain)
      expect(subShape1.validator).toBe(validator1)
      expect(subShape2.validator).toBe(validator2)
    })

    it('should handle different zoneDetail types', () => {
      const zone1 = { id: 1 }
      const zone2 = { id: 2, name: 'zone', data: {} }
      const subShape1 = new SubShape(mockValidator, zone1, mockSubterrain)
      const subShape2 = new SubShape(mockValidator, zone2, mockSubterrain)
      expect(subShape1.zoneDetail).toBe(zone1)
      expect(subShape2.zoneDetail).toBe(zone2)
    })

    it('should handle different subterrain types', () => {
      const terrain1 = { title: 'Water' }
      const terrain2 = { title: 'Land' }
      const subShape1 = new SubShape(mockValidator, mockZoneDetail, terrain1)
      const subShape2 = new SubShape(mockValidator, mockZoneDetail, terrain2)
      expect(subShape1.subterrain).toBe(terrain1)
      expect(subShape2.subterrain).toBe(terrain2)
    })
  })

  describe('clone', () => {
    it('should create a new instance', () => {
      const original = new SubShape(
        mockValidator,
        mockZoneDetail,
        mockSubterrain
      )
      const cloned = original.clone()
      expect(cloned).not.toBe(original)
      expect(cloned).toBeInstanceOf(SubShape)
    })

    it('should copy validator reference', () => {
      const original = new SubShape(
        mockValidator,
        mockZoneDetail,
        mockSubterrain
      )
      const cloned = original.clone()
      expect(cloned.validator).toBe(original.validator)
    })

    it('should copy zoneDetail reference', () => {
      const original = new SubShape(
        mockValidator,
        mockZoneDetail,
        mockSubterrain
      )
      const cloned = original.clone()
      expect(cloned.zoneDetail).toBe(original.zoneDetail)
    })

    it('should copy subterrain reference', () => {
      const original = new SubShape(
        mockValidator,
        mockZoneDetail,
        mockSubterrain
      )
      const cloned = original.clone()
      expect(cloned.subterrain).toBe(original.subterrain)
    })

    it('should reset faction to 1 in clone', () => {
      const original = new SubShape(
        mockValidator,
        mockZoneDetail,
        mockSubterrain
      )
      original.faction = 3
      const cloned = original.clone()
      expect(cloned.faction).toBe(1)
    })

    it('should maintain independence of properties', () => {
      const original = new SubShape(
        mockValidator,
        mockZoneDetail,
        mockSubterrain
      )
      const cloned = original.clone()
      original.faction = 5
      expect(cloned.faction).toBe(1)
    })

    it('should handle cloning multiple times', () => {
      const original = new SubShape(
        mockValidator,
        mockZoneDetail,
        mockSubterrain
      )
      const clone1 = original.clone()
      const clone2 = original.clone()
      const clone3 = clone1.clone()
      expect(clone1).not.toBe(clone2)
      expect(clone1).not.toBe(clone3)
      expect(clone1.validator).toBe(clone3.validator)
    })
  })
})
