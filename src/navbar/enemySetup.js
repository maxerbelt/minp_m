import { bh } from '../terrains/all/js/bh.js'
import { enemy } from '../waters/enemy.js'
import { KeyboardShortcutManager } from './KeyboardShortcutManager.js'
import { GridBoard } from '../waters/gridBoard.js'
/**
 * @typedef {import('./types/domain.types.js').Coordinate} Coordinate
 * @typedef {import('./types/domain.types.js').SplashCell} SplashCell
 * @typedef {import('./types/domain.types.js').BoardMap} BoardMap
 * @typedef {import('./types/domain.types.js').Weapon} Weapon
 * @typedef {import('./types/domain.types.js').WeaponSystem} WeaponSystem
 * @typedef {import('./types/form.types.js').FormState} LoadOutModel
 *
 * @typedef {Object} EnemyLoadOut
 * @property {Array<Array<number>>} [selectedCoordinates] - Player-selected targeting coordinates [row, col] pairs. Initialized when player clicks target cells.
 * @property {Array<Array<number>>} [coordinates] - Default targeting coordinates set by weapon system. Auto-generated target set from weapon pattern.
 * @property {Object} [selectedWeapon] - Selected weapon wrapper object with weapon property.
 * @property {Weapon} [selectedWeapon.weapon] - Active weapon instance extracted from selected wrapper object.
 * @property {WeaponSystem} [currentWeaponSystem] - Currently active weapon system instance with integrated weapon property.
 *
 * @typedef {Object} EnemyGameState
 * @property {EnemyLoadOut} [loadOut] - Weapon and targeting loadout model containing active weapons and targeting state.
 * @property {Object} [selectedCellCoordinates] - Selected target cell from two-click targeting mode in hide game.
 * @property {number} [selectedCellCoordinates.r] - Row coordinate (0-based) of selected target cell.
 * @property {number} [selectedCellCoordinates.c] - Column coordinate (0-based) of selected target cell.
 * @property {EnemyUIModel} [UI] - Enemy UI component reference for board display and button management.
 *
 * @typedef {Object} EnemyUIModel
 * @property {Object} board - Board DOM element with classList for styling weapon effects.
 * @property {HTMLElement} [weaponBtn] - Single weapon button reference (deprecated, use weaponBtns map).
 * @property {Object<string, HTMLElement>} [weaponBtns] - Map of weapon letter identifiers to button HTML elements for dynamic shortcuts.
 * @property {(row: number, col: number) => HTMLElement} gridCellAt - Retrieve board cell element at board coordinates (0-based indexing).
 * @property {() => void} removeHighlightAoE - Clear all weapon effect highlight classes and styling from board cells.
 * @property {(callback: Function, clearCallback: Function, ui: EnemyUIModel, model: EnemyGameState) => void} buildBoardHover - Configure hover event handlers for weapon effect preview display.
 * @property {Object} [buttons] - Container object for all named UI button references.
 * @property {HTMLElement} [buttons.restart] - Restart/new game button element.
 * @property {HTMLElement} [buttons.place] - Placement mode toggle button element.
 * @property {HTMLElement} [buttons.test] - Test mode toggle button element.
 * @property {() => void} [refreshButtons] - Method to refresh button states based on current game mode.
 * @property {Object} [weaponBtns] - Optional map of weapon buttons by letter for keyboard shortcuts.
 *
 * @typedef {Object} FriendUI
 * @property {() => void} [clearFriendClasses] - Remove CSS classes specific to friend player display state.
 *
 * @typedef {(event: KeyboardEvent) => void} KeyboardHandler
 * @typedef {(event: Event) => void} EventListener
 * @typedef {() => void} CleanupHandler
 * @typedef {(model: EnemyGameState, cellRow: number, cellCol: number) => void} AreaOfEffectHighlighter
 */

/**
 * Global cleanup function reference for opponent board state.
 * Stores the cleanup callback from previous board initialization.
 * Set when initializing a new opponent board with weapon system.
 * Invoked on next game initialization to reset board state.
 *
 * LIFECYCLE NOTES:
 * - Set during _initializeOpponentBoard() when friend UI is available
 * - Executed at start of next game to clean up previous board state
 * - Prevents memory leaks and stale event handlers from accumulating
 * - Null when no board cleanup is pending
 *
 * @type {(function(): void) | null}
 * @private
 */
let cleanupOpponentBoard = null

// ============================================================================
// HELPER FUNCTIONS & UTILITIES
// ============================================================================

