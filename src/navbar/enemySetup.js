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
 * @property {Array<Array<number>>} [selectedCoordinates] - Player-selected targeting coordinates [row, col] pairs.
 * @property {Array<Array<number>>} [coordinates] - Default targeting coordinates from weapon system.
 * @property {Object} [selectedWeapon] - Selected weapon wrapper object.
 * @property {Weapon} [selectedWeapon.weapon] - Active weapon instance.
 * @property {WeaponSystem} [currentWeaponSystem] - Active weapon system with weapon property.
 *
 * @typedef {Object} EnemyGameState
 * @property {EnemyLoadOut} [loadOut] - Weapon and targeting loadout model.
 * @property {Object} [selectedCellCoordinates] - Selected target cell in two-click mode.
 * @property {number} [selectedCellCoordinates.r] - Row coordinate (0-based).
 * @property {number} [selectedCellCoordinates.c] - Column coordinate (0-based).
 * @property {EnemyUIModel} [UI] - Enemy UI component reference.
 *
 * @typedef {Object} EnemyUIModel
 * @property {Object} board - Board DOM element for weapon effect styling.
 * @property {HTMLElement} [weaponBtn] - Single weapon button reference (deprecated).
 * @property {Object<string, HTMLElement>} [weaponBtns] - Map of weapon letters to button elements.
 * @property {(row: number, col: number) => HTMLElement} gridCellAt - Get cell element at coordinates.
 * @property {() => void} removeHighlightAoE - Clear weapon effect highlights.
 * @property {(callback: (model: EnemyGameState, cellRow: number, cellCol: number) => void, clearCallback: () => void, ui: EnemyUIModel, model: EnemyGameState) => void} buildBoardHover - Configure hover handlers.
 * @property {Object} [buttons] - Container for named UI buttons.
 * @property {HTMLElement} [buttons.restart] - Restart button element.
 * @property {HTMLElement} [buttons.place] - Placement mode button element.
 * @property {HTMLElement} [buttons.test] - Test mode button element.
 * @property {() => void} [refreshButtons] - Refresh button states.
 *
 * @typedef {Object} FriendUI
 * @property {() => void} [clearFriendClasses] - Remove friend-specific CSS classes.
 *
 * @typedef {(event: KeyboardEvent) => void} KeyboardHandler
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
    if (!model?.loadOut) return []
    return model.loadOut.selectedCoordinates || model.loadOut.coordinates || []
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
    if (!model?.loadOut) return undefined

    const selectedWeapon = model.loadOut.selectedWeapon
    if (selectedWeapon) {
      return selectedWeapon.weapon || selectedWeapon
    }

    return model.loadOut.currentWeaponSystem?.weapon
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
    return filterCoordinatesInBounds(boardMap, splashCells)
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
    const targetingCoordinates = this.getTargetingCoordinates(model)
    if (targetingCoordinates.length > 0) {
      return [...targetingCoordinates, [cellRow, cellCol]]
    }

    const selectedCell = model?.selectedCellCoordinates
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
 * Provides visual feedback showing weapon splash damage pattern and intensity.
 * Stateless highlighter: all state passed as parameters.
 * @private
 */
class BoardHighlighter {
  /**
   * Initialize highlighter with UI and board references.
   *
   * @constructor
   * @param {EnemyUIModel} boardUI - UI with gridCellAt() and removeHighlightAoE() methods.
   * @param {BoardMap} boardMap - Board for bounds validation.
   */
  constructor (boardUI, boardMap) {
    this.boardUI = boardUI
    this.boardMap = boardMap
  }

  /**
   * Clear existing weapon effect highlights from board.
   * @private
   * @returns {void}
   */
  _clearExistingHighlights () {
    this.boardUI.removeHighlightAoE()
  }

