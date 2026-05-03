import { bh } from '../terrains/all/js/bh.js'
import { Random } from '../core/Random.js'
import { gameStatus } from './StatusUI.js'
import { enemyUI } from './enemyUI.js'
import { LoadOut } from './LoadOut.js'
import { Waters } from './Waters.js'
import { Player } from './steps.js'
import { Delay } from '../core/Delay.js'

const MAX_PLACEMENT_ATTEMPTS = 50
const MAX_PLACEMENT_RETRIES = 10
const ATTEMPTS_PER_RETRY = 25
const ENEMY_TURN_DELAY = 50

/**
 * @typedef {Object} WeaponLaunchResult
 * @property {boolean} [hasTargettedWeapon]
 * @property {Object} [weapon]
 * @property {Object} [score]
 */

/**
 * @typedef {Object} CursorInfo
 * @property {Object} [wps]
 * @property {number} [idx]
 * @property {string} [cursor]
 */

/**
 * Represents the enemy player in the Waters game, handling AI behavior, ship placement, and weapon management.
 * Extends the Waters class to provide enemy-specific logic.
 */
class Enemy extends Waters {
  /**
   * @param {Object} enemyUI - The UI instance for the enemy.
   */
  constructor (enemyUI) {
    super(enemyUI)
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
    super.initializeSteps(Player.enemy)
    this.steps.onBeginTurn = this._handleBeginTurn.bind(this)
    this.steps.onDeactivate = this.deactivateWeapon.bind(this)
    this.steps.onActivate = this._handleActivate.bind(this)
    this.steps.onSelect = this._handleSelect.bind(this)
    this.steps.onChangeWeapon = this._handleChangeWeapon.bind(this)
  }

  /**
   * Handles the selection event by updating the board classes.
   * @private
   */
  _handleSelect () {
    this._setBoardTargetingState(true)
  }

  /**
   * Sets the board targeting state.
   * @param {boolean} isTargeting - Whether the board is in targeting mode.
   * @private
   */
  _setBoardTargetingState (isTargeting) {
    const boardClasses = this.UI.board.classList
    if (isTargeting) {
      boardClasses.add('targetting')
      boardClasses.remove('not-step')
    } else {
      boardClasses.remove('targetting')
      boardClasses.add('not-step')
    }
  }

