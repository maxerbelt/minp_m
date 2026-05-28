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
 * @property {Board} board - The game board object
 * @property {number} r - Row coordinate
 * @property {number} c - Column coordinate
 * @property {HTMLElement} cell - DOM element of the cell
 */

/**
 * Weapon object with targeting and firing properties.
 * @typedef {Object} Weapon
 * @property {string} letter - Single letter identifier for the weapon
 * @property {boolean} givesHint - Whether weapon provides hint/preview
 * @property {boolean} hasShadowAtHint - Whether shadow is at hint location
 */

/**
 * Weapon rack on a ship with identity and weapon reference.
 * @typedef {Object} Rack
 * @property {number} id - Unique identifier for the rack
 */

/**
 * Ship object with weapon management methods.
 * @typedef {Object} Ship
 * @property {Function} getPrimaryWeapon - Method returning primary weapon object
 */

/**
 * Board object with cell manipulation methods.
 * @typedef {Object} Board
 * @property {Function} cellUseAmmo - Method to consume ammunition from a cell
 * @property {Function} cellHintReveal - Method to reveal hint at a cell location
 */

/**
 * Represents an equipped weapon rack on a ship.
 * @typedef {Object} SourceRack
 * @property {Rack} rack - The weapon rack object
 * @property {Weapon} weapon - The weapon object
 * @property {string} wletter - Single letter identifier for the weapon
 * @property {number} weaponId - Unique identifier for the weapon
 * @property {number} r - Row coordinate of the source
 * @property {number} c - Column coordinate of the source
 * @property {HTMLElement} cell - DOM element of the source cell
 * @property {number} shadowR - Row coordinate of weapon shadow/hint
 * @property {number} shadowC - Column coordinate of weapon shadow/hint
 */

/**
 * Parameters for adding a new weapon rack.
 * @typedef {Object} AddRackParams
 * @property {Rack} rack - The weapon rack object
 * @property {Weapon} weapon - The weapon object
 * @property {string} wletter - Single-letter weapon identifier
 * @property {number} weaponId - Unique weapon ID
 * @property {number} r - Row coordinate of weapon source
 * @property {number} c - Column coordinate of weapon source
 * @property {HTMLElement} cell - DOM element of the source cell
 * @property {number} hintR - Row coordinate of hint/preview location
 * @property {number} hintC - Column coordinate of hint/preview location
 */

/**
 * Shadow coordinates for a weapon placement.
 * @typedef {Object} ShadowCoords
 * @property {number} shadowR - Row coordinate of weapon shadow
 * @property {number} shadowC - Column coordinate of weapon shadow
 */

/**
 * Parameters for weapon activation.
 * @typedef {Object} ActivateParams
 * @property {number} weaponId - Unique weapon ID
 * @property {Weapon} weapon - The weapon object
 * @property {Rack} rack - The weapon rack object
 * @property {string} wletter - Single-letter weapon identifier
 * @property {number} r - Row coordinate
 * @property {number} c - Column coordinate
 * @property {HTMLElement} cell - DOM element of the cell
 * @property {number} shadowR - Row coordinate of shadow
 * @property {number} shadowC - Column coordinate of shadow
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
 * @param {Rack} rack - The weapon rack
 * @param {Weapon} weapon - The weapon object
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
 * Maintains information about selected weapon rack, target location, and current targeting mode.
 *
 * @class Steps
 * @description Implements the targeting workflow: selection → aim → fire → reset.
 *              Handles weapon activation/deactivation, ammo consumption, and hint reveals.
 */
export class Steps {
  /**
   * @param {string} player - Player identifier ('FRIEND' or 'ENEMY')
   * @property {string} player - The player identifier
   * @property {string} mode - Current weapon mode (SELECT, AIM, or OTHERS)
   * @property {string|null} wletter - Current weapon letter identifier
   * @property {SourceRack|null} sourceRack - Currently selected weapon rack
   * @property {BoardContext|null} source - Source ship/weapon location
   * @property {Ship|null} sourceShip - Source ship object (if weapon is attached)
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
   * Sets player identifier and resets all source/targeting fields to null.
   * Mode is set to 'othersTurn' (waiting for turn to begin).
   *
   * @private
   * @param {string} player - Player identifier (FRIEND or ENEMY)
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
   * NOOP serves as default to prevent errors if callbacks are invoked before assignment.
   *
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
   * Clears: wletter, sourceRack, source, sourceShip, sourceHint, sourceShadow, target.
   *
   * @private
   * @returns {void}
   */
  _resetSourceFields () {
    /** @type {string|null} */
    this.wletter = null
    /** @type {SourceRack|null} */
    this.sourceRack = null
    /** @type {BoardContext|null} */
    this.source = null
    /** @type {Ship|null} */
    this.sourceShip = null
    /** @type {BoardContext|null} */
    this.sourceHint = null
    /** @type {BoardContext|null} */
    this.sourceShadow = null
    /** @type {BoardContext|null} */
    this.target = null
  }

