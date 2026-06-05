import { bh } from '../terrains/all/js/bh.js'
import { gameStatus } from './StatusUI.js'
import { enemyUI } from './enemyUI.js'
import { LoadOut } from './LoadOut.js'
import { Waters } from './Waters.js'
import { Player } from './steps.js'
import { Delay } from '../core/Delay.js'
import { randomElement, parsePair } from '../core/utilities.js'
import { CellClassManager } from './helpers/CellClassManager.js'

// ============================================================================
// Constants
// ============================================================================

const MAX_PLACEMENT_ATTEMPTS = 50
const MAX_PLACEMENT_RETRIES = 10
const ATTEMPTS_PER_RETRY = 25

/**
 * CSS class names for board state.
 * Used to apply visual styling to DOM elements during game state transitions.
 *
 * @typedef {Object} CSSClasses
 * @property {string} DESTROYED - Class applied when board is destroyed
 * @property {string} WAITING - Class applied while waiting for action
 * @property {string} HIDDEN - Class applied to hide elements
 * @property {string} CURSOR_PREFIX - Prefix for cursor-type class names
 * @property {string} OFF - Class applied to disabled/off state
 * @property {string} ON - Class applied to enabled/on state
 */
const CSS_CLASSES = {
  DESTROYED: 'destroyed',
  WAITING: 'waiting',
  HIDDEN: 'hidden',
  CURSOR_PREFIX: 'cursor-',
  OFF: 'off',
  ON: 'on'
}

/**
 * Message templates for game status updates.
 * Provides consistent messaging for player feedback and game state notifications.
 *
 * @typedef {Object} MessageTemplates
 * @property {Function} PLACEMENT_DIFFICULTY - Factory function for placement attempt messages
 * @property {string} PLACEMENT_FAILED - Message when ship placement exhausts all retries
 * @property {string} CLICK_TO_FIRE - Instruction to click board to fire weapon
 * @property {string} ALREADY_SHOT - Error when trying to shoot same cell twice
 * @property {string} NO_EFFECT - Error when weapon has no effect
 * @property {string} WAIT_FOR_ENEMY - Status message while waiting for opponent turn
 * @property {string} GAME_OVER - Message when game ends
 * @property {string} ENEMY_SELECTING_TARGET - Status during two-click weapon selection
 * @property {string} ENEMY_TURN - Status message for opponent's turn
 * @property {string} YOUR_TURN - Status message for player's turn
 * @property {string} SINGLE_SHOT_LABEL - Label for single-shot weapon mode
 */
const MESSAGES = {
  /**
   * Creates a difficulty message showing placement attempt count.
   * @param {number} attempts - Number of placement attempts made
   * @returns {string} Formatted difficulty message
   */
  PLACEMENT_DIFFICULTY: attempts =>
    `Having difficulty placing all ships (${attempts} attempts)`,
  PLACEMENT_FAILED: 'Failed to place all ships after many attempts',
  CLICK_TO_FIRE: 'Click On Square To Fire',
  ALREADY_SHOT: 'Already Shot Here - Try Again',
  NO_EFFECT: 'Has no effect - Try Again',
  WAIT_FOR_ENEMY: 'Wait For Enemy To Finish Their Turn',
  GAME_OVER: 'Game Over - No More Shots Allowed',
  ENEMY_SELECTING_TARGET: 'Enemy selecting target...',
  ENEMY_TURN: "Enemy's Turn",
  YOUR_TURN: 'Your Turn',
  SINGLE_SHOT_LABEL: 'single shot'
}

/**
 * @typedef {Object} WeaponLaunchResult
 * @property {boolean} [hasTargettedWeapon] - Indicates if a targeted weapon was used
 * @property {boolean} [hasUnattached] - Indicates if unattached weapon needs target selection
 * @property {Weapon} [weapon] - The weapon object used
 * @property {Object} [score] - The score result from the launch (see WeaponResult type)
 */

/**
 * @typedef {Object} CursorInfo
 * @property {WeaponSystem} [wps] - Weapon system information
 * @property {number} [idx] - Cursor index for mode indicator
 * @property {string} [cursor] - Cursor CSS class name
 */

/**
 * @typedef {Object} Weapon
 * @property {string} letter - Single character weapon identifier
 * @property {string} [name] - Human-readable weapon name
 * @property {Array<string>} [cursors] - Array of cursor class names for weapon modes
 * @property {string} [launchCursor] - Cursor class when ready to launch
 * @property {string} [tag] - Weapon tag identifier for filtering/targeting
 * @property {boolean} [postSelectShadow] - Whether weapon shows shadow after selection
 * @property {number} [postSelectCoords] - Number of additional coordinates needed after selection
 * @property {boolean} [isLimited] - Whether weapon has limited ammo
 * @property {() => void} [playWarnSound] - Optional callback to play warning sound
 */

/**
 * @typedef {Object} WeaponSystem
 * @property {Weapon} weapon - The weapon configuration
 * @property {number} [id] - Weapon system ID reference
 * @property {() => number} [ammoCapacity] - Function returning remaining ammo
 */

/**
 * @typedef {Object} SelectedCoordinates
 * @property {number} r - Target row coordinate
 * @property {number} c - Target column coordinate
 */

/**
 * @typedef {Object} EnemyUI
 * @property {HTMLElement} board - The main game board element
 * @property {HTMLButtonElement} [weaponBtn] - Weapon selection button
 * @property {HTMLButtonElement} [revealBtn] - Reveal ships button
 * @property {Array<HTMLButtonElement>} [weaponBtns] - Array of weapon buttons
 * @property {(row: number, column: number, rotationClass?: string, extraClass?: string) => void} [cellWeaponActive] - Activate weapon cell display
 * @property {(x: number, y: number, force?: boolean) => void} [cellWeaponDeactivate] - Deactivate weapon cell
 * @property {(x: number, y: number) => void} [cellHintDeactivate] - Deactivate hint display
 * @property {() => void} [clearClasses] - Clear all CSS classes from board
 * @property {(ships: Array<Object>) => void} [revealAll] - Reveal all ships on board
 * @property {() => void} [playMode] - Switch to play mode display
 * @property {() => void} [reset] - Reset UI to initial state
 * @property {() => void} [deactivateTempHints] - Clear temporary hint displays
 * @property {() => void} [enableBtns] - Enable all control buttons
 * @property {() => void} [disableBtns] - Disable all control buttons
 * @property {(onClickCell?: Function, thisRef?: any, map?: any) => void} [buildBoard] - Build board UI with click handlers
 * @property {() => void} [removeHighlightAoE] - Remove area-of-effect highlight
 * @property {(letter?: string, systems?: Array<any>, handler?: Function) => Array<HTMLButtonElement>} [weaponButtons] - Create weapon buttons
 * @property {() => void} [deactivateWeapons] - Deactivate weapon buttons
 */
/**
 * @typedef {Object} LoadOutType
 * @description Weapon loadout manager interface for weapon selection, ammo tracking, and targeting state.
 * Manages active weapon system, multi-click targeting state, and single-shot mode.
 * @property {boolean} isSingleShot - Whether loadout is in single-shot weapon mode
 * @property {Array<[number, number]>} selectedCoordinates - Currently selected targeting coordinates [r, c]
 * @property {Object|null} selectedWeapon - Currently selected weapon object (null if none)
 * @property {() => void|undefined} clearSelectedCoordinates - Clears targeting coordinates and resets targeting state
 * @property {WeaponSystem|undefined} firstUnattachedWeaponSystem - Gets first unattached weapon system or undefined
 * @property {WeaponSystem|undefined} currentWeaponSystem - Gets currently active weapon system
 * @property {(letter: string) => void} switchToWeapon - Switch to weapon system by letter identifier
 * @property {() => void} switchToNextWeaponSystem - Switch to next available weapon system (cycle)
 * @property {() => boolean} isOutOfAmmo - Check if completely out of ammo for all weapons
 * @property {boolean} hasNoCurrentAmmo - Check if current weapon has zero ammo
 * @property {() => Array<WeaponSystem>} getLimitedWeaponSystems - Get weapons with limited ammo
 * @property {() => void} switchToSingleShot - Switch to single-shot targeting mode
 * @property {(r: number, c: number, weapon?: Object) => void} addSelectedCoordinates - Add targeting coordinate
 * @property {Function|null} onOutOfAllAmmo - Callback when all ammo depleted
 * @property {Function|null} onOutOfAmmo - Callback when weapon ammo depleted
 * @property {Function} notifyCursorChange - Notify loadout of cursor change for mode update
 * @property {boolean} isNotArming - Check if weapon is not arming (ready to fire)
 * @memberof Enemy
 */
/**
 * @typedef {Object} StepsManager
 * @description Game state machine interface managing turn flow, weapon selection, and targeting.
 * Handles callbacks for each phase of turn: begin → select → aim → activate → end.
 * @property {Function|null} onBeginTurn - Begin turn callback (reset state, show status)
 * @property {Function|null} onDeactivate - Deactivate weapon callback (clear visual state)
 * @property {Function|null} onActivate - Activate weapon callback (show weapon preview)
 * @property {Function|null} onSelect - Select callback (prepare for targeting)
 * @property {Function|null} onAim - Aim callback (enter targeting mode)
 * @property {Function|null} onChangeWeapon - Change weapon callback (switch weapon system)
 * @property {() => void|undefined} clearSource - Clear selected source (ship weapon rack)
 * @property {(ship: Object) => void} addShip - Add ship to selection (source ship)
 * @property {(ui: EnemyUI, x: number, y: number, cell?: HTMLElement) => void} addSource - Add source location (weapon rack position)
 * @property {(ui: EnemyUI, r: number, c: number, cell?: HTMLElement) => void} addHint - Add hint location (targeting hint)
 * @property {() => void} select - Trigger selection mode (prepare for targeting)
 * @property {() => void} endTurn - End the current turn
 * @memberof Enemy
 */
/**
 * @typedef {Object} WatersOpponent
 * @description Opponent player interface (Friend instance) for accessing opponent state and UI.
 * Used by Enemy to interact with the opposing player's board, weapons, and UI.
 * @property {boolean} [hasAttachedWeapons] - Whether opponent has attached weapons (ships with weapons)
 * @property {boolean} [boardDestroyed] - Whether opponent board is destroyed (game over)
 * @property {EnemyUI} UI - Opponent UI controller for board manipulation
 * @property {() => void} [hideWaiting] - Hide waiting/spinner indicator
 * @property {(ships?: Array<Object>) => void} [updateUI] - Update opponent UI with current state
 * @memberof Enemy
 */
/**
 * @typedef {Object} ShipCell
 * @description Ship cell object representing a ship on the board with weapon systems.
 * @property {Array<[string, Object]>} loadedWeaponEntries - Array of [key, weapon] tuples for loaded weapons
 * @memberof Enemy
 */
/**
 * @typedef {Object} Score
 * @description Score tracking interface for recording hits, misses, and game statistics.
 * @property {() => void} finishTurn - Finalize current turn and record score
 * @property {() => void} reset - Reset score to initial state
 * @memberof Enemy
 */

