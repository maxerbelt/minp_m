import { addKeyToCell, coordsFromCell } from '../../core/utilities.js'
import { CellClassManager } from './CellClassManager.js'
import { bh } from '../../terrains/all/js/bh.js'

/**
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
    WEAPON: 'weapon'
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
   * Extracts the letter identifier from a ship, defaulting to '-' if absent.
   *
   * @param {Object|null|undefined} ship - Ship object with optional letter property
   * @returns {string} The ship's letter or '-' if not present
   */
  static #getShipLetter (ship) {
    return ship?.letter || '-'
  }

  /**
   * Sets fundamental ship data attributes (id, letter) on a cell.
   * Applied as first step by all display methods for consistent initialization.
   *
   * @param {HTMLDivElement} cell - DOM element to annotate with ship data
   * @param {Object|null|undefined} ship - Ship object containing id and letter
   * @returns {string} The ship letter (extracted for convenience in chaining)
   */
  static #setBaseAttributes (cell, ship) {
    const letter = this.#getShipLetter(ship)
    const dataset = cell.dataset
    dataset.id = ship?.id
    dataset.letter = letter
    return letter
  }

  /**
   * Applies ship-specific color and background styling to a cell.
   * Looks up colors from colorMaps with graceful fallback to defaults.
   *
   * @param {HTMLDivElement} cell - DOM element to style
   * @param {string} letter - Ship letter used for color map lookup
   * @param {Object} colorMaps - Color mapping configuration object
   * @param {Object<string, string>} colorMaps.shipLetterColors - Letter → text color map
   * @param {Object<string, string>} colorMaps.shipColors - Letter → background color map
   * @returns {void}
   */
  static #applyShipStyles (cell, letter, colorMaps) {
    cell.style.color =
      colorMaps.shipLetterColors[letter] || this.#DEFAULT_STYLES.COLOR
    cell.style.background =
      colorMaps.shipColors[letter] || this.#DEFAULT_STYLES.BACKGROUND
  }

  /**
   * Sets weapon-specific dataset attributes and styling on a cell.
   * Called when a cell should display a weapon instead of ship letter.
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @param {Object} weaponSlot - Weapon slot with weapon, ammo, and id properties
   * @param {Object} weaponSlot.weapon - Weapon object with letter property
   * @param {number} weaponSlot.ammo - Remaining ammunition count
   * @param {string|number} weaponSlot.id - Unique weapon slot identifier
   * @returns {void}
   */
  static #setWeaponAttributes (cell, weaponSlot) {
    const dataset = cell.dataset
    const weaponLetter = weaponSlot.weapon.letter
    dataset.wletter = weaponLetter
    dataset.ammo = weaponSlot.ammo
    dataset.wid = weaponSlot.id
    this._clearCellText(cell)
    cell.classList.add(this.#CSS_CLASSES.WEAPON)
  }

  /**
   * Checks if a ship has armed weapons available.
   *
   * @param {Object|null|undefined} ship - Ship object with hasWeapon property
   * @returns {boolean} True if ship has at least one armed weapon
   */
  static #hasWeapons (ship) {
    return ship?.hasWeapon ?? false
  }

  /**
   * Initializes ship data on a cell (called once per cell).
   * Sets ship letter and variant when first encountered.
   *
   * @param {HTMLDivElement} cell - DOM element to annotate
   * @param {Object} ship - Ship object containing letter and variant
   * @returns {void}
   * @private
   */
  static #initializeShipCellData (cell, ship) {
    const dataset = cell.dataset
    if (dataset.sletter === undefined) {
      const letter = this.#getShipLetter(ship)
      dataset.sletter = letter
      dataset.variant = ship.variant
    }
  }

  /**
   * Initializes weapon data and orientation classes on a cell (called once per cell).
   * Sets weapon letter, surround id, and applies rotation/cursor styling.
   *
   * @param {HTMLDivElement} cell - DOM element to annotate
   * @param {Object} ship - Ship object with getPrimaryWeapon and getTurn methods
   * @param {number} row - Row coordinate for turn calculation
   * @param {number} column - Column coordinate for turn calculation
   * @returns {void}
   * @private
   */
  static #initializeWeaponCellData (cell, ship, row, column) {
    const dataset = cell.dataset
    if (dataset.wletter === undefined) {
      const primaryWeapon = ship.getPrimaryWeapon()
      dataset.wletter = primaryWeapon.letter
      dataset.surround = ship.id

      const cursorClass = primaryWeapon?.launchCursor
      if (cursorClass) {
        cell.classList.add(cursorClass)
        CellClassManager.clearCellClasses(cell, [
          CellClassManager.CELL_CLASSES.orientation
        ])
        const turn = ship.getTurn(row, column)
        if (turn && turn !== '') {
          cell.classList.add(turn)
        }
      }
    }
  }

  /**
   * Sets weapon area-of-effect attributes and key identifiers on a cell.
   * Only applied if ship has armed weapons. Calls initialization methods.
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @param {Object} ship - Ship object with weapons and turn info
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @returns {void}
   * @private
   */
  static #setSurroundAttributes (cell, ship, row, column) {
    this.#initializeShipCellData(cell, ship)
    this.#initializeWeaponCellData(cell, ship, row, column)

    const keyIds = ship.makeKeyIds()
    addKeyToCell(cell, 'keyIds', keyIds)
  }

  /**
   * Displays a cell with the ship's letter identifier.
   * Used in placement and non-combat scenarios where weapons are not shown.
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @param {Object} ship - Ship object with letter property
   * @param {Object} colorMaps - Color mapping configuration
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
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @param {Object} ship - Ship object with id and letter
   * @param {Object} weaponSlot - Weapon slot with weapon, ammo, and id properties
   * @param {Object} colorMaps - Color mapping configuration
   * @returns {void}
   */
  static displayArmedCell (cell, ship, weaponSlot, colorMaps) {
    const letter = this.#setBaseAttributes(cell, ship)
    this.#setWeaponAttributes(cell, weaponSlot)
    this.#applyShipStyles(cell, letter, colorMaps)
  }

  /**
   * Displays weapon area-of-effect indicators on surrounding cells.
   * Only applied if ship has armed weapons. Sets weapon-related attributes
   * and orientation indicators for the weapon's effective radius.
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @param {Object} ship - Ship object with weapons and turn status
   * @param {number} row - Row coordinate for rotation calculation
   * @param {number} column - Column coordinate for rotation calculation
   * @returns {void}
   */
  static displaySurroundAttributes (cell, ship, row, column) {
    if (!this.#hasWeapons(ship)) return
    this.#setSurroundAttributes(cell, ship, row, column)
  }

  /**
   * Displays a ship cell with appropriate content (weapon or letter) based on position.
   * Primary public method that orchestrates all cell rendering logic.
   * Retrieves weapon at position and delegates to letter or armed cell display.
   *
   * @param {Object} ship - Ship object to display
   * @param {number} row - Row coordinate on ship's grid
   * @param {number} column - Column coordinate on ship's grid
   * @param {HTMLDivElement} cell - DOM element to render into
   * @returns {void}
   */
  static displayShipCell (ship, row, column, cell) {
    const colorMaps = bh.maps
    const weaponSlot = ship?.rackAt(column, row)

    if (weaponSlot) {
      this.displayArmedCell(cell, ship, weaponSlot, colorMaps)
    } else {
      this.displayLetterCell(cell, ship, colorMaps)
    }

    this.displaySurroundAttributes(cell, ship, row, column)
  }

  /**
   * Updates a cell's colors without changing other display properties.
   * Convenience wrapper that applies ship styling using current game color maps.
   * Used when only color needs to change after initial rendering.
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @param {string} letter - Ship letter for color map lookup
   * @returns {void}
   */
  static setShipCellColors (cell, letter) {
    const colorMaps = bh.maps
    this.#applyShipStyles(cell, letter, colorMaps)
  }

  /**
   * Clears text content from a cell element.
   *
   * @param {HTMLElement} cell - DOM element to clear
   * @returns {void}
   */
  static #clearCellText (cell) {
    cell.textContent = ''
  }
  /**
   * Resets inline style properties on a cell element.
   * Clears background and color styles set by game logic.
   *
   * @param {HTMLElement} cell - DOM element to reset
   * @returns {void}
   */
  static #resetCellStyle (cell) {
    cell.style.background = ''
    cell.style.color = ''
  }

  /**
   * Clears both text content and inline styles from a cell.
   * Convenience method combining text and style reset operations.
   *
   * @param {HTMLElement} cell - DOM element to clear
   * @returns {void}
   * @private
   */
  static #clearCellTextAndStyle (cell) {
    this.#clearCellText(cell)
    this.#resetCellStyle(cell)
  }
  /**
   * Clears all visual state from a placement cell.
   * Removes text, styles, and all relevant classes for placement phase.
   *
   * @param {HTMLElement} cell - DOM element to clear
   * @returns {void}
   */
  static clearPlaceCell (cell) {
    this.#clearCellTextAndStyle(cell)
    CellClassManager.clearPlaceCell(cell)
  }
  /**
   * Displays a cell as sunk.
   * @param {HTMLElement} cell - The cell element.
   * @param {string} letter - The ship letter.
   */
  static displayEnemySunkCell (cell, letter) {
    CellClassManager.applyEnemySunkCellState(cell)
    ShipCellDisplayer.setShipCellColors(cell, letter)
    if (CellClassManager.hasClass(cell, CellClassManager.CELL_CLASSES.damage)) {
      this.#clearCellText(cell)
    } else {
      cell.textContent = letter
    }
  }
  /**
   * Generic method to clear cell visuals using custom clearing strategy.
   * Delegates class clearing to provided function for context-specific behavior.
   *
   * @param {HTMLElement} cell - DOM element to clear
   * @param {'none'|'content'|'all'} details - What to clear:
   *   'none' = only call classClear, 'content' = text only, 'all' = text and style
   * @returns {void}
   */
  clearDetails (cell, details) {
    if (details === 'content') {
      this.#clearCellText(cell)
    } else if (details === 'all') {
      this.#clearCellTextAndStyle(cell)
    }
  }
  /**
   * Displays a revealed cell in fog-of-war scenarios.
   * Shows ship letter or weapon indicator based on what occupies the position.
   * Used when enemy ships become partially visible during gameplay.
   *
   * @param {HTMLDivElement|null} cell - DOM element to update (returns early if null)
   * @param {Object} ship - Ship object with letter and weapon rack
   * @param {Object} colorMaps - Color mapping configuration
   * @returns {void}
   */
  static displayAsRevealed (cell, ship, colorMaps) {
    if (!cell) return

    const letter = this.#getShipLetter(ship)
    this.#applyShipStyles(cell, letter, colorMaps)

    const [row, column] = coordsFromCell(cell)
    const weaponSlot = ship?.rackAt(column, row)

    if (weaponSlot) {
      this.#setWeaponAttributes(cell, weaponSlot)
    } else {
      cell.textContent = letter
    }
  }
}
