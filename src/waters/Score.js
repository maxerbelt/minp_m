import { bh } from '../terrains/all/js/bh.js'

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
 * @class Score
 */
export class Score {
  /**
   * Number of turns taken.
   * @type {number}
   */
  turns

  /**
   * Number of double-taps performed.
   * @type {number}
   */
  dtaps

  /**
   * Mask tracking all shots taken on the board.
   * @type {Object}
   */
  shot

  /**
   * Mask tracking cells that have been revealed (hit or miss).
   * @type {Object}
   */
  reveal

  /**
   * Mask tracking cells that have been hinted.
   * @type {Object}
   */
  hint

  /**
   * Mask tracking cells with wake effects from ship movement.
   * @type {Object}
   */
  wake

  /**
   * Mask tracking automatic misses (shots that don't count).
   * @type {Object}
   */
  auto

  constructor () {
    /**
     * Number of turns taken.
     * @type {number}
     */
    this.turns = 0
    /**
     * Number of double-taps.
     * @type {number}
     */
    this.dtaps = 0
    /**
     * Mask tracking all shots taken.
     * @type {Object}
     */
    this.shot = bh.map.blankMask
    /**
     * Mask tracking revealed cells.
     * @type {Object}
     */
    this.reveal = bh.map.blankMask
    /**
     * Mask tracking hinted cells.
     * @type {Object}
     */
    this.hint = bh.map.blankMask
    /**
     * Mask tracking wake effects.
     * @type {Object}
     */
    this.wake = bh.map.blankMask
    /**
     * Mask tracking automatic misses.
     * @type {Object}
     */
    this.auto = bh.map.blankMask
  }

  /**
   * Resets all scoring masks and counters to initial state.
   * Clears all tracking data and reinitializes to blank masks.
   *
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
   *
   * @returns {void}
   */
  finishTurn () {
    this.turns++
  }

  /**
   * Gets the count of automatic misses from the auto mask.
   *
   * @returns {number} The occupancy count of automatic misses
   */
  get autoMisses () {
    return this.auto.occupancy
  }

  /**
   *
   * @param {number} r - Row coordinate (0-based index)
   * @param {number} c - Column coordinate (0-based index)
   * @returns {boolean|null} True if new shot, null if already shot
   */
  newShotKey (r, c) {
    if (this.shot.test(c, r)) return null
    return true
  }

  /**
   * Clears the location from the shot mask and marks it in the reveal mask.
   *
   * @param {number} r - Row coordinate (0-based index)
   * @param {number} c - Column coordinate (0-based index)
   * @returns {void}
   * @param {number} c - Column coordinate
   */
  shotReveal (r, c) {
    this.shot.clear(c, r)
    this.reveal.set(c, r)
  }
  /**
   * Finalizes a revealed shot using (x, y) coordinates.
   * Variant of shotRevealFinalize using x, y parameter order.
   *
   * @param {number} x - X coordinate (0-based index)
   * @param {number} y - Y coordinate (0-based index)
   * @returns {void}
   */
  shotRevealFinalize (r, c) {
    if (!this.reveal.test(c, r)) return
    this.shot.set(c, r)
    this.reveal.clear(c, r)
  }
  shotRevealFinalizeXY (x, y) {
    if (!this.reveal.test(y, x)) return
    this.shot.set(y, x)
    this.reveal.clear(y, x)
  }
  /** 
   * Wake effects show weapon movement paths.
   *
   * @param {number} r - Row coordinate (0-based index)
   * @param {number} c - Column coordinate (0-based index)
   * @returns {void} 
   */
  hintReveal (r, c) {
    this.hint.set(c, r)
  }

  /**
   * Marks a cell with wake effect.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   */
  wakeReveal (r, c) {
    this.wake.set(c, r)
  }

  /**
   * Creates a new shot key at coordinates if not already present.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {boolean|null} True if created, null if already exists
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
   * @returns {number[]} [turns, dtaps, shots, reveals, hints]
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
   * @returns {number} Number of manual shots taken
   */
  noOfShots () {
    return Math.max(0, this.shot.occupancy - this.autoMisses)
  }

  /**
   * Registers an automatic miss at the given coordinates.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {boolean|null} True if registered, null if already shot there
   */
  addAutoMiss (r, c) {
    const isCreated = this.createShotKey(r, c)
    if (!isCreated) return null
    this.auto.set(c, r)
    return true
  }
}
