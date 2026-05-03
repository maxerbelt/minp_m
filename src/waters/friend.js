import { bh } from '../terrains/all/js/bh.js'
import { Random } from '../core/Random.js'
import { gameStatus } from './StatusUI.js'
import { setupDragHandlers } from '../selection/dragndrop.js'
import { Waters } from './Waters.js'
import { Player } from './steps.js'
import { LoadOut } from './LoadOut.js'
import { Delay } from '../core/Delay.js'

/**
 * @typedef {[number, number]} GridCoordinate
 */

/**
 * @typedef {Object} WeaponLaunchResult
 * @property {boolean} [hasTargettedWeapon]
 * @property {Object} [weapon]
 * @property {Object} [score]
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
const SEEK_CONSTANTS = {
  IMPACT_MIN: 2,
  IMPACT_START: 9,
  BOMB_ATTEMPTS: 12,
  SEEK_MAX_ATTEMPTS: 13,
  SEEK_DELAY_MS: 420
}

/**
 * Friendly player AI that extends Waters with autonomous seeking and targeting.
 * Provides test mode automation and friendly AI for validation scenarios.
 * Implements multi-strategy shot selection with preference for damaged ships.
 *
 * @class Friend
 * @extends Waters
 */
export class Friend extends Waters {
  /**
   * Creates a Friend AI player instance.
   * @param {Object} friendUI - The friend player UI instance
   */
  constructor (friendUI) {
    super(friendUI)
    /** @type {boolean} Controls test continuation */
    this.testContinue = true
    /** @type {boolean} Marks this as friendly player */
    this.friendlyWaters = true
    /** @type {Object} Untried location mask for seeking */
    this.untried = null
    this.steps.player = Player.friend
    this.steps.onEndTurn = this.onEndTurn.bind(this)
    this.steps.onHint = this._handleHint.bind(this)
  }

  /**
   * Gets the current game map.
   * @returns {Object} The active map
   */
  get map () {
    return bh.map
  }

  /**
   * Gets the empty result tuple for no-op weapon fire.
   * @returns {Object} Empty result object with single shot weapon
   */
  get noResult () {
    return { weapon: this.loadOut.getSingleShot(), score: LoadOut.noResult }
  }

  /**
   * Handles end of turn event.
   * Finishes opponent turn and triggers opponent begin turn if game not over.
   *
   * @private
   */
  onEndTurn () {
    if (this?.opponent == null) {
      return
    }
    if (!this.opponent.boardDestroyed) {
      this.opponent._handleBeginTurn()
    }
  }

  /**
   * Checks if test mode should continue.
   * @returns {boolean} True if test should continue
   */
  isCancelled () {
    return !this.testContinue
  }

  // ============ Location Selection ============

  /**
   * Selects a random hit coordinate from candidates.
   * Returns null if empty, first element if only one, random element otherwise.
   *
   * @param {Array<Array<number>>} hitCoordinates - Candidate [row, col] coordinates
   * @returns {Array<number>|null} Random [row, col] or null if empty
   * @private
   */
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
   * @param {Object} map - Map with rows and cols properties
   * @returns {Object} Location object with r (row) and c (col)
   * @private
   */
  randomLocation (map) {
    const r = Math.floor(Math.random() * (map.rows - 2)) + 1
    const c = Math.floor(Math.random() * (map.cols - 2)) + 1
    return { r, c }
  }

  /**
   * Synchronizes untried locations with current shot locations.
   * Removes all shot cells from untried set to track remaining candidates.
   *
   * @private
   */
  syncUntried () {
    this.untried = this.untried.take(this.score.shot)
  }

  /**
   * Gets a random untried coordinate from the map mask.
   * Returns null when no untried coordinates remain.
   *
   * @returns {GridCoordinate|null} Random [col, row] coordinate or null
   * @private
   */
  getRandomUntriedCoordinate () {
    this.syncUntried()
    const locs = this.untried.toCoords
    return locs.length === 0 ? null : Random.element(locs)
  }

