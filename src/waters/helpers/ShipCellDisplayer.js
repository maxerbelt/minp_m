import { addKeyToCell, coordsFromCell } from '../../core/utilities.js'

/**
 * Manages the display of ship cells with various visual states
 * (letter display, armed with weapon, surrounding indicators, revealed).
 * Consolidates ship cell rendering logic to eliminate duplication.
 *
 * @class ShipCellDisplayer
 */
export class ShipCellDisplayer {
  // CSS class constants
  static #CSS_CLASSES = {
    WEAPON: 'weapon'
  }

  // Default style fallbacks
  static #DEFAULT_STYLES = {
    COLOR: '#fff',
    BACKGROUND: 'rgba(255,255,255,0.2)'
  }

  /**
   * Extracts the letter identifier from a ship, defaulting to '-' if absent.
   *
   * @param {Object} ship - Ship object with optional letter property
   * @returns {string} The ship's letter or '-' if not present
   */
  static #getShipLetter (ship) {
    return ship?.letter || '-'
  }

  /**
   * Sets fundamental data attributes (id, letter) on a cell.
   * Used by all display methods as a common initialization step.
   *
   * @param {HTMLDivElement} cell - DOM element to annotate
   * @param {Object} ship - Ship object containing id and letter
   * @returns {string} The ship letter (for convenience in chaining)
   */
  static #setBaseAttributes (cell, ship) {
    const letter = this.#getShipLetter(ship)
    cell.dataset.id = ship?.id
    cell.dataset.letter = letter
    return letter
  }

  /**
   * Applies ship-specific color and background styling to a cell.
   * Uses colorMap lookups with fallback defaults.
   *
   * @param {HTMLDivElement} cell - DOM element to style
   * @param {string} letter - Ship letter for color lookup
   * @param {Object} colorMaps - Object with shipLetterColors and shipColors
   * @param {Object} colorMaps.shipLetterColors - Map of letter → color
   * @param {Object} colorMaps.shipColors - Map of letter → background color
   */
  static #applyShipStyles (cell, letter, colorMaps) {
    cell.style.color =
      colorMaps.shipLetterColors[letter] || this.#DEFAULT_STYLES.COLOR
    cell.style.background =
      colorMaps.shipColors[letter] || this.#DEFAULT_STYLES.BACKGROUND
  }

  /**
   * Sets attributes and styling for a cell displaying a weapon.
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @param {Object} weaponSlot - Object with weapon, ammo, and id properties
   * @param {Object} ship - Ship object for variant property
   */
  static #setWeaponAttributes (cell, weaponSlot, ship) {
    const weaponLetter = weaponSlot.weapon.letter
    cell.dataset.wletter = weaponLetter
    cell.dataset.ammo = weaponSlot.ammo
    cell.dataset.wid = weaponSlot.id
    cell.dataset.variant = ship.variant
    cell.textContent = ''
    cell.classList.add(this.#CSS_CLASSES.WEAPON)
  }

  /**
   * Checks if a ship has armed weapons (non-empty weapons collection).
   *
   * @param {Object} ship - Ship object with optional weapons property
   * @returns {boolean} True if ship has at least one weapon
   */
  static #hasWeapons (ship) {
    return ship.weapons && Object.values(ship.weapons).length > 0
  }

  /**
   * Sets surrounding cell attributes for area-effect display.
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @param {Object} ship - Ship object with weapons and turn info
   */
  static #setSurroundAttributes (cell, ship) {
    const letter = this.#getShipLetter(ship)
    cell.dataset.sletter = letter

    const primaryWeapon = ship.getPrimaryWeapon()
    cell.dataset.wletters = primaryWeapon.letter
    cell.dataset.variant = ship.variant

    const turn = ship.getTurn()
    if (turn && turn !== '') {
      cell.classList.add(turn)
    }

    cell.dataset.surround = ship.id
    const keyIds = ship.makeKeyIds()
    addKeyToCell(cell, 'keyIds', keyIds)
  }

  /**
   * Displays a cell with the ship's letter only.
   * Used in placement and non-combat scenarios.
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @param {Object} ship - Ship object with letter property
   * @param {Object} colorMaps - Color mapping configuration
   */
  static displayLetterCell (cell, ship, colorMaps) {
    const letter = this.#setBaseAttributes(cell, ship)
    cell.textContent = letter
    this.#applyShipStyles(cell, letter, colorMaps)
  }

  /**
   * Displays a cell containing an armed weapon with ammo indicator.
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @param {Object} ship - Ship object with variant property
   * @param {Object} weaponSlot - Weapon slot with weapon, ammo, and id
   * @param {Object} colorMaps - Color mapping configuration
   */
  static displayArmedCell (cell, ship, weaponSlot, colorMaps) {
    const letter = this.#setBaseAttributes(cell, ship)
    this.#setWeaponAttributes(cell, weaponSlot, ship)
    this.#applyShipStyles(cell, letter, colorMaps)
  }

  /**
   * Displays surrounding cells indicating weapon area of effect.
   * Only applied if ship has armed weapons.
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @param {Object} ship - Ship object with weapons and turn status
   */
  static displaySurroundAttributes (cell, ship) {
    if (!this.#hasWeapons(ship)) return
    this.#setSurroundAttributes(cell, ship)
  }

  /**
   * Displays a revealed cell in fog-of-war scenarios.
   * Shows the ship letter, or weapon indicator if armed at that position.
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @param {Object} ship - Ship object with letter and weapon rack
   * @param {Object} colorMaps - Color mapping configuration
   */
  static displayAsRevealed (cell, ship, colorMaps) {
    if (!cell) return

    const letter = this.#getShipLetter(ship)
    this.#applyShipStyles(cell, letter, colorMaps)

    const [r, c] = coordsFromCell(cell)
    const weaponSlot = ship?.rackAt(c, r)

    if (weaponSlot) {
      cell.dataset.ammo = '1'
      cell.classList.add(this.#CSS_CLASSES.WEAPON)
      cell.textContent = ''
    } else {
      cell.textContent = letter
    }
  }
}
