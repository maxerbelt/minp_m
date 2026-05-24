import { Waters } from './Waters.js'
import { moveCursorBase } from './placementUI.js'

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
   * @param {import('./placementUI.js').PlacementUI} placementUI - The placement UI instance for rendering and interaction.
   *   Provides methods for cursor movement, ship assignment, and placement visualization.
   * @param {string|null} [playerType=null] - Type of player ('AI', 'Human', or null for default).
   *   Used to determine AI behavior vs. human input during placement.
   *
   * @description Constructor initializes both the Placement instance and parent Waters class.
   * The PlacementUI parameter is stored as this.UI and used for rendering and UI state.
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
   * @param {KeyboardEvent} event - The keyboard event from arrow keys or other movement triggers.
   *   Events are prevented from default behavior and delegated to the UI controller.
   * @returns {void}
   *
   * @description This method bridges UI events to the shared placement cursor logic,
   * allowing the cursor to navigate the grid and select ships for placement.
   * The type assertion on this is necessary because Waters has a broader interface
   * than what moveCursorBase strictly expects, but all required properties are present.
   */
  moveCursor (event) {
    // Type assertion: this inherits all needed properties from Waters (shipCellGrid, ships)
    // moveCursorBase expects these and uses them through its delegates
    moveCursorBase(
      event,
      /** @type {import('./placementUI.js').PlacementUI} */ (this.UI),
      /** @type {any} */ (this)
    )
  }
}
