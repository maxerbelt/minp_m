
import { describe, it, expect } from '@jest/globals'
import {
  Building,
  HillFort,
  CoastalPort,
  Plane,
  SeaVessel,
  DeepSeaVessel,
  ShallowDock
} from './SeaShape.js'
import { land, sea, coast, inland, deep, littoral } from './seaAndLand.js'
import { Mask } from '../../../grid/rectangle/mask.js'
import { CellsToBePlaced } from '../../../variants/CellsToBePlaced.js'
// Jest it suite
describe('SeaShape - Building class', () => {
  it('Building constructor sets properties', () => {
    const bldg = new Building(
      'Test Building',
      'T',
      'D',
      [[0, 0]],
      'place Test Building on the land',
      []
    )
    expect(bldg.description()).toBe('Test Building')
    expect(bldg.letter).toBe('T')
    expect(bldg.type()).toBe('G')
    expect(Array.isArray(bldg.immune)).toBe(true)
    expect(bldg.immune).toContain('Z')
  })

  it('HillFort.canBe validates land and inland zone', () => {
    expect(HillFort.canBe(land, inland)).toBe(true)
    expect(HillFort.canBe(land, coast)).toBe(false)
    expect(HillFort.validator([land, inland])).toBe(true)
  })

  it('CoastalPort.canBe validates land and coast zone', () => {
    expect(CoastalPort.canBe(land, coast)).toBe(true)
    expect(CoastalPort.canBe(land, inland)).toBe(false)
    expect(CoastalPort.validator([land, coast])).toBe(true)
  })

  it('HillFort and CoastalPort have notes explaining placement', () => {
    const hill = new HillFort('Fort', 'H', 'D', [[0, 0]], [])
    const port = new CoastalPort('Port', 'P', 'D', [[0, 0]], [])
    expect(Array.isArray(hill.notes)).toBe(true)
    expect(Array.isArray(port.notes)).toBe(true)
    expect(hill.notes[0]).toMatch(/Fort/)
    expect(port.notes[0]).toMatch(/Port/)
  })
})

describe('SeaShape - Plane class', () => {
  it('Plane constructor sets type A and sunkDescription', () => {
    const plane = new Plane(
      'Fighter',
      'F',
      'H',
      [
        [0, 0],
        [1, 1]
      ],
      []
    )
    expect(plane.type()).toBe('A')
    expect(plane.description()).toBe('Fighter')
    expect(plane.sunkDescription()).toBe('Shot Down')
    expect(Array.isArray(plane.immune)).toBe(true)
    expect(plane.immune).toContain('Z')
  })

  it('Plane has vulnerable property', () => {
    const plane = new Plane('Bomber', 'B', 'D', [[0, 0]], [])
    expect(Array.isArray(plane.vulnerable)).toBe(true)
    expect(plane.vulnerable).toContain('F')
  })

  it('Plane assigns canBeOn to Plane.canBe', () => {
    const plane = new Plane('Transport', 'T', 'L', [[0, 0]], [])
    expect(typeof plane.canBeOn).toBe('function')
  })
})

describe('SeaShape - SeaVessel class', () => {
  it('SeaVessel constructor sets subterrain and type', () => {
    const vessel = new SeaVessel(
      'Destroyer',
      'D',
      'D',
      [
        [0, 0],
        [0, 1]
      ],
      undefined,
      []
    )
    expect(vessel.type()).toBe('S')
    expect(vessel.description()).toBe('Destroyer')
    expect(vessel.sunkDescription()).toBe('Sunk')
    expect(vessel.subterrain).toBe(sea)
  })

  it('DeepSeaVessel.canBe validates sea and deep zone', () => {
    expect(DeepSeaVessel.canBe(sea, deep)).toBe(true)
    expect(DeepSeaVessel.canBe(sea, littoral)).toBe(false)
    expect(DeepSeaVessel.validator([sea, deep])).toBe(true)
  })

  it('ShallowDock.canBe validates sea and littoral zone', () => {
    expect(ShallowDock.canBe(sea, littoral)).toBe(true)
    expect(ShallowDock.canBe(sea, deep)).toBe(false)
    expect(ShallowDock.validator([sea, littoral])).toBe(true)
  })

  it('DeepSeaVessel and ShallowDock have notes', () => {
    const deepVessel = new DeepSeaVessel('SubmarineX', 'X', 'L', [[0, 0]], [])
    const shallowDock = new ShallowDock('Frigate', 'F', 'H', [[0, 0]], [])
    expect(Array.isArray(deepVessel.notes)).toBe(true)
    expect(Array.isArray(shallowDock.notes)).toBe(true)
    expect(deepVessel.notes[0]).toMatch(/SubmarineX/)
    expect(shallowDock.notes[0]).toMatch(/Frigate/)
  })
})

/**
 * Regression tests: ensure static `validator` functions are safe to pass
 * around as bare functions and that `CellsToBePlaced` delegates to them
 * correctly. This prevents regressions where `this` would be lost and
 * `this.canBe` would be undefined when the validator is invoked.
 */
describe('SeaShape validator integration with CellsToBePlaced', () => {
  it('CoastalPort.validator works when used as a bare function inside CellsToBePlaced', () => {
    const board = Mask.fromCoords([[0, 0]])
    const validator = CoastalPort.validator
    const target = {
      boundsChecker: () => true,
      getZone: () => [Building.subterrain, CoastalPort.zone]
    }

    const placing = new CellsToBePlaced(
      board,
      0,
      0,
      validator,
      CoastalPort.zoneDetail,
      target
    )
    expect(placing.isInMatchingZone(0, 0)).toBe(true)
  })

  it('ShallowDock.validator works when used as a bare function inside CellsToBePlaced', () => {
    const board = Mask.fromCoords([[0, 0]])
    const validator = ShallowDock.validator
    const target = {
      boundsChecker: () => true,
      getZone: () => [SeaVessel.subterrain, ShallowDock.zone]
    }

    const placing = new CellsToBePlaced(
      board,
      0,
      0,
      validator,
      ShallowDock.zoneDetail,
      target
    )
    expect(placing.isInMatchingZone(0, 0)).toBe(true)
  })
})
