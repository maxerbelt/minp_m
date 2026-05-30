/**
 * @fileoverview Sea and Land Terrain Ship Groups Configuration
 *
 * Defines ship group mappings for the Sea and Land terrain, including unit classifications,
 * sunk/destroyed descriptions, and placement rules for each ship type. This configuration
 * ensures proper categorization of units in UI, game logic, and map placement mechanics.
 *
 * The file organizes ships by type (Air, Ground, Sea, etc.) and provides:
 * - Sunk descriptions: Text displayed when units are destroyed
 * - Group names: Categories for ship selection and organization
 * - Placement rules: Describes where each unit type can be placed on the map
 *
 * Ship Type Categories:
 * - A: Air units - placed anywhere (sea or land)
 * - G: Ground/Land units - placed only in land (green) zones
 * - S: Sea units - placed only in water (blue) zones
 * - M, T, X: Hybrid/Special units - custom placement rules
 * - W: Weapon units - special handling
 *
 * @module terrains/sea/js/seaAndLandGroups
 * @author Game Development Team
 * @version 1.0.0
 * @see {@link ShipGroups} for group configuration class
 * @see {@link seaAndLand} for parent terrain configuration
 * @typedef {import('./types/config.types.js').ShipSunkDescriptions} ShipSunkDescriptions
 * @typedef {import('./types/config.types.js').ShipUnitNameMap} ShipUnitNameMap
 * @typedef {import('./types/config.types.js').ShipPlacementInfoMap} ShipPlacementInfoMap
 */

import { ShipGroups } from '../../../ships/ShipGroups.js'

/**
 * Mapping of ship type codes to sunk/destroyed descriptions.
 *
 * Defines what text is displayed when units of each type are destroyed:
 * - Air units (A): "Shot Down" - unique term for aircraft destruction
 * - Sea units (S): "Sunk" - traditional term for ship destruction
 * - All others (G, M, T, X, W): "Destroyed" - generic destruction term
 *
 * These descriptions appear in game logs, UI messages, and replay summaries
 * when units are eliminated during gameplay.
 *
 * @typedef {Object<string, string>} ShipSunkDescriptions
 * @property {string} A - "Shot Down" - destruction text for air units
 * @property {string} G - "Destroyed" - destruction text for ground units
 * @property {string} M - "Destroyed" - destruction text for hybrid units
 * @property {string} T - "Destroyed" - destruction text for transformer units
 * @property {string} X - "Destroyed" - destruction text for special units
 * @property {string} S - "Sunk" - destruction text for sea units
 *
 * @type {ShipSunkDescriptions}
 * @constant
 * @private
 */
const sunkDescriptions = {
  A: 'Shot Down',
  G: 'Destroyed',
  M: 'Destroyed',
  T: 'Destroyed',
  X: 'Destroyed',
  S: 'Sunk'
}

/**
 * Mapping of ship type codes to group names/categories.
 *
 * Defines category names for organizing and displaying ship types in UI menus,
 * ship selection screens, and group-based filters. Each type belongs to a logical
 * group that helps players understand unit capabilities:
 * - Air: Flying units with special movement
 * - Land: Ground-based installations and units
 * - Sea: Naval vessels and underwater units
 * - Hybrid/Transformer/Special: Units with custom rules
 * - Weapon: Special weapon units with custom placement
 *
 * Group names appear in:
 * - Ship selection menus and tabs
 * - Game rules documentation
 * - Unit organization lists
 * - Placement validation messages
 *
 * @typedef {Object<string, string>} ShipUnitDescriptions
 * @property {string} A - "Air" - group name for air units
 * @property {string} G - "Land" - group name for ground units
 * @property {string} M - "Hybrid" - group name for hybrid units
 * @property {string} T - "Transformer" - group name for transformer units
 * @property {string} X - "Special" - group name for special units
 * @property {string} S - "Sea" - group name for sea units
 * @property {string} W - "Weapon" - group name for weapon units
 *
 * @type {ShipUnitDescriptions}
 * @constant
 * @private
 */
const unitDescriptions = {
  A: 'Air',
  G: 'Land',
  M: 'Hybrid',
  T: 'Transformer',
  X: 'Special',
  S: 'Sea',
  W: 'Weapon'
}