/**
 * Validate coordinates are within board bounds.
 * Checks if the given row and column fall within the valid game board dimensions.
 * Extracted to reduce code duplication across multiple functions for maintainability.
 *
 * @private
 * @param {BoardMap} boardMap - The game board with bounds validation method.
 * @param {number} row - Row coordinate to validate (0-based).
 * @param {number} col - Column coordinate to validate (0-based).
 * @returns {boolean} True if coordinates are in bounds, false otherwise.
 * @throws {Error} If boardMap is invalid or missing inBounds method (type check only).
 */
function _isInBounds (boardMap, row, col) {
  return boardMap.inBounds(row, col)
}

/**
 * Retrieve the active loadout coordinates from a model.
 * Extracts the weapon targeting point set with preference for selected coordinates.
 * Returns coordinates from loadOut with fallback hierarchy:
 * 1. selectedCoordinates (if manually selected by player)
 * 2. coordinates (default targeting set by weapon system)
 * 3. Empty array (no coordinates available in this game session)
 *
 * USAGE CONTEXT:
 * - Called during weapon effect preview to collect targeting points
 * - Used to determine if weapon can be applied (check points requirement)
 * - Prioritizes manual selections over automatic weapon patterns
 *
 * @private
 * @param {EnemyGameState} model - Enemy game state with loadOut property.
 * @returns {Array<Array<number>>} Array of [row, col] coordinate pairs, or empty array if no loadOut.
 */
function _getTargetingCoordinates (model) {
  const loadOut = model.loadOut
  if (!loadOut) return []

  return loadOut.selectedCoordinates || loadOut.coordinates || []
}

/**
 * Retrieve the currently active weapon from a model's loadout.
 * Implements fallback hierarchy for weapon selection with multiple fallbacks:
 * 1. selectedWeapon.weapon (explicit selection wrapper with nested weapon)
 * 2. selectedWeapon (direct weapon reference when not wrapped)
 * 3. currentWeaponSystem.weapon (current system weapon as fallback)
 * 4. undefined (no active weapon in this state)
 *
 * FALLBACK RATIONALE:
 * - selectedWeapon.weapon: Preferred structure for wrapped weapon selections
 * - selectedWeapon: Direct reference for backward compatibility
 * - currentWeaponSystem.weapon: Last resort when explicit selection unavailable
 * - undefined: Indicates initialization state or mode without active weapon
 *
 * @private
 * @param {EnemyGameState} model - Enemy game state with loadOut property.
 * @returns {Weapon|undefined} Active weapon instance, or undefined if not available.
 */
function _getActiveWeapon (model) {
  if (!model.loadOut) return undefined

  const selectedWeapon = model.loadOut.selectedWeapon
  if (selectedWeapon) {
    return selectedWeapon.weapon || selectedWeapon
  }

  const weaponSystem = model.loadOut.currentWeaponSystem
  return weaponSystem?.weapon
}

/**
 * Collect all splash area of effect cells for a weapon.
 * Retrieves weapon splash cells via splashAoe() and filters out-of-bounds cells.
 * Returns only cells within valid board dimensions for safe rendering.
 *
 * FILTERING PROCESS:
 * 1. Call weapon.splashAoe() to get all affected cells (including out-of-bounds)
 * 2. Filter using _isInBounds() to exclude boundary violations
 * 3. Return filtered set safe for DOM manipulation
 *
 * SAFETY:
 * - Prevents highlighting cells outside board grid
 * - Protects against weapon pattern edge cases
 * - Called before DOM access to prevent errors
 *
 * @private
 * @param {Weapon} weapon - The weapon being applied (must have splashAoe method).
 * @param {BoardMap} boardMap - The game board with bounds validation.
 * @param {Array<Array<number>>} targetCoordinates - Array of [row, col] target positions.
 * @returns {Array<SplashCell>} Filtered splash cells with [row, col, powerLevel] within board bounds.
 */
function _getSplashCellsInBounds (weapon, boardMap, targetCoordinates) {
  const splashCells = weapon.splashAoe(boardMap, targetCoordinates)
  return splashCells.filter(([cellRow, cellCol]) =>
    _isInBounds(boardMap, cellRow, cellCol)
  )
}

