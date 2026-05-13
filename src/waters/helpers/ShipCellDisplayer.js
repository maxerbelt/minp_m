import { addKeyToCell, coordsFromCell } from '../../core/utilities.js'
import { CellClassManager } from './CellClassManager.js'
import { bh } from '../../terrains/all/js/bh.js'

/**
 * @typedef {Object} ColorMaps
 * @property {Object<string, string>} shipLetterColors
 * @property {Object<string, string>} shipColors
 */

/**
 * @typedef {Object} WeaponSlot
 * @property {Object} weapon
 * @property {string} weapon.letter
 * @property {number} ammo
 * @property {string|number} id
 */

/**
 * @typedef {Object} Weapon
 * @property {string} letter
 * @property {string} [launchCursor]
 */

/**
 * @typedef {Object} Ship
 * @property {string|number} id
 * @property {string} letter
 * @property {number} variant
 * @property {boolean} hasWeapon
 * @property {function(number, number): WeaponSlot} rackAt
 * @property {function(): Array<string>} makeKeyIds
 * @property {function(): Weapon} getPrimaryWeapon
 * @property {function(number, number): string} getTurn
 */

/**
 * Manages the display of ship cells with various visual states.
 *
 * Responsibilities:
 * - Render ship cells with letter identifiers
 * - Display armed weapons with ammo indicators
 * - Apply ship-specific styling (colors and backgrounds)
 * - Show weapon area-of-effect indicators
 * - Handle fog-of-war revealed cell display
 *
 * Cell Display Contexts:
 * - **Placement Phase**: Shows ship letter only with ship colors
 * - **Armed Combat**: Shows weapons at specific grid positions with ammo counters
 * - **Sunk State**: Displays sunk indicator with conditional ship letter based on damage
 * - **Fog of War**: Shows revealed ship/weapon status to opponent
 *
 * Design: Static utility class (no instantiation) provides centralized ship cell
 * rendering logic, preventing duplication across UI modules.
 *
 * @class ShipCellDisplayer
 */
