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
 * @property {Array<any>} shipCellGrid - 2D grid of ship cells
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
 * @property {Object} weapon - The weapon being fired
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
   * Initializes core game state including ship management, scoring, UI rendering,
   * and optional turn-based step tracking. Sets up default message preambles for
   * UI display and game event logging.
   *
   * @param {Object} ui - The user interface instance for rendering board and interactions
   * @param {string|null} [playerType] - Type of player (e.g., 'AI', 'Human', null for local)
   *
   * @property {Ship[]} ships - Array of ships in this player's fleet
   * @property {Score} score - Scoring system for tracking game results
   * @property {Waters|null} opponent - Reference to opposing player instance
   * @property {Object} ui - User interface controller
   * @property {ShipCellGrid} shipCellGrid - 2D grid tracking ship cell positions
   * @property {boolean} boardDestroyed - Whether this player's fleet is completely destroyed
   * @property {Steps} [steps] - Optional turn tracking system for game progression
   * @property {WeaponSystem} [loadOut] - Weapon system manager for armed ships
   * @property {string} preamble1 - First person perspective prefix ('You ')
   * @property {string} preamble0 - First person perspective possessive ('Your')
   * @property {string} preamble - Past tense perspective prefix ('You were ')
   * @property {Function} displayInfo - Bound display function for game messages
   * @property {Object} lastClick - Last clicked cell coordinates {r, c}
   * @property {Set<string>} previousSources - Set of previously selected weapon sources
   * @property {Array<{placedCells: any[], ship: Ship}>} tempPlacement - Temporary placement storage
   * @property {Array<Ship>} weaponShips - Ships with attached weapons
   * @property {boolean} hasAttachedWeapons - Whether ships have weapons
   * @property {boolean} isRevealed - Whether the fleet is revealed
   */
  constructor (ui, playerType = null) {
    assembleTerrains()
    /** @type {Ship[]} */
    this.ships = []
    this.score = new Score()
    /** @type {Waters|null} */
    this.opponent = null
    this.UI = ui
    this.shipCellGrid = new ShipCellGrid()
    this.boardDestroyed = false
    this.preamble1 = 'You '
    this.preamble0 = 'Your'
    this.preamble = 'You were '
    /** @type {Function} */
    this.displayInfo = gameStatus.info2.bind(gameStatus)
    /** @type {Object|null} */
    this.lastClick = null
    /** @type {Set<string>} */
    this.previousSources = new Set()
    /** @type {Array<{placedCells: any[], ship: Ship}>} */
    this.tempPlacement = []
    /** @type {Array<Ship>} */
    this.weaponShips = []
    /** @type {boolean} */
    this.hasAttachedWeapons = false
    /** @type {boolean} */
    this.isRevealed = false
    if (playerType) {
      this.steps = new Steps(playerType)
      this.initializeSteps()
    }
    this.resetShipCells()
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
   * Checks if a method exists and is being used in edit mode.
   * DEPRECATED: Use loadForEdit instead or validate logic before calling.
   *
   * @param {Object} [map] - The map to load from
   * @returns {void}
   * @private
   */
  // loadForEdit intentionally unused - comment preserved for API documentation
  // This method is referenced in comments but not called in current codebase

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
   * Serializes ship placement data with custom handling for BigInt values,
   * converting them to strings for JSON compatibility.
   *
   * @returns {void}
   * @private
   */
  storePlacedShips () {
    // Custom replacer to handle BigInt serialization
    /**
     * JSON replacer function for serialization.
     * @param {string} _key - Property name (unused)
     * @param {unknown} value - Property value to serialize
     * @returns {unknown} Stringified BigInt or original value
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
   * Attempts to place ships randomly on the board with optional callbacks.
   * Routes placement through the shipCellGrid system and collects results
   * for batch UI updates on success.
   *
   * @param {Ship[]} ships - Array of ships to place on the board
   * @param {Function} [onShipPlaced] - Callback fired when each ship is successfully placed.
   *        Called with (ship: Ship, placedCells: Array)
   * @param {Function} [onPlacementReset] - Callback fired when placement fails and is reset
   * @returns {boolean} True if all ships placed successfully, false if placement failed
   */
  attemptToPlaceShips (
    ships,
    onShipPlaced = Function.prototype,
    onPlacementReset = Function.prototype
  ) {
    this.resetPlacementStore()
    const result = this.shipCellGrid.attemptToPlaceShips(
      ships,
      (/** @type {Ship} */ ship, /** @type {any[]} */ placedCells) => {
        this.storeShipPlacement(placedCells, ship)
      }
    )
    if (result) {
      for (const { placedCells, ship } of this.tempPlacement) {
        onShipPlaced?.(ship, placedCells)
        // @ts-ignore - UI property available at runtime
        this.UI.markPlaced(placedCells, ship)
      }
      // @ts-ignore - UI property available at runtime
      this.UI.onFleetPlaced?.()
      return result
    }
    this.handlePlacementFailure(onPlacementReset)
    return result
  }

  /**
   * Handles placement failure by resetting visuals and invoking callback.
   * Clears all placed ship visuals and triggers optional reset callback
   * before updating UI state displays.
   *
   * @param {Function} onPlacementReset - Reset callback to invoke
   * @returns {void}
   * @private
   */
  handlePlacementFailure (onPlacementReset) {
    this.resetShipCells()
    onPlacementReset?.()
    // @ts-ignore - UI property available at runtime
    this.UI.placeTally(this.ships)
    // @ts-ignore - UI property available at runtime
    this.UI.displayShipInfo(this.ships)
  }

  /**
   * Resets the temporary placement store.
   * @returns {void}
   * @private
   */
  resetPlacementStore () {
    this.tempPlacement = []
  }

  /**
   * Stores a ship placement in the temporary placement array.
   * @param {any[]} placedCells - Array of placed cells for the ship
   * @param {Ship} ship - The ship being placed
   * @returns {void}
   * @private
   */
  storeShipPlacement (placedCells, ship) {
    this.tempPlacement.push({ placedCells, ship })
  }
  /**
   * Accumulates weapon result data into an accumulator object.
   * Aggregates hits, double-taps, ship sinks, reveals, and info messages
   * from individual weapon firing results into a single accumulator object.
   *
   * @param {WeaponResult} result - The result to accumulate (may have partial properties)
   * @param {WeaponResult} accumulator - The accumulator object to update in place
   * @returns {void} Modifies accumulator in place
   */
  accumulateResult (result, accumulator) {
    if (result?.hits) accumulator.hits += result.hits
    if (result?.dtaps) accumulator.dtaps += result.dtaps
    // Type cast for accumulation - sunk can be string or number
    if (result?.sunk) {
      const sunkValue = typeof result.sunk === 'number' ? result.sunk : 0
      accumulator.sunk =
        (typeof accumulator.sunk === 'number' ? accumulator.sunk : 0) +
        sunkValue
    }
    if (result?.reveals) accumulator.reveals += result.reveals
    if (result?.shots) accumulator.shots += result.shots
    if (result?.info) accumulator.info += result.info + ' '
  }
  /**
   * Automatically places ships using random placement with callbacks.
   * Initializes ships and delegates to performAutoPlacement with provided callbacks.
   *
   * @param {Function} [onShipPlaced] - Callback when ship placed (ship: Ship, cells: Array)
   * @param {Function} [onPlacementReset] - Callback when placement reset
   * @returns {boolean} True if placement succeeded after attempts
   */
  autoPlaceWithCallbacks (onShipPlaced, onPlacementReset) {
    const ships = this.initShips()
    return this.performAutoPlacement(ships, onShipPlaced, onPlacementReset)
  }

  /**
   * Automatically places ships with default callbacks.
   * Uses placedShipsInstance tracking and standard UI clearing behavior.
   *
   * @returns {boolean} True if placement succeeded after attempts
   */
  autoPlace () {
    return this.autoPlaceWithCallbacks(
      (/** @type {any} */ ship) => {
        placedShipsInstance.push(ship, ship.cells)
        // @ts-ignore - addToGrid method available at runtime
        ship.addToGrid(this.shipCellGrid)
      },
      () => {
        // @ts-ignore - clearVisuals method available at runtime
        this.UI.clearVisuals()
        placedShipsInstance.reset()
      }
    )
  }

  /**
   * Automatically places ships with UI clearing callback.
   * Variant of autoPlace using a different UI clear method.
   *
   * @returns {boolean} True if placement succeeded after attempts
   */
  autoPlace2 () {
    return this.autoPlaceWithCallbacks(
      Function.prototype,
      // @ts-ignore - clearPlaceVisuals method available at runtime
      this.UI.clearPlaceVisuals.bind(this.UI)
    )
  }

  /**
   * Performs the actual auto placement logic with retry loop.
   * Attempts placement up to maxAttempts times, logging results for debugging.
   * Logs detailed diagnostic info on failure including land mask visualization.
   *
   * @param {Ship[]} ships - Array of ships to place on the board
   * @param {Function} [onShipPlaced] - Ship placement callback invoked on each success
   * @param {Function} [onPlacementReset] - Placement reset callback on failure
   * @returns {boolean} True if successful within maxAttempts, false if all attempts fail
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
      console.log(
        `Auto placement ${this.steps?.player || 'Unknown'} attempt ${
          attempt + 1
        }: ${placementSuccessful}`
      )
      if (placementSuccessful) {
        console.log(
          `Successful placement ${this.steps?.player || 'Unknown'} attempt ${
            attempt + 1
          }`
        )
        return true
      }
    }

    const map = bh.map
    const landMask = map.landMask
    console.log(landMask.toAscii)
    console.warn(`Auto placement failed after ${maxAttempts} attempts`)
    return false
  }

  /**
   * Initializes ships for the game.
   * @returns {Array<any>} Initialized ships array
   */
  initShips () {
    this.resetShipCells()
    return this.ensureShipsInitialized()
  }

  /**
   * Ensures ships are initialized from map if needed.
   * @returns {Array<any>} The ships array
   */
  ensureShipsInitialized () {
    if (!this.ships || this.ships.length === 0) {
      this.setMap(bh.map)
    }
    return this.ships
  }

  /**
   * Displays all ships on the board in their current placed positions.
   * Reveals ship cells for visual representation without modifying ship state.
   * @returns {void}
   * @private
   */
  resetShipCells () {
    if (this.ships && this.UI) {
      // @ts-ignore - revealShips method available at runtime
      this.UI.revealShips?.(this.ships)
    }
  }

  /**
   * Loads ships for edit mode from map example or auto-places.
   * @param {Object} [map] - The map to load from
   * @returns {void}
   * @private
   */
  loadForEdit (map) {
    map = map || bh.map
    if (!map) return
    this.resetShipCells()
    this.ensureShipsInitialized()

    // @ts-ignore - example property available at runtime
    if (!map.example) {
      this.autoPlace()
      return
    }

    // @ts-ignore - example property available at runtime
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
   * @param {ShipPlacement|Ship[]} placed - Placed ships data
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
   * @param {ShipPlacement|Ship[]} placed - Raw placed ships value
   * @param {Object} map - Map object for fallback example data
   * @returns {ShipPlacement|null}
   * @private
   */
  _normalizePlacedShips (placed, map) {
    if (!map) return null
    // @ts-ignore - example property available at runtime
    const placedShips = placed || map.example
    if (Array.isArray(placedShips)) {
      return {
        ships: placedShips,
        // @ts-ignore - title property available at runtime
        map: map.title || '',
        // @ts-ignore - shipCellGrid is managed by this.shipCellGrid
        shipCellGrid: this.shipCellGrid.grid
      }
    }
    return placedShips || null
  }

  /**
   * Sets up weapon fire event handlers.
   * Binds destroy methods to loadOut callbacks for shot resolution.
   *
   * @returns {void}
   */
  setWeaponFireHandlers () {
    if (this.loadOut) {
      this.loadOut.onDestroy = this.destroy.bind(this)
      this.loadOut.onDestroyOneOfMany = this.destroyOne.bind(this)
    }
  }

  /**
   * Returns the active view model for the current opponent or local UI.
   * Determines which UI instance should be used for operations based on opponent state.
   *
   * @param {Waters} [oppo] - Optional opponent instance to check for UI
   * @returns {Object} UI view model instance (opponent's UI or this player's UI)
   * @private
   */
  getViewModel (oppo) {
    return oppo?.UI || this.UI
  }

  /**
   * Creates a normalized weapon selection payload with all targeting coordinates.
   * Encapsulates launch point, weapon ID, and hint coordinates for firing.
   *
   * @private
   * @param {number|null} launchR - Launch row coordinate (weapon origin)
   * @param {number|null} launchC - Launch column coordinate (weapon origin)
   * @param {number|null} weaponId - Weapon system ID to fire
   * @param {number|null} hintR - Hint row coordinate (UI hint location)
   * @param {number|null} hintC - Hint column coordinate (UI hint location)
   * @returns {WeaponSelection} Normalized weapon selection payload
   */
  _createWeaponSelectionPayload (launchR, launchC, weaponId, hintR, hintC) {
    return { launchR, launchC, weaponId, hintR, hintC }
  }

  /**
   * Creates a normalized weapon selection payload with all targeting coordinates.
   * Public wrapper around _createWeaponSelectionPayload.
   *
   * @param {number|null} launchR - Launch row coordinate (weapon origin)
   * @param {number|null} launchC - Launch column coordinate (weapon origin)
   * @param {number|null} weaponId - Weapon system ID to fire
   * @param {number|null} hintR - Hint row coordinate (UI hint location)
   * @param {number|null} hintC - Hint column coordinate (UI hint location)
   * @returns {WeaponSelection} Weapon selection payload
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
   * Adds a source marker for the current weapon selection to the UI.
   * Records launch coordinates as the weapon's origin point in the steps tracker.
   *
   * @param {Object} viewModel - UI view model instance for marker rendering
   * @param {number} launchR - Launch row coordinate (weapon origin)
   * @param {number} launchC - Launch column coordinate (weapon origin)
   * @param {HTMLElement|null} cell - Candidate cell element for marker placement
   * @returns {void}
   * @private
   */
  addSelectionSource (viewModel, launchR, launchC, cell) {
    if (!this.steps) return
    // @ts-ignore - viewModel is Board at runtime
    this.steps.addSource(
      viewModel,
      launchR,
      launchC,
      // @ts-ignore - gridCellAt method available at runtime
      cell || viewModel.gridCellAt(launchR, launchC)
    )
  }

  /**
   * Checks whether repeated clicks should filter out previously selected source keys.
   * Implements single-click filtering: if user clicks the same cell again,
   * exclude weapons that were selected in the previous click.
   *
   * @param {number} hintR - Current hint row coordinate
   * @param {number} hintC - Current hint column coordinate
   * @param {Array<string>} keyIds - Available cell key collection
   * @returns {boolean} True when repeated selection filtering applies
   * @private
   */
  shouldFilterPreviousSourceKeys (hintR, hintC, keyIds) {
    if (!this.lastClick) return false
    return (
      // @ts-ignore - lastClick typed as {r, c} at runtime
      hintR === this.lastClick.r &&
      // @ts-ignore - lastClick typed as {r, c} at runtime
      hintC === this.lastClick.c &&
      (!this.previousSources || this.previousSources.size < keyIds.length)
    )
  }

  /**
   * Filters weapon keys to only include those with loaded/armed weapons.
   * Parses triple keys to extract weapon IDs and checks against loaded weapons.
   *
   * @param {Array<string>} keyIds - Candidate key identifiers (triple-format strings)
   * @returns {Array<string>} Filtered keys for weapons that have ammo
   * @private
   */
  filterLoadedWeaponKeys (keyIds) {
    const loadedWeaponIds = this._getLoadedWeaponIds()
    return keyIds.filter(key => {
      const result = parseTriple(key)
      if (!result) return false
      const [, , weaponId] = result
      return loadedWeaponIds.has(weaponId)
    })
  }

  /**
   * Returns the set of loaded weapon IDs for the current load out.
   * Collects all weapon IDs from armed weapon systems.
   *
   * @returns {Set<number>} Set of loaded/armed weapon IDs
   * @private
   */
  _getLoadedWeaponIds () {
    // @ts-ignore - Weapon object structure known at runtime
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
    return findClosestCoord(
      filteredKeys,
      hintC,
      hintR,
      (/** @type {string} */ k) => {
        const result = parseTriple(k)
        if (!result) return [0, 0]
        const [c, r] = result
        return [r, c]
      }
    )
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
    const result = parseTriple(selectedKey)
    if (!result) return this.createEmptyWeaponSelection()
    const [launchC, launchR, weaponId] = result
    this.addSelectionSource(viewModel, launchR, launchC, null)

    if (this.loadOut) {
      // @ts-ignore - weaponId is number from parseTriple
      const ship = this.loadOut.getShipByWeaponId(weaponId)
      if (ship && this.steps) {
        this.steps.addShip(ship)
        const [sourceR, sourceC] = this.generateSourceHint(ship, this.opponent)
        this.createShadowSource(sourceR, sourceC)
      }
    }

    return this.createWeaponSelection(launchR, launchC, weaponId, hintR, hintC)
  }

  /**
   * Selects a loaded weapon system by cell key values.
   * Filters available keys to loaded weapons, applies repeated-click filtering,
   * and selects either randomly or by closest distance to hint coordinates.
   *
   * @param {Array<string>} keyIds - Candidate key identifiers (triple-format)
   * @param {number} hintR - Hint row coordinate for distance calculation
   * @param {number} hintC - Hint column coordinate for distance calculation
   * @param {boolean|string} random - Whether to select randomly ('random', true) or by distance
   * @param {Object} viewModel - UI view model instance
   * @returns {WeaponSelection} Weapon selection payload with all targeting coordinates
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
      // @ts-ignore - randomElement may return undefined, cast to null
      return randomElement(filteredKeys) || null
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
    // @ts-ignore - getLoadedWeaponEntries method available at runtime
    const entries = ship.getLoadedWeaponEntries()
    const [key, weapon] = random
      ? randomElement(entries)
      : findClosestCoord(entries, hintR, hintC, (/** @type {any[]} */ [k]) =>
          parsePair(k)
        )

    const [launchC, launchR] = parsePair(key)
    // @ts-ignore - gridCellAt method available at runtime
    const selectedCell = cell || viewModel.gridCellAt(launchR, launchC)
    if (this.steps) {
      // @ts-ignore - viewModel is Board at runtime
      this.steps.addSource(viewModel, launchR, launchC, selectedCell)
    }

    return this.createWeaponSelection(launchR, launchC, weapon.id, hintR, hintC)
  }

  /**
   * Places matching ships from loaded data using a placer function.
   * @param {ShipPlacement} placedShips - The placed ships data
   * @param {Function} placer - Function to place individual ships
   * @returns {Array<any>} Array of ships that couldn't be matched
   * @private
   */
  placeMatchingShipsFromData (placedShips, placer) {
    const matchableShips = [...this.ships]
    for (const ship of placedShips.ships) {
      const matchingShip = removeFirstMatching(
        matchableShips,
        // @ts-ignore - ship.letter available at runtime
        (/** @type {any} */ s) => s.letter === ship.letter,
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
   * @returns {Array<any>} Array of ships that couldn't be matched
   */
  placeMatchingShips (placedShips, placer) {
    return this.placeMatchingShipsFromData(placedShips, placer)
  }

  /**
   * Places a matching ship during edit mode using provided ship cells.
   * @param {Object} matchingShip - The ship instance to place.
   * @param {Object} ship - The source ship data containing cells.
   * @returns {void}
   * @private
   */
  placeMatchingShipForEdit (matchingShip, ship) {
    if (!ship) return
    // @ts-ignore - cells property available at runtime
    if (!ship.cells) return
    // @ts-ignore - cells property available at runtime
    matchingShip.cells = ship.cells
    // @ts-ignore - cells property available at runtime
    placedShipsInstance.push(matchingShip, ship.cells)
    // @ts-ignore - addToGrid method available at runtime
    matchingShip.addToGrid(this.shipCellGrid)
    // @ts-ignore - placement method available at runtime
    this.UI.placement(ship.cells, this, matchingShip)
  }

  /**
   * Places a matching ship during regular load using provided ship cells.
   * @param {Object} matchingShip - The ship instance to place.
   * @param {Object} ship - The source ship data containing cells.
   * @returns {void}
   * @private
   */
  placeMatchingShip (matchingShip, ship) {
    if (!ship) return
    // @ts-ignore - cells property available at runtime
    if (!ship.cells) return
    // @ts-ignore - placeAtCells method available at runtime
    matchingShip.placeAtCells(ship.cells)

    // @ts-ignore - addToGrid method available at runtime
    matchingShip.addToGrid(this.shipCellGrid)
    // @ts-ignore - placement method available at runtime
    this.UI.placement(ship.cells, this, matchingShip)
    // @ts-ignore - trayManager property available at runtime
    const dragship = this.UI.trayManager?.getTrayItem?.(ship.id)
    if (dragship) {
      // @ts-ignore - removeDragShip method available at runtime
      this.UI.removeDragShip(dragship)
    }
  }

  /**
   * Applies extra info to a matching ship.
   * @param {Object} matchingShip - The ship to update
   * @param {Object} ship - Source ship data
   * @returns {void}
   * @private
   */
  applyExtraInfoToMatchingShip (matchingShip, ship) {
    if (!ship) return
    // @ts-ignore - variant property available at runtime
    matchingShip.variant = ship.variant
    // @ts-ignore - weapons property available at runtime
    matchingShip.weapons = ship.weapons
  }

  /**
   * Applies weapons to a matching ship.
   * DEPRECATED: This method is not currently used in the codebase.
   * Kept for backward compatibility with external code.
   *
   * @param {Object} ship - Source ship data
   * @param {any[]} values - Weapon values to apply
   * @param {Object} matchingShip - The ship to update
   * @returns {void}
   * @private
   * @deprecated Not used in current codebase
   */
  // @ts-ignore - unused method but may be called externally
  applyWeaponsToMatchingShip (ship, values, matchingShip) {
    if (!ship) return
    // @ts-ignore - weapons property available at runtime
    if (!ship.weapons) return
    // @ts-ignore - weapons property available at runtime
    const keys = Object.keys(ship.weapons)
    if (values.length === keys.length) {
      // @ts-ignore - weapons property assignment
      matchingShip.weapons = {}
      for (const [index, key] of keys.entries()) {
        // @ts-ignore - weapons property available at runtime
        matchingShip.weapons[key] = values[index]
      }
    }
  }
  /**
   * Loads placed ships from storage or provided data.
   * Retrieves ship placements from localStorage or uses provided data,
   * then places matching ships on the board with UI updates.
   *
   * @param {ShipPlacement} [placedShips] - Explicit placed ships data to load (overrides storage)
   * @returns {void}
   */
  load (placedShips) {
    const map = bh.map
    if (!map) return
    this.initShips()

    placedShips = this.retrievePlacedShips(map, placedShips)
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
      this.UI.trayManager?.resetTrays?.()
    } else {
      console.log(`${unmatchedShips.length} ships not matched`)
    }
  }

  /**
   * Retrieves placed ships from storage or validates provided data.
   * @param {Object} map - The map object
   * @param {ShipPlacement} [placedShips] - Placed ships data (defaults to null)
   * @returns {ShipPlacement|null} Retrieved or validated placed ships
   * @private
   */
  retrievePlacedShips (map, placedShips) {
    if (!map) return null
    const stored = localStorage.getItem(this._getStorageKey())
    // @ts-ignore - placedShips may be null, handle gracefully
    const data = placedShips || (stored ? JSON.parse(stored) : null)
    // @ts-ignore - map.title property available at runtime
    if (map.title !== data?.map) {
      return null
    }
    return this.validatePlacedShips(data, map)
  }

  /**
   * Updates global ID counters based on loaded ships.
   * @param {ShipPlacement|null} placedShips - The placed ships data.
   * @returns {void}
   * @private
   */
  updateGlobalIds (placedShips) {
    if (!placedShips || !placedShips.ships) return
    const { maxShipId, maxWeaponId } = this._getMaxIdsFromShips(
      placedShips.ships
    )
    // @ts-ignore - Static property assignment for ID management
    Ship.id = maxShipId + 1
    // @ts-ignore - Static property assignment for ID management
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
        accumulator.maxShipId = Math.max(ship.id || 1, accumulator.maxShipId)
        // @ts-ignore - weapons property and structure available at runtime
        if (ship.weapons && typeof ship.weapons === 'object') {
          accumulator.maxWeaponId = Object.values(ship.weapons).reduce(
            (weaponMax, /** @type {any} */ weapon) => {
              // @ts-ignore - weapon is Rack type with id property
              const weaponId = typeof weapon === 'object' ? weapon?.id : 1
              return Math.max(weaponId || 1, weaponMax)
            },
            accumulator.maxWeaponId
          )
        }
        return accumulator
      },
      { maxShipId: 1, maxWeaponId: 1 }
    )
  }

  /**
   * Resets the map state and loads new map configuration.
   * @param {Object} map - The map to set.
   * @returns {void}
   */
  resetMap (map) {
    this.boardDestroyed = false
    this.isRevealed = false
    this.setMap(map)
  }

  /**
   * Arms weapons for all ships on the map.
   * @param {Object} [map] - The map to arm weapons for
   * @returns {void}
   */
  armWeapons (map) {
    map = map || bh.map
    if (!map) return
    const weaponShips = this.determineWeaponShips(map)

    this.configureLoadOut(map, weaponShips)
    this.setCursorChangeCallback()
  }

  /**
   * Determines which ships should have weapons based on map configuration.
   * @param {Object} _map - The map object (unused, kept for API compatibility)
   * @returns {Array<any>} Array of ships with weapons
   * @private
   */
  determineWeaponShips (_map) {
    if (!this.ships) {
      this.ships = []
    }
    const weaponShips = this.ships.filter(
      (/** @type {any} */ ship) => ship.hasWeapon
    )
    this.hasAttachedWeapons = weaponShips.length > 0
    this.weaponShips = weaponShips
    return weaponShips
  }

  /**
   * Configures the load out system for weapons.
   * @param {Object} map - The map object.
   * @param {Array<any>} weaponShips - Ships with weapons.
   * @returns {void}
   * @private
   */
  configureLoadOut (map, weaponShips) {
    const shipsForLoadOut = this._resolveLoadOutShips(map, weaponShips)
    // @ts-ignore - loadOut is assigned at runtime
    this.loadOut = this.createLoadOut(map, shipsForLoadOut)
  }

  /**
   * Resolves the ship list to be used for load out creation.
   * @private
   * @param {Object} _map - The map (unused)
   * @param {Array<any>} weaponShips - Default weapon ships.
   * @returns {Array<any>} Ships to include in the load out.
   */
  _resolveLoadOutShips (_map, weaponShips) {
    if (bh.seekingMode && this.hasAttachedWeapons) {
      return weaponShips
    }
    if (this.opponent) {
      // @ts-ignore - opponent ships available at runtime
      return this.opponent.ships.filter(
        (/** @type {any} */ ship) => ship.hasWeapon
      )
    }
    return weaponShips
  }

  /**
   * Sets up cursor change callback if available.
   * @returns {void}
   * @private
   */
  setCursorChangeCallback () {
    if (this.loadOut) {
      // @ts-ignore - onCursorChangeCallback available at runtime
      this.loadOut.onCursorChangeCallback = this.cursorChange.bind(this)
    }
  }

  /**
   * Creates a load out instance for the given map and ships.
   * @param {Object} map - The map object
   * @param {Array<any>} [ships] - Ships to include in load out
   * @returns {LoadOut} The created load out
   * @private
   */
  createLoadOut (map, ships) {
    ships = ships || this.weaponShips || []
    // @ts-ignore - map.weapons property available at runtime
    const weapons = bh.terrain?.hasUnattachedWeapons
      ? map?.weapons || []
      : (map?.weapons || []).filter(
          (/** @type {any} */ weapon) => !weapon.isLimited
        )
    // @ts-ignore - UI type is Board at runtime
    const loadOut = new LoadOut(weapons, ships, this.UI, this.steps)

    // For terrains without unattached weapons, also create weapon systems
    // from limited weapons for display purposes (weapon tally boxes)
    if (!bh.terrain?.hasUnattachedWeapons && map?.weapons) {
      // @ts-ignore - map.weapons is available at runtime
      const limitedWeapons = map.weapons.filter(
        (/** @type {any} */ weapon) => weapon.isLimited
      )
      for (const limitedWeapon of limitedWeapons) {
        // Check if this weapon system doesn't already exist
        const exists = loadOut.allWeaponSystems.some(
          (/** @type {any} */ wps) => wps.weapon.letter === limitedWeapon.letter
        )
        if (!exists) {
          // Create a weapon system for display purposes
          const weaponSystem = LoadOut.createWeaponSystems([limitedWeapon])[0]
          if (weaponSystem) {
            loadOut.allWeaponSystems.push(weaponSystem)
          }
        }
      }
    }

    return loadOut
  }
  /**
   * Displays auto-selection warning for weapons.
   * @param {string} weaponName - Name of the weapon
   * @param {Object|null} currentShip - The ship with the weapon
   * @returns {void}
   * @private
   *
   * currentShip may be null or undefined in some auto-selection flows,
   * so this method must safely handle a missing ship shape.
   */
  displayAutoSelectWarning (weaponName, currentShip) {
    // @ts-ignore - shape() method available at runtime
    const shipDescription = currentShip?.shape?.().descriptionText || 'the ship'
    this.displayInfo(
      `Auto-selected ${weaponName}, Click near ${shipDescription} to select a different ${weaponName}`
    )
  }

  /**
   * Selects a random weapon system and returns its targeting information.
   * @returns {WeaponSelection} Weapon selection data
   * @private
   */
  selectRandomWeapon () {
    if (!this.loadOut) return this.createEmptyWeaponSelection()
    const armedShips = this.loadOut.getArmedShips()
    const selectedShip = randomElement(armedShips)

    if (!selectedShip) {
      return this.createEmptyWeaponSelection()
    }

    if (this.steps) {
      this.steps.addShip(selectedShip)
    }
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
   * @param {Array<any>} hintCoords - [r, c] coordinates
   * @returns {boolean} True if coordinates are valid
   * @private
   */
  areHintCoordsValid (hintCoords) {
    return hintCoords[0] != null && hintCoords[1] != null
  }

  /**
   * Generates weapon selection for a ship with valid hint coordinates.
   * @param {Object} ship - The ship to generate selection for
   * @param {Array<any>} hintCoords - Valid hint coordinates [r, c]
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
   * @param {Object|null} opponent - The opponent instance
   * @returns {[number, number]} Coordinates [row, col] for hint
   * @private
   */
  generateSourceHint (ship, opponent) {
    if (this.steps?.sourceHint) {
      return [this.steps.sourceHint.r, this.steps.sourceHint.c]
    }
    return this.generateRandomSourceHint(ship, opponent)
  }

  /**
   * Generates a random source hint around opponent ships.
   * When no surrounding cells are available, this method intentionally
   * skips creating a visible UI hint and returns a fallback coordinate.
   * This prevents seek-mode weapons from accidentally placing a hint at [0,0].
   *
   * @param {Object} ship - The ship to generate hint for
   * @param {Object|null} opponent - The opponent instance
   * @returns {[number, number]} Coordinates [row, col] for hint
   * @private
   */
  generateRandomSourceHint (ship, opponent) {
    const surroundingCells = this.getSurroundingCells(ship, opponent)
    if (surroundingCells.length === 0) {
      console.warn(
        'no surround cells found for random weapon hint, skipping hint generation'
      )
      return [0, 0]
    }
    const hintKey = randomElement(surroundingCells)
    if (!hintKey) return [0, 0]
    const [r, c] = parsePair(hintKey)
    if (this.steps && opponent?.UI) {
      this.steps.addHint(opponent.UI, r, c, opponent.UI.gridCellAt(r, c))
    }
    return [r, c]
  }

  /**
   * Gets surrounding cells for a ship relative to opponent.
   * Returns an empty array when the opponent is missing.
   * @param {Object} ship - The ship
   * @param {Object|null} opponent - The opponent instance
   * @returns {string[]} Array of surrounding cell keys
   * @private
   */
  getSurroundingCells (ship, opponent) {
    if (!opponent || !ship) return []
    const cells = ship.cells
    if (!cells) return []
    const surrounding = [...opponent.UI.surroundCells(cells)]
    return surrounding
  }

  /**
   * Creates a shadow source at the given coordinates.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Object|null} The shadow cell or null
   * @private
   */
  createShadowSource (r, c) {
    const opponent = this.opponent
    if (opponent && opponent.UI) {
      const opponentCell = opponent.UI.gridCellAt(r, c)
      if (this.steps) {
        this.steps.addShadow(opponent.UI, r, c, opponentCell)
      }
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
    if (bh.seekingMode) {
      boardClasses.add('seeking-mode')
    }
    if (isTargeting) {
      boardClasses.add('targetting')
      boardClasses.remove('not-step')
    } else {
      boardClasses.remove('targetting')
      boardClasses.add('not-step')
    }
  }

  /**
   * Selects and arms a weapon system for firing.
   * @param {Waters|null} oppo - Opponent instance
   * @param {number} weaponId - Weapon system ID to arm
   * @param {number} launchR - Launch row coordinate
   * @param {number} launchC - Launch column coordinate
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   * @param {HTMLElement|null} [cell] - Optional cell element
   * @returns {void}
   */
  selectAndArmWps (oppo, weaponId, launchR, launchC, hintR, hintC, cell = null) {
    // @ts-ignore - loadOut available at runtime
    const rack = this.loadOut.getWeaponBySystemId(weaponId)
    // @ts-ignore - rack structure known at runtime
    const weapon = rack?.weapon
    const letter = weapon?.letter

    this.giveTempHint(weapon, cell, oppo)
    this.addSource(oppo, launchR, launchC, rack, cell)
    // @ts-ignore - steps available at runtime
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
      this.steps?.targetting(this.hasAttachedWeapons)
      this.loadOut.launch = async coords => {
        return await this.launchTo(coords, hintR, hintC, rack)
      }
      // @ts-ignore - selectedWeapon accepts weapon system at runtime
      this.loadOut.selectedWeapon = rack
    }
  }

  /**
   * Displays a temporary hint if the weapon gives one.
   * @param {Object} weapon - The weapon with hint capability
   * @param {HTMLElement|null} cell - Cell element to mark with hint
   * @param {Waters|null} oppo - Opponent instance
   * @returns {void}
   * @private
   */
  giveTempHint (weapon, cell, oppo) {
    if (oppo && weapon?.givesHint) {
      // @ts-ignore - UI available at runtime
      oppo.UI.deactivateTempHints()
      if (cell) cell.classList.add('temp-hint')
    }
  }

  /**
   * Adds source tracking for weapon selection.
   * @param {Waters|null} oppo - Opponent instance
   * @param {number} launchR - Launch row coordinate
   * @param {number} launchC - Launch column coordinate
   * @param {Object} rack - Weapon rack object
   * @param {HTMLElement|null} cell - Cell element
   * @returns {void}
   * @private
   */
  addSource (oppo, launchR, launchC, rack, cell) {
    // @ts-ignore - steps available at runtime
    if (this.steps.source === null) {
      // @ts-ignore - UI available at runtime
      const viewModel = oppo?.UI || this.UI
      // @ts-ignore - steps available at runtime
      this.steps.addSource(viewModel, launchR, launchC, cell)
      console.warn(
        'no source found when selecting and arming weapon, adding source with launch coords'
      )
    }
    // @ts-ignore - steps and terrain available at runtime
    if (!bh.terrain.hasUnattachedWeapons && !this.steps.sourceShip) {
      console.warn(
        'Terrain does not have unattached weapons, but a weapon is without a source ship'
      )
      // @ts-ignore - loadOut available at runtime
      const ship = this.loadOut.getShipByWeaponId(rack?.id)
      // @ts-ignore - steps available at runtime
      this.steps.addShip(ship)
    }
  }

  /**
   * Prepares a weapon selection by adding the weapon to the UI and updating targeting state.
   * @param {WeaponSelection} selection - The weapon selection object
   * @param {Waters|null} oppo - The opponent instance
   * @returns {void}
   * @private
   */
  _armSelectedWeapon (selection, oppo) {
    // @ts-ignore - UI available at runtime
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

  /**
   * Selects an attached weapon and arms it for firing.
   * @param {HTMLElement|null} cell - Cell element for selection
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {Waters|null} oppo - Opponent instance
   * @returns {void}
   * @private
   */
  selectAttachedWeapon (cell, r, c, oppo) {
    const selection = this.selectWeaponId(cell, r, c, false, null, oppo)
    this._armSelectedWeapon(selection, oppo)
  }

  /**
   * Selects a random attached weapon and arms it for firing.
   * @param {Waters|null} oppo - Opponent instance
   * @returns {void}
   * @private
   */
  randomAttachedWeapon (oppo) {
    const selection = this.selectRandomWeapon()
    this._armSelectedWeapon(selection, oppo)
  }

  /**
   * Selects and arms a weapon by ID with coordinate targeting.
   * @param {number} weaponId - Weapon system ID
   * @param {Waters|null} oppo - Opponent instance
   * @param {number} launchR - Launch row coordinate
   * @param {number} launchC - Launch column coordinate
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   * @param {HTMLElement|null} cell - Cell element
   * @returns {void}
   * @private
   */
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
    // Check for score property using bracket notation to avoid type narrowing issues
    if (result && 'score' in result && result['score'] !== LoadOut.noResult) {
      return result
    }
    if (result) {
      result['hasTargettedWeapon'] =
        this.prepareTargetedRandomWeaponSelection(autoSelectWarning)
    }
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
    // @ts-ignore - hasAmmo method available at runtime
    const attached = current?.hasAmmo?.()
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
        Boolean(random),
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
    // @ts-ignore - currentWeapon structure known at runtime
    const currentShip = this.loadOut.getShipByWeaponId(currentWeapon.id)
    // @ts-ignore - weapon property available at runtime
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
      // @ts-ignore - getLoadedWeapon method available at runtime
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

  setupAttachedAim () {
    const oppo = this.opponent
    if (
      bh.seekingMode ||
      !this.loadOut?.ships ||
      !oppo ||
      this.loadOut.ships.length === 0 ||
      // @ts-ignore - onClickOppoCell method available at runtime
      !this.onClickOppoCell
    )
      return

    this._removeAttachedAimListeners(oppo)
    this._addAttachedAimListeners(oppo)
  }

  /**
   * Removes all previously attached aim listeners from opponent cells.
   * @private
   * @param {Waters|null} oppo - The opponent instance.
   * @returns {void}
   */
  _removeAttachedAimListeners (oppo) {
    if (!oppo || !this.loadOut || !this.loadOut.ships) return
    const armedShips = this.loadOut.ships
    for (const ship of armedShips) {
      // @ts-ignore - shipCells method available at runtime
      const cells = oppo.shipCells(ship.id)
      // @ts-ignore - surroundCellElement method available at runtime
      const surround = oppo.UI.surroundCellElement(cells)
      for (const cell of surround) {
        // @ts-ignore - _clickOppoHandler is dynamically attached
        if (cell._clickOppoHandler) {
          // @ts-ignore - handler is dynamically attached
          cell.removeEventListener('click', cell._clickOppoHandler)
          // @ts-ignore - handler is dynamically attached
          delete cell._clickOppoHandler
        }
      }
    }
  }

  /**
   * Adds click listeners to opponent surrounding cells.
   * Cells that surround multiple armed ships receive only one listener.
   * @private
   * @param {Waters|null} oppo - The opponent instance.
   * @returns {void}
   */
  _addAttachedAimListeners (oppo) {
    if (!oppo || !this.loadOut || !this.loadOut.ships) return
    const armedShips = this.loadOut.ships
    const cellsToListen = new Set()

    // Collect all unique surrounding cells across all armed ships
    for (const ship of armedShips) {
      // @ts-ignore - shipCells method available at runtime
      const cells = oppo.shipCells(ship.id)
      // @ts-ignore - surroundCellElement method available at runtime
      const surround = oppo.UI.surroundCellElement(cells)
      for (const cell of surround) {
        cellsToListen.add(cell)
      }
    }

    // Add listener only once per cell
    for (const cell of cellsToListen) {
      const [r, c] = coordsFromCell(cell)
      // @ts-ignore - onClickOppoCell method available at runtime
      const handler = this.onClickOppoCell.bind(this, r, c)
      cell.addEventListener('click', handler)
      // @ts-ignore - _clickOppoHandler is dynamically attached
      cell._clickOppoHandler = handler
    }
  }
  /**
   * Resets the base board state.
   * @returns {void}
   * @private
   */
  resetBase () {
    this.boardDestroyed = false
    if (this.UI?.board) {
      this.UI.board.classList.remove('destroyed')
    }
    this.score.reset()
  }
  /**
   * Sets the current map and initializes fleet.
   * @param {Object} [map] - The map to set (defaults to bh.map)
   * @returns {void}
   * @private
   */
  setMap (map) {
    map = map || bh.map
    if (!map) return
    if (!this.ships || this.ships.length === 0) {
      // Debug: log map and fleet composition to diagnose missing attached weapons
      try {
        console.debug('Waters.setMap: setting map', map?.title)
        const newFleet = map.newFleetForMap || []
        console.debug(
          'Waters.setMap: map.newFleetForMap letters',
          newFleet.map((/** @type {any} */ s) => s.letter)
        )
        const extra = map.extraArmedFleetForMap || []
        console.debug(
          'Waters.setMap: map.extraArmedFleetForMap letters',
          extra.map((/** @type {any} */ s) => s.letter)
        )
      } catch (e) {
        console.debug('Waters.setMap: debug failed', e)
      }

      this.ships = map.newFleetForMap || []
      this.armWeapons(map)
    }
    for (const ship of this.ships) {
      ship.reset()
    }
  }
  /**
   * Handles hint reveal for opponent.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {void}
   * @private
   */
  handleHint (r, c) {
    this.opponent?.score?.hintReveal?.(r, c)
  }
  /**
   * Gets a random target from hit candidates.
   * @param {Array<Array<number>>} effect - The effect area
   * @param {Object} weapon - The weapon being used
   * @returns {Array<number>|null} Random hit candidate or null
   * @private
   */
  getTarget (effect, weapon) {
    const candidates = this.getHitCandidates(effect, weapon)
    return randomElement(candidates)
  }

  /**
   * Gets all hit candidates for a weapon effect.
   * @param {Array<Array<number>>} effect - The effect area coordinates
   * @param {Object} weapon - The weapon being used
   * @returns {Array<Array<number>>} Array of hit candidates [r, c, power]
   * @private
   */
  getHitCandidates (effect, weapon) {
    const candidates = []
    const map = bh.map
    const maps = bh.maps
    if (!map || !maps) return candidates
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

  /**
   * Adds wake visual to cell if applicable.
   * @param {HTMLElement} cell - The cell to add wake to
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {Object} weapon - The weapon being used
   * @returns {void}
   * @private
   */
  addWake (cell, r, c, weapon) {
    if (!weapon || !weapon.hasWake) return
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
   * @param {Array<any>} hitCandidates - The hit candidates.
   * @returns {boolean} True if no candidates.
   */
  hasNoHitCandidates (hitCandidates) {
    return hitCandidates.length < 1
  }

  /**
   * Handles the case when there are no hit candidates.
   * @param {*} weapon - The weapon.
   * @param {Array<any>} effect - The effect.
   * @param {Object} options - Additional options.
   * @returns {Promise<any>} The destruction result.
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
   * @param {Array<any>} effect - The effect.
   * @param {Array<any>} target - The target.
   * @param {Array<any>} hitCandidates - The hit candidates.
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
   * @param {Array<any>} resolvedTarget - Resolved hit target.
   * @param {Array<any>} effect - The original effect.
   * @param {Object} options - Additional options.
   * @returns {Array<any>} The splash effect.
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
   * @param {Array<any>} target - The provided target.
   * @param {Array<any>} hitCandidates - The candidates.
   * @returns {Array<any>} The resolved target.
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
   * @param {Array<any>} effect - The effect coordinates.
   * @param {Array<any>} [target] - Optional target coordinates.
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
   * @param {Array<any>} resolvedTarget - The resolved target.
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
   * Filters ships with sunk property = true.
   *
   * @returns {Ship[]} Array of destroyed/sunk ships
   */
  shipsSunk () {
    return this.ships.filter(s => s.sunk)
  }

  /**
   * Gets all ships that are NOT sunk.
   * Filters ships with sunk property = false or undefined.
   *
   * @returns {Ship[]} Array of surviving/unsunk ships
   */
  shipsUnsunk () {
    return this.ships.filter(s => !s.sunk)
  }

  /**
   * Gets all unique unsunk ship shapes.
   * Returns unique shape instances from unsunk ships for type analysis.
   *
   * @returns {Array<any>} Unique ship shapes from unsunk fleet
   */
  shapesUnsunk () {
    return [...new Set(this.shipsUnsunk().map(s => s.shape()))]
  }

  /**
   * Gets unsunk ship shapes that can be placed on specified terrain/zone.
   * Filters shapes based on terrain compatibility constraints.
   *
   * @param {Object} subterrain - Terrain type for placement compatibility check
   * @param {Object} zone - Zone constraints for placement
   * @returns {Array<any>} Shapes that satisfy terrain and zone constraints
   */
  shapesCanBeOn (subterrain, zone) {
    return this.shapesUnsunk().filter(s => s.canBeOn(subterrain, zone))
  }

  /**
   * Gets armed ship cells (cells with ammo > 0).
   * Filters all board cells to find those with loaded weapons.
   *
   * @returns {HTMLElement[]} Array of armed cell DOM elements
   */
  armedCells () {
    return this.cellList().filter(c => Number.parseInt(c.dataset.ammo) > 0)
  }

  /**
   * Gets armed ship cells for a specific weapon letter.
   * Filters armed cells to those with specified weapon letter.
   *
   * @param {string} letter - Weapon letter identifier (e.g., 'M', 'R', 'T')
   * @returns {HTMLElement[]} Array of armed cells with matching weapon letter
   */
  armedCellsWithWeapon (letter) {
    return this.cellList().filter(
      c => Number.parseInt(c.dataset.ammo) > 0 && c.dataset.wletter === letter
    )
  }

  /**
   * Gets all cells on the game board.
   * Converts HTMLCollection to array for easier iteration and filtering.
   *
   * @returns {HTMLElement[]} Array of all board cell DOM elements
   */
  cellList () {
    // @ts-ignore - cellsOnBoard returns HTMLCollection, cast to HTMLElement[]
    return [...this.cellsOnBoard()]
  }

  /**
   * Gets direct children elements of board (cell references).
   * Returns the HTMLCollection of board's immediate children.
   *
   * @returns {HTMLCollection} Live collection of board cell children
   */
  cellsOnBoard () {
    return this.UI.board.children
  }

  /**
   * Gets all cells on board belonging to a specific ship.
   * Filters cells by matching ship ID in dataset.
   *
   * @param {number} id - Ship ID to match
   * @returns {HTMLElement[]} Array of cells belonging to the ship
   * @private
   */
  shipCells (id) {
    /** @type {HTMLElement[]} */
    const list = []
    for (const cell of this.cellsOnBoard()) {
      // @ts-ignore - dataset property available on Element, cast to HTMLElement
      if (Number.parseInt(cell.dataset.id) === id) {
        // @ts-ignore - Element from HTMLCollection, cast to HTMLElement
        list.push(cell)
      }
    }
    return list
  }

  /**
   * Records an auto-miss at the given coordinates.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {void}
   * @private
   */
  recordAutoMiss (r, c) {
    const key = this.score.addAutoMiss(r, c)
    if (!key) return // already shot here
    this.UI.cellMiss(r, c)
  }

  /**
   * Records the fleet as sunk and updates UI.
   * @returns {void}
   * @private
   */
  recordFleetSunk () {
    this.displayInfo('All ' + this.preamble0 + ' Ships Destroyed!')
    // @ts-ignore - displayFleetSunk method available at runtime
    this.UI.displayFleetSunk()
    this.boardDestroyed = true
    this._hideWaiting()
    this.opponent?._hideWaiting()
  }
  /**
   * Checks if the entire fleet is sunk.
   * @returns {void}
   * @private
   */
  checkFleetSunk () {
    if (this.ships.every((/** @type {any} */ s) => s.sunk)) {
      this.recordFleetSunk()
    }
  }

  /**
   * Gets the ship cell at the given coordinates.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {any} The ship cell or null
   * @private
   */
  shipCellAt (r, c) {
    return this.shipCellGrid.cellAtRC(r, c)
  }

  /**
   * Marks a ship as sunk and updates UI.
   * @param {Object} ship - The sunk ship
   * @returns {void}
   * @private
   */
  markSunk (ship) {
    if (!ship || !ship.cells) return
    this.UI.displaySurround(
      ship.cells,
      ship.letter,
      (r, c) => this.recordAutoMiss(r, c),
      (c, r, letter) => this.UI.cellSunkAt(r, c, letter)
    )
    this.checkFleetSunk()
  }
  /**
   * Gets the onSunk callback handler.
   * @returns {Function} Bound markSunk function
   */
  get onSunk () {
    return this.markSunk.bind(this)
  }

  /**
   * Marks a cell as hit.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {boolean} damaged - Whether the cell was damaged
   * @returns {void}
   * @private
   */
  markHit (r, c, damaged) {
    this.score.reveal.clear(r, c)
    this.UI.cellHit(r, c, damaged)
  }

  /**
   * Gets the ship associated with a ship cell.
   * @param {Object} shipCell - The ship cell
   * @returns {any} The ship or undefined
   * @private
   */
  getShipFromCell (shipCell) {
    if (!shipCell) return undefined
    // @ts-ignore - ship.id available at runtime
    return this.ships.find((/** @type {any} */ s) => s.id === shipCell.id)
  }
  /**
   * Gets description text for a sunk ship.
   * @param {Object} ship - The sunk ship
   * @returns {string} Description text
   * @private
   */
  sunkDescription (ship) {
    if (this.opponent && ship) {
      // @ts-ignore - sunkDescription method available at runtime
      return this.preamble0 + ' ' + ship.sunkDescription(' was ')
    }
    // @ts-ignore - sunkDescription method available at runtime
    return ship?.sunkDescription() || ''
  }

  /**
   * Gets description text for a sunk ship by letter.
   * @param {string} letter - Ship letter
   * @returns {string} Description text
   * @private
   */
  sunkLetterDescription (letter) {
    if (this.opponent) {
      return this.preamble0 + ' ' + bh.terrain.sunkDescription(letter, ' was ')
    }
    return bh.shipSunkText(letter)
  }

  /**
   * Displays a sunk ship warning.
   * @param {Object} ship - The sunk ship
   * @param {string} [info] - Additional info to prepend
   * @returns {void}
   * @private
   */
  sunkWarning (ship, info = '') {
    if (!info) {
      info = ''
    }
    this.displayInfo(info + this.sunkDescription(ship))
  }

  /**
   * Checks whether a weapon fire results in a hit.
   * @param {Object} weapon - The weapon being fired
   * @param {number} r - Target row
   * @param {number} c - Target column
   * @param {number} power - Weapon power
   * @param {Object|null} shipCell - The ship cell at target
   * @returns {Object} Hit result with hits, shots, sunk, info
   * @private
   */
  checkForHit (weapon, r, c, power, shipCell) {
    if (!shipCell) {
      return LoadOut.noResult
    }

    const hitShip = this.getShipFromCell(shipCell)

    if (!hitShip) {
      this.UI.cellMiss(r, c)
      return LoadOut.missResult
    }

    // @ts-ignore - shapesByLetter available at runtime
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

  /**
   * Shows and processes a hit on a ship.
   * @param {number} row - Hit row
   * @param {number} col - Hit column
   * @param {Object} hitShip - The ship that was hit
   * @param {number} initialShots - Initial shot count
   * @returns {Object} Result with hits, shots, reveals, sunk, info
   * @private
   */
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

  /**
   * Applies hit entries to score and display.
   * @param {Array<Object>} hitEntries - Hit entry objects
   * @param {number} totalHits - Running total of hits
   * @returns {number} Updated hit total
   * @private
   */
  _applyHitEntries (hitEntries, totalHits) {
    for (const { cell, damaged } of hitEntries) {
      const [r, c] = /** @type {[number, number]} */ (cell)
      this.score.shotRevealFinalizeXY(r, c)
      this.score.shot.set(r, c)
      totalHits++
      this.markHit(r, c, damaged)
    }
    return totalHits
  }

  /**
   * Applies miss entries to score and display.
   * @param {Array<Object>} missEntries - Miss entry objects
   * @param {number} totalShots - Running total of shots
   * @returns {number} Updated shot total
   * @private
   */
  _applyMissEntries (missEntries, totalShots) {
    for (const { cell, damaged } of missEntries) {
      this.score.shot.set(...cell)
      totalShots++
      this.UI.cellMiss(cell[0], cell[1], damaged)
    }
    return totalShots
  }
  /**
   * Gets whether the game has ended.
   * @returns {boolean} True if game ended
   * @private
   */
  get isEnded () {
    if (this.isRevealed || this.boardDestroyed) {
      this._hideWaiting?.()
      this.opponent?._hideWaiting()
      this._oldWeaponLetter = null
      return true
    }
    return false
  }

  /**
   * Updates weapon mode and UI based on current weapon system.
   * @param {Object} wps1 - Current weapon system
   * @param {Object} cursorInfo - Cursor info
   * @returns {void}
   * @private
   */
  updateMode (wps1, cursorInfo) {
    if (this.isEnded) {
      return
    }
    this.updateWeaponButtons()
    this.updateWeaponStatus(wps1 || this.loadOut?.selectedWeapon, cursorInfo)
  }

  /**
   * Updates visibility of weapon buttons.
   * @returns {void}
   * @private
   */
  updateWeaponButtons () {
    if (this.UI?.weaponBtns == null) return
    for (const btn of this.UI.weaponBtns) {
      const letter = btn.dataset.letter
      const hasAmmo = this.loadOut?.hasAmmoForWeaponLetter?.(letter)
      if (hasAmmo) {
        btn.classList.remove('hidden')
      } else {
        btn.classList.add('hidden')
      }
    }
  }

  /**
   * Fires a single shot at a coordinate with specified power level.
   * Checks if target cell contains a ship, applies weapon protection rules,
   * and marks hits/misses on the board.
   *
   * @param {Object} weapon - The weapon firing (with letter property for protection matching)
   * @param {number} r - Target row coordinate
   * @param {number} c - Target column coordinate
   * @param {number} power - Weapon power level (determines penetration)
   * @returns {Object} Result object with hits, shots, and sunk ship info
   * @private
   */
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

  /**
   * Gets description text for hit count.
   * @param {number} hits - Number of hits
   * @returns {string} Description text
   * @private
   */
  hitDescription (hits) {
    if (this.opponent) {
      return this.preamble + 'Hit (x' + hits.toString() + ')'
    }
    if (hits === 1) {
      return 'Hit'
    }
    return hits.toString() + ' Hits'
  }

  /**
   * Gets description text for reveal count.
   * @param {number} reveals - Number of reveals
   * @returns {string} Description text
   * @private
   */
  revealDescription (reveals) {
    if (this.opponent) {
      return this.preamble + 'revealed (x' + reveals.toString() + ')'
    }
    if (reveals === 1) {
      return 'Reveal'
    }
    return reveals.toString() + ' revealed'
  }
  /**
   * Displays miss message with optional reveal count.
   * @param {Object} weapon - The weapon that missed
   * @param {number} [reveals] - Number of reveals (default 0)
   * @param {string} [messageInfo] - Message prefix
   * @returns {void}
   * @private
   */
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
   * @param {Object} weapon - The weapon that missed
   * @returns {string|null} Resulting miss message, or null for no display
   * @private
   */
  buildMissMessage (weapon) {
    if (!weapon) return null
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

  /**
   * Updates result display for bomb/splash damage.
   * @param {Object} weapon - The weapon that fired
   * @param {Object} result - The firing result
   * @returns {void}
   * @private
   */
  updateResultsOfBomb (weapon, result) {
    if (!result) return
    const { hits, sunk, reveals, info } = result
    this.updateResultsOfTurn(weapon, hits, sunk, reveals, info)
  }
  /**
   * Builds message for firing results based on hit/miss/sunk counts.
   * UNIFIED: single point for all result message construction.
   * Routes to appropriate display method based on result composition.
   *
   * @param {Object} weapon - The weapon used
   * @param {number} hits - Number of hits
   * @param {Array<any>} sunks - Array of sunk ship letters
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
   * @param {Array<any>} sunks - Array of sunk ship letters
   * @param {number} [reveals] - Number of reveals (default 0)
   * @param {string} [messageInfo] - Prefix for message (default '')
   * @private
   */
  _displayResult (weapon, hits, sunks, reveals = 0, messageInfo = '') {
    const message = this._buildResultMessage(
      weapon,
      hits,
      sunks,
      reveals,
      messageInfo
    )
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
  // @ts-ignore - unused method may be used by external code
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
  // @ts-ignore - unused method may be used by external code
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
   * @param {Array<any>} sunks - Array of sunk ship letters
   * @param {string} messageInfo - Additional message info
   * @private
   * @deprecated Use _displayResult() instead
   */
  // @ts-ignore - unused method may be used by external code
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
   * @param {Array<any>} sunks - Array of sunk ship letters
   * @param {string} messageInfo - Additional message info
   * @private
   * @deprecated Use _displayResult() instead
   */
  // @ts-ignore - unused method may be used by external code
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
   * @param {number} _dtaps - Double tap count (unused in display)
   * @param {Array<any>|string|null} sunks - Array or string of sunk ship letters
   * @param {number} [reveals] - Number of reveals (default 0)
   * @param {string} [info] - Additional message info (default '')
   * @returns {void}
   * @private
   */
  updateResultsOfTurn (weapon, hits, _dtaps, sunks, reveals = 0, info = '') {
    const messageInfo = info ? info + ' ' : ''
    if (this.boardDestroyed) {
      return
    }

    // Convert string sunk to array for unified handling
    let sunkArray
    if (Array.isArray(sunks)) {
      sunkArray = sunks
    } else if (sunks) {
      sunkArray = [sunks]
    } else {
      sunkArray = []
    }
    this._displayResult(weapon, hits, sunkArray, reveals, messageInfo)
  }

  /**
   * Flashes the board with burst animation.
   * @param {string} [long] - Animation duration
   * @returns {void}
   * @private
   */
  flash (long) {
    Animator.runId('battleship-game', 'flash')
    if (this.UI?.board) {
      Animator.run(this.UI.board, 'burst', long)
    }
  }

  /**
   * Plays flame animation at cell.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {boolean} bomb - Whether it's a bomb animation
   * @returns {void}
   * @private
   */
  flame (r, c, bomb) {
    const cell = this.UI.gridCellAt(r, c)
    if (bomb) {
      Animator.runWithRandomDelay(cell, null, null, 'flames', 'short')
    } else {
      Animator.run(cell, 'flames', 'long')
    }
  }
  /**
   * Checks if a cell was already shot (double tap).
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {number} power - Weapon power
   * @param {boolean} hasFlame - Whether weapon has flame
   * @param {boolean} hasFlash - Whether weapon has flash
   * @returns {boolean} True if double tap
   * @private
   */
  isDTap (r, c, power, hasFlame, hasFlash) {
    if (hasFlame && power > 0) this.flame(r, c, hasFlash)
    const key =
      power > 0 ? this.score.createShotKey(r, c) : this.score.newShotKey(r, c)
    return key === null
  }

  /**
   * Applies weapon effect to area of effect.
   * @param {Array<Array<number>>} effect - Array of [r, c, power] coordinates
   * @param {Object} weapon - The weapon
   * @param {Object} options - Additional options
   * @returns {Object} Accumulated results
   * @private
   */
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
   * @param {Array<Array<number>>} effect - Raw effect payload from a weapon
   * @param {Object} weapon - The weapon generating the effect
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
      (/** @type {any} */ item) => Array.isArray(item) && item.length >= 3
    )
    if (filtered.length !== normalized.length) {
      this.warnInvalidEffect(effect, weapon, options)
    }
    return filtered
  }

  /**
   * Warns when a weapon effect payload is malformed.
   * @param {any} effect - Raw effect payload
   * @param {Object} weapon - The weapon generating the payload
   * @param {Object} options - Additional options
   * @returns {void}
   * @private
   */
  warnInvalidEffect (effect, weapon, options) {
    /* global process */
    if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
      console.warn('Invalid weapon effect payload:', {
        effect,
        weapon: weapon?.name || weapon?.letter,
        options
      })
    }
  }

  /**
   * Applies weapon effect to area of effect with hit accumulation.
   * Normalizes effect payload, flashes animation on hits, accumulates double-tap count.
   *
   * @param {Object} weapon - The weapon being used
   * @param {Array<Array<number>>} effect - Array of [row, col, power] cells affected
   * @param {Object} [options] - Additional firing context and options
   * @returns {Object} Accumulated result with hits, dtaps, reveals, and sunk ships
   * @private
   */
  destroy (weapon, effect, options) {
    if (!weapon || !effect) return LoadOut.noResult
    return this.applyWeaponEffect(weapon, effect, options)
  }

  /**
   * Applies the weapon effect to the area of effect.
   * Processes each affected cell and accumulates results.
   *
   * @param {Object} weapon - The weapon firing
   * @param {Array<Array<number>>} effect - Array of [row, col, power] coordinates
   * @param {Object} [options] - Additional options for firing
   * @returns {Object} Accumulated results object
   * @private
   */
  applyWeaponEffect (weapon, effect, options) {
    const results = this.applyToAoE(effect, weapon, options)
    this.flash(results.hits > 0 ? 'long' : undefined)

    this.score.dtaps += results.dtap || 0
    return results
  }

  /**
   * Applies weapon effect to a single position.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {Object} weapon - The weapon
   * @param {number} power - Weapon power
   * @param {Object} acc - Accumulator object
   * @returns {Object} Updated accumulator
   * @private
   */
  applyToPosition (r, c, weapon, power, acc) {
    if (bh.inBounds(r, c)) {
      const result = this.processShot(weapon, r, c, power)
      this.accumulateResult(result, acc)
    }
    return acc
  }

  /**
   * Processes a single shot.
   * @param {Object} weapon - The weapon firing
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {number} power - Weapon power
   * @returns {Object} Shot result
   * @private
   */
  processShot (weapon, r, c, power) {
    if (!bh.inBounds(r, c)) return LoadOut.noResult
    if (!weapon) return LoadOut.noResult
    if (this.isDTap(r, c, power, true, weapon.hasFlash))
      return LoadOut.doubleTapResult

    const result = this.fireShot(weapon, r, c, power)

    return result
  }
  /**
   * Updates the stats display.
   * @param {Ship[]} [ships] - Ships to display stats for
   * @returns {void}
   * @private
   */
  _updateStats (ships = this.ships) {
    if (!this.UI?.score) return
    this.UI.score.display(ships, ...this.score.counts())
  }

  /**
   * Updates all UI elements.
   * @param {Ship[]} ships - Ships to display
   * @returns {void}
   * @private
   */
  updateUI (ships) {
    this.updateTally(ships, this.loadOut?.getAllLimitedWeaponSystems?.())
  }

  /**
   * Updates the tally display with weapon systems.
   * @param {Ship[]} ships - Ships for stats
   * @param {Array<any>} [weaponSystems] - Weapon systems for tally
   * @returns {void}
   * @private
   */
  updateTally (ships, weaponSystems) {
    ships = ships || this.ships
    this._updateStats(ships)
    if (this.UI?.score) {
      this.UI.score.buildTally(ships, weaponSystems, this.UI)
    }
  }

  /**
   * Hides waiting state (subclass implementation point).
   * @returns {void}
   * @protected
   */
  _hideWaiting () {
    /* only needs implementation if enemy */
  }

  /**
   * Updates the weapon status display.
   * @param {Object} _rack - The weapon rack.
   * @param {Object} _cursorInfo - Cursor information.
   * @returns {void}
   * @protected
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
   * @returns {void}
   * @protected
   */
  deactivateWeapon (_ro, _co, _shadowR, _shadowC) {
    /* only needs implementation if enemy */
  }

  /**
   * Handles cursor changes on the board.
   * @param {string} _oldCursor - The previous cursor class.
   * @param {Object} _newCursorInfo - Information about the new cursor.
   * @returns {void}
   * @protected
   */
  cursorChange (_oldCursor, _newCursorInfo) {
    // only needs implementation if enemy
  }
}

/**
 * Removes and returns the first element from the array that matches the predicate.
 * @param {Array<any>} array - The array to search
 * @param {Function} predicate - Function to test each element
 * @param {Object} [fallbackObject] - Object to log if not found
 * @returns {Object|null} The found element or null
 */
function removeFirstMatching (array, predicate, fallbackObject) {
  if (!array || !Array.isArray(array)) return null
  const idx = array.findIndex((/** @type {any} */ element) =>
    predicate(element)
  )
  if (idx === -1) {
    if (fallbackObject) {
      console.log('not found : ', JSON.stringify(fallbackObject))
    }
    return null
  }
  return array.splice(idx, 1)[0]
}
