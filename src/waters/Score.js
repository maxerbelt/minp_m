import { bh } from '../terrains/all/js/bh.js'

/**
 * @typedef {Object} MaskInterface
 * Mask object interface for tracking set/clear cells on game board
 * @property {(x: number, y: number) => boolean} test - Tests if a cell at (x, y) is set in the mask
 * @property {(x: number, y: number) => void} set - Sets a cell at (x, y) in the mask
 * @property {(x: number, y: number) => void} clear - Clears a cell at (x, y) from the mask
 * @property {number} occupancy - Count of set cells in the mask
 * @property {number} size - Count of set cells in the mask (alias for occupancy)
 */

/**
 * Manages turn-based scoring and tracking for the game board.
 *
 * This class maintains counters and masks for game state tracking including:
 * - Turn and double-tap counts
 * - Shot history and location tracking
 * - Revealed cell tracking
 * - Hint and wake effect tracking
 * - Automatic miss detection
 *
 * All coordinates use (row, col) notation where r is the row (y) and c is the column (x).
 * The internal mask storage uses (x, y) ordering, so coordinates are swapped when passed to masks.
 *
 * @class Score
 * @classdesc Tracks all game actions and maintains coordinate-based masks for gameplay state
 */
export class Score {
  /**
   * Initializes a new Score instance with blank masks and zero counters.
   * All masks are initialized to bh.map.blankMask, counters to 0.
   * @constructor
   */
  /**
   * Number of turns taken.
   * @type {number}
   */
  turns = 0

  /**
   * Number of double-taps performed.
   * @type {number}
   */
  dtaps = 0

  /**
   * Mask tracking all shots taken on the board.
   * @type {MaskInterface}
   */
  // @ts-ignore - bh.map is initialized at runtime, blankMask is MaskInterface
  shot = bh.map.blankMask

  /**
   * Mask tracking cells that have been revealed (hit or miss).
   * @type {MaskInterface}
   */
  // @ts-ignore - bh.map is initialized at runtime, blankMask is MaskInterface
  reveal = bh.map.blankMask

  /**
   * Mask tracking cells that have been hinted.
   * @type {MaskInterface}
   */
  // @ts-ignore - bh.map is initialized at runtime, blankMask is MaskInterface
  hint = bh.map.blankMask

  /**
   * Mask tracking cells with wake effects from ship movement.
   * @type {MaskInterface}
   */
  // @ts-ignore - bh.map is initialized at runtime, blankMask is MaskInterface
  wake = bh.map.blankMask

  /**
   * Mask tracking automatic misses (shots that don't count).
   * @type {MaskInterface}
   */
  // @ts-ignore - bh.map is initialized at runtime, blankMask is MaskInterface
  auto = bh.map.blankMask

  /**
   * Resets all scoring masks and counters to initial state.
   * Clears all tracking data and reinitializes all masks to blank state.
   * This method should be called when starting a new game or round.
   *
   * @returns {void}
   */
  reset () {
    this.turns = 0
    this.dtaps = 0
    // @ts-ignore - bh.map is initialized at runtime
    this.shot = bh.map.blankMask
    // @ts-ignore - bh.map is initialized at runtime
    this.reveal = bh.map.blankMask
    // @ts-ignore - bh.map is initialized at runtime
    this.hint = bh.map.blankMask
    // @ts-ignore - bh.map is initialized at runtime
    this.wake = bh.map.blankMask
    // @ts-ignore - bh.map is initialized at runtime
    this.auto = bh.map.blankMask
  }

  /**
   * Increments the turn counter by one.
   * Called at the end of each player turn to track game progression.
   *
   * @public
   * @returns {void}
   */
  finishTurn () {
    this.turns++
  }

  /**
   * Gets the count of automatic misses from the auto mask.
   * Automatic misses are shots that don't count toward the player's shot count.
   *
   * @public
   * @returns {number} The occupancy count of automatic misses
   */
  get autoMisses () {
    return this.auto.occupancy
  }

