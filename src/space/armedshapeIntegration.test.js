/* eslint-env jest */

/* global describe, it, expect, beforeEach, jest */

import { expect, jest } from '@jest/globals'
import { ArmedShuttle } from './spaceShapes.js'
import { Missile } from './spaceWeapons.js'
import { Mask } from '../grid/mask.js'
import { WeaponVariant } from '../variants/WeaponVariant.js'
import { StandardCells, SpecialCells } from '../ships/SubShape.js'

describe('Armed shape', () => {
  it('should initialize with correct board', () => {
    const missileBoat = new ArmedShuttle(
      'Missile Boat',
      'M',
      'H',
      [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, 2]
      ],
      [
        [1, 0],
        [1, 2]
      ]
    )
    missileBoat.attachWeapon(() => {
      return Missile.single
    })

    expect(missileBoat.board).toBeDefined()
    expect(missileBoat.board instanceof Mask).toBe(true)
    expect(typeof missileBoat.board.bits).toBe('bigint')
    expect(missileBoat.board.width).toBe(2)
    expect(missileBoat.board.height).toBe(3)
    expect(missileBoat.board.store.width).toBe(2)
    expect(missileBoat.board.store.height).toBe(3)

    //  expect(missileBoat.board.store.bitsPerCell).toBe(2)
    expect(missileBoat.board.store.bitsPerCell).toBe(1)
    expect(missileBoat.board.store.size).toBe(6n)
    expect(missileBoat.board.store.depth).toBe(2)
    expect(missileBoat.board.toAsciiWith()).toBe('.1\n11\n.1')
    expect(missileBoat.board.occupancy).toBe(4)
    expect(missileBoat.board.depth).toBe(2)

    const weaponVariant = missileBoat.variants()
    expect(weaponVariant).toBeInstanceOf(WeaponVariant)
    const structure = weaponVariant.standardGroup
    expect(structure).toBeInstanceOf(StandardCells)
    const magazines = weaponVariant.specialGroups[0]
    expect(magazines).toBeInstanceOf(SpecialCells)
    const magBoard = magazines.board
    expect(magBoard).toBeInstanceOf(Mask)
    expect(magBoard.toAsciiWith()).toBe('.1.\n...\n.1.')
    const structBoard = structure.board
    expect(structBoard).toBeInstanceOf(Mask)
    expect(structBoard.toAsciiWith()).toBe('..\n11\n..')
  })
})
