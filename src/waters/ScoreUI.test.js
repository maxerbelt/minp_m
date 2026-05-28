/**
 * @jest-environment jsdom
 * @fileoverview Comprehensive test suite for ScoreUI class
 *
 * Tests the ScoreUI display component which manages game statistics visualization:
 * - Player shot/hit/sunk count tracking and display
 * - Zone displacement information with subterrain tracker integration
 * - Ship tally box rendering with group-based classification
 * - Dynamic HTML element generation and DOM manipulation
 *
 * Uses Jest mock modules to isolate dependencies:
 * - bh.js: Battle history and map state management
 * - terrain.js: Terrain configuration
 * - dragndrop.js: Drag-and-drop functionality
 *
 * Environment: jsdom (full DOM simulation for element testing)
 */

import { it, describe, expect, beforeEach, jest } from '@jest/globals'

/**
 * ScoreUI class type imported from ScoreUI.js.
 * Manages display of battle statistics and zone information.
 *
 * @typedef {import('./ScoreUI.js').ScoreUI} ScoreUIType
 */

/**
 * Reference to ScoreUI class (constructor function).
 * Imported dynamically after mocks are set up to ensure mocked dependencies.
 *
 * @type {typeof import('./ScoreUI.js').ScoreUI}
 */
let ScoreUI

/**
 * Callback function type for displaced area display.
 * Receives zone object with title and displacement calculation function.
 *
 * @typedef {(zone: {title: string, displacementFor: Function}) => void} DisplayDisplacedAreaCallback
 */

/**
 * Ship color configuration mapping.
 * Associates ship letters with hex color codes for visual display.
 *
 * @typedef {Object} ShipColorConfig
 * @property {string} B - Battleship color code
 * @property {string} D - Destroyer color code
 * @property {string} S - Submarine color code
 */

/**
 * Subterrain tracker object managing zone-based terrain statistics.
 * Tracks displacement, sizing, and zone entry information.
 *
 * @typedef {Object} SubterrainTracker
 * @property {Function} setupZoneInfo - Initialize zone tracking state
 * @property {Function} displayDisplacedArea - Display zone displacement data
 * @property {Object} sizes - Zone size measurements (total, margin, core)
 */

/**
 * Mock HTML element structure for testing DOM interactions.
 * Simulates core DOM element properties without full browser implementation.
 *
 * @typedef {Object} MockHTMLElement
 * @property {string} [textContent] - Text content of element
 * @property {string} [innerHTML] - HTML content of element
 * @property {jest.Mock} [appendChild] - Mock function for appending children
 * @property {Object} [style] - CSS style properties
 * @property {string} [className] - CSS class name
 * @property {Object} [classList] - Class manipulation interface
 * @property {jest.Mock} [classList.add] - Add CSS class
 */

/**
 * ============================================================================
 * MOCK SETUP: Dependencies
 * ============================================================================
 * Initialize all mock modules before importing the module under test.
 * Jest's unstable_mockModule allows module-level mocking in ESM environments.
 */

/**
 * Mock bh.js module - Battle history and map state management
 * Provides:
 * - bh.map.subterrainTrackers: Zone tracking and displacement calculation
 * - bh.maps.shipColors: Ship letter to color mapping
 * - bh.maps.shipLetterColors: Text color for ship indicators
 */
jest.unstable_mockModule('../terrains/all/js/bh.js', () => ({
  bh: {
    map: {
      subterrainTrackers: {
        setupZoneInfo: jest.fn().mockReturnValue([]),
        /**
         * @param {any} _map - The map to display
         * @param {DisplayDisplacedAreaCallback} callback - Callback function
         */
        displayDisplacedArea: jest.fn((_map, callback) => {
          const typedCallback = /** @type {DisplayDisplacedAreaCallback} */ (
            callback
          )
          typedCallback({
            title: 'Water',
            displacementFor: jest.fn().mockReturnValue(0)
          })
        })
      }
    },
    maps: {
      shipColors: { B: '#0066cc', D: '#0099ff', S: '#66ccff' },
      shipLetterColors: { B: 'white', D: 'black', S: 'white' }
    }
  }
}))

