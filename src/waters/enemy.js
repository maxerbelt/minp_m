import { bh } from '../terrains/all/js/bh.js'
import { gameStatus } from './StatusUI.js'
import { enemyUI } from './enemyUI.js'
import { LoadOut } from './LoadOut.js'
import { Waters } from './Waters.js'
import { Player } from './steps.js'
import { Delay } from '../core/Delay.js'

const MAX_PLACEMENT_ATTEMPTS = 50
const MAX_PLACEMENT_RETRIES = 10
const ATTEMPTS_PER_RETRY = 25

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
      (bh.seekingMode && !bh.terrain?.hasAttachedWeapons)
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
    this._setSpinnerState(true, "Enemy's Turn")
    this.setBoardTargetingState(this._hasUnattachedForCurrentWeapon())
    this.steps.clearSource()
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
      spinner.classList.toggle('waiting', show)
      spinner.classList.toggle('hidden', !show)
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
    if (this.isGameOver()) {
      this.steps.select()
    } else {
      gameStatus.showMode('Your Turn')
    }
    if (this.loadOut.isSingleShot && !bh.terrain.hasAttachedWeapons) {
      this.steps.select()
    }
  }

  /**
   * Handles cursor changes on the board.
   * @param {string} oldCursor - The previous cursor class.
   * @param {CursorInfo} newCursorInfo - Information about the new cursor.
   */
  cursorChange (oldCursor, newCursorInfo) {
    const newCursor = newCursorInfo?.cursor
    if (newCursor === oldCursor) return
    const board = this.UI.board.classList
    if (oldCursor !== '') board.remove(oldCursor)
    if (newCursor !== '') board.add(newCursor)
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
    gameStatus.addToQueue(
      `Having difficulty placing all ships (${totalAttempts} attempts)`,
      true
    )

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
    gameStatus.addToQueue('Failed to place all ships after many attempts', true)
    this.boardDestroyed = true
    throw new Error('Failed to place all ships after many attempts')
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
      gameStatus.setTips(['Click On Square To Fire'])
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
      gameStatus.addToQueue('Wait For Enemy To Finish Their Turn', false)
      return false
    }
    if (this.opponent?.boardDestroyed) {
      gameStatus.addToQueue('Game Over - No More Shots Allowed', true)
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
   * In Hide and Seek mode with all attached weapons, respects the currently selected weapon.
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

    // In Hide and Seek mode with all attached weapons, do not fall back to random selection
    // This ensures the player's weapon choice is respected and allows multi-coordinate weapons to work
    if (!bh.seekingMode && bh.terrain?.hasAttachedWeapons) {
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
   * Handles cell click for enemy turn.
   * Validates turn legality and launches weapon at target.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Promise<void>}
   */
  async onClickCell (r, c) {
    if (!this.canTakeTurn()) return

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
        gameStatus.addToQueue('Already Shot Here - Try Again', false)
        return LoadOut.noResult
      }
      if (effect.length === 0) {
        gameStatus.addToQueue('Has no effect - Try Again', false)
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
   * @param {number} opponentRow - Opponent board row (nullable)
   * @param {number} opponentCol - Opponent board column (nullable)
   * @param {number} shadowRow - Shadow cell row (nullable)
   * @param {number} shadowCol - Shadow cell column (nullable)
   */
  deactivateWeapon (opponentRow, opponentCol, shadowRow, shadowCol) {
    this._safelyDeactivateUICell(
      this.opponent?.UI,
      'cellWeaponDeactivate',
      opponentRow,
      opponentCol,
      true
    )
    if (shadowRow != null && shadowCol != null) {
      this.UI.cellWeaponDeactivate(shadowRow, shadowCol)
      this._safelyDeactivateUICell(
        this.opponent?.UI,
        'cellHintDeactivate',
        shadowRow,
        shadowCol
      )
    }
  }

  /**
   * Safely calls a UI deactivation method if the cell exists.
   * @private
   * @param {EnemyUI} ui - The UI instance to deactivate on
   * @param {string} methodName - The deactivation method name
   * @param {number} row - Row coordinate
   * @param {number} col - Column coordinate
   * @param {boolean} [force] - Force flag for deactivation
   */
  _safelyDeactivateUICell (ui, methodName, row, col, force = false) {
    if (row != null && col != null && ui?.[methodName]) {
      ui[methodName](row, col, force)
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
    const weapon = weaponSystem?.weapon

    if (weapon) {
      gameStatus.displayAmmoStatus(
        weaponSystem,
        bh.maps,
        this.loadOut.selectedCoordinates.length,
        null,
        this._hasUnattachedForCurrentWeapon?.()
      )
    }
  }

  /**
   * Updates the weapon mode.
   */
  updateWeaponMode () {
    this.updateMode(this.loadOut.getCurrentWeaponSystem())
  }

  /**
   * Handles click on single shot button.
   */
  onClickSingleShotButton () {
    this.loadOut.switchToSingleShot()
    //  this.steps.select()
  }

  /**
   * Handles click on weapon buttons.
   * @param {string} letter - The weapon letter.
   */
  onClickWeaponButtons (letter) {
    this.loadOut.switchToWeapon(letter)
    this.steps.select()
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
    this.resetMap()
    this.UI.playMode()
    this.loadOut.onOutOfAllAmmo = () => {
      if (this.UI?.weaponBtn) {
        this.UI.weaponBtn.disabled = true
        this.UI.weaponBtn.textContent = 'single shot'
      }
    }
    this.loadOut.onOutOfAmmo = this.updateMode.bind(this)
    this.resetUI(this.ships)
  }

  /**
   * Builds the board UI.
   */
  buildBoard () {
    this.UI.buildBoard(this.onClickCell, this)
    this.UI.board.classList.toggle('destroyed', this.boardDestroyed)
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
