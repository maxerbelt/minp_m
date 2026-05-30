/**
 * Strategy pattern and extensibility type definitions for morphology.
 *
 * Defines types for implementations that follow the strategy pattern,
 * enabling pluggable morphology algorithms and different grid topologies.
 *
 * @module types/strategies
 */

import type { Bitboard, MorphologyRadius } from './bitboard.types.js';
import type { BaseMask, GridIndexer, HexIndexer } from './masks.types.js';
import type { BaseStore } from './stores.types.js';

/**
 * Strategy interface for different grid topologies.
 *
 * Each grid topology (rectangular, hexagonal, triangular) implements this
 * to provide specialized morphological operations respecting that topology's
 * neighbor connectivity.
 *
 * @interface MorphologyStrategy
 */
export interface MorphologyStrategy {
  /**
   * Human-readable name of this strategy
   *
   * @example "RectMorphologyOps", "HexMorphologyOps"
   */
  readonly name: string;

  /**
   * Grid topology identifier
   *
   * @example "rectangular", "hexagonal", "triangular"
   */
  readonly gridType: string;

  /**
   * Number of neighbors per cell in this topology
   *
   * @example 4 (cardinal) or 8 (with diagonals)
   */
  readonly neighborCount: number;

  /**
   * Dilate using this topology's neighbor pattern
   *
   * @param bits - Input bitboard
   * @param radius - Number of expansion steps
   * @param options - Optional strategy-specific parameters
   * @returns Dilated bitboard
   */
  dilate(bits: Bitboard, radius: MorphologyRadius, options?: any): Bitboard;

  /**
   * Erode using this topology's neighbor pattern
   *
   * @param bits - Input bitboard
   * @param radius - Number of contraction steps
   * @param options - Optional strategy-specific parameters
   * @returns Eroded bitboard
   */
  erode(bits: Bitboard, radius: MorphologyRadius, options?: any): Bitboard;
}

/**
 * Rectangular grid morphology strategy.
 *
 * Supports both 4-connectivity (cross) and 8-connectivity (full neighborhood).
 *
 * @interface RectangularMorphologyStrategy
 */
export interface RectangularMorphologyStrategy extends MorphologyStrategy {
  readonly gridType: 'rectangular';
  readonly neighborCount: 4 | 8;

  /**
   * Cross dilation (4-connectivity) variant
   *
   * @param bits - Input bitboard
   * @returns Cross-dilated bitboard
   */
  dilateCross(bits: Bitboard): Bitboard;

  /**
   * Cross dilation bits variant (non-mutating)
   *
   * @param bits - Input bitboard
   * @returns Cross-dilated bitboard
   */
  dilateCrossBits(bits: Bitboard): Bitboard;
}

/**
 * Hexagonal grid morphology strategy.
 *
 * Always uses 6-neighbor connectivity for hexagonal topology.
 *
 * @interface HexagonalMorphologyStrategy
 */
export interface HexagonalMorphologyStrategy extends MorphologyStrategy {
  readonly gridType: 'hexagonal';
  readonly neighborCount: 6;

  /**
   * Single erosion step convenience method
   *
   * @returns Eroded bitboard
   */
  erodeOnce(bits: Bitboard): Bitboard;
}

/**
 * Store morphology specialization strategy.
 *
 * Different store implementations (BigInt, Uint32Array, etc.) may
 * provide specialized morphology algorithms optimized for their storage.
 *
 * @interface StoreMorphologyStrategy
 */
export interface StoreMorphologyStrategy {
  /**
   * Store type identifier
   *
   * @example "StoreBig", "Store32", "StoreCompressed"
   */
  readonly storeType: string;

  /**
   * Whether this store specializes in single-bit operations
   */
  readonly optimizedFor: 'single-bit' | 'multi-bit' | 'both';

  /**
   * Perform dilation with store-specific optimization
   *
   * @param bits - Input bitboard
   * @param radius - Number of expansion steps
   * @param gridDimensions - Grid dimensions needed for calculations
   * @returns Dilated bitboard
   */
  dilateOptimized(
    bits: Bitboard,
    radius: MorphologyRadius,
    gridDimensions: { width: number; height: number }
  ): Bitboard;

  /**
   * Perform erosion with store-specific optimization
   *
   * @param bits - Input bitboard
   * @param radius - Number of contraction steps
   * @param gridDimensions - Grid dimensions needed for calculations
   * @returns Eroded bitboard
   */
  erodeOptimized(
    bits: Bitboard,
    radius: MorphologyRadius,
    gridDimensions: { width: number; height: number }
  ): Bitboard;
}

/**
 * Factory for creating morphology operations.
 *
 * Enables late binding of strategy implementations without tight coupling.
 *
 * @interface MorphologyFactory
 */
export interface MorphologyFactory {
  /**
   * Create morphology operations for given mask
   *
   * @param mask - Mask to create operations for
   * @returns Morphology operations instance
   */
  create(mask: BaseMask): any;

  /**
   * Get available strategies
   *
   * @returns List of registered strategy names
   */
  getAvailableStrategies(): string[];

  /**
   * Register custom strategy
   *
   * @param name - Strategy identifier
   * @param strategy - Strategy implementation
   */
  registerStrategy(name: string, strategy: MorphologyStrategy): void;
}

/**
 * Adapter for integrating new morphology algorithms.
 *
 * Allows wrapping custom morphology implementations to work with the
 * standard morphology operation interface.
 *
 * @interface MorphologyAdapter
 */
export interface MorphologyAdapter {
  /**
   * Adapt custom implementation to standard interface
   *
   * @param customImpl - Custom morphology implementation
   * @returns Adapted to MorphologyStrategy
   */
  adapt(customImpl: any): MorphologyStrategy;

  /**
   * Check if implementation can be adapted
   *
   * @param customImpl - Implementation to check
   * @returns True if adaptable
   */
  canAdapt(customImpl: any): boolean;
}

/**
 * Configuration for morphology operation behavior.
 *
 * @interface MorphologyConfig
 */
export interface MorphologyConfig {
  /** Default dilation radius */
  defaultDilationRadius?: number;

  /** Default erosion radius */
  defaultErosionRadius?: number;

  /** Whether to use separable operations (if available) */
  useSeparable?: boolean;

  /** Whether to use edge masking for boundary protection */
  useEdgeMasks?: boolean;

  /** Whether to enable performance optimizations */
  enableOptimizations?: boolean;

  /** Whether to validate inputs */
  validateInputs?: boolean;

  /** Custom grid topology (default: 'rectangular') */
  gridTopology?: 'rectangular' | 'hexagonal' | 'triangular' | string;
}

/**
 * Context for morphology operations - carries configuration and state.
 *
 * @interface MorphologyContext
 */
export interface MorphologyContext {
  /** Operation configuration */
  readonly config: MorphologyConfig;

  /** Active strategy implementation */
  readonly strategy: MorphologyStrategy;

  /** Current mask being operated on */
  readonly mask: BaseMask;

  /** Storage backend */
  readonly store: BaseStore;

  /**
   * Execute operation in this context
   *
   * @param operation - Operation to execute
   * @param args - Operation arguments
   * @returns Operation result
   */
  execute(operation: string, ...args: any[]): Bitboard;
}
