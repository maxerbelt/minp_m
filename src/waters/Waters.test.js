/**
 * @jest-environment jsdom
 *
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

/**\n * Mock UI object for testing game interactions.\n * Provides Jest mock functions for all UI operations needed by Waters class.\n *\n * @typedef {Object} MockUI\n * @property {jest.Mock} placement - Mock placement callback\n * @property {jest.Mock} placeTally - Mock tally update\n * @property {jest.Mock} displayShipInfo - Mock ship info display\n * @property {jest.Mock} clearPlaceVisuals - Mock visual clear for placement\n * @property {jest.Mock} clearVisuals - Mock general visual clear\n * @property {Object} board - Mock board DOM element with classList and children\n * @property {jest.Mock} displayFleetSunk - Mock sunk fleet display\n * @property {jest.Mock} displaySurround - Mock surround display\n * @property {jest.Mock} cellHit - Mock cell hit callback\n * @property {jest.Mock} cellMiss - Mock cell miss callback\n * @property {jest.Mock} cellSunkAt - Mock cell sunk at callback\n * @property {jest.Mock} gridCellAt - Mock cell lookup by coordinates\n * @property {Object} trayManager - Mock ship tray manager\n * @property {jest.Mock} removeDragShip - Mock drag removal\n * @property {jest.Mock} cellSize - Mock cell size getter\n * @property {jest.Mock} surroundCells - Mock surround cells\n * @property {jest.Mock} surroundCellElement - Mock surround cell element\n * @property {jest.Mock} makeDroppable - Mock draggable setup\n * @property {jest.Mock} reset - Mock reset callback\n * @property {jest.Mock} buildBoard - Mock board construction\n * @property {jest.Mock} buildTrays - Mock tray construction\n * @property {jest.Mock} showStatus - Mock status display\n * @property {jest.Mock} showTips - Mock tips display\n * @property {jest.Mock} hideTips - Mock tips hiding\n * @property {jest.Mock} displayInfo - Mock info display\n * @property {jest.Mock} showTransformBtns - Mock transform buttons show\n * @property {jest.Mock} hideTransformBtns - Mock transform buttons hide\n * @property {jest.Mock} showTestBtns - Mock test buttons show\n * @property {jest.Mock} hideTestBtns - Mock test buttons hide\n * @property {jest.Mock} standardPanels - Mock standard panels\n * @property {Object} newPlacementBtn - Mock new placement button\n * @property {Object} testBtn - Mock test button\n * @property {Object} seekBtn - Mock seek button\n * @property {Object} stopBtn - Mock stop button\n * @property {Object} score - Mock score display system\n */
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
          addToGrid: jest.fn()
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
          addToGrid: jest.fn()
        }
      ]
      // @ts-ignore - Mocking Ship type for testing
      const result = waters.attemptToPlaceShips(ships, jest.fn())
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
          addToGrid: jest.fn()
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
          addToGrid: jest.fn()
        }
      ]
      let result
      try {
        // @ts-ignore - Mocking Ship type for testing
        result = waters.attemptToPlaceShips(ships, jest.fn(), jest.fn())
      } catch (e) {
        // @ts-ignore - e is unknown in catch block
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
      expect(
        loadOut.weaponSystems?.some(wps => wps.weapon.letter === 'G')
      ).toBe(false)
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

  describe('loadForEdit', () => {
    it('loadForEdit initializes ships from createCandidateShips when ships array is empty', () => {
      // Create a waters instance with empty ships
      const emptyWaters = new Waters(mockUI)
      emptyWaters.ships = []

      // Mock setMap to avoid real initialization
      // @ts-ignore jest mock type issue
      emptyWaters.setMap = jest.fn()

      // Mock autoPlace to avoid real placement logic
      // @ts-ignore jest mock type issue
      emptyWaters.autoPlace = jest.fn()

      // Call loadForEdit with a map that has no example ships
      const mockMap = { example: null }
      emptyWaters.loadForEdit(mockMap)

      // Verify autoPlace was called when example is null
      expect(emptyWaters.autoPlace).toHaveBeenCalled()
    })

    it('loadForEdit does not reinitialize ships if ships array already has ships', () => {
      // @ts-ignore jest mock type issue
      waters.autoPlace = jest.fn()
      // @ts-ignore jest mock type issue
      waters.placeMatchingShips = jest.fn(() => [])
      // @ts-ignore jest mock type issue
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

    it('loadForEdit calls placeMatchingShips when map.example exists', () => {
      // @ts-ignore jest mock type issue
      waters.placeMatchingShips = jest.fn(() => [])
      // @ts-ignore jest mock type issue
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
      // @ts-ignore jest mock type issue
      waters.autoPlace = jest.fn()
      // @ts-ignore jest mock type issue
      waters.resetShipCells = jest.fn()

      const mockMap = { example: null }

      waters.loadForEdit(mockMap)

      // autoPlace should be called when there's no example
      expect(waters.autoPlace).toHaveBeenCalled()
    })

    it('loadForEdit logs when ships are not matched', () => {
      // @ts-ignore jest mock type issue
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      // @ts-ignore jest mock type issue
      waters.resetShipCells = jest.fn()

      // Mock placeMatchingShips to return unmatched ships
      const unmatchedShips = [{ cells: [5, 6], letter: 'C' }]
      // @ts-ignore jest mock type issue
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

      // Mock autoPlace to avoid real placement logic
      // @ts-ignore jest mock type issue
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

      // Call load with undefined
      emptyWaters.load(undefined)

      // Verify autoPlace was called since no placedShips data exists
      expect(emptyWaters.autoPlace).toHaveBeenCalled()
    })

    it('load handles null placedShips gracefully', () => {
      const emptyWaters = new Waters(mockUI)
      emptyWaters.ships = []

      // @ts-ignore jest mock type issue
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

      // Call load with undefined
      emptyWaters.load(undefined)

      // Should call autoPlace when no placedShips data
      expect(emptyWaters.autoPlace).toHaveBeenCalled()
    })

    it('load calls placeMatchingShips when map.example has placed ships', () => {
      // @ts-ignore jest mock type issue
      waters.placeMatchingShips = jest.fn(() => [])
      // @ts-ignore jest mock type issue
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
      waters.load(undefined)

      // Should call placeMatchingShips with data
      expect(waters.placeMatchingShips).toHaveBeenCalled()
    })

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
      emptyWaters.load(undefined)

      // Should call autoPlace since map doesn't match
      expect(emptyWaters.autoPlace).toHaveBeenCalled()
    })
  })

  /**
   * Ship Placement Regression Tests
   * Tests for bug fix: Waters.js line 205 and 223 were using .bind() without calling functions.
   * This caused tempPlacement to remain undefined, causing "Cannot read properties of undefined" errors.
   *
   * Bug Details:
   * - Line 205: this.resetPlacementStore.bind(this) - Created bound function but didn't call it
   * - Line 223: this.handlePlacementFailure.bind(this, ...) - Same issue
   *
   * Fix: Changed to actual function calls:
   * - Line 205: this.resetPlacementStore()
   * - Line 223: this.handlePlacementFailure(onPlacementReset)
   */
  describe('Ship Placement Regression Tests', () => {
    /**
     * Test that resetPlacementStore() is called (not just bound).
     * Ensures tempPlacement array is initialized before storeShipPlacement is called.
     * Regression test for bug where .bind() was used without calling the function.
     *
     * @returns {void}
     */
    it('resetPlacementStore is called during attemptToPlaceShips', () => {
      // Spy on resetPlacementStore
      // @ts-ignore - Private method for testing
      const resetSpy = jest.spyOn(waters, 'resetPlacementStore')

      // Create a mock shipCellGrid that returns false (failed placement)
      waters.shipCellGrid.attemptToPlaceShips = jest.fn(
        (_ships, _callback) => false
      )

      const onPlacementReset = jest.fn()
      waters.attemptToPlaceShips([], undefined, onPlacementReset)

      // Verify resetPlacementStore was called (not just bound)
      expect(resetSpy).toHaveBeenCalled()

      resetSpy.mockRestore()
    })

    /**
     * Test that tempPlacement is properly initialized as an array.
     * Ensures tempPlacement exists and is an array before storeShipPlacement is called.
     *
     * @returns {void}
     */
    it('tempPlacement is initialized as an empty array', () => {
      // Call resetPlacementStore to initialize tempPlacement
      // @ts-ignore - Private method for testing
      waters.resetPlacementStore()

      // Verify tempPlacement is initialized as an array
      expect(Array.isArray(waters.tempPlacement)).toBe(true)
      expect(waters.tempPlacement).toEqual([])
    })

    /**
     * Test that storeShipPlacement doesn't throw when tempPlacement is initialized.
     * Regression test for "Cannot read properties of undefined (reading 'push')" error.
     *
     * @returns {void}
     */
    it('storeShipPlacement can be called safely without undefined error', () => {
      // Initialize tempPlacement
      // @ts-ignore - Private method for testing
      waters.resetPlacementStore()

      // Create mock ship
      // @ts-ignore - Mocking Ship type for testing
      const mockShip = { letter: 'A', cells: [1, 2] }
      const mockPlacedCells = [
        [0, 0],
        [0, 1]
      ]

      // Should not throw
      expect(() => {
        // @ts-ignore - Private method for testing
        waters.storeShipPlacement(mockPlacedCells, mockShip)
      }).not.toThrow()

      // Verify placement was stored
      expect(waters.tempPlacement).toHaveLength(1)
      expect(waters.tempPlacement?.[0]).toEqual({
        placedCells: mockPlacedCells,
        ship: mockShip
      })
    })

    /**
     * Test that storeShipPlacement accumulates multiple placements.
     * Ensures tempPlacement can handle multiple calls without errors.
     *
     * @returns {void}
     */
    it('storeShipPlacement accumulates multiple ship placements', () => {
      // Initialize tempPlacement
      // @ts-ignore - Private method for testing
      waters.resetPlacementStore()

      // Store first ship
      // @ts-ignore - Mocking Ship type for testing
      const ship1 = { letter: 'A', cells: [1, 2] }
      const cells1 = [
        [0, 0],
        [0, 1]
      ]
      // @ts-ignore - Private method for testing
      waters.storeShipPlacement(cells1, ship1)

      // Store second ship
      // @ts-ignore - Mocking Ship type for testing
      const ship2 = { letter: 'B', cells: [3, 4, 5] }
      const cells2 = [
        [1, 0],
        [1, 1],
        [1, 2]
      ]
      // @ts-ignore - Private method for testing
      waters.storeShipPlacement(cells2, ship2)

      // Verify both placements were stored
      expect(waters.tempPlacement).toHaveLength(2)
      expect(waters.tempPlacement).toHaveLength(2)
      expect(waters.tempPlacement?.[0]?.ship.letter).toBe('A')
      expect(waters.tempPlacement?.[1]?.ship.letter).toBe('B')
    })

    /**
     * Test that handlePlacementFailure is called (not just bound) when placement fails.
     * Ensures onPlacementReset callback is invoked when placement fails.
     * Regression test for bug where .bind() was used without calling the function.
     *
     * @returns {void}
     */
    it('handlePlacementFailure is called when attemptToPlaceShips fails', () => {
      // Spy on handlePlacementFailure
      const failureSpy = jest.spyOn(waters, 'handlePlacementFailure')

      // Create a mock shipCellGrid that returns false (failed placement)
      waters.shipCellGrid.attemptToPlaceShips = jest.fn(
        (_ships, _callback) => false
      )

      const onPlacementReset = jest.fn()
      const result = waters.attemptToPlaceShips([], undefined, onPlacementReset)

      // Verify handlePlacementFailure was called (not just bound)
      expect(failureSpy).toHaveBeenCalledWith(onPlacementReset)

      // Verify the result is false (placement failed)
      expect(result).toBe(false)

      failureSpy.mockRestore()
    })

    /**
     * Test that tempPlacement is reset between placement attempts.
     * Ensures old placements don't carry over to new attempts.
     *
     * @returns {void}
     */
    it('tempPlacement is reset between placement attempts', () => {
      // First attempt - store a placement
      // @ts-ignore - Private method for testing
      waters.resetPlacementStore()
      // @ts-ignore - Private method for testing
      waters.storeShipPlacement([[[0, 0]]], { letter: 'A', cells: [1] })
      expect(waters.tempPlacement).toHaveLength(1)

      // Second attempt - reset and store new placement
      // @ts-ignore - Private method for testing
      waters.resetPlacementStore()
      expect(waters.tempPlacement).toHaveLength(0)
      // @ts-ignore - Private method for testing
      waters.storeShipPlacement([[[1, 0]]], { letter: 'B', cells: [2] })
      expect(waters.tempPlacement).toHaveLength(1)
      expect(waters.tempPlacement?.[0]?.ship.letter).toBe('B')
    })

    /**
     * Test that handlePlacementFailure properly clears ship cells on failure.
     * Ensures UI is updated correctly when placement fails.
     *
     * @returns {void}
     */
    it('handlePlacementFailure calls resetShipCells', () => {
      // Spy on resetShipCells
      const resetCellsSpy = jest.spyOn(waters, 'resetShipCells')

      // Call handlePlacementFailure
      const onPlacementReset = jest.fn()
      waters.handlePlacementFailure(onPlacementReset)

      // Verify resetShipCells was called
      expect(resetCellsSpy).toHaveBeenCalled()

      resetCellsSpy.mockRestore()
    })
  })
})
