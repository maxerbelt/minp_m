/**
 * @module waters/types/ui-models
 * UI view models and display element types.
 *
 * Defines types for:
 * - Game model and view model contracts
 * - UI element collections and references
 * - Configuration objects for UI setup
 * - Display state and element caching
 */

import type { Ship, WeaponSystem } from './domain.types'

/**
 * Game model containing game state and configuration.
 * Provides methods for ship and weapon management.
 */
export interface GameModel {
  /** Array of currently placed ships */
  ships: Ship[]

  /** Array of candidate ships available for placement */
  candidateShips: Ship[]

  /** 2D grid representation of ship cell occupancy */
  shipCellGrid: Record<string, any>

  /** Weapon loadout configuration */
  loadOut?: any

  /** Configure and initialize weapons */
  armWeapons?: (map?: any) => void

  /** Check if playable ship configuration exists */
  hasPlayableShips?: () => boolean

  /** Check if ship count is low */
  hasFewShips?: () => boolean

  /** Calculate total displaced area of ships */
  calculateDisplacedArea?: () => number
}

/**
 * View model for display and user interaction.
 * Provides data access for rendering components.
 */
export interface ViewModel {
  /** Ships for display rendering */
  ships?: Ship[]

  /** Weapon systems for display */
  weaponSystems?: WeaponSystem[]

  /** Get grid cell element at coordinates */
  gridCellAt?: (r: number, c: number) => HTMLElement | null

  /** Get cell size in pixels for layout */
  cellSize?: () => number

  /** Additional view state */
  [key: string]: any
}

/**
 * Cached DOM element references for UI elements.
 * Optimizes repeated element access during gameplay.
 */
export interface ElementCache {
  /** Button element references */
  buttons?: Record<string, HTMLButtonElement | null>

  /** Tray container element references */
  trays?: Record<string, HTMLDivElement | null>

  /** Get all tray elements as array */
  getAllTrays?: () => Array<HTMLDivElement | null>

  /** Get tray by unit type code */
  getTrayByType?: (type: string) => HTMLDivElement | null

  /** Main container element */
  container?: HTMLElement | null

  /** Additional cached elements */
  [key: string]: any
}

/**
 * Water game display elements for score and status.
 * References to all UI elements showing game metrics.
 */
export interface WaterDisplayElements {
  /** Element showing shots fired count */
  shots: HTMLElement

  /** Element showing turns taken count */
  turns: HTMLElement

  /** Element showing double-taps count */
  dtaps: HTMLElement

  /** Element showing hits scored */
  hits: HTMLElement

  /** Element showing misses */
  misses: HTMLElement

  /** Element showing sunk ships indicator */
  sunk: HTMLElement

  /** Element showing hints used */
  hints: HTMLElement

  /** Element showing revealed cells */
  reveals: HTMLElement

  /** Element showing ships placed indicator */
  placed: HTMLElement

  /** Element showing weapons placed indicator */
  weaponsPlaced: HTMLElement

  /** Element showing zone information */
  zone: HTMLElement
}

/**
 * Ship statistics for UI display.
 * Aggregated data about a specific ship for tally display.
 */
export interface ShipStats {
  /** Number of hits on this ship */
  hits: number

  /** Whether the ship is sunk (0 or 1) */
  sunk: number

  /** Ship letter identifier */
  letter: string
}

/**
 * Visibility map for UI elements.
 * Tracks which elements should be visible based on game state.
 */
export type VisibilityMap = Array<[HTMLElement | null, boolean]>

/**
 * Cell grid options for drag previews and display.
 * Configuration for how grid cells should be styled.
 */
export interface GridCellOptions {
  /** Background color CSS value */
  bg?: string

  /** Foreground (text) color CSS value */
  fg?: string

  /** Text content to display in cell */
  letter?: string

  /** Whether cell has special styling */
  isSpecial?: boolean

  /** Additional CSS class names to apply */
  classes?: string[]
}

/**
 * Ship information for tray building.
 * Combines shape with display count.
 */
export interface ShipInfo {
  /** Ship shape/form object with board and letter */
  shape: Record<string, any>

  /** Number of ships of this type to display */
  count: number
}

/**
 * Configuration for friendly player UI.
 * Specifies which UI components should be visible/active.
 */
export interface FriendUIConfig {
  /** Text label for the game mode tab */
  tabText?: string

  /** Show ship placement control buttons */
  showPlacingControls?: boolean

  /** Show game mode selection controls */
  showGameControls?: boolean

  /** Show ship selection trays */
  showShipTrays?: boolean

  /** Show ship transformation buttons (rotate, flip) */
  showTransformBtns?: boolean

  /** Show game tips text */
  showTips?: boolean

  /** Show game status display */
  showStatus?: boolean

  /** Use standard UI panel layout */
  standardPanels?: boolean

  /** Clear board cell states during setup */
  clearBoardCells?: boolean

  /** Add alternate panel styling */
  addAltPanels?: boolean
}

/**
 * Score label visibility configuration.
 * Controls which score metrics are displayed in UI.
 */
export interface ScoreLabelVisibility {
  /** Show ships placed count label */
  placed: boolean

  /** Show shots fired count label */
  shots: boolean

  /** Show successful hits count label */
  hits: boolean

  /** Show sunk ships count label */
  sunk: boolean

  /** Show revealed cells count label */
  reveals: boolean

  /** Show hints used count label */
  hints: boolean
}

/**
 * Weapon box configuration for ammo display.
 * Specifies parameters for weapon ammo visualization.
 */
export interface WeaponBoxOptions {
  /** Number of unattached/floating ammo rounds */
  ammoUnattached: number

  /** View model for interactions */
  viewModel: ViewModel

  /** Weapon object with letter and properties */
  weapon: {
    letter: string
    isLimited?: boolean
    classname?: string
  }

  /** Box index within capacity range */
  index: number

  /** Count of ammo already used */
  ammoUsed: number

  /** Color maps for rendering */
  maps: {
    shipColors: Record<string, string>
    shipLetterColors: Record<string, string>
  }

  /** Weapon system with full state */
  weaponSystem: WeaponSystem

  /** Parent row element for appending */
  row: HTMLElement
}

/**
 * UI element IDs mapping for button references.
 * Maps button names to their DOM element IDs.
 */
export interface ElementCacheIDs {
  /** Map of button names to DOM IDs */
  buttons: Record<string, string>

  /** Map of tray names to DOM IDs */
  trays: Record<string, string>

  /** Map of other elements to DOM IDs */
  [key: string]: any
}
