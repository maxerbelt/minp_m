/**
 * @fileoverview Sea terrain domain type definitions
 *
 * Core domain types for sea/land terrain shapes, vessels, and placement validation.
 * Defines the shape hierarchy, terrain constraints, and zone validation patterns
 * used throughout sea/land gameplay mechanics.
 *
 * @module terrains/sea/types/domain.types
 */

/**
 * Zone information tuple for comprehensive terrain validation.
 *
 * Combines subterrain and zone for validating placement in correct terrain type
 * AND correct zone within that terrain. Used throughout placement validation system.
 *
 * @typedef {[SubTerrain, Zone]} ZoneInfo
 * @property {SubTerrain} [0] - Base terrain type (sea, land, all, etc)
 * @property {Zone} [1] - Zone within the terrain (deep, littoral, inland, coast, etc)
 *
 * @example
 * const zoneInfo: ZoneInfo = [sea, deep] // deep ocean zone
 * const isValid = DeepSeaVessel.validator(zoneInfo) // true if valid
 */
export type ZoneInfo = readonly [SubTerrain, Zone]

/**
 * Subterrain interface for terrain environment definitions.
 *
 * Represents a distinct terrain environment (sea, land, air) with visual properties,
 * zone configurations, and placement validation rules.
 *
 * @interface SubTerrain
 * @property {string} title - Display name for UI and terrain selection
 * @property {string} letter - Unique identifier (S for sea, G for ground, A for all)
 * @property {string} lightColor - Primary hex color for rendering
 * @property {string} darkColor - Secondary hex color for shadows/depth
 * @property {boolean} isDefault - Whether this is a primary starting terrain
 * @property {boolean} isTheLand - Whether this is designated as "the land" terrain
 * @property {readonly Zone[]} zones - Available zones within this terrain
 * @property {number} zoneDetail - Zone validation detail level (0-2)
 * @property {(subterrain: SubTerrain) => boolean} canBe - Validator for placement
 * @property {(zoneInfo: ZoneInfo) => boolean} validator - Zone-aware validator
 */
export interface SubTerrain {
  readonly title: string
  readonly letter: string
  readonly lightColor: string
  readonly darkColor: string
  readonly isDefault: boolean
  readonly isTheLand: boolean
  readonly zones: readonly Zone[]
  readonly zoneDetail: number
  canBe: (subterrain: SubTerrain) => boolean
  validator: (zoneInfo: ZoneInfo) => boolean
}

/**
 * Zone interface for terrain zone definitions.
 *
 * Represents a distinct zone within a terrain environment with positioning rules
 * and marginal/non-marginal classification.
 *
 * @interface Zone
 * @property {string} title - Display name for zone selection menus
 * @property {string} letter - Single character identifier (D, L, C, I, etc)
 * @property {boolean} isMarginal - Whether zone touches multiple terrains
 *
 * @example
 * deep zone = { title: 'Depths', letter: 'D', isMarginal: false } // entirely sea
 * littoral zone = { title: 'Shallows', letter: 'L', isMarginal: true } // sea/land boundary
 */
export interface Zone {
  readonly title: string
  readonly letter: string
  readonly isMarginal: boolean
}

/**
 * Terrain interface for combined terrain configuration.
 *
 * Defines complete terrain environment with all subterrains, zones, and validation rules.
 * Represents the unified sea and land terrain system.
 *
 * @interface Terrain
 * @property {string} title - Display name for terrain selection and UI
 * @property {readonly SubTerrain[]} subTerrains - All subterrains in this terrain
 * @property {(subterrain: SubTerrain) => boolean} canBe - Validator for subterrain
 */
export interface Terrain {
  readonly title: string
  readonly subTerrains: readonly SubTerrain[]
  canBe: (subterrain: SubTerrain) => boolean
}

/**
 * Shape validator function for placement validation.
 *
 * Validates whether a shape can be placed in a given terrain zone.
 * May accept full ZoneInfo or just SubTerrain depending on zone detail level.
 *
 * @typedef {Function} ShapeValidator
 * @param {ZoneInfo | SubTerrain} terrainInfo - Zone information or subterrain for validation
 * @returns {boolean} True if placement is valid, false otherwise
 */
export type ShapeValidator = (terrainInfo: ZoneInfo | SubTerrain) => boolean

/**
 * Shape type identifiers for game mechanics categorization.
 *
 * Discriminates unit types for special handling in placement, combat, and movement.
 * Controls which terrain types a shape can occupy and special gameplay rules.
 *
 * @typedef {('A' | 'G' | 'S' | 'M' | 'T' | 'X' | 'W')} ShapeType
 *
 * Type codes:
 * - 'A': Air/Aircraft - unrestricted terrain placement
 * - 'G': Ground/Building - land-only placement
 * - 'S': Sea/Vessel - sea-only placement
 * - 'M': Hybrid - mixed terrain with special rules
 * - 'T': Transformer - special terrain interaction
 * - 'X': Special - custom placement rules
 * - 'W': Weapon - abstract weapon/marker unit
 */
