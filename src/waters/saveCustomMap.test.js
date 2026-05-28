/**
 * @fileoverview Test suite for saveCustomMap module
 *
 * Tests the save functionality for custom map configurations, including:
 * - Verification that saveCustomMap handles placed/unplaced ships correctly
 * - Validation of weapon filtering for limited ammunition weapons
 * - Testing of storeShips URL parameter management in different build modes
 *
 * Uses Jest mock modules to isolate dependencies:
 * - gtag.js: Analytics tracking
 * - terrain.js: Terrain configuration
 * - bh.js: Battle history storage
 * - custom.js: Custom map placement state management
 */

/**
 * Weapon configuration object for a custom map game session.
 *
 * @typedef {Object} MockWeapon
 * @property {number} ammo - Ammunition count; 0+ for limited weapons
 * @property {boolean} [unlimited] - True for unlimited ammunition weapons
 */

/**
 * Custom map object used in test scenarios.
 *
 * @typedef {Object} TestCustomMap
 * @property {Array<MockWeapon>} weapons - Array of weapons available in the map
 */

// We'll import saveCustomMap and storeShips after setting up mocks
import { it, describe, expect, beforeEach, jest } from '@jest/globals'

// Note: BhConstants from '../terrains/all/js/constants.js' contains MIN_CUSTOM_WIDTH,

/** @type {Function} saveCustomMap - Main export under test */
let saveCustomMap
/** @type {Function} storeShips - Secondary export under test */
let storeShips
/** @type {Object} gtag - Mocked analytics tracking module */
let gtag

jest.unstable_mockModule('../navbar/gtag.js', () => ({
  trackLevelEnd: jest.fn()
}))

// after mocks are in place we can pull in the module under test
const testModulePromise = import('./saveCustomMap.js')

/**
 * Mock dependencies
 * Simulates external module exports used by saveCustomMap.js
 */

/**
 * Mock terrain module with bh.maps.addCurrentCustomMap function
 * Used to verify that custom maps are added to battle history
 */
jest.unstable_mockModule('../terrains/all/js/terrain.js', () => ({
  // provide any exports used by modules that import terrain.js

  bh: {
    maps: {
      addCurrentCustomMap: jest.fn()
    }
  }
}))

/**
 * Mock bh.js module - direct dependency of saveCustomMap.js
 * Provides global battle history map storage for custom maps
 */
// saveCustomMap imports bh directly; mock that module as well
jest.unstable_mockModule('../terrains/all/js/bh.js', () => ({
  bh: {
    maps: {
      addCurrentCustomMap: jest.fn()
    }
  }
}))

/**
 * Mock custom.js module - manages custom map placement state
 * Provides ship count tracking and data storage functionality
 */
jest.unstable_mockModule('./custom.js', () => ({
  custom: {
    getPlacedShipCount: jest.fn(),
    store: jest.fn(),
    getPlacedShipsData: jest.fn()
  }
}))

const customModule = await import('./custom.js')
const terrainModule = await import('../terrains/all/js/terrain.js')

/**
 * Test Suite: saveCustomMap function
 *
 * Tests the core save functionality for custom map configurations:
 * - Verifies analytics tracking via gtag.trackLevelEnd
 * - Tests behavior when no ships have been placed (no storage)
 * - Tests behavior when ships have been placed (storage, filtering, history)
 * - Validates weapon filtering removes depleted ammo weapons
 */
