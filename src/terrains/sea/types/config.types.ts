/**
 * @fileoverview Sea terrain configuration type definitions
 *
 * Type definitions for weapons, ships, and combat configuration objects.
 * Defines configuration schemas used for weapon behavior, ship properties,
 * and gameplay mechanics.
 *
 * @module terrains/sea/types/config.types
 */

/**
 * Weapon targeting hint for UI display during combat.
 *
 * Instructional text shown to players when they're selecting weapon targets.
 * Multiple hints provide step-by-step guidance for multi-stage weapons.
 *
 * @typedef {string} WeaponHint
 * @example
 * "Click On Square To Drop Bomb" - single-stage weapon hint
 * "Click on square to start kinetic strike" - first stage of two-stage weapon
 */
export type WeaponHint = string

/**
 * Weapon configuration for a single weapon type.
 *
 * Defines behavior, UI, and audio properties for a weapon in sea combat.
 * Properties control how the weapon is used, displayed, and animated.
 *
 * @interface WeaponConfig
 * @property {readonly WeaponHint[]} [hints] - Step-by-step UI hints for targeting
 * @property {string} [buttonHtml] - HTML for weapon selection button with shortcuts
 * @property {string} [tip] - Tooltip description of weapon function
 * @property {string} tag - Internal weapon identifier tag (mega, kinetic, torpedo, etc)
 * @property {('air' | 'sea')} [splashType] - Damage area type for effects
 * @property {number} [splashPower] - Splash damage multiplier (0-2)
 * @property {boolean} [animateOnTarget] - Whether weapon animates to impact point
 * @property {boolean} [explodeOnTarget] - Whether weapon explodes on impact
 * @property {boolean} [hasFlash] - Whether explosion has visual flash effect
 */
export interface WeaponConfig {
  readonly hints?: readonly WeaponHint[]
  readonly buttonHtml?: string
  readonly tip?: string
  readonly tag: string
  readonly splashType?: 'air' | 'sea'
  readonly splashPower?: number
  readonly animateOnTarget?: boolean
  readonly explodeOnTarget?: boolean
  readonly hasFlash?: boolean
}

/**
 * Weapon configuration map for all sea weapons.
 *
 * Maps weapon type identifiers to their complete configuration objects.
 * Provides centralized configuration for all sea terrain weapons.
 *
 * @typedef {Readonly<Record<string, WeaponConfig>>} WeaponConfigMap
 *
 * @example
 * const megabombConfig = configMap['MEGABOMB']
 * const kineticConfig = configMap['KINETIC']
 */
export type WeaponConfigMap = Readonly<Record<string, WeaponConfig>>

/**
 * Ship color mapping for visual rendering.
 *
 * Hex color codes used to render ships on the game board.
 * Maps ship letter identifiers to their display colors.
 *
 * @typedef {string} ShipColor
 * @example
 * '#ff6666' - coral red for aircraft carriers
 * '#66ccff' - light blue for battleships
 */
export type ShipColor = string

/**
 * Ship color map for all sea ships.
 *
 * Maps ship letter identifiers to hex color codes for visual rendering.
 * Provides consistent color scheme across all ship types.
 *
 * @typedef {Readonly<Record<string, ShipColor>>} ShipColorMap
 */
export type ShipColorMap = Readonly<Record<string, ShipColor>>

/**
 * Ship display name for UI and player communication.
 *
 * Human-readable name shown in tooltips, status messages, and selection dialogs.
 * Provides the primary identifier players use to reference ship types.
 *
 * @typedef {string} ShipName
 * @example
 * 'Aircraft Carrier' - for letter 'A'
 * 'Battleship' - for letter 'B'
 * 'Stealth Bomber' - for letter 'Q'
 */
export type ShipName = string

/**
 * Ship name map for all sea ships.
 *
 * Maps ship letter identifiers to their human-readable names.
 * Used for UI display and player communication.
 *
 * @typedef {Readonly<Record<string, ShipName>>} ShipNameMap
 */
export type ShipNameMap = Readonly<Record<string, ShipName>>

