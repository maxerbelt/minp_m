import { bh } from '../terrains/all/js/bh.js'
import { enemy } from '../waters/enemy.js'
import { KeyboardShortcutManager } from './KeyboardShortcutManager.js'

/**
 * @typedef {Object} Coordinate
 * @property {number} row
 * @property {number} col
 */

/**
 * @typedef {[number, number, number]} SplashCell - Tuple of [row, column, powerLevel] for splash effect cells
 */

/**
 * @typedef {Object} BoardMap
 * @property {(row: number, col: number) => boolean} inBounds - Validate if coordinates are within board bounds
 * @property {(map: BoardMap, targetCoordinates: Array<Array<number>>) => Array<SplashCell>} splashAoe - Calculate splash area of effect
 */

/**
 * @typedef {Object} Weapon
 * @property {number} points - Number of cells required to fire this weapon
 * @property {(map: BoardMap, targetCoordinates: Array<Array<number>>) => SplashCell[]} splashAoe - Calculate affected cells
 */

/**
 * @typedef {Object} WeaponSystem
 * @property {Weapon} weapon - The weapon object
 */

/**
 * @typedef {Object} LoadOutModel
 * @property {Array<Array<number>>} [selectedCoordinates] - User-selected target coordinates
 * @property {Array<Array<number>>} [coordinates] - Default loadout coordinates
 * @property {Weapon} [selectedWeapon] - Explicitly selected weapon
 * @property {() => WeaponSystem} [getCurrentWeaponSystem] - Method to get current weapon
 */

/**
 * @typedef {Object} EnemyUIModel
 * @property {() => void} refreshButtons - Refresh UI button states
 * @property {Object<string, HTMLElement>} buttons - Map of button names to DOM elements
 * @property {Object<string, HTMLElement>} weaponBtns - Map of weapon buttons
 * @property {(highlighter: Function, remover: Function, opponent: Object, placement: Object) => void} buildBoardHover - Configure board hover behavior
 * @property {() => void} removeHighlightAoE - Remove area of effect highlights
 * @property {(row: number, col: number) => HTMLElement} gridCellAt - Get grid cell by coordinates
 */

/**
 * @typedef {Object} EnemyGameState
 * @property {Array<Object>} ships - Array of ship objects
 * @property {LoadOutModel} loadOut - Current loadout model
 * @property {EnemyUIModel} UI - UI component
 * @property {Object} opponent - Opponent game state
 * @property {() => void} resetModel - Reset game state
 * @property {(mode: boolean) => void} setBoardTargetingState - Configure targeting mode
 * @property {() => void} setupWeaponButtonHandlers - Wire up weapon button handlers
 * @property {() => void} wireupButtons - Initialize button handlers
 * @property {() => HTMLElement} gridCellAt - Get grid cell reference
 * @property {() => void} [armWeapons] - Arm weapons for targeting
 * @property {() => void} onClickReveal - Handle reveal button click
 * @property {() => void} onClickSingleShotButton - Handle single shot button
 * @property {(letter: string) => void} onClickWeaponButtons - Handle weapon button clicks
 */

/**
 * @typedef {Object} FriendUI
 * @property {() => void} clearFriendClasses - Clear friend UI styling
 */

/** @type {(() => void) | null} */
let cleanupOpponentBoard = null

// ============================================================================
// HELPER FUNCTIONS & UTILITIES
// ============================================================================

/**
 * Validate coordinates are within board bounds.
 * Extracted to reduce code duplication across multiple functions.
 * @private
 * @param {BoardMap} boardMap - The game board
 * @param {number} row - Row coordinate
 * @param {number} col - Column coordinate
 * @returns {boolean} True if coordinates are in bounds
 */
function _isInBounds (boardMap, row, col) {
  return boardMap.inBounds(row, col)
}

/**
 * Retrieve the active loadout coordinates from a model.
 * Extracts the weapon targeting point set with preference for selected coordinates.
 * @private
 * @param {EnemyGameState} model - Enemy game state
 * @returns {Array<Array<number>>} Array of [row, col] coordinates or empty array
 */
