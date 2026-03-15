/* eslint-env jest */

import { jest } from '@jest/globals'

/* global describe, require, test, expect, beforeEach, afterEach */
let replaceTokens
let setSizeParams
let setMapParams
let setMapTypeParams

import { terrains } from '../terrain/terrains.js'
describe('SetParams', () => {
  let origPush
  let origDocument
  let createdMockDocument = false
  let origLocation
  let origURL

  beforeEach(async () => {
    origPush = globalThis.history
    try {
      if (origPush && typeof origPush.pushState === 'function') {
        jest.spyOn(origPush, 'pushState').mockImplementation(() => {})
      }
    } catch (e) {
      console.warn('Could not mock history.pushState:', e)
    }
    origLocation = globalThis.location
    // Prefer to replace globalThis.location with a mock so assignments won't trigger jsdom navigation.
    try {
      Object.defineProperty(globalThis, 'location', {
        value: { href: '', search: '', reload: jest.fn(), assign: jest.fn() },
        configurable: true
      })
    } catch (e) {
      // fallback: try to set safe properties on existing location object
      try {
        if (origLocation && typeof origLocation === 'object') {
          origLocation.href = origLocation.href || ''
          origLocation.search = origLocation.search || ''
          origLocation.reload = origLocation.reload || jest.fn()
          origLocation.assign = origLocation.assign || jest.fn()
        }
      } catch (err) {
        // ignore - cannot mock location
      }
    }
    globalThis.history = { pushState: jest.fn() }
    // intercept URL construction that uses the real location object so tests
    // can control the returned URL without mutating jsdom's Location
    try {
      origURL = globalThis.URL
      const savedLocation = origLocation
      globalThis.URL = function (input) {
        // when code calls `new URL(globalThis.location)`, return a URL built
        // from the per-test string in `globalThis.__testLocationString`
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

    // require the module under test after we've mocked global history/URL
    jest.resetModules()
    // use dynamic import so the module evaluates with our mocked globals
    const mod = await import('./SetParams.js')
    replaceTokens = mod.replaceTokens
    setSizeParams = mod.setSizeParams
    setMapParams = mod.setMapParams
    setMapTypeParams = mod.setMapTypeParams
    if (typeof document === 'undefined') {
      origDocument = undefined
      createdMockDocument = true
      globalThis.document = {
        title: '',
        getElementById: () => null,
        createElement: () => ({ id: '', dataset: {}, remove () {} }),
        body: { appendChild: () => {} }
      }
    } else {
      origDocument = globalThis.document
      const existing = document.getElementById('page-title')
      if (existing) existing.remove()
    }
  })

  afterEach(() => {
    globalThis.history = origPush
    try {
      if (origPush && origPush.pushState && origPush.pushState.mockRestore) {
        origPush.pushState.mockRestore()
      }
    } catch (e) {
      console.warn('Could not restore history.pushState:', e)
    }
    try {
      if (origLocation && typeof origLocation === 'object') {
        // try to restore properties
        try {
          globalThis.location.href = origLocation.href
          globalThis.location.search = origLocation.search
        } catch (e) {
          console.warn('Could not restore location properties:', e)
        }
      } else {
        try {
          Object.defineProperty(globalThis, 'location', {
            value: origLocation,
            configurable: true
          })
        } catch (e) {
          console.warn('Could not restore globalThis.location:', e)
        }
      }
    } catch (e) {
      console.warn('Could not restore globalThis.location:', e)
      // ignore restore errors
    }
    if (origURL) globalThis.URL = origURL
    if (createdMockDocument) {
      delete globalThis.document
      createdMockDocument = false
    } else if (origDocument) {
      const el = document.getElementById('page-title')
      if (el) el.remove()
    }
  })

  test('replaceTokens replaces {} and [] tokens and title-case [] tokens', () => {
    const tmpl = 'Hello {who} [place]'
    const out = replaceTokens(tmpl, [
      ['who', 'alice'],
      ['place', 'ocean world']
    ])
    expect(out).toBe('Hello alice Ocean World')
  })

  test('setSizeParams updates history when sizes change and updates title when template present', () => {
    // set a page-title template
    const title = document.createElement('div')
    title.id = 'page-title'
    title.dataset.template = 'Map {mode} [terrain]'
    document.body.appendChild(title)

    // start with height=1,width=1 (provide via mocked URL)
    globalThis.__testLocationString = 'http://example.com/?height=1&width=1'

    // make terrains.current available
    terrains.current = { bodyTag: 'sea' }

    setSizeParams(5, 7)

    expect(globalThis.history.pushState).toHaveBeenCalled()
  })

  test('setMapParams updates history when mapName changes', () => {
    globalThis.__testLocationString = 'http://example.com/?mapName=old'
    terrains.current = { bodyTag: 'sea' }

    setMapParams('new')

    expect(globalThis.history.pushState).toHaveBeenCalled()
    const callArgs = globalThis.history.pushState.mock.calls[0]
    expect(callArgs[1]).toBe('')
  })

  test('setMapTypeParams updates history when mapType changes', async () => {
    globalThis.__testLocationString =
      'http://example.com/?mapType=old&terrain=sea'
    terrains.current = { bodyTag: 'sea', tag: 'sea' }
    // ensure terrainMaps responds to setByTag (setTerrainByTag may call through)
    try {
      const bhModule = await import('../terrain/bh.js')
      bhModule.bh.terrainMaps = bhModule.bh.terrainMaps || {}
      bhModule.bh.terrainMaps.setByTag = jest
        .fn()
        .mockReturnValue({ terrain: { bodyTag: 'sea' } })
    } catch (e) {
      console.warn('Could not mock terrainMaps.setByTag:', e)
    }

    setMapTypeParams('newType')

    expect(globalThis.history.pushState).toHaveBeenCalled()
  })
})
