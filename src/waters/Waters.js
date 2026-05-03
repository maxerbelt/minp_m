import { bh } from '../terrains/all/js/bh.js'
import {
  randomElement,
  parsePair,
  keyListFromCell,
  parseTriple,
  findClosestCoord,
  coordsFromCell
} from '../core/utilities.js'
import { placedShipsInstance } from '../selection/PlacedShips.js'
import { Score } from './Score.js'
import { gameStatus } from './StatusUI.js'
import { assembleTerrains } from '../terrains/all/js/gameMaps.js'
import { LoadOut } from './LoadOut.js'
import { Ship } from '../ships/Ship.js'
import { WeaponSystem } from '../weapon/WeaponSystem.js'
import { Steps } from './steps.js'
import { Animator } from '../core/Animator.js'
import { ShipCellGrid } from '../grid/rectangle/ShipCellGrid.js'
import { Random } from '../core/Random.js'

/**
 * @typedef {Object} WeaponResult
 * @property {number} hits - Number of hits
 * @property {number} dtaps - Number of double taps
 * @property {number} sunk - Number of ships sunk
 * @property {number} reveals - Number of reveals
 * @property {number} shots - Number of shots fired
 * @property {string} info - Additional information
 */

/**
 * @typedef {Object} WeaponSelection
 * @property {number} launchR - Launch row coordinate
 * @property {number} launchC - Launch column coordinate
 * @property {number} weaponId - Weapon system ID
 * @property {number} hintR - Hint row coordinate
 * @property {number} hintC - Hint column coordinate
 */

/**
 * @typedef {Object} ShipPlacement
 * @property {Array} ships - Array of ships
 * @property {string} map - Map title
 */

/**
 * @typedef {Object} HitResult
 * @property {string} letter - Ship letter
 * @property {string} info - Hit information
 * @property {boolean} damaged - Whether ship was damaged
 * @property {Array} list - List of hit entries
 * @property {Array} misses - List of miss entries
 */

/**
 * Core game logic class managing ship placement, weapon systems, and battle mechanics.
 * Handles the main game state and interactions between ships, weapons, and UI.
 */
export class Waters {
  /**
   * Initializes the Waters game instance with UI and basic setup.
   * @param {Object} ui - The user interface instance
   */
  constructor (ui, playerType = null) {
    assembleTerrains()
    this.ships = []
    this.score = new Score()
    this.opponent = null
    this.UI = ui
    this.shipCellGrid = new ShipCellGrid()
    this.boardDestroyed = false
    this.preamble1 = 'You '
    this.preamble0 = 'Your'
    this.preamble = 'You were '
    if (playerType) {
      this.steps = new Steps(playerType)
      this.initializeSteps()
    }
    this.resetShipCells()
    this.displayInfo = gameStatus.info2.bind(gameStatus)
  }
  /**
   * Gets the clipboard key for storing placed ships.
   * @returns {string} The storage key
   */
  getClipboardKey () {
    return 'geoffs-battleship.placed-ships'
  }

  /**
   * Alias for legacy method name.
   * @returns {string} The storage key
   */
  clipboardKey () {
    return this.getClipboardKey()
  }

  /**
   * Gets the current placed ships data.
   * @returns {ShipPlacement} Current ship placement data
   */
  getPlacedShipsData () {
    return {
      ships: this.ships,
      shipCellGrid: this.shipCellGrid.grid,
      map: bh.map.title
    }
  }

  /**
   * Alias for legacy method name.
   * @returns {ShipPlacement} Current ship placement data
   */
  placedShips () {
    return this.getPlacedShipsData()
  }

  /**
   * Stores the current ship placement to local storage.
   */
  storePlacedShips () {
    // Custom replacer to handle BigInt serialization
    const replacer = (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString()
      }
      return value
    }