  /**
   * Check if there is currently an active weapon rack selected.
   * Validates that sourceRack exists and has a weaponId that is not -1.
   *
   * @private
   * @returns {boolean} True if sourceRack exists and has a valid weaponId
   */
  _hasActiveRack () {
    return Boolean(this.sourceRack && this.sourceRack.weaponId !== -1)
  }

  /**
   * Check if the provided weaponId differs from the currently selected rack.
   * Compares against sourceRack?.weaponId to detect weapon changes.
   *
   * @private
   * @param {number} weaponId - Weapon ID to check
   * @returns {boolean} True if weaponId differs from current sourceRack.weaponId
   */
  _isNewRackId (weaponId) {
    return weaponId !== this.sourceRack?.weaponId
  }

  /**
   * Resolve the weapon ID, using provided value or falling back to rack.id.
   * If weaponId is undefined, uses rack.id as the resolved ID.
   *
   * @private
   * @param {number|undefined} weaponId - Explicit weapon ID, may be undefined
   * @param {Rack} rack - Weapon rack object with id property
   * @returns {number} Resolved weapon ID (from weaponId or rack.id)
   */
  _resolveWeaponId (weaponId, rack) {
    return weaponId === undefined ? rack.id : weaponId
  }

  /**
   * Determine shadow coordinates based on weapon type and game mode.
   * In seeking mode or for weapons with shadow at hint, uses hint coordinates.
   * Otherwise returns source coordinates (r, c).
   *
   * @private
   * @param {Weapon} weapon - Weapon object to check for shadow properties
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
   * Used to detect when player switches to a different weapon.
   *
   * @private
   * @param {string} wletter - Weapon letter to check
   * @returns {boolean} True if weapon letter differs from current sourceRack.wletter
   */
  _isWeaponChangeRequired (wletter) {
    return wletter !== this.sourceRack?.wletter
  }

  /**
   * Set a board context property on the Steps instance.
   * Routes to appropriate property based on key: source, sourceHint, sourceShadow, or target.
   * Creates a BoardContext object and assigns it to the specified property.
   *
   * @private
   * @param {string} key - Property name to set ('source'|'sourceHint'|'sourceShadow'|'target')
   * @param {Board} board - Game board object
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {HTMLElement} cell - DOM element of the cell
   * @returns {void}
   */
  _setBoardContext (key, board, r, c, cell) {
    const context = this._buildBoardContext(board, r, c, cell)
    switch (key) {
      case 'source':
        this.source = context
        break
      case 'sourceHint':
        this.sourceHint = context
        break
      case 'sourceShadow':
        this.sourceShadow = context
        break
      case 'target':
        this.target = context
        break
    }
  }

  /**
   * Build a BoardContext object from cell coordinates and elements.
   * Encapsulates location information for easy passing throughout the system.
   *
   * @private
   * @param {Board} board - Game board object
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
   * Updates this.mode and immediately invokes callback with this Steps instance as argument.
   *
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
   * Used to determine if UI callbacks should be triggered for weapon switching.
   *
   * @public
   * @param {string} wletter - Weapon letter to check
   * @returns {boolean} True if the letter differs from current weapon
   */
  shouldChangeWeapon (wletter) {
    return this._isWeaponChangeRequired(wletter)
  }

  /**
   * Query whether the previous weapon rack should be deactivated.
   * Checks if there's an active rack and if the new weaponId differs from current.
   *
   * @public
   * @param {number} weaponId - New weapon ID being activated
   * @returns {boolean} True if a new rack is being selected
   */
  shouldDeactivatePreviousRack (weaponId) {
    return this._hasActiveRack() && this._isNewRackId(weaponId)
  }

  /**
   * Query whether a new weapon rack should be activated.
   * Checks if weapon object is valid, weaponId is not -1, and differs from current rack.
   * @param {Weapon} weapon - Weapon object to check
   * @param {number} weaponId - Weapon ID to check
   * @returns {boolean} True if weapon is valid and weaponId differs from current
   */
  shouldActivateNewRack (weapon, weaponId) {
    return weapon && weaponId !== -1 && this._isNewRackId(weaponId)
  }

  /**
   * Deactivate current rack if a new weapon ID is being selected.
   * Calls _deactivateCurrentSourceRack() if the weaponId differs from current.
   *
   * @public
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
    if (!this._hasActiveRack() || !this.sourceRack) return
    const { r, c, shadowR, shadowC } = this.sourceRack
    this.onDeactivate(r, c, shadowR, shadowC)
  }

  /**
   * Public method to deactivate the current weapon rack.
   * Delegates to _deactivateCurrentSourceRack().
   *
   * @public
   * @returns {void}
   */
  deactivateCurrentSourceRack () {
    this._deactivateCurrentSourceRack()
  }

  /**
   * Reset all source fields to null state.
   * Delegates to _resetSourceFields().
   *
   * @public
   * @returns {void}
   */
  resetSourceState () {
    this._resetSourceFields()
  }

  /**
   * Transition to weapon selection mode and trigger onSelect callback.
   * Sets mode to sourceSelect and calls onSelect(this).
   *
   * @public
   * @returns {void}
   */
  select () {
    this._setMode(WeaponMode.sourceSelect, () => this.onSelect(this))
  }

