/**
 * Ship and Placement Types
 * 
 * Defines types for ship representation, placement, and grid management
 * in the battle grid system (BattleHide/BattleSeek game modes).
 */

import type { Coordinate } from './geometry.types'

/**
 * Individual ship cell with identification and optional metadata.
 * 
 * Represents a single occupied cell in a ship, storing ship ID and optionally
 * weapon/ammo data for display in the UI.
 * 
 * @example
 * const shipCell: ShipCell = {
 *   id: 42,
 *   letter: 'A',
 *   dataset: { ammo: 3, wletter: 'M' }
 * };
 */
export interface ShipCell {
  /** Unique ship identifier (positive integer) */
  id: number;
  
  /** Optional ship letter or label for UI display */
  letter?: string;
  
  /** Optional dataset with UI-specific values */
  dataset?: {
    /** Weapon ammo count */
    ammo?: number;
    
    /** Weapon letter identifier */
    wletter?: string;
    
    /** Additional UI metadata */
    [key: string]: any;
  };
  
  /** Additional properties */
  [key: string]: any;
}

/**
 * Ship cell entry - cell reference or empty cell.
 * 
 * Represents a cell in the ship grid that may be empty (null) or contain a ship cell.
 */
export type ShipCellEntry = ShipCell | null;

/**
 * Single row of ship cells in the grid.
 * 
 * Array of ship cell entries (cells or nulls) representing one row.
 */
export type ShipCellRow = ShipCellEntry[];

/**
 * Complete 2D grid of ship cells.
 * 
 * 2D array (array of rows) representing the entire ship placement grid.
 * Each cell is either a ShipCell (occupied) or null (empty).
 */
export type ShipCellGridData = ShipCellRow[];

/**
 * Ship representation with identifier and operations.
 * 
 * Interface for ship objects that can be placed on the grid.
 * Ships have identities, shapes, and placement capabilities.
 */
export interface Ship {
  /** Unique ship identifier (letter, name, or ID) */
  letter: string;
  
  /** Unique numeric identifier for the ship */
  id?: number;
  
  /**
   * Returns shape information for the ship.
   * 
   * @returns ShapeInfo object with placement variants
   */
  shape: () => ShapeInfo;
  
  /**
   * Places ship cells on grid at given position.
   * 
   * @param grid - Target grid to place on
   * @param x - X coordinate for placement
   * @param y - Y coordinate for placement
   * @param variant - Optional variant/rotation index
   */
  placeOnGrid: (grid: ShipCellGridData, x: number, y: number, variant?: number) => void;
}

/**
 * Single ship placement on the grid.
 * 
 * Result of placing a ship at specific coordinates, containing board representation.
 */
export interface Placement {
  /**
   * Board bitboard representation of this placement.
   * Includes method for detecting overlaps with other placements.
   */
  board: {
    /**
     * Detects if this placement overlaps with another placement.
     * 
     * @param other - Other placement to check
     * @returns True if placements overlap
     */
    overlap: (other: Placement) => boolean;
    
    /** Additional board properties/methods */
    [key: string]: any;
  };
  
  /** Ship that was placed */
  ship?: Ship;
  
  /** Position where ship was placed */
  position?: Coordinate;
  
  /** Which variant/rotation was used */
  variant?: number;
}

/**
 * Placeable variant of a ship.
 * 
 * Represents a specific rotated or flipped version of a ship that can be placed.
 */
export interface Placeable {
  /**
   * Places this variant at given coordinates.
   * 
   * @param x - X coordinate for placement
   * @param y - Y coordinate for placement
   * @returns Placement result with board representation
   */
  placeAt: (x: number, y: number) => Placement;
  
  /** Shape this placeable represents */
  shape?: any;
  
  /** Rotation/variant index */
  variant?: number;
}

/**
 * Shape information for a ship.
 * 
 * Contains bounding box information and all rotated/flipped variants.
 */
export interface ShapeInfo {
  /** Minimum bounding box size required (max of width and height) */
  minSize: number;
  
  /**
   * Returns array of placeable variants (rotations/flips).
   * 
   * @param gridWidth - Target grid width
   * @param gridHeight - Target grid height
   * @returns Array of placeable variants
   */
  placeables: (gridWidth: number, gridHeight: number) => Placeable[];
  
  /** Width of this ship shape in cells */
  width?: number;
  
  /** Height of this ship shape in cells */
  height?: number;
  
  /** Occupied cell coordinates relative to (0, 0) */
  cells?: Coordinate[];
  
  /** Symmetry properties (how many rotations/flips produce identical shapes) */
  symmetry?: {
    rotations: number;
    flips: boolean;
  };
}

/**
 * Ship placement attempt result.
 * 
 * Outcome of trying to place a ship on the grid at specific coordinates.
 */
export interface PlacementAttempt {
  /** Whether placement was successful */
  success: boolean;
  
  /** Placement result if successful */
  placement?: Placement;
  
  /** Error message if placement failed */
  error?: string;
  
  /** Reason for failure (conflict, out of bounds, etc) */
  reason?: 'CONFLICT' | 'OUT_OF_BOUNDS' | 'INVALID_VARIANT' | 'INVALID_POSITION';
}

/**
 * Fleet configuration - set of ships to place on grid.
 * 
 * Defines a fleet with ship types and quantities.
 */
export interface FleetConfiguration {
  /** Map of ship type to count */
  ships: Record<string, number>;
  
  /** Total cells to be occupied by all ships */
  totalCells: number;
  
  /** Grid dimensions for which this fleet is sized */
  gridDimensions: {
    width: number;
    height: number;
  };
}

/**
 * Fleet placement result.
 * 
 * Complete placement of all ships in a fleet on the grid.
 */
export interface FleetPlacement {
  /** Grid containing all placed ships */
  grid: ShipCellGridData;
  
  /** Array of individual ship placements */
  placements: Placement[];
  
  /** Total cells occupied */
  cellsOccupied: number;
  
  /** Whether all ships were placed successfully */
  isComplete: boolean;
}

/**
 * Random placement configuration.
 * 
 * Options for automatic/random ship placement algorithms.
 */
export interface RandomPlacementOptions {
  /** Maximum attempts before giving up */
  maxAttempts?: number;
  
  /** Whether to allow ships to touch edges */
  allowEdgeTouching?: boolean;
  
  /** Whether to allow diagonal adjacency */
  allowDiagonalAdjacency?: boolean;
  
  /** Seed for random number generator (for reproducibility) */
  seed?: number;
  
  /** Whether to rotate ships randomly */
  allowRotations?: boolean;
  
  /** Whether to flip ships randomly */
  allowFlips?: boolean;
}
