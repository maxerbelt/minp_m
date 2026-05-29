import { ShipGroups } from '../../../ships/ShipGroups.js'

/**
 * Space and asteroid terrain ship groups configuration.
 *
 * Configures unit classifications and placement rules for the Space and Asteroids terrain.
 * Maps ship/unit type codes to:
 * - **Destruction descriptions**: What happens when unit is destroyed (e.g., "Shot Down", "Destroyed")
 * - **Group names**: Human-readable category names (e.g., "Shuttle", "Space Vessel")
 * - **Placement rules**: How and where units can be placed on the map
 *
 * This module provides the configuration needed by the ShipGroups manager to properly
 * classify, display, and validate unit placement across space and asteroid terrain zones.
 *
 * @module terrains/space/spaceGroups
 * @requires ShipGroups
 *
 * @example
 * import { spaceGroups } from './spaceGroups.js'
 * // Access groups configuration
 * const sinkDescriptions = spaceGroups.sinkDescriptions
 * const groupNames = spaceGroups.groupNames
 */

/**
 * @typedef {Object} ShipTypeMapping
 * Configuration mapping for a single ship type code.
 *
 * Maps a ship type code to its three key characteristics: destruction description,
 * group name, and placement rules. Used to configure how units of that type are
 * handled in ship selection, placement validation, and display.
 *
 * @property {string} sinkDescription - What text displays when unit is destroyed
 *   - 'Shot Down': For aerial units (shuttles)
 *   - 'Destroyed': For ground/space installations and vessels
 *   - 'Detonated': For weapons that explode on impact
 *
 * @property {string} groupName - Category name for UI and classification
 *   - 'Shuttle', 'Space', 'Asteroid', 'Hybrid', etc.
 *   - Used for grouping units in selection interfaces
 *
 * @property {string} placementRule - Instructions for valid placement locations
 *   - References terrain zones (lavender for space, beige for asteroid)
 *   - Notes special placement requirements
 *   - Explains mixed-terrain or special placement rules
 *
 * @example
 * {
 *   sinkDescription: 'Shot Down',
 *   groupName: 'Shuttle',
 *   placementRule: 'These are added to the any area (space or asteroid) of the map'
 * }
 */

/**
 * @typedef {'A'|'G'|'M'|'T'|'X'|'S'|'W'} ShipTypeCode
 * Single-letter code identifying a unit type in space terrain.
 *
 * Used as keys in the ship groups configuration to map unit types to their
 * characteristics. Each code represents a different unit category:
 *
 * - **'A'**: Shuttle
 *   - Any location (space or asteroid)
 *   - Examples: Scout ships, corvettes
 *   - Destruction: 'Shot Down'
 *
 * - **'G'**: Installation (Ground/fixed)
 *   - Asteroid only (beige zones)
 *   - Examples: Mines, shelters, command centers
 *   - Destruction: 'Destroyed'
 *
 * - **'M'**: Hybrid
 *   - Mixed terrain (spans space and asteroid)
 *   - Examples: Habitat, space port, observation post
 *   - Destruction: 'Destroyed'
 *
 * - **'T'**: Transformer
 *   - Multiple forms with different placement rules
 *   - Examples: Railgun (space/asteroid variants)
 *   - Destruction: 'Destroyed'
 *
 * - **'X'**: Special
 *   - Custom rules specific to individual unit
 *   - Examples: Unique installations with special mechanics
 *   - Destruction: 'Destroyed'
 *
 * - **'S'**: Space Vessel
 *   - Space only (lavender zones)
 *   - Examples: Destroyers, cruisers, battlecruisers
 *   - Destruction: 'Destroyed'
 *
 * - **'W'**: Weapon
 *   - Special placement rules
 *   - Examples: Missiles, mines, targeting systems
 *   - Destruction: 'Detonated'
 *
 * @example
 * const typeCode = 'S'  // Space vessel
 * const typeCode = 'A'  // Shuttle (flexible placement)
 */