  /**
   * Gets the most frequently tried row from untried locations.
   * Used for line-based targeting strategy.
   * Returns ['0', 0] if no locations remain.
   *
   * @returns {Array} [rowNumber, frequency] or ['0', 0] if empty
   * @private
   */
  randomLine () {
    this.syncUntried()
    const locs = this.untried.toCoords
    if (locs.length === 0) {
      console.warn('no more locations to choose from')
      return ['0', 0]
    }
    const tally = locs.reduce((acc, [, y]) => {
      acc[y] = 1 + (acc[y] || 0)
      return acc
    }, {})
    const unordered = Random.shuffleArray([...Object.entries(tally)])
    const ordered = unordered.toSorted((a, b) => b[1] - a[1])

    return ordered[0]
  }

  /**
   * Gets the row number for the most tried line.
   * @returns {number} Row number (0 if no lines remain)
   * @private
   */
  randomRowNum () {
    const r = this.randomLine()
    return Number.parseInt(r?.[0] || '0')
  }

  // ============ Destruction & Effects ============

  // ============ Random Actions ============

  /**
   * Launches weapon from source coordinates to target coordinates.
   * Displays trajectory and handles UI updates for both players.
   *
   * @param {Object} coords - Target cell object
   * @param {number} rr - Source row coordinate
   * @param {number} cc - Source column coordinate
   * @param {Object} currentWeapon - Weapon system rack with weapon property
   * @returns {Promise<Object>} Result of weapon launch
   * @private
   */
  async launchTo (coords, rr, cc, currentWeapon) {
    return await currentWeapon.weapon.cursorLaunchTo(
      coords,
      rr,
      cc,
      this.map,
      this.UI,
      this.opponent?.UI
    )
  }

  /**
   * Launches randomly selected weapon at specified location.
   * Returns true if weapon was successfully launched (no result).
   *
   * @param {number} r - Target row coordinate
   * @param {number} c - Target column coordinate
   * @returns {Promise<WeaponLaunchResult>} Result with weapon and score
   */
  async launchCurrentWeapon (r, c) {
    const wps = this.currentWeaponSystem
    const launch = async coords => {
      return await this.launchTo(coords, bh.map.rows - 1, 0, wps)
    }
    return await this.loadOut.aimWeapon(this.map, r, c, wps, launch)
  }

  /**
   * Attempts weapon launch and falls back to a secondary aim coordinate.
   * @param {number} r - Initial target row coordinate.
   * @param {number} c - Initial target column coordinate.
   * @param {number} [fallbackR=r] - Fallback row coordinate.
   * @param {number} [fallbackC=c] - Fallback column coordinate.
   * @returns {Promise<WeaponLaunchResult>} Launch result.
   * @private
   */
  async _attemptLaunchWithFallback (r, c, fallbackR = r, fallbackC = c) {
    const result = await this.launchCurrentWeapon(r, c)
    if (result?.score && result.score !== LoadOut.noResult) {
      return result
    }
    const wps = this.currentWeaponSystem
    const launch = async coords => {
      return await this.launchTo(coords, bh.map.rows - 1, 0, wps)
    }
    return await this.loadOut.aimWeapon(
      this.map,
      fallbackR,
      fallbackC,
      wps,
      launch
    )
  }

  /**
   * Searches for bomb targets with decreasing impact requirement.
   * Attempts multiple bomb launches at random untried locations.
   * Returns result of first successful hit or no result after all attempts.
   *
   * @returns {Promise<WeaponLaunchResult>} Result with weapon and score, or noResult
   * @private
   */
  async randomBomb () {
    for (
      let impact = SEEK_CONSTANTS.IMPACT_START;
      impact > SEEK_CONSTANTS.IMPACT_MIN;
      impact--
    ) {
      for (let attempt = 0; attempt < SEEK_CONSTANTS.BOMB_ATTEMPTS; attempt++) {
        if (this.isCancelled()) return this.noResult
        const { r, c } = this.randomLocation(this.map)
        if (this.score.newShotKey(r, c)) {
          return await this._attemptLaunchWithFallback(r, c)
        }
      }
    }
    return LoadOut.noResult
  }

