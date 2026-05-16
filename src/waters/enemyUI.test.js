/**
 * @jest-environment jsdom
 */

/* eslint-env jest */
import { it, describe, expect, beforeEach, jest } from '@jest/globals'

// Mock the parent WatersUI class to avoid dependencies
jest.unstable_mockModule('./WatersUI.js', () => {
  return {
    WatersUI: class {
      constructor (waterType, displayName) {
        this.waterType = waterType
        this.displayName = displayName
      }

      playMode () {}
      revealShips () {}
      revealMode () {}
    }
  }
})

// Mock gameStatus
jest.unstable_mockModule('./StatusUI.js', () => {
  return {
    gameStatus: {
      showMode: jest.fn(),
      addToQueue: jest.fn()
    }
  }
})

// Mock bh
jest.unstable_mockModule('../terrains/all/js/bh.js', () => {
  return {
    bh: {}
  }
})

// Mock ShipCellDisplayer
jest.unstable_mockModule('./helpers/ShipCellDisplayer.js', () => {
  return {
    ShipCellDisplayer: class {}
  }
})

// Mock gtag
jest.unstable_mockModule('../navbar/gtag.js', () => {
  return {
    trackLevelEnd: jest.fn()
  }
})

// Now import after mocks are set up
import { EnemyUI } from './enemyUI.js'

describe('EnemyUI', () => {
  beforeEach(() => {
    // Clear the DOM before each test
    document.body.innerHTML = ''
  })

  describe('_setButtonsProperty', () => {
    it('should handle null buttons gracefully without throwing an error', () => {
      // Create a minimal DOM with only some buttons
      const button1 = document.createElement('button')
      button1.id = 'revealBtn'
      document.body.appendChild(button1)

      // Note: 'newPlace2', 'newGame', 'test2Btn', 'weaponBtn' are NOT in the DOM,
      // so they will be null when EnemyUI tries to fetch them

      const ui = new EnemyUI()

      // This should NOT throw an error even though some buttons are null
      expect(() => {
        ui.disableBtns(true)
      }).not.toThrow()
    })

    it('should set disabled property on existing buttons', () => {
      // Create all required buttons in the DOM
      const buttons = {
        revealBtn: document.createElement('button'),
        newPlace2: document.createElement('button'),
        newGame: document.createElement('button'),
        test2Btn: document.createElement('button'),
        weaponBtn: document.createElement('button')
      }

      Object.entries(buttons).forEach(([id, btn]) => {
        btn.id = id
        document.body.appendChild(btn)
      })

      const ui = new EnemyUI()

      // Disable all buttons
      ui.disableBtns(true)

      // Verify all buttons are disabled
      Object.values(buttons).forEach(btn => {
        expect(btn.disabled).toBe(true)
      })
    })

    it('should enable buttons when passed false', () => {
      // Create all required buttons in the DOM
      const buttons = {
        revealBtn: document.createElement('button'),
        newPlace2: document.createElement('button'),
        newGame: document.createElement('button'),
        test2Btn: document.createElement('button'),
        weaponBtn: document.createElement('button')
      }

      Object.entries(buttons).forEach(([id, btn]) => {
        btn.id = id
        btn.disabled = true
        document.body.appendChild(btn)
      })

      const ui = new EnemyUI()

      // Enable all buttons
      ui.disableBtns(false)

      // Verify all buttons are enabled
      Object.values(buttons).forEach(btn => {
        expect(btn.disabled).toBe(false)
      })
    })

    it('should skip null buttons when setting disabled property', () => {
      // Create only some buttons in the DOM
      const revealBtn = document.createElement('button')
      revealBtn.id = 'revealBtn'
      document.body.appendChild(revealBtn)

      const ui = new EnemyUI()

      // The reveal button should exist, others should be null
      expect(ui.buttons.reveal).not.toBeNull()
      expect(ui.buttons.place).toBeNull()
      expect(ui.buttons.restart).toBeNull()
      expect(ui.buttons.test).toBeNull()
      expect(ui.buttons.weapon).toBeNull()

      // This should work without error despite null buttons
      ui.disableBtns(true)

      // The reveal button should be disabled
      expect(revealBtn.disabled).toBe(true)
    })

    it('should handle the hidden property on non-existent elements', () => {
      // Create only one button
      const revealBtn = document.createElement('button')
      revealBtn.id = 'revealBtn'
      document.body.appendChild(revealBtn)

      const ui = new EnemyUI()

      // This method is used internally by _setButtonsProperty for 'hidden' property
      // Calling with a null element should not throw
      expect(() => {
        ui._setButtonsProperty(['place', 'reveal'], 'hidden', true)
      }).not.toThrow()

      // The reveal button should have the hidden class
      expect(revealBtn.classList.contains('hidden')).toBe(true)
    })
  })

  describe('enableBtns', () => {
    it('should enable buttons when called', () => {
      // Create all required buttons
      const buttons = {
        revealBtn: document.createElement('button'),
        newPlace2: document.createElement('button'),
        newGame: document.createElement('button'),
        test2Btn: document.createElement('button'),
        weaponBtn: document.createElement('button')
      }

      Object.entries(buttons).forEach(([id, btn]) => {
        btn.id = id
        btn.disabled = true
        document.body.appendChild(btn)
      })

      const ui = new EnemyUI()

      // enableBtns should enable all buttons
      ui.enableBtns()

      Object.values(buttons).forEach(btn => {
        expect(btn.disabled).toBe(false)
      })
    })

    it('should not throw when some buttons are null', () => {
      // Create only one button
      const revealBtn = document.createElement('button')
      revealBtn.id = 'revealBtn'
      revealBtn.disabled = true
      document.body.appendChild(revealBtn)

      const ui = new EnemyUI()

      // Should not throw even with missing buttons
      expect(() => {
        ui.enableBtns()
      }).not.toThrow()

      expect(revealBtn.disabled).toBe(false)
    })
  })
})
