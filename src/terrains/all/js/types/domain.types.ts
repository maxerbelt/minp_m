/**
 * @fileoverview Domain Type References for Terrain System
 *
 * Type references to core domain classes used throughout the terrain system.
 * These are re-exported for convenience and act as a central reference point
 * for domain model types.
 *
 * Note: These are references only - actual implementations are in separate files
 * to preserve runtime structure and support gradual TypeScript migration.
 *
 * @module terrains/all/js/types/domain.types
 */

/**
 * Subterrain type reference.
 *
 * Represents a distinct terrain environment (Mountain, Forest, Desert for Land;
 * Shallow, Deep for Sea; Asteroid, Vacuum for Space) with its own visual properties,
 * zones, and validation logic.
 *
 * @typedef {Object} SubTerrainBase
 * @description Reference to SubTerrainBase class from SubTerrainBase.js
 */
export interface SubTerrainBase {
  readonly title: string
  readonly lightColor: string
  readonly darkColor: string
  readonly letter: string
  readonly isDefault: boolean
  readonly isLand: boolean
  readonly zones: readonly any[]
  canBe: (subterrain: SubTerrainBase) => boolean
  validator: (zoneInfo: readonly [SubTerrainBase, unknown]) => boolean
}

/**
 * Concrete subterrain type.
 *
 * Concrete implementation of SubTerrainBase with identity-based validation.
 * Used as singleton-like instances representing terrain types.
 *
 * @typedef {Object} SubTerrain
 * @description Reference to SubTerrain class from SubTerrain.js
 */
export interface SubTerrain extends SubTerrainBase {
  // Same as SubTerrainBase for concrete implementations
}

/**
 * Zone descriptor for terrain classification.
 *
 * Lightweight descriptor for terrain zones, representing either core areas
 * or marginal/boundary transitions.
 *
 * @typedef {Object} Zone
 * @property {string} title - Display title of the zone
 * @property {string} letter - Single-character abbreviation
 * @property {boolean} isMarginal - Whether this is a marginal boundary zone
 * @description Zone descriptor class from Zone.js
 */
export interface Zone {
  readonly title: string
  readonly letter: string
  readonly isMarginal: boolean
  toString: () => string
}

/**
 * Map base class reference.
 *
 * Base class for terrain maps with common functionality for map geometry,
 * terrain tracking, and basic operations.
 *
 * @typedef {Object} BhMap
 * @property {string} title - Map display name
 * @property {string} name - Internal map identifier
 * @property {number} rows - Number of rows in grid
 * @property {number} cols - Number of columns in grid
 * @property {number | Record<string, number>} ships - Ship count configuration
 * @property {readonly any[]} landArea - Pre-generated land ranges
 * @property {Set<string>} land - Land cells as "r,c" strings
 * @property {Record<string, any>} terrain - Terrain configuration
 * @property {bigint} defaultBigint - Bitfield for default terrain
 * @property {bigint} landBigint - Bitfield for land cells
 * @property {boolean} isBuiltin - Whether map is from built-in set
 * @description Map configuration interface from map.js
 */
export interface BhMap {
  readonly title: string
  readonly name: string
  readonly rows: number
  readonly cols: number
  readonly ships: number | Record<string, number>
  readonly landArea?: readonly any[]
  readonly land?: Set<string>
  readonly terrain: Record<string, any>
  readonly defaultBigint?: bigint
  readonly landBigint?: bigint
  readonly isBuiltin: boolean
  inBounds: (r: number, c: number) => boolean
  isLand: (r: number, c: number) => boolean
}

/**
 * Custom map extending BhMap with modification capabilities.
 *
 * User-editable map with localStorage persistence and land modification support.
 *
 * @typedef {Object} CustomMap
 * @description Reference to CustomMap class from map.js
 */
export interface CustomMap extends BhMap {
  addLand?: (r: number, c: number) => void
  removeLand?: (r: number, c: number) => void
}

/**
 * Blank custom map for user creation.
 *
 * Custom map starting with empty land set, supports full modification.
 *
 * @typedef {Object} CustomBlankMap
 * @description Reference to CustomBlankMap class from map.js
 */
export interface CustomBlankMap extends CustomMap {
  // Extends CustomMap with mixin capabilities
}

/**
 * Saved custom map from localStorage.
 *
 * Custom map loaded from persistent storage with full history preserved.
 *
 * @typedef {Object} SavedCustomMap
 * @description Reference to SavedCustomMap class from map.js
 */
export interface SavedCustomMap extends CustomMap {
  // Extends CustomMap with saved properties
}

/**
 * Edited custom map variant.
 *
 * Custom map that has been modified after loading, tracking changes.
 *
 * @typedef {Object} EditedCustomMap
 * @description Reference to EditedCustomMap class from map.js
 */
export interface EditedCustomMap extends CustomMap {
  // Extends CustomMap with edit tracking
}

/**
 * SubTerrain tracker for map regions.
 *
 * Tracks a single subterrain on a map with footprint and zone calculations.
 *
 * @typedef {Object} SubTerrainTracker
 * @property {SubTerrain} subterrain - The tracked subterrain
 * @property {Set<string>} cells - Cells belonging to this subterrain
 * @description Subterrain tracking interface from SubTerrainTrackers.js
 */
export interface SubTerrainTracker {
  readonly subterrain: SubTerrain
  readonly cells: Set<string>
  readonly sizes: { readonly total: number; readonly margin: number; readonly core: number }
  readonly totalSize: number
}

/**
 * Multiple subterrain tracker manager.
 *
 * Manages tracking of multiple subterrains on a map with aggregated operations.
 *
 * @typedef {Object} SubTerrainTrackers
 * @description Subterrain collection tracker from SubTerrainTrackers.js
 */
export interface SubTerrainTrackers {
  calc: (map: any) => void
  calcFootPrints: () => void
  subterrain: (x: number, y: number, defaultValue?: any) => any
  zoneDetail: (x: number, y: number) => readonly [any, any]
  zone: (x: number, y: number) => any
  zoneInfo: (x: number, y: number, zoneDetail: number) => readonly any[]
}
