/**
 * @fileoverview Callback and function signature type definitions for the variants system.
 * Centralizes all function type definitions used across placement, validation, and variant management.
 * Exported for use in JSDoc @callback and @typedef annotations across the variants folder.
 */

import type { ZoneInfo } from './placement.types'

/**
 * Bounds checker callback - validates if a single cell position is within bounds.
 * Used to check whether a coordinate falls within the grid's valid bounds.
 *
 * @callback BoundsChecker
 * @param {number} y - The row coordinate (0-indexed from top)
 * @param {number} x - The column coordinate (0-indexed from left)
 * @returns {boolean} True if the position is within bounds, false otherwise
 */
export type BoundsChecker = (y: number, x: number) => boolean

/**
 * Area bounds checker callback - checks if an entire area is within bounds.
 * Validates whether an entire rectangular area (height × width) starting at (y, x) is within bounds.
 * Used to ensure placements don't exceed grid boundaries.
 *
 * @callback AreaBoundsChecker
 * @param {number} y - The top-left row coordinate
 * @param {number} x - The top-left column coordinate
 * @param {number} [h=1] - The height of the area to check
 * @param {number} [w=1] - The width of the area to check
 * @returns {boolean} True if the entire area is within bounds, false otherwise
 */
export type AreaBoundsChecker = (y: number, x: number, h?: number, w?: number) => boolean

/**
 * Zone info getter callback - retrieves zone information for a position.
 * Gets zone metadata for a specific grid position with optional detail level.
 * Returns ZoneInfo object containing terrain, zone, and other placement constraints.
 *
 * @callback ZoneInfoGetter
 * @param {number} x - The column coordinate (0-indexed from left)
 * @param {number} y - The row coordinate (0-indexed from top)
 * @param {number} [zoneDetail] - Optional detail level for zone information
 * @returns {ZoneInfo} Zone information object for the specified position
 */
export type ZoneInfoGetter = (x: number, y: number, zoneDetail?: number) => ZoneInfo

/**
 * Placement validator callback - validates zone information during placement operations.
 * Determines whether cells can be placed in specific zones by evaluating zone metadata.
 * Receives ZoneInfo and returns true if zone is valid for placement, false if rejected.
 * Used to implement custom zone-based placement constraints (e.g., water-only, terrain restrictions).
 *
 * @callback PlacementValidator
 * @param {ZoneInfo} zoneInfo - Zone information to validate
 * @returns {boolean} True if zone is valid for placement, false if placement should be rejected
 */
export type PlacementValidator = (zoneInfo: ZoneInfo) => boolean

/**
 * Variant transition function - maps variant index to another variant index.
 * Used to implement rotation, flipping, and other transformations on variants.
 * Maps current variant index to the index of the transformed variant.
 *
 * @callback VariantTransitionFn
 * @param {number} index - Current variant index
 * @returns {number} Index of the transformed variant
 */
export type VariantTransitionFn = (index: number) => number

/**
 * Change event callback - notified when a variant or placement changes.
 * Called to notify observers of changes in variant state or configuration.
 * Useful for UI updates and cascading state updates.
 *
 * @callback OnChangeCallback
 * @returns {void}
 */
export type OnChangeCallback = () => void
