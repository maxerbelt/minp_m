import { bh } from '../terrains/all/js/bh.js'
import { enemy } from '../waters/enemy.js'
import { KeyboardShortcutManager } from './KeyboardShortcutManager.js'

/**
 * @typedef {import('./types/domain.types.js').Coordinate} Coordinate
 * @typedef {import('./types/domain.types.js').SplashCell} SplashCell
 * @typedef {import('./types/domain.types.js').BoardMap} BoardMap
 * @typedef {import('./types/domain.types.js').Weapon} Weapon
 * @typedef {import('./types/domain.types.js').WeaponSystem} WeaponSystem
 * @typedef {import('./types/form.types.js').FormState} LoadOutModel
 */

/**
 * Global cleanup function reference for opponent board state.
 * Stores the cleanup callback from previous board initialization.
 * Set when initializing a new opponent board with weapon system.
 * Invoked on next game initialization to reset board state.
 *
 * @type {(() => void) | null}
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
 */
function _isInBounds (boardMap, row, col) {
  return boardMap.inBounds(row, col)
}

/**
 * Retrieve the active loadout coordinates from a model.
 * Extracts the weapon targeting point set with preference for selected coordinates.
 * Returns coordinates from loadOut with fallback hierarchy:
 * 1. selectedCoordinates (if manually selected)
 * 2. coordinates (default targeting set)
 * 3. Empty array (no coordinates available)
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
 * Implements fallback hierarchy for weapon selection:
 * 1. selectedWeapon.weapon (explicit selection wrapper)
 * 2. selectedWeapon (direct weapon reference)
 * 3. currentWeaponSystem.weapon (current system weapon)
 * 4. undefined (no active weapon)
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
 * @private
 * @param {Weapon} weapon - Weapon to validate (must have 'points' property).
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
 * @private
 */
class BoardHighlighter {
  /**
   * Initialize the highlighter with UI and board references.
   * Stores references to be used across multiple highlighting operations.
   *
   * @constructor
   * @param {EnemyUIModel} boardUI - UI component with gridCellAt() and removeHighlightAoE() methods.
   * @param {BoardMap} boardMap - The game board with bounds validation for splash cell filtering.
   */
  constructor (boardUI, boardMap) {
    /**
     * Enemy UI model for cell access and highlight removal.
     * @type {EnemyUIModel}
     * @private
     */
    this.boardUI = boardUI
    /**
     * Game board for bounds validation during splash cell filtering.
     * @type {BoardMap}
     * @private
     */
    this.boardMap = boardMap
  }

  /**
   * Clear any existing area of effect highlights from the board.
   * Removes all CSS highlight classes applied by previous weapon previews.
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
   * Uses bh.splashTags to map power levels to CSS class names.
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
   * @public
   * @param {Weapon} weapon - Weapon to display effect for (must have splashAoe method).
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
 * REGRESSION PREVENTION NOTE:
 * In Hide mode, the opponent (Friend) has visible ships and attached weapons.
 * Weapons must be armed so two-click targeting works correctly.
 * This is independent of bh.seekingMode logic (see critical note below).
 *
 * @private
 * @param {(() => void) | null} opponentBoardCleanup - Cleanup function for previous board, or null.
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
 * @private
 * @returns {void}
 */
function _configureBoardHoverBehavior () {
  enemy.UI.buildBoardHover(
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
 * @private
 * @param {boolean} isSeekingMode - True if player is seeking/hunting.
 * @returns {void}
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
 */
function _configureBoardTargeting (isSeekingMode) {
  enemy.setBoardTargetingState(isSeekingMode)
}

/**
 * Initialize weapon button click handlers.
 * Wire up UI controls for weapon selection and fire actions.
 * Must happen after resetModel but works in all game modes.
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
 * @public
 * @param {string} seek - Game mode indicator: 'seek' for seeking mode, other values for hiding mode.
 * @param {(() => void) | null} opponentBoard - Cleanup function for previous board state, or null.
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
 * @typedef {(event: KeyboardEvent) => void} KeyboardHandler
 */

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
 * @private
 * @param {Function} placementHandler - Handler function for placement mode toggle.
 * @param {Function} testHandler - Handler function for test mode toggle.
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
 * @private
 * @param {Function|undefined} placementHandler - Handler function for placement mode, or undefined.
 * @param {Function|undefined} testHandler - Handler function for test mode, or undefined.
 * @returns {() => void} Cleanup function that deactivates keyboard shortcut listening.
 */
function _initializeSeekModeShortcuts (placementHandler, testHandler) {
  const shortcutManager = new KeyboardShortcutManager()
  const shortcuts = _buildSeekModeShortcuts(placementHandler, testHandler)

  shortcutManager.registerShortcuts(shortcuts)
  shortcutManager.activate()

  return () => shortcutManager.deactivate()
}

/**
 * @typedef {(event: Event) => void} EventListener
 */

/**
 * Safely attach a click handler to an element if it exists and handler is valid.
 * Guards against null/undefined elements and non-function handlers.
 * Uses optional chaining to safely access addEventListener method.
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
 * @public
 * @param {Function} placementHandler - Callback function for entering placement mode.
 * @param {Function} testHandler - Callback function for entering test mode.
 * @returns {() => void} Cleanup function to deactivate keyboard shortcuts (call on game end).
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
 *
 * @internal
 * @type {Object<string, Function>}
 */
export const __test = {
  _getActiveWeapon,
  _getPreviewTargetingCoordinates
}
