/**
 * Shape and fleet configuration type definitions for space terrain.
 *
 * Provides types for:
 * - Ship and installation cell layouts
 * - Weapon rack configurations
 * - Fleet factory patterns
 * - Hybrid and transformer configurations
 *
 * @module terrains/space/types/shape.types
 */

import type { CellLayout, RackLayout, Coord } from './grid.types'

/**
 * Constructor function for ship/shape classes.
 * Represents any class that can be instantiated with arbitrary arguments.
 *
 * @typedef {new (...args: any[]) => any} ShapeConstructor
 *
 * @example
 * class SpaceVessel { constructor(description, letter, ...) {} }
 * const ShapeConstructor: ShapeConstructor = SpaceVessel
 */
export type ShapeConstructor = new (...args: any[]) => any

/**
 * Factory function that produces a weapon instance.
 * Typically returns a concrete weapon object (e.g., RailBolt.single, LaserCannon).
 *
 * @typedef {() => any} WeaponFactory
 *
 * @example
 * const weaponFactory: WeaponFactory = () => RailBolt.single
 */
export type WeaponFactory = () => any

/**
 * Base configuration for any cell layout (vessel, shuttle, installation).
 * Represents the physical footprint of a unit on the game board.
 *
 * @typedef {Object} CellConfig
 * @property {string} description - Display name or classification
 * @property {CellLayout} cells - Array of [row, col] coordinates
 * @property {RackLayout} [racks] - Optional weapon mounting points
 */
export interface CellConfig {
  readonly description: string
  readonly cells: CellLayout
  readonly racks?: RackLayout
}

/**
 * Space vessel cell configuration and layout.
 * Defines the physical dimensions and weapon rack positions for a vessel.
 *
 * @typedef {Object} VesselConfig
 * @property {string} name - Vessel type name (e.g., 'Attack Craft')
 * @property {CellLayout} cells - Grid footprint
 * @property {RackLayout} [racks] - Weapon mounting positions
 */
export interface VesselConfig extends CellConfig {
  readonly name: string
}

/**
 * Space shuttle cell configuration and layout.
 * Defines the physical dimensions and weapon rack positions for a shuttle.
 *
 * @typedef {Object} ShuttleConfig
 * @property {string} name - Shuttle type name (e.g., 'Corvette')
 * @property {string} shortCode - Single character identifier
 * @property {string} armor - Armor/durability rating
 * @property {CellLayout} cells - Grid footprint
 * @property {RackLayout} [racks] - Weapon mounting positions (if any)
 */
export interface ShuttleConfig extends CellConfig {
  readonly name: string
  readonly shortCode: string
  readonly armor: string
}

/**
 * Installation (asteroid-based structure) configuration.
 * Defines the physical layout of a defensive or support installation.
 *
 * @typedef {Object} InstallationConfig
 * @property {string} name - Installation type name (e.g., 'Shelter', 'Mine')
 * @property {string} shortCode - Single character identifier
 * @property {string} armor - Armor type
 * @property {CellLayout} cells - Grid footprint
 */
export interface InstallationConfig extends CellConfig {
  readonly name: string
  readonly shortCode: string
  readonly armor: string
}

/**
 * Configuration for creating an armed unit with weapon attachment.
 * Used by factory classes to reduce parameter count and improve readability.
 *
 * Groups all configuration data for a single armed shape creation.
 *
 * @typedef {Object} ArmedShapeConfig
 * @property {ShapeConstructor} ShapeClass - Class to instantiate (ArmedVessel, ArmedInstallation)
 * @property {string} description - Human-readable name (e.g., 'Railgun', 'Destroyer')
 * @property {string} letter - Single letter identifier for map notation
 * @property {string} symmetry - Symmetry type ('S'=symmetric, 'H'=horizontal, 'A'=asymmetric, etc.)
 * @property {CellLayout} cells - Array of [row, col] coordinates defining shape
 * @property {string | null} tip - Placement instruction text or null
 * @property {RackLayout} racks - Array of weapon mount points
 * @property {WeaponFactory} weaponFactory - Function returning weapon instance to attach
 *
 * @example
 * {
 *   ShapeClass: ArmedVessel,
 *   description: 'Railgun',
 *   letter: 'R',
 *   symmetry: 'S',
 *   cells: [[0,1], [1,0], [1,1], [1,2], [2,1]],
 *   tip: null,
 *   racks: [[0,1,1], [1,0,2], [1,2,2], [2,1,1]],
 *   weaponFactory: () => RailBolt.single
 * }
 */
export interface ArmedShapeConfig {
  readonly ShapeClass: ShapeConstructor
  readonly description: string
  readonly letter: string
  readonly symmetry: string
  readonly cells: CellLayout
  readonly tip: string | null
  readonly racks: RackLayout
  readonly weaponFactory: WeaponFactory
}

