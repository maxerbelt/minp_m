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

/* global process */
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
 * @property {number} hits - Number of hits scored
 * @property {number} dtaps - Number of double-tap events (reshot same cell)
 * @property {number|string} sunk - Number or letter of sunk ships
 * @property {number} reveals - Number of cells revealed
 * @property {number} shots - Number of shots fired (including multi-hit)
 * @property {string} info - Additional contextual information
 */

/**
 * @typedef {Object} WeaponSelection
 * @property {number|null} launchR - Launch row coordinate
 * @property {number|null} launchC - Launch column coordinate
 * @property {number|null} weaponId - Weapon system ID
 * @property {number|null} hintR - Hint row coordinate
 * @property {number|null} hintC - Hint column coordinate
 */

/**
 * @typedef {Object} ShipPlacement
 * @property {Ship[]} ships - Array of placed ships
 * @property {Array} shipCellGrid - 2D grid of ship cells
 * @property {string} map - Map title identifier
 */

/**
 * @typedef {Object} HitResult
 * @property {string} letter - Ship letter identifier
 * @property {string} info - Hit information message
 * @property {boolean} damaged - Whether ship cell was damaged
 * @property {Array<Array<number>>} list - List of hit cell entries [r, c]
 * @property {Array<Array<number>>} misses - List of miss cell entries [r, c]
 */

/**
 * @typedef {Object} TargetResolutionContext
 * @property {Weapon} weapon - The weapon being fired
 * @property {number} r - Target row
 * @property {number} c - Target column
 * @property {number} power - Weapon power level
 * @property {Object} options - Additional firing context
 */

/**
 * @typedef {Object} EffectNormalizationResult
 * @property {Array<Array<number>>} normalized - [r, c, power] coordinate triples
 * @property {boolean} isValid - Whether effect was properly formatted
 * @property {Array<Array<number>>} filtered - Entries with exactly 3+ elements
 */

/**
 * Core game logic class managing ship placement, weapon systems, and battle mechanics.
 * Handles the main game state and interactions between ships, weapons, and UI.
 *
 * @class Waters
 * @description Coordinates ship placement, weapon management, targeting, firing, and hit resolution.
 * Maintains separation between player state, opponent state, and UI presentation.
 *
 * Responsibilities:
 * - Ship placement and validation
 * - Weapon loading and selection
 * - Firing mechanics and result accumulation
 * - Hit/miss/sunk detection and display
 * - Turn management and game status
 */
export class Waters {
  /**
   * Initializes the Waters game instance with UI and basic setup.
   *
   * @param {Object} ui - The user interface instance for rendering
   * @param {string|null} [playerType] - Type of player (AI, Human, etc.)
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
  // ==================== Storage & Serialization ====================

  /**
   * Gets the storage key for persisted ship placements.
   *
   * @returns {string} Local storage key identifier
   * @private
   */
  _getStorageKey () {
    return 'geoffs-battleship.placed-ships'
  }

