/**
 * @module waters/helpers/ZoneInfoManager
 * Manages display and synchronization of zone information for game board.
 *
 * @description
 * Centralizes zone information display including creation of zone entries,
 * recalculation of zone metrics, and displacement area visualization.
 * Works with the bh.map.subterrainTrackers system to manage per-terrain zone data.
 *
 * Zone Types:
 * - Title zones: Primary headings with bold styling
 * - Item zones: Sub-items with regular text
 * - Text zones: Custom styling with flexible content
 * - Add zones: Displacement-based zones with tightness descriptions
 *
 * Responsibilities:
 * - Create DOM elements for zone display with styling
 * - Recalculate zone metrics from current map state
 * - Display displacement area analysis by terrain type
 * - Update zone counts in real-time as game state changes
 */

import { bh } from '../../terrains/all/js/bh.js'
import { DisplacementCalculator } from './DisplacementCalculator.js'
import { all, mixed } from '../../terrains/all/js/terrain.js'

/**
 * Represents a zone size tracker with metrics and recalculation.
 * Tracks total, margin, and core area measurements for zones.
 *
 * @typedef {Object} ZoneTracker
 * @property {(map?: Object) => void} recalc - Recalculates zone sizes from current map state
 * @property {Object} sizes - Zone size metrics object
 * @property {number} sizes.total - Total area of the zone
 * @property {number} sizes.margin - Margin/boundary area of the zone
 * @property {number} sizes.core - Core/interior area of the zone
 * @property {number} totalSize - Total combined size across all areas
 */

/**
 * Zone entry for display in UI with tracking capability.
 * Combines tracker logic with HTML elements for count display.
 *
 * @typedef {Object} ZoneEntry
 * @property {ZoneTracker} tracker - Zone tracker for size calculations and updates
 * @property {HTMLSpanElement[]} counts - Array of [total, margin, core] count span elements
 */

/**
 * Shape with size property for displacement analysis.
 * Used in displacement calculations and zone metrics.
 *
 * @typedef {Object} ShapeWithSize
 * @property {number} size - Shape size value in grid cells
 * @property {() => Object} subterrain - Returns the subterrain type for this shape
 */

/**
 * Shape object with terrain information only.
 * Minimal interface for terrain-based queries.
 *
 * @typedef {Object} ShapeObject
 * @property {() => Object} subterrain - Returns the subterrain type for this shape
 */

/**
 * Ship object with shape accessor.
 * Used in displacement and zone calculations.
 *
 * @typedef {Object} ShipObject
 * @property {() => Object} shape - Returns the ship's ShapeWithSize or shape info
 */

/**
 * Game model interface for displacement calculations.
 * Provides access to game entities and state.
 *
 * @typedef {Object} GameModel
 * @property {ShipObject[]} ships - Array of all ships in the game
 * @property {Object} loadOut - Ship loadout configuration data
 * @property {() => number} calculateDisplacedArea - Calculates total displacement area
 */

/**
 * Manages the display and synchronization of zone information.
 *
 * Responsibilities:
 * - Create zone display entries with various styling options
 * - Manage zone information lifecycle (setup, display, update)
 * - Calculate and display displacement area by terrain type
 * - Track zone metrics and provide real-time updates
 *
 * Design Pattern:
 * - Static utility class (no instantiation)
 * - Private methods (#) for internal operations
 * - Public static methods for external API
 * - CSS styling configuration with defaults
 *
 * @class ZoneInfoManager
 * @static
 */
