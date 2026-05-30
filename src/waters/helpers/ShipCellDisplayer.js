import { addKeysToCell, coordsFromCell } from '../../core/utilities.js'
import { CellClassManager } from './CellClassManager.js'
import { bh } from '../../terrains/all/js/bh.js'

/**
 * @module waters/helpers/ShipCellDisplayer
 * Renders ship cells with weapon indicators, coloring, and game state visualization.
 *
 * @description
 * Centralizes all ship cell rendering logic including letter cells, armed weapon cells,
 * fog-of-war reveals, and sunk state visualization. Manages ship-specific styling (colors,
 * backgrounds) and weapon metadata for UI systems. Handles both placement-phase cells
 * (simple letter display) and combat-phase cells (weapon indicators with ammo).
 *
 * Rendering Contexts:
 * - **Placement Phase**: Ship letters with ship-specific colors on placement grid
 * - **Armed Combat**: Weapon indicators with ammo counters on game board
 * - **Sunk Visualization**: Sunk state indicators with conditional ship letters
 * - **Fog of War**: Partially revealed ship/weapon status for opponent perspective
 * - **Color Styling**: Ship-specific text and background colors from game theme
 *
 * Responsibilities:
 * - Render ship cells with appropriate content (letter or weapon icon)
 * - Apply ship-specific colors and background styling
 * - Manage weapon dataset attributes and metadata
 * - Display weapon area-of-effect surrounds with orientation
 * - Handle cell cleanup during placement and combat phases
 * - Support conditional rendering based on cell state and damage
 *
 * Design Pattern:
 * - Static utility class (no instantiation) with private helper hierarchy
 * - Clear separation: content rendering → data attributes → styling
 * - Encapsulation of game state access (bh global) in helper methods
 * - Delegates class management to CellClassManager for consistency
 */

/**
 * Maps ship letters to their display colors for visual identification.
 * Configuration object from game theme with letter-to-color mappings.
 *
 * @typedef {Object} ColorMaps
 * @property {Record<string, string>} shipLetterColors - Maps ship letters (A, B, C...) to text colors (hex/rgba)
 * @property {Record<string, string>} shipColors - Maps ship letters (A, B, C...) to background colors (hex/rgba)
 *
 * @example
 * // Example structure
 * {
 *   shipLetterColors: { A: '#000000', B: '#ffffff', ... },
 *   shipColors: { A: 'rgba(255,0,0,0.3)', B: 'rgba(0,255,0,0.3)', ... }
 * }
 */

/**
 * Represents a weapon system occupying a grid cell.
 * Contains weapon type, ammunition, and system identifier for targeting.
 *
 * @typedef {Object} WeaponSlot
 * @property {Weapon} weapon - The weapon object with letter and visual properties
 * @property {number} ammo - Remaining ammunition/energy in this weapon slot
 * @property {string|number} id - Unique identifier for this weapon system instance
 */

/**
 * Weapon definition with type and visual targeting information.
 * Represents weapon characteristics including icon and cursor styling.
 *
 * @typedef {Object} Weapon
 * @property {string} letter - Single-letter identifier for weapon type (M, P, S, etc.)
 * @property {string} [launchCursor] - Optional CSS class for targeting cursor visual feedback (e.g., 'laser-cursor', 'missile-cursor')
 */

/**
 * Callback function to retrieve a weapon slot at grid coordinates.
 * Used by ship objects to locate weapons in grid-based weapon placement systems.
 *
 * @callback RackAtCallback
 * @param {number} column - Grid column coordinate (0-based index)
 * @param {number} row - Grid row coordinate (0-based index)
 * @returns {WeaponSlot|null|undefined} Weapon slot at position or null if empty
 */

/**
 * Callback function to retrieve ship rotation/orientation at coordinates.
 * Used to determine weapon orientation class for visual rotation indicators.
 *
 * @callback GetTurnCallback
 * @param {number} row - Grid row coordinate (0-based index)
 * @param {number} column - Grid column coordinate (0-based index)
 * @returns {string|null|undefined} CSS class name for rotation (e.g., 'turn2', 'turn3', 'turn4') or null
 */

/**
 * Callback function to generate weapon key identifiers.
 * Used for weapon effect tracking and area-of-effect calculation.
 *
 * @callback MakeKeyIdsCallback
 * @returns {string} Pipe-separated string of key identifiers (e.g., 'key1|key2|key3')
 */

/**
 * Callback function to retrieve ship's primary/main weapon.
 * Used for cursor styling and orientation calculation on surrounding cells.
 *
 * @callback GetPrimaryWeaponCallback
 * @returns {Weapon|null|undefined} Primary weapon object with letter and optional launchCursor, or null
 */

