/**
 * @jest-environment jsdom
 */

/* eslint-env jest */
import { it, describe, expect, beforeEach, jest } from '@jest/globals'

/* global   it, describe, expect, beforeEach, jest */
let Friend

// Mocks
const mockUI = {
  showNotice: jest.fn(),
  clearVisuals: jest.fn(),
  clearFriendVisuals: jest.fn(),
  revealShip: jest.fn(),
  revealShips: jest.fn(),
  resetShips: jest.fn(),
  buildBoard: jest.fn(),
  makeDroppable: jest.fn(),
  buildTrays: jest.fn(),
  reset: jest.fn(),
  board: { classList: { add: jest.fn(), remove: jest.fn() }, children: [] },
  itMode: jest.fn(),
  itBtn: {
    disabled: false,
    classList: { add: jest.fn(), remove: jest.fn() }
  },
  seekBtn: {
    disabled: false,
    classList: { add: jest.fn(), remove: jest.fn() }
  },
  stopBtn: {
    disabled: false,
    classList: { add: jest.fn(), remove: jest.fn() }
  },
  showStatus: jest.fn(),
  showTips: jest.fn(),
  hideTips: jest.fn(),
  trayManager: {
    showShipTrays: jest.fn(),
    hideShipTrays: jest.fn()
  },

  showTransformBtns: jest.fn(),
  hideTransformBtns: jest.fn(),
  standardPanels: jest.fn(),
  newPlacementBtn: { classList: { add: jest.fn(), remove: jest.fn() } },
  score: {
    display: jest.fn(),
    buildTally: jest.fn(),
    shotsLabel: { classList: { add: jest.fn(), remove: jest.fn() } },
    hitsLabel: { classList: { add: jest.fn(), remove: jest.fn() } },
    sunkLabel: { classList: { add: jest.fn(), remove: jest.fn() } },
    revealsLabel: { classList: { add: jest.fn(), remove: jest.fn() } },
    hintsLabel: { classList: { add: jest.fn(), remove: jest.fn() } },
    placedLabel: { classList: { add: jest.fn(), remove: jest.fn() } }
  }
}

// Minimal mocks for bh and dependencies
jest.unstable_mockModule('../terrains/all/js/bh.js', () => ({
  bh: {
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
    },
    maps: {
      customMapList: jest.fn(() => []),
      maps: jest.fn(() => []),
      preGenMapList: jest.fn(() => [])
    },
    seekingMode: false,
    it: true,
    getTerrainByTag: tag => ({ tag }),
    // some modules call terrainByTitle; provide alias for its
    terrainByTitle: title => ({ title })
  }
}))

// Mock Waters base class to avoid importing heavy dependencies during its
jest.unstable_mockModule('./Waters.js', () => ({
  Waters: class {
    constructor (ui) {
      this.UI = ui
      this.steps = {}
      this.loadOut = { SShot: () => ({}) }
      this.ships = []
      this.score = { createShotKey: () => null, newShotKey: () => null }
    }
    hasFewShips () {
      return !!(this.ships && this.ships.length > 0)
    }
    hasPlayableShips () {
      if (typeof this.getDisplacementRatio === 'function') {
        return this.getDisplacementRatio() < 0.35
      }
      return true
    }
  }
}))

// Mock drag handlers to avoid DOM setup errors in tests
jest.unstable_mockModule('../selection/dragndrop.js', () => ({
  setupDragHandlers: jest.fn()
}))

// Mock gameStatus to track UI update calls
jest.unstable_mockModule('./StatusUI.js', () => ({
  gameStatus: {
    _setWeaponMode: jest.fn(),
    _resetAmmoIcons: jest.fn(),
    displayAmmoStatus: jest.fn(),
    showMode: jest.fn()
  }
}))

