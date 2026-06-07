import { bh } from '../terrains/all/js/bh.js'
import { enemy } from '../waters/enemy.js'
import { KeyboardShortcutManager } from './KeyboardShortcutManager.js'
import { GridBoard } from '../waters/gridBoard.js'

/**
 * @fileoverview
 * Enemy board setup and interaction management for hide-and-seek gameplay.
 *
 * Orchestrates all aspects of enemy (opponent) player configuration:
 * - Board initialization with terrain and targeting state
 * - Weapon effect preview and highlighting during hover
 * - Keyboard shortcuts for rapid game control
 * - Button event wiring for mode transitions
 *
 * Architecture Pattern:
 * - ModelAccessor: Extracts data from game state with fallback hierarchies
 * - BoardHighlighter: Manages visual feedback for weapon targeting
 * - BoardInitializer: Phases initialization in correct order
 * - Helper functions: Single-purpose utilities for event handling
 *
 * Key Concepts:
 * - Stateless components: Data passed as parameters, not stored
 * - Separation of concerns: Each class/object has single responsibility
 * - Two-click targeting: Hover shows preview, click confirms placement
 * - Seeking mode: Player attacks opponent's hidden ships
 * - Hiding mode: Player defends against opponent's attacks
 *
 * @example
 * // Initialize a new game in seeking mode
 * newGame('seek', previousCleanup, friendUI);
 * setupEnemy(placementHandler, testHandler);
 */

/**
 * @typedef {import('./types/domain.types.js').Coordinate} Coordinate
 * @typedef {import('./types/domain.types.js').SplashCell} SplashCell
 * @typedef {import('./types/domain.types.js').BoardMap} BoardMap
 * @typedef {import('./types/domain.types.js').Weapon} Weapon
 * @typedef {import('./types/domain.types.js').WeaponSystem} WeaponSystem
 * @typedef {import('./types/form.types.js').FormState} LoadOutModel
 *
 * @typedef {Object} EnemyLoadOut
 * @description Weapon and targeting configuration for opponent player.
 *              Captures both automatic (weapon-defined) and manual (player-selected) targeting.
 * @property {Array<Array<number>>} [selectedCoordinates] - Player-selected targeting coordinates.
 *                                                         Array of [row, col] pairs entered in two-click mode.
 *                                                         Takes precedence over automatic coordinates.
 * @property {Array<Array<number>>} [coordinates] - Default targeting coordinates from weapon system.
 *                                                 Computed automatically from weapon's attack pattern.
 *                                                 Used when selectedCoordinates not provided.
 * @property {Object} [selectedWeapon] - Selected weapon wrapper object.
 *                                      Contains weapon and metadata about selection.
 * @property {Weapon} [selectedWeapon.weapon] - Active weapon instance.
 *                                             Preferred structure for weapon reference.
 * @property {WeaponSystem} [currentWeaponSystem] - Active weapon system with weapon property.
 *                                               Fallback reference if selectedWeapon not set.

 *
 * @typedef {Object} EnemyGameState
 * @description Complete game state for opponent player during hide-and-seek match.
 *              Combines loadout configuration with UI state and targeting state.
 * @property {EnemyLoadOut} [loadOut] - Weapon and targeting loadout model.
 *                                     Contains selected weapon and targeting coordinates.
 * @property {Object} [selectedCellCoordinates] - Selected target cell in two-click mode.
 *                                              Used to build multi-point targeting (missiles, etc).
 * @property {number} [selectedCellCoordinates.r] - Row coordinate (0-based).
 * @property {number} [selectedCellCoordinates.c] - Column coordinate (0-based).
 * @property {EnemyUIModel} [UI] - Enemy UI component reference.
 *                                Provides board element access and event handlers.
 *
 * @typedef {Object} EnemyUIModel
 * @description UI element references and handlers for enemy board interaction.
 *              Manages visual display, highlighting, and user input routing.
 * @property {Object} board - Board DOM element for weapon effect styling.
 *                           Root element receiving highlight classes.
 * @property {HTMLElement} [weaponBtn] - Single weapon button reference (deprecated).
 *                                      Legacy field, use weaponBtns instead.
 * @property {Object<string, HTMLElement>} [weaponBtns] - Map of weapon letters to button elements.
 *                                                       Keys are single-letter weapon IDs (e.g., 'A', 'B').
 *                                                       Values are clickable button elements.
 * @property {() => void} removeHighlightAoE - Clear weapon effect highlights.
 *                                            Removes all 'target' and power-level classes.
 *                                            Called before updating highlights.
 * @property {(callback: (model: EnemyGameState, cellRow: number, cellCol: number) => void, clearCallback: () => void, ui: EnemyUIModel, model: EnemyGameState) => void} buildBoardHover - Configure hover handlers.
 *                                                                                                                                                                   Sets up callbacks for board mouse movement.
 *                                                                                                                                                                   Invokes callback for each hover cell.
 * @property {Object} [buttons] - Container for named UI buttons.
 *                               Maps button role to DOM element.
 * @property {HTMLElement} [buttons.restart] - Restart button element.
 *                                            Labeled 'Restart' or similar.
 * @property {HTMLElement} [buttons.place] - Placement mode button element.
 *                                          Transitions to ship placement phase.
 * @property {HTMLElement} [buttons.test] - Test mode button element.
 *                                         Transitions to test/practice phase.
 * @property {() => void} [refreshButtons] - Refresh button states.
 *                                          Re-enables/disables buttons based on game phase.
 *
 * @typedef {Object} FriendUI
 * @description UI reference for friendly player's board (used in hide mode).
 *              Manages visual state specific to defending player.
 
 * @typedef {(event: KeyboardEvent) => void} KeyboardHandler
 * @description Callback invoked when keyboard shortcut is pressed.
 *              Parameters: event (KeyboardEvent, may not be passed for programmatic calls).
 * @typedef {(event: Event) => void} EventListener
 * @typedef {() => void} CleanupHandler
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Game mode identifier for seeking mode */
const GAME_MODE_SEEK = 'seek'

