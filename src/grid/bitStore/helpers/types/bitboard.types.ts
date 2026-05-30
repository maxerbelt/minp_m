/**
 * @file bitboard.types.ts - Core bitboard and bit manipulation types
 *
 * Defines bitboard representation types supporting multiple storage formats:
 * - BigInt: For grids up to 256+ bits
 * - number: For small grids (up to 53 bits)
 * - Uint32Array: Dense array of 32-bit words
 * - Array<number>: Flexible array of 32-bit words
 *
 * These foundational types are used by all bitboard operations
 * and should be stable across the bitStore module.
 */

/**
 * Flexible bitboard representation supporting multiple storage formats.
 *
 * Used by BitGrid, morphology operations, and bit manipulation utilities.
 * Type selection depends on grid size:
 * - Small grids (< 53 bits): number
 * - Medium grids (< 256 bits): bigint
 * - Large grids: Uint32Array or Array<number>
 *
 * @typedef {bigint | number | Uint32Array | Array<number>} Bitboard
 */
export type Bitboard = bigint | number | Uint32Array | Array<number>;

/**
 * Bit position or index type within a bitboard.
 * Range depends on bitboard size, typically 0-255 for 256-bit boards.
 *
 * @typedef {number} BitPosition
 */
export type BitPosition = number;

/**
 * Bit value type - either 0 or 1 in binary form.
 * Used for single-bit operations and returns from isBitSet operations.
 *
 * @typedef {0n | 1n | boolean} BitValue
 */
export type BitValue = 0n | 1n | boolean;

/**
 * Generator yielding set bit positions from a bitboard.
 * Used by bits(), bitsBig(), bitsSafe() functions.
 *
 * @typedef {Generator<BitPosition>} BitPositionGenerator
 */
export type BitPositionGenerator = Generator<BitPosition>;

/**
 * Callback function for bit iteration operations.
 * Invoked for each set bit position in a bitboard.
 *
 * @callback BitIterationCallback
 * @param {BitPosition} index - The bit position that is set
 * @returns {void}
 */
export type BitIterationCallback = (index: BitPosition) => void;

/**
 * Generator yielding [x, y] coordinate pairs from a bitboard.
 * Used by BitGrid.locations() for grid iteration.
 *
 * @typedef {Generator<[number, number]>} CoordinateGenerator
 */
export type CoordinateGenerator = Generator<[number, number]>;

/**
 * Generator yielding [x, y, value] tuples from a bitboard.
 * Used by BitGrid.locationsWithValues() for grid iteration with cell values.
 *
 * @typedef {Generator<[number, number, bigint]>} CoordinateValueGenerator
 */
export type CoordinateValueGenerator = Generator<[number, number, bigint]>;

/**
 * Bit mask type - typically full bit pattern for a given width.
 * Can be BigInt or Uint32Array depending on storage format.
 *
 * @typedef {bigint | Uint32Array} BitMask
 */
export type BitMask = bigint | Uint32Array;

/**
 * Color or layer value in a multi-bit cell encoding.
 * Range depends on bits-per-cell: 1 bit = 2 colors, 8 bits = 256 colors.
 *
 * @typedef {number | bigint} ColorValue
 */
export type ColorValue = number | bigint;

/**
 * Bits-per-cell configuration for color depth.
 * Supported values: 1 (2 colors), 2 (4 colors), 4 (16 colors), 8 (256 colors).
 *
 * @typedef {1 | 2 | 4 | 8} BitsPerCell
 */
export type BitsPerCell = 1 | 2 | 4 | 8;

/**
 * Supported color depths derived from bits per cell.
 * 1 bit = 2 colors, 2 bits = 4 colors, 4 bits = 16 colors, 8 bits = 256 colors.
 *
 * @typedef {2 | 4 | 16 | 256} SupportedColorDepth
 */
export type SupportedColorDepth = 2 | 4 | 16 | 256;
