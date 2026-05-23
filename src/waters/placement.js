import { Waters } from './Waters.js'
import { moveCursorBase } from './placementUI.js'

/**
 * Placement phase player for ship placement with cursor-based navigation.
 * Handles player input during the ship placement phase, allowing cursor movement
 * and ship placement. Inherits game state management from Waters.
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
   *
   * @param {Object} placementUI - The placement UI instance for rendering and interaction
   * @param {string|null} [playerType=null] - Type of player ('AI', 'Human', or null for default)
   */
  constructor (placementUI, playerType = null) {
    super(placementUI, playerType)
  }

  /**
   * Handles keyboard events to move the cursor during ship placement.
   * Delegates cursor movement to the shared moveCursorBase function which handles
   * grid navigation and ship selection logic.
   *
   * @param {KeyboardEvent} event - The keyboard event from arrow keys or other movement triggers
   * @returns {void}
   */
  moveCursor (event) {
    // Type assertion needed: this inherits GameModel properties from Waters
    moveCursorBase(event, this.UI, /** @type {any} */ (this))
  }
}