export class ZoneInfoManager {
  /**
   * Default CSS inline styles for zone display elements.
   * Provides consistent styling for zone titles and items.
   *
   * Styles:
   * - TITLE: Bold font with consistent line height (1.2)
   * - ITEM: Small font (75%) with line height matching title
   *
   * @readonly
   * @type {Object<string, string>}
   * @static
   * @private
   */
  static #DEFAULT_STYLES = {
    TITLE: 'line-height:1.2;',
    ITEM: 'font-size:75%;line-height:1.2'
  }

  /**
   * Creates a zone title entry with bold label and size display.
   * Used for primary zone headings with emphasized label styling.
   * Applies title-specific CSS styling (bold, 1.2 line height).
   *
   * @static
   * @public
   * @param {HTMLElement} zoneContainer - Container element for appending the entry
   * @param {string} labelTxt - Title label text (e.g., 'Map', 'Sea Zones')
   * @param {ShapeWithSize|string|number} bagOrText - Size source:
   *                                                   - ShapeWithSize object with size property
   *                                                   - String for text display
   *                                                   - Number for numeric value
   * @returns {HTMLSpanElement} The count/value span element for later updates
   * @throws {TypeError} If zoneContainer is not an HTMLElement
   *
   * @example
   * const countSpan = ZoneInfoManager.createZoneTitle(container, 'Map', { size: 100 });
   * // Renders: <div><b>Map : </b><span>100</span></div>
   */
  static createZoneTitle (zoneContainer, labelTxt, bagOrText) {
    return this.#createZoneEntry(
      zoneContainer,
      labelTxt,
      bagOrText,
      'b',
      this.#DEFAULT_STYLES.TITLE
    )
  }

  /**
   * Creates a zone item entry with regular-sized label.
   * Used for zone sub-items beneath titles with standard text styling.
   * Applies item-specific CSS styling (small font, consistent line height).
   *
   * @static
   * @public
   * @param {HTMLElement} zoneContainer - Container element for appending the entry
   * @param {string} labelTxt - Item label text (e.g., 'Core', 'Margin')
   * @param {ShapeWithSize|string|number} bagOrText - Size source:
   *                                                   - ShapeWithSize object with size property
   *                                                   - String for text display
   *                                                   - Number for numeric value
   * @returns {HTMLSpanElement} The count/value span element for later updates
   * @throws {TypeError} If zoneContainer is not an HTMLElement
   *
   * @example
   * const countSpan = ZoneInfoManager.createZoneItem(container, 'Core', 50);
   * // Renders: <div><span>Core : </span><span>50</span></div>
   */
  static createZoneItem (zoneContainer, labelTxt, bagOrText) {
    return this.#createZoneEntry(
      zoneContainer,
      labelTxt,
      bagOrText,
      'span',
      this.#DEFAULT_STYLES.ITEM
    )
  }

  /**
   * Creates a zone text entry with custom styling.
   * General-purpose zone entry factory allowing flexible styling and tags.
   * Useful for custom zone displays with specific formatting requirements.
   *
   * @static
   * @public
   * @param {HTMLElement} zoneContainer - Container element for appending the entry
   * @param {string} labelTxt - Label text to display before value
   * @param {string|number} text - Content text or numeric value to display
   * @param {string} stressTag - HTML tag for label emphasis ('b', 'span', 'strong', etc.)
   * @param {string} style - CSS style string to apply to entry (e.g., 'color:red;')
   * @returns {HTMLSpanElement} The count/value span element for later updates
   * @throws {TypeError} If zoneContainer is not an HTMLElement or stressTag is invalid
   *
   * @example
   * const span = ZoneInfoManager.createZoneTextEntry(
   *   container, 'Zone', 25, 'strong', 'color:blue;'
   * );
   */
  static createZoneTextEntry (zoneContainer, labelTxt, text, stressTag, style) {
    return this.#createZoneEntry(
      zoneContainer,
      labelTxt,
      text,
      stressTag,
      style
    )
  }

  /**
   * Creates a zone entry with displacement calculation for ships.
   * Combines ship displacement with optional extra displacement (air, mixed terrain).
   * Calculates tightness descriptor based on displacement ratio.
   *
   * Workflow:
   * 1. Call DisplacementCalculator.describeTightness() with ships and area
   * 2. Generate tightness description string (e.g., 'sparse', 'crowded')
   * 3. Create zone entry with tightness as display value
   *
   * @static
   * @public
   * @param {HTMLElement} zoneContainer - Container element for appending the entry
   * @param {string} labelTxt - Zone label (e.g., terrain name or 'Map')
   * @param {number} displacedArea - Total available displacement area in cells
   * @param {ShipObject[]} ships - Array of ship objects with shape() methods
   * @param {string} stressTag - HTML tag for label emphasis ('b', 'span', etc.)
   * @param {string} style - CSS style string to apply
   * @param {number} [extra=0] - Extra displacement to add (air, mixed terrain amounts)
   * @returns {HTMLSpanElement} The count/value span element (contains tightness string)
   * @throws {TypeError} If ships is not an array or ships lack shape() method
   *
   * @example
   * const span = ZoneInfoManager.createAddZoneEntry(
   *   container, 'Map', 600, allShips, 'b', 'line-height:1.2;'
   * );
   * // span.textContent will be tightness description like 'sparse' or 'crowded'
   */
  static createAddZoneEntry (
    zoneContainer,
    labelTxt,
    displacedArea,
    ships,
    stressTag,
    style,
    extra = 0
  ) {
    const tightness = DisplacementCalculator.describeTightness(
      ships,
      displacedArea,
      extra
    )
    return this.#createZoneEntry(
      zoneContainer,
      labelTxt,
      tightness,
      stressTag,
      style
    )
  }

  /**
   * Internal factory for creating zone entry DOM elements.
   * Constructs a div with styled label and span for value display.
   * Handles type conversion for various bagOrText formats.
   *
   * DOM Structure Created:
   * ```html
   * <div style="[style]">
   *   <[stressTag]>[labelTxt] : </[stressTag]>
   *   <span>[textValue]</span>
   * </div>
   * ```
   *
   * Type Handling:
   * - String: Used directly as text content
   * - Number: Converted to string via toString()
   * - Object with size property: Extracts numeric size property
   * - Other: Empty string fallback
   *
   * @static
   * @private
   * @param {HTMLElement} zoneContainer - Container element for appending
   * @param {string} labelTxt - Label text (before colon)
   * @param {ShapeWithSize|string|number} bagOrText - Value source with flexible types
   * @param {string} stressTag - HTML tag for label element
   * @param {string} style - Inline CSS style string for entry div
   * @returns {HTMLSpanElement} The count span element (contains text content)
   * @throws {TypeError} If zoneContainer is not an HTMLElement
   *
   * @example
   * const span = ZoneInfoManager.#createZoneEntry(
   *   container, 'Total', 150, 'b', 'font-weight:bold;'
   * );
   * // Returns span element with textContent '150'
   */
  static #createZoneEntry (
    zoneContainer,
    labelTxt,
    bagOrText,
    stressTag,
    style
  ) {
    const entry = document.createElement('div')
    entry.style.cssText = style

    const label = document.createElement(stressTag)
    label.textContent = labelTxt + ' : '
    entry.appendChild(label)

    const count = document.createElement('span')
    // Convert to string: handle shape objects with size, strings, or numbers
    let textValue = ''
    if (typeof bagOrText === 'string') {
      textValue = bagOrText
    } else if (typeof bagOrText === 'number') {
      textValue = bagOrText.toString()
    } else if (
      typeof bagOrText === 'object' &&
      'size' in /** @type {Object} */ (bagOrText)
    ) {
      const sizeValue = /** @type {any} */ (bagOrText).size
      if (typeof sizeValue === 'number') {
        textValue = sizeValue.toString()
      }
    }
    count.textContent = textValue
    entry.appendChild(count)

    zoneContainer.appendChild(entry)
    return count
  }
  /**
   * Clears zone container and initializes zone information display.
   * Sets up initial zone display structure with tracker data for later updates.
   * Populates zoneSync array with zone trackers for display synchronization.
   *
   * Workflow:
   * 1. Clear all existing content from container
   * 2. Call bh.map.subterrainTrackers.setupZoneInfo() to get zone entries
   * 3. Return zone array for use with displayZoneInfo() and hasZoneInfo()
   *
   * Zone Setup:
   * - Creates zone entries for each terrain type in the game
   * - Initializes trackers with current map state
   * - Creates HTML structure for zone display
   *
   * @static
   * @public
   * @param {HTMLElement} zoneContainer - Container element to clear and populate
   * @param {(labelTxt: string, bagOrText: ShapeWithSize|number) => HTMLSpanElement} titleCreator - Factory function for title creation
   * @param {(labelTxt: string, bagOrText: ShapeWithSize|number) => HTMLSpanElement} itemCreator - Factory function for item creation
   * @returns {ZoneEntry[]} Array of zone entries with trackers for display updates
   * @throws {TypeError} If zoneContainer is not an HTMLElement
   *
   * @example
   * const zoneSync = ZoneInfoManager.setupZoneInfo(
   *   container,
   *   (label, size) => ZoneInfoManager.createZoneTitle(container, label, size),
   *   (label, size) => ZoneInfoManager.createZoneItem(container, label, size)
   * );
   */
  static setupZoneInfo (zoneContainer, titleCreator, itemCreator) {
    zoneContainer.innerHTML = ''
    return bh.map.subterrainTrackers.setupZoneInfo(titleCreator, itemCreator)
  }

  /**
   * Updates zone display counts from current map state.
   * Recalculates each tracked zone and updates display elements.
   * Call this when map state changes to refresh all zone displays.
   *
   * Update Process:
   * 1. Iterate through all zone entries in array
   * 2. Call entry.tracker.recalc(map) to recalculate metrics
   * 3. Extract total, margin, core from entry.tracker.sizes
   * 4. Update corresponding HTML span elements with new values
   *
   * Span Order in entry.counts:
   * - [0]: Total size
   * - [1]: Margin size
   * - [2]: Core size
   *
   * @static
   * @public
   * @param {ZoneEntry[]} zoneSync - Zone entries array from setupZoneInfo()
   * @returns {void}
   * @throws {TypeError} If zoneSync is not an array or entries lack required properties
   *
   * @example
   * ZoneInfoManager.displayZoneInfo(zoneSync);
   * // Updates all zone count spans with current values
   */
  static displayZoneInfo (zoneSync) {
    const map = bh.map
    for (const entry of zoneSync) {
      entry.tracker.recalc(map)
      const { total, margin, core } = entry.tracker.sizes
      entry.counts[0].textContent = total.toString()
      entry.counts[1].textContent = margin.toString()
      entry.counts[2].textContent = core.toString()
    }
  }

  /**
   * Checks if any non-default zones contain tracked objects.
   * Determines whether there are active zones beyond the default zone.
   *
   * Logic:
   * 1. Exclude first zone (index 0, assumed default/primary zone)
   * 2. For remaining zones, recalculate and sum totalSize
   * 3. Return true if total size > 0
   *
   * Usage:
   * Used to conditionally show/hide zone UI when zones are empty vs. populated.
   *
   * @static
   * @public
   * @param {ZoneEntry[]} zoneSync - Zone entries array from setupZoneInfo()
   * @returns {boolean} True if any non-default zone has non-zero size, false otherwise
   * @throws {TypeError} If zoneSync is not an array or entries lack required properties
   *
   * @example
   * if (ZoneInfoManager.hasZoneInfo(zoneSync)) {
   *   zoneContainer.style.display = 'block';
   * } else {
   *   zoneContainer.style.display = 'none';
   * }
   */
  static hasZoneInfo (zoneSync) {
    const map = bh.map
    const nonDefaultZones = zoneSync.slice(1)
    return (
      nonDefaultZones.reduce((accumulator, entry) => {
        entry.tracker.recalc(map)
        return accumulator + entry.tracker.totalSize
      }, 0) > 0
    )
  }

  /**
   * Displays zone information with displacement area calculations.
   * Populates zone display with per-terrain displacement analysis.
   * Shows map-level displacement followed by per-subterrain breakdown.
   *
   * Display Flow:
   * 1. Clear container and get displaced area from model
   * 2. Add map-level entry (all terrain types combined)
   * 3. Calculate mixed-terrain and air contributions
   * 4. For each subterrain, display displacement entry with contributions
   *
   * Displacement Components:
   * - Regular ships: Counted per their subterrain
   * - Mixed-terrain ships: Fractional contribution to multiple terrains
   * - Air ships: Distributed across all terrains
   *
   * @static
   * @public
   * @param {HTMLElement} zoneContainer - Container element to clear and populate
   * @param {GameModel} model - Game model with ships and displacement calculation
   * @returns {void}
   * @throws {TypeError} If zoneContainer is not an HTMLElement or model lacks ships
   *
   * @example
   * ZoneInfoManager.displayAddZoneInfo(container, gameModel);
   * // Populates container with Map: sparse, Sea: sparse, Land: crowded, etc.
   */
  static displayAddZoneInfo (zoneContainer, model) {
    zoneContainer.innerHTML = ''
    const map = bh.map
    const displacedArea = model.calculateDisplacedArea()

    // Add map-level displacement entry
    this.createAddZoneEntry(
      zoneContainer,
      'Map',
      displacedArea,
      model.ships,
      'b',
      'line-height:1.2;'
    )

    // Calculate shared displacement amounts
    const mixedShapes = model.ships
      .map(s => s.shape())
      .filter(s => s.subterrain === mixed)
    const airAmount = DisplacementCalculator.calculateMixedTerrainAmount(
      model.ships.map(s => s.shape()).filter(s => s.subterrain === all)
    )

    // Display displacement for each subterrain
    map.subterrainTrackers.displayDisplacedArea(
      map,
      (subterrain, displacedArea) => {
        this.#displayDisplacementEntry(
          zoneContainer,
          mixedShapes,
          subterrain,
          displacedArea,
          model,
          airAmount
        )
      }
    )
  }

  /**
   * Displays displacement information for a specific subterrain.
   * Creates zone entry with displacement calculation including mixed-terrain contributions.
   * Called for each subterrain to populate displacement breakdown.
   *
   * Displacement Calculation:
   * 1. Calculate mixed-terrain contribution for this subterrain
   * 2. Sum air contribution (same for all terrains)
   * 3. Create zone entry with total extra displacement (mixed + air)
   *
   * @static
   * @private
   * @param {HTMLElement} zoneContainer - Container element for appending entry
   * @param {Object[]} mixedShapes - Array of shapes occupying mixed terrains
   * @param {Object} subterrain - The subterrain object with title property
   * @param {number} displacedArea - Available displacement area for this subterrain
   * @param {GameModel} model - Game model with ships
   * @param {number} airAmount - Air displacement contribution (constant across terrains)
   * @returns {HTMLSpanElement} The count span element containing tightness description
   * @throws {TypeError} If subterrain lacks required properties
   *
   * @example
   * // Called internally by displayAddZoneInfo for each terrain
   * const span = ZoneInfoManager.#displayDisplacementEntry(
   *   container, mixedShapes, seaSubterrain, 300, model, 25
   * );
   */
  static #displayDisplacementEntry (
    zoneContainer,
    mixedShapes,
    subterrain,
    displacedArea,
    model,
    airAmount
  ) {
    const mixedAmount = DisplacementCalculator.calculateMixedSubterrainAmount(
      mixedShapes,
      subterrain
    )

    return this.createAddZoneEntry(
      zoneContainer,
      subterrain.title,
      displacedArea,
      model.ships.filter(s => s.shape().subterrain === subterrain),
      'span',
      'line-height:1.2;',
      airAmount + mixedAmount
    )
  }
}