  /**
   * Transition to targeting/aiming mode.
   * Sets mode to targetAim and calls onAim(this, hasAttached).
   *
   * @public
   * @param {boolean} hasAttached - Whether selected weapon has attached components
   * @returns {void}
   */
  targetting (hasAttached) {
    this._setMode(WeaponMode.targetAim, () => this.onAim(this, hasAttached))
  }

  /**
   * Fire the selected weapon if a source is available.
   * Workflow: deactivate rack → use ammo → reveal hint → return to selection mode.
   * Does nothing if no source location is registered.
   *
   * @public
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
    if (!this.source) return
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
    if (
      !this.sourceRack?.weapon ||
      !this.sourceRack.weapon.givesHint ||
      !this.sourceHint
    )
      return

    this.sourceHint.board.cellHintReveal(this.sourceHint.r, this.sourceHint.c)
    this.onHint(this.sourceHint.r, this.sourceHint.c)
  }

  /**
   * Register and activate a new weapon rack at the given location.
   * Resolves weapon ID, notifies of weapon changes, calculates shadow coords, activates rack.
   * Transitions to selection mode and returns shadow coordinates.
   *
   * @public
   * @param {AddRackParams} params - Parameters for adding the rack
   * @returns {ShadowCoords} Shadow coordinates {shadowR, shadowC} for the weapon
   */
  addRack (params) {
    const { rack, weapon, wletter, weaponId, r, c, cell, hintR, hintC } = params
    const resolvedWeaponId = this._resolveWeaponId(weaponId, rack)
    this._maybeNotifyAttachedWeaponChange(wletter)

    const [shadowR, shadowC] = this._resolveShadowCoords(
      weapon,
      r,
      c,
      hintR,
      hintC
    )

    this.activate({
      weaponId: resolvedWeaponId,
      weapon,
      rack,
      wletter,
      r,
      c,
      cell,
      shadowR,
      shadowC
    })

    this.sourceRack = this._buildSourceRack({
      rack,
      weapon,
      wletter,
      weaponId: resolvedWeaponId,
      r,
      c,
      cell,
      shadowR,
      shadowC
    })

    this.select()
    return { shadowR, shadowC }
  }

  /**
   * Build a SourceRack object from weapon and location information.
   * @private
   * @param {Object} params - Parameters object
   * @param {Rack} params.rack - The weapon rack object
   * @param {Weapon} params.weapon - The weapon object
   * @param {string} params.wletter - Single-letter weapon identifier
   * @param {number} params.weaponId - Unique weapon ID
   * @param {number} params.r - Row coordinate of weapon source
   * @param {number} params.c - Column coordinate of weapon source
   * @param {HTMLElement} params.cell - DOM element of the source cell
   * @param {number} params.shadowR - Row coordinate of weapon shadow
   * @param {number} params.shadowC - Column coordinate of weapon shadow
   * @returns {SourceRack} Source rack object with all weapon information
   */
  _buildSourceRack (params) {
    const { rack, weapon, wletter, weaponId, r, c, cell, shadowR, shadowC } =
      params
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
   * Triggers onActivate callback only if shouldActivateNewRack() conditions are met.
   *
   * @public
   * @param {ActivateParams} params - Parameters for activation
   * @returns {void}
   */
  activate (params) {
    const { weaponId, weapon, rack, wletter, r, c, cell, shadowR, shadowC } =
      params
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
   * Deactivates rack and calls resetSourceState().
   *
   * @public
   * @returns {void}
   */
  clearSource () {
    this._deactivateCurrentSourceRack()
    this.resetSourceState()
  }

  /**
   * Register a source ship for attached weapons.
   * Updates weapon letter if terrain has attached weapons.
   * Triggers onChangeWeapon callback if weapon letter differs from current.
   *
   * @public
   * @param {Ship} ship - The ship object with getPrimaryWeapon() method
   * @returns {void}
   */
  addShip (ship) {
    this.sourceShip = ship
    if (!this._isAttachedWeaponTerrain()) {
      this._warnAttachedWeaponWithoutShip()
      return
    }

    const primaryWeapon = ship.getPrimaryWeapon()
    const letter = primaryWeapon.letter
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
   * Stores hint location in sourceHint property via _setBoardContext().
   *
   * @public
   * @param {Board} board - Game board object
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
   * Stores shadow location in sourceShadow property via _setBoardContext().
   *
   * @public
   * @param {Board} board - Game board object
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
   * Stores source location in source property via _setBoardContext().
   *
   * @public
   * @param {Board} board - Game board object
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
   * Sets mode to othersTurn and calls onEndTurn(this).
   *
   * @public
   * @returns {void}
   */
  endTurn () {
    this._setMode(WeaponMode.othersTurn, () => this.onEndTurn(this))
  }

  /**
   * Begin current player's turn and transition to weapon selection mode.
   * Sets mode to sourceSelect and calls onBeginTurn(this).
   *
   * @public
   * @returns {void}
   */
  beginTurn () {
    this._setMode(WeaponMode.sourceSelect, () => this.onBeginTurn(this))
  }
}
