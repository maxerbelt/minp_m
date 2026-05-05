import { bh } from '../terrains/all/js/bh.js'

const NOOP = () => {}

export const Player = Object.freeze({
  friend: 'FRIEND',
  enemy: 'ENEMY'
})

export const WeaponMode = Object.freeze({
  sourceSelect: 'SELECT',
  targetAim: 'AIM',
  othersTurn: 'OTHERS'
})

/**
 * @typedef {Object} BoardContext
 * @property {Object} board
 * @property {number} r
 * @property {number} c
 * @property {HTMLElement} cell
 */

/**
 * @typedef {Object} SourceRack
 * @property {*} rack
 * @property {*} weapon
 * @property {string} wletter
 * @property {number} weaponId
 * @property {number} r
 * @property {number} c
 * @property {HTMLElement} cell
 * @property {number} shadowR
 * @property {number} shadowC
 */

/**
 * Tracks weapon selection, aiming, and activation steps for a player.
 */
export class Steps {
  /**
   * @param {string} player
   */
  constructor (player) {
    this._initializeState(player)
    this._initializeCallbacks()
  }

  /**
   * @private
   * @param {string} player
   */
  _initializeState (player) {
    this.player = player
    this._resetSourceFields()
    this.mode = WeaponMode.othersTurn
  }

  /**
   * @private
   */
  _initializeCallbacks () {
    this.onChangeWeapon = NOOP
    this.onActivate = NOOP
    this.onDeactivate = NOOP
    this.onHint = NOOP
    this.onEndTurn = NOOP
    this.onBeginTurn = NOOP
    this.onAim = NOOP
    this.onSelect = NOOP
  }

  /**
   * @private
   */
  _resetSourceFields () {
    this.wletter = null
    this.sourceRack = null
    this.source = null
    this.sourceShip = null
    this.sourceHint = null
    this.sourceShadow = null
    this.target = null
  }

  /**
   * @private
   * @returns {boolean}
   */
  _hasActiveRack () {
    return Boolean(this.sourceRack && this.sourceRack.weaponId !== -1)
  }

  /**
   * @private
   * @param {number} weaponId
   * @returns {boolean}
   */
  _isNewRackId (weaponId) {
    return weaponId !== this.sourceRack?.weaponId
  }

  /**
   * @private
   * @param {number|undefined} weaponId
   * @param {*} rack
   * @returns {number}
   */
  _resolveWeaponId (weaponId, rack) {
    return weaponId !== undefined ? weaponId : rack.id
  }

  /**
   * @private
   * @param {*} weapon
   * @param {number} r
   * @param {number} c
   * @param {number} hintR
   * @param {number} hintC
   * @returns {[number, number]}
   */
  _resolveShadowCoords (weapon, r, c, hintR, hintC) {
    return weapon.hasShadowAtHint ? [hintR, hintC] : [r, c]
  }

  /**
   * @private
   * @param {string} wletter
   * @returns {boolean}
   */
  _isWeaponChangeRequired (wletter) {
    return wletter !== this.sourceRack?.wletter
  }

  /**
   * @private
   * @param {string} key
   * @param {Object} board
   * @param {number} r
   * @param {number} c
   * @param {HTMLElement} cell
   */
  _setBoardContext (key, board, r, c, cell) {
    this[key] = this._buildBoardContext(board, r, c, cell)
  }

  /**
   * @private
   * @param {Object} board
   * @param {number} r
   * @param {number} c
   * @param {HTMLElement} cell
   * @returns {BoardContext}
   */
  _buildBoardContext (board, r, c, cell) {
    return { board, r, c, cell }
  }

  /**
   * @private
   * @param {string} mode
   * @param {Function} callback
   */
  _setMode (mode, callback) {
    this.mode = mode
    callback(this)
  }

  /**
   * @param {string} wletter
   * @returns {boolean}
   */
  shouldChangeWeapon (wletter) {
    return this._isWeaponChangeRequired(wletter)
  }

  /**
   * @param {number} weaponId
   * @returns {boolean}
   */
  shouldDeactivatePreviousRack (weaponId) {
    return this._hasActiveRack() && this._isNewRackId(weaponId)
  }

  /**
   * @param {*} weapon
   * @param {number} weaponId
   * @returns {boolean}
   */
  shouldActivateNewRack (weapon, weaponId) {
    return (
      weapon !== undefined && weaponId !== -1 && this._isNewRackId(weaponId)
    )
  }

  /**
   * @param {number} weaponId
   */
  deactivateOnNewRack (weaponId) {
    if (this._isNewRackId(weaponId)) {
      this._deactivateCurrentSourceRack()
    }
  }

  /**
   * @private
   */
  _deactivateCurrentSourceRack () {
    if (!this._hasActiveRack()) return
    const { r, c, shadowR, shadowC } = this.sourceRack
    this.onDeactivate(r, c, shadowR, shadowC)
  }

  deactivateCurrentSourceRack () {
    this._deactivateCurrentSourceRack()
  }

  resetSourceState () {
    this._resetSourceFields()
  }

  select () {
    this._setMode(WeaponMode.sourceSelect, () => this.onSelect(this))
  }

  targetting (hasAttached) {
    this._setMode(WeaponMode.targetAim, () => this.onAim(this, hasAttached))
  }

  /**
   * Fires the selected weapon if a source is available.
   */
  fire () {
    this._warnIfNoSourceShipForUnattachedWeapon()
    if (!this.source) return

    this._deactivateCurrentSourceRack()
    this._useSourceAmmo()
    this._revealHintIfRequired()
    this.select()
  }