/** Keyboard shortcut keys mapping */
const KEYBOARD_SHORTCUTS = {
  PLACEMENT: 'p',
  TEST: 't',
  RESTART: 'r',
  REVEAL: 'q',
  SINGLE_SHOT: 's'
}
// ============================================================================
// GLOBAL STATE
// ============================================================================

/**
 * Cleanup function reference for opponent board state.
 * Stores the cleanup callback from previous board initialization.
 * @type {CleanupHandler | null}
 * @private
 */
let cleanupOpponentBoard = null

// ============================================================================
// COORDINATE AND BOUNDS VALIDATION
// ============================================================================

/**
 * Validate coordinates are within board bounds.
 *
 * @private
 * @param {BoardMap} boardMap - Game board with inBounds validation.
 * @param {number} row - Row coordinate (0-based).
 * @param {number} col - Column coordinate (0-based).
 * @returns {boolean} True if coordinates are in bounds.
 */
function isCoordinateInBounds (boardMap, row, col) {
  return boardMap.inBounds(row, col)
}

/**
 * Filter coordinates to keep only those within bounds.
 *
 * @private
 * @param {BoardMap} boardMap - Game board with inBounds validation.
 * @param {Array<Array<number>>} coordinates - Array of [row, col] pairs.
 * @returns {Array<Array<number>>} Filtered coordinates within bounds.
 */
function filterCoordinatesInBounds (boardMap, coordinates) {
  return coordinates.filter(([row, col]) =>
    isCoordinateInBounds(boardMap, row, col)
  )
}

// ============================================================================
// MODEL ACCESSOR (SINGLE RESPONSIBILITY: Extract data from game state)
// ============================================================================

/**
 * Accessor object for extracting data from enemy game state.
 * Encapsulates fallback hierarchy for weapon/coordinate retrieval.
 * Reduces duplication and centralizes extraction logic.
 * @private
 */
