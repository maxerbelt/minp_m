/**
 * @jest-environment jsdom
 */

/**
 * Waters class unit tests
 *
 * Test suite for core game mechanics including:
 * - Ship placement and storage
 * - Load out creation and weapon selection
 * - Game state initialization and editing
 */

import { jest } from '@jest/globals'
import { Waters } from './Waters.js'
import { ShipCellGrid } from '../grid/rectangle/ShipCellGrid.js'
import { bh } from '../terrains/all/js/bh.js'

/**
 * @typedef {Object} MockTrayManager
 * @property {jest.Mock<any>} resetTrays - Reset ship trays
 * @property {jest.Mock<any>} showShipTrays - Show ship trays
 * @property {jest.Mock<any>} hideShipTrays - Hide ship trays
 * @property {jest.Mock<any>} getTrayItem - Get tray item by key
 */

/**
 * @typedef {Object} MockClassList
 * @property {jest.Mock<any>} add - Add CSS class
 * @property {jest.Mock<any>} remove - Remove CSS class
 */

/**
 * @typedef {Object} MockButton
 * @property {MockClassList} classList - CSS class list
 */

/**
 * @typedef {Object} MockScore
 * @property {jest.Mock<any>} display - Display score
 * @property {jest.Mock<any>} buildTally - Build score tally
 * @property {MockButton} shotsLabel - Shots label element
 * @property {MockButton} hitsLabel - Hits label element
 * @property {MockButton} sunkLabel - Sunk ships label element
 * @property {MockButton} revealsLabel - Reveals label element
 * @property {MockButton} hintsLabel - Hints label element
 * @property {MockButton} placedLabel - Placed ships label element
 */

