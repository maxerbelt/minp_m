import { bh } from '../terrains/all/js/bh.js'

/**
 * No-operation callback function used as default for event handlers.
 * @type {Function}
 * @returns {void}
 */
const NOOP = () => {}

/**
 * Enum for player types in the game.
 * @typedef {Object} PlayerEnum
 * @property {string} friend - Friendly player/ally
 * @property {string} enemy - Enemy player/opponent
 */
export const Player = Object.freeze({
  friend: 'FRIEND',
  enemy: 'ENEMY'
})

/**
 * Enum for weapon targeting and selection modes.
 * @typedef {Object} WeaponModeEnum
 * @property {string} sourceSelect - Mode for selecting weapon source
 * @property {string} targetAim - Mode for aiming at target
 * @property {string} othersTurn - Mode when it's not player's turn
 */
export const WeaponMode = Object.freeze({
  sourceSelect: 'SELECT',
  targetAim: 'AIM',
  othersTurn: 'OTHERS'
})

/**
 * Context information for a board cell location.
 * @typedef {Object} BoardContext
 * @property {Object} board - The game board object
 * @property {number} r - Row coordinate
 * @property {number} c - Column coordinate
 * @property {HTMLElement} cell - DOM element of the cell
 */

/**
 * Represents an equipped weapon rack on a ship.
 * @typedef {Object} SourceRack
 * @property {Object} rack - The weapon rack object
 * @property {Object} weapon - The weapon object
 * @property {string} wletter - Single letter identifier for the weapon
 * @property {number} weaponId - Unique identifier for the weapon
 * @property {number} r - Row coordinate of the source
 * @property {number} c - Column coordinate of the source
 * @property {HTMLElement} cell - DOM element of the source cell
 * @property {number} shadowR - Row coordinate of weapon shadow/hint
 * @property {number} shadowC - Column coordinate of weapon shadow/hint
 */

/**
 * Callback function signature for weapon change events.
 * @typedef {Function} WeaponChangeCallback
 * @param {string} wletter - Weapon letter identifier
 * @returns {void}
 */

/**
 * Callback function signature for weapon activation/deactivation.
 * @typedef {Function} WeaponActivationCallback
 * @param {Object} rack - The weapon rack
 * @param {Object} weapon - The weapon object
 * @param {string} wletter - Weapon letter identifier
 * @param {number} weaponId - Weapon ID
 * @param {number} r - Row coordinate
 * @param {number} c - Column coordinate
 * @param {HTMLElement} cell - DOM cell element
 * @param {number} shadowR - Shadow row coordinate
 * @param {number} shadowC - Shadow column coordinate
 * @returns {void}
 */

/**
 * Callback function signature for weapon deactivation.
 * @typedef {Function} WeaponDeactivationCallback
 * @param {number} r - Row coordinate
 * @param {number} c - Column coordinate
 * @param {number} shadowR - Shadow row coordinate
 * @param {number} shadowC - Shadow column coordinate
 * @returns {void}
 */

/**
 * Callback function signature for hint and targeting events.
 * @typedef {Function} HintCallback
 * @param {number} r - Row coordinate
 * @param {number} c - Column coordinate
 * @returns {void}
 */

/**
 * Callback function signature for turn and selection events.
 * @typedef {Function} TurnCallback
 * @param {Steps} steps - The Steps instance
 * @returns {void}
 */

/**
 * Callback function signature for aiming events.
 * @typedef {Function} AimCallback
 * @param {Steps} steps - The Steps instance
 * @param {boolean} hasAttached - Whether weapon has attached components
 * @returns {void}
 */

/**
 * Tracks weapon selection, aiming, and activation steps for a player.
 * Manages the state machine of weapon targeting, from source selection through firing.
 * Coordinates callbacks for UI updates and game state changes.
 * @class Steps
 */