/**
 * Calculate whether a weapon can be applied to target coordinates.
 * Validates that a weapon exists and has received enough targeting points.
 * weapon.points defines minimum targeting points required (e.g., 2 for line weapons).
 *
 * VALIDATION LOGIC:
 * - Weapon must exist and be truthy
 * - Weapon.points defines minimum click points needed
 * - targetCoordinates array must meet or exceed weapon.points requirement
 * - Returns false if weapon undefined or insufficient targeting points
 *
 * EXAMPLES:
 * - Single-shot weapon (points=1): needs 1 coordinate
 * - Line weapon (points=2): needs 2 coordinates for start/end
 * - Area weapon (points=0): can apply immediately
 *
 * @private
 * @param {Weapon|undefined} weapon - Weapon to validate (must have 'points' property when defined).
 * @param {Array<Array<number>>} targetCoordinates - Array of [row, col] coordinate pairs selected by player.
 * @returns {boolean} True if weapon exists and weapon.points <= targetCoordinates.length, false otherwise.
 */
function _canApplyWeapon (weapon, targetCoordinates) {
  return !!weapon && weapon.points <= targetCoordinates.length
}

// ============================================================================
// BOARD HIGHLIGHTING LOGIC
// ============================================================================

/**
 * Encapsulates area of effect highlighting for weapon preview.
 * Manages visual feedback for weapon targeting on the opponent board.
 * Responsible for clearing previous highlights and applying new ones based on weapon effect.
 *
 * DESIGN:
 * - Stateless highlighter: all state passed as parameters
 * - Coordinate validation: filters out-of-bounds splash cells
 * - CSS-based highlighting: uses bh.splashTags for power level classes
 * - Board access: uses gridCellAt() for cell element retrieval
 *
 * USAGE FLOW:
 * 1. Create highlighter with UI and boardMap references
 * 2. Call highlightWeaponEffect() with weapon and targeting coordinates
 * 3. Method clears old highlights, validates weapon, and applies new ones
 *
 * @private
 */
class BoardHighlighter {
  /**
   * Initialize the highlighter with UI and board references.
   * Stores references to be used across multiple highlighting operations.
   * References are immutable after construction.
   *
   * @constructor
   * @param {EnemyUIModel} boardUI - UI component with gridCellAt() and removeHighlightAoE() methods.
   * @param {BoardMap} boardMap - The game board with bounds validation for splash cell filtering.
   */
  constructor (boardUI, boardMap) {
    /**
     * Enemy UI model for cell access and highlight removal.
     * Used to get HTML elements at coordinates and clear highlights.
     * @type {EnemyUIModel}
     * @private
     */
    this.boardUI = boardUI
    /**
     * Game board for bounds validation during splash cell filtering.
     * Used to validate coordinates before applying CSS classes.
     * @type {BoardMap}
     * @private
     */
    this.boardMap = boardMap
  }

  /**
   * Clear any existing area of effect highlights from the board.
   * Removes all CSS highlight classes applied by previous weapon previews.
   * Safe to call multiple times - removes all effects in one operation.
   *
   * @private
   * @returns {void}
   */
  _clearExistingHighlights () {
    this.boardUI.removeHighlightAoE()
  }

  /**
   * Apply visual highlighting to splash area of effect cells.
   * Adds CSS classes to each cell based on its power level for weapon effect visualization.
   * Uses bh.splashTags to map power levels to CSS class names for consistent styling.
   *
   * CSS APPLICATION:
   * - Adds power level class from bh.splashTags[powerLevel]
   * - Adds 'target' class for unified targeting visual
   * - Multiple classes allow layered styling for power levels
   *
   * @private
   * @param {Array<SplashCell>} splashCells - Array of [row, col, powerLevel] cells to highlight.
   * @returns {void}
   */
  _applyHighlightsToCells (splashCells) {
    for (const [cellRow, cellCol, powerLevel] of splashCells) {
      const cell = this.boardUI.gridCellAt(cellRow, cellCol)
      const cellClass = bh.splashTags[powerLevel]
      cell.classList.add(cellClass, 'target')
    }
  }

  /**
   * Highlight area of effect for a weapon at target coordinates.
   * Updates visual preview showing weapon splash damage pattern and intensity.
   * Clears previous highlights, validates weapon applicability, and applies new highlights.
   *
   * HIGHLIGHTING SEQUENCE:
   * 1. Clear all existing highlight classes
   * 2. Check if weapon can be applied (sufficient targeting points)
   * 3. Get splash cells bounded to board dimensions
   * 4. Apply CSS classes to cell elements
   *
   * EDGE CASES:
   * - Weapon undefined: clears highlights and returns
   * - Insufficient points: clears highlights and returns
   * - Out-of-bounds splash: filtered before DOM access
   *
   * @public
   * @param {Weapon|undefined} weapon - Weapon to display effect for (must have splashAoe method when defined).
   * @param {Array<Array<number>>} targetCoordinates - Array of [row, col] targeting coordinate pairs.
   * @returns {void}
   */
  highlightWeaponEffect (weapon, targetCoordinates) {
    this._clearExistingHighlights()

    if (!_canApplyWeapon(weapon, targetCoordinates)) {
      return
    }

    const splashCells = _getSplashCellsInBounds(
      weapon,
      this.boardMap,
      targetCoordinates
    )
    this._applyHighlightsToCells(splashCells)
  }
}