/**
 * Ship object representing a combat vessel with positioning and weapons.
 * Contains identification, status, and callback methods for grid-based operations.
 *
 * @typedef {Object} Ship
 * @property {string|number} id - Unique ship identifier (e.g., 'friendly-1', 'enemy-2')
 * @property {string} letter - Single-letter ship identifier (A, B, C, D... up to ship count)
 * @property {number} variant - Ship type/variant number indicating hull class (1-5 typical)
 * @property {boolean} hasWeapon - Flag indicating whether ship has armed weapons available
 * @property {RackAtCallback} rackAt - Method: Gets weapon slot at specified grid position
 * @property {MakeKeyIdsCallback} makeKeyIds - Method: Generates weapon effect key identifiers (returns pipe-separated string)
 * @property {GetPrimaryWeaponCallback} getPrimaryWeapon - Method: Returns primary weapon for cursor/orientation display
 * @property {GetTurnCallback} getTurn - Method: Gets rotation/turn CSS class at specified position
 */

/**
 * Represents a cell position on the game grid.
 * Simple coordinate pair structure used throughout for position references.
 *
 * @typedef {Object} CellCoordinate
 * @property {number} row - Row index on grid (0-based)
 * @property {number} column - Column index on grid (0-based)
 */

/**
 * Manages display and rendering of ship cells with various visual states and transitions.
 *
 * Primary Responsibilities:
 * - Render ship cells with letter identifiers or weapon icons based on content
 * - Display armed weapons with ammo counters at specific grid positions
 * - Apply ship-specific styling (text colors, background colors) from game theme
 * - Show weapon area-of-effect indicators on surrounding cells
 * - Handle fog-of-war reveals showing partial ship information to opponent
 * - Support clean cell state transitions during placement and combat phases
 *
 * Cell Display Contexts:
 * 1. **Placement Phase**: Shows ship letter identifier with ship colors on placement grid
 * 2. **Armed Combat**: Shows weapon icons instead of letters at positions with weapons
 * 3. **Combat Board**: Displays both letter cells (empty) and weapon cells (occupied)
 * 4. **Sunk Visualization**: Applies sunk state with conditional letter display
 * 5. **Fog of War**: Reveals ship/weapon status from opponent's perspective
 * 6. **Weapon Surrounds**: Applies metadata and orientation to cells around weapons
 *
 * Design Pattern:
 * - Static utility class (no instantiation) centralizes all cell rendering logic
 * - Private helper hierarchy organized by concern (extraction, content, data, styling, DOM)
 * - Clear responsibility boundaries: rendering → data attributes → styling
 * - Delegates CSS class management to CellClassManager for consistency
 * - Encapsulates game state access (bh global) in focused helper methods
 *
 * Data Attribute Management:
 * - Ship attributes: id, letter, variant, primary letter (sletter)
 * - Weapon attributes: weapon letter, ammo, weapon ID, surround ship ID
 * - Metadata: key identifiers for effect tracking
 * - Coordinates: derived from cell DOM element position
 *
 * @class ShipCellDisplayer
 * @static
 *
 * @example
 * // Display a placed ship cell with colors
 * ShipCellDisplayer.displayPlacedCell(cell, ship, row, column);
 *
 * @example
 * // Display weapon cell with ammo counter
 * ShipCellDisplayer.displayArmedCell(cell, ship, weaponSlot, colorMaps);
 *
 * @example
 * // Display sunk ship indicator
 * ShipCellDisplayer.displayEnemySunkCell(cell, ship.letter);
 */
