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
  let loadOut, mockWeapon, mockShip, mockViewModel

  beforeEach(() => {
    mockWeapon = {
      letter: 'A',
      points: 2,
      postSelectCursor: 2,
      isLimited: true,
      aoe: jest.fn(() => ['affected']), // Remove unused args warning
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
    mockViewModel = {
      gridCellAt: jest.fn(() => ({ id: 1 })),
      cellSizeScreen: jest.fn(() => 10)
    }
    loadOut = new LoadOut([mockWeapon], [mockShip], mockViewModel)
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
    expect(loadOut.checkNoAmmo).toHaveBeenCalled()
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
