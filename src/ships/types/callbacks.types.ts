/**
 * @file callbacks.types.ts - Callback signatures and factory function types
 * @description Reusable callback types for validators, builders, and factories
 */

/**
 * Validation function for sub-shape placement constraints
 * Called during grid placement to verify that a sub-shape meets terrain requirements
 */
export type SubShapeValidator = (...args: any[]) => any;

/**
 * Factory function for creating ammunition payload at weapon racks
 * Called once per rack position to generate ammunition for that weapon
 * @returns Ammunition payload object (structure depends on weapon type)
 */
export type AmmoBuilder = () => any;

/**
 * Callback for filtering placements or variants
 */
export type PlacementFilter = (placement: any) => boolean;

/**
 * Callback for processing board expansion or transformation
 */
export type BoardExpander = (width: number, height: number) => void;

/**
 * Generic callback for board operations
 */
export type BoardCallback = (board: any) => any;

/**
 * Callback for dimension/metric calculations
 */
export type MetricCalculator = () => number;

/**
 * Callback for hit animation or detonation effects
 */
export type AnimationCallback = (cell: any, cellSize: number) => void;

/**
 * Callback for state reset operations
 */
export type ResetCallback = () => void;

/**
 * Callback for ammunition checks
 */
export type AmmoChecker = (row: number, col: number) => boolean;
