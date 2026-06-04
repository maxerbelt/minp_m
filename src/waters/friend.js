import { bh } from '../terrains/all/js/bh.js'
import { Random } from '../core/Random.js'
import { gameStatus } from './StatusUI.js'
import { setupDragHandlers } from '../selection/dragndrop.js'
import { Player } from './steps.js'
import { LoadOut } from './LoadOut.js'
import { Delay } from '../core/Delay.js'
import { Placement } from './placement.js'

// ============================================================================
// Constants
// ============================================================================

/**
 * @typedef {Object} WeaponLaunchResult
 * @property {boolean} [hasTargettedWeapon] - Indicates if a targeted weapon was used
 * @property {boolean} [hasUnattached] - Indicates if unattached weapon needs target selection
 * @property {Weapon} [weapon] - The weapon object used
 * @property {Object} [score] - The score result from the launch
 */

/**
 * @typedef {Object} Weapon
 * @property {string} letter - Single character weapon identifier
 * @property {string} name - Weapon display name
 * @property {boolean} isLimited - Whether weapon has limited ammo
 * @property {boolean} hasExtraSelectCursor - Whether weapon has extra select step
 * @property {number} numStep - Number of targeting steps (1 or 2)
 * @property {number} [postUnattached] - Post-unattached step offset
 * @property {string} classname - CSS class name for styling
 * @property {(stepIndex: number) => string} stepHint - Returns hint text for given step
 * @property {(numCoords: number, stepIdxArg: number) => number} stepIdx - Calculates step index from coordinates and argument
 * @property {Array<string>} [cursors] - Array of cursor class names for weapon modes
 * @property {string} [launchCursor] - Cursor class when ready to launch
 * @property {string} [tag] - Weapon tag identifier for filtering/targeting
 * @property {boolean} [postSelectShadow] - Whether weapon shows shadow after selection
 * @property {number} [postSelectCoords] - Number of additional coordinates needed after selection
 * @property {() => void} [playWarnSound] - Optional callback to play warning sound
 */

/**
 * @typedef {Object} WeaponSystem
 * @property {Weapon} weapon - The weapon configuration
 * @property {number} [id] - Weapon system ID reference
 * @property {number} [ammoCapacity] - Function returning remaining ammo
 */

/**
 * @typedef {Object} Location
 * @property {number} r - Row coordinate
 * @property {number} c - Column coordinate
 */

/**
 * @typedef {Object} SelectedCellCoordinates
 * @property {number} r - Target row coordinate
 * @property {number} c - Target column coordinate
 */

/**
 * @typedef {Object} Bitmask - Bitmask object with occupancy and morphological operations
 * @property {number} occupancy - Number of occupied cells in this bitmask
 * @property {Function} take - Returns intersection with another bitmask
 * @property {Function} clone - Creates a deep copy of this bitmask
 * @property {Function} dilate - Dilates the bitmask by n cells
 * @property {Function} dilateCross - Dilates in orthogonal cross pattern
 * @property {Function} join - Union operation with another bitmask
 * @property {Array<GridCoordinate>} toCoords - Converts occupied cells to [col, row] coordinates
 * @property {string} toAscii - ASCII representation for debugging
 * @property {Array<GridCoordinate>} randomOccupied - Single random occupied cell as [col, row]
 */

/**
 * @typedef {Object} MapInfo - Game map with grid dimensions and utility methods
 * @property {number} rows - Number of rows in the grid
 * @property {number} cols - Number of columns in the grid
 * @property {Bitmask} fullMask - Bitmask representing entire playable grid
 * @property {Bitmask} blankMask - Empty bitmask for the map
 * @property {Function} inBounds - Checks if coordinates are within map bounds
 */

/**
 * @typedef {Object} Score - Score tracking object for shots and hits
 * @property {Bitmask} shot - Bitmask of all shot locations
 * @property {Bitmask} reveal - Bitmask of revealed (scanned) locations
 * @property {Bitmask} hint - Bitmask of hint-revealed locations
 * @property {Function} isNewShot - Checks if coordinates haven't been shot yet
 * @property {Function} isOldShot - Checks if coordinates have been shot already
 * @property {Function} finishTurn - Completes a turn and updates game state
 * @property {Function} reset - Resets score to initial state
 */

/**
 * @typedef {[number, number]} GridCoordinate - [column, row] coordinate pair
 */

/**
 * @typedef {'DestroyOne'|'Bomb'|'Scan'|'Seek'} EffectType - Weapon effect type enumeration
 */

/**
 * @typedef {Function} FinishStrategy - Asynchronous function returning WeaponLaunchResult or null
 * @returns {Promise<WeaponLaunchResult|null>} Result from finish strategy
 */

/**
 * @typedef {Function} MaskConditionHandler - Callback for mask-based finish conditions
 * @param {Bitmask} mask - The candidate mask to process
 * @returns {Promise<WeaponLaunchResult|null>} Result from handler
 */

/**
 * @typedef {Object} SeekLoopContext - State for autonomous seeking loop
 * @property {boolean} continue - Whether to continue seeking
 * @property {Bitmask} untried - Locations not yet attempted
 * @property {Score} score - Current game score tracking
 */

/**
 * Configuration constants for AI seeking behavior.
 * @typedef {Object} SeekConstants
 * @property {number} IMPACT_MIN - Minimum impact level for bomb search
 * @property {number} IMPACT_START - Starting impact level for bomb search
 * @property {number} BOMB_ATTEMPTS - Attempts per impact level
 * @property {number} SEEK_MAX_ATTEMPTS - Maximum search attempts
 * @property {number} SEEK_DELAY_MS - Delay between seek steps in milliseconds
 */

/**
 * @typedef {() => Promise<WeaponLaunchResult|null>} EffectHandler
 * Effect handler function for weapon targeting strategy.
 * @description Async function returning weapon launch result or null if strategy fails
 */

/**
 * @typedef {Object<'DestroyOne'|'Bomb'|'Scan'|'Seek', EffectHandler>} EffectHandlerMap
 * Mapping of effect types to their corresponding handler functions.
 * @description Routes effect type strings to specialized targeting strategies
 */

/**
 * @typedef {(r: number, c: number) => Promise<void>} CellClickHandler
 * Handler for cell click events during weapon selection and targeting.
 * @description Processes row/column coordinate clicks in hide/seek mode
 */

/**
 * @typedef {(ships: Object[]) => void} UIResetCallback
 * Callback to reset UI with new ship information.
 * @description Updates board display and tray information after placement
 */

/**
 * @typedef {() => void} VoidCallback
 * Generic callback with no parameters or return value.
 * @description Used for UI refresh and state synchronization
 */

/**
 * @typedef {(weapon: Weapon, score: Score) => void} BombResultCallback
 * Callback to process bomb weapon results on opponent board.
 * @description Updates UI to reflect bomb splash damage and hits
 */