export class Steps {
  /**
   * @param {string} player - Player identifier ('FRIEND' or 'ENEMY')
   * @property {string} player - The player identifier
   * @property {string} mode - Current weapon mode (SELECT, AIM, or OTHERS)
   * @property {string|null} wletter - Current weapon letter identifier
   * @property {SourceRack|null} sourceRack - Currently selected weapon rack
   * @property {BoardContext|null} source - Source ship/weapon location
   * @property {Object|null} sourceShip - Source ship object (if weapon is attached)
   * @property {BoardContext|null} sourceHint - Hint/preview location
   * @property {BoardContext|null} sourceShadow - Shadow/targeting indicator location
   * @property {BoardContext|null} target - Current target location
   * @property {WeaponChangeCallback} onChangeWeapon - Callback for weapon changes
   * @property {WeaponActivationCallback} onActivate - Callback for weapon activation
   * @property {WeaponDeactivationCallback} onDeactivate - Callback for weapon deactivation
   * @property {HintCallback} onHint - Callback for hint reveals
   * @property {TurnCallback} onEndTurn - Callback for turn end
   * @property {TurnCallback} onBeginTurn - Callback for turn start
   * @property {AimCallback} onAim - Callback for aiming
   * @property {TurnCallback} onSelect - Callback for weapon selection
   */
  constructor (player) {
    this._initializeState(player)
    this._initializeCallbacks()
  }

  /**
   * Initialize player state and set initial weapon mode.
   * @private
   * @param {string} player - Player identifier
   * @returns {void}
   */
  _initializeState (player) {
    this.player = player
    this._resetSourceFields()
    this.mode = WeaponMode.othersTurn
  }

  /**
   * Initialize all event callbacks to no-op functions.
   * These will be overridden by game controller to handle game events.
   * @private
   * @returns {void}
   */
  _initializeCallbacks () {
    /** @type {WeaponChangeCallback} */
    this.onChangeWeapon = NOOP
    /** @type {WeaponActivationCallback} */
    this.onActivate = NOOP
    /** @type {WeaponDeactivationCallback} */
    this.onDeactivate = NOOP
    /** @type {HintCallback} */
    this.onHint = NOOP
    /** @type {TurnCallback} */
    this.onEndTurn = NOOP
    /** @type {TurnCallback} */
    this.onBeginTurn = NOOP
    /** @type {AimCallback} */
    this.onAim = NOOP
    /** @type {TurnCallback} */
    this.onSelect = NOOP
  }

  /**
   * Reset all source and targeting fields to null.
   * Called when deselecting a weapon or ending a turn.
   * @private
   * @returns {void}
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
   * Check if there is currently an active weapon rack selected.
   * @private
   * @returns {boolean} True if sourceRack exists and has a valid weaponId
   */
  _hasActiveRack () {
    return Boolean(this.sourceRack && this.sourceRack.weaponId !== -1)
  }

  /**
   * Check if the provided weaponId differs from the currently selected rack.
   * @private
   * @param {number} weaponId - Weapon ID to check
   * @returns {boolean} True if weaponId differs from current sourceRack.weaponId
   */
  _isNewRackId (weaponId) {
    return weaponId !== this.sourceRack?.weaponId
  }

  /**
   * Resolve the weapon ID, using provided value or falling back to rack.id.
   * @private
   * @param {number|undefined} weaponId - Explicit weapon ID, may be undefined
   * @param {Object} rack - Weapon rack object with id property
   * @returns {number} Resolved weapon ID
   */
  _resolveWeaponId (weaponId, rack) {
    return weaponId === undefined ? rack.id : weaponId
  }

  /**
   * Determine shadow coordinates based on weapon type and game mode.
   * In seeking mode or for weapons with shadow at hint, uses hint coordinates.
   * @private
   * @param {Object} weapon - Weapon object to check for shadow properties
   * @param {number} r - Row coordinate of source
   * @param {number} c - Column coordinate of source
   * @param {number} hintR - Row coordinate of hint/preview
   * @param {number} hintC - Column coordinate of hint/preview
   * @returns {number[]} Array [shadowR, shadowC] - Shadow coordinates
   */
  _resolveShadowCoords (weapon, r, c, hintR, hintC) {
    return bh.seekingMode || weapon.hasShadowAtHint ? [hintR, hintC] : [r, c]
  }

  /**
   * Check if the weapon letter differs from currently selected weapon.
   * @private
   * @param {string} wletter - Weapon letter to check
   * @returns {boolean} True if weapon letter differs from current selection
   */
  _isWeaponChangeRequired (wletter) {
    return wletter !== this.sourceRack?.wletter
  }

  /**
   * Set a board context property on the Steps instance.
   * @private
   * @param {string} key - Property name to set (e.g., 'source', 'sourceHint', 'sourceShadow')
   * @param {Object} board - Game board object
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {HTMLElement} cell - DOM element of the cell
   * @returns {void}
   */
  _setBoardContext (key, board, r, c, cell) {
    this[key] = this._buildBoardContext(board, r, c, cell)
  }

