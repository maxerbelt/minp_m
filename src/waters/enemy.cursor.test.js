/**
 * @jest-environment jsdom
 */

/* eslint-env jest */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock StatusUI and bh as used by enemy module
jest.unstable_mockModule('./StatusUI.js', () => ({
  gameStatus: {
    displayAmmoStatus: jest.fn(),
    displayAmmo: jest.fn(),
    showMode: jest.fn(),
    addToQueue: jest.fn(),
    setTips: jest.fn(),
    clearQueue: jest.fn(),
    resetToSelectionMode: jest.fn(),
    info2: jest.fn()
  }
}))

jest.unstable_mockModule('../terrains/all/js/bh.js', () => {
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

  const blankMaskMock = {
    bits: new Uint8Array(100),
    test: () => false,
    toCoords: [],
    setRanges: jest.fn(),
    length: 0
  }

  return {
    bh: {
      seekingMode: false,
      terrain: createTerrainMock(),
      maps: {},
      map: {
        rows: 10,
        cols: 10,
        blankMask: blankMaskMock,
        blankGrid: [],
        inBounds: () => true
      },
      getTerrainByTag: () => createTerrainMock(),
      extraFleetBuilder: () => [],
      fleetBuilder: () => []
    }
  }
})

// Provide a real DOM board element via the mocked enemyUI so Enemy uses it
jest.unstable_mockModule('./enemyUI.js', () => ({
  enemyUI: {
    board: /** @type {HTMLElement} */ (document.createElement('div')),
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

describe('Enemy cursor cleanup on single-shot switch', () => {
  let enemyModule, CellClassManagerModule

  beforeEach(async () => {
    jest.clearAllMocks()
    CellClassManagerModule = await import('./helpers/CellClassManager.js')
    enemyModule = await import('./enemy.js')
  })

  it('removes cursor classes from all board cells when switching to single-shot', () => {
    const { enemy } = enemyModule
    const { CellClassManager } = CellClassManagerModule

    // Prepare board with mock cell elements
    const board = enemy.UI.board
    // Ensure starting clean
    while (board.firstChild) board.removeChild(board.firstChild)

    const cellA = document.createElement('div')
    const cellB = document.createElement('div')
    board.appendChild(cellA)
    board.appendChild(cellB)

    // Spy on CellClassManager.removeCursorClasses
    const spy = jest.spyOn(CellClassManager, 'removeCursorClasses')

    // Prevent heavy side-effects from _handleWeaponChange
    jest.spyOn(enemy, '_handleWeaponChange').mockImplementation(() => {
      enemy.selectedCellCoordinates = null
    })

    // Provide a mock loadOut with switchToSingleShot
    enemy.loadOut = { switchToSingleShot: jest.fn() }

    // Call the public handler
    enemy.onClickSingleShotButton()

    // Expect loadOut to have been told to switch modes
    expect(enemy.loadOut.switchToSingleShot).toHaveBeenCalled()

    // removeCursorClasses should be called on the board element itself
    expect(spy).toHaveBeenCalledWith(board)

    // removeCursorClasses should be called for each board cell
    expect(spy).toHaveBeenCalledWith(cellA)
    expect(spy).toHaveBeenCalledWith(cellB)
  })
})