/**
 * Ship symmetry type for placement constraints.
 *
 * Defines how a ship can be rotated and placed on the game board.
 * Different symmetries affect placement flexibility and mirror operations.
 *
 * @typedef {('S' | 'A' | 'G' | 'X' | 'W')} ShipSymmetry
 *
 * Symmetry types:
 * - 'S': Single/Vertical line symmetry - can be flipped horizontally
 * - 'A': Asymmetric - rotations allowed but no reflection
 * - 'G': Grid-based placement with symmetry
 * - 'X': Cross/Dual-axis symmetry
 * - 'W': Weapon - abstract type, special rules apply
 */
export type ShipSymmetry = 'S' | 'A' | 'G' | 'X' | 'W'

/**
 * Ship symmetry map for all sea ships.
 *
 * Maps ship letter identifiers to their symmetry classifications.
 * Controls rotation and placement flexibility for each ship type.
 *
 * @typedef {Readonly<Record<string, ShipSymmetry>>} ShipSymmetryMap
 */
export type ShipSymmetryMap = Readonly<Record<string, ShipSymmetry>>

/**
 * Ship background styling for visual rendering.
 *
 * CSS color values (hex, rgba, etc) used as background for ship cells.
 * Supports transparency for layered visual effects.
 *
 * @typedef {string} ShipBackground
 * @example
 * 'rgba(255,102,102,0.3)' - semi-transparent coral red
 * '#ffd866' - opaque yellow for megabomb marker
 * '#d84444' - solid red for kinetic strike target
 */
export type ShipBackground = string

/**
 * Ship background map for all sea ships.
 *
 * Maps ship letter identifiers to background CSS values.
 * Provides visual distinction between different ship types on the board.
 *
 * @typedef {Readonly<Record<string, ShipBackground>>} ShipBackgroundMap
 */
export type ShipBackgroundMap = Readonly<Record<string, ShipBackground>>

/**
 * Ship destruction terminology by type.
 *
 * Maps ship type letters to how those units are destroyed in game narration.
 * Provides thematic destruction descriptions for different unit categories.
 *
 * @typedef {Readonly<Record<string, 'Sunk' | 'Shot Down' | 'Destroyed'>>} ShipSunkDescriptions
 *
 * @example
 * {
 *   A: 'Shot Down',    // Aircraft
 *   S: 'Sunk',         // Sea vessels
 *   G: 'Destroyed',    // Ground units
 * }
 */
export type ShipSunkDescriptions = Readonly<
  Record<string, 'Sunk' | 'Shot Down' | 'Destroyed'>
>

/**
 * Ship unit group/category name for organization.
 *
 * Display name for ship types used in UI menus and ship selection.
 * Categorizes related ship types (Air, Sea, Land, etc).
 *
 * @typedef {string} ShipUnitName
 * @example
 * 'Air' - for aircraft units
 * 'Sea' - for naval vessels
 * 'Land' - for ground structures
 */
export type ShipUnitName = string

/**
 * Ship unit name map for all sea ships.
 *
 * Maps ship type letters to group/category names.
 * Organizes ships into related categories for UI display.
 *
 * @typedef {Readonly<Record<string, ShipUnitName>>} ShipUnitNameMap
 */
export type ShipUnitNameMap = Readonly<Record<string, ShipUnitName>>

/**
 * Ship placement rule description for player guidance.
 *
 * Human-readable explanation of where and how a ship type can be placed.
 * Describes terrain, zone, and special placement constraints.
 *
 * @typedef {string} ShipPlacementInfo
 * @example
 * 'These are added to the any area (sea or land) of the map'
 * 'These are added to the blue areas (sea) of the map'
 * 'These have special rules about where they are placed on the map'
 */
export type ShipPlacementInfo = string

/**
 * Ship placement info map for all sea ships.
 *
 * Maps ship type letters to placement rule descriptions.
 * Informs players about placement restrictions and special rules.
 *
 * @typedef {Readonly<Record<string, ShipPlacementInfo>>} ShipPlacementInfoMap
 */
