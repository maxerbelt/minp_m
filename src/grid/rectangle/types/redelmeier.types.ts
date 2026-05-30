/**
 * Redelmeier Algorithm Types
 * 
 * Defines types for polyomino generation using the Redelmeier algorithm.
 * 
 * Redelmeier's algorithm is used to enumerate polyominoes (connected arrangements
 * of unit cells) for a given size, with support for canonical form computation
 * and symmetry classification.
 * 
 * @see Redelmeier, D. Hugh. "The enumeration of polyominoes by perimeter." Discrete mathematics, 1981.
 */

import type { BoundingBoxResult } from './geometry.types'

/**
 * Bit store interface for polyomino operations.
 * 
 * Provides bitboard operations needed by Redelmeier algorithm including
 * bit manipulation, shrinking, and bounding box calculations.
 */
export interface RedelmeierBitStore {
  /**
   * Gets bitmask at position.
   * 
   * @param bitboard - Current bitboard
   * @param pos - Bit position
   * @returns Bitmask value at position
   */
  bitMaskByPos: (bitboard: bigint | any, pos: number) => bigint | any;
  
  /**
   * Sets bit at index.
   * 
   * @param bitboard - Current bitboard
   * @param index - Bit index
   * @param value - Value to set (optional)
   * @returns Updated bitboard
   */
  setIdx: (bitboard: bigint | any, index: number, value?: number) => bigint | any;
  
  /**
   * Checks if bit is set at index.
   * 
   * @param bitboard - Current bitboard
   * @param index - Bit index
   * @returns True if bit is set
   */
  hasIdxSet: (bitboard: bigint | any, index: number) => boolean;
  
  /**
   * Gets empty bounding box (typically all zeros).
   * 
   * @returns Result with empty bitboard and dimensions
   */
  emptyBoundingBox: () => BoundingBoxResult;
  
  /**
   * Shrinks bitboard to minimal bounding box containing occupied cells.
   * 
   * @param bitboard - Bitboard to shrink
   * @param height - Current height
   * @param width - Current width
   * @returns Shrunk bitboard with new dimensions
   */
  shrinkToOccupied: (bitboard: bigint | any, height: number, width: number) => BoundingBoxResult;
  
  /**
   * Expands bitboard to square grid.
   * 
   * @param bitboard - Bitboard to expand
   * @param height - Current height
   * @param width - Current width
   * @returns Expanded square bitboard
   */
  expandToSquare: (bitboard: bigint | any, height: number, width: number) => bigint | any;
  
  /**
   * Gets bounding box of non-empty cells.
   * 
   * @param bitboard - Bitboard to analyze
   * @param height - Current height
   * @param width - Current width
   * @returns Result with bounding box minRow, minCol
   */
  boundingBox: (bitboard: bigint | any, height: number, width: number) => { minRow: number; minCol: number } | null;
}

/**
 * Generator state for Redelmeier algorithm.
 * 
 * Tracks progress during polyomino generation to enable:
 * - Canonical form deduplication
 * - Frontier computation for growth constraints
 * - Generation control
 */
export interface RedelmeierState {
  /**
   * Set of canonical form representations already generated.
   * 
   * Used to avoid generating duplicate polyominoes that are rotations/flips
   * of already-generated ones.
   * 
   * Stores canonical form hashes or string representations.
   */
  seenCanonicalForms: Set<string>;
  
  /**
   * Minimum frontier index for growth constraint.
   * 
   * Constrains where new cells can be added to maintain canonical ordering.
   * Ensures each polyomino is generated only once (no duplicates from different growth paths).
   * 
   * Frontier indices grow from left to right, top to bottom across the grid.
   */
  minimumFrontierIndex: number;
  
  /** Optional: Size of polyominoes being generated (n-ominoes) */
  size?: number;
  
  /** Optional: Total count of polyominoes generated so far */
  generatedCount?: number;
}

/**
 * Polyomino representation (standard 2D cell list).
 * 
 * Simple representation of a polyomino as array of occupied cell coordinates.
 */
export type Polyomino = Array<[x: number, y: number]>;

/**
 * Canonical form identifier for polyomino.
 * 
 * Unique identifier for a polyomino ignoring rotations and reflections.
 * Two polyominoes have the same canonical form iff they're related by
 * a D4 symmetry transformation.
 */
export type CanonicalFormId = string;

/**
 * Polyomino generation options.
 * 
 * Configuration for Redelmeier algorithm execution.
 */
export interface RedelmeierOptions {
  /** Size of polyominoes to generate (n-ominoes, e.g., n=4 for tetrominoes) */
  size: number;
  
  /** Whether to compute canonical forms and deduplicate */
  deduplicateByCanonicalForm?: boolean;
  
  /** Maximum polyominoes to generate (stops early if reached) */
  maxResults?: number;
  
  /** Random seed for reproducibility (if using randomized variants) */
  seed?: number;
  
  /** Whether to include one-sided polyominoes (fixed reflections) */
  fixedReflections?: boolean;
  
  /** Whether to include freely rotatable/flippable polyominoes */
  freeReflections?: boolean;
  
  /** Callback for progress reporting (called after each polyomino generated) */
  onProgress?: (current: number, total?: number) => void;
}

/**
 * Result from polyomino generation.
 * 
 * Complete or partial result of generating n-ominoes.
 */
export interface RedelmeierResult {
  /** Array of generated polyominoes */
  polyominoes: Polyomino[];
  
  /** Whether generation completed (vs maxed out) */
  complete: boolean;
  
  /** Total polyominoes generated */
  count: number;
  
  /** Polyominoes grouped by canonical form (if deduplication enabled) */
  byCanonical?: Record<CanonicalFormId, Polyomino[]>;
  
  /** Statistics about generation */
  stats?: {
    /** Total frontier expansions examined */
    frontierExpansions: number;
    
    /** Total polyominoes rejected as duplicates */
    duplicatesRejected: number;
    
    /** Generation time in milliseconds */
    timeMs: number;
  };
}

/**
 * Frontier cell during polyomino growth.
 * 
 * Represents a potential expansion point for growing a polyomino.
 */
export interface FrontierCell {
  /** X coordinate */
  x: number;
  
  /** Y coordinate */
  y: number;
  
  /** Index in frontier ordering (used for canonical constraint) */
  index: number;
  
  /** Distance from seed cell (for breadth-first growth) */
  distance?: number;
}

/**
 * Symmetry information for generated polyomino.
 * 
 * Indicates which D4 transformations preserve the polyomino.
 */
export interface PolyominoSymmetry {
  /** Number of rotational symmetries (1, 2, or 4) */
  rotations: 1 | 2 | 4;
  
  /** Whether polyomino has reflection symmetry */
  reflective: boolean;
  
  /** D4 group size (1-8) */
  d4GroupSize: 1 | 2 | 4 | 8;
  
  /** Orbit type classification */
  orbitType: 'ASYM' | 'O4F' | 'O4R' | 'O2F' | 'O2R' | 'SYM';
}

/**
 * Comparison result for two polyominoes.
 * 
 * Indicates relationship between two polyominoes (identical, transforms, different).
 */
export interface PolyominoComparison {
  /** Whether polyominoes are identical */
  identical: boolean;
  
  /** Whether polyominoes are transforms of each other */
  relatedByTransform: boolean;
  
  /** Transformation relating them (if relatedByTransform) */
  transform?: string;
  
  /** Symmetry of base polyomino */
  symmetry?: PolyominoSymmetry;
}
