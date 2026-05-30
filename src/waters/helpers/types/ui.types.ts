/**
 * @module waters/helpers/types/ui
 * UI element caching, tray management, and DOM interaction types.
 *
 * Shared UI infrastructure used across tray and element management:
 * - Element cache structures for buttons and trays
 * - Tray state management and iteration
 * - Drag-and-drop element building
 * - Tray operation callbacks
 */

/**
 * Cached button element references for action controls.
 * Provides type-safe access to frequently used control buttons.
 *
 * All buttons may be null if not found in DOM during initialization.
 */
export interface ElementCacheButtons {
  /** Button to start new ship placement phase */
  newPlacement: HTMLButtonElement | null

  /** Button to rotate selected ship/element */
  rotate: HTMLButtonElement | null

  /** Button to rotate selected element counter-clockwise */
  rotateLeft: HTMLButtonElement | null

  /** Button to flip/mirror selected element */
  flip: HTMLButtonElement | null

  /** Button to transform selected element */
  transform: HTMLButtonElement | null

  /** Button to test current placement configuration */
  test: HTMLButtonElement | null

  /** Button to enter/toggle seeking/hunt mode */
  seek: HTMLButtonElement | null

  /** Button to stop current action/mode */
  stop: HTMLButtonElement | null

  /** Button to undo last action */
  undo: HTMLButtonElement | null

  /** Button to trigger auto-placement of remaining ships */
  auto: HTMLButtonElement | null
}

/**
 * Cached tray container element references.
 * Organizes UI element trays by unit type for quick access.
 *
 * All trays may be null if not found in DOM during initialization.
 */
export interface ElementCacheTrays {
  /** Main tray container holding all unit trays */
  container: HTMLDivElement | null

  /** Tray containing ship unit elements */
  ship: HTMLDivElement | null

  /** Tray containing aircraft/plane unit elements */
  plane: HTMLDivElement | null

  /** Tray containing special unit elements (missiles, mines, etc.) */
  special: HTMLDivElement | null

  /** Tray containing terrain/brush elements for map editing */
  brush: HTMLDivElement | null

  /** Tray containing weapon system elements */
  weapon: HTMLDivElement | null

  /** Tray containing building/structure elements */
  building: HTMLDivElement | null
}

/**
 * Element cache for DOM element references.
 * Provides type-safe access to cached elements with optional methods.
 */
export interface ElementCache {
  /** Cached button elements */
  buttons: ElementCacheButtons

  /** Cached tray elements */
  trays: ElementCacheTrays

  /**
   * Get all tray elements as an array.
   * Used for batch operations across all trays.
   *
   * @returns Array of tray elements (may include null values)
   */
  getAllTrays(): Array<HTMLDivElement | null>

  /**
   * Get tray by unit type code.
   * Maps single-character type codes to their tray containers.
   *
   * Type codes:
   * - 'A': Aircraft/Plane
   * - 'S': Ship
   * - 'M', 'T', 'X': Special units
   * - 'G': Ground/Building
   * - 'W': Weapon
   *
   * @param type - Single character unit type code
   * @returns The tray container for this type, or null if not found
   */
  getTrayByType(type: string): HTMLDivElement | null
}

/**
 * Tray state options for visibility and content management.
 * Boolean flags control how tray state should be modified.
 *
 * All options default to false (no operation). Only enabled flags cause changes.
 */
export interface TrayStateOptions {
  /** Clear all innerHTML content from trays */
  clearContent?: boolean

  /** Add 'empty' CSS class to mark trays as empty */
  markEmpty?: boolean

  /** Remove 'empty' CSS class to mark trays as non-empty */
  unmarkEmpty?: boolean

  /** Remove 'hidden' CSS class to show trays */
  show?: boolean

  /** Add 'hidden' CSS class to hide trays */
  hide?: boolean
}

/**
 * Tray manager element cache interface.
 * Defines the contract for element cache objects used by TrayManager.
 */
export interface TrayManagerElementCache {
  /**
   * Returns all tray container elements as an array.
   * Called by TrayManager for iteration and batch operations.
   */
  getAllTrays(): HTMLDivElement[]

  /**
   * Named tray references (optional for lazy-loading).
   * May be populated on demand instead of eagerly.
   */
  trays?: Record<string, HTMLDivElement | null>
}

/**
 * Callback for executing operations on tray elements.
 * Used with forEach-style iteration across trays.
 */
export type TrayAction = (tray: HTMLDivElement) => void

/**
 * Adapter callback for transforming tray item data with context.
 * Provides positional information for flexible data extraction.
 *
 * @param element - The tray item element
 * @param trayIndex - Index of the parent tray (0-based)
 * @param itemIndex - Index of item within the tray (0-based, resets per tray)
 * @param trays - All tray elements for cross-tray operations
 * @returns Transformed data or computed result
 */
export type TrayItemAdapter = (
  element: HTMLElement,
  trayIndex: number,
  itemIndex: number,
  trays: HTMLDivElement[]
) => unknown

/**
 * Tray track with column reference and increment function.
 * Used for balancing ship distribution between tally columns.
 */
export interface TallyTrack {
  /** Column element for appending tally rows */
  col: HTMLElement

  /** Function to increment item count in this track */
  inc: () => void
}

/**
 * Options for creating drag container elements.
 * Allows customization of drag container class and data attributes.
 */
export interface DragContainerOptions {
  /** Custom CSS class(es) to apply to container */
  className?: string

  /** Data attributes to populate element.dataset */
  dataset?: Record<string, string | number | boolean>
}
