/**
 * @jest-environment
 */

/* eslint-env jest */

/* global   it, describe, expect, beforeEach, jest */
// We'll import saveCustomMap and storeShips after setting up mocks
import { jest } from '@jest/globals'

let saveCustomMap, storeShips, gtag

jest.unstable_mockModule('../navbar/gtag.js', () => ({
  trackLevelEnd: jest.fn()
}))

// after mocks are in place we can pull in the module under test
const testModulePromise = import('./saveCustomMap.js')

// Mock dependencies

jest.unstable_mockModule('../terrains/all/js/terrain.js', () => ({
  // provide any exports used by modules that import terrain.js
  MIN_CUSTOM_WIDTH: 16,
  MAX_CUSTOM_WIDTH: 22,
  MIN_CUSTOM_HEIGHT: 6,
  MAX_CUSTOM_HEIGHT: 12,
  // other helpers may be added if tests require them

  bh: {
    maps: {
      addCurrentCustomMap: jest.fn()
    }
  }
}))

// saveCustomMap imports bh directly; mock that module as well
jest.unstable_mockModule('../terrains/all/js/bh.js', () => ({
  bh: {
    maps: {
      addCurrentCustomMap: jest.fn()
    }
  }
}))
jest.unstable_mockModule('./custom.js', () => ({
  custom: {
    getPlacedShipCount: jest.fn(),
    store: jest.fn(),
    placedShips: jest.fn()
  }
}))

const customModule = await import('./custom.js')
const terrainModule = await import('../terrains/all/js/terrain.js')

describe('saveCustomMap', () => {
  let map
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
    customModule.custom.placedShips.mockClear()
    terrainModule.bh.maps.addCurrentCustomMap.mockClear()
    // also clear the bh.js mock (used by the module under test)
    const bhModule = await import('../terrains/all/js/bh.js')
    bhModule.bh.maps.addCurrentCustomMap.mockClear()
  })

  it('does nothing if no placed ships', () => {
    customModule.custom.getPlacedShipCount.mockReturnValue(0)
    saveCustomMap(map)
    expect(gtag.trackLevelEnd).toHaveBeenCalledWith(map, false)
    expect(customModule.custom.store).not.toHaveBeenCalled()
    expect(terrainModule.bh.maps.addCurrentCustomMap).not.toHaveBeenCalled()
  })

  it('filters weapons, stores, and adds map if placed ships exist', async () => {
    customModule.custom.getPlacedShipCount.mockReturnValue(2)
    customModule.custom.placedShips.mockReturnValue(['ship1'])
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

describe('storeShips', () => {
  let params, map
  beforeEach(() => {
    params = new URLSearchParams()
    map = { weapons: [] }
    customModule.custom.getPlacedShipCount.mockClear()
    customModule.custom.store.mockClear()
    customModule.custom.placedShips.mockClear()
  })

  it('appends placedShips if build mode and placed ships exist', () => {
    customModule.custom.getPlacedShipCount.mockReturnValue(1)
    const url = storeShips(params, 'build', 'target', map)
    expect(url).toContain('placedShips=')
  })

  it('deletes mapName if build mode and no placed ships', () => {
    customModule.custom.getPlacedShipCount.mockReturnValue(0)
    params.append('mapName', 'foo')
    storeShips(params, 'build', 'target', map)
    expect(params.has('mapName')).toBe(false)
  })

  it('returns correct url for non-build mode', () => {
    const url = storeShips(params, 'play', 'target', map)
    expect(url).toBe('./target.html?' + params.toString())
  })
})
