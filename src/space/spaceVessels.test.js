/* eslint-env jest */

/* global describe, it, test, expect, beforeEach, jest */

import {
  attackCraft,
  attackCraftCarrier,
  superCarrier,
  starbase,
  frigate,
  destroyer,
  cruiser,
  battlecruiser,
  orbital,
  wheel,
  patrolBoat,
  privateer,
  cargoHauler,
  merchanter,
  spaceLiner,
  transport
} from './spaceVessels'
import { jest } from '@jest/globals'
import { SpaceVessel, DeepSpaceVessel } from './spaceShapes'
// Jest test suite
describe('spaceVessels basic vessels', () => {
  test('attackCraft is SpaceVessel with vulnerable and notes', () => {
    expect(attackCraft).toBeInstanceOf(SpaceVessel)
    expect(attackCraft.description()).toBe('Attack Craft')
    expect(attackCraft.letter).toBe('A')
    expect(Array.isArray(attackCraft.vulnerable)).toBe(true)
    expect(attackCraft.vulnerable).toContain('+')
    expect(Array.isArray(attackCraft.notes)).toBe(true)
  })

  test('major carriers exported', () => {
    expect(attackCraftCarrier).toBeInstanceOf(SpaceVessel)
    expect(superCarrier).toBeInstanceOf(SpaceVessel)
    expect(starbase).toBeInstanceOf(SpaceVessel)
    expect(attackCraftCarrier.description()).toBe('Attack Craft Carrier')
    expect(superCarrier.description()).toBe('Super Carrier')
    expect(starbase.description()).toBe('Starbase')
  })

  test('combat vessels frigate, destroyer, cruiser, battlecruiser', () => {
    expect(frigate).toBeInstanceOf(SpaceVessel)
    expect(destroyer).toBeInstanceOf(SpaceVessel)
    expect(cruiser).toBeInstanceOf(SpaceVessel)
    expect(battlecruiser).toBeInstanceOf(SpaceVessel)
    expect(frigate.letter).toBe('F')
    expect(destroyer.letter).toBe('D')
    expect(cruiser.letter).toBe('C')
    expect(battlecruiser.letter).toBe('B')
  })

  test('deep space vessels orbital and wheel', () => {
    expect(orbital).toBeInstanceOf(DeepSpaceVessel)
    expect(wheel).toBeInstanceOf(DeepSpaceVessel)
    expect(orbital.description()).toBe('Orbital')
    expect(wheel.description()).toBe('Wheel')
    expect(Array.isArray(orbital.vulnerable)).toBe(true)
    expect(orbital.vulnerable).toContain('|')
  })

  test('support vessels patrolBoat, cargoHauler, spaceLiner, transport', () => {
    expect(patrolBoat).toBeInstanceOf(SpaceVessel)
    expect(cargoHauler).toBeInstanceOf(SpaceVessel)
    expect(spaceLiner).toBeInstanceOf(SpaceVessel)
    expect(transport).toBeInstanceOf(SpaceVessel)
    expect(transport.letter).toBe('T')
  })

  test('merchant vessels privateer and merchanter', () => {
    expect(privateer).toBeInstanceOf(SpaceVessel)
    expect(merchanter).toBeInstanceOf(SpaceVessel)
    expect(privateer.letter).toBe('2')
    expect(merchanter.letter).toBe('E')
  })

  test('all vessels have type S or A', () => {
    const vessels = [
      attackCraft,
      frigate,
      destroyer,
      cruiser,
      battlecruiser,
      orbital,
      wheel
    ]
    vessels.forEach(vessel => {
      const type = vessel.type()
      expect(['S', 'A'].includes(type)).toBe(true)
    })
  })
})