    localStorage.setItem(
      this.getClipboardKey(),
      JSON.stringify(this.getPlacedShipsData(), replacer)
    )
  }

  /**
   * Alias for legacy method name.
   */
  store () {
    this.storePlacedShips()
  }

  /**
   * Attempts to place ships randomly on the board.
   * @param {Array} ships - Ships to attempt placement for
   * @param {Function} [onShipPlaced] - Callback when ship is placed
   * @param {Function} [onPlacementReset] - Callback when placement is reset
   * @returns {boolean} True if placement was successful
   */
  attemptToPlaceShips (
    ships,
    onShipPlaced = Function.prototype,
    onPlacementReset = Function.prototype
  ) {
    return this.shipCellGrid.attemptToPlaceShips(
      ships,
      (ship, placedCells) => {
        onShipPlaced?.(ship, placedCells)
        this.recordShipPlacement(placedCells, ship)
      },
      this.handlePlacementFailure.bind(this, onPlacementReset)
    )
  }

  /**
   * Handles placement failure by resetting visuals.
   * @param {Function} onPlacementReset - Reset callback
   * @private
   */
  handlePlacementFailure (onPlacementReset) {
    this.resetShipCells()
    onPlacementReset?.()
    this.UI.placeTally(this.ships)
    this.UI.displayShipInfo(this.ships)
  }

  /**
   * Records a successful ship placement.
   * @param {Array} placedCells - The cells where ship was placed
   * @param {Object} ship - The placed ship
   * @private
   */
  recordShipPlacement (placedCells, ship) {
    this.UI.placement(placedCells, this, ship)
  }
  /**
   * Accumulates weapon result data into an accumulator object.
   * @param {WeaponResult} result - The result to accumulate
   * @param {WeaponResult} accumulator - The accumulator object
   */
  accumulateResult (result, accumulator) {
    if (result?.hits) accumulator.hits += result.hits
    if (result?.dtaps) accumulator.dtaps += result.dtaps
    if (result?.sunk) accumulator.sunk += result.sunk
    if (result?.reveals) accumulator.reveals += result.reveals
    if (result?.shots) accumulator.shots += result.shots
    if (result?.info) accumulator.info += result.info + ' '
  }
  /**
   * Automatically places ships using random placement with callbacks.
   * @param {Function} [onShipPlaced] - Callback when ship is placed
   * @param {Function} [onPlacementReset] - Callback when placement fails
   * @returns {boolean} True if placement succeeded
   */
  autoPlaceWithCallbacks (onShipPlaced, onPlacementReset) {
    const ships = this.initShips()
    return this.performAutoPlacement(ships, onShipPlaced, onPlacementReset)
  }

  /**
   * Automatically places ships with default callbacks.
   * @returns {boolean} True if placement succeeded
   */
  autoPlace () {
    return this.autoPlaceWithCallbacks(
      ship => {
        placedShipsInstance.push(ship, ship.cells)
        ship.addToGrid(this.shipCellGrid)
      },
      () => {
        this.UI.clearVisuals()
        placedShipsInstance.reset()
      }
    )
  }

  /**
   * Automatically places ships with UI clearing callback.
   * @returns {boolean} True if placement succeeded
   */
  autoPlace2 () {
    return this.autoPlaceWithCallbacks(
      null,
      this.UI.clearPlaceVisuals.bind(this.UI)
    )
  }

  /**
   * Performs the actual auto placement logic.
   * @param {Array} ships - Ships to place
   * @param {Function} [onShipPlaced] - Ship placement callback
   * @param {Function} [onPlacementReset] - Placement reset callback
   * @returns {boolean} True if successful
   * @private
   */
  performAutoPlacement (ships, onShipPlaced, onPlacementReset) {
    const maxAttempts = 100

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let placementSuccessful = true
      placementSuccessful = this.attemptToPlaceShips(
        ships,
        onShipPlaced,
        onPlacementReset
      )
      if (placementSuccessful) return true
    }
    return false
  }

  /**
   * Initializes ships for the game.
   * @returns {Array} Initialized ships array
   */
  initShips () {
    this.resetShipCells()
    return this.ensureShipsInitialized()
  }

  /**
   * Ensures ships are initialized from base shapes if needed.
   * @returns {Array} The ships array
   */
  ensureShipsInitialized () {
    if (!this.ships || this.ships.length === 0) {
      this.ships = this.createCandidateShips()
    }
    return this.ships
  }

  /**
   * Loads ships for edit mode from map example or auto-places.
   * @param {Object} [map] - The map to load from
   */
  loadForEdit (map) {
    map = map || bh.map
    this.resetShipCells()
    this.ensureShipsInitialized()

    if (!map.example) {
      this.autoPlace()
      return
    }

    const placedShips = this.validatePlacedShips(map.example, map)
    if (!placedShips) return

    const unmatchedShips = this.placeMatchingShips(
      placedShips,
      this.placeMatchingShipForEdit.bind(this)
    )
    if (unmatchedShips.length > 0) {
      console.log(`${unmatchedShips.length} ships not matched`)
    }
  }

  /**
   * Validates and returns placed ships data.
   * @param {ShipPlacement|Array} placed - Placed ships data
   * @param {Object} map - The map object
   * @returns {ShipPlacement|null} Validated placed ships or null
   */
  validatePlacedShips (placed, map) {
    const placedShips = placed || map.example

    if (Array.isArray(placedShips)) {
      if (placedShips.length === 0) {
        this.autoPlace()
        return null
      }
      return { ships: placedShips, map: map.title }
    } else {
      if (!placedShips?.ships || placedShips.ships.length === 0) {
        this.autoPlace()
        return null
      }
      return placedShips
    }
  }

  /**
   * Sets up weapon fire event handlers.
   */
  setWeaponFireHandlers () {
    this.loadOut.onDestroy = this.destroy.bind(this)
    this.loadOut.onDestroyOneOfMany = this.destroyOne.bind(this)
  }

  /**
   * Returns the active view model for the current opponent or local UI.
   * @param {Object} [oppo] - Optional opponent instance
   * @returns {Object} UI view model
   * @private
   */
  getViewModel (oppo) {
    return oppo?.UI || this.UI
  }

  /**
   * Creates a normalized weapon selection payload.
   * @param {number} launchR - Launch row coordinate
   * @param {number} launchC - Launch column coordinate
   * @param {number} weaponId - Weapon system ID
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   * @returns {WeaponSelection} Weapon selection payload
   * @private
   */
  createWeaponSelection (launchR, launchC, weaponId, hintR, hintC) {
    return { launchR, launchC, weaponId, hintR, hintC }
  }

  /**
   * Adds a source marker for the current weapon selection.
   * @param {Object} viewModel - UI view model instance
   * @param {number} launchR - Launch row coordinate
   * @param {number} launchC - Launch column coordinate
   * @param {HTMLElement|null} cell - Candidate cell element
   * @private
   */
  addSelectionSource (viewModel, launchR, launchC, cell) {
    this.steps.addSource(
      viewModel,
      launchR,
      launchC,
      cell || viewModel.gridCellAt(launchR, launchC)
    )
  }

  /**
   * Checks whether repeated clicks should filter out previously selected source keys.
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   * @param {Array} keyIds - Cell key collection
   * @returns {boolean} True when repeated selection filtering applies
   * @private
   */
  shouldFilterPreviousSourceKeys (hintR, hintC, keyIds) {
    return (
      hintR === this.lastClick?.r &&
      hintC === this.lastClick?.c &&
      (!this.previousSources || this.previousSources.size < keyIds.length)
    )
  }

  /**
   * Filters weapon keys to only include loaded weapons.
   * @param {Array<string>} keyIds - Candidate key identifiers
   * @returns {Array<string>} Filtered keys for loaded weapons
   * @private
   */
  filterLoadedWeaponKeys (keyIds) {
    const loadedWeaponIds = new Set(
      this.loadOut.getLoadedWeapons().map(w => w.id)
    )
    return keyIds.filter(key => {
      const [, , weaponId] = parseTriple(key)
      return loadedWeaponIds.has(weaponId)
    })
  }

  /**
   * Finds the closest weapon key to the hint coordinates.
   * @param {Array<string>} filteredKeys - Filtered weapon keys
   * @param {number} hintC - Hint column coordinate
   * @param {number} hintR - Hint row coordinate
   * @returns {string|null} The closest key or null
   * @private
   */
  findClosestWeaponKey (filteredKeys, hintC, hintR) {
    return findClosestCoord(filteredKeys, hintC, hintR, k => parseTriple(k))
  }

  /**
   * Processes the selected weapon key and adds necessary UI elements.
   * @param {string} selectedKey - The selected weapon key
   * @param {Object} viewModel - UI view model
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   * @returns {WeaponSelection} Weapon selection payload
   * @private
   */
  processSelectedWeaponKey (selectedKey, viewModel, hintR, hintC) {
    const [launchC, launchR, weaponId] = parseTriple(selectedKey)
    this.addSelectionSource(viewModel, launchR, launchC, null)

    const ship = this.loadOut.getShipByWeaponId(weaponId)
    if (ship) {
      this.steps.addShip(ship)
      const [sourceR, sourceC] = this.generateSourceHint(ship)
      this.createShadowSource(sourceR, sourceC)
    }

    return this.createWeaponSelection(launchR, launchC, weaponId, hintR, hintC)
  }

  /**
   * Selects a loaded weapon system by cell key values.
   * @param {HTMLElement} cell - Cell element used for selection
   * @param {Array<string>} keyIds - Candidate key identifiers
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   * @param {boolean} random - Whether to select randomly
   * @param {Object} viewModel - UI view model
   * @returns {WeaponSelection} Weapon selection payload
   * @private
   */
  selectWeaponFromCell (cell, keyIds, hintR, hintC, random, viewModel) {
    let availableKeys = [...keyIds]
    if (this.shouldFilterPreviousSourceKeys(hintR, hintC, keyIds)) {
      availableKeys = availableKeys.filter(k => !this.previousSources.has(k))
    } else {
      this.previousSources = new Set()
    }
    this.lastClick = { r: hintR, c: hintC }

    const filteredKeys = this.filterLoadedWeaponKeys(availableKeys)
    const selectedKey =
      random || !filteredKeys.length
        ? randomElement(filteredKeys)
        : this.findClosestWeaponKey(filteredKeys, hintC, hintR)

    if (!selectedKey) {
      return this.selectRandomWeapon()
    }

    this.previousSources.add(selectedKey)
    return this.processSelectedWeaponKey(selectedKey, viewModel, hintR, hintC)
  }

  /**
   * Selects a loaded weapon system from a ship's available entries.
   * @param {Object} ship - Ship instance with loaded weapons
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   * @param {boolean} random - Whether to select randomly
   * @param {Object} viewModel - UI view model
   * @param {HTMLElement|null} cell - Candidate cell element
   * @returns {WeaponSelection} Weapon selection payload
   * @private
   */
  selectWeaponFromShip (ship, hintR, hintC, random, viewModel, cell) {
    const entries = ship.getLoadedWeaponEntries()
    const [key, weapon] = random
      ? randomElement(entries)
      : findClosestCoord(entries, hintR, hintC, ([k]) => parsePair(k))

    const [launchC, launchR] = parsePair(key)
    const selectedCell = cell || viewModel.gridCellAt(launchR, launchC)
    this.steps.addSource(viewModel, launchR, launchC, selectedCell)

    return this.createWeaponSelection(launchR, launchC, weapon.id, hintR, hintC)
  }

  /**
   * Places matching ships from loaded data using a placer function.
   * @param {ShipPlacement} placedShips - The placed ships data
   * @param {Function} placer - Function to place individual ships
   * @returns {Array} Array of ships that couldn't be matched
   */
  placeMatchingShipsFromData (placedShips, placer) {
    const matchableShips = [...this.ships]
    for (const ship of placedShips.ships) {
      const matchingShip = removeFirstMatching(
        matchableShips,
        s => s.letter === ship.letter,
        ship
      )
      if (matchingShip) {
        this.applyExtraInfoToMatchingShip(matchingShip, ship)
        placer(matchingShip, ship)
      }
    }
    return matchableShips
  }

  /**
   * Alias for legacy method name.
   * @param {ShipPlacement} placedShips - The placed ships data
   * @param {Function} placer - Function to place individual ships
   * @returns {Array} Array of ships that couldn't be matched
   */
  placeMatchingShips (placedShips, placer) {
    return this.placeMatchingShipsFromData(placedShips, placer)
  }

  placeMatchingShipForEdit (matchingShip, ship) {
    matchingShip.cells = ship.cells
    placedShipsInstance.push(matchingShip, ship.cells)
    matchingShip.addToGrid(this.shipCellGrid)
    this.UI.placement(ship.cells, this, matchingShip)
  }

  placeMatchingShip (matchingShip, ship) {
    matchingShip.placeAtCells(ship.cells)

    matchingShip.addToGrid(this.shipCellGrid)
    this.UI.placement(ship.cells, this, matchingShip)
    const dragship = this.UI.trayManager.getTrayItem(ship.id)
    if (dragship) {
      this.UI.removeDragShip(dragship)
    } else {
      //    console.log('drag ship not found : ', JSON.stringify(ship))
    }
  }

  applyExtraInfoToMatchingShip (matchingShip, ship) {
    matchingShip.variant = ship.variant
    matchingShip.weapons = ship.weapons
  }

  applyWeaponsToMatchingShip (ship, values, matchingShip) {
    const keys = Object.keys(ship.weapons)
    if (values.length === keys.length) {
      matchingShip.weapons = {}
      for (const [index, key] of keys.entries()) {
        matchingShip.weapons[key] = values[index]
      }
    }
  }
  /**
   * Loads placed ships from storage or data.
   * @param {ShipPlacement} [placedShips] - Placed ships data to load
   */
  load (placedShips) {
    const map = bh.map
    this.initShips()

    placedShips = this.retrievePlacedShips(placedShips, map)
    if (!placedShips) return

    this.updateGlobalIds(placedShips)
    const unmatchedShips = this.placeMatchingShips(
      placedShips,
      this.placeMatchingShip.bind(this)
    )
    if (unmatchedShips.length === 0) {
      this.UI.trayManager.resetTrays()
    } else {
      console.log(`${unmatchedShips.length} ships not matched`)
    }
  }

  /**
   * Retrieves placed ships from storage or validates provided data.
   * @param {ShipPlacement} [placedShips] - Placed ships data
   * @param {Object} map - The map object
   * @returns {ShipPlacement|null} Retrieved or validated placed ships
   */
  retrievePlacedShips (placedShips, map) {
    const stored = localStorage.getItem(this.getClipboardKey())
    placedShips = placedShips || (stored ? JSON.parse(stored) : null)

    if (map.title !== placedShips?.map) {
      placedShips = null
    }
    return this.validatePlacedShips(placedShips, map)
  }

  /**
   * Updates global ID counters based on loaded ships.
   * @param {ShipPlacement} placedShips - The placed ships data
   */
  updateGlobalIds (placedShips) {
    const { maxShipId, maxWeaponId } = placedShips.ships.reduce(
      (accumulator, ship) => {
        accumulator.maxShipId = Math.max(ship.id, accumulator.maxShipId)
        accumulator.maxWeaponId = Object.values(ship.weapons).reduce(
          (weaponMax, weapon) => Math.max(weapon.id, weaponMax),
          accumulator.maxWeaponId
        )
        return accumulator
      },
      { maxShipId: 1, maxWeaponId: 1 }
    )
    Ship.id = maxShipId + 1
    WeaponSystem.id = maxWeaponId + 1
  }

  /**
   * Resets the map state and loads new map configuration.
   * @param {Object} map - The map to set
   */
  resetMap (map) {
    this.boardDestroyed = false
    this.isRevealed = false
    this.setMap(map)
  }

  /**
   * Arms weapons for all ships on the map.
   * @param {Object} [map] - The map to arm weapons for
   */
  armWeapons (map) {
    map = map || bh.map
    const weaponShips = this.determineWeaponShips(map)

    this.configureLoadOut(map, weaponShips)
    this.setCursorChangeCallback()
  }

  /**
   * Determines which ships should have weapons based on map configuration.
   * @param {Object} map - The map object
   * @returns {Array} Array of ships with weapons
   */
  determineWeaponShips (map) {
    let weaponShips = this.ships.filter(ship => ship.hasWeapon)
    this.hasAttachedWeapons = weaponShips.length > 0
    if (bh.seekingMode && this.hasAttachedWeapons) {
      weaponShips = map.extraArmedFleetForMap
    }
    this.weaponShips = weaponShips
    return weaponShips
  }

  /**
   * Configures the load out system for weapons.
   * @param {Object} map - The map object
   * @param {Array} weaponShips - Ships with weapons
   */
  configureLoadOut (map, weaponShips) {
    const opponent = this.opponent
    if (bh.seekingMode && this.hasAttachedWeapons) {
      this.loadOut = this.createLoadOut(map, weaponShips)
    } else if (opponent) {
      const opponentWeaponShips = opponent.ships.filter(ship => ship.hasWeapon)
      this.loadOut = this.createLoadOut(map, opponentWeaponShips)
    } else {
      this.loadOut = this.createLoadOut(map, weaponShips)
    }
  }

  /**
   * Sets up cursor change callback if available.
   */
  setCursorChangeCallback () {
    this.loadOut.onCursorChangeCallback = this.cursorChange.bind(this)
  }

  /**
   * Creates a load out instance for the given map and ships.
   * @param {Object} map - The map object
   * @param {Array} ships - Ships to include in load out
   * @returns {LoadOut} The created load out
   */
  createLoadOut (map, ships) {
    ships = ships || this.weaponShips
    return new LoadOut(map.weapons, ships, this.UI, this.steps)
  }
  /**
   * Displays auto-selection warning for weapons.
   * @param {string} weaponName - Name of the weapon
   * @param {Object} currentShip - The ship with the weapon
   */
  displayAutoSelectWarning (weaponName, currentShip) {
    this.displayInfo(
      `Auto-selected ${weaponName}, Click near ${
        currentShip.shape().descriptionText
      } to select a different ${weaponName}`
    )
  }

  /**
   * Selects a random weapon system and returns its targeting information.
   * @returns {WeaponSelection} Weapon selection data
   */
  selectRandomWeapon () {
    const armedShips = this.loadOut.getCurrentWeaponSystem().armedShips()
    const selectedShip = randomElement(armedShips)

    if (!selectedShip) {
      return this.createEmptyWeaponSelection()
    }

    this.steps.addShip(selectedShip)
    return this.generateWeaponSelectionForShip(selectedShip)
  }

  /**
   * Creates an empty weapon selection when no armed ships are available.
   * @returns {WeaponSelection} Empty selection object
   * @private
   */
  createEmptyWeaponSelection () {
    return {
      launchR: null,
      launchC: null,
      weaponId: null,
      hintR: null,
      hintC: null
    }
  }

  /**
   * Determines if hint coordinates are valid for weapon selection.
   * @param {Array} hintCoords - [r, c] coordinates
   * @returns {boolean} True if coordinates are valid
   * @private
   */
  areHintCoordsValid (hintCoords) {
    return hintCoords[0] != null && hintCoords[1] != null
  }

  /**
   * Generates weapon selection for a ship with valid hint coordinates.
   * @param {Object} ship - The ship to generate selection for
   * @param {Array} hintCoords - Valid hint coordinates [r, c]
   * @returns {WeaponSelection} Weapon selection data
   * @private
   */
  generateWeaponSelectionWithHint (ship, hintCoords) {
    const cell = this.createShadowSource(hintCoords[0], hintCoords[1])
    return this.selectWeaponId(
      cell,
      hintCoords[0],
      hintCoords[1],
      'random',
      ship
    )
  }

  /**
   * Generates weapon selection for a ship with default coordinates.
   * @param {Object} ship - The ship to generate selection for
   * @returns {WeaponSelection} Weapon selection data
   * @private
   */
  generateWeaponSelectionWithDefaults (ship) {
    return this.selectWeaponId(null, 0, 0, 'random', ship)
  }

  /**
   * Generates weapon selection data for a given ship.
   * @param {Object} ship - The ship to generate selection for
   * @returns {WeaponSelection} Weapon selection data
   * @private
   */
  generateWeaponSelectionForShip (ship) {
    const opponent = this.opponent
    const hintCoords = opponent
      ? this.generateSourceHint(ship, opponent)
      : [null, null]

    if (!opponent || !this.areHintCoordsValid(hintCoords)) {
      return this.generateWeaponSelectionWithDefaults(ship)
    }

    return this.generateWeaponSelectionWithHint(ship, hintCoords)
  }

  /**
   * Generates a source hint for weapon targeting.
   * @param {Object} ship - The ship to generate hint for
   * @param {Object} opponent - The opponent instance
   * @returns {Array} [r, c] coordinates for hint
   * @private
   */
  generateSourceHint (ship, opponent) {
    if (this.steps.sourceHint) {
      return [this.steps.sourceHint.r, this.steps.sourceHint.c]
    }
    return this.generateRandomSourceHint(ship, opponent)
  }

  /**
   * Generates a random source hint around opponent ships.
   * @param {Object} ship - The ship to generate hint for
   * @param {Object} opponent - The opponent instance
   * @returns {Array} [r, c] coordinates for hint
   * @private
   */
  generateRandomSourceHint (ship, opponent) {
    const surroundingCells = this.getSurroundingCells(ship, opponent)
    if (surroundingCells.length === 0) {
      console.warn(
        'no surround cells found for random weapon hint, using 0,0 as hint'
      )
      this.steps.addHint(this.UI, 0, 0, this.UI.gridCellAt(0, 0))
      return [null, null]
    }
    const hintKey = randomElement(surroundingCells)
    const [r, c] = parsePair(hintKey)
    this.steps.addHint(opponent.UI, r, c, opponent.UI.gridCellAt(r, c))
    return [r, c]
  }

  /**
   * Gets surrounding cells for a ship relative to opponent.
   * @param {Object} ship - The ship
   * @param {Object} opponent - The opponent instance
   * @returns {Array} Array of surrounding cell keys
   * @private
   */
  getSurroundingCells (ship, opponent) {
    if (!opponent) return []
    const cells = ship.cells
    const surrounding = [...opponent.UI.surroundCells(cells)]
    return surrounding
  }

  /**
   * Creates a shadow source at the given coordinates.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Object} The shadow cell
   */
  createShadowSource (r, c) {
    const opponent = this.opponent
    if (opponent) {
      const opponentCell = opponent.UI.gridCellAt(r, c)
      this.steps.addShadow(opponent.UI, r, c, opponentCell)
      return opponentCell
    } else {
      return this.UI.gridCellAt(r, c)
    }
  }

  selectAndArmWps (rack, oppo, launchR, launchC, hintR, hintC, cell) {
    const weapon = rack?.weapon
    const letter = weapon?.letter
    if (weapon.givesHint) {
      this.opponent.UI.deactivateTempHints()
      cell.classList.add('temp-hint')
    }
    this.addSource(oppo, launchR, launchC, rack, cell)
    const { shadowR, shadowC } = this.steps.addRack(
      rack,
      weapon,
      letter,
      weapon?.id,
      launchR,
      launchC,
      cell,
      hintR,
      hintC
    )
    if (letter) {
      this.loadOut.switchToWeapon(letter)
      if (weapon.postSelectCursor === 0) {
        this.loadOut.clearSelectedCoordinates()
      } else {
        this.loadOut.addSelectedCoordinates(shadowR, shadowC)
      }

      rack.launchCoord = [launchR, launchC]

      rack.hintCoord = [hintR, hintC]
      this.loadOut.launch = async coords => {
        return await this.launchTo(coords, hintR, hintC, rack)
      }
      this.loadOut.selectedWeapon = rack
    }
  }

  addSource (oppo, launchR, launchC, rack, cell) {
    if (this.steps.source === null) {
      const viewModel = oppo?.UI || this.UI
      this.steps.addSource(viewModel, launchR, launchC, cell)
      console.warn(
        'no source found when selecting and arming weapon, adding source with launch coords'
      )
    }
    if (!bh.terrain.hasUnattachedWeapons && !this.steps.sourceShip) {
      console.warn(
        'Terrain does not have unattached weapons, but a weapon is without a source ship'
      )
      const ship = this.loadOut.getShipByWeaponId(rack?.id)
      this.steps.addShip(ship)
    }
  }

  selectAttachedWeapon (cell, r, c, oppo) {
    const { launchR, launchC, weaponId, hintR, hintC } = this.selectWeaponId(
      cell,
      r,
      c,
      false,
      null,
      oppo
    )

    this.selectAndArmWeaponId(
      weaponId,
      oppo,
      launchR,
      launchC,
      hintR,
      hintC,
      cell
    )
  }

  randomAttachedWeapon (oppo) {
    const { launchR, launchC, weaponId, hintR, hintC } =
      this.selectRandomWeapon()
    const cell = this.opponent.UI.gridCellAt(hintR, hintC)
    this.selectAndArmWeaponId(
      weaponId,
      oppo,
      launchR,
      launchC,
      hintR,
      hintC,
      cell
    )
  }

  selectAndArmWeaponId (weaponId, oppo, launchR, launchC, hintR, hintC, cell) {
    if (weaponId < 1) {
      return
    }
    const rack = this.loadOut.getWeaponBySystemId(weaponId)
    this.selectAndArmWps(rack, oppo, launchR, launchC, hintR, hintC, cell)
  }

  /**
   * Launches randomly selected weapon at specified location.
   * Returns true if weapon was successfully launched (no result).
   *
   * @param {number} r - Target row coordinate
   * @param {number} c - Target column coordinate
   * @param {boolean} [autoSelectWarning] - Unused parameter (for API compatibility)
   * @returns {Promise<null|{ weapon: Object, score: Object}|{ hasTargettedWeapon: boolean }>} Result with weapon and score
   */
  async launchRandomWeapon (r, c, autoSelectWarning = true) {
    const result = (await this.launchUnattachedWeapon(r, c)) || {}
    if (result?.score && result.score !== LoadOut.noResult) {
      return result
    }
    result['hasTargettedWeapon'] =
      this.hasTargettedRandomWeaponBase(autoSelectWarning)
    return result
  }

  hasTargettedRandomWeaponBase (autoSelectWarning = true) {
    const current = this.loadOut.getCurrentWeaponSystem()
    const attached = current.hasAmmo()
    if (attached) {
      return this.hasTargettedRandomWeaponForWps(autoSelectWarning)
    }
    return false
  }

  /**
   * Creates a default weapon selection when no valid selection is possible.
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   * @returns {WeaponSelection} Default weapon selection
   * @private
   */
  createDefaultWeaponSelection (hintR, hintC) {
    this.addSelectionSource(this.UI, 0, 0, this.UI.gridCellAt(0, 0))
    return this.createWeaponSelection(0, 0, -1, hintR, hintC)
  }

  /**
   * Handles weapon selection when a specific ship is provided.
   * @param {Object} ship - The ship to select weapon for
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   * @param {boolean|string} random - Whether to select randomly
   * @param {Object} viewModel - UI view model
   * @param {HTMLElement|null} cell - Cell element
   * @returns {WeaponSelection} Weapon selection payload
   * @private
   */
  handleShipBasedWeaponSelection (ship, hintR, hintC, random, viewModel, cell) {
    return this.selectWeaponFromShip(
      ship,
      hintR,
      hintC,
      random,
      viewModel,
      cell
    )
  }

  /**
   * Handles weapon selection when no cell is provided.
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   * @returns {WeaponSelection} Weapon selection payload
   * @private
   */
  handleNullCellWeaponSelection (hintR, hintC) {
    return this.createDefaultWeaponSelection(hintR, hintC)
  }

  /**
   * Handles weapon selection when cell has no valid keys.
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   * @returns {WeaponSelection} Weapon selection payload
   * @private
   */
  handleNoKeysWeaponSelection (hintR, hintC) {
    return this.createDefaultWeaponSelection(hintR, hintC)
  }

  /**
   * Handles weapon selection from cell keys.
   * @param {HTMLElement} cell - Cell element
   * @param {Array<string>} keys - Weapon keys
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   * @param {boolean|string} random - Whether to select randomly
   * @param {Object} viewModel - UI view model
   * @returns {WeaponSelection} Weapon selection payload
   * @private
   */
  handleCellBasedWeaponSelection (cell, keys, hintR, hintC, random, viewModel) {
    return this.selectWeaponFromCell(
      cell,
      keys,
      hintR,
      hintC,
      random,
      viewModel
    )
  }

  /**
   * Selects a weapon system by ID with various selection strategies.
   * @param {HTMLElement|null} cell - Cell element for selection
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   * @param {boolean|string} random - Whether to select randomly
   * @param {Object} [ship] - Specific ship to select from
   * @param {Object} [oppo] - Opponent instance
   * @returns {WeaponSelection} Weapon selection payload
   */
  selectWeaponId (cell, hintR, hintC, random, ship, oppo) {
    oppo = oppo || this.opponent
    const viewModel = this.getViewModel(oppo)

    if (ship) {
      return this.handleShipBasedWeaponSelection(
        ship,
        hintR,
        hintC,
        random,
        viewModel,
        cell
      )
    }

    if (cell === null) {
      return this.handleNullCellWeaponSelection(hintR, hintC)
    }

    const keys = keyListFromCell(cell, 'keyIds')
    if (!keys) {
      return this.handleNoKeysWeaponSelection(hintR, hintC)
    }

    return this.handleCellBasedWeaponSelection(
      cell,
      keys,
      hintR,
      hintC,
      random,
      viewModel
    )
  }

  hasTargettedRandomWeaponForWps (autoSelectWarning = true) {
    this.randomAttachedWeapon(this.opponent)
    const currentWeapon = this.loadOut.selectedWeapon

    if (!currentWeapon) return false
    const currentShip = this.loadOut.getShipByWeaponId(currentWeapon.id)
    const weaponName = currentWeapon.weapon?.name || 'weapon'
    if (autoSelectWarning)
      this.displayAutoSelectWarning(weaponName, currentShip)
    this.loadOut.launch = (coords, weapon, wps) => {
      return this.launchWeapon(wps, coords)
    }
    return true
  }
  get currentWeaponSystem () {
    return this.loadOut.selectedWeapon || this.loadOut.getCurrentWeaponSystem()
  }
  get currentWeapon () {
    const wps = this.currentWeaponSystem
    return wps?.weapon
  }

  async fireWeaponAt (
    row,
    col,
    weaponSystem = this.loadOut.selectedWeapon,
    launch = this.loadOut.launch
  ) {
    return await this.loadOut.aimWeapon(bh.map, row, col, weaponSystem, launch)
  }
  async launchSelectedWeapon (r, c) {
    if (this.loadOut.isArmed()) {
      return await this.fireWeaponAt(r, c, this.loadOut.selectedWeapon)
    }
    return null
  }

  async launchUnattachedWeapon (r, c) {
    const unAttached = this.getUnattachedWeaponSystem()
    if (unAttached) {
      const launch = async coords => {
        return await this.launchTo(coords, bh.map.rows - 1, 0, unAttached)
      }
      const result = await this.fireWeaponAt(r, c, unAttached, launch)
      if (result?.score && result.score !== LoadOut.noResult) {
        return result
      }
    }
    return null
  }
  async launchSingleShot (r, c, sShot) {
    this.loadOut.onDestroy = (weapon, affectedArea) => {
      return this.processShot(weapon, ...(affectedArea?.[0] || []))
    }

    const { fireSingleShot, coordinates, wps } = this.loadOut.aimSingleShotInfo(
      sShot,
      r,
      c
    )
    await this.launchTo(coordinates, bh.map.rows - 1, 0, wps)

    const score = fireSingleShot()
    return { weapon: wps.weapon, score }
  }

  getUnattachedWeaponSystem () {
    if (this.opponent == null || bh.seekingMode) {
      return this.loadOut.getCurrentWeaponSystem().getLoadedWeapon()
    } else {
      return this.loadOut.getUnattachedWeaponSystem()
    }
  }

  async launchTo (coords, rr, cc, currentWps) {
    return await currentWps.weapon.launchTo(
      coords,
      rr,
      cc,
      bh.map,
      this.UI,
      this.opponent?.UI,
      this
    )
  }
  async launchWeapon (wps, coords) {
    const { r, c } = this.steps.sourceHint || { r: 0, c: 0 }
    return await this.launchTo(coords, r, c, wps)
  }

  setupAttachedAim () {
    const oppo = this.opponent
    if (bh.seekingMode || !this.loadOut || !oppo) return
    const armedShips = this.loadOut.getArmedShips()
    for (const ship of armedShips) {
      const cells = oppo.shipCells(ship.id)
      const surround = oppo.UI.surroundCellElement(cells)
      for (const cell of surround) {
        if (!cell.dataset.listen) {
          const [r, c] = coordsFromCell(cell)
          cell.addEventListener(
            'click',
            this.onClickOppoCell.bind(this, r, c, ship.id)
          )
          cell.dataset.listen = true
          const w = ship.getPrimaryWeapon()
          const cursor = w?.launchCursor
          if (cursor) cell.classList.add(cursor)
        }
      }
    }
  }
  resetBase () {
    this.boardDestroyed = false
    this.UI.board.classList.remove('destroyed')
    this.score.reset()
  }
  setMap (map) {
    map = map || bh.map
    if (!this.ships || this.ships.length === 0) {
      this.ships = map.newFleetForMap
      this.armWeapons(map)
    }
    for (const ship of this.ships) {
      ship.reset()
    }
  }
  handleHint (r, c) {
    this.opponent?.score?.hintReveal?.(r, c)
  }
  getTarget (effect, weapon) {
    const candidates = this.getHitCandidates(effect, weapon)
    return randomElement(candidates)
  }
  getHitCandidates (effect, weapon) {
    const candidates = []
    const map = bh.map
    const maps = bh.maps
    for (const [r, c, power] of effect) {
      if (map.inBounds(r, c) && this.score.newShotKey(r, c) !== null) {
        const cell = this.UI.gridCellAt(r, c)
        this.addWake(cell, r, c, weapon)
        const shipCell = this.shipCellAt(r, c)
        if (shipCell !== null) {
          const shape = maps.shapesByLetter[shipCell.letter]
          const protection = shape.protectionAgainst(weapon.letter)

          if (power >= protection || (power === 1 && protection === 2)) {
            candidates.push([r, c, power])
          }
        }
      }
    }
    return candidates
  }

  addWake (cell, r, c, weapon) {
    if (!weapon.hasWake) return
    if (
      !cell.classList.contains('frd-hit') &&
      !cell.classList.contains('miss') &&
      !cell.classList.contains('hit')
    ) {
      cell.classList.add('wake')
      this.score.wakeReveal(r, c)
    }
  }
  /**
   * Checks if there are no hit candidates.
   * @param {Array} hitCandidates - The hit candidates.
   * @returns {boolean} True if no candidates.
   */
  hasNoHitCandidates (hitCandidates) {
    return hitCandidates.length < 1
  }

  /**
   * Handles the case when there are no hit candidates.
   * @param {*} weapon - The weapon.
   * @param {Array} effect - The effect.
   * @param {Object} options - Additional options.
   * @returns {*} The destruction result.
   */
  async handleNoHits (weapon, effect, options) {
    if (options?.crashLoc) {
      const splashEffect = await this.getCrashSplash(
        weapon,
        options.crashLoc,
        effect,
        options
      )
      let result = await this.destroy(weapon, effect, options)
      console.log('Crash Splash Effect:', splashEffect)
      options.isSplash = true
      const splashResult = await this.destroy(weapon, splashEffect, options)
      this.accumulateResult(splashResult, result)
      return result
    }
    return await this.destroy(weapon, effect, options)
  }

  /**
   * Handles the case when there are hit candidates.
   * @param {*} weapon - The weapon.
   * @param {Array} effect - The effect.
   * @param {Array} target - The target.
   * @param {Array} hitCandidates - The hit candidates.
   * @returns {*} The destruction result.
   */
  handleHits (weapon, effect, target, hitCandidates, options) {
    const resolvedTarget = this.resolveTarget(target, hitCandidates)
    if (this.shouldUseCrashSplash(weapon, resolvedTarget, options)) {
      const splashEffect = this.getCrashSplash(
        weapon,
        options.crashLoc,
        effect,
        options
      )

      options.isSplash = true
      return this.destroy(weapon, splashEffect, options)
    }
    const splashEffect = this.getStrikeSplash(
      weapon,
      resolvedTarget,
      effect,
      options
    )

    return this.destroy(weapon, splashEffect, options)
  }
  /**
   * Initializes the steps event handlers.
   */
  initializeSteps () {
    this.steps.onEndTurn = this.handleEndTurn.bind(this)
    this.steps.onHint = this.handleHint.bind(this)
  }

  /**
   * Handles end of turn event.
   * Finishes opponent turn and triggers opponent begin turn if game not over.
   *
   */
  handleEndTurn () {
    if (this?.opponent == null) {
      return
    }
    if (!this.opponent.boardDestroyed) {
      this.opponent?._handleBeginTurn?.()
    }
  }
  /**
   * Resolves the target from hit candidates.
   * @param {Array} target - The provided target.
   * @param {Array} hitCandidates - The candidates.
   * @returns {Array} The resolved target.
   */
  resolveTarget (target, hitCandidates) {
    if (!target || target.length < 2) {
      return Random.element(hitCandidates)
    }
    return target
  }
  /**
   * Destroys one target with the given weapon and effect.
   * @param {*} weapon - The weapon used.
   * @param {Array} effect - The effect coordinates.
   * @param {Array} [target] - Optional target coordinates.
   * @param {Object} [options] - Additional options for destruction.
   * @returns {*} The result of the destruction.
   */
  destroyOne (weapon, effect, target = null, options = {}) {
    const hitCandidates = this.getHitCandidates(effect, weapon)
    if (this.hasNoHitCandidates(hitCandidates)) {
      return this.handleNoHits(weapon, effect, options)
    }
    return this.handleHits(weapon, effect, target, hitCandidates, options)
  }

  /**
   * Checks if crash splash should be used.
   * @private
   * @param {*} weapon - The weapon.
   * @param {Array} resolvedTarget - The resolved target.
   * @returns {boolean} True if crash splash.
   */
  shouldUseCrashSplash (weapon, resolvedTarget, options) {
    return (
      weapon.crashOverSplash &&
      options?.crashLoc &&
      resolvedTarget[0] === options?.crashLoc[0] &&
      resolvedTarget[1] === options?.crashLoc[1]
    )
  }

  getStrikeSplash (weapon, targetCoords, effect, options) {
    this.animateStrikeSplash(targetCoords, weapon)
    return weapon.splash(bh.map, targetCoords, effect, options)
  }

  async animateStrikeSplash (targetCoords, weapon) {
    const cellSize = this.UI.cellSizeScreen()
    const targetCell = this.UI.gridCellAt(targetCoords[0], targetCoords[1])
    await weapon.animateSplashExplode(targetCell, cellSize)
  }

  getCrashSplash (weapon, targetCoords, effect, options) {
    this.animateStrikeSplash(targetCoords, weapon)
    return weapon?.crashSplash(bh.map, targetCoords, effect, options)
  }
  shipsSunk () {
    return this.ships.filter(s => s.sunk)
  }
  shipsUnsunk () {
    return this.ships.filter(s => !s.sunk)
  }
  shapesUnsunk () {
    return [...new Set(this.shipsUnsunk().map(s => s.shape()))]
  }
  shapesCanBeOn (subterrain, zone) {
    return this.shapesUnsunk().filter(s => s.canBeOn(subterrain, zone))
  }

  createCandidateWeapons () {
    const candidates = bh.map.terrain.weapons.weapons

    return candidates
  }
  createCandidateShips () {
    const maps = bh.maps

    const baseShapes = maps.baseShapes
    const ships = Ship.createShipsFromShapes(baseShapes)
    return ships
  }
  resetShipCells () {
    this.shipCellGrid.reset()
  }
  armedCells () {
    return this.cellList().filter(c => c.dataset.ammo > 0)
  }
  armedCellsWithWeapon (letter) {
    return this.cellList().filter(
      c => c.dataset.ammo > 0 && c.dataset.wletter === letter
    )
  }
  shipCells (id) {
    let list = []
    for (const cell of this.cellsOnBoard()) {
      if (Number.parseInt(cell.dataset.id) === id) {
        list.push(cell)
      }
    }
    return list
  }
  cellList () {
    return [...this.cellsOnBoard()]
  }
  cellsOnBoard () {
    return this.UI.board.children
  }

  recordAutoMiss (r, c) {
    const key = this.score.addAutoMiss(r, c)
    if (!key) return // already shot here
    this.UI.cellMiss(r, c)
  }
  recordFleetSunk () {
    this.displayInfo('All ' + this.preamble0 + ' Ships Destroyed!')
    this.UI.displayFleetSunk()
    this.boardDestroyed = true
    this._hideWaiting()
    this.opponent?._hideWaiting()
  }
  checkFleetSunk () {
    if (this.ships.every(s => s.sunk)) {
      this.recordFleetSunk()
    }
  }
  shipCellAt (r, c) {
    return this.shipCellGrid.cellAtRC(r, c)
  }
  markSunk (ship) {
    this.UI.displaySurround(
      ship.cells,
      ship.letter,
      (r, c) => this.recordAutoMiss(r, c),
      (c, r, letter) => this.UI.cellSunkAt(r, c, letter)
    )
    this.checkFleetSunk()
  }
  get onSunk () {
    return this.markSunk.bind(this)
  }

  markHit (r, c, damaged) {
    this.score.reveal.clear(r, c)
    this.UI.cellHit(r, c, damaged)
  }

  getShipFromCell (shipCell) {
    return this.ships.find(s => s.id === shipCell.id)
  }
  sunkDescription (ship) {
    if (this.opponent) {
      return this.preamble0 + ' ' + ship.sunkDescription(' was ')
    }
    return ship.sunkDescription()
  }
  sunkLetterDescription (letter) {
    if (this.opponent) {
      return this.preamble0 + ' ' + bh.terrain.sunkDescription(letter, ' was ')
    }
    return bh.shipSunkText(letter)
  }
  sunkWarning (ship, info = '') {
    if (!info) {
      info = ''
    }
    this.displayInfo(info + this.sunkDescription(ship))
  }

  checkForHit (weapon, r, c, power, shipCell) {
    if (!shipCell) {
      return LoadOut.noResult
    }

    const hitShip = this.getShipFromCell(shipCell)

    if (!hitShip) {
      this.UI.cellMiss(r, c)
      return LoadOut.missResult
    }

    const shape = bh.shapesByLetter(shipCell.letter)
    const protection = shape.protectionAgainst(weapon.letter)
    if (power === 1 && protection === 2 && hitShip) {
      this.score.shotReveal(r, c)
      return this.UI.cellSemiReveal(r, c)
    }

    if (protection > power) {
      return LoadOut.noResult
    }
    let shots = 0
    if (power < 1) {
      this.score.shot.set(r, c)
      shots = 1
    }

    return this.showHit(r, c, hitShip, shots)
  }

  showHit (row, col, hitShip, initialShots) {
    const {
      letter,
      info,
      damaged,
      list: hitEntries,
      misses: missEntries
    } = hitShip.hitAt(this, row, col)
    this.markHit(row, col, damaged)
    let totalHits = 1
    let totalShots = initialShots

    totalHits = this._applyHitEntries(hitEntries, totalHits)
    totalShots += hitEntries.length
    totalShots = this._applyMissEntries(missEntries, totalShots)

    if (hitShip.sunk) {
      this.markSunk(hitShip)
    }
    return {
      hits: totalHits,
      shots: totalShots,
      reveals: 0,
      sunk: letter,
      info
    }
  }

  _applyHitEntries (hitEntries, totalHits) {
    for (const { cell, damaged } of hitEntries) {
      this.score.shot.set(...cell)
      totalHits++
      this.markHit(cell[0], cell[1], damaged)
    }
    return totalHits
  }

  _applyMissEntries (missEntries, totalShots) {
    for (const { cell, damaged } of missEntries) {
      this.score.shot.set(...cell)
      totalShots++ //
      this.UI.cellMiss(cell[0], cell[1], damaged)
    }
    return totalShots
  }
  get isEnded () {
    if (this.isRevealed || this.boardDestroyed) {
      this._hideWaiting?.()
      this.opponent?._hideWaiting()
      this._oldWeaponLetter = null
      return true
    }
    return false
  }

  updateMode (wps1, cursorInfo) {
    if (this.isEnded) {
      return
    }
    this.updateWeaponButtons()

    this.updateWeaponStatus(wps1 || this.loadOut.selectedWeapon, cursorInfo)
  }
  updateWeaponButtons () {
    if (this.UI?.weaponBtns == null) return
    for (const btn of this.UI.weaponBtns) {
      const letter = btn.dataset.letter
      const hasAmmo = this.loadOut.hasAmmoForWeaponLetter(letter)
      if (hasAmmo) {
        btn.classList.remove('hidden')
      } else {
        btn.classList.add('hidden')
      }
    }
  }

  fireShot (weapon, r, c, power) {
    const shipCell = this.shipCellAt(r, c)
    if (!shipCell) {
      if (power > 0) {
        this.UI.cellMiss(r, c)
        return LoadOut.missResult
      }
      return LoadOut.noResult
    }
    return this.checkForHit(weapon, r, c, power, shipCell)
  }

  hitDescription (hits) {
    if (this.opponent) {
      return this.preamble + 'Hit (x' + hits.toString() + ')'
    }
    if (hits === 1) {
      return 'Hit'
    }
    return hits.toString() + ' Hits'
  }
  revealDescription (reveals) {
    if (this.opponent) {
      return this.preamble + 'revealed (x' + reveals.toString() + ')'
    }
    if (reveals === 1) {
      return 'Reveal'
    }
    return reveals.toString() + ' revealed'
  }
  displayMisses (weapon, reveals = 0, messageInfo = '') {
    if (reveals > 0) {
      this.displayInfo(messageInfo + this.revealDescription(reveals))
      return
    }

    const missMessage = this.buildMissMessage(weapon)
    if (missMessage) {
      this.displayInfo(messageInfo + missMessage)
    }
  }

  /**
   * Builds the message displayed when a shot misses.
   * @param {*} weapon - The weapon that missed
   * @returns {string|null} Resulting miss message, or null for no display
   * @private
   */
  buildMissMessage (weapon) {
    if (this.opponent) {
      const preamble1 = this.opponent.preamble1
      if (weapon.letter === '-') {
        return `${preamble1}missed`
      }
      return `${preamble1}${weapon.name} missed ${this.preamble0} ships`
    }

    if (weapon.letter === '-') {
      return null
    }

    return `The ${weapon.name} missed everything!`
  }

  updateResultsOfBomb (weapon, result) {
    if (!result) return
    const { hits, dtaps, sunk, reveals, info, shots } = result
    this.updateResultsOfTurn(weapon, hits, dtaps, sunk, reveals, info, shots)
  }
  /**
   * Builds and displays message for a complete miss.
   * @param {Object} weapon - The weapon used
   * @param {number} reveals - Number of reveals
   * @param {string} messageInfo - Additional message info
   * @private
   */
  displayMissResult (weapon, reveals, messageInfo) {
    this.displayMisses(weapon, reveals, messageInfo)
  }

  /**
   * Builds and displays message for hits with no ships sunk.
   * @param {number} hits - Number of hits
   * @param {number} reveals - Number of reveals
   * @param {string} messageInfo - Additional message info
   * @private
   */
  displayHitResult (hits, reveals, messageInfo) {
    let message = this.hitDescription(hits)
    if (reveals > 0) {
      message += ` and ${this.revealDescription(reveals)}`
    }
    this.displayInfo(messageInfo + message)
  }

  /**
   * Builds and displays message for hits with one ship sunk.
   * @param {number} hits - Number of hits
   * @param {Array} sunks - Array of sunk ship letters
   * @param {string} messageInfo - Additional message info
   * @private
   */
  displaySingleSunkResult (hits, sunks, messageInfo) {
    this.displayInfo(
      messageInfo +
        this.hitDescription(hits) +
        ' and ' +
        this.sunkLetterDescription(sunks[0])
    )
  }

  /**
   * Builds and displays message for hits with multiple ships sunk.
   * @param {number} hits - Number of hits
   * @param {Array} sunks - Array of sunk ship letters
   * @param {string} messageInfo - Additional message info
   * @private
   */
  displayMultipleSunkResult (hits, sunks, messageInfo) {
    let message = this.hitDescription(hits) + ','
    for (let sunk of sunks) {
      message += ' and ' + this.sunkLetterDescription(sunk)
    }
    message += ' Destroyed'
    this.displayInfo(messageInfo + message)
  }

  updateResultsOfTurn (weapon, hits, dtaps, sunks, reveals = 0, info = '') {
    const messageInfo = info ? info + ' ' : ''
    if (this.boardDestroyed) {
      return
    }

    if (hits === 0) {
      this.displayMissResult(weapon, reveals, messageInfo)
      return
    }

    if (sunks.length === 0) {
      this.displayHitResult(hits, reveals, messageInfo)
      return
    }

    if (sunks.length === 1) {
      this.displaySingleSunkResult(hits, sunks, messageInfo)
      return
    }

    this.displayMultipleSunkResult(hits, sunks, messageInfo)
  }

  flash (long) {
    Animator.runId('battleship-game', 'flash')
    Animator.run(this.UI.board, 'burst', long)
  }
  flame (r, c, bomb) {
    const cell = this.UI.gridCellAt(r, c)
    if (bomb) {
      Animator.runWithRandomDelay(cell, null, null, 'flames', 'short')
    } else {
      Animator.run(cell, 'flames', 'long')
    }
  }
  isDTap (r, c, power, hasFlame, hasFlash) {
    if (hasFlame && power > 0) this.flame(r, c, hasFlash)
    const key =
      power > 0 ? this.score.createShotKey(r, c) : this.score.newShotKey(r, c)
    return key === null
  }
  applyToAoE (effect, weapon, options) {
    let acc = LoadOut.noResult
    for (const [r, c, power] of effect) {
      acc = this.applyToPosition(r, c, weapon, power, acc, options)
    }
    return acc
  }

  /**
   * Applies weapon effect to area of effect and updates display.
   * Flashes long animation if hits registered. Accumulates double tap count.
   *
   * @param {Object} weapon - The weapon being used
   * @param {Array<Array<number>>} effect - [row, col, power] cells affected
   * @returns {Object} Accumulated result with hits, dtap counts
   * @private
   */
  destroy (weapon, effect, options) {
    return this.applyWeaponEffect(weapon, effect, options)
  }

  /**
   * Applies the weapon effect to the area of effect.
   * @param {*} weapon - The weapon.
   * @param {Array} effect - The effect coordinates.
   * @param {Object} options - Additional options.
   * @returns {*} The results.
   */
  applyWeaponEffect (weapon, effect, options) {
    const results = this.applyToAoE(effect, weapon, options)
    this.flash(results.hits > 0 ? 'long' : undefined)

    this.score.dtaps += results.dtap
    this.updateMode()
    return results
  }
  applyToPosition (r, c, weapon, power, acc, options) {
    if (bh.inBounds(r, c)) {
      const result = this.processShot(weapon, r, c, power)
      this.accumulateResult(result, acc)
    }
    return acc
  }
  processShot (weapon, r, c, power) {
    if (!bh.inBounds(r, c)) return LoadOut.noResult
    if (this.isDTap(r, c, power, true, weapon.hasFlash))
      return LoadOut.doubleTapResult

    const result = this.fireShot(weapon, r, c, power)

    return result
  }

  updateUI (ships) {
    this.updateTally(ships, this.loadOut.getAllLimitedWeaponSystems())
  }
  updateTally (ships, weaponSystems) {
    ships = ships || this.ships
    if (this.UI.placing && this.UI.placeTally) {
      this.UI.placeTally(ships)
    } else {
      this.UI.score.display(ships, ...this.score.counts())
      this.UI.score.buildTally(ships, weaponSystems, this.UI)
    }
  }

  _hideWaiting () {
    /* only needs implementation if enemy */
  }
  /**
   * Updates the weapon status display.
   * @param {*} _rack - The weapon rack.
   * @param {Object} _cursorInfo - Cursor information.
   */
  updateWeaponStatus (_rack, _cursorInfo) {
    /* only needs implementation if enemy */
  }
  /**
   * Deactivates the weapon at the specified locations.
   * @param {number} _ro - Opponent row.
   * @param {number} _co - Opponent column.
   * @param {number} _shadowR - Shadow row.
   * @param {number} _shadowC - Shadow column.
   */
  deactivateWeapon (_ro, _co, _shadowR, _shadowC) {
    /* only needs implementation if enemy */
  }

  /**
   * Handles cursor changes on the board.
   * @param {string} _oldCursoroldCursor - The previous cursor class.
   * @param {Object} _newCursorInfo - Information about the new cursor.
   */
  cursorChange (_oldCursor, _newCursorInfo) {}
}

/**
 * Removes and returns the first element from the array that matches the predicate.
 * @param {Array} array - The array to search
 * @param {Function} predicate - Function to test each element
 * @param {Object} [fallbackObject] - Object to log if not found
 * @returns {Object|null} The found element or null
 */
function removeFirstMatching (array, predicate, fallbackObject) {
  const idx = array.findIndex(predicate)
  if (idx === -1) {
    if (fallbackObject) {
      console.log('not found : ', JSON.stringify(fallbackObject))
    }
    return null
  }
  return array.splice(idx, 1)[0]
}
