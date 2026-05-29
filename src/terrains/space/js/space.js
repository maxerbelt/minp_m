import { Terrain } from '../../all/js/terrain.js'
import { SubTerrain } from '../../all/js/SubTerrain.js'
import { Zone } from '../../all/js/Zone.js'
import { spaceWeaponSounds } from './spaceWeaponSounds.js'
import { SubTerrainBase } from '../../all/js/SubTerrainBase.js'

/**
 * @typedef {Object} ZoneConfig
 * @property {string} name - Display name of the zone
 * @property {string} code - Single character zone identifier
 * @property {boolean} canPlace - Whether units can be placed in this zone
 */

/**
 * @typedef {Object} SubTerrainConfig
 * @property {string} name - Display name of sub-terrain
 * @property {string} colorLight - Light color for visualization (hex format)
 * @property {string} colorDark - Dark color for visualization (hex format)
 * @property {string} code - Single character identifier
 * @property {boolean} canShips - Whether ships can occupy cells in this sub-terrain
 * @property {boolean} canInstallations - Whether installations can occupy cells
 * @property {Zone[]} zones - Array of zones that comprise this sub-terrain
 */

/**
 * Space terrain module - defines zones, sub-terrains, and combat arena for space battles
 *
 * Configures the space and asteroids battleground with distinct zones for different
 * tactical areas:
 * - Deep/Near Space: Open space zones for space vessels and combat
 * - Asteroid Surface/Core: Rocky areas for installations and asteroid combat
 * - Shuttle terrain: Universal placement for small craft
 *
 * The space and asteroids terrain combines all sub-terrains to create a mixed
 * battleground with weapons, transforms, and attached weapon systems.
 *
 * @module space
 * @example
 * import { spaceAndAsteroids, space, asteroid } from './space.js'
 * const terrain = spaceAndAsteroids
 * const hasWeapons = terrain.hasAttachedWeapons  // true
 */

/**
 * Deep space zone - represents empty void areas where ships cannot be placed.
 *
 * Deep space is the unreachable or unstable void between habitable regions.
 * Ships cannot occupy deep space cells; it serves as a barrier or obstacle.
 *
 * @type {Zone}
 * @readonly
 * @property {string} name - 'Deep Space'
 * @property {string} code - 'D'
 * @property {boolean} canPlace - false (no placement allowed)
 *
 * @example
 * if (!deep.canPlace) {
 *   console.log('Deep space is impassable')
 * }
 */
export const deep = new Zone('Deep Space', 'D', false)

/**
 * Near space zone - represents habitable space areas where ships can be placed.
 *
 * Near space is the accessible region of open space where space vessels operate.
 * Ships can occupy and move through near space cells freely.
 *
 * @type {Zone}
 * @readonly
 * @property {string} name - 'Near Space'
 * @property {string} code - 'N'
 * @property {boolean} canPlace - true (placement allowed)
 *
 * @example
 * if (near.canPlace) {
 *   console.log('Ships can operate in near space')
 * }
 */
export const near = new Zone('Near Space', 'N', true)

/**
 * Surface zone - represents asteroid surface areas where installations can be placed.
 *
 * Asteroid surface is the exposed rocky shell where defensive installations
 * and mining operations are located.
 *
 * @type {Zone}
 * @readonly
 * @property {string} name - 'Surface'
 * @property {string} code - 'S'
 * @property {boolean} canPlace - true (placement allowed)
 */
export const surface = new Zone('Surface', 'S', true)

/**
 * Core zone - represents asteroid core areas where ships cannot be placed.
 *
 * The asteroid core is the dense interior region inaccessible to surface operations.
 * Ships cannot occupy core cells; it serves as an impenetrable barrier.
 *
 * @type {Zone}
 * @readonly
 * @property {string} name - 'Core'
 * @property {string} code - 'C'
 * @property {boolean} canPlace - false (no placement allowed)
 */
export const core = new Zone('Core', 'C', false)