  /**
   * Launches single destroy-type weapon across highest frequency row.
   * Uses most-attempted row for targeting line sweep.
   *
   * @returns {Promise<null|{ weapon: Object, score: Object}|{ weapon: Object, score: Object, hasTargettedWeapon: boolean }>}  Result with weapon and score
   * @private
   */
  async randomDestroyOne () {
    if (this.isCancelled()) return this.noResult
    const r = this.randomRowNum()
    return await this._attemptLaunchWithFallback(r, 0, r, this.map.cols - 1)
  }

  /**
   * Validates if location is valid target for seeking.
   * Must be in bounds and not already double-tapped.
   *
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {boolean} True if valid target location
   * @private
   */
  isHitValid (r, c) {
    return this.map.inBounds(r, c) && !this.isDTap(r, c, 4, false, false)
  }

  /**
   * Seeks single ship target with single shot weapons.
   * Attempts to find and fire at valid untried locations.
   * Stops game if unable to find valid locations after max attempts.
   *
   * @returns {Promise<null|{ weapon: any; score: any; }>} Null on success, noResult on failure
   * @private
   */
  async randomSeek () {
    for (
      let attempt = 0;
      attempt < SEEK_CONSTANTS.SEEK_MAX_ATTEMPTS;
      attempt++
    ) {
      if (this.isCancelled()) return this.noResult
      const loc = this.getRandomUntriedCoordinate()

      if (!loc) {
        this.UI.showNotice('something went wrong!')
        this.boardDestroyed = true
        this.testContinue = false
        return LoadOut.noResult
      }
      if (this.isHitValid(loc[1], loc[0])) {
        return await this.launchSingleShot(loc[1], loc[0])
      }
    }
    return null
  }

  /**
   * Performs area scan with two random locations.
   * Reveals hidden areas without destroying.
   * Sets up reveal handler before launching scan weapon.
   *
   * @returns {Promise<Object>} Result with scan weapon and score
   * @private
   */
  async randomScan () {
    this.loadOut.onReveal = this.scan.bind(this)
    if (this.isCancelled()) return this.noResult
    const { r, c } = this.randomLocation(this.map)
    const { r: r1, c: c1 } = this.randomLocation(this.map)
    const wps = this.currentWeaponSystem
    const weapon = wps.weapon
    await this.loadOut.aimWeapon(this.map, r, c)
    const score = await this.loadOut.aimWeapon(this.map, r1, c1, wps)
    return { weapon, score }
  }

  /**
   * Handles scan effect - reveals cells in effect area.
   * Callback for loadOut onReveal handler.
   *
   * @param {Object} weapon - The scan weapon
   * @param {Array<Array<number>>} effect - [row, col, power] cells to reveal
   * @private
   */
  scan (weapon, effect) {
    this.updateUI()
    for (const position of effect) {
      const [r, c] = position
      if (this.map.inBounds(r, c)) {
        // reveal what is in this position
      }
    }
  }

  // ============ Effect Dispatch ============

  /**
   * Dispatches weapon effect to appropriate handler method.
   * Routes effect types to specialized targeting strategies.
   *
   * @param {string} effect - Effect type: 'DestroyOne' | 'Bomb' | 'Scan' | 'Seek'
   * @returns {Promise<Object>} Result from effect handler or noResult
   * @private
   */
  async randomEffect (effect) {
    const effectHandlers = {
      DestroyOne: () => this.randomDestroyOne(),
      Bomb: () => this.randomBomb(),
      Scan: () => this.randomScan(),
      Seek: () => this.randomSeek()
    }
    const handler = effectHandlers[effect]
    return handler ? await handler() : this.noResult
  }

  // ============ Shot Selection ============

  /**
   * Attempts to execute finish action if mask has occupied cells.
   * Generic helper for attempting location-based finish strategies.
   *
   * @param {Object} mask - Bitmask with occupancy property
   * @param {Function} finishAction - Callback(mask) to execute if occupied
   * @returns {Promise<null|{ weapon: Object; score: Object; }>}
   * @private
   */
  async tryFinishCondition (mask, finishAction) {
    if (mask?.occupancy > 0) {
      return await finishAction(mask)
    }
    return null
  }