const ModelAccessor = {
  /**
   * Get targeting coordinates with preference hierarchy.
   * 1. selectedCoordinates (manual selection)
   * 2. coordinates (automatic weapon pattern)
   * 3. [] (no coordinates)
   *
   * @param {EnemyGameState} model - Enemy game state.
   * @returns {Array<Array<number>>} Target coordinate pairs.
   */
  getTargetingCoordinates (model) {
    const m = /** @type {any} */ (model)
    if (!m?.loadOut) return []
    return m.loadOut.selectedCoordinates || m.loadOut.coordinates || []
  },

  /**
   * Get active weapon with fallback hierarchy.
   * 1. selectedWeapon.weapon (preferred structure)
   * 2. selectedWeapon (direct reference)
   * 3. currentWeaponSystem.weapon (system fallback)
   * 4. undefined (not available)
   *
   * @param {EnemyGameState} model - Enemy game state.
   * @returns {Weapon | undefined} Active weapon or undefined.
   */
  getActiveWeapon (model) {
    const m = /** @type {any} */ (model)
    if (!m?.loadOut) return undefined

    const selectedWeapon = m.loadOut.selectedWeapon
    if (selectedWeapon) {
      return selectedWeapon.weapon || selectedWeapon
    }

    return m.loadOut.currentWeaponSystem?.weapon
  },

  /**
   * Get splash area of effect cells, filtered to board bounds.
   *
   * @param {Weapon} weapon - Weapon with splashAoe method.
   * @param {BoardMap} boardMap - Game board for bounds validation.
   * @param {Array<Array<number>>} targetCoordinates - Targeting points.
   * @returns {Array<SplashCell>} Splash cells within bounds.
   */
  getSplashCellsInBounds (weapon, boardMap, targetCoordinates) {
    const splashCells = weapon.splashAoe(boardMap, targetCoordinates)
    // Convert readonly array to mutable for filtering
    const coords = /** @type {Array<Array<number>>} */ (
      Array.from(splashCells).map(cell => [cell[0], cell[1], cell[2]])
    )
    const result = filterCoordinatesInBounds(boardMap, coords)
    return /** @type {Array<SplashCell>} */ (/** @type {unknown} */ (result))
  },

  /**
   * Check if weapon can be applied with current targeting points.
   * Weapon.points defines minimum required targeting points.
   *
   * @param {Weapon | undefined} weapon - Weapon to validate.
   * @param {Array<Array<number>>} targetCoordinates - Targeting points.
   * @returns {boolean} True if weapon exists and has sufficient points.
   */
  canApplyWeapon (weapon, targetCoordinates) {
    return !!weapon && weapon.points <= targetCoordinates.length
  },

  /**
   * Get preview coordinates for weapon effect hover display.
   * Combines targeting points with current cursor position.
   * Implements fallback: targetCoordinates > selectedCell > cursor alone.
   *
   * @param {EnemyGameState} model - Enemy game state.
   * @param {number} cellRow - Current cursor row.
   * @param {number} cellCol - Current cursor column.
   * @returns {Array<Array<number>>} Preview coordinate pairs.
   */
  getPreviewTargetingCoordinates (model, cellRow, cellCol) {
    const m = /** @type {any} */ (model)
    const targetingCoordinates = this.getTargetingCoordinates(m)
    if (targetingCoordinates.length > 0) {
      return [...targetingCoordinates, [cellRow, cellCol]]
    }

    const selectedCell = m?.selectedCellCoordinates
    if (selectedCell) {
      return [
        [selectedCell.r, selectedCell.c],
        [cellRow, cellCol]
      ]
    }

    return [[cellRow, cellCol]]
  }
}

// ============================================================================
// BOARD HIGHLIGHTING (SINGLE RESPONSIBILITY: Visual feedback for targeting)
// ============================================================================

/**
 * Manages area of effect highlighting for weapon preview on opponent board.
 *
 * Provides visual feedback showing weapon splash damage pattern and intensity.
 * Stateless highlighter: all state passed as parameters.
 *
 * Responsibilities:
 * - Clear previous weapon highlights (removeHighlightAoE)
 * - Apply power-level-based CSS classes to splash cells
 * - Validate weapon applicability before highlighting
 *
 * Pattern:
 * - Constructor captures UI and board references once
 * - Each highlightWeaponEffect call independently computes splash area
 * - No persistent state between calls; all data passed as parameters
 *
 * @class BoardHighlighter
 * @private
 *
 * @example
 * const highlighter = new BoardHighlighter(enemyUI, bh.map);
 * highlighter.highlightWeaponEffect(weapon, targetCoordinates);
 */
class BoardHighlighter {
  /**
   * Initialize highlighter with UI and board references.
   *
   * Captures board interaction interfaces needed for highlighting.
   * Runs once per board; reused for multiple highlight operations.
   *
   * @constructor
   * @param {EnemyUIModel} boardUI - UI with grid.nodeAt() and removeHighlightAoE() methods.
   *                                 Provides element access for applying styles.
   * @param {BoardMap} boardMap - Board for bounds validation.
   *                              Ensures splash cells stay within playable area.
   */
  constructor (boardUI, boardMap) {
    this.boardUI = /** @type {EnemyUIModel} */ (boardUI)
    this.boardMap = /** @type {BoardMap} */ (boardMap)
  }