  /**
   * Build a BoardContext object from cell coordinates and elements.
   * @private
   * @param {Object} board - Game board object
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {HTMLElement} cell - DOM element of the cell
   * @returns {BoardContext} Context object with board, r, c, and cell properties
   */
  _buildBoardContext (board, r, c, cell) {
    return { board, r, c, cell }
  }

  /**
   * Set the current weapon mode and execute a callback.
   * @private
   * @param {string} mode - New mode (SELECT, AIM, or OTHERS from WeaponMode)
   * @param {Function} callback - Callback function to execute with this Steps instance
   * @returns {void}
   */
  _setMode (mode, callback) {
    this.mode = mode
    callback(this)
  }

  /**
   * Query whether a weapon change should occur for the given letter.
   * @param {string} wletter - Weapon letter to check
   * @returns {boolean} True if the letter differs from current weapon
   */
  shouldChangeWeapon (wletter) {
    return this._isWeaponChangeRequired(wletter)
  }

  /**
   * Query whether the previous weapon rack should be deactivated.
   * @param {number} weaponId - New weapon ID being activated
   * @returns {boolean} True if a new rack is being selected
   */
  shouldDeactivatePreviousRack (weaponId) {
    return this._hasActiveRack() && this._isNewRackId(weaponId)
  }

  /**
   * Query whether a new weapon rack should be activated.
   * @param {Object} weapon - Weapon object to check
   * @param {number} weaponId - Weapon ID to check
   * @returns {boolean} True if weapon is valid and weaponId differs from current
   */
  shouldActivateNewRack (weapon, weaponId) {
    return (
      weapon !== undefined && weaponId !== -1 && this._isNewRackId(weaponId)
    )
  }

  /**
   * Deactivate current rack if a new weapon ID is being selected.
   * @param {number} weaponId - New weapon ID being activated
   * @returns {void}
   */
  deactivateOnNewRack (weaponId) {
    if (this._isNewRackId(weaponId)) {
      this._deactivateCurrentSourceRack()
    }
  }

  /**
   * Deactivate the current source rack and trigger deactivation callback.
   * @private
   * @returns {void}
   */
  _deactivateCurrentSourceRack () {
    if (!this._hasActiveRack()) return
    const { r, c, shadowR, shadowC } = this.sourceRack
    this.onDeactivate(r, c, shadowR, shadowC)
  }

  /**
   * Public method to deactivate the current weapon rack.
   * @returns {void}
   */
  deactivateCurrentSourceRack () {
    this._deactivateCurrentSourceRack()
  }

  /**
   * Reset all source fields to null state.
   * @returns {void}
   */
  resetSourceState () {
    this._resetSourceFields()
  }

  /**
   * Transition to weapon selection mode and trigger onSelect callback.
   * @returns {void}
   */
  select () {
    this._setMode(WeaponMode.sourceSelect, () => this.onSelect(this))
  }

  /**
   * Transition to targeting/aiming mode.
   * @param {boolean} hasAttached - Whether selected weapon has attached components
   * @returns {void}
   */
  targetting (hasAttached) {
    this._setMode(WeaponMode.targetAim, () => this.onAim(this, hasAttached))
  }

  /**
   * Fire the selected weapon if a source is available.
   * Deactivates the rack, uses ammo, reveals hints if needed, and returns to select mode.
   * @returns {void}
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
   * Consume ammunition from the source weapon.
   * @private
   * @returns {void}
   */
  _useSourceAmmo () {
    this.source.board.cellUseAmmo(this.source.r, this.source.c)
  }

  /**
   * Log a warning if firing an unattached weapon without a source ship.
   * @private
   * @returns {void}
   */
  _warnIfNoSourceShipForUnattachedWeapon () {
    if (!bh.terrain.hasUnattachedWeapons && this.sourceShip === null) {
      console.warn(
        `${bh.terrain.name} does not have unattached weapons, but a weapon was fired without a source ship`
      )
    }
  }

  /**
   * Reveal hint location if the weapon provides hints and hint location exists.
   * @private
   * @returns {void}
   */
  _revealHintIfRequired () {
    if (!this.sourceRack?.weapon?.givesHint || !this.sourceHint) return

    this.sourceHint.board.cellHintReveal(this.sourceHint.r, this.sourceHint.c)
    this.onHint(this.sourceHint.r, this.sourceHint.c)
  }

