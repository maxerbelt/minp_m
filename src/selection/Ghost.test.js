/**
 * @jest-environment jsdom
 */

/* eslint-env jest */

import { jest } from '@jest/globals'

/* global  describe, it, expect, beforeEach, afterEach */

import { Ghost } from './Ghost.js'

describe('Ghost', () => {
  let mockElement
  let mockContentBuilder
  let ghost

  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks()

    // Create a mock element
    mockElement = {
      className: '',
      style: {
        opacity: '',
        left: '',
        top: ''
      },
      innerHTML: '',
      remove: jest.fn()
    }

    // Spy on document.createElement and document.body.appendChild
    jest.spyOn(document, 'createElement').mockReturnValue(mockElement)
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => {})

    // Mock content builder
    mockContentBuilder = jest.fn()

    // Create ghost instance
    ghost = new Ghost({ test: 'variant' }, 'B', mockContentBuilder)
  })

  describe('constructor', () => {
    it('should create a div element with correct class name', () => {
      expect(document.createElement).toHaveBeenCalledWith('div')
      expect(mockElement.className).toBe('ship-ghost')
    })

    it('should store the letter', () => {
      expect(ghost.letter).toBe('B')
    })
    it('should store the contentBuilder', () => {
      expect(ghost.contentBuilder).toBe(mockContentBuilder)
    })

    it('should call contentBuilder with correct parameters', () => {
      expect(mockContentBuilder).toHaveBeenCalledWith(
        mockElement,
        { test: 'variant' },
        'B'
      )
    })

    it('should append element to document body', () => {
      expect(document.body.appendChild).toHaveBeenCalledWith(mockElement)
    })

    it('should store element reference', () => {
      expect(ghost.element).toBe(mockElement)
    })
  })

  describe('hide', () => {
    it('should set opacity to 0', () => {
      ghost.hide()
      expect(ghost.element.style.opacity).toBe(0)
    })

    it('should be callable multiple times', () => {
      ghost.hide()
      ghost.hide()
      expect(ghost.element.style.opacity).toBe(0)
    })
  })

  describe('show', () => {
    it('should reset opacity to empty string', () => {
      ghost.element.style.opacity = 0
      ghost.show()
      expect(ghost.element.style.opacity).toBe('')
    })

    it('should restore visibility after hide', () => {
      ghost.hide()
      expect(ghost.element.style.opacity).toBe(0)
      ghost.show()
      expect(ghost.element.style.opacity).toBe('')
    })

    it('should be callable multiple times', () => {
      ghost.show()
      ghost.show()
      expect(ghost.element.style.opacity).toBe('')
    })
  })

  describe('setVariant', () => {
    it('should clear innerHTML', () => {
      ghost.element.innerHTML = 'some content'
      ghost.setVariant({ new: 'variant' })
      expect(ghost.element.innerHTML).toBe('')
    })

    it('should call contentBuilder with new variant', () => {
      const newVariant = { new: 'variant' }
      ghost.setVariant(newVariant)
      expect(mockContentBuilder).toHaveBeenCalledWith(
        mockElement,
        newVariant,
        'B'
      )
    })

    it('should update multiple times', () => {
      ghost.setVariant({ variant: 1 })
      ghost.setVariant({ variant: 2 })
      expect(mockContentBuilder).toHaveBeenCalledTimes(3) // 1 in constructor + 2 calls
    })

    it('should not call contentBuilder if element is null', () => {
      ghost.element = null
      jest.clearAllMocks()
      ghost.setVariant({ new: 'variant' })
      expect(mockContentBuilder).not.toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('should call remove on the element', () => {
      ghost.remove()
      expect(mockElement.remove).toHaveBeenCalled()
    })

    it('should set element to null', () => {
      ghost.remove()
      expect(ghost.element).toBeNull()
    })

    it('should be callable even after already removed', () => {
      ghost.remove()
      // Should not throw
      ghost.remove()
      expect(ghost.element).toBeNull()
    })

    it('should not call remove if element already null', () => {
      ghost.element = null
      jest.clearAllMocks()
      ghost.remove()
      // Should not throw
      expect(ghost.element).toBeNull()
    })
  })

  describe('moveTo', () => {
    it('should set left position in pixels', () => {
      ghost.moveTo(100, 200)
      expect(ghost.element.style.left).toBe('100px')
    })

    it('should set top position in pixels', () => {
      ghost.moveTo(100, 200)
      expect(ghost.element.style.top).toBe('200px')
    })

    it('should handle zero coordinates', () => {
      ghost.moveTo(0, 0)
      expect(ghost.element.style.left).toBe('0px')
      expect(ghost.element.style.top).toBe('0px')
    })

    it('should handle negative coordinates', () => {
      ghost.moveTo(-50, -100)
      expect(ghost.element.style.left).toBe('-50px')
      expect(ghost.element.style.top).toBe('-100px')
    })

    it('should handle large coordinates', () => {
      ghost.moveTo(5000, 10000)
      expect(ghost.element.style.left).toBe('5000px')
      expect(ghost.element.style.top).toBe('10000px')
    })

    it('should update position multiple times', () => {
      ghost.moveTo(100, 200)
      expect(ghost.element.style.left).toBe('100px')
      expect(ghost.element.style.top).toBe('200px')

      ghost.moveTo(300, 400)
      expect(ghost.element.style.left).toBe('300px')
      expect(ghost.element.style.top).toBe('400px')
    })

    it('should not update if element is null', () => {
      ghost.element = null
      // Should not throw
      ghost.moveTo(100, 200)
      expect(ghost.element).toBeNull()
    })
  })

  describe('sequence of operations', () => {
    it('should handle create, move, hide, show, remove sequence', () => {
      ghost.moveTo(10, 20)
      expect(ghost.element.style.left).toBe('10px')

      ghost.hide()
      expect(ghost.element.style.opacity).toBe(0)

      ghost.show()
      expect(ghost.element.style.opacity).toBe('')

      ghost.remove()
      expect(ghost.element).toBeNull()
    })

    it('should handle variant change and move', () => {
      ghost.setVariant({ variant: 'new' })
      expect(mockContentBuilder).toHaveBeenCalled()

      ghost.moveTo(50, 75)
      expect(ghost.element.style.left).toBe('50px')
      expect(ghost.element.style.top).toBe('75px')
    })

    it('should handle multiple moves and hides', () => {
      ghost.moveTo(10, 20)
      ghost.moveTo(30, 40)
      ghost.hide()
      ghost.moveTo(50, 60)
      ghost.show()

      expect(ghost.element.style.left).toBe('50px')
      expect(ghost.element.style.top).toBe('60px')
      expect(ghost.element.style.opacity).toBe('')
    })
  })

  describe('different ship types', () => {
    it('should handle different letters', () => {
      const ghostD = new Ghost({ variant: 'd' }, 'D', mockContentBuilder)
      expect(ghostD.letter).toBe('D')
    })

    it('should handle different variants', () => {
      const variant = { rows: 3, cols: 5 }
      const ghostWithVariant = new Ghost(variant, 'C', mockContentBuilder)
      expect(mockContentBuilder).toHaveBeenCalledWith(
        expect.any(Object),
        variant,
        'C'
      )
    })
  })
})
