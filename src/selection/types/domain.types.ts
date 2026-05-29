/**
 * Core domain types for ship selection and placement system.
 * Defines fundamental interfaces for ships, boards, variants, and placement.
 */

/**
 * Board configuration containing terrain and ship placement data.
 * Represents the state of the game board for rendering and validation.
 */
export interface Board {
  /** Generator function yielding occupied cell coordinates [row, col] */
  occupiedLocations(): Generator<[number, number]>;
  /** Count of occupied cells in the board */
  occupancy: number;
  /** Bitboard representation of occupied cells for efficient operations */
  bits: bigint;
  /** 2D grid of terrain values indicating placement type (water, land, etc.) */
  terrain?: Array<Array<number>>;
  /** Optional board variant identifier for styling/rendering purposes */
  variant?: string;
  /** Optional board configuration metadata for rendering context */
  config?: Record<string, unknown>;
}

/**
 * Variant manager controlling ship rotation, flipping, and transformation.
 * Delegates variant operations to the underlying shape variant system.
 */
export interface Variants {
  /** Get board representation for current variant */
  boardFor(): Board;
  /** Current variant index (0-based) */
  index: number;
  /** Optional callback fired when variant changes */
  onChange?: () => void;
  /** Rotate variant clockwise */
  rotate(): void;
  /** Rotate variant counter-clockwise */
  leftRotate(): void;
  /** Flip variant horizontally */
  flip(): void;
  /** Advance to next transformation form */
  nextForm(): void;
  /** Whether current variant supports rotation */
  canRotate: boolean;
  /** Whether current variant supports flipping */
  canFlip: boolean;
  /** Whether current variant supports form transformation */
  canTransform: boolean;
  /** Get current variant object */
  variant(): object;
  /** Get placeable interface for placement validation */
  placeable(): Placeable;
}

/**
 * Placeable interface for validation and placement at coordinates.
 * Defines contract for checking placement validity and getting reasons for failure.
 */
export interface Placeable {
  /** Validates if placement is possible at given grid coordinates */
  canPlace(shipCellGrid: ShipCellGrid): boolean;
  /** Places entity at given coordinates, returns placement data or null */
  placeAt(x: number, y: number): object | null;
  /** Returns reason string describing why placement is invalid */
  cantPlaceReason(): string;
}

/**
 * Ship object representing a game ship with placement and shape information.
 * Provides access to ship properties for drag operations and grid placement.
 */
export interface Ship {
  /** Unique ship identifier used for tracking in placement operations */
  id: string | number;
  /** Single character label for display (A, B, C, etc.) */
  letter: string;
  /** Returns shape object containing ship geometry and transformation info */
  shape(): Shape;
  /** Returns current placeable interface for placement validation */
  placeable(): Placeable;
  /** Whether ship rotation is possible for current shape variant */
  canRotate(): boolean;
  /** Whether ship transformation to next form is possible */
  canTransform(): boolean;
  /** Current occupied cells [row, col] pairs */
  cells?: Array<[number, number]>;
  /** Places ship at [x, y] position */
  placeAt(x: number, y: number): void;
  /** Adds ship representation to grid */
  addToGrid(shipCellGrid: ShipCellGrid): void;
  /** Places ship at specific cells */
  placeAtCells(cells: Array<[number, number]>): Array<[number, number]>;
  /** Removes ship from placement state */
  removeFromPlacement(): void;
  /** Places ship on grid at given position */
  placeOnGrid(x: number, y: number): void;
}

/**
 * Shape object containing variant manager and ship geometry information.
 */
export interface Shape {
  /** Variant manager for current shape */
  variants(): Variants;
  /** Shape type identifier (e.g., "rect", "hex") */
  type(): string;
}

/**
 * Ship cell grid tracking occupancy of placed ships.
 * Stores grid information with cells and occupancy metadata.
 */
export interface ShipCellGrid {
  /** Arbitrary grid metadata used during refresh operations */
  [grid: string]: unknown;
  /** Grid structure containing ship cell data */
  occupancy?: number;
}

/**
 * Placed ship interface for undo/reset functionality.
 * Represents a ship that has been placed on the board.
 */
export interface PlacedShip {
  /** Places the ship at the given cells */
  placeAtCells(cells: Array<[number, number]>): Array<[number, number]>;
  /** Removes the ship from placement state */
  removeFromPlacement(): void;
  /** Adds the ship back onto the grid */
  addToGrid(shipCellGrid: ShipCellGrid): void;
}
