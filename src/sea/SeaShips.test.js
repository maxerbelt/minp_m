/* eslint-env jest */

/* global describe, it, test, expect, beforeEach, jest */

import { seaShipsCatalogue } from './SeaShips.js'
import {
  Building,
  HillFort,
  SeaVessel,
  DeepSeaVessel,
  Plane
} from './SeaShape.js'
import { Hybrid } from '../ships/SpecialShapes.js'
// Jest test suite
describe('SeaShips - Buildings', () => {
  test('seaShipsCatalogue is exported and has baseShapes', () => {
    expect(seaShipsCatalogue).toBeDefined()
    expect(Array.isArray(seaShipsCatalogue.baseShapes)).toBe(true)
    expect(seaShipsCatalogue.baseShapes.length).toBeGreaterThan(0)
  })

  test('catalogue contains Buildings: UndergroundBunker, AntiAircraftGun, RadarStation', () => {
    const shapes = seaShipsCatalogue.baseShapes
    const buildings = shapes.filter(s => s instanceof Building)
    expect(buildings.length).toBeGreaterThanOrEqual(3)
    const letters = shapes.map(s => s.letter)
    expect(letters).toContain('U')
    expect(letters).toContain('G')
    expect(letters).toContain('R')
  })

  test('BombShelter is HillFort with hardened property', () => {
    const shapes = seaShipsCatalogue.baseShapes
    const bombShelter = shapes.find(
      s => s.letter === 'L' && s instanceof HillFort
    )
    expect(bombShelter).toBeDefined()
    expect(bombShelter.description()).toBe('Bomb Shelter')
    expect(Array.isArray(bombShelter.hardened)).toBe(true)
    expect(bombShelter.hardened).toContain('M')
  })
})

describe('SeaShips - Planes', () => {
  test('catalogue contains Planes: JetFighter, Helicopter, Airplane, StealthBomber', () => {
    const shapes = seaShipsCatalogue.baseShapes
    const planes = shapes.filter(s => s instanceof Plane)
    expect(planes.length).toBeGreaterThanOrEqual(4)
    const letters = shapes.map(s => s.letter)
    expect(letters).toContain('J')
    expect(letters).toContain('H')
    expect(letters).toContain('P')
    expect(letters).toContain('Q')
  })

  test('Helicopter and Airplane have vulnerable properties', () => {
    const shapes = seaShipsCatalogue.baseShapes
    const helicopter = shapes.find(s => s.letter === 'H')
    const airplane = shapes.find(s => s.letter === 'P')
    expect(Array.isArray(helicopter?.vulnerable)).toBe(true)
    expect(Array.isArray(airplane?.vulnerable)).toBe(true)
  })

  test('StealthBomber has vulnerable, hardened, and immune properties', () => {
    const shapes = seaShipsCatalogue.baseShapes
    const stealth = shapes.find(s => s.letter === 'Q')
    expect(stealth).toBeDefined()
    expect(stealth.description()).toBe('Stealth Bomber')
    expect(Array.isArray(stealth.vulnerable)).toBe(true)
    expect(Array.isArray(stealth.hardened)).toBe(true)
    expect(Array.isArray(stealth.immune)).toBe(true)
    expect(Array.isArray(stealth.notes)).toBe(true)
  })
})

describe('SeaShips - SeaVessels', () => {
  test('catalogue contains SeaVessels', () => {
    const shapes = seaShipsCatalogue.baseShapes
    const vessels = shapes.filter(
      s => s instanceof SeaVessel && !(s instanceof DeepSeaVessel)
    )
    expect(vessels.length).toBeGreaterThanOrEqual(5)
    const letters = shapes.map(s => s.letter)
    expect(letters).toContain('A')
    expect(letters).toContain('T')
    expect(letters).toContain('B')
    expect(letters).toContain('C')
    expect(letters).toContain('D')
    expect(letters).toContain('S')
  })

  test('AircraftCarrier has correct description and type', () => {
    const shapes = seaShipsCatalogue.baseShapes
    const carrier = shapes.find(s => s.letter === 'A')
    expect(carrier).toBeDefined()
    expect(carrier.description()).toBe('Aircraft Carrier')
    expect(carrier.type()).toBe('S')
  })

  test('Tanker has vulnerable property', () => {
    const shapes = seaShipsCatalogue.baseShapes
    const tanker = shapes.find(s => s.letter === 'T')
    expect(tanker).toBeDefined()
    expect(Array.isArray(tanker.vulnerable)).toBe(true)
    expect(tanker.vulnerable).toContain('Z')
  })

  test('Submarine has vulnerable, hardened, and immune properties', () => {
    const shapes = seaShipsCatalogue.baseShapes
    const sub = shapes.find(s => s.letter === 'S')
    expect(sub).toBeDefined()
    expect(sub.description()).toBe('Submarine')
    expect(Array.isArray(sub.vulnerable)).toBe(true)
    expect(Array.isArray(sub.hardened)).toBe(true)
    expect(Array.isArray(sub.immune)).toBe(true)
    expect(sub.immune).toContain('R')
  })
})

describe('SeaShips - DeepSeaVessel', () => {
  test('OilRig is DeepSeaVessel with vulnerable property', () => {
    const shapes = seaShipsCatalogue.baseShapes
    const rig = shapes.find(s => s.letter === 'O')
    expect(rig).toBeDefined()
    expect(rig).toBeInstanceOf(DeepSeaVessel)
    expect(rig.description()).toBe('Oil Rig')
    expect(Array.isArray(rig.vulnerable)).toBe(true)
  })
})

describe('SeaShips - Hybrids', () => {
  test('catalogue contains Hybrids: SupplyDepot, Pier, NavalBase', () => {
    const shapes = seaShipsCatalogue.baseShapes
    const hybrids = shapes.filter(s => s instanceof Hybrid)
    expect(hybrids.length).toBeGreaterThanOrEqual(3)
    const letters = shapes.map(s => s.letter)
    expect(letters).toContain('Y')
    expect(letters).toContain('I')
    expect(letters).toContain('N')
  })

  test('SupplyDepot is Hybrid with notes', () => {
    const shapes = seaShipsCatalogue.baseShapes
    const depot = shapes.find(s => s.letter === 'Y')
    expect(depot).toBeDefined()
    expect(depot).toBeInstanceOf(Hybrid)
    expect(depot.description()).toBe('Supply Depot')
    expect(Array.isArray(depot.notes)).toBe(true)
  })

  test('Pier is Hybrid with notes', () => {
    const shapes = seaShipsCatalogue.baseShapes
    const pier = shapes.find(s => s.letter === 'I')
    expect(pier).toBeDefined()
    expect(pier).toBeInstanceOf(Hybrid)
    expect(Array.isArray(pier.notes)).toBe(true)
  })

  test('NavalBase is Hybrid with notes about placement', () => {
    const shapes = seaShipsCatalogue.baseShapes
    const base = shapes.find(s => s.letter === 'N')
    expect(base).toBeDefined()
    expect(base).toBeInstanceOf(Hybrid)
    expect(base.description()).toBe('Naval Base')
    expect(Array.isArray(base.notes)).toBe(true)
    expect(base.notes.join(' ')).toMatch(/sea/)
  })
})