/**
 * @typedef {(weapon: Weapon, effect: Array<GridCoordinate>) => void} RevealCallback
 * Callback to handle scan weapon reveal effect.
 * @description Processes revealed cells from scan weapon area-of-effect
 */
/**
 * @typedef {Object} GridBoard
 * @property {HTMLElement} board - Main game board DOM element
 * @property {Function} nodeAt - Get cell at coordinates (x, y)
 * @property {Function} clearClasses - Clear CSS classes from cells
 * @property {Function} surroundCellElement - Get surrounding cell elements
 * @property {Function} displaySurround - Display surround cells
 * @property {Function} markPlaced - Mark ship as placed
 * @property {Function} makeAddDroppable - Make board cells droppable for ship addition
 * @property {Function} makeBrushable - Make board cells brushable for terrain editing
 * @property {() => void} makeDroppable - Make board droppable for drag operations
 */
/**
 * @typedef {Object} PlacementUI
 * @property {HTMLElement} board - The main game board elemenT
 * @property {GridBoard} grid - The grid board instance
 * @property {(row: number, column: number, rotationClass?: string, extraClass?: string) => void} [cellWeaponActive] - Activate weapon cell display
 * @property {(x: number, y: number, force?: boolean) => void} [cellWeaponDeactivate] - Deactivate weapon cell
 * @property {() => void} [clearVisuals] - Clear all visual effects from board
 * @property {() => void} [resetShips] - Reset ship cell styling
 * @property {(ships: Array<Object>) => void} [reset] - Reset UI with new ships
 * @property {(onClickCell?: Function, thisRef?: any) => void} [buildBoard] - Build board grid with handlers
 * @property {(ships: Array<Object>, shipCellGrid?: Object) => void} [buildTrays] - Build weapon trays
 * @property {() => void} [clearFriendVisuals] - Clear friendly player visuals
 * @property {() => void} [testMode] - Switch UI to test mode
 * @property {() => void} [showNotice] - Show notice message
 */

/**
 * @typedef {Object} LoadOutType
 * @property {boolean} isSingleShot - Whether in single-shot mode
 * @property {Array<any>} selectedCoordinates - Currently selected targeting coordinates
 * @property {Object|null} selectedWeapon - Currently selected weapon (null if none)
 * @property {() => void|undefined} clearSelectedCoordinates - Clears targeting coordinates
 * @property { WeaponSystem|undefined} firstUnattachedWeaponSystem - Gets unattached weapon or undefined
 * @property {WeaponSystem|undefined} currentWeaponSystem - Gets current weapon system
 * @property {(letter: string) => void} switchToWeapon - Switch to weapon by letter
 * @property {() => void} switchToNextWeaponSystem - Switch to next weapon system
 * @property {() => EffectType|null} switchToPreferredWeapon - Switch to preferred weapon
 * @property {() => void} switchToSingleShot - Switch to single-shot mode
 * @property {boolean} isOutOfAmmo - Check if out of ammo
 * @property {(r: number, c: number, weapon?: Object) => void} addSelectedCoordinates - Add targeting coordinate
 * @property {(r: number, c: number, ...args: any[]) => Promise<WeaponLaunchResult|null>} aimWeapon - Aim weapon at coordinates
 * @property {Function|null} onReveal - Callback when scan reveals cells
 * @property {Object} static - Static methods like noResult, launchDefault
 */

/**
 * @typedef {Object} StepsManager
 * @property {Function|null} onBeginTurn - Begin turn callback
 * @property {() => void} endTurn - End turn method
 */

/**
 * @typedef {Object} WatersOpponent
 * @property {PlacementUI} UI - Opponent UI controller
 * @property {Object|null} opponent - The opposing player
 * @property {() => void} [updateUI] - Update opponent UI
 * @property {(weapon: Object, score: Object) => void} [updateResultsOfBomb] - Update bomb results
 * @property {() => void} [_transitionToOpponentTurn] - Transition to opponent's turn
 */
const SEEK_CONSTANTS = {
  IMPACT_MIN: 2,
  IMPACT_START: 9,
  BOMB_ATTEMPTS: 12,
  SEEK_MAX_ATTEMPTS: 13,
  SEEK_DELAY_MS: 420
}

/**
 * Friendly player AI that extends Placement with autonomous seeking and targeting.
 * Provides test mode automation and friendly AI for validation scenarios.
 * Implements multi-strategy shot selection with preference for damaged ships.
 *
 * Extends Placement to add autonomous AI capabilities including:
 * - Strategic targeting with priority-based shot selection
 * - Morphological pattern matching for ship localization
 * - Autonomous seeking loops for test mode automation
 * - Two-click and single-click weapon firing modes
 * - Bitmask-based coordinate tracking and filtering
 *
 * @class Friend
 * @extends Placement
 * @description AI-controlled friendly player with advanced seeking and targeting strategies
 */
export class Friend extends Placement {
  /**
   * Creates a Friend AI player instance.
   * Initializes the AI player with UI controller, game state, and internal tracking structures.
   * Calls parent Placement constructor to set up base game state and weapon systems.
   *
   * @param {import('./placementUI.js').PlacementUI} friendUI - The friend player UI instance.
   *   Provides board rendering, event handling, and visual feedback for weapon targeting.
   * @property {boolean} testContinue - Controls test continuation
   * @property {boolean} friendlyWaters - Marks this as friendly player
   * @property {Bitmask|null} untried - Untried location mask for seeking
   * @property {Object|null} selectedCellCoordinates - Tracks selected target cell for two-click weapon firing in hide/seek mode
   */
  constructor (friendUI) {
    // @ts-ignore - PlacementUI board may be null at runtime but required by Placement
    super(friendUI, Player.friend)
    /** @type {boolean} Controls test continuation */
    this.testContinue = true
    /** @type {boolean} Marks this as friendly player */
    this.friendlyWaters = true
    /** @type {Bitmask|null} Untried location mask for seeking */
    this.untried = null
    /** @type {Object|null} Tracks the selected target cell for two-click weapon firing in hide/seek mode. */
    this.selectedCellCoordinates = null
  }

  /**
   * Gets the current game map.
   * Accesses global map state from bh singleton.
   * @returns {MapInfo} The active map with grid dimensions and utility methods
   */
  get map () {
    // @ts-ignore - bh.map is MapInfo at runtime, may be null in type system
    return bh.map
  }

  /**
   * Gets the empty result tuple for no-op weapon fire.
   * Used as default return value when weapon firing fails or is not possible.
   * Contains single-shot weapon and no-result score indicator.
   * @returns {WeaponLaunchResult} Empty result object with single shot weapon and noResult score
   */
  get noResult () {
    // @ts-ignore - loadOut.getSingleShot() is defined in base Placement class at runtime
    return { weapon: this.loadOut.getSingleShot(), score: LoadOut.noResult }
  }

  /**
   * Checks if autonomous test/seek mode should be cancelled.
   * Used to stop test loop when user clicks stop button.
   * @returns {boolean} True if test should stop (testContinue is false)
   */
  isCancelled () {
    return !this.testContinue
  }

