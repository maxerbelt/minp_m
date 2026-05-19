// Simple Zone constructor moved from terrain.js to break dependency cycles
/**
 * A lightweight zone descriptor used by terrain maps.
 * @class
 * @param {string} title - The human-readable title for the zone.
 * @param {string} letter - The zone abbreviation letter.
 * @param {boolean} isMarginal - True if the zone is marginal.
 */
export function Zone (title, letter, isMarginal) {
  if (!(this instanceof Zone)) {
    return new Zone(title, letter, isMarginal)
  }

  /** @type {string} */
  this.title = title
  /** @type {string} */
  this.letter = letter
  /** @type {boolean} */
  this.isMarginal = isMarginal
}
