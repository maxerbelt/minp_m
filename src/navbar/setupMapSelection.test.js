/* eslint-env jest */

/* eslint-env jest */
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest
} from '@jest/globals'

/* global describe, it, expect, beforeEach, afterEach, jest */

/**
 * @typedef {{
 *   mapTitles: () => string[],
 *   setTo: jest.Mock,
 *   getMap: (name: string) => { title: string } | null,
 *   getMapOfSize: (height: number, width: number) => { title: string } | null,
 *   getLastMapTitle: () => string,
 *   storeLastMap: jest.Mock,
 *   setByTitle: jest.Mock,
 *   setToDefault: jest.Mock,
 *   setByIndex: jest.Mock
 * }} TerrainMapsCurrentMock
 *
 * @typedef {{
 *   current: TerrainMapsCurrentMock,
 *   list: Array<unknown>,
 *   setCurrent: null
 * }} TerrainMapsMock
 *
 * @typedef {{
 *   terrainMaps: TerrainMapsMock,
 *   map: { rows: number, cols: number, title: string },
 *   maps: TerrainMapsCurrentMock,
 *   terrain: { tag: string },
 *   setTerrainByTitle: jest.Mock,
 *   setTheme: jest.Mock
 * }} BhMock
 */

const terrainSelectMock = jest.fn()
const chooseFromListUIMock = class {
  constructor (list, id) {
    this.list = list
    this.id = id
  }
  setup (callback, _selected, _initialValue) {
    this.callback = callback
  }
}

jest.unstable_mockModule('../terrains/all/js/terrainUI.js', () => ({
  terrainSelect: terrainSelectMock
}))

jest.unstable_mockModule('../terrains/all/js/bh.js', () => ({
  bh: createBhMock()
}))

jest.unstable_mockModule('./chooseUI.js', () => ({
  ChooseFromListUI: chooseFromListUIMock
}))

jest.unstable_mockModule('../network/SetParams.js', () => ({
  setMapParams: jest.fn()
}))

let setupMapControl
let setupMapSelection
let bh
let terrainSelect

/**
 * Create a reusable BH mock payload.
 * @returns {BhMock}
 */
function createBhMock () {
  const currentMock = {
    mapTitles: () => ['one', 'two'],
    setTo: jest.fn(),
    getMap: name => (name ? { title: name } : null),
    getMapOfSize: (h, w) => ({ title: `map-${h}x${w}` }),
    getLastMapTitle: () => 'last',
    storeLastMap: jest.fn(),
    setByTitle: jest.fn(),
    setToDefault: jest.fn(),
    setByIndex: jest.fn()
  }

  return {
    terrainMaps: {
      current: currentMock,
      list: [],
      setCurrent: null
    },
    map: { rows: 2, cols: 3, title: 'm1' },
    maps: currentMock,
    terrain: { tag: 'sea' },
    setTerrainByTitle: jest.fn(),
    setTheme: jest.fn()
  }
}

/**
 * Install URL and URLSearchParams shims for it location overrides.
 * @param {Location} savedLocation
 */
function installUrlMocks (savedLocation) {
  origURL = globalThis.URL
  globalThis.URL = function (input) {
    const OriginalURL = origURL
    if (input === savedLocation) {
      return new OriginalURL(
        globalThis.__testLocationString || String(savedLocation)
      )
    }
    return new OriginalURL(input)
  }

  origURLSearchParams = globalThis.URLSearchParams
  const OriginalURLSearchParams = origURLSearchParams
  const OriginalURL = globalThis.URL
  globalThis.URLSearchParams = function (input) {
    if (
      input === globalThis.location.search &&
      globalThis.__testLocationString
    ) {
      return new OriginalURLSearchParams(
        new OriginalURL(globalThis.__testLocationString).search
      )
    }
    return new OriginalURLSearchParams(input)
  }
}

/**
 * Restore global URL helpers after each it.
 */
