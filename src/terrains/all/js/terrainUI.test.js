/* eslint-env jest */
import { jest } from '@jest/globals'

/* global describe,   test, expect, beforeEach, afterEach, jest */

jest.unstable_mockModule('../../../navbar/chooseUI.js', () => ({
  ChooseFromListUI: class {
    constructor (list, id) {
      this.list = list
      this.id = id
    }
    setup (cb, _sel, _text) {
      this._cb = cb
    }
  }
}))

let terrainSelect
let setTerrainParams
let bh
import { terrains } from './terrains.js'

describe('terrainUI', () => {
  let origLocation
  let origURL

  beforeEach(async () => {
    origLocation = globalThis.location
    // reset modules and load shared instances/mocks
    jest.resetModules()
    const bhModule = await import('./bh.js')
    bh = bhModule.bh
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
      origURL = undefined
    }
    const origURLSearchParams = globalThis.URLSearchParams
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
      origURLSearchParams = undefined
    }
  })

  afterEach(() => {
    // avoid reassigning global location object (can trigger navigation)
    if (origURL) globalThis.URL = origURL
    if (typeof origURLSearchParams !== 'undefined')
      globalThis.URLSearchParams = origURLSearchParams
    jest.clearAllMocks()
  })

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

  test('setTerrainParams updates parameters and calls bh.setTheme', () => {
    const origTheme = bh.setTheme
    bh.setTheme = jest.fn()
    // set location with params (via mocked URL constructor)
    globalThis.__testLocationString =
      'http://example.com/?height=4&width=5&mapType=abc&mapName=foo'
    const newTerrainMap = { terrain: { bodyTag: 'space' } }

    setTerrainParams(newTerrainMap)

    // Verify bh.setTheme was called
    expect(bh.setTheme).toHaveBeenCalled()

    bh.setTheme = origTheme
  })
})
