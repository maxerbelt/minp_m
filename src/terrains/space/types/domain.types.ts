/**
 * Core domain type definitions for space terrain game mechanics.
 *
 * Provides fundamental types for:
 * - Unit classification and categorization
 * - Ship and installation types
 * - Unit placement rules and constraints
 * - Destructibility and sink descriptions
 *
 * @module terrains/space/types/domain.types
 */

/**
 * Single-letter code uniquely identifying a unit type in space terrain.
 * Used as keys in configuration objects and for unit classification.
 *
 * Type codes:
 * - 'A': Shuttle - Flexible placement (any zone)
 * - 'G': Installation (Ground/fixed) - Asteroid only
 * - 'M': Hybrid - Mixed terrain capable
 * - 'T': Transformer - Multiple forms
 * - 'X': Special - Custom rules per unit
 * - 'S': Space Vessel - Open space only
 * - 'W': Weapon - Special placement rules
 *
 * @typedef {'A' | 'G' | 'M' | 'T' | 'X' | 'S' | 'W'} ShipTypeCode
 *
 * @example
 * const typeCode: ShipTypeCode = 'S'  // Space vessel
 * const typeCode: ShipTypeCode = 'A'  // Shuttle
 */
export type ShipTypeCode = 'A' | 'G' | 'M' | 'T' | 'X' | 'S' | 'W'

/**
 * Text description for what happens when a unit is destroyed.
 * Used for UI feedback and user clarity about unit fate.
 *
 * Descriptions:
 * - 'Shot Down': For aerial/shuttle units
 * - 'Destroyed': For ground installations and space vessels
 * - 'Detonated': For weapons that explode on impact
 *
 * @typedef {'Shot Down' | 'Destroyed' | 'Detonated'} SinkDescription
 */
export type SinkDescription = 'Shot Down' | 'Destroyed' | 'Detonated'

/**
 * Human-readable category name for unit grouping and classification.
 * Used in UI for organizing units in selection interfaces and displays.
 *
 * Group names:
 * - 'Shuttle': Mobile units with flexible placement
 * - 'Asteroid': Fixed installations on asteroids
 * - 'Space': Vessels operating in open space
 * - 'Hybrid': Units spanning multiple terrains
 * - 'Transformer': Units with multiple forms
 * - 'Special': Custom units with unique mechanics
 * - 'Weapon': Offensive systems and mines
 *
 * @typedef {string} GroupName
 */
export type GroupName = string

/**
 * Placement rule or constraint description.
 * Explains to players where and how a unit can be placed on the map.
 * References terrain zones (lavender for space, beige for asteroid).
 *
 * @typedef {string} PlacementRule
 *
 * @example
 * 'These are added to the any area (space or asteroid) of the map'      // Shuttle
 * 'These are added to the beige areas (asteroid) of the map'            // Installation
 * 'These are added to the lavender areas (space) of the map'            // Space vessel
 */
export type PlacementRule = string

/**
 * Configuration mapping for a single ship type code.
 * Maps a ship type to its key characteristics for display and validation.
 *
 * @typedef {Object} ShipTypeMapping
 * @property {SinkDescription} sinkDescription - What text displays when unit destroyed
 * @property {GroupName} groupName - Category for UI grouping
 * @property {PlacementRule} placementRule - Placement constraints and guidelines
 *
 * @example
 * {
 *   sinkDescription: 'Shot Down',
 *   groupName: 'Shuttle',
 *   placementRule: 'These are added to the any area (space or asteroid) of the map'
 * }
 */
export interface ShipTypeMapping {
  readonly sinkDescription: SinkDescription
  readonly groupName: GroupName
  readonly placementRule: PlacementRule
}

/**
 * Mapping object with ship type codes as keys and string configuration values.
 * Used for storing sink descriptions, group names, or placement rules by type.
 *
 * All keys are single-letter ShipTypeCodes; values vary by context.
 *
 * @typedef {Record<ShipTypeCode, string>} ShipTypeCodeMapping
 *
 * @example
 * {
 *   A: 'Shuttle',
 *   G: 'Asteroid',
 *   M: 'Hybrid',
 *   S: 'Space',
 *   T: 'Transformer',
 *   W: 'Weapon',
 *   X: 'Special'
 * }
 */
export type ShipTypeCodeMapping = Record<ShipTypeCode, string>

/**
 * Complete ship groups configuration for space terrain.
 * Contains three parallel mappings for all unit types.
 *
 * @typedef {Object} ShipGroupsConfig
 * @property {ShipTypeCodeMapping} sinkDescriptions - Destruction text by type
 * @property {ShipTypeCodeMapping} groupNames - Category names by type
 * @property {ShipTypeCodeMapping} placementRules - Placement guidelines by type
 */
export interface ShipGroupsConfig {
  readonly sinkDescriptions: ShipTypeCodeMapping
  readonly groupNames: ShipTypeCodeMapping
  readonly placementRules: ShipTypeCodeMapping
}

/**
 * Unit placement constraint on a specific subterrain or zone.
 * Defines whether a unit type can occupy cells in a particular terrain region.
 *
 * @typedef {(subterrain: string, zone?: string) => boolean} PlacementValidator
 */
export type PlacementValidator = (subterrain: string, zone?: string) => boolean

/**
 * Special properties applying to a unit type (vulnerability, hardening, etc.).
 * Array of weapon character codes indicating what this unit is vulnerable/hardened against.
 *
 * @typedef {string[]} SpecialProperties
 *
 * @example
 * // Attack Craft vulnerabilities
 * const vulnerable = ['+', '|', '^']  // Vulnerable to missiles, rail bolts, gauss rounds
 *
 * // Mine hardening
 * const hardened = ['+']  // Hardened against missiles
 */
export type SpecialProperties = readonly string[]

/**
 * Additional unit information or special rules.
 * Array of descriptive text strings explaining unit mechanics or behavior.
 *
 * @typedef {string[]} UnitNotes
 *
 * @example
 * const notes: UnitNotes = [
 *   'The Attack Craft is vulnerable against missiles, rail bolts, and gauss rounds.',
 *   'The Attack Craft is armed with a laser weapon.',
 *   'Adjacent squares to missile detonation will also be destroyed.'
 * ]
 */
export type UnitNotes = readonly string[]
