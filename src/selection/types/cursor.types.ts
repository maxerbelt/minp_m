/**
 * Cursor types for tracking cursor position and state.
 * Global cursor state management for the selection system.
 */

/**
 * Global cursor state tracking position and interaction flags.
 * Maintains the current cursor coordinates and interaction state.
 */
export interface CursorState {
  /** Whether the cursor is over a grid element */
  isGrid: boolean;
  /** Whether the cursor is currently dragging */
  isDragging: boolean;
  /** The x-coordinate of the cursor position */
  x: number;
  /** The y-coordinate of the cursor position */
  y: number;
}
