/**
 * @fileoverview Sea and Land Terrain Configuration
 *
 * Defines the classic "Sea and Land" game terrain with two distinct subterrains:
 * - Sea: Water-based environment with littoral (shallow) and deep zones
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
 * Terrain Structure:
 * ```
 * SeaAndLand
 * ├── Sea (water environment, letter='S')
 * │   ├── Littoral (L) - marginal, shallow water at interface
 * │   └── Deep (D) - non-marginal, open ocean
 * └── Land (ground environment, letter='G')
 *     ├── Coast (C) - marginal, shoreline
 *     └── Inland (I) - non-marginal, interior land
 * ```
 *
 * @module terrains/sea/js/seaAndLand
 * @author Game Development Team
 * @version 1.0.0
 * @see {@link https://github.com/battlesnake/minp_m} for game architecture
 * @see {@link Zone} for zone definition and structure
 * @see {@link SubTerrain} for subterrain definition and structure
 * @see {@link Terrain} for terrain definition and structure
 * @see {@link seaWeaponSounds} for sound effect mappings
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
 * terrain-specific restrictions (e.g., only deep-water sea vessels can occupy
 * deep zones). Provides the furthest-from-shore naval positioning for strategic depth.
 *
 * Zone Configuration:
 * - title: "Depths" - display name for zone selection menus
 * - letter: "D" - single character identifier for map encoding and storage
 * - isMarginal: false - zone is non-boundary, entirely within sea terrain
 * - usage: Deep-water naval units, submarines, deep-sea vessels
 * - restrictions: Cannot accept land-based or coastal units
 *
 * @type {Zone}
 * @constant
 * @readonly
 * @static
 * @public
 *
 * @property {string} title - "Depths" - human-readable zone name for UI display
 * @property {string} letter - "D" - zone abbreviation character for encoding/map storage
 * @property {boolean} isMarginal - false - zone is entirely within sea terrain (non-boundary)
 *
 * @returns {Zone} A new Zone instance representing deep ocean areas
 * @see {@link sea} for sea subterrain that contains this zone
 * @see {@link littoral} for shallow water alternative zone
 *
 * @example
 * // Deep zones only accept deep-water sea vessels, not coastal units
 * const isDeepZone = zoneInfo[1] === deep
 * if (isDeepZone && vessel.type() === 'S') {
 *   allowPlacement = DeepSeaVessel.validator(zoneInfo)
 * }
 */
export const deep = new Zone('Depths', 'D', false)

/**
 * Littoral (shallow water) zone descriptor.
 *
 * Represents shallow water areas where sea and land meet at the sea/land interface.
 * Marginal zone that touches both sea and land terrains, allowing for unique gameplay
 * mechanics where units from both environments interact. Examples include naval units
 * operating near shore and land-based coastal defenses.
 *
 * Zone Configuration:
 * - title: "Shallows" - display name for zone selection menus
 * - letter: "L" - single character identifier for map encoding (L for Littoral)
 * - isMarginal: true - zone is at boundary between sea and land terrains
 * - usage: Coastal ships, shallow-water vessels, some land units near water
 * - interactions: Allows cross-terrain unit placement and interactions
 *
 * @type {Zone}
 * @constant
 * @readonly
 * @static
 * @public
 *
 * @property {string} title - "Shallows" - human-readable zone name for UI display
 * @property {string} letter - "L" - zone abbreviation character for encoding/map storage (L for Littoral)
 * @property {boolean} isMarginal - true - zone is at sea/land boundary (marginal)
 *
 * @returns {Zone} A new Zone instance representing shallow water areas
 * @see {@link sea} for sea subterrain containing this zone
 * @see {@link coast} for the corresponding land-side marginal zone
 * @see {@link deep} for deep-water alternative zone
 *
 * @example
 * // Littoral zones may accept both shallow-water vessels and some land units
 * const isShallowZone = zoneInfo[1] === littoral
 * if (isShallowZone && vessel.type() === 'S') {
 *   allowPlacement = ShallowDock.validator(zoneInfo) // coastal vessels only
 * }
 */
export const littoral = new Zone('Shallows', 'L', true)

