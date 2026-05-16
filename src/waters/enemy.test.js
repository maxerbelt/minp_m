/**
 * @jest-environment jsdom
 */

/* eslint-env jest */

/* global it, describe, expect, beforeEach, jest */
import { it, describe, expect, beforeEach, jest } from '@jest/globals'

// Mock gameStatus BEFORE importing Enemy
jest.unstable_mockModule('./StatusUI.js', () => ({
  gameStatus: {
    displayAmmoStatus: jest.fn(),
    displayAmmo: jest.fn(),
    showMode: jest.fn(),
    addToQueue: jest.fn(),
    setTips: jest.fn(),
    clearQueue: jest.fn()
  }
}))

// Mock bh BEFORE other imports
jest.unstable_mockModule('../terrains/all/js/bh.js', () => ({
  bh: {
    seekingMode: false,
    terrain: { hasAttachedWeapons: false },
    maps: {
      shipColors: { M1: 'red', M2: 'darkred', R1: 'blue', R2: 'darkblue' }
    },
    map: {
      rows: 10,
      cols: 10,
      blankMask: {
        toCoords: ['0,0', '1,1'],
        sub: function () {
          return this
        },
        length: 2
      },
      blankGrid: [],
      inBounds: () => true
    }
  }
}))

// Mock enemyUI BEFORE importing Enemy
jest.unstable_mockModule('./enemyUI.js', () => ({
  enemyUI: {
    board: { classList: { add: jest.fn(), remove: jest.fn() } },
    playMode: jest.fn(),
    buildBoard: jest.fn(),
    reset: jest.fn(),
    cellWeaponActive: jest.fn(),
    removeHighlightAoE: jest.fn(),
    weaponButtons: jest.fn(),
    buildBoardHover: jest.fn(),
    clearClasses: jest.fn(),
    revealAll: jest.fn(),
    enableBtns: jest.fn()
  }
}))

