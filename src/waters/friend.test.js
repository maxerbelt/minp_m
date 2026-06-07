/**
 * @jest-environment jsdom
 * @file Friend class test suite with mock setup for autonomous AI targeting and board UI
 * @description Tests for Friend AI player autonomous seeking, weapon selection, and board interactions
 */

import { it, describe, expect, beforeEach, jest } from '@jest/globals'

// ============================================================================
// Type Definitions for Mocks and Test Utilities
// ============================================================================

/**
 * @typedef {Object} MockGridBoard
 * @property {HTMLElement} board - Game board DOM element mock
 * @property {jest.Mock} makeDroppable - Enable drag-and-drop on board
 * @property {jest.Mock} markFleetWeapons - Mark weapon cell display
 * @property {jest.Mock} clearVisuals - Clear weapon visual effects
 * @property {jest.Mock} clearFriendVisuals - Clear friendly player visuals
 * @property {jest.Mock} revealShip - Reveal single ship
 * @property {jest.Mock} revealShips - Reveal multiple ships
 */

/**
 * @typedef {Object} MockUI
 * @property {jest.Mock} showNotice - Show notice to player
 * @property {jest.Mock} resetShips - Reset ship display state
 * @property {jest.Mock} buildBoard - Build game board with click handlers
 * @property {jest.Mock} buildTrays - Build weapon trays
 * @property {jest.Mock} reset - Reset UI state
 * @property {HTMLElement} board - Game board DOM element mock
 * @property {MockGridBoard} grid
 * @property {jest.Mock} itMode - IT/Test mode toggle
 * @property {HTMLButtonElement} itBtn - IT mode button mock
 * @property {HTMLButtonElement} seekBtn - Seek mode button mock
 * @property {HTMLButtonElement} stopBtn - Stop button mock
 * @property {jest.Mock} showStatus - Show status message
 * @property {jest.Mock} showTips - Show tips
 * @property {jest.Mock} hideTips - Hide tips
 * @property {Object} trayManager - Weapon tray manager mock
 * @property {jest.Mock} showTransformBtns - Show transformation buttons
 * @property {jest.Mock} hideTransformBtns - Hide transformation buttons
 * @property {jest.Mock} standardPanels - Show standard UI panels
 * @property {HTMLButtonElement} newPlacementBtn - New placement button mock
 * @property {Object} score - Score display UI mock
 */

/**
 * @typedef {Object} MockShip
 * @property {jest.Mock} reset - Reset ship state
 * @property {Array<string>} hits - Hit coordinates as strings
 * @property {number} id - Ship unique identifier
 * @property {jest.Mock} weapon - Get ship weapon (mocked)
 * @property {any} firstLoadedWeapon - Get first loaded weapon
 * @property {Array<Object>} allWeapons - Get all weapons
 * @property {Array<Object>} loadedWeapons - Get weapons with ammo
 * @property {jest.Mock} getWeaponBySystemId - Find weapon by system ID
 */

/** @type {any} */
let Friend

// ============================================================================
// Mock Factory Functions
// ============================================================================

/**
 * Creates a mock UI object for testing.
 * Provides jest mocks for all PlacementUI methods.
 * @returns {MockUI} Mock UI with all required methods and properties
 */
const getMockUI = () =>
  /** @type {MockUI} */ (
    /** @type {unknown} */ ({
      showNotice: jest.fn(),
      buildBoard: jest.fn(),
      grid: {
        makeDroppable: jest.fn(),
        markFleetWeapons: jest.fn(),
        clearVisuals: jest.fn(),
        clearFriendVisuals: jest.fn(),
        revealShip: jest.fn(),
        revealShips: jest.fn(),
        resetShips: jest.fn()
      },
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
    })
  )

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
    getTerrainByTag: (/** @type {string} */ tag) => ({ tag }),
    // some modules call terrainByTitle; provide alias for its
    terrainByTitle: (/** @type {string} */ title) => ({ title })
  }
}))