/**
 * Coastal zone descriptor.
 *
 * Represents coastline areas where land meets sea. Marginal zone that touches
 * both land and sea terrains. Used for units that must be positioned at the
 * intersection of land and water, such as port buildings or coastal defenses.
 *
 * Zone Configuration:
 * - title: "Coast" - display name for zone menus and UI
 * - letter: "C" - single character identifier for encoding
 * - isMarginal: true - zone is at land/sea boundary (marginal)
 * - usage: Port structures, coastal defense, amphibious units
 * - interactions: Allows both land and sea unit placement
 *
 * @type {Zone}
 * @constant
 * @readonly
 * @static
 * @public
 *
 * @property {string} title - "Coast" - human-readable zone name
 * @property {string} letter - "C" - zone abbreviation for encoding/display
 * @property {boolean} isMarginal - true - zone is at land/sea boundary
 *
 * @returns {Zone} A new Zone instance representing coastal areas
 * @see {@link land} for land subterrain containing this zone
 * @see {@link littoral} for the corresponding sea-side marginal zone
 * @see {@link inland} for inland alternative zone
 *
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
 * Zone Configuration:
 * - title: "Highlands" - display name for zone menus
 * - letter: "I" - single character identifier for encoding
 * - isMarginal: false - zone is non-boundary, entirely within land terrain
 * - usage: Land buildings, aircraft bases, interior fortifications
 * - restrictions: Cannot accept sea-based or naval units
 *
 * @type {Zone}
 * @constant
 * @readonly
 * @static
 * @public
 *
 * @property {string} title - "Highlands" - human-readable zone name
 * @property {string} letter - "I" - zone abbreviation for encoding/display
 * @property {boolean} isMarginal - false - zone is entirely within land terrain
 *
 * @returns {Zone} A new Zone instance representing inland areas
 * @see {@link land} for land subterrain containing this zone
 * @see {@link coast} for coastal alternative zone
 * @see {@link deep} for deep ocean equivalent on sea side
 *
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
 * Subterrain Configuration:
 * - title: "Sea" - display name for terrain selection and UI
 * - letter: "S" - unique identifier for sea subterrain
 * - isDefault: true - sea is the starting/default subterrain
 * - isTheLand: false - sea is not the land environment
 * - zones: [littoral, deep] - both marginal and non-marginal zones
 * - colors: Light (#1a78d6) and dark (#1761b0) water shades
 *
 * Visual Properties:
 * - lightColor: "#1a78d6" - Bright water blue for main rendering
 * - darkColor: "#1761b0" - Darker blue for shadows and depth effect
 * - Provides visual contrast between shallow and deep water
 *
 * Zone Structure:
 * - Littoral (L): Marginal zone at sea/land interface, shallow water
 * - Deep (D): Non-marginal zone entirely within sea, open ocean
 *
 * @type {SubTerrain}
 * @constant
 * @readonly
 * @static
 * @public
 *
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
 * @see {@link seaAndLand} for the parent terrain
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
 * Subterrain Configuration:
 * - title: "Land" - display name for terrain selection and UI
 * - letter: "G" - unique identifier for land subterrain (G for Ground)
 * - isDefault: false - land is not the starting terrain
 * - isTheLand: true - land is designated as the official land environment
 * - zones: [coast, inland] - both marginal and non-marginal zones
 * - colors: Light (#348239) and dark (#296334) green shades
 *
 * Visual Properties:
 * - lightColor: "#348239" - Bright grass green for main rendering
 * - darkColor: "#296334" - Darker green for shadows and terrain depth
 * - Provides visual contrast between coastal and interior land areas
 *
 * Zone Structure:
 * - Coast (C): Marginal zone at land/sea interface, shoreline areas
 * - Inland (I): Non-marginal zone entirely within land, interior regions
 *
 * @type {SubTerrain}
 * @constant
 * @readonly
 * @static
 * @public
 *
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
 * @see {@link seaAndLand} for the parent terrain
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
 * Terrain Properties:
 * - title: "Sea and Land" - display name for terrain selection
 * - key: "sea-and-land" - normalized identifier for lookups
 * - ships: null - uses default ship catalogue from game config
 * - weapons: null - uses default weapon effects
 * - sounds: seaWeaponSounds - terrain-specific audio configuration
 * - subterrains: [sea, land] - both water and ground environments
 * - hasTransforms: false - standard placement without transformations
 *
 * @type {Terrain}
 * @constant
 * @readonly
 * @static
 * @public
 *
 * @property {string} title - "Sea and Land" - terrain display name for UI
 * @property {string} key - "sea-and-land" - normalized identifier derived from title
 * @property {TerrainShipCatalogue|null} ships - null indicates default ship catalogue usage
 * @property {WeaponCatalogue|null} weapons - null indicates default weapon effects
 * @property {SubTerrain[]} subterrains - Array of two subterrains: [sea, land]
 * @property {string} tag - "SeaAndLand" - unique tag for terrain storage and lookup
 * @property {TerrainSoundConfig} sounds - Sound configuration object mapping weapon types to audio
 * @property {boolean} hasTransforms - false - this terrain does not use terrain transforms
 *
 * @returns {Terrain} A new Terrain instance for Sea and Land gameplay with full configuration
 * @see {@link sea} for sea subterrain configuration and zones
 * @see {@link land} for land subterrain configuration and zones
 * @see {@link seaWeaponSounds} for sound effect mappings and audio configuration
 *
 * @example
 * // Access the Sea and Land terrain
 * import { seaAndLand } from './seaAndLand.js'
 * const terrain = seaAndLand
 * console.log(terrain.title) // "Sea and Land"
 * console.log(terrain.key) // "sea-and-land"
 * console.log(terrain.subterrains.length) // 2
 */
export const seaAndLand = new Terrain(
  'Sea and Land',
  null,
  [sea, land],
  'SeaAndLand',
  undefined,
  undefined,
  seaWeaponSounds
)

/**
 * Set Sea and Land as the default terrain for game initialization.
 *
 * Assigns the seaAndLand terrain instance to terrains.default so it can be
 * accessed during game startup. This designation means that when a new game
 * is created without explicit terrain selection, the Sea and Land terrain
 * will be used by default.
 *
 * @type {Terrain}
 * @public
 */
// @ts-expect-error - terrains object allows dynamic property assignment for terrain defaults
terrains.default = seaAndLand
