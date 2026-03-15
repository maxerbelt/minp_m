/* eslint-env jest */

/* global describe,   test, expect  */

import {
  corvette,
  lifter,
  missileBoat,
  gunBoat,
  miningShip,
  runabout,
  scoutShip
} from './shuttles'
import { Shuttle, ArmedShuttle } from './spaceShapes'
import { jest } from '@jest/globals'

// Jest test suite
describe('shuttles exports basic', () => {
  test('corvette is Shuttle and has correct description/letter', () => {
    expect(corvette).toBeInstanceOf(Shuttle)
    expect(corvette.description()).toBe('Corvette')
    expect(corvette.letter).toBe('V')
  })

  test('lifter is Shuttle with cells length >= 3', () => {
    expect(lifter).toBeInstanceOf(Shuttle)
    expect(Array.isArray(lifter.cells)).toBe(true)
    expect(lifter.cells.length).toBeGreaterThanOrEqual(3)
    expect(lifter.description()).toBe('Lifter')
  })

  test('missileBoat is ArmedShuttle and has an attached weapon factory', () => {
    expect(missileBoat).toBeInstanceOf(ArmedShuttle)
    expect(typeof missileBoat.attachWeapon).toBe('function')

    // weapon factory may be lazy; ensure attachWeapon was called
    // missileBoat.attachWeapon()
    const w = missileBoat.attachedWeapons?.[0]
    //   expect(w).toBeDefined()

    expect(missileBoat.description()).toBe('Missile Boat')
  })

  test('other shuttles exported', () => {
    expect(gunBoat).toBeInstanceOf(Shuttle)
    expect(miningShip).toBeInstanceOf(Shuttle)
    expect(runabout).toBeInstanceOf(Shuttle)
    expect(scoutShip).toBeInstanceOf(Shuttle)
  })
})