export type ShapeType = 'A' | 'G' | 'S' | 'M' | 'T' | 'X' | 'W'

/**
 * Destruction description terminology for different unit types.
 *
 * Defines what text is displayed when units are destroyed, providing narrative variety.
 * Different unit types use appropriate destruction language.
 *
 * @typedef {('Sunk' | 'Shot Down' | 'Destroyed')} DestructionDescription
 *
 * Terminology by type:
 * - 'Sunk': Used for sea vessels (type S)
 * - 'Shot Down': Used for aircraft (type A)
 * - 'Destroyed': Used for buildings and other units (types G, M, T, X, W)
 */
export type DestructionDescription = 'Sunk' | 'Shot Down' | 'Destroyed'

/**
 * Shape properties defining unit behavior and vulnerabilities.
 *
 * Describes weapon/terrain type interactions for damage and combat mechanics.
 * Allows units to have differential resistance to various weapon and terrain types.
 *
 * @interface ShapeProperties
 * @property {readonly string[]} [vulnerable] - Weapon types this unit is weak against
 * @property {readonly string[]} [hardened] - Weapon types this unit resists
 * @property {readonly string[]} [immune] - Weapon types/terrain this unit ignores
 * @property {readonly string[]} [notes] - Flavor text and placement rules
 */
export interface ShapeProperties {
  readonly vulnerable?: readonly string[]
  readonly hardened?: readonly string[]
  readonly immune?: readonly string[]
  readonly notes?: readonly string[]
}

/**
 * Placement notes for unit placement guidance.
 *
 * Array of human-readable strings describing placement constraints and special rules
 * displayed to players during unit placement.
 *
 * @typedef {readonly string[]} PlacementNotes
 */
export type PlacementNotes = readonly string[]

/**
 * Cell coordinate pair for grid positioning.
 *
 * Represents a single grid cell position as [row, column] pair.
 * Used throughout placement and board manipulation.
 *
 * @typedef {[number, number]} CellCoordinate
 * @example
 * const position: CellCoordinate = [3, 5] // row 3, column 5
 */
export type CellCoordinate = readonly [number, number]

/**
 * Cell coordinate array for shape definitions.
 *
 * Complete list of cell coordinates defining a shape's footprint on the game board.
 * Each coordinate is relative to the shape's placement origin.
 *
 * @typedef {readonly CellCoordinate[]} CellCoordinates
 */
export type CellCoordinates = readonly CellCoordinate[]

/**
 * Rack coordinate array for weapon attachment points.
 *
 * Defines positions where weapons can be attached to a shape for combat.
 * Optional for structures without weapons.
 *
 * @typedef {readonly CellCoordinate[] | null | undefined} RackCoordinates
 */
export type RackCoordinates = readonly CellCoordinate[] | null | undefined

/**
 * Shape configuration parameters for construction.
 *
 * Bundles together all parameters needed to instantiate a shape with proper
 * terrain configuration and placement rules.
 *
 * @interface ShapeConfig
 * @property {string} description - Human-readable name of the shape
 * @property {string} letter - Single character identifier
 * @property {string} symmetry - Symmetry type (S, A, G, X, W)
 * @property {CellCoordinates} cells - Shape footprint coordinates
 * @property {string} [tip] - Optional placement tip text
 * @property {RackCoordinates} [racks] - Optional weapon attachment points
 * @property {SubTerrain} subterrain - Terrain type for placement
 * @property {ShapeValidator} validator - Placement validator function
 * @property {number} zoneDetail - Zone validation detail level
 * @property {ShapeProperties} [properties] - Damage and vulnerability properties
 */
export interface ShapeConfig {
  readonly description: string
  readonly letter: string
  readonly symmetry: string
  readonly cells: CellCoordinates
  readonly tip?: string
  readonly racks?: RackCoordinates
  readonly subterrain: SubTerrain
  readonly validator: ShapeValidator
  readonly zoneDetail: number
  readonly properties?: ShapeProperties
}

/**
 * Hybrid shape component configuration for multi-terrain units.
 *
 * Defines how a hybrid unit's components validate against different terrains,
 * allowing parts of a single unit to occupy different terrain types.
 *
 * @interface HybridComponentConfig
 * @property {SubTerrain} subterrain - Terrain for this component
 * @property {ShapeValidator} validator - Placement validator for component
 * @property {number} zoneDetail - Zone validation level for component
 * @property {readonly CellCoordinate[]} specialCells - Special component cell offsets
 */
export interface HybridComponentConfig {
  readonly subterrain: SubTerrain
  readonly validator: ShapeValidator
  readonly zoneDetail: number
  readonly specialCells?: readonly CellCoordinate[]
}
