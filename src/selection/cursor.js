/**
 * @import type { CursorState } from './types/cursor.types.js';
 */

/**
 * Global cursor state object tracking cursor position and interaction state.
 * Maintains the current cursor coordinates and flags for grid interaction and drag operations.
 *
 * @type {CursorState}
 * @const
 */
export const cursor = {
  /** @type {boolean} Whether the cursor is over a grid element */
  isGrid: false,

  /** @type {boolean} Whether the cursor is currently dragging */
  isDragging: false,

  /** @type {number} The x-coordinate of the cursor position */
  x: 0,

  /** @type {number} The y-coordinate of the cursor position */
  y: 0
}
