// Simple Zone descriptor moved from terrain.js to break dependency cycles
/**
 * A lightweight zone descriptor used by terrain maps.
 */
export class Zone {
  /**
   * @param {string} title - The human-readable title for the zone.
   * @param {string} letter - The zone abbreviation letter.
   * @param {boolean} isMarginal - True if the zone is marginal.
   */
  constructor (title, letter, isMarginal) {
    /** @type {string} */
    this.title = title
    /** @type {string} */
    this.letter = letter
    /** @type {boolean} */
    this.isMarginal = isMarginal
  }

  /**
   * Returns the human-readable title for debugging and logging.
   * @returns {string}
   */
  toString () {
    return this.title
  }
}
