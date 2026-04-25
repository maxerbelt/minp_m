import { Terrain } from '../../all/js/terrain.js'
import { SubTerrain } from '../../all/js/SubTerrain.js'
import { Zone } from '../../all/js/Zone.js'
import { spaceWeaponSounds } from './spaceWeaponSounds.js'
import { SubTerrainBase } from '../../all/js/SubTerrainBase.js'

/**
 * Deep space zone - represents empty void areas where ships cannot be placed.
 * @type {Zone}
 */
export const deep = new Zone('Deep Space', 'D', false)

/**
 * Near space zone - represents habitable space areas where ships can be placed.
 * @type {Zone}
 */
export const near = new Zone('Near Space', 'N', true)

/**
 * Surface zone - represents asteroid surface areas where installations can be placed.
 * @type {Zone}
 */
export const surface = new Zone('Surface', 'S', true)

/**
 * Core zone - represents asteroid core areas where ships cannot be placed.
 * @type {Zone}
 */
export const core = new Zone('Core', 'C', false)

/**
 * Space sub-terrain configuration for open space areas.
 * Allows space vessels and some installations.
 * @type {SubTerrain}
 */
export const space = new SubTerrain(
  'Space',
  '#e1d4f3',
  '#c2bdd2',
  'S',
  true,
  false,
  [near, deep]
)

/**
 * Asteroid sub-terrain configuration for rocky asteroid areas.
 * Allows installations and some hybrid ships.
 * @type {SubTerrain}
 */
export const asteroid = new SubTerrain(
  'Asteroid',
  '#eed8a0',
  '#d6c286',
  'G',
  false,
  true,
  [surface, core]
)

/**
 * Shuttle sub-terrain base configuration for small craft.
 * Allows any placement location.
 * @type {SubTerrainBase}
 */
export const all = new SubTerrainBase(
  'Shuttle',
  '#a77',
  '#955',
  'A',
  false,
  false,
  []
)

/**
 * Complete space and asteroids terrain configuration.
 * Combines space and asteroid sub-terrains with weapon sounds and terrain properties.
 * @type {Terrain}
 */
export const spaceAndAsteroids = new Terrain(
  'Space and Asteroids',
  [],
  [space, asteroid],
  'SpaceAndAsteroid',
  'Sector',
  null,
  spaceWeaponSounds
)

// Configure terrain-specific properties
spaceAndAsteroids.hasUnattachedWeapons = false
spaceAndAsteroids.hasAttachedWeapons = true
spaceAndAsteroids.hasTransforms = true
