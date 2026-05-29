/**
 * Event and callback types for the selection system.
 * Defines callback signatures for drag operations, placement, and ship management.
 */

import type { PlacedShip } from './domain.types';

/**
 * Callback invoked when a ship is marked on the grid.
 * Used for updating visual display after placement or refresh.
 */
export type MarkCallback = (ship: PlacedShip) => void;

/**
 * Callback invoked when a ship is removed and needs to be returned/restored.
 * Used for undo/reset operations and ship restoration to tray.
 */
export type ReturnShipCallback = (ship: PlacedShip) => void;

/**
 * Result returned from ship transformation operations (rotate, flip).
 * Captures the result of variant-changing operations.
 */
export interface TransformResult {
  /** Transformation operation status/result data */
  [key: string]: unknown;
}

/**
 * Drag start event data for ship drag operations.
 * Contains initial position and reference information.
 */
export interface DragStartData {
  /** Source element being dragged */
  source: HTMLElement;
  /** Initial drag offset in pixels */
  dragOffsetX: number;
  dragOffsetY: number;
  /** Grid cell size in pixels */
  cellSize: number;
}

/**
 * Drop target validation result.
 * Indicates whether a drop is valid at the target location.
 */
export interface DropValidation {
  /** Whether the drop is valid */
  valid: boolean;
  /** Reason if drop is invalid */
  reason?: string;
  /** Suggested cell coordinates if not at exact position */
  suggestedCell?: [number, number];
}

/**
 * Placement confirmation data.
 * Sent when a ship is successfully placed on the board.
 */
export interface PlacementConfirm {
  /** Placed ship cells [row, col] pairs */
  cells: Array<[number, number]>;
  /** Ship identifier */
  shipId: string | number;
  /** Placed ship reference */
  ship: PlacedShip;
}