export class ShipCellDisplayer {
  /**
   * CSS class names used for styling and state management.
   * Immutable configuration object with hardcoded class identifiers.
   * Used by CellClassManager for consistent class application across all cells.
   *
   * @type {Readonly<Object<string, string>>}
   * @private
   * @static
   */
  static #CSS_CLASSES = {
    WEAPON: 'weapon',
    PLACED: 'placed',
    HIT: 'hit',
    SUNK: 'sunk'
  }

  /**
   * Default fallback colors when ship-specific styles are not available.
   * Used as last resort when colorMaps lookups fail.
   * Provides safe defaults to prevent rendering errors when color data is missing.
   *
   * @type {Readonly<Object<string, string>>}
   * @private
   * @static
   */
  static #DEFAULT_STYLES = {
    COLOR: '#fff',
    BACKGROUND: 'rgba(255,255,255,0.2)'
  }

  /**
   * Data attribute names for storing ship and weapon information on DOM elements.
   * Standardizes dataset key naming across all cell operations.
   * Keys map to dataset properties that store game state on HTML elements.
   *
   * @type {Readonly<Object<string, string>>}
   * @private
   * @static
   */
  static #DATA_ATTRIBUTES = {
    SHIP_ID: 'id',
    SHIP_LETTER: 'letter',
    SHIP_PRIMARY_LETTER: 'sletter',
    SHIP_VARIANT: 'variant',
    WEAPON_LETTER: 'wletter',
    WEAPON_AMMO: 'ammo',
    WEAPON_ID: 'wid',
    WEAPON_SURROUND: 'surround',
    WEAPON_KEY_IDS: 'keyIds'
  }

  // ──────────────────────────────────────────────────────────────────
  // PUBLIC API - Core Display Methods
  // ──────────────────────────────────────────────────────────────────

  /**
   * Displays a ship cell with appropriate content (weapon or letter) based on grid position.
   * Core private method orchestrating all cell rendering logic and state application.
   * Coordinates content selection, data attributes, styling, and weapon surrounds.
   *
   * Rendering Decision Tree:
   * 1. Get color maps from current game state (bh.maps)
   * 2. Check if weapon occupies this grid position via ship.rackAt(column, row)
   * 3. If weapon found: Render weapon cell (icon instead of letter)
   * 4. If empty: Render letter cell (ship identifier)
   * 5. In both cases: Apply ship dataset attributes and ship-specific colors
   * 6. If ship has weapons: Display surrounding weapon attributes (metadata, cursor, orientation)
   *
   * Cell Content & Data Flow:
   * - Letter cells: text = ship.letter, weapon dataset attributes omitted
   * - Weapon cells: text cleared, weapon CSS class added, weapon dataset attributes set
   * - Both: Ship data attributes applied (id, letter), color styling applied
   * - Surrounds: Weapon metadata (letter, ID, surrounds ID, keyIds, cursor, orientation) if hasWeapon
   *
   * @param {Ship} ship - Ship object with id, letter, rackAt(), hasWeapon, makeKeyIds(), getPrimaryWeapon(), getTurn() methods
   * @param {number} row - Row coordinate on ship's grid (0-based index, used for weapon lookup and turn calculation)
   * @param {number} column - Column coordinate on ship's grid (0-based index, used for weapon lookup and turn calculation)
   * @param {HTMLElement} cell - DOM element to render into (cell.textContent, cell.classList, cell.dataset will be modified)
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement or ship lacks required methods
   * @private
   * @static
   *
   * @example
   * // Internal use: Renders cell with weapon or letter based on what's at the position
   * ShipCellDisplayer.#displayShipCell(myShip, 3, 5, cellElement);
   */
  static #displayShipCell (ship, row, column, cell) {
    const colorMaps = this.#getColorMaps()
    const weaponSlot = this.#getWeaponSlotAt(ship, column, row)

    this.#displayCellContent(cell, ship, weaponSlot, colorMaps)
    this.displaySurroundAttributes(cell, ship, row, column)
  }

  /**
   * Displays a placed ship cell with ship letter, colors, and placement indicator.
   * Applies 'placed' CSS class to mark cell as occupied during placement phase.
   * Delegates to core display logic for content, data, and styling.
   *
   * Operation:
   * 1. Calls #displayShipCell() to render content, data attributes, and styling
   * 2. Adds 'placed' CSS class to indicate cell is part of ship placement
   *
   * Result: Cell shows ship letter with ship-specific colors and placement marker.
   *
   * @param {HTMLElement} cell - DOM element to render placement cell into (will add 'placed' class)
   * @param {Ship} ship - Ship object to display with id, letter, and grid methods
   * @param {number} row - Row coordinate on ship's grid (0-based index)
   * @param {number} column - Column coordinate on ship's grid (0-based index)
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement or ship lacks required properties
   * @public
   * @static
   *
   * @example
   * ShipCellDisplayer.displayPlacedCell(cellElement, friendlyShip, 2, 4);
   * // Cell now shows ship letter with colors and 'placed' class
   */
  static displayPlacedCell (cell, ship, row, column) {
    ///  CellClassManager.clearCell(cell)
    this.#displayShipCell(ship, row, column, cell)
    cell.classList.add(this.#CSS_CLASSES.PLACED)
  }

  /**
   * Displays a cell with the ship's letter identifier.
   * Used in placement and non-combat contexts where weapons are not rendered.
   * Sets ship data attributes, renders letter text, and applies ship-specific colors.
   *
   * Operation:
   * 1. Applies ship dataset attributes (id, letter) via #applyShipDatasetAttributes()
   * 2. Renders letter text content in cell
   * 3. Applies ship colors (text color from shipLetterColors, background from shipColors)
   *
   * Result: Cell displays ship letter with ship-specific coloring, no weapon content.
   *
   * @param {HTMLElement} cell - DOM element to update with ship letter and styling
   * @param {Ship} ship - Ship object with id and letter properties
   * @param {ColorMaps} colorMaps - Color mapping configuration with shipLetterColors and shipColors lookup tables
   * @returns {void}
   * @throws {TypeError} If cell is not an HTMLElement or colorMaps lacks required structure
   * @public
   * @static
   *
   * @example
   * ShipCellDisplayer.displayLetterCell(cell, ship, colorMaps);
   * // Cell shows ship.letter with colors from colorMaps
   */
  static displayLetterCell (cell, ship, colorMaps) {
    const letter = this.#applyShipDatasetAttributes(cell, ship)
    this.#renderLetterCell(cell, letter)
    this.#applyShipStyles(cell, letter, colorMaps)
  }

  /**
   * Displays a cell containing an armed weapon with ammo information.
   * Shows weapon icon instead of ship letter, styled with ship-specific colors.
   * Combines ship dataset, weapon dataset, weapon visual state, and ship colors.
   *
   * Operation:
   * 1. Applies both ship and weapon dataset attributes
   * 2. Clears text content (weapon shown as icon via CSS)
   * 3. Adds 'weapon' CSS class for icon styling
   * 4. Applies ship colors (text color and background)
   *
   * Result: Cell displays weapon icon with ammo data, styled in ship colors.
   * Ammo count and weapon ID available in dataset for external display logic.
   *
   * @param {HTMLElement} cell - DOM element to update with weapon display and metadata
   * @param {Ship} ship - Ship object with id and letter properties for dataset
   * @param {WeaponSlot} weaponSlot - Weapon slot containing weapon (letter, launchCursor), ammo, and id
   * @param {ColorMaps} colorMaps - Color mapping with shipLetterColors and shipColors for styling
   * @returns {void}
   * @throws {TypeError} If cell is not an HTMLElement or weaponSlot lacks required properties
   * @public
   * @static
   *
   * @example
   * ShipCellDisplayer.displayArmedCell(cell, ship, { weapon: missileWeapon, ammo: 3, id: 'w-1' }, colorMaps);
   * // Cell shows weapon icon with ammo=3 in dataset, ship colors applied
   */
  static displayArmedCell (cell, ship, weaponSlot, colorMaps) {
    this.#displayCellContent(cell, ship, weaponSlot, colorMaps)
  }

  /**
   * Displays weapon area-of-effect indicators on surrounding cells.
   * Applies weapon metadata (letter, ID, surrounds), orientation classes, and cursor styling.
   * Only executed if ship has armed weapons (ship.hasWeapon === true).
   *
   * Operation (if hasWeapon is true):
   * 1. Calls #setSurroundAttributes() to apply weapon metadata and orientation
   * 2. Sets surround indicator data attributes (weapon letter, weapon ID, surround ship ID)
   * 3. Applies turn/rotation CSS class based on position
   * 4. Applies cursor styling if primary weapon has launchCursor
   * 5. Adds weapon key identifiers for effect tracking
   *
   * No-op if ship.hasWeapon is false or null to avoid unnecessary DOM manipulation.
   *
   * Used for: Showing weapon effective range, orientation indicators, cursor styling on cells
   * adjacent to weapon positions.
   *
   * @param {HTMLElement} cell - DOM element to annotate with weapon surround attributes
   * @param {Ship} ship - Ship object with id, hasWeapon flag, makeKeyIds(), getPrimaryWeapon(), and getTurn() methods
   * @param {number} row - Row coordinate for turn/orientation calculation (passed to getTurn())
   * @param {number} column - Column coordinate for turn/orientation calculation (passed to getTurn())
   * @returns {void}
   * @throws {TypeError} If cell is not an HTMLElement or ship lacks required methods
   * @public
   * @static
   *
   * @example
   * // Apply weapon surround indicators if ship has weapons
   * ShipCellDisplayer.displaySurroundAttributes(cell, ship, 3, 5);
   * // Cell now has weapon dataset attributes and turn class if applicable
   */
  static displaySurroundAttributes (cell, ship, row, column) {
    if (!this.#hasWeapons(ship)) return
    this.#setSurroundAttributes(cell, ship, row, column)
  }

  /**
   * Updates a cell's colors without changing other display properties.
   * Convenience wrapper that applies ship styling using current game color maps.
   * Used when only color needs to change after initial rendering (e.g., sunk state).
   *
   * Operation:
   * 1. Gets current color maps from bh.maps
   * 2. Looks up text color in shipLetterColors[letter]
   * 3. Looks up background color in shipColors[letter]
   * 4. Applies inline styles (fallback to defaults if not found)
   *
   * @param {HTMLElement} cell - DOM element to update with new ship colors
   * @param {string} letter - Ship letter for color map lookup (e.g., 'A', 'B', 'C')
   * @returns {void}
   * @throws {TypeError} If cell is not an HTMLElement
   * @public
   * @static
   *
   * @example
   * ShipCellDisplayer.setShipCellColors(cell, 'A'); // Updates cell colors for ship A
   */
  static setShipCellColors (cell, letter) {
    const colorMaps = this.#getColorMaps()
    this.#applyShipStyles(cell, letter, colorMaps)
  }

  /**
   * Displays a cell as sunk with appropriate visual indicators.
   * Applies sunk state class, updates ship colors, and conditionally shows ship letter.
   * Letter is hidden if cell has damage indicators (burnt, damaged, skull classes).
   *
   * Operation:
   * 1. Calls CellClassManager.applyEnemySunkCellState() to apply sunk visual class
   * 2. Updates cell colors using setShipCellColors() for sunk ship color scheme
   * 3. Conditionally shows ship letter if no damage class is present
   *
   * Result: Cell displays sunk state with optional letter, colored appropriately.
   * Damage indicators take visual precedence over ship letter display.
   *
   * @param {HTMLElement} cell - DOM element to update with sunk state visual indicators
   * @param {string} letter - Ship letter for color lookup and conditional text display
   * @returns {void}
   * @throws {TypeError} If cell is not an HTMLElement
   * @public
   * @static
   *
   * @example
   * ShipCellDisplayer.displayEnemySunkCell(cell, 'B'); // Shows sunk B ship, letter only if no damage
   */
  static displayEnemySunkCell (cell, letter) {
    CellClassManager.applyEnemySunkCellState(cell)
    this.setShipCellColors(cell, letter)
    this.#setLetterIfNotDamaged(cell, letter)
  }

  /**
   * Displays a revealed cell in fog-of-war scenarios.
   * Shows ship letter or weapon indicator based on grid position content.
   * Used when opponent ships become partially visible during gameplay.
   * Safe to call with null cell (early return if null).
   *
   * Operation:
   * 1. Returns early if cell is null (graceful no-op)
   * 2. Gets cell coordinates via coordsFromCell(cell)
   * 3. Checks for weapon at position via ship.rackAt(column, row)
   * 4. Displays weapon cell or letter cell accordingly (without weapon visuals for fog-of-war)
   * 5. Applies ship colors for visual identification
   *
   * Fog-of-War Behavior: Weapon cells shown without 'weapon' CSS class (only data attributes)
   * to prevent exposing weapon count or placement through CSS styling.
   *
   * @param {HTMLElement|null} cell - DOM element to update (returns if null for safety)
   * @param {Ship} ship - Ship object with id, letter, and rackAt() method
   * @param {ColorMaps} colorMaps - Color mapping with shipLetterColors and shipColors
   * @returns {void}
   * @throws {TypeError} If cell is HTMLElement but lacks required properties, or ship lacks rackAt()
   * @public
   * @static
   *
   * @example
   * ShipCellDisplayer.displayAsRevealed(cell, enemyShip, colorMaps); // Shows partial info in fog-of-war
   * ShipCellDisplayer.displayAsRevealed(null, enemyShip, colorMaps); // No-op, safe
   */
  static displayAsRevealed (cell, ship, colorMaps) {
    if (!cell) return

    const [row, column] = coordsFromCell(cell)
    const weaponSlot = this.#getWeaponSlotAt(ship, column, row)

    this.#displayCellContent(cell, ship, weaponSlot, colorMaps, false)
  }

  // ──────────────────────────────────────────────────────────────────
  // PUBLIC API - Cell Cleanup Methods
  // ──────────────────────────────────────────────────────────────────

  /**
   * Clears all visual state from a placement cell comprehensively.
   * Removes text content, inline styles, dataset attributes (except coordinates), and CSS classes.
   * Delegates to CellClassManager for class cleanup and coordinate preservation.
   * Leaves DOM element structure intact for re-initialization in placement phase.
   *
   * Operation:
   * 1. Calls #clearCellTextAndStyle() to remove text and inline styles
   * 2. Calls CellClassManager.clearPlaceCell() to remove classes and non-coordinate dataset attributes
   *
   * Result: Cell returned to clean state for new ship placement while preserving grid position (r, c).
   *
   * @param {HTMLElement} cell - DOM element to clear of all placement visual state
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement
   * @public
   * @static
   *
   * @example
   * ShipCellDisplayer.clearPlaceCell(cell); // Reset for new ship placement
   */
  static clearPlaceCell (cell) {
    this.#clearCellTextAndStyle(cell)
    CellClassManager.clearPlaceCell(cell)
  }

  /**
   * Clears cell visual details based on specified scope.
   * Provides flexible clearing strategy for different contexts (targeted cleanup).
   *
   * Clearing Strategies:
   * - 'content': Clears only text content (preserves styles and data)
   * - 'all': Clears text and inline styles (preserves dataset and classes)
   * - 'none' or other: No clearing performed (validation/noop)
   *
   * Used when partial cleanup is needed without full cell reset.
   * For comprehensive placement phase reset, use clearPlaceCell() instead.
   *
   * @param {HTMLElement} cell - DOM element to update
   * @param {'none'|'content'|'all'} details - Clearing scope indicator
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement
   * @public
   * @static
   *
   * @example
   * ShipCellDisplayer.clearDetails(cell, 'content'); // Remove text only
   * ShipCellDisplayer.clearDetails(cell, 'all'); // Remove text and styles
   */
  static clearDetails (cell, details) {
    if (details === 'content') {
      this.#clearCellText(cell)
    } else if (details === 'all') {
      this.#clearCellTextAndStyle(cell)
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS - Core Extraction & Content Management
  // ──────────────────────────────────────────────────────────────────

  /**
   * Retrieves the color maps from the game hierarchy.
   * Centralizes color map access for consistency and easier testing.
   * Extracted to reduce coupling with bh global and enable optimization.
   * Returns reference from current game state without caching.
   *
   * @returns {ColorMaps} Color map object with shipLetterColors and shipColors properties
   * @private
   * @static
   */
  static #getColorMaps () {
    return bh.maps
  }

  /**
   * Retrieves weapon slot at specified grid position if one exists.
   * Encapsulates weapon location logic and null coalescing pattern.
   * Extracted to eliminate duplicated weapon retrieval code.
   * Returns null/undefined if ship is falsy or has no rackAt method.
   *
   * @param {Ship|null|undefined} ship - Ship object with rackAt() method
   * @param {number} column - Column coordinate for weapon lookup
   * @param {number} row - Row coordinate for weapon lookup
   * @returns {WeaponSlot|null|undefined} Weapon slot object if found, null/undefined otherwise
   * @private
   * @static
   */
  static #getWeaponSlotAt (ship, column, row) {
    return ship?.rackAt?.(column, row)
  }

  /**
   * Displays cell content (weapon or ship letter) based on what occupies the position.
   * Consolidates the weapon vs letter display decision logic.
   * Extracted pattern: checks for weapon presence then displays accordingly.
   * Applies ship dataset attributes and styles in all cases.
   *
   * @param {HTMLElement} cell - DOM element to display content into
   * @param {Ship} ship - Ship object for base attributes and letter
   * @param {WeaponSlot|null|undefined} weaponSlot - Weapon slot at cell position, null if empty
   * @param {ColorMaps} colorMaps - Color mapping configuration
   * @param {boolean} [includeWeaponVisuals=true] - Whether to apply weapon-specific visual state (clears text, adds weapon class)
   * @returns {void}
   * @private
   * @static
   */
  static #displayCellContent (
    cell,
    ship,
    weaponSlot,
    colorMaps,
    includeWeaponVisuals = true
  ) {
    const letter = this.#applyShipDatasetAttributes(cell, ship)

    if (weaponSlot) {
      this.#renderWeaponCell(cell, weaponSlot, includeWeaponVisuals)
    } else {
      this.#renderLetterCell(cell, letter)
    }

    this.#applyShipStyles(cell, letter, colorMaps)
  }

  /**
   * Renders a letter cell for a ship position.
   * Simple utility that sets textContent to the provided letter.
   * Does not apply styling or dataset attributes (handled by caller).
   *
   * @param {HTMLElement} cell - DOM element to render into
   * @param {string} letter - Ship letter to display
   * @returns {void}
   * @private
   * @static
   */
  static #renderLetterCell (cell, letter) {
    cell.textContent = letter
  }

  /**
   * Renders a weapon cell with optional weapon visuals.
   * Sets weapon dataset attributes and conditionally applies weapon visual styling.
   * Delegates to #applyWeaponVisuals if visual effects are requested.
   *
   * @param {HTMLElement} cell - DOM element to render into
   * @param {WeaponSlot} weaponSlot - Weapon slot containing weapon and ammo data
   * @param {boolean} includeWeaponVisuals - Whether to apply weapon visual state (clear text, add class)
   * @returns {void}
   * @private
   * @static
   */
  static #renderWeaponCell (cell, weaponSlot, includeWeaponVisuals) {
    this.#setWeaponDataset(cell, weaponSlot)
    if (includeWeaponVisuals) {
      this.#applyWeaponVisuals(cell)
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS - Data Attribute Setup
  // ──────────────────────────────────────────────────────────────────

  /**
   * Extracts the letter identifier from a ship, defaulting to '-' if absent.
   * Safe accessor that handles null/undefined ship objects gracefully.
   * Used throughout to provide consistent fallback for missing data.
   *
   * @param {Ship|null|undefined} ship - Ship object with optional letter property
   * @returns {string} The ship's letter or '-' as fallback placeholder
   * @private
   * @static
   */
  static #getShipLetter (ship) {
    return ship?.letter || '-'
  }

  /**
   * Sets fundamental ship data attributes (id, letter) on a cell.
   * Applied as first step by all display methods for consistent initialization.
   * Extracts letter for convenience in method chaining patterns.
   *
   * @param {HTMLElement} cell - DOM element to annotate with ship data
   * @param {Ship|null|undefined} ship - Ship object containing id and letter
   * @returns {string} The ship letter (extracted for convenience in chaining)
   * @private
   * @static
   */
  static #applyShipDatasetAttributes (cell, ship) {
    const letter = this.#getShipLetter(ship)
    this.#setDatasetAttribute(cell, this.#DATA_ATTRIBUTES.SHIP_ID, ship?.id)
    this.#setDatasetAttribute(cell, this.#DATA_ATTRIBUTES.SHIP_LETTER, letter)
    return letter
  }

  /**
   * Sets weapon-specific dataset attributes on a cell.
   * Applied when cell should display weapon information (ammo, type, id).
   * Used by armed cell display and fog-of-war reveal methods.
   * Delegates to #setDatasetAttribute for each weapon property.
   *
   * @param {HTMLElement} cell - DOM element to update
   * @param {WeaponSlot} weaponSlot - Weapon slot object with weapon, ammo, and id properties
   * @returns {void}
   * @private
   * @static
   */
  static #setWeaponDataset (cell, weaponSlot) {
    this.#setDatasetAttribute(
      cell,
      this.#DATA_ATTRIBUTES.WEAPON_LETTER,
      weaponSlot.weapon.letter
    )
    this.#setDatasetAttribute(
      cell,
      this.#DATA_ATTRIBUTES.WEAPON_AMMO,
      weaponSlot.ammo
    )
    this.#setDatasetAttribute(
      cell,
      this.#DATA_ATTRIBUTES.WEAPON_ID,
      weaponSlot.id
    )
  }

  /**
   * Sets a dataset attribute on a cell element.
   * Safely handles null/undefined values by skipping assignment.
   * Converts all values to strings for HTML dataset compatibility.
   *
   * @param {HTMLElement} cell - DOM element to update
   * @param {string} key - Dataset key to set
   * @param {string|number|undefined|null} value - Value to assign, cast to string
   * @returns {void}
   * @private
   * @static
   */
  static #setDatasetAttribute (cell, key, value) {
    if (value != null) {
      cell.dataset[key] = String(value)
    }
  }

  /**
   * Initializes ship data on a cell.
   * Sets ship primary letter and variant properties for later reference.
   * Used in weapon surround display to store ship metadata.
   *
   * @param {HTMLElement} cell - DOM element to annotate
   * @param {Ship} ship - Ship object containing letter and variant
   * @returns {void}
   * @private
   * @static
   */
  static #applyShipMetadata (cell, ship) {
    const shipLetterKey = this.#DATA_ATTRIBUTES.SHIP_PRIMARY_LETTER
    const letter = this.#getShipLetter(ship)
    this.#setDatasetAttribute(cell, shipLetterKey, letter)
    this.#setDatasetAttribute(
      cell,
      this.#DATA_ATTRIBUTES.SHIP_VARIANT,
      ship?.variant
    )
  }

  /**
   * Applies weapon metadata and orientation classes on a cell.
   * Sets weapon letter, ship surround identifier, and applies rotation/cursor styling.
   * Manages weapon rotation indicators and cursor styling based on primary weapon.
   * Orchestrates cursor class and orientation class application.
   *
   * @param {HTMLElement} cell - DOM element to annotate with weapon orientation
   * @param {Ship} ship - Ship object with getPrimaryWeapon() and getTurn() methods
   * @param {number} row - Row coordinate for turn/rotation calculation
   * @param {number} column - Column coordinate for turn/rotation calculation
   * @returns {void}
   * @private
   * @static
   */
  static #applyWeaponMetadata (cell, ship, row, column) {
    const weaponLetterKey = this.#DATA_ATTRIBUTES.WEAPON_LETTER
    const primaryWeapon = ship?.getPrimaryWeapon?.()
    this.#setDatasetAttribute(cell, weaponLetterKey, primaryWeapon?.letter)
    this.#setDatasetAttribute(
      cell,
      this.#DATA_ATTRIBUTES.WEAPON_SURROUND,
      ship?.id
    )
    this.#applyWeaponCursorStyles(cell, ship, row, column, primaryWeapon)
  }

  /**
   * Applies cursor and orientation styling for the ship's primary weapon.
   * Checks if weapon has launchCursor, then applies cursor and orientation classes.
   *
   * @param {HTMLElement} cell - DOM element to update
   * @param {Ship} ship - Ship object
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @param {Weapon|null|undefined} primaryWeapon - Primary weapon object or null
   * @returns {void}
   * @private
   * @static
   */
  static #applyWeaponCursorStyles (cell, ship, row, column, primaryWeapon) {
    const cursorClass = primaryWeapon?.launchCursor
    if (!cursorClass) return

    this.#applyWeaponCursorClass(cell, cursorClass)
    this.#applyWeaponOrientationClass(cell, ship, row, column)
  }

  /**
   * Applies weapon cursor styling class to a cell.
   * Clears existing weapon classes and applies the cursor class.
   * Used to show different visual feedback for different weapon types.
   *
   * @param {HTMLElement} cell - DOM element to update
   * @param {string} cursorClass - CSS class for cursor styling
   * @returns {void}
   * @private
   * @static
   */
  static #applyWeaponCursorClass (cell, cursorClass) {
    CellClassManager.clearCellClasses(cell, [
      CellClassManager.CELL_CLASSES.weaponStatus
    ])
    cell.classList.add(cursorClass)
  }

  /**
   * Applies weapon orientation (turn) class to a cell.
   * Clears existing orientation classes and applies the turn class if available.
   * Handles null/undefined turn values gracefully by skipping class application.
   *
   * @param {HTMLElement} cell - DOM element to update
   * @param {Ship} ship - Ship object with getTurn() method
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @returns {void}
   * @private
   * @static
   */
  static #applyWeaponOrientationClass (cell, ship, row, column) {
    CellClassManager.clearCellClasses(cell, [
      CellClassManager.CELL_CLASSES.orientation
    ])

    const turn = ship?.getTurn?.(row, column) ?? null
    if (turn) {
      cell.classList.add(turn)
    }
  }

  /**
   * Sets weapon area-of-effect attributes and key identifiers on a cell.
   * Only applied if ship has armed weapons.
   * Orchestrates initialization of ship and weapon data, then adds key identifiers.
   * Final step in weapon surround display setup.
   *
   * @param {HTMLElement} cell - DOM element to update with weapon attributes
   * @param {Ship} ship - Ship object with makeKeyIds(), weapons, and getTurn() method
   * @param {number} row - Row coordinate for key ID and turn calculations
   * @param {number} column - Column coordinate for key ID and turn calculations
   * @returns {void}
   * @private
   * @static
   */
  static #setSurroundAttributes (cell, ship, row, column) {
    this.#applyShipMetadata(cell, ship)
    this.#applyWeaponMetadata(cell, ship, row, column)

    const keyIds = ship.makeKeyIds()
    addKeysToCell(cell, this.#DATA_ATTRIBUTES.WEAPON_KEY_IDS, keyIds.split('|'))
  }

  // ──────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS - Styling & Visual State
  // ──────────────────────────────────────────────────────────────────

  /**
   * Applies ship-specific color and background styling to a cell.
   * Looks up colors from colorMaps with graceful fallback to default styles.
   * Separates style application from data setup for clear single responsibility.
   * Used in all cell rendering paths to ensure consistent ship coloring.
   *
   * @param {HTMLElement} cell - DOM element to style with ship colors
   * @param {string} letter - Ship letter used as key for color map lookup
   * @param {ColorMaps} colorMaps - Color mapping configuration with shipLetterColors and shipColors
   * @returns {void}
   * @private
   * @static
   */
  static #applyShipStyles (cell, letter, colorMaps) {
    const textColor =
      colorMaps.shipLetterColors[letter] || this.#DEFAULT_STYLES.COLOR
    const backgroundColor =
      colorMaps.shipColors[letter] || this.#DEFAULT_STYLES.BACKGROUND

    cell.style.color = textColor
    cell.style.background = backgroundColor
  }

  /**
   * Applies weapon visual state to a cell.
   * Clears text content and adds weapon CSS class indicator for styling.
   * Called when a cell should display weapon appearance rather than text.
   * Transforms cell from text-based to icon-based visual representation.
   *
   * @param {HTMLElement} cell - DOM element to update with weapon visual state
   * @returns {void}
   * @private
   * @static
   */
  static #applyWeaponVisuals (cell) {
    this.#clearCellText(cell)
    cell.classList.add(this.#CSS_CLASSES.WEAPON)
  }

  /**
   * Checks if a ship has armed weapons available for display.
   * Encapsulates the hasWeapon property check with null-coalescing.
   * Used to decide whether to apply weapon surround attributes.
   *
   * @param {Ship|null|undefined} ship - Ship object with hasWeapon property
   * @returns {boolean} True if ship has at least one armed weapon, false otherwise
   * @private
   * @static
   */
  static #hasWeapons (ship) {
    return ship?.hasWeapon ?? false
  }

  // ──────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS - DOM Element Manipulation
  // ──────────────────────────────────────────────────────────────────

  /**
   * Clears text content from a cell element.
   * Sets textContent to empty string, removing any displayed character or symbol.
   * Preserves dataset attributes and inline styles.
   *
   * @param {HTMLElement} cell - DOM element to clear of text
   * @returns {void}
   * @private
   * @static
   */
  static #clearCellText (cell) {
    cell.textContent = ''
  }

  /**
   * Resets inline style properties on a cell element.
   * Clears background and color styles set by game logic, removing ship styling.
   * Does not affect dataset attributes or textContent.
   *
   * @param {HTMLElement} cell - DOM element to reset styling on
   * @returns {void}
   * @private
   * @static
   */
  static #resetCellStyle (cell) {
    cell.style.background = ''
    cell.style.color = ''
  }

  /**
   * Clears both text content and inline styles from a cell.
   * Convenience method combining text and style reset operations.
   * Used when preparing a cell for complete re-initialization.
   * Dataset attributes are preserved for later reference.
   *
   * @param {HTMLElement} cell - DOM element to clear completely
   * @returns {void}
   * @private
   * @static
   */
  static #clearCellTextAndStyle (cell) {
    this.#clearCellText(cell)
    this.#resetCellStyle(cell)
  }

  /**
   * Sets text content to ship letter when cell is not damaged.
   * Displays letter for visual reference unless damage indicators obscure it.
   * Helper for sunk cell display to avoid showing text under damage overlays.
   * Checks for damage class before setting text.
   *
   * @param {HTMLElement} cell - DOM element to conditionally update
   * @param {string} letter - Ship letter to display if cell has no damage class
   * @returns {void}
   * @private
   * @static
   */
  static #setLetterIfNotDamaged (cell, letter) {
    if (
      !CellClassManager.hasClass(cell, CellClassManager.CELL_CLASSES.damage)
    ) {
      cell.textContent = letter
    }
  }
}
