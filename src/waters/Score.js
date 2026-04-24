import { bh } from '../terrains/all/js/bh.js'

/**
 * Manages turn-based scoring and tracking for the game board.
 */
export class Score {
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
   * Increments the turn counter.
   */
  finishTurn () {
    this.turns++
  }

  /**
   * Gets the count of automatic misses from the auto mask.
   * @returns {number} Number of automatic misses
   */
  get autoMisses () {
    return this.auto.occupancy
  }

  /**
   * Checks if a coordinate has not been shot yet.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {boolean|null} True if new shot, null if already shot
   */
  newShotKey (r, c) {
    if (this.shot.test(c, r)) return null
    return true
  }

  /**
   * Moves a shot from shot mask to reveal mask.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   */
  shotReveal (r, c) {
    this.shot.clear(c, r)
    this.reveal.set(c, r)
  }

  /**
   * Marks a cell as hinted.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
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
