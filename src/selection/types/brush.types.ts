/**
 * Brush types for terrain selection and manipulation.
 * Defines brush configuration and behavior.
 */

/**
 * Brush object for terrain selection and painting.
 * Combines a size parameter with a subterrain type for terrain operations.
 */
export interface BrushObject {
  /** The size of the brush (e.g., radius or area measurement) */
  size: number;
  /** The subterrain type or configuration associated with this brush */
  subterrain: unknown;
}

/**
 * Brush state during a painting operation.
 * Tracks active brush configuration and interaction state.
 */
export interface BrushState {
  /** Current brush size */
  size: number;
  /** Current subterrain being painted */
  subterrain: unknown;
  /** Whether brush is currently active */
  isActive: boolean;
  /** Last position where brush was applied */
  lastPosition?: [number, number];
}