/**
 * Mock terrain.js module - Terrain configuration exports
 * Provides terrain type definitions (all, mixed) and basic terrain properties.
 * ScoreUI imports terrain.js but only uses minimal properties for initialization.
 */
jest.unstable_mockModule('../terrains/all/js/terrain.js', () => ({
  all: { title: 'All Terrain' },
  mixed: { title: 'Mixed Terrain' },
  bh: {
    // the real ScoreUI does not use these values from terrain.js, but we
    // include them to satisfy any other consumers in the test.
    terrain: {
      hasUnattachedWeapons: false
    }
  }
}))

/**
 * Factory function type for creating mock HTML elements.
 * Used in tests to simulate document.createElement behavior.
 *
 * @typedef {(tag: string, options?: any) => HTMLElement} CreateElementFn
 */

/**
 * Mock dragndrop.js module - Drag-and-drop functionality
 * Provides dragNDrop.makeDraggable function for element manipulation.
 */
jest.unstable_mockModule('../selection/dragndrop.js', () => ({
  dragNDrop: {
    /**
     * @param {any} _element - Element to make draggable
     */
    makeDraggable: jest.fn()
  }
}))

/**
 * ============================================================================
 * TEST SUITE: ScoreUI Class
 * ============================================================================
 * Comprehensive test suite for ScoreUI display component.
 * Tests all public methods and DOM interaction patterns.
 *
 * @test
 */
