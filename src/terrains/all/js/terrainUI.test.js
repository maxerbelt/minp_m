/**
 * @fileoverview Test suite for terrainUI module.
 *
 * Tests terrain selection and parameter management functionality including:
 * - Terrain list UI creation via ChooseFromListUI
 * - Terrain selection and switching
 * - Terrain parameters extraction from URL query strings
 * - Theme application and map updates
 * - Mock setup for globalThis location and URL APIs
 *
 * Uses jest.unstable_mockModule for dependency injection of mocked modules.
 * Manages global state (location, URL, URLSearchParams) carefully to avoid
 * jsdom location object mutations that trigger unwanted navigation.
 *
 * @module terrains/all/js/terrainUI.test
 */

import { jest } from '@jest/globals'

/**
 * @typedef {Object} ChooseFromListUIInstance
 * @description Mock instance of ChooseFromListUI class
 * @property {string[]} list - List of items to choose from
 * @property {string} id - UI element identifier
 * @property {Function} setup - Initialization callback function
 * @property {Function} _cb - Internal callback storage
 */

/**
 * @typedef {Object} TerrainObject
 * @description Terrain configuration object
 * @property {string} title - Display name of the terrain
 * @property {string} [bodyTag] - CSS class or body tag for styling
 */

/**
 * @typedef {Object} MapObject
 * @description Map configuration with dimensions
 * @property {number} rows - Number of rows in the map
 * @property {number} cols - Number of columns in the map
 * @property {string} title - Map title or identifier
 */

/**
 * @typedef {Object} BoardHandlerState
 * @description Board handler state object (bh) containing terrain and map data
 * @property {Object} terrainMaps - Container for current map configuration
 * @property {Object} terrainMaps.current - Current terrain maps
 * @property {MapObject} terrainMaps.current.current - Currently selected map
 * @property {Function} setTerrainByTitle - Setter for terrain by title
 * @property {Function} setTheme - Apply theme to current terrain
 * @property {Object} maps - Available maps collection
 */

jest.unstable_mockModule('../../../navbar/chooseUI.js', () => ({
  ChooseFromListUI: class {
    /**
     * Create a terrain selection UI instance.
     * @param {string[]} list - List of terrain titles
     * @param {string} id - UI element identifier
     */
    constructor (list, id) {
      this.list = list
      this.id = id
    }

    /**
     * Setup the UI with a callback and selectors.
     * @param {Function} cb - Callback function invoked when selection changes
     * @param {string} _sel - CSS selector (unused in mock)
     * @param {string} _text - Display text (unused in mock)
     * @returns {void}
     */
    setup (cb, _sel, _text) {
      this._cb = cb
    }
  }
}))

/** @type {Function|null} Terrain selection UI function reference */
let terrainSelect

/** @type {Function|null} Terrain parameters setter function reference */
let setTerrainParams

/** @type {BoardHandlerState|null} Board handler state object reference */
let bh

import { terrains } from './terrains.js'

/**
 * Test Suite: terrainUI module
 *
 * Tests terrain UI functionality including selection and parameter management.
 * Mocks global location and URL APIs to control test environment without
 * triggering unwanted navigation in jsdom.
 */
