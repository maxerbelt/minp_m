/**
 * @fileoverview Sea and Land Terrain Configuration
 *
 * Defines the classic "Sea and Land" game terrain with two distinct subterrains:
 * - Sea: Water-based environment with littoral and deep zones
 * - Land: Ground-based environment with coastal and inland zones
 *
 * The terrain system supports zone-specific gameplay rules where units can only be
 * placed in certain zones. Zones are classified as marginal (touching both terrains)
 * or non-marginal (entirely within a single terrain).
 *
 * Zone Classifications:
 * - Marginal zones (isMarginal=true): Touch both sea and land terrains
 * - Non-marginal zones (isMarginal=false): Exist entirely within one terrain
 *
 * @module terrains/sea/js/seaAndLand
 * @see {@link https://github.com/battlesnake/minp_m} for game architecture
 * @see {@link Zone} for zone definition
 * @see {@link SubTerrain} for subterrain definition
 * @see {@link Terrain} for terrain definition
 */

import { terrains } from '../../all/js/terrains.js'
import { Terrain } from '../../all/js/terrain.js'
import { SubTerrain } from '../../all/js/SubTerrain.js'
import { Zone } from '../../all/js/Zone.js'
import { seaWeaponSounds } from './seaWeaponSounds.js'

/**
 * Deep ocean zone descriptor.
 *
 * Represents the deepest water locations in the sea terrain. Non-marginal zone
 * that exists entirely within sea areas. Used for unit placement validation and
 * terrain-specific restrictions (e.g., only sea vessels can occupy deep zones).
 *
 * @type {Zone}
 * @constant
 * @readonly
 * @static
 * @property {string} title - "Depths" - human-readable zone name
 * @property {string} letter - "D" - zone abbreviation for encoding/display
 * @property {boolean} isMarginal - false - zone is entirely within sea terrain
 *
 * @returns {Zone} A new Zone instance representing deep ocean areas
 * @example
 * // Deep zones only accept sea vessels, not coastal units
 * const isDeepZone = zoneInfo.zone === deep
 */
export const deep = new Zone('Depths', 'D', false)

/**
 * Littoral (shallow water) zone descriptor.
 *
 * Represents shallow water areas where sea and land meet. Marginal zone that
 * touches both sea and land terrains, allowing for unique gameplay mechanics.
 * Units from both terrains may be placed in littoral zones, depending on their
 * type-specific restrictions.
 *
 * @type {Zone}
 * @constant
 * @readonly
 * @static
 * @property {string} title - "Shallows" - human-readable zone name
 * @property {string} letter - "L" - zone abbreviation for encoding/display
 * @property {boolean} isMarginal - true - zone is at sea/land boundary
 *
 * @returns {Zone} A new Zone instance representing shallow water areas
 * @example
 * // Littoral zones may accept both sea and land units
 * const isShallowZone = zoneInfo.zone === littoral
 */
export const littoral = new Zone('Shallows', 'L', true)

/**
 * Coastal zone descriptor.
 *
 * Represents coastline areas where land meets sea. Marginal zone that touches
 * both land and sea terrains. Used for units that must be positioned at the
 * intersection of land and water, such as port buildings or coastal defenses.
 *
 * @type {Zone}
 * @constant
 * @readonly
 * @static
 * @property {string} title - "Coast" - human-readable zone name
 * @property {string} letter - "C" - zone abbreviation for encoding/display
 * @property {boolean} isMarginal - true - zone is at land/sea boundary
 *
 * @returns {Zone} A new Zone instance representing coastal areas
 * @example
 * // Coastal zones may accept land and some sea units
 * const isCoastalZone = zoneInfo.zone === coast
 */
export const coast = new Zone('Coast', 'C', true)

/**
 * Inland zone descriptor.
 *
 * Represents deep land locations away from water. Non-marginal zone that exists
 * entirely within land areas. Used for unit placement validation where only
 * land-based units (buildings, aircraft) can be placed.
 *
 * @type {Zone}
 * @constant
 * @readonly
 * @static
 * @property {string} title - "Highlands" - human-readable zone name
 * @property {string} letter - "I" - zone abbreviation for encoding/display
 * @property {boolean} isMarginal - false - zone is entirely within land terrain
 *
 * @returns {Zone} A new Zone instance representing inland areas
 * @example
 * // Inland zones only accept land units, not sea vessels
 * const isInlandZone = zoneInfo.zone === inland
 */
export const inland = new Zone('Highlands', 'I', false)

