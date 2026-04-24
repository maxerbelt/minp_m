/**
 * @jest-environment jsdom
 */

/* eslint-env jest */

/* global   it, describe,   expect, beforeEach, jest */
import { it, describe, expect, beforeEach, jest } from '@jest/globals'
import { Waters } from './Waters.js'
import { bh } from '../terrains/all/js/bh.js'

// Mocks
const mockUI = {
  placement: jest.fn(),
  placeTally: jest.fn(),
  displayShipInfo: jest.fn(),
  clearPlaceVisuals: jest.fn(),
  clearVisuals: jest.fn(),
  board: { classList: { remove: jest.fn() }, children: [] },
  displayFleetSunk: jest.fn(),
  displaySurround: jest.fn(),
  cellHit: jest.fn(),
  cellMiss: jest.fn(),
  cellSunkAt: jest.fn(),
  gridCellAt: jest.fn(),
  resetTrays: jest.fn(),
  getTrayItem: jest.fn(),
  removeDragShip: jest.fn(),
  cellSizeScreen: jest.fn(),
  surroundCells: jest.fn(),
  surroundCellElement: jest.fn(),
  makeDroppable: jest.fn(),
  reset: jest.fn(),
  buildBoard: jest.fn(),
  buildTrays: jest.fn(),
  showStatus: jest.fn(),
  showTips: jest.fn(),
  hideTips: jest.fn(),
  showShipTrays: jest.fn(),
  hideShipTrays: jest.fn(),
  showTransformBtns: jest.fn(),
  hideTransformBtns: jest.fn(),
  showTestBtns: jest.fn(),
  hideTestBtns: jest.fn(),
  standardPanels: jest.fn(),
  newPlacementBtn: { classList: { add: jest.fn(), remove: jest.fn() } },
  testBtn: { classList: { add: jest.fn(), remove: jest.fn() } },
  seekBtn: { classList: { add: jest.fn(), remove: jest.fn() } },
  stopBtn: { classList: { add: jest.fn(), remove: jest.fn() } },
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

describe('Waters', () => {
  let waters
  beforeEach(() => {
    waters = new Waters(mockUI)
    waters.ships = [
      {
        cells: [1, 2],
        letter: 'A',
        shape: () => ({ displacement: 2 }),
        weapons: {},
        sunk: false
      },
      {
        cells: [3, 4],
        letter: 'B',
        shape: () => ({ displacement: 3 }),
        weapons: {},
        sunk: true
      }
    ]
    waters.shipCellGrid = [
      [{ id: 1 }, { id: 2 }],
      [{ id: 3 }, { id: 4 }]
    ]
  })

  it('clipboardKey returns correct string', () => {
    expect(waters.clipboardKey()).toBe('geoffs-battleship.placed-ships')
  })

  it('placedShips returns correct object', () => {
    const result = waters.placedShips()
    expect(result).toHaveProperty('ships')
    expect(result).toHaveProperty('shipCellGrid')
    expect(result).toHaveProperty('map')
  })

  it('store saves placedShips to localStorage', () => {
    // Mock localStorage
    const originalLocalStorage = globalThis.localStorage
    const localStorageMock = {
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    }
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true
    })
    waters.store()
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'geoffs-battleship.placed-ships',
      expect.any(String)
    )
    // Restore original localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      configurable: true
    })
  })

  it.skip('attemptToPlaceShips returns true if all ships placed', () => {
    const ships = [
      {
        cells: [1, 2],
        letter: 'A',
        shape: () => ({
          placeables: () => [
            {
              height: () => 1,
              width: () => 1,
              canPlace: () => true,
              placeAt: jest.fn()
            }
          ],
          displacement: 2,
          minSize: 1,
          height: 1,
          width: 1
        }),
        addToGrid: jest.fn(),
        placeVariant: jest.fn()
      },
      {
        cells: [3, 4],
        letter: 'B',
        shape: () => ({
          placeables: () => [
            {
              height: () => 1,
              width: () => 1,
              canPlace: () => true,
              placeAt: jest.fn()
            }
          ],
          displacement: 3,
          minSize: 1,
          height: 1,
          width: 1
        }),
        addToGrid: jest.fn(),
        placeVariant: jest.fn()
      }
    ]
    const result = waters.attemptToPlaceShips(ships, true, jest.fn(), jest.fn())
    expect(result).toBe(true)
  })

  it.skip('attemptToPlaceShips returns false if any ship not placed', () => {
    const ships = [
      {
        cells: null,
        letter: 'A',
        shape: () => ({
          placeables: () => [
            { height: () => 1, width: () => 1, canPlace: () => true }
          ],
          displacement: 3,

          minSize: 1
        }),
        minSize: 1,
        addToGrid: jest.fn(),
        placeVariant: jest.fn()
      },
      {
        cells: [3, 4],
        letter: 'B',
        shape: () => ({
          placeables: () => [
            { height: () => 1, width: () => 1, canPlace: () => true }
          ],
          displacement: 3,

          minSize: 1
        }),
        minSize: 1,
        addToGrid: jest.fn(),
        placeVariant: jest.fn()
      }
    ]
    let result
    try {
      result = waters.attemptToPlaceShips(ships, true, jest.fn(), jest.fn())
    } catch (e) {
      expect(e.message).toMatch('No shape for letter A')
      result = false
    }
    expect(result).toBe(false)
  })

  it('autoPlace2 returns true if placement successful', () => {
    waters.attemptToPlaceShips = jest.fn(() => true)
    expect(waters.autoPlace2()).toBe(true)
  })

  it('autoPlace returns true if placement successful', () => {
    waters.attemptToPlaceShips = jest.fn(() => true)
    expect(waters.autoPlace()).toBe(true)
  })

  describe('loadForEdit', () => {
    it('loadForEdit initializes ships from createCandidateShips when ships array is empty', () => {
      // Create a waters instance with empty ships
      const emptyWaters = new Waters(mockUI)
      emptyWaters.ships = []

      // Mock createCandidateShips to return it ships
      const candidateShips = [
        { cells: [1, 2], letter: 'A', shape: () => ({ displacement: 2 }) },
        { cells: [3, 4], letter: 'B', shape: () => ({ displacement: 3 }) }
      ]
      emptyWaters.createCandidateShips = jest.fn(() => candidateShips)

      // Mock autoPlace to avoid real placement logic
      emptyWaters.autoPlace = jest.fn()

      // Call loadForEdit with a map that has no example ships
      const mockMap = { example: null }
      emptyWaters.loadForEdit(mockMap)

      // Verify ships were initialized
      expect(emptyWaters.ships).toBe(candidateShips)
      expect(emptyWaters.createCandidateShips).toHaveBeenCalled()
    })

    it('loadForEdit does not reinitialize ships if ships array already has ships', () => {
      waters.createCandidateShips = jest.fn()
      waters.autoPlace = jest.fn()
      waters.placeMatchingShips = jest.fn()

      const mockMap = { example: null }
      waters.loadForEdit(mockMap)

      // Since ships is already populated, createCandidateShips should not be called
      expect(waters.createCandidateShips).not.toHaveBeenCalled()
    })

    it('loadForEdit calls placeMatchingShips when map.example exists', () => {
      waters.createCandidateShips = jest.fn()
      waters.placeMatchingShips = jest.fn(() => [])
      waters.resetShipCells = jest.fn()

      const mockMap = {
        example: {
          ships: [
            { cells: [1, 2], letter: 'A' },
            { cells: [3, 4], letter: 'B' }
          ]
        }
      }

      waters.loadForEdit(mockMap)

      // placeMatchingShips should be called with the map.example
      expect(waters.placeMatchingShips).toHaveBeenCalledWith(
        mockMap.example,
        expect.any(Function)
      )
    })

    it('loadForEdit calls autoPlace when map.example is null', () => {
      waters.createCandidateShips = jest.fn()
      waters.autoPlace = jest.fn()
      waters.resetShipCells = jest.fn()

      const mockMap = { example: null }

      waters.loadForEdit(mockMap)

      // autoPlace should be called when there's no example
      expect(waters.autoPlace).toHaveBeenCalled()
    })

    it('loadForEdit logs when ships are not matched', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      waters.createCandidateShips = jest.fn()
      waters.resetShipCells = jest.fn()

      // Mock placeMatchingShips to return unmatched ships
      const unmatchedShips = [{ cells: [5, 6], letter: 'C' }]
      waters.placeMatchingShips = jest.fn(() => unmatchedShips)

      const mockMap = {
        example: {
          ships: [{ cells: [1, 2], letter: 'A' }]
        }
      }

      waters.loadForEdit(mockMap)

      // Check that console.log was called with unmatched count
      expect(consoleSpy).toHaveBeenCalledWith('1 ships not matched')

      consoleSpy.mockRestore()
    })
  })

  describe('load', () => {
    it('load initializes ships from createCandidateShips when ships array is empty', () => {
      // Create a waters instance with empty ships
      const emptyWaters = new Waters(mockUI)
      emptyWaters.ships = []

      // Mock createCandidateShips to return it ships
      const candidateShips = [
        {
          id: 1,
          cells: [1, 2],
          letter: 'A',
          shape: () => ({ displacement: 2 }),
          weapons: {},
          variant: 0
        },
        {
          id: 2,
          cells: [3, 4],
          letter: 'B',
          shape: () => ({ displacement: 3 }),
          weapons: {},
          variant: 0
        }
      ]
      emptyWaters.createCandidateShips = jest.fn(() => candidateShips)

      // Mock autoPlace to avoid real placement logic
      emptyWaters.autoPlace = jest.fn()

      // Call load with null, which should initialize ships
      emptyWaters.load(null)

      // Verify ships were initialized
      expect(emptyWaters.ships).toBe(candidateShips)
      expect(emptyWaters.createCandidateShips).toHaveBeenCalled()
    })

    it('load handles null placedShips gracefully', () => {
      const emptyWaters = new Waters(mockUI)
      emptyWaters.ships = []

      const candidateShips = [
        {
          id: 1,
          cells: [],
          letter: 'A',
          shape: () => ({ displacement: 2 }),
          weapons: {},
          variant: 0
        }
      ]
      emptyWaters.createCandidateShips = jest.fn(() => candidateShips)
      emptyWaters.autoPlace = jest.fn()

      // Mock localStorage to return null
      const localStorageMock = {
        setItem: jest.fn(),
        getItem: jest.fn(() => null),
        removeItem: jest.fn(),
        clear: jest.fn()
      }
      Object.defineProperty(globalThis, 'localStorage', {
        value: localStorageMock,
        configurable: true
      })

      // Call load with null
      emptyWaters.load(null)

      // Should call autoPlace when no placedShips data
      expect(emptyWaters.autoPlace).toHaveBeenCalled()
    })

    it('load calls placeMatchingShips when map.example has placed ships', () => {
      waters.createCandidateShips = jest.fn()
      waters.placeMatchingShips = jest.fn(() => [])
      waters.resetShipCells = jest.fn()

      // Mock localStorage with placed ships data matching current map
      const currentMapTitle = bh.map.title
      const localStorageMock = {
        setItem: jest.fn(),
        getItem: jest.fn(() =>
          JSON.stringify({
            map: currentMapTitle,
            ships: [
              { id: 1, cells: [1, 2], letter: 'A', weapons: {}, variant: 0 }
            ]
          })
        ),
        removeItem: jest.fn(),
        clear: jest.fn()
      }
      Object.defineProperty(globalThis, 'localStorage', {
        value: localStorageMock,
        configurable: true
      })

      // Call load
      waters.load(null)

      // Should call placeMatchingShips with data
      expect(waters.placeMatchingShips).toHaveBeenCalled()
    })

    it('load calls autoPlace when placedShips map does not match current map', () => {
      const emptyWaters = new Waters(mockUI)
      emptyWaters.ships = []

      const candidateShips = [
        {
          id: 1,
          cells: [],
          letter: 'A',
          shape: () => ({ displacement: 2 }),
          weapons: {},
          variant: 0
        }
      ]
      emptyWaters.createCandidateShips = jest.fn(() => candidateShips)
      emptyWaters.autoPlace = jest.fn()

      // Mock localStorage with different map data
      const localStorageMock = {
        setItem: jest.fn(),
        getItem: jest.fn(() =>
          JSON.stringify({
            map: 'DifferentMap',
            ships: []
          })
        ),
        removeItem: jest.fn(),
        clear: jest.fn()
      }
      Object.defineProperty(globalThis, 'localStorage', {
        value: localStorageMock,
        configurable: true
      })

      // Call load
      emptyWaters.load(null)

      // Should call autoPlace since map doesn't match
      expect(emptyWaters.autoPlace).toHaveBeenCalled()
    })
  })
})