  /**
   * Executes prioritized finish strategies until one returns a result.
   * @param {Array<Function>} strategies - Array of asynchronous strategy functions.
   * @returns {Promise<WeaponLaunchResult|null>} Strategy result or null
   * @private
   */
  async _executeFinishStrategies (strategies) {
    for (const strategy of strategies) {
      const result = await strategy()
      if (result) return result
    }
    return null
  }

  /**
   * Attempts to fire at revealed but not yet attacked cells.
   * Prioritizes previously revealed locations for follow-up shots.
   *
   * @returns {Promise<null|{ weapon: Object; score: Object; }>}
   * @private
   */
  async finishRevealed () {
    if (this.score.reveal.occupancy === 0) return null
    this.score.reveal = this.score.reveal.take(this.score.shot)
    return await this.tryFinishCondition(this.score.reveal, mask =>
      this.selectRandomCandidate(mask)
    )
  }

  /**
   * Attempts to finish partially damaged ship.
   * First tries orthogonal cross pattern, then dilates to surrounding cells.
   *
   * @param {Object} hits - Hit locations mask
   * @returns {Promise<null|{ weapon: Object; score: Object; }>} Result from finish strategy or null
   * @private
   */
  async finishPartiallySunk (hits) {
    if (!hits?.occupancy) return null

    const shots = this.score.shot
    const cross = hits.clone.dilateCross()
    const candidates = cross.take(shots)
    console.log('shot', shots.occupancy, shots.toAscii)

    console.log('hits', hits.toAscii)
    console.log('cross', cross.toAscii)

    console.log('candidates', candidates.toAscii)
    const result = await this.tryFinishCondition(candidates, m =>
      this.selectRandomCandidate(m)
    )
    if (result) {
      return result
    }

    const surround = hits.clone.dilate(1).take(shots)
    return await this.tryFinishCondition(surround, m =>
      this.selectRandomCandidate(m)
    )
  }

  /**
   * Attempts to fire at hint-revealed locations.
   * Expands hint area and looks for untried cells within expansion.
   *
   * @returns {Promise<null|{ weapon: Object; score: Object; }>} Result from finish strategy or null
   * @private
   */
  async finishHints () {
    const numHints = this.score?.hint?.occupancy || 0
    if (numHints > 0) {
      const surroundHints = this.score.hint.clone
        .dilate(1)
        .take(this.score.shot)
      return await this.tryFinishCondition(surroundHints, m =>
        this.selectRandomCandidate(m)
      )
    }
    return null
  }

  /**
   * Selects random cell from candidate mask and launches single shot.
   * Switches to single shot weapon before firing.
   *
   * @param {Object} candidate - Bitmask with randomOccupied property
   * @returns {Promise<{ weapon: Object; score: Object; }>}
   * @private
   */
  async selectRandomCandidate (candidate) {
    this.loadOut.switchToSingleShot()
    const [c, r] = candidate.randomOccupied
    return await this.launchSingleShot(r, c, false)
  }

  /**
   * Selects next shot strategy based on current board state.
   * Priority: Revealed cells > Partially sunk ships > Hint areas > Effect weapon > Seek.
   *
   * @param {Object} hits - Current hit locations on board
   * @returns {Promise<null|{ weapon: Object; score: Object; }>} Result from selected shot strategy
   * @private
   */
  async selectShot (hits) {
    const finishMethods = [
      () => this.finishRevealed(),
      () => this.finishPartiallySunk(hits),
      () => this.finishHints()
    ]

    const strategyResult = await this._executeFinishStrategies(finishMethods)
    if (strategyResult) return strategyResult

    const op = this.loadOut.switchToPreferredWeapon()
    if (op) {
      return await this.randomEffect(op)
    }

    this.loadOut.switchToSingleShot()
    return await this.randomSeek()
  }

  // ============ Board Management ============

