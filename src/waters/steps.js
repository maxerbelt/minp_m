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
 * @property {Weapon} primaryWeapon - The primary weapon object
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
 * @property {number} x - Row coordinate of weapon source
 * @property {number} y - Column coordinate of weapon source
 * @property {HTMLElement} cell - DOM element of the source cell
 * @property {number} hintX - Row coordinate of hint/preview location
 * @property {number} hintY - Column coordinate of hint/preview location
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
 * @typedef {() => void} VoidCallback
 * Generic callback with no parameters or return value.
 * @description Used for mode transitions and UI updates
 */

/**
 * Configuration for steps state machine callbacks.
 * @typedef {Object} StepsConfig
 * @property {WeaponChangeCallback} [onChangeWeapon] - Weapon change notification
 * @property {WeaponActivationCallback} [onActivate] - Weapon activation event
 * @property {WeaponDeactivationCallback} [onDeactivate] - Weapon deactivation event
 * @property {HintCallback} [onHint] - Hint reveal event
 * @property {TurnCallback} [onEndTurn] - End turn event
 * @property {TurnCallback} [onBeginTurn] - Begin turn event
 * @property {AimCallback} [onAim] - Aiming mode transition
 * @property {TurnCallback} [onSelect] - Weapon selection event
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
   * Creates a Steps instance for managing weapon targeting workflow.
   * Initializes state machine with player identifier and sets up callbacks.
   *
   * @constructor
   * @param {string} player - Player identifier (Player.friend or Player.enemy)
   * @property {string} player - The player identifier
   * @property {string} mode - Current weapon mode (SELECT, AIM, or OTHERS from WeaponMode)
   * @property {string|null} wletter - Current weapon letter identifier (null if none selected)
   * @property {SourceRack|null} sourceRack - Currently selected weapon rack with all metadata
   * @property {BoardContext|null} source - Source ship/weapon location (where weapon is mounted)
   * @property {Ship|null} sourceShip - Source ship object (if weapon is attached to a ship)
   * @property {BoardContext|null} sourceHint - Hint/preview location (weapon effect preview)
   * @property {BoardContext|null} sourceShadow - Shadow/targeting indicator location (visual indicator)
   * @property {BoardContext|null} target - Current target location (where weapon will fire)
   * @property {WeaponChangeCallback} onChangeWeapon - Callback for weapon letter changes
   * @property {WeaponActivationCallback} onActivate - Callback when weapon is activated
   * @property {WeaponDeactivationCallback} onDeactivate - Callback when weapon is deactivated
   * @property {HintCallback} onHint - Callback when hint is revealed
   * @property {TurnCallback} onEndTurn - Callback at end of player's turn
   * @property {TurnCallback} onBeginTurn - Callback at start of player's turn
   * @property {AimCallback} onAim - Callback when transitioning to aiming mode
   * @property {TurnCallback} onSelect - Callback when transitioning to selection mode
   */
  constructor (player) {
    this.#initializeState(player)
    this.#initializeCallbacks()
  }

  /**
   * Initialize player state and set initial weapon mode.
   * Sets player identifier and resets all source/targeting fields to null.
   * Mode is set to 'othersTurn' (waiting for turn to begin).
   *
   * @param {string} player - Player identifier (FRIEND or ENEMY)
   * @returns {void}
   */
  #initializeState (player) {
    this.player = player
    this.#resetSourceFields()
    this.mode = WeaponMode.othersTurn
  }

  /**
   * Initialize all event callbacks to no-op functions.
   * These will be overridden by game controller to handle game events.
   * NOOP serves as default to prevent errors if callbacks are invoked before assignment.
   * Ensures all callbacks have defined functions even before game controller assignment.
   *
   * @returns {void}
   */
  #initializeCallbacks () {
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
   * @returns {void}
   */
  #resetSourceFields () {
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
   * A weaponId of -1 indicates a deactivated or empty rack.
   *
   * @returns {boolean} True if sourceRack exists and has a valid weaponId (not -1)
   */
  #hasActiveRack () {
    return Boolean(this.sourceRack && this.sourceRack.weaponId !== -1)
  }

  /**
   * Check if the provided weaponId differs from the currently selected rack.
   * Compares against sourceRack?.weaponId to detect weapon changes.
   * Returns true if sourceRack is null (no current rack) or IDs differ.
   *
   * @param {number} weaponId - Weapon ID to check for difference
   * @returns {boolean} True if weaponId differs from current sourceRack.weaponId or sourceRack is null
   */
  #isNewRackId (weaponId) {
    return weaponId !== this.sourceRack?.weaponId
  }

  /**
   * Resolve the weapon ID, using provided value or falling back to rack.id.
   * If weaponId is undefined, uses rack.id as the resolved ID.
   * Ensures a valid numeric ID is always returned for weapon tracking.
   *
   * @param {number|undefined} weaponId - Explicit weapon ID (may be undefined)
   * @param {Rack} rack - Weapon rack object with id property
   * @returns {number} Resolved weapon ID (from weaponId parameter or rack.id)
   */
  #resolveWeaponId (weaponId, rack) {
    return weaponId === undefined ? rack.id : weaponId
  }

  /**
   * Determine shadow coordinates based on weapon type and game mode.
   * In seeking mode or for weapons with shadow at hint, uses hint coordinates.
   * Otherwise returns source coordinates (x, y).
   * Shadow is the visual indicator showing where the weapon will fire/effect.
   *
   * @param {Weapon} weapon - Weapon object to check for shadow properties
   * @param {number} x - Column coordinate of source (weapon location)
   * @param {number} y - Row coordinate of source (weapon location)
   * @param {number} hintX - Column coordinate of hint/preview location
   * @param {number} hintY - Row coordinate of hint/preview location
   * @returns {[number, number]} Tuple [shadowX, shadowY] - Shadow coordinates
   */
  #resolveShadowCoords (weapon, x, y, hintX, hintY) {
    // @ts-ignore - bh is a global game state singleton with dynamic properties
    return bh.seekingMode || weapon.hasShadowAtHint ? [hintX, hintY] : [x, y]
  }

  /**
   * Check if the weapon letter differs from currently selected weapon.
   * Used to detect when player switches to a different weapon type.
   * Returns true if sourceRack is null (no current weapon) or letters differ.
   *
   * @param {string} wletter - Weapon letter identifier to check
   * @returns {boolean} True if weapon letter differs from current sourceRack.wletter
   */
  #isWeaponChangeRequired (wletter) {
    return wletter !== this.sourceRack?.wletter
  }

  /**
   * Set a board context property on the Steps instance.
   * Routes to appropriate property based on key: source, sourceHint, sourceShadow, or target.
   * Creates a BoardContext object and assigns it to the specified property.
   *
   * @param {'source'|'sourceHint'|'sourceShadow'|'target'} key - Property name to set
   * @param {Board} board - Game board object
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @param {HTMLElement} cell - DOM element of the cell
   * @returns {void}
   * @throws {Error} Implicitly throws if key is not a valid option (switch falls through)
   */
  #setBoardContext (key, board, x, y, cell) {
    const context = this.#buildBoardContext(board, x, y, cell)
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
   * @param {Board} board - Game board object
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @param {HTMLElement} cell - DOM element of the cell
   * @returns {BoardContext} Context object with board, x, y, and cell properties
   */
  #buildBoardContext (board, x, y, cell) {
    return { board, x, y, cell }
  }

  /**
   * Set the current weapon mode and execute a callback.
   * Updates this.mode and immediately invokes callback with this Steps instance as argument.
   * Used to synchronize state transitions with UI updates.
   *
   * @param {'SELECT'|'AIM'|'OTHERS'} mode - New mode from WeaponMode (SELECT, AIM, or OTHERS)
   * @param {(steps: Steps) => void} callback - Callback function invoked with this Steps instance
   * @returns {void}
   */
  #setMode (mode, callback) {
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
    return this.#isWeaponChangeRequired(wletter)
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
    return this.#hasActiveRack() && this.#isNewRackId(weaponId)
  }

  /**
   * Query whether a new weapon rack should be activated.
   * Checks if weapon object is valid, weaponId is not -1, and differs from current rack.
   * Used to determine if onActivate callback should be triggered.
   *
   * @public
   * @param {Weapon} weapon - Weapon object to check (must be truthy)
   * @param {number} weaponId - Weapon ID to check (must not be -1)
   * @returns {boolean} True if weapon is valid, weaponId is not -1, and differs from current
   */
  shouldActivateNewRack (weapon, weaponId) {
    return weapon && weaponId !== -1 && this.#isNewRackId(weaponId)
  }

  /**
   * Deactivate current rack if a new weapon ID is being selected.
   * Calls deactivateCurrentSourceRack() if the weaponId differs from current.
   *
   * @public
   * @param {number} weaponId - New weapon ID being activated
   * @returns {void}
   */
  deactivateOnNewRack (weaponId) {
    if (this.#isNewRackId(weaponId)) {
      this.deactivateCurrentSourceRack()
    }
  }

  /**
   * Deactivate the current source rack and trigger deactivation callback.
   * Checks if a valid rack is active before attempting deactivation.
   * Invokes onDeactivate callback with current rack coordinates.
   *

   * @public
   * @returns {void}
   */
  deactivateCurrentSourceRack () {
    if (!this.#hasActiveRack() || !this.sourceRack) return
    const { y, x, shadowY, shadowX } = this.sourceRack
    this.onDeactivate(y, x, shadowY, shadowX)
  }

  /**
   * Reset all source fields to null state.
   * Delegates to #resetSourceFields().
   *
   * @public
   * @returns {void}
   */
  resetSourceState () {
    this.#resetSourceFields()
  }

  /**
   * Transition to weapon selection mode and trigger onSelect callback.
   * Sets mode to sourceSelect and calls onSelect(this).
   *
   * @public
   * @returns {void}
   */
  select () {
    this.#setMode(WeaponMode.sourceSelect, () => this.onSelect(this))
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
    this.#setMode(WeaponMode.targetAim, () => this.onAim(this, hasAttached))
  }

  /**
   * Fire the selected weapon if a source is available.
   * Executes complete weapon fire workflow in sequence:
   * 1. Deactivate current rack
   * 2. Consume ammunition
   * 3. Reveal hint location (if weapon provides hint)
   * 4. Return to weapon selection mode
   *
   * Does nothing if no source location is registered (early return).
   *
   * @public
   * @returns {void}
   */
  fire () {
    this.#warnIfNoSourceShipForUnattachedWeapon()
    if (!this.source) return

    this.deactivateCurrentSourceRack()
    this.#useSourceAmmo()
    this.#revealHintIfRequired()
    this.select()
  }

  /**
   * Consume ammunition from the source weapon.
   * Calls cellUseAmmo on the source board to decrement ammo count.
   * Does nothing if source is not registered.
   *
   * @returns {void}
   */
  #useSourceAmmo () {
    if (!this.source) return
    this.source.board.cellUseAmmo(this.source.c, this.source.r)
  }

  /**
   * Log a warning if firing an unattached weapon without a source ship.
   * Detects invalid state: terrain without unattached weapons, but weapon fired without ship.
   * This indicates a logic error in the game flow.
   *
   * @returns {void}
   */
  #warnIfNoSourceShipForUnattachedWeapon () {
    // @ts-ignore - bh is a global game state singleton with dynamic properties
    if (!bh.terrain.hasUnattachedWeapons && this.sourceShip === null) {
      // @ts-ignore - bh.terrain.name is a dynamic property
      console.warn(
        `${bh.terrain.name} does not have unattached weapons, but a weapon was fired without a source ship`
      )
    }
  }

  /**
   * Reveal hint location if the weapon provides hints and hint location exists.
   * Calls cellHintReveal on the source board and invokes onHint callback.
   * Does nothing if weapon doesn't provide hints or sourceHint is not set.
   *
   * @returns {void}
   */
  #revealHintIfRequired () {
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
   * Complete workflow: resolve ID → notify changes → calculate shadow → activate → select → return coords.
   * Transitions to selection mode after activation.
   * Returns shadow coordinates for UI display.
   *
   * @public
   * @param {AddRackParams} params - Parameters for adding the rack
   * @returns {ShadowCoords} Shadow coordinates {shadowR, shadowC} for weapon visual placement
   */
  addRack (params) {
    const { rack, weapon, wletter, weaponId, x, y, cell, hintX, hintY } = params
    const resolvedWeaponId = this.#resolveWeaponId(weaponId, rack)
    this.#maybeNotifyAttachedWeaponChange(wletter)

    const [shadowC, shadowR] = this.#resolveShadowCoords(
      weapon,
      x,
      y,
      hintX,
      hintY
    )

    this.activate({
      weaponId: resolvedWeaponId,
      weapon,
      rack,
      wletter,
      r: y,
      c: x,
      cell,
      shadowR,
      shadowC
    })

    this.sourceRack = this.#buildSourceRack({
      rack,
      weapon,
      wletter,
      weaponId: resolvedWeaponId,
      r: y,
      c: x,
      cell,
      shadowR,
      shadowC
    })

    this.select()
    return { shadowR, shadowC }
  }

  /**
   * Build a SourceRack object from weapon and location information.
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
  #buildSourceRack (params) {
    const { rack, weapon, wletter, weaponId, r, c, cell, shadowR, shadowC } =
      params
    return {
      rack,
      weapon,
      wletter,
      weaponId,
      r,
      c,
      x: c,
      y: r,
      cell,
      shadowR,
      shadowC,
      shadowX: shadowC,
      shadowY: shadowR
    }
  }

  /**
   * Notify weapon change if terrain has attached weapons and letter changed.
   * Only triggers onChangeWeapon callback if both conditions are met:
   * 1. Terrain has attached weapons feature enabled
   * 2. Weapon letter differs from currently selected
   *
   * @param {string} wletter - Weapon letter identifier
   * @returns {void}
   */
  #maybeNotifyAttachedWeaponChange (wletter) {
    if (bh.terrain.hasAttachedWeapons && this.shouldChangeWeapon(wletter)) {
      this.onChangeWeapon(wletter)
    }
  }

  /**
   * Activate a weapon rack with deactivation of previous rack.
   * Workflow: deactivate old rack → check activation conditions → invoke onActivate callback.
   * Triggers onActivate callback only if shouldActivateNewRack() conditions are met.
   *
   * @public
   * @param {ActivateParams} params - Parameters for activation
   * @returns {void}
   */
  activate (params) {
    const { weaponId, weapon, rack, wletter, r, c, cell, shadowC, shadowR } =
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
    this.deactivateCurrentSourceRack()
    this.resetSourceState()
  }

  /**
   * Register a source ship for attached weapons.
   * Updates weapon letter from ship's primary weapon if terrain has attached weapons.
   * Triggers onChangeWeapon callback if weapon letter differs from current.
   * Issues warning if ship registered on non-attached-weapon terrain (logic error).
   *
   * @public
   * @param {Ship} ship - The ship object with primaryWeapon property
   * @returns {void}
   */
  addShip (ship) {
    this.sourceShip = ship
    if (!this.#isAttachedWeaponTerrain()) {
      this.#warnAttachedWeaponWithoutShip()
      return
    }

    /** @type {Weapon} */
    const primaryWeapon = ship.primaryWeapon
    const letter = primaryWeapon.letter
    if (this.#isWeaponChangeRequired(letter)) {
      this.onChangeWeapon(letter)
    }
    this.wletter = letter
  }

  /**
   * Check if current terrain uses attached weapons (weapons on ships).
   * Attached weapons are bound to ship locations (e.g., ships with cannons).
   * Unattached weapons are placed independently on the board.
   *
   * @returns {boolean} True if terrain has attached weapons feature enabled
   */
  #isAttachedWeaponTerrain () {
    return bh.terrain.hasAttachedWeapons
  }

  /**
   * Log a warning when attached weapon terrain receives a ship.
   * Indicates a logic error: addShip() called on non-attached-weapon terrain.
   *
   * @returns {void}
   */
  #warnAttachedWeaponWithoutShip () {
    console.warn(
      'Terrain does not have attached weapons, but a ship was added to steps'
    )
  }

  /**
   * Register hint/preview location for weapon effect preview.
   * Stores hint location in sourceHint property via #setBoardContext().
   * Used by weapons that provide targeting hints/previews.
   *
   * @public
   * @param {Board} board - Game board object
   * @param {number} r - Row coordinate of hint location
   * @param {number} c - Column coordinate of hint location
   * @param {HTMLElement} cell - DOM element of the hint cell
   * @returns {void}
   */
  addHint (board, r, c, cell) {
    this.#setBoardContext('sourceHint', board, r, c, cell)
  }

  /**
   * Register shadow/targeting indicator location.
   * Stores shadow location in sourceShadow property via #setBoardContext().
   * Shadow is visual indicator showing weapon source or effect area.
   *
   * @public
   * @param {Board} board - Game board object
   * @param {number} r - Row coordinate of shadow location
   * @param {number} c - Column coordinate of shadow location
   * @param {HTMLElement} cell - DOM element of the shadow cell
   * @returns {void}
   */
  addShadow (board, r, c, cell) {
    this.#setBoardContext('sourceShadow', board, r, c, cell)
  }

  /**
   * Register weapon source location (where weapon is mounted/fired from).
   * Stores source location in source property via #setBoardContext().
   * Source is the actual location of the weapon on the board.
   *
   * @public
   * @param {Board} board - Game board object
   * @param {number} y - Row coordinate of source location
   * @param {number} x - Column coordinate of source location
   * @param {HTMLElement} cell - DOM element of the source cell
   * @returns {void}
   */
  addSource (board, x, y, cell) {
    this.#setBoardContext('source', board, x, y, cell)
  }

  /**
   * End current player's turn and transition to opponent's turn.
   * Sets mode to othersTurn and calls onEndTurn(this) callback.
   * Resets targeting state for next player's turn.
   *
   * @public
   * @returns {void}
   */
  endTurn () {
    this.#setMode(WeaponMode.othersTurn, () => this.onEndTurn(this))
  }

  /**
   * Begin current player's turn and transition to weapon selection mode.
   * Sets mode to sourceSelect and calls onBeginTurn(this) callback.
   * Initiates the targeting workflow for the current player.
   *
   * @public
   * @returns {void}
   */
  beginTurn () {
    this.#setMode(WeaponMode.sourceSelect, () => this.onBeginTurn(this))
  }
}