  /**
   * Handles the activation event for a weapon rack.
   * @private
   * @param {*} rack - The weapon rack.
   * @param {*} weapon - The weapon object.
   * @param {string} _wletter - Weapon letter (unused).
   * @param {number} _weaponId - Weapon ID (unused).
   * @param {number} r - Row coordinate.
   * @param {number} c - Column coordinate.
   * @param {HTMLElement} _cell - Cell element (unused).
   * @param {number} shadowR - Shadow row.
   * @param {number} shadowC - Shadow column.
   */
  _handleActivate (
    rack,
    weapon,
    _wletter,
    _weaponId,
    r,
    c,
    _cell,
    shadowR,
    shadowC
  ) {
    this.opponent?.UI?.cellWeaponActive?.(r, c)
    if (weapon.postSelectCursor > 0) {
      this.UI.cellWeaponActive(shadowR, shadowC, '', weapon.tag)
    }
    this.updateMode(rack)
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
   * Handles the end turn event, transitioning to the opponent's turn.
   * @private
   * @returns {Promise<void>}
   */
  async _handleEndTurn () {
    if (
      !this.opponent ||
      this.opponent.boardDestroyed ||
      this.opponent.isRevealed
    ) {
      return
    }

    this._transitionToOpponentTurn()
    await Delay.wait(ENEMY_TURN_DELAY)
    this.opponent.testContinue = true
    await this.opponent.seekStep()
  }

  /**
   * Transitions the UI to the opponent's turn.
   * @private
   */
  _transitionToOpponentTurn () {
    this._updateSpinner(true, "Enemy's Turn")
    this._setBoardTargetingState(false)
    this.steps.clearSource()
  }

  /**
   * Handles the begin turn event.
   * @private
   */
  _handleBeginTurn () {
    this._hideWaiting()
    if (this.isGameOver()) {
      this.steps.select()
    } else {
      gameStatus.showMode('Your Turn')
    }
  }

  /**
   * Hides the waiting state.
   * @private
   */
  _hideWaiting () {
    this._updateSpinner(false, '')
    if (this.loadOut.isSingleShot && !bh.terrain.hasAttachedWeapons) {
      this.steps.select()
    }
  }

  /**
   * Updates the spinner display.
   * @private
   * @param {boolean} show - Whether to show the spinner.
   * @param {string} mode - The mode text to display.
   */
  _updateSpinner (show, mode) {
    const spinner = document.getElementById('spinner')
    if (spinner) {
      spinner.classList.toggle('waiting', show)
      spinner.classList.toggle('hidden', !show)
      if (show) spinner.src = './images/loading.gif'
    }
    gameStatus.showMode(mode)
  }

  /**
   * Handles cursor changes on the board.
   * @param {string} oldCursor - The previous cursor class.
   * @param {Object} newCursorInfo - Information about the new cursor.
   */
  cursorChange (oldCursor, newCursorInfo) {
    const newCursor = newCursorInfo?.cursor
    if (newCursor === oldCursor) return
    const board = this.UI.board.classList
    if (oldCursor !== '') board.remove(oldCursor)
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
    this.loadOut.switchWeapon()
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
   * Handles ship placement with retry logic.
   * @private
   * @param {Array} ships - The ships to place.
   * @param {number} attempt - The current attempt number.
   */
  _handlePlacement (ships, attempt) {
    this.UI.disableBtns()
    for (let i = 0; i < MAX_PLACEMENT_ATTEMPTS; i++) {
      if (this.shipCellGrid.attemptToPlaceShips(ships)) {
        gameStatus.setTips(['Click On Square To Fire'])
        this.UI.enableBtns()
        return
      }
    }
    this._handlePlacementFailure(ships, attempt)
  }

  /**
   * Handles placement failure and retries if possible.
   * @private
   * @param {Array} ships - The ships to place.
   * @param {number} attempt - The current attempt number.
   */
  async _handlePlacementFailure (ships, attempt) {
    gameStatus._addToQueue(
      `Having difficulty placing all ships (${
        (attempt + 1) * ATTEMPTS_PER_RETRY
      } attempts)`,
      true
    )

    if (attempt < MAX_PLACEMENT_RETRIES) {
      await Delay.yield()
      this._tryPlacementRetry(ships, attempt + 1)
      return
    }

    this.UI.enableBtns()
    gameStatus._addToQueue(
      'Failed to place all ships after many attempts',
      true
    )
    this.boardDestroyed = true
    throw new Error('Failed to place all ships after many attempts')
  }

  /**
   * Attempts placement again after a retry delay.
   * @private
   * @param {Array} ships - The ships to place.
   * @param {number} attempt - Retry attempt index.
   */
  _tryPlacementRetry (ships, attempt) {
    this._handlePlacement(ships, attempt)
  }

  /**
   * Places all ships on the board asynchronously.
   * @param {Array} [ships=this.ships] - The ships to place.
   * @returns {Promise<void>}
   */
  async placeAll (ships = this.ships) {
    this.UI.enableBtns()
    await Delay.yield()
    this._handlePlacement(ships, 0)
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
   */
  updateUI () {
    this._updateStats()
    this.updateMode()
    this._updateButtons()
    super.updateUI(this.ships)
  }

  /**
   * Updates the stats display.
   * @private
   */
  _updateStats () {
    this.UI.score.display(this.ships, ...this.score.counts())
  }

  /**
   * Updates the state of buttons based on game status.
   * @private
   */
  _updateButtons () {
    const disabled = this.isGameOver() || this.hasNoAmmo()
    this.UI.weaponBtn.disabled = disabled
    this.UI.revealBtn.disabled = this.isGameOver()
  }

  /**
   * Checks if the enemy can take a turn.
   * @returns {boolean} True if a turn can be taken.
   */
  canTakeTurn () {
    if (this.isGameOver() || this.loadOut.checkNoAmmo()) {
      return false
    }
    if (this.timeoutId) {
      gameStatus._addToQueue('Wait For Enemy To Finish Their Turn', false)
      return false
    }
    if (this.opponent?.boardDestroyed) {
      gameStatus._addToQueue('Game Over - No More Shots Allowed', true)
      return false
    }
    return true
  }

  /**
   * Prepares and launches a weapon at the specified location.
   * @private
   * @param {number} r - Target row.
   * @param {number} c - Target column.
   * @returns {Promise<Object|null>} The result of the weapon launch.
   */
  async _prepareWeaponLaunch (r, c) {
    this.UI.removeHighlightAoE()
    this.setWeaponFireHandlers()
    return await this._launchWeaponSequence(r, c)
  }

  /**
   * Launches the weapon sequence, trying selected, random, and default launch flows.
   * @private
   * @param {number} r - Target row.
   * @param {number} c - Target column.
   * @returns {Promise<WeaponLaunchResult|null>} The result of the launch.
   */
  async _launchWeaponSequence (r, c) {
    let result = await this.launchSelectedWeapon(r, c)
    if (result?.score && result.score !== LoadOut.noResult) {
      return result
    }

    result = await this.launchRandomWeapon(r, c, bh.seekingMode)
    if (result?.hasTargettedWeapon || result?.score) {
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
   * @returns {Promise<null|{ weapon: Object, score: Object }|{ hasTargettedWeapon: boolean }>} Result with weapon and score.
   * @private
   */
  async setupWeapon (r, c) {
    return await this._prepareWeaponLaunch(r, c)
  }

  /**
   * Handles cell click for enemy turn.
   * @param {number} r - Row coordinate.
   * @param {number} c - Column coordinate.
   * @returns {Promise<void>}
   */
  async onClickCell (r, c) {
    if (!this.canTakeTurn()) return

    const result = await this.setupWeapon(r, c)
    if (this._shouldContinueAfterLaunch(result)) {
      return
    }

    this._processLaunchResult(result)
    this._finalizeTurn()
  }

  /**
   * Determines whether the launch result requires continuing the turn.
   * @private
   * @param {WeaponLaunchResult|null} result - The weapon launch result.
   * @returns {boolean} True if the turn should continue.
   */
  _shouldContinueAfterLaunch (result) {
    return !!result?.hasTargettedWeapon
  }

  /**
   * Processes the launch result and updates scoring if applicable.
   * @private
   * @param {WeaponLaunchResult|null} result - The weapon launch result.
   */
  _processLaunchResult (result) {
    if (result?.score) {
      this.updateResultsOfBomb(result.weapon, result.score)
    }
  }

  /**
   * Finalizes the turn after a weapon launch.
   * @private
   */
  _finalizeTurn () {
    this.score.finishTurn()
    this.updateUI()
    this.steps.endTurn()
  }

  /**
   * Handles click on opponent's cell for hint placement.
   * @param {number} hintR - Hint row.
   * @param {number} hintC - Hint column.
   */
  onClickOppoCell (hintR, hintC) {
    if (!this.opponent) return
    this._prepareOpponentHintSelection(hintR, hintC)
  }

  /**
   * Prepares opponent hint selection before arming the attached weapon.
   * @private
   * @param {number} hintR - Hint row coordinate.
   * @param {number} hintC - Hint column coordinate.
   */
  _prepareOpponentHintSelection (hintR, hintC) {
    this.opponent.UI.deactivateTempHints()
    this.UI.removeHighlightAoE()
    if (this.loadOut.isNotArming()) return

    this.loadOut.clearSelectedCoordinates()
    const cell = this.opponent.UI.gridCellAt(hintR, hintC)
    this.steps.addHint(this.opponent.UI, hintR, hintC, cell)
    this.createShadowSource(hintR, hintC)
    this.selectAttachedWeapon(cell, hintR, hintC, this.opponent)
  }

  /**
   * Destroys targets with the given weapon and effect.
   * @param {*} weapon - The weapon.
   * @param {Array} effect - The effect coordinates.
   * @param {Object} options - Additional options.
   * @returns {*} The result of the application.
   */
  destroy (weapon, effect, options) {
    if (!options?.isSplash) {
      if (this._isInvalidShot(effect)) {
        gameStatus._addToQueue('Already Shot Here - Try Again', false)
        return LoadOut.noResult
      }
      if (effect.length === 0) {
        gameStatus._addToQueue('Has no effect - Try Again', false)
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
   * Deactivates the weapon at the specified locations.
   * @param {number} ro - Opponent row.
   * @param {number} co - Opponent column.
   * @param {number} shadowR - Shadow row.
   * @param {number} shadowC - Shadow column.
   */
  deactivateWeapon (ro, co, shadowR, shadowC) {
    this._deactivateOpponentWeapon(ro, co)
    this._deactivateOwnShadow(shadowR, shadowC)
  }

  /**
   * Deactivates the opponent's weapon cell.
   * @private
   * @param {number} ro - Opponent row coordinate.
   * @param {number} co - Opponent column coordinate.
   */
  _deactivateOpponentWeapon (ro, co) {
    if (ro !== undefined && co !== undefined) {
      this.opponent?.UI?.cellWeaponDeactivate?.(ro, co, true)
    }
  }

  /**
   * Deactivates the local shadow cell and opponent hint.
   * @private
   * @param {number} shadowR - Shadow row coordinate.
   * @param {number} shadowC - Shadow column coordinate.
   */
  _deactivateOwnShadow (shadowR, shadowC) {
    if (shadowR !== undefined && shadowC !== undefined) {
      this.UI.cellWeaponDeactivate(shadowR, shadowC)
      this.opponent?.UI?.cellHintDeactivate?.(shadowR, shadowC)
    }
  }

  /**
   * Updates the weapon status display.
   * @param {*} rack - The weapon rack.
   * @param {Object} cursorInfo - Cursor information.
   */
  updateWeaponStatus (rack, cursorInfo) {
    const wps = cursorInfo?.wps || this.loadOut.getCurrentWeaponSystem()
    const cursorIdx = cursorInfo?.idx || this.loadOut.getCursorIndex()
    const newCursor =
      cursorInfo?.cursor || wps?.weapon?.cursors[cursorIdx] || ''
    this.updateCursor(newCursor)
    gameStatus.displayAmmoStatus(
      wps,
      bh.maps,
      this.loadOut.selectedCoordinates.length,
      rack
    )
  }

  /**
   * Updates the cursor on the board.
   * @param {string} newCursor - The new cursor class.
   */
  updateCursor (newCursor) {
    const oldCursor = this._oldCursor || ''
    if (newCursor !== oldCursor) {
      this._oldCursor = newCursor
      const board = this.UI.board.classList
      if (oldCursor !== '') board.remove(oldCursor)
      if (newCursor !== '') board.add(newCursor)
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
    this.steps.select()
    //  this.updateWeaponMode()
  }

  /**
   * Handles click on weapon buttons.
   * @param {string} letter - The weapon letter.
   */
  onClickWeaponButtons (letter) {
    this.loadOut.switchToWeapon(letter)
    //  this.updateWeaponMode()
  }

  /**
   * Handles click on weapon mode button.
   */
  onClickWeaponMode () {
    this.switchMode()
    this.updateWeaponMode()
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
    this.UI.weaponBtn.addEventListener('click', this.weaponSelectHandler)
    this.UI.revealBtn.addEventListener('click', this.revealHandler)
  }

  /**
   * Resets the model to initial state.
   */
  resetModel () {
    this.score.reset()
    this.resetMap()
    this.UI.playMode()
    this._oldCursor = null
    this._oldWeaponLetter = null
    this.loadOut.OutOfAllAmmo = () => {
      this.UI.weaponBtn.disabled = true
      this.UI.weaponBtn.textContent = 'single shot'
    }
    this.loadOut.OutOfAmmo = this.updateMode.bind(this)
    this.updateUI()
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

export const enemy = new Enemy(enemyUI)