  /**
   * Apply CSS highlighting to splash area cells.
   * Adds power-level-based classes and 'target' class for unified styling.
   *
   * @private
   * @param {Array<SplashCell>} splashCells - [row, col, powerLevel] cells.
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
   * Highlight weapon effect at target coordinates.
   * Clears previous highlights, validates weapon, applies new ones.
   *
   * @public
   * @param {Weapon | undefined} weapon - Weapon to display.
   * @param {Array<Array<number>>} targetCoordinates - Targeting points.
   * @returns {void}
   */
  highlightWeaponEffect (weapon, targetCoordinates) {
    this._clearExistingHighlights()

    if (!ModelAccessor.canApplyWeapon(weapon, targetCoordinates)) {
      return
    }

    const splashCells = ModelAccessor.getSplashCellsInBounds(
      weapon,
      this.boardMap,
      targetCoordinates
    )
    this._applyHighlightsToCells(splashCells)
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
function createAreaOfEffectHighlighter (model, cellRow, cellCol) {
  const boardMap = bh.map

  // Validate cursor position
  if (!isCoordinateInBounds(boardMap, cellRow, cellCol)) {
    return
  }

  // Get targeting data
  const boardUI = model.UI
  const activeWeapon = ModelAccessor.getActiveWeapon(model)
  const fullTargetCoordinates = ModelAccessor.getPreviewTargetingCoordinates(
    model,
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
 * Manages initialization phases in correct order: mode, state, UI, interaction.
 * Reduces complexity of newGame() function by delegating setup phases.
 * @private
 */
const BoardInitializer = {
  /**
   * Initialize game visibility state and opponent ship clearing.
   * Sets bh.seekingMode and clears opponent ships if in seeking mode.
   *
   * @param {boolean} isSeekingMode - True if player is seeking.
   * @returns {void}
   */
  initializeGameMode (isSeekingMode) {
    bh.seekingMode = isSeekingMode
    if (isSeekingMode) {
      enemy.ships = []
    }
  },

  /**
   * Update opponent board title with current terrain.
   * Sets element text to 'Enemy ' + terrain mapHeading.
   *
   * @returns {void}
   */
  updateBoardTitle () {
    const titleElement = document.getElementById('enemy-title')
    if (titleElement) {
      titleElement.textContent = 'Enemy ' + bh.terrain.mapHeading
    }
  },

  /**
   * Initialize or cleanup opponent board.
   * Two-phase lifecycle: first call stores cleanup, second call executes it.
   * Handles Friend board initialization with weapon arming.
   *
   * @param {CleanupHandler | null} opponentBoardCleanup - Cleanup function.
   * @param {FriendUI | null} friendUI - Friend UI reference (hide mode).
   * @returns {void}
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
      friendUI.clearFriendClasses()
      // Arm opponent weapons for two-click targeting in hide mode
      enemy.opponent?.armWeapons()
    }
  },

  /**
   * Configure board hover behavior for weapon effect preview.
   * Sets up hover handlers via GridBoard.addHover.
   *
   * @returns {void}
   */
  configureBoardHover () {
    GridBoard.addHover(
      enemy.UI.board,
      bh.map,
      createAreaOfEffectHighlighter,
      enemy.UI.removeHighlightAoE,
      enemy.UI,
      enemy
    )
  },

  /**
   * Configure board targeting behavior based on game mode.
   * Delegates to enemy.setBoardTargetingState().
   *
   * @param {boolean} isSeekingMode - True if player is seeking.
   * @returns {void}
   */
  configureBoardTargeting (isSeekingMode) {
    enemy.setBoardTargetingState(isSeekingMode)
  }
}

/**
 * Start a new game, resetting state and initializing all subsystems.
 * Orchestrates initialization sequence in proper order.
 *
 * EXECUTION ORDER:
 * 1. Set bh.seekingMode and clear opponent ships if seeking
 * 2. Reset game state via enemy.resetModel()
 * 3. Update UI title
 * 4. Initialize opponent board
 * 5. Configure board hover behavior
 * 6. Configure board targeting state
 * 7. Setup weapon button handlers
 *
 * @public
 * @param {string} seek - Mode: 'seek' for seeking mode, other for hiding.
 * @param {CleanupHandler | null} opponentBoard - Cleanup from previous board.
 * @param {FriendUI | null} friendUI - Friend UI reference.
 * @returns {void}
 */
export function newGame (seek, opponentBoard, friendUI) {
  const isSeekingMode = seek === GAME_MODE_SEEK

  // Phase 1: Game mode setup
  BoardInitializer.initializeGameMode(isSeekingMode)

  // Phase 2: Reset core state
  enemy.resetModel()
  BoardInitializer.updateBoardTitle()

  // Phase 3: Board initialization
  BoardInitializer.initializeOpponentBoard(opponentBoard, friendUI)
  BoardInitializer.configureBoardHover()

  // Phase 4: Configure interaction
  BoardInitializer.configureBoardTargeting(isSeekingMode)
  enemy.setupWeaponButtonHandlers()
}

// ============================================================================
// KEYBOARD SHORTCUTS (SINGLE RESPONSIBILITY: Input handling)
// ============================================================================

/**
 * Build keyboard shortcut map for seek mode.
 * Dynamically adds weapon shortcuts from UI button elements.
 *
 * @private
 * @param {CleanupHandler | undefined} placementHandler - Placement mode handler.
 * @param {CleanupHandler | undefined} testHandler - Test mode handler.
 * @returns {Object<string, KeyboardHandler>} Map of keys to handlers.
 */
function buildSeekModeShortcuts (placementHandler, testHandler) {
  const shortcuts = {
    [KEYBOARD_SHORTCUTS.PLACEMENT]: () => placementHandler?.(),
    [KEYBOARD_SHORTCUTS.TEST]: () => testHandler?.(),
    [KEYBOARD_SHORTCUTS.RESTART]: () => newGame(GAME_MODE_SEEK, () => {}, null),
    [KEYBOARD_SHORTCUTS.REVEAL]: () => enemy.onClickReveal?.(),
    [KEYBOARD_SHORTCUTS.SINGLE_SHOT]: () => enemy.onClickSingleShotButton?.()
  }

  // Dynamically register weapon shortcuts
  const weaponButtons = enemy.UI?.weaponBtns || {}
  for (const button of Object.values(weaponButtons)) {
    const letter = button.dataset.letter
    if (letter) {
      shortcuts[letter.toLowerCase()] = () =>
        enemy.onClickWeaponButtons?.(letter)
    }
  }

  return shortcuts
}

/**
 * Initialize keyboard shortcuts for seek mode.
 * Creates manager, registers shortcuts, and returns cleanup function.
 *
 * @private
 * @param {CleanupHandler | undefined} placementHandler - Placement mode handler.
 * @param {CleanupHandler | undefined} testHandler - Test mode handler.
 * @returns {CleanupHandler} Cleanup function to deactivate shortcuts.
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
 * Uses optional chaining to prevent runtime errors.
 *
 * @private
 * @param {HTMLElement | null} element - DOM element to attach handler to.
 * @param {EventListener | undefined} handler - Click event handler.
 * @returns {void}
 */
function attachClickHandler (element, handler) {
  if (element?.addEventListener && typeof handler === 'function') {
    element.addEventListener('click', /** @type {EventListener} */ (handler))
  }
}

/**
 * Wire up all button click handlers for game UI.
 * Attaches handlers to restart, placement, and test buttons.
 * Returns cleanup function for keyboard shortcuts.
 *
 * @private
 * @param {CleanupHandler | undefined} placementHandler - Placement mode handler.
 * @param {CleanupHandler | undefined} testHandler - Test mode handler.
 * @returns {CleanupHandler} Cleanup function for keyboard shortcuts.
 */
function wireUpButtonHandlers (placementHandler, testHandler) {
  // Refresh button states
  enemy.UI?.refreshButtons?.()

  // Wire game control buttons
  attachClickHandler(
    enemy.UI?.buttons?.restart,
    newGame.bind(null, GAME_MODE_SEEK, null)
  )
  enemy.wireupButtons()

  // Wire mode toggle buttons
  attachClickHandler(enemy.UI?.buttons?.place, placementHandler)
  attachClickHandler(enemy.UI?.buttons?.test, testHandler)

  // Initialize keyboard shortcuts
  return initializeSeekModeShortcuts(placementHandler, testHandler)
}

/**
 * Setup the enemy game UI and event handlers.
 * Initializes button handlers and keyboard shortcuts for gameplay.
 * Entry point that must be called before game begins.
 *
 * EXECUTION ORDER:
 * 1. Refresh UI button states
 * 2. Wire up button handlers (restart, placement, test)
 * 3. Initialize keyboard shortcuts
 *
 * @public
 * @param {CleanupHandler | undefined} placementHandler - Placement mode callback.
 * @param {CleanupHandler | undefined} testHandler - Test mode callback.
 * @returns {CleanupHandler} Cleanup function to deactivate shortcuts on game end.
 */
export function setupEnemy (placementHandler, testHandler) {
  return wireUpButtonHandlers(placementHandler, testHandler)
}

/**
 * Internal test exports for unit testing private functions.
 * Exposes implementation details for testing purposes only.
 * Should NOT be used in production code.
 *
 * EXPORTED FUNCTIONS:
 * - _getActiveWeapon: Get current weapon from model
 * - _getPreviewTargetingCoordinates: Calculate hover preview
 *
 * @internal
 * @type {Object<string, Function>}
 */
export const __test = {
  _getActiveWeapon: ModelAccessor.getActiveWeapon.bind(ModelAccessor),
  _getPreviewTargetingCoordinates:
    ModelAccessor.getPreviewTargetingCoordinates.bind(ModelAccessor)
}