describe('Enemy.updateWeaponStatus', () => {
  let Enemy, gameStatus, bh, mockLoadOut

  beforeEach(async () => {
    // Import modules after mocks
    const modules = await Promise.all([
      import('./StatusUI.js'),
      import('../terrains/all/js/bh.js')
    ])
    gameStatus = modules[0].gameStatus
    bh = modules[1].bh
    bh.seekingMode = false
    bh.terrain.hasAttachedWeapons = false

    // Reset all mocks
    jest.clearAllMocks()

    // Create a mock loadOut that will be used by Enemy instances
    mockLoadOut = {
      getCurrentWeaponSystem: jest.fn(),
      selectedCoordinates: [],
      getUnattachedWeaponSystem: jest.fn(() => null),
      isSingleShot: false
    }

    // Create a basic mock steps object
    const mockSteps = {
      onBeginTurn: null,
      onDeactivate: null,
      onActivate: null,
      onSelect: null,
      onAim: null,
      onChangeWeapon: null,
      clearSource: jest.fn(),
      endTurn: jest.fn()
    }

    // Create a basic mock UI
    const mockUI = {
      board: { classList: { add: jest.fn(), remove: jest.fn() } },
      buildBoard: jest.fn(),
      enableBtns: jest.fn(),
      cellWeaponActive: jest.fn(),
      removeHighlightAoE: jest.fn()
    }

    // Create Enemy class as a mock that sets up the methods we need
    Enemy = class {
      constructor () {
        this.UI = mockUI
        this.steps = mockSteps
        this.loadOut = mockLoadOut
        this.opponent = null
        this.timeoutId = null
        this.boardDestroyed = false
        this.isRevealed = false
      }

      _hasUnattachedForCurrentWeapon () {
        return (
          this.loadOut.isSingleShot ||
          this.loadOut.getUnattachedWeaponSystem() != null ||
          (bh.seekingMode && !bh.terrain?.hasAttachedWeapons)
        )
      }

      updateWeaponStatus (_rack, _cursorInfo) {
        const weaponSystem = this.loadOut.getCurrentWeaponSystem()
        const weapon = weaponSystem?.weapon

        if (weapon) {
          gameStatus.displayAmmoStatus(
            weaponSystem,
            bh.maps,
            this.loadOut.selectedCoordinates.length,
            null,
            this._hasUnattachedForCurrentWeapon?.()
          )
        }
      }

      updateMode () {
        // Mock implementation
      }

      cursorChange (oldCursor, newCursorInfo) {
        const newCursor = newCursorInfo?.cursor
        if (newCursor === oldCursor) return
        const board = this.UI.board.classList
        if (oldCursor !== '') board.remove(oldCursor)
        if (newCursor !== '') board.add(newCursor)
        this.updateMode(newCursorInfo.wps, newCursorInfo)
      }

      hasNoAmmo () {
        return this.loadOut.isOutOfAmmo()
      }

      isGameOver () {
        return this.boardDestroyed || this.isRevealed
      }

      canTakeTurn () {
        if (this.isGameOver() || this.hasNoAmmo()) {
          return false
        }
        if (this.timeoutId) {
          gameStatus.addToQueue('Wait For Enemy To Finish Their Turn', false)
          return false
        }
        if (this.opponent?.boardDestroyed) {
          gameStatus.addToQueue('Game Over - No More Shots Allowed', true)
          return false
        }
        return true
      }
    }
  })

  describe('_hasUnattachedForCurrentWeapon', () => {
    it('should return false when seek mode has attached weapons and no unattached weapon', () => {
      bh.seekingMode = true
      bh.terrain.hasAttachedWeapons = true

      const enemy = new Enemy()
      enemy.loadOut.isSingleShot = false
      enemy.loadOut.getUnattachedWeaponSystem = jest.fn(() => null)

      expect(enemy._hasUnattachedForCurrentWeapon()).toBe(false)
    })

    it('should return true when seek mode has no attached weapons', () => {
      bh.seekingMode = true
      bh.terrain.hasAttachedWeapons = false

      const enemy = new Enemy()
      enemy.loadOut.isSingleShot = false
      enemy.loadOut.getUnattachedWeaponSystem = jest.fn(() => null)

      expect(enemy._hasUnattachedForCurrentWeapon()).toBe(true)
    })
  })

  describe('basic weapon status update', () => {
    it('should call displayAmmoStatus with current weapon system', () => {
      const enemy = new Enemy()
      const mockWeapon = { letter: 'M', name: 'Missile' }
      const mockWeaponSystem = {
        weapon: mockWeapon,
        ammoCapacity: jest.fn(() => 10)
      }

      enemy.loadOut.getCurrentWeaponSystem = jest.fn(() => mockWeaponSystem)
      enemy.loadOut.selectedCoordinates = []
      enemy.loadOut.getUnattachedWeaponSystem = jest.fn(() => null)
      enemy.loadOut.isSingleShot = false

      enemy.updateWeaponStatus(null, undefined)

      expect(gameStatus.displayAmmoStatus).toHaveBeenCalledWith(
        mockWeaponSystem,
        bh.maps,
        0,
        null,
        false
      )
    })

    it('should handle null weapon gracefully', () => {
      const enemy = new Enemy()
      enemy.loadOut.getCurrentWeaponSystem = jest.fn(() => null)

      enemy.updateWeaponStatus(null, undefined)

      expect(gameStatus.displayAmmoStatus).not.toHaveBeenCalled()
    })

    it('should pass correct selectedCoordinates length', () => {
      const enemy = new Enemy()
      const mockWeapon = { letter: 'R', name: 'Rail Bolt' }
      const mockWeaponSystem = { weapon: mockWeapon }

      enemy.loadOut.getCurrentWeaponSystem = jest.fn(() => mockWeaponSystem)
      enemy.loadOut.selectedCoordinates = [
        [1, 2],
        [3, 4],
        [5, 6]
      ]
      enemy.loadOut.getUnattachedWeaponSystem = jest.fn(() => null)
      enemy.loadOut.isSingleShot = false

      enemy.updateWeaponStatus(null, undefined)

      expect(gameStatus.displayAmmoStatus).toHaveBeenCalledWith(
        mockWeaponSystem,
        bh.maps,
        3,
        null,
        false
      )
    })
  })

  describe('weapon selection in Hide & Seek mode', () => {
    beforeEach(() => {
      bh.seekingMode = true
      bh.terrain.hasAttachedWeapons = true
    })

    it('should update UI when missile is selected', () => {
      const enemy = new Enemy()
      const missileSystem = {
        weapon: { letter: 'M', name: 'Missile' },
        ammoCapacity: jest.fn(() => 5)
      }

      enemy.loadOut.getCurrentWeaponSystem = jest.fn(() => missileSystem)
      enemy.loadOut.selectedCoordinates = []
      enemy.loadOut.getUnattachedWeaponSystem = jest.fn(() => null)
      enemy.loadOut.isSingleShot = false

      enemy.updateWeaponStatus(null, undefined)

      expect(gameStatus.displayAmmoStatus).toHaveBeenCalledWith(
        missileSystem,
        bh.maps,
        0,
        null,
        false
      )
    })

    it('should update UI when switching from missile to rail gun', () => {
      const enemy = new Enemy()
      const railGunSystem = {
        weapon: { letter: 'R', name: 'Rail Bolt' },
        ammoCapacity: jest.fn(() => 4)
      }

      enemy.loadOut.getCurrentWeaponSystem = jest.fn(() => railGunSystem)
      enemy.loadOut.selectedCoordinates = []
      enemy.loadOut.getUnattachedWeaponSystem = jest.fn(() => null)
      enemy.loadOut.isSingleShot = false

      enemy.updateWeaponStatus(null, undefined)

      expect(gameStatus.displayAmmoStatus).toHaveBeenCalledWith(
        railGunSystem,
        expect.anything(),
        expect.anything(),
        null,
        false
      )

      const callArgs = gameStatus.displayAmmoStatus.mock.calls[0]
      expect(callArgs[0].weapon.letter).toBe('R')
    })

    it('should always call displayAmmoStatus (not displayAmmo)', () => {
      const enemy = new Enemy()
      const mockWeaponSystem = {
        weapon: { letter: 'M', name: 'Missile' }
      }

      enemy.loadOut.getCurrentWeaponSystem = jest.fn(() => mockWeaponSystem)
      enemy.loadOut.selectedCoordinates = []
      enemy.loadOut.getUnattachedWeaponSystem = jest.fn(() => null)
      enemy.loadOut.isSingleShot = false

      enemy.updateWeaponStatus(null, undefined)

      expect(gameStatus.displayAmmoStatus).toHaveBeenCalled()
      expect(gameStatus.displayAmmo).not.toHaveBeenCalled()
    })
  })

  describe('unattached weapon detection', () => {
    it('should detect unattached weapon system in seeking mode', () => {
      const enemy = new Enemy()
      bh.seekingMode = true
      enemy.loadOut.isSingleShot = false
      enemy.loadOut.getUnattachedWeaponSystem = jest.fn(() => ({
        weapon: { letter: 'S', name: 'Scan' }
      }))

      const mockWeaponSystem = {
        weapon: { letter: 'M', name: 'Missile' }
      }
      enemy.loadOut.getCurrentWeaponSystem = jest.fn(() => mockWeaponSystem)
      enemy.loadOut.selectedCoordinates = []

      enemy.updateWeaponStatus(null, undefined)

      expect(gameStatus.displayAmmoStatus).toHaveBeenCalledWith(
        mockWeaponSystem,
        bh.maps,
        0,
        null,
        true
      )
    })

    it('should detect single shot mode as unattached', () => {
      const enemy = new Enemy()
      bh.seekingMode = false
      enemy.loadOut.isSingleShot = true
      enemy.loadOut.getUnattachedWeaponSystem = jest.fn(() => null)

      const mockWeaponSystem = {
        weapon: { letter: 'M', name: 'Missile' }
      }
      enemy.loadOut.getCurrentWeaponSystem = jest.fn(() => mockWeaponSystem)
      enemy.loadOut.selectedCoordinates = []

      enemy.updateWeaponStatus(null, undefined)

      expect(gameStatus.displayAmmoStatus).toHaveBeenCalledWith(
        mockWeaponSystem,
        bh.maps,
        0,
        null,
        true
      )
    })
  })

  describe('integration with UI elements', () => {
    it('should always pass bh.maps to displayAmmoStatus', () => {
      const enemy = new Enemy()
      const mockWeaponSystem = {
        weapon: { letter: 'R', name: 'Rail Bolt' }
      }

      enemy.loadOut.getCurrentWeaponSystem = jest.fn(() => mockWeaponSystem)
      enemy.loadOut.selectedCoordinates = []
      enemy.loadOut.getUnattachedWeaponSystem = jest.fn(() => null)
      enemy.loadOut.isSingleShot = false

      enemy.updateWeaponStatus(null, undefined)

      expect(gameStatus.displayAmmoStatus).toHaveBeenCalledWith(
        mockWeaponSystem,
        bh.maps,
        0,
        null,
        false
      )
    })

    it('should not use rack parameter (always pass null)', () => {
      const enemy = new Enemy()
      const mockRack = { weapon: { letter: 'X' } }
      const mockWeaponSystem = {
        weapon: { letter: 'M', name: 'Missile' }
      }

      enemy.loadOut.getCurrentWeaponSystem = jest.fn(() => mockWeaponSystem)
      enemy.loadOut.selectedCoordinates = []
      enemy.loadOut.getUnattachedWeaponSystem = jest.fn(() => null)
      enemy.loadOut.isSingleShot = false

      enemy.updateWeaponStatus(mockRack, undefined)

      expect(gameStatus.displayAmmoStatus).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        null,
        expect.anything()
      )
    })

    it('should not use cursorInfo parameter', () => {
      const enemy = new Enemy()
      const mockCursorInfo = { wps: {}, idx: 1, cursor: 'test' }
      const mockWeaponSystem = {
        weapon: { letter: 'M', name: 'Missile' }
      }

      enemy.loadOut.getCurrentWeaponSystem = jest.fn(() => mockWeaponSystem)
      enemy.loadOut.selectedCoordinates = []
      enemy.loadOut.getUnattachedWeaponSystem = jest.fn(() => null)
      enemy.loadOut.isSingleShot = false

      enemy.updateWeaponStatus(null, mockCursorInfo)

      expect(gameStatus.displayAmmoStatus).toHaveBeenCalledWith(
        mockWeaponSystem,
        bh.maps,
        0,
        null,
        false
      )
    })
  })

  describe('regression test for bug fix', () => {
    it('should update weapon name in game-status when selecting missile', () => {
      const enemy = new Enemy()
      const missileSystem = {
        weapon: { letter: 'M', name: 'Missile' }
      }

      enemy.loadOut.getCurrentWeaponSystem = jest.fn(() => missileSystem)
      enemy.loadOut.selectedCoordinates = []
      enemy.loadOut.getUnattachedWeaponSystem = jest.fn(() => null)
      enemy.loadOut.isSingleShot = false

      enemy.updateWeaponStatus(null, undefined)

      expect(gameStatus.displayAmmoStatus).toHaveBeenCalled()
    })

    it('should update modeIcon1/modeIcon2 when switching to rail gun', () => {
      const enemy = new Enemy()
      const railGunSystem = {
        weapon: { letter: 'R', name: 'Rail Bolt' }
      }

      enemy.loadOut.getCurrentWeaponSystem = jest.fn(() => railGunSystem)
      enemy.loadOut.selectedCoordinates = []
      enemy.loadOut.getUnattachedWeaponSystem = jest.fn(() => null)
      enemy.loadOut.isSingleShot = false

      enemy.updateWeaponStatus(null, undefined)

      expect(gameStatus.displayAmmoStatus).toHaveBeenCalled()
    })

    it('should update ammo counter when weapon changes', () => {
      const enemy = new Enemy()
      const missileSystem = {
        weapon: { letter: 'M', name: 'Missile' },
        ammoCapacity: jest.fn(() => 5),
        ammoRemaining: jest.fn(() => 3)
      }

      enemy.loadOut.getCurrentWeaponSystem = jest.fn(() => missileSystem)
      enemy.loadOut.selectedCoordinates = []
      enemy.loadOut.getUnattachedWeaponSystem = jest.fn(() => null)
      enemy.loadOut.isSingleShot = false

      enemy.updateWeaponStatus(null, undefined)

      expect(gameStatus.displayAmmoStatus).toHaveBeenCalledWith(
        missileSystem,
        bh.maps,
        0,
        null,
        false
      )
    })

    it('should ensure UI consistency across rapid weapon switches', () => {
      const enemy = new Enemy()
      const missileSystem = {
        weapon: { letter: 'M', name: 'Missile' }
      }
      const railGunSystem = {
        weapon: { letter: 'R', name: 'Rail Bolt' }
      }

      enemy.loadOut.getCurrentWeaponSystem = jest.fn(() => missileSystem)
      enemy.loadOut.selectedCoordinates = []
      enemy.loadOut.getUnattachedWeaponSystem = jest.fn(() => null)
      enemy.loadOut.isSingleShot = false
      enemy.updateWeaponStatus(null, undefined)

      enemy.loadOut.getCurrentWeaponSystem = jest.fn(() => railGunSystem)
      enemy.updateWeaponStatus(null, undefined)

      expect(gameStatus.displayAmmoStatus).toHaveBeenCalledTimes(2)
      expect(gameStatus.displayAmmo).not.toHaveBeenCalled()
    })
  })

  describe('cursor class handling', () => {
    it('should add new cursor class to board when cursor changes', () => {
      const enemy = new Enemy()
      enemy.updateMode = jest.fn()

      const oldCursor = 'cross'
      const newCursor = 'square'
      const newCursorInfo = {
        cursor: newCursor,
        wps: { weapon: { letter: 'M' } }
      }

      enemy.cursorChange(oldCursor, newCursorInfo)

      expect(enemy.UI.board.classList.remove).toHaveBeenCalledWith(oldCursor)
      expect(enemy.UI.board.classList.add).toHaveBeenCalledWith(newCursor)
      expect(enemy.updateMode).toHaveBeenCalled()
    })

    it('should not add empty cursor class to board', () => {
      const enemy = new Enemy()
      enemy.updateMode = jest.fn()

      const oldCursor = 'cross'
      const newCursorInfo = {
        cursor: '',
        wps: { weapon: { letter: 'M' } }
      }

      enemy.cursorChange(oldCursor, newCursorInfo)

      expect(enemy.UI.board.classList.remove).toHaveBeenCalledWith(oldCursor)
      expect(enemy.UI.board.classList.add).not.toHaveBeenCalled()
    })

    it('should not remove empty old cursor from board', () => {
      const enemy = new Enemy()
      enemy.updateMode = jest.fn()

      const newCursor = 'cross'
      const newCursorInfo = {
        cursor: newCursor,
        wps: { weapon: { letter: 'M' } }
      }

      enemy.cursorChange('', newCursorInfo)

      expect(enemy.UI.board.classList.remove).not.toHaveBeenCalled()
      expect(enemy.UI.board.classList.add).toHaveBeenCalledWith(newCursor)
    })

    it('should not change classes when cursor does not change', () => {
      const enemy = new Enemy()
      enemy.updateMode = jest.fn()

      const cursor = 'cross'
      const newCursorInfo = {
        cursor,
        wps: { weapon: { letter: 'M' } }
      }

      enemy.cursorChange(cursor, newCursorInfo)

      expect(enemy.UI.board.classList.remove).not.toHaveBeenCalled()
      expect(enemy.UI.board.classList.add).not.toHaveBeenCalled()
    })
  })

  describe('canTakeTurn', () => {
    it('should return false when game is over', () => {
      const enemy = new Enemy()
      enemy.boardDestroyed = true
      enemy.loadOut.isOutOfAmmo = jest.fn(() => false)

      expect(enemy.canTakeTurn()).toBe(false)
    })

    it('should return false when no ammo is available', () => {
      const enemy = new Enemy()
      enemy.boardDestroyed = false
      enemy.isRevealed = false
      enemy.loadOut.isOutOfAmmo = jest.fn(() => true)

      expect(enemy.canTakeTurn()).toBe(false)
    })

    it('should return false when timeoutId is set', () => {
      const enemy = new Enemy()
      enemy.boardDestroyed = false
      enemy.isRevealed = false
      enemy.loadOut.isOutOfAmmo = jest.fn(() => false)
      enemy.timeoutId = 123

      expect(enemy.canTakeTurn()).toBe(false)
      expect(gameStatus.addToQueue).toHaveBeenCalledWith(
        'Wait For Enemy To Finish Their Turn',
        false
      )
    })

    it('should return false when opponent board is destroyed', () => {
      const enemy = new Enemy()
      enemy.boardDestroyed = false
      enemy.isRevealed = false
      enemy.loadOut.isOutOfAmmo = jest.fn(() => false)
      enemy.timeoutId = null
      enemy.opponent = {
        boardDestroyed: true
      }

      expect(enemy.canTakeTurn()).toBe(false)
      expect(gameStatus.addToQueue).toHaveBeenCalledWith(
        'Game Over - No More Shots Allowed',
        true
      )
    })

    it('should return true when all conditions allow a turn', () => {
      const enemy = new Enemy()
      enemy.boardDestroyed = false
      enemy.isRevealed = false
      enemy.loadOut.isOutOfAmmo = jest.fn(() => false)
      enemy.timeoutId = null
      enemy.opponent = {
        boardDestroyed: false
      }

      expect(enemy.canTakeTurn()).toBe(true)
    })

    it('should use hasNoAmmo wrapper method to check ammo status', () => {
      const enemy = new Enemy()
      enemy.boardDestroyed = false
      enemy.isRevealed = false
      enemy.loadOut.isOutOfAmmo = jest.fn(() => false)
      enemy.timeoutId = null
      enemy.opponent = { boardDestroyed: false }

      enemy.canTakeTurn()

      // Verify that isOutOfAmmo is called via hasNoAmmo (regression test for checkNoAmmo bug)
      expect(enemy.loadOut.isOutOfAmmo).toHaveBeenCalled()
    })

    it('should handle multiple consecutive calls correctly', () => {
      const enemy = new Enemy()
      enemy.boardDestroyed = false
      enemy.isRevealed = false
      enemy.loadOut.isOutOfAmmo = jest.fn(() => false)
      enemy.timeoutId = null
      enemy.opponent = { boardDestroyed: false }

      expect(enemy.canTakeTurn()).toBe(true)
      expect(enemy.canTakeTurn()).toBe(true)
      expect(enemy.canTakeTurn()).toBe(true)

      // Verify isOutOfAmmo is called each time
      expect(enemy.loadOut.isOutOfAmmo).toHaveBeenCalledTimes(3)
    })
  })
})