  /**
   * Clear existing weapon effect highlights from board.
   *
   * Removes all previously applied splash zone styling.
   * Called before applying new highlights to prevent overlay.
   *
   * @returns {void}
   */
  #clearExistingHighlights () {
    const ui = /** @type {any} */ (this.boardUI)
    ui?.grid?.removeHighlightAoE?.()
  }

  /**
   * Apply CSS highlighting to splash area cells.
   *
   * Iterates splash cells and adds CSS classes for visual display.
   * Classes applied:
   * - Power-level-based class (e.g., 'power-1', 'power-2') from bh.splashTags[powerLevel]
   * - 'target' class for unified styling and easy removal
   *
   * @param {Array<SplashCell>} splashCells - [row, col, powerLevel] cells.
   *                                         PowerLevel determines color intensity (0-n).
   * @returns {void}
   */
  #applyHighlightsToCells (splashCells) {
    const ui = /** @type {any} */ (this.boardUI)
    const bhRef = /** @type {any} */ (bh)
    for (const [y, x, powerLevel] of splashCells) {
      const cell = ui?.grid.nodeAt(x, y)
      const cellClass = bhRef?.splashTags?.[powerLevel]
      if (cell && cellClass) cell.classList.add(cellClass, 'target')
    }
  }

  /**
   * Highlight weapon effect at target coordinates.
   *
   * Complete highlight operation: clears previous, validates weapon, applies new.
   * Implements fail-safe: exits early if weapon invalid or missing coordinates.
   * No highlighting applied unless weapon.points ≤ targetCoordinates.length.
   *
   * @public
   * @param {Weapon | undefined} weapon - Weapon to display.
   *                                     If undefined, only clears highlights.
   * @param {Array<Array<number>>} targetCoordinates - Targeting points.
   *                                                 Array of [row, col] pairs.
   * @returns {void}
   *
   * @example
   * highlighter.highlightWeaponEffect(activeWeapon, [[5, 5], [5, 6]]);
   */
  highlightWeaponEffect (weapon, targetCoordinates) {
    this.#clearExistingHighlights()

    if (!weapon || !ModelAccessor.canApplyWeapon(weapon, targetCoordinates)) {
      return
    }

    const splashCells = ModelAccessor.getSplashCellsInBounds(
      weapon,
      this.boardMap,
      targetCoordinates
    )
    this.#applyHighlightsToCells(splashCells)
  }
}

/**
 * Create area of effect highlighter for weapon preview.
 * Internal handler called during board hover to update visualization.
 * Delegates to BoardHighlighter after validation.
 *
 * @private
 * @param {EnemyGameState} model - Enemy game state with UI and loadOut.
 * @param {number} cellRow - Current cursor row (0-based).
 * @param {number} cellCol - Current cursor column (0-based).
 * @returns {void}
 */
function _createAreaOfEffectHighlighter (model, cellRow, cellCol) {
  const m = /** @type {any} */ (model)
  const boardMap = /** @type {BoardMap} */ (/** @type {any} */ (bh)?.map)

  // Validate cursor position
  if (!isCoordinateInBounds(boardMap, cellRow, cellCol)) {
    return
  }

  // Get targeting data
  const boardUI = m?.UI
  if (!boardUI) return

  const activeWeapon = ModelAccessor.getActiveWeapon(m)
  const fullTargetCoordinates = ModelAccessor.getPreviewTargetingCoordinates(
    m,
    cellRow,
    cellCol
  )

  // Apply highlighting
  const highlighter = new BoardHighlighter(boardUI, boardMap)
  highlighter.highlightWeaponEffect(activeWeapon, fullTargetCoordinates)
}

// ============================================================================
// BOARD INITIALIZATION (SINGLE RESPONSIBILITY: Set up game state)
// ============================================================================

/**
 * Encapsulates board initialization logic.
 *
 * Manages initialization phases in correct order: mode, state, UI, interaction.
 * Reduces complexity of newGame() function by delegating setup phases.
 *
 * Separation of Concerns:
 * - initializeGameMode: Set game visibility/mode flags
 * - updateBoardTitle: Update UI to show terrain
 * - initializeOpponentBoard: Setup opponent board with cleanup lifecycle
 * - configureBoardHover: Enable weapon preview on hover
 * - configureBoardTargeting: Set attack/defense interaction mode
 *
 * Lifecycle:
 * - Stateless methods; all context passed as parameters
 * - Called in strict order by newGame()
 * - No dependency on instance state; all state is in bh or enemy globals
 *
 * @example
 * BoardInitializer.initializeGameMode(true);      // Seeking mode
 * BoardInitializer.updateBoardTitle();
 * BoardInitializer.initializeOpponentBoard(...);
 */