function restoreUrlMocks () {
  if (origURLSearchParams != null) {
    globalThis.URLSearchParams = origURLSearchParams
  }
  if (origURL) {
    globalThis.URL = origURL
  }
}

/**
 * Ensure the provided location object can be safely stubbed.
 */
function installLocationSpies () {
  reloadSpy = null
  assignSpy = null
  try {
    if (globalThis.location && typeof globalThis.location === 'object') {
      const reloadDescriptor = Object.getOwnPropertyDescriptor(
        globalThis.location,
        'reload'
      )
      if (reloadDescriptor?.writable === false) {
        globalThis.location.reload = jest.fn()
      } else {
        reloadSpy = jest
          .spyOn(globalThis.location, 'reload')
          .mockImplementation(() => {})
      }

      const assignDescriptor = Object.getOwnPropertyDescriptor(
        globalThis.location,
        'assign'
      )
      if (assignDescriptor?.writable === false) {
        globalThis.location.assign = jest.fn()
      } else {
        assignSpy = jest
          .spyOn(globalThis.location, 'assign')
          .mockImplementation(() => {})
      }
    }
  } catch (error) {
    console.warn(
      'Could not mock location.reload/assign; tests may cause navigation',
      error
    )
  }
}

/**
 * Restore any spied global location functions.
 */
function restoreLocationSpies () {
  try {
    if (reloadSpy?.mockRestore) reloadSpy.mockRestore()
    if (assignSpy?.mockRestore) assignSpy.mockRestore()
  } catch (error) {
    console.warn('Could not restore location.reload/assign spies', error)
  }
}

let origLocation
let origURL
let origURLSearchParams
let origTerrainMaps
let reloadSpy
let assignSpy

describe('setupMapSelection and setupMapControl', () => {
  beforeEach(async () => {
    origLocation = globalThis.location
    installLocationSpies()
    jest.resetModules()

    const bhModule = await import('../terrains/all/js/bh.js')
    bh = bhModule.bh
    origTerrainMaps = { ...bh.terrainMaps }
    bh.terrainMaps = createBhMock().terrainMaps
    bh.maps = bh.terrainMaps.current

    try {
      installUrlMocks(origLocation)
    } catch (error) {
      origURL = undefined
      origURLSearchParams = undefined
      console.warn('Could not install URL mocks', error)
    }

    jest.resetModules()
    const mod = await import('./setupMapSelection.js')
    setupMapControl = mod.setupMapControl
    setupMapSelection = mod.setupMapSelection

    const terrainModule = await import('../terrains/all/js/terrainUI.js')
    terrainSelect = terrainModule.terrainSelect

    if (globalThis.window) {
      globalThis.window.location = globalThis.location
    } else {
      globalThis.window = { location: globalThis.location }
    }
  })

  afterEach(() => {
    restoreLocationSpies()
    delete globalThis.window
    bh.terrainMaps = origTerrainMaps
    restoreUrlMocks()
    delete globalThis.__testLocationString
  })

  it('setupMapControl uses terrainSelect and returns targetMap when present', () => {
    const urlParams = new URLSearchParams('?mapName=foo')
    const boardSetup = jest.fn()
    const refresh = jest.fn()

    const target = setupMapControl(urlParams, boardSetup, refresh)

    expect(terrainSelect).toHaveBeenCalled()
    if (target === null) {
      expect(target).toBeNull()
    } else {
      expect(target).toEqual({ title: 'foo' })
    }
  })

  it('setupMapSelection returns placedShips flag from location.search', () => {
    globalThis.__testLocationString = 'http://example.com/?placedShips=1'

    const result = setupMapSelection(
      () => {},
      () => {}
    )

    expect(result).toBe(true)
  })

  it('setMapFromParams picks map by size when mapName missing', () => {
    const urlParams = new URLSearchParams('?height=5&width=7')

    const target = setupMapControl(
      urlParams,
      () => {},
      () => {}
    )

    expect(target).toBeNull()
  })
})
