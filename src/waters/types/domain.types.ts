/**
 * @module waters/types/domain
 * Core game domain types for ships, weapons, scoring, and board state.
 *
 * Defines the fundamental entities used across the game:
 * - Weapon systems with ammo tracking
 * - Ship objects with placement and damage state
 * - Board reference with cell operations
 * - Score tracking for game progress
 * - Map configuration and terrain
 */


/**
 * Weapon object with firing and display properties.
 * Represents a weapon type available in the game.
 * May be used in weapon systems, tally displays, or weapon buttons.
 */
export interface Weapon {
  /** Single character weapon identifier (e.g., 'M', 'R', 'T', 'B', '-') */
  letter: string

  /** Human-readable weapon display name */
  name?: string

  /** Whether weapon has limited ammo capacity (vs unlimited) */
  isLimited?: boolean

  /** CSS class name for styling weapon elements */
  classname?: string

  /** Cursor style class when weapon is active/launching */
  launchCursor?: string

  /** Tag identifier for weapon categorization and filtering */
  tag?: string

  /** Array of cursor class names for different weapon modes */
  cursors?: string[]

  /** Whether weapon displays shadow after selection */
  postSelectShadow?: boolean

  /** Number of additional coordinates needed after post-selection */
  postSelectCoords?: number

  /** Optional callback to play warning sound */
  playWarnSound?: () => void

  /** Launch method for firing weapon */
  launchTo?: (r: number, c: number) => any

  /** Get splash/area-of-effect coordinates */
  splash?: () => any

  /** Get crash splash coordinates */
  crashSplash?: () => any

  /** Animate explosion/splash effect */
  animateSplashExplode?: (element: HTMLElement, r: number, c: number) => any
}

/**
 * Weapon slot at a specific grid position on a ship.
 * Represents armed weapons available at a cell location.
 */
export interface WeaponSlot {
  /** The weapon object */
  weapon: Weapon

  /** Current ammo count in this slot */
  ammo: number

  /** Unique identifier for this weapon slot */
  id: string | number
}

/**
 * Weapon system with full state tracking.
 * Represents a complete weapon configuration with ammo and status.
 */
export interface WeaponSystem {
  /** The weapon object */
  weapon: Weapon

  /** Unique identifier for this weapon system */
  id?: string | number

  /** Whether this weapon has hit a target this turn */
  hit?: boolean

  /** Whether this weapon is damaged/non-functional */
  damaged?: boolean

  /** Current ammo count */
  ammo?: number

  /** Returns the maximum ammo capacity */
  ammoCapacity?: number

  /** Returns the amount of ammo already used */
  ammoUsed?:  number

  /** Returns the count of unattached ammo rounds */
  ammoUnattached?:  number

  /** Returns array of leaf weapons (for hierarchies) */
  leafWeapons?:  Weapon[]

  /** Check if weapon has remaining ammo */
  hasAmmoRemaining?: boolean
}

/**
 * Weapon rack on a ship with weapon reference.
 * Lightweight reference to a weapon attachment point.
 */
export interface WeaponRack {
  /** The weapon object */
  weapon?: Weapon

  /** Rack or weapon ID */
  id?: number

  /** Ammunition count */
  ammo?: number
}

/**
 * Ship object with placement, weapons, and game state.
 * Core entity representing a player's ship unit.
 */
export interface Ship {
  /** Unique identifier for this ship */
  id?: string | number

  /** Ship type letter (e.g., 'A' for Plane, 'S' for Ship, 'M' for Missile) */
  letter?: string

  /** Ship variant index (0-based) for visual differentiation */
  variant?: number

  /** Whether ship has been sunk */
  sunk?: boolean

  /** Whether ship has attached weapons */
  hasWeapon?: boolean

  /** Grid cells occupied by this ship as [r, c] pairs */
  cells?: Array<[number, number]>

  /** Get shape configuration for this ship */
  shape?: () => any

  /** Get primary weapon system */
  getPrimaryWeapon?: () => Weapon | null | undefined

  /** Get weapon by system ID */
  getWeaponBySystemId?: (id: string | number) => Weapon | undefined

  /** Get all weapons on ship */
  getAllWeapons?: () => Weapon[]

  /** Get loaded weapons */
  get loadedWeapons?:   Weapon[]

  /** Get first loaded weapon */
  getFirstLoadedWeapon?: () => Weapon | undefined

  /** Check if ship has ammo remaining */
  hasAmmoRemaining?:  boolean

  /** Reset ship to initial state */
  reset?: () => void
}

/**
 * Board reference with cell operations and state management.
 * Main interface to the game board UI and logic.
 * Circular ref note: Board operations are extensive; not all listed here.
 */
export interface Board {
  /** Main game board DOM element */
  board: HTMLElement

  /** CSS class list for board element */
  classList: DOMTokenList

  /** Child cell elements collection */
  children: HTMLCollection

  /** Get cell element at coordinates */
  gridCellAt: (r: number, c: number) => HTMLElement | null

  /** Mark cell as hit */
  cellHit?: (r: number, c: number, letter?: string) => void

  /** Mark cell as miss */
  cellMiss?: (r: number, c: number) => void

  /** Mark ammo usage at cell */
  cellUseAmmo?: (r: number, c: number) => void

  /** Reveal cell via hint */
  cellHintReveal?: (r: number, c: number) => void

