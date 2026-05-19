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

// CSS class names for board state
const CSS_CLASSES = {
  DESTROYED: 'destroyed',
  WAITING: 'waiting',
  HIDDEN: 'hidden',
  CURSOR_PREFIX: 'cursor-',
  OFF: 'off',
  ON: 'on'
}

// Message templates
const MESSAGES = {
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
 * @property {Object} [weapon] - The weapon object used
 * @property {Object} [score] - The score result from the launch
 */

/**
 * @typedef {Object} CursorInfo
 * @property {Object} [wps] - Weapon system information.
 * @property {number} [idx] - Cursor index.
 * @property {string} [cursor] - Cursor class name.
 */

/**
 * @typedef {Object} Weapon
 * @property {string} letter
 * @property {Array<string>} [cursors]
 * @property {string} [launchCursor]
 * @property {string} [tag]
 * @property {boolean} [postSelectShadow]
 */

/**
 * @typedef {Object} EnemyUI
 * @property {HTMLElement} board
 * @property {HTMLButtonElement} [weaponBtn]
 * @property {HTMLButtonElement} [revealBtn]
 * @property {Array<HTMLElement>} [weaponBtns]
 * @property {(row: number, col: number) => void} [cellWeaponActive]
 * @property {(row: number, col: number, force?: boolean) => void} [cellWeaponDeactivate]
 * @property {(row: number, col: number) => void} [cellHintDeactivate]
 * @property {() => void} [clearClasses]
 * @property {(ships: Array) => void} [revealAll]
 * @property {() => void} [playMode]
 * @property {() => void} [reset]
 */

/**
 * Represents the enemy player in the Waters game, handling AI behavior, ship placement, and weapon management.
 * Extends the Waters class to provide enemy-specific logic.
 */
// @ts-ignore - Intentionally overrides parent's private destroy method with public implementation
class Enemy extends Waters {
  /**
   * @param {Object} enemyUI - The UI instance for the enemy.
   */
  constructor (enemyUI) {
    super(enemyUI, Player.enemy)
    this.preamble0 = 'Enemy'
    this.preamble = 'The enemy was '
    this.preamble1 = 'The enemy '
    this.isRevealed = false

    /** @type {number|null} Timeout ID for enemy actions. */
    this.timeoutId = null

    /** @type {Function|null} Handler for weapon selection. */
    this.weaponSelectHandler = null

    /** @type {Function|null} Handler for reveal action. */
    this.revealHandler = null

    /** @type {boolean} Indicates this is an enemy waters instance. */
    this.enemyWaters = true

    /** @type {Object|null} Tracks the selected target cell for two-click weapon firing in hide/seek mode. */
    this.selectedCellCoordinates = null

    this._initializeSteps()
  }

  /**
   * Initializes the steps event handlers.
   * @private
   */
  _initializeSteps () {
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
   * Searches for classes starting with 'cursor-' prefix.
   *
   * @private
   * @returns {string} The cursor class name or empty string if not found
   */
  _extractCursorClass () {
    if (!this.UI?.board?.classList) {
      return ''
    }

    for (const cls of this.UI.board.classList) {
      if (cls.startsWith(CSS_CLASSES.CURSOR_PREFIX) || cls.includes('cursor')) {
        return cls
      }
    }

    return ''
  }

  /**
   * Clears targeting coordinate state to reset mode icons.
   * Ensures updateWeaponStatus() calculates correct mode index after weapon change.
   *
   * @private
   * @see _handleWeaponChange for full context on why this is critical
   */
  _clearCoordinateState () {
    if (this.loadOut.clearSelectedCoordinates) {
      this.loadOut.clearSelectedCoordinates()
    }
  }

  /**
   * Clears visual state from the previous weapon selection.
   * Deselects ship, removes weapon rack, and clears hint location.
   *
   * @private
   */
  _clearSelectionVisualState () {
    if (this.steps.clearSource) {
      this.steps.clearSource()
    }

    if (this.opponent?.UI?.deactivateTempHints) {
      this.opponent.UI.deactivateTempHints()
    }
  }

  /**
   * Updates board cursor display when weapon changes.
   *
   * @private
   * @param {string} oldCursor - Current cursor class to remove
   */
  _updateBoardCursor (oldCursor) {
    const oldCursorClass = oldCursor || this._extractCursorClass()

    if (this.loadOut.notifyCursorChange) {
      this.loadOut.notifyCursorChange(oldCursorClass)
    }
  }

  /**
   * Updates board targeting state based on current weapon configuration.
   *
   * @private
   */
  _updateBoardTargetingState () {
    this.setBoardTargetingState(this._hasUnattachedForCurrentWeapon())
  }

  /**
   * Remove cursor classes from the board element and all its child cells.
   * Uses `CellClassManager.removeCursorClasses` to clear terrain-specific cursor tags.
   * Cursor classes are attached both to the board element itself and to individual cells.
   * @private
   */
  _clearCursorClassesFromElement (element) {
    if (!element?.classList) return

    const staleCursorClasses = []
    for (const cls of Array.from(element.classList)) {
      if (cls.startsWith(CSS_CLASSES.CURSOR_PREFIX) || cls.includes('cursor')) {
        staleCursorClasses.push(cls)
      }
    }
    if (staleCursorClasses.length) {
      element.classList.remove(...new Set(staleCursorClasses))
    }
    CellClassManager.removeCursorClasses(element)
  }

  _clearBoardCursorClasses () {
    const board = this.UI?.board
    if (!board) return

    this._clearCursorClassesFromElement(board)

    const cells = board.children?.length
      ? board.children
      : board.querySelectorAll('*')
    for (const cell of cells) {
      try {
        this._clearCursorClassesFromElement(cell)
      } catch (err) {
        // ignore non-element nodes or unexpected structure
      }
    }
  }

  /**
   * Creates a handler that adapts the steps.js parameter format to our object-based approach.
   * Converts multiple parameters into a single activation data object.
   * @private
   * @returns {Function} Activation handler adapted for steps.js interface
   */
  _createActivationHandler () {
    // Return a function that matches steps.js callback signature (9 parameters)
    // but adapts it to our internal object-based approach
    // @ts-ignore - steps.js interface requires 9 parameters
    return function activationHandler (
      _rack,
      weapon,
      _wletter,
      _weaponId,
      r,
      c,
      _cell,
      shadowR,
      shadowC
    ) {
      // Construct activation data from parameters
      const activationData = {
        weapon,
        targetRow: r,
        targetCol: c,
        shadowRow: shadowR,
        shadowCol: shadowC
      }
      return this._handleActivate(activationData)
    }.bind(this)
  }
  _hasUnattachedForCurrentWeapon () {
    return (
      this.loadOut.isSingleShot ||
      this.loadOut.getUnattachedWeaponSystem() != null ||
      (bh.seekingMode && !this.hasAttachedWeapons)
    )
  }
  /**
   * Handles the selection event by updating the board classes.
   * @private
   */
  _handleSelect () {
    this.setBoardTargetingState(this._hasUnattachedForCurrentWeapon())
  }

  /**
   * Handles the aiming event by updating the board classes.
   * @private
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
   */
  // @ts-ignore - Called from _createActivationHandler() return function
  _handleActivate (activationData) {
    const { weapon, targetRow, targetCol, shadowRow, shadowCol } =
      activationData
    this.opponent?.UI?.cellWeaponActive?.(targetRow, targetCol)
    if (weapon.postSelectShadow) {
      this.UI.cellWeaponActive(shadowRow, shadowCol, '', weapon.tag)
    }
  }

  /**
   * Handles the change weapon event.
   * @private
   * @param {string} wletter - The weapon letter to switch to.
   */
  _handleChangeWeapon (wletter) {
    this.loadOut.switchToWeapon(wletter)
  }

  /**
   * Transitions the UI to the opponent's turn.
   * Called by friend.js when opponent (enemy) should have their turn.
   * @private
   */
  // @ts-ignore - Used by friend.js opponent._transitionToOpponentTurn()
  _transitionToOpponentTurn () {
    this.UI?.deactivateWeapons?.()
    this._setSpinnerState(true, MESSAGES.ENEMY_TURN)
  }

  /**
   * Updates the spinner display state and game status.
   * @private
   * @param {boolean} show - Whether to show the spinner
   * @param {string} mode - The mode text to display
   */
  _setSpinnerState (show, mode) {
    const spinner = document.getElementById('spinner')
    if (spinner instanceof HTMLImageElement) {
      spinner.classList.toggle(CSS_CLASSES.WAITING, show)
      spinner.classList.toggle(CSS_CLASSES.HIDDEN, !show)
      if (show) spinner.src = './images/loading.gif'
    }
    gameStatus.showMode(mode)
  }

  /**
   * Handles the begin turn event.
   * Displays game status and manages single-shot weapon logic.
   * @private
   */
  async _handleBeginTurn () {
    this._setSpinnerState(false, '')
    // Reset selected cell coordinates for two-click mode
    this.selectedCellCoordinates = null
    if (this.isGameOver()) {
      this.steps.select()
    } else {
      gameStatus.showMode(MESSAGES.YOUR_TURN)
    }
    if (this.loadOut.isSingleShot && !this.hasAttachedWeapons) {
      this.steps.select()
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
   * @param {string} oldCursor - The previous cursor class.
   * @param {CursorInfo} newCursorInfo - Information about the new cursor.
   */
  cursorChange (oldCursor, newCursorInfo) {
    const newCursor = newCursorInfo?.cursor
    if (newCursor === oldCursor) return

    const board = this.UI.board.classList

    // When switching to a new non-empty cursor, remove any stale cursor classes
    // from the board before adding the new one. This prevents multiple cursor
    // classes from accumulating during weapon/step changes.
    if (newCursor !== '') {
      if (oldCursor) {
        board.remove(oldCursor)
      }
      const staleCursorClasses = []
      for (const cls of board) {
        if (
          cls.startsWith(CSS_CLASSES.CURSOR_PREFIX) ||
          cls.includes('cursor')
        ) {
          staleCursorClasses.push(cls)
        }
      }
      const uniqueStaleClasses = [...new Set(staleCursorClasses)].filter(
        Boolean
      )
      if (uniqueStaleClasses.length) {
        board.remove(...uniqueStaleClasses)
      }
      board.add(newCursor)
    } else if (oldCursor !== '') {
      // Do NOT remove the old cursor when transitioning into an empty cursor
      // state; empty cursor is a transient firing-ready state and should leave
      // the previous weapon cursor visible.
    }

    this.updateMode(newCursorInfo.wps, newCursorInfo)
  }

  /**
   * Checks if the enemy has ammo available.
   * @returns {boolean} True if ammo is available.
   */
  hasAmmo () {
    return !this.hasNoAmmo()
  }

  /**
   * Checks if the enemy has no ammo.
   * @returns {boolean} True if no ammo is available.
   */
  hasNoAmmo () {
    return this.loadOut.isOutOfAmmo()
  }

  /**
   * Switches the weapon mode if possible.
   */
  switchMode () {
    if (this.isGameOver() || this.hasNoAmmo()) return
    this.loadOut.switchToNextWeaponSystem()
    this.updateUI()
  }

  /**
   * Checks if the game is over for the enemy.
   * @returns {boolean} True if the game is over.
   */
  isGameOver () {
    return this.boardDestroyed || this.isRevealed
  }

  /**
   * Attempts to place ships with retry logic.
   * Repeatedly tries to place all ships until all are successfully placed.
   * @private
   * @param {Array} ships - The ships to place
   * @returns {boolean} True if placement succeeded
   */
  _attemptShipPlacement (ships) {
    for (let trial = 0; trial < MAX_PLACEMENT_ATTEMPTS; trial++) {
      if (this.shipCellGrid.attemptToPlaceShips(ships)) {
        return true
      }
    }
    return false
  }

  /**
   * Handles placement failure and retries with exponential attempt counts.
   * @private
   * @param {Array} ships - The ships to place
   * @param {number} attempt - Current retry attempt (0-indexed)
   * @returns {Promise<boolean>} True if placement succeeded after retry
   */
  async _handlePlacementFailure (ships, attempt) {
    const totalAttempts = (attempt + 1) * ATTEMPTS_PER_RETRY
    gameStatus.addToQueue(MESSAGES.PLACEMENT_DIFFICULTY(totalAttempts), true)

    if (attempt < MAX_PLACEMENT_RETRIES) {
      await Delay.yield()
      return this._attemptShipPlacementWithRetry(ships)
    }

    this._finalizePlacementFailure()
    return false
  }

  /**
   * Attempts to place ships and returns the result.
   * @private
   * @param {Array} ships - The ships to place.
   * @returns {boolean} True if all ships placed successfully.
   */
  _attemptShipPlacementWithRetry (ships) {
    return this._attemptShipPlacement(ships)
  }

  /**
   * Finalizes placement failure state after all retries have been exhausted.
   * @private
   */
  _finalizePlacementFailure () {
    this.UI.enableBtns()
    gameStatus.addToQueue(MESSAGES.PLACEMENT_FAILED, true)
    this.boardDestroyed = true
    throw new Error(MESSAGES.PLACEMENT_FAILED)
  }

  /**
   * Places all ships on the board asynchronously.
   * @param {Array} [ships=this.ships] - The ships to place.
   * @returns {Promise<void>}
   */
  async placeAll (ships = this.ships) {
    this.UI.enableBtns()
    await Delay.yield()
    if (this._attemptShipPlacement(ships)) {
      gameStatus.setTips([MESSAGES.CLICK_TO_FIRE])
      this.UI.enableBtns()
    } else {
      await this._handlePlacementFailure(ships, 0)
    }
  }

  /**
   * Reveals all ships on the board.
   */
  revealAll () {
    this.UI.clearClasses()
    this.UI.revealAll(this.ships)
    this._hideWaiting()
    this.opponent?.hideWaiting?.()
    this.boardDestroyed = true
    this.isRevealed = true
  }

  /**
   * Updates all UI components.
   * Refreshes weapon UI, tally, and button availability based on game state.
   */
  updateUI () {
    this._updateButtonStates()
    super.updateUI(this.ships)
    this.updateMode()
  }

  /**
   * Updates the state of buttons based on game status.
   * Disables buttons when game is over or out of ammo.
   * @private
   */
  _updateButtonStates () {
    const isGameOver = this.isGameOver()
    const isOutOfAmmo = this.hasNoAmmo()
    const shouldDisableWeapon = isGameOver || isOutOfAmmo

    if (this.UI?.weaponBtn) {
      this.UI.weaponBtn.disabled = shouldDisableWeapon
    }
    if (this.UI?.revealBtn) {
      this.UI.revealBtn.disabled = isGameOver
    }
  }

  /**
   * Initializes weapon button event handlers.
   * Creates buttons for each available weapon system.
   */
  setupWeaponButtonHandlers () {
    if (this.UI?.weaponBtn == null) return

    // Debug: inspect weapon systems available when wiring buttons
    try {
      const all = this.loadOut?.weaponSystems || []
      const limited = this.loadOut?.getLimitedWeaponSystems() || []
      const allInfo = all.map(wps => ({
        letter: wps.weapon?.letter,
        tag: wps.weapon?.tag,
        isLimited: !!wps.weapon?.isLimited,
        ammoCapacity:
          typeof wps.ammoCapacity === 'function' ? wps.ammoCapacity() : null
      }))
      const limitedInfo = limited.map(wps => ({
        letter: wps.weapon?.letter,
        tag: wps.weapon?.tag,
        ammoCapacity:
          typeof wps.ammoCapacity === 'function' ? wps.ammoCapacity() : null
      }))
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

    this.UI.weaponBtns = this.UI?.weaponButtons(
      this.UI?.weaponBtn,
      this.loadOut?.getLimitedWeaponSystems(),
      this.onClickWeaponButtons.bind(this)
    )
  }

  /**
   * Checks if the enemy can take a turn.
   * @returns {boolean} True if a turn can be taken.
   */
  canTakeTurn () {
    if (this.isGameOver() || this.loadOut.hasNoCurrentAmmo()) {
      return false
    }
    if (this.timeoutId) {
      gameStatus.addToQueue(MESSAGES.WAIT_FOR_ENEMY, false)
      return false
    }
    if (this.opponent?.boardDestroyed) {
      gameStatus.addToQueue(MESSAGES.GAME_OVER, true)
      return false
    }
    return true
  }

  /**
   * Prepares and launches a weapon at the specified location.
   * @private
   * @param {number} r - Target row.
   * @param {number} c - Target column.
   * @returns {Promise<WeaponLaunchResult|null>} The result of the weapon launch.
   */
  async _prepareWeaponLaunch (r, c) {
    this.UI.removeHighlightAoE()
    this.setWeaponFireHandlers()
    return await this._launchWeaponSequence(r, c)
  }

  /**
   * Launches the weapon sequence, trying selected, random, and default launch flows.
   * In Hide and Seek mode with opponent having attached weapons, respects the currently selected weapon.
   * @private
   * @param {number} r - Target row.
   * @param {number} c - Target column.
   * @returns {Promise<WeaponLaunchResult|null>} The result of the launch.
   */
  async _launchWeaponSequence (r, c) {
    let result = await this.launchSelectedWeapon(r, c)
    if (this._isFinalLaunchResult(result)) {
      return result
    }

    // When attached weapons are active, do not fall back to random selection.
    // This ensures the player's weapon choice is respected and allows multi-coordinate
    // weapons to continue across the two-click flow.
    if (this.opponent?.hasAttachedWeapons || this.hasAttachedWeapons) {
      // Return the current result (null for incomplete selection, allowing next click to continue)
      return result
    }

    // @ts-ignore - Parent class launchRandomWeapon return type compatibility
    result = await this.launchRandomWeapon(r, c, !bh.seekingMode)
    if (this._isFinalLaunchResult(result)) {
      return result
    }

    return await this.fireWeaponAt(
      r,
      c,
      null,
      LoadOut.launchDefault.bind(this, this.UI)
    )
  }

  /**
   * Sets up and launches a weapon at the specified location.
   * @param {number} r - Target row coordinate.
   * @param {number} c - Target column coordinate.
   * @returns {Promise<WeaponLaunchResult|null>} Result with weapon and score.
   */
  async setupWeapon (r, c) {
    return await this._prepareWeaponLaunch(r, c)
  }

  /**
   * Determines whether a weapon launch requires no further action.
   * @private
   * @param {WeaponLaunchResult|null} result
   * @returns {boolean}
   */
  _isFinalLaunchResult (result) {
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
   * @private
   * @returns {void}
   */
  _selectCurrentWeaponOnRandomShip () {
    // Get the weapon the player currently has selected (via weapon button click)
    const currentWeapon = this.loadOut.getCurrentWeaponSystem()

    if (!currentWeapon?.weapon?.letter) {
      // Fallback to random weapon if player hasn't selected one
      this.randomAttachedWeapon(this.opponent)
      return
    }

    const targetLetter = currentWeapon.weapon.letter
    const shipCandidates = this.opponent?.ships || this.ships

    // CRITICAL: Filter to only ships that have THIS SPECIFIC WEAPON loaded
    // This prevents selecting a MissileBoat when Rail Bolt is selected
    const shipsWithWeapon = shipCandidates.filter(ship => {
      const entries = ship.getLoadedWeaponEntries()
      return entries.some(
        ([_key, weapon]) => weapon.weapon?.letter === targetLetter
      )
    })

    if (shipsWithWeapon.length === 0) {
      // Fallback to random weapon if no ship has the current weapon
      // This is a valid edge case, not an error
      this.randomAttachedWeapon(this.opponent)
      return
    }

    // Select a random ship from the filtered list
    const selectedShip = randomElement(shipsWithWeapon)

    this.steps.addShip(selectedShip)

    // Find and select the target weapon from the ship
    const entries = selectedShip.getLoadedWeaponEntries()
    const [key, weapon] = entries.find(
      ([_k, w]) => w.weapon?.letter === targetLetter
    )

    if (!key || !weapon) {
      // Fallback if weapon not found (should rarely happen after filtering)
      this.randomAttachedWeapon(this.opponent)
      return
    }

    const [launchC, launchR] = parsePair(key)
    const viewModel = this.opponent?.UI || this.UI
    const selectedCell = viewModel.gridCellAt(launchR, launchC)

    // Generate hint coordinates for targeting
    const hintCoords = this.generateSourceHint(selectedShip, this.opponent)

    this.steps.addSource(viewModel, launchR, launchC, selectedCell)

    // Create weapon selection for the current weapon
    const selection = this.createWeaponSelection(
      launchR,
      launchC,
      weapon.id,
      hintCoords[0],
      hintCoords[1]
    )
    this._armSelectedWeapon(selection, this.opponent)
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
   * @private
   * @returns {void}
   */
  _onFirstClickSelection () {
    this._selectCurrentWeaponOnRandomShip()
    gameStatus.addToQueue(MESSAGES.ENEMY_SELECTING_TARGET, true)
  }

  /**
   * Handles the second click in hide/seek mode: fires the selected weapon at the target.
   * @private
   * @param {number} r - Target row coordinate
   * @param {number} c - Target column coordinate
   * @returns {Promise<void>}
   */
  async _onSecondClickFire (r, c) {
    // Ensure fire handlers are attached before firing.
    // This is required for the two-click Hide/Seek path because the selected
    // weapon may be armed earlier on the first click, but the actual fire
    // callbacks are only finalized here.
    // Without this call, the shot can animate but never deliver hit/miss results.
    this.setWeaponFireHandlers()
    this.selectedCellCoordinates = null
    const result = await this.fireWeaponAt(r, c, this.loadOut.selectedWeapon)
    // @ts-ignore - fireWeaponAt return type includes score property
    if (result?.score) {
      // @ts-ignore - fireWeaponAt return type includes score property
      this.opponent?.updateResultsOfBomb(result.weapon, result.score)
    }
    this.opponent?.updateUI()
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
   * - Check is based on opponent?.hasAttachedWeapons (works for both Hide & Seek and pure Seek modes)
   * - NOT based on bh.seekingMode flag (which is false in Hide & Seek mode)
   * - In Hide & Seek: opponent has preset ships with weapons → hasAttachedWeapons = true
   * - In pure Seek: opponent generates ships with weapons → hasAttachedWeapons = true
   * - In modes without attached weapons: hasAttachedWeapons = false → single-click fires
   *
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Promise<void>}
   */
  async onClickCell (r, c) {
    if (!this.canTakeTurn()) return

    if (this.loadOut?.isSingleShot) {
      this.selectedCellCoordinates = null
      const result = await this.fireWeaponAt(
        r,
        c,
        this.loadOut.getCurrentWeaponSystem()
      )
      if (this._shouldWaitForWeaponResult(result)) return
      this._processWeaponResult(result)
      this._finalizeTurn()
      return
    }

    // Two-click behavior: Check for attached weapons, NOT the seekingMode flag.
    // This allows Hide & Seek mode to work correctly while seekingMode = false,
    // and also supports pure Seek mode when no opponent model exists.
    if (this.opponent?.hasAttachedWeapons || this.hasAttachedWeapons) {
      // Implement two-click behavior
      if (this.selectedCellCoordinates === null) {
        // First click: select weapon and ship
        this._onFirstClickSelection()
        this.selectedCellCoordinates = { r, c }
        return
      } else {
        // Second click: fire at target
        await this._onSecondClickFire(r, c)
        return
      }
    }

    // Default single-click behavior for other modes
    const result = await this.setupWeapon(r, c)
    if (this._shouldWaitForWeaponResult(result)) return
    this._processWeaponResult(result)
    this._finalizeTurn()
  }

  /**
   * Processes weapon launch result and applies effects if successful.
   * @private
   * @param {WeaponLaunchResult|null} result - The weapon launch result
   */
  _processWeaponResult (result) {
    if (result?.score) {
      this.updateResultsOfBomb(result.weapon, result.score)
    }
  }

  /**
   * Determines whether the enemy should wait for an additional weapon result.
   * @private
   * @param {WeaponLaunchResult|null} result
   * @returns {boolean}
   */
  _shouldWaitForWeaponResult (result) {
    return !!(result?.hasTargettedWeapon || result?.hasUnattached)
  }

  /**
   * Finalizes the enemy turn after a successful shot.
   * @private
   */
  _finalizeTurn () {
    this.score.finishTurn()
    this.updateUI()
    this.opponent?.updateUI()
    this.steps.endTurn()
  }

  /**
   * Handles click on opponent's cell for hint placement.
   * Prepares UI and arms attached weapon if ready.
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   */
  onClickOppoCell (hintR, hintC) {
    if (!this.opponent) return

    // Deactivate temporary hints on opponent board
    this.opponent.UI.deactivateTempHints()
    // Clear area-of-effect highlight
    this.UI.removeHighlightAoE()

    if (this.loadOut.isNotArming()) return

    // Clear previous coordinate selections and setup new target
    this.loadOut.clearSelectedCoordinates()
    const cell = this.opponent.UI.gridCellAt(hintR, hintC)
    this.steps.addHint(this.opponent.UI, hintR, hintC, cell)
    this.createShadowSource(hintR, hintC)
    this.selectAttachedWeapon(cell, hintR, hintC, this.opponent)
  }

  /**
   * Destroys targets with the given weapon and effect.
   * Validates shot legality and applies weapon effects to target cells.
   * Overrides parent's private destroy() with public API for enemy-specific logic.
   * @param {Object} weapon - The weapon object
   * @param {Array} effect - Array of effect coordinates
   * @param {Object} [options] - Additional options for application
   * @param {boolean} [options.isSplash] - If true, skips shot validity checks
   * @returns {*} The result of applying weapon effect
   */
  // @ts-ignore - Intentionally overrides parent's private destroy with public implementation
  destroy (weapon, effect, options) {
    if (!options?.isSplash) {
      if (this._isInvalidShot(effect)) {
        gameStatus.addToQueue(MESSAGES.ALREADY_SHOT, false)
        return LoadOut.noResult
      }
      if (effect.length === 0) {
        gameStatus.addToQueue(MESSAGES.NO_EFFECT, false)
        return LoadOut.noResult
      }
    }
    return this.applyWeaponEffect(weapon, effect, options)
  }

  /**
   * Checks if the shot is invalid (already shot).
   * @private
   * @param {Array} effect - The effect.
   * @returns {boolean} True if invalid.
   */
  _isInvalidShot (effect) {
    return (
      effect.length === 1 && !this.score.newShotKey(effect[0][0], effect[0][1])
    )
  }

  /**
   * Deactivates weapon and hint cells at specified locations.
   * Clears activation UI from both player and opponent boards.
   *
   * Separates concerns:
   * 1. Opponent weapon cell deactivation
   * 2. Own board shadow cell deactivation
   * 3. Opponent hint cell deactivation
   *
   * @param {number|null} opponentRow - Opponent board row (nullable)
   * @param {number|null} opponentCol - Opponent board column (nullable)
   * @param {number|null} shadowRow - Shadow cell row (nullable)
   * @param {number|null} shadowCol - Shadow cell column (nullable)
   */
  deactivateWeapon (opponentRow, opponentCol, shadowRow, shadowCol) {
    this._deactivateOpponentWeapon(opponentRow, opponentCol)

    if (shadowRow != null && shadowCol != null) {
      this._deactivateShadowCell(shadowRow, shadowCol)
      this._deactivateOpponentHint(shadowRow, shadowCol)
    }
  }

  /**
   * Deactivates weapon display on opponent board.
   *
   * @private
   * @param {number|null} row - Row coordinate
   * @param {number|null} col - Column coordinate
   */
  _deactivateOpponentWeapon (row, col) {
    this._callUIMethod(
      this.opponent?.UI,
      'cellWeaponDeactivate',
      row,
      col,
      true
    )
  }

  /**
   * Deactivates shadow cell display on own board.
   *
   * @private
   * @param {number} row - Row coordinate
   * @param {number} col - Column coordinate
   */
  _deactivateShadowCell (row, col) {
    if (this.UI?.cellWeaponDeactivate) {
      this.UI.cellWeaponDeactivate(row, col)
    }
  }

  /**
   * Deactivates hint display on opponent board.
   *
   * @private
   * @param {number|null} row - Row coordinate
   * @param {number|null} col - Column coordinate
   */
  _deactivateOpponentHint (row, col) {
    this._callUIMethod(this.opponent?.UI, 'cellHintDeactivate', row, col)
  }

  /**
   * Safely calls a UI method if the UI exists and method is available.
   * Generic helper to reduce duplication in UI method invocation.
   *
   * @private
   * @param {EnemyUI|undefined} ui - The UI instance (may be undefined)
   * @param {string} methodName - The method name to call
   * @param {number|null} row - Row coordinate (may be null)
   * @param {number|null} col - Column coordinate (may be null)
   * @param {boolean} [force] - Optional force flag for method
   */
  _callUIMethod (ui, methodName, row, col, force) {
    if (row != null && col != null && ui?.[methodName]) {
      force === undefined
        ? ui[methodName](row, col)
        : ui[methodName](row, col, force)
    }
  }

  /**
   * Updates the weapon status display.
   * Displays the current weapon name, ammo count, and mode icons in game status.
   * @param {*} _rack - The weapon rack (unused, uses current weapon system)
   * @param {Object} _cursorInfo - Cursor information (unused)
   */
  updateWeaponStatus (_rack, _cursorInfo) {
    const weaponSystem = this.loadOut.getCurrentWeaponSystem()
    gameStatus.updateWeaponStatus(
      weaponSystem,
      bh.maps,
      this.loadOut.selectedCoordinates.length,

      this._hasUnattachedForCurrentWeapon?.()
    )
  }

  /**
   * Updates the weapon mode.
   */
  updateWeaponMode () {
    this.updateMode(this.loadOut.getCurrentWeaponSystem())
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
   */
  _handleWeaponChange () {
    // CRITICAL: Reset two-click weapon selection before weapon is changed
    // This prevents firing the old weapon on the next click
    this.selectedCellCoordinates = null

    // Clear all state systems in logical order
    this._clearCoordinateState()
    this._clearSelectionVisualState()
    // Ensure cursor classes are cleared on the board element itself
    // (some tests spy on `_clearCursorClassesFromElement` directly)
    if (this._clearCursorClassesFromElement) {
      try {
        this._clearCursorClassesFromElement(this.UI?.board)
      } catch (err) {
        // ignore errors from mocked elements
      }
    }
    this._clearBoardCursorClasses()
    this._updateBoardCursor(null)
    this._updateBoardTargetingState()
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
   * `_clearBoardCursorClasses()` after calling `switchToSingleShot()`. Do not
   * remove that cleanup or move it before `_handleWeaponChange()` — order is
   * intentional to ensure selection state is reset first.
   */
  onClickSingleShotButton () {
    this._handleWeaponChange()
    this.loadOut.switchToSingleShot()
    // Clear any cursor classes applied to board cells when switching to single-shot
    // Single-shot mode should show no cursor previews on the opponent board
    this._clearBoardCursorClasses()
    //  this.steps.select()
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
   * @param {string} letter - The weapon letter.
   */
  onClickWeaponButtons (letter) {
    this._handleWeaponChange()
    this.loadOut.switchToWeapon(letter)
    this.steps.select()

    // Reset UI mode icons AFTER steps.select() to ensure they're not overwritten
    // This shows player is back in selection mode with the new weapon
    // CRITICAL: This must be the last operation to prevent being overwritten
    if (gameStatus?.resetToSelectionMode) {
      const currentWeaponSystem = this.loadOut.getCurrentWeaponSystem?.()
      gameStatus.resetToSelectionMode(currentWeaponSystem?.weapon)
    }
  }

  /**
   * Handles click on reveal button.
   */
  onClickReveal () {
    if (!this.isRevealed) {
      this.revealAll()
      this.updateUI()
    }
  }

  /**
   * Wires up the button event handlers.
   */
  wireupButtons () {
    if (this.weaponSelectHandler == null) {
      this.weaponSelectHandler = this.onClickSingleShotButton.bind(this)
    }
    if (this.revealHandler == null) {
      this.revealHandler = this.onClickReveal.bind(this)
    }
    if (this.UI?.weaponBtn?.addEventListener) {
      this.UI.weaponBtn.addEventListener('click', this.weaponSelectHandler)
    }
    if (this.UI?.revealBtn?.addEventListener) {
      this.UI.revealBtn.addEventListener('click', this.revealHandler)
    }
  }

  /**
   * Resets the model to initial state.
   */
  resetModel () {
    this.score.reset()
    this.resetMap(bh.map)
    this.UI.playMode()
    this.loadOut.onOutOfAllAmmo = () => {
      if (this.UI?.weaponBtn) {
        this.UI.weaponBtn.disabled = true
        this.UI.weaponBtn.textContent = MESSAGES.SINGLE_SHOT_LABEL
      }
    }
    // Handle weapon change when running out of ammo
    this.loadOut.onOutOfAmmo = () => {
      this._handleWeaponChange()
      this.updateMode()
    }
    this.resetUI(this.ships)
  }

  /**
   * Builds the board UI.
   */
  /**
   * Builds the board UI and applies destruction state.
   *
   * @private
   */
  buildBoard () {
    this.UI.buildBoard(this.onClickCell, this)
    this.UI.board.classList.toggle(CSS_CLASSES.DESTROYED, this.boardDestroyed)
  }

  /**
   * Resets the UI and places ships.
   * @param {Array} ships - The ships to place.
   */
  resetUI (ships) {
    this.UI.reset()
    this.buildBoard()
    this.placeAll(ships)
    this.updateUI()
  }
}

export { Enemy }
export const enemy = new Enemy(enemyUI)
