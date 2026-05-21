import { Ship } from '../ships/Ship.js'
import { ZoneInfoManager } from './helpers/ZoneInfoManager.js'
import { TallyBuilder } from './helpers/TallyBuilder.js'
import { WeaponTallyBuilder } from './helpers/WeaponTallyBuilder.js'
import { DisplacementCalculator } from './helpers/DisplacementCalculator.js'

/**
 * @typedef {Object} ShipStats
 * @property {number} hits - Number of hits on this ship
 * @property {number} sunk - Whether the ship is sunk (0 or 1)
 * @property {string} letter - Ship letter identifier
 */

/**
 * @typedef {Object} GameModel
 * @property {Array<Object>} ships - Array of ship objects in the game
 * @property {Object} loadOut - Current loadout configuration
 * @property {() => number} calculateDisplacedArea - Method to calculate total displaced area
 */

/**
 * @typedef {Object} ViewModel
 * @property {Array<Object>} [ships] - Ships for display
 * @property {Array<Object>} [weaponSystems] - Weapon systems for display
 */

/**
 * @typedef {Object} WaterDisplayElements
 * @property {HTMLElement} shots - Element for shots count
 * @property {HTMLElement} turns - Element for turns count
 * @property {HTMLElement} dtaps - Element for double-taps count
 * @property {HTMLElement} hits - Element for hits count
 * @property {HTMLElement} misses - Element for misses count
 * @property {HTMLElement} sunk - Element for sunk ships display
 * @property {HTMLElement} hints - Element for hints count
 * @property {HTMLElement} reveals - Element for reveals count
 * @property {HTMLElement} placed - Element for placed indicator
 * @property {HTMLElement} weaponsPlaced - Element for weapons placed indicator
 * @property {HTMLElement} zone - Element for zone information
 */

/**
 * Manages the display of score information and ship tally UI.
 * Orchestrates zone information display, counter updates, and tally box rendering.
 * Delegates specific concerns to specialized helper classes:
 * - ZoneInfoManager: Zone display and updates
 * - TallyBuilder: Ship tally construction
 * - WeaponTallyBuilder: Weapon ammo display
 * - DisplacementCalculator: Displacement calculations
 *
 * @class ScoreUI
 */
export class ScoreUI {
  /**
   * Creates a ScoreUI instance.
   *
   * @param {string} playerPrefix - Prefix for HTML element IDs (e.g., 'player1', 'player2')
   *
   * @property {HTMLElement|null} shots - Counter display for shots
   * @property {HTMLElement|null} turns - Counter display for turns
   * @property {HTMLElement|null} dtaps - Counter display for double-taps
   * @property {HTMLElement|null} hits - Counter display for hits
   * @property {HTMLElement|null} misses - Counter display for misses
   * @property {HTMLElement|null} sunk - Display for sunk ships
   * @property {HTMLElement|null} hints - Counter display for hints
   * @property {HTMLElement|null} reveals - Counter display for reveals
   * @property {HTMLElement|null} placed - Display for placed indicator
   * @property {HTMLElement|null} weaponsPlaced - Display for weapons placed indicator
   * @property {HTMLElement|null} zone - Container for zone information
   * @property {HTMLElement|null} shotsLabel - Label for shots counter
   * @property {HTMLElement|null} turnsLabel - Label for turns counter
   * @property {HTMLElement|null} dtapsLabel - Label for dtaps counter
   * @property {HTMLElement|null} hitsLabel - Label for hits counter
   * @property {HTMLElement|null} missesLabel - Label for misses counter
   * @property {HTMLElement|null} sunkLabel - Label for sunk display
   * @property {HTMLElement|null} hintsLabel - Label for hints counter
   * @property {HTMLElement|null} revealsLabel - Label for reveals counter
   * @property {HTMLElement|null} placedLabel - Label for placed indicator
   * @property {HTMLElement|null} weaponsLabel - Label for weapons indicator
   * @property {HTMLElement|null} zoneLabel - Label for zone information
   * @property {HTMLElement|null} tallyBox - Container for tally display
   * @property {Array<Object>} zoneSync - Tracked zone information for updates
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
    this.zoneSync = []
  }

  /**
   * Displays score counters for the game state.
   * Updates all counter displays including calculated values like misses.
   *
   * @param {Array<Object>} ships - Array of ship objects with hit/sunk state
   * @param {number} turns - Number of turns taken
   * @param {number} dtaps - Number of double-taps performed
   * @param {number} shots - Number of shots fired
   * @param {number} reveals - Number of reveals used
   * @param {number} hints - Number of hints used
   * @returns {void}
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
   * Removes 'hidden' class when count > 0, adds it otherwise.
   *
   * @param {HTMLElement|null} field - The field element displaying the count
   * @param {number} count - The count value
   * @param {HTMLElement|null} label - The label element for the counter
   * @returns {void}
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
   * Removes 'hidden' class if value > 0, adds it otherwise.
   *
   * @param {number} value - The value to check for positivity
   * @param {HTMLElement|null} label - The label element to show/hide
   * @returns {void}
   */
  displayIfPositive (value, label) {
    if (value > 0) label?.classList?.remove('hidden')
    else label?.classList?.add('hidden')
  }

