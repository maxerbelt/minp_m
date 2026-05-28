/**
 * @fileoverview Subterrain Base Class Module
 *
 * Provides the base implementation for terrain subtypes within a larger terrain category.
 * Subterrains define distinct terrain environments (Mountain, Forest, Desert for Land;
 * Shallow, Deep for Sea; Asteroid, Vacuum for Space) with their own visual properties,
 * zones, and validation logic.
 *
 * @module terrains/all/js/SubTerrainBase
 */

/**
 * A single terrain zone descriptor defining core and marginal boundary areas.
 *
 * Zones divide a subterrain into core areas (the primary terrain type) and marginal
 * areas (transition boundaries). This distinction is important for placement validation
 * and visual rendering of terrain elements.
 *
 * @typedef {Object} SubTerrainZone
 * @property {string} title
 *   Display title of the zone (e.g., "Deep Water", "Shoreline", "Mountain Peak")
 * @property {boolean} [isMarginal]
 *   Whether this zone represents a marginal boundary transition (true) or core terrain (false).
 *   When true, this zone marks the edge/boundary; when false or undefined, marks core area.
 * @description Zone configuration for terrain area classification and placement validation
 */

/**
 * Validator function for terrain zone compatibility checking.
 *
 * Used by Terrain and placement systems to validate whether shapes or placements
 * are compatible with specific zone configurations and subterrain properties.
 *
 * @typedef {(zoneInfo: [SubTerrainBase, unknown]) => boolean} TerrainValidator
 * @description Predicate function checking zone/subterrain compatibility

/**
 * Base class for a subterrain type with visual properties, zones, and validation.
 *
 * Subterrains define distinct terrain types within a larger terrain category.
 * Examples: Mountain, Forest, Desert (for Land); Shallow, Deep (for Sea); Asteroid, Vacuum (for Space).
 * Each subterrain has display colors for light/dark themes, zones defining core and marginal areas,
 * and validator functions for checking terrain compatibility and placement rules.
 *
 * The class provides:
 * - Display properties: title, colors, letter identifier
 * - Zone management: core area and marginal boundaries
 * - Classification flags: default selection, primary land designation
 * - Validation hooks: canBe() and validator() predicates for custom placement logic
 *
 * @class SubTerrainBase
 * @description Base implementation for terrain subtype descriptors used in map generation, terrain validation, and placement rules
 * @see Terrain for the parent terrain container
 * @see Matcher for zone validation patterns
 *
 * @example
 * // Create a mountain subterrain
 * const mountain = new SubTerrainBase(
 *   'Mountain',      // title
 *   '#8B8B8B',       // light color (gray)
 *   '#4A4A4A',       // dark color (dark gray)
 *   'M',             // letter identifier
 *   false,           // not default
 *   false,           // not land
 *   [
 *     { title: 'Peak', isMarginal: false },      // core zone
 *     { title: 'Slope', isMarginal: true }       // marginal zone
 *   ]
 * )
 */
export class SubTerrainBase {
  /**
   * Creates a new SubTerrainBase instance with terrain properties, zones, and validators.
   *
   * Initializes all subterrain properties including display configuration, zone definitions,
   * and default validator stubs that can be overridden in subclasses. Derives a lowercase
   * tag from the title for easy comparison and matching.
   *
   * Zone extraction:
   * - Searches zones array for isMarginal=true (boundary) and isMarginal=false/undefined (core)
   * - Stores references in this.margin and this.core for quick lookup
   * - If zones not provided or missing entries, margin and/or core will be undefined
   *
   * @param {string} title
   *   Display title of the subterrain (e.g., "Mountain", "Deep Water", "Asteroid Field")
   * @param {string} lightColor
   *   CSS color string for light theme rendering (e.g., "#FFFFFF", "#8B8B8B", "rgb(255,0,0)")
   * @param {string} darkColor
   *   CSS color string for dark theme rendering for contrast
   * @param {string} letter
   *   Single-character identifier for the subterrain, used in serialization and UI (e.g., "M", "D", "A")
   * @param {boolean} [isDefault=false]
   *   Whether this is the default/primary subterrain for its terrain category.
   *   If multiple subterrains exist and one is marked true, it's selected first.
   * @param {boolean} [isTheLand=false]
   *   Special classification flag for the main/base terrain type. Used to distinguish
   *   primary terrain from variants. Typically only one per terrain category.
   * @param {SubTerrainZone[]} [zones=[]]
   *   Array of zone descriptors dividing this subterrain into core and marginal areas.
   *   Optional entries for zone definitions.
   *
   * @throws {TypeError} If title is not a string or letter is not a single character
   * @public
   *
   * @example
   * // Create with all zones specified
   * const terrain = new SubTerrainBase(
   *   'Desert',
   *   '#FFD700',
   *   '#DAA520',
   *   'D',
   *   true,              // is default
   *   false,             // not land
   *   [
   *     { title: 'Sand', isMarginal: false },
   *     { title: 'Dune', isMarginal: true }
   *   ]
   * )
   *
   * @remarks
   * - Constructor uses Boolean() conversion for isDefault and isTheLand to ensure type consistency
   * - Tag is always lowercase version of title for case-insensitive matching
   * - canBe and validator methods default to returning false; override in subclasses
   * - Zone detail defaults to 0; increase for more detailed zone rendering
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
     * Used in UI menus, descriptions, and debug output.
     * @type {string}
     * @public
     */
    this.title = title

