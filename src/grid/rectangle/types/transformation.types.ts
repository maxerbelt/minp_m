/**
 * Transformation Types for D4 Symmetry Group
 * 
 * Defines types for dihedral group (D4) symmetry operations:
 * rotations (0°, 90°, 180°, 270°) and reflections (vertical, horizontal, diagonals).
 * 
 * Used for shape classification, canonical form computation, and symmetry analysis.
 */

/**
 * D4 Transformation names identifying each symmetry operation.
 * The D4 group contains 8 elements:
 * - 4 rotations: identity, 90°, 180°, 270°
 * - 4 reflections: vertical, horizontal, main diagonal, anti-diagonal
 */
export enum D4TransformName {
  /** Identity - no transformation */
  IDENTITY = 'id',
  
  /** Rotate 90° clockwise */
  ROTATE_90 = 'r90',
  
  /** Rotate 180° */
  ROTATE_180 = 'r180',
  
  /** Rotate 270° clockwise (or 90° counter-clockwise) */
  ROTATE_270 = 'r270',
  
  /** Reflect vertically (flip across vertical axis) */
  FLIP_VERTICAL = 'fx',
  
  /** Reflect horizontally (flip across horizontal axis) */
  FLIP_HORIZONTAL = 'fy',
  
  /** Reflect along main diagonal (↘ direction) */
  FLIP_DIAGONAL1 = 'fd1',
  
  /** Reflect along anti-diagonal (↙ direction) */
  FLIP_DIAGONAL2 = 'fd2'
}

/**
 * Transformation map - index array for a single D4 transformation.
 * Each element at index i maps source index i to transformed index.
 * 
 * Format: transformMap[oldIndex] = newIndex
 * 
 * @example
 * const rotation90 = [5, 1, 6, 3, 0, 7, 2, 4]; // Example 8-cell grid map
 * const newIndex = rotation90[3]; // Get transformed position of cell 3
 */
export type TransformMap = number[];

/**
 * All D4 transformation maps for a grid.
 * Maps each D4 symmetry operation to an index array.
 * 
 * Complete specification of the dihedral group for a given grid size.
 * 
 * @example
 * const maps: TransformMaps = {
 *   id: [0, 1, 2, 3, ...],    // Identity
 *   r90: [5, 1, 6, 3, ...],   // Rotate 90°
 *   r180: [7, 6, 5, 4, ...],  // Rotate 180°
 *   ...
 * };
 * 
 * const rotated = maps.r90[originalIndex];
 */
export interface TransformMaps {
  /** Identity map - no transformation */
  id: TransformMap;
  
  /** Rotate 90° clockwise map */
  r90: TransformMap;
  
  /** Rotate 180° map */
  r180: TransformMap;
  
  /** Rotate 270° clockwise map */
  r270: TransformMap;
  
  /** Reflect vertically (flip across vertical axis) map */
  fx: TransformMap;
  
  /** Reflect horizontally (flip across horizontal axis) map */
  fy: TransformMap;
  
  /** Reflect along main diagonal map (optional) */
  fd1?: TransformMap;
  
  /** Reflect along anti-diagonal map (optional) */
  fd2?: TransformMap;
}

/**
 * Transform map object using string keys instead of enum.
 * Used for dynamic or flexible key access patterns.
 * 
 * @example
 * const maps: TransformMapObject = {
 *   'id': [0, 1, 2, ...],
 *   'r90': [5, 1, 6, ...],
 *   ...
 * };
 */
export type TransformMapObject = Record<string, number[]>;

/**
 * Array of transformation maps (alternative format).
 * Each element is an array representing one transformation map.
 * 
 * Used in algorithms that iterate over all 8 transformations.
 */
export type TransformMapArray = TransformMap[];

/**
 * Result of shape classification by orbit type.
 * Indicates the symmetry group of a shape within D4.
 * 
 * Orbit classification determines how many unique transforms a shape has:
 * - ASYM (8): No symmetries, all 8 transforms are unique
 * - O4F/O4R (4): 4-fold symmetry (fixed or rotated variants)
 * - O2F/O2R (2): 2-fold symmetry (quarter rotations)
 * - SYM (1): Full symmetry, all transforms identical
 */
export enum OrbitType {
  /** Asymmetric - 8 unique orientations (no symmetries) */
  ASYM = 'ASYM',
  
  /** 4-fold with fixed-rotation parity */
  O4F = 'O4F',
  
  /** 4-fold with rotational parity */
  O4R = 'O4R',
  
  /** 2-fold with fixed-flip parity */
  O2F = 'O2F',
  
  /** 2-fold with rotational parity */
  O2R = 'O2R',
  
  /** Fully symmetric - 1 unique orientation (all transforms identical) */
  SYM = 'SYM'
}

/**
 * Transformation combination result.
 * Composed transformation from two D4 operations.
 * 
 * Used for transformation algebra (composing rotations, flips, etc).
 * 
 * @example
 * // Rotation 90° followed by vertical flip
 * const composed: TransformComposition = {
 *   source1: D4TransformName.ROTATE_90,
 *   source2: D4TransformName.FLIP_VERTICAL,
 *   result: D4TransformName.FLIP_DIAGONAL1 // Result of r90 ∘ fx
 * };
 */
export interface TransformComposition {
  /** First transformation in composition */
  source1: D4TransformName | string;
  
  /** Second transformation in composition */
  source2: D4TransformName | string;
  
  /** Result transformation of source1 followed by source2 */
  result: D4TransformName | string;
}

/**
 * Classification of shape symmetries.
 * Indicates which transformations map a shape to itself (self-similar).
 * 
 * Used for canonical form computation and shape comparison.
 */
export interface SymmetryGroup {
  /** Set of transformation names that preserve this shape */
  preservingTransforms: D4TransformName[];
  
  /** Orbit type classification (determines count of unique transforms) */
  orbitType: OrbitType;
  
  /** Number of unique orientations for this shape (1-8) */
  uniqueOrientationCount: number;
}

/**
 * Canonical form specification for shape comparison.
 * Enables identifying unique shapes ignoring rotations/flips.
 * 
 * Used in polyomino generation and shape databases.
 */
export interface CanonicalForm {
  /** Hash or identifier for the canonical form */
  hash: string;
  
  /** Which transformation maps to canonical form from original */
  canonicalTransform: D4TransformName;
  
  /** Bitboard representation in canonical form */
  canonicalBits: bigint | any;
  
  /** Symmetry information for this canonical form */
  symmetry: SymmetryGroup;
}
