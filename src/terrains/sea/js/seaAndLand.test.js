/* eslint-env jest */

/* global describe, test, expect */
import {
  deep,
  littoral,
  coast,
  inland,
  sea,
  land,
  seaAndLand
} from './seaAndLand'
import { Zone } from '../../all/js/Zone.js'
import { SubTerrain } from '../../all/js/SubTerrain.js'
import { Terrain } from '../../all/js/terrain.js'
import { terrains } from '../../all/js/terrains.js'

describe('seaAndLand zones', () => {
  test('deep zone is non-marginal', () => {
    expect(deep).toBeInstanceOf(Zone)
    expect(deep.title).toBe('Depths')
    expect(deep.letter).toBe('D')
    expect(deep.isMarginal).toBe(false)
  })

  test('littoral zone is marginal', () => {
    expect(littoral).toBeInstanceOf(Zone)
    expect(littoral.title).toBe('Shallows')
    expect(littoral.letter).toBe('L')
    expect(littoral.isMarginal).toBe(true)
  })

  test('coast and inland zones', () => {
    expect(coast).toBeInstanceOf(Zone)
    expect(coast.title).toBe('Coast')
    expect(coast.letter).toBe('C')
    expect(coast.isMarginal).toBe(true)

    expect(inland).toBeInstanceOf(Zone)
    expect(inland.title).toBe('Highlands')
    expect(inland.letter).toBe('I')
    expect(inland.isMarginal).toBe(false)
  })
})

describe('seaAndLand subterrains', () => {
  test('sea subterrain with littoral and deep zones', () => {
    expect(sea).toBeInstanceOf(SubTerrain)
    expect(sea.title).toBe('Sea')
    expect(sea.letter).toBe('S')
    expect(sea.isDefault).toBe(true)
    expect(sea.isTheLand).toBe(false)
    expect(Array.isArray(sea.zones)).toBe(true)
    expect(sea.zones).toContain(littoral)
    expect(sea.zones).toContain(deep)
  })

  test('land subterrain with coast and inland zones', () => {
    expect(land).toBeInstanceOf(SubTerrain)
    expect(land.title).toBe('Land')
    expect(land.letter).toBe('G')
    expect(land.isDefault).toBe(false)
    expect(land.isTheLand).toBe(true)
    expect(land.zones).toContain(coast)
    expect(land.zones).toContain(inland)
  })

  test('sea and land have canBe and validator methods', () => {
    expect(typeof sea.canBe).toBe('function')
    expect(typeof sea.validator).toBe('function')
    expect(typeof land.canBe).toBe('function')
    expect(typeof land.validator).toBe('function')
  })
})

describe('seaAndLand terrain', () => {
  test('terrain includes sea and land subterrains', () => {
    // Use constructor name to avoid cross-module instance mismatches in test env
    expect(seaAndLand.constructor && seaAndLand.constructor.name).toBe(
      Terrain.name
    )
    expect(seaAndLand.title).toBe('Sea and Land')
    expect(seaAndLand.subterrains).toContain(sea)
    expect(seaAndLand.subterrains).toContain(land)
  })

  test('terrain has sea as default and land as land subterrain', () => {
    expect(seaAndLand.defaultSubterrain).toBe(sea)
    expect(seaAndLand.landSubterrain).toBe(land)
  })

  test('seaAndLand is set as default terrain', () => {
    expect(terrains.default).toBe(seaAndLand)
  })
})