describe('Friend', () => {
  let friend
  let gameStatus
  let bh
  beforeEach(async () => {
    // require Friend after bh mock is in place
    jest.resetModules()
    const bhModule = await import('../terrains/all/js/bh.js')
    bh = bhModule.bh
    const statusUIModule = await import('./StatusUI.js')
    gameStatus = statusUIModule.gameStatus
    const friendModule = await import('./friend.js')
    Friend = friendModule.Friend
    friend = new Friend(mockUI)
    friend.ships = [
      {
        reset: jest.fn(),
        hits: ['0,0'],
        id: 1,
        weapon: jest.fn(),
        getFirstLoadedWeapon: jest.fn(),
        getAllWeapons: jest.fn(),
        loadedWeapons: jest.fn(),
        getWeaponBySystemId: jest.fn()
      }
    ]
    friend.UI = mockUI
    friend.score = {
      shot: { sub: jest.fn(() => ({ toCoords: ['0,0'], length: 1 })) },
      hint: [],
      reveal: { sub: jest.fn(() => ({ occupancy: 0 })) },
      hints: {
        clone: {
          dilate: jest.fn(() => ({ sub: jest.fn(() => ({ occupancy: 0 })) }))
        }
      },
      shots: { sub: jest.fn(() => ({ occupancy: 0 })) },
      clone: {
        dilateCross: jest.fn(() => ({
          sub: jest.fn(() => ({ occupancy: 0 }))
        })),
        dilate: jest.fn(() => ({ sub: jest.fn(() => ({ occupancy: 0 })) }))
      }
    }
  })

  it('getRandomHitCoordinate returns null for empty', () => {
    expect(friend.getRandomHitCoordinate([])).toBeNull()
  })

  it('getRandomHitCoordinate returns only element for single', () => {
    expect(friend.getRandomHitCoordinate([[1, 2]])).toEqual([1, 2])
  })

  it('getRandomHitCoordinate returns one of the elements for multiple', () => {
    const result = friend.getRandomHitCoordinate([
      [1, 2],
      [3, 4]
    ])
    expect([
      [1, 2],
      [3, 4]
    ]).toContainEqual(result)
  })

  it('hasFewShips returns boolean', () => {
    friend.getDisplacementRatio = jest.fn(() => 0.1)
    expect(typeof friend.hasFewShips()).toBe('boolean')
  })

  it('hasPlayableShips returns boolean', () => {
    friend.getDisplacementRatio = jest.fn(() => 0.1)
    expect(typeof friend.hasPlayableShips()).toBe('boolean')
  })

  it('restartBoard calls resetBase and UI.clearVisuals', () => {
    friend.resetBase = jest.fn()
    friend.armWeapons = jest.fn()
    friend.restartBoard()
    expect(friend.resetBase).toHaveBeenCalled()
    expect(friend.UI.clearVisuals).toHaveBeenCalled()
    expect(friend.armWeapons).toHaveBeenCalled()
  })

  it('restartFriendBoard calls resetBase and UI.clearFriendVisuals', () => {
    friend.resetBase = jest.fn()
    friend.armWeapons = jest.fn()
    friend.restartBoard(true)
    expect(friend.resetBase).toHaveBeenCalled()
    expect(friend.UI.clearFriendVisuals).toHaveBeenCalled()
    expect(friend.armWeapons).toHaveBeenCalled()
  })

  // ============ Weapon Status UI Update Tests ============
  // Prevents regressions in weapon name, ammo counter, and mode icon updates

  describe('updateWeaponStatus', () => {
    beforeEach(() => {
      // Mock gameStatus methods to verify they are called
      gameStatus._setWeaponMode = jest.fn()
      gameStatus._resetAmmoIcons = jest.fn()
      gameStatus.displayAmmoStatus = jest.fn()

      // Mock loadOut
      friend.loadOut = {
        getCurrentWeaponSystem: jest.fn(() => ({
          weapon: { name: 'RailGun', letter: 'R' }
        })),
        selectedCoordinates: [{ r: 1, c: 1 }],
        isSingleShot: false,
        getUnattachedWeaponSystem: jest.fn(() => null)
      }
    })

    it('calls gameStatus._setWeaponMode with current weapon', () => {
      friend.updateWeaponStatus()
      expect(gameStatus._setWeaponMode).toHaveBeenCalledWith({
        name: 'RailGun',
        letter: 'R'
      })
    })

    it('calls gameStatus._resetAmmoIcons to prepare icon display', () => {
      friend.updateWeaponStatus()
      expect(gameStatus._resetAmmoIcons).toHaveBeenCalled()
    })

    it('calls gameStatus.displayAmmoStatus with correct parameters', () => {
      friend.updateWeaponStatus()
      expect(gameStatus.displayAmmoStatus).toHaveBeenCalledWith(
        expect.objectContaining({ weapon: { name: 'RailGun', letter: 'R' } }),
        bh.maps,
        1,
        null,
        expect.any(Boolean)
      )
    })

    it('does not call UI methods if no weapon is available', () => {
      friend.loadOut.getCurrentWeaponSystem = jest.fn(() => null)
      friend.updateWeaponStatus()
      expect(gameStatus._setWeaponMode).not.toHaveBeenCalled()
      expect(gameStatus._resetAmmoIcons).not.toHaveBeenCalled()
      expect(gameStatus.displayAmmoStatus).not.toHaveBeenCalled()
    })

    it('handles optional parameters gracefully', () => {
      const _rack = {}
      const _cursorInfo = { x: 10, y: 20 }
      friend.updateWeaponStatus(_rack, _cursorInfo)
      expect(gameStatus._setWeaponMode).toHaveBeenCalled()
    })

    it('includes unattached weapon status in displayAmmoStatus call', () => {
      friend.loadOut.isSingleShot = true
      friend.updateWeaponStatus()
      expect(gameStatus.displayAmmoStatus).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Number),
        expect.any(Object),
        true // unattached should be true when isSingleShot is true
      )
    })
  })

  // ============ Unattached Weapon Check Tests ============
  // Prevents regressions in weapon variant detection

  describe('_hasUnattachedForCurrentWeapon', () => {
    beforeEach(() => {
      friend.loadOut = {
        isSingleShot: false,
        getUnattachedWeaponSystem: jest.fn(() => null)
      }
    })

    it('returns true when in seeking mode', () => {
      const originalSeekingMode = bh.seekingMode
      bh.seekingMode = true
      try {
        expect(friend._hasUnattachedForCurrentWeapon()).toBe(true)
      } finally {
        bh.seekingMode = originalSeekingMode
      }
    })

    it('returns true when current weapon is single shot', () => {
      friend.loadOut.isSingleShot = true
      expect(friend._hasUnattachedForCurrentWeapon()).toBe(true)
    })

    it('returns true when weapon has unattached variants', () => {
      friend.loadOut.getUnattachedWeaponSystem = jest.fn(() => ({
        weapon: { name: 'MissileBoat' }
      }))
      expect(friend._hasUnattachedForCurrentWeapon()).toBe(true)
    })

    it('returns false when no unattached weapons or seeking mode', () => {
      const originalSeekingMode = bh.seekingMode
      bh.seekingMode = false
      friend.loadOut.isSingleShot = false
      friend.loadOut.getUnattachedWeaponSystem = jest.fn(() => null)
      try {
        expect(friend._hasUnattachedForCurrentWeapon()).toBe(false)
      } finally {
        bh.seekingMode = originalSeekingMode
      }
    })
  })

  // ============ Board Click Handler Tests ============
  // Prevents regressions in weapon selection click handling

  describe('onClickCell', () => {
    beforeEach(() => {
      friend.opponent = { name: 'Enemy' }
      friend.selectAttachedWeapon = jest.fn()
      friend.UI.gridCellAt = jest.fn(() => ({ element: 'cell' }))
    })

    it('only processes clicks when in seeking mode', () => {
      const originalSeekingMode = bh.seekingMode
      bh.seekingMode = false
      try {
        friend.onClickCell(5, 5)
        expect(friend.selectAttachedWeapon).not.toHaveBeenCalled()
      } finally {
        bh.seekingMode = originalSeekingMode
      }
    })

    it('only processes clicks when terrain has attached weapons', () => {
      const originalSeekingMode = bh.seekingMode
      bh.seekingMode = true
      bh.terrain = { hasAttachedWeapons: false }
      try {
        friend.onClickCell(5, 5)
        expect(friend.selectAttachedWeapon).not.toHaveBeenCalled()
      } finally {
        bh.seekingMode = originalSeekingMode
      }
    })

    it('calls selectAttachedWeapon with correct parameters in seeking mode', () => {
      const originalSeekingMode = bh.seekingMode
      bh.seekingMode = true
      bh.terrain = { hasAttachedWeapons: true }
      try {
        friend.onClickCell(3, 7)
        expect(friend.UI.gridCellAt).toHaveBeenCalledWith(3, 7)
        expect(friend.selectAttachedWeapon).toHaveBeenCalledWith(
          { element: 'cell' },
          3,
          7,
          friend.opponent
        )
      } finally {
        bh.seekingMode = originalSeekingMode
      }
    })

    it('returns early if seeking mode is false and hasAttachedWeapons is true', () => {
      const originalSeekingMode = bh.seekingMode
      bh.seekingMode = false
      bh.terrain = { hasAttachedWeapons: true }
      try {
        friend.onClickCell(5, 5)
        expect(friend.selectAttachedWeapon).not.toHaveBeenCalled()
      } finally {
        bh.seekingMode = originalSeekingMode
      }
    })
  })

  // ============ Board UI Initialization Tests ============
  // Prevents regressions in board setup and click handler registration

  describe('buildBoard', () => {
    beforeEach(() => {
      friend.resetShipCells = jest.fn()
      friend.UI.makeDroppable = jest.fn()
    })

    it('calls UI.buildBoard with onClickCell handler bound to this', () => {
      friend.buildBoard()
      expect(friend.UI.buildBoard).toHaveBeenCalledWith(
        friend.onClickCell,
        friend
      )
    })

    it('calls resetShipCells to initialize ship display', () => {
      friend.buildBoard()
      expect(friend.resetShipCells).toHaveBeenCalled()
    })

    it('calls UI.makeDroppable to enable drag operations', () => {
      friend.buildBoard()
      expect(friend.UI.makeDroppable).toHaveBeenCalledWith(friend)
    })

    it('calls all setup methods in correct sequence', () => {
      const callOrder = []
      friend.UI.buildBoard = jest.fn(() => callOrder.push('buildBoard'))
      friend.resetShipCells = jest.fn(() => callOrder.push('resetShipCells'))
      friend.UI.makeDroppable = jest.fn(() => callOrder.push('makeDroppable'))

      friend.buildBoard()

      expect(callOrder).toEqual([
        'buildBoard',
        'resetShipCells',
        'makeDroppable'
      ])
    })
  })
})
