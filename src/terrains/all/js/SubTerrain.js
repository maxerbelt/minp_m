/**
 * @fileoverview SubTerrain Concrete Implementation Module
 *
 * Provides a concrete implementation of SubTerrainBase that implements standard
 * terrain validation logic. SubTerrain instances are used to represent specific
 * terrain types (e.g., Mountain, Desert for Land; Shallow, Deep for Sea) with
 * built-in placement and zone validation.
 *
 * @module terrains/all/js/SubTerrain
 */

import { SubTerrainBase } from './SubTerrainBase.js'

/**
 * @typedef {import('./SubTerrainBase.js').SubTerrainZone} SubTerrainZone
 */

/**
 * Concrete implementation of SubTerrainBase with standard validation logic.
 *
 * SubTerrain extends SubTerrainBase and provides default implementations for
 * placement eligibility and zone validation. Unlike the base class, SubTerrain
 * instances can validate themselves using identity comparison and zone matching.
 *
 * Each SubTerrain instance represents a specific terrain type with its own
 * properties, zones, and validation rules. The validator automatically checks
 * that incoming zone information matches this specific subterrain instance.
 *
 * Typically used as factory instances (singleton-like) representing terrain types:
 * - Land terrains: Mountain, Forest, Desert
 * - Sea terrains: Shallow, Deep
 * - Space terrains: Asteroid, Vacuum
 *
 * @class SubTerrain
 * @extends SubTerrainBase
 * @classdesc Concrete subterrain type with identity-based validation
 * @public
 *
 * @example
 * // Create a Mountain subterrain
 * const mountain = new SubTerrain(
 *   'Mountain',
 *   '#8B8B8B',
 *   '#4A4A4A',
 *   'M',
 *   false,
 *   false,
 *   [
 *     { title: 'Peak', isMarginal: false },
 *     { title: 'Slope', isMarginal: true }
 *   ]
 * )
 *
 * // Use for placement validation
 * if (mountain.canBe(mountain)) {
 *   console.log('Mountain can be placed')
 * }
 *
 * @example
 * // Use validator for zone matching
 * const zoneInfo = [mountain, zoneData]
 * if (mountain.validator(zoneInfo)) {
 *   console.log('Zone matches mountain subterrain')
 * }
 *
 * @see SubTerrainBase for base implementation details
 * @see Terrain for terrain container and management
 */
export class SubTerrain extends SubTerrainBase {
  /**
   * Creates a new SubTerrain instance with placement and zone validation.
   *
   * Initializes a concrete subterrain with standard validation logic:
   * - canBe() checks if the provided subterrain is this instance (identity)
   * - validator() checks if zone info's subterrain matches this instance
   * - zoneDetail set to 1 for standard granularity
   *
   * Inherits all display properties and zone management from SubTerrainBase.
   * The validator uses subterrain identity for reliable zone matching.
   *
   * @constructor
   * @param {string} title
   *   Display title of the subterrain (e.g., "Mountain", "Deep Water", "Asteroid Field").
   *   Used in UI menus and descriptive output.
   * @param {string} lightColor
   *   CSS color string for light theme rendering (e.g., "#8B8B8B", "rgb(139, 139, 139)").
   *   Should provide good contrast with darkColor.
   * @param {string} darkColor
   *   CSS color string for dark theme rendering for contrast with light mode.
   * @param {string} letter
   *   Single-character identifier for the subterrain, used in serialization and UI.
   *   Typically uppercase letter (A-Z) for consistency.
   * @param {boolean} [isDefault=false]
   *   Whether this is the default/primary subterrain for its terrain category.
   *   When multiple subterrains exist, true marks the one selected first.
   *   @default false
   * @param {boolean} [isTheLand=false]
   *   Special classification flag for the main/base terrain type.
   *   Distinguishes primary terrain from variants; typically only one per category.
   *   @default false
   * @param {SubTerrainZone[]} [zones=[]]
   *   Array of zone descriptors defining core and marginal areas within this subterrain.
   *   Zones are used for placement validation and visual rendering.
   *   @default []
   * @public
   *
   * @example
   * const subterrain = new SubTerrain(
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
   * - Calls parent constructor with all parameters
   * - Overrides canBe() with identity comparison (this === subterrain)
   * - Overrides validator() to check zone info's subterrain matches this instance
   * - Sets zoneDetail to 1 for standard validation granularity
   * - All inherited properties (title, letter, zones, etc.) available after construction
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
    super(title, lightColor, darkColor, letter, isDefault, isTheLand, zones)

    /**
     * Placement eligibility predicate using identity comparison.
     * Returns true only if the provided subterrain is this exact instance.
     * Used during map generation and custom map validation to check placement compatibility.
     *
     * @type {(subterrain: SubTerrain) => boolean}
     * @public
     * @override
     *
     * @remarks
     * - Pure function: no side effects
     * - Uses strict identity (===) comparison
     * - Only true for this exact instance, not other subterrains with same properties
     * - Provides fail-fast placement validation
     *
     * @example
     * const mountain = new SubTerrain(...)
     * const forest = new SubTerrain(...)
     * mountain.canBe(mountain)  // true
     * mountain.canBe(forest)    // false
     */
    this.canBe = subterrain => subterrain === this

    /**
     * Zone validator for terrain compatibility checking.
     * Validates that the zone information's subterrain matches this instance.
     * Called during placement validation and zone compatibility checks.
     *
     * The zone info is expected to be a tuple [SubTerrain, any] where the first
     * element is the subterrain being validated. This validator checks if that
     * subterrain is this exact instance.
     *
     * @type {(zoneInfo: [SubTerrain, any]) => boolean}
     * @public
     * @override
     *
     * @remarks
     * - Pure function: no side effects
     * - Expects zoneInfo as [subterrain, zoneData] tuple
     * - Uses this.canBe() for consistency with placement logic
     * - Returns true only if zone's subterrain is this instance
     * - Provides reliable zone matching for advanced validation patterns
     *
     * @example
     * const mountain = new SubTerrain('Mountain', '#8B8B8B', '#4A4A4A', 'M')
     * mountain.validator([mountain, zoneData])   // true
     * mountain.validator([forest, zoneData])     // false
     * mountain.validator([null, zoneData])       // false
     */
    this.validator = zoneInfo => this.canBe(zoneInfo[0])

    /**
     * Zone detail level for standard validation granularity.
     * Set to 1 for SubTerrain instances to enable standard-level zone processing.
     * Higher values indicate more detailed zone definitions and rendering.
     * Used by rendering systems and validation engines to adjust behavior.
     *
     * @type {number}
     * @public
     * @override
     * @default 1
     *
     * @remarks
     * - Controls granularity of zone rendering and validation
     * - Value 0 = minimal/simplified zones
     * - Value 1 = standard/default granularity (SubTerrain default)
     * - Value 2+ = detailed/complex zones
     * - Can be modified after construction for specialized use cases
     *
     * @example
     * const mountain = new SubTerrain(...)
     * console.log(mountain.zoneDetail)  // 1 (standard)
     *
     * // For more detailed rendering:
     * mountain.zoneDetail = 2
     */
    this.zoneDetail = 1
  }
}
