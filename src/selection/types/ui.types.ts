/**
 * UI-related types for board interaction, view models, and DOM elements.
 * Includes position types, view model interface, and ship DOM elements.
 */

/**
 * Grid position represented as [row, column] tuple.
 * Each component is an integer representing coordinates in the game grid.
 */
export type CursorPosition = [number, number];

/**
 * Pixel offset represented as [x, y] tuple.
 * Used for drag positioning and screen-relative coordinates.
 */
export type OffsetVector = [number, number];

/**
 * Mouse event data during drag operations.
 * Contains client coordinates relative to viewport.
 */
export interface MouseDragEvent {
  /** X coordinate relative to viewport */
  clientX: number;
  /** Y coordinate relative to viewport */
  clientY: number;
}

/**
 * Ship DOM element interface for tray items and drag sources.
 * Extends HTMLElement with ship-specific data attributes and styling.
 */
export interface ShipElement extends HTMLElement {
  /** Data attributes including 'id', 'variant', 'letter' */
  dataset: DOMStringMap & {
    id?: string;
    variant?: string;
    letter?: string;
  };
  /** Element CSS styles; opacity modified during drag operations */
  style: CSSStyleDeclaration;
  /** Class list for managing ship display states */
  classList: DOMTokenList;
}

/**
 * Content builder function for rendering ship previews.
 * Used by Ghost and DOM elements to display ship representations.
 */
export type ContentBuilderFunction = (
  element: HTMLElement,
  board: Record<string, unknown>,
  letter: string
) => void;

/**
 * View model interface providing UI interaction handlers.
 * Coordinates between drag operations and visual updates in the game board.
 */
export interface ViewModel {
  /** Clears CSS highlight classes from all board cells after drag operations */
  removeHighlight(): void;
  /** Flag indicating ship placement mode (true) or adding mode (false) */
  placingShips: boolean;
  /** Retrieves DOM element for grid cell at [row, column] */
  gridCellAt(r: number, c: number): HTMLElement;
  /** Disables rotation/flip UI controls when drag ends */
  disableRotateFlip(): void;
  /** Clears the clicked/selected ship state from UI tray */
  removeClicked(): void;
  /** Moves keyboard cursor in specified direction and selects ship */
  assignByCursor(arrowKey: string, ships: Array<unknown>): void;
  /** Returns first available ship from tray for keyboard cursor initialization */
  getFirstTrayItem(): Element | null;
  /** Manager object providing getTrayItem(id) method */
  trayManager: { getTrayItem(id: string): unknown };
  /** Updates drag preview display with ship variant content */
  setDragShipContents(dragShip: HTMLElement, board: object, letter: string): void;
  /** Handles new ship addition; returns assigned ship ID */
  addition(placed: Array<[number, number]>, model: object, ship: object): number;
  /** Handles ship placement in existing grid */
  placement(placed: Array<[number, number]>, model: object, ship: object): void;
  /** Removes ship element from tray after successful placement */
  removeDragShip(dragShip: HTMLElement): void;
  /** Updates ship tracking and stats display */
  displayShipTrackingInfo(model: object): void;
  /** Validates and refreshes tray availability */
  checkTrays(): void;
  /** Recolors cell display after terrain changes */
  recolor(x: number, y: number): void;
  /** Score manager object for tracking game points */
  score: object;
  /** Updates state of undo/change-clear button */
  updateChangeClearButton(): void;
  /** Refreshes colors on entire board after brush operations */
  refreshAllColor(): void;
  /** Updates UI to show ship as selected and enables transform controls */
  assignClicked(ship: object, clicked: HTMLElement): void;
  /** Updates UI to show weapon as selected */
  assignClickedWeapon(weapon: object, clicked: HTMLElement): void;
  /** Displays tooltip or notice message in UI */
  showNotice(text: string): void;
  /** Board grid element containing all cell elements */
  board: HTMLElement;
  /** Container element for ship/weapon tray panels */
  trays: HTMLElement;
  /** Array of cleanup functions to remove ship placement listeners */
  placelistenCancellables: Array<() => void>;
  /** Array of cleanup functions to remove brush painting listeners */
  brushlistenCancellables: Array<() => void>;
  /** Returns size of individual grid cells in pixels */
  cellSize(): number;
}