  /**
   * Restarts game board for new round.
   * Clears visuals, resets ship display, and re-arms weapons.
   *
   * @param {boolean} [friendlyMode=false] - Also clear friendly player visuals if true
   */
  restartBoard (friendlyMode = false) {
    this.resetBase()
    this.UI.clearVisuals()
    if (friendlyMode) {
      this.UI.clearFriendVisuals()
    }
    this.UI.resetShips(this.ships)
    this.armWeapons()
  }

  /**
   * Initializes untried locations mask with full map.
   * Used to track which cells have not yet been shot.
   */
  setupUntried () {
    this.untried = this.map.fullMask
  }

  /**
   * Gets combined hit mask from all unsunk ships.
   * Used to identify areas with damaged but unsunk ships.
   *
   * @returns {Object} Bitmask of all current hits
   */
  getHits () {
    const blankMask = this.map.blankMask
    return this.shipsUnsunk().reduce((acc, ship) => {
      if (!ship.hits?.occupancy) {
        return acc
      }
      console.log('unsunk ship', ship.hits, ship.hits.toAscii)

      console.log('existing hits', acc, acc.toAscii)
      const result = acc.join(ship.hits)
      console.log('combined hits', result, result.toAscii)
      return result
    }, blankMask)
  }

  // ============ Test/Seek Loop ============

  /**
   * Initiates test mode and begins autonomous seeking.
   * Disables controls and starts seek loop.
   */
  test () {
    gameStatus.flush()
    this.UI.testMode()
    this.UI.testBtn.disabled = true
    this.UI.seekBtn.disabled = true
    this.UI.stopBtn.disabled = false

    this.restartBoard()
    this.seek()
  }

  /**
   * Performs single seek step: selects target, fires, and processes results.
   * Updates UI with shot results and ends turn.
   *
   * @returns {Promise<void>}
   */
  async seekStep () {
    const hits = this.getHits()
    this.setWeaponFireHandlers()
    const result = await this.selectShot(hits)
    if (result?.score && result.score !== LoadOut.noResult) {
      this.updateResultsOfBomb(result?.weapon, result.score)
    }
    this.score.finishTurn()
    this.updateUI()
    this.steps.endTurn()
  }

  /**
   * Main seek entry point. Runs autonomous loop and restores UI afterward.
   * Re-enables controls and hides stop button when complete.
   *
   * @returns {Promise<void>}
   */
  async seek () {
    await this.seekRaw()
    this.UI.testBtn.disabled = false
    this.UI.seekBtn.disabled = false
    this.UI.stopBtn.classList.add('hidden')
  }

  /**
   * Autonomous seeking loop for test mode.
   * Continuously selects targets and fires until cancelled or board destroyed.
   * Resets game state and initializes weapons before starting loop.
   *
   * @returns {Promise<void>}
   */
  async seekRaw () {
    this.testContinue = true
    this.boardDestroyed = false
    this.armWeapons()
    this.score.shot = this.map.blankMask
    this.setupUntried()

    while (!this.isCancelled()) {
      await Delay.wait(SEEK_CONSTANTS.SEEK_DELAY_MS)
      if (this.isCancelled()) return
      await this.seekStep()
    }
  }

  // ============ UI & Mode ============

  updateWeaponStatus () {
    /* only needs implementation if enemy */
  }

  updateMode (wps) {
    if (this.isRevealed || this.boardDestroyed) {
      return
    }
  }

  _hideWaiting () {
    /* only needs implementation if enemy */
  }

  deactivateWeapon () {
    /* only needs implementation if enemy */
  }

  resetModel () {
    this.score.reset()
    this.resetMap()
  }

  buildBoard () {
    this.UI.buildBoard()
    this.resetShipCells()
    this.UI.makeDroppable(this)
    setupDragHandlers(this.UI)
  }

  resetUI (ships) {
    this.resetBase()
    ships = ships || this.ships
    this.UI.reset(ships)
    this.buildBoard()
    this.UI.buildTrays(ships, this.shipCellGrid)
    this.updateUI(ships)
  }
}