  /**
   * Updates the weapon status display for the player.
   * Displays the current weapon name, ammo count, and mode icons in game status.
   *
   * This method is called whenever the selected weapon changes to refresh the UI.
   * It ensures all UI elements are updated consistently:
   * - Sets the weapon name/mode in game-status
   * - Resets icon classes to prepare for new weapon display
   * - Displays ammo counter and weapon step indicators
   *
   * The method always explicitly sets the weapon mode and resets icons before
   * calling displayAmmoStatus to prevent UI inconsistencies on weapon switches.
   * This is critical for Hide & Seek mode where players select weapons by clicking cells.
   *
   * @param {*} _rack - The weapon rack (unused, uses current weapon system from loadOut)
   * @param {Object} _cursorInfo - Cursor information (unused, not needed for status update)
   * @returns {void}
   */
  updateWeaponStatus (_rack, _cursorInfo) {
    // @ts-ignore - loadOut.currentWeaponSystem is defined in base Placement class at runtime
    const weaponSystem = this.loadOut.currentWeaponSystem
    const weapon = weaponSystem?.weapon

    if (weapon) {
      // Always set the weapon mode and reset icons to ensure UI updates on weapon change
      gameStatus.setWeaponMode(weapon)
      gameStatus.resetAmmoIcons()
      // @ts-ignore - loadOut and currentWeaponSystem are defined in base Placement class at runtime
      const selectedCoords = this.loadOut.selectedCoordinates || []
      gameStatus.displayAmmoStatus(
        // @ts-ignore - WeaponSystem vs WeaponsSystem type difference in LoadOut vs StatusUI
        weaponSystem,
        bh.maps,
        selectedCoords.length ?? 0,
        null,
        this._hasUnattachedForCurrentWeapon?.()
      )
    }
  }

  /**
   * Checks if the current weapon has unattached variants available.
   *
   * Returns true if:
   * - We're in seeking mode (some weapons have unattached variants in seek mode)
   * - The current weapon is single shot (simpler ammo state)
   * - The weapon system has unattached variant weapons available
   *
   * This information is passed to displayAmmoStatus to determine how to render
   * the ammo counter display (limited ammo vs step indicators).
   *
   * @returns {boolean} True if current weapon has unattached variants or is single shot
   */
  _hasUnattachedForCurrentWeapon () {
    return (
      // @ts-ignore - seekingMode property available at runtime on bh
      bh.seekingMode ||
      // @ts-ignore - loadOut.isSingleShot is defined in base Placement class at runtime
      this.loadOut.isSingleShot ||
      // @ts-ignore - loadOut.firstUnattachedWeaponSystem returns WeaponSystem|null at runtime
      this.loadOut.firstUnattachedWeaponSystem != null
    )
  }

  // ============ Location Selection ============

  /**
   * Selects a random hit coordinate from candidates.
   * Returns null if empty, first element if only one, random element otherwise.
   * Note: Used in test suite for randomization testing.
   *
   * @param {Array<GridCoordinate>} hitCoordinates - Candidate [row, col] coordinates
   * @returns {GridCoordinate|null} Random [row, col] or null if empty
   * @private
   */
  // @ts-ignore - unused but may be used by external code
  getRandomHitCoordinate (hitCoordinates) {
    const totalHits = hitCoordinates.length
    if (totalHits < 1) return null
    if (totalHits === 1) return hitCoordinates[0]
    const randomIndex = Math.floor(Math.random() * totalHits)
    return hitCoordinates[randomIndex]
  }