/**
 * Represents the enemy player in the Waters game, handling AI behavior, ship placement, and weapon management.
 * Extends the Waters class to provide enemy-specific logic including autonomous weapon selection,
 * ship placement with retry logic, and turn management.
 *
 * Key Features:
 * - Automatic ship placement with exponential retry backoff (MAX_PLACEMENT_RETRIES)
 * - Weapon selection and firing with support for attached and unattached weapons
 * - Two-click weapon targeting in Hide & Seek mode (selectedCellCoordinates tracking)
 * - Cursor state management and visual feedback (board cursor classes)
 * - Turn-based game flow with event handlers (steps callbacks)
 * - AI decision-making for weapon selection and targeting
 *
 * Architecture:
 * - Inherits from Waters: ship, board, and opponent management
 * - Uses LoadOut: weapon selection and ammo tracking
 * - Uses StepsManager (steps): game state machine for turn flow
 * - Uses EnemyUI: visual board rendering and control buttons
 * - Uses Score: hit/miss tracking and game statistics
 *
 * @class Enemy
 * @extends Waters
 * @public
 */
// @ts-ignore - Intentionally overrides parent's private destroy method with public implementation
class Enemy extends Waters {
  /**
   * Constructs the Enemy player instance.
   * Initializes game state, UI controller, and event handlers for turn-based gameplay.
   * Sets up cursor management, targeting state, and weapon selection state.
   *
   * @param {EnemyUI} enemyUI - The UI controller instance for rendering enemy board and controls
   * @memberof Enemy
   *
   * Instance Properties (inherited from Waters):
   * @property {EnemyUI} UI - The UI controller for board rendering and buttons
   * @property {LoadOutType} loadOut - Weapon loadout manager with ammo tracking
   * @property {StepsManager} steps - Game state machine for turn-based flow
   * @property {WatersOpponent|null} opponent - The opponent player (Friend instance)
   * @property {Score} score - Score manager with hit/miss tracking
   * @property {Array<ShipCell>} ships - Array of ships on board
   * @property {boolean} boardDestroyed - Whether this board is destroyed (game over)
   * @property {boolean} hasAttachedWeapons - Whether this player has attached weapons
   *
   * Instance Properties (Enemy-specific):
   * @property {string} preamble0 - Message prefix: 'Enemy'
   * @property {string} preamble - Message prefix: 'The enemy was '
   * @property {string} preamble1 - Message prefix: 'The enemy '
   * @property {boolean} isRevealed - Whether all ships are revealed
   * @property {number|null} timeoutId - Timeout ID for delayed enemy actions
   * @property {Function|null} weaponSelectHandler - Handler for weapon button clicks
   * @property {Function|null} revealHandler - Handler for reveal button clicks
   * @property {boolean} enemyWaters - Flag indicating enemy waters instance
   * @property {Array<number>|null} selectedCellCoordinates - [r, c] for two-click hide/seek mode
   */
  constructor (enemyUI) {
    // @ts-ignore - EnemyUI vs WatersUI type mismatch (missing grid, score, territory, and 50+ properties)
    super(enemyUI, Player.enemy)
    this.preamble0 = 'Enemy'
    this.preamble = 'The enemy was '
    this.preamble1 = 'The enemy '
    this.isRevealed = false

    /** @type {number|null} Timeout ID for delayed enemy actions (e.g., ship placement retry). */
    this.timeoutId = null

    /** @type {Function|null} Handler for weapon selection button clicks. */
    this.weaponSelectHandler = null

    /** @type {Function|null} Handler for reveal board button clicks. */
    this.revealHandler = null

    /** @type {boolean} Flag indicating this is an enemy waters instance (vs. friend/player). */
    this.enemyWaters = true

    /** @type {Array<number>|null} Stores [row, col] for two-click hide/seek weapon targeting. */
    this.selectedCellCoordinates = null

    this.#initializeSteps()
  }

