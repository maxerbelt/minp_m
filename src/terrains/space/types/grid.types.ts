/**
 * Grid and coordinate system type definitions for space terrain.
 *
 * Provides foundational types for grid-based game mechanics including:
 * - Coordinate representations (2D positions)
 * - Grid dimensions and sizing
 * - Cell configurations and layouts
 *
 * These types are used across all space terrain modules for:
 * - Unit placement and positioning
 * - Weapon targeting and area effects
 * - Terrain configuration and validation
 *
 * @module terrains/space/types/grid.types
 */

/**
 * A coordinate pair representing a single position on the game grid.
 * Format: [row, column] where row is Y-axis (0 = top) and column is X-axis (0 = left).
 *
 * Used throughout the codebase for:
 * - Unit cell positions
 * - Weapon target coordinates
 * - Grid calculations
 *
 * @typedef {[number, number]} Coord
 * @example
 * const pos: Coord = [5, 10]  // Row 5, Column 10
 * const [row, col] = pos
 */
export type Coord = readonly [number, number]

/**
 * Two-dimensional grid dimensions in [rows, columns] format.
 * Used to define battlefield size and grid boundaries.
 *
 * @typedef {[number, number]} GridSize
 * @example
 * const size: GridSize = [20, 20]    // 20x20 grid
 * const [height, width] = size
 */
export type GridSize = readonly [number, number]

/**
 * A coordinate pair representing a cell occupied by a game unit (vessel, installation, etc.).
 * Identical to Coord but semantically distinct - represents actual grid cell position.
 *
 * @typedef {[number, number]} UnitCell
 */
export type UnitCell = Coord

/**
 * Array of cell coordinates defining a unit's footprint on the game board.
 * Each element is a [row, column] coordinate relative to the unit's anchor point.
 *
 * @typedef {UnitCell[]} CellLayout
 * @example
 * const vesselCells: CellLayout = [
 *   [0, 0],
 *   [2, 0],
 *   [1, 1],
 *   [1, 2]
 * ]
 */
export type CellLayout = readonly UnitCell[]

/**
 * Weapon rack position with mounting point identifier.
 * Format: [row, column, rackId] where rackId identifies which weapon slot this is.
 *
 * @typedef {[number, number, number]} RackPosition
 * @example
 * const racks: RackPosition[] = [
 *   [0, 1, 1],   // Rack 1 at row 0, col 1
 *   [1, 0, 2]    // Rack 2 at row 1, col 0
 * ]
 */
export type RackPosition = readonly [number, number, number]

/**
 * Array of weapon rack positions on a unit.
 * Defines all mounting points where weapons can be attached.
 *
 * @typedef {RackPosition[]} RackLayout
 */
export type RackLayout = readonly RackPosition[]

/**
 * Cell within a 2D area-of-effect damage pattern with power/intensity rating.
 * Format: [row, col, power] where power indicates damage intensity level.
 *
 * Power values:
 * - 0: No effect / minimal damage
 * - 1: Secondary damage / reduced effect
 * - 2: Primary damage / direct hit
 * - 3+: Special / enhanced damage
 *
 * @typedef {[number, number, number]} AoeCell
 * @example
 * const aoeCells: AoeCell[] = [
 *   [0, 0, 2],  // Direct hit - power 2
 *   [0, 1, 1],  // Adjacent - power 1
 *   [1, 0, 1]   // Adjacent - power 1
 * ]
 */
export type AoeCell = readonly [number, number, number]

/**
 * Complete area-of-effect damage pattern for weapon detonation.
 * Array of cells with their impact power values, defining all affected cells.
 *
 * @typedef {AoeCell[]} AoePattern
 */
export type AoePattern = readonly AoeCell[]

/**
 * Index bracket for efficient coordinate-to-cell lookup.
 * Maps string-encoded coordinates (e.g., "5:10") to AoeCell tuples.
 * Used for O(1) cell lookup and deduplication when merging effect patterns.
 *
 * @typedef {Record<string, AoeCell>} CoordBracket
 */
export type CoordBracket = Record<string, AoeCell>

/**
 * Asteroid terrain layout specification array.
 * Each sub-array represents which columns contain asteroid (beige) terrain in that row.
 * Used to configure mixed space/asteroid terrain distribution.
 *
 * @typedef {Array<Array<number>>} AsteroidLayout
 * @example
 * const layout: AsteroidLayout = [
 *   [5, 6, 7],      // Row 5: Asteroids in columns 5, 6, 7
 *   [12, 13, 14],   // Row 12: Asteroids in columns 12, 13, 14
 *   []               // Other rows: All space terrain
 * ]
 */
export type AsteroidLayout = readonly (readonly number[])[]
