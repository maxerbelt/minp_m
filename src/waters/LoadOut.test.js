/**
 * @jest-environment
 */

/* eslint-env jest */

/* global   it, describe,   expect, beforeEach, jest */
import { it, describe, expect, beforeEach, jest } from '@jest/globals'

// polyfill structuredClone for Node environments that lack it
if (globalThis.structuredClone == null) {
  globalThis.structuredClone = obj => JSON.parse(JSON.stringify(obj))
}

import { LoadOut } from './LoadOut.js'

describe('LoadOut', () => {
  let loadOut, mockWeapon, mockShip, mockViewModel, mockSteps

  beforeEach(() => {
    mockWeapon = {
      letter: 'A',
      points: 2,
      postSelectCursor: 2,
      isLimited: true,
      aoe: jest.fn(() => ['affected']), // Remove unused args warning
      aoePlus: jest.fn(() => ({ affectedArea: ['affected'], options: {} })),
      destroys: true,
      isOneAndDone: false,
      cursors: ['X', 'Y'],
      unattachedCursor: 0,
      animateExplode: jest.fn()
    }
    mockShip = {
      weapon: () => mockWeapon,
      hasAmmoRemaining: () => true,
      getFirstLoadedWeapon: () => ({ weapon: mockWeapon }),
      getPrimaryWeapon: () => ({ weapon: mockWeapon }),
      getAllWeapons: () => [{ weapon: mockWeapon }],
      getLoadedWeapons: () => [{ id: 1, weapon: mockWeapon }],
      getWeaponBySystemId: id => (id === 1 ? { id: 1 } : undefined),
      id: 1
    }
    mockSteps = {
      fire: jest.fn(),
      targetting: jest.fn()
    }
    mockViewModel = {
      gridCellAt: jest.fn(() => ({ id: 1 })),
      cellSize: jest.fn(() => 10)
    }
    loadOut = new LoadOut([mockWeapon], [mockShip], mockViewModel, mockSteps)
    loadOut.onDestroy = jest.fn()
    loadOut.onReveal = jest.fn()
    loadOut.onCursorChangeCallback = jest.fn()
    loadOut.onOutOfAmmo = jest.fn()
    loadOut.onOutOfAllAmmo = jest.fn()
  })

  it('getCursorIndex returns selectedCoordinates length', () => {
    loadOut.selectedCoordinates = [
      [1, 2],
      [3, 4]
    ]
    expect(loadOut.getCursorIndex()).toBe(2)
  })

  it('isArmed returns true when conditions met', () => {
    loadOut.selectedWeapon = { weapon: { postSelectCursor: 2 } }
    loadOut.selectedCoordinates = [
      [1, 2],
      [3, 4]
    ]
    // bh.seekingMode is false by default
    expect(loadOut.isArmed()).toBe(true)
  })

  it('isNotArming returns correct value', () => {
    loadOut.isRackSelectable = false
    expect(loadOut.isNotArming()).toBe(true)
    loadOut.isRackSelectable = true
    expect(loadOut.isNotArming()).toBe(false)
  })

  it('isArming returns correct value', () => {
    loadOut.isRackSelectable = false
    expect(loadOut.isArming()).toBe(false)
    loadOut.isRackSelectable = true
    expect(loadOut.isArming()).toBe(true)
  })

  it('aimWeapon triggers launch and ammo usage', () => {
    loadOut.selectedCoordinates = []
    loadOut.selectedWeapon = { weapon: { postSelectCursor: 2 } }
    loadOut.useAmmo = jest.fn()
    loadOut.checkNoAmmo = jest.fn()
    loadOut.launch = jest.fn(() => new Promise(resolve => resolve()))
    // Call aimWeapon twice to fill selectedCoordinates
    loadOut.aimWeapon({}, 1, 2)
    loadOut.aimWeapon({}, 3, 4)
    expect(loadOut.launch).toHaveBeenCalled()
    expect(loadOut.useAmmo).toHaveBeenCalled()
  })

  it('aimWeapon awaits promise-based score from onDestroy before returning', async () => {
    const weaponSystem = {
      weapon: {
        points: 1,
        postSelectCursor: 1,
        destroys: true,
        isOneAndDone: false,
        aoePlus: jest.fn(() => ({ affectedArea: [[1, 1]], options: {} }))
      }
    }
    loadOut.getUnattachedWeaponSystem = jest.fn(() => null)
    loadOut.onDestroy = jest.fn(async () => ({ sunk: true }))
    loadOut.launch = jest.fn(async () => ({ target: 'foo' }))

    const result = await loadOut.aimWeapon(
      {},
      1,
      1,
      weaponSystem,
      loadOut.launch
    )

    expect(loadOut.launch).toHaveBeenCalled()
    expect(loadOut.onDestroy).toHaveBeenCalled()
    expect(result).toEqual({
      weapon: weaponSystem.weapon,
      score: { sunk: true }
    })
  })

  it('dismissSelection clears selectedCoordinates', () => {
    loadOut.selectedCoordinates = [[1, 2]]
    loadOut.dismissSelection()
    expect(loadOut.selectedCoordinates).toEqual([])
  })

  it('fireWeapon calls onDestroy or onReveal', () => {
    const map = {}
    const coords = [[1, 2]]
    const wps = {
      weapon: {
        ...mockWeapon,
        destroys: true,
        isOneAndDone: false,
        aoe: jest.fn(() => ['affected'])
      }
    }
    loadOut.onDestroy = jest.fn()
    loadOut.onReveal = jest.fn()
    loadOut.fireWeapon(map, coords, wps)
    expect(loadOut.onDestroy).toHaveBeenCalled()
    wps.weapon.destroys = false
    loadOut.fireWeapon(map, coords, wps)
    expect(loadOut.onReveal).toHaveBeenCalled()
  })

  it('onDestroyOneOfMany calls onDestroy with target', () => {
    loadOut.onDestroy = jest.fn()
    loadOut.onDestroyOneOfMany(mockWeapon, ['affected'], { id: 1 })
    expect(loadOut.onDestroy).toHaveBeenCalledWith(mockWeapon, ['affected'], {
      id: 1
    })
  })
})