  /**
   * @private
   */
  _useSourceAmmo () {
    this.source.board.cellUseAmmo(this.source.r, this.source.c)
  }

  /**
   * @private
   */
  _warnIfNoSourceShipForUnattachedWeapon () {
    if (!bh.terrain.hasUnattachedWeapons && this.sourceShip === null) {
      console.warn(
        `${bh.terrain.name} does not have unattached weapons, but a weapon was fired without a source ship`
      )
    }
  }

  /**
   * @private
   */
  _revealHintIfRequired () {
    if (!this.sourceRack?.weapon?.givesHint || !this.sourceHint) return

    this.sourceHint.board.cellHintReveal(this.sourceHint.r, this.sourceHint.c)
    this.onHint(this.sourceHint.r, this.sourceHint.c)
  }

  /**
   * @param {*} rack
   * @param {*} weapon
   * @param {string} wletter
   * @param {number} weaponId
   * @param {number} r
   * @param {number} c
   * @param {HTMLElement} cell
   * @param {number} hintR
   * @param {number} hintC
   * @returns {{shadowR:number,shadowC:number}}
   */
  addRack (rack, weapon, wletter, weaponId, r, c, cell, hintR, hintC) {
    const resolvedWeaponId = this._resolveWeaponId(weaponId, rack)
    this._maybeNotifyAttachedWeaponChange(wletter)

    const [shadowR, shadowC] = this._resolveShadowCoords(
      weapon,
      r,
      c,
      hintR,
      hintC
    )

    this.activate(
      resolvedWeaponId,
      weapon,
      rack,
      wletter,
      r,
      c,
      cell,
      shadowR,
      shadowC
    )

    this.sourceRack = this._buildSourceRack(
      rack,
      weapon,
      wletter,
      resolvedWeaponId,
      r,
      c,
      cell,
      shadowR,
      shadowC
    )

    this.select()
    return { shadowR, shadowC }
  }

  /**
   * @private
   * @param {*} rack
   * @param {*} weapon
   * @param {string} wletter
   * @param {number} weaponId
   * @param {number} r
   * @param {number} c
   * @param {HTMLElement} cell
   * @param {number} shadowR
   * @param {number} shadowC
   * @returns {SourceRack}
   */
  _buildSourceRack (
    rack,
    weapon,
    wletter,
    weaponId,
    r,
    c,
    cell,
    shadowR,
    shadowC
  ) {
    return {
      rack,
      weapon,
      wletter,
      weaponId,
      r,
      c,
      cell,
      shadowR,
      shadowC
    }
  }

  /**
   * @private
   * @param {string} wletter
   */
  _maybeNotifyAttachedWeaponChange (wletter) {
    if (bh.terrain.hasAttachedWeapons && this.shouldChangeWeapon(wletter)) {
      this.onChangeWeapon(wletter)
    }
  }

  /**
   * @param {number} weaponId
   * @param {*} weapon
   * @param {*} rack
   * @param {string} wletter
   * @param {number} r
   * @param {number} c
   * @param {HTMLElement} cell
   * @param {number} shadowR
   * @param {number} shadowC
   */
  activate (weaponId, weapon, rack, wletter, r, c, cell, shadowR, shadowC) {
    this.deactivateOnNewRack(weaponId)
    if (this.shouldActivateNewRack(weapon, weaponId)) {
      this.onActivate(
        rack,
        weapon,
        wletter,
        weaponId,
        r,
        c,
        cell,
        shadowR,
        shadowC
      )
    }
  }

  clearSource () {
    this._deactivateCurrentSourceRack()
    this.resetSourceState()
  }

  /**
   * @param {*} ship
   */
  addShip (ship) {
    this.sourceShip = ship
    if (!this._isAttachedWeaponTerrain()) {
      this._warnAttachedWeaponWithoutShip()
      return
    }

    const letter = ship.getPrimaryWeapon().letter
    if (this._isWeaponChangeRequired(letter)) {
      this.onChangeWeapon(letter)
    }
    this.wletter = letter
  }

  /**
   * @private
   * @returns {boolean}
   */
  _isAttachedWeaponTerrain () {
    return bh.terrain.hasAttachedWeapons
  }

  /**
   * @private
   */
  _warnAttachedWeaponWithoutShip () {
    console.warn(
      'Terrain does not have attached weapons, but a ship was added to steps'
    )
  }

  /**
   * @param {Object} board
   * @param {number} r
   * @param {number} c
   * @param {HTMLElement} cell
   */
  addHint (board, r, c, cell) {
    this._setBoardContext('sourceHint', board, r, c, cell)
  }

  /**
   * @param {Object} board
   * @param {number} r
   * @param {number} c
   * @param {HTMLElement} cell
   */
  addShadow (board, r, c, cell) {
    this._setBoardContext('sourceShadow', board, r, c, cell)
  }

  /**
   * @param {Object} board
   * @param {number} r
   * @param {number} c
   * @param {HTMLElement} cell
   */
  addSource (board, r, c, cell) {
    this._setBoardContext('source', board, r, c, cell)
  }

  endTurn () {
    this._setMode(WeaponMode.othersTurn, () => this.onEndTurn(this))
  }

  beginTurn () {
    this._setMode(WeaponMode.sourceSelect, () => this.onBeginTurn(this))
  }
}
