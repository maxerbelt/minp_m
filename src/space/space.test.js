/* eslint-env jest */

/* global describe, it, test, expect, beforeEach, jest */
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
import { SubTerrain } from '../terrain/SubTerrain.js'
import { Terrain } from '../terrain/terrain.js' // match import used in space.js
import { jest } from '@jest/globals'
import { Zone } from '../terrain/Zone.js'

// Jest test suite
describe('space.js zones', () => {
  test('deep zone is non-marginal', () => {
    expect(deep).toBeInstanceOf(Zone)
    expect(deep.title).toBe('Deep Space')
    expect(deep.letter).toBe('D')
    expect(deep.isMarginal).toBe(false)
  })

  test('near zone is marginal', () => {
    expect(near).toBeInstanceOf(Zone)
    expect(near.isMarginal).toBe(true)
  })

  test('surface and core zones exist', () => {
    expect(surface).toBeInstanceOf(Zone)
    expect(core).toBeInstanceOf(Zone)
    expect(surface.isMarginal).toBe(true)
    expect(core.isMarginal).toBe(false)
  })
})

describe('space.js subterrains', () => {
  test('space subterrain with near and deep zones', () => {
    expect(space).toBeInstanceOf(SubTerrain)
    expect(space.title).toBe('Space')
    expect(space.letter).toBe('S')
    expect(Array.isArray(space.zones)).toBe(true)
    expect(space.zones).toContain(near)
    expect(space.zones).toContain(deep)
  })

  test('asteroid subterrain with surface and core zones', () => {
    expect(asteroid).toBeInstanceOf(SubTerrain)
    expect(asteroid.title).toBe('Asteroid')
    expect(asteroid.zones).toContain(surface)
    expect(asteroid.zones).toContain(core)
  })

  test('all subterrain has no zones', () => {
    expect(all).toBeInstanceOf(SubTerrain)
    expect(all.title).toBe('Shuttle')
    expect(all.zones.length).toBe(0)
  })
})

describe('spaceAndAsteroids terrain', () => {
  test('terrain includes space and asteroid subterrains', () => {
    expect(spaceAndAsteroids).toBeInstanceOf(Terrain)
    expect(spaceAndAsteroids.title).toBe('Space and Asteroids')
    expect(spaceAndAsteroids.subterrains).toContain(space)
    expect(spaceAndAsteroids.subterrains).toContain(asteroid)
  })

  test('terrain has weapons and transform flags set', () => {
    expect(spaceAndAsteroids.hasUnattachedWeapons).toBe(false)
    expect(spaceAndAsteroids.hasAttachedWeapons).toBe(true)
    expect(spaceAndAsteroids.hasTransforms).toBe(true)
  })
})