// ============================================================================
// GAME INITIALIZATION
// ============================================================================

// ============================================================================
// GAME INITIALIZATION
// ============================================================================

/**
 * Initialize game visibility state for seeking vs hiding mode.
 * Sets the global bh.seekingMode flag which determines board visibility and targeting behavior.
 * seekingMode=true: Player seeks (opponent ships hidden), seekingMode=false: Player hides (own ships visible).
 *
 * STATE SEMANTICS:
 * - bh.seekingMode = true: Player is SEEKING, opponent (enemy) is HIDING
 *   → Enemy ships are not visible initially
 *   → Single-click targeting on opponent board
 * - bh.seekingMode = false: Player is HIDING, opponent (friend) is SEEKING
 *   → Own ships are visible to player
 *   → Two-click targeting on opponent board with visible ships
 *
 * @private
 * @param {boolean} isSeekingMode - True if player is seeking/hunting, false if hiding.
 * @returns {void}
 */
function _initializeGameMode (isSeekingMode) {
  bh.seekingMode = isSeekingMode
}

/**
 * Clear opponent ships when starting a seeking game.
 * In seeking mode, opponent ships start hidden and are revealed as player scores hits.
 * Ships are cleared from the enemy object's ships array during game start.
 *
 * GAME LOGIC:
 * - Seeking mode: opponent is hiding, so start with empty ship array
 * - Hidden ships are gradually revealed when player fires and scores hits
 * - Each hit reveals a new ship from placement
 *
 * SIDE EFFECTS:
 * - Modifies enemy.ships array to empty state if seeking
 * - Does nothing if not in seeking mode (ships remain from initialization)
 *
 * @private
 * @param {boolean} isSeekingMode - True if player is seeking/hunting.
 * @returns {void}
 */
function _clearOpponentShipsIfSeeking (isSeekingMode) {
  if (isSeekingMode) {
    enemy.ships = []
  }
}

/**
 * Update the enemy board title with current terrain name.
 * Provides context about which game board is being displayed.
 * Sets the 'enemy-title' element's text to 'Enemy ' + terrain heading.
 *
 * DOM DEPENDENCY:
 * - Queries for element with ID 'enemy-title'
 * - Safely skips if element not found (guards with optional check)
 * - Used in game start to refresh display
 *
 * @private
 * @returns {void}
 */
function _updateEnemyBoardTitle () {
  const titleElement = document.getElementById('enemy-title')
  if (titleElement) {
    titleElement.textContent = 'Enemy ' + bh.terrain.mapHeading
  }
}

/**
 * Clean up or initialize opponent board state.
 * Handles Friend (hiding player) board initialization with weapon arming.
 * On first call: stores cleanup callback and initializes board state.
 * On subsequent calls: executes and clears stored cleanup function.
 *
 * TWO-CALL LIFECYCLE:
 * First invocation (setup phase):
 *   - Parameter: opponentBoardCleanup function to store
 *   - Action: Store cleanup, clear friend classes, arm opponent weapons
 *   - Stored for next game initialization
 *
 * Second invocation (cleanup phase, next game start):
 *   - Parameter: can be anything (first check runs cleanup)
 *   - Action: Execute stored cleanupOpponentBoard if set
 *   - Result: Previous board state cleaned for fresh start
 *
 * REGRESSION PREVENTION NOTE:
 * In Hide mode, the opponent (Friend) has visible ships and attached weapons.
 * Weapons must be armed so two-click targeting works correctly.
 * This is independent of bh.seekingMode logic (see critical note in _configureBoardTargeting).
 *
 * WEAPON ARMING CONTEXT:
 * - Two-click targeting requires opponent.armWeapons() to be called
 * - This enables weapon selection UI and targeting data collection
 * - Must happen regardless of seeking/hiding mode considerations
 * - Directly enables two-click targeting workflow
 *
 * @private
 * @param {(function(): void) | null} opponentBoardCleanup - Cleanup function for previous board, or null.
 * @param {FriendUI | null} friendUI - Friend player UI (if in hide mode), or null.
 * @returns {void}
 */
