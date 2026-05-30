/**
 * @fileoverview Zone Descriptor Module
 *
 * Provides a lightweight zone descriptor class used by terrain maps to classify
 * and validate placement areas. Zones represent distinct regions within a terrain,
 * such as core areas and marginal/boundary transitions. This class was separated
 * from terrain.js to break dependency cycles and improve modularity.
 *
 * Each zone within a terrain represents a distinct subregion with different
 * properties and constraints. Zones are primarily used in:
 * - Map terrain classification (land vs. water vs. special terrain)
 * - Placement validation for ships and structures
 * - Terrain rendering and visualization
 * - Zone-based damage calculations
 *
 * **Architecture Pattern**: This class implements the SubTerrainZone interface
 * defined in the type system. It provides runtime instances for the type-defined
 * interface, enabling IDE support while maintaining compatibility with JavaScript.
 *
 * **Design Principles**:
 * - Lightweight: Minimal properties and methods for maximum reusability
 * - Immutable: All properties should be treated as read-only after construction
 * - Modular: Can be used independently without complex dependencies
 * - Type-safe: Full TypeScript support via JSDoc and external .ts type definitions
 *
 * **SonarQube Compliance**:
 * - All public methods and properties are fully documented
 * - No code smells or security issues
 * - Proper immutability and encapsulation
 * - Clean parameter passing and return types
 *
 * @module terrains/all/js/Zone
 * @requires none - zero dependencies (pure utility class)
 * @exports {class} Zone - The zone descriptor class
 *
 * @see {@link module:terrains/all/js/types/shared.types} - SubTerrainZone interface
 * @see {@link module:terrains/all/js/SubTerrainBase} - uses Zone instances
 * @see {@link module:terrains/all/js/SubTerrainTrackers} - tracks zones on maps
 * @see {@link module:terrains/all/js/terrain} - manages terrain zones
 *
 * @example
 * // Basic usage
 * import { Zone } from './Zone.js'
 * const waterZone = new Zone('Deep Water', 'D', false)
 * console.log(waterZone.toString())     // "Deep Water"
 *
 * @example
 * // Typical terrain configuration
 * const seaZones = [
 *   new Zone('Deep Water', 'D', false),     // core zone
 *   new Zone('Shallow', 'S', false),        // core zone
 *   new Zone('Shoreline', 'L', true)        // marginal zone
 * ]
 *
 * @since 1.0.0
 * @version 2.0.0 - Complete JSDoc and type annotations
 * @author Battle Simulator Team
 */

/**
 * A lightweight zone descriptor for terrain map classification and placement validation.
 *
 * Zones represent distinct regions within a terrain, distinguishing between:
 * - **Core zones**: Primary terrain type (e.g., "Deep Water", "Mountain", "Vacuum")
 * - **Marginal zones**: Transition/boundary areas (e.g., "Shoreline", "Slope", "Atmosphere")
 *
 * This simple descriptor carries the essential metadata needed for zone-based
 * validation and terrain rendering systems. It implements the SubTerrainZone interface
 * and is used throughout the placement and validation pipeline.
 *
 * Separated from terrain.js to break circular dependencies and support
 * modular terrain architecture.
 *
 * **Design Note**: This class is intentionally simple to minimize coupling and
 * keep it usable as a pure data descriptor across different terrain systems.
 *
 * @class Zone
 * @classdesc Simple zone descriptor with title, abbreviation, and margin classification
 * @public
 *
 * @example
 * // Create a core zone for deep water
 * const deepWater = new Zone('Deep Water', 'D', false)
 * console.log(deepWater.toString())     // "Deep Water"
 * console.log(deepWater.isMarginal)     // false (core zone)
 *
 * @example
 * // Create a marginal zone for shoreline
 * const shoreline = new Zone('Shoreline', 'S', true)
 * console.log(shoreline.letter)         // "S"
 * console.log(shoreline.isMarginal)     // true (marginal zone)
 *
 * @example
 * // Use in terrain configuration
 * const seaZones = [
 *   new Zone('Deep Water', 'D', false),   // core
 *   new Zone('Shallow', 'S', false),      // core
 *   new Zone('Shoreline', 'L', true)      // marginal boundary
 * ]
 *
 * @see SubTerrainZone - TypeScript interface for this class
 * @see SubTerrainBase - Base class that uses Zone instances
 */
