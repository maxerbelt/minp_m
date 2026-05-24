import { bh } from '../terrains/all/js/bh.js'

/**
 * @typedef {Object} MaskInterface
 * @property {Function} test - Tests if a cell at (x, y) is set in the mask
 * @property {Function} set - Sets a cell at (x, y) in the mask
 * @property {Function} clear - Clears a cell at (x, y) from the mask
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
  shot = bh.map.blankMask

  /**
   * Mask tracking cells that have been revealed (hit or miss).
   * @type {MaskInterface}
   */
  reveal = bh.map.blankMask

  /**
   * Mask tracking cells that have been hinted.
   * @type {MaskInterface}
   */
  hint = bh.map.blankMask

  /**
   * Mask tracking cells with wake effects from ship movement.
   * @type {MaskInterface}
   */
  wake = bh.map.blankMask

  /**
   * Mask tracking automatic misses (shots that don't count).
   * @type {MaskInterface}
   */
  auto = bh.map.blankMask

  /**
   * Resets all scoring masks and counters to initial state.
   * Clears all tracking data and reinitializes all masks to blank state.
   * This method should be called when starting a new game or round.
   *
   * @public
   * @instance
   * @returns {void}
   */
  reset () {
    this.turns = 0
    this.dtaps = 0
    this.shot = bh.map.blankMask
    this.reveal = bh.map.blankMask
    this.hint = bh.map.blankMask
    this.wake = bh.map.blankMask
    this.auto = bh.map.blankMask
  }

  /**
   * Increments the turn counter by one.
   * Called at the end of each player turn to track game progression.
   *
   * @public
   * @instance
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
   * @instance
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
   * @instance
   * @param {number} r - Row coordinate (0-based index)
   * @param {number} c - Column coordinate (0-based index)
   * @returns {boolean|null} True if location is unshot, null if already shot
   */
  newShotKey (r, c) {
    if (this.shot.test(c, r)) return null
    return true
  }

  /**
   * Moves a shot from shot mask to reveal mask.
   * Removes the location from active shots and marks it as temporarily revealed.
   * Used during shot animation/reveal phase before finalizing.
   *
   * @public
   * @instance
   * @param {number} r - Row coordinate (0-based index)
   * @param {number} c - Column coordinate (0-based index)
   * @returns {void}
   */
  shotReveal (r, c) {
    this.shot.clear(c, r)
    this.reveal.set(c, r)
  }

  /**
   * Finalizes a revealed shot by moving it from reveal mask back to shot mask.
   * Only processes locations that are currently in the reveal mask.
   * Called after shot animation completes to persist the shot.
   *
   * @public
   * @instance
   * @param {number} r - Row coordinate (0-based index)
   * @param {number} c - Column coordinate (0-based index)
   * @returns {void}
   */
  shotRevealFinalize (r, c) {
    if (!this.reveal.test(c, r)) return
    this.shot.set(c, r)
    this.reveal.clear(c, r)
  }

  /**
   * Finalizes a revealed shot using (x, y) coordinates.
   * Variant of shotRevealFinalize using x, y parameter order (column, row).
   * Used when coordinates are already in x, y format to avoid swapping.
   *
   * @public
   * @instance
   * @param {number} x - X coordinate / column (0-based index)
   * @param {number} y - Y coordinate / row (0-based index)
   * @returns {void}
   */
  shotRevealFinalizeXY (x, y) {
    if (!this.reveal.test(y, x)) return
    this.shot.set(y, x)
    this.reveal.clear(y, x)
  }

  /**
   * Marks a cell as hinted in the hint mask.
   * Records that the player has used a hint on this location.
   *
   * @public
   * @instance
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
   * @instance
   * @param {number} r - Row coordinate (0-based index)
   * @param {number} c - Column coordinate (0-based index)
   * @returns {void}
   */
  wakeReveal (r, c) {
    this.wake.set(c, r)
  }

  /**
   * Creates a new shot key at coordinates if not already present.
   * Registers a shot at the location only if it hasn't been shot before.
   * Returns true on successful creation, null if location already has a shot.
   *
   * @public
   * @instance
   * @param {number} r - Row coordinate (0-based index)
   * @param {number} c - Column coordinate (0-based index)
   * @returns {boolean|null} True if shot key was created, null if location already shot
   */
  createShotKey (r, c) {
    const isCreated = this.newShotKey(r, c)
    if (isCreated) {
      this.shot.set(c, r)
      return true
    }
    return null
  }

  /**
   * Gets a count array of all tracked metrics.
   * Provides a snapshot of current game state counters for display or scoring.
   * Array contains: [turns, double-taps, shots, reveals, hints]
   *
   * @public
   * @instance
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
   * @instance
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
   * @instance
   * @param {number} r - Row coordinate (0-based index)
   * @param {number} c - Column coordinate (0-based index)
   * @returns {boolean|null} True if automatic miss registered, null if location already shot
   */
  addAutoMiss (r, c) {
    const isCreated = this.createShotKey(r, c)
    if (!isCreated) return null
    this.auto.set(c, r)
    return true
  }
}
