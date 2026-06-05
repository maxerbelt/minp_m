/**
 * Configuration and settings type definitions for space terrain.
 *
 * Provides configuration object types used for:
 * - Game map setup and generation
 * - Unit placement rules and constraints
 * - Terrain zone definition
 * - UI and gameplay settings
 *
 * @module terrains/space/types/config.types
 */

import type { GridSize, AsteroidLayout } from './grid.types'

/**
 * Configuration for a single terrain zone.
 * Zones are distinct regions within a sub-terrain with specific properties.
 *
 * @typedef {Object} ZoneConfig
 * @property {string} name - Display name of the zone (e.g., 'Deep Space', 'Surface')
 * @property {string} code - Single character zone identifier (e.g., 'D', 'N', 'S', 'C')
 * @property {boolean} canPlace - Whether units can be placed in this zone
 */
export interface ZoneConfig {
  readonly name: string
  readonly code: string
  readonly canPlace: boolean
}

/**
 * Configuration for a sub-terrain (e.g., Space, Asteroid).
 * Sub-terrains are composed of multiple zones and define placement rules for units.
 *
 * @typedef {Object} SubTerrainConfig
 * @property {string} name - Display name (e.g., 'Space', 'Asteroid')
 * @property {string} colorLight - Light visualization color in hex format
 * @property {string} colorDark - Dark visualization color in hex format
 * @property {string} code - Single character identifier
 * @property {boolean} canShips - Whether ships can occupy cells in this terrain
 * @property {boolean} canInstallations - Whether installations can occupy cells
 */
export interface SubTerrainConfig {
  readonly name: string
  readonly colorLight: string
  readonly colorDark: string
  readonly code: string
  readonly canShips: boolean
  readonly canInstallations: boolean
}

/**
 * Ship placement count as a mapping of ship type codes to quantities.
 * Used to specify how many units of each type should be placed on a map.
 *
 * @typedef {Object} ShipCountMap
 * @property {number} [S] - Space vessels
 * @property {number} [A] - Shuttles
 * @property {number} [G] - Ground installations
 * @property {number} [M] - Hybrid units
 * @property {number} [T] - Transformer units
 * @property {number} [X] - Special units
 * @property {number} [W] - Weapons
 *
 * @example
 * const shipCounts: ShipCountMap = {
 *   S: 3,   // 3 space vessels
 *   A: 2,   // 2 shuttles
 *   G: 1    // 1 installation
 * }
 */
export interface ShipCountMap {
  readonly [key: string]: number
  readonly S?: number
  readonly A?: number
  readonly G?: number
  readonly M?: number
  readonly T?: number
  readonly X?: number
  readonly W?: number
}

/**
 * Ship placement configuration - either total count or type breakdown.
 * Allows specifying ships as simple count or detailed distribution by type.
 *
 * @typedef {number | ShipCountMap} ShipCountConfig
 *
 * @example
 * // Simple count - auto-distribute
 * const total: ShipCountConfig = 10
 *
 * // Detailed distribution
 * const breakdown: ShipCountConfig = { S: 3, A: 2, G: 1 }
 */
export type ShipCountConfig = number | ShipCountMap

/**
 * Complete configuration for creating a space terrain battle map.
 * Encapsulates all parameters needed for map generation and setup.
 *
 * @typedef {Object} MapConfig
 * @property {string} title - Display title shown in menus and UI
 * @property {GridSize} size - Map dimensions in [rows, cols] format
 * @property {ShipCountConfig} shipNum - Ship placement configuration (count or breakdown)
 * @property {AsteroidLayout} landArea - Asteroid terrain layout specification
 * @property {string} name - Internal identifier for map lookup
 *
 * @example
 * const mapConfig: MapConfig = {
 *   title: 'Asteroid Field',
 *   size: [20, 20],
 *   shipNum: { S: 3, A: 2 },
 *   landArea: [[5, 6, 7], [12, 13, 14]],
 *   name: 'asteroidField'
 * }
 */
export interface MapConfig {
  readonly title: string
  readonly size: GridSize
  readonly shipNum: ShipCountConfig
  readonly landArea: AsteroidLayout
  readonly name: string
}

/**
 * Space and asteroids terrain configuration object.
 * Defines terrain properties, available unit types, and weapon systems.
 *
 * @typedef {Object} SpaceTerrainConfig
 * @property {string} name - Terrain name (e.g., 'Space and Asteroids')
 * @property {string} description - Terrain description
 * @property {Object} [shipTypes] - Available ship types for this terrain
 * @property {Object} [weaponTypes] - Available weapon types for this terrain
 */
export interface SpaceTerrainConfig {
  readonly name: string
  readonly description: string
  readonly shipTypes?: Record<string, any>
  readonly weaponTypes?: Record<string, any>
}

/**
 * Battle map terrain and configuration container.
 * Combines terrain definition with layout and unit placement info.
 *
 * @typedef {Object} TerrainMapConfiguration
 * @property {number} width - Map width in cells
 * @property {number} height - Map height in cells
 * @property {string} terrainType - Type of terrain ('space', 'asteroid', etc.)
 * @property {Array<Array<string>>} [layout] - Optional map layout data
 */
export interface TerrainMapConfiguration {
  readonly width: number
  readonly height: number
  readonly terrainType: string
  readonly layout?: readonly (readonly string[])[]
}

/**
 * Weapon damage type mapping for special installations.
 * Maps weapon character codes to damage types for interaction with hardened/vulnerable units.
 *
 * @typedef {[string, string]} WeaponDamageMapping
 * @example
 * ['|', 'DestroyOne']    // Rail bolt: single-target destruction
 * ['+', 'Bomb']          // Missile: area effect bomb damage
 * ['^', 'DestroyOne']    // Gauss round: single-target destruction
 */
export type WeaponDamageMapping = readonly [string, string]

/**
 * Map size classification code for predefined scenarios.
 * Used to categorize maps by complexity and gameplay length.
 *
 * @typedef {'SS' | 'MS' | 'M' | 'ML' | 'L'} MapSizeCode
 * - 'SS': Extra Small (tutorial/training)
 * - 'MS': Medium-Small (quick skirmish)
 * - 'M': Medium (standard gameplay)
 * - 'ML': Medium-Large (extended campaign)
 * - 'L': Large (complex scenarios)
 */
export type MapSizeCode = 'SS' | 'MS' | 'M' | 'ML' | 'L'

/**
 * Metadata about a predefined map scenario.
 *
 * @typedef {Object} MapScenario
 * @property {string} name - Map code/size identifier
 * @property {any} map - Fully configured battle map instance
 * @property {string} difficulty - Relative difficulty level
 * @property {number} averageGameLength - Estimated game duration in minutes
 */
export interface MapScenario {
  readonly name: MapSizeCode
  readonly map: any // BhMap type from external module
  readonly difficulty: string
  readonly averageGameLength: number
}