describe('saveCustomMap', () => {
  /** @type {TestCustomMap} map - Test custom map object with weapons */
  let map

  /**
   * Setup before each test case
   *
   * Initializes test fixtures:
   * - Creates a fresh map object with 3 weapons (mixed limited/unlimited)
   * - Clears all mock function call histories
   * - Ensures clean state for each test
   *
   * Weapons fixture:
   * - [0]: Limited weapon with 0 ammo (should be filtered out)
   * - [1]: Limited weapon with 2 ammo (should be kept)
   * - [2]: Unlimited weapon (should be kept regardless of ammo)
   *
   * @returns {void}
   * @async
   */
  beforeEach(async () => {
    // load mocks and modules lazily
    gtag = await import('../navbar/gtag.js')

    // ensure we have fresh references to the functions each run
    const testModule = await testModulePromise
    saveCustomMap = testModule.saveCustomMap
    storeShips = testModule.storeShips

    map = {
      weapons: [
        { ammo: 0, unlimited: false },
        { ammo: 2, unlimited: false },
        { ammo: 0, unlimited: true }
      ]
    }
    gtag.trackLevelEnd.mockClear()
    customModule.custom.getPlacedShipCount.mockClear()
    customModule.custom.store.mockClear()
    customModule.custom.getPlacedShipsData.mockClear()
    terrainModule.bh.maps.addCurrentCustomMap.mockClear()
    // also clear the bh.js mock (used by the module under test)
    const bhModule = await import('../terrains/all/js/bh.js')
    bhModule.bh.maps.addCurrentCustomMap.mockClear()
  })

  /**
   * Test: Does nothing if no placed ships
   *
   * When getPlacedShipCount returns 0:
   * - saveCustomMap should call trackLevelEnd with (map, false)
   * - Should NOT call custom.store() (no storage needed)
   * - Should NOT add map to history (no ships placed)
   * - Weapons array should remain unmodified
   *
   * @test
   * @returns {void}
   */
  it('does nothing if no placed ships', () => {
    customModule.custom.getPlacedShipCount.mockReturnValue(0)
    saveCustomMap(map)
    expect(gtag.trackLevelEnd).toHaveBeenCalledWith(map, false)
    expect(customModule.custom.store).not.toHaveBeenCalled()
    expect(terrainModule.bh.maps.addCurrentCustomMap).not.toHaveBeenCalled()
  })

  /**
   * Test: Filters weapons, stores, and adds map if placed ships exist
   *
   * When getPlacedShipCount returns > 0:
   * - Should filter weapons: keep weapons with ammo > 0 OR unlimited=true
   * - Should call custom.store() to persist configuration
   * - Should add placed ships data to global battle history
   *
   * Expected weapons after filtering:
   * - [0] filtered out (ammo=0, unlimited=false)
   * - [1] kept (ammo=2, unlimited=false)
   * - [2] kept (unlimited=true)
   *
   * @test
   * @async
   * @returns {Promise<void>}
   */
  it('filters weapons, stores, and adds map if placed ships exist', async () => {
    customModule.custom.getPlacedShipCount.mockReturnValue(2)
    customModule.custom.getPlacedShipsData.mockReturnValue(['ship1'])
    saveCustomMap(map)
    // Only weapons with ammo > 0 or unlimited should remain
    expect(map.weapons).toEqual([
      { ammo: 2, unlimited: false },
      { ammo: 0, unlimited: true }
    ])
    expect(customModule.custom.store).toHaveBeenCalled()
    // the code under test loads bh.js directly, so check that mock
    const bhModule = await import('../terrains/all/js/bh.js')
    expect(bhModule.bh.maps.addCurrentCustomMap).toHaveBeenCalledWith(['ship1'])
  })
})

/**
 * Test Suite: storeShips function
 *
 * Tests URL parameter management and page navigation for different build modes:
 * - Verifies URL parameter handling in build mode vs normal play mode
 * - Tests behavior when ships are placed (add placedShips param)
 * - Tests behavior when no ships are placed (remove mapName param)
 * - Validates generated navigation URLs
 */
describe('storeShips', () => {
  /** @type {URLSearchParams} params - URL parameters object for navigation */
  let params
  /** @type {TestCustomMap} map - Test custom map object */
  let map

  /**
   * Setup before each test case
   *
   * Initializes test fixtures:
   * - Creates a fresh URLSearchParams object for parameter management
   * - Creates a minimal map object (empty weapons array)
   * - Clears all mock function call histories
   *
   * @returns {void}
   */
  beforeEach(() => {
    params = new URLSearchParams()
    map = { weapons: [] }
    customModule.custom.getPlacedShipCount.mockClear()
    customModule.custom.store.mockClear()
    customModule.custom.getPlacedShipsData.mockClear()
  })

  /**
   * Test: Appends placedShips parameter if in build mode with placed ships
   *
   * When buildMode is 'build' AND getPlacedShipCount returns > 0:
   * - storeShips should append 'placedShips' parameter to URL
   * - The parameter signals to the target page that ships have been placed
   *
   * @test
   * @returns {void}
   */
  it('appends placedShips if build mode and placed ships exist', () => {
    customModule.custom.getPlacedShipCount.mockReturnValue(1)
    const url = storeShips(params, 'build', 'target', map)
    expect(url).toContain('placedShips=')
  })

  /**
   * Test: Deletes mapName parameter if in build mode with no placed ships
   *
   * When buildMode is 'build' AND getPlacedShipCount returns 0:
   * - storeShips should remove 'mapName' parameter from URL
   * - Prevents loading a non-existent custom map configuration
   *
   * Setup: Pre-populate params with mapName='foo'
   * Assertion: mapName parameter should be removed after calling storeShips
   *
   * @test
   * @returns {void}
   */
  it('deletes mapName if build mode and no placed ships', () => {
    customModule.custom.getPlacedShipCount.mockReturnValue(0)
    params.append('mapName', 'foo')
    storeShips(params, 'build', 'target', map)
    expect(params.has('mapName')).toBe(false)
  })

  /**
   * Test: Returns correct URL format for non-build mode
   *
   * When buildMode is NOT 'build' (e.g., 'play', 'seek', 'hide'):
   * - storeShips should not modify parameters for ship placement
   * - Should return navigation URL with target page and unmodified params
   * - Expected format: `./targetPage.html?parameterString`
   *
   * @test
   * @returns {void}
   */
  it('returns correct url for non-build mode', () => {
    const url = storeShips(params, 'play', 'target', map)
    expect(url).toBe('./target.html?' + params.toString())
  })
})
