/**
 * @fileoverview Tests for enemy cursor cleanup on single-shot weapon switch
 * Validates that cursor classes are properly removed from board cells when switching weapons
 * @module enemy.cursor.test
 * @requires @jest/globals
 * @requires src/waters/enemy.js
 * @requires src/waters/helpers/CellClassManager.js
 */

/**
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

/**
 * Creates a mock terrain object with required properties and methods.
 * Provides minimal implementation to satisfy Enemy class terrain interface.
 *
 * @private
 * @returns {Object<string, any>} Mock terrain with required game properties
 */
const createTerrainMock = () => ({
  hasAttachedWeapons: false,
  tag: 'mock',
  title: 'mock',
  subterrains: [],
  ships: { baseShapes: [] },
  weapons: { tags: [], cursors: [] },
  subterrainTag: () => '',
  allSubterrainTag: () => [],
  getNewWeapon: () => null,
  updateCustomMaps: jest.fn()
})

/**
 * Creates a mock mask object for board representation.
 * Represents empty grid mask state for terrain operations.
 *
 * @private
 * @returns {Object<string, any>} Mock mask with required bitboard properties
 */
const createBlankMaskMock = () => ({
  bits: new Uint8Array(100),
  test: () => false,
  toCoords: [],
  setRanges: jest.fn(),
  length: 0
})

/**
 * Mock StatusUI module for game status tracking.
 * Provides status display methods used by enemy weapon management.
 * @type {jest.Mock}
 */
jest.unstable_mockModule('./StatusUI.js', () => ({
  gameStatus: {
    /** @type {jest.Mock} Mock ammo status display */
    displayAmmoStatus: jest.fn(),
    /** @type {jest.Mock} Mock ammo display */
    displayAmmo: jest.fn(),
    /** @type {jest.Mock} Mock mode display */
    showMode: jest.fn(),
    /** @type {jest.Mock} Mock queue message addition */
    addToQueue: jest.fn(),
    /** @type {jest.Mock} Mock tips setter */
    setTips: jest.fn(),
    /** @type {jest.Mock} Mock queue clear */
    clearQueue: jest.fn(),
    /** @type {jest.Mock} Mock selection mode reset */
    resetToSelectionMode: jest.fn(),
    /** @type {jest.Mock} Mock info display */
    info2: jest.fn()
  }
}))

/**
 * Mock bh terrain module for game configuration.
 * Provides terrain, map, and weapon system configuration for enemy AI.
 * @type {jest.Mock}
 */
jest.unstable_mockModule('../terrains/all/js/bh.js', () => ({
  bh: {
    /** @type {boolean} Seeking mode flag */
    seekingMode: false,
    /** @type {Object} Current terrain configuration */
    terrain: createTerrainMock(),
    /** @type {Object} Available maps container */
    maps: {},
    /** @type {Object} Current game map with dimensions */
    map: {
      rows: 10,
      cols: 10,
      blankMask: createBlankMaskMock(),
      blankGrid: [],
      inBounds: () => true
    },
    /** @type {Function} Terrain lookup by tag */
    getTerrainByTag: () => createTerrainMock(),
    /** @type {Function} Extra fleet builder getter */
    extraFleetBuilder: () => [],
    /** @type {Function} Fleet builder getter */
    fleetBuilder: () => []
  }
}))

/**
 * Mock enemyUI module for board display and interaction.
 * Provides board element and control methods for visual feedback.
 * @type {jest.Mock}
 */
jest.unstable_mockModule('./enemyUI.js', () => ({
  enemyUI: {
    /** @type {HTMLElement} Mock board DOM element */
    board: /** @type {HTMLElement} */ (document.createElement('div')),
    /** @type {Object<string, jest.Mock>} Grid manipulation methods */
    grid: {
      /** @type {jest.Mock} Mock hover effect addition */
      addHover: jest.fn(),
      /** @type {jest.Mock} Mock class clearing */
      clearClasses: jest.fn(),
      /** @type {jest.Mock} Mock AoE highlight removal */
      removeHighlightAoE: jest.fn()
    },
    /** @type {jest.Mock} Mock play mode activation */
    playMode: jest.fn(),
    /** @type {jest.Mock} Mock board construction */
    buildBoard: jest.fn(),
    /** @type {jest.Mock} Mock UI reset */
    reset: jest.fn(),
    /** @type {jest.Mock} Mock weapon cell activation */
    cellWeaponActive: jest.fn(),
    /** @type {jest.Mock} Mock weapon button display */
    weaponButtons: jest.fn(),
    /** @type {jest.Mock} Mock board reveal */
    revealAll: jest.fn(),
    /** @type {jest.Mock} Mock button enable */
    enableBtns: jest.fn()
  }
}))

/**
 * Test suite for enemy cursor management.
 * Validates cursor cleanup when switching between single-shot and multi-shot weapons.
 * Ensures visual state is properly cleared to prevent stale UI elements.
 *
 * @suite Enemy Cursor Cleanup
 */
describe('Enemy cursor cleanup on single-shot switch', () => {
  /** @type {typeof import('./enemy.js')} Imported enemy module */
  let enemyModule
  /** @type {typeof import('./helpers/CellClassManager.js')} Imported CellClassManager module */
  let CellClassManagerModule

  /**
   * Setup test environment before each test.
   * Imports modules, clears mocks, and resets state for isolation.
   *
   * @async
   * @returns {Promise<void>}
   */
  beforeEach(async () => {
    jest.clearAllMocks()
    CellClassManagerModule = await import('./helpers/CellClassManager.js')
    enemyModule = await import('./enemy.js')
  })

  /**
   * Test: Cursor classes are removed from all board cells on single-shot switch.
   * Validates that onClickSingleShotButton() clears cursor state from:
   * - The board element itself
   * - All individual cell elements within the board
   * Ensures no stale cursor UI remains after weapon mode change.
   *
   * @returns {void}
   */
  it('removes cursor classes from all board cells when switching to single-shot', () => {
    const { enemy } = enemyModule
    const { CellClassManager } = CellClassManagerModule

    // Prepare board with mock cell elements for testing
    const board = enemy.UI.board
    // Clear any existing children to start fresh
    while (board.firstChild) board.firstChild.remove()

    // Create test cell elements to verify cursor removal
    /** @type {HTMLElement} Test cell A */
    const cellA = document.createElement('div')
    /** @type {HTMLElement} Test cell B */
    const cellB = document.createElement('div')
    board.appendChild(cellA)
    board.appendChild(cellB)

    // Spy on removeCursorClasses to verify it's called for board and cells
    /** @type {jest.SpyInstance} Spy on CellClassManager.removeCursorClasses */
    const spy = jest.spyOn(CellClassManager, 'removeCursorClasses')

    // Mock _handleWeaponChange to prevent side effects during test
    jest.spyOn(enemy, '_handleWeaponChange').mockImplementation(() => {
      enemy.selectedCellCoordinates = null
    })

    // Configure mock loadOut with switchToSingleShot method
    /** @type {Object<string, jest.Mock>} Mock loadOut with weapon switch method */
    enemy.loadOut = { switchToSingleShot: jest.fn() }

    // Invoke single-shot button handler to trigger cursor cleanup
    enemy.onClickSingleShotButton()

    // Verify loadOut was instructed to switch to single-shot mode
    expect(enemy.loadOut.switchToSingleShot).toHaveBeenCalled()

    // Verify cursor classes were removed from board and all cells
    expect(spy).toHaveBeenCalledWith(board)
    expect(spy).toHaveBeenCalledWith(cellA)
    expect(spy).toHaveBeenCalledWith(cellB)
  })
})