// Mock Waters base class to avoid importing heavy dependencies during its
jest.unstable_mockModule('./Waters.js', () => ({
  Waters: class {
    /**
     * @param {any} ui - User interface instance
     */
    constructor (ui) {
      this.UI = ui
      this.steps = {}
      this.loadOut = { SShot: () => ({}) }
      /** @type {Array<any>} */
      this.ships = []
      this.score = {
        createShotKey: () => null,
        reset: () => {}
      }
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
    getDisplacementRatio () {
      return 0.1
    }
  }
}))

// Mock drag handlers to avoid DOM setup errors in tests
// Export both the local and parent-relative specifiers used across modules
const mockDragModule = {
  setupDragHandlers: jest.fn(),
  setupDragBrushHandlers: jest.fn(),
  getShipIdFromElement: jest.fn((/** @type {any} */ el) =>
    Number.parseInt(el?.dataset?.id || '')
  ),
  dragNDrop: {
    getClickedShip: jest.fn(() => null),
    setClickedShip: jest.fn(),
    dragEnd: jest.fn(),
    dragBrushEnd: jest.fn(),
    highlight: jest.fn(),
    handleDropEvent: jest.fn(),
    drop: jest.fn(),
    dragEnter: jest.fn(),
    addWeaponDrop: jest.fn(),
    addDrop: jest.fn(),
    dragBrushEnter: jest.fn()
  }
}
jest.unstable_mockModule('../selection/dragndrop.js', () => mockDragModule)

// Mock gameStatus to track UI update calls
/**
 * Mock gameStatus to track UI update calls.
 * Simulates weapon status display logic.
 */
jest.unstable_mockModule('./StatusUI.js', () => ({
  gameStatus: {
    /**
     * Updates weapon status in game UI.
     * Calls internal methods to set mode, reset icons, and display ammo.
     * @param {Object} weaponSystem - Current weapon system
     * @param {Object} maps - Map provider
     * @param {number} numCoords - Number of selected coordinates
     * @param {Object} [_reserved] - Reserved parameter (unused)
     * @param {boolean} [unattached] - Whether weapon has unattached variants
     * @returns {void}
     */
    updateWeaponStatus: function (
      weaponSystem,
      maps,
      numCoords,
      _reserved,
      unattached
    ) {
      const weapon = /** @type {any} */ (weaponSystem)?.weapon

      if (weapon) {
        // Always set the weapon mode and reset icons to ensure UI updates on weapon change
        this.setWeaponMode(weapon)
        this.resetAmmoIcons()
        this.displayAmmoStatus(weaponSystem, maps, numCoords, null, unattached)
      }
    },
    /** @type {jest.Mock} */
    setWeaponMode: jest.fn(),
    /** @type {jest.Mock} */
    resetAmmoIcons: jest.fn(),
    /** @type {jest.Mock} */
    displayAmmoStatus: jest.fn(),
    /** @type {jest.Mock} */
    showMode: jest.fn(),
    /** @type {jest.Mock} */
    addToQueue: jest.fn()
  }
}))

describe('Friend', () => {
  /** @type {any} */
  let friend
  /** @type {any} */
  let gameStatus
  /** @type {any} */
  let bh
  /** @type {MockUI|undefined} */
  let mockUI

  /**
   * Setup test fixtures before each test.
   * Initializes mocks and creates Friend instance.
   * @returns {Promise<void>}
   */
  beforeEach(async () => {
    mockUI = getMockUI()
    // require Friend after bh mock is in place
    jest.resetModules()
    const bhModule = await import('../terrains/all/js/bh.js')
    bh = bhModule.bh
    const statusUIModule = await import('./StatusUI.js')
    gameStatus = statusUIModule.gameStatus
    const friendModule = await import('./friend.js')
    Friend = friendModule.Friend
    friend = new Friend(mockUI)
    /** @type {Array<MockShip>} */
    friend.ships = [
      {
        reset: jest.fn(),
        hits: ['0,0'],
        id: 1,
        weapon: jest.fn(),
        firstLoadedWeapon: null,
        allWeapons: [{ name: 'RailGun', letter: 'R' }],
        loadedWeapons: [{ id: 1, weapon: { name: 'RailGun', letter: 'R' } }],
        getWeaponBySystemId: jest.fn()
      }
    ]
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

  it('hasFewShips returns boolean', () => {
    friend.getDisplacementRatio = jest.fn(() => 0.1)
    expect(typeof friend.hasFewShips()).toBe('boolean')
  })

  it('hasPlayableShips returns boolean', () => {
    friend.getDisplacementRatio = jest.fn(() => 0.1)
    expect(typeof friend.hasPlayableShips()).toBe('boolean')
  })

  it('restartBoard calls score.reset and UI.grid.clearVisuals', () => {
    friend.score.reset = jest.fn()
    friend.armWeapons = jest.fn()
    friend.restartBoard()
    expect(friend.score.reset).toHaveBeenCalled()
    expect(friend.UI.grid.clearVisuals).toHaveBeenCalled()
    expect(friend.armWeapons).toHaveBeenCalled()
  })

  it('restartFriendBoard calls score.reset and UI.grid.clearFriendVisuals', () => {
    friend.score.reset = jest.fn()
    friend.armWeapons = jest.fn()
    friend.restartBoard(true)
    expect(friend.score.reset).toHaveBeenCalled()
    expect(friend.UI.grid.clearFriendVisuals).toHaveBeenCalled()
    expect(friend.armWeapons).toHaveBeenCalled()
  })

  // ============ Weapon Status UI Update Tests ============
  // Prevents regressions in weapon name, ammo counter, and mode icon updates

  describe('updateWeaponStatus', () => {
    beforeEach(() => {
      // Mock gameStatus methods to verify they are called
      if (gameStatus) {
        gameStatus.setWeaponMode = jest.fn()
        gameStatus.resetAmmoIcons = jest.fn()
        gameStatus.displayAmmoStatus = jest.fn()
      }

      // Mock loadOut
      friend.loadOut = {
        currentWeaponSystem: {
          weapon: { name: 'RailGun', letter: 'R' }
        },
        selectedCoordinates: [{ r: 1, c: 1 }],
        isSingleShot: false,
        firstUnattachedWeaponSystem: null
      }
    })

    it('calls gameStatus.setWeaponMode with current weapon', () => {
      friend.updateWeaponStatus()
      expect(gameStatus?.setWeaponMode).toHaveBeenCalledWith({
        name: 'RailGun',
        letter: 'R'
      })
    })

    it('calls gameStatus.resetAmmoIcons to prepare icon display', () => {
      friend.updateWeaponStatus()
      expect(gameStatus?.resetAmmoIcons).toHaveBeenCalled()
    })

    it('calls gameStatus.displayAmmoStatus with correct parameters', () => {
      friend.updateWeaponStatus()
      expect(gameStatus?.displayAmmoStatus).toHaveBeenCalledWith(
        expect.objectContaining({ weapon: { name: 'RailGun', letter: 'R' } }),
        bh?.maps,
        1,
        null,
        expect.any(Boolean)
      )
    })

    it('does not call UI methods if no weapon is available', () => {
      friend.loadOut.currentWeaponSystem = null
      friend.updateWeaponStatus()
      expect(gameStatus?.setWeaponMode).not.toHaveBeenCalled()
      expect(gameStatus?.resetAmmoIcons).not.toHaveBeenCalled()
      expect(gameStatus?.displayAmmoStatus).not.toHaveBeenCalled()
    })

    it('handles optional parameters gracefully', () => {
      friend.updateWeaponStatus({}, { x: 10, y: 20 })
      expect(gameStatus?.setWeaponMode).toHaveBeenCalled()
    })

    it('includes unattached weapon status in displayAmmoStatus call', () => {
      friend.loadOut.isSingleShot = true
      friend.updateWeaponStatus()
      expect(gameStatus?.displayAmmoStatus).toHaveBeenCalledWith(
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
        firstUnattachedWeaponSystem: null
      }
    })

    it('returns true when in seeking mode', () => {
      const originalSeekingMode = bh?.seekingMode ?? false
      if (bh) bh.seekingMode = true
      try {
        expect(friend._hasUnattachedForCurrentWeapon()).toBe(true)
      } finally {
        if (bh) bh.seekingMode = originalSeekingMode
      }
    })

    it('returns true when current weapon is single shot', () => {
      friend.loadOut.isSingleShot = true
      expect(friend._hasUnattachedForCurrentWeapon()).toBe(true)
    })

    it('returns true when weapon has unattached variants', () => {
      friend.loadOut.firstUnattachedWeaponSystem = {
        weapon: { name: 'MissileBoat' }
      }
      expect(friend._hasUnattachedForCurrentWeapon()).toBe(true)
    })

    it('returns false when no unattached weapons or seeking mode', () => {
      const originalSeekingMode = bh?.seekingMode ?? false
      if (bh) bh.seekingMode = false
      friend.loadOut.isSingleShot = false
      friend.loadOut.firstUnattachedWeaponSystem = null
      try {
        expect(friend._hasUnattachedForCurrentWeapon()).toBe(false)
      } finally {
        if (bh) bh.seekingMode = originalSeekingMode
      }
    })
  })

  // ============ Board Click Handler Tests ============
  // Prevents regressions in weapon selection click handling
  // Implements two-click behavior: first click selects weapon, second click fires

  describe('onClickCell', () => {
    beforeEach(() => {
      friend.opponent = {
        name: 'Enemy',
        updateUI: jest.fn(),
        updateResultsOfBomb: jest.fn()
      }
      friend.randomAttachedWeapon = jest.fn()
      friend.fireWeaponAt = jest.fn(() => Promise.resolve({ score: null }))
      friend.steps.endTurn = jest.fn()
      friend.loadOut.selectedWeapon = { letter: 'A' }
      friend.updateUI = jest.fn()
    })

    it('only processes clicks when in seeking mode', () => {
      const originalSeekingMode = bh?.seekingMode ?? false
      if (bh) bh.seekingMode = false
      try {
        friend.onClickCell(5, 5)
        expect(friend.randomAttachedWeapon).not.toHaveBeenCalled()
      } finally {
        if (bh) bh.seekingMode = originalSeekingMode
      }
    })

    it('only processes clicks when terrain has attached weapons', () => {
      const originalSeekingMode = bh?.seekingMode ?? false
      if (bh) {
        bh.seekingMode = true
        bh.terrain = { hasAttachedWeapons: false }
      }
      try {
        friend.onClickCell(5, 5)
        expect(friend.randomAttachedWeapon).not.toHaveBeenCalled()
      } finally {
        if (bh) bh.seekingMode = originalSeekingMode
      }
    })

    it('first click calls randomAttachedWeapon in seeking mode', () => {
      const originalSeekingMode = bh?.seekingMode ?? false
      if (bh) {
        bh.seekingMode = true
        bh.terrain = { hasAttachedWeapons: true }
      }
      try {
        friend.onClickCell(3, 7)
        expect(friend.randomAttachedWeapon).toHaveBeenCalledWith(
          friend.opponent
        )
        expect(friend.selectedCellCoordinates).toEqual({ r: 3, c: 7 })
      } finally {
        if (bh) bh.seekingMode = originalSeekingMode
      }
    })

    it('second click fires weapon at target', async () => {
      const originalSeekingMode = bh.seekingMode
      bh.seekingMode = true
      bh.terrain = { hasAttachedWeapons: true }
      try {
        // First click: select weapon
        friend.onClickCell(3, 7)
        expect(friend.selectedCellCoordinates).not.toBeNull()

        // Second click: fire weapon
        await friend.onClickCell(5, 5)
        expect(friend.fireWeaponAt).toHaveBeenCalledWith(
          5,
          5,
          friend.loadOut.selectedWeapon
        )
        expect(friend.steps.endTurn).toHaveBeenCalled()
      } finally {
        if (bh) bh.seekingMode = originalSeekingMode
      }
    })

    it('returns early if seeking mode is false and hasAttachedWeapons is true', () => {
      const originalSeekingMode = bh?.seekingMode ?? false
      if (bh) {
        bh.seekingMode = false
        bh.terrain = { hasAttachedWeapons: true }
      }
      try {
        friend.onClickCell(5, 5)
        expect(friend.randomAttachedWeapon).not.toHaveBeenCalled()
      } finally {
        if (bh) bh.seekingMode = originalSeekingMode
      }
    })
  })

  // ============ Board UI Initialization Tests ============
  // Prevents regressions in board setup and click handler registration

  describe('buildBoard', () => {
    beforeEach(() => {
      friend.resetShipCells = jest.fn()
      friend.UI.grid.makeDroppable = jest.fn()
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

    it('calls UI.grid.makeDroppable to enable drag operations', () => {
      friend.buildBoard()
      expect(friend.UI.grid.makeDroppable).toHaveBeenCalledWith(friend)
    })

    it('calls all setup methods in correct sequence', () => {
      /** @type {Array<string>} */
      const callOrder = []
      friend.UI.buildBoard = jest.fn(() => callOrder.push('buildBoard'))
      friend.resetShipCells = jest.fn(() => callOrder.push('resetShipCells'))
      friend.UI.grid.makeDroppable = jest.fn(() =>
        callOrder.push('makeDroppable')
      )
      friend.UI.grid.markFleetWeapons = jest.fn(() =>
        callOrder.push('markFleetWeapons')
      )

      friend.buildBoard()

      expect(callOrder).toEqual([
        'buildBoard',
        'resetShipCells',
        'makeDroppable',
        'markFleetWeapons'
      ])
    })
  })
})
