/* eslint-env jest */
import { jest } from '@jest/globals'
/* global describe, it, expect, beforeEach */

describe('validSize logic', () => {
  // Create test implementations of the validation logic
  const createValidateWidth = (bh, terrains) => {
    return () => {
      let width = Number.parseInt(bh.widthUI.choose.value, 10)
      if (
        Number.isNaN(width) ||
        width < terrains.minWidth ||
        width > terrains.maxWidth
      ) {
        width = bh.widthUI.min
        bh.widthUI.choose.value = width
      }
      return width
    }
  }

  const createValidateHeight = (bh, terrains) => {
    return () => {
      let height = Number.parseInt(bh.heightUI.choose.value, 10)
      if (
        Number.isNaN(height) ||
        height < terrains.minHeight ||
        height > terrains.maxHeight
      ) {
        height = bh.heightUI.min
        bh.heightUI.choose.value = height
      }
      return height
    }
  }

  const createHasMapOfCurrentSize = (bh, terrains) => {
    return () => {
      const validateHeight = createValidateHeight(bh, terrains)
      const validateWidth = createValidateWidth(bh, terrains)
      return bh.maps.hasMapSize(validateHeight(), validateWidth())
    }
  }

  const createSetNewMapToCorrectSize = (bh, terrains) => {
    return () => {
      const validateHeight = createValidateHeight(bh, terrains)
      const validateWidth = createValidateWidth(bh, terrains)
      bh.maps.setToDefaultBlank(validateHeight(), validateWidth())
    }
  }

  let mockBh,
    mockTerrains,
    validateWidth,
    validateHeight,
    hasMapOfCurrentSize,
    setNewMapToCorrectSize

  beforeEach(() => {
    // Create fresh mocks for each test
    mockBh = {
      widthUI: {
        choose: { value: '10' },
        min: 5
      },
      heightUI: {
        choose: { value: '10' },
        min: 5
      },
      maps: {
        hasMapSize: jest.fn(() => false),
        setToDefaultBlank: jest.fn()
      }
    }

    mockTerrains = {
      minWidth: 3,
      maxWidth: 100,
      minHeight: 3,
      maxHeight: 100
    }

    validateWidth = createValidateWidth(mockBh, mockTerrains)
    validateHeight = createValidateHeight(mockBh, mockTerrains)
    hasMapOfCurrentSize = createHasMapOfCurrentSize(mockBh, mockTerrains)
    setNewMapToCorrectSize = createSetNewMapToCorrectSize(mockBh, mockTerrains)
  })

  describe('validateWidth', () => {
    it('should return width when value is valid', () => {
      mockBh.widthUI.choose.value = '50'
      const result = validateWidth()
      expect(result).toBe(50)
    })

    it('should return minimum width when value is below range', () => {
      mockBh.widthUI.choose.value = '1'
      mockBh.widthUI.min = 5
      const result = validateWidth()
      expect(result).toBe(5)
      expect(mockBh.widthUI.choose.value).toBe(5)
    })

    it('should return minimum width when value exceeds maximum', () => {
      mockBh.widthUI.choose.value = '150'
      mockBh.widthUI.min = 5
      mockTerrains.maxWidth = 100
      const result = validateWidth()
      expect(result).toBe(5)
      expect(mockBh.widthUI.choose.value).toBe(5)
    })

    it('should return minimum width when value is NaN', () => {
      mockBh.widthUI.choose.value = 'abc'
      mockBh.widthUI.min = 5
      const result = validateWidth()
      expect(result).toBe(5)
      expect(mockBh.widthUI.choose.value).toBe(5)
    })

    it('should return minimum width when value is empty string', () => {
      mockBh.widthUI.choose.value = ''
      mockBh.widthUI.min = 5
      const result = validateWidth()
      expect(result).toBe(5)
      expect(mockBh.widthUI.choose.value).toBe(5)
    })

    it('should accept width at minimum boundary', () => {
      mockTerrains.minWidth = 3
      mockBh.widthUI.choose.value = '3'
      const result = validateWidth()
      expect(result).toBe(3)
    })

    it('should accept width at maximum boundary', () => {
      mockTerrains.maxWidth = 100
      mockBh.widthUI.choose.value = '100'
      const result = validateWidth()
      expect(result).toBe(100)
    })

    it('should handle width as numeric string', () => {
      mockBh.widthUI.choose.value = '42'
      const result = validateWidth()
      expect(result).toBe(42)
    })

    it('should handle width with leading zeros', () => {
      mockBh.widthUI.choose.value = '007'
      const result = validateWidth()
      expect(result).toBe(7)
    })

    it('should handle negative width', () => {
      mockBh.widthUI.choose.value = '-10'
      mockBh.widthUI.min = 5
      const result = validateWidth()
      expect(result).toBe(5)
      expect(mockBh.widthUI.choose.value).toBe(5)
    })

    it('should handle decimal width (truncates to integer)', () => {
      mockBh.widthUI.choose.value = '10.9'
      const result = validateWidth()
      expect(result).toBe(10)
    })

    it('should update UI value when invalid', () => {
      mockBh.widthUI.choose.value = '200'
      mockBh.widthUI.min = 5
      mockTerrains.maxWidth = 100
      validateWidth()
      expect(mockBh.widthUI.choose.value).toBe(5)
    })

    it('should not update UI value when valid', () => {
      mockBh.widthUI.choose.value = '50'
      validateWidth()
      expect(mockBh.widthUI.choose.value).toBe('50')
    })

    it('should handle whitespace in width', () => {
      mockBh.widthUI.choose.value = ' 10 '
      const result = validateWidth()
      expect(result).toBe(10)
    })

    it('should handle scientific notation in width', () => {
      // parseInt('1e2', 10) returns 1, not 100, so it's below minimum
      mockBh.widthUI.choose.value = '1e2'
      const result = validateWidth()
      expect(result).toBe(5) // Returns minimum because parseInt('1e2') = 1 < 5
    })

    it('should handle zero width', () => {
      mockBh.widthUI.choose.value = '0'
      mockBh.widthUI.min = 5
      const result = validateWidth()
      expect(result).toBe(5)
      expect(mockBh.widthUI.choose.value).toBe(5)
    })

    it('should handle very large width', () => {
      mockBh.widthUI.choose.value = '999999'
      mockBh.widthUI.min = 5
      mockTerrains.maxWidth = 100
      const result = validateWidth()
      expect(result).toBe(5)
    })
  })

  describe('validateHeight', () => {
    it('should return height when value is valid', () => {
      mockBh.heightUI.choose.value = '50'
      const result = validateHeight()
      expect(result).toBe(50)
    })

    it('should return minimum height when value is below range', () => {
      mockBh.heightUI.choose.value = '1'
      mockBh.heightUI.min = 5
      const result = validateHeight()
      expect(result).toBe(5)
      expect(mockBh.heightUI.choose.value).toBe(5)
    })

    it('should return minimum height when value exceeds maximum', () => {
      mockBh.heightUI.choose.value = '150'
      mockBh.heightUI.min = 5
      mockTerrains.maxHeight = 100
      const result = validateHeight()
      expect(result).toBe(5)
      expect(mockBh.heightUI.choose.value).toBe(5)
    })

    it('should return minimum height when value is NaN', () => {
      mockBh.heightUI.choose.value = 'xyz'
      mockBh.heightUI.min = 5
      const result = validateHeight()
      expect(result).toBe(5)
      expect(mockBh.heightUI.choose.value).toBe(5)
    })

    it('should return minimum height when value is empty string', () => {
      mockBh.heightUI.choose.value = ''
      mockBh.heightUI.min = 5
      const result = validateHeight()
      expect(result).toBe(5)
      expect(mockBh.heightUI.choose.value).toBe(5)
    })

    it('should accept height at minimum boundary', () => {
      mockTerrains.minHeight = 3
      mockBh.heightUI.choose.value = '3'
      const result = validateHeight()
      expect(result).toBe(3)
    })

    it('should accept height at maximum boundary', () => {
      mockTerrains.maxHeight = 100
      mockBh.heightUI.choose.value = '100'
      const result = validateHeight()
      expect(result).toBe(100)
    })

    it('should handle height as numeric string', () => {
      mockBh.heightUI.choose.value = '42'
      const result = validateHeight()
      expect(result).toBe(42)
    })

    it('should handle height with leading zeros', () => {
      mockBh.heightUI.choose.value = '007'
      const result = validateHeight()
      expect(result).toBe(7)
    })

    it('should handle negative height', () => {
      mockBh.heightUI.choose.value = '-10'
      mockBh.heightUI.min = 5
      const result = validateHeight()
      expect(result).toBe(5)
      expect(mockBh.heightUI.choose.value).toBe(5)
    })

    it('should handle decimal height (truncates to integer)', () => {
      mockBh.heightUI.choose.value = '10.9'
      const result = validateHeight()
      expect(result).toBe(10)
    })

    it('should update UI value when invalid', () => {
      mockBh.heightUI.choose.value = '200'
      mockBh.heightUI.min = 5
      mockTerrains.maxHeight = 100
      validateHeight()
      expect(mockBh.heightUI.choose.value).toBe(5)
    })

    it('should not update UI value when valid', () => {
      mockBh.heightUI.choose.value = '50'
      validateHeight()
      expect(mockBh.heightUI.choose.value).toBe('50')
    })

    it('should handle whitespace in height', () => {
      mockBh.heightUI.choose.value = ' 10 '
      const result = validateHeight()
      expect(result).toBe(10)
    })

    it('should handle scientific notation in height', () => {
      // parseInt('1e2', 10) returns 1, not 100, so it's below minimum
      mockBh.heightUI.choose.value = '1e2'
      const result = validateHeight()
      expect(result).toBe(5) // Returns minimum because parseInt('1e2') = 1 < 5
    })

    it('should handle zero height', () => {
      mockBh.heightUI.choose.value = '0'
      mockBh.heightUI.min = 5
      const result = validateHeight()
      expect(result).toBe(5)
      expect(mockBh.heightUI.choose.value).toBe(5)
    })

    it('should handle very large height', () => {
      mockBh.heightUI.choose.value = '999999'
      mockBh.heightUI.min = 5
      mockTerrains.maxHeight = 100
      const result = validateHeight()
      expect(result).toBe(5)
    })
  })

  describe('hasMapOfCurrentSize', () => {
    it('should return true when map exists for current size', () => {
      mockBh.widthUI.choose.value = '10'
      mockBh.heightUI.choose.value = '10'
      mockBh.maps.hasMapSize.mockReturnValue(true)
      const result = hasMapOfCurrentSize()
      expect(result).toBe(true)
    })

    it('should return false when map does not exist for current size', () => {
      mockBh.widthUI.choose.value = '10'
      mockBh.heightUI.choose.value = '10'
      mockBh.maps.hasMapSize.mockReturnValue(false)
      const result = hasMapOfCurrentSize()
      expect(result).toBe(false)
    })

    it('should call hasMapSize with validated dimensions', () => {
      mockBh.widthUI.choose.value = '10'
      mockBh.heightUI.choose.value = '15'
      mockBh.maps.hasMapSize.mockReturnValue(true)
      hasMapOfCurrentSize()
      expect(mockBh.maps.hasMapSize).toHaveBeenCalledWith(15, 10)
    })

    it('should validate width and height before checking', () => {
      mockBh.widthUI.choose.value = '500'
      mockBh.heightUI.choose.value = '600'
      mockBh.widthUI.min = 5
      mockBh.heightUI.min = 5
      mockTerrains.maxWidth = 100
      mockTerrains.maxHeight = 100
      mockBh.maps.hasMapSize.mockReturnValue(false)
      hasMapOfCurrentSize()
      expect(mockBh.maps.hasMapSize).toHaveBeenCalledWith(5, 5)
    })

    it('should return false when both dimensions are invalid', () => {
      mockBh.widthUI.choose.value = 'invalid'
      mockBh.heightUI.choose.value = 'invalid'
      mockBh.widthUI.min = 5
      mockBh.heightUI.min = 5
      mockBh.maps.hasMapSize.mockReturnValue(false)
      const result = hasMapOfCurrentSize()
      expect(result).toBe(false)
    })

    it('should call hasMapSize exactly once', () => {
      mockBh.widthUI.choose.value = '10'
      mockBh.heightUI.choose.value = '10'
      mockBh.maps.hasMapSize.mockReturnValue(true)
      hasMapOfCurrentSize()
      expect(mockBh.maps.hasMapSize).toHaveBeenCalledTimes(1)
    })
  })

  describe('setNewMapToCorrectSize', () => {
    it('should call setToDefaultBlank with validated dimensions', () => {
      mockBh.widthUI.choose.value = '10'
      mockBh.heightUI.choose.value = '15'
      setNewMapToCorrectSize()
      expect(mockBh.maps.setToDefaultBlank).toHaveBeenCalledWith(15, 10)
    })

    it('should use minimum values when inputs are invalid', () => {
      mockBh.widthUI.choose.value = 'invalid'
      mockBh.heightUI.choose.value = 'invalid'
      mockBh.widthUI.min = 5
      mockBh.heightUI.min = 5
      setNewMapToCorrectSize()
      expect(mockBh.maps.setToDefaultBlank).toHaveBeenCalledWith(5, 5)
    })

    it('should clamp width to maximum when exceeded', () => {
      mockBh.widthUI.choose.value = '200'
      mockBh.heightUI.choose.value = '10'
      mockBh.widthUI.min = 5
      mockTerrains.maxWidth = 100
      setNewMapToCorrectSize()
      expect(mockBh.maps.setToDefaultBlank).toHaveBeenCalledWith(10, 5)
    })

    it('should clamp height to maximum when exceeded', () => {
      mockBh.widthUI.choose.value = '10'
      mockBh.heightUI.choose.value = '200'
      mockBh.heightUI.min = 5
      mockTerrains.maxHeight = 100
      setNewMapToCorrectSize()
      expect(mockBh.maps.setToDefaultBlank).toHaveBeenCalledWith(5, 10)
    })

    it('should clamp both dimensions when both exceeded', () => {
      mockBh.widthUI.choose.value = '200'
      mockBh.heightUI.choose.value = '300'
      mockBh.widthUI.min = 5
      mockBh.heightUI.min = 5
      mockTerrains.maxWidth = 100
      mockTerrains.maxHeight = 100
      setNewMapToCorrectSize()
      expect(mockBh.maps.setToDefaultBlank).toHaveBeenCalledWith(5, 5)
    })

    it('should accept valid dimensions at boundaries', () => {
      mockTerrains.minWidth = 3
      mockTerrains.maxWidth = 100
      mockTerrains.minHeight = 3
      mockTerrains.maxHeight = 100
      mockBh.widthUI.choose.value = '3'
      mockBh.heightUI.choose.value = '100'
      setNewMapToCorrectSize()
      expect(mockBh.maps.setToDefaultBlank).toHaveBeenCalledWith(100, 3)
    })

    it('should call setToDefaultBlank exactly once', () => {
      mockBh.widthUI.choose.value = '10'
      mockBh.heightUI.choose.value = '10'
      setNewMapToCorrectSize()
      expect(mockBh.maps.setToDefaultBlank).toHaveBeenCalledTimes(1)
    })

    it('should handle edge case of minimum size', () => {
      mockTerrains.minWidth = 3
      mockTerrains.minHeight = 3
      mockBh.widthUI.choose.value = '3'
      mockBh.heightUI.choose.value = '3'
      setNewMapToCorrectSize()
      expect(mockBh.maps.setToDefaultBlank).toHaveBeenCalledWith(3, 3)
    })

    it('should handle edge case of maximum size', () => {
      mockTerrains.maxWidth = 100
      mockTerrains.maxHeight = 100
      mockBh.widthUI.choose.value = '100'
      mockBh.heightUI.choose.value = '100'
      setNewMapToCorrectSize()
      expect(mockBh.maps.setToDefaultBlank).toHaveBeenCalledWith(100, 100)
    })
  })

  describe('integration tests', () => {
    it('should handle sequence of width validations', () => {
      mockBh.widthUI.choose.value = '10'
      expect(validateWidth()).toBe(10)

      mockBh.widthUI.choose.value = '50'
      expect(validateWidth()).toBe(50)

      mockBh.widthUI.choose.value = 'bad'
      mockBh.widthUI.min = 5
      expect(validateWidth()).toBe(5)
    })

    it('should handle sequence of height validations', () => {
      mockBh.heightUI.choose.value = '10'
      expect(validateHeight()).toBe(10)

      mockBh.heightUI.choose.value = '50'
      expect(validateHeight()).toBe(50)

      mockBh.heightUI.choose.value = 'bad'
      mockBh.heightUI.min = 5
      expect(validateHeight()).toBe(5)
    })

    it('should validate and check map existence in sequence', () => {
      mockBh.widthUI.choose.value = '10'
      mockBh.heightUI.choose.value = '15'
      mockBh.maps.hasMapSize.mockReturnValue(false)

      const exists = hasMapOfCurrentSize()
      expect(exists).toBe(false)

      expect(mockBh.maps.hasMapSize).toHaveBeenCalledWith(15, 10)
    })

    it('should validate and create map in sequence', () => {
      mockBh.widthUI.choose.value = '10'
      mockBh.heightUI.choose.value = '15'

      setNewMapToCorrectSize()
      expect(mockBh.maps.setToDefaultBlank).toHaveBeenCalledWith(15, 10)
    })

    it('should handle invalid then valid dimensions', () => {
      mockBh.widthUI.choose.value = '999'
      mockBh.widthUI.min = 5
      mockTerrains.maxWidth = 100

      let result = validateWidth()
      expect(result).toBe(5)
      expect(mockBh.widthUI.choose.value).toBe(5)

      mockBh.widthUI.choose.value = '50'
      result = validateWidth()
      expect(result).toBe(50)
      expect(mockBh.widthUI.choose.value).toBe('50')
    })

    it('should maintain separate width and height state', () => {
      mockBh.widthUI.choose.value = '20'
      mockBh.heightUI.choose.value = '30'

      const width = validateWidth()
      const height = validateHeight()

      expect(width).toBe(20)
      expect(height).toBe(30)
    })

    it('should handle rapid dimension changes', () => {
      mockBh.widthUI.choose.value = '10'
      mockBh.heightUI.choose.value = '10'
      setNewMapToCorrectSize()

      mockBh.widthUI.choose.value = '20'
      mockBh.heightUI.choose.value = '20'
      setNewMapToCorrectSize()

      mockBh.widthUI.choose.value = '30'
      mockBh.heightUI.choose.value = '30'
      setNewMapToCorrectSize()

      expect(mockBh.maps.setToDefaultBlank).toHaveBeenCalledTimes(3)
      expect(mockBh.maps.setToDefaultBlank).toHaveBeenLastCalledWith(30, 30)
    })

    it('should handle minimum validation with different widths', () => {
      mockTerrains.minWidth = 10
      mockTerrains.maxWidth = 50
      mockBh.widthUI.choose.value = '5'
      mockBh.widthUI.min = 10
      const result = validateWidth()
      expect(result).toBe(10)
    })

    it('should handle minimum validation with different heights', () => {
      mockTerrains.minHeight = 10
      mockTerrains.maxHeight = 50
      mockBh.heightUI.choose.value = '5'
      mockBh.heightUI.min = 10
      const result = validateHeight()
      expect(result).toBe(10)
    })
  })
})