  /**
   * Creates a zone title entry with bold text.
   * Delegates to ZoneInfoManager for implementation.
   *
   * @param {string} labelTxt - Title text for the zone
   * @param {Object|string|number} bagOrText - Bag object with size property or numeric/string value
   * @returns {HTMLSpanElement} The count span element for tracking
   */
  createZoneTitle (labelTxt, bagOrText) {
    return ZoneInfoManager.createZoneTitle(this.zone, labelTxt, bagOrText)
  }

  /**
   * Creates a zone item entry with smaller text.
   * Delegates to ZoneInfoManager for implementation.
   *
   * @param {string} labelTxt - Item label text
   * @param {Object|string|number} bagOrText - Bag object with size property or numeric/string value
   * @returns {HTMLSpanElement} The count span element for tracking
   */
  createZoneItem (labelTxt, bagOrText) {
    return ZoneInfoManager.createZoneItem(this.zone, labelTxt, bagOrText)
  }

  /**
   * Creates a zone text entry with custom styling.
   * Delegates to ZoneInfoManager for implementation.
   *
   * @param {string} labelTxt - Label text
   * @param {string|number} text - Content text or numeric value
   * @param {string} stress - HTML tag for label emphasis (b, span, etc.)
   * @param {string} style - CSS style string to apply
   * @returns {HTMLSpanElement} The count span element for tracking
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
   * Delegates to ZoneInfoManager for implementation.
   *
   * @param {string} labelTxt - Label text
   * @param {number} displacedArea - Total available displaced area
   * @param {Array<Object>} ships - Array of ship objects for displacement calculation
   * @param {string} stress - HTML tag for label emphasis (b, span, etc.)
   * @param {string} style - CSS style string to apply
   * @param {number} [extra=0] - Extra displacement to add to calculation
   * @returns {HTMLSpanElement} The count span element for tracking
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
   * Delegates to DisplacementCalculator for implementation.
   *
   * @param {number} ratio - Displacement ratio between 0 and 1
   * @returns {string} Descriptive text for the displacement ratio
   */
  displacementDescription (ratio) {
    return DisplacementCalculator.describeDisplacementRatio(ratio)
  }

  /**
   * Displays zone information by updating tracked entries.
   * Delegates to ZoneInfoManager for implementation.
   *
   * @returns {void}
   */
  displayZoneInfo () {
    ZoneInfoManager.displayZoneInfo(this.zoneSync)
  }