export class ShipCellDisplayer {
  /**
   * CSS class names used for styling and state management.
   * @type {Object<string, string>}
   * @private
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
   * @type {Object<string, string>}
   * @private
   */
  static #DEFAULT_STYLES = {
    COLOR: '#fff',
    BACKGROUND: 'rgba(255,255,255,0.2)'
  }

  /**
   * Data attribute names for storing ship and weapon information on DOM elements.
   * Standardizes dataset key naming across all cell operations.
   * @type {Object<string, string>}
   * @private
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
   * Displays a ship cell with appropriate content (weapon or letter) based on position.
   * Primary public method that orchestrates all cell rendering logic.
   * Retrieves weapon at position and delegates to letter or armed cell display.
   *
   * Decision tree:
   * 1. Check if weapon occupies this position
   * 2. If yes: Display armed cell (weapon + ammo)
   * 3. If no: Display letter cell (ship identifier)
   * 4. In both cases: Display surrounding weapon attributes if ship has weapons
   *
   * @param {Ship} ship - Ship object to display with id, letter, rackAt(), hasWeapon, and makeKeyIds() methods
   * @param {number} row - Row coordinate on ship's grid (0-based index)
   * @param {number} column - Column coordinate on ship's grid (0-based index)
   * @param {HTMLDivElement} cell - DOM element to render into
   * @returns {void}
   */
  static #displayShipCell (ship, row, column, cell) {
    const colorMaps = this.#getColorMaps()
    const weaponSlot = this.#getWeaponSlotAt(ship, column, row)

    this.#displayCellContent(cell, ship, weaponSlot, colorMaps)
    this.displaySurroundAttributes(cell, ship, row, column)
  }

  /**
   * Displays a placed ship cell with the proper letter, coloring, and placement state.
   * @param {HTMLDivElement} cell
   * @param {Ship} ship
   * @param {number} row
   * @param {number} column
   */
  static displayPlacedCell (cell, ship, row, column) {
    CellClassManager.clearCell(cell)
    this.#displayShipCell(ship, row, column, cell)
    cell.classList.add(this.#CSS_CLASSES.PLACED)
  }

  /**
   * Displays a cell with the ship's letter identifier.
   * Used in placement and non-combat scenarios where weapons are not shown.
   *
   * @param {HTMLDivElement} cell - DOM element to update with ship letter
   * @param {Ship} ship - Ship object with id, letter properties
   * @param {ColorMaps} colorMaps - Color mapping configuration with shipLetterColors and shipColors
   * @returns {void}
   */
  static displayLetterCell (cell, ship, colorMaps) {
    const letter = this.#setBaseAttributes(cell, ship)
    cell.textContent = letter
    this.#applyShipStyles(cell, letter, colorMaps)
  }

  /**
   * Displays a cell containing an armed weapon with ammo indicator.
   * Shows weapon icon instead of ship letter, with ship-specific styling.
   * Combines: ship base data + weapon dataset + visual state + ship colors.
   *
   * @param {HTMLDivElement} cell - DOM element to update with weapon display
   * @param {Ship} ship - Ship object with id, letter properties
   * @param {WeaponSlot} weaponSlot - Weapon slot object containing weapon, ammo, and id properties
   * @param {ColorMaps} colorMaps - Color mapping configuration with shipLetterColors and shipColors
   * @returns {void}
   */
  static displayArmedCell (cell, ship, weaponSlot, colorMaps) {
    const letter = this.#setBaseAttributes(cell, ship)
    this.#setWeaponDataset(cell, weaponSlot)
    this.#applyWeaponVisuals(cell)
    this.#applyShipStyles(cell, letter, colorMaps)
  }

  /**
   * Displays weapon area-of-effect indicators on surrounding cells.
   * Only applied if ship has armed weapons. Sets weapon-related attributes
   * and orientation indicators for the weapon's effective radius.
   *
   * @param {HTMLDivElement} cell - DOM element to annotate with weapon surrounds
   * @param {Ship} ship - Ship object with id, hasWeapon, weapons, makeKeyIds(), and getTurn() methods
   * @param {number} row - Row coordinate for rotation/turn calculation
   * @param {number} column - Column coordinate for rotation/turn calculation
   * @returns {void}
   */
  static displaySurroundAttributes (cell, ship, row, column) {
    if (!this.#hasWeapons(ship)) return
    this.#setSurroundAttributes(cell, ship, row, column)
  }

  /**
   * Updates a cell's colors without changing other display properties.
   * Convenience wrapper that applies ship styling using current game color maps.
   * Used when only color needs to change after initial rendering.
   *
   * @param {HTMLDivElement} cell - DOM element to update with new colors
   * @param {string} letter - Ship letter for color map lookup
   * @returns {void}
   */
  static setShipCellColors (cell, letter) {
    const colorMaps = this.#getColorMaps()
    this.#applyShipStyles(cell, letter, colorMaps)
  }

  /**
   * Displays a cell as sunk with appropriate visual indicators.
   * Applies sunk state class, updates colors, and conditionally shows ship letter.
   * Text is hidden if cell has damage indicators, otherwise displays letter.
   *
   * @param {HTMLElement} cell - DOM element to update with sunk state visual
   * @param {string} letter - Ship letter for color lookup and potential display
   * @returns {void}
   */
  static displayEnemySunkCell (cell, letter) {
    CellClassManager.applyEnemySunkCellState(cell)
    this.setShipCellColors(cell, letter)
    this.#setLetterIfNotDamaged(cell, letter)
  }

  /**
   * Displays a revealed cell in fog-of-war scenarios.
   * Shows ship letter or weapon indicator based on what occupies the position.
   * Used when enemy ships become partially visible during gameplay.
   *
   * @param {HTMLDivElement|null} cell - DOM element to update (returns early if null)
   * @param {Ship} ship - Ship object with id, letter, and rackAt() method
   * @param {ColorMaps} colorMaps - Color mapping configuration with shipLetterColors and shipColors
   * @returns {void}
   */
  static displayAsRevealed (cell, ship, colorMaps) {
    if (!cell) return

    const letter = this.#getShipLetter(ship)
    this.#applyShipStyles(cell, letter, colorMaps)

    const [row, column] = coordsFromCell(cell)
    const weaponSlot = this.#getWeaponSlotAt(ship, column, row)

    this.#displayCellContent(cell, ship, weaponSlot, colorMaps, false)
  }

  // ──────────────────────────────────────────────────────────────────
  // PUBLIC API - Cell Cleanup Methods
  // ──────────────────────────────────────────────────────────────────

  /**
   * Clears all visual state from a placement cell.
   * Removes text, inline styles, and all relevant CSS classes used during placement phase.
   * Delegates to CellClassManager for class-based cleanup.
   *
   * @param {HTMLElement} cell - DOM element to clear of all placement visuals
   * @returns {void}
   */
  static clearPlaceCell (cell) {
    this.#clearCellTextAndStyle(cell)
    CellClassManager.clearPlaceCell(cell)
  }

  /**
   * Clears cell visual details based on specified scope.
   * Provides flexible clearing strategy for different contexts.
   *
   * Clearing strategies:
   * - 'content': Clears only text content
   * - 'all': Clears text and inline styles
   * - other: No clearing performed (for validation)
   *
   * @param {HTMLElement} cell - DOM element to clear
   * @param {'none'|'content'|'all'} details - What to clear: Scope of clearing: 'content' for text only, 'all' for text and styles
   * @returns {void}
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
   *
   * @returns {ColorMaps} Color map object with shipLetterColors and shipColors properties
   * @private
   */
  static #getColorMaps () {
    return bh.maps
  }

  /**
   * Retrieves weapon slot at specified grid position if one exists.
   * Encapsulates weapon location logic and null coalescing pattern.
   * Extracted to eliminate duplicated weapon retrieval code.
   *
   * @param {Ship|null|undefined} ship - Ship object with rackAt() method
   * @param {number} column - Column coordinate for weapon lookup
   * @param {number} row - Row coordinate for weapon lookup
   * @returns {WeaponSlot|null|undefined} Weapon slot object if found, null/undefined otherwise
   * @private
   */
  static #getWeaponSlotAt (ship, column, row) {
    return ship?.rackAt(column, row)
  }

  /**
   * Displays cell content (weapon or ship letter) based on what occupies the position.
   * Consolidates the weapon vs letter display decision logic.
   * Extracted pattern: checks for weapon presence then displays accordingly.
   *
   * @param {HTMLDivElement} cell - DOM element to display content into
   * @param {Ship} ship - Ship object for base attributes and letter
   * @param {WeaponSlot|null|undefined} weaponSlot - Weapon slot at cell position, null if empty
   * @param {ColorMaps} colorMaps - Color mapping configuration
   * @param {boolean} [includeWeaponVisuals=true] - Whether to apply weapon-specific visual state (clears text, adds weapon class)
   * @returns {void}
   * @private
   */
  static #displayCellContent (
    cell,
    ship,
    weaponSlot,
    colorMaps,
    includeWeaponVisuals = true
  ) {
    const letter = this.#setBaseAttributes(cell, ship)

    if (weaponSlot) {
      this.#setWeaponDataset(cell, weaponSlot)
      if (includeWeaponVisuals) {
        this.#applyWeaponVisuals(cell)
      }
    } else {
      cell.textContent = letter
    }

    this.#applyShipStyles(cell, letter, colorMaps)
  }

  // ──────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS - Data Attribute Setup
  // ──────────────────────────────────────────────────────────────────

  /**
   * Extracts the letter identifier from a ship, defaulting to '-' if absent.
   * Safe accessor that handles null/undefined ship objects gracefully.
   *
   * @param {Ship|null|undefined} ship - Ship object with optional letter property
   * @returns {string} The ship's letter or '-' as fallback placeholder
   * @private
   */
  static #getShipLetter (ship) {
    return ship?.letter || '-'
  }

  /**
   * Sets fundamental ship data attributes (id, letter) on a cell.
   * Applied as first step by all display methods for consistent initialization.
   * Extracts letter for convenience in method chaining patterns.
   *
   * @param {HTMLDivElement} cell - DOM element to annotate with ship data
   * @param {Ship|null|undefined} ship - Ship object containing id and letter
   * @returns {string} The ship letter (extracted for convenience in chaining)
   * @private
   */
  static #setBaseAttributes (cell, ship) {
    const letter = this.#getShipLetter(ship)
    this.#setDatasetAttribute(cell, this.#DATA_ATTRIBUTES.SHIP_ID, ship?.id)
    this.#setDatasetAttribute(cell, this.#DATA_ATTRIBUTES.SHIP_LETTER, letter)
    return letter
  }

  /**
   * Sets weapon-specific dataset attributes on a cell.
   * Applied when cell should display weapon information (ammo, type, id).
   * Used by armed cell display and fog-of-war reveal methods.
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @param {WeaponSlot} weaponSlot - Weapon slot object
   * @param {Weapon} weaponSlot.weapon - Weapon object with letter property
   * @param {number} weaponSlot.ammo - Remaining ammunition count for display
   * @param {string|number} weaponSlot.id - Unique weapon slot identifier
   * @returns {void}
   * @private
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
   * @param {HTMLDivElement} cell
   * @param {string} key
   * @param {string|number|undefined} value
   * @private
   */
  static #setDatasetAttribute (cell, key, value) {
    if (value !== undefined) {
      cell.dataset[key] = String(value)
    }
  }

  /**
   * Initializes ship data on a cell (called once per cell).
   * Sets ship primary letter and variant properties on first encounter.
   * Guards against re-initialization with existence check.
   *
   * @param {HTMLDivElement} cell - DOM element to annotate
   * @param {Ship} ship - Ship object containing letter and variant
   * @returns {void}
   * @private
   */
  static #initializeShipCellData (cell, ship) {
    const shipLetterKey = this.#DATA_ATTRIBUTES.SHIP_PRIMARY_LETTER
    if (cell.dataset[shipLetterKey] !== undefined) return

    const letter = this.#getShipLetter(ship)
    this.#setDatasetAttribute(cell, shipLetterKey, letter)
    this.#setDatasetAttribute(
      cell,
      this.#DATA_ATTRIBUTES.SHIP_VARIANT,
      ship.variant
    )
  }

  /**
   * Initializes weapon data and orientation classes on a cell (called once per cell).
   * Sets weapon letter, ship surround identifier, and applies rotation/cursor styling.
   * Manages weapon rotation indicators and cursor styling based on primary weapon.
   *
   * @param {HTMLDivElement} cell - DOM element to annotate with weapon orientation
   * @param {Ship} ship - Ship object with getPrimaryWeapon() and getTurn() methods
   * @param {number} row - Row coordinate for turn/rotation calculation
   * @param {number} column - Column coordinate for turn/rotation calculation
   * @returns {void}
   * @private
   */
  static #initializeWeaponCellData (cell, ship, row, column) {
    const weaponLetterKey = this.#DATA_ATTRIBUTES.WEAPON_LETTER
    if (cell.dataset[weaponLetterKey] !== undefined) return

    const primaryWeapon = ship.getPrimaryWeapon()
    this.#setDatasetAttribute(cell, weaponLetterKey, primaryWeapon.letter)
    this.#setDatasetAttribute(
      cell,
      this.#DATA_ATTRIBUTES.WEAPON_SURROUND,
      ship.id
    )
    this.#applyWeaponCursorStyles(cell, ship, row, column, primaryWeapon)
  }

  /**
   * Applies cursor and orientation styling for the ship's primary weapon.
   * @param {HTMLDivElement} cell
   * @param {Ship} ship
   * @param {number} row
   * @param {number} column
   * @param {Weapon} primaryWeapon
   * @private
   */
  static #applyWeaponCursorStyles (cell, ship, row, column, primaryWeapon) {
    const cursorClass = primaryWeapon?.launchCursor
    if (!cursorClass) return

    CellClassManager.clearWeaponClasses(cell)
    cell.classList.add(cursorClass)
    CellClassManager.clearCellClasses(cell, [
      CellClassManager.CELL_CLASSES.orientation
    ])

    const turn = ship.getTurn(row, column)
    if (turn) {
      cell.classList.add(turn)
    }
  }

  /**
   * Sets weapon area-of-effect attributes and key identifiers on a cell.
   * Only applied if ship has armed weapons.
   * Orchestrates initialization of ship and weapon data, then adds key identifiers.
   *
   * @param {HTMLDivElement} cell - DOM element to update with weapon attributes
   * @param {Ship} ship - Ship object with makeKeyIds(), weapons, and getTurn() method
   * @param {number} row - Row coordinate for key ID and turn calculations
   * @param {number} column - Column coordinate for key ID and turn calculations
   * @returns {void}
   * @private
   */
  static #setSurroundAttributes (cell, ship, row, column) {
    this.#initializeShipCellData(cell, ship)
    this.#initializeWeaponCellData(cell, ship, row, column)

    const keyIds = ship.makeKeyIds()
    addKeyToCell(cell, this.#DATA_ATTRIBUTES.WEAPON_KEY_IDS, keyIds)
  }

  // ──────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS - Styling & Visual State
  // ──────────────────────────────────────────────────────────────────

  /**
   * Applies ship-specific color and background styling to a cell.
   * Looks up colors from colorMaps with graceful fallback to default styles.
   * Separates style application from data setup for clear single responsibility.
   *
   * @param {HTMLDivElement} cell - DOM element to style with ship colors
   * @param {string} letter - Ship letter used as key for color map lookup
   * @param {ColorMaps} colorMaps - Color mapping configuration
   * @param {Object<string, string>} colorMaps.shipLetterColors - Map of letter → text color hex values
   * @param {Object<string, string>} colorMaps.shipColors - Map of letter → background color rgba/hex values
   * @returns {void}
   * @private
   */
  static #applyShipStyles (cell, letter, colorMaps) {
    cell.style.color =
      colorMaps.shipLetterColors[letter] || this.#DEFAULT_STYLES.COLOR
    cell.style.background =
      colorMaps.shipColors[letter] || this.#DEFAULT_STYLES.BACKGROUND
  }

  /**
   * Applies weapon visual state to a cell.
   * Clears text content and adds weapon CSS class indicator for styling.
   * Called when a cell should display weapon appearance rather than text.
   *
   * @param {HTMLDivElement} cell - DOM element to update with weapon visual state
   * @returns {void}
   * @private
   */
  static #applyWeaponVisuals (cell) {
    this.#clearCellText(cell)
    cell.classList.add(this.#CSS_CLASSES.WEAPON)
  }

  /**
   * Checks if a ship has armed weapons available for display.
   * Encapsulates the hasWeapon property check with null-coalescing.
   *
   * @param {Object|null|undefined} ship - Ship object with hasWeapon property
   * @returns {boolean} True if ship has at least one armed weapon, false otherwise
   * @private
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
   *
   * @param {HTMLElement} cell - DOM element to clear of text
   * @returns {void}
   * @private
   */
  static #clearCellText (cell) {
    cell.textContent = ''
  }

  /**
   * Resets inline style properties on a cell element.
   * Clears background and color styles set by game logic, removing ship styling.
   *
   * @param {HTMLElement} cell - DOM element to reset styling on
   * @returns {void}
   * @private
   */
  static #resetCellStyle (cell) {
    cell.style.background = ''
    cell.style.color = ''
  }

  /**
   * Clears both text content and inline styles from a cell.
   * Convenience method combining text and style reset operations.
   * Used when preparing a cell for complete re-initialization.
   *
   * @param {HTMLElement} cell - DOM element to clear completely
   * @returns {void}
   * @private
   */
  static #clearCellTextAndStyle (cell) {
    this.#clearCellText(cell)
    this.#resetCellStyle(cell)
  }

  /**
   * Sets text content to ship letter when cell is not damaged.
   * Displays letter for visual reference unless damage indicators obscure it.
   * Helper for sunk cell display to avoid showing text under damage overlays.
   *
   * @param {HTMLElement} cell - DOM element to conditionally update
   * @param {string} letter - Ship letter to display if cell has no damage class
   * @returns {void}
   * @private
   */
  static #setLetterIfNotDamaged (cell, letter) {
    if (
      !CellClassManager.hasClass(cell, CellClassManager.CELL_CLASSES.damage)
    ) {
      cell.textContent = letter
    }
  }
}