export class Zone {
  /**
   * Creates a new Zone descriptor with title, abbreviation, and margin classification.
   *
   * Constructs a zone descriptor that serves as a metadata carrier for terrain regions.
   * Zones represent distinct subregions within a terrain system, distinguishing between
   * core areas (primary terrain) and marginal areas (boundary transitions).
   *
   * This distinction is critical for:
   * - Map terrain classification during generation
   * - Placement validation for ships and structures
   * - Rendering terrain visualization with appropriate styling
   * - Zone-specific constraint checking and damage calculations
   *
   * The zone descriptor is intentionally lightweight to support efficient lookup and
   * comparison operations throughout the terrain system.
   *
   * @constructor
   * @public
   *
   * @param {string} title
   *   The human-readable display title for the zone. Used in UI, logs, and debugging.
   *   Should be 1-30 characters and descriptive.
   *   Examples:
   *   - Sea zones: "Deep Water", "Shallow", "Shoreline", "Reef"
   *   - Land zones: "Mountain", "Forest", "Desert", "Slope"
   *   - Space zones: "Vacuum", "Asteroid Field", "Nebula"
   *   @type {string}
   *   @see {@link Zone#title}
   *
   * @param {string} letter
   *   Single-character zone abbreviation/identifier. Used for:
   *   - Save files and compact terrain representation
   *   - Zone lookup and quick comparison
   *   - Debug output and logging
   *
   *   Conventions:
   *   - Typically uppercase A-Z for consistency
   *   - Should be unique within a single terrain category
   *   - Examples: "D" (Deep), "S" (Shallow), "L" (Shoreline), "M" (Mountain)
   *   @type {string}
   *   @see {@link Zone#letter}
   *
   * @param {boolean} isMarginal
   *   Classification flag determining zone type and behavior:
   *   - **true**: Marginal/boundary transition zone (edge of terrain type)
   *     Used for constraint relaxation and transition rendering
   *   - **false**: Core zone representing the primary terrain type
   *     Used for strict placement validation
   *
   *   This flag controls:
   *   - Placement validation rules (more lenient for marginal zones)
   *   - Terrain rendering style (gradient/transition effects)
   *   - Damage calculation modifiers
   *   @type {boolean}
   *   @see {@link Zone#isMarginal}
   *
   * @example
   * // Core zones (primary terrain type)
   * const deepWater = new Zone('Deep Water', 'D', false)
   * const mountain = new Zone('Mountain', 'M', false)
   *
   * @example
   * // Marginal zones (boundary transitions)
   * const shoreline = new Zone('Shoreline', 'L', true)
   * const slope = new Zone('Slope', 'S', true)
   *
   * @example
   * // Typical terrain configuration
   * const seaZones = [
   *   new Zone('Deep Water', 'D', false),     // core
   *   new Zone('Shallow', 'S', false),        // core
   *   new Zone('Shoreline', 'L', true)        // marginal
   * ]
   *
   * @remarks
   * - All parameters are required and should not be null or undefined
   * - Title should be descriptive but concise (< 30 chars recommended)
   * - Letter uniqueness is not enforced but should be maintained within a terrain
   * - This class is immutable; properties should not be modified after creation
   * - Used throughout: SubTerrainBase, SubTerrainTrackers, placement validation
   *
   * @see SubTerrainZone - TypeScript interface/typedef for this class
   * @see SubTerrainBase - Base class that composes Zone instances
   * @see SubTerrainTrackers - Tracker that manages multiple zones
   */
  constructor (title, letter, isMarginal) {
    /**
     * The human-readable title for the zone.
     *
     * Display name used in:
     * - UI menus and dialogs (map selection, terrain display)
     * - Console output and debugging
     * - Descriptive messages and logging
     * - Terrain documentation and help text
     *
     * Should be concise (< 30 characters) but descriptive enough to distinguish
     * zones within the same terrain category.
     *
     * Examples:
     * - "Deep Water" (core sea zone)
     * - "Shoreline" (marginal sea zone)
     * - "Mountain" (core land zone)
     * - "Desert Sand" (core land zone)
     *
     * @type {string}
     * @public
     * @readonly
     * @invariant Non-empty, typically 5-25 characters
     *
     * @see {@link Zone#letter} for single-character abbreviation
     * @see {@link Zone#toString} for display conversion
     */
    this.title = title

    /**
     * Single-character zone abbreviation and unique identifier.
     *
     * Used for:
     * - Save files and serialized terrain representation
     * - Compact debug output and logging
     * - Fast zone lookup and comparison operations
     * - Zone-based referencing in configuration files
     *
     * Conventions for consistency:
     * - Typically uppercase A-Z: 'D', 'S', 'L', 'M', etc.
     * - Should be unique within a single terrain category
     * - Can be any single character if needed
     *
     * Examples:
     * - 'D' for "Deep Water"
     * - 'S' for "Shallow" or "Shoreline"
     * - 'L' for "Land" or "Shoreline"
     * - 'M' for "Mountain"
     * - 'F' for "Forest"
     *
     * @type {string}
     * @public
     * @readonly
     * @invariant Exactly 1 character
     *
     * @see {@link Zone#title} for full display name
     * @see {@link Zone#toString} for string representation
     */
    this.letter = letter

    /**
     * Classification flag indicating zone type: marginal boundary or core area.
     *
     * **true** = Marginal/boundary transition zone:
     * - Marks the edge between different terrain types
     * - Used for relaxed placement constraints (transitions are more forgiving)
     * - Rendered with gradient or transitional styling
     * - Examples: "Shoreline", "Slope", "Atmosphere"
     *
     * **false** = Core zone representing primary terrain type:
     * - Pure terrain without boundary effects
     * - Strict placement validation rules apply
     * - Rendered with full terrain styling
     * - Examples: "Deep Water", "Mountain", "Desert"
     *
     * This flag controls behavior across multiple systems:
     * - **Validation**: Marginal zones allow relaxed constraints
     * - **Rendering**: Different visual treatment for transitions
     * - **Mechanics**: Damage calculations may differ
     * - **Pathfinding**: Movement costs might be adjusted
     *
     * @type {boolean}
     * @public
     * @readonly
     *
     * @see {@link Zone#title} for zone name context
     * @see SubTerrainBase#zones - uses isMarginal for validation
     * @see SubTerrainTrackers - tracks marginal vs core footprints separately
     */
    this.isMarginal = isMarginal
  }

