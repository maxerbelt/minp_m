/**
 * @module waters/helpers/types/css
 * CSS class and styling configuration types.
 *
 * Shared CSS class registries and style configurations:
 * - Cell state class mappings (hits, sinks, placements)
 * - UI element class definitions
 * - Default styling values
 * - CSS class group organization
 */

/**
 * Group of related CSS class definitions.
 * Maps semantic property names to actual CSS class names.
 *
 * Used to organize and reference CSS classes by category,
 * reducing duplication and providing a single source of truth.
 *
 * @example
 * ```
 * const displayClasses: CellClassGroup = {
 *   hit: 'hit',
 *   miss: 'miss',
 *   friendlyHit: 'frd-hit'
 * }
 * ```
 */
export type CellClassGroup = Record<string, string>

/**
 * Registry of all CSS class groups organized by category.
 * Single source of truth for all CSS classes used in cells and UI.
 *
 * Groups are organized by functional category for easy management
 * and lookup of related class sets.
 */
export interface CellClassGroups {
  /** Visual state indicators (hit, miss, semi, wake, placed, sunk) */
  display: CellClassGroup

  /** Weapon placement and targeting states */
  weapon: CellClassGroup

  /** Weapon status indicators (hit, damaged, etc.) */
  weaponStatus: CellClassGroup

  /** Damage type indicators (burnt, damaged, skull) */
  damage: CellClassGroup

  /** Ship placement phase states */
  placement: CellClassGroup

  /** Board edge and terrain types (land, sea, light, dark) */
  edge: CellClassGroup

  /** User hint indicators for suggested locations */
  hint: CellClassGroup

  /** Ship rotation/orientation states (turn2, turn3, turn4) */
  orientation: CellClassGroup

  /** Animated state indicators (marker, portal) */
  animation: CellClassGroup
}

/**
 * Configuration for applying hit state to a cell.
 * Specifies display class and optional damage type.
 */
export interface HitStateCellConfig {
  /** CSS class indicating cell state (e.g., 'hit', 'frd-hit', 'enm-hit') */
  displayClass: string

  /** Optional damage type indicator (e.g., 'burnt', 'damaged', 'skull') */
  damageType?: string | null
}

/**
 * CSS class configuration for tally display elements.
 * Organizes tally-related class names by functional category.
 */
export interface TallyCSSClasses {
  /** Class for individual tally boxes (ship/weapon indicators) */
  TALLY_BOX: string

  /** Class for tally row containers */
  TALLY_ROW: string

  /** Class for tally group containers (terrain-grouped) */
  TALLY_CONTAINER: string

  /** Class for individual tally columns */
  TALLY_COLUMN: string
}

/**
 * CSS class configuration for weapon display elements.
 * Organizes weapon-related visual class names.
 */
export interface WeaponCSSClasses {
  /** Class for tally row containers */
  TALLY_ROW: string

  /** Class for weapon indicators */
  WEAPON: string

  /** Class for weapon/ammo boxes */
  TALLY_BOX: string

  /** Class for used/expended ammo slots */
  USED: string

  /** Class for hit weapons */
  HIT: string

  /** Class for damaged weapons */
  DAMAGED: string
}

/**
 * CSS class configuration for tray state management.
 * Used by TrayManager for visibility and content state.
 */
export interface TrayCSSClasses {
  /** Class indicating empty tray (no items) */
  EMPTY: string

  /** Class indicating hidden/not visible tray */
  HIDDEN: string

  /** Legacy misspelled hidden class (kept for compatibility) */
  HIDDEN_MISSPELLED: string
}

/**
 * CSS class configuration for ship cell display.
 * Used in ShipCellDisplayer for rendering ship state.
 */
export interface ShipCellCSSClasses {
  /** Class for cells containing weapons */
  WEAPON: string

  /** Class for placed/positioned ships */
  PLACED: string

  /** Class for hit cells */
  HIT: string

  /** Class for sunk ships */
  SUNK: string
}

/**
 * Direction constants for keyboard navigation.
 * Maps arrow keys and movement directions to string identifiers.
 */
export interface DirectionConstants {
  /** Move right / next item */
  RIGHT: string

  /** Move down / next tray */
  DOWN: string

  /** Move up / previous tray */
  UP: string

  /** Move left / previous item */
  LEFT: string
}

/**
 * Default CSS inline style values.
 * Fallback styles applied when class-based styling is insufficient.
 *
 * Keys are semantic names, values are CSS style strings or property values.
 */
export type StyleDefaults = Record<string, string>

/**
 * Default style configuration with title and item variants.
 */
export interface ZoneStyleDefaults {
  /** Inline style for zone title elements */
  TITLE: string

  /** Inline style for zone item elements */
  ITEM: string
}

/**
 * Sunk ship styling configuration.
 * Used to display sunk ships with distinctive visual appearance.
 */
export interface SunkStyleConfig {
  /** Text content to display for sunk ship ('X') */
  TEXT: string

  /** Background color for sunk ship indicator */
  BACKGROUND: string

  /** Text color for sunk ship indicator */
  COLOR: string
}

/**
 * Default weapon styling configuration.
 * Applied to weapon tally and display elements.
 */
export interface WeaponStyleDefaults {
  /** Font size for weapon boxes */
  FONT_SIZE: string

  /** Opacity for used/expended ammo slots */
  USED_OPACITY: string

  /** Text color for used ammo slots */
  USED_COLOR: string
}

/**
 * Color style configuration for visual elements.
 * Maps colors to CSS values for consistent theming.
 */
export interface ColorStyleDefaults {
  /** Default text/foreground color */
  COLOR: string

  /** Default background color with transparency */
  BACKGROUND: string
}
