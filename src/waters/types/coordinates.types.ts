/**
 * @module waters/types/coordinates
 * Coordinate and location type definitions for grid-based gameplay.
 *
 * Provides standardized types for:
 * - Grid coordinates (row, column notation)
 * - Board positions and cell references
 * - Direction vectors for movement
 */

/**
 * Grid coordinate as [column, row] tuple.
 * Standard representation for ship cell positions in grid-based calculations.
 * Note: Uses [col, row] order for compatibility with bitboard operations.
 *
 * @example
 * const pos: GridCoordinate = [5, 3] // column 5, row 3
 */
export type GridCoordinate = readonly [number, number]

/**
 * Location object with row and column coordinates.
 * Used for cell references and targeting locations on the board.
 * Standard (r, c) notation for game logic calculations.
 */
export interface Location {
  /** Row coordinate (y-axis, 0-based from top) */
  r: number

  /** Column coordinate (x-axis, 0-based from left) */
  c: number
}

/**
 * Direction movement delta for cursor/navigation.
 * Represents one step in a direction for grid traversal.
 */
export interface CursorDirection {
  /** Row delta (-1, 0, or 1) for vertical movement */
  dx: number

  /** Column delta (-1, 0, or 1) for horizontal movement */
  dy: number
}

/**
 * Board context combining board reference with cell coordinates.
 * Passed to cell click handlers and event callbacks.
 */
export interface BoardContext {
  /** The game board object or reference */
  board: any // Circular ref - using any to avoid cycles

  /** Row coordinate */
  r: number

  /** Column coordinate */
  c: number

  /** DOM element of the cell */
  cell: HTMLElement
}

/**
 * Shadow coordinates for weapon preview/hint display.
 * Represents the visual position of a weapon's secondary effect or hint.
 */
export interface ShadowCoords {
  /** Row coordinate of weapon shadow */
  shadowR: number

  /** Column coordinate of weapon shadow */
  shadowC: number
}

/**
 * Selected coordinates for targeting.
 * Represents a player's chosen target location.
 */
export interface SelectedCoordinates {
  /** Target row coordinate */
  r: number

  /** Target column coordinate */
  c: number
}
