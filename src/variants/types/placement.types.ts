/**
 * @fileoverview Placement and board-related type definitions.
 * Defines interfaces and types for placement targets, board configurations, and grid tracking.
 * These types are central to the placement validation system used across variants and placements.
 */

import type { BoundsChecker, AreaBoundsChecker, ZoneInfoGetter, PlacementValidator } from './callbacks.types'

/**
 * Zone information for a specific position on the board.
 * Represents metadata about a grid location including terrain type, zone identifier,
 * and optional detail information for advanced placement constraints.
 * May be null or have missing properties when zone info is unavailable.
 *
 * @typedef {Object} ZoneInfo
 * @property {number|string|null} [detail] - Optional zone detail information
 *   Examples: zone ID, terrain type identifier, zone level, or custom constraint marker
 *   null if no zone information available at this position
 */
export interface ZoneInfo {
  detail?: number | string | null
}

/**
 * Target placement area configuration.
 * Encapsulates bounds checking and zone information retrieval for validating cell placements.
 * Provides all constraint checking functions needed by CellsToBePlaced and Placeable.
 * Typically created once per board/grid and shared across multiple placement instances.
 *
 * @interface PlacementTarget
 */
export interface PlacementTarget {
  /**
   * Validates if a single cell position is within grid bounds.
   * Checks whether a coordinate falls within valid placement area.
   *
   * @type {BoundsChecker}
   */
  boundsChecker: BoundsChecker

  /**
   * Validates if an entire rectangular area is within grid bounds.
   * Checks whether area (height × width) starting at (y, x) stays within bounds.
   * Used for comprehensive placement validation before trying to place cells.
   *
   * @type {AreaBoundsChecker}
   */
  allBoundsChecker: AreaBoundsChecker

  /**
   * Retrieves zone information for a position.
   * Gets metadata about terrain, zone, and other placement constraints at grid position.
   * Used to validate zone-based placement rules during constraint checking.
   *
   * @type {ZoneInfoGetter}
   */
  getZone: ZoneInfoGetter
}

/**
 * Board interface - grid manipulation contract for placement operations.
 * Represents a grid-like structure with coordinate transformation, query, and modification capabilities.
 * Typically implemented by SubBoard but can be any compatible grid-like object.
 * All coordinate operations follow world-relative positioning after embedding.
 *
 * @interface Board
 * @description Provides all methods needed for cell placement, validation, and grid operations
 */
export interface Board {
  /**
   * Creates an embedded copy of the board offset to world coordinates.
   * Returns a new board instance positioned at offset (x, y) in world space.
   * Used to transform local coordinates to world-relative coordinates for placement.
   *
   * @type {(x: number, y: number) => Board}
   */
  embed: (x: number, y: number) => Board

  /**
   * Empty board at the same position and size as this board.
   * Returns a new board with same dimensions but no occupied cells.
   * Used to initialize empty masks for tracking valid/invalid placement areas.
   *
   * @type {Board}
   */
  emptyMask: Board

  /**
   * Gets the value at specific board coordinates.
   * Retrieves occupancy value at position, optionally from a specific layer/depth.
   * Returns number (occupancy value) or null if position is unoccupied.
   *
   * @type {(x: number, y: number, depth?: number) => number | null}
   */
  at: (x: number, y: number, depth?: number) => number | null

  /**
   * Generator yielding all occupied cell positions.
   * Yields [x, y] coordinate pairs for each occupied cell in the board.
   * Used to iterate over placement coordinates efficiently.
   *
   * @type {() => Generator<[number, number]>}
   */
  occupiedLocations: () => Generator<[number, number]>

  /**
   * Generator yielding all occupied cells with their values.
   * Yields [x, y, value] tuples for each occupied cell, including occupancy value.
   * Used when occupancy information is needed during iteration.
   *
   * @type {() => Generator<[number, number, any]>}
   */
  occupiedLocationsAndValues: () => Generator<[number, number, any]>

  /**
   * Array of all occupied cell coordinates with values.
   * Returns [x, y, value] coordinate tuples for all occupied cells.
   * Provides array-based access to occupied locations (vs. generator interface).
   *
   * @type {Array<[number, number, number]>}
   */
  toCoords: Array<[number, number, number]>

  /**
   * Creates a new mask at specified dimensions.
   * Returns new board-compatible mask with given width/height dimensions.
   * Used to create new boards for transformations and dilations.
   *
   * @type {(width: number, height: number) => Board}
   */
  toMask: (width: number, height: number) => Board

  /**
   * Copies occupied cells to another mask.
   * Modifies the target mask to include all occupied cells from this board.
   * Used to merge placements into result boards.
   *
   * @type {(mask: Board) => void}
   */
  copyToMask: (mask: Board) => void

  /**
   * Returns dilated board (expanded by 1 cell in all directions).
   * Creates new board with occupied cells expanded outward by 1 cell.
   * Used to compute no-touch constraints and exclusion zones around placements.
   *
   * @type {() => Board}
   */
  flatDilate: () => Board

  /**
   * Grid width in cells.
   * The maximum column extent in world-relative coordinates.
   * Used for bounds checking and placement validation.
   *
   * @type {number}
   */
  width: number

  /**
   * Grid height in cells.
   * The maximum row extent in world-relative coordinates.
   * Used for bounds checking and placement validation.
   *
   * @type {number}
   */
  height: number

  /**
   * Count or percentage of occupied cells.
   * Represents occupancy density of the board.
   * May be used for optimization or density-based queries.
   *
   * @type {number}
   */
  occupancy: number
}

/**
 * Ship cell grid tracking interface - tracks placed ship cells and validates constraints.
 * Used during placement validation to check for overlaps and no-touch constraints.
 * Typically implemented by the game's ship tracking grid.
 *
 * @interface ShipCellGrid
 */
export interface ShipCellGrid {
  /**
   * Checks if a ship cell exists at the specified position.
   * Used to detect overlapping placements (ships can't overlap).
   *
   * @type {(x: number, y: number) => boolean}
   */
  has: (x: number, y: number) => boolean

  /**
   * Validates that a 3×3 neighborhood around a position is clear of ship cells.
   * Checks no-touch constraint (ships must not be adjacent or diagonal).
   * The bounds checker parameter validates positions against grid boundaries.
   *
   * @type {(x: number, y: number, boundsChecker: BoundsChecker) => boolean}
   */
  isAreaClearAroundXY: (x: number, y: number, boundsChecker: BoundsChecker) => boolean

  /**
   * Grid width in cells.
   * Used for bounds validation during placement checks.
   *
   * @type {number}
   */
  width: number

  /**
   * Grid height in cells.
   * Used for bounds validation during placement checks.
   *
   * @type {number}
   */
  height: number
}