function _initializeOpponentBoard (opponentBoardCleanup, friendUI) {
  // If cleanup is needed from previous game, execute it and return
  if (cleanupOpponentBoard) {
    cleanupOpponentBoard()
    return
  }

  // Initialize Friend board if provided
  if (opponentBoardCleanup && friendUI) {
    cleanupOpponentBoard = opponentBoardCleanup
    friendUI.clearFriendClasses()
    // Arm opponent weapons to enable two-click targeting in hide mode
    enemy.opponent?.armWeapons()
  }
}

/**
 * Initialize board hover and highlight behavior for the opponent board.
 * Sets up hover handlers to display weapon effect previews during targeting.
 * Must be called after resetModel to ensure clean state.
 *
 * SETUP FLOW:
 * 1. Calls enemy.UI.buildBoardHover() to attach hover event listeners
 * 2. Passes _createAreaOfEffectHighlighter as the highlight callback
 * 3. Passes enemy.UI.removeHighlightAoE as the clear callback
 * 4. Provides UI and model for callback context
 *
 * INTERACTION MODEL:
 * - Mouse hover triggers _createAreaOfEffectHighlighter
 * - Highlighter updates weapon effect preview in real-time
 * - Mouse leave triggers removeHighlightAoE to clear preview
 *
 * @private
 * @returns {void}
 */
function _configureBoardHoverBehavior () {
  GridBoard.addHover(
    enemy.UI.board,
    bh.map,
    _createAreaOfEffectHighlighter,
    enemy.UI.removeHighlightAoE,
    enemy.UI,
    enemy
  )
}

/**
 * Configure board targeting behavior based on current game mode.
 * Affects click interaction model but NOT weapon selection logic.
 * Delegates to enemy.setBoardTargetingState() which manages click handling.
 *
 * CRITICAL SEMANTIC DOCUMENTATION (bh.seekingMode):
 * ================================================
 * bh.seekingMode indicates which PLAYER is in the hidden position:
 *
 * bh.seekingMode = true:
 *   - PLAYER (you) is SEEKING/HUNTING
 *   - OPPONENT (enemy) is HIDING with no visible ships
 *   - Click behavior: single-click targeting on empty board
 *
 * bh.seekingMode = false:
 *   - PLAYER (you) are HIDING with visible ships
 *   - OPPONENT (friend) is SEEKING/HUNTING
 *   - Click behavior: two-click targeting on opponent board with visible ships
 *
 * REGRESSION PREVENTION:
 * A previous bug checked: bh.seekingMode && opponent?.hasAttachedWeapons
 * This was WRONG because in Hide mode (seekingMode=false), opponent.hasAttachedWeapons=true,
 * making the && condition impossible in Hide mode, breaking two-click targeting.
 *
 * CORRECT APPROACH: Always check opponent?.hasAttachedWeapons INDEPENDENTLY.
 * Do NOT couple weapon selection behavior to bh.seekingMode.
 * The mode only affects WHAT SHIPS ARE VISIBLE, not HOW TARGETING WORKS.
 *
 * @private
 * @param {boolean} isSeekingMode - True if player is seeking/hunting.
 * @returns {void}
 */
function _configureBoardTargeting (isSeekingMode) {
  enemy.setBoardTargetingState(isSeekingMode)
}

/**
 * Initialize weapon button click handlers.
 * Wire up UI controls for weapon selection and fire actions.
 * Must happen after resetModel but works in all game modes.
 *
 * SETUP:
 * - Calls enemy.setupWeaponButtonHandlers() to attach button listeners
 * - Enables weapon selection UI interaction
 * - Prepares button event delegation
 *
 * DEPENDENCIES:
 * - Called after game state reset
 * - Requires enemy.UI to be initialized with weaponBtns
 * - Must happen before any weapon targeting
 *
 * @private
 * @returns {void}
 */
function _setupWeaponButtonHandlers () {
  enemy.setupWeaponButtonHandlers()
}