  /**
   * Initializes the steps event handlers.
   * Registers callbacks for all turn-based game state transitions.
   * Called during constructor to set up event handlers before turn begins.
   * @returns {void}
   * @memberof Enemy
   */
  #initializeSteps () {
    if (!this.steps) return
    this.steps.onBeginTurn = this._handleBeginTurn.bind(this)
    this.steps.onDeactivate = this.deactivateWeapon.bind(this)
    // @ts-ignore - steps.js onActivate callback requires 9 parameters for interface compatibility
    this.steps.onActivate = this._createActivationHandler()
    this.steps.onSelect = this._handleSelect.bind(this)
    this.steps.onAim = this._handleAim.bind(this)
    this.steps.onChangeWeapon = this._handleChangeWeapon.bind(this)
  }

  /**
   * Extracts the cursor class name from the board's classList.
   * Searches for classes starting with 'cursor-' prefix to determine
   * the currently active weapon cursor display.
   *
   * @returns {string} The cursor class name or empty string if not found
   * @memberof Enemy
   */
  #extractCursorClass () {
    // @ts-ignore - this.UI is typed as Object but has board property
    const board = /** @type {HTMLElement|undefined} */ (this.UI?.board)
    if (!board?.classList) {
      return ''
    }

    for (const cls of board.classList) {
      if (cls.startsWith(CSS_CLASSES.CURSOR_PREFIX) || cls.includes('cursor')) {
        return cls
      }
    }

    return ''
  }

  /**
   * Clears targeting coordinate state to reset mode icons.
   * Ensures updateWeaponStatus() calculates correct mode index after weapon change.
   * Delegates to loadOut.clearSelectedCoordinates() to reset targeting coordinates.
   * Must be called before weapon switch to prevent stale coordinate state.
   *
   * @memberof Enemy
   * @see _handleWeaponChange for full context on why this is critical
   * @returns {void}
   */
  #clearCoordinateState () {
    const loadOut = /** @type {LoadOut|undefined} */ (this.loadOut)
    if (loadOut?.clearSelectedCoordinates) {
      loadOut.clearSelectedCoordinates()
    }
  }

  /**
   * Clears visual state from the previous weapon selection.
   * Deselects ship, removes weapon rack, and clears hint location on opponent board.
   * Resets game state machine and opponent UI state.
   *
   * @returns {void}
   * @memberof Enemy
   */
  #clearSelectionVisualState () {
    const steps = /** @type {StepsManager|undefined} */ (this.steps)
    // @ts-ignore - steps is typed as Object but has clearSource method
    if (steps?.clearSource) {
      // @ts-ignore - steps is typed as Object but has clearSource method
      steps.clearSource()
    }

    const opponentUI = /** @type {EnemyUI|undefined} */ (this.opponent?.UI)
    if (opponentUI?.deactivateTempHints) {
      opponentUI.deactivateTempHints()
    }
  }

  /**
   * Updates board cursor and mode display.
   * Triggers UI update for weapon status display.
   *
   * @param {string|null} oldCursor - Current cursor class to remove (nullable)
   * @memberof Enemy
   * @returns {void}
   */
  #updateBoardCursor (oldCursor) {
    const oldCursorClass = oldCursor || this.#extractCursorClass()

    const loadOut = /** @type {LoadOut|undefined} */ (this.loadOut)
    if (loadOut?.notifyCursorChange) {
      loadOut.notifyCursorChange(oldCursorClass)
    }
  }

  /**
   * Updates board targeting state based on current weapon configuration.
   * Reflects whether the current weapon requires two-click targeting (attached weapons).
   * Sets CSS class on board to indicate targeting mode.
   *
   * @returns {void}
   * @memberof Enemy
   */
  #updateBoardTargetingState () {
    const hasUnattached = this._hasUnattachedForCurrentWeapon()
    this.setBoardTargetingState(hasUnattached)
  }

  /**
   * Remove cursor classes from the board element and all its child cells.
   * Prevents accumulation of stale cursor classes during weapon/step changes.
   * @private
   * @param {HTMLElement|undefined} element - The DOM element to clear cursor classes from
   * @memberof Enemy
   * @returns {void}
   */
  _clearCursorClassesFromElement (element) {
    const el = /** @type {HTMLElement|undefined} */ (element)
    if (!el?.classList) return

    const staleCursorClasses = /** @type {string[]} */ ([])
    for (const cls of Array.from(el.classList)) {
      if (cls.startsWith(CSS_CLASSES.CURSOR_PREFIX) || cls.includes('cursor')) {
        staleCursorClasses.push(cls)
      }
    }
    if (staleCursorClasses.length) {
      el.classList.remove(...new Set(staleCursorClasses))
    }
    CellClassManager.removeCursorClasses(el)
  }

  /**
   * Clears all cursor classes from the board element and its child cells.
   * Removes stale cursor classes from entire grid to prevent accumulation.
   * Called when switching weapons or modes to reset visual cursor display.
   * @returns {void}
   * @memberof Enemy
   */
  #clearBoardCursorClasses () {
    // @ts-ignore - this.UI is typed as Object but has board property
    const board = /** @type {HTMLElement|undefined} */ (this.UI?.board)
    if (!board) return

    this._clearCursorClassesFromElement(board)

    const cells = board.children?.length
      ? board.children
      : board.querySelectorAll('*')
    for (const cell of cells) {
      try {
        this._clearCursorClassesFromElement(
          /** @type {HTMLElement|undefined} */ (cell)
        )
      } catch {
        // ignore non-element nodes or unexpected structure
      }
    }
  }

  /**
   * Creates a handler that adapts the steps.js parameter format to our object-based approach.
   * Converts multiple parameters into a single activation data object for internal use.
   * Steps.js passes 9 parameters but we use a single object with extracted properties.
   * @private
   * @returns {Function} Activation handler adapted for steps.js interface
   * @memberof Enemy
   */
  _createActivationHandler () {
    // Return a function that matches steps.js callback signature (9 parameters)
    // but adapts it to our internal object-based approach.
    // Using a rest parameter here avoids an artificial max-params lint rule
    // while preserving compatibility with the external callback signature.
    // @ts-ignore - Rest parameter annotated inline
    return function activationHandler (...params) {
      const [, weapon, , , r, c, , shadowR, shadowC] = params
      // Construct activation data from parameters
      const activationData = /** @type {Object} */ ({
        weapon,
        targetRow: r,
        targetCol: c,
        shadowRow: shadowR,
        shadowCol: shadowC
      })
      // @ts-ignore - 'this' context bound via .bind(this)
      return this._handleActivate(activationData)
    }.bind(this)
  }
  /**
   * Checks if the current weapon is unattached (requires target selection).
   * Returns true for single-shot weapons, unattached weapon systems, or in seek mode without attached weapons.
   * @private
   * @returns {boolean} True if weapon requires target selection
   * @memberof Enemy
   */
  _hasUnattachedForCurrentWeapon () {
    const loadOut = /** @type {LoadOut|undefined} */ (this.loadOut)
    return (
      loadOut?.isSingleShot === true ||
      loadOut?.firstUnattachedWeapon != null ||
      // @ts-ignore - bh.seekingMode is dynamically set, not in type definition
      (bh.seekingMode && !this.hasAttachedWeapons)
    )
  }

  /**
   * Returns true when a Missile should be fired immediately in pure Seek mode
   * on the Space and Asteroids terrain.
   *
   * In this terrain/mode combination, Missile targeting is a single-click
   * action and should not fall through to the attached-weapon two-click
   * selection flow.
   *
   * @private
   * @param {WeaponSystem|undefined} [weaponSystem]
   * @returns {boolean}
   * @memberof Enemy
   */
  _shouldFireSeekModeMissileImmediately (weaponSystem) {
    const ws = weaponSystem ?? this.loadOut?.currentWeaponSystem
    // NOTE (regression prevention): In the "Space and Asteroids" terrain,
    // when the overall game mode is pure Seek (bh.seekingMode === true),
    // Missile weapons are intended to be single-click weapons. Historically
    // refactors accidentally re-introduced two-click selection logic for
    // missiles in this combination of terrain+mode. This helper isolates the
    // detection logic so unit tests can lock this behavior and prevent future
    // regressions. Do not move or rename without updating tests in
    // `src/waters/seekMissileRegression.test.js`.

    // @ts-ignore - bh.seekingMode is dynamically set, not in type definition
    if (!bh.seekingMode || bh.terrain?.title !== 'Space and Asteroids') {
      return false
    }

    const weapon = /** @type {Weapon|undefined} */ (ws?.weapon)
    if (!weapon) {
      return false
    }

    return (
      weapon.letter === '+' ||
      weapon.name === 'Missile' ||
      weapon.tag === 'missile'
    )
  }

  /**
   * Handles the selection event by updating the board classes.
   * Callback invoked after transitioning to selection mode.
   * Called from steps.onSelect when mode changes to sourceSelect.
   * @private
   * @returns {void}
   * @memberof Enemy
   */
  _handleSelect () {
    // Placeholder callback for when weapon selection mode is activated
    // UI updates are handled elsewhere; this prevents infinite recursion
    // when steps.select() calls the onSelect callback
  }

  /**
   * Handles the aiming event by updating the board classes.
   * Sets board to targeting state to show aiming cursor.
   * @private
   * @returns {void}
   * @memberof Enemy
   */
  _handleAim () {
    this.setBoardTargetingState(true)
  }

  /**
   * Handles activation of a weapon at specified coordinates.
   * Displays weapon activation UI on both player and opponent boards.
   * @private
   * @param {Object} activationData - Activation context information
   * @param {*} activationData.weapon - The weapon object being activated
   * @param {number} activationData.targetRow - Target row coordinate
   * @param {number} activationData.targetCol - Target column coordinate
   * @param {number} activationData.shadowRow - Shadow row coordinate for post-select shadow
   * @param {number} activationData.shadowCol - Shadow column coordinate for post-select shadow
   * @memberof Enemy
   */
  // @ts-ignore - Called from _createActivationHandler() return function
  _handleActivate (activationData) {
    const { weapon, targetRow, targetCol, shadowRow, shadowCol } =
      activationData
    const opponentUI = /** @type {EnemyUI|undefined} */ (this.opponent?.UI)
    opponentUI?.cellWeaponActive?.(targetRow, targetCol)
    const ui = /** @type {EnemyUI} */ (this.UI)
    if (weapon?.postSelectShadow && ui.cellWeaponActive) {
      ui.cellWeaponActive(shadowRow, shadowCol, '', weapon.tag)
    }
  }

  /**
   * Handles the change weapon event.
   * Updates the loadOut to switch to the specified weapon.
   * @private
   * @param {string} wletter - The weapon letter to switch to
   * @returns {void}
   * @memberof Enemy
   */
  _handleChangeWeapon (wletter) {
    const loadOut = /** @type {LoadOut|undefined} */ (this.loadOut)
    loadOut?.switchToWeapon(wletter)
  }

  /**
   * Transitions the UI to the opponent's turn.
   * Called by friend.js when opponent (enemy) should have their turn.
   * Disables weapon buttons and shows spinner.
   * @private
   * @returns {void}
   * @memberof Enemy
   */
  // @ts-ignore - Used by friend.js opponent._transitionToOpponentTurn()
  _transitionToOpponentTurn () {
    const ui = /** @type {EnemyUI|undefined} */ (this.UI)
    ui?.deactivateWeapons?.()
    this.#setSpinnerState(true, MESSAGES.ENEMY_TURN)
  }

  /**
   * Updates the spinner display state and game status.
   * Shows/hides the loading spinner and updates game status message.
   * @param {boolean} show - Whether to show the spinner
   * @param {string} mode - The mode text to display in game status
   * @returns {void}
   * @memberof Enemy
   */
  #setSpinnerState (show, mode) {
    const spinner = document.getElementById('spinner')
    if (spinner instanceof HTMLImageElement) {
      spinner.classList.toggle(CSS_CLASSES.WAITING, show)
      spinner.classList.toggle(CSS_CLASSES.HIDDEN, !show)
      if (show) {
        spinner.src = './images/loading.gif'
      }
    }
    gameStatus.showMode(mode)
  }

  /**
   * Handles the begin turn event.
   * Displays game status and manages single-shot weapon logic.
   * Resets selected cell coordinates and triggers selection if needed.
   * Called as onBeginTurn callback from steps state machine.
   * @private
   * @async
   * @returns {Promise<void>}
   * @memberof Enemy
   */
  async _handleBeginTurn () {
    this.#setSpinnerState(false, '')
    // Reset selected cell coordinates for two-click mode
    this.selectedCellCoordinates = null
    if (this.isGameOver) {
      // @ts-ignore - this.steps is typed as Object but has select method
      this.steps?.select()
    } else {
      gameStatus.showMode(MESSAGES.YOUR_TURN)
    }
    const loadOut = /** @type {LoadOut|undefined} */ (this.loadOut)
    if (loadOut?.isSingleShot && !this.hasAttachedWeapons) {
      // @ts-ignore - this.steps is typed as Object but has select method
      this.steps?.select()
    }
  }

  /**
   * Handles cursor changes on the board.
   * CRITICAL FIX: When newCursor is empty (firing ready state), do NOT remove the old cursor.
   * Empty cursor is a transient state that occurs when weapon coordinates are fully selected.
   * The board cursor should remain visible to show the player what weapon is selected,
   * even when the weapon is in firing-ready state.
   *
   * REGRESSION PREVENTION:
   * Previous bug: When firing a weapon in hide-seek mode, cursorChange was called with
   * newCursor='' (empty) by addSelectedCoordinates(), causing the old weapon cursor to be
   * removed from the board.
   *
   * @public
   * @param {string|null} oldCursor - The previous cursor class (nullable)
   * @param {CursorInfo} newCursorInfo - Information about the new cursor (wps: WeaponSystem, idx: number, cursor: string)
   * @returns {void}
   */
  cursorChange (oldCursor, newCursorInfo) {
    const newCursor = newCursorInfo?.cursor
    // Handle case where cursor hasn't changed
    if (newCursor == null) return
    if (oldCursor === newCursor) return

    // @ts-ignore - this.UI is typed as Object but has board property
    const boardElement = /** @type {HTMLElement|undefined} */ (this.UI?.board)
    const board = boardElement?.classList

    if (!board) return

    this.#updateBoardCursorDisplay(newCursor, oldCursor, board)

    const wps = /** @type {WeaponSystem|undefined} */ (newCursorInfo?.wps)
    if (wps) {
      // @ts-ignore - Parent class updateMode is private but we call it here
      this.updateMode(wps, newCursorInfo)
    }
  }

  /**
   * Updates the board cursor display when the cursor changes.
   * Handles adding new cursor classes and removing stale ones.
   * Extracted from cursorChange() to reduce cognitive complexity.
   *
   * @param {string} newCursor - The new cursor class (may be empty string)
   * @param {string|null} oldCursor - The old cursor class (may be null)
   * @param {DOMTokenList} board - The board classList element
   * @returns {void}
   */
  #updateBoardCursorDisplay (newCursor, oldCursor, board) {
    // When switching to a new non-empty cursor, remove any stale cursor classes
    // from the board before adding the new one. This prevents multiple cursor
    // classes from accumulating during weapon/step changes.
    if (newCursor !== '') {
      if (oldCursor) {
        board.remove(oldCursor)
      }
      this.#removeStaleCursorClasses(board)
      if (newCursor) {
        board.add(newCursor)
      }
    } else if (oldCursor !== '') {
      // Do NOT remove the old cursor when transitioning into an empty cursor
      // state; empty cursor is a transient firing-ready state and should leave
      // the previous weapon cursor visible.
    }
  }

  /**
   * Removes all stale cursor classes from the board.
   * Identifies and removes classes that match cursor patterns.
   * Extracted from cursorChange() to reduce cognitive complexity.
   *
   * @param {DOMTokenList} board - The board classList element
   * @returns {void}
   */
  #removeStaleCursorClasses (board) {
    const staleCursorClasses = /** @type {string[]} */ ([])
    for (const cls of board) {
      if (cls.startsWith(CSS_CLASSES.CURSOR_PREFIX) || cls.includes('cursor')) {
        staleCursorClasses.push(cls)
      }
    }
    const uniqueStaleClasses = [...new Set(staleCursorClasses)].filter(Boolean)
    if (uniqueStaleClasses.length) {
      board.remove(...uniqueStaleClasses)
    }
  }

  /**
   * Checks if the enemy has ammo available.
   * Getter convenience method that inverts hasNoAmmo logic.
   * Delegates to loadOut.isOutOfAmmo property check.
   *
   * @public
   * @returns {boolean} True if ammo is available (any weapon has ammo); false if out of ammo (all weapons exhausted)
   * @memberof Enemy
   */
  get hasAmmo () {
    return !this.hasNoAmmo
  }

  /**
   * Checks if the enemy has no ammo.
   * Queries the loadOut weapon system to determine ammo availability.
   * Returns true only when all ammunition is depleted for all weapons.
   *
   * @public
   * @returns {boolean} True if all ammunition is depleted (all weapons exhausted); false if any weapon has ammo
   * @memberof Enemy
   */
  get hasNoAmmo () {
    // @ts-ignore - this.loadOut is typed as Object but has isOutOfAmmo property
    return this.loadOut?.isOutOfAmmo === true
  }

  /**
   * Switches the weapon mode if possible.
   * Only switches if game is not over and ammo is available.
   * Delegates to loadOut.switchToNextWeaponSystem() for weapon selection.
   *
   * VALIDATION:
   * - Returns early if isGameOver is true
   * - Returns early if hasNoAmmo is true
   *
   * SIDE EFFECTS:
   * - Calls loadOut.switchToNextWeaponSystem() which mutates weapon selection state
   * - Calls updateUI() which refreshes all UI components
   *
   * @public
   * @returns {void} No explicit return; updates game state and UI via side effects
   * @memberof Enemy
   */
  switchMode () {
    if (this.isGameOver || this.hasNoAmmo) return
    // @ts-ignore - this.loadOut is typed as Object but has switchToNextWeaponSystem
    this.loadOut?.switchToNextWeaponSystem?.()
    this.updateUI()
  }

  /**
   * Checks if the game is over for the enemy.
   * Game is over when board is destroyed or ships are revealed.
   * Either condition results in game over state.
   *
   * LOGIC:
   * - Returns true if boardDestroyed is true (board destroyed by opponent)
   * - Returns true if isRevealed is true (all ships revealed)
   * - Returns false only if both conditions are false
   *
   * @public
   * @returns {boolean} True if board is destroyed or ships revealed; false otherwise (game continues)
   * @memberof Enemy
   */
  get isGameOver () {
    return this.boardDestroyed || this.isRevealed
  }

  /**
   * Attempts to place ships with single-pass retry logic.
   * Makes up to MAX_PLACEMENT_ATTEMPTS sequential tries to position all ships.
   * Each attempt randomizes ship positions and rotations independently.
   *
   * ALGORITHM:
   * 1. Loop MAX_PLACEMENT_ATTEMPTS times
   * 2. Call attemptToPlaceShips() (parent method) which places all ships at once
   * 3. Return true on first success
   * 4. Return false if all attempts exhausted
   *
   * SIDE EFFECTS:
   * - Mutates board state via attemptToPlaceShips() (parent method)
   * - May partially populate board on failed attempts
   * - Does not guarantee placement (placement may fail after all retries)
   *
   * @param {ShipCell[]} ships - Array of Ship objects to place on board (passed to parent method)
   * @returns {boolean} True if all ships placed successfully on any attempt; false if placement failed after MAX_PLACEMENT_ATTEMPTS
   * @memberof Enemy
   */
  #attemptShipPlacement (ships) {
    for (let trial = 0; trial < MAX_PLACEMENT_ATTEMPTS; trial++) {
      if (
        this.shipCellGrid.attemptToPlaceShips(
          // @ts-ignore - Object[] to Ship[] type cast (parent class loose typing)
          ships
        )
      ) {
        return true
      }
    }
    return false
  }

  /**
   * Handles placement failure by displaying difficulty message and retrying.
   * Shows exponentially-increasing attempt counter to player and schedules retry.
   * Implements exponential backoff: attempt N shows (N+1) × ATTEMPTS_PER_RETRY attempts.
   *
   * ALGORITHM:
   * 1. Calculate totalAttempts = (attempt + 1) × ATTEMPTS_PER_RETRY
   * 2. Add difficulty message with attempt count to game status queue
   * 3. If attempt < MAX_PLACEMENT_RETRIES, schedule async retry with Delay.promise()
   * 4. If max retries exceeded, finalize failure and throw error
   *
   * SIDE EFFECTS:
   * - Updates game status via gameStatus.addToQueue()
   * - May schedule async retry via Delay.promise()
   * - Calls _finalizePlacementFailure() which disables UI and throws error
   * - Sets this.boardDestroyed = true on final failure
   *
   * @async
   * @param {ShipCell[]} ships - Array of Ship objects to retry placing via #attemptShipPlacement()
   * @param {number} attempt - Current retry attempt number (0-indexed); used for exponential backoff calculation
   * @returns {Promise<boolean>} Promise resolving to true if placement succeeded after retry; false returned early if max retries exceeded
   * @throws {Error} Throws with PLACEMENT_FAILED message when max retries exhausted
   * @memberof Enemy
   */
  async _handlePlacementFailure (ships, attempt) {
    const totalAttempts = (attempt + 1) * ATTEMPTS_PER_RETRY
    gameStatus.addToQueue(MESSAGES.PLACEMENT_DIFFICULTY(totalAttempts), true)

    if (attempt < MAX_PLACEMENT_RETRIES) {
      await Delay.yield()
      return this.#attemptShipPlacementWithRetry(ships)
    }

    this.#finalizePlacementFailure()
    return false
  }

  /**
   * Attempts to place ships and returns the result.

   * @param {ShipCell[]} ships - The ships to place
   * @returns {boolean} True if all ships placed successfully
   * @memberof Enemy
   */
  #attemptShipPlacementWithRetry (ships) {
    return this.#attemptShipPlacement(ships)
  }

  /**
   * Finalizes placement failure state after all retries have been exhausted.
   * Enables buttons, shows failure message, and throws error.
   * @throws {Error} Always throws with placement failed message
   * @returns {void}
   * @memberof Enemy
   */
  #finalizePlacementFailure () {
    // @ts-ignore - this.UI is typed as Object but has enableBtns method
    this.UI?.enableBtns?.()
    gameStatus.addToQueue(MESSAGES.PLACEMENT_FAILED, true)
    this.boardDestroyed = true
    throw new Error(MESSAGES.PLACEMENT_FAILED)
  }

  /**
   * Places all ships on the board asynchronously.
   * Uses retry logic to handle placement difficulties. Yields control to let UI update.
   * Enables buttons after placement and provides click-to-fire instruction.
   *
   * ALGORITHM:
   * 1. Get ships to place (use provided array or default to this.ships)
   * 2. Enable UI buttons
   * 3. Yield control with Delay.yield() to allow UI to update
   * 4. Attempt placement via #attemptShipPlacement()
   * 5. If successful, add click-to-fire message; otherwise handle via _handlePlacementFailure()
   *
   * SIDE EFFECTS:
   * - Enables UI buttons via this.UI?.enableBtns?.()
   * - Yields to event loop via Delay.yield()
   * - Mutates board state via #attemptShipPlacement()
   * - Updates game status messages
   * - May throw error via _handlePlacementFailure()
   *
   * @public
   * @async
   * @param {Array<ShipCell>} [ships] - The ships to place (defaults to this.ships if not provided)
   * @returns {Promise<void>} Resolves when ships are placed or placement fails with error thrown
   * @throws {Error} Throws from _handlePlacementFailure() if placement fails after all retries
   * @memberof Enemy
   */
  async placeAll (ships) {
    const shipsToPlace = ships ?? this.ships
    // @ts-ignore - this.UI is typed as Object but has enableBtns method
    this.UI?.enableBtns?.()
    await Delay.yield()
    if (this.#attemptShipPlacement(shipsToPlace)) {
      gameStatus.setTips([MESSAGES.CLICK_TO_FIRE])
      // @ts-ignore - this.UI is typed as Object but has enableBtns method
      this.UI?.enableBtns?.()
    } else {
      await this._handlePlacementFailure(shipsToPlace, 0)
    }
  }

  /**
   * Reveals all ships on the board.
   * Clears UI classes, shows all ships, and marks board as destroyed/revealed.
   * Called when game ends to show opponent's ship positions.
   *
   * SIDE EFFECTS:
   * - Clears all CSS classes from board via ui?.grid?.clearClasses?.()
   * - Displays ships via ui?.revealAll?.()
   * - Hides waiting/spinner via hideWaiting()
   * - Sets this.boardDestroyed = true
   * - Sets this.isRevealed = true
   *
   * @public
   * @returns {void} No explicit return; mutates board state and UI
   * @memberof Enemy
   */
  revealAll () {
    // @ts-ignore - this.UI is typed as Object but has clearClasses method
    const ui = /** @type {EnemyUI|undefined} */ (this.UI)
    // @ts-ignore - EnemyUI has grid property but type doesn't reflect it
    ui?.grid?.clearClasses?.()
    ui?.revealAll?.(this.ships)
    this.hideWaiting()

    this.boardDestroyed = true
    this.isRevealed = true
  }

  /**
   * Updates all UI components.
   * Refreshes weapon UI, tally, and button availability based on game state.
   * Orchestrates parent UI updates with current weapon system display.
   *#updateButtonStates()
   * 2. Call parent's updateUI() via super.updateUI()
   * 3. Update weapon status display via gameStatus.updateWeaponStatus()
   *
   * SIDE EFFECTS:
   * - Mutates button DOM elements
   * - Updates parent class UI components
   * - Updates game status display
   *
   * @public
   * @returns {void} No explicit return; mutates UI via side effects
   * @memberof Enemy
   */
  updateUI () {
    this.#updateButtonStates()
    // @ts-ignore - Parent class updateUI is private but we call it here
    super.updateUI(this.ships)
    const weaponSystem = /** @type {WeaponSystem|undefined} */ (
      this.loadOut?.currentWeaponSystem
    )
    if (weaponSystem) {
      // @ts-ignore - Parent class updateMode is private but we call it here
      this.updateMode(weaponSystem)
    }
  }

  /**
   * Updates the state of buttons based on game status.
   * Disables buttons when game is over or out of ammo.
   * @returns {void}
   * @memberof Enemy
   */
  #updateButtonStates () {
    const isGameOver = this.isGameOver
    const isOutOfAmmo = this.hasNoAmmo
    const shouldDisableWeapon = isGameOver || isOutOfAmmo

    // @ts-ignore - this.UI is typed as Object but has weaponBtn property
    const ui = /** @type {EnemyUI|undefined} */ (this.UI)
    if (ui?.weaponBtn) {
      ui.weaponBtn.disabled = shouldDisableWeapon
    }
    if (ui?.revealBtn) {
      ui.revealBtn.disabled = isGameOver
    }
  }

  /**
   * Initializes weapon button event handlers.
   * Creates buttons for each available weapon system and wires click handlers.
   * Includes debug logging for weapon system inspection.
   *
   * SIDE EFFECTS:
   * - Logs debug information to console (weapon systems)
   * - Creates weapon buttons via ui?.weaponButtons?.()
   * - Assigns ui.weaponBtns array with created buttons
   * - Wires onClickWeaponButtons() handler to each button click
   *
   * @public
   * @returns {void} No explicit return; initializes handlers and creates UI elements
   * @memberof Enemy
   */
  setupWeaponButtonHandlers () {
    // @ts-ignore - this.UI is typed as Object but has weaponBtn property
    const ui = /** @type {EnemyUI|undefined} */ (this.UI)
    if (!ui?.weaponBtn) return

    // Debug: inspect weapon systems available when wiring buttons
    try {
      const loadOut = /** @type {LoadOut|undefined} */ (this.loadOut)
      const all = /** @type {Array<any>} */ (loadOut?.weaponSystems || [])
      const limited = /** @type {Array<any>} */ (
        loadOut?.getLimitedWeaponSystems() || []
      )
      const allInfo = all.map(
        /** @param {any} wps */ wps => ({
          letter: wps.weapon?.letter,
          tag: wps.weapon?.tag,
          isLimited: !!wps.weapon?.isLimited,
          ammoCapacity:
            typeof wps.ammoCapacity === 'function' ? wps.ammoCapacity() : null
        })
      )
      const limitedInfo = limited.map(
        /** @param {any} wps */ wps => ({
          letter: wps.weapon?.letter,
          tag: wps.weapon?.tag,
          ammoCapacity:
            typeof wps.ammoCapacity === 'function' ? wps.ammoCapacity() : null
        })
      )
      console.debug(
        'Enemy.setupWeaponButtonHandlers - allWeaponSystems:',
        allInfo
      )
      console.debug(
        'Enemy.setupWeaponButtonHandlers - limitedWeaponSystems:',
        limitedInfo
      )
    } catch (err) {
      console.debug('Enemy.setupWeaponButtonHandlers - debug failed', err)
    }

    const loadOut = /** @type {LoadOut|undefined} */ (this.loadOut)
    if (ui?.weaponButtons && typeof ui.weaponButtons === 'function') {
      // @ts-ignore - weaponButtons parameter type incompatibility
      ui.weaponBtns = ui.weaponButtons(
        // @ts-ignore - weaponBtn type compatibility (HTMLButtonElement vs string)
        ui.weaponBtn,
        loadOut?.getLimitedWeaponSystems(),
        this.onClickWeaponButtons.bind(this)
      )
    }
  }

  /**
   * Checks if the enemy can take a turn.
   * Validates multiple conditions: game not over, ammo available, no pending timeout, and opponent alive.
   * Updates game status with appropriate message if turn cannot be taken.
   *
   * VALIDATION SEQUENCE:
   * 1. Game not over (not boardDestroyed and not revealed)
   * 2. Has ammo remaining (inverse of hasNoAmmo)
   * 3. No pending timeout (timeoutId is null)
   * 4. Opponent board not destroyed (game not over)
   *
   * SIDE EFFECTS:
   * - Calls gameStatus.addToQueue() which may update game UI messages
   *
   * @public
   * @returns {boolean} True if all conditions met (game not over, ammo available, no pending timeout, opponent alive); false otherwise
   * @memberof Enemy
   */
  get canTakeTurn () {
    if (this.isGameOver || this.hasNoAmmo) {
      return false
    }
    if (this.timeoutId) {
      gameStatus.addToQueue(MESSAGES.WAIT_FOR_ENEMY, false)
      return false
    }
    // @ts-ignore - opponent type compatibility
    const opponent = this.opponent
    if (opponent?.boardDestroyed) {
      gameStatus.addToQueue(MESSAGES.GAME_OVER, true)
      return false
    }
    return true
  }

  /**
   * Prepares and launches a weapon at the specified location.
   * Removes highlight, sets fire handlers, and initiates launch sequence.
   * Orchestrates the full weapon launch flow from preparation through execution.
   *
   * @async
   * @param {number} r - Target row coordinate (0-indexed)
   * @param {number} c - Target column coordinate (0-indexed)
   * @returns {Promise<WeaponLaunchResult|null>} Result containing weapon, score, or targeting state
   * @memberof Enemy
   */
  async #prepareWeaponLaunch (r, c) {
    // @ts-ignore - this.UI.removeHighlightAoE is a real method
    this.UI?.removeHighlightAoE?.()
    // @ts-ignore - setWeaponFireHandlers is parent method
    this.setWeaponFireHandlers?.()
    return await this.#launchWeaponSequence(c, r)
  }

  /**
   * Launches the weapon sequence, trying selected, random, and default launch flows.
   * In Hide and Seek mode with opponent having attached weapons, respects the currently selected weapon.
   * Falls back to random/default launch if selected weapon is not available.
   *
   * FLOW LOGIC:
   * 1. Try selected weapon (if one is currently selected)
   * 2. If result is final (score/targeted/unattached), return it
   * 3. If opponent has attached weapons, don't fall back to random (respect selection)
   * 4. Try random weapon selection
   * 5. If result is final, return it
   * 6. Fall back to default weapon launch
   *
   * @async
   * @param {number} x - Target column coordinate (0-indexed)
   * @param {number} y - Target row coordinate (0-indexed)
   * @returns {Promise<WeaponLaunchResult|null>} The final launch result
   * @memberof Enemy
   */
  async #launchWeaponSequence (x, y) {
    // @ts-ignore - launchSelectedWeapon is parent method
    let result = await this.launchSelectedWeapon?.(x, y)
    if (this.#isFinalLaunchResult(result)) {
      return result
    }

    // When attached weapons are active, do not fall back to random selection.
    // This ensures the player's weapon choice is respected and allows multi-coordinate
    // weapons to continue across the two-click flow.
    // @ts-ignore - opponent type compatibility
    const opponent = this.opponent
    if (opponent?.hasAttachedWeapons || this.hasAttachedWeapons) {
      // Return the current result (null for incomplete selection, allowing next click to continue)
      return result
    }

    // @ts-ignore - launchRandomWeapon is parent method
    result = await this.launchRandomWeapon?.(x, y, !bh.seekingMode)
    if (this.#isFinalLaunchResult(result)) {
      return result
    }

    // @ts-ignore - fireWeaponAt is parent method, LoadOut type issue
    return await this.fireWeaponAt?.(
      x,
      y,
      undefined,
      // @ts-ignore - LoadOut.launchDefault parameter type
      LoadOut.launchDefault.bind(this, this.UI)
    )
  }

  /**
   * Sets up and launches a weapon at the specified location.
   * Public interface for weapon firing with preparation sequence.
   * Routes to #prepareWeaponLaunch which handles UI cleanup and handler setup.
   *
   * @public
   * @async
   * @param {number} r - Target row coordinate (0-indexed)
   * @param {number} c - Target column coordinate (0-indexed)
   * @returns {Promise<WeaponLaunchResult|null>} Result with weapon info and score, or null if targeting continues
   * @memberof Enemy
   */
  async setupWeapon (r, c) {
    return await this.#prepareWeaponLaunch(r, c)
  }

  /**
   * Determines whether a weapon launch requires no further action.
   * A final result is one that completes weapon firing without further selection.
   * @param {WeaponLaunchResult|null} result - The weapon launch result to evaluate
   * @returns {boolean} True if result is complete and requires no further action
   * @memberof Enemy
   */
  #isFinalLaunchResult (result) {
    return !!(
      result?.score ||
      result?.hasTargettedWeapon ||
      result?.hasUnattached
    )
  }

  /**
   * Selects the currently selected weapon (e.g., Rail Bolt) on a random opponent ship.
   * Falls back to random weapon if the current weapon is not available on any opponent ship.
   *
   * CRITICAL: This method ensures that when a player clicks a weapon button (e.g., Rail Bolt)
   * and then clicks the enemy board, the first click selects a RAIL BOLT RACK on a RAILGUN SHIP.
   * NOT a random weapon on a random ship.
   *
   * REGRESSION HISTORY:
   * - v1: Used randomAttachedWeapon() directly, selected wrong weapon types
   * - FIX: Filter opponent ships to only those with the selected weapon loaded
   *
   * SIDE EFFECTS:
   * - Mutates this.steps with selected ship via addShip()
   * - Mutates this.steps with selected weapon source location via addSource()
   * - Creates weapon selection state via createWeaponSelection()
   * - Arms the selected weapon via _armSelectedWeapon()
   * - May call randomAttachedWeapon() fallback if weapon unavailable
   *
   * ALGORITHM:
   * 1. Get currently selected weapon from loadOut
   * 2. If no weapon selected, fallback to random weapon selection
   * 3. Filter opponent ships to only those with selected weapon loaded
   * 4. Select random ship from filtered candidates
   * 5. Extract weapon entry matching selected weapon letter
   * 6. Create weapon selection and arm for next firing phase
   *
   * @private
   * @param {number} y - Target row coordinate (0-indexed); used as source hint in seek mode for multi-step weapons
   * @param {number} x - Target column coordinate (0-indexed); used as source hint in seek mode for multi-step weapons
   * @throws {void} Returns early via random fallback if weapon not found or no ships available
   * @returns {void} No explicit return; mutates game state via side effects
   * @memberof Enemy
   */
  _selectCurrentWeaponOnRandomShip (y, x) {
    // Get the weapon the player currently has selected (via weapon button click)
    const loadOut = /** @type {LoadOut|undefined} */ (this.loadOut)
    const currentWeapon = loadOut?.currentWeaponSystem

    if (!currentWeapon?.weapon?.letter) {
      // Fallback to random weapon if player hasn't selected one
      // @ts-ignore - randomAttachedWeapon is parent method
      this.randomAttachedWeapon?.(this.opponent)
      return
    }

    const targetLetter = currentWeapon?.weapon?.letter
    // @ts-ignore - opponent type compatibility
    const opponent = this.opponent
    const shipCandidates = opponent?.ships || this.ships

    // CRITICAL: Filter to only ships that have THIS SPECIFIC WEAPON loaded
    // This prevents selecting a MissileBoat when Rail Bolt is selected
    const shipsWithWeapon = (shipCandidates || []).filter(ship => {
      if (!targetLetter) return false
      const entries = ship?.loadedWeaponEntries
      if (!entries) return false
      return entries.some(
        ([_key, weapon]) =>
          /** @type {any} */ (weapon)?.weapon?.letter === targetLetter
      )
    })

    if (shipsWithWeapon.length === 0) {
      // Fallback to random weapon if no ship has the current weapon
      // This is a valid edge case, not an error
      // @ts-ignore - randomAttachedWeapon is parent method
      this.randomAttachedWeapon?.(opponent)
      return
    }

    // Select a random ship from the filtered list
    const selectedShip = randomElement(shipsWithWeapon)
    // @ts-ignore - this.steps is typed as Object but has addShip method
    if (!this.steps || !selectedShip) return
    this.steps.addShip(selectedShip)

    // Find and select the target weapon from the ship
    const entries = selectedShip.loadedWeaponEntries
    if (!entries || !targetLetter) {
      // @ts-ignore - randomAttachedWeapon is parent method
      this.randomAttachedWeapon?.(opponent)
      return
    }
    const weaponEntry = entries.find(
      ([_k, w]) => /** @type {any} */ (w)?.weapon?.letter === targetLetter
    )
    if (!weaponEntry) {
      // Fallback if weapon not found (should rarely happen after filtering)
      // @ts-ignore - randomAttachedWeapon is parent method
      this.randomAttachedWeapon?.(opponent)
      return
    }
    const [key, weapon] = weaponEntry

    if (!key || !weapon) {
      // Fallback if weapon not found (should rarely happen after filtering)
      // @ts-ignore - randomAttachedWeapon is parent method
      this.randomAttachedWeapon?.(opponent)
      return
    }

    const [launchX, launchY] = parsePair(key)
    // @ts-ignore - opponent UI type compatibility
    const opponentUI = opponent?.UI
    const viewModel = opponentUI || this.UI

    const postSelectCoords = currentWeapon?.weapon?.postSelectCoords ?? 0
    // @ts-ignore - bh.seekingMode is dynamically set, not in type definition
    const isSeekSource = bh.seekingMode && postSelectCoords > 0
    const sourceY = isSeekSource ? y : launchY
    const sourceX = isSeekSource ? x : launchX
    const sourceCell = viewModel?.grid.nodeAt?.(sourceX, sourceY)

    const hintCoords = isSeekSource
      ? [y, x]
      : this._normalizeSourceHint(
          // @ts-ignore - generateSourceHint is parent method
          this.generateSourceHint?.(selectedShip, opponent)
        )

    // @ts-ignore - viewModel type is EnemyUI and this.steps is typed as Object
    this.steps?.addSource?.(viewModel, sourceX, sourceY, sourceCell)

    // Create weapon selection for the current weapon. In pure seek mode,
    // the clicked location becomes the source hint for two-step weapons.
    // @ts-ignore - createWeaponSelection is parent method
    const selection = this.createWeaponSelection?.(
      launchY,
      launchX,
      /** @type {any} */ (weapon)?.id,
      hintCoords[0],
      hintCoords[1]
    )
    // @ts-ignore - _armSelectedWeapon is parent method
    this._armSelectedWeapon?.(selection, opponent)
  }

  /**
   * Normalizes hint coordinates returned by generateSourceHint.
   * Ensures the result is always a valid [row, col] tuple.
   * Returns [0, 0] fallback if input is invalid, undefined, or null.
   *
   * VALIDATION:
   * - Checks if input is an array with at least 2 elements
   * - Validates both coordinates are not null/undefined
   * - Returns fallback [0, 0] for any invalid input
   *
   * @private
   * @param {Array<number>|undefined|null} hintCoords - Hint coordinates from source hint generator (may be undefined, null, or invalid array)
   * @returns {Array<number>} Normalized hint coordinates as [row, col] array; [0, 0] if invalid
   * @memberof Enemy
   */
  _normalizeSourceHint (hintCoords) {
    if (
      !Array.isArray(hintCoords) ||
      hintCoords.length < 2 ||
      hintCoords[0] == null ||
      hintCoords[1] == null
    ) {
      return [0, 0]
    }
    return [hintCoords[0], hintCoords[1]]
  }

  /**
   * Handles the first click in hide/seek mode: selects the current weapon and a random compatible ship.
   *
   * TWO-CLICK FLOW:
   * First click (this method):
   *   - Player clicks weapon button (e.g., "Rail Bolt") to select weapon
   *   - Player clicks enemy board (triggers onClickCell → _onFirstClickSelection)
   *   - This method selects a random RAILGUN SHIP with Rail Bolt loaded
   *   - Message shown: "Enemy selecting target..."
   *
   * Second click:
   *   - Player clicks enemy board again (triggered from stored selectedCellCoordinates)
   *   - Fire is executed at the new target location
   *
   * SIDE EFFECTS:
   * - Updates game status message with ENEMY_SELECTING_TARGET
   * - Delegates state mutation to _selectCurrentWeaponOnRandomShip()
   *
   * @private
   * @param {number} y - Target row coordinate (0-indexed); passed to weapon selection for source hint in seek mode
   * @param {number} x - Target column coordinate (0-indexed); passed to weapon selection for source hint in seek mode
   * @returns {void} No explicit return; updates UI and game state via side effects
   * @memberof Enemy
   */
  _onFirstClickSelection (y, x) {
    this._selectCurrentWeaponOnRandomShip(y, x)
    gameStatus.addToQueue(MESSAGES.ENEMY_SELECTING_TARGET, true)
  }

  /**
   * Handles the second click in hide/seek mode: fires the selected weapon at the target.
   * Ensures fire handlers are properly set before executing the attack.
   * Updates opponent UI with results and finalizes turn.
   *
   * CRITICAL SEQUENCING:
   * Fire handlers must be set BEFORE calling fireWeaponAt().
   * The two-click Hide/Seek path arms weapons on the first click, but the actual
   * fire callbacks are only finalized here. Without setWeaponFireHandlers(), the shot
   * animates but never delivers hit/miss results on the opponent board.
   *
   * SIDE EFFECTS:
   * - Clears selectedCellCoordinates to reset two-click mode
   * - Calls fireWeaponAt() which mutates board state and opponent UI
   * - Processes weapon result via _processWeaponResult() if final
   * - Finalizes turn via _finalizeTurn()
   *
   * @private
   * @async
   * @param {number} y - Target row coordinate (0-indexed); final target for weapon firing
   * @param {number} x - Target column coordinate (0-indexed); final target for weapon firing
   * @returns {Promise<void>} Resolves when weapon is fired and turn finalized
   * @memberof Enemy
   */
  async _onSecondClickFire (y, x) {
    // Ensure fire handlers are attached before firing.
    // This is required for the two-click Hide/Seek path because the selected
    // weapon may be armed earlier on the first click, but the actual fire
    // callbacks are only finalized here.
    // Without this call, the shot can animate but never deliver hit/miss results.
    // @ts-ignore - setWeaponFireHandlers is parent method
    this.setWeaponFireHandlers?.()
    this.selectedCellCoordinates = null
    // @ts-ignore - fireWeaponAt is parent method, loadOut selectedWeapon may be null
    const result = await this.fireWeaponAt?.(
      x,
      y,
      this.loadOut?.selectedWeapon ?? undefined
    )
    // @ts-ignore - fireWeaponAt return type includes score property
    if (result?.score) {
      // @ts-ignore - fireWeaponAt return type includes score property and opponent type
      this.opponent?.updateResultsOfBomb?.(result.weapon, result.score)
    }
    // @ts-ignore - opponent updateUI is parent method and needs parameter
    this.opponent?.updateUI?.(this.ships)
    this.updateUI()
    this._finalizeTurn()
  }

  /**
   * Handles cell click for enemy turn.
   * Validates turn legality and launches weapon at target.
   *
   * HIDE & SEEK TWO-CLICK BEHAVIOR:
   * When opponent has attached weapons (opponent?.hasAttachedWeapons = true):
   *   - First click on empty board: Calls _onFirstClickSelection(), stores selectedCellCoordinates
   *   - Second click on any board cell: Fires the pre-selected weapon at that cell
   *
   * IMPORTANT CONDITIONS:
   * - If the enemy already has a selected weapon when the first opponent cell is clicked,
   *   that click must fire the weapon instead of selecting another weapon rack.
   * - Check is based on opponent?.hasAttachedWeapons (works for both Hide & Seek and pure Seek modes)
   * - NOT based on bh.seekingMode flag (which is false in Hide & Seek mode)
   * - In Hide & Seek: opponent has preset ships with weapons → hasAttachedWeapons = true
   * - In pure Seek: opponent generates ships with weapons → hasAttachedWeapons = true
   * - In modes without attached weapons: hasAttachedWeapons = false → single-click fires
   *
   * FLOW ROUTING:
   * 1. Validate canTakeTurn (game not over, ammo available, no pending timeout)
   * 2. Check for seek-mode missile immediate fire condition
   * 3. Route to two-click flow if opponent has attached weapons
   * 4. Otherwise route to single-click fire via _fireWeaponViaSetup()
   *
   * SIDE EFFECTS:
   * - May call canTakeTurn which updates game status if turn invalid
   * - Modifies selectedCellCoordinates for two-click tracking
   * - Calls weapon firing methods which mutate board and opponent UI state
   * - Updates game status messages for each flow path
   *
   * @public
   * @async
   * @param {number} r - Row coordinate (0-indexed) on opponent board
   * @param {number} c - Column coordinate (0-indexed) on opponent board
   * @returns {Promise<void>} Resolves when cell click handling and weapon firing completes
   * @memberof Enemy
   */
  async onClickCell (r, c) {
    if (!this.canTakeTurn) return

    if (this.loadOut?.isSingleShot) {
      await this._handleSingleShotClick(r, c)
      return
    }

    // REGRESSION GUARD: In pure Seek mode with Space/Asteroids terrain,
    // Missiles should fire immediately with one click, even when hasAttachedWeapons
    // is false. Check this BEFORE the attached weapons flow.
    // IMPORTANT: Call without argument to allow method's default parameter to execute.
    // If we pass currentWeapon directly, passing undefined would override the default.
    if (
      typeof this._shouldFireSeekModeMissileImmediately === 'function' &&
      this._shouldFireSeekModeMissileImmediately()
    ) {
      await this._fireCurrentWeaponImmediately(r, c)
      return
    }

    if (this.opponent?.hasAttachedWeapons || this.hasAttachedWeapons) {
      await this._handleAttachedWeaponClick(r, c)
      return
    }

    await this._fireWeaponViaSetup(r, c)
  }

  /**
   * Handles a single-shot weapon click.
   * Sets fire handlers and launches the weapon immediately at target location.
   * Does not require target selection or ship rack selection.
   *
   * CRITICAL: Ensures fire handlers are attached BEFORE firing.
   * Without this call, the shot animates but never delivers hit/miss results.
   * This is required because the onDestroy callbacks are only finalized here,
   * not when the weapon was initially selected. The callbacks are needed for
   * the shot to register hits/misses on the opponent board.
   *
   * @async
   * @param {number} y - Target row coordinate (0-indexed)
   * @param {number} x - Target column coordinate (0-indexed)
   * @returns {Promise<void>} Resolves when single-shot handling completes
   * @memberof Enemy
   */
  async _handleSingleShotClick (y, x) {
    // CRITICAL: Ensure fire handlers are attached before firing.
    // Without this call, the shot animates but never delivers hit/miss results.
    // This is required because the onDestroy callbacks are only finalized here,
    // not when the weapon was initially selected. The callbacks are needed for
    // the shot to register hits/misses on the opponent board.
    // @ts-ignore - setWeaponFireHandlers is parent method
    this.setWeaponFireHandlers?.()

    this.selectedCellCoordinates = null
    // @ts-ignore - fireWeaponAt is parent method, currentWeaponSystem type incompatibility (WeaponsSystem vs WeaponSystemType)
    const result = await this.fireWeaponAt?.(
      x,
      y,
      // @ts-ignore - currentWeaponSystem type incompatibility (WeaponsSystem vs WeaponSystemType)
      this.loadOut?.currentWeaponSystem
    )
    // @ts-ignore - WeaponResult vs WeaponLaunchResult type incompatibility
    if (this._shouldWaitForWeaponResult(result)) return
    // @ts-ignore - WeaponResult vs WeaponLaunchResult type incompatibility
    this._processWeaponResult(result)
    this._finalizeTurn()
  }

  /**
   * Handles a click for attached weapons in two-click or single-click mode.
   * Routes to appropriate handler based on weapon selection state.
   * @private
   * @async
   * @param {number} r - Target row coordinate
   * @param {number} c - Target column coordinate
   * @returns {Promise<void>}
   * @memberof Enemy
   */
  async _handleAttachedWeaponClick (r, c) {
    if (this.loadOut?.selectedWeapon) {
      // REGRESSION GUARD: Check if selectedWeapon is a seek-mode missile before firing
      // Call without argument to use default parameter (currentWeaponSystem)
      // This ensures the missile check always gets valid weapon system data
      if (
        typeof this._shouldFireSeekModeMissileImmediately === 'function' &&
        this._shouldFireSeekModeMissileImmediately()
      ) {
        await this._fireCurrentWeaponImmediately(r, c)
        return
      }
      await this._onSecondClickFire(r, c)
      return
    }

    if (this.selectedCellCoordinates === null) {
      // @ts-ignore - this.loadOut is typed as Object but has currentWeaponSystem
      const currentWeapon = this.loadOut?.currentWeaponSystem

      if (
        typeof this._shouldFireSeekModeMissileImmediately === 'function' &&
        this._shouldFireSeekModeMissileImmediately()
      ) {
        await this._fireCurrentWeaponImmediately(r, c)
        return
      }

      // @ts-ignore - this.loadOut is typed as Object
      if (this._shouldWarnOnGaussAsteroid(currentWeapon, r, c)) {
        return
      }

      if (this._hasUnattachedForCurrentWeapon()) {
        await this._fireWeaponViaSetup(r, c)
        return
      }

      this._onFirstClickSelection(r, c)
      this.selectedCellCoordinates = [r, c]
      return
    }

    await this._onSecondClickFire(r, c)
  }

  /**
   * Fires weapon via setup sequence.
   * Prepares weapon and launches at target location.
   * @private
   * @async
   * @param {number} r - Target row coordinate
   * @param {number} c - Target column coordinate
   * @returns {Promise<void>}
   * @memberof Enemy
   */
  async _fireWeaponViaSetup (r, c) {
    const result = await this.setupWeapon(r, c)
    if (this._shouldWaitForWeaponResult(result)) return
    this._processWeaponResult(result)
    this._finalizeTurn()
  }

  /**
   * Fires the currently selected weapon immediately without target selection.
   * Used for seek-mode missiles and single-click weapons.
   * @private
   * @async
   * @param {number} r - Target row coordinate
   * @param {number} c - Target column coordinate
   * @returns {Promise<void>}
   * @memberof Enemy
   */
  async _fireCurrentWeaponImmediately (r, c) {
    // @ts-ignore - bh.map is possibly null, nearestCornerTo is unknown type
    const { r0, c0 } = bh.map?.nearestCornerTo(r, c) || { r0: r, c0: c }

    // @ts-ignore - this.UI.removeHighlightAoE is a real method
    this.UI?.removeHighlightAoE?.()
    // @ts-ignore - setWeaponFireHandlers is parent method
    this.setWeaponFireHandlers?.()
    // @ts-ignore - this.loadOut is typed as Object but has the required properties
    const loadOut = this.loadOut
    const weaponSystem = loadOut?.currentWeaponSystem
    const weapon = weaponSystem?.weapon
    loadOut?.addSelectedCoordinates?.(r0, c0, weapon)
    // @ts-ignore - fireWeaponAt is parent method
    const result = await this.fireWeaponAt?.(c, r, weaponSystem)
    // @ts-ignore - WeaponResult vs WeaponLaunchResult type incompatibility
    if (this._shouldWaitForWeaponResult(result)) return
    // @ts-ignore - WeaponResult vs WeaponLaunchResult type incompatibility
    this._processWeaponResult(result)
    this._finalizeTurn()
  }

  /**
   * Checks if Gauss Round should play warning sound for asteroid in seek mode.
   * @private
   * @param {WeaponSystem|undefined} currentWeapon - Current weapon system
   * @param {number} x - Target column coordinate
   * @param {number} y - Target row coordinate
   * @returns {boolean} True if warning should be played
   * @memberof Enemy
   */
  _shouldWarnOnGaussAsteroid (currentWeapon, x, y) {
    const isGaussRound =
      currentWeapon?.weapon?.name === 'Gauss Round' ||
      currentWeapon?.weapon?.letter === '^'
    const isSpaceAndAsteroids = bh.terrain?.title === 'Space and Asteroids'

    // @ts-ignore - bh.seekingMode is dynamically set, not in type definition
    if (!bh.seekingMode || !isSpaceAndAsteroids || !isGaussRound) {
      return false
    }

    const cell = this.UI.grid.nodeAt(x, y)
    if (bh.subTerrainTagFromCell(cell) !== 'asteroid') {
      return false
    }

    const gaussWeapon = /** @type {any} */ (currentWeapon?.weapon)
    gaussWeapon.playWarnSound()
    return true
  }

  /**
   * Processes weapon launch result and applies effects if successful.
   * Updates board state with bomb results if shot was successful.
   * @private
   * @param {WeaponLaunchResult|null} result - The weapon launch result
   * @returns {void}
   * @memberof Enemy
   */
  _processWeaponResult (result) {
    if (result?.score) {
      // @ts-ignore - updateResultsOfBomb is parent method with deprecated signature
      this.updateResultsOfBomb?.(result.weapon, result.score)
    }
  }

  /**
   * Determines whether the enemy should wait for an additional weapon result.
   * Returns true when weapon requires further target selection or attachment.
   * @private
   * @param {WeaponLaunchResult|null} result - The weapon launch result
   * @returns {boolean} True if waiting for additional result
   * @memberof Enemy
   */
  _shouldWaitForWeaponResult (result) {
    return !!(result?.hasTargettedWeapon || result?.hasUnattached)
  }

  /**
   * Finalizes the enemy turn after a successful shot.
   * Updates UI, finishes turn, and triggers opponent UI update.
   * @private
   * @returns {void}
   * @memberof Enemy
   */
  _finalizeTurn () {
    this.score.finishTurn()
    this.updateUI()
    // @ts-ignore - opponent updateUI is parent method and needs parameter
    this.opponent?.updateUI?.(this.ships)
    // @ts-ignore - this.steps is typed as Object but has endTurn method
    this.steps?.endTurn?.()
  }

  /**
   * Handles click on opponent's cell for hint placement and weapon selection.
   * Used in multi-click weapon targeting to establish targeting hints.
   * Prepares UI and arms attached weapon if ready for execution.
   *
   * PROCESS:
   * 1. Validates opponent exists
   * 2. Deactivates temporary hints from previous clicks
   * 3. Clears area-of-effect highlights
   * 4. Checks weapon arming status (returns if not ready)
   * 5. Adds hint to game state
   * 6. Creates shadow source for visual feedback
   * 7. Arms weapon for next firing phase
   *
   * @public
   * @param {number} hintR - Hint row coordinate (0-indexed)
   * @param {number} hintC - Hint column coordinate (0-indexed)
   * @returns {void}
   * @memberof Enemy
   */
  onClickOppoCell (hintR, hintC) {
    // @ts-ignore - opponent type compatibility
    const opponent = this.opponent
    if (!opponent) return

    // Deactivate temporary hints on opponent board
    // @ts-ignore - opponent UI type compatibility
    opponent?.UI?.deactivateTempHints?.()
    // Clear area-of-effect highlight
    // @ts-ignore - this.UI.removeHighlightAoE is a real method
    this.UI?.removeHighlightAoE?.()

    // @ts-ignore - this.loadOut is typed as Object but has the required properties
    const loadOut = this.loadOut
    if (loadOut?.isNotArming) return

    // Clear previous coordinate selections and setup new target
    loadOut?.clearSelectedCoordinates?.()
    // @ts-ignore - opponent UI type compatibility
    const cell = opponent?.UI?.grid.nodeAt?.(hintC, hintR)
    // @ts-ignore - this.steps is typed as Object but has addHint method
    this.steps?.addHint?.(opponent?.UI, hintR, hintC, cell)
    // @ts-ignore - createShadowSource is parent method
    this.createShadowSource?.(hintR, hintC)
    // @ts-ignore - selectAttachedWeapon is parent method
    this.selectAttachedWeapon?.(cell, hintR, hintC, opponent)
  }

  /**
   * Destroys targets with the given weapon and effect.
   * Validates shot legality (unless marked as splash damage) and applies weapon effects to target cells.
   * Overrides parent's private destroy() method with public API for enemy-specific logic.
   *
   * VALIDATION (unless isSplash=true):
   * - Calls _isInvalidShot() to check if already hit this cell (prevents double-tap)
   * - Ensures effect array contains at least one coordinate
   *
   * RETURN VALUES:
   * - score object: Shot was valid and applied successfully
   * - LoadOut.noResult sentinel: Shot was invalid or had no effect
   *
   * SIDE EFFECTS:
   * - Mutates board state via Waters.destroy() (parent method)
   * - Updates opponent UI with hit/miss results
   * - May update score tracking
   *
   * @public
   * @param {Weapon} weapon - The weapon object being fired (includes letter, name, tag properties)
   * @param {Array<Array<number>>} effect - Array of effect coordinates where each is [row, col] with optional [row, col, power] tuple
   * @param {Object} [options] - Additional firing options object
   * @param {boolean} [options.isSplash=false] - If true, skips shot validity checks (used for splash damage which is inherently valid)
   * @returns {Object|Symbol} The weapon effect result object or LoadOut.noResult sentinel Symbol
   * @memberof Enemy
   */
  // @ts-ignore - Intentionally overrides parent's private destroy with public implementation
  destroy (weapon, effect, options) {
    if (!options?.isSplash) {
      // @ts-ignore - this.loadOut is typed as Object, _isInvalidShot checks shot validity
      if (this._isInvalidShot(effect)) {
        gameStatus.addToQueue(MESSAGES.ALREADY_SHOT, false)
        // @ts-ignore - LoadOut type issue
        return LoadOut.noResult
      }
      if (effect.length === 0) {
        gameStatus.addToQueue(MESSAGES.NO_EFFECT, false)
        // @ts-ignore - LoadOut type issue
        return LoadOut.noResult
      }
    }
    // @ts-ignore - applyWeaponEffect is parent method
    return this.applyWeaponEffect?.(weapon, effect, options)
  }

  /**
   * Checks if the shot is invalid (already shot).
   * @private
   * @param {number[][]} effect - Array of effect coordinates
   * @returns {boolean} True if invalid
   * @memberof Enemy
   */
  _isInvalidShot (effect) {
    return (
      effect.length === 1 && this.score.isOldShot(effect[0][1], effect[0][0])
    )
  }

  /**
   * Deactivates weapon and hint cells at specified locations.
   * Clears activation UI from both player and opponent boards.
   * Separates concerns between opponent weapon display and player shadow display.
   *
   * CLEARING LOGIC:
   * 1. Calls #deactivateOpponentWeapon() to remove weapon display on opponent board
   * 2. Calls #deactivateShadowCell() to remove visual feedback on own board
   * 3. Calls #deactivateOpponentHint() to remove targeting hint on opponent board
   *
   * PARAMETERS:
   * - All parameters accept null to skip that UI element (null bypasses #callUIMethod checks)
   * - Shadow coordinates (if non-null) trigger both shadow and hint deactivation
   * - Opponent weapon uses same coordinates as shadow row/col
   *
   * SIDE EFFECTS:
   * - Mutates opponent UI by removing CSS classes from weapon cells
   * - Mutates own UI by removing CSS classes from shadow cells
   * - Mutates opponent UI by removing CSS classes from hint cells
   *
   * @public
   * @param {number|null} opponentRow - Opponent board row (0-indexed) to deactivate weapon display (nullable; often same as shadowRow)
   * @param {number|null} opponentCol - Opponent board column (0-indexed) to deactivate (nullable)
   * @param {number|null} shadowRow - Shadow cell row (0-indexed) on own board for deactivation (nullable)
   * @param {number|null} shadowCol - Shadow cell column (0-indexed) on own board for deactivation (nullable)
   * @returns {void} No explicit return; mutates UI state via side effects
   * @memberof Enemy
   */
  deactivateWeapon (opponentRow, opponentCol, shadowRow, shadowCol) {
    this.#deactivateOpponentWeapon(opponentCol, opponentRow)

    if (shadowRow != null && shadowCol != null) {
      this.#deactivateShadowCell(shadowCol, shadowRow)
      this.#deactivateOpponentHint(shadowCol, shadowRow)
    }
  }

  /**
   * Deactivates weapon display on opponent board.
   *
   * @param {number|null} y - Row coordinate
   * @param {number|null} x - Column coordinate
   * @returns {void}
   * @memberof Enemy
   */
  #deactivateOpponentWeapon (x, y) {
    this.#callUIMethod(this.opponent?.UI, 'cellWeaponDeactivate', x, y, true)
  }

  /**
   * Deactivates shadow cell display on own board.
   *
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @returns {void}
   * @memberof Enemy
   */
  #deactivateShadowCell (x, y) {
    // @ts-ignore - this.UI.cellWeaponDeactivate is a real method
    const ui = /** @type {any} */ (this.UI)
    ui?.cellWeaponDeactivate?.(x, y)
  }

  /**
   * Deactivates hint display on opponent board.
   *
   * @param {number|null} y - Row coordinate
   * @param {number|null} x - Column coordinate
   * @returns {void}
   * @memberof Enemy
   */
  #deactivateOpponentHint (x, y) {
    // @ts-ignore - opponent UI type compatibility
    const opponentUI = /** @type {any} */ (this.opponent?.UI)
    this.#callUIMethod(opponentUI, 'cellHintDeactivate', x, y)
  }

  /**
   * Safely calls a UI method if the UI exists and method is available.
   * Generic helper to reduce duplication in UI method invocation.
   * Handles null UI gracefully and passes optional force parameter if provided.
   *
   * VALIDATION:
   * - Returns early if ui is falsy (undefined, null, false)
   * - Returns early if x or y is null (allows coordinate validation)
   * - Safely invokes method via optional chaining (?.) to handle missing methods
   *
   * USAGE PATTERN:
   * ```
   * this.#callUIMethod(this.opponent?.UI, 'cellWeaponDeactivate', x, y, true)
   * // Equivalent to:
   * this.opponent?.UI?.cellWeaponDeactivate?.(x, y, true)
   * ```
   *
   * SIDE EFFECTS:
   * - Invokes ui[methodName]() which may mutate UI DOM elements
   * - Passes force parameter to method (optional, used by some UI methods)
   *
   * @param {any} ui - The UI instance object (may be undefined or typed as Object with dynamic methods)
   * @param {string} methodName - The method name to invoke on ui object
   * @param {number|null} x - Column coordinate (0-indexed; null skips call with early return)
   * @param {number|null} y - Row coordinate (0-indexed; null skips call with early return)
   * @param {boolean} [force] - Optional force flag passed as third argument to method (e.g., force=true to override UI state)
   * @returns {void} No explicit return; invokes ui method via side effects
   * @memberof Enemy
   */
  #callUIMethod (ui, methodName, x, y, force) {
    if (y != null && x != null && ui) {
      const method = ui[methodName]
      if (typeof method === 'function') {
        force === undefined
          ? method.call(ui, x, y)
          : method.call(ui, x, y, force)
      }
    }
  }

  /**
   * Updates the weapon status display.
   * Displays the current weapon name, ammo count, and mode icons in game status.
   * Invokes gameStatus.updateWeaponStatus with weapon information and targeting state.
   *
   * PARAMETERS PASSED TO gameStatus:
   * - Current weapon system object from loadOut
   * - Map configuration (bh.maps for context)
   * - Number of selected coordinates (length for multi-step weapons)
   * - Targeting mode flag (whether weapon needs target selection)
   *
   * SIDE EFFECTS:
   * - Updates game status UI by calling gameStatus.updateWeaponStatus()
   * - May mutate UI DOM elements showing weapon info
   * - Displays mode icons based on targeting state
   *
   * @public
   * @param {*} _rack - The weapon rack (unused; uses current weapon system via loadOut instead)
   * @param {Object} _cursorInfo - Cursor information (unused; kept for interface compatibility)
   * @returns {void} No explicit return; updates UI via side effects
   * @memberof Enemy
   */
  updateWeaponStatus (_rack, _cursorInfo) {
    // @ts-ignore - this.loadOut is typed as Object but has currentWeaponSystem and selectedCoordinates
    const loadOut = this.loadOut
    // @ts-ignore - WeaponsSystem vs WeaponSystem type incompatibility
    const weaponSystem = loadOut?.currentWeaponSystem
    // @ts-ignore - WeaponsSystem vs WeaponSystem type incompatibility, Weapon type incompatibility (LoadOut.Weapon vs StatusUI.Weapon)
    gameStatus.updateWeaponStatus(
      // @ts-ignore - WeaponsSystem vs WeaponSystem type incompatibility
      weaponSystem,
      bh.maps,
      loadOut?.selectedCoordinates?.length ?? 0,
      this._hasUnattachedForCurrentWeapon?.()
    )
  }

  /**
   * Updates the weapon mode display.
   * Refreshes mode icons and indicator based on current weapon system and targeting state.
   * Delegates to gameStatus.updateWeaponStatus() for UI updates.
   *
   * SIDE EFFECTS:
   * - Updates game status display
   * - May mutate UI DOM elements showing mode indicators
   *
   * @public
   * @returns {void} No explicit return; updates UI via side effects
   * @memberof Enemy
   */
  updateWeaponMode () {
    const loadOut = /** @type {LoadOut|undefined} */ (this.loadOut)
    const weaponSystem = /** @type {WeaponSystem|undefined} */ (
      loadOut?.currentWeaponSystem
    )
    if (weaponSystem) {
      // @ts-ignore - Parent class updateMode is private but we call it here
      this.updateMode(weaponSystem)
    }
  }

  /**
   * Clears the weapon selection when player switches weapons.
   * Must be called BEFORE the weapon change is processed.
   *
   * REGRESSION PREVENTION: MODE ICON STATE BUG
   * ==========================================
   * Bug: When alternating weapon selections in two-click mode (Hide & Seek):
   *   1. Click Rail Bolt → click enemy board (selectedCellCoordinates stored)
   *   2. Click Missile button
   *   3. Click enemy board
   * Result: Mode icons (modeIcon1, modeIcon2) don't grey out correctly
   *
   * Root Cause Analysis:
   * - loadOut.selectedCoordinates is NOT cleared when weapon changes
   * - switchToWeapon() only changes weapon index, doesn't clear coordinates
   * - resetToSelectionMode() only updates UI display, not game state
   * - When updateWeaponStatus() called, it uses STALE selectedCoordinates.length
   * - Stale coordinate count → wrong stepIdx calculation → wrong mode icon state
   *
   * Solution: Clear ALL selection-related state on weapon change
   *   1. selectedCellCoordinates (two-click flag)
   *   2. loadOut.selectedCoordinates (targeting coordinates)
   *   3. steps state (ship and source)
   *   4. opponent hints (visual feedback)
   *
   * CALL ORDER:
   * 1. Player clicks new weapon button
   * 2. onClickWeaponButtons() calls _handleWeaponChange() FIRST
   * 3. _handleWeaponChange() clears all state
   * 4. Then weapon is switched
   * 5. Mode icons display correctly because updateWeaponStatus() sees clean state
   *
   * @private
   * @returns {void}
   * @memberof Enemy
   */
  _handleWeaponChange () {
    // CRITICAL: Reset two-click weapon selection before weapon is changed
    // This prevents firing the old weapon on the next click
    this.selectedCellCoordinates = null

    // Clear all state systems in logical order
    this.#clearCoordinateState()
    this.#clearSelectionVisualState()
    // Ensure cursor classes are cleared on the board element itself
    // (some tests spy on `_clearCursorClassesFromElement` directly)
    if (this._clearCursorClassesFromElement) {
      try {
        // @ts-ignore - this.UI.board property access
        this._clearCursorClassesFromElement(this.UI?.board)
      } catch {
        // ignore errors from mocked elements
      }
    }
    this.#clearBoardCursorClasses()
    this.#updateBoardCursor(null)
    this.#updateBoardTargetingState()
  }

  /**
   * Handles click on single shot button.
   *
   * IMPORTANT: When switching to single-shot mode we MUST remove any cursor
   * preview classes from the opponent board cells. Cursor classes are added
   * dynamically during multi-cell weapon targeting to show preview cursors on
   * individual cells. Single-shot mode does not use per-cell cursor previews,
   * so leaving those classes behind leads to stale UI state.
   *
   * Regression prevention: this method clears board cursor classes via
   * `#clearBoardCursorClasses()` after calling `switchToSingleShot()`. Do not
   * remove that cleanup or move it before `_handleWeaponChange()` — order is
   * intentional to ensure selection state is reset first.
   * @public
   * @returns {void}
   * @memberof Enemy
   */
  onClickSingleShotButton () {
    this._handleWeaponChange()
    // @ts-ignore - this.loadOut is typed as Object but has switchToSingleShot method
    this.loadOut?.switchToSingleShot?.()
    // Clear any cursor classes applied to board cells when switching to single-shot
    // Single-shot mode should show no cursor previews on the opponent board
    this.#clearBoardCursorClasses()
  }

  /**
   * Handles click on weapon buttons.
   * CRITICAL EXECUTION ORDER - UI STATE FIX
   * ======================================
   * This method has a specific call sequence to ensure UI mode icons update correctly.
   * The issue: steps.select() updates internal state and was overwriting UI changes if called after.
   *
   * REGRESSION HISTORY:
   * When weapon button clicked during targeting, selectedCellCoordinates cleared but UI icons
   * didn't update because steps.select() was called AFTER resetToSelectionMode() and overwrote
   * the icon class changes. Result: UI showed targeting mode while data was in selection mode.
   *
   * SOLUTION: Call resetToSelectionMode() AFTER steps.select() to ensure icons persist.
   *
   * EXECUTION SEQUENCE (MUST NOT CHANGE):
   * 1. _handleWeaponChange() ........... Clear data state (selectedCellCoordinates, hints)
   * 2. switchToWeapon() ................ Switch weapon in loadout
   * 3. steps.select() .................. Update game state machine
   * 4. resetToSelectionMode() ......... Update UI mode icons (LAST - won't be overwritten)
   *
   * WHY THIS ORDER MATTERS:
   * - Step 1-2 must come before 3 so game state knows the new weapon is selected
   * - Step 3 processes pending state changes and may modify internal flags
   * - Step 4 MUST come after 3 because it updates DOM elements that reflect state
   * - If 4 came before 3, the icon updates would be valid but then 3 might
   *   change internal state that steps.select() uses to decide icon state
   *
   * If you change this order, UI mode icons will become desynchronized from game state.
   *
   * @public
   * @param {string} letter - The weapon letter
   * @returns {void}
   * @memberof Enemy
   */
  onClickWeaponButtons (letter) {
    this._handleWeaponChange()
    // @ts-ignore - this.loadOut is typed as Object but has switchToWeapon method
    this.loadOut?.switchToWeapon(letter)
    // @ts-ignore - this.steps is typed as Object but has select method
    this.steps?.select()

    // Reset UI mode icons AFTER steps.select() to ensure they're not overwritten
    // This shows player is back in selection mode with the new weapon
    // CRITICAL: This must be the last operation to prevent being overwritten
    if (gameStatus?.resetToSelectionMode) {
      // @ts-ignore - this.loadOut is typed as Object but has currentWeaponSystem, Weapon type incompatibility
      const currentWeaponSystem = this.loadOut?.currentWeaponSystem
      // @ts-ignore - Weapon type incompatibility (LoadOut.Weapon vs StatusUI.Weapon)
      gameStatus.resetToSelectionMode(currentWeaponSystem?.weapon)
    }
  }

  /**
   * Handles click on reveal button.
   * Reveals all ships if not already revealed.
   * @public
   * @returns {void}
   * @memberof Enemy
   */
  onClickReveal () {
    if (!this.isRevealed) {
      this.revealAll()
      this.updateUI()
    }
  }

  /**
   * Wires up the button event handlers.
   * Attaches click event listeners to weapon and reveal buttons.
   * @public
   * @returns {void}
   * @memberof Enemy
   */
  wireupButtons () {
    if (this.weaponSelectHandler == null) {
      this.weaponSelectHandler = this.onClickSingleShotButton.bind(this)
    }
    if (this.revealHandler == null) {
      this.revealHandler = this.onClickReveal.bind(this)
    }
    // @ts-ignore - this.UI.weaponBtn is a real property
    const ui = /** @type {EnemyUI|undefined} */ (this.UI)
    const weaponBtn = ui?.weaponBtn
    const revealBtn = ui?.revealBtn
    if (weaponBtn) {
      // @ts-ignore - weaponSelectHandler type compatibility
      weaponBtn.addEventListener('click', this.weaponSelectHandler)
    }
    if (revealBtn) {
      // @ts-ignore - revealHandler type compatibility
      revealBtn.addEventListener('click', this.revealHandler)
    }
  }

  /**
   * Resets the model to initial state.
   * Clears score, map, and UI. Sets up ammo depletion handlers.
   * @public
   * @returns {void}
   * @memberof Enemy
   */
  resetModel () {
    const score = /** @type {Score|undefined} */ (this.score)
    const ui = /** @type {EnemyUI|undefined} */ (this.UI)
    // @ts-ignore - this.score is typed as Object but has reset method
    score?.reset?.()
    // @ts-ignore - resetMap is parent private method
    if (bh.map) this.resetMap(bh.map)
    ui?.playMode?.()
    // @ts-ignore - this.loadOut is typed as Object but has required properties
    const loadOut = this.loadOut
    if (loadOut) {
      loadOut.onOutOfAllAmmo = () => {
        if (ui?.weaponBtn) {
          ui.weaponBtn.disabled = true
          ui.weaponBtn.textContent = MESSAGES.SINGLE_SHOT_LABEL
        }
      }
      // Handle weapon change when running out of ammo
      loadOut.onOutOfAmmo = () => {
        this._handleWeaponChange()
        // @ts-ignore - currentWeaponSystem type compatibility
        const ws = /** @type {any} */ (loadOut.currentWeaponSystem)
        if (ws) {
          // @ts-ignore - Parent class updateMode is private
          this.updateMode(ws)
        }
      }
    }
    this.resetUI(this.ships)
  }

  /**
   * Builds the board UI and applies destruction state.
   * Constructs board grid and applies destroyed CSS class if applicable.
   *
   * @private
   * @returns {void}
   * @memberof Enemy
   */
  buildBoard () {
    // @ts-ignore - this.UI is typed as Object
    const ui = /** @type {any} */ (this.UI)
    ui?.buildBoard?.(this.onClickCell, this)
    // @ts-ignore - this.UI.board is a real property
    const board = /** @type {HTMLElement|undefined} */ (ui?.board)
    board?.classList.toggle(CSS_CLASSES.DESTROYED, this.boardDestroyed === true)
  }

  /**
   * Resets the UI and places ships.
   * @public
   * @async
   * @param {Array<ShipCell>} ships - The ships to place
   * @returns {Promise<void>}
   * @memberof Enemy
   */
  async resetUI (ships) {
    // @ts-ignore - this.UI is typed as Object
    const ui = /** @type {any} */ (this.UI)
    ui?.reset?.()
    this.buildBoard()
    await this.placeAll(ships)
    this.updateUI()
  }
}

export { Enemy }
// @ts-ignore - EnemyUI board property can be null
export const enemy = new Enemy(enemyUI)
