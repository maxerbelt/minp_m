/**
 * @fileoverview Map Type Definitions for Terrain System
 *
 * Types related to map management, terrain map configurations, and map state.
 * These types define the interface for managing available maps and switching
 * between them.
 *
 * @module terrains/all/js/types/maps.types
 */

/**
 * A single terrain map configuration with bounds checking and zone info.
 *
 * Represents a map within the terrain system with methods to check coordinates
 * and retrieve zone information for placement validation.
 *
 * @typedef {Object} TerrainMap
 * @property {Record<string, any>} terrain - The terrain object associated with this map
 * @property {string} [tag] - Optional tag identifier for the terrain
 * @property {(row: number, col: number) => boolean} inBounds - Checks if coordinates are within map bounds
 * @property {(row: number, col: number) => boolean} inAllBounds - Checks if coordinates are within all valid areas
 * @property {(row: number, col: number, detail?: number) => any} zoneInfo - Gets zone information for coordinates
 * @description Map configuration with boundary and zone checking
 */
export interface TerrainMap {
  readonly terrain: Record<string, any>
  readonly tag?: string
  inBounds: (row: number, col: number) => boolean
  inAllBounds: (row: number, col: number) => boolean
  zoneInfo: (row: number, col: number, detail?: number) => any
}

/**
 * Terrain map type definition from TerrainMaps configuration.
 *
 * Describes the structure of maps available within a specific terrain.
 *
 * @typedef {Object} TerrainMapType
 * @property {number} rows - The number of rows in the map
 * @property {number} cols - The number of columns in the map
 * @property {string} title - The map title
 * @property {(r: number, c: number) => boolean} isLand - Checks if a cell is land
 * @property {(r: number, c: number) => boolean} inBounds - Checks if coordinates are in bounds
 * @property {(r: number, c: number, detail?: number) => any} zoneInfo - Gets zone information
 * @description Predefined terrain map configuration
 */
export interface TerrainMapType {
  readonly rows: number
  readonly cols: number
  readonly title: string
  isLand: (r: number, c: number) => boolean
  inBounds: (r: number, c: number) => boolean
  zoneInfo: (r: number, c: number, detail?: number) => any
}

/**
 * Registry of available terrain map configurations.
 *
 * Contains all available terrain configurations that can be loaded and used.
 *
 * @typedef {Object} GameMapsRegistry
 * @property {any} seaAndLand - Sea terrain with land overlay configuration
 * @property {any} spaceAndAsteroids - Space terrain with asteroids configuration
 * @description Registry of terrain map configurations
 */
export interface GameMapsRegistry {
  readonly seaAndLand: any
  readonly spaceAndAsteroids: any
}

/**
 * Terrain map with collection and index metadata.
 *
 * Wraps a TerrainMapType with its index position in a collection for efficient
 * lookup and switching between maps.
 *
 * @typedef {Object} MapWithIndex
 * @property {number} index - Index in the terrain map collection
 * @property {TerrainMapType} map - The terrain map configuration
 * @description Map with collection metadata
 */
export interface MapWithIndex {
  readonly index: number
  readonly map: TerrainMapType
}

/**
 * Ship catalogue configuration for terrain maps.
 *
 * Contains ship definitions and metadata used to populate ship selection UI
 * and validate ship placements on maps.
 *
 * @typedef {Object} TerrainShipCatalogue
 * @property {ReadonlyArray<{letter: string}>} baseShapes - Base ship shape definitions
 * @property {Readonly<Record<string, string>>} sunkDescriptions - Descriptions when ships are sunk
 * @property {Readonly<Record<string, string>>} letterColors - Colors for ship letter identifiers
 * @property {string} description - General ship catalogue description
 * @property {Readonly<Record<string, any>>} types - Ship type definitions by letter
 * @property {Readonly<Record<string, any>>} colors - Color configuration for ships
 * @property {Readonly<Record<string, any>>} shapesByLetter - Ship shape data by letter
 * @description Ship metadata and type registry for terrain
 */
export interface TerrainShipCatalogue {
  readonly baseShapes: ReadonlyArray<{ letter: string }>
  readonly sunkDescriptions: Readonly<Record<string, string>>
  readonly letterColors: Readonly<Record<string, string>>
  readonly description: string
  readonly types: Readonly<Record<string, any>>
  readonly colors: Readonly<Record<string, any>>
  readonly shapesByLetter: Readonly<Record<string, any>>
}

/**
 * Weapon catalogue configuration for terrain maps.
 *
 * Contains weapon definitions and default weapon used for map placements.
 *
 * @typedef {Object} WeaponCatalogue
 * @property {Record<string, any>} defaultWeapon - Default weapon configuration
 * @property {ReadonlyArray<Record<string, any>>} weapons - Array of weapon definitions
 * @description Weapon definitions and configuration for terrain
 */
export interface WeaponCatalogue {
  readonly defaultWeapon: Record<string, any>
  readonly weapons: ReadonlyArray<Record<string, any>>
}
