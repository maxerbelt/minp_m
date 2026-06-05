/**
 * @module waters/helpers/types/geometry
 * Grid, map, and spatial operation types.
 *
 * Shared types for:
 * - Grid boundary checking and validation
 * - Neighborhood and surrounding cell operations
 * - Coordinate systems and mapping
 * - Displacement and area calculations
 */


/**
 * Map interface for grid boundary checking.
 * Defines the contract for map objects used by spatial helpers.
 *
 * Maps must implement in-bounds validation to ensure
 * operations stay within valid grid bounds.
 */
export interface GridMap {
  /**
   * Checks if a coordinate is within valid grid bounds.
   * Used to validate cell operations before processing.
   *
   * @param row - Row coordinate to check
   * @param col - Column coordinate to check
   * @returns true if coordinate is within bounds, false otherwise
   */
  inBounds(row: number, col: number): boolean
}

/**
 * Grid map with explicit dimension properties.
 * Extended interface providing dimension information for calculations.
 */
export interface DimensionedGridMap extends GridMap {
  /** Number of columns in the grid */
  cols: number

  /** Number of rows in the grid */
  rows: number
}

/**
 * Map configuration for board sizing and display.
 * Used by BoardConfigurator for grid layout setup.
 */
export interface MapConfig extends DimensionedGridMap {
  /** Optional identifier for the map */
  id?: string | number

  /** Optional map name for display/logging */
  name?: string

  /** Optional metadata for terrain or scenario info */
  metadata?: Record<string, unknown>
}

/**
 * Neighborhood span constants for connected adjacency.
 * Defines the delta range for cell neighbor operations.
 *
 * Standard 8-connected neighborhood uses [-1, 1] delta range,
 * creating a 3×3 kernel centered on the target cell.
 */
export interface NeighborhoodSpan {
  /** Minimum coordinate delta (typically -1 for 8-connected) */
  MIN_DELTA: number

  /** Maximum coordinate delta (typically 1 for 8-connected) */
  MAX_DELTA: number
}

/**
 * Coordinate pair representing a cell position.
 * Used for grid-based positioning and iteration.
 */
export interface Coordinate {
  /** Row coordinate (0-based, top to bottom) */
  row: number

  /** Column coordinate (0-based, left to right) */
  col: number
}

/**
 * Cell position with associated data.
 * Combines spatial position with metadata or value.
 */
export interface CellWithData<T = unknown> extends Coordinate {
  /** Associated data or value for this cell */
  data: T
}

/**
 * Zone size metrics for displacement calculations.
 * Tracks area across different zone types.
 */
export interface ZoneSizes {
  /** Total combined area across all zones */
  total: number

  /** Area in margin/boundary zones */
  margin: number

  /** Area in core/interior zones */
  core: number
}

/**
 * Shape with size property for displacement analysis.
 * Used in displacement calculator and zone manager.
 */
export interface ShapeWithSize {
  /** Size/area value of this shape in grid cells */
  size: number

  /**
   * Gets the subterrain type for this shape.
   * Used for terrain-specific displacement calculations.
   */
  subterrain(): unknown
}

/**
 * Shape object with terrain information.
 * Minimal shape interface for terrain queries.
 */
export interface ShapeObject {
  /**
   * Gets the subterrain type for this shape.
   * Used to classify shapes by terrain occupation.
   */
  subterrain(): unknown
}

/**
 * Board configuration for display and printing.
 * Specifies grid dimensions and cell sizing.
 */
export interface BoardConfig {
  /** HTML element representing the board container */
  board: HTMLElement

  /** Map object with grid dimensions */
  map?: MapConfig

  /** Cell size in CSS units (e.g., '30px', '2em') */
  cellSize?: string
}

/**
 * Print board configuration for print layout.
 * Extended configuration for print-specific settings.
 */
export interface PrintBoardConfig extends BoardConfig {
  /** Print-specific cell size calculation */
  cellSizePrint?: string

  /** Optional expansion for print layout compatibility */
  printExpansion?: number
}

/**
 * Iterator options for grid or collection operations.
 * Provides control over iteration behavior.
 */
export interface IterationOptions {
  /** Include the center/starting cell in iteration */
  includeCenter?: boolean

  /** Stop iteration when predicate returns true */
  breakOnCondition?: (value: unknown) => boolean

  /** Maximum items to iterate (limits collection size) */
  maxItems?: number
}

/**
 * Grid dimensions for board sizing.
 * Specifies row and column counts.
 */
export interface GridDimensions {
  /** Number of columns */
  cols: number

  /** Number of rows */
  rows: number
}
