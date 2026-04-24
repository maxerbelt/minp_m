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
import { randomPlaceShape } from '../core/utils.js'
import { LoadOut } from './LoadOut.js'
import { Ship } from '../ships/Ship.js'
import { WeaponSystem } from '../weapon/WeaponSystem.js'
import { Steps } from './steps.js'
import { Animator } from '../core/Animator.js'

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
  constructor (ui) {
    assembleTerrains()
    this.ships = []
    this.score = new Score()
    this.opponent = null
    this.UI = ui
    this.shipCellGrid = []
    this.boardDestroyed = false
    this.preamble1 = 'You '
    this.preamble0 = 'Your'
    this.preamble = 'You were '
    this.steps = new Steps()
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
      shipCellGrid: this.shipCellGrid,
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
    localStorage.setItem(
      this.getClipboardKey(),
      JSON.stringify(this.getPlacedShipsData())
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
   * @param {Function} isPlacementSuccessful - Callback to check success
   * @param {Function} [onShipPlaced] - Callback when ship is placed
   * @param {Function} [onPlacementReset] - Callback when placement is reset
   * @returns {boolean} True if placement was successful
   */
  attemptToPlaceShips (
    ships,
    isPlacementSuccessful,
    onShipPlaced = Function.prototype,
    onPlacementReset = Function.prototype
  ) {
    this.ensureShipGridInitialized()
    const mask = bh.map.blankMask

    for (const ship of ships) {
      const placedCells = this.tryPlaceShip(ship, mask)
      if (!placedCells) {
        this.handlePlacementFailure(onPlacementReset)
        return false
      }
      onShipPlaced?.(ship, placedCells)
      this.recordShipPlacement(placedCells, ship)
    }
    return true
  }

  /**
   * Ensures the ship cell grid is properly initialized.
   * @private
   */
  ensureShipGridInitialized () {
    if (!this.shipCellGrid || !Array.isArray(this.shipCellGrid)) {
      this.resetShipCells()
    }
  }

  /**
   * Attempts to place a single ship randomly.
   * @param {Object} ship - The ship to place
   * @param {Object} mask - The placement mask
   * @returns {Array|null} Placed cells or null if failed
   * @private
   */
  tryPlaceShip (ship, mask) {
    return randomPlaceShape(ship, this.shipCellGrid, mask)
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
        placementSuccessful,
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
    const dragship = this.UI.getTrayItem(ship.id)
    if (dragship) {
      this.UI.removeDragShip(dragship)
    } else {
      //    console.log('drag ship not found : ', JSON.stringify(ship))
    }
  }

  applyExtraInfoToMatchingShip (matchingShip, ship) {
    matchingShip.variant = ship.variant
    const values = Object.values(matchingShip.weapons)
    if (values.length > 0) {
      this.applyWeaponsToMatchingShip(ship, values, matchingShip)
    }
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
      this.UI.resetTrays()
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
    if (this.cursorChange) {
      if (typeof this.cursorChange === 'function') {
        this.loadOut.onCursorChangeCallback = this.cursorChange.bind(this)
      } else {
        console.warn(
          'cursorChange property is not a function, ignoring cursor change callback assignment'
        )
      }
    }
  }

  /**
   * Creates a load out instance for the given map and ships.
   * @param {Object} map - The map object
   * @param {Array} ships - Ships to include in load out
   * @returns {LoadOut} The created load out
   */
  createLoadOut (map, ships) {
    ships = ships || this.weaponShips
    return new LoadOut(map.weapons, ships, this.UI)
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
   * Generates weapon selection data for a given ship.
   * @param {Object} ship - The ship to generate selection for
   * @returns {WeaponSelection} Weapon selection data
   * @private
   */
  generateWeaponSelectionForShip (ship) {
    const opponent = this.opponent
    let hintCoords = [null, null]

    if (opponent) {
      hintCoords = this.generateSourceHint(ship, opponent)
    }

    if (opponent == null || hintCoords[0] == null || hintCoords[1] == null) {
      return this.selectWeaponId(null, 0, 0, 'random', ship)
    }

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

  selectAndArmWps (rack, oppo, launchR, launchC, hintR, hintC) {
    const weapon = rack?.weapon
    const letter = weapon?.letter

    this.addSource(oppo, launchR, launchC, rack)
    this.steps.addRack(
      rack,
      weapon,
      letter,
      weapon?.id,
      launchR,
      launchC,
      rack?.cell
    )
    if (letter) {
      this.loadOut.switchToWeapon(letter)
      if (weapon.postSelectCursor === 0) {
        this.loadOut.clearSelectedCoordinates()
      } else {
        this.loadOut.addSelectedCoordinates(launchR, launchC)
      }

      rack.launchCoord = [launchR, launchC]

      rack.hintCoord = [hintR, hintC]
      this.loadOut.launch = async coords => {
        this.steps.fire()
        return await this.launchTo(coords, hintR, hintC, rack)
      }
      this.loadOut.selectedWeapon = rack
    }
  }

  addSource (oppo, launchR, launchC, rack) {
    if (this.steps.source === null) {
      const viewModel = oppo?.UI || this.UI
      this.steps.addSource(viewModel, launchR, launchC, rack?.cell)
      console.warn(
        'no source found when selecting and arming weapon, adding source with launch coords'
      )
    }
    if (!bh.terrain.hasUnattachedWeapons && this.sourceShip === null) {
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

    this.selectAndArmWeaponId(weaponId, oppo, launchR, launchC, hintR, hintC)
  }

  randomAttachedWeapon (oppo) {
    const { launchR, launchC, weaponId, hintR, hintC } =
      this.selectRandomWeapon()

    this.selectAndArmWeaponId(weaponId, oppo, launchR, launchC, hintR, hintC)
  }

  selectAndArmWeaponId (weaponId, oppo, launchR, launchC, hintR, hintC) {
    if (weaponId < 1) {
      return
    }
    const rack = this.loadOut.getWeaponBySystemId(weaponId)
    this.selectAndArmWps(rack, oppo, launchR, launchC, hintR, hintC)
  }
  async launchRandomWeapon (r, c, autoSelectWarning = true) {
    const hasLaunched = await this.launchUnattachedWeapon(r, c)
    if (hasLaunched) return true
    return this.launchRandomWeaponBase(autoSelectWarning)
  }

  launchRandomWeaponBase (autoSelectWarning = true) {
    const current = this.loadOut.getCurrentWeaponSystem()
    const attached = current.hasAmmo()
    if (attached) {
      return this.launchRandomWeaponForWps(autoSelectWarning)
    }
    return false
  }

  selectWeaponId (cell, hintR, hintC, random, ship, oppo) {
    oppo = oppo || this.opponent
    const viewModel = oppo?.UI || this.UI
    if (ship) {
      const entries = ship.getLoadedWeaponEntries()
      const [key, weapon] = random
        ? randomElement(entries)
        : findClosestCoord(entries, hintR, hintC, ([k]) => parsePair(k))
      const [launchC, launchR] = parsePair(key)
      this.steps.addSource(
        viewModel,
        launchR,
        launchC,
        cell || viewModel.gridCellAt(launchR, launchC)
      )
      return { launchR, launchC, weaponId: weapon.id, hintR, hintC }
    }
    if (cell === null) {
      this.steps.addSource(this.UI, 0, 0, cell || this.UI.gridCellAt(0, 0))
      return { launchR: 0, launchC: 0, weaponId: -1, hintR, hintC }
    }
    const keyIds = keyListFromCell(cell, 'keyIds')
    if (!keyIds) {
      this.steps.addSource(this.UI, 0, 0, cell || this.UI.gridCellAt(0, 0))
      return { launchR: 0, launchC: 0, weaponId: -1, hintR, hintC }
    }
    const loaded = new Set(this.loadOut.getLoadedWeapons().map(w => w.id))
    const filteredKeyIds = keyIds.filter(k => {
      const [, , weaponId] = parseTriple(k)
      return loaded.has(weaponId)
    })
    const wkey = findClosestCoord(filteredKeyIds, hintR, hintC, k =>
      parseTriple(k)
    )
    if (!random && !wkey) {
      return this.selectRandomWeapon()
    }
    const [launchC, launchR, weaponId] = parseTriple(wkey)
    this.steps.addSource(
      viewModel,
      launchR,
      launchC,
      cell || viewModel.gridCellAt(launchR, launchC)
    )
    ship = this.loadOut.getShipByWeaponId(weaponId)
    if (ship) {
      this.steps.addShip(ship)
      const [r, c] = this.generateSourceHint(ship)
      this.createShadowSource(r, c)
    }
    return { launchR, launchC, weaponId, hintR, hintC }
  }

  launchRandomWeaponForWps (autoSelectWarning = true) {
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
    const result = await this.loadOut.aimWeapon(
      bh.map,
      row,
      col,
      weaponSystem,
      launch
    )
    this.updateResultsOfBomb(weaponSystem?.weapon, result)
  }
  async launchSelectedWeapon (r, c) {
    if (this.loadOut.isArmed()) {
      await this.fireWeaponAt(r, c, this.loadOut.selectedWeapon)
      return true
    }
    return false
  }

  async launchUnattachedWeapon (r, c) {
    const unAttached = this.getUnattachedWeaponSystem()
    if (unAttached) {
      const launch = async coords => {
        return await this.launchTo(coords, bh.map.rows - 1, 0, unAttached)
      }
      await this.fireWeaponAt(r, c, unAttached, launch)
      return true
    }
    return false
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
    const result = fireSingleShot()
    this.updateResultsOfSingleShot(result)
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
    this.steps.fire()
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
  onHint (r, c) {
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
        this.addWake(cell, r, c)
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
  addWake (cell, r, c) {
    if (
      !cell.classList.contains('frd-hit') &&
      !cell.classList.contains('miss') &&
      !cell.classList.contains('hit')
    ) {
      cell.classList.add('wake')
      this.score.wakeReveal(r, c)
    }
  }

  getStrikeSplash (weapon, candidate) {
    const cellSize = this.UI.cellSizeScreen()
    const target = this.UI.gridCellAt(candidate[0], candidate[1])
    weapon.animateSplashExplode(target, cellSize)
    return weapon.splash(bh.map, candidate)
  }
  getCrashSplash (weapon, candidate) {
    const cellSize = this.UI.cellSizeScreen()
    const target = this.UI.gridCellAt(candidate[0], candidate[1])
    weapon.animateSplashExplode(target, cellSize)
    return weapon.crashSplash(bh.map, candidate)
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
    this.shipCellGrid = bh.map.blankGrid
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
    this._hideWaiting?.()
    this.opponent?._hideWaiting()
  }
  checkFleetSunk () {
    if (this.ships.every(s => s.sunk)) {
      this.recordFleetSunk()
    }
  }
  shipCellAt (r, c) {
    return this.shipCellGrid[r]?.[c]
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
    const preamble1 = this.opponent ? this.opponent.preamble1 : this.preamble1
    if (reveals > 0) {
      this.displayInfo(messageInfo + this.revealDescription(reveals))
      return
    }
    // if (weapon.letter === '-') return // don't display miss for single shot
    let missMessage
    if (this.opponent) {
      if (weapon.letter === '-') {
        missMessage = `${preamble1}missed`
      } else {
        missMessage = `${preamble1}${weapon.name} missed ${this.preamble0} ships`
      }
      this.displayInfo(messageInfo + missMessage)
      return
    }
    if (weapon.letter === '-') {
      return // don't display miss for single shot
    }
    this.displayInfo(messageInfo + `The ${weapon.name} missed everything!`)
  }
  updateResultsOfSingleShot (result) {
    if (!result) return
    const { hits, dtaps, sunk, reveals, info, shots } = result
    this.updateResultsOfTurn(
      this.loadOut.getSingleShot(),
      hits,
      dtaps,
      sunk,
      reveals,
      info,
      shots
    )
  }
  updateResultsOfBomb (weapon, result) {
    if (!result) return
    const { hits, dtaps, sunk, reveals, info, shots } = result
    this.updateResultsOfTurn(weapon, hits, dtaps, sunk, reveals, info, shots)
  }
  updateResultsOfTurn (weapon, hits, dtaps, sunks, reveals = 0, info = '') {
    const messageInfo = info ? info + ' ' : ''
    if (this.boardDestroyed) {
      return
    }
    if (hits === 0) {
      this.displayMisses(weapon, reveals, messageInfo)
      return
    }
    if (sunks.length === 0) {
      let message = this.hitDescription(hits)
      if (reveals > 0) {
        message += ` and ${this.revealDescription(reveals)}`
      }
      this.displayInfo(messageInfo + message)
      return
    }
    if (sunks.length === 1) {
      this.displayInfo(
        messageInfo +
          this.hitDescription(hits) +
          ' and ' +
          this.sunkLetterDescription(sunks)
      )
      return
    }

    let message = this.hitDescription(hits) + ','
    for (let sunk of sunks) {
      message += ' and ' + this.sunkLetterDescription(sunk)
    }
    message += ' Destroyed'
    this.displayInfo(messageInfo + message)
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
  applyToAoE (effect, weapon) {
    let acc = LoadOut.noResult
    for (const [r, c, power] of effect) {
      acc = this.applyToPosition(r, c, weapon, power, acc)
    }
    return acc
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