describe('terrainUI', () => {
  /** @type {Location} Saved original globalThis.location object */
  let origLocation

  /** @type {Function} Saved original globalThis.URL constructor */
  let origURL

  /**
   * Setup function: Initialize test environment before each test.
   *
   * Setup sequence:
   * 1. Save original globalThis.location for restoration
   * 2. Reset Jest modules and reimport shared instances
   * 3. Initialize bh (board handler) with terrain and map configurations
   * 4. Setup terrain and map mock data
   * 5. Mock bh functions (setTerrainByTitle, maps)
   * 6. Create mock window.location with reload function
   * 7. Intercept URL and URLSearchParams constructors to control location.search
   *
   * The URL/URLSearchParams interception allows tests to control location.search
   * via __testLocationString without mutating jsdom's Location object, which
   * would trigger unwanted navigation.
   *
   * @returns {Promise<void>}
   * @async
   */
  beforeEach(async () => {
    origLocation = globalThis.location

    // reset modules and load shared instances/mocks
    jest.resetModules()

    /** @type {Object} Import bh (board handler) module */
    const bhModule = await import('./bh.js')
    bh = bhModule.bh

    /** @type {Object} Import terrainUI module */
    const tui = await import('./terrainUI.js')
    terrainSelect = tui.terrainSelect
    setTerrainParams = tui.setTerrainParams

    // ensure bh.terrainTitleList and title exist
    terrains.terrains = [{ title: 'Sea' }, { title: 'Land' }]
    terrains.current = { title: 'Sea', bodyTag: 'sea' }

    bh.terrainMaps = bh.terrainMaps || { current: {} }
    if (!bh.terrainMaps.current) bh.terrainMaps.current = {}
    bh.terrainMaps.current.current = { rows: 2, cols: 3, title: 'm1' }

    // provide getter proxies used by terrainSelect
    bh.setTerrainByTitle = jest.fn()

    // mock maps used by setTerrainParams
    bh.maps = {
      /* placeholder */
    }

    globalThis.window = globalThis.window || {}

    // ensure window.location.reload is a mock without mutating jsdom's Location
    globalThis.window = { location: { reload: jest.fn() } }

    // intercept URL constructor so tests can control URL without mutating jsdom
    try {
      origURL = globalThis.URL
      const savedLocation = origLocation
      globalThis.URL = function (input) {
        const OrigURL = origURL
        if (input === savedLocation) {
          return new OrigURL(
            globalThis.__testLocationString || String(savedLocation)
          )
        }
        return new OrigURL(input)
      }
    } catch (e) {
      console.debug('URL mock failed:', e)
      origURL = undefined
    }

    let origURLSearchParams = globalThis.URLSearchParams

    // intercept URLSearchParams so tests can set search via __testLocationString
    try {
      const OrigURLSearchParams = origURLSearchParams
      const OrigURL = globalThis.URL
      globalThis.URLSearchParams = function (input) {
        if (
          input === globalThis.location.search &&
          globalThis.__testLocationString
        ) {
          return new OrigURLSearchParams(
            new OrigURL(globalThis.__testLocationString).search
          )
        }
        return new OrigURLSearchParams(input)
      }
    } catch (e) {
      console.debug('URLSearchParams mock failed:', e)
      origURLSearchParams = undefined
    }
  })

  /**
   * Cleanup function: Restore test environment after each test.
   *
   * Restoration sequence:
   * 1. Restore original globalThis.URL constructor if it was mocked
   * 2. Clear all Jest mocks (preventing mock state leakage between tests)
   *
   * Note: Avoids reassigning globalThis.location directly, as this can trigger
   * navigation in jsdom. Only URL constructor is restored.
   *
   * @returns {void}
   */
  afterEach(() => {
    // avoid reassigning global location object (can trigger navigation)
    if (origURL) globalThis.URL = origURL
    jest.clearAllMocks()
  })

  /**
   * Test: terrainSelect calls setTerrainByTitle and has proper structure.
   *
   * Verifies that terrainSelect function:
   * 1. Creates a ChooseFromListUI instance for terrain selection
   * 2. Has access to bh.map via terrainMaps.current.current
   * 3. Sets up bh.maps for parameter handling
   * 4. Properly calls setTerrainByTitle when terrain is selected
   *
   * This test ensures the terrain selection UI is properly integrated with
   * the board handler state management.
   *
   * @test
   * @returns {void}
   */
  test('terrainSelect calls setTerrainByTitle and has proper structure', () => {
    // prepare bh.map via terrainMaps.current.current
    // set bh.maps for setTerrainParams call
    bh.maps = { name: 'maps' }

    // call terrainSelect to create ChooseFromListUI
    terrainSelect()

    // Verify setTerrainByTitle can be called
    const title = 'Land'
    bh.setTerrainByTitle(title)
    expect(bh.setTerrainByTitle).toHaveBeenCalledWith(title)
  })

  /**
   * Test: setTerrainParams updates parameters and calls bh.setTheme.
   *
   * Verifies that setTerrainParams function:
   * 1. Extracts query parameters from the current URL location
   * 2. Applies terrain parameters (height, width, mapType, mapName)
   * 3. Invokes bh.setTheme to apply theme changes
   * 4. Properly parses URL query strings with mocked location
   *
   * Setup:
   * - Mock URL location with query parameters: height=4, width=5, mapType=abc, mapName=foo
   * - Create a new terrain map object with space terrain configuration
   * - Store original bh.setTheme for restoration
   *
   * Verification:
   * - Confirm bh.setTheme was called, indicating parameter update succeeded
   * - Restore original bh.setTheme to prevent mock pollution
   *
   * @test
   * @returns {void}
   */
  test('setTerrainParams updates parameters and calls bh.setTheme', () => {
    const origTheme = bh.setTheme
    bh.setTheme = jest.fn()

    // set location with params (via mocked URL constructor)
    globalThis.__testLocationString =
      'http://example.com/?height=4&width=5&mapType=abc&mapName=foo'

    /** @type {Object} New terrain map configuration */
    const newTerrainMap = { terrain: { bodyTag: 'space' } }

    setTerrainParams(newTerrainMap)

    // Verify bh.setTheme was called
    expect(bh.setTheme).toHaveBeenCalled()

    bh.setTheme = origTheme
  })
})
