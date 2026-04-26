import { bh } from '../../terrains/all/js/bh.js'
import { WeaponTallyBuilder } from './WeaponTallyBuilder.js'

/**
 * Builds visual representations of ships in tally boxes with styling and layout.
 * Manages ship box creation, tally row organization, and terrain-grouped display.
 *
 * @class TallyBuilder
 */
export class TallyBuilder {
  /**
   * Default CSS class names for tally display.
   *
   * @type {Object<string, string>}
   */
  static #CSS_CLASSES = {
    TALLY_BOX: 'tally-box',
    TALLY_ROW: 'tally-row',
    TALLY_CONTAINER: 'tally-group-container',
    TALLY_COLUMN: 'tally-col'
  }

  /**
   * Terrain group identifiers and their CSS classes.
   *
   * @type {Object<string, string>}
   */
  static #TERRAIN_GROUPS = {
    SEA: { id: 'S', class: 'sea' },
    LAND: { id: 'G', class: 'land' },
    AIR: { id: 'A', class: 'air' },
    SPECIAL: { id: 'X', class: 'special' }
  }

  /**
   * Styling for sunk ships in tally display.
   *
   * @type {Object<string, string>}
   */
  static #SUNK_STYLES = {
    TEXT: 'X',
    BACKGROUND: '#ff8080',
    COLOR: '#400'
  }

  /**
   * Creates a visual box for a ship in the tally.
   * Shows ship letter in terrain color, or "X" for sunk ships.
   *
   * @param {Object} ship - Ship object with letter and sunk properties
   * @returns {HTMLDivElement} Configured tally box element
   */
  static createShipBox (ship) {
    const box = document.createElement('div')
    const letter = ship.letter
    const maps = bh.maps

    box.className = this.#CSS_CLASSES.TALLY_BOX

    if (ship.sunk) {
      box.textContent = this.#SUNK_STYLES.TEXT
      box.style.background = this.#SUNK_STYLES.BACKGROUND
      box.style.color = this.#SUNK_STYLES.COLOR
    } else {
      box.textContent = letter
      box.style.background = maps.shipColors[letter] || '#333'
      box.style.color = maps.shipLetterColors[letter] || '#fff'
    }

    return box
  }

  /**
   * Creates a tally row element with optional terrain group styling.
   *
   * @param {string} [tallyGroup] - Group identifier (S/G/A/X)
   * @returns {HTMLDivElement} Configured tally row element
   */
  static createTallyRowElement (tallyGroup) {
    const row = document.createElement('div')
    row.className = this.#CSS_CLASSES.TALLY_ROW

    if (tallyGroup) {
      const terrain = Object.values(this.#TERRAIN_GROUPS).find(
        t => t.id === tallyGroup
      )
      if (terrain) {
        row.classList.add(terrain.class)
      }
    }

    return row
  }

  /**
   * Populates a tally row with ship boxes for a specific letter.
   * Filters ships by letter and adds boxes to the row.
   *
   * @param {Array<Object>} ships - All ships in the game
   * @param {string} letter - Ship letter to filter by
   * @param {HTMLElement} rowContainer - Container row element
   * @param {Function} [boxBuilder] - Optional custom box builder function
   * @param {string} [tallyGroup] - Tally group identifier for styling
   */
  static buildTallyRow (
    ships,
    letter,
    rowContainer,
    boxBuilder = this.createShipBox.bind(this),
    tallyGroup
  ) {
    const row = this.createTallyRowElement(tallyGroup)
    const matching = ships.filter(s => s.letter === letter)

    matching.forEach(ship => {
      const box = boxBuilder(ship)
      row.appendChild(box)
    })

    rowContainer.appendChild(row)
  }

  /**
   * Gets unique sorted letters for ships in a specific terrain group.
   * Used to order display of tally rows.
   *
   * @private
   * @param {Array<Object>} ships - All ships
   * @param {string} tallyGroup - Group identifier (S/G/A/X)
   * @returns {Array<string>} Sorted unique ship letters in this group
   */
  static #getShipLettersForGroup (ships, tallyGroup) {
    return [
      ...new Set(
        ships.filter(s => s.isInTallyGroup(tallyGroup)).map(s => s.letter)
      )
    ].sort((a, b) => a.localeCompare(b))
  }

  /**
   * Gets the tally track (column) with the lower item count.
   * Balances items between sea and land columns.
   *
   * @private
   * @param {Object} count - Count tracker with s and g properties
   * @param {HTMLElement} seaColumn - Sea column element
   * @param {HTMLElement} landColumn - Land column element
   * @returns {Object} Track object with col and inc function
   */
  static #getTallyTrack (count, seaColumn, landColumn) {
    if (count.s < count.g) {
      return { col: seaColumn, inc: () => count.s++ }
    }
    return { col: landColumn, inc: () => count.g++ }
  }

  /**
   * Resets the tally display and builds complete organized view.
   * Arranges ships by terrain group (sea, land, air, special) in balanced columns.
   *
   * @param {HTMLElement} tallyBoxContainer - Container for the tally display
   * @param {Array<Object>} ships - All ships to display
   * @param {Array<Object>} weaponSystems - Weapon systems to display (optional)
   * @param {Function} [shipBoxBuilder] - Custom ship box builder
   * @param {Object} [viewModel] - View model for weapon interaction
   * @param {boolean} [includeWeapons=false] - Whether to include weapon rows
   */
  static buildTally (
    tallyBoxContainer,
    ships,
    weaponSystems = [],
    shipBoxBuilder = this.createShipBox.bind(this),
    viewModel = null,
    includeWeapons = false
  ) {
    tallyBoxContainer.innerHTML = ''

    // Show/hide tally title based on ship count
    const tallyTitle = document.getElementById('tally-title')
    if (tallyTitle) {
      tallyTitle.classList.toggle('hidden', ships.length === 0)
    }

    // Create balanced two-column layout
    const surfaceContainer = document.createElement('div')
    surfaceContainer.classList.add(this.#CSS_CLASSES.TALLY_CONTAINER)

    const seaColumn = document.createElement('div')
    seaColumn.className = this.#CSS_CLASSES.TALLY_COLUMN
    const landColumn = document.createElement('div')
    landColumn.className = this.#CSS_CLASSES.TALLY_COLUMN

    // Get unique letters for each terrain group
    const sea = this.#getShipLettersForGroup(ships, 'S')
    const land = this.#getShipLettersForGroup(ships, 'G')
    const air = this.#getShipLettersForGroup(ships, 'A')
    const special = this.#getShipLettersForGroup(ships, 'X')

    const count = { s: 0, g: 0 }

    // Add sea ships
    for (const letter of sea) {
      this.buildTallyRow(ships, letter, seaColumn, shipBoxBuilder, 'S')
      count.s++
    }

    // Add land ships
    for (const letter of land) {
      this.buildTallyRow(ships, letter, landColumn, shipBoxBuilder, 'G')
      count.g++
    }

    // Add air ships to balanced column
    const airTrack = this.#getTallyTrack(count, seaColumn, landColumn)
    for (const letter of air) {
      this.buildTallyRow(ships, letter, airTrack.col, shipBoxBuilder, 'A')
      airTrack.inc()
    }

    // Add special ships to balanced column
    const specialTrack = this.#getTallyTrack(count, seaColumn, landColumn)
    for (const letter of special) {
      this.buildTallyRow(ships, letter, specialTrack.col, shipBoxBuilder, 'X')
      specialTrack.inc()
    }

    // Add weapons if requested
    if (includeWeapons && viewModel && weaponSystems.length > 0) {
      const weaponTrack = this.#getTallyTrack(count, seaColumn, landColumn)
      for (const weaponSystem of weaponSystems) {
        WeaponTallyBuilder.buildBombRow(
          weaponTrack.col,
          viewModel,
          weaponSystem
        )
      }
    }

    surfaceContainer.appendChild(seaColumn)
    surfaceContainer.appendChild(landColumn)
    tallyBoxContainer.appendChild(surfaceContainer)
  }

  /**
   * Displays ships organized by tally group.
   * Convenience method for ship-only display without weapons.
   *
   * @param {HTMLElement} tallyBoxContainer - Container for display
   * @param {Array<Object>} ships - All ships to display
   * @param {Function} [shipBoxBuilder] - Custom box builder function
   */
  static displayShipTally (
    tallyBoxContainer,
    ships,
    shipBoxBuilder = this.createShipBox.bind(this)
  ) {
    this.buildTally(tallyBoxContainer, ships, [], shipBoxBuilder)
  }

  /**
   * Builds tally display from game model with optional weapons.
   * Orchestrates complete tally construction from model state.
   *
   * @param {HTMLElement} tallyBoxContainer - Container for display
   * @param {Object} model - Game model with ships and loadOut
   * @param {Object} viewModel - View model for weapon interaction
   */
  static displayTallyFromModel (tallyBoxContainer, model, viewModel) {
    this.buildTally(
      tallyBoxContainer,
      model.ships,
      model.loadOut.weaponSystems,
      this.createShipBox.bind(this),
      viewModel,
      true
    )
  }

  /**
   * Builds tally display with specified ships and weapons.
   *
   * @param {HTMLElement} tallyBoxContainer - Container for display
   * @param {Array<Object>} ships - Ships to display
   * @param {Array<Object>} weaponSystems - Weapon systems to display
   * @param {Object} viewModel - View model for interactions
   */
  static displayTallyWithWeapons (
    tallyBoxContainer,
    ships,
    weaponSystems,
    viewModel
  ) {
    this.buildTally(
      tallyBoxContainer,
      ships,
      weaponSystems,
      this.createShipBox.bind(this),
      viewModel,
      true
    )
  }

  /**
   * Adds ships to existing tally display (append mode).
   *
   * @param {HTMLElement} tallyBoxContainer - Container for display
   * @param {Array<Object>} ships - Ships to add
   */
  static addShipTally (tallyBoxContainer, ships) {
    this.buildTally(tallyBoxContainer, ships, [])
  }
}