export type ShipPlacementInfoMap = Readonly<
  Record<string, ShipPlacementInfo>
>

/**
 * Complete ship configuration schema.
 *
 * Bundles all ship-related configurations for rendering, organization, and gameplay.
 * Provides everything needed to display and validate ship placement.
 *
 * @interface ShipCatalogueConfig
 * @property {ShipColorMap} colors - Ship display colors by letter
 * @property {ShipNameMap} names - Ship human-readable names by letter
 * @property {ShipSymmetryMap} symmetries - Ship symmetry types by letter
 * @property {ShipBackgroundMap} backgrounds - Ship background styles by letter
 * @property {ShipSunkDescriptions} sunkDescriptions - Destruction terminology by type
 * @property {ShipUnitNameMap} unitNames - Ship category names by type letter
 * @property {ShipPlacementInfoMap} placementInfo - Placement rules by type letter
 */
export interface ShipCatalogueConfig {
  readonly colors: ShipColorMap
  readonly names: ShipNameMap
  readonly symmetries: ShipSymmetryMap
  readonly backgrounds: ShipBackgroundMap
  readonly sunkDescriptions?: ShipSunkDescriptions
  readonly unitNames?: ShipUnitNameMap
  readonly placementInfo?: ShipPlacementInfoMap
}

/**
 * Game rule set configuration for sea/land terrain.
 *
 * Maps special terrain markers to their gameplay effects and mechanics.
 * Defines how terrain features affect ship damage and gameplay.
 *
 * @interface TerrainRuleConfig
 * @property {string} marker - Terrain marker character (K, F, M, +, %, Z)
 * @property {string} effect - Gameplay effect name (DestroyOne, Bomb, Scan, etc)
 */
export interface TerrainRuleConfig {
  readonly marker: string
  readonly effect: string
}

/**
 * Array of terrain rule configurations.
 *
 * Maps all special terrain features to their effects in gameplay.
 *
 * @typedef {readonly TerrainRuleConfig[]} TerrainRuleConfigs
 *
 * @example
 * [
 *   ['K', 'DestroyOne'],   // Kinetic strike
 *   ['F', 'Bomb'],         // Fire/explosion
 *   ['M', 'Bomb'],         // Megabomb
 *   ['+', 'DestroyOne'],   // Torpedo
 *   ['W', 'Scan']          // Sweep/radar
 * ]
 */
export type TerrainRuleConfigs = readonly TerrainRuleConfig[]

/**
 * Audio URL for weapon sound effect.
 *
 * Resolved module URL pointing to weapon audio asset.
 * Used for flight sounds, explosion sounds, and other audio feedback.
 *
 * @typedef {URL} WeaponSoundUrl
 */
export type WeaponSoundUrl = URL

/**
 * Weapon sound configuration for all impact types.
 *
 * Maps weapon impact environment to corresponding audio asset URL.
 * Provides different sounds for different explosion contexts.
 *
 * @interface WeaponSoundsConfig
 * @property {WeaponSoundUrl} air - Sound for air-based explosions
 * @property {WeaponSoundUrl} land - Sound for ground explosions
 * @property {WeaponSoundUrl} sea - Sound for water explosions
 */
export interface WeaponSoundsConfig {
  readonly air: WeaponSoundUrl
  readonly land: WeaponSoundUrl
  readonly sea: WeaponSoundUrl
}

/**
 * Sound file name constants for weapon flight audio.
 *
 * Defines which audio files to load for weapon flight sounds.
 * Maps weapon types to their corresponding MP3 file names.
 *
 * @interface SoundFileNames
 * @property {string} MEGABOMB - Megabomb flight sound filename
 * @property {string} KINETIC - Kinetic strike flight sound filename
 * @property {string} TORPEDO - Torpedo flight sound filename
 * @property {string} FLACK - Flack burst flight sound filename
 */
export interface SoundFileNames {
  readonly MEGABOMB: string
  readonly KINETIC: string
  readonly TORPEDO: string
  readonly FLACK: string
}