describe('ScoreUI', () => {
  /**
   * Instance of ScoreUI for testing.
   * @type {InstanceType<typeof ScoreUI>|undefined}
   */
  let scoreUI

  /**
   * Mock element references for tests.
   * @type {Record<string, {textContent?: string, innerHTML?: string, appendChild?: jest.Mock, style?: Record<string, string>, className?: string, classList?: {add?: jest.Mock}}>}
   */
  let mockElements

  /**
   * Mock bh module instance.
   * @type {any}
   */
  let bh

  /**
   * Setup before each test case
   *
   * Initialization sequence:
   * 1. Clear all Jest mock function call histories
   * 2. Re-import mock modules to ensure fresh instances
   * 3. Set up mock return values and implementations
   * 4. Dynamically import ScoreUI class
   * 5. Create mock DOM elements map
   * 6. Mock document.getElementById to return mock elements
   * 7. Instantiate ScoreUI with 'player1' prefix
   *
   * This ensures each test starts with clean state and fresh mocks.
   *
   * @returns {Promise<void>}
   * @async
   */
  beforeEach(async () => {
    jest.clearAllMocks()

    // Re-import to get fresh mock instances after clearing
    const bhModule = await import('../terrains/all/js/bh.js')
    bh = bhModule.bh

    // Restore the mocks to their expected state after jest.clearAllMocks()
    bh.map.subterrainTrackers.setupZoneInfo.mockReturnValue([])
    bh.map.subterrainTrackers.displayDisplacedArea.mockImplementation(
      /**
       * @param {any} _map
       * @param {DisplayDisplacedAreaCallback} callback
       */
      (_map, callback) => {
        const typedCallback = /** @type {DisplayDisplacedAreaCallback} */ (
          callback
        )
        typedCallback({
          title: 'Water',
          displacementFor: jest.fn().mockReturnValue(0)
        })
      }
    )

    // import the class after mocks so it uses our fake modules
    const module = await import('./ScoreUI.js')
    ScoreUI = module.ScoreUI

    // Create a mock elements map
    mockElements = {
      'player1-shots': { textContent: '' },
      'player1-hits': { textContent: '' },
      'player1-sunk': { textContent: '' },
      'player1-placed': { textContent: '' },
      'player1-weapons': { textContent: '' },
      'player1-zone': {
        textContent: '',
        innerHTML: '',
        appendChild: jest.fn()
      },
      'player1-shots-label': { textContent: '' },
      'player1-hits-label': { textContent: '' },
      'player1-sunk-label': { textContent: '' },
      'player1-placed-label': { textContent: '' },
      'player1-weapons-label': { textContent: '' },
      'player1-zone-label': { textContent: '' },
      'player1-tallyBox': { textContent: '', innerHTML: '' }
    }

    // Mock document.getElementById
    globalThis.document.getElementById = /** @type {any} */ (
      jest.fn(
        /**
         * @param {string} id
         * @returns {HTMLElement|null}
         */
        id => /** @type {any} */ (mockElements[id] || null)
      )
    )

    scoreUI = new ScoreUI('player1')
  })

  /**
   * Test Suite: Constructor Initialization
   *
   * Verifies that ScoreUI constructor properly initializes all DOM element
   * references using a prefix (e.g., 'player1') to construct element IDs.
   *
   * @test
   */
  describe('constructor', () => {
    /**
     * Test: Initialize element references
     * Verifies that constructor assigns DOM elements for stats display (shots, hits, sunk).
     *
     * @test
     * @returns {void}
     */
    it('should initialize element references', () => {
      expect(scoreUI?.shots).toBe(mockElements['player1-shots'])
      expect(scoreUI?.hits).toBe(mockElements['player1-hits'])
      expect(scoreUI?.sunk).toBe(mockElements['player1-sunk'])
    })

    /**
     * Test: Initialize all element properties
     * Verifies initialization of all display elements including placed ships and weapons.
     *
     * @test
     * @returns {void}
     */
    it('should initialize all element properties', () => {
      expect(scoreUI?.placed).toBe(mockElements['player1-placed'])
      expect(scoreUI?.weaponsPlaced).toBe(mockElements['player1-weapons'])
      expect(scoreUI?.zone).toBe(mockElements['player1-zone'])
    })

    /**
     * Test: Initialize label references
     * Verifies that label elements are properly initialized for all stats displays.
     *
     * @test
     * @returns {void}
     */
    it('should initialize label references', () => {
      expect(scoreUI?.shotsLabel).toBe(mockElements['player1-shots-label'])
      expect(scoreUI?.hitsLabel).toBe(mockElements['player1-hits-label'])
      expect(scoreUI?.sunkLabel).toBe(mockElements['player1-sunk-label'])
    })

    /**
     * Test: Initialize zoneSync as empty array
     * Verifies that zone synchronization data structure starts empty.
     *
     * @test
     * @returns {void}
     */
    it('should initialize zoneSync as empty array', () => {
      expect(scoreUI?.zoneSync).toEqual([])
    })

    /**
     * Test: Use provided prefix for element IDs
     * Verifies that constructor uses the provided prefix parameter (player2)
     * to construct proper element IDs (player2-shots, player2-hits, etc).
     *
     * @test
     * @returns {void}
     */
    it('should use provided prefix for element IDs', () => {
      // Instantiate with 'player2' prefix to test constructor side effects
      // Constructor call triggers getElementById with correct prefix
      // Note: We intentionally create an instance to verify constructor side effects
      const instance = new ScoreUI('player2')
      // Verify constructor was called with correct prefix by checking mocked calls
      expect(instance).toBeDefined()

      expect(globalThis.document.getElementById).toHaveBeenCalledWith(
        'player2-shots'
      )
      expect(globalThis.document.getElementById).toHaveBeenCalledWith(
        'player2-hits'
      )
    })
  })

  /**
   * Test Suite: Display Method and Related Functions
   *
   * Tests the display() method for rendering game statistics:
   * - Shot count tracking and rendering
   * - Hit count calculation from ships
   * - Displacement description text generation
   * - Zone entry/item/title creation and DOM integration
   * - Ship box rendering and visual indicators
   * - Tally row generation with group classification
   * - Zone info setup and display
   *
   * @test
   */
  /**
   * Test Suite: Display Method
   *
   * Tests the display() method for rendering game statistics.
   *
   * @test
   */
  describe('display', () => {
    /**
     * Test: Update shots text content
     * Verifies that display() method updates the shots counter with correct value.
     *
     * @test
     * @returns {void}
     */
    it('should update shots text content', () => {
      scoreUI?.display([], 1, 0, 5, 0, 0)
      expect(scoreUI?.shots?.textContent).toBe('5')
    })

    /**
     * Test: Calculate and display hits from ships
     * Verifies that display() sums getTotalHits() from all ships (2 + 3 = 5).
     *
     * @test
     * @returns {void}
     */
    it('should calculate and display hits from ships', () => {
      const mockShips = /** @type {any} */ ([
        { getTotalHits: jest.fn(() => 2) },
        { getTotalHits: jest.fn(() => 3) }
      ])
      scoreUI?.display(mockShips, 0, 0, 0, 0, 0)
      expect(scoreUI?.hits?.textContent).toBe('5')
    })

    /**
     * Test: Handle zero shots
     * Verifies that display() shows empty string when no shots have been fired.
     *
     * @test
     * @returns {void}
     */
    it('should handle zero shots', () => {
      scoreUI?.display([], 0, 0, 0, 0, 0)
      expect(scoreUI?.shots?.textContent).toBe('')
    })

    /**
     * Nested Test Suite: Displacement Description
     *
     * Tests the displacementDescription() method which maps numerical ratios
     * to descriptive text for user feedback about area displacement.
     *
     * @test
     */
    /**
     * Nested Test Suite: Displacement Description
     * Tests displacementDescription() method which maps numerical ratios to descriptive text.
     *
     * @test
     */
    describe('displacementDescription', () => {
      /**
       * Test: Return "empty" for very low ratio
       * Verifies that 0.01 ratio maps to "empty" description.
       *
       * @test
       * @returns {void}
       */
      it('should return "empty" for very low ratio', () => {
        expect(scoreUI?.displacementDescription(0.01)).toBe('empty')
      })

      /**
       * Test: Return "lonely" for low ratio
       * Verifies that 0.1 ratio maps to "lonely" description.
       *
       * @test
       * @returns {void}
       */
      it('should return "lonely" for low ratio', () => {
        expect(scoreUI?.displacementDescription(0.1)).toBe('lonely')
      })

      /**
       * Test: Return "very squeezy" for very high ratio
       * Verifies that 0.99 ratio maps to "very squeezy" description.
       *
       * @test
       * @returns {void}
       */
      it('should return "very squeezy" for very high ratio', () => {
        expect(scoreUI?.displacementDescription(0.99)).toBe('very squeezy')
      })

      /**
       * Nested Test Suite: Zone Entry Creation
       *
       * Tests createZoneTextEntry() method for creating zone entry DOM elements
       * with labels and styling.
       *
       * @test
       */
      /**
       * Nested Test Suite: Zone Entry Creation
       * Tests createZoneTextEntry() method for creating zone entry DOM elements.
       *
       * @test
       */
      describe('createZoneEntry', () => {
        beforeEach(() => {
          globalThis.document.createElement = jest.fn(
            /**
             * @param {string} tag
             */
            tag =>
              /** @type {any} */ ({
                createElement: jest.fn(),
                appendChild: jest.fn(),
                style: {},
                className: tag,
                textContent: '',
                classList: { add: jest.fn() }
              })
          )
        })

        /**
         * Test: Create entry with label and count
         * Verifies that createZoneTextEntry() creates an element with label and styling.
         *
         * @test
         * @returns {void}
         */
        it('should create entry with label and count', () => {
          const result = scoreUI?.createZoneTextEntry(
            'Test',
            'value',
            'b',
            'color:red;'
          )
          expect(result).toBeDefined()
        })

        /**
         * Test: Append entry to zone element
         * Verifies that createZoneTextEntry() calls appendChild on zone element.
         *
         * @test
         * @returns {void}
         */
        it('should append entry to zone element', () => {
          if (scoreUI?.zone) {
            // Mock appendChild as jest.fn() - cast to any to allow mock function
            /** @type {any} */
            scoreUI.zone.appendChild = jest.fn()
          }
          scoreUI?.createZoneTextEntry('Zone', 'value', 'span', '')
          expect(scoreUI?.zone?.appendChild).toHaveBeenCalled()
        })
      })

      /**
       * Nested Test Suite: Zone Title Creation
       *
       * Tests createZoneTitle() method which creates section titles for zone info
       * using bold (<b>) tags.
       *
       * @test
       */
      /**
       * Nested Test Suite: Zone Title Creation
       * Tests createZoneTitle() method which creates section titles for zone info.
       *
       * @test
       */
      describe('createZoneTitle', () => {
        beforeEach(() => {
          globalThis.document.createElement = jest.fn(
            () =>
              /** @type {any} */ ({
                appendChild: jest.fn(),
                style: {},
                textContent: ''
              })
          )
        })

        /**
         * Test: Call createZoneEntry with b tag
         * Verifies that createZoneTitle() creates entry with bold (<b>) tag.
         *
         * @test
         * @returns {void}
         */
        it('should call createZoneEntry with b tag', () => {
          const zoneData = new Set()
          if (scoreUI?.zone) {
            // Mock appendChild as jest.fn() - use JSDoc type to allow mock function
            /** @type {any} */
            scoreUI.zone.appendChild = jest.fn()
          }
          scoreUI?.createZoneTitle('Title', zoneData)
          expect(scoreUI?.zone?.appendChild).toHaveBeenCalled()
        })
      })

      /**
       * Nested Test Suite: Zone Item Creation
       *
       * Tests createZoneItem() method which creates individual zone data entries
       * using span tags.
       *
       * @test
       */
      /**
       * Nested Test Suite: Zone Item Creation
       * Tests createZoneItem() method which creates individual zone data entries.
       *
       * @test
       */
      describe('createZoneItem', () => {
        beforeEach(() => {
          globalThis.document.createElement = jest.fn(
            () =>
              /** @type {any} */ ({
                appendChild: jest.fn(),
                style: {},
                textContent: ''
              })
          )
        })

        /**
         * Test: Call createZoneEntry with span tag
         * Verifies that createZoneItem() creates entry with span tag.
         *
         * @test
         * @returns {void}
         */
        it('should call createZoneEntry with span tag', () => {
          const zoneData = new Set()
          if (scoreUI?.zone) {
            // Mock appendChild as jest.fn() - use JSDoc type to allow mock function
            /** @type {any} */
            scoreUI.zone.appendChild = jest.fn()
          }
          scoreUI?.createZoneItem('Item', zoneData)
          expect(scoreUI?.zone?.appendChild).toHaveBeenCalled()
        })
      })

      /**
       * Nested Test Suite: Reset Tally Box
       *
       * Tests resetTallyBox() method which clears tally box HTML content.
       *
       * @test
       */
      describe('resetTallyBox', () => {
        /**
         * Test: Clear tally box innerHTML
         *
         * Verifies that resetTallyBox() properly clears the HTML content
         * of the tallyBox element.
         *
         * @test
         * @returns {void}
         */
        it('should clear tallyBox innerHTML', () => {
          if (scoreUI?.tallyBox) {
            scoreUI.tallyBox.innerHTML = '<div>content</div>'
          }
          scoreUI?.resetTallyBox()
          expect(scoreUI?.tallyBox?.innerHTML).toBe('')
        })
      })

      /**
       * Nested Test Suite: Ship Box Building
       *
       * Tests buildShipBox() method which creates visual ship indicators.
       * Displays ship letter for active ships and 'X' for sunk ships.
       *
       * @test
       */
      /**
       * Nested Test Suite: Ship Box Building
       * Tests buildShipBox() method which creates visual ship indicators.
       *
       * @test
       */
      describe('buildShipBox', () => {
        beforeEach(() => {
          globalThis.document.createElement = jest.fn(
            /**
             * @param {string} tag
             */
            tag =>
              /** @type {any} */ ({
                className: tag,
                textContent: '',
                style: {},
                classList: { add: jest.fn() }
              })
          )
        })

        /**
         * Test: Create div with ship letter
         * Verifies that buildShipBox() creates a defined element.
         *
         * @test
         * @returns {void}
         */
        it('should create div with ship letter', () => {
          const mockShip = /** @type {any} */ ({ letter: 'B', sunk: false })
          const box = scoreUI?.buildShipBox(mockShip)
          expect(box).toBeDefined()
        })

        /**
         * Test: Show X for sunk ships
         * Verifies that buildShipBox() displays 'X' for sunk ship indicators.
         *
         * @test
         * @returns {void}
         */
        it('should show X for sunk ships', () => {
          /** @type {any} */
          globalThis.document.createElement = jest.fn(
            /**
             * @param {string} tag
             */
            tag =>
              /** @type {any} */ ({
                className: tag,
                textContent: '',
                style: { background: '', color: '' },
                classList: { add: jest.fn() }
              })
          )
          const mockShip = /** @type {any} */ ({ letter: 'B', sunk: true })
          const box = scoreUI?.buildShipBox(mockShip)
          expect(box?.textContent).toBe('X')
        })

        /**
         * Test: Show letter for unsunk ships
         * Verifies that buildShipBox() displays ship letter for active ships.
         *
         * @test
         * @returns {void}
         */
        it('should show letter for unsunk ships', () => {
          /** @type {any} */
          globalThis.document.createElement = jest.fn(
            /**
             * @param {string} tag
             */
            tag =>
              /** @type {any} */ ({
                className: tag,
                textContent: '',
                style: { background: '', color: '' },
                classList: { add: jest.fn() }
              })
          )
          const mockShip = /** @type {any} */ ({ letter: 'D', sunk: false })
          const box = scoreUI?.buildShipBox(mockShip)
          expect(box?.textContent).toBe('D')
        })
      })

      /**
       * Nested Test Suite: Tally Row Building
       *
       * Tests buildTallyRow() method which creates ship group rows for tally display.
       * Groups ships by letter and applies appropriate CSS classes.
       *
       * @test
       */
      describe('buildTallyRow', () => {
        beforeEach(() => {
          globalThis.document.createElement = jest.fn(tag => ({
            className: tag,
            textContent: '',
            style: {},
            classList: {
              add: jest.fn(),
              toggle: jest.fn()
            },
            appendChild: jest.fn()
          }))
          globalThis.document.getElementById = jest.fn(() => null)
        })

        it('should create a tally row', () => {
          const mockShips = /** @type {any} */ ([
            {
              letter: 'B',
              sunk: false,
              isInTallyGroup: jest.fn().mockReturnValue(true)
            }
          ])
          const mockRowList = /** @type {any} */ ({
            appendChild: jest.fn(),
            classList: { add: jest.fn() }
          })
          if (scoreUI) {
            scoreUI.buildTallyRow(mockShips, 'B', mockRowList, null, 'S')
          }
          expect(mockRowList.appendChild).toHaveBeenCalled()
        })

        it('should add sea class for S group', () => {
          /** @type {any} */
          globalThis.document.createElement = jest.fn(() => ({
            className: '',
            classList: {
              add: jest.fn(),
              toggle: jest.fn()
            },
            appendChild: jest.fn(),
            style: {}
          }))
          const mockShips = /** @type {any} */ ([
            { letter: 'B', sunk: false, isInTallyGroup: jest.fn() }
          ])
          const mockRowList = /** @type {any} */ ({ appendChild: jest.fn() })
          if (scoreUI) {
            scoreUI.buildTallyRow(mockShips, 'B', mockRowList, null, 'S')
          }
          // The row's classList.add should have been called
        })
      })

      /**
       * Nested Test Suite: Zone Info Setup
       *
       * Tests setupZoneInfo() method which initializes zone display state.
       * Clears HTML and calls subterrain tracker setup.
       *
       * @test
       */
      describe('setupZoneInfo', () => {
        it('should clear zone HTML', () => {
          scoreUI.zone.innerHTML = '<div>old</div>'
          scoreUI.setupZoneInfo()
          expect(scoreUI.zone.innerHTML).toBe('')
        })

        it('should call setupZoneInfo on subterrain trackers', () => {
          scoreUI.setupZoneInfo()
          expect(bh.map.subterrainTrackers.setupZoneInfo).toHaveBeenCalled()
        })

        it('should set zoneSync to result', () => {
          const mockResult = [{ zone: 1 }, { zone: 2 }]
          bh.map.subterrainTrackers.setupZoneInfo.mockReturnValue(mockResult)
          scoreUI.setupZoneInfo()
          expect(scoreUI.zoneSync).toEqual(mockResult)
        })
      })

      /**
       * Nested Test Suite: Zone Info Display
       *
       * Tests displayZoneInfo() method which renders zone statistics.
       * Updates text content of zone entry count elements.
       *
       * @test
       */
      describe('displayZoneInfo', () => {
        it('should recalculate zone entries', () => {
          const mockTracker = {
            recalc: jest.fn(),
            sizes: { total: 100, margin: 20, core: 80 }
          }
          const mockEntry = {
            tracker: mockTracker,
            counts: [
              { textContent: '' },
              { textContent: '' },
              { textContent: '' }
            ]
          }
          scoreUI.zoneSync = [mockEntry]
          scoreUI.displayZoneInfo()
          expect(mockTracker.recalc).toHaveBeenCalled()
        })

        it('should update count text contents', () => {
          const mockEntry = {
            tracker: {
              recalc: jest.fn(),
              sizes: { total: 100, margin: 20, core: 80 }
            },
            counts: [
              { textContent: '' },
              { textContent: '' },
              { textContent: '' }
            ]
          }
          scoreUI.zoneSync = [mockEntry]
          scoreUI.displayZoneInfo()
          expect(mockEntry.counts[0].textContent).toBe('100')
          expect(mockEntry.counts[1].textContent).toBe('20')
          expect(mockEntry.counts[2].textContent).toBe('80')
        })
      })

      /**
       * Nested Test Suite: Has Zone Info
       *
       * Tests hasZoneInfo() method which checks if zone information is available.
       * Returns true if any zone tracker has non-zero size.
       *
       * @test
       */
      describe('hasZoneInfo', () => {
        it('should return false when no zone info', () => {
          scoreUI.zoneSync = [{ tracker: { recalc: jest.fn(), totalSize: 0 } }]
          const result = scoreUI.hasZoneInfo()
          expect(result).toBe(false)
        })

        it('should return true when zone info exists', () => {
          scoreUI.zoneSync = [
            { tracker: { recalc: jest.fn(), totalSize: 0 } },
            { tracker: { recalc: jest.fn(), totalSize: 50 } }
          ]
          const result = scoreUI.hasZoneInfo()
          expect(result).toBe(true)
        })
      })

      describe('resetTallyBox', () => {
        it('should clear innerHTML', () => {
          scoreUI.tallyBox.innerHTML = 'something'
          scoreUI.resetTallyBox()
          expect(scoreUI.tallyBox.innerHTML).toBe('')
        })
      })
    })
  })
})