function _getTargetingCoordinates (model) {
  const loadOut = model.loadOut
  if (!loadOut) return []

  return loadOut.selectedCoordinates || loadOut.coordinates || []
}

/**
 * Retrieve the currently active weapon from a model's loadout.
 * Checks selected weapon first, then falls back to current weapon system.
 * @private
 * @param {EnemyGameState} model - Enemy game state
 * @returns {Weapon | undefined} Active weapon or undefined
 */
function _getActiveWeapon (model) {
  if (!model.loadOut) return undefined

  const { selectedWeapon, getCurrentWeaponSystem } = model.loadOut
  if (selectedWeapon) {
    return selectedWeapon
  }

  const weaponSystem = getCurrentWeaponSystem?.()
  return weaponSystem?.weapon
}

/**
 * Collect all splash area of effect cells for a weapon.
 * Filters out-of-bounds cells and returns valid splash cells.
 * @private
 * @param {Weapon} weapon - The weapon being applied
 * @param {BoardMap} boardMap - The game board
 * @param {Array<Array<number>>} targetCoordinates - Target positions
 * @returns {Array<SplashCell>} Filtered splash cells within bounds
 */
function _getSplashCellsInBounds (weapon, boardMap, targetCoordinates) {
  const splashCells = weapon.splashAoe(boardMap, targetCoordinates)
  return splashCells.filter(([cellRow, cellCol]) =>
    _isInBounds(boardMap, cellRow, cellCol)
  )
}

/**
 * Calculate whether a weapon can be applied to target coordinates.
 * Validates that enough targeting points have been selected.
 * @private
 * @param {Weapon} weapon - Weapon to validate
 * @param {Array<Array<number>>} targetCoordinates - Selected target coordinates
 * @returns {boolean} True if weapon has sufficient targeting points
 */
function _canApplyWeapon (weapon, targetCoordinates) {
  return weapon && weapon.points <= targetCoordinates.length
}

// ============================================================================
// BOARD HIGHLIGHTING LOGIC
// ============================================================================

/**
 * Encapsulates area of effect highlighting for weapon preview.
 * Manages visual feedback for weapon targeting on the opponent board.
 * @private
 */
class BoardHighlighter {
  /**
   * Initialize the highlighter with UI and board references.
   * @param {EnemyUIModel} boardUI - UI component with cell access and removal methods
   * @param {BoardMap} boardMap - The game board with bounds validation
   */
  constructor (boardUI, boardMap) {
    this.boardUI = boardUI
    this.boardMap = boardMap
  }

  /**
   * Clear any existing area of effect highlights from the board.
   * @private
   */
  _clearExistingHighlights () {
    this.boardUI.removeHighlightAoE()
  }