  /**
   * Gets the current placed ships data for serialization.
   * CONSOLIDATED: unified data collection for persistence and export.
   *
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
   * Stores the current ship placement to local storage.
   */
  storePlacedShips () {
    // Custom replacer to handle BigInt serialization
    /**
     * @param {string} _key
     * @param {unknown} value
     * @returns {unknown}
     */
    const replacer = (_key, value) => {
      if (typeof value === 'bigint') {
        return value.toString()
      }
      return value
    }

    localStorage.setItem(
      this._getStorageKey(),
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
    const result = this.shipCellGrid.attemptToPlaceShips(
      ships,
      (ship, placedCells) => {
        onShipPlaced?.(ship, placedCells)
        this.recordShipPlacement(placedCells, ship)
      },
      this.handlePlacementFailure.bind(this, onPlacementReset)
    )
    if (result) {
      this.UI.onFleetPlaced?.()
    }
    return result
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
    const placedShips = this._normalizePlacedShips(placed, map)
    if (!placedShips || placedShips.ships.length === 0) {
      this.autoPlace()
      return null
    }
    return placedShips
  }

  /**
   * Normalizes placed ship input into a ShipPlacement object.
   * @param {ShipPlacement|Array} placed - Raw placed ships value
   * @param {Object} map - Map object for fallback example data
   * @returns {ShipPlacement|null}
   * @private
   */
  _normalizePlacedShips (placed, map) {
    const placedShips = placed || map.example
    if (Array.isArray(placedShips)) {
      return { ships: placedShips, map: map.title }
    }
    return placedShips || null
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
   * @private
   * @param {number|null} launchR - Launch row coordinate.
   * @param {number|null} launchC - Launch column coordinate.
   * @param {number|null} weaponId - Weapon system ID.
   * @param {number|null} hintR - Hint row coordinate.
   * @param {number|null} hintC - Hint column coordinate.
   * @returns {WeaponSelection} Weapon selection payload.
   */
  _createWeaponSelectionPayload (launchR, launchC, weaponId, hintR, hintC) {
    return { launchR, launchC, weaponId, hintR, hintC }
  }

  /**
   * Creates a normalized weapon selection payload.
   * @param {number|null} launchR - Launch row coordinate.
   * @param {number|null} launchC - Launch column coordinate.
   * @param {number|null} weaponId - Weapon system ID.
   * @param {number|null} hintR - Hint row coordinate.
   * @param {number|null} hintC - Hint column coordinate.
   * @returns {WeaponSelection} Weapon selection payload.
   */
  createWeaponSelection (launchR, launchC, weaponId, hintR, hintC) {
    return this._createWeaponSelectionPayload(
      launchR,
      launchC,
      weaponId,
      hintR,
      hintC
    )
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
    const loadedWeaponIds = this._getLoadedWeaponIds()
    return keyIds.filter(key => {
      const [, , weaponId] = parseTriple(key)
      return loadedWeaponIds.has(weaponId)
    })
  }

  /**
   * Returns the set of loaded weapon IDs for the current load out.
   * @returns {Set<number>}
   * @private
   */
  _getLoadedWeaponIds () {
    return new Set(this.loadOut.getLoadedWeapons().map(w => w.id))
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
   * @param {Array<string>} keyIds - Candidate key identifiers
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   * @param {boolean|string} random - Whether to select randomly
   * @param {Object} viewModel - UI view model
   * @returns {WeaponSelection} Weapon selection payload
   * @private
   */
  selectWeaponFromCell (keyIds, hintR, hintC, random, viewModel) {
    const availableKeys = this.determineAvailableSelectionKeys(
      keyIds,
      hintR,
      hintC
    )
    this._setLastClick(hintR, hintC)

    const filteredKeys = this.filterLoadedWeaponKeys(availableKeys)
    const selectedKey = this._chooseWeaponKeyOrFallback(
      filteredKeys,
      hintR,
      hintC,
      random
    )

    if (!selectedKey) {
      return this.selectRandomWeapon()
    }

    this.previousSources.add(selectedKey)
    return this.processSelectedWeaponKey(selectedKey, viewModel, hintR, hintC)
  }

  /**
   * Stores the last click coordinates for repeated selection handling.
   * @param {number} hintR
   * @param {number} hintC
   * @private
   */
  _setLastClick (hintR, hintC) {
    this.lastClick = { r: hintR, c: hintC }
  }

  /**
   * Chooses a weapon key or returns null when none are available.
   * @param {Array<string>} filteredKeys
   * @param {number} hintR
   * @param {number} hintC
   * @param {boolean|string} random
   * @returns {string|null}
   * @private
   */
  _chooseWeaponKeyOrFallback (filteredKeys, hintR, hintC, random) {
    if (filteredKeys.length === 0) {
      return null
    }
    if (this.isRandomSelection(random)) {
      return randomElement(filteredKeys)
    }
    return this.findClosestWeaponKey(filteredKeys, hintC, hintR)
  }

  /**
   * Determines selection keys after repeated click filtering.
   * @param {Array<string>} keyIds - Candidate key identifiers
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   * @returns {Array<string>} Available keys for selection
   * @private
   */
  determineAvailableSelectionKeys (keyIds, hintR, hintC) {
    const availableKeys = [...keyIds]
    if (this.shouldFilterPreviousSourceKeys(hintR, hintC, keyIds)) {
      return availableKeys.filter(k => !this.previousSources.has(k))
    }
    this.previousSources = new Set()
    return availableKeys
  }

  /**
   * Determines whether a selection strategy should be random.
   * @param {boolean|string} random - Selection mode
   * @returns {boolean} True when random selection should be used
   * @private
   */
  isRandomSelection (random) {
    return random === true || random === 'random'
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

  /**
   * Places a matching ship during edit mode using provided ship cells.
   * @param {Object} matchingShip - The ship instance to place.
   * @param {Object} ship - The source ship data containing cells.
   */
  placeMatchingShipForEdit (matchingShip, ship) {
    matchingShip.cells = ship.cells
    placedShipsInstance.push(matchingShip, ship.cells)
    matchingShip.addToGrid(this.shipCellGrid)
    this.UI.placement(ship.cells, this, matchingShip)
  }

  /**
   * Places a matching ship during regular load using provided ship cells.
   * @param {Object} matchingShip - The ship instance to place.
   * @param {Object} ship - The source ship data containing cells.
   */
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
    if (!placedShips) {
      this.autoPlace()
      return
    }

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
    const stored = localStorage.getItem(this._getStorageKey())
    placedShips = placedShips || (stored ? JSON.parse(stored) : null)
    if (map.title !== placedShips?.map) {
      return null
    }
    return this.validatePlacedShips(placedShips, map)
  }

  /**
   * Updates global ID counters based on loaded ships.
   * @param {ShipPlacement} placedShips - The placed ships data.
   */
  updateGlobalIds (placedShips) {
    const { maxShipId, maxWeaponId } = this._getMaxIdsFromShips(
      placedShips.ships
    )
    Ship.id = maxShipId + 1
    WeaponSystem.id = maxWeaponId + 1
  }

  /**
   * Calculates the maximum ship and weapon IDs from placed ships.
   * @private
   * @param {Ship[]} ships - Array of ships to inspect.
   * @returns {{maxShipId: number, maxWeaponId: number}} Maximum IDs.
   */
  _getMaxIdsFromShips (ships) {
    return ships.reduce(
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
  }

  /**
   * Resets the map state and loads new map configuration.
   * @param {Object} map - The map to set.
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
    if (!this.ships) {
      this.ships = []
    }
    let weaponShips = this.ships.filter(ship => ship.hasWeapon)
    this.hasAttachedWeapons = weaponShips.length > 0
    if (bh.seekingMode && this.hasAttachedWeapons) {
      weaponShips = map.extraArmedFleetForMap || weaponShips
    }
    this.weaponShips = weaponShips
    return weaponShips
  }

  /**
   * Configures the load out system for weapons.
   * @param {Object} map - The map object.
   * @param {Array} weaponShips - Ships with weapons.
   */
  configureLoadOut (map, weaponShips) {
    const shipsForLoadOut = this._resolveLoadOutShips(map, weaponShips)
    this.loadOut = this.createLoadOut(map, shipsForLoadOut)
  }

  /**
   * Resolves the ship list to be used for load out creation.
   * @private
   * @param {Object} map - The map object.
   * @param {Array} weaponShips - Default weapon ships.
   * @returns {Array} Ships to include in the load out.
   */
  _resolveLoadOutShips (map, weaponShips) {
    if (bh.seekingMode && this.hasAttachedWeapons) {
      return weaponShips
    }
    if (this.opponent) {
      return this.opponent.ships.filter(ship => ship.hasWeapon)
    }
    return weaponShips
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
    ships = ships || this.weaponShips || []
    const weapons = map?.weapons || []
    return new LoadOut(weapons, ships, this.UI, this.steps)
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
    const armedShips = this.loadOut.getArmedShips()
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

  /**
   * Sets the board targeting state.
   * @param {boolean} isTargeting - Whether the board is in targeting mode.
   */
  setBoardTargetingState (isTargeting) {
    const boardClasses = this.UI.board.classList
    if (isTargeting) {
      boardClasses.add('targetting')
      boardClasses.remove('not-step')
    } else {
      boardClasses.remove('targetting')
      boardClasses.add('not-step')
    }
  }

  selectAndArmWps (oppo, weaponId, launchR, launchC, hintR, hintC, cell) {
    const rack = this.loadOut.getWeaponBySystemId(weaponId)
    const weapon = rack?.weapon
    const letter = weapon?.letter

    this.giveTempHint(weapon, cell, oppo)
    this.addSource(oppo, launchR, launchC, rack, cell)
    const { shadowR, shadowC } = this.steps.addRack(
      rack,
      weapon,
      letter,
      weaponId,
      launchR,
      launchC,
      cell,
      hintR,
      hintC
    )

    if (letter) {
      this.loadOut.switchToWeapon(letter)

      if (weapon.postSelectCoords === 0) {
        this.loadOut.clearSelectedCoordinates()
      } else {
        this.loadOut.addSelectedCoordinates(shadowR, shadowC, weapon)
      }
      this.updateMode(rack, undefined)
      this.steps?.targetting()
      this.loadOut.launch = async coords => {
        return await this.launchTo(coords, hintR, hintC, rack)
      }
      this.loadOut.selectedWeapon = rack
    }
  }

  giveTempHint (weapon, cell, oppo) {
    if (oppo && weapon?.givesHint) {
      oppo.UI.deactivateTempHints()
      cell.classList.add('temp-hint')
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

  /**
   * Arms the selected weapon and updates the opponent view state.
   * @param {WeaponSelection} selection - Weapon selection payload
   * @param {Object} oppo - Opponent instance
   * @private
   */
  _armSelectedWeapon (selection, oppo) {
    const cell = oppo?.UI?.gridCellAt(selection.hintR, selection.hintC)
    this.selectAndArmWeaponId(
      selection.weaponId,
      oppo,
      selection.launchR,
      selection.launchC,
      selection.hintR,
      selection.hintC,
      cell
    )
  }

  selectAttachedWeapon (cell, r, c, oppo) {
    const selection = this.selectWeaponId(cell, r, c, false, null, oppo)
    this._armSelectedWeapon(selection, oppo)
  }

  randomAttachedWeapon (oppo) {
    const selection = this.selectRandomWeapon()
    this._armSelectedWeapon(selection, oppo)
  }

  selectAndArmWeaponId (weaponId, oppo, launchR, launchC, hintR, hintC, cell) {
    if (weaponId < 1) {
      return
    }

    this.selectAndArmWps(oppo, weaponId, launchR, launchC, hintR, hintC, cell)
  }

  /**
   * Launches randomly selected weapon at the target coordinates.
   * If an unattached weapon fires, returns that result.
   * Otherwise, attempts to select a targeted attached weapon system.
   *
   * @param {number} r - Target row coordinate
   * @param {number} c - Target column coordinate
   * @param {boolean} [autoSelectWarning] - Whether to display an auto-select warning
   * @returns {Promise<null|{ weapon: Object, score: Object}|{ hasTargettedWeapon: boolean }>} Result with weapon or selection state
   */
  async launchRandomWeapon (r, c, autoSelectWarning = !bh.seekingMode) {
    const result =
      /** @type {null|{ weapon: Object, score: Object}|{ hasTargettedWeapon: boolean }} */ (
        (await this.launchUnattachedWeapon(r, c)) || {}
      )
    if (
      result.hasUnattached ||
      (result?.score && result.score !== LoadOut.noResult)
    ) {
      return result
    }
    result['hasTargettedWeapon'] =
      this.prepareTargetedRandomWeaponSelection(autoSelectWarning)
    return result
  }

  /**
   * Attempts to select an attached random weapon system when no unattached weapon fired.
   * @param {boolean} [autoSelectWarning] - Whether to display an auto-select warning
   * @returns {boolean} True if a weapon was selected
   */
  prepareTargetedRandomWeaponSelection (autoSelectWarning = !bh.seekingMode) {
    const current = this.loadOut.getCurrentWeaponSystem()
    if (!current) {
      return false
    }
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
   * Selects a weapon system by ID with various selection strategies.
   * CONSOLIDATED: unified weapon selection dispatcher with single entry point.
   * Routes to appropriate selection method based on available context.
   *
   * @param {HTMLElement|null} cell - Cell element for selection
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   * @param {boolean|string} random - Whether to select randomly
   * @param {Object} [ship] - Specific ship to select from (overrides cell)
   * @param {Object} [oppo] - Opponent instance
   * @returns {WeaponSelection} Weapon selection payload
   */
  selectWeaponId (cell, hintR, hintC, random, ship, oppo) {
    oppo = oppo || this.opponent
    const viewModel = this.getViewModel(oppo)

    // Route 1: Ship-based selection (highest priority)
    if (ship) {
      return this.selectWeaponFromShip(
        ship,
        hintR,
        hintC,
        random,
        viewModel,
        cell
      )
    }

    // Route 2: Cell-based selection
    if (cell === null) {
      return this.createDefaultWeaponSelection(hintR, hintC)
    }

    const keys = keyListFromCell(cell, 'keyIds')
    if (!keys) {
      return this.createDefaultWeaponSelection(hintR, hintC)
    }

    return this.selectWeaponFromCell(keys, hintR, hintC, random, viewModel)
  }

  hasTargettedRandomWeaponForWps (autoSelectWarning = !bh.seekingMode) {
    this.randomAttachedWeapon(this.opponent)
    const currentWeapon = this.loadOut.selectedWeapon

    if (!currentWeapon) return false
    const currentShip = this.loadOut.getShipByWeaponId(currentWeapon.id)
    const weaponName = currentWeapon.weapon?.name || 'weapon'
    if (autoSelectWarning) {
      this.displayAutoSelectWarning(weaponName, currentShip)
    }

    this.loadOut.launch = (coords, _weapon, wps) => {
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
      return result
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
      const weaponSystem = this.loadOut.getCurrentWeaponSystem()
      return weaponSystem?.getLoadedWeapon()
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
  //onClickOppoCell = null
  setupAttachedAim () {
    const oppo = this.opponent
    if (
      bh.seekingMode ||
      !this.loadOut?.ships ||
      !oppo ||
      this.loadOut.ships.length === 0 ||
      !this.onClickOppoCell
    )
      return

    this._removeAttachedAimListeners(oppo)
    this._addAttachedAimListeners(oppo)
  }

  /**
   * Removes all previously attached aim listeners from opponent cells.
   * @private
   * @param {Object} oppo - The opponent instance.
   */
  _removeAttachedAimListeners (oppo) {
    const armedShips = this.loadOut.ships
    for (const ship of armedShips) {
      const cells = oppo.shipCells(ship.id)
      const surround = oppo.UI.surroundCellElement(cells)
      for (const cell of surround) {
        if (cell._clickOppoHandler) {
          cell.removeEventListener('click', cell._clickOppoHandler)
          delete cell._clickOppoHandler
        }
      }
    }
  }

  /**
   * Adds click listeners to opponent surrounding cells.
   * Cells that surround multiple armed ships receive only one listener.
   * @private
   * @param {Object} oppo - The opponent instance.
   */
  _addAttachedAimListeners (oppo) {
    const armedShips = this.loadOut.ships
    const cellsToListen = new Set()

    // Collect all unique surrounding cells across all armed ships
    for (const ship of armedShips) {
      const cells = oppo.shipCells(ship.id)
      const surround = oppo.UI.surroundCellElement(cells)
      for (const cell of surround) {
        cellsToListen.add(cell)
      }
    }

    // Add listener only once per cell
    for (const cell of cellsToListen) {
      const [r, c] = coordsFromCell(cell)
      const handler = this.onClickOppoCell.bind(this, r, c)
      cell.addEventListener('click', handler)
      cell._clickOppoHandler = handler
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
    if (!options?.crashLoc) {
      return await this.destroy(weapon, effect, options)
    }

    const splashEffect = await this.getCrashSplash(
      weapon,
      options.crashLoc,
      effect,
      options
    )
    const result = await this.destroy(weapon, effect, options)
    options.isSplash = true
    this.accumulateResult(
      await this.destroy(weapon, splashEffect, options),
      result
    )
    return result
  }

  /**
   * Handles the case when there are hit candidates.
   * @param {*} weapon - The weapon.
   * @param {Array} effect - The effect.
   * @param {Array} target - The target.
   * @param {Array} hitCandidates - The hit candidates.
   * @param {Object} options - Additional options.
   * @returns {*} The destruction result.
   */
  handleHits (weapon, effect, target, hitCandidates, options) {
    const resolvedTarget = this.resolveTarget(target, hitCandidates)
    const splashEffect = this.selectSplashEffect(
      weapon,
      resolvedTarget,
      effect,
      options
    )
    return this.destroy(weapon, splashEffect, options)
  }

  /**
   * Chooses the correct splash effect based on weapon state.
   * @param {*} weapon - The weapon.
   * @param {Array} resolvedTarget - Resolved hit target.
   * @param {Array} effect - The original effect.
   * @param {Object} options - Additional options.
   * @returns {Array} The splash effect.
   * @private
   */
  selectSplashEffect (weapon, resolvedTarget, effect, options) {
    if (this.shouldUseCrashSplash(weapon, resolvedTarget, options)) {
      return this.getCrashSplash(weapon, options.crashLoc, effect, options)
    }
    return this.getStrikeSplash(weapon, resolvedTarget, effect, options)
  }
  /**
   * Initializes the steps event handlers.
   */
  initializeSteps () {
    this.steps.onEndTurn = this.handleEndTurn.bind(this)
    this.steps.onHint = this.handleHint.bind(this)
  }
  get cannotPassTurn () {
    return (
      this.opponent == null ||
      this.opponent.boardDestroyed ||
      this.opponent.isRevealed ||
      this.boardDestroyed ||
      this.isRevealed
    )
  }

  /**
   * Handles end of turn event.
   * Finishes opponent turn and triggers opponent begin turn if game not over.
   *
   */
  async handleEndTurn () {
    if (this.cannotPassTurn) {
      return
    }
    this.UI.deactivateWeapons()
    this.opponent?.UI.deactivateWeapons()
    await this.opponent?._handleBeginTurn?.()
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
    const cellSize = this.UI.cellSize()
    const targetCell = this.UI.gridCellAt(targetCoords[0], targetCoords[1])
    await weapon.animateSplashExplode(targetCell, cellSize)
  }

  getCrashSplash (weapon, targetCoords, effect, options) {
    this.animateStrikeSplash(targetCoords, weapon)
    return weapon?.crashSplash(bh.map, targetCoords, effect, options)
  }
  /**
   * Consolidates ship filtering operations into unified helpers.
   * CONSOLIDATED: reduces duplication in ship selection patterns.
   */
  
  /**
   * Gets all ships that are sunk.
   * 
   * @returns {Ship[]} Array of sunk ships
   */
  shipsSunk () {
    return this.ships.filter(s => s.sunk)
  }

  /**
   * Gets all ships that are NOT sunk.
   * 
   * @returns {Ship[]} Array of unsunk ships
   */
  shipsUnsunk () {
    return this.ships.filter(s => !s.sunk)
  }

  /**
   * Gets all unique unsunk ship shapes.
   * 
   * @returns {Set<Shape>} Unique shapes of unsunk ships
   */
  shapesUnsunk () {
    return [...new Set(this.shipsUnsunk().map(s => s.shape()))]
  }

  /**
   * Gets unsunk ship shapes that can be placed on subterrain in zone.
   * 
   * @param {Object} subterrain - The subterrain type
   * @param {Object} zone - The zone constraints
   * @returns {Shape[]} Shapes that satisfy constraints
   */
  shapesCanBeOn (subterrain, zone) {
    return this.shapesUnsunk().filter(s => s.canBeOn(subterrain, zone))
  }

  /**
   * Gets armed ship cells (cells with ammo > 0).
   * 
   * @returns {HTMLElement[]} Array of armed cell elements
   */
  armedCells () {
    return this.cellList().filter(c => c.dataset.ammo > 0)
  }

  /**
   * Gets armed ship cells for a specific weapon letter.
   * 
   * @param {string} letter - Weapon letter identifier
   * @returns {HTMLElement[]} Array of armed cells with weapon letter
   */
  armedCellsWithWeapon (letter) {
    return this.cellList().filter(
      c => c.dataset.ammo > 0 && c.dataset.wletter === letter
    )
  }

  /**
   * Gets all cells on the game board.
   * 
   * @returns {HTMLElement[]} Array of board cell elements
   */
  cellList () {
    return [...this.cellsOnBoard()]
  }

  /**
   * Gets direct children elements of board (cell references).
   * 
   * @returns {HTMLCollection} Collection of board cell children
   */
  cellsOnBoard () {
    return this.UI.board.children
  }

  /**
   * Gets all cells on board belonging to a specific ship.
   * 
   * @param {number} id - Ship ID
   * @returns {HTMLElement[]} Array of ship's cells
   */
  shipCells (id) {
    let list = []
    for (const cell of this.cellsOnBoard()) {
      if (Number.parseInt(cell.dataset.id) === id) {
        list.push(cell)
      }
    }
    return list
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
    this.score.shotRevealFinalize(row, col)
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
      this.score.shotRevealFinalizeXY(...cell)
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
   * Builds message for firing results based on hit/miss/sunk counts.
   * UNIFIED: single point for all result message construction.
   * Routes to appropriate display method based on result composition.
   * 
   * @param {Object} weapon - The weapon used
   * @param {number} hits - Number of hits
   * @param {Array} sunks - Array of sunk ship letters
   * @param {number} [reveals] - Number of reveals (default 0)
   * @param {string} [messageInfo] - Prefix for message
   * @returns {string} Formatted result message
   * @private
   */
  _buildResultMessage (weapon, hits, sunks, reveals = 0, messageInfo = '') {
    // No hits - report miss
    if (hits === 0) {
      return messageInfo + this._buildMissMessage(weapon, reveals)
    }

    // Hits but no sunk ships
    if (sunks.length === 0) {
      let message = this.hitDescription(hits)
      if (reveals > 0) {
        message += ` and ${this.revealDescription(reveals)}`
      }
      return messageInfo + message
    }

    // Hits with sunk ships - single or multiple
    let message = this.hitDescription(hits) + ','
    for (const sunk of sunks) {
      message += ' and ' + this.sunkLetterDescription(sunk)
    }
    if (sunks.length > 1) {
      message += ' Destroyed'
    }
    return messageInfo + message
  }

  /**
   * Builds miss message accounting for reveals and weapon type.
   * CONSOLIDATED: unified miss message construction.
   * 
   * @param {Object} weapon - The weapon that missed
   * @param {number} [reveals] - Number of reveals
   * @returns {string} Miss message
   * @private
   */
  _buildMissMessage (weapon, reveals = 0) {
    if (reveals > 0) {
      return this.revealDescription(reveals)
    }

    if (this.opponent) {
      const preamble1 = this.opponent.preamble1
      if (weapon.letter === '-') {
        return `${preamble1}${weapon.name} missed`
      }
      return `${preamble1}${weapon.name} missed ${this.preamble0} ships`
    }

    if (weapon.letter === '-') {
      return null
    }

    return `The ${weapon.name} missed everything!`
  }

  /**
   * Displays a firing result message.
   * UNIFIED: single entry point for all result display.
   * 
   * @param {Object} weapon - The weapon used
   * @param {number} hits - Number of hits
   * @param {Array} sunks - Array of sunk ship letters
   * @param {number} [reveals] - Number of reveals (default 0)
   * @param {string} [messageInfo] - Prefix for message (default '')
   * @private
   */
  _displayResult (weapon, hits, sunks, reveals = 0, messageInfo = '') {
    const message = this._buildResultMessage(weapon, hits, sunks, reveals, messageInfo)
    if (message) {
      this.displayInfo(message)
    }
  }

  /**
   * Builds and displays message for a complete miss.
   * @param {Object} weapon - The weapon used
   * @param {number} reveals - Number of reveals
   * @param {string} messageInfo - Additional message info
   * @private
   * @deprecated Use _displayResult() instead
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
   * @deprecated Use _displayResult() instead
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
   * @deprecated Use _displayResult() instead
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
   * @deprecated Use _displayResult() instead
   */
  displayMultipleSunkResult (hits, sunks, messageInfo) {
    let message = this.hitDescription(hits) + ','
    for (let sunk of sunks) {
      message += ' and ' + this.sunkLetterDescription(sunk)
    }
    message += ' Destroyed'
    this.displayInfo(messageInfo + message)
  }

  /**
   * Updates firing result display based on hits and sunk ships.
   * CONSOLIDATED: unified result handling with single routing logic.
   * Delegates to _displayResult for all message formatting.
   * 
   * @param {Object} weapon - The weapon used
   * @param {number} hits - Number of hits
   * @param {number} dtaps - Double tap count (unused in display)
   * @param {Array} sunks - Array of sunk ship letters
   * @param {number} [reveals] - Number of reveals (default 0)
   * @param {string} [info] - Additional message info (default '')
   */
  updateResultsOfTurn (weapon, hits, dtaps, sunks, reveals = 0, info = '') {
    const messageInfo = info ? info + ' ' : ''
    if (this.boardDestroyed) {
      return
    }

    // Convert string sunk to array for unified handling
    const sunkArray = Array.isArray(sunks) ? sunks : (sunks ? [sunks] : [])
    this._displayResult(weapon, hits, sunkArray, reveals, messageInfo)
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
    const normalizedEffect = this.normalizeEffect(effect, weapon, options)
    let acc = LoadOut.noResult

    for (const [r, c, power] of normalizedEffect) {
      acc = this.applyToPosition(r, c, weapon, power, acc)
    }
    return acc
  }

  /**
   * Normalizes an effect into a safely iterable shape array.
   * @param {*} effect - Raw effect payload from a weapon
   * @param {*} weapon - The weapon generating the effect
   * @param {Object} options - Additional options
   * @returns {Array<Array<number>>} Normalized effect payload
   * @private
   */
  normalizeEffect (effect, weapon, options) {
    if (effect == null) {
      this.warnInvalidEffect(effect, weapon, options)
      return []
    }

    let normalized = []
    if (Array.isArray(effect)) {
      normalized = effect
    } else if (
      typeof effect[Symbol.iterator] === 'function' &&
      typeof effect !== 'string'
    ) {
      normalized = Array.from(effect)
    } else {
      this.warnInvalidEffect(effect, weapon, options)
      return []
    }

    const filtered = normalized.filter(
      item => Array.isArray(item) && item.length >= 3
    )
    if (filtered.length !== normalized.length) {
      this.warnInvalidEffect(effect, weapon, options)
    }
    return filtered
  }

  /**
   * Warns when a weapon effect payload is malformed.
   * @param {*} effect - Raw effect payload
   * @param {*} weapon - The weapon generating the payload
   * @param {Object} options - Additional options
   * @private
   */
  warnInvalidEffect (effect, weapon, options) {
    if (process == null || process.env?.NODE_ENV !== 'test') {
      console.warn('Invalid weapon effect payload:', {
        effect,
        weapon: weapon?.name || weapon?.letter,
        options
      })
    }
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

    this.score.dtaps += results.dtap || 0
    /// this.updateMode()
    return results
  }
  applyToPosition (r, c, weapon, power, acc) {
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
  /**
   * Updates the stats display.
   * @private
   */
  _updateStats (ships = this.ships) {
    this.UI.score.display(ships, ...this.score.counts())
  }

  updateUI (ships) {
    this.updateTally(ships, this.loadOut.getAllLimitedWeaponSystems())
  }
  updateTally (ships, weaponSystems) {
    ships = ships || this.ships
    if (this.UI.placing && this.UI.placeTally) {
      this.UI.placeTally(ships)
    } else {
      this._updateStats(ships)
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
   * @param {string} _oldCursor - The previous cursor class.
   * @param {Object} _newCursorInfo - Information about the new cursor.
   */
  cursorChange (_oldCursor, _newCursorInfo) {
    // only needs implementation if enemy
  }
}

/**
 * Removes and returns the first element from the array that matches the predicate.
 * @param {Array} array - The array to search
 * @param {Function} predicate - Function to test each element
 * @param {Object} [fallbackObject] - Object to log if not found
 * @returns {Object|null} The found element or null
 */
function removeFirstMatching (array, predicate, fallbackObject) {
  const idx = array.findIndex(element => predicate(element))
  if (idx === -1) {
    if (fallbackObject) {
      console.log('not found : ', JSON.stringify(fallbackObject))
    }
    return null
  }
  return array.splice(idx, 1)[0]
}
