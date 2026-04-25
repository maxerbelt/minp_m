/* eslint-env jest */

/* global describe, it,  expect,  jest */
import {
  deep,
  near,
  surface,
  core,
  space,
  asteroid,
  all,
  spaceAndAsteroids
} from './space.js'
import { SubTerrain } from '../../all/js/SubTerrain.js'
import { SubTerrainBase } from '../../all/js/SubTerrainBase.js'
import { Terrain } from '../../all/js/terrain.js' // match import used in space.js
import { describe, it, expect } from '@jest/globals'
import { Zone } from '../../all/js/Zone.js'

// Jest it suite
describe('space.js zones', () => {
  it('deep zone is non-marginal', () => {
    expect(deep).toBeInstanceOf(Zone)
    expect(deep.title).toBe('Deep Space')
    expect(deep.letter).toBe('D')
    expect(deep.isMarginal).toBe(false)
  })

  it('near zone is marginal', () => {
    expect(near).toBeInstanceOf(Zone)
    expect(near.isMarginal).toBe(true)
  })

  it('surface and core zones exist', () => {
    expect(surface).toBeInstanceOf(Zone)
    expect(core).toBeInstanceOf(Zone)
    expect(surface.isMarginal).toBe(true)
    expect(core.isMarginal).toBe(false)
  })
})

describe('space.js subterrains', () => {
  it('space subterrain with near and deep zones', () => {
    expect(space).toBeInstanceOf(SubTerrain)
    expect(space.title).toBe('Space')
    expect(space.letter).toBe('S')
    expect(Array.isArray(space.zones)).toBe(true)
    expect(space.zones).toContain(near)
    expect(space.zones).toContain(deep)
  })

  it('asteroid subterrain with surface and core zones', () => {
    expect(asteroid).toBeInstanceOf(SubTerrain)
    expect(asteroid.title).toBe('Asteroid')
    expect(asteroid.zones).toContain(surface)
    expect(asteroid.zones).toContain(core)
  })

  it('all subterrain has no zones', () => {
    expect(all).toBeInstanceOf(SubTerrainBase)
    expect(all.title).toBe('Shuttle')
    expect(all.zones.length).toBe(0)
  })
})

describe('spaceAndAsteroids terrain', () => {
  it('terrain includes space and asteroid subterrains', () => {
    expect(spaceAndAsteroids).toBeInstanceOf(Terrain)
    expect(spaceAndAsteroids.title).toBe('Space and Asteroids')
    expect(spaceAndAsteroids.subterrains).toContain(space)
    expect(spaceAndAsteroids.subterrains).toContain(asteroid)
  })

  it('terrain has weapons and transform flags set', () => {
    expect(spaceAndAsteroids.hasUnattachedWeapons).toBe(false)
    expect(spaceAndAsteroids.hasAttachedWeapons).toBe(true)
    expect(spaceAndAsteroids.hasTransforms).toBe(true)
  })
})