/**
 * @typedef {Object<ShipTypeCode, string>} ShipTypeCodeMapping
 * Mapping object with ship type codes as keys and string values.
 *
 * Object type where each key is a single-letter ShipTypeCode ('A', 'G', 'M', 'T', 'X', 'S', 'W')
 * and the value is a string describing that aspect of the type (sink description, group name,
 * or placement rule).
 *
 * @example
 * {
 *   A: 'value for shuttle type',
 *   G: 'value for installation type',
 *   M: 'value for hybrid type',
 *   T: 'value for transformer type',
 *   X: 'value for special type',
 *   S: 'value for space vessel type',
 *   W: 'value for weapon type'
 * }
 */

/**
 * Space and asteroid terrain ship groups configuration manager.
 *
 * Singleton instance of ShipGroups configured specifically for the Space and Asteroids terrain.
 * Manages three core aspects of unit classification:
 *
 * 1. **Sink Descriptions**: Text displayed when units are destroyed
 *    - Distinguishes between shot-down (aerial), destroyed (ground/space), and detonated (weapons)
 *    - Provides clear feedback in the user interface
 *
 * 2. **Group Names**: Category labels for unit organization
 *    - Organizes units by type (Shuttle, Space, Asteroid, Hybrid, etc.)
 *    - Used in UI dropdowns and unit selection panels
 *    - Helps players understand unit capabilities at a glance
 *
 * 3. **Placement Rules**: Constraints and instructions for unit placement
 *    - References specific terrain zones (lavender for space, beige for asteroid)
 *    - Explains special placement requirements for hybrids and transformers
 *    - Guides players on proper unit deployment
 *
 * The configuration supports all unit types in the space terrain:
 * - **A** (Shuttle): Flexible placement in any zone
 * - **G** (Installation): Fixed on asteroids (beige zones)
 * - **S** (Space Vessel): Operates in space (lavender zones)
 * - **M** (Hybrid): Spans both space and asteroid zones
 * - **T** (Transformer): Multiple forms with context-dependent placement
 * - **X** (Special): Custom unit-specific rules
 * - **W** (Weapon): Special mounting and targeting rules
 *
 * @type {ShipGroups}
 * @readonly
 * @constant
 *
 * @property {ShipTypeCodeMapping} sinkDescriptions - Destruction text for each unit type
 * @property {ShipTypeCodeMapping} groupNames - Category names for unit classification
 * @property {ShipTypeCodeMapping} placementRules - Placement guidelines for each unit type
 *
 * @example
 * import { spaceGroups } from './spaceGroups.js'
 *
 * // Access configuration
 * const sinkText = spaceGroups.sinkDescriptions['A']  // 'Shot Down' for shuttles
 * const groupName = spaceGroups.groupNames['S']       // 'Space' for space vessels
 * const placement = spaceGroups.placementRules['G']   // Asteroid placement rule
 *
 * // Check unit destruction text
 * if (unit.type === 'A') {
 *   console.log(`${unit.name} ${spaceGroups.sinkDescriptions['A']}`)  // 'Shuttle Shot Down'
 * }
 *
 * @see ShipGroups - Parent class providing groups management
 * @see spaceFleet - Available units in space terrain
 */
export const spaceGroups = new ShipGroups(
  {
    A: 'Shot Down',
    G: 'Destroyed',
    M: 'Destroyed',
    T: 'Destroyed',
    X: 'Destroyed',
    S: 'Destroyed',
    W: 'Detonated'
  },
  {
    A: 'Shuttle',
    G: 'Asteroid',
    M: 'Hybrid',
    T: 'Transformer',
    X: 'Special',
    S: 'Space',
    W: 'Weapon'
  },
  {
    A: 'These are added to the any area (space or asteroid) of the map',
    G: 'These are added to the beige areas (asteroid) of the map',
    M: 'These have special rules about where they are placed on the map',
    T: 'These have special rules about where they are placed on the map',
    X: 'These have special rules about where they are placed on the map',
    S: 'These are added to the lavender areas (space) of the map',
    W: 'These have special rules about where they are placed on the map'
  }
)