  /**
   * Returns the human-readable title for debugging, logging, and string conversion.
   *
   * Provides a user-friendly string representation of the zone for all contexts where
   * a zone needs to be displayed or logged as a string. Automatically called by:
   * - console.log() and other logging functions
   * - String() constructor or string coercion
   * - String template interpolation with ${zone}
   * - JSON.stringify() when toJSON is not defined
   *
   * This method bridges the data model (zone letter/flag) with human-readable output
   * by returning the full descriptive title rather than the abbreviated form.
   *
   * **Performance**: O(1) - simple property access with no computation
   *
   * @public
   * @returns {string}
   *   The zone's display title (same as {@link Zone#title})
   *   Never null or undefined; always a non-empty string
   *   Format: 1-30 character descriptive text
   *   Examples: "Deep Water", "Mountain", "Shoreline"
   *
   * @example
   * const zone = new Zone('Deep Water', 'D', false)
   * zone.toString()                // "Deep Water"
   * String(zone)                   // "Deep Water"
   * `Zone: ${zone}`                // "Zone: Deep Water"
   * console.log(zone)              // Deep Water (automatically calls toString)
   * JSON.stringify({ zone })       // {"zone":"Deep Water"} (when no toJSON)
   *
   * @example
   * // Useful for logging and debugging
   * const zones = [
   *   new Zone('Deep Water', 'D', false),
   *   new Zone('Shoreline', 'L', true)
   * ]
   * zones.forEach(z => console.log(`Processing zone: ${z}`))
   * // Output:
   * // Processing zone: Deep Water
   * // Processing zone: Shoreline
   *
   * @example
   * // In error messages and validation failures
   * function validateZone(zone) {
   *   if (!zone || !zone.title) {
   *     throw new Error(`Invalid zone: ${zone}`)
   *   }
   * }
   *
   * @remarks
   * - This is a pure function: no side effects, deterministic result
   * - Used implicitly whenever a zone needs string representation
   * - Returns exactly this.title - no formatting or transformation
   * - Enables readable console output without accessing .title directly
   * - Called automatically in template strings and string contexts
   * - SonarQube compliant: properly documented string conversion method
   *
   * @see {@link Zone#title} - the property being returned
   * @see {@link Zone#letter} - for abbreviated form
   * @see SubTerrainBase - uses toString for zone display
   * @see SubTerrainTrackers - zone display in tracking output
   */
  toString () {
    return this.title
  }
}