  /**
   * Register and activate a new weapon rack at the given location.
   * @param {Object} rack - The weapon rack object
   * @param {Object} weapon - The weapon object
   * @param {string} wletter - Single-letter weapon identifier
   * @param {number} weaponId - Unique weapon ID
   * @param {number} r - Row coordinate of weapon source
   * @param {number} c - Column coordinate of weapon source
   * @param {HTMLElement} cell - DOM element of the source cell
   * @param {number} hintR - Row coordinate of hint/preview location
   * @param {number} hintC - Column coordinate of hint/preview location
   * @returns {{shadowR: number, shadowC: number}} Shadow coordinates for the weapon
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
   * Build a SourceRack object from weapon and location information.
   * @private
   * @param {Object} rack - The weapon rack object
   * @param {Object} weapon - The weapon object
   * @param {string} wletter - Single-letter weapon identifier
   * @param {number} weaponId - Unique weapon ID
   * @param {number} r - Row coordinate of weapon source
   * @param {number} c - Column coordinate of weapon source
   * @param {HTMLElement} cell - DOM element of the source cell
   * @param {number} shadowR - Row coordinate of weapon shadow
   * @param {number} shadowC - Column coordinate of weapon shadow
   * @returns {SourceRack} Source rack object with all weapon information
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
   * Notify weapon change if terrain has attached weapons and letter changed.
   * @private
   * @param {string} wletter - Weapon letter identifier
   * @returns {void}
   */
  _maybeNotifyAttachedWeaponChange (wletter) {
    if (bh.terrain.hasAttachedWeapons && this.shouldChangeWeapon(wletter)) {
      this.onChangeWeapon(wletter)
    }
  }

  /**
   * Activate a weapon rack with deactivation of previous rack.
   * Triggers onActivate callback if conditions are met.
   * @param {number} weaponId - Unique weapon ID
   * @param {Object} weapon - The weapon object
   * @param {Object} rack - The weapon rack object
   * @param {string} wletter - Single-letter weapon identifier
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {HTMLElement} cell - DOM element of the cell
   * @param {number} shadowR - Row coordinate of shadow
   * @param {number} shadowC - Column coordinate of shadow
   * @returns {void}
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

  /**
   * Clear the current source weapon and reset state.
   * @returns {void}
   */
  clearSource () {
    this._deactivateCurrentSourceRack()
    this.resetSourceState()
  }

  /**
   * Register a source ship for attached weapons.
   * Updates weapon letter if terrain has attached weapons.
   * @param {Object} ship - The ship object with getPrimaryWeapon() method
   * @returns {void}
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
   * Check if current terrain uses attached weapons (weapons on ships).
   * @private
   * @returns {boolean} True if terrain has attached weapons
   */
  _isAttachedWeaponTerrain () {
    return bh.terrain.hasAttachedWeapons
  }

  /**
   * Log a warning when attached weapon terrain receives a ship.
   * @private
   * @returns {void}
   */
  _warnAttachedWeaponWithoutShip () {
    console.warn(
      'Terrain does not have attached weapons, but a ship was added to steps'
    )
  }

  /**
   * Register hint/preview location for weapon effect preview.
   * @param {Object} board - Game board object
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {HTMLElement} cell - DOM element of the cell
   * @returns {void}
   */
  addHint (board, r, c, cell) {
    this._setBoardContext('sourceHint', board, r, c, cell)
  }

  /**
   * Register shadow/targeting indicator location.
   * @param {Object} board - Game board object
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {HTMLElement} cell - DOM element of the cell
   * @returns {void}
   */
  addShadow (board, r, c, cell) {
    this._setBoardContext('sourceShadow', board, r, c, cell)
  }

  /**
   * Register weapon source location.
   * @param {Object} board - Game board object
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {HTMLElement} cell - DOM element of the cell
   * @returns {void}
   */
  addSource (board, r, c, cell) {
    this._setBoardContext('source', board, r, c, cell)
  }

  /**
   * End current player's turn and transition to opponent's turn.
   * @returns {void}
   */
  endTurn () {
    this._setMode(WeaponMode.othersTurn, () => this.onEndTurn(this))
  }

  /**
   * Begin current player's turn and transition to weapon selection mode.
   * @returns {void}
   */
  beginTurn () {
    this._setMode(WeaponMode.sourceSelect, () => this.onBeginTurn(this))
  }
}
