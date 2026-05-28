import { Waters } from './Waters.js'
import { moveCursorBase } from './placementUI.js'

/**
 * @typedef {Object} PlacementUI
 * @property {Object} board - The game board HTML element
 * @property {(shipCellGrid: Object, ships: Array<Object>) => void} [moveCursor] - Cursor movement handler
 * @property {(r: number, c: number) => void} [selectCell] - Cell selection handler
 * @property {() => void} [updateDisplay] - Updates placement visualization
 * @property {(ship: Object) => void} [assignShip] - Assigns ship to current cursor position
 */

/**
 * Placement phase player for ship placement with cursor-based navigation.
 * Handles player input during the ship placement phase, allowing cursor movement
 * and ship placement. Inherits game state management from Waters.
 *
 * Provides specialized cursor-based UI interaction for the ship placement phase,
 * where players position their fleet before battle. Delegates most game state
 * management to the parent Waters class while handling input events specific to
 * placement mode.
 *
 * ARCHITECTURE:
 * - Extends Waters to inherit all game state (ships, scoring, weapons, targeting)
 * - Overrides input handling with placement-specific cursor navigation
 * - Uses PlacementUI for rendering placement state
 * - Delegates cursor logic to shared moveCursorBase function from placementUI module
 *
 * @class Placement
 * @extends Waters
 * @description Manages cursor navigation and ship placement interaction for both human
 * and AI players. Delegates most game logic to parent Waters class while providing
 * placement-specific UI event handling.
 */
export class Placement extends Waters {
  /**
   * Creates a Placement player instance with UI and optional player type.
   * Initializes the game state with default values and sets up the placement UI.
   * Calls the parent Waters constructor to initialize core game state including
   * ships, scoring, and weapon systems.
   *
   * INITIALIZATION:
   * 1. Calls super(placementUI, playerType) to initialize Waters base class
   * 2. Inherits shipCellGrid, ships array, scoring system
   * 3. Stores placementUI as this.UI for placement-specific rendering
   * 4. Sets up cursor-based navigation through moveCursor method
   *
   * @public
   * @param {PlacementUI} placementUI - The placement UI instance for rendering and interaction.
   *   Provides methods for cursor movement, ship assignment, and placement visualization.
   * @param {string|null} [playerType=null] - Type of player ('AI', 'Human', or null for default).
   *   Used to determine AI behavior vs. human input during placement.
   *   Default: null (uses Water's default player type)
   * @returns {void}
   *
   * @description Constructor initializes both the Placement instance and parent Waters class.
   * The placementUI parameter is stored as this.UI and used for rendering and UI state.
   */
  constructor (placementUI, playerType = null) {
    super(placementUI, playerType)
  }

  /**
   * Handles keyboard events to move the cursor during ship placement.
   * Delegates cursor movement to the shared moveCursorBase function which handles
   * grid navigation and ship selection logic. Processes arrow key events and
   * translates them into cursor position updates or ship assignments.
   *
   * CURSOR MOVEMENT:
   * - Arrow keys or configured movement triggers change cursor position
   * - Cursor wraps at grid boundaries (torus-like navigation)
   * - Ships can be rotated or cycled through for placement
   * - Current selection is highlighted on the board
   *
   * @public
   * @param {KeyboardEvent} event - The keyboard event from arrow keys or other movement triggers.
   *   Events are prevented from default behavior and delegated to the UI controller.
   *   Supports arrow keys (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
   *   and other configured movement triggers (WASD, etc.)
   * @returns {void}
   *
   * @description This method bridges UI events to the shared placement cursor logic,
   * allowing the cursor to navigate the grid and select ships for placement.
   * Type assertion: Waters has a broader interface than what moveCursorBase
   * strictly expects, but all required properties are present (shipCellGrid, ships).
   * The 'any' assertion on this is necessary for the delegate pattern used by moveCursorBase.
   */
  moveCursor (event) {
    // Type assertion: this inherits all needed properties from Waters (shipCellGrid, ships)
    // moveCursorBase expects these and uses them through its delegates
    // @ts-ignore - Waters has all required properties for moveCursorBase
    moveCursorBase(
      event,
      /** @type {any} */ (this.UI),
      /** @type {any} */ (this)
    )
  }
}
