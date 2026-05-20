/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest } from '@jest/globals'
import { bh } from '../terrains/all/js/bh.js'
import { terrains } from '../terrains/all/js/terrains.js'
import { Enemy as EnemyClass } from './enemy.js'

describe('Seek-mode missile single-click regression tests', () => {
  it('_shouldFireSeekModeMissileImmediately returns true for missile in Space and Asteroids when seekingMode', () => {
    const previousSeeking = bh.seekingMode
    const previousTerrain = terrains.current
    try {
      bh.seekingMode = true
      terrains.setCurrent({ title: 'Space and Asteroids' })

      const fakeThis = {
        loadOut: { getCurrentWeaponSystem: () => ({ weapon: { letter: 'M' } }) }
      }

      const result =
        EnemyClass.prototype._shouldFireSeekModeMissileImmediately.call(
          fakeThis
        )
      expect(result).toBe(true)
    } finally {
      bh.seekingMode = previousSeeking
      terrains.setCurrent(previousTerrain)
    }
  })

  it('onClickCell triggers _fireCurrentWeaponImmediately for missiles in Space+Asteroids seek', async () => {
    const previousSeeking = bh.seekingMode
    const previousTerrain = terrains.current
    try {
      bh.seekingMode = true
      terrains.setCurrent({ title: 'Space and Asteroids' })

      const currentWeaponSystem = { weapon: { letter: 'M' } }

      const enemy = {
        opponent: { hasAttachedWeapons: true },
        loadOut: {
          isSingleShot: false,
          selectedWeapon: null,
          getCurrentWeaponSystem: () => currentWeaponSystem
        },
        selectedCellCoordinates: null,
        timeoutId: null,
        canTakeTurn: () => true,
        _fireCurrentWeaponImmediately: jest.fn(async () => ({
          weapon: 'Missile',
          score: { hits: 1 }
        })),
        _handleAttachedWeaponClick:
          EnemyClass.prototype._handleAttachedWeaponClick,
        _shouldFireSeekModeMissileImmediately:
          EnemyClass.prototype._shouldFireSeekModeMissileImmediately,
        UI: { removeHighlightAoE: jest.fn() }
      }

      await EnemyClass.prototype.onClickCell.call(enemy, 0, 0)

      expect(enemy._fireCurrentWeaponImmediately).toHaveBeenCalledWith(0, 0)
    } finally {
      bh.seekingMode = previousSeeking
      terrains.setCurrent(previousTerrain)
    }
  })

  it('onClickCell fires immediately when selectedWeapon is a Space/Asteroids missile', async () => {
    const previousSeeking = bh.seekingMode
    const previousTerrain = terrains.current
    try {
      bh.seekingMode = true
      terrains.setCurrent({ title: 'Space and Asteroids' })

      const enemy = {
        opponent: { hasAttachedWeapons: true },
        loadOut: {
          isSingleShot: false,
          selectedWeapon: {
            weapon: { letter: 'M', name: 'Missile', tag: 'missile' }
          },
          getCurrentWeaponSystem: () => ({
            weapon: { letter: 'R', name: 'Rail Bolt' }
          })
        },
        selectedCellCoordinates: null,
        timeoutId: null,
        canTakeTurn: () => true,
        _fireCurrentWeaponImmediately: jest.fn(async () => ({
          weapon: 'Missile',
          score: { hits: 1 }
        })),
        _handleAttachedWeaponClick:
          EnemyClass.prototype._handleAttachedWeaponClick,
        _shouldFireSeekModeMissileImmediately:
          EnemyClass.prototype._shouldFireSeekModeMissileImmediately,
        UI: { removeHighlightAoE: jest.fn() }
      }

      await EnemyClass.prototype.onClickCell.call(enemy, 0, 0)

      expect(enemy._fireCurrentWeaponImmediately).toHaveBeenCalledWith(0, 0)
    } finally {
      bh.seekingMode = previousSeeking
      terrains.setCurrent(previousTerrain)
    }
  })
})
