import { bh } from '../terrains/all/js/bh.js'
import { randomPlaceShape } from '../core/utils.js'
import { randomElement, shuffleArray } from '../core/utilities.js'
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

class Enemy extends Waters {
  constructor (enemyUI) {
    super(enemyUI)
    this.preamble0 = 'Enemy'
    this.preamble = 'The enemy was '
    this.preamble1 = 'The enemy '
    this.isRevealed = false
    this.timeoutId = null
    this.weaponSelectHandler = null
    this.revealHandler = null
    this.enemyWaters = true

    this.steps.player = Player.enemy
    this.steps.onEndTurn = this._handleEndTurn.bind(this)
    this.steps.onBeginTurn = this._handleBeginTurn.bind(this)
    this.steps.onDeactivate = this.deactivateWeapon.bind(this)
    this.steps.onActivate = this._handleActivate.bind(this)
    this.steps.onSelect = this._handleSelect.bind(this)
    this.steps.onHint = this._handleHint.bind(this)
    this.steps.onChangeWeapon = this._handleChangeWeapon.bind(this)
  }

  /**
   * Handles selection event.
   * @private
   */
  _handleSelect () {
    this.UI.board.classList.add('targetting')
    this.UI.board.classList.remove('not-step')
  }

  /**
   * Handles activation event.
   * @private
   */
  _handleActivate (rack, weapon, _wletter, _weaponId, r, c, _cell) {
    this.opponent?.UI?.cellWeaponActive?.(r, c)
    if (weapon.postSelectCursor > 0) {
      this.UI.cellWeaponActive(r, c, '', weapon.tag)
    }
    this.updateMode(rack)
  }

  /**
   * Handles change weapon event.
   * @private
   */
  _handleChangeWeapon (wletter) {
    this.loadOut.switchToWeapon(wletter)
  }

  /**
   * Handles end turn event.
   * @private
   */
  async _handleEndTurn () {
    if (this?.opponent == null) {
      return
    }
    this.opponent.score.finishTurn()
    if (this.opponent.boardDestroyed || this.opponent.isRevealed) return

    this._showWaitingForOpponent()
    await Delay.wait(ENEMY_TURN_DELAY)
    await this.opponent.seekStep()
  }

  /**
   * Shows waiting state for opponent.
   * @private
   */
  _showWaitingForOpponent () {
    this._updateSpinner(true, "Enemy's Turn")
    this.UI.board.classList.remove('targetting')
    this.UI.board.classList.add('not-step')
    this.steps.clearSource()
  }

  /**
   * Handles begin turn event.
   * @private
   */
  _handleBeginTurn () {
    this._hideWaiting()
    if (this.isGameOver()) {
      this.steps.select()
    } else {
      gameStatus.showMode('Your Turn')
      if (!bh.terrain.hasAttachedWeapons) {
        this.steps.select()
      }
    }
  }

  /**
   * Hides waiting state.
   * @private
   */
  _hideWaiting () {
    this._updateSpinner(false, '')
  }

  /**
   * Updates spinner display.
   * @param {boolean} show - Whether to show spinner.
   * @param {string} mode - Mode text.
   * @private
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
   * Handles hint event.
   * @private
   */
  _handleHint () {
    // Placeholder if needed
  }

  cursorChange (oldCursor, newCursorInfo) {
    const newCursor = newCursorInfo?.cursor
    if (newCursor === oldCursor) return
    const board = this.UI.board.classList
    if (oldCursor !== '') board.remove(oldCursor)
    this.updateMode(newCursorInfo.wps, newCursorInfo)
  }

  hasAmmo () {
    return !this.hasNoAmmo()
  }

  hasNoAmmo () {
    return this.loadOut.isOutOfAmmo()
  }

  switchMode () {
    if (this.isGameOver() || this.hasNoAmmo()) return
    this.loadOut.switchWeapon()
    this.updateUI()
  }

  isGameOver () {
    return this.boardDestroyed || this.isRevealed
  }

  /**
   * Attempts to place ships randomly.
   * @param {Array} ships - Ships to place.
   * @returns {boolean} True if successful.
   * @private
   */
  _attemptShipPlacement (ships) {
    this.resetShipCells()
    const mask = bh.map.blankMask
    const shuffledShips = shuffleArray([...ships])
    for (const ship of shuffledShips) {
      if (!randomPlaceShape(ship, this.shipCellGrid, mask)) return false
    }
    return true
  }

  /**
   * Handles ship placement with retries.
   * @param {Array} ships - Ships to place.
   * @param {number} attempt - Current attempt number.
   * @private
   */
  _handlePlacement (ships, attempt) {
    this.UI.disableBtns()
    for (let i = 0; i < MAX_PLACEMENT_ATTEMPTS; i++) {
      if (this._attemptShipPlacement(ships)) {
        gameStatus.setTips(['Click On Square To Fire'])
        this.UI.enableBtns()
        return
      }
    }
    this._handlePlacementFailure(ships, attempt)
  }

  /**
   * Handles placement failure with retries.
   * @param {Array} ships - Ships to place.
   * @param {number} attempt - Current attempt number.
   * @private
   */
  async _handlePlacementFailure (ships, attempt) {
    const totalAttempts = (attempt + 1) * ATTEMPTS_PER_RETRY
    gameStatus.addToQueue(
      `Having difficulty placing all ships (${totalAttempts} attempts)`,
      true
    )
    if (attempt < MAX_PLACEMENT_RETRIES) {
      await Delay.yield()
      this._handlePlacement(ships, attempt + 1)
      return
    }
    this.UI.enableBtns()
    gameStatus.addToQueue('Failed to place all ships after many attempts', true)
    this.boardDestroyed = true
    throw new Error('Failed to place all ships after many attempts')
  }

