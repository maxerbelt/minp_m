/* eslint-env jest */

/* global describe, it, expect, beforeEach  jest */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { ArmedShuttle } from './spaceShapes.js'
import { Missile } from './spaceWeapons.js'
import { Mask } from '../../../grid/rectangle/mask.js'
import { WeaponVariant } from '../../../variants/WeaponVariant.js'
import { StandardCells, SpecialCells } from '../../../ships/SubShape.js'

let missileBoat

describe('Armed shape', () => {
  beforeEach(async () => {
    missileBoat = new ArmedShuttle(
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
  })

  it('should initialize with correct board', () => {
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
  })

  it('should havecorrect variants', () => {
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

    const mag2 = magBoard.expand(structBoard.width, structBoard.height)

    expect(mag2.toAsciiWith()).toBe('.1\n..\n.1')
    const addBoard = structBoard.clone
    expect(addBoard.toAsciiWith()).toBe('..\n11\n..')
    addBoard.addLayers([mag2])
    expect(addBoard.toAsciiWith()).toBe('.2\n11\n.2')
    const fullBoard = weaponVariant.board
    expect(fullBoard.store.bitsPerCell).toBe(2)

    //  expect(fullBoard.toAsciiWith()).toBe('.2\n11\n.2')
    const b0 = weaponVariant.boardFor(0)
    expect(b0.toAsciiWith()).toBe('2.\n11\n.2')
    const b1 = weaponVariant.boardFor(1)
    expect(b1.toAsciiWith()).toBe('.1\n11\n.1')

    expect(weaponVariant).toBeInstanceOf(WeaponVariant)
    const { index, board } = missileBoat.infoShrunkUnder(3)
    expect(index).toBe(0)
    expect(board.toAsciiWith()).toBe('..\n11\n..')
  })
})