/**
 * Mock UI object for testing game interactions.
 * Provides Jest mock functions for all UI operations needed by Waters class.
 *
 * @typedef {Object} MockUI
 * @property {jest.Mock<any>} placement - Placement callback
 * @property {jest.Mock<any>} placeTally - Tally update callback
 * @property {jest.Mock<any>} displayShipInfo - Display ship information
 * @property {jest.Mock<any>} clearPlaceVisuals - Clear placement visuals
 * @property {jest.Mock<any>} clearVisuals - Clear general visuals
 * @property {Object} board - Board DOM element with classList
 * @property {jest.Mock<any>} displayFleetSunk - Display sunk fleet
 * @property {jest.Mock<any>} displaySurround - Display surrounding cells
 * @property {jest.Mock<any>} cellHit - Cell hit callback
 * @property {jest.Mock<any>} cellMiss - Cell miss callback
 * @property {jest.Mock<any>} cellSunkAt - Cell sunk callback
 * @property {jest.Mock<any>} gridCellAt - Get grid cell at coordinates
 * @property {MockTrayManager} trayManager - Ship tray manager
 * @property {jest.Mock<any>} removeDragShip - Remove dragged ship
 * @property {jest.Mock<any>} cellSize - Get cell size in pixels
 * @property {jest.Mock<any>} surroundCells - Get surrounding cells
 * @property {jest.Mock<any>} surroundCellElement - Get surround cell element
 * @property {jest.Mock<any>} makeDroppable - Make element droppable
 * @property {jest.Mock<any>} reset - Reset UI
 * @property {jest.Mock<any>} buildBoard - Build game board
 * @property {jest.Mock<any>} buildTrays - Build ship trays
 * @property {jest.Mock<any>} showStatus - Show status message
 * @property {jest.Mock<any>} showTips - Show help tips
 * @property {jest.Mock<any>} hideTips - Hide help tips
 * @property {jest.Mock<any>} displayInfo - Display information
 * @property {jest.Mock<any>} showTransformBtns - Show transform buttons
 * @property {jest.Mock<any>} hideTransformBtns - Hide transform buttons
 * @property {jest.Mock<any>} showTestBtns - Show test buttons
 * @property {jest.Mock<any>} hideTestBtns - Hide test buttons
 * @property {jest.Mock<any>} standardPanels - Standard UI panels
 * @property {MockButton} newPlacementBtn - New placement button
 * @property {MockButton} testBtn - Test button
 * @property {MockButton} seekBtn - Seek button
 * @property {MockButton} stopBtn - Stop button
 * @property {MockScore} score - Score display system
 */
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
  trayManager: {
    resetTrays: jest.fn(),
    showShipTrays: jest.fn(),
    hideShipTrays: jest.fn(),
    getTrayItem: jest.fn()
  },
  removeDragShip: jest.fn(),
  cellSize: jest.fn(),
  surroundCells: jest.fn(),
  surroundCellElement: jest.fn(),
  makeDroppable: jest.fn(),
  reset: jest.fn(),
  buildBoard: jest.fn(),
  buildTrays: jest.fn(),
  showStatus: jest.fn(),
  showTips: jest.fn(),
  hideTips: jest.fn(),
  displayInfo: jest.fn(),

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
  /** @type {Waters} Test instance of Waters class */
  let waters

  /**
   * Setup test fixture before each test.
   * Initializes a Waters instance with mock UI and creates test ships
   * with specific cells, letters, and attributes for consistent testing.
   *
   * Creates:
   * - Waters instance bound to mockUI
   * - Two test ships (A: 2 cells, B: 3 cells with sunk=true)
   * - ShipCellGrid with 2x2 cell structure
   *
   * @returns {void}
   */
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
    waters.shipCellGrid = new ShipCellGrid([
      [{ id: 1 }, { id: 2 }],
      [{ id: 3 }, { id: 4 }]
    ])
  })

  /**
   * Storage and Serialization test suite.
   * Tests persistence layer including storage keys and data serialization.
   */
  describe('Storage and Serialization', () => {
    /**
     * Test that storage key constant is correct.
     * Verifies internal storage key format for localStorage.
     *
     * @returns {void}
     */
    it('_getStorageKey returns correct string', () => {
      // @ts-ignore - Testing private method access
      expect(waters._getStorageKey()).toBe('geoffs-battleship.placed-ships')
    })

    /**
     * Test that placed ships data object has required properties.
     * Verifies getPlacedShipsData returns valid serialization structure.
     *
     * @returns {void}
     */
    it('getPlacedShipsData returns correct object', () => {
      const result = waters.getPlacedShipsData()
      expect(result).toHaveProperty('ships')
      expect(result).toHaveProperty('shipCellGrid')
      expect(result).toHaveProperty('map')
    })
  })

  /**
   * Source Hint Generation test suite.
   * Tests hint generation logic for multi-coordinate weapons.
   */
  describe('Source Hint Generation', () => {
    /**
     * Test hint generation returns default coordinates.
     * Verifies generateRandomSourceHint returns [0, 0] for testing.
     *
     * @returns {void}
     */
    it('generateRandomSourceHint returns default coordinates for testing', () => {
      // @ts-ignore - Mocking private property for testing
      waters.steps = { addHint: jest.fn() }
      // @ts-ignore - Mocking UI method for testing
      waters.UI.gridCellAt = jest.fn(() => ({ cell: 'mock' }))

      // @ts-ignore - Testing private method access
      const hint = waters.generateRandomSourceHint({ cells: [1, 2] }, null)

      expect(hint).toEqual([0, 0])
      // @ts-ignore - Accessing mocked property
      expect(waters.steps.addHint).not.toHaveBeenCalled()
    })
  })

  /**
   * Storage Operations test suite.
   * Tests localStorage integration and persistence.
   */
  describe('Storage Operations', () => {
    /**
     * Test that store() saves placed ships to localStorage.
     * Verifies serialization and persistence to browser storage.
     *
     * @returns {void}
     */
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

    /**
     * Test that attemptToPlaceShips returns true when all ships successfully placed.
     * Verifies automatic ship placement succeeds when ships can be positioned.
     *
     * @returns {void}
     */
    it.skip('attemptToPlaceShips returns true if all ships placed', () => {
      // @ts-ignore - Mock Ship objects for testing
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
      // @ts-ignore - Mock Ship objects don't match full Ship interface
      const result = waters.attemptToPlaceShips(ships, jest.fn())
      expect(result).toBe(true)
    })

    /**
     * Test that attemptToPlaceShips returns false when a ship cannot be placed.
     * Verifies automatic ship placement fails when ships lack valid placements.
     *
     * @returns {void}
     */
    it.skip('attemptToPlaceShips returns false if any ship not placed', () => {
      // @ts-ignore - Mock Ship objects for testing
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
        // @ts-ignore - Mock Ship objects don't match full Ship interface
        result = waters.attemptToPlaceShips(ships, jest.fn(), jest.fn())
      } catch (e) {
        expect(e.message).toMatch('No shape for letter A')
        result = false
      }
      expect(result).toBe(false)
    })

    /**
     * Test autoPlace2() success when placement succeeds.
     * Verifies wrapper method returns true on successful placement.
     *
     * @returns {void}
     */
    it('autoPlace2 returns true if placement successful', () => {
      // @ts-ignore - Mocking private method for testing
      waters.attemptToPlaceShips = jest.fn(() => true)
      expect(waters.autoPlace2()).toBe(true)
    })

    /**
     * Test autoPlace() success when placement succeeds.
     * Verifies wrapper method returns true on successful placement.
     *
     * @returns {void}
     */
    it('autoPlace returns true if placement successful', () => {
      // @ts-ignore - Mocking private method for testing
      waters.attemptToPlaceShips = jest.fn(() => true)
      expect(waters.autoPlace()).toBe(true)
    })
  })

  /**
   * displayAutoSelectWarning test suite.
   * Tests automatic weapon selection warning messages.
   */
  describe('displayAutoSelectWarning', () => {
    /**
     * Test warning displays using ship description when ship exists.
     * Verifies message format with ship-specific description.
     *
     * @returns {void}
     */
    it('displays a warning using ship description when currentShip exists', () => {
      // @ts-ignore - Mocking display method for testing
      waters.displayInfo = jest.fn()
      const currentShip = {
        shape: () => ({ descriptionText: 'the enemy ship' })
      }

      waters.displayAutoSelectWarning('Torpedo', currentShip)

      expect(waters.displayInfo).toHaveBeenCalledWith(
        'Auto-selected Torpedo, Click near the enemy ship to select a different Torpedo'
      )
    })

    /**
     * Test warning falls back to generic text when ship is undefined.
     * Verifies message format without ship-specific description.
     *
     * @returns {void}
     */
    it('falls back when currentShip is undefined', () => {
      // @ts-ignore - Mocking display method for testing
      waters.displayInfo = jest.fn()

      waters.displayAutoSelectWarning('Depth Charge', undefined)

      expect(waters.displayInfo).toHaveBeenCalledWith(
        'Auto-selected Depth Charge, Click near the ship to select a different Depth Charge'
      )
    })
  })

  /**
   * createLoadOut test suite.
   * Tests weapon loadout initialization and filtering.
   */
  describe('createLoadOut', () => {
    /**
     * Test that limited unattached weapons are skipped when terrain has no unattached weapons.
     * Verifies weapon filtering based on terrain configuration.
     *
     * @returns {void}
     */
    it('skips limited unattached weapons when terrain has no unattached weapons', () => {
      const map = {
        weapons: [
          { letter: 'S', isLimited: false },
          { letter: 'G', isLimited: true }
        ]
      }
      // @ts-ignore - Mock terrain getter
      const terrainSpy = jest.spyOn(bh, 'terrain', 'get').mockReturnValue({
        hasUnattachedWeapons: false
      })
      const loadOut = waters.createLoadOut(map, [])

      expect(loadOut.unattachedWeapons).toEqual([
        { letter: 'S', isLimited: false }
      ])
      expect(loadOut.weaponSystems.some(wps => wps.weapon.letter === 'G')).toBe(
        false
      )
      terrainSpy.mockRestore()
    })

    /**
     * Test that limited weapons are included in allWeaponSystems for display.
     * Verifies limited weapons appear in UI even if excluded from firing list.
     *
     * @returns {void}
     */
    it('adds limited weapons to allWeaponSystems for display even when not in unattachedWeapons', () => {
      const map = {
        weapons: [
          { letter: 'S', isLimited: false },
          { letter: 'G', isLimited: true }
        ]
      }
      // @ts-ignore - Mock terrain getter, skip TypeScript assertion
      const terrainSpy = jest.spyOn(bh, 'terrain', 'get').mockReturnValue({
        hasUnattachedWeapons: false
      })
      const loadOut = waters.createLoadOut(map, [])

      // Limited weapons should NOT be in unattachedWeapons for firing
      expect(loadOut.unattachedWeapons).toEqual([
        { letter: 'S', isLimited: false }
      ])

      // But limited weapons SHOULD be in allWeaponSystems for display
      const allLimitedWeapons = loadOut.getAllLimitedWeaponSystems()
      expect(allLimitedWeapons.some(wps => wps.weapon.letter === 'G')).toBe(
        true
      )
      expect(allLimitedWeapons.length).toBeGreaterThan(0)

      terrainSpy.mockRestore()
    })
  })

  /**
   * loadForEdit method test suite.
   * Tests ship loading and placement for map editing.
   */
  describe('loadForEdit', () => {
    /**
     * Test that loadForEdit initializes ships when array is empty.
     * Verifies automatic ship creation when no ships exist.
     *
     * @returns {void}
     */
    it('loadForEdit initializes ships from createCandidateShips when ships array is empty', () => {
      // Create a waters instance with empty ships
      const emptyWaters = new Waters(mockUI)
      emptyWaters.ships = []

      // Mock setMap to avoid real initialization
      // @ts-ignore - Mock private method for testing
      emptyWaters.setMap = jest.fn()

      // Mock autoPlace to avoid real placement logic
      // @ts-ignore - Mock private method for testing
      emptyWaters.autoPlace = jest.fn()

      // Call loadForEdit with a map that has no example ships
      const mockMap = { example: null }
      emptyWaters.loadForEdit(mockMap)

      // Verify autoPlace was called when example is null
      expect(emptyWaters.autoPlace).toHaveBeenCalled()
    })

    /**
     * Test that loadForEdit preserves existing ships.
     * Verifies ships are not reinitialized when already populated.
     *
     * @returns {void}
     */
    it('loadForEdit does not reinitialize ships if ships array already has ships', () => {
      // @ts-ignore - Mock private method for testing
      waters.autoPlace = jest.fn()
      // @ts-ignore - Mock private method for testing
      waters.placeMatchingShips = jest.fn(() => [])
      // @ts-ignore - Mock private method for testing
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

      // Since ships is already populated and map has example, placeMatchingShips should be called
      expect(waters.placeMatchingShips).toHaveBeenCalled()
      expect(waters.autoPlace).not.toHaveBeenCalled()
    })

    /**
     * Test that loadForEdit calls placeMatchingShips with example data.
     * Verifies matching ships are placed when example configuration exists.
     *
     * @returns {void}
     */
    it('loadForEdit calls placeMatchingShips when map.example exists', () => {
      // @ts-ignore - Mock private method for testing
      waters.placeMatchingShips = jest.fn(() => [])
      // @ts-ignore - Mock private method for testing
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

    /**
     * Test that loadForEdit calls autoPlace when no example exists.
     * Verifies automatic placement is triggered for null example data.
     *
     * @returns {void}
     */
    it('loadForEdit calls autoPlace when map.example is null', () => {
      // @ts-ignore - Mock private method for testing
      waters.autoPlace = jest.fn()
      // @ts-ignore - Mock private method for testing
      waters.resetShipCells = jest.fn()

      const mockMap = { example: null }

      waters.loadForEdit(mockMap)

      // autoPlace should be called when there's no example
      expect(waters.autoPlace).toHaveBeenCalled()
    })

    /**
     * Test that loadForEdit logs unmatched ships.
     * Verifies console log is called with count of unmatched ships.
     *
     * @returns {void}
     */
    it('loadForEdit logs when ships are not matched', () => {
      // @ts-ignore - Mock console for testing
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      // @ts-ignore - Mock private method for testing
      waters.resetShipCells = jest.fn()

      // Mock placeMatchingShips to return unmatched ships
      const unmatchedShips = [{ cells: [5, 6], letter: 'C' }]
      // @ts-ignore - Mock private method for testing
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

  /**
   * load method test suite.
   * Tests ship loading from localStorage and placement.
   */
  /**
   * load method test suite.
   * Tests ship loading from localStorage and placement.
   */
  describe('load', () => {
    /**
     * Test that load initializes ships when array is empty.
     * Verifies automatic ship creation when no ships exist and no saved data.
     *
     * @returns {void}
     */
    it('load initializes ships from createCandidateShips when ships array is empty', () => {
      // Create a waters instance with empty ships
      const emptyWaters = new Waters(mockUI)
      emptyWaters.ships = []

      // Mock autoPlace to avoid real placement logic
      // @ts-ignore - Mock private method for testing
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

      // Verify autoPlace was called since no placedShips data exists
      expect(emptyWaters.autoPlace).toHaveBeenCalled()
    })

    /**
     * Test that load gracefully handles null placedShips.
     * Verifies null data doesn't cause errors and triggers autoPlace.
     *
     * @returns {void}
     */
    it('load handles null placedShips gracefully', () => {
      const emptyWaters = new Waters(mockUI)
      emptyWaters.ships = []

      // @ts-ignore - Mock private method for testing
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

    /**
     * Test that load places matching ships from saved data.
     * Verifies placeMatchingShips is called when saved data matches current map.
     *
     * @returns {void}
     */
    it('load calls placeMatchingShips when map.example has placed ships', () => {
      // @ts-ignore - Mock private method for testing
      waters.placeMatchingShips = jest.fn(() => [])
      // @ts-ignore - Mock private method for testing
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

    /**
     * Test that load calls autoPlace when saved map doesn't match.
     * Verifies automatic placement when saved data is for different map.
     *
     * @returns {void}
     */
    it('load calls autoPlace when placedShips map does not match current map', () => {
      const emptyWaters = new Waters(mockUI)
      emptyWaters.ships = []

      // @ts-ignore jest mock type issue
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