  /**
   * Checks if any non-default zones have information to display.
   * Delegates to ZoneInfoManager for implementation.
   *
   * @returns {boolean} True if zones have non-zero sizes
   */
  hasZoneInfo () {
    return ZoneInfoManager.hasZoneInfo(this.zoneSync)
  }

  /**
   * Displays zone information with displacement area calculations.
   * Delegates to ZoneInfoManager for implementation.
   *
   * @param {GameModel} model - The game model with ships and loadOut
   * @returns {void}
   */
  displayAddZoneInfo (model) {
    ZoneInfoManager.displayAddZoneInfo(this.zone, model)
  }

  /**
   * Sets up zone information display structure.
   * Populates zoneSync with tracker data for later display updates.
   * Delegates to ZoneInfoManager for implementation.
   *
   * @returns {void}
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
   * Clears all content from the tally box element.
   *
   * @returns {void}
   */
  resetTallyBox () {
    this.tallyBox.innerHTML = ''
  }

  /**
   * Creates a tally box element for a ship.
   * Delegates to TallyBuilder for implementation.
   *
   * @param {Object} ship - The ship object with properties like letter, size, hits
   * @returns {HTMLElement} The tally box element for the ship
   */
  buildShipBox (ship) {
    return TallyBuilder.createShipBox(ship)
  }

  /**
   * Builds a tally row for ships of a given letter.
   * Delegates to TallyBuilder for implementation.
   *
   * @param {Array<Object>} ships - All ships to filter and display
   * @param {string} letter - Ship letter identifier to filter ships
   * @param {HTMLElement} rowList - Container element for the tally row
   * @param {((ship: Object) => HTMLElement)} [boxer] - Function to create box element for each ship
   * @param {string} [tallyGroup] - Tally group identifier for grouping ships
   * @returns {void}
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
   *
   * @param {HTMLElement} rowList - Container element for the weapon row
   * @param {ViewModel} viewModel - The view model with display state
   * @param {Object} weaponSystem - The weapon system object with ammo data
   * @returns {void}
   */
  buildBombRow (rowList, viewModel, weaponSystem) {
    WeaponTallyBuilder.buildBombRow(rowList, viewModel, weaponSystem)
  }

  /**
   * Displays ships organized by tally group (sea, land, air, special).
   * Delegates to TallyBuilder for implementation.
   *
   * @param {Array<Object>} ships - All ships to display
   * @param {((ship: Object) => HTMLElement)} [boxer] - Custom function to create ship boxes
   * @returns {void}
   */
  buildShipTally (ships, boxer) {
    TallyBuilder.buildTally(
      this.tallyBox,
      ships,
      [],
      null,
      boxer || this.buildShipBox.bind(this)
    )
  }

  /**
   * Builds tally display from game model with weapons.
   * Delegates to TallyBuilder for implementation.
   *
   * @param {GameModel} model - The game model with ships and weapons
   * @param {ViewModel} viewModel - The view model for display state
   * @returns {void}
   */
  buildTallyFromModel (model, viewModel) {
    TallyBuilder.displayTallyFromModel(this.tallyBox, model, viewModel)
  }

  /**
   * Builds tally display with weapons.
   * Delegates to TallyBuilder for implementation.
   *
   * @param {Array<Object>} ships - All ships to display in tally
   * @param {Array<Object>} weaponSystems - All weapon systems to display
   * @param {ViewModel} viewModel - The view model for display state
   * @returns {void}
   */
  buildTally (ships, weaponSystems, viewModel) {
    TallyBuilder.buildTally(
      this.tallyBox,
      ships,
      weaponSystems || [],
      viewModel,
      this.buildShipBox.bind(this),
      true
    )
  }

  /**
   * Adds ships to the tally display.
   * Delegates to TallyBuilder for implementation.
   *
   * @param {Array<Object>} ships - Ships to add to the tally
   * @returns {void}
   */
  addShipTally (ships) {
    TallyBuilder.addShipTally(this.tallyBox, ships)
  }
}
