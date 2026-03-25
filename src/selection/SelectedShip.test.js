/* eslint-env jest */

/* global jest, describe, it, expect, beforeEach */

import { SelectedShip } from './SelectedShip.js'
import { jest } from '@jest/globals'

describe('SelectedShip', () => {
  let mockShip
  let mockShape
  let mockVariant
  let mockVariants
  let mockContentBuilder
  let selectedShip

  beforeEach(() => {
    // Create mock variants object with all required methods
    mockVariant = {
      variant: 'mask',
      shinkToOccupied: jest.fn().mockReturnValue({
        width: 2,
        height: 5,
        toAscii: '1.\n11\n11\n11\n.1'
      })
    }
    mockVariants = {
      index: 0,
      canFlip: true,
      canRotate: true,
      canTransform: true,
      placeable: jest.fn().mockReturnValue([{ r: 0, c: 0 }]),
      variant: jest.fn().mockReturnValue(mockVariant),
      special: jest.fn().mockReturnValue({ special: 'prop' }),
      rotate: jest.fn().mockReturnValue(mockVariant),
      leftRotate: jest.fn().mockReturnValue(mockVariant),
      flip: jest.fn().mockReturnValue(mockVariant),
      nextForm: jest.fn().mockReturnValue(mockVariant)
    }

    // Create mock shape object
    mockShape = {
      type: jest.fn().mockReturnValue('battleship'),
      variants: jest.fn().mockReturnValue(mockVariants)
    }

    // Create mock ship object
    mockShip = {
      shape: jest.fn().mockReturnValue(mockShape),
      id: 'ship-123',
      letter: 'B'
    }

    // Content builder mock
    mockContentBuilder = jest.fn()

    // Create the SelectedShip instance
    selectedShip = new SelectedShip(mockShip, 0, mockContentBuilder)
  })

  describe('constructor', () => {
    it('should initialize with ship, variant index, and content builder', () => {
      expect(selectedShip.ship).toBe(mockShip)
      expect(selectedShip.contentBuilder).toBe(mockContentBuilder)
    })

    it('should extract shape from ship', () => {
      expect(selectedShip.shape).toBe(mockShape)
      expect(mockShip.shape).toHaveBeenCalled()
    })

    it('should set type from shape', () => {
      expect(selectedShip.type).toBe('battleship')
      expect(mockShape.type).toHaveBeenCalled()
    })

    it('should copy id from ship', () => {
      expect(selectedShip.id).toBe('ship-123')
    })

    it('should copy letter from ship', () => {
      expect(selectedShip.letter).toBe('B')
    })

    it('should create variants from shape and set index', () => {
      expect(selectedShip.variants).toBe(mockVariants)
      expect(selectedShip.variants.index).toBe(0)
      expect(mockShape.variants).toHaveBeenCalled()
    })

    it('should handle different variant indices', () => {
      const selectedShip2 = new SelectedShip(mockShip, 5, mockContentBuilder)
      expect(selectedShip2.variants.index).toBe(5)
    })
  })

  describe('capability checks', () => {
    it('should check canFlip capability', () => {
      expect(selectedShip.canFlip()).toBe(true)
    })

    it('should check canRotate capability', () => {
      expect(selectedShip.canRotate()).toBe(true)
    })

    it('should check canTransform capability', () => {
      expect(selectedShip.canTransform()).toBe(true)
    })

    it('should handle false capabilities', () => {
      mockVariants.canFlip = false
      mockVariants.canRotate = false
      mockVariants.canTransform = false

      expect(selectedShip.canFlip()).toBe(false)
      expect(selectedShip.canRotate()).toBe(false)
      expect(selectedShip.canTransform()).toBe(false)
    })
  })

  describe('delegated methods', () => {
    it('should delegate placeable() to variants', () => {
      const result = selectedShip.placeable()
      expect(mockVariants.placeable).toHaveBeenCalled()
      expect(result).toEqual([{ r: 0, c: 0 }])
    })

    it('should delegate variant() to variants', () => {
      const result = selectedShip.variant()
      expect(mockVariants.variant).toHaveBeenCalled()
      expect(result.variant).toEqual('mask')
    })

    it('should delegate rotate() to variants', () => {
      const result = selectedShip.rotate()
      expect(mockVariants.rotate).toHaveBeenCalled()
      expect(result.variant).toEqual('mask')
    })

    it('should delegate leftRotate() to variants', () => {
      const result = selectedShip.leftRotate()
      expect(mockVariants.leftRotate).toHaveBeenCalled()
      expect(result.variant).toEqual('mask')
    })

    it('should delegate flip() to variants', () => {
      const result = selectedShip.flip()
      expect(mockVariants.flip).toHaveBeenCalled()
      expect(result.variant).toEqual('mask')
    })

    it('should delegate nextForm() to variants', () => {
      const result = selectedShip.nextForm()
      expect(mockVariants.nextForm).toHaveBeenCalled()
      expect(result.variant).toEqual('mask')
    })
  })

  describe('edge cases', () => {
    it('should handle multiple transformations', () => {
      selectedShip.rotate()
      selectedShip.flip()
      selectedShip.leftRotate()

      expect(mockVariants.rotate).toHaveBeenCalledTimes(1)
      expect(mockVariants.flip).toHaveBeenCalledTimes(1)
      expect(mockVariants.leftRotate).toHaveBeenCalledTimes(1)
    })

    it('should maintain reference to original ship', () => {
      const originalShip = selectedShip.ship
      selectedShip.rotate()
      selectedShip.flip()
      expect(selectedShip.ship).toBe(originalShip)
    })

    it('should handle variant index updates', () => {
      expect(selectedShip.variants.index).toBe(0)
      selectedShip.variants.index = 3
      expect(selectedShip.variants.index).toBe(3)
    })
  })

  describe('different ship types', () => {
    it('should handle different ship letters', () => {
      mockShip.letter = 'D'
      const selectedShip2 = new SelectedShip(mockShip, 0, mockContentBuilder)
      expect(selectedShip2.letter).toBe('D')
    })

    it('should handle different ship IDs', () => {
      mockShip.id = 'ship-999'
      const selectedShip2 = new SelectedShip(mockShip, 0, mockContentBuilder)
      expect(selectedShip2.id).toBe('ship-999')
    })

    it('should handle different shape types', () => {
      mockShape.type.mockReturnValue('destroyer')
      const selectedShip2 = new SelectedShip(mockShip, 0, mockContentBuilder)
      expect(selectedShip2.type).toBe('destroyer')
    })
  })
})