  /**
   * Places all ships.
   * @param {Array} ships - Ships to place.
   */
  async placeAll (ships = this.ships) {
    this.UI.enableBtns()
    await Delay.yield()
    this._handlePlacement(ships, 0)
  }

  /**
   * Reveals all ships.
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
   * Updates UI components.
   */
  updateUI () {
    this._updateStats()
    this.updateMode()
    this._updateButtons()
    super.updateUI(this.ships)
  }

  /**
   * Updates stats display.
   * @private
   */
  _updateStats () {
    this.UI.score.display(this.ships, ...this.score.counts())
  }

  /**
   * Updates button states.
   * @private
   */
  _updateButtons () {
    const disabled = this.isGameOver() || this.hasNoAmmo()
    this.UI.weaponBtn.disabled = disabled
    this.UI.revealBtn.disabled = this.isGameOver()
  }

  canTakeTurn () {
    if (this.isGameOver() || this.loadOut.checkNoAmmo()) {
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

  async onClickCell (r, c) {
    if (!this.canTakeTurn()) return
    this.UI.removeHighlightAoE()
    this.setWeaponFireHanders()
    let hasLaunched = await this.launchSelectedWeapon(r, c)
    if (hasLaunched) return
    hasLaunched = await this.launchRandomWeapon(r, c, bh.seekingMode)
    if (hasLaunched) return
    await this.fireWeaponAt(
      r,
      c,
      null,
      LoadOut.launchDefault.bind(this, this.UI)
    )
  }

  onClickOppoCell (hintR, hintC) {
    if (!this.canTakeTurn()) return
    if (!this.opponent) return
    this.UI.removeHighlightAoE()
    if (this.loadOut.isNotArming()) return
    this.loadOut.clearSelectedCoordinates()
    const cell = this.opponent.UI.gridCellAt(hintR, hintC)
    this.steps.addHint(this.opponent.UI, hintR, hintC, cell)
    this.shadowSource(hintR, hintC, this)
    this.selectAttachedWeapon(cell, hintR, hintC, this.opponent)
  }

  destroyOne (weapon, effect, target) {
    const hitCandidates = this.getHitCandidates(effect, weapon)
    if (this.isNoHitCandidates(hitCandidates)) {
      if (weapon.crashLoc) {
        const splashEffect = this.getCrashSplash(weapon, weapon.crashLoc)
        return this.destroy(weapon, splashEffect)
      }
      return this.destroy(weapon, effect)
    }
    const resolvedTarget = this.resolveTarget(target, hitCandidates)
    if (
      weapon.crashLoc &&
      resolvedTarget[0] === weapon.crashLoc[0] &&
      resolvedTarget[1] === weapon.crashLoc[1]
    ) {
      const splashEffect = this.getCrashSplash(weapon, weapon.crashLoc)
      return this.destroy(weapon, splashEffect)
    }
    const splashEffect = this.getStrikeSplash(weapon, resolvedTarget)
    return this.destroy(weapon, splashEffect)
  }

  isNoHitCandidates (hitCandidates) {
    return hitCandidates.length < 1
  }

  resolveTarget (target, hitCandidates) {
    if (!target || target.length < 2) {
      return randomElement(hitCandidates)
    }
    return target
  }

  destroy (weapon, effect) {
    if (
      effect.length === 1 &&
      !this.score.newShotKey(effect[0][0], effect[0][1])
    ) {
      gameStatus.addToQueue('Already Shot Here - Try Again', false)
      return LoadOut.noResult
    }
    if (effect.length === 0) {
      gameStatus.addToQueue('Has no effect - Try Again', false)
      return LoadOut.noResult
    }
    const result = this.applyWeaponEffect(weapon, effect)
    this.updateUI()
    this.steps.endTurn()
    return result
  }

  applyWeaponEffect (weapon, effect) {
    const results = this.applyToAoE(effect, weapon)
    this.updateMode()
    this.flash()
    return results
  }

  deactivateWeapon (ro, co) {
    if (ro === undefined || co === undefined) return
    this.opponent?.UI?.cellWeaponDeactivate?.(ro, co, true)
    this.UI.cellWeaponDeactivate(ro, co)
  }

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

  updateCursor (newCursor) {
    const oldCursor = this._oldCursor || ''
    if (newCursor !== oldCursor) {
      this._oldCursor = newCursor
      const board = this.UI.board.classList
      if (oldCursor !== '') board.remove(oldCursor)
      if (newCursor !== '') board.add(newCursor)
    }
  }

  updateWeaponMode () {
    this.updateMode(this.loadOut.getCurrentWeaponSystem())
  }

  onClickSingleShotButton () {
    this.loadOut.switchToSingleShot()
    this.updateWeaponMode()
  }

  onClickWeaponButtons (letter) {
    this.loadOut.switchToWeapon(letter)
    this.updateWeaponMode()
  }

  onClickWeaponMode () {
    this.switchMode()
    this.updateWeaponMode()
  }

  onClickReveal () {
    if (!this.isRevealed) {
      this.revealAll()
      this.updateUI()
    }
  }

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

  buildBoard () {
    this.UI.buildBoard(this.onClickCell, this)
    this.UI.board.classList.toggle('destroyed', this.boardDestroyed)
  }

  resetUI (ships) {
    this.UI.reset()
    this.buildBoard()
    this.placeAll(ships)
    this.updateUI()
  }
}

export const enemy = new Enemy(enemyUI)
