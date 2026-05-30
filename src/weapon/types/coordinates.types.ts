/**
 * Coordinate and direction types for weapon system
 * Provides shared coordinate representations across all weapon modules
 */

/**
 * A coordinate tuple [row, column]
 * Represents a single cell location on the game grid
 * @readonly
 */
export type Coord = readonly [row: number, col: number]

/**
 * A pair of coordinates [[row1, col1], [row2, col2]]
 * Used for line-based weapons and vector calculations
 * @readonly
 */
export type CoordPair = readonly [start: Coord, end: Coord]

/**
 * A direction offset [rowOffset, colOffset]
 * Represents movement in grid space relative to a center point
 * @readonly
 */
export type DirectionOffset = readonly [rowDelta: number, colDelta: number]

/**
 * Canonical direction offsets for orthogonal movement (cardinal directions)
 * Order: up, down, left, right
 */
export type CardinalDirections = readonly [
  up: DirectionOffset,
  down: DirectionOffset,
  left: DirectionOffset,
  right: DirectionOffset
]

/**
 * Canonical direction offsets for diagonal movement
 * Order: up-left, up-right, down-left, down-right
 */
export type DiagonalDirections = readonly [
  upLeft: DirectionOffset,
  upRight: DirectionOffset,
  downLeft: DirectionOffset,
  downRight: DirectionOffset
]

/**
 * Pixel coordinate
 * Represents screen/canvas position
 * @readonly
 */
export type PixelCoord = {
  readonly x: number
  readonly y: number
}

/**
 * Coordinate validation result type
 * Used by coordinate normalization functions
 */
export type CoordinateValidation = {
  readonly isValid: boolean
  readonly normalized: CoordPair
  readonly error?: string
}