  /**
   * Checks if a coordinate has not been shot yet.
   * Returns true if the location is available for a new shot, null if already shot.
   *
   * @public
   * @param {number} y - Row coordinate (0-based index)
   * @param {number} x - Column coordinate (0-based index)
   * @returns {true|null} True if location is unshot, null if already shot
   */
  newShotKey (y, x) {
    if (this.shot.test(x, y)) return null
    return true
  }
  /**
   * Checks if a coordinate has not been shot yet.
   * Returns true if the location is available for a new shot.
   *
   * @public
   * @param {number} x - Column coordinate (0-based index)
   * @param {number} y - Row coordinate (0-based index)
   * @returns {boolean} True if location is unshot
   */
  isNewShot (x, y) {
    return !this.shot.test(x, y)
  }
  /**
   * Checks if a coordinate has already been shot.
   * Returns true if the location has been previously shot.
   *
   * @public
   * @param {number} x - Column coordinate (0-based index)
   * @param {number} y - Row coordinate (0-based index)
   * @returns {boolean} True if location is already shot
   */
  isOldShot (x, y) {
    return this.shot.test(x, y)
  }
  /**
   * Moves a shot from shot mask to reveal mask.
   * Removes the location from active shots and marks it as temporarily revealed.
   * Used during shot animation/reveal phase before finalizing.
   *
   * @public
   * @param {number} x - Column coordinate (0-based index)
   * @param {number} y - Row coordinate (0-based index)
   * @returns {void}
   */
  shotReveal (x, y) {
    this.shot.clear(x, y)
    this.reveal.set(x, y)
  }

  /**
   * Finalizes a revealed shot by moving it from reveal mask back to shot mask.
   * Only processes locations that are currently in the reveal mask.
   * Called after shot animation completes to persist the shot.
   *
   * @public
   * @param {number} x - Column coordinate (0-based index)
   * @param {number} y - Row coordinate (0-based index)
   * @returns {void}
   */
  shotRevealFinalize (x, y) {
    if (!this.reveal.test(x, y)) return
    this.shot.set(x, y)
    this.reveal.clear(x, y)
  }

  /**
   * Marks a cell as hinted in the hint mask.
   * Records that the player has used a hint on this location.
   * Internal storage swaps coordinates from (r, c) to (c, r) for mask operations.
   *
   * @public
   * @param {number} r - Row coordinate (0-based index)
   * @param {number} c - Column coordinate (0-based index)
   * @returns {void}
   */
  hintReveal (r, c) {
    this.hint.set(c, r)
  }

  /**
   * Marks a cell with a wake effect in the wake mask.
   * Wake effects show ship movement paths and disturbances.
   * Records cells affected by ship wake for visual display.
   *
   * @public
   * @param {number} x - Column coordinate (0-based index)
   * @param {number} y - Row coordinate (0-based index)
   * @returns {void}
   */
  wakeReveal (x, y) {
    this.wake.set(x, y)
  }

  /**
   * Creates a new shot key at coordinates if not already present.
   * Registers a shot at the location only if it hasn't been shot before.
   * Returns true on successful creation, null if location already has a shot.
   *
   * @public
   * @param {number} y - Row coordinate (0-based index)
   * @param {number} x - Column coordinate (0-based index)
   * @returns {true|null} True if shot key was created, null if location already shot
   */
  createShotKey (y, x) {
    const isNew = this.isNewShot(x, y)
    if (isNew) {
      this.shot.set(x, y)
      return true
    }
    return null
  }

  /**
   * Gets a count array of all tracked metrics.
   * Provides a snapshot of current game state counters for display or scoring.
   * Array contains: [turns, double-taps, shots, reveals, hints].
   *
   * @public
   * @returns {number[]} Array containing counts of [turns, dtaps, noOfShots, reveal.occupancy, hint.occupancy]
   */
  counts () {
    return [
      this.turns,
      this.dtaps,
      this.noOfShots(),
      this.reveal.occupancy,
      this.hint.occupancy
    ]
  }

  /**
   * Calculates the number of shots excluding automatic misses.
   * Returns the occupancy of shot mask minus automatic misses, with minimum of 0.
   * Provides accurate shot count for scoring purposes.
   *
   * @public
   * @returns {number} Number of manual shots taken (automatic misses excluded)
   */
  noOfShots () {
    return Math.max(0, this.shot.occupancy - this.autoMisses)
  }

  /**
   * Registers an automatic miss at the given coordinates.
   * Creates a shot key and marks the location as an automatic miss.
   * Automatic misses are excluded from player's shot count.
   * Returns null if the location was already shot.
   *
   * @public
   * @param {number} x - Column coordinate (0-based index)
   * @param {number} y - Row coordinate (0-based index)
   * @returns {true|null} True if automatic miss registered, null if location already shot
   */
  addAutoMiss (x, y) {
    const isOld = this.isOldShot(x, y)
    if (isOld) return null
    this.auto.set(x, y)
    this.shot.set(x, y)
    return true
  }
}