/** @type {Object<string, Function>} */
const BoardInitializer = {
  /**
   * Initialize game visibility state and opponent ship clearing.
   *
   * Sets global game mode flag (bh.seekingMode) for game logic routing.
   * In seeking mode, clears opponent ships so player must find them.
   * In hiding mode, keeps opponent ships placed (player defends).
   *
   * @param {boolean} isSeekingMode - True if player is seeking opponent ships.
   *                                 False if player is hiding (defending).
   * @returns {void}
   *
   * @example
   * BoardInitializer.initializeGameMode(true);  // Start seek phase
   */
  initializeGameMode (isSeekingMode) {
    const bhRef = /** @type {any} */ (bh)
    bhRef.seekingMode = isSeekingMode
    if (isSeekingMode) {
      const enemyRef = /** @type {any} */ (enemy)
      enemyRef.ships = []
    }
  },

  /**
   * Update opponent board title with current terrain.
   *
   * Reads terrain name from bh.terrain.mapHeading and displays
   * "Enemy " + name in the UI title element.
   * Provides visual context for which board/terrain is active.
   *
   * @returns {void}
   *
   * @example
   * BoardInitializer.updateBoardTitle();  // Sets to "Enemy Coastal Waters"
   */
  updateBoardTitle () {
    const titleElement = document.getElementById('enemy-title')
    if (titleElement) {
      const bhRef = /** @type {any} */ (bh)
      titleElement.textContent = 'Enemy ' + bhRef?.terrain?.mapHeading
    }
  },

  /**
   * Initialize or cleanup opponent board.
   *
   * Two-phase lifecycle pattern:
   * 1. First call: stores cleanup function for later execution
   * 2. Second call: executes stored cleanup, returns control
   *
   * This pattern allows new games to:
   * - Execute previous game's cleanup (tear down old board state)
   * - Setup new board (initialize new state)
   * - Store cleanup for next game transition
   *
   * Handles Friend board initialization in hiding mode:
   * - Clears friend-specific CSS classes
   * - Arms opponent weapons for two-click targeting
   *
   * @param {CleanupHandler | null} opponentBoardCleanup - Cleanup function from previous board.
   *                                                      Called on next newGame() to tear down.
   * @param {FriendUI | null} friendUI - Friend UI reference (hiding mode only).
   *                                    Null in seeking mode.
   * @returns {void}
   *
   * @example
   * // First call: store cleanup
   * BoardInitializer.initializeOpponentBoard(myCleanup, friendUI);
   * // Later call: execute stored cleanup
   * BoardInitializer.initializeOpponentBoard(myCleanup, friendUI);
   */
  initializeOpponentBoard (opponentBoardCleanup, friendUI) {
    // Execute previous cleanup if stored
    if (cleanupOpponentBoard) {
      cleanupOpponentBoard()
      return
    }

    // Initialize Friend board if provided
    if (opponentBoardCleanup && friendUI) {
      cleanupOpponentBoard = opponentBoardCleanup
      const friendUIRef = /** @type {any} */ (friendUI)
      friendUIRef.grid.clearFriendClasses?.()
      // Arm opponent weapons for two-click targeting in hide mode
      const enemyRef = /** @type {any} */ (enemy)
      enemyRef.opponent?.armWeapons()
    }
  },

  /**
   * Configure board hover behavior for weapon effect preview.
   *
   * Sets up hover handlers via GridBoard.addHover.
   * When player hovers over opponent board, shows weapon splash pattern.
   * Provides immediate visual feedback before committing to attack.
   *
   * @returns {void}
   *
   * @example
   * BoardInitializer.configureBoardHover();  // Enable weapon preview
   */
  configureBoardHover () {
    const enemyRef = /** @type {any} */ (enemy)
    const enemyUI = enemyRef?.UI
    const boardMap = /** @type {any} */ (bh)?.map
    GridBoard.addHover(
      enemyUI?.board,
      boardMap,
      _createAreaOfEffectHighlighter,
      enemyUI?.grid?.removeHighlightAoE,
      enemyUI,
      enemyRef
    )
  },

  /**
   * Configure board targeting behavior based on game mode.
   *
   * Delegates to enemy.setBoardTargetingState() to route interaction
   * based on seeking/hiding mode:
   * - Seeking mode: enable attack (click to fire)
   * - Hiding mode: enable defense (click to defend)
   *
   * @param {boolean} isSeekingMode - True if player is seeking.
   *                                 False if player is hiding.
   * @returns {void}
   *
   * @example
   * BoardInitializer.configureBoardTargeting(true);  // Setup attack mode
   */
  configureBoardTargeting (isSeekingMode) {
    const enemyRef = /** @type {any} */ (enemy)
    enemyRef.setBoardTargetingState(isSeekingMode)
  }
}