  /** Semi-reveal cell (partial info) */
  cellSemiReveal?: (x: number, y: number) => void

  /** Mark cell as sunk with ship letter */
  cellSunkAt?: (r: number, c: number, letter: string) => void

  /** Get cell size in pixels */
  cellSize?: () => number

  /** Mark ship as placed */
  markPlaced?: (cells: any, ship: Ship) => void

  /** Callback when fleet placed */
  onFleetPlaced?: () => void

  /** Display placement tally */
  placeTally?: (count: number) => void

  /** Display ship information */
  displayShipInfo?: (ship: Ship) => void

  /** Reveal ships on board */
  revealShips?: (ships: Ship[]) => void

  /** Clear visual elements */
  clearVisuals?: () => void

  /** Clear placement visuals */
  clearPlaceVisuals?: () => void

  /** Get surrounding cells */
  surroundCells?: (mask: any) => any

  /** Get surrounding cell elements */
  surroundCellElement?: () => HTMLElement[]

  /** Display fleet sunk message */
  displayFleetSunk?: () => void

  /** Display surrounding cells effect */
  displaySurround?: (r: number, c: number) => void

  /** Deactivate temporary hints */
  deactivateTempHints?: () => void

  /** Deactivate weapons display */
  deactivateWeapons?: () => void

  /** Score display object */
  score?: any

  /** Weapon button elements */
  weaponBtns?: any

  /** Tray manager for ships */
  trayManager?: any

  /** Weapon activation for cell */
  cellWeaponActive?: (r: number, c: number, rotation?: string, extra?: string) => void

  /** Deactivate weapon at cell */
  cellWeaponDeactivate?: (r: number, c: number, force?: boolean) => void

  /** Deactivate hint at cell */
  cellHintDeactivate?: (r: number, c: number) => void

  /** Remove area-of-effect highlight */
  removeHighlightAoE?: () => void

  /** Enable all control buttons */
  enableBtns?: () => void

  /** Disable all control buttons */
  disableBtns?: () => void
}

/**
 * Map configuration with terrain and fleet information.
 * Represents a game map instance with dimensions and resources.
 */
export interface MapType {
  /** Map identifier and display title */
  title: string

  /** Number of rows on this map */
  rows?: number

  /** Number of columns on this map */
  cols?: number

  /** Initial fleet configuration for map */
  newFleetForMap?: Ship[]

  /** Extra armed ships configuration */
  extraArmedFleetForMap?: Ship[]

  /** Weapons available on this map */
  weapons?: Weapon[]

  /** Example ship placement reference */
  example?: any

  /** Check if coordinates are in bounds */
  inBounds: (r: number, c: number) => boolean

  /** Land terrain mask */
  landMask?: () => any

  /** Blank/empty mask for map */
  blankMask?: () => any

  /** Full playable area mask */
  fullMask?: () => any
}

/**
 * Score tracking object for game progression.
 * Manages turn count, shot history, and game metrics.
 */
export interface Score {
  /** Current turn number */
  turns?: number

  /** Double-tap counter */
  dtaps?: number

  /** Check if shot location is new/unshot */
  newShotKey: (r: number, c: number) => boolean | null

  /** Finish current turn and advance counter */
  finishTurn: () => void

  /** Reset score to initial state */
  reset: () => void

  /** Mask of all shot locations */
  shot?: any

  /** Mask of revealed locations */
  reveal?: any

  /** Mask of hinted locations */
  hint?: any

  /** Mask of wake effects */
  wake?: any

  /** Mask of automatic misses */
  auto?: any

  /** Get occupancy count of automatic misses */
  autoMisses?: number
}

/**
 * Ship shape definition with displacement and terrain properties.
 * Used in displacement calculations and terrain analysis.
 */
export interface ShipShape {
  /** Total displacement/area in grid cells */
  displacement: number

  /** Primary terrain type this shape occupies */
  subterrain?: any

  /** Calculate displacement for specific subterrain */
  displacementFor?: (subterrain: any) => number

  /** Ship letter identifier */
  letter?: string

  /** Weapon system configuration */
  weaponSystem?: any

  /** Tally group identifier */
  tallyGroup?: string
}

/**
 * Bitmask object with occupancy and morphological operations.
 * Used for efficient cell marking and area calculations.
 */
export interface Bitmask {
  /** Number of occupied cells in this bitmask */
  occupancy: number

  /** Test if cell is set */
  test?: (x: number, y: number) => boolean

  /** Set cell in mask */
  set?: (x: number, y: number) => void

  /** Clear cell from mask */
  clear?: (x: number, y: number) => void

  /** Get intersection with another bitmask */
  take?: (other: Bitmask) => Bitmask

  /** Clone this bitmask */
  clone?: () => Bitmask

  /** Dilate by n cells */
  dilate?: (n: number) => Bitmask

  /** Dilate in orthogonal cross pattern */
  dilateCross?: (n: number) => Bitmask

  /** Union with another bitmask */
  join?: (other: Bitmask) => Bitmask

  /** Convert occupied cells to coordinates */
  toCoords?: () => GridCoordinate[]

  /** ASCII representation for debugging */
  toAscii?: string

  /** Get single random occupied cell */
  randomOccupied?: () => [number, number]
}

import type { GridCoordinate } from './coordinates.types'
