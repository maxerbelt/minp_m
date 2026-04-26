import { Ship } from '../ships/Ship.js'
import { ZoneInfoManager } from './helpers/ZoneInfoManager.js'
import { TallyBuilder } from './helpers/TallyBuilder.js'
import { WeaponTallyBuilder } from './helpers/WeaponTallyBuilder.js'
import { DisplacementCalculator } from './helpers/DisplacementCalculator.js'

/**
 * Manages the display of score information and ship tally UI.
 * Orchestrates zone information display, counter updates, and tally box rendering.
 * Delegates specific concerns to specialized helper classes:
 * - ZoneInfoManager: Zone display and updates
 * - TallyBuilder: Ship tally construction
 * - WeaponTallyBuilder: Weapon ammo display
 * - DisplacementCalculator: Displacement calculations
 */
export class ScoreUI {
  /**
   * Creates a ScoreUI instance.
   * @param {string} playerPrefix - Prefix for HTML element IDs
   */
  constructor (playerPrefix) {
    const getElement = suffix =>
      document.getElementById(`${playerPrefix}-${suffix}`)

    // Display elements
    this.shots = getElement('shots')
    this.turns = getElement('turns')
    this.dtaps = getElement('dtaps')
    this.hits = getElement('hits')
    this.misses = getElement('misses')
    this.sunk = getElement('sunk')
    this.hints = getElement('hints')
    this.reveals = getElement('reveals')
    this.placed = getElement('placed')
    this.weaponsPlaced = getElement('weapons')
    this.zone = getElement('zone')

    // Label elements
    this.shotsLabel = getElement('shots-label')
    this.turnsLabel = getElement('turns-label')
    this.dtapsLabel = getElement('dtaps-label')
    this.hitsLabel = getElement('hits-label')
    this.missesLabel = getElement('misses-label')
    this.sunkLabel = getElement('sunk-label')
    this.hintsLabel = getElement('hints-label')
    this.revealsLabel = getElement('reveals-label')
    this.placedLabel = getElement('placed-label')
    this.weaponsLabel = getElement('weapons-label')
    this.zoneLabel = getElement('zone-label')

    // Tally box and zone tracking
    this.tallyBox = getElement('tallyBox')
    /** @type {Array<Object>} Tracked zone information */
    this.zoneSync = []
  }

  /**
   * Displays score counters for the game state.
   * @param {Array<Object>} ships - Array of ship objects
   * @param {number} turns - Number of turns taken
   * @param {number} dtaps - Number of double-taps
   * @param {number} shots - Number of shots
   * @param {number} reveals - Number of reveals
   * @param {number} hints - Number of hints
   */
  display (ships, turns, dtaps, shots, reveals, hints) {
    this.showCounter(this.turns, turns, this.turnsLabel)
    this.showCounter(this.shots, shots, this.shotsLabel)
    this.showCounter(this.dtaps, dtaps, this.dtapsLabel)

    const hits = Ship.noOfHits(ships)
    this.showCounter(this.hits, hits, this.hitsLabel)
    const misses = shots - hits
    this.showCounter(this.misses, misses, this.missesLabel)
    const sunkCount = Ship.noOfSunk(ships)
    this.sunk.textContent = `${sunkCount} / ${ships.length}`

    this.showCounter(this.hints, hints, this.hintsLabel)
    this.showCounter(this.reveals, reveals, this.revealsLabel)
  }

  /**
   * Shows or hides a counter based on its value.
   * @param {HTMLElement} field - The field element displaying the count
   * @param {number} count - The count value
   * @param {HTMLElement} label - The label element
   */
  showCounter (field, count, label) {
    if (field && count > 0) {
      label?.classList?.remove('hidden')
      field.textContent = count.toString()
    } else {
      label?.classList?.add('hidden')
    }
  }

  /**
   * Updates label visibility based on a positive value.
   * @param {number} value - The value to check
   * @param {HTMLElement} label - The label element
   */
  displayIfPositive (value, label) {
    if (value > 0) label?.classList?.remove('hidden')
    else label?.classList?.add('hidden')
  }

  /**
   * Creates a zone title entry with bold text.
   * @param {string} labelTxt - Title text
   * @param {Object|string} bagOrText - Bag object with size or numeric text
   * @returns {HTMLElement} The count span element
   */
  createZoneTitle (labelTxt, bagOrText) {
    return ZoneInfoManager.createZoneTitle(this.zone, labelTxt, bagOrText)
  }

  /**
   * Creates a zone item entry with smaller text.
   * @param {string} labelTxt - Item label
   * @param {Object|string} bagOrText - Bag object with size or numeric text
   * @returns {HTMLElement} The count span element
   */
  createZoneItem (labelTxt, bagOrText) {
    return ZoneInfoManager.createZoneItem(this.zone, labelTxt, bagOrText)
  }

  /**
   * Creates a zone text entry with custom styling.
   * @param {string} labelTxt - Label text
   * @param {string} text - Content text
   * @param {string} stress - HTML tag for label emphasis
   * @param {string} style - CSS style string
   * @returns {HTMLElement} The count span element
   */
  createZoneTextEntry (labelTxt, text, stress, style) {
    return ZoneInfoManager.createZoneTextEntry(
      this.zone,
      labelTxt,
      text,
      stress,
      style
    )
  }

