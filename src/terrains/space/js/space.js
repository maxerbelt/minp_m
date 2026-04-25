import { Terrain } from '../../all/js/terrain.js'
import { SubTerrain } from '../../all/js/SubTerrain.js'
import { Zone } from '../../all/js/Zone.js'
import { spaceWeaponSounds } from './spaceWeaponSounds.js'
import { SubTerrainBase } from '../../all/js/SubTerrainBase.js'

export const deep = new Zone('Deep Space', 'D', false)
export const near = new Zone('Near Space', 'N', true)
export const surface = new Zone('Surface', 'S', true)
export const core = new Zone('Core', 'C', false)
export const space = new SubTerrain(
  'Space',
  '#e1d4f3',
  '#c2bdd2',
  'S',
  true,
  false,
  [near, deep]
)
export const asteroid = new SubTerrain(
  'Asteroid',
  '#eed8a0',
  '#d6c286',
  'G',
  false,
  true,
  [surface, core]
)
export const all = new SubTerrainBase(
  'Shuttle',
  '#a77',
  '#955',
  'A',
  false,
  false,
  []
)

export const spaceAndAsteroids = new Terrain(
  'Space and Asteroids',
  [],
  [space, asteroid],
  'SpaceAndAsteroid',
  'Sector',
  null,
  spaceWeaponSounds
)

spaceAndAsteroids.hasUnattachedWeapons = false
spaceAndAsteroids.hasAttachedWeapons = true
spaceAndAsteroids.hasTransforms = true