/**
 * Start a new game, resetting game state and initializing all subsystems.
 * Orchestrates the complete game initialization sequence in proper order.
 * Resets bh state, clears opponent state if seeking, and reinitializes all UI.
 *
 * CRITICAL EXECUTION ORDER AND STATE MANAGEMENT
 * ============================================
 * Initialization must follow this sequence to maintain consistency:
 *
 * INITIALIZATION SEQUENCE:
 * 1. Set bh.seekingMode ..................... Game visibility flag
 * 2. Clear ships if seeking ................. Opponent starts hidden
 * 3. Reset game state machine ............... Clear all state
 * 4. Update UI title ....................... Show current terrain
 * 5. Initialize opponent board .............. Set up opponent display
 * 6. Configure board hover .................. Set up visual feedback
 * 7. Configure board targeting state ....... Set click behavior
 * 8. Setup weapon button handlers ........... Wire up weapon UI
 *
 * WHY ORDER MATTERS:
 * - resetModel() MUST come before board initialization to clear old state
 * - setBoardTargetingState() uses bh.seekingMode, which must be set first
 * - setupWeaponButtonHandlers() MUST happen regardless of mode
 *
 * PARAMETER MEANINGS:
 * - seek: Mode string 'seek' enables seeking mode, other values enable hiding mode
 * - opponentBoard: Cleanup function from previous board initialization (may be null)
 * - friendUI: Friend UI reference for hide mode initialization (may be null)
 *
 * DEBUG LOGGING:
 * - Two console.debug calls track weapon button setup state
 * - First before setupWeaponButtonHandlers for pre-setup state
 * - Second after for post-setup state validation
 *
 * @public
 * @param {string} seek - Game mode indicator: 'seek' for seeking mode, other values for hiding mode.
 * @param {(function(): void) | null} opponentBoard - Cleanup function for previous board state, or null.
 * @param {FriendUI | null} friendUI - Friend player UI reference (if available in hide mode), or null.
 * @returns {void}
 */
export function newGame (seek, opponentBoard, friendUI) {
  const isSeekingMode = seek === 'seek'

  // Initialize game mode
  _initializeGameMode(isSeekingMode)
  _clearOpponentShipsIfSeeking(isSeekingMode)

  // Reset core game state
  enemy.resetModel()
  _updateEnemyBoardTitle()

  // Initialize board and UI
  _initializeOpponentBoard(opponentBoard, friendUI)
  _configureBoardHoverBehavior()

  // Configure interaction model and weapon system
  _configureBoardTargeting(isSeekingMode)
  console.debug(
    'newGame - about to setup weapon button handlers; weaponBtn in UI:',
    !!enemy.UI?.weaponBtn,
    'weaponBtn id:',
    enemy.UI?.weaponBtn?.id
  )
  _setupWeaponButtonHandlers()
  console.debug(
    'newGame - setupWeaponButtonHandlers completed; weapon button clones:',
    Object.keys(enemy.UI?.weaponBtns || {}),
    'weaponBtn element present after setup:',
    !!document.getElementById('weaponBtn')
  )
}

/**
 * Calculate the complete set of targeting coordinates for weapon effect preview.
 * Combines existing targeting coordinates with current cursor position.
 * Implements hierarchical fallback for preview generation:
 * 1. Existing coordinates + cursor position
 * 2. Selected cell + cursor position
 * 3. Cursor position alone
 *
 * FALLBACK RATIONALE:
 * - First tier: Uses accumulated targeting points from previous clicks
 * - Second tier: Falls back to two-click mode selection if available
 * - Third tier: Shows single-point preview if no prior selection
 *
 * USAGE CONTEXT:
 * - Called during board hover to generate dynamic preview
 * - Combines all relevant targeting data for weapon effect visualization
 * - Prepares coordinates for splashAoe() calculation
 *
 * EXAMPLES:
 * - Line weapon (2 points): [prevClick, currentCursor]
 * - Two-click mode: [selectedCell, currentCursor]
 * - Single point: [currentCursor]
 *
 * @private
 * @param {EnemyGameState} model - Enemy game state with loadOut and selectedCellCoordinates.
 * @param {number} cellRow - Current cursor row position (0-based).
 * @param {number} cellCol - Current cursor column position (0-based).
 * @returns {Array<Array<number>>} Array of [row, col] coordinate pairs for preview.
 */
function _getPreviewTargetingCoordinates (model, cellRow, cellCol) {
  const targetingCoordinates = _getTargetingCoordinates(model)
  const selectedCell = model?.selectedCellCoordinates

  if (targetingCoordinates.length > 0) {
    return [...targetingCoordinates, [cellRow, cellCol]]
  }

  if (selectedCell) {
    return [
      [selectedCell.r, selectedCell.c],
      [cellRow, cellCol]
    ]
  }

  return [[cellRow, cellCol]]
}