/**
 * Start a new game, resetting state and initializing all subsystems.
 *
 * Orchestrates initialization sequence in proper order:
 * 1. Set bh.seekingMode and clear opponent ships if seeking
 * 2. Reset game state via enemy.resetModel()
 * 3. Update UI title
 * 4. Initialize opponent board
 * 5. Configure board hover behavior
 * 6. Configure board targeting state
 * 7. Setup weapon button handlers
 *
 * This function is the entry point for game transitions.
 * Called when starting new game in either seeking (attack) or hiding (defense) mode.
 *
 * Game Modes:
 * - Seeking: Player attacks opponent's hidden ships
 *   - Opponent ships cleared, player must find them
 *   - Board shows weapon preview on hover
 *   - Click to fire at target coordinates
 * - Hiding: Player defends against opponent's attacks
 *   - Player's ships are hidden, shown during gameplay
 *   - Opponent can fire; player sees splash patterns
 *   - Board interactive for counter-attacks
 *
 * @public
 * @param {string} seek - Mode identifier: 'seek' for seeking mode, other for hiding.
 *                       Determines game behavior and ship visibility.
 * @param {CleanupHandler | null} opponentBoard - Cleanup function from previous board.
 *                                               Stored for next game transition.
 *                                               Null for first game.
 * @param {FriendUI | null} friendUI - Friend UI reference for hiding mode.
 *                                    Contains grid.clearFriendClasses() for UI cleanup.
 *                                    Null in seeking mode.
 * @returns {void}
 *
 * @example
 * // Start seeking game (attack opponent)
 * newGame('seek', previousCleanup, null);
 *
 * @example
 * // Start hiding game (defend against opponent)
 * newGame('hide', previousCleanup, friendUIRef);
 */
export function newGame (seek, opponentBoard, friendUI) {
  const isSeekingMode = seek === GAME_MODE_SEEK

  // Phase 1: Game mode setup
  BoardInitializer.initializeGameMode(isSeekingMode)

  // Phase 2: Reset core state
  const enemyRef = /** @type {any} */ (enemy)
  enemyRef.resetModel()
  BoardInitializer.updateBoardTitle()

  // Phase 3: Board initialization
  BoardInitializer.initializeOpponentBoard(opponentBoard, friendUI)
  BoardInitializer.configureBoardHover()

  // Phase 4: Configure interaction
  BoardInitializer.configureBoardTargeting(isSeekingMode)
  enemyRef.setupWeaponButtonHandlers()
}

// ============================================================================
// KEYBOARD SHORTCUTS (SINGLE RESPONSIBILITY: Input handling)
// ============================================================================

/**
 * Build keyboard shortcut map for seek mode.
 *
 * Dynamically adds weapon shortcuts from UI button elements.
 * Creates a mapping from keyboard keys to their handler functions.
 *
 * Static Shortcuts (always registered):
 * - 'p': Placement mode handler
 * - 't': Test mode handler
 * - 'r': Restart game (new game in seek mode)
 * - 'q': Reveal opponent ships (cheat/debug)
 * - 's': Single shot button
 *
 * Dynamic Shortcuts (from weapon buttons):
 * - Each weapon button's data-letter attribute becomes a shortcut key
 * - e.g., weapon button with data-letter="A" → press 'a' to select weapon
 * - Invokes enemy.onClickWeaponButtons(letter) with uppercase letter
 *
 * @private
 * @param {CleanupHandler | undefined} placementHandler - Placement mode handler.
 *                                                      Called when player presses 'p'.
 * @param {CleanupHandler | undefined} testHandler - Test mode handler.
 *                                                 Called when player presses 't'.
 * @returns {Object<string, KeyboardHandler>} Map of keys to handlers.
 *                                           Ready for KeyboardShortcutManager.registerShortcuts().
 *
 * @example
 * const shortcuts = buildSeekModeShortcuts(
 *   () => enterPlacementMode(),
 *   () => enterTestMode()
 * );
 * // Result: { p: ..., t: ..., r: ..., q: ..., s: ..., a: ..., b: ..., ... }
 */
