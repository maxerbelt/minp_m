/**
 * Placement UI module - Manages ship placement phase visualization and cursor navigation.
 *
 * @module waters/placement
 */

import { Waters } from './Waters.js'
import { moveCursorBase } from './placementUI.js'

/**
 * @typedef {Object} PlacementUI
 * @property {HTMLElement} board - The game board HTML element containing grid cells
 * @property {(shipCellGrid: Object, ships: Array<Object>) => void} [moveCursor] - Cursor movement handler for navigating ship placement
 * @property {(r: number, c: number) => void} [selectCell] - Cell selection handler for placing ship at coordinates
 * @property {() => void} [updateDisplay] - Updates placement visualization on the board
 * @property {(ship: Object) => void} [assignShip] - Assigns ship to current cursor position
 * @property {Function} [placeTally] - Displays ship placement tally
 * @property {HTMLCollection} [children] - Cell children collection on board
 * @property {DOMTokenList} [classList] - CSS class list of board
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
 * INHERITED PROPERTIES FROM WATERS:
 * @property {Array<Ship>} ships - Array of ships in this player's fleet
 * @property {Score} score - Scoring system for tracking game results
 * @property {Waters|null} opponent - Reference to opposing player instance
 * @property {ShipCellGrid} shipCellGrid - 2D grid tracking ship cell positions
 * @property {boolean} boardDestroyed - Whether this player's fleet is completely destroyed
 * @property {WeaponSystem} [loadOut] - Weapon system manager for armed ships
 * @property {Steps} [steps] - Optional turn tracking system for game progression
 * @property {string} preamble1 - First person perspective prefix ('You ')
 * @property {string} preamble0 - First person perspective possessive ('Your')
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
   * INITIALIZATION SEQUENCE:
   * 1. Calls super(placementUI, playerType) to initialize Waters base class
   * 2. Inherits shipCellGrid, ships array, scoring system, and weapon loading
   * 3. Stores placementUI as this.UI for placement-specific rendering
   * 4. Prepares cursor-based navigation through moveCursor method binding
   * 5. Initializes optional Steps for turn-based game progression when playerType is set
   *
   * @constructor
   * @param {PlacementUI} placementUI - The placement UI instance for rendering and interaction.
   *   Provides DOM element references and callback methods for:
   *   - Board element and cell grid management
   *   - Cursor movement visualization (moveCursor callback)
   *   - Ship placement interaction (selectCell, assignShip callbacks)
   *   - Display updates
   * @param {string|null} [playerType=null] - Type of player for turn tracking:
   *   - 'AI': Initializes Steps with AI player tracking for step-based logging
   *   - 'Human': Initializes Steps with human player tracking
   *   - null: Default placement without step tracking (local game)
   *   Default: null (uses Water's default player initialization)
   * @returns {void}
   *
   * @description Constructor initializes both the Placement instance and parent Waters class.
   * The placementUI parameter is stored as this.UI and used for all rendering and UI state.
   * This pattern allows Placement to override Waters' UI handling with placement-specific
   * visualization while maintaining all game state management inherited from Waters.
   *
   * @example
   * const ui = createPlacementUI(document.getElementById('board'));
   * const player = new Placement(ui, 'Human');
   * player.autoPlace(); // Auto-place ships on the board
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
   * CURSOR MOVEMENT BEHAVIOR:
   * - Arrow keys or configured movement triggers change cursor position
   * - Cursor wraps at grid boundaries (torus-like navigation if configured)
   * - Ships can be rotated or cycled through for placement
   * - Current selection is highlighted on the board
   * - Placement state is updated in real-time as cursor moves
   *
   * SUPPORTED EVENTS:
   * - Arrow keys: ArrowUp, ArrowDown, ArrowLeft, ArrowRight
   * - Alternative movement triggers: WASD, NumPad navigation (if configured)
   * - Enter/Space for ship placement/confirmation
   * - Rotation triggers for ship orientation
   *
   * @public
   * @param {KeyboardEvent} event - The keyboard event from arrow keys or other movement triggers.
   *   Event properties used:
   *   - event.key: Key identifier (e.g., 'ArrowUp', 'w', 'Enter')
   *   - event.code: Physical key code for consistent mapping
   *   - event.preventDefault(): Called to prevent default browser behavior
   *   Supports arrow keys (ArrowUp, ArrowDown, ArrowLeft, ArrowRight),
   *   WASD keys, and other configured movement triggers.
   * @returns {void}
   *
   * @description This method bridges UI events to the shared placement cursor logic,
   * allowing the cursor to navigate the grid and select ships for placement. It acts
   * as an event dispatcher that delegates to moveCursorBase with proper context
   * binding for the Waters instance.
   *
   * TYPE SAFETY NOTE:
   * Type assertion: Waters has a broader interface than what moveCursorBase strictly
   * expects, but all required properties are present (shipCellGrid, ships). The 'any'
   * assertion on this is necessary for the delegate pattern used by moveCursorBase
   * which works with generic object types.
   *
   * @example
   * // Bind to keyboard event listener
   * document.addEventListener('keydown', (event) => {
   *   player.moveCursor(event);
   * });
   */
  moveCursor (event) {
    // Type assertion: this inherits all needed properties from Waters (shipCellGrid, ships, UI)
    // moveCursorBase expects a placement controller with these properties and uses them
    // through its internal delegates. The 'any' assertion is safe because:
    // 1. Waters provides all required properties (shipCellGrid, ships)
    // 2. PlacementUI (this.UI) has all required callback methods
    // 3. moveCursorBase only accesses existing properties, no new ones added
    // @ts-ignore - Waters has all required properties for moveCursorBase delegate pattern
    moveCursorBase(
      event,
      /** @type {any} */ (this.UI),
      /** @type {any} */ (this)
    )
  }
}