  /**
   * Apply visual highlighting to splash area of effect cells.
   * Adds CSS classes to cells for weapon effect preview.
   * @private
   * @param {Array<SplashCell>} splashCells - Cells to highlight
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
   * Updates visual preview showing weapon splash damage.
   * @param {Weapon} weapon - Weapon to display effect for
   * @param {Array<Array<number>>} targetCoordinates - Targeting coordinate array
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
 * This sets which player is in the hidden position and affects board display.
 * @private
 * @param {boolean} isSeekingMode - True if player is seeking/hunting
 */
function _initializeGameMode (isSeekingMode) {
  bh.seekingMode = isSeekingMode
}

/**
 * Clear opponent ships when starting a seeking game.
 * In seeking mode, opponent ships start hidden and are revealed as player scores hits.
 * @private
 * @param {boolean} isSeekingMode - True if player is seeking
 */
function _clearOpponentShipsIfSeeking (isSeekingMode) {
  if (isSeekingMode) {
    enemy.ships = []
  }
}

/**
 * Update the enemy board title with current terrain name.
 * Provides context about which game board is being displayed.
 * @private
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
 *
 * REGRESSION PREVENTION NOTE:
 * In Hide mode, the opponent (Friend) has visible ships and attached weapons.
 * Weapons must be armed so two-click targeting works correctly.
 * This is independent of bh.seekingMode logic (see critical note below).
 *
 * @private
 * @param {(() => void) | null} opponentBoardCleanup - Cleanup function for previous board
 * @param {FriendUI | null} friendUI - Friend player UI (if in hide mode)
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
 * Must be called after resetModel to ensure clean state.
 * @private
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
 * @private
 * @param {boolean} isSeekingMode - True if player is seeking/hunting
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
 * @private
 */
function _setupWeaponButtonHandlers () {
  enemy.setupWeaponButtonHandlers()
}

/**
 * Start a new game, resetting game state and initializing all subsystems.
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
 * @param {string} seek - Game mode indicator: 'seek' for seeking, other for hiding mode
 * @param {(() => void) | null} opponentBoard - Cleanup function for previous board
 * @param {FriendUI | null} friendUI - Friend player UI (if available)
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
  _setupWeaponButtonHandlers()
}

/**
 * Create a hover handler for area of effect highlighting.
 * Factory function that returns a handler for board hover events.
 * This handler updates the weapon effect preview as the cursor moves.
 * @private
 * @param {EnemyGameState} model - Enemy game state with loadout and UI
 * @param {number} cellRow - Current cursor row position
 * @param {number} cellCol - Current cursor column position
 */
function _createAreaOfEffectHighlighter (model, cellRow, cellCol) {
  const boardMap = bh.map

  // Validate cursor position
  if (!_isInBounds(boardMap, cellRow, cellCol)) {
    return
  }

  // Get targeting data from model
  const boardUI = model.UI
  const targetingCoordinates = _getTargetingCoordinates(model)
  const activeWeapon = _getActiveWeapon(model)

  // Prepare full target coordinate list including cursor position
  const fullTargetCoordinates = [...targetingCoordinates, [cellRow, cellCol]]

  // Use highlighter to display weapon effect preview
  const highlighter = new BoardHighlighter(boardUI, boardMap)
  highlighter.highlightWeaponEffect(activeWeapon, fullTargetCoordinates)
}

/**
 * Highlight the area of effect for the currently selected weapon.
 * Called when the user hovers over the opponent board to preview weapon effects.
 *
 * This is the entry point for hover-based weapon preview updates.
 * It validates board state and delegates highlighting to BoardHighlighter.
 *
 * @param {EnemyGameState} model - Enemy game state containing loadout and UI
 * @param {number} cellRow - Row coordinate of cursor hover position
 * @param {number} cellCol - Column coordinate of cursor hover position
 */

/**
 * @typedef {(event: KeyboardEvent) => void} KeyboardHandler
 */

/**
 * Build keyboard shortcut handlers for seek mode gameplay.
 * Supports placement, testing, reveal, and weapon selection hotkeys.
 * @private
 * @param {Function} placementHandler - Handler for placement mode toggle
 * @param {Function} testHandler - Handler for test mode toggle
 * @returns {Object<string, KeyboardHandler>} Map of keys to handler functions
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
 * Registers and activates shortcut handlers; returns cleanup function.
 * @private
 * @param {Function | undefined} placementHandler - Handler for placement mode
 * @param {Function | undefined} testHandler - Handler for test mode
 * @returns {() => void} Cleanup function to deactivate shortcuts
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
 * Guards against null elements and non-function handlers.
 * @private
 * @param {HTMLElement | null} element - DOM element to attach handler to
 * @param {EventListener | undefined} handler - Click event handler function
 */
function _attachClickHandler (element, handler) {
  if (element?.addEventListener && typeof handler === 'function') {
    element.addEventListener('click', /** @type {EventListener} */ (handler))
  }
}

/**
 * Setup the enemy game UI and event handlers.
 * Initializes button handlers and keyboard shortcuts for gameplay.
 *
 * EXECUTION ORDER:
 * 1. Refresh UI button states
 * 2. Wire up restart button
 * 3. Wire up all standard buttons
 * 4. Wire up placement and test buttons
 * 5. Initialize keyboard shortcuts
 *
 * @param {Function} placementHandler - Callback for entering placement mode
 * @param {Function} testHandler - Callback for entering test mode
 * @returns {() => void} Cleanup function to deactivate keyboard shortcuts
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
