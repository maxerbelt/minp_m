/**
 * @fileoverview Shared Type Definitions for Terrain System
 *
 * Core DTOs, configurations, and common utility types used across the terrain system.
 * These types have no dependencies on domain classes to avoid circular imports.
 *
 * @module terrains/all/js/types/shared.types
 */

/**
 * A single terrain zone descriptor defining core and marginal boundary areas.
 *
 * Zones divide a subterrain into core areas (primary terrain type) and marginal
 * areas (transition boundaries). This distinction is important for placement validation
 * and visual rendering.
 *
 * @typedef {Object} SubTerrainZone
 * @property {string} title - Display title of the zone (e.g., "Deep Water", "Shoreline")
 * @property {boolean} [isMarginal=false] - Whether this zone is a marginal boundary (true) or core area (false)
 * @description Zone configuration for terrain classification and placement validation
 */
export interface SubTerrainZone {
  readonly title: string
  readonly isMarginal?: boolean
}

/**
 * Validator function for terrain zone compatibility checking.
 *
 * Used by Terrain and placement systems to validate whether shapes or placements
 * are compatible with specific zone configurations and subterrain properties.
 *
 * @typedef {(zoneInfo: [any, unknown]) => boolean} TerrainValidator
 * @description Predicate function checking zone/subterrain compatibility
 */
export type TerrainValidator = (zoneInfo: readonly [any, unknown]) => boolean

/**
 * A single range element representing a contiguous span of land in a row.
 *
 * Used by pre-generated maps to efficiently store land areas as row ranges.
 * Format: [rowIndex, startColumn, endColumn] representing all land cells
 * in that row from startColumn to endColumn (inclusive).
 *
 * @typedef {readonly [number, number, number]} RangeElement
 * @description Row-based land area range [row, colStart, colEnd]
 */
export type RangeElement = readonly [number, number, number]

/**
 * Terrain object with key property for storage operations.
 *
 * @typedef {Object} TerrainObject
 * @property {string} key - Unique identifier for the terrain (e.g., "sea-land", "space")
 * @description Minimal terrain interface for configuration purposes
 */
export interface TerrainObject {
  readonly key: string
}

/**
 * Sound effect configuration mapping types to URLs or paths.
 *
 * Used to configure terrain-specific audio effects for game events
 * (e.g., hit sounds, miss sounds, explosion sounds, etc.).
 *
 * @typedef {Record<string, string | URL>} TerrainSoundConfig
 * @description Sound effect URL mapping by damage/event type
 */
export type TerrainSoundConfig = Readonly<Record<string, string | URL>>

/**
 * Function signature for checking if coordinates are within map bounds.
 *
 * @typedef {(row: number, column: number) => boolean} BoundsCheckFunction
 * @description Predicate checking if coordinates are within valid map area
 */
export type BoundsCheckFunction = (row: number, column: number) => boolean

/**
 * Function signature for building ship instances.
 *
 * @typedef {(...args: any[]) => Object} ShipBuilderFunction
 * @description Factory function that creates ship objects with variable arguments
 */
export type ShipBuilderFunction = (...args: any[]) => Record<string, any>

/**
 * Function signature for building fleet instances.
 *
 * @typedef {(...args: any[]) => Object} FleetBuilderFunction
 * @description Factory function that creates fleet objects with variable arguments
 */
export type FleetBuilderFunction = (...args: any[]) => Record<string, any>

/**
 * Function signature for retrieving shapes by ship letter identifier.
 *
 * @typedef {(letter: string) => Object | undefined} ShapesByLetterFunction
 * @description Lookup function for ship shape data by letter code
 */
export type ShapesByLetterFunction = (letter: string) => Record<string, any> | undefined

/**
 * Generic constructor type for class-based mixins and extensions.
 *
 * Represents any class that can be instantiated with arbitrary arguments.
 * Used primarily for higher-order function patterns in mixin implementations.
 *
 * @typedef {new (...args: any[]) => any} Constructor
 * @description Generic constructor for mixin patterns
 */
export type Constructor<T = Record<string, any>> = new (...args: any[]) => T

/**
 * Ship-related display descriptions and metadata.
 *
 * Maps ship letter identifiers to their display descriptions used in UI
 * and reporting systems.
 *
 * @typedef {Record<string, string>} UnitDescriptions
 * @description Ship type descriptions by letter
 */
export type UnitDescriptions = Readonly<Record<string, string>>

/**
 * Splash damage classification tags for UI rendering.
 *
 * Maps numeric damage level identifiers to their string classifications
 * for rendering splash damage patterns and area-of-effect zones.
 *
 * @typedef {Record<number, string>} SplashTagsMap
 * @description Damage level to tag mapping
 */
export type SplashTagsMap = Readonly<Record<number, string>>

/**
 * Ship configuration with descriptions and type definitions.
 *
 * @typedef {Object} ShipConfig
 * @property {Record<string, string>} [descriptions] - Ship type descriptions by letter
 * @property {Record<string, Record<string, any>>} [types] - Ship type definitions by letter
 * @description Ship metadata and type registry configuration
 */
export interface ShipConfig {
  readonly descriptions?: Readonly<Record<string, string>>
  readonly types?: Readonly<Record<string, Record<string, any>>>
}

/**
 * Sound effect configuration mapping damage types to audio resources.
 *
 * @typedef {Record<string, string | URL>} SoundConfig
 * @description Damage/event type to sound URL mapping
 */
export type SoundConfig = Readonly<Record<string, string | URL>>

/**
 * Audio manager for playing terrain-specific sound effects.
 *
 * @typedef {Object} AudioManager
 * @property {(id: string, url: string | URL) => void} playAfterLoad - Plays a sound after loading from URL
 * @description Audio playback interface for terrain sounds
 */
export interface AudioManager {
  playAfterLoad: (id: string, url: string | URL) => void
}