function buildSeekModeShortcuts (placementHandler, testHandler) {
  const shortcuts = {
    [KEYBOARD_SHORTCUTS.PLACEMENT]: () => placementHandler?.(),
    [KEYBOARD_SHORTCUTS.TEST]: () => testHandler?.(),
    [KEYBOARD_SHORTCUTS.RESTART]: () => newGame(GAME_MODE_SEEK, () => {}, null),
    [KEYBOARD_SHORTCUTS.REVEAL]: () => {
      const enemyRef = /** @type {any} */ (enemy)
      enemyRef.onClickReveal?.()
    },
    [KEYBOARD_SHORTCUTS.SINGLE_SHOT]: () => {
      const enemyRef = /** @type {any} */ (enemy)
      enemyRef.onClickSingleShotButton?.()
    }
  }

  // Dynamically register weapon shortcuts
  const enemyUI = /** @type {any} */ (enemy)['UI']
  const weaponButtons = enemyUI?.['weaponBtns'] || {}
  for (const button of Object.values(weaponButtons)) {
    const letter = /** @type {any} */ (button)?.['dataset']?.['letter']
    if (letter) {
      shortcuts[letter.toLowerCase()] = () => {
        const enemyRef = /** @type {any} */ (enemy)
        enemyRef.onClickWeaponButtons?.(letter)
      }
    }
  }

  return shortcuts
}

/**
 * Initialize keyboard shortcuts for seek mode.
 *
 * Creates keyboard shortcut manager, registers all shortcuts,
 * activates listening, and returns cleanup function.
 *
 * Called once per game to setup keyboard input handling.
 * Returned cleanup function must be called to disable shortcuts
 * when transitioning away from seeking mode.
 *
 * @private
 * @param {CleanupHandler | undefined} placementHandler - Placement mode handler.
 *                                                      Called when player presses 'p'.
 * @param {CleanupHandler | undefined} testHandler - Test mode handler.
 *                                                 Called when player presses 't'.
 * @returns {CleanupHandler} Cleanup function to deactivate shortcuts.
 *                          Call this to stop listening for keyboard input.
 *
 * @example
 * const cleanup = initializeSeekModeShortcuts(onPlace, onTest);
 * // ... player uses shortcuts ...
 * cleanup();  // Stop listening for shortcuts
 */
function initializeSeekModeShortcuts (placementHandler, testHandler) {
  const shortcutManager = new KeyboardShortcutManager()
  const shortcuts = buildSeekModeShortcuts(placementHandler, testHandler)

  shortcutManager.registerShortcuts(shortcuts)
  shortcutManager.activate()

  return () => shortcutManager.deactivate()
}

// ============================================================================
// UI EVENT WIRING (SINGLE RESPONSIBILITY: Connect handlers to elements)
// ============================================================================

/**
 * Safely attach click handler to element if both exist and handler is valid.
 *
 * Defensive programming: checks for element existence and handler validity
 * before attaching event listener. Uses optional chaining to prevent runtime errors.
 * Includes explicit type assertion for handler to help IDE type checking.
 *
 * Only attaches listener if:
 * - element is not null/undefined AND has addEventListener method
 * - handler is a function (not undefined or null)
 *
 * @private
 * @param {HTMLElement | null} element - DOM element to attach handler to.
 *                                      May be null if element not found.
 * @param {EventListener | undefined} handler - Click event handler.
 *                                            May be undefined if handler not provided.
 * @returns {void} No return value; performs side effect of attaching listener.
 *
 * @example
 * // Safely attach with fallback to null
 * _attachClickHandler(document.getElementById('btn'), () => { ... });
 * // Safe even if element or handler is null/undefined
 */
function _attachClickHandler (element, handler) {
  const elem = /** @type {any} */ (element)
  if (elem?.addEventListener && typeof handler === 'function') {
    elem.addEventListener('click', /** @type {EventListener} */ (handler))
  }
}