/**
 * Create and apply area of effect highlighting for weapon preview.
 * Internal handler called during board hover events to update weapon effect visualization.
 * Validates cursor position, retrieves weapon and targeting data, and delegates to BoardHighlighter.
 *
 * EXECUTION FLOW:
 * 1. Validate cursor position is in bounds
 * 2. Retrieve boardUI, activeWeapon, and full targeting coordinates
 * 3. Create BoardHighlighter instance with UI and board references
 * 4. Delegate to highlighter.highlightWeaponEffect()
 *
 * ERROR HANDLING:
 * - Returns early if cursor is out of bounds
 * - Gracefully handles undefined weapon (no highlighting applied)
 * - Filters out-of-bounds splash cells in BoardHighlighter
 *
 * ROLE IN HOVER SYSTEM:
 * - Registered as callback in _configureBoardHoverBehavior()
 * - Called on mouse move during board interaction
 * - Provides real-time weapon effect preview as cursor moves
 * - Paired with removeHighlightAoE for cleanup on mouse leave
 *
 * @private
 * @param {EnemyGameState} model - Enemy game state with UI and loadOut.
 * @param {number} cellRow - Current cursor row position (0-based).
 * @param {number} cellCol - Current cursor column position (0-based).
 * @returns {void}
 */
function _createAreaOfEffectHighlighter (model, cellRow, cellCol) {
  const boardMap = bh.map

  // Validate cursor position
  if (!_isInBounds(boardMap, cellRow, cellCol)) {
    return
  }

  // Get targeting data from model
  const boardUI = model.UI
  const activeWeapon = _getActiveWeapon(model)
  const fullTargetCoordinates = _getPreviewTargetingCoordinates(
    model,
    cellRow,
    cellCol
  )

  // Use highlighter to display weapon effect preview
  const highlighter = new BoardHighlighter(boardUI, boardMap)
  highlighter.highlightWeaponEffect(activeWeapon, fullTargetCoordinates)
}

/**
 * Build keyboard shortcut handlers for seek mode gameplay.
 * Supports placement, testing, reveal, and weapon selection hotkeys.
 * Dynamically registers weapon button shortcuts from weaponBtns UI elements.
 *
 * Built shortcuts:
 * - 'p': Placement mode toggle
 * - 't': Test mode toggle
 * - 'r': New game (seek mode)
 * - 'q': Reveal hidden ships
 * - 's': Single-shot weapon
 * - [dynamic]: Weapon selection by letter from button dataset
 *
 * DYNAMIC WEAPON SHORTCUTS:
 * - Scans enemy.UI.weaponBtns map for all weapon buttons
 * - Extracts letter from button.dataset.letter
 * - Registers letter (lowercase) to onClickWeaponButtons handler
 * - Allows A-Z keyboard shortcuts for weapon selection
 *
 * HANDLER BINDING:
 * - Placeholders use ?. operator for optional method binding
 * - Prevents errors if handlers are not defined
 * - Supports progressive enhancement
 *
 * @private
 * @param {CleanupHandler|undefined} placementHandler - Handler function for placement mode toggle.
 * @param {CleanupHandler|undefined} testHandler - Handler function for test mode toggle.
 * @returns {Object<string, KeyboardHandler>} Map of single-character keys to handler functions.
 */
function _buildSeekModeShortcuts (placementHandler, testHandler) {
  const shortcuts = {
    p: () => placementHandler?.(),
    t: () => testHandler?.(),
    r: () => newGame('seek', () => {}, null),
    q: () => enemy.onClickReveal?.(),
    s: () => enemy.onClickSingleShotButton?.()
  }

  // Dynamically register weapon button shortcuts from UI
  const weaponButtons = enemy.UI?.weaponBtns || {}
  for (const button of Object.values(weaponButtons)) {
    const letter = button.dataset.letter
    if (letter) {
      const weaponLetter = letter.toLowerCase()
      shortcuts[weaponLetter] = () => enemy.onClickWeaponButtons?.(letter)
    }
  }

  return shortcuts
}

/**
 * Initialize keyboard shortcuts for seek mode.
 * Creates a KeyboardShortcutManager, registers built shortcuts, activates listening,
 * and returns cleanup function to deactivate listening on game end.
 *
 * LIFECYCLE:
 * 1. Create KeyboardShortcutManager instance
 * 2. Build shortcuts map using _buildSeekModeShortcuts
 * 3. Register all shortcuts with manager
 * 4. Activate keyboard event listening
 * 5. Return cleanup function for game end
 *
 * CLEANUP PATTERN:
 * - Returned cleanup function deactivates keyboard listening
 * - Prevents keyboard shortcuts from firing between games
 * - Called when setupEnemy returns control to caller
 * - Should be invoked when game ends or mode changes
 *
 * @private
 * @param {CleanupHandler|undefined} placementHandler - Handler function for placement mode, or undefined.
 * @param {CleanupHandler|undefined} testHandler - Handler function for test mode, or undefined.
 * @returns {CleanupHandler} Cleanup function that deactivates keyboard shortcut listening.
 */