/**
 * Sea subterrain descriptor.
 *
 * Defines the water-based environment of the Sea and Land terrain. Contains all
 * configuration for sea-specific gameplay including visual styling, zone definitions,
 * and placement rules. Sea units (ships, submarines) are restricted to this subterrain
 * through type validation in the placement system.
 *
 * @type {SubTerrain}
 * @constant
 * @readonly
 * @static
 * @property {string} title - "Sea" - display name for the water terrain
 * @property {string} lightColor - "#1a78d6" - bright water color for rendering
 * @property {string} darkColor - "#1761b0" - dark water color for shadows/depth
 * @property {string} letter - "S" - subterrain identifier for encoding
 * @property {boolean} isDefault - true - marks sea as one of the primary terrains
 * @property {boolean} isTheLand - false - sea is not the land terrain
 * @property {Zone[]} zones - array of sea zones: [littoral, deep]
 *   - littoral (marginal): shallow water at sea/land interface
 *   - deep (non-marginal): open water
 *
 * @returns {SubTerrain} A new SubTerrain instance for the water environment
 * @see {@link deep} for the deep zone definition
 * @see {@link littoral} for the littoral zone definition
 */
export const sea = new SubTerrain(
  'Sea',
  '#1a78d6',
  '#1761b0',
  'S',
  true,
  false,
  [littoral, deep]
)

/**
 * Land subterrain descriptor.
 *
 * Defines the ground-based environment of the Sea and Land terrain. Contains all
 * configuration for land-specific gameplay including visual styling, zone definitions,
 * and placement rules. Land units (buildings, aircraft) are restricted to this
 * subterrain through type validation in the placement system.
 *
 * @type {SubTerrain}
 * @constant
 * @readonly
 * @static
 * @property {string} title - "Land" - display name for the ground terrain
 * @property {string} lightColor - "#348239" - bright grass/ground color for rendering
 * @property {string} darkColor - "#296334" - dark ground color for shadows/depth
 * @property {string} letter - "G" - subterrain identifier for encoding (G for Ground)
 * @property {boolean} isDefault - false - land is not the default spawning terrain
 * @property {boolean} isTheLand - true - marks land as the official "land" terrain
 * @property {Zone[]} zones - array of land zones: [coast, inland]
 *   - coast (marginal): shoreline at land/sea interface
 *   - inland (non-marginal): interior land away from water
 *
 * @returns {SubTerrain} A new SubTerrain instance for the ground environment
 * @see {@link coast} for the coastal zone definition
 * @see {@link inland} for the inland zone definition
 */
export const land = new SubTerrain(
  'Land',
  '#348239',
  '#296334',
  'G',
  false,
  true,
  [coast, inland]
)

/**
 * Sea and Land terrain configuration.
 *
 * The primary terrain for classic naval warfare gameplay. Combines a sea environment
 * (with deep ocean and shallow water zones) with a land environment (with inland and
 * coastal zones) to create a mixed-terrain battlefield.
 *
 * Zone Structure:
 * - Sea Zones:
 *   - Deep (D): Non-marginal, accepts deep-water sea vessels only
 *   - Littoral (L): Marginal, accepts both sea and land units near shore
 * - Land Zones:
 *   - Coastal (C): Marginal, accepts both land and some sea units near shore
 *   - Inland (I): Non-marginal, accepts land units away from water
 *
 * Unit Placement Rules:
 * - Sea vessels (ships, submarines) place only in sea zones
 * - Land buildings place only in land zones
 * - Aircraft place in land zones only
 * - Some units (ports, docks) may have zone-specific restrictions
 *
 * @type {Terrain}
 * @constant
 * @readonly
 * @static
 * @property {string} title - "Sea and Land" - terrain display name
 * @property {null} shipInfo - null, uses default ship catalogue
 * @property {SubTerrain[]} subterrains - [sea, land] array containing both environments
 * @property {string} name - "SeaAndLand" - identifier for terrain storage/lookup
 * @property {null} sunkDescriptionMaker - null, uses default sunk descriptions
 * @property {null} shipShapes - null, uses default ship shapes
 * @property {TerrainSoundConfig} sounds - weapon sound effects for sea terrain
 *
 * @returns {Terrain} A new Terrain instance for Sea and Land gameplay
 * @see {@link sea} for sea subterrain configuration
 * @see {@link land} for land subterrain configuration
 * @see {@link seaWeaponSounds} for sound effect mappings
 *
 * @example
 * // Access the Sea and Land terrain
 * import { seaAndLand } from './seaAndLand.js'
 * const terrain = seaAndLand
 * console.log(terrain.title) // "Sea and Land"
 */
export const seaAndLand = new Terrain(
  'Sea and Land',
  null,
  [sea, land],
  'SeaAndLand',
  null,
  null,
  seaWeaponSounds
)
terrains.default = seaAndLand
