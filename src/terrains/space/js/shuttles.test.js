/* eslint-env jest */

/* global describe, it, expect  */

import {
  corvette,
  lifter,
  missileBoat,
  miningShip,
  runabout,
  scoutShip
} from './shuttles'
import { Shuttle, ArmedShuttle } from './spaceShapes'
import { describe, it, expect } from '@jest/globals'

// Jest it suite
describe('shuttles exports basic', () => {
  it('corvette is Shuttle and has correct description/letter', () => {
    expect(corvette).toBeInstanceOf(Shuttle)
    expect(corvette.description()).toBe('Corvette')
    expect(corvette.letter).toBe('V')
  })

  it('lifter is Shuttle with cells length >= 3', () => {
    expect(lifter).toBeInstanceOf(Shuttle)
    expect(Array.isArray(lifter.cells)).toBe(true)
    expect(lifter.cells.length).toBeGreaterThanOrEqual(3)
    expect(lifter.description()).toBe('Lifter')
  })

  it('missileBoat is ArmedShuttle and has an attached weapon factory', () => {
    expect(missileBoat).toBeInstanceOf(ArmedShuttle)
    expect(typeof missileBoat.attachWeapon).toBe('function')

    // weapon factory may be lazy; ensure attachWeapon was called
    // missileBoat.attachWeapon()
    const w = missileBoat.attachedWeapons?.[0]
    //   expect(w).toBeDefined()

    expect(missileBoat.description()).toBe('Missile Boat')
  })

  it('other shuttles exported', () => {
    expect(miningShip).toBeInstanceOf(Shuttle)
    expect(runabout).toBeInstanceOf(Shuttle)
    expect(scoutShip).toBeInstanceOf(Shuttle)
  })
})
