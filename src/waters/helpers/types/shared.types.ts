/**
 * @module waters/helpers/types/shared
 * Shared utility types and configurations used across multiple modules.
 *
 * Contains:
 * - Cell and DOM operation types
 * - Configuration objects
 * - Data attribute naming conventions
 * - Zone and tally tracking structures
 */

import type { ZoneSizes } from './geometry.types'
import type { ZoneRecalcCallback } from './callbacks.types'

/**
 * Zone tracker for managing zone size calculations.
 * Tracks metric changes and provides recalculation capability.
 */
export interface ZoneTracker {
  /**
   * Recalculates zone sizes from current map state.
   * Called when map configuration changes.
   *
   * @param map - Optional map object with current grid dimensions
   */
  recalc(map?: unknown): void

  /** Current zone size metrics (total, margin, core) */
  sizes: ZoneSizes

  /** Total size of all zone areas combined */
  totalSize: number
}

/**
 * Zone entry for display in UI.
 * Combines tracker and HTML elements for zone information display.
 */
export interface ZoneEntry {
  /** Zone size tracker for calculations and updates */
  tracker: ZoneTracker

  /** HTML span elements for displaying counts [total, margin, core] */
  counts: HTMLSpanElement[]
}

/**
 * Configuration for weapon box creation and display.
 * Specifies all parameters needed for weapon ammo visualization.
 */
export interface WeaponBoxOptions {
  /** Number of unattached/floating ammo rounds */
  ammoUnattached: number

  /** View model for weapon interactions and events */
  viewModel: unknown

  /** Weapon object with letter and properties */
  weapon: {
    letter: string
    isLimited?: boolean
    classname?: string
  }

  /** Box index within ammo capacity range */
  index: number

  /** Count of ammo rounds already used/fired */
  ammoUsed: number

  /** Color maps with ship colors and letter colors */
  maps: {
    shipColors: Record<string, string>
    shipLetterColors: Record<string, string>
  }

  /** Weapon system with full state */
  weaponSystem: unknown

  /** Parent row element for appending boxes */
  row: HTMLElement
}

/**
 * Cell dataset attribute naming convention.
 * Standardizes data-* attribute keys across cell operations.
 */
export interface CellDataAttributes {
  /** data-r: Row coordinate */
  ROW: string

  /** data-c: Column coordinate */
  COLUMN: string

  /** data-id: Ship/entity identifier */
  ID: string

  /** data-letter: Ship letter identifier */
  LETTER: string

  /** data-sletter: Ship's primary letter (secondary reference) */
  PRIMARY_LETTER: string

  /** data-variant: Ship variant/type indicator */
  VARIANT: string

  /** data-wletter: Weapon letter */
  WEAPON_LETTER: string

  /** data-ammo: Ammo count */
  AMMO: string

  /** data-wid: Weapon system identifier */
  WEAPON_ID: string

  /** data-surround: Surrounding weapon indicator */
  WEAPON_SURROUND: string

  /** data-keyIds: Key identifiers for effects */
  WEAPON_KEY_IDS: string
}

/**
 * Navigation direction constants.
 * Used for keyboard and UI navigation handling.
 */
export interface NavigationDirections {
  /** Move horizontally to the right */
  readonly RIGHT: string

  /** Move vertically downward */
  readonly DOWN: string

  /** Move vertically upward */
  readonly UP: string

  /** Move horizontally to the left */
  readonly LEFT: string
}

/**
 * Game model interface for displacement and zone calculations.
 * Provides access to ships and game state for analysis.
 */
export interface GameModel {
  /** Array of all ships in the current game */
  ships: Array<{
    shape(): { displacement: number; subterrain: unknown }
  }>

  /** Ship loadout configuration */
  loadOut: unknown

  /**
   * Calculates total displaced area for all ships.
   * Used in zone calculations and tightness descriptions.
   */
  calculateDisplacedArea(): number
}

/**
 * Board configuration with CSS property management.
 * Specifies grid layout via CSS custom properties.
 */
export interface CSSGridConfig {
  /** Number of grid columns (--cols property) */
  cols: number

  /** Number of grid rows (--rows property) */
  rows: number

  /** Cell size in CSS units (--boxSize property) */
  boxSize: string
}

/**
 * Container element reference for DOM operations.
 * Typed reference to a container element in the DOM.
 */
export interface Container {
  /** HTML element serving as container */
  element: HTMLElement

  /** Container identifier for reference */
  id?: string

  /** Container type/category */
  type?: string
}

/**
 * Positioned element reference with coordinates.
 * Combines element reference with positional information.
 */
export interface PositionedElement {
  /** HTML element at this position */
  element: HTMLElement

  /** Tray index in parent tray array (0-based) */
  trayIndex: number

  /** Item index within tray (0-based) */
  itemIndex: number
}

/**
 * Range specification for selection or filtering.
 * Defines inclusive bounds for iteration or filtering operations.
 */
export interface Range {
  /** Start value (inclusive) */
  start: number

  /** End value (inclusive) */
  end: number
}

/**
 * Bounding box for rectangular regions.
 * Specifies a 2D rectangular area with opposite corners.
 */
export interface BoundingBox {
  /** Top-left corner row coordinate */
  minRow: number

  /** Top-left corner column coordinate */
  minCol: number

  /** Bottom-right corner row coordinate */
  maxRow: number

  /** Bottom-right corner column coordinate */
  maxCol: number
}
