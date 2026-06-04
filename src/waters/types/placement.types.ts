/**
 * @module waters/types/placement
 * Types for ship placement UI and interaction.
 *
 * Defines types for:
 * - Placement UI interface
 * - Ship and terrain placement configuration
 * - Custom map data structures
 */

import type { Ship, Board, WeaponSystem, Weapon } from './domain.types'
import type { GameModel  } from './ui-models.types'

/**
 * Placement UI interface for managing ship placement interactions.
 * Provides methods for cursor movement and ship assignment.
 */
export interface PlacementUI {
  /** The game board element and operations */
  board: Board

  /** Cursor movement handler for cell navigation */
  moveCursor?: (shipCellGrid: any, ships: Ship[]) => void

  /** Cell selection handler for placement */
  selectCell?: (r: number, c: number) => void

  /** Update placement visualization display */
  updateDisplay?: () => void

  /** Assign ship to current cursor position */
  assignShip?: (ship: Ship) => void

  /** Initialize placement UI state */
  initializePlacement?: () => void

  /** Clear map and refresh display */
  clearMapAndRefresh?: () => void

  /** Display ship tracking information */
  displayShipTrackingInfo?: (custom?: any) => void

  /** Show user-facing notice/message */
  showNotice?: (message: string) => void

  /** Remove all placed ships from UI */
  removeAllPlacedShips?: (custom?: any) => void

  /** Mark ship cells as placed */
  markPlaced?: (cells: Array<[number, number]>, ship: Ship) => void

  /** Remove ship from visual display */
  subtraction?: (custom: any, ship: Ship) => void

  /** Reset add mode state */
  resetAdd?: () => void

  /** Whether in ship placement mode */
  placingShips?: boolean

  /** Clear visual elements */
  clearVisuals?: () => void
}

/**
 * Custom UI interface for custom game mode.
 * Extends placement UI with custom-specific features.
 */
export interface CustomUI extends PlacementUI {
  /** Tray manager for weapon and ship selection */
  trayManager?: any

  /** Additional tray operations */
  [key: string]: any
}

/**
 * Custom map data structure.
 * Complete configuration for a custom-created game map.
 */
export interface CustomMapData {
  /** Number of rows in the map grid */
  rows: number

  /** Number of columns in the map grid */
  cols: number

  /** Display title of the map */
  title: string

  /** Ship count configuration defining fleet composition */
  shipNum?: Record<string, number>

  /** Array of land cell coordinates as strings (e.g., ['1,1', '2,2']) */
  land: string[]

  /** Weapons available on this map during gameplay */
  weapons: Weapon[]

  /** Terrain type identifier (e.g., 'sea', 'space', 'asteroid') */
  terrain: string
}

/**
 * Ship shape definition for placement UI.
 * Describes a ship's visual and functional properties.
 */
export interface ShipShapeForPlacement {
  /** Symmetry type of ship */
  symmetry?: string

  /** Ship letter identifier */
  letter: string

  /** Weapon system configuration */
  weaponSystem?: WeaponSystem

  /** Tally group identifier */
  tallyGroup?: string

  /** Get available placement variants */
  placeables?: (filter?: (s: any) => boolean) => ShipShapeForPlacement[]

  /** Calculate cells for placement */
  placeCells?: (variant: number, r: number, c: number) => Array<[number, number]>
}

/**
 * Weapon configuration for placement phase.
 * Represents a weapon available for placement on the map.
 */
export interface PlacementWeapon {
  /** Single-character weapon tag identifier */
  tag: string

  /** Single-character weapon letter */
  letter: string

  /** Human-readable weapon name */
  name: string

  /** Splash damage power level (0-3) */
  splashPower: number

  /** Splash coordinate mappings [x, y, value] */
  splashCoords: Array<[number, number, number]>

  /** Crash coordinate mappings (optional) */
  crashCoords?: Array<[number, number, number]>
}

/**
 * Game model for placement phase.
 * Extended game model with placement-specific properties.
 */
export interface PlacementGameModel extends GameModel {
  /** Current terrain configuration */
  terrain?: any

  /** Placement state tracking */
  placementState?: Record<string, any>

  /** Candidate ships available for placement */
  candidateShips: Ship[]

  /** Grid representation of ship cells */
  shipCellGrid: Record<string, any>
}

/**
 * Placement UI callback signatures.
 * Function contracts for placement event handling.
 */
export namespace PlacementCallbacks {
  /**
   * Callback for ship placed event.
   * @param ship - The ship that was placed
   * @param cells - Grid cells occupied by the ship
   */
  export type OnShipPlaced = (ship: Ship, cells: Array<[number, number]>) => void

  /**
   * Callback for ship removed event.
   * @param ship - The ship that was removed
   */
  export type OnShipRemoved = (ship: Ship) => void

  /**
   * Callback for placement completed.
   * @param ships - Array of all placed ships
   */
  export type OnPlacementComplete = (ships: Ship[]) => void

  /**
   * Callback for placement reset/cleared.
   */
  export type OnPlacementClear = () => void
}