function _initializeSeekModeShortcuts (placementHandler, testHandler) {
  const shortcutManager = new KeyboardShortcutManager()
  const shortcuts = _buildSeekModeShortcuts(placementHandler, testHandler)

  shortcutManager.registerShortcuts(shortcuts)
  shortcutManager.activate()

  return () => shortcutManager.deactivate()
}

/**
 * Safely attach a click handler to an element if it exists and handler is valid.
 * Guards against null/undefined elements and non-function handlers.
 * Uses optional chaining to safely access addEventListener method.
 *
 * SAFETY FEATURES:
 * - Optional chaining (?.) for element.addEventListener
 * - Type check for handler (must be function)
 * - Both checks prevent runtime errors
 * - Silently skips if either condition fails
 *
 * USAGE CONTEXT:
 * - Called during setupEnemy for button event binding
 * - Prevents errors when elements don't exist
 * - Guards against invalid handler types
 * - Enables progressive enhancement
 *
 * @private
 * @param {HTMLElement|null} element - DOM element to attach handler to, or null to skip.
 * @param {EventListener|undefined} handler - Click event handler function, or undefined to skip.
 * @returns {void}
 */
function _attachClickHandler (element, handler) {
  if (element?.addEventListener && typeof handler === 'function') {
    element.addEventListener('click', /** @type {EventListener} */ (handler))
  }
}

/**
 * Setup the enemy game UI and event handlers.
 * Initializes button handlers and keyboard shortcuts for gameplay.
 * Entry point for UI setup that must be called before game begins.
 *
 * EXECUTION ORDER:
 * 1. Refresh UI button states
 * 2. Wire up restart button
 * 3. Wire up all standard buttons
 * 4. Wire up placement and test buttons
 * 5. Initialize keyboard shortcuts
 *
 * BUTTON SETUP:
 * - Restart button: bound to newGame('seek', null)
 * - Wireup buttons: calls enemy.wireupButtons() for standard setup
 * - Placement/Test: bound to provided handlers
 *
 * RETURN VALUE:
 * - Returns cleanup function to deactivate keyboard shortcuts
 * - Caller should invoke this when game ends or UI teardown needed
 * - Prevents keyboard shortcuts from firing between games
 *
 * CALLER RESPONSIBILITY:
 * - Must call returned cleanup function on game end
 * - Cleanup prevents memory leaks and stale keyboard handling
 * - Integrates with game lifecycle management
 *
 * @public
 * @param {Function|undefined} placementHandler - Callback function for entering placement mode.
 * @param {Function|undefined} testHandler - Callback function for entering test mode.
 * @returns {CleanupHandler} Cleanup function to deactivate keyboard shortcuts (call on game end).
 */
export function setupEnemy (placementHandler, testHandler) {
  // Refresh button states
  enemy.UI?.refreshButtons?.()

  // Wire up game control buttons
  _attachClickHandler(
    enemy.UI?.buttons?.restart,
    newGame.bind(null, 'seek', null)
  )
  enemy.wireupButtons()

  // Wire up mode toggle buttons
  _attachClickHandler(enemy.UI?.buttons?.place, placementHandler)
  _attachClickHandler(enemy.UI?.buttons?.test, testHandler)

  // Initialize keyboard shortcuts and return cleanup handler
  return _initializeSeekModeShortcuts(placementHandler, testHandler)
}

/**
 * Internal test exports for unit testing private functions.
 * Exposes implementation details for testing purposes only.
 * Should NOT be used in production code - for tests only.
 *
 * EXPORTED FUNCTIONS:
 * - _getActiveWeapon: Get current weapon from model state
 * - _getPreviewTargetingCoordinates: Calculate hover preview coordinates
 *
 * TESTING PATTERNS:
 * - Import from __test to access private functions in test files
 * - Use for unit testing helper logic without exposure in production
 * - Enables testing of edge cases and state combinations
 *
 * MAINTENANCE:
 * - Add new private functions to __test when they need unit test coverage
 * - Remove when functions are sufficiently tested
 * - Keep list minimal to avoid test-driven implementation
 *
 * @internal
 * @type {Object<string, Function>}
 */
export const __test = {
  _getActiveWeapon,
  _getPreviewTargetingCoordinates
}