/**
 * Mapping of ship type codes to placement rule descriptions.
 *
 * Provides human-readable explanations of where and how each unit type can be
 * placed on the map. These descriptions inform players about placement restrictions
 * and special rules during setup:
 *
 * - Air (A): "added to the any area" - no terrain restrictions
 * - Ground (G): "added to the greens areas (land)" - land terrain only
 * - Sea (S): "added to the blue areas (sea)" - sea terrain only
 * - Special (M, T, X, W): "special rules about where they are placed"
 *
 * Placement descriptions appear in:
 * - Unit tooltip hover text
 * - Placement validation error messages
 * - Game rules and tutorial screens
 * - Map editor help text
 *
 * @typedef {Object<string, string>} ShipUnitInfo
 * @property {string} A - Describes air unit placement (any location)
 * @property {string} G - Describes ground unit placement (land only)
 * @property {string} M - Describes hybrid unit placement (special rules)
 * @property {string} T - Describes transformer unit placement (special rules)
 * @property {string} X - Describes special unit placement (custom rules)
 * @property {string} S - Describes sea unit placement (water only)
 * @property {string} W - Describes weapon unit placement (special rules)
 *
 * @type {ShipUnitInfo}
 * @constant
 * @private
 */
const unitInfo = {
  A: 'These are added to the any area (sea or land) of the map',
  G: 'These are added to the greens areas (land) of the map',
  M: 'These have special rules about where they are placed on the map',
  T: 'These have special rules about where they are placed on the map',
  X: 'These have special rules about where they are placed on the map',
  S: 'These are added to the blue areas (sea) of the map',
  W: 'These have special rules about where they are placed on the map'
}

/**
 * Sea and Land terrain ship groups configuration.
 *
 * Central configuration object that organizes ship types and their associated metadata
 * for the Sea and Land terrain. Combines three classification systems:
 *
 * 1. **Sunk Descriptions**: Text shown when units are destroyed or eliminated
 *    - Air: "Shot Down"
 *    - Sea: "Sunk"
 *    - Others: "Destroyed"
 *
 * 2. **Unit Group Names**: Category labels for UI organization and display
 *    - 7 categories: Air, Land, Sea, Hybrid, Transformer, Special, Weapon
 *    - Used in menus, tabs, and selection interfaces
 *
 * 3. **Placement Rules**: Human-readable descriptions of where units can be placed
 *    - Standard units: Restricted to specific terrains (land or sea)
 *    - Air units: Unrestricted placement (any area)
 *    - Special units: Custom rules applied by placement system
 *
 * Usage in Game:
 * - Validates unit placement based on type and terrain
 * - Provides UI labels and descriptions for ship selection
 * - Displays destruction messages in game logs
 * - Organizes ship roster by category
 *
 * Type Codes Used:
 * - A: Air units (helicopters, aircraft, drones)
 * - G: Ground/Land units (buildings, installations, ground vehicles)
 * - M: Hybrid units (amphibious, multi-terrain capable)
 * - T: Transformer units (units with multiple forms)
 * - X: Special units (custom behavior, rare units)
 * - S: Sea units (ships, submarines, naval vessels)
 * - W: Weapon units (special weapon platforms, missile batteries)
 *
 * @type {ShipGroups}
 * @constant
 * @readonly
 * @static
 * @public
 *
 * @property {ShipSunkDescriptions} shipSunkDescriptions - Mapped sunk/destroyed text for each type
 * @property {ShipUnitDescriptions} unitDescriptions - Mapped group names for each type
 * @property {ShipUnitInfo} unitInfo - Mapped placement rule descriptions for each type
 *
 * @returns {ShipGroups} Configured ShipGroups instance for Sea and Land terrain
 * @see {@link ShipGroups} for class definition and methods
 * @see {@link seaAndLand} for parent terrain this configuration belongs to
 *
 * @example
 * // Access sunk descriptions for a ship type
 * import { seaAndLandGroups } from './seaAndLandGroups.js'
 * const sunkText = seaAndLandGroups.shipSunkDescriptions['S'] // "Sunk"
 *
 * @example
 * // Get group name for UI display
 * const groupName = seaAndLandGroups.unitDescriptions['G'] // "Land"
 *
 * @example
 * // Get placement rule description for tooltip
 * const placementRule = seaAndLandGroups.unitInfo['A']
 * // "These are added to the any area (sea or land) of the map"
 */
export const seaAndLandGroups = new ShipGroups(
  sunkDescriptions,
  unitDescriptions,
  unitInfo
)