  /**
   * Creates a zone entry with displacement calculation for ships.
   * @param {string} labelTxt - Label text
   * @param {number} displacedArea - Total displaced area
   * @param {Array<Object>} ships - Array of ships
   * @param {string} stress - HTML tag for label emphasis
   * @param {string} style - CSS style string
   * @param {number} [extra=0] - Extra displacement to add
   * @returns {HTMLElement} The count span element
   */
  createAddZoneEntry (labelTxt, displacedArea, ships, stress, style, extra = 0) {
    return ZoneInfoManager.createAddZoneEntry(
      this.zone,
      labelTxt,
      displacedArea,
      ships,
      stress,
      style,
      extra
    )
  }

  /**
   * Converts a displacement ratio to a human-readable description.
   * @param {number} ratio - Displacement ratio (0-1)
   * @returns {string} Descriptive text for the ratio
   */
  displacementDescription (ratio) {
    return DisplacementCalculator.describeDisplacementRatio(ratio)
  }

  /**
   * Displays zone information by updating tracked entries.
   */
  displayZoneInfo () {
    ZoneInfoManager.displayZoneInfo(this.zoneSync)
  }

  /**
   * Checks if any non-default zones have information to display.
   * @returns {boolean} True if zones have non-zero sizes
   */
  hasZoneInfo () {
    return ZoneInfoManager.hasZoneInfo(this.zoneSync)
  }

  /**
   * Displays zone information with displacement area calculations.
   * @param {Object} model - The game model with ships and loadOut
   */
  displayAddZoneInfo (model) {
    ZoneInfoManager.displayAddZoneInfo(this.zone, model)
  }

  /**
   * Sets up zone information display structure.
   */
  setupZoneInfo () {
    this.zoneSync = ZoneInfoManager.setupZoneInfo(
      this.zone,
      this.createZoneTitle.bind(this),
      this.createZoneItem.bind(this)
    )
  }

  /**
   * Resets the tally box display.
   */
  resetTallyBox () {
    this.tallyBox.innerHTML = ''
  }

  /**
   * Creates a tally box element for a ship.
   * Delegates to TallyBuilder for implementation.
   * @param {Object} ship - The ship object
   * @returns {HTMLElement} The tally box element
   */
  buildShipBox (ship) {
    return TallyBuilder.createShipBox(ship)
  }

  /**
   * Builds a tally row for ships of a given letter.
   * Delegates to TallyBuilder for implementation.
   * @param {Array<Object>} ships - All ships
   * @param {string} letter - Ship letter to filter
   * @param {HTMLElement} rowList - Container for the row
   * @param {Function} [boxer] - Function to create box element
   * @param {string} [tallyGroup] - Tally group identifier
   */
  buildTallyRow (ships, letter, rowList, boxer, tallyGroup) {
    TallyBuilder.buildTallyRow(
      ships,
      letter,
      rowList,
      boxer || this.buildShipBox.bind(this),
      tallyGroup
    )
  }

  /**
   * Builds a tally row for bomb/weapon ammo display.
   * Delegates to WeaponTallyBuilder for implementation.
   * @param {HTMLElement} rowList - Container for the row
   * @param {Object} viewModel - The view model
   * @param {Object} weaponSystem - The weapon system object
   */
  buildBombRow (rowList, viewModel, weaponSystem) {
    WeaponTallyBuilder.buildBombRow(rowList, viewModel, weaponSystem)
  }

  /**
   * Displays ships organized by tally group (sea, land, air, special).
   * Delegates to TallyBuilder for implementation.
   * @param {Array<Object>} ships - All ships to display
   * @param {Function} [boxer] - Custom function to create ship boxes
   */
  buildShipTally (ships, boxer) {
    TallyBuilder.buildTally(
      this.tallyBox,
      ships,
      [],
      boxer || this.buildShipBox.bind(this)
    )
  }

  /**
   * Builds tally display from game model with weapons.
   * Delegates to TallyBuilder for implementation.
   * @param {Object} model - The game model
   * @param {Object} viewModel - The view model
   */
  buildTallyFromModel (model, viewModel) {
    TallyBuilder.displayTallyFromModel(this.tallyBox, model, viewModel)
  }

  /**
   * Builds tally display with weapons.
   * Delegates to TallyBuilder for implementation.
   * @param {Array<Object>} ships - All ships
   * @param {Array<Object>} weaponSystems - All weapon systems
   * @param {Object} viewModel - The view model
   */
  buildTally (ships, weaponSystems, viewModel) {
    TallyBuilder.buildTally(
      this.tallyBox,
      ships,
      weaponSystems || [],
      this.buildShipBox.bind(this),
      viewModel,
      true
    )
  }

  /**
   * Adds ships to the tally display.
   * Delegates to TallyBuilder for implementation.
   * @param {Array<Object>} ships - Ships to add
   */
  addShipTally (ships) {
    TallyBuilder.addShipTally(this.tallyBox, ships)
  }
}
