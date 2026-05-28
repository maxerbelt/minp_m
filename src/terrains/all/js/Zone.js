/**
 * @fileoverview Zone Descriptor Module
 *
 * Provides a lightweight zone descriptor class used by terrain maps to classify
 * and validate placement areas. Zones represent distinct regions within a terrain,
 * such as core areas and marginal/boundary transitions. This class was separated
 * from terrain.js to break dependency cycles and improve modularity.
 *
 * @module terrains/all/js/Zone
 */

/**
 * A lightweight zone descriptor for terrain map classification and placement validation.
 *
 * Zones represent distinct regions within a terrain, distinguishing between
 * core areas (primary terrain type) and marginal areas (boundary transitions).
 * This simple descriptor carries the essential metadata needed for zone-based
 * validation and terrain rendering systems.
 *
 * Separated from terrain.js to break circular dependencies and support
 * modular terrain architecture.
 *
 * @class Zone
 * @classdesc Simple zone descriptor with title, abbreviation, and margin classification
 * @public
 *
 * @example
 * // Create a core zone
 * const deepWater = new Zone('Deep Water', 'D', false)
 * console.log(deepWater.toString())  // "Deep Water"
 *
 * @example
 * // Create a marginal zone
 * const shoreline = new Zone('Shoreline', 'S', true)
 * if (shoreline.isMarginal) {
 *   console.log('This is a boundary transition zone')
 * }
 */
export class Zone {
  /**
   * Creates a new Zone descriptor with title, abbreviation, and margin classification.
   *
   * Zones represent distinct regions within a terrain. Marginal zones mark
   * transition boundaries; core zones represent the primary terrain type.
   * This distinction is used during map generation, validation, and rendering.
   *
   * @constructor
   * @param {string} title
   *   The human-readable title for the zone displayed in UI and logs.
   *   Examples: "Deep Water", "Shoreline", "Mountain Peak", "Desert Sand"
   * @param {string} letter
   *   Single-character zone abbreviation used in save files and compact representations.
   *   Typically uppercase (A-Z) for consistency, but can be any single character.
   * @param {boolean} isMarginal
   *   Classification flag: true if this zone represents a marginal/boundary transition area,
   *   false if this zone represents the core primary terrain type.
   *   Used for placement validation and terrain rendering.
   * @public
   *
   * @example
   * const mountain = new Zone('Mountain', 'M', false)  // core zone
   * const slope = new Zone('Slope', 'S', true)          // marginal zone
   *
   * @remarks
   * - Title should be descriptive for user-facing display
   * - Letter should be unique within a terrain category for serialization
   * - isMarginal controls validation and rendering behavior
   */
  constructor (title, letter, isMarginal) {
    /**
     * The human-readable title for the zone.
     * Displayed in UI menus, terrain selection, and descriptive output.
     * Examples: "Deep Water", "Shoreline", "Mountain Peak"
     * @type {string}
     * @public
     */
    this.title = title

    /**
     * Single-character zone abbreviation.
     * Used in save files, debug output, and compact terrain representation.
     * Typically uppercase (A-Z) but can be any single character.
     * Should be unique within a terrain category for unambiguous serialization.
     * @type {string}
     * @public
     */
    this.letter = letter

    /**
     * Whether this zone represents a marginal/boundary transition area.
     * When true: zone marks edge/transition between terrain types.
     * When false: zone marks core/primary terrain type.
     * Used for placement validation, rendering, and constraint checking.
     * @type {boolean}
     * @public
     */
    this.isMarginal = isMarginal
  }

  /**
   * Returns the human-readable title for debugging, logging, and string conversion.
   *
   * Provides a user-friendly string representation of the zone for console output,
   * error messages, and object inspection. Called automatically by console.log,
   * String(), and string concatenation.
   *
   * @returns {string} The zone's display title
   * @public
   *
   * @example
   * const zone = new Zone('Deep Water', 'D', false)
   * console.log(zone.toString())   // "Deep Water"
   * console.log(String(zone))      // "Deep Water"
   * console.log(`Zone: ${zone}`)   // "Zone: Deep Water"
   *
   * @remarks
   * - Pure function: no side effects
   * - Used for debugging and logging purposes
   * - Enables readable console output without accessing .title directly
   * - Called automatically in string contexts
   */
  toString () {
    return this.title
  }
}
