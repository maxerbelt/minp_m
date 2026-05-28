/**
 * A single terrain zone descriptor with title and marginal status.
 * @typedef {Object} SubTerrainZone
 * @property {string} title - Display title of the zone
 * @property {boolean} [isMarginal] - Whether this zone represents a marginal boundary (true) or core terrain (false)
 */

/**
 * Validator function type for terrain zone compatibility checking.
 * @typedef {(zoneInfo: [SubTerrainBase, unknown]) => boolean} TerrainValidator
 */

/**
 * Base class for a subterrain type with properties, zone management, and validation.
 *
 * Subterrains define distinct terrain types (e.g., Mountain, Forest, Desert) within
 * a larger terrain category (Sea, Land, Space, Asteroid). Each subterrain has display
 * colors for light and dark rendering, zones defining core and marginal areas, and
 * validation functions for checking terrain compatibility.
 *
 * @class SubTerrainBase
 * @description Base implementation for subterrain descriptors used in map generation and terrain validation
 */
export class SubTerrainBase {
  /**
   * Creates a new SubTerrainBase instance with terrain properties and zones.
   *
   * @param {string} title - Display title of the subterrain (e.g., "Mountain")
   * @param {string} lightColor - CSS color string for light rendering (e.g., "#FFFFFF")
   * @param {string} darkColor - CSS color string for dark rendering (e.g., "#000000")
   * @param {string} letter - Single-character identifier for the subterrain
   * @param {boolean} [isDefault=false] - Whether this is the default subterrain for its category
   * @param {boolean} [isTheLand=false] - Special flag for the main land/base terrain type
   * @param {SubTerrainZone[]} [zones=[]] - Array of zone descriptors (core and marginal areas)
   */
  constructor (
    title,
    lightColor,
    darkColor,
    letter,
    isDefault = false,
    isTheLand = false,
    zones = []
  ) {
    /**
     * Display title of the subterrain.
     * @type {string}
     */
    this.title = title

    /**
     * CSS color for light theme rendering.
     * @type {string}
     */
    this.lightColor = lightColor

    /**
     * CSS color for dark theme rendering.
     * @type {string}
     */
    this.darkColor = darkColor

    /**
     * Single-character identifier for this subterrain.
     * @type {string}
     */
    this.letter = letter

    /**
     * Whether this is the default subterrain in its category.
     * @type {boolean}
     */
    this.isDefault = Boolean(isDefault)

    /**
     * Whether this is the primary land/base terrain type.
     * @type {boolean}
     */
    this.isTheLand = Boolean(isTheLand)

    /**
     * Array of zone descriptors (core and marginal areas).
     * @type {SubTerrainZone[]}
     */
    this.zones = zones

    /**
     * The marginal boundary zone, if defined in zones array.
     * @type {SubTerrainZone|undefined}
     */
    this.margin = zones.find(z => z.isMarginal)

    /**
     * The core zone, if defined in zones array.
     * @type {SubTerrainZone|undefined}
     */
    this.core = zones.find(z => !z.isMarginal)

    /**
     * Lowercase tag derived from the title for easy comparison.
     * @type {string}
     */
    this.tag = title.toLowerCase()

    /**
     * Predicate function to determine if this subterrain can be placed at a location.
     * Override in subclasses to provide placement logic.
     * @type {(subterrain: SubTerrainBase) => boolean}
     * @returns {boolean} True if this subterrain can be placed at the given location
     */
    this.canBe = () => false

    /**
     * Validator function to check zone compatibility.
     * Override in subclasses to provide zone validation logic.
     * @type {TerrainValidator}
     * @returns {boolean} True if the zone configuration is valid for this terrain
     */
    this.validator = () => false

    /**
     * Detail level for zone rendering (0 = simple, higher = more detail).
     * @type {number}
     */
    this.zoneDetail = 0
  }

  /**
   * Returns the title for debugging and object inspection.
   *
   * @returns {string} The subterrain title
   */
  toString () {
    return this.title
  }
}