/**
 * Wire up all button click handlers for game UI.
 *
 * Attaches handlers to restart, placement, and test buttons.
 * Refreshes button visual states. Sets up keyboard shortcuts.
 *
 * Execution order:
 * 1. Refresh button enabled/disabled states
 * 2. Setup restart button (new game in seek mode)
 * 3. Wire opponent control buttons via enemy.wireupButtons()
 * 4. Setup mode toggle buttons (placement, test)
 * 5. Initialize keyboard shortcuts
 *
 * Returns cleanup function that must be called to cleanup keyboard listeners
 * when transitioning to different game phase.
 *
 * @private
 * @param {CleanupHandler | undefined} placementHandler - Placement mode handler.
 *                                                      Called on 'place' button or 'p' key.
 * @param {CleanupHandler | undefined} testHandler - Test mode handler.
 *                                                 Called on 'test' button or 't' key.
 * @returns {CleanupHandler} Cleanup function for keyboard shortcuts.
 *                          Must be called to deactivate keyboard listeners.
 *
 * @example
 * const cleanup = _wireUpButtonHandlers(onPlace, onTest);
 * // ... game runs ...
 * cleanup();  // Cleanup when transitioning to next phase
 */
function _wireUpButtonHandlers (placementHandler, testHandler) {
  // Refresh button states
  const enemyRef = /** @type {any} */ (enemy)
  enemyRef.UI?.refreshButtons?.()

  // Wire game control buttons
  const enemyUI = enemyRef.UI
  _attachClickHandler(
    enemyUI?.buttons?.restart,
    newGame.bind(null, GAME_MODE_SEEK, null)
  )
  enemyRef.wireupButtons()

  // Wire mode toggle buttons
  _attachClickHandler(enemyUI?.buttons?.place, placementHandler)
  _attachClickHandler(enemyUI?.buttons?.test, testHandler)

  // Initialize keyboard shortcuts
  return initializeSeekModeShortcuts(placementHandler, testHandler)
}

/**
 * Setup the enemy game UI and event handlers.
 *
 * Initializes button handlers and keyboard shortcuts for gameplay.
 * Entry point that must be called before game begins.
 *
 * After this function returns, the game is ready for:
 * - Keyboard input (shortcuts active)
 * - Button clicks (handlers attached)
 * - Board interaction (hover and click handlers ready)
 *
 * Caller must store returned cleanup function and call it
 * when transitioning to next game phase.
 *
 * Execution phases:
 * 1. Refresh UI button states
 * 2. Wire up button handlers (restart, placement, test)
 * 3. Initialize keyboard shortcuts
 *
 * @public
 * @param {CleanupHandler | undefined} placementHandler - Placement mode callback.
 *                                                      Called when entering placement mode.
 * @param {CleanupHandler | undefined} testHandler - Test mode callback.
 *                                                 Called when entering test mode.
 * @returns {CleanupHandler} Cleanup function to deactivate shortcuts on game end.
 *                          Call this before starting next game phase.
 *
 * @example
 * // Setup UI for gameplay
 * const cleanup = setupEnemy(enterPlacement, enterTest);
 *
 * // ... game phase executes ...
 *
 * // Cleanup when transitioning
 * cleanup();
 */
export function setupEnemy (placementHandler, testHandler) {
  return _wireUpButtonHandlers(placementHandler, testHandler)
}

/**
 * Internal test exports for unit testing private functions.
 *
 * Exposes implementation details for testing purposes only.
 * Should NOT be used in production code.
 *
 * Testing Pattern:
 * - Use __test functions only in unit/integration tests
 * - These are private implementation details; not stable API
 * - May change without notice in future refactoring
 * - Helps test data extraction logic without full game setup
 *
 * EXPORTED FUNCTIONS:
 * - _getActiveWeapon: Extract current weapon from game state
 *   Signature: (model: EnemyGameState) => Weapon | undefined
 *   Used to test weapon fallback hierarchy logic
 *
 * - _getPreviewTargetingCoordinates: Calculate hover preview targets
 *   Signature: (model: EnemyGameState, cellRow: number, cellCol: number) => Array<Array<number>>
 *   Used to test coordinate fallback logic during weapon preview
 *
 * @internal
 * @type {Object<string, Function>}
 * @readonly
 *
 * @example
 * // In test file (NOT in production)
 * import { __test } from './enemySetup.js';
 * const weapon = __test._getActiveWeapon(mockModel);
 * const coords = __test._getPreviewTargetingCoordinates(mockModel, 5, 5);
 */
export const __test = {
  _getActiveWeapon: ModelAccessor.getActiveWeapon.bind(ModelAccessor),
  _getPreviewTargetingCoordinates:
    ModelAccessor.getPreviewTargetingCoordinates.bind(ModelAccessor)
}