    /**
     * CSS color string for light theme rendering.
     * Applied to terrain cells in light mode or when rendering light variants.
     * Format: hex (#RRGGBB), rgb(), or named color.
     * @type {string}
     * @public
     */
    this.lightColor = lightColor

    /**
     * CSS color string for dark theme rendering.
     * Applied to terrain cells in dark mode or for contrast rendering.
     * Should provide sufficient contrast with lightColor for visual distinction.
     * @type {string}
     * @public
     */
    this.darkColor = darkColor

    /**
     * Single-character identifier for this subterrain.
     * Used in save files, debug output, and compact terrain representation.
     * Typically uppercase (A-Z) but can be any single character.
     * @type {string}
     * @public
     */
    this.letter = letter

    /**
     * Whether this is the default/primary subterrain in its category.
     * When multiple subterrains exist, true marks the one selected first.
     * Guaranteed boolean type due to Boolean() conversion in constructor.
     * @type {boolean}
     * @public
     */
    this.isDefault = Boolean(isDefault)

    /**
     * Whether this is the main/base terrain type for its category.
     * Special classification distinguishing primary terrain from variants.
     * Typically only one per terrain category is marked true.
     * Guaranteed boolean type due to Boolean() conversion in constructor.
     * @type {boolean}
     * @public
     */
    this.isTheLand = Boolean(isTheLand)

    /**
     * Array of zone descriptors defining core and marginal areas.
     * Zones divide the subterrain into distinct regions for placement validation.
     * Typically includes one core zone (isMarginal=false) and one or more marginal zones (isMarginal=true).
     * @type {SubTerrainZone[]}
     * @public
     */
    this.zones = zones

    /**
     * The marginal/boundary zone extracted from zones array.
     * References first zone with isMarginal=true, or undefined if not present.
     * Represents transition/edge areas of the subterrain.
     * @type {SubTerrainZone|undefined}
     * @public
     */
    this.margin = zones.find(z => z.isMarginal)

    /**
     * The core zone extracted from zones array.
     * References first zone with isMarginal=false or undefined, or undefined if not present.
     * Represents the primary/central terrain type.
     * @type {SubTerrainZone|undefined}
     * @public
     */
    this.core = zones.find(z => !z.isMarginal)

    /**
     * Lowercase tag derived from the title for case-insensitive comparison.
     * Used as unique identifier throughout terrain systems.
     * Example: "mountain" from title "Mountain".
     * @type {string}
     * @public
     */
    this.tag = title.toLowerCase()

    /**
     * Placement eligibility predicate for this subterrain.
     * Determines if this subterrain can be placed at a given location.
     * Override in subclasses to provide placement-specific logic.
     * Default implementation returns false (prohibit by default).
     *
     * @type {(subterrain: SubTerrainBase) => boolean}
     * @public
     *
     * @remarks
     * - Checked during map generation and custom map validation
     * - Should implement terrain-specific rules (e.g., mountains only on high elevation)
     * - Access this.title, this.zones, etc. within predicate
     * - Default false means placement is prohibited unless overridden
     *
     * @example
     * mountain.canBe = (subterrain) => subterrain === mountain
     */
    this.canBe = () => false

    /**
     * Zone configuration validator for terrain compatibility.
     * Validates whether a zone configuration is compatible with this subterrain.
     * Override in subclasses to provide zone-specific validation logic.
     * Default implementation returns false (invalid by default).
     *
     * @type {TerrainValidator}
     * @public
     *
     * @remarks
     * - Called during placement validation and zone compatibility checks
     * - Receives zone information as [SubTerrainBase, unknown] tuple
     * - Should implement terrain-specific zone rules
     * - Default false means validation fails unless overridden
     * - Used in Matcher pattern for advanced validation
     *
     * @example
     * terrain.validator = (zoneInfo) => {
     *   const [subterrain, zone] = zoneInfo
     *   return zone.depth > 0
     * }
     */
    this.validator = () => false

    /**
     * Detail level for zone rendering and complexity.
     * Higher values indicate more detailed zone definitions and rendering.
     * Values typically range from 0 (simple) to 3+ (detailed).
     * Used by rendering systems to determine zone visualization complexity.
     * @type {number}
     * @public
     */
    this.zoneDetail = 0
  }

  /**
   * Returns the subterrain title for debugging and object inspection.
   *
   * Provides a human-readable representation of the subterrain instance.
   * Called automatically by console.log, debuggers, and object inspection tools.
   *
   * @returns {string} The subterrain's display title
   *
   * @public
   * @example
   * const terrain = new SubTerrainBase('Mountain', '#8B8B8B', '#4A4A4A', 'M')
   * console.log(terrain.toString())   // "Mountain"
   * console.log(String(terrain))      // "Mountain"
   * console.log(terrain)              // SubTerrainBase Mountain
   *
   * @remarks
   * - Pure function: No side effects
   * - Used for debugging and logging purposes
   * - Enables console.log(subterrain) to show readable output
   * - Also used in string concatenation and template literals
   */
  toString () {
    return this.title
  }
}