/**
 * Space sub-terrain configuration for open space areas.
 *
 * Represents vast open space regions where space vessels operate and engage in combat.
 * Space sub-terrain combines near and deep zones:
 * - Near Space: habitable zones for ship placement
 * - Deep Space: barriers between regions (impassable)
 *
 * Ships can operate in space terrain; installations cannot.
 * Visualization uses light purple tones (#e1d4f3 to #c2bdd2).
 *
 * @type {SubTerrain}
 * @readonly
 * @property {string} name - 'Space'
 * @property {string} code - 'S'
 * @property {boolean} canShips - true (ships allowed)
 * @property {boolean} canInstallations - false (no installations)
 * @property {Zone[]} zones - [near, deep]
 *
 * @example
 * const spaceZones = space.zones  // [near, deep]
 * if (space.canShips) {
 *   console.log('Space vessels can operate here')
 * }
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
 *
 * Represents asteroid bodies with surface installations and hybrid combat zones.
 * Asteroid sub-terrain combines surface and core zones:
 * - Surface: exposed areas for installation placement
 * - Core: dense interior (impassable)
 *
 * Ships cannot operate in asteroids; installations can. Provides resource extraction
 * and defensive positioning options.
 * Visualization uses earthy beige tones (#eed8a0 to #d6c286).
 *
 * @type {SubTerrain}
 * @readonly
 * @property {string} name - 'Asteroid'
 * @property {string} code - 'G'
 * @property {boolean} canShips - false (no ships)
 * @property {boolean} canInstallations - true (installations allowed)
 * @property {Zone[]} zones - [surface, core]
 *
 * @example
 * const asteroidZones = asteroid.zones  // [surface, core]
 * if (asteroid.canInstallations) {
 *   console.log('Defensive installations can be placed')
 * }
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
 *
 * Universal shuttle terrain that allows placement in any map location without
 * terrain or zone restrictions. This is intentionally unrestricted to enable
 * hide-and-seek gameplay where shuttles must be able to occupy any terrain.
 *
 * Visualization uses reddish tones (#a77 to #955).
 * Both canBe() and validator() are overridden to always return true, allowing
 * unrestricted placement regardless of sub-terrain or zone.
 *
 * @type {SubTerrainBase}
 * @readonly
 * @property {string} name - 'Shuttle'
 * @property {string} code - 'A'
 * @property {boolean} canShips - false (not directly ship-based)
 * @property {boolean} canInstallations - false (not installation-based)
 * @property {Function} canBe - Always returns true for universal placement
 * @property {Function} validator - Always returns true (no validation)
 *
 * @example
 * if (all.canBe()) {
 *   console.log('Shuttles can be placed here')
 * }
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
 * Override shuttle terrain to allow universal placement
 *
 * The shuttle terrain is intentionally universal so that shuttle shapes are
 * not restricted by specific subterrain or zone validation. This is required
 * for space/asteroid hide-and-seek placement where shuttles can occupy any
 * map location.
 *
 * @type {Function}
 * @returns {boolean} Always true - allows placement in any location
 */
all.canBe = () => true

/**
 * Override shuttle terrain validator for universal validation
 *
 * Disables terrain validation for shuttles, allowing them to pass through
 * all validation checks regardless of zone or terrain type.
 *
 * @type {Function}
 * @returns {boolean} Always true - passes all validation checks
 */
all.validator = () => true

/**
 * Complete space and asteroids terrain configuration.
 *
 * Main battlefield terrain that combines space and asteroid sub-terrains
 * with configured weapons, transforms, and attached weapon systems. This is
 * the primary terrain used for space battle scenarios.
 *
 * Supports:
 * - **Attached weapons**: Ship-mounted weapons systems
 * - **Transforms**: Weapon and ship transformations
 * - **No unattached weapons**: All weapons must be mounted
 *
 * Includes space weapon sound effects for audio feedback during combat.
 * Terrain key: 'SpaceAndAsteroid', Sector name: 'Sector'
 *
 * @type {Terrain}
 * @readonly
 * @property {string} name - 'Space and Asteroids'
 * @property {SubTerrain[]} subTerrains - [space, asteroid]
 * @property {string} terrainKey - 'SpaceAndAsteroid'
 * @property {string} sectorName - 'Sector'
 * @property {Object} weaponSounds - Audio effects for weapon impacts
 * @property {boolean} hasUnattachedWeapons - false (no unattached weapons)
 * @property {boolean} hasAttachedWeapons - true (ship-mounted weapons)
 * @property {boolean} hasTransforms - true (transformations enabled)
 *
 * @example
 * import { spaceAndAsteroids } from './space.js'
 * const terrain = spaceAndAsteroids
 * console.log(terrain.hasAttachedWeapons)  // true
 * console.log(terrain.subTerrains.length)  // 2 (space and asteroid)
 */
export const spaceAndAsteroids = new Terrain(
  'Space and Asteroids',
  null,
  [space, asteroid],
  'SpaceAndAsteroid',
  'Sector',
  null,
  spaceWeaponSounds
)

/**
 * Configure terrain to have attached weapons but no unattached weapons
 *
 * Space and asteroid battles use ship-mounted weapons exclusively.
 * Unattached weapons that float freely on the map are not permitted.
 *
 * @type {boolean}
 */
// Configure terrain-specific properties
spaceAndAsteroids.hasUnattachedWeapons = false

/**
 * Enable attached (ship-mounted) weapon systems for the terrain
 *
 * Ships in space and asteroid battles can carry and mount weapons,
 * providing combat capabilities as part of their configuration.
 *
 * @type {boolean}
 */
spaceAndAsteroids.hasAttachedWeapons = true

/**
 * Enable shape transformations for the terrain
 *
 * Space and asteroid battles support ship and weapon transformations,
 * allowing dynamic modification of unit capabilities during gameplay.
 *
 * @type {boolean}
 */
spaceAndAsteroids.hasTransforms = true