/**
 * Cell configuration layer for hybrid or multi-terrain units.
 * Defines how a unit occupies cells in different terrain types.
 *
 * @typedef {Object} CellConfigLayer
 * @property {CellLayout} cells - Cells in this terrain layer
 * @property {any} validator - Placement validation function/config
 * @property {number} zoneDetail - Zone-specific detail level
 */
export interface CellConfigLayer {
  readonly cells: CellLayout
  readonly validator: any
  readonly zoneDetail: number
}

/**
 * Configuration for creating a hybrid ship with mixed terrain capabilities.
 * Hybrid ships can exist in multiple terrains (space and asteroid) simultaneously.
 *
 * @typedef {Object} HybridShipConfig
 * @property {string} description - Ship name and display label
 * @property {string} letter - Single character identifier
 * @property {string} symmetry - Symmetry configuration
 * @property {CellLayout} cells - Shape coordinates as [row, col] pairs
 * @property {readonly CellConfigLayer[]} cellConfigs - Configuration for each terrain
 * @property {string} placementTip - User instructions for proper placement
 * @property {Object} [extras] - Optional additional configuration
 * @property {any} [extras.canBeOn] - Placement validator
 * @property {any} [extras.subterrain] - Terrain configuration
 * @property {readonly string[]} [extras.notes] - Placement notes
 *
 * @example
 * {
 *   description: 'Habitat',
 *   letter: 'H',
 *   symmetry: 'H',
 *   cells: [[0,0], [1,0], [2,0]],
 *   cellConfigs: [spaceConfig, asteroidConfig],
 *   placementTip: 'place lowest level on asteroid',
 *   extras: {}
 * }
 */
export interface HybridShipConfig {
  readonly description: string
  readonly letter: string
  readonly symmetry: string
  readonly cells: CellLayout
  readonly cellConfigs: readonly CellConfigLayer[]
  readonly placementTip: string
  readonly extras?: {
    readonly canBeOn?: any
    readonly subterrain?: any
    readonly notes?: readonly string[]
  }
}

/**
 * Configuration for railgun variants (space or asteroid based).
 * Specific subtype of ArmedShapeConfig for railgun units.
 *
 * @typedef {Omit<ArmedShapeConfig, 'description'>} RailgunConfig
 *
 * @example
 * {
 *   ShapeClass: ArmedVessel,
 *   letter: 'R',
 *   symmetry: 'S',
 *   cells: [[0,1], [1,0], [1,1], [1,2], [2,1]],
 *   tip: null,
 *   racks: [[0,1,1], [1,0,2], [1,2,2], [2,1,1]],
 *   weaponFactory: () => RailBolt.single
 * }
 */
export type RailgunConfig = Omit<ArmedShapeConfig, 'description'>

/**
 * Transformer unit form configuration.
 * Defines one possible form or variant of a transformer ship.
 *
 * @typedef {Object} TransformerFormConfig
 * @property {string} name - Form name (e.g., 'Space Railgun', 'Asteroid Railgun')
 * @property {ShapeConstructor} ShapeClass - Class for this form
 * @property {CellLayout} cells - Grid footprint for this form
 * @property {RackLayout} racks - Weapon racks for this form
 * @property {any} [validator] - Optional placement validator
 * @property {string} [symmetry] - Optional symmetry override
 */
export interface TransformerFormConfig {
  readonly name: string
  readonly ShapeClass: ShapeConstructor
  readonly cells: CellLayout
  readonly racks: RackLayout
  readonly validator?: any
  readonly symmetry?: string
}

/**
 * Complete transformer configuration with multiple forms.
 * A transformer can switch between different forms/variants.
 *
 * @typedef {Object} TransformerConfig
 * @property {string} description - Display name
 * @property {string} letter - Single letter identifier
 * @property {readonly TransformerFormConfig[]} forms - All available forms
 * @property {WeaponFactory} weaponFactory - Weapon to attach to each form
 */
export interface TransformerConfig {
  readonly description: string
  readonly letter: string
  readonly forms: readonly TransformerFormConfig[]
  readonly weaponFactory: WeaponFactory
}

/**
 * Fleet array element - can be any space unit type.
 * Type-safe array element for spaceFleet that accommodates mixed unit types.
 *
 * @typedef {SpaceVessel | Shuttle | Installation | Hybrid | Transformer | any} FleetUnit
 */
export type FleetUnit = any

/**
 * Complete space fleet collection.
 * Array of all available ships, installations, and transformers.
 *
 * @typedef {FleetUnit[]} SpaceFleet
 */
export type SpaceFleet = readonly FleetUnit[]
