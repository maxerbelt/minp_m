/**
 * @jest-environment jsdom
 */

/* eslint-env jest */
import { jest } from '@jest/globals'

/* global   it, describe,   expect, beforeEach, jest */
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
      if (typeof this.displacementRatio === 'function') {
        return this.displacementRatio() < 0.35
      }
      return true
    }
  }
}))

describe('Friend', () => {
  let friend
  beforeEach(async () => {
    // require Friend after bh mock is in place
    jest.resetModules()
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
    friend.displacementRatio = jest.fn(() => 0.1)
    expect(typeof friend.hasFewShips()).toBe('boolean')
  })

  it('hasPlayableShips returns boolean', () => {
    friend.displacementRatio = jest.fn(() => 0.1)
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
})
