/* eslint-env jest */

/* global describe, require, it, test, expect, beforeEach, afterEach, jest */

// Delay module loading until after localStorage is mocked to avoid
// side-effects during import (some map modules save to localStorage).
import { jest } from '@jest/globals'

describe('gameMaps helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    if (globalThis.__origLocalStorage) {
      globalThis.localStorage = globalThis.__origLocalStorage
      delete globalThis.__origLocalStorage
    }
  })

  test('assembleTerrains calls currentTerrainMaps for initial setup when none', async () => {
    const store = new Map()
    globalThis.__origLocalStorage = globalThis.localStorage
    globalThis.localStorage = {
      getItem: key => (store.has(key) ? store.get(key) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k)
    }
    jest.resetModules()

    const gmModule = await import('./gameMaps.js')
    const { assembleTerrains } = gmModule
    const tmModule = await import('./TerrainMaps.js')
    const { TerrainMaps } = tmModule
    const samModule = await import('../sea/seaAndLandMaps.js')
    const { seaAndLandMaps } = samModule
    const spamModule = await import('../space/spaceAndAsteroidsMaps.js')
    const { spaceAndAsteroidsMaps } = spamModule

    const spyNum = jest
      .spyOn(TerrainMaps, 'numTerrains', 'get')
      .mockReturnValue(0)
    const spyCur = jest
      .spyOn(TerrainMaps, 'currentTerrainMaps')
      .mockImplementation(() => {})

    assembleTerrains()

    expect(spyCur).toHaveBeenCalledWith(seaAndLandMaps)
    expect(spyCur).toHaveBeenCalledWith(spaceAndAsteroidsMaps)
    spyNum.mockRestore()
  })

  test('gameMaps sets provided maps and returns current', async () => {
    const store = new Map()
    globalThis.__origLocalStorage = globalThis.localStorage
    globalThis.localStorage = {
      getItem: key => (store.has(key) ? store.get(key) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k)
    }
    jest.resetModules()

    const gmModule = await import('./gameMaps.js')
    const { gameMaps } = gmModule
    const tmModule = await import('./TerrainMaps.js')
    const { TerrainMaps } = tmModule

    let last = null
    const spy = jest
      .spyOn(TerrainMaps, 'currentTerrainMaps')
      .mockImplementation(arg => {
        if (arg) last = arg
        return last
      })

    const custom = { name: 'custom' }
    const res = gameMaps(custom)
    expect(spy).toHaveBeenCalledWith(custom)
    expect(res).toBe(custom)
  })

  test('gameMap sets map on current terrain maps and returns current map', async () => {
    const store = new Map()
    globalThis.__origLocalStorage = globalThis.localStorage
    globalThis.localStorage = {
      getItem: key => (store.has(key) ? store.get(key) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k)
    }
    jest.resetModules()

    const gmModule = await import('./gameMaps.js')
    const { gameMap } = gmModule
    const tmModule = await import('./TerrainMaps.js')
    const { TerrainMaps } = tmModule

    const fakeTM = { setToMap: jest.fn(), current: 'CURRENT_MAP' }
    jest.spyOn(TerrainMaps, 'currentTerrainMaps').mockImplementation(arg => {
      if (arg) return arg
      return fakeTM
    })

    const res = gameMap('mymap')
    expect(fakeTM.setToMap).toHaveBeenCalledWith('mymap')
    expect(res).toBe('CURRENT_MAP')
  })
})