  /**
   * Generates a random location within map boundaries (not on edges).
   * Excludes edge cells to avoid placing weapons near board perimeter.
   *
   * @param {MapInfo} map - Map with rows and cols properties
   * @returns {{x: number, y: number}} Location object with x (col) and y (row)
   */
  #randomXY (map) {
    const y = Math.floor(Math.random() * (map.rows - 2)) + 1
    const x = Math.floor(Math.random() * (map.cols - 2)) + 1
    return { x, y }
  }

  /**
   * Synchronizes untried locations with current shot locations.
   * Removes all shot cells from untried set to track remaining candidates.
   * Updates this.untried to be the intersection of untried ∩ ¬shot (not yet shot).
   *
   * @private
   * @returns {void}
   */
  syncUntried () {
    // @ts-ignore - untried.take() is Bitmask method at runtime, removes shot cells
    this.untried = this.untried.take(this.score.shot)
  }

  /**
   * Gets a random untried coordinate from the map mask.
   * Synchronizes untried locations with shots before returning random candidate.
   * Returns null when no untried coordinates remain.
   *
   * @private
   * @returns {GridCoordinate|null} Random [col, row] coordinate or null if exhausted
   */
  getRandomUntriedCoordinate () {
    this.syncUntried()
    // @ts-ignore - untried.toCoords is Bitmask method returning GridCoordinate[] at runtime
    const locs = this.untried.toCoords
    const result = locs.length === 0 ? null : Random.element(locs)
    // @ts-ignore - Random.element returns GridCoordinate when array is non-empty
    return result
  }

  /**
   * Gets the most frequently tried row from untried locations.
   * Used for line-based targeting strategy in randomDestroyOne().
   * Returns ['0', 0] if no locations remain.
   *
   * @private
   * @returns {[string|number, number]} [rowNumber, frequency] or ['0', 0] if exhausted
   */
  getMostFrequentRow () {
    this.syncUntried()
    // @ts-ignore - untried.toCoords is Bitmask method returning GridCoordinate[] at runtime
    const locs = this.untried.toCoords
    if (locs.length === 0) {
      console.warn('no more locations to choose from')
      return ['0', 0]
    }
    // @ts-ignore - reduce callback receives [col, row] tuples, accumulator is Record<number, number>
    const tally = locs.reduce((acc, [, y]) => {
      // @ts-ignore - numeric index access on accumulator object
      acc[y] = 1 + (acc[y] || 0)
      return acc
    }, /** @type {Record<number, number>} */ ({}))
    const unordered = Random.shuffleArray([...Object.entries(tally)])
    const ordered = unordered.toSorted((a, b) => b[1] - a[1])

    return ordered[0]
  }

  /**
   * Gets the row number for the most tried line.
   * @returns {number} Row number (0 if no lines remain)
   * @private
   */
  getMostFrequentRowNumber () {
    const r = this.getMostFrequentRow()
    // @ts-ignore - r is [string|number, number], parseInt handles number
    return Number.parseInt(String(r?.[0]) || '0')
  }

  // ============ Weapon Launching ============

  /**
   * Creates a launch function for weapon aiming.
   * Returns a function that launches the weapon at specified coordinates.
   * The returned function is bound to current map and game state.
   *
   * @param {WeaponSystem} weaponSystem - The weapon system to create launch function for
   * @returns {(coords: Location) => Promise<WeaponLaunchResult|Object|null>} Async function(coords) that launches weapon at target
   */
  createLaunchFunction (weaponSystem) {
    return async (/** @type {Location} */ coords) => {
      // @ts-ignore - launchTo is private in Waters but accessible in subclass Friend; may return Object at runtime
      return await this.launchTo(coords, bh.map.rows - 1, 0, weaponSystem)
    }
  }

  /**
   * Creates a launch function for the currently selected weapon system.
   * Convenience wrapper around createLaunchFunction using current weapon.
   * @returns {(coords: Location) => Promise<WeaponLaunchResult>} Launch function for the current weapon system
   * @private
   */
  _createCurrentLaunchFunction () {
    // @ts-ignore - currentWeaponSystem is defined in base Placement class
    return this.createLaunchFunction(this.currentWeaponSystem)
  }

  /**
   * Launches the currently selected weapon at specified location.
   * Delegates to loadOut.aimWeapon with current weapon system and launch function.
   * Processes both click coordinates and weapon targeting logic.
   *
   * @param {number} x - Target column coordinate
   * @param {number} y - Target row coordinate
   * @returns {Promise<WeaponLaunchResult>} Result with weapon and score information
   */
  async launchCurrentWeapon (x, y) {
    const launch = this._createCurrentLaunchFunction()
    // @ts-ignore - loadOut and currentWeaponSystem are defined in base Placement class at runtime
    return await this.loadOut.aimWeapon(
      this.map,
      y,
      x,
      /** @type {any} */ (this.currentWeaponSystem),
      launch
    )
  }

  /**
   * Attempts weapon launch and falls back to a secondary aim coordinate.
   * If initial target returns noResult or fails, retries with fallback coordinates.
   * Used for boundary-aware targeting in random strategies.
   * @param {number} x - Initial target column coordinate
   * @param {number} y - Initial target row coordinate
   * @param {number} [fallbackX=x] - Fallback column coordinate (defaults to x)
   * @param {number} [fallbackY=y] - Fallback row coordinate (defaults to y)
   * @returns {Promise<WeaponLaunchResult>} Launch result from initial or fallback target
   */
  async #attemptLaunchWithFallback (x, y, fallbackX = x, fallbackY = y) {
    const result = await this.launchCurrentWeapon(x, y)
    if (result?.score && result.score !== LoadOut.noResult) {
      return result
    }

    const launch = this._createCurrentLaunchFunction()
    // @ts-ignore - loadOut and currentWeaponSystem are defined in base Placement class
    return await this.loadOut.aimWeapon(
      this.map,
      fallbackY,
      fallbackX,
      // @ts-ignore - currentWeaponSystem type may be broader at runtime, casting to any for aimWeapon method
      /** @type {any} */ (this.currentWeaponSystem),
      launch
    )
  }

  // ============ Random Actions ============

  /**
   * Searches for bomb targets by attempting random launches.
   * Delegates to_ attemptBomb for multiple tries with fallback logic.
   * Returns noResult if all attempts are exhausted without success.
   *
   * @returns {Promise<WeaponLaunchResult>} Result with bomb weapon and score, or noResult if no hits
   */
  async #randomBomb () {
    const result = await this.#attemptBomb()
    if (result) return result

    return this.noResult
  }

  /**
   * Attempts bomb launches with fallback retry logic.
   * Iterates through BOMB_ATTEMPTS tries, checking if coordinates are new shots.
   * Respects isCancelled() state and returns early if test is cancelled.
   *
   * @returns {Promise<WeaponLaunchResult>} Result if successful, noResult if all BOMB_ATTEMPTS exhausted
   */
  async #attemptBomb () {
    for (let attempt = 0; attempt < SEEK_CONSTANTS.BOMB_ATTEMPTS; attempt++) {
      if (this.isCancelled()) return this.noResult
      // @ts-ignore - this.map is MapInfo at runtime with randomXY compat
      const { x, y } = this.#randomXY(/** @type {MapInfo} */ (this.map))
      // @ts-ignore - this.score.isNewShot() is Score method available at runtime
      if (this.score.isNewShot(x, y)) {
        return await this.#attemptLaunchWithFallback(x, y)
      }
    }
    return this.noResult
  }

  /**
   * Launches single destroy-type weapon across highest frequency row.
   * Uses most-attempted row for targeting line sweep with fallback to opposite end.
   * Strategy: sweep from left (col 0) to right (cols-1) on most-hit row.
   *
   * @returns {Promise<WeaponLaunchResult>} Result with destroy weapon and score information
   */
  async #randomDestroyOne () {
    if (this.isCancelled()) return this.noResult
    const r = this.getMostFrequentRowNumber()
    // @ts-ignore - this.map.cols is number property available at runtime
    return await this.#attemptLaunchWithFallback(0, r, this.map.cols - 1, r)
  }

  /**
   * Validates if location is valid target for seeking.
   * Checks if location is in bounds and hasn't been double-tapped (clicked twice).
   *
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {boolean} True if valid target location (in bounds and not double-tapped)
   * @private
   */
  isHitValid (x, y) {
    // @ts-ignore - map.inBounds is available at runtime
    // @ts-ignore - isDTap is inherited from Waters base class
    return this.map.isInBoundsAt(x, y) && !this.isDTap(x, y, 4, false, false)
  }

  /**
   * Seeks single ship target with single shot weapons.
   * Attempts to find and fire at valid untried locations up to SEEK_MAX_ATTEMPTS.
   * Stops game if unable to find valid locations after max attempts.
   * Respects isCancelled() state for test mode control.
   *
   * @returns {Promise<WeaponLaunchResult>} Result from weapon fire or noResult on failure
   */
  async #randomSeek () {
    for (
      let attempt = 0;
      attempt < SEEK_CONSTANTS.SEEK_MAX_ATTEMPTS;
      attempt++
    ) {
      if (this.isCancelled()) return this.noResult
      const loc = this.getRandomUntriedCoordinate()

      if (!loc) {
        this._handleSeekFailure()
        return this.noResult
      }
      if (this.isHitValid(...loc)) {
        // @ts-ignore - launchCurrentWeapon is method defined in this class at runtime
        return await this.launchCurrentWeapon(...loc)
      }
    }
    return this.noResult
  }

  /**
   * Handles failure to find valid seek locations during autonomous play.
   * Displays error message and halts test mode.
   * @private
   * @returns {void}
   */
  _handleSeekFailure () {
    // @ts-ignore - UI.showNotice is defined in Board class at runtime
    this.UI.showNotice('something went wrong!')
    this.boardDestroyed = true
    this.testContinue = false
  }

  /**
   * Performs area scan with two random locations.
   * Reveals hidden areas without destroying ships.
   * Sets up reveal handler (scan callback) before launching scan weapon.
   * Returns result with scan weapon and score information.
   *
   * @returns {Promise<WeaponLaunchResult>} Result with scan weapon and score
   */
  async #randomScan () {
    // @ts-ignore - loadOut.onReveal is property for callback at runtime
    this.loadOut.onReveal = this.scan.bind(this)
    if (this.isCancelled()) return this.noResult
    // @ts-ignore - this.map is MapInfo at runtime
    const { x, y } = this.#randomXY(/** @type {MapInfo} */ (this.map))
    // @ts-ignore - this.map is MapInfo at runtime
    const { x: x1, y: y1 } = this.#randomXY(/** @type {MapInfo} */ (this.map))
    // @ts-ignore - currentWeaponSystem is available at runtime, wps.weapon is Weapon object
    const wps = /** @type {any} */ (this.currentWeaponSystem)
    // @ts-ignore - wps.weapon is Weapon object available at runtime
    const weapon = wps.weapon
    // @ts-ignore - loadOut.aimWeapon is method available at runtime
    await this.loadOut.aimWeapon(this.map, y, x)
    // @ts-ignore - loadOut.aimWeapon returns Promise<WeaponLaunchResult> at runtime
    const score = await this.loadOut.aimWeapon(this.map, y1, x1, wps)
    return { weapon, score }
  }

  /**
   * Handles scan effect - reveals cells in effect area.
   * Callback for loadOut onReveal handler set during randomScan().
   * Validates revealed cells and updates board state.
   *
   * @private
   * @param {Weapon} _weapon - The scan weapon (unused, not needed for reveal processing)
   * @param {Array<GridCoordinate>} effect - Array of [row, col, power] coordinate tuples to reveal
   * @returns {void}
   */
  scan (_weapon, effect) {
    // @ts-ignore - updateUI is inherited from Waters base class at runtime
    this.updateUI()
    for (const position of effect) {
      const [y, x] = position
      // @ts-ignore - this.map.inBounds is function available at runtime
      if (this.map.isInBoundsAt(x, y)) {
        // reveal what is in this position
      }
    }
  }

  // ============ Effect Dispatch ============

  /**
   * Dispatches weapon effect to appropriate handler method.
   * Routes effect types to specialized targeting strategies.
   * Returns noResult if effect type is not recognized or handler fails.
   *
   * @private
   * @param {EffectType} effect - Effect type: 'DestroyOne' | 'Bomb' | 'Scan' | 'Seek'
   * @returns {Promise<WeaponLaunchResult|null>} Result from effect handler or noResult
   */
  async randomEffect (effect) {
    /** @type {EffectHandlerMap} */
    const effectHandlers = {
      DestroyOne: () => this.#randomDestroyOne(),
      Bomb: () => this.#randomBomb(),
      Scan: () => this.#randomScan(),
      Seek: () => this.#randomSeek()
    }
    // @ts-ignore - effect is EffectType string, effectHandlers[effect] returns async function
    const handler = effectHandlers[effect]
    // @ts-ignore - handler returns Promise<WeaponLaunchResult|null> at runtime
    return handler ? await handler() : this.noResult
  }

  // ============ Shot Selection ============

  /**
   * Attempts to execute finish action if mask has occupied cells.
   * Generic helper for attempting location-based finish strategies.
   * Checks mask occupancy and delegates to finishAction if non-zero.
   *
   * @param {Bitmask|null} mask - Bitmask with occupancy property, or null
   * @param {MaskConditionHandler} finishAction - Callback(mask) to execute if occupied
   * @returns {Promise<WeaponLaunchResult|null>} Result from finish action or null if no candidates
   */
  async #tryFinishCondition (mask, finishAction) {
    // @ts-ignore - mask.occupancy is number property at runtime, indicates non-empty mask
    if (mask?.occupancy > 0) {
      return await finishAction(mask)
    }
    return null
  }

  /**
   * Executes prioritized finish strategies until one returns a result.
   * Attempts strategies in order, returning first non-null result.
   * Used to try multiple targeting patterns before falling back to scanning.
   *
   * @private
   * @param {Array<() => Promise<WeaponLaunchResult|null>>} strategies - Array of asynchronous strategy functions
   * @returns {Promise<WeaponLaunchResult|null>} Strategy result or null if all exhausted
   */
  async _executeFinishStrategies (strategies) {
    for (const strategy of strategies) {
      const result = await strategy()
      if (result) return result
    }
    return null
  }

  /**
   * Attempts to fire at a random target from a candidate mask.
   * Validates mask has occupancy, then delegates to #selectRandomCandidate.
   * Returns null if mask is empty or occupancy is zero.
   *
   * @param {Bitmask|null} mask - Candidate bitmask with occupied cells to select from
   * @returns {Promise<WeaponLaunchResult|null>} Result from firing at selected candidate, or null if no targets
   */
  async #finishMaskCandidates (mask) {
    // @ts-ignore - mask is Bitmask at runtime with occupancy property and methods
    return await this.#tryFinishCondition(mask, candidate =>
      this.#selectRandomCandidate(candidate)
    )
  }

  /**
   * Attempts to fire at revealed but not yet attacked cells.
   * Prioritizes previously revealed locations for follow-up shots.
   * Removes already-shot cells from reveal mask before selection.
   * Used in shot selection strategy priority chain.
   *
   * @returns {Promise<WeaponLaunchResult|null>} Result from finish strategy or null if no revealed targets
   */
  async #finishRevealed () {
    // @ts-ignore - score.reveal is Bitmask at runtime with occupancy property, cast via unknown
    const reveal = /** @type {Bitmask} */ (
      /** @type {unknown} */ (this.score.reveal)
    )
    if (reveal.occupancy === 0) return null
    // @ts-ignore - score.reveal and score.shot are Bitmask methods available at runtime
    // @ts-ignore - reveal.take returns Bitmask at runtime
    this.score.reveal = reveal.take(this.score.shot)
    return await this.#finishMaskCandidates(
      // @ts-ignore - score.reveal is Bitmask at runtime, cast via unknown for type safety
      /** @type {Bitmask} */ (/** @type {unknown} */ (this.score.reveal))
    )
  }

  /**
   * Attempts to finish partially damaged ship.
   * First tries orthogonal cross pattern (up/down/left/right neighbors).
   * Falls back to surrounding cells (all 8-neighbors) if cross pattern yields no shots.
   * Used in shot selection strategy priority chain.
   *
   * @param {Bitmask|null} hits - Hit locations mask from unsunk ships on opponent board
   * @returns {Promise<WeaponLaunchResult|null>} Result from finish strategy or null if no targets
   */
  async #finishPartiallySunk (hits) {
    // @ts-ignore - hits is Bitmask at runtime with occupancy property
    if (!hits?.occupancy) return null

    const result = await this.#tryCrossPattern(hits)
    if (result) return result

    return await this.#trySurroundPattern(hits)
  }

  /**
   * Tries cross pattern for finishing partially sunk ship.
   * Dilates hits in orthogonal directions (±1 row/col), excludes already-shot cells.
   *
   * @param {Bitmask} hits - Hit locations mask
   * @returns {Promise<WeaponLaunchResult|null>} Result or null if no candidates
   */
  async #tryCrossPattern (hits) {
    // @ts-ignore - score.shot is Bitmask at runtime with take method
    const shots = this.score.shot
    // @ts-ignore - hits.clone.dilateCross() are Bitmask methods at runtime
    const cross = hits.clone.dilateCross()
    // @ts-ignore - cross.take is Bitmask method at runtime
    const candidates = cross.take(shots)

    return await this.#finishMaskCandidates(candidates)
  }

  /**
   * Tries surround pattern for finishing partially sunk ship.
   * Dilates hits to all 8-neighbors, excludes already-shot cells.
   *
   * @param {Bitmask} hits - Hit locations mask
   * @returns {Promise<WeaponLaunchResult|null>} Result or null if no candidates
   */
  async #trySurroundPattern (hits) {
    // @ts-ignore - score.shot is Bitmask at runtime
    const shots = this.score.shot
    // @ts-ignore - hits.clone.dilate(1).take() are Bitmask methods at runtime
    const surround = hits.clone.dilate(1).take(shots)
    return await this.#finishMaskCandidates(surround)
  }

  /**
   * Attempts to fire at hint-revealed locations.
   * Expands hint area by 1 cell and looks for untried cells within expansion.
   * Focuses on areas near hint clusters for strategic targeting.
   * Used in shot selection strategy priority chain.
   *
   * @returns {Promise<WeaponLaunchResult|null>} Result from finish strategy or null if no hint targets
   */
  async #finishHints () {
    // @ts-ignore - score.hint is Bitmask at runtime with occupancy property
    const numHints = this.score?.hint?.occupancy || 0
    if (numHints > 0) {
      // @ts-ignore - score.hint.clone.dilate(1).take() are Bitmask methods at runtime
      const surroundHints = this.score.hint.clone
        .dilate(1)
        .take(this.score.shot)
      return await this.#finishMaskCandidates(surroundHints)
    }
    return null
  }

  /**
   * Selects random cell from candidate mask and launches single shot.
   * Switches to single shot weapon before firing at selected coordinate.
   * Extracts random occupied cell from candidate bitmask.
   *
   * @param {Bitmask} candidate - Bitmask with randomOccupied property containing target cells
   * @returns {Promise<WeaponLaunchResult>} Result with weapon and score information
   */
  async #selectRandomCandidate (candidate) {
    // @ts-ignore - loadOut.switchToSingleShot is method at runtime
    this.loadOut.switchToSingleShot()
    // @ts-ignore - candidate.randomOccupied is [col, row] tuple at runtime
    const loc = candidate.randomOccupied
    // @ts-ignore - launchCurrentWeapon is method defined in this class at runtime
    return await this.launchCurrentWeapon(...loc)
  }

  /**
   * Selects next shot strategy based on current board state.
   * Priority: Revealed cells > Partially sunk ships > Hint areas > Effect weapon > Seek.
   * Implements escalating strategy: finish easy targets first, then switch to scanning/seeking.
   * Core method for intelligent autonomous targeting.
   *
   * @param {Bitmask} hits - Current hit locations on board from unsunk ships
   * @returns {Promise<WeaponLaunchResult|null>} Result from selected shot strategy
   */
  async #selectShot (hits) {
    const finishMethods = [
      () => this.#finishRevealed(),
      () => this.#finishPartiallySunk(hits),
      () => this.#finishHints()
    ]

    const strategyResult = await this._executeFinishStrategies(finishMethods)
    if (strategyResult) return strategyResult

    // @ts-ignore - loadOut.switchToPreferredWeapon returns EffectType|null at runtime
    const op = this.loadOut.switchToPreferredWeapon()
    if (op) {
      return await this.randomEffect(op)
    }

    // @ts-ignore - loadOut.switchToSingleShot is method at runtime
    this.loadOut.switchToSingleShot()
    return await this.#randomSeek()
  }

  // ============ Board Management ============

  /**
   * Restarts game board for new round.
   * Clears visuals, resets ship display, and re-arms weapons.
   * Removes 'destroyed' CSS class from board element.
   *
   * @param {boolean} [friendlyMode=false] - Also clear friendly player visuals if true (default: false)
   * @returns {void}
   */
  restartBoard (friendlyMode = false) {
    this.boardDestroyed = false
    // @ts-ignore - this.UI.board is HTMLElement at runtime with classList property
    this.UI.board?.classList?.remove('destroyed')
    // @ts-ignore - score.reset is method defined in Score class at runtime
    this.score.reset()
    // @ts-ignore - UI.clearVisuals is method defined in Board class at runtime
    this.UI.clearVisuals()
    if (friendlyMode) {
      // @ts-ignore - UI.clearFriendVisuals is method defined in Board class at runtime
      this.UI.clearFriendVisuals()
    }
    // @ts-ignore - UI.resetShips is method defined in Board class at runtime
    this.UI.resetShips(this.ships)
    // @ts-ignore - armWeapons is method defined in base Placement class at runtime
    this.armWeapons()
  }

  /**
   * Initializes untried locations mask with full map.
   * Used to track which cells have not yet been shot at during seeking.
   * Called at start of seek loop to reset candidate pool.
   * Sets this.untried to full map bitmask.
   *
   * @returns {void}
   */
  setupUntried () {
    // @ts-ignore - map.fullMask is Bitmask at runtime
    this.untried = this.map.fullMask
  }

  /**
   * Gets combined hit mask from all unsunk ships on opponent board.
   * Used to identify areas with damaged but unsunk ships.
   * Joins hit masks of all unsunk ships into single aggregate bitmask.
   * Returns empty (blank) mask if no hits or no unsunk ships.
   *
   * @returns {Bitmask} Bitmask of all current hits across unsunk ships
   */
  getHits () {
    // @ts-ignore - map.blankMask is Bitmask at runtime
    const blankMask = this.map.blankMask
    // @ts-ignore - shipsUnsunk is method inherited from Waters base class at runtime
    return this.shipsUnsunk().reduce((acc, ship) => {
      // @ts-ignore - ship.hits is Bitmask with occupancy property
      if (!ship.hits?.occupancy) {
        return acc
      }
      //   this._logShipHits(ship, acc)
      // @ts-ignore - acc.join is Bitmask method at runtime
      const result = acc.join(ship.hits)
      //console.log('combined hits', result, result.toAscii)
      return result
    }, blankMask)
  }

  /**
   * Logs ship hits information.
   * @param {Object} _ship - Ship object (unused)
   * @param {Bitmask} _existingHits - Existing hits mask (unused)
   * @private
   * @deprecated Not used in current codebase
   */
  // @ts-ignore - unused but may be used by external code
  _logShipHits (_ship, _existingHits) {
    // @ts-ignore - debug logging on Ship/Bitmask properties
    console.log('unsunk ship', _ship.hits, _ship.hits.toAscii)
    // @ts-ignore - debug logging on Bitmask properties
    console.log('existing hits', _existingHits, _existingHits.toAscii)
  }

  // ============ Test/Seek Loop ============

  /**
   * Initiates test mode and begins autonomous seeking.
   * Disables player controls and starts seek loop.
   * Prepares board state and weapon systems for automated play.
   * Updates UI buttons and initializes game board for testing.
   *
   * @returns {void}
   */
  test () {
    gameStatus.flush()
    // @ts-ignore - UI.testMode is method defined in Board class at runtime
    this.UI.testMode()
    // @ts-ignore - UI.testBtn is HTMLButton element at runtime
    const testBtn = /** @type {HTMLButtonElement} */ (this.UI.testBtn)
    // @ts-ignore - UI.seekBtn is HTMLButton element at runtime
    const seekBtn = /** @type {HTMLButtonElement} */ (this.UI.seekBtn)
    // @ts-ignore - UI.stopBtn is HTMLButton element at runtime
    const stopBtn = /** @type {HTMLButtonElement} */ (this.UI.stopBtn)
    testBtn.disabled = true
    seekBtn.disabled = true
    stopBtn.disabled = false

    this.restartBoard()
    this.seek()
  }

  /**
   * Performs single seek step: selects target, fires, and processes results.
   * Updates UI with shot results and ends turn.
   * Core loop iteration for autonomous seeking AI.
   * Called repeatedly by seekRaw() in the main game loop.
   *
   * @returns {Promise<void>}
   */
  async seekStep () {
    const hits = this.getHits()
    // @ts-ignore - setWeaponFireHandlers is method defined in base Waters class at runtime
    this.setWeaponFireHandlers()
    const result = await this.#selectShot(hits)
    await this.#finalizeSeekStep(result)
  }

  /**
   * Finalizes a seek action by updating results, UI, and turn state.
   * Records hit/score if weapon was successfully fired.
   * Transitions to opponent's turn and triggers UI update.
   *
   * @param {WeaponLaunchResult|null} result - The result from a shot or action.
   * @returns {Promise<void>}
   */
  async #finalizeSeekStep (result) {
    if (result?.score && result.score !== LoadOut.noResult) {
      // @ts-ignore - updateResultsOfBomb is method defined in base Waters class at runtime
      this.updateResultsOfBomb(result.weapon, result.score)
    }
    // @ts-ignore - score.finishTurn is method defined in Score class at runtime
    this.score.finishTurn()
    // @ts-ignore - updateUI is method inherited from Waters base class at runtime
    this.updateUI()
    // @ts-ignore - steps.endTurn is method defined in Steps class at runtime
    this.steps.endTurn()
  }

  /**
   * Main seek entry point. Runs autonomous loop and restores UI afterward.
   * Re-enables controls and hides stop button when complete.
   * Wrapper that ensures UI cleanup after seeking finishes.
   * Public API for starting autonomous seek mode.
   *
   * @returns {Promise<void>}
   */
  async seek () {
    await this.#seekRaw()
    // @ts-ignore - UI.testBtn is HTMLButton element at runtime
    const testBtn = /** @type {HTMLButtonElement} */ (this.UI.testBtn)
    // @ts-ignore - UI.seekBtn is HTMLButton element at runtime
    const seekBtn = /** @type {HTMLButtonElement} */ (this.UI.seekBtn)
    // @ts-ignore - UI.stopBtn is HTMLElement with classList at runtime
    const stopBtn = /** @type {HTMLElement} */ (this.UI.stopBtn)
    testBtn.disabled = false
    seekBtn.disabled = false
    stopBtn.classList.add('hidden')
  }

  /**
   * Initializes autonomous seeking run with clean state.
   * Resets game state flags, arms weapons, and sets up untried locations.
   * Called before entering main seek loop.
   *
   * @returns {Promise<void>}
   */
  async #initializeSeekRun () {
    this.testContinue = true
    this.boardDestroyed = false
    // @ts-ignore - armWeapons is method defined in base Placement class at runtime
    this.armWeapons()
    // @ts-ignore - score.shot and map.blankMask are available at runtime
    this.score.shot = this.map.blankMask
    this.setupUntried()
  }

  /**
   * Main autonomous seeking loop with delay between steps.
   * Initializes seek state and enters continuous targeting loop.
   * Exits when testContinue becomes false or board destroyed.
   * Core game loop for autonomous AI play.
   *
   * @returns {Promise<void>}
   */
  async #seekRaw () {
    await this.#initializeSeekRun()

    while (!this.isCancelled()) {
      await Delay.wait(SEEK_CONSTANTS.SEEK_DELAY_MS)
      if (this.isCancelled()) return
      await this.seekStep()
    }
  }

  /**
   * Resets the model to initial state.
   * Clears score, resets map state, and reinitializes UI.
   * Comprehensive reset for starting fresh game.
   *
   * @returns {void}
   */
  resetModel () {
    // @ts-ignore - score.reset is method defined in Score class at runtime
    this.score.reset()
    // @ts-ignore - resetMap is method defined in base Placement class at runtime
    this.resetMap()
    // @ts-ignore - resetUI is method defined below
    this.resetUI(this.ships)
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
   * @param {WeaponSystem|undefined} [weaponSystem] - Optional weapon system to check
   * @returns {boolean} True if missile should fire in single-click mode
   */
  _shouldFireSeekModeMissileImmediately (weaponSystem) {
    // NOTE (regression prevention): In the "Space and Asteroids" terrain,
    // when the overall game mode is pure Seek (bh.seekingMode === true),
    // Missile weapons are intended to be single-click weapons. Historically
    // refactors accidentally re-introduced two-click selection logic for
    // missiles in this combination of terrain+mode. This helper isolates the
    // detection logic so unit tests can lock this behavior and prevent future
    // regressions.

    // Use current weapon system if not provided
    if (weaponSystem === undefined) {
      // @ts-ignore - loadOut.currentWeaponSystem is method at runtime
      if (this.loadOut?.currentWeaponSystem == null) {
        return false
      }
      // @ts-ignore - currentWeaponSystem returns WeaponSystem at runtime
      weaponSystem = this.loadOut.currentWeaponSystem
    }

    // @ts-ignore - seekingMode property available at runtime on bh
    if (!bh.seekingMode || bh.terrain?.title !== 'Space and Asteroids') {
      return false
    }

    // @ts-ignore - weapon property exists on WeaponSystem at runtime
    const weapon = /** @type {Weapon|undefined} */ (weaponSystem?.weapon)
    if (!weapon) {
      return false
    }

    return (
      weapon.letter === 'M' ||
      weapon.name === 'Missile' ||
      weapon.tag === 'missile'
    )
  }

  /**
   * Fires the current weapon immediately at the specified coordinates.
   * Used for single-click weapons in seek mode (e.g., missiles in Space & Asteroids).
   * Updates opponent board and UI after firing.
   *
   * @private
   * @param {number} r - Target row coordinate
   * @param {number} c - Target column coordinate
   * @returns {Promise<void>}
   */
  async _fireCurrentWeaponImmediately (r, c) {
    // @ts-ignore - setWeaponFireHandlers is method defined in base Waters class at runtime
    this.setWeaponFireHandlers()
    // @ts-ignore - loadOut.currentWeaponSystem is method at runtime
    const weaponSystem =
      this.loadOut?.currentWeaponSystem == null
        ? undefined
        : this.loadOut.currentWeaponSystem
    // @ts-ignore - fireWeaponAt is method defined in base Waters class at runtime
    const result = await this.fireWeaponAt(r, c, weaponSystem)
    // @ts-ignore - result.score exists on WeaponLaunchResult at runtime
    if (result?.score) {
      // @ts-ignore - opponent is Waters|null at runtime
      this.opponent.updateResultsOfBomb(result.weapon, result.score)
    }
    // @ts-ignore - opponent is Waters|null at runtime
    this.opponent?.updateUI()
    // @ts-ignore - updateUI is method inherited from Waters base class at runtime
    this.updateUI(this.ships)
    // @ts-ignore - steps.endTurn is method defined in Steps class at runtime
    this.steps.endTurn()
  }

  /**
   * Handles the first click in hide/seek mode: selects a random weapon, ship, and hint location.
   * Stores the initial click coordinate for use in second click.
   *
   * @private
   * @returns {void}
   */
  _onFirstClickSelection () {
    // @ts-ignore - randomAttachedWeapon is method defined in base Waters class at runtime
    this.randomAttachedWeapon(this.opponent)
    gameStatus.addToQueue('Click again to fire', true)
  }

  /**
   * Handles the second click in hide/seek mode: fires the selected weapon at the target.
   * Clears the selected cell coordinates and updates opponent UI after firing.
   *
   * @private
   * @param {number} r - Target row coordinate
   * @param {number} c - Target column coordinate
   * @returns {Promise<void>}
   */
  async _onSecondClickFire (r, c) {
    this.selectedCellCoordinates = null
    // @ts-ignore - loadOut.selectedWeapon is WeaponSystem available at runtime
    const result = await this.fireWeaponAt(r, c, this.loadOut.selectedWeapon)
    // @ts-ignore - result.score exists on WeaponLaunchResult at runtime
    if (result?.score) {
      // @ts-ignore - opponent is Waters|null at runtime
      this.opponent.updateResultsOfBomb(result.weapon, result.score)
    }
    // @ts-ignore - opponent is Waters|null at runtime
    this.opponent?.updateUI()
    // @ts-ignore - updateUI is method inherited from Waters base class at runtime
    this.updateUI(this.ships)
    // @ts-ignore - steps.endTurn is method defined in Steps class at runtime
    this.steps.endTurn()
  }

  /**
   * Handles cell click for friendly board weapon selection in Hide & Seek mode.
   *
   * This method is registered as the click handler for the friendly board.
   * When a player clicks a cell in Hide & Seek mode with attached weapons enabled,
   * it triggers weapon selection for that cell location.
   *
   * Behavior by mode:
   * - Pure Seek with Space/Asteroids terrain: Missile fires immediately (single-click)
   * - Other attached weapon modes: Two-click behavior (first click selects, second fires)
   * - Seek mode without attached weapons: Returns early, no action
   *
   * Validation:
   * - Only processes clicks if in seeking mode (hide & seek)
   * - Only processes clicks if terrain has attached weapons feature enabled
   * - Returns early if conditions not met (prevents errors in other modes)
   *
   * @param {number} r - Row coordinate of clicked cell
   * @param {number} c - Column coordinate of clicked cell
   * @returns {Promise<void>}
   */
  async onClickCell (r, c) {
    // In pure Seek mode with Space/Asteroids, Missiles are single-click weapons
    // that should fire immediately. Check this BEFORE the attached weapons guard.
    // IMPORTANT: Call without argument to allow method's default parameter to execute.
    // If we pass currentWeaponSystem directly, passing undefined would override the default.
    if (
      typeof this._shouldFireSeekModeMissileImmediately === 'function' &&
      this._shouldFireSeekModeMissileImmediately()
    ) {
      await this._fireCurrentWeaponImmediately(r, c)
      return
    }

    // Only allow weapon selection in hide/seek mode with attached weapons
    // @ts-ignore - seekingMode property available at runtime on bh
    if (!bh.seekingMode || !bh.terrain.hasAttachedWeapons) {
      return
    }

    // Implement two-click behavior for other attached weapons
    if (this.selectedCellCoordinates === null) {
      // First click: select weapon and ship
      this._onFirstClickSelection()
      this.selectedCellCoordinates = { r, c }
      return
    }
    // Second click: fire at target
    await this._onSecondClickFire(r, c)
  }

  /**
   * Builds and initializes the friendly player's board UI.
   *
   * This method sets up the interactive friendly board by:
   * 1. Building the board grid with click handlers (onClickCell for weapon selection)
   * 2. Resetting ship cell styling/state
   * 3. Making the board droppable for ship placement/dragging
   * 4. Setting up drag and drop event handlers
   * 5. Marking weapon cells with the 'weapon' class for hide & seek mode
   *
   * The click handler (onClickCell) is bound to this Friend instance so it can
   * access weapon selection methods and UI state during gameplay.
   *
   * Called during game initialization and board reset operations.
   *
   * @returns {void}
   */
  buildBoard () {
    // Register the onClickCell handler with 'this' context for method access
    // @ts-ignore - UI.buildBoard is method defined in Board class at runtime
    this.UI.buildBoard(this.onClickCell, this)
    // @ts-ignore - resetShipCells is method defined in base Placement class at runtime
    this.resetShipCells()
    // @ts-ignore - UI.grid.makeDroppable is method defined in Board class at runtime
    this.UI.grid.makeDroppable(this)
    setupDragHandlers(this.UI)
    // Mark cells with weapons on friendly board for visual indication
    // @ts-ignore - UI..grid.markFleetWeapons is method defined in Board class at runtime
    this.UI.grid.markFleetWeapons(this.ships)
  }

  /**
   * Resets the UI and places ships.
   * Comprehensive board initialization including ship placement and weapon UI.
   * Rebuilds board, trays, and updates display with ship information.
   *
   * @param {Object[]} [ships] - The ships to place. Uses this.ships if not provided.
   * @returns {void}
   */
  resetUI (ships) {
    this.boardDestroyed = false
    // @ts-ignore - this.UI.board is HTMLElement at runtime with classList property
    this.UI.board?.classList?.remove('destroyed')
    // @ts-ignore - score.reset is method defined in Score class at runtime
    this.score.reset()
    ships = ships || this.ships
    // @ts-ignore - UI.reset is method defined in Board class at runtime
    this.UI.reset(ships)
    this.buildBoard()
    // @ts-ignore - UI.buildTrays is method defined in Board class at runtime
    this.UI.buildTrays(ships, this.shipCellGrid)
    // @ts-ignore - updateUI is method inherited from Waters base class at runtime
    this.updateUI(ships)
  }
}
