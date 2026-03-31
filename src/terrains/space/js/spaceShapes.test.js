/* eslint-env jest */

/* global describe, test, it, expect, beforeEach, jest */
import { jest } from '@jest/globals'
import {
  Installation,
  CoreInstallation,
  SurfaceInstallation,
  Shuttle,
  SpaceVessel,
  DeepSpaceVessel,
  SpacePort
} from './spaceShapes'
import { asteroid, core, surface, space, deep, near, all } from './space'

const point = [[0, 0]]
// Jest test suite
describe('SpaceShape base behavior', () => {
  test('Installation basic behavior and type', () => {
    const inst = new Installation('Mine', 'M', null, point)
    expect(inst.description()).toBe('Mine')
    expect(inst.type()).toBe('G')
    expect(inst.subterrain).toBe(Installation.subterrain)
    expect(typeof Installation.canBe).toBe('function')
  })

  test('Shuttle properties and methods', () => {
    const s = new Shuttle('Shuttle', 'H', null, point)
    expect(s.type()).toBe('A')
    expect(s.sunkDescription()).toBe('Shot Down')
    expect(Array.isArray(s.immune)).toBe(true)
    expect(s.immune).toContain('#')
  })
})

describe('Validators and canBe static methods', () => {
  test('CoreInstallation canBe and validator', () => {
    expect(CoreInstallation.canBe(asteroid, core)).toBe(true)
    expect(CoreInstallation.canBe(asteroid, surface)).toBe(false)
    expect(CoreInstallation.validator([asteroid, core])).toBe(true)
  })

  test('SurfaceInstallation canBe and validator', () => {
    expect(SurfaceInstallation.canBe(asteroid, surface)).toBe(true)
    expect(SurfaceInstallation.validator([asteroid, surface])).toBe(true)
    expect(SurfaceInstallation.canBe(space, surface)).toBe(false)
  })

  test('DeepSpaceVessel and SpacePort zone checks', () => {
    expect(DeepSpaceVessel.canBe(space, deep)).toBe(true)
    expect(DeepSpaceVessel.validator([space, deep])).toBe(true)

    expect(SpacePort.canBe(space, near)).toBe(true)
    expect(SpacePort.validator([space, near])).toBe(true)
  })

  test('Shuttle accepts all via static canBe', () => {
    expect(Shuttle.canBe).toBe(all.canBe)
  })
})

describe('SpaceVessel type', () => {
  test('SpaceVessel type S', () => {
    const sv = new SpaceVessel('V', 'V', null, point)
    expect(sv.type()).toBe('S')
  })
})
