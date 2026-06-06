/**
 * Core game logic module for Battleship game.
 *
 * Manages ship placement, weapon systems, targeting, firing mechanics, and battle state.
 * Coordinates interactions between player state, opponent state, and UI presentation.
 * Handles turn-based progression, scoring, and game status updates.
 *
 * Key Responsibilities:
 * - Ship fleet initialization and placement validation
 * - Weapon system loading, selection, and firing
 * - Hit/miss detection and damage resolution
 * - Fleet destruction tracking and game end conditions
 * - Persistent storage of ship placements
 * - Optional turn-based step tracking for game progression
 *
 * @module waters/Waters
 */

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
import { Random } from '../core/Random.js'

/* global process */
import { Score } from './Score.js'
import { gameStatus } from './StatusUI.js'
import { assembleTerrains } from '../terrains/all/js/gameMaps.js'
import { LoadOut } from './LoadOut.js'
import { Ship } from '../ships/Ship.js'
import { WeaponSystem } from '../weapon/WeaponSystem.js'
// @ts-ignore - WeaponSystem typedef locally conflicts with import, handled at runtime
import { Steps } from './steps.js'
import { Animator } from '../core/Animator.js'
import { ShipCellGrid } from '../grid/rectangle/ShipCellGrid.js'

/**
 * A coordinate pair representing a single cell on the game board.
 * Format: [row, col] where row is Y-axis and col is X-axis.
 * Used extensively for targeting, positioning, and layout calculations.
 *
 * @typedef {[number, number]} Coord
 */

/**
 * Area-of-effect damage cell with power/impact rating.
 * Format: [row, col, power] where power represents damage intensity or effect level.
 * Power values typically: 0 (no effect), 1 (secondary), 2 (primary), 3+ (special).
 *
 * @typedef {[number, number, number]} AoeCell
 */
/**
 * @typedef {AoeCell[]} AoePattern
 * Array of area-of-effect cells defining damage pattern for a weapon.
 * Each cell includes position and damage power level.
 */

/**
 * @typedef {Object} WeaponResult
 * @property {number} hits - Number of hits scored
 * @property {number} shots - Number of shots fired (including multi-hit)
 * @property {number} dtap - Number of double-tap events (reshot same cell)
 * @property {number|string} sunk - Number or letter of sunk ships
 * @property {number} reveals - Number of cells revealed
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
 * @property {AoePattern} normalized - [r, c, power] coordinate triples
 * @property {boolean} isValid - Whether effect was properly formatted
 * @property {AoePattern} filtered - Entries with exactly 3+ elements
 */
/**
 * @typedef {Object} GridBoard
 * @property {HTMLElement} board - Main game board DOM element
 * @property {Function} nodeAt - Get cell at coordinates (x, y)
 * @property {Function} node - Get cell at coordinates (x, y)
 * @property {Function} clearClasses - Clear CSS classes from cells
 * @property {Function} surroundCellElement - Get surrounding cell elements
 * @property {Function} displaySurround - Display surround cells
 * @property {Function} markPlaced - Mark ship as placed
 * @property {Function} [surroundCells] - Get surrounding cells
 * @property {Function} [cellMiss] - Mark cell as miss
 * @property {Function} [cellUseAmmo] - Mark ammo usage
 * @property {Function} [cellHintReveal] - Reveal cell via hint
 * @property {Function} [cellSemiReveal] - Semi-reveal cell
 */
/**
 * @typedef {Object} Board
 * @property {HTMLElement} board - Main game board DOM element
 * @property {GridBoard} grid - Grid object for cell management
 * @property {Function} gridCellAt - Get cell at coordinates (r, c)
 * @property {Function} cellHit - Mark cell as hit
 * @property {Function} cellMiss - Mark cell as miss
 * @property {Function} cellUseAmmo - Mark ammo usage
 * @property {Function} cellHintReveal - Reveal cell via hint
 * @property {Function} cellSemiReveal - Semi-reveal cell (partial info)
 * @property {Function} cellSunkAt - Mark cell as sunk with ship letter
 * @property {Function} cellSize - Get cell size in pixels
 * @property {Function} onFleetPlaced - Callback when fleet placed
 * @property {Function} placeTally - Display placement tally
 * @property {Function} displayShipInfo - Display ship information
 * @property {Function} revealShips - Reveal ships visually
 * @property {Function} clearVisuals - Clear visual elements
 * @property {Function} clearPlaceVisuals - Clear placement visuals
 * @property {Function} displayFleetSunk - Display fleet sunk
 * @property {Function} deactivateTempHints - Deactivate temp hints
 * @property {Function} deactivateWeapons - Deactivate weapons
 * @property {HTMLCollection} children - Cell children collection
 * @property {Object} [score] - Score display object
 * @property {Object} [weaponBtns] - Weapon button elements
 * @property {Object} [trayManager] - Tray manager for ships
 * @property {DOMTokenList} classList - CSS class list
 */

/**
 * @typedef {Object} Weapon
 * @property {string} letter - Weapon letter identifier (e.g., 'M', 'R', 'T', '-')
 * @property {string} name - Weapon display name
 * @property {boolean} isLimited - Whether weapon has limited ammo
 * @property {boolean} hasExtraSelectCursor - Whether weapon has extra select step
 * @property {number} numStep - Number of targeting steps (1 or 2)
 * @property {string} classname - CSS class name for styling
 * @property {(stepIndex: number) => string} stepHint - Returns hint text for given step
 * @property {(numCoords: number, stepIdxArg: number) => number} stepIdx - Calculates step index from coordinates and argument
 * @property {number} [postUnattached] - Post-unattached step offset
 * @property {number} [postSelectCoords] - Post-selection coordinates mode
 * @property {boolean} [hasWake] - Whether weapon creates wake effect on miss
 * @property {boolean} [givesHint] - Whether weapon provides targeting hint
 * @property {boolean} [hasFlash] - Whether weapon has flash/explosion animation
 * @property {boolean} [crashOverSplash] - Whether crash splash overrides regular splash
 * @property {Function} [launchTo] - Launch weapon to coordinates
 * @property {Function} [splash] - Get splash effect for hit location
 * @property {Function} [crashSplash] - Get crash splash effect
 * @property {Function} [animateSplashExplode] - Animate explosion effect
 * @property {string} [protectionLevels] - Ship types this weapon protects against
 * @property {boolean} [isLimitedSet] - Whether weapon is in limited set
 */

/**
 * @typedef {Object} WeaponSystemType
 * @property {Weapon} weapon - The weapon object
 * @property {number} id - Weapon system ID
 * @property {number} ammo - Remaining ammunition
 * @property {boolean} [hasAmmo] - Check if weapon has ammo
 * @property {Weapon} [firstLoadedWeapon] - Get loaded weapon variant
 * @property {Weapon[]} [loadedWeapons] - Get all loaded weapons
 * @property {Object} [firstUnattachedWeapon] - First unattached weapon in system
 */

/**
 * @typedef {Object} WeaponRack
 * @property {Weapon} weapon - The weapon object
 * @property {number} id - Rack/weapon ID
 * @property {number} ammo - Ammunition count
 */

/**
 * @typedef {Object} WeaponSystemBase
 * @property {Weapon} weapon - The weapon object
 * @property {number} id - Weapon system ID
 */

/**
 * @typedef {Object} LaunchOptions
 * @property {Coord} [crashLoc] - Crash location coordinates [r, c]
 * @property {boolean} [isSplash] - Whether this is a splash effect
 */

/**
 * @typedef {Object} FireResult
 * @property {number} hits - Number of hits scored
 * @property {number} shots - Number of shots fired
 * @property {string} sunk - Ship letter or count of sunk ships
 * @property {number} dtap - Double-tap count
 * @property {number} reveals - Cells revealed
 * @property {string} info - Info message
 */

/**
 * @typedef {Object} MapType
 * @property {string} title - Map identifier/title
 * @property {Array<Ship>} newFleetForMap - Initial fleet for map
 * @property {Array<Ship>} [extraArmedFleetForMap] - Extra armed ships
 * @property {Array<Weapon>} [weapons] - Weapons available on map
 * @property {Object} [example] - Example ship placement
 * @property {Function} inBounds - Check if coordinates in bounds
 * @property {Function} [landMask] - Land mask for map
 * @property {number} [rows] - Number of rows on map
 * @property {number} [cols] - Number of columns on map
 */

/**
 * @typedef {Object} BattleHandler
 * @property {boolean} [seekingMode] - Whether game is in seeking mode
 * @property {MapType} map - Current map configuration
 */

/**
 * @typedef {Object} HitEntry
 * @property {number} cell - Cell coordinate
 * @property {boolean} damaged - Whether cell was damaged
 */

/**
 * @typedef {Object} ShipHitResult
 * @property {string} letter - Ship letter identifier
 * @property {string} info - Hit information message
 * @property {boolean} damaged - Whether ship cell was damaged
 * @property {Array<HitEntry>} list - List of hit cell entries
 * @property {Array<HitEntry>} misses - List of miss cell entries
 * @property {boolean} sunk - Whether ship was sunk
 * @property {(r: number, c: number) => Object} hitAt - Get hit result at coordinates
 */

/**
 * @typedef {Object} FiringInfo
 * @property {Coord[]} [fireCoordinates] - Target coordinates
 * @property {(target: ?Object) => Promise<FireResult>} [fireWeapon] - Weapon firing function
 * @property {WeaponSystem} [wps] - Weapon system being fired
 * @property {Weapon} [weapon] - Weapon being fired
 * @property {boolean} [hasUnattached] - Whether unattached weapon is involved
 */

/**
 * @typedef {Object} WatersUI
 * @property {(r: number, c: number, damaged?: boolean) => void} cellMiss - Mark cell as miss
 * @property {(shipLetter: string, info: string) => void} cellSunkAt - Mark cell as sunk
 * @property {(r: number, c: number) => void} cellHit - Mark cell as hit
 * @property {(r: number, c: number) => HTMLElement} gridCellAt - Get cell element
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
  /** @type {Ship[]} */
  ships
  /** @type {Score} */
  score
  /** @type {Waters|null} */
  opponent
  /** @type {import('./WatersUI.js').WatersUI} */
  UI
  /** @type {ShipCellGrid} */
  shipCellGrid
  /** @type {boolean} */
  boardDestroyed
  /** @type {Steps|undefined} */
  steps
  /** @type {LoadOut|undefined} */
  loadOut
  /** @type {string} */
  preamble1
  /** @type {string} */
  preamble0
  /** @type {string} */
  preamble
  /** @type {Function} */
  displayInfo
  /** @type {Object|null} */
  lastClick
  /** @type {Set<string>} */
  previousSources
  /** @type {Array<{placedCells: any[], ship: Ship}>} */
  tempPlacement
  /** @type {Array<Ship>} */
  weaponShips
  /** @type {boolean} */
  hasAttachedWeapons
  /** @type {boolean} */
  isRevealed
  /** @type {string|null} */
  _oldWeaponLetter

  /**
   * Initializes the Waters game instance with UI and basic setup.
   *
   * Initializes core game state including ship management, scoring, UI rendering,
   * and optional turn-based step tracking. Sets up default message preambles for
   * UI display and game event logging.
   *
   * @param {import('./WatersUI.js').WatersUI} ui - The user interface instance for rendering board and interactions
   * @param {string|null} [playerType] - Type of player (e.g., 'AI', 'Human', null for local)
   */
  constructor (ui, playerType = null) {
    assembleTerrains()
    /** @type {Ship[]} */
    this.ships = []
    this.score = new Score()
    /** @type {Waters|null} */
    this.opponent = null
    /** @type {import('./WatersUI.js').WatersUI} */
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
    /** @type {string|null} */
    this._oldWeaponLetter = null
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
   * Gets the current placed ships data for serialization.
   * CONSOLIDATED: unified data collection for persistence and export.
   *
   * @returns {ShipPlacement} Current ship placement data
   */
  getPlacedShipsData () {
    return {
      ships: this.ships,
      shipCellGrid: this.shipCellGrid.grid,
      // @ts-ignore - bh.map is initialized at runtime with title property
      map: bh.map?.title || ''
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
      (/** @type {any} */ ship, /** @type {any[]} */ placedCells) => {
        this.storeShipPlacement(placedCells, ship)
      }
    )
    if (result) {
      // @ts-ignore - UI is Board-compatible at runtime, provides grid and cell management
      const board = /** @type {Board} */ (this.UI)
      // @ts-ignore - grid is GridBoard at runtime
      const grid = /** @type {GridBoard} */ (board.grid)
      for (const { placedCells, ship } of this.tempPlacement) {
        onShipPlaced?.(ship, placedCells)
        grid.markPlaced?.(placedCells, ship)
      }
      board.onFleetPlaced?.()
    } else {
      this.handlePlacementFailure(onPlacementReset)
    }
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
    // @ts-ignore - UI is Board at runtime
    const board = /** @type {Board} */ (this.UI)
    board.placeTally?.(this.ships)
    board.displayShipInfo?.(this.ships)
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
    if (result?.dtap) accumulator.dtap += result.dtap
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
      /*     console.log(
        `Auto placement ${this.steps?.player || 'Unknown'} attempt ${
          attempt + 1
        }: ${placementSuccessful}`
      )
        */
      if (placementSuccessful) {
        console.log(
          `Successful placement ${this.steps?.player || 'Unknown'} attempt ${
            attempt + 1
          }`
        )
        this.UI.removeDisplayClasses()
        return true
      }
    }

    const map = bh.map
    // @ts-ignore - landMask property available at runtime on map
    const landMask = map?.landMask
    // @ts-ignore - undefined check allows early return safely
    if (!landMask) return false
    console.log(/** @type {any} */ (landMask).toAscii)
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
      // @ts-ignore - bh.map is initialized at runtime
      this.setMap(bh.map ?? undefined)
    }
    return this.ships
  }

  /**
   * Displays all ships on the board in their current placed positions.
   * Reveals ship cells for visual representation without modifying ship state.
   * @returns {void}
   * @protected
   */
  resetShipCells () {
    if (this.ships && this.UI) {
      // @ts-ignore - UI is Board at runtime
      const board = /** @type {Board} */ (this.UI)
      board.revealShips?.(this.ships)
    }
  }

  /**
   * Loads ships for edit mode from map example or auto-places.
   * @param {Object} [map] - The map to load from
   * @returns {void}
   */
  loadForEdit (map) {
    // @ts-ignore - bh.map is initialized at runtime
    map = map || bh.map
    if (!map) return
    this.resetShipCells()
    this.ensureShipsInitialized()

    // @ts-ignore - map is MapType at runtime
    const mapTyped = /** @type {MapType} */ (map)
    if (!mapTyped.example) {
      this.autoPlace()
      return
    }

    const placedShips = this.validatePlacedShips(
      /** @type {Ship[]} */ (mapTyped.example),
      map
    )
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
      // @ts-ignore - method signature compatible at runtime
      this.loadOut.onDestroy = this.destroy.bind(this)
      // @ts-ignore - method signature compatible at runtime
      this.loadOut.onDestroyOneOfMany = this.destroyOne.bind(this)
    }
  }

  /**
   * Returns the active view model for the current opponent or local UI.
   * Determines which UI instance should be used for operations based on opponent state.
   *
   * @param {Waters|null|undefined} [oppo] - Optional opponent instance to check for UI
   * @returns {Board} UI view model instance (opponent's UI or this player's UI)
   * @private
   */
  getViewModel (oppo) {
    // @ts-ignore - UI property available at runtime, returns Board at runtime
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
   * @param {number} launchY - Launch row coordinate (weapon origin)
   * @param {number} launchX - Launch column coordinate (weapon origin)
   * @param {HTMLElement|null} cell - Candidate cell element for marker placement
   * @returns {void}
   * @private
   */
  addSelectionSource (viewModel, launchX, launchY, cell) {
    if (!this.steps) return
    // @ts-ignore - viewModel is Board at runtime, cast for steps.addSource
    const board = /** @type {Board} */ (viewModel)
    this.steps.addSource(
      board,
      launchX,
      launchY,
      // @ts-ignore - gridCellAt method available at runtime
      cell || board.grid.nodeAt?.(launchX, launchY)
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
    return new Set(this.loadOut.loadedWeapons.map(w => w.id))
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
    const [launchX, launchY, weaponId] = result
    // @ts-ignore - viewModel is Board at runtime
    const board = /** @type {Board} */ (viewModel)
    this.addSelectionSource(board, launchX, launchY, null)

    if (this.loadOut) {
      // @ts-ignore - weaponId is number from parseTriple
      const ship = this.loadOut.getShipByWeaponId(weaponId)
      if (ship && this.steps) {
        // @ts-ignore - Ship type compatibility; LoadOut.Ship vs steps.Ship differ on Weapon property
        this.steps.addShip(ship)
        const [sourceR, sourceC] = this.generateSourceHint(ship, this.opponent)
        this.createShadowSource(sourceR, sourceC)
      }
    }

    return this.createWeaponSelection(launchX, launchY, weaponId, hintR, hintC)
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
   * @param {Board} viewModel - UI view model instance
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
    // @ts-ignore - viewModel is Board at runtime
    const board = /** @type {Board} */ (viewModel)
    return this.processSelectedWeaponKey(selectedKey, board, hintR, hintC)
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
   * @param {number} hintY - Hint row coordinate
   * @param {number} hintX - Hint column coordinate
   * @param {boolean} random - Whether to select randomly
   * @param {Object} viewModel - UI view model
   * @param {HTMLElement|null} cell - Candidate cell element
   * @returns {WeaponSelection} Weapon selection payload
   * @private
   */
  selectWeaponFromShip (ship, hintY, hintX, random, viewModel, cell) {
    // @ts-ignore - loadedWeaponEntries getter available at runtime
    const entries = ship.loadedWeaponEntries
    const [key, weapon] = random
      ? randomElement(entries)
      : findClosestCoord(entries, hintY, hintX, (/** @type {any[]} */ [k]) =>
          parsePair(k)
        )

    const [launchX, launchY] = parsePair(key)
    // @ts-ignore - gridCellAt method available at runtime
    const selectedCell = cell || viewModel.grid.nodeAt(launchY, launchX)
    if (this.steps) {
      // @ts-ignore - viewModel is Board at runtime
      this.steps.addSource(viewModel, launchX, launchY, selectedCell)
    }

    return this.createWeaponSelection(launchY, launchX, weapon.id, hintY, hintX)
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

    // @ts-ignore - retrievePlacedShips returns ShipPlacement|null at runtime
    placedShips = this.retrievePlacedShips(map, placedShips)
    if (!placedShips) {
      this.autoPlace()
      return
    }

    this.#updateGlobalIds(placedShips)
    const unmatchedShips = this.placeMatchingShips(
      placedShips,
      this.placeMatchingShip.bind(this)
    )
    if (unmatchedShips.length === 0) {
      // @ts-ignore - trayManager available on Board at runtime
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
   * Resets the map state and loads new map configuration.
   * Preserved for potential future use or API compatibility.
   * @param {Object|undefined} [map] - The map to set (defaults to bh.map).
   * @returns {void}
   * @protected
   */
  resetMap (map) {
    this.boardDestroyed = false
    this.isRevealed = false
    // @ts-ignore - bh.map is initialized at runtime
    const mapToSet = map || bh.map
    if (mapToSet) {
      this.setMap(mapToSet)
    }
  }
  /**
   * Updates global ship and weapon ID counters from loaded ships.
   * Ensures new ships and weapons get higher IDs than loaded ones to prevent collisions.
   * Prevents ID reuse between persisted ships and newly created ones.
   *
   * @param {ShipPlacement|null} placedShips - The placed ships data with ship array
   * @returns {void}
   */
  #updateGlobalIds (placedShips) {
    if (!placedShips?.ships) return
    const { maxShipId, maxWeaponId } = this.#getMaxIdsFromShips(
      placedShips.ships
    )
    // @ts-ignore - Static property assignment for ID management on Ship class
    Ship.id = maxShipId + 1
    // @ts-ignore - Static property assignment for ID management on WeaponSystem class
    WeaponSystem.id = maxWeaponId + 1
  }

  /**
   * Calculates the maximum ship and weapon IDs from placed ships.
   * Iterates through all ships and their weapons to find highest ID values for ID management.
   *
   * @param {Ship[]} ships - Array of ships to inspect
   * @returns {{maxShipId: number, maxWeaponId: number}} Object with max ship ID and max weapon ID
   */
  #getMaxIdsFromShips (ships) {
    return ships.reduce(
      (accumulator, ship) => {
        accumulator.maxShipId = Math.max(ship.id || 1, accumulator.maxShipId)
        // @ts-ignore - weapons property and structure available at runtime
        if (ship.weapons && typeof ship.weapons === 'object') {
          // @ts-ignore - Object.values returns Rack[], but reduce returns number
          accumulator.maxWeaponId = /** @type {number} */ (
            Object.values(ship.weapons).reduce(
              (weaponMax, /** @type {any} */ weapon) => {
                // @ts-ignore - weaponId extracted but used only in Math.max return value
                const _weaponId =
                  (typeof weapon === 'object' && weapon?.id ? weapon.id : 1) ||
                  1
                return Math.max(/** @type {number} */ _weaponId, weaponMax)
              },
              accumulator.maxWeaponId
            )
          )
        }
        return accumulator
      },
      { maxShipId: 1, maxWeaponId: 1 }
    )
  }

  /**
   * Arms weapons for all ships on the map.
   * @param {Object} [map] - The map to arm weapons for
   * @returns {void}
   */
  /**
   * Arms weapons for all ships on the map.
   * @param {Object|undefined} [map] - The map to arm weapons for
   * @returns {void}
   */
  armWeapons (map) {
    // @ts-ignore - bh.map available at runtime
    const activeMap = map || bh.map
    if (!activeMap) return
    const weaponShips = this.#determineWeaponShips()

    this.#configureLoadOut(activeMap, weaponShips)
    this.#setCursorChangeCallback()
    this.setupAttachedAim()
  }

  /**
   * Determines which ships should have weapons based on map configuration.
   * @returns {Array<any>} Array of ships with weapons
   */
  #determineWeaponShips () {
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
   */
  #configureLoadOut (map, weaponShips) {
    const shipsForLoadOut = this.#resolveLoadOutShips(map, weaponShips)
    // @ts-ignore - loadOut is assigned at runtime
    this.loadOut = this.createLoadOut(map, shipsForLoadOut)
  }

  /**
   * Resolves the ship list to be used for load out creation.
   * @param {Object} _map - The map (unused)
   * @param {Array<any>} weaponShips - Default weapon ships.
   * @returns {Array<any>} Ships to include in the load out.
   */
  #resolveLoadOutShips (_map, weaponShips) {
    // @ts-ignore - seekingMode is available at runtime on bh object
    if (bh?.seekingMode && this.hasAttachedWeapons) {
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
   */
  #setCursorChangeCallback () {
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
    // @ts-ignore - map is MapType at runtime
    const mapTyped = /** @type {MapType} */ (map)
    const weapons = bh.terrain?.hasUnattachedWeapons
      ? mapTyped?.weapons || []
      : (mapTyped?.weapons || []).filter(
          (/** @type {any} */ weapon) => !weapon.isLimited
        )
    // @ts-ignore - UI type is Board at runtime
    const loadOut = new LoadOut(weapons, ships, this.UI, this.steps)

    // For terrains without unattached weapons, also create weapon systems
    // from limited weapons for display purposes (weapon tally boxes)
    if (!bh.terrain?.hasUnattachedWeapons && mapTyped?.weapons) {
      // @ts-ignore - map.weapons is available at runtime
      const limitedWeapons = mapTyped.weapons.filter(
        (/** @type {any} */ weapon) => weapon.isLimited
      )
      for (const limitedWeapon of limitedWeapons) {
        // Check if this weapon system doesn't already exist
        const exists = loadOut.allWeaponSystems.some(
          (/** @type {any} */ wps) => wps.weapon.letter === limitedWeapon.letter
        )
        if (!exists) {
          // Create a weapon system for display purposes
          // @ts-ignore - limitedWeapon is Weapon-like at runtime, createWeaponSystems handles it
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
   * Informs the player that a weapon was automatically selected and provides guidance on how
   * to select a different weapon. Handles missing ship gracefully.
   *
   * @param {string} weaponName - Name of the weapon being auto-selected
   * @param {Object|null|undefined} currentShip - The ship with the weapon (may be null or undefined)
   * @returns {void}
   * @private
   */
  displayAutoSelectWarning (weaponName, currentShip) {
    // @ts-ignore - shape() method available at runtime, safely handle null ship
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
      // @ts-ignore - Ship type compatibility; LoadOut.Ship vs steps.Ship differ on Weapon property
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
   * @param {Waters|null} opponent - The opponent instance
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
   * @param {Waters|null} opponent - The opponent instance
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
      // @ts-ignore - opponent.UI is Board at runtime
      const opponentBoard = /** @type {Board} */ (opponent.UI)
      this.steps.addHint(opponentBoard, r, c, opponentBoard.gridCellAt?.(r, c))
    }
    return [r, c]
  }

  /**
   * Gets surrounding cells for a ship relative to opponent.
   * Returns an empty array when the opponent is missing.
   * @param {Object} ship - The ship
   * @param {Waters|null} opponent - The opponent instance
   * @returns {string[]} Array of surrounding cell keys
   * @private
   */
  getSurroundingCells (ship, opponent) {
    if (!opponent || !ship) return []
    // @ts-ignore - ship.cells is available at runtime
    const cells = ship.cells
    if (!cells) return []
    // @ts-ignore - opponent.UI is Board at runtime
    const opponentBoard = /** @type {GridBoard} */ (opponent.UI?.grid)
    const surrounding = [...(opponentBoard?.surroundCells?.(cells) || [])]
    return surrounding
  }

  /**
   * Creates a shadow source at the given coordinates.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {HTMLElement|null} The shadow cell or null
   * @private
   */
  createShadowSource (r, c) {
    const opponent = this.opponent
    if (opponent?.UI) {
      // @ts-ignore - opponent.UI is Board at runtime

      const board = /** @type {Board} */ (opponent.UI)
      const grid = /** @type {GridBoard} */ (board?.grid)
      const opponentCell = grid?.nodeAt?.(r, c)
      if (this.steps) {
        this.steps.addShadow(board, r, c, opponentCell || null)
      }
      return opponentCell || null
    } else {
      // @ts-ignore - this.UI is Board at runtime
      const board = /** @type {GridBoard} */ (this.UI?.grid)
      return board.nodeAt?.(r, c) || null
    }
  }

  /**
   * Sets the board targeting state.
   * @param {boolean} isTargeting - Whether the board is in targeting mode.
   */
  setBoardTargetingState (isTargeting) {
    // @ts-ignore - this.UI.grid is GridBoard at runtime
    const board = /** @type {GridBoard} */ (this.UI?.grid)
    const boardClasses = board.board?.classList
    if (!boardClasses) return
    // @ts-ignore - seekingMode is available at runtime on bh object
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
   * @param {number} launchY - Launch row coordinate
   * @param {number} launchX - Launch column coordinate
   * @param {number} hintY - Hint row coordinate
   * @param {number} hintX - Hint column coordinate
   * @param {HTMLElement|null} [cell] - Optional cell element
   * @returns {void}
   */
  selectAndArmWps (oppo, weaponId, launchY, launchX, hintY, hintX, cell = null) {
    // @ts-ignore - loadOut available at runtime
    const rack = this.loadOut?.getWeaponBySystemId(weaponId)
    // @ts-ignore - rack structure known at runtime with weapon property
    const weapon = /** @type {Weapon|undefined} */ (rack?.weapon)
    const letter = weapon?.letter

    this.giveTempHint(weapon, cell, oppo)
    // @ts-expect-error - rack type is compatible at runtime despite TypeScript mismatch
    this.addSource(oppo, launchX, launchY, rack, cell)
    // Construct proper params object for addRack with all required properties
    const addRackParams = {
      // @ts-ignore - rack is Rack type at runtime
      rack: /** @type {any} */ (rack),
      weapon,
      wletter: letter,
      weaponId,
      r: launchY,
      c: launchX,
      cell,
      hintY,
      hintX
    }
    // @ts-ignore - addRack method available at runtime
    const rackInfo = this.steps?.addRack?.(addRackParams) || {
      shadowR: 0,
      shadowC: 0
    }
    const { shadowR, shadowC } = rackInfo

    if (letter && this.loadOut) {
      this.loadOut.switchToWeapon(letter)

      if (weapon?.postSelectCoords === 0) {
        this.loadOut.clearSelectedCoordinates()
      } else {
        this.loadOut.addSelectedCoordinates(shadowR, shadowC, weapon)
      }
      // @ts-ignore - updateMode expects Weapon or undefined at runtime
      this.updateMode(rack, undefined)
      this.steps?.targetting(this.hasAttachedWeapons)
      // @ts-expect-error - launch accepts WeaponRack at runtime
      this.loadOut.launch = async coords => {
        // @ts-ignore - rack is WeaponSystemType compatible at runtime
        return await this.launchTo(
          coords,
          hintY,
          hintX,
          /** @type {any} */ (rack)
        )
      }
      // @ts-ignore - selectedWeapon accepts weapon system at runtime
      this.loadOut.selectedWeapon = rack
    }
  }

  /**
   * Displays a temporary hint if the weapon gives one.
   * @param {Weapon|undefined} weapon - The weapon with hint capability
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
   * @param {number} launchY - Launch row coordinate
   * @param {number} launchX - Launch column coordinate
   * @param {WeaponRack|undefined} rack - Weapon rack object
   * @param {HTMLElement|null} cell - Cell element
   * @returns {void}
   * @private
   */
  addSource (oppo, launchX, launchY, rack, cell) {
    // @ts-ignore - steps available at runtime
    if (this.steps.source === null) {
      // @ts-ignore - UI available at runtime
      const viewModel = oppo?.UI || this.UI
      // @ts-ignore - steps available at runtime
      this.steps.addSource(viewModel, launchX, launchY, cell)
      console.warn(
        'no source found when selecting and arming weapon, adding source with launch coords'
      )
    }
    // @ts-ignore - steps and terrain available at runtime
    if (!bh.terrain?.hasUnattachedWeapons && !this.steps?.sourceShip) {
      console.warn(
        'Terrain does not have unattached weapons, but a weapon is without a source ship'
      )
      // @ts-ignore - loadOut available at runtime
      const ship = this.loadOut?.getShipByWeaponId(rack?.id)
      // @ts-ignore - Ship type compatibility; LoadOut.Ship vs steps.Ship differ on Weapon property
      if (ship && this.steps) {
        // @ts-ignore - Ship type compatibility; primaryWeapon type differs
        this.steps.addShip(ship)
      }
    }
  }

  /**
   * Prepares a weapon selection by adding the weapon to the UI and updating targeting state.
   * @param {WeaponSelection} selection - The weapon selection object
   * @param {Waters|null} oppo - The opponent instance
   * @returns {void}
   */
  #armSelectedWeapon (selection, oppo) {
    // @ts-ignore - UI available at runtime on oppo or this
    const cell = oppo?.UI?.grid?.node(selection.hintC, selection.hintR)
    this.#selectAndArmWeaponId(
      selection.weaponId || -1,
      oppo,
      selection.launchR || 0,
      selection.launchC || 0,
      selection.hintR || 0,
      selection.hintC || 0,
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
  // @ts-ignore - method intentionally unused
  selectAttachedWeapon (cell, r, c, oppo) {
    const selection = this.selectWeaponId(cell, r, c, false, null, oppo)
    this.#armSelectedWeapon(selection, oppo)
  }

  /**
   * Selects a random attached weapon and arms it for firing.
   * @param {Waters|null} oppo - Opponent instance
   * @returns {void}
   * @protected
   */
  randomAttachedWeapon (oppo) {
    const selection = this.selectRandomWeapon()
    this.#armSelectedWeapon(selection, oppo)
  }

  /**
   * Selects and arms a weapon by ID with coordinate targeting.
   * @param {number} weaponId - Weapon system ID
   * @param {Waters|null} oppo - Opponent instance
   * @param {number} launchY - Launch row coordinate
   * @param {number} launchX - Launch column coordinate
   * @param {number} hintY - Hint row coordinate
   * @param {number} hintX - Hint column coordinate
   * @param {HTMLElement|null} [cell] - Cell element
   * @returns {void}
   */
  #selectAndArmWeaponId (weaponId, oppo, launchY, launchX, hintY, hintX, cell) {
    if (!weaponId || weaponId < 1) {
      return
    }

    this.selectAndArmWps(oppo, weaponId, launchY, launchX, hintY, hintX, cell)
  }

  /**
   * Launches randomly selected weapon at the target coordinates.
   * If an unattached weapon fires, returns that result.
   * Otherwise, attempts to select a targeted attached weapon system.
   *
   * @param {number} y - Target row coordinate
   * @param {number} x - Target column coordinate
   * @param {boolean} [autoSelectWarning] - Whether to display an auto-select warning
   * @returns {Promise<WeaponResult|null>} Result with weapon or null if selection
   * @protected
   */
  // @ts-ignore - seekingMode is available at runtime on bh object
  async launchRandomWeapon (x, y, autoSelectWarning = !bh?.seekingMode) {
    // @ts-ignore - launchUnattachedWeapon returns WeaponResult or null at runtime
    const result = await this.launchUnattachedWeapon(x, y)

    // If unattached weapon fired successfully, return result
    if (result && typeof result === 'object' && 'score' in result) {
      return result
    }

    // Otherwise attempt to select targeted weapon
    if (result == null) {
      this.prepareTargetedRandomWeaponSelection(autoSelectWarning)
    }

    return null
  }

  /**
   * Attempts to select an attached random weapon system when no unattached weapon fired.
   * @param {boolean} [autoSelectWarning] - Whether to display an auto-select warning
   * @returns {boolean} True if a weapon was selected
   */
  // @ts-ignore - seekingMode is available at runtime on bh object
  prepareTargetedRandomWeaponSelection (autoSelectWarning = !bh?.seekingMode) {
    const current = this.loadOut?.currentWeaponSystem
    if (!current) {
      return false
    }
    // @ts-ignore - hasAmmo method available at runtime
    const attached = current?.hasAmmo != null
    if (attached) {
      return this.#hasTargettedRandomWeaponForWps(autoSelectWarning)
    }
    return false
  }

  /**
   * Creates a default weapon selection when no valid selection is possible.
   * @param {number} hintR - Hint row coordinate
   * @param {number} hintC - Hint column coordinate
   * @returns {WeaponSelection} Default weapon selection
   */
  #createDefaultWeaponSelection (hintR, hintC) {
    // @ts-ignore - this.UI is Board at runtime
    const board = /** @type {Board} */ (this.UI)
    this.addSelectionSource(board, 0, 0, board.grid?.node?.(0, 0))
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
   * @param {Object|null|undefined} [ship] - Specific ship to select from (overrides cell)
   * @param {Waters|null|undefined} [oppo] - Opponent instance
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
      return this.#createDefaultWeaponSelection(hintR, hintC)
    }

    const keys = keyListFromCell(cell, 'keyIds')
    if (!keys) {
      return this.#createDefaultWeaponSelection(hintR, hintC)
    }

    return this.selectWeaponFromCell(keys, hintR, hintC, random, viewModel)
  }

  /**
   * Attempts to select and arm a targeted random weapon for the specified weapon system.
   * Auto-selects from armed ships when a weapon system is ready.
   * @param {boolean} [autoSelectWarning] - Whether to display selection warning
   * @returns {boolean} True if weapon was successfully selected and armed
   */
  // @ts-ignore - seekingMode is available at runtime on bh object
  #hasTargettedRandomWeaponForWps (autoSelectWarning = !bh?.seekingMode) {
    this.randomAttachedWeapon(this.opponent)
    // @ts-ignore - selectedWeapon is available at runtime on loadOut
    const currentWeapon = this.loadOut?.selectedWeapon

    if (!currentWeapon) return false
    // @ts-ignore - currentWeapon structure known at runtime
    const currentShip = this.loadOut?.getShipByWeaponId(currentWeapon.id)
    // @ts-ignore - weapon property available at runtime
    const weaponName = currentWeapon.weapon?.name || 'weapon'
    if (autoSelectWarning) {
      this.displayAutoSelectWarning(weaponName, currentShip)
    }

    if (this.loadOut) {
      // @ts-ignore - launch signature compatible at runtime with 3 parameters
      this.loadOut.launch = (coords, _weapon, wps) => {
        return this.launchWeapon(wps, coords)
      }
    }
    return true
  }
  /**
   * Gets the currently selected or active weapon system.
   * Falls back to currentWeaponSystem if selectedWeapon is not available.
   *
   * @returns {WeaponSystemType|undefined} Current weapon system or undefined
   */
  get currentWeaponSystem () {
    // @ts-ignore - selectedWeapon available at runtime
    return this.loadOut?.selectedWeapon || this.loadOut?.currentWeaponSystem
  }

  /**
   * Gets the weapon object from the current weapon system.
   * Returns undefined if no weapon system is currently selected.
   *
   * @returns {Weapon|undefined} Current weapon or undefined
   */
  get currentWeapon () {
    const wps = this.currentWeaponSystem
    // @ts-ignore - weapon property available at runtime
    return wps?.weapon
  }

  /**
   * Fires a weapon at specified coordinates.
   * Delegates to loadOut.aimWeapon for the actual firing logic.
   *
   * @param {number} y - Target row coordinate
   * @param {number} x - Target column coordinate
   * @param {WeaponSystemType|undefined} [weaponSystem] - Weapon system to fire (defaults to loadOut.selectedWeapon)
   * @param {Function|undefined} [launch] - Launch function (defaults to loadOut.launch)
   * @returns {Promise<WeaponResult|null>} Fire result or null if no weapon system
   * @protected
   */
  async fireWeaponAt (
    x,
    y,
    weaponSystem = /** @type {any} */ (
      this.loadOut?.selectedWeapon || undefined
    ),
    launch = this.loadOut?.launch
  ) {
    // @ts-ignore - loadOut available at runtime, cast weapon system
    // @ts-ignore - bh.map is initialized at runtime
    return await /** @type {WeaponResult|null} */ (
      this.loadOut?.aimWeapon(
        // @ts-ignore - bh.map is initialized at runtime, can be null
        bh.map == null ? undefined : bh.map,
        y,
        x,
        weaponSystem,
        launch
      )
    )
  }
  /**
   * Launches the selected armed weapon at target coordinates.
   *
   * @param {number} y - Target row coordinate
   * @param {number} x   - Target column coordinate
   * @returns {Promise<Object|null>} Fire result or null
   * @protected
   */
  // @ts-ignore - unused but may be called externally
  async launchSelectedWeapon (x, y) {
    if (this.loadOut?.isArmed) {
      return await this.fireWeaponAt(
        x,
        y,
        /** @type {any} */ (this.loadOut.selectedWeapon || undefined)
      )
    }
    return null
  }

  /**
   * Fires unattached weapon system at target coordinates.
   * @param {number} y - Target row coordinate
   * @param {number} x   - Target column coordinate
   * @returns {Promise<WeaponResult|null>} Fire result or null
   * @private
   */
  async launchUnattachedWeapon (x, y) {
    const unAttached = this.firstUnattachedWeaponSystem
    if (unAttached) {
      // @ts-ignore - bh.map is initialized at runtime
      const launch = async (/** @type {number[]} */ coords) => {
        // @ts-ignore - bh.map available at runtime, rows guaranteed to be number
        const maxRows = /** @type {number} */ (bh.map?.rows ?? 0)
        return await this.launchTo(
          coords,
          Math.max(0, maxRows - 1),
          0,
          unAttached
        )
      }
      const result = await this.fireWeaponAt(x, y, unAttached, launch)
      return result
    }
    return null
  }

  /**
   * Gets the unattached weapon system.
   * Returns first loaded weapon if in seeking mode or no opponent, otherwise returns first unattached system.
   *
   * @returns {WeaponSystemType|null} Unattached weapon system or null if unavailable
   * @protected
   */
  get firstUnattachedWeaponSystem () {
    // @ts-ignore - seekingMode is available at runtime on bh object
    if (this.opponent == null || bh?.seekingMode) {
      // @ts-ignore - loadOut available at runtime, currentWeaponSystem is WeaponSystemType
      const weaponSystem = this.loadOut?.currentWeaponSystem
      // @ts-ignore - firstLoadedWeapon getter available at runtime, returns WeaponSystemType
      return weaponSystem?.firstLoadedWeapon || null
    } else {
      // @ts-ignore - loadOut available at runtime, firstUnattachedWeaponSystem is WeaponSystemType
      return this.loadOut?.firstUnattachedWeaponSystem || null
    }
  }

  /**
   * Launches weapon system to given coordinate destination.
   * Routes weapon firing through the appropriate board UI with opponent targeting support.
   * Handles dual-board animation and weapon effect resolution.
   *
   * @param {Array<number>|Object} coords - Target coordinate as array [r,c] or object {r,c}
   * @param {number} y - Reference row position for launch fallback (usually source row)
   * @param {number} x   - Reference column position for launch fallback (usually source column)
   * @param {WeaponSystemType|WeaponRack} currentWps - Current weapon system with weapon and ID reference
   * @returns {Promise<WeaponResult|null>} Weapon launch result with hit/miss information
   */
  async launchTo (coords, y, x, currentWps) {
    // @ts-ignore - opponent.UI is Board at runtime, cast via unknown for type safety
    const opponentBoard = this.opponent?.UI
      ? /** @type {Board} */ (/** @type {unknown} */ (this.opponent.UI))
      : null
    // @ts-ignore - currentWps.weapon available at runtime, Board type for UI
    const weapon = /** @type {Weapon|undefined} */ (currentWps?.weapon)
    // @ts-ignore - bh.map is initialized at runtime

    // Ensure weapon and method exist before calling
    if (!weapon?.launchTo) {
      return null
    }

    return (
      (await weapon.launchTo(
        coords,
        y,
        x,
        bh.map,
        /** @type {Board} */ (/** @type {unknown} */ (this.UI)),
        opponentBoard,
        this
      )) || null
    )
  }
  /**
   * Launches weapon system to coordinate from stored source hint.
   * Uses the source hint coordinates stored in steps for the launch reference.
   *
   * @param {WeaponSystemType|WeaponRack} wps - Weapon system to launch
   * @param {Array<number>|Object} coords - Target coordinate destination
   * @returns {Promise<WeaponResult|null>} Weapon launch result
   * @private
   */
  async launchWeapon (wps, coords) {
    // @ts-ignore - this.steps available at runtime, default to origin if no hint
    const { y, x } = this.steps?.sourceHint || { y: 0, x: 0 }
    // @ts-ignore - wps is WeaponSystemType at runtime
    return await this.launchTo(coords, y, x, wps)
  }

  /**
   * Sets up aim listeners for attached weapons on opponent ships.
   * Configures click handlers on cells surrounding opponent armed ships
   * to allow player to target weapon effects. Automatically removes old listeners
   * and adds new ones for current armed ships configuration.
   *
   * @returns {void}
   */
  setupAttachedAim () {
    const oppo = this.opponent
    // @ts-ignore - seekingMode is dynamically added to bh at runtime
    const isSeekingMode = bh?.seekingMode
    if (
      isSeekingMode ||
      !this.loadOut?.ships ||
      !oppo ||
      this.loadOut.ships.length === 0 ||
      // @ts-ignore - onClickOppoCell method available at runtime
      !this.onClickOppoCell
    )
      return

    this.#removeAttachedAimListeners(oppo)
    this.#addAttachedAimListeners(oppo)
  }

  /**
   * Removes all previously attached aim listeners from opponent cells.
   * @param {Waters|null} oppo - The opponent instance.
   * @returns {void}
   */
  #removeAttachedAimListeners (oppo) {
    if (!oppo || !this.loadOut?.ships) return
    const armedShips = this.loadOut.ships
    for (const ship of armedShips) {
      // @ts-ignore - shipCells method available at runtime
      const cells = oppo.shipCells(ship.id)
      // @ts-ignore - UI is Board at runtime, grid is GridBoard
      const surround = oppo.UI.grid.surroundCellElement(cells)
      for (const cell of surround) {
        // Guard against undefined cells (outside board boundaries)
        if (!cell) continue
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
   * @param {Waters|null} oppo - The opponent instance.
   * @returns {void}
   */
  #addAttachedAimListeners (oppo) {
    if (!oppo || !this.loadOut?.ships) return
    const armedShips = this.loadOut.ships
    const cellsToListen = new Set()

    // Collect all unique surrounding cells across all armed ships
    for (const ship of armedShips) {
      // @ts-ignore - shipCells method available at runtime
      const cells = oppo.shipCells(ship.id)
      // @ts-ignore - UI is Board at runtime, grid is GridBoard
      const surround = oppo.UI.grid.surroundCellElement(cells)
      for (const cell of surround) {
        // Guard against undefined cells (outside board boundaries)
        if (cell) {
          cellsToListen.add(cell)
        }
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
   * Sets the current map and initializes fleet.
   * @param {Object} [map] - The map to set (defaults to bh.map)
   * @returns {void}
   */
  setMap (map) {
    // @ts-ignore - map is MapType at runtime
    const mapTyped = /** @type {MapType} */ (map || bh.map)
    if (!mapTyped) return
    if (!this.ships || this.ships.length === 0) {
      // Debug: log map and fleet composition to diagnose missing attached weapons
      try {
        console.debug('Waters.setMap: setting map', mapTyped?.title)
        const newFleet = mapTyped.newFleetForMap || []
        console.debug(
          'Waters.setMap: map.newFleetForMap letters',
          newFleet.map((/** @type {any} */ s) => s.letter)
        )
        const extra = mapTyped.extraArmedFleetForMap || []
        console.debug(
          'Waters.setMap: map.extraArmedFleetForMap letters',
          extra.map((/** @type {any} */ s) => s.letter)
        )
      } catch (e) {
        console.debug('Waters.setMap: debug failed', e)
      }

      this.ships = mapTyped.newFleetForMap || []
      this.armWeapons(mapTyped)
    }
    for (const ship of this.ships) {
      ship.reset()
    }
  }
  /**
   * Handles hint reveal for opponent.
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @returns {void}
   */
  handleHint (y, x) {
    this.opponent?.score?.hintReveal?.(x, y)
  }
  /**
   * Gets a random target from hit candidates.
   * DEPRECATED: Method is not currently used in codebase. Kept for API compatibility.
   *
   * @param {Array<Array<number>>} effect - The effect area
   * @param {Weapon|Object} weapon - The weapon being used
   * @returns {Array<number>|null} Random hit candidate or null
   * @deprecated Not used in current codebase
   */
  getTarget (effect, weapon) {
    const candidates = this.#getHitCandidates(effect, weapon)
    // @ts-ignore - randomElement may return undefined, cast to null
    return randomElement(candidates) || null
  }

  /**
   * Gets all hit candidates for a weapon effect.
   * Filters effect coordinates for those that could hit a ship.
   * Applies weapon protection rules and adds wake effects to misses if applicable.
   *
   * @param {Array<Array<number>>} effect - The effect area coordinates as [r, c, power] entries
   * @param {Weapon|Object} weapon - The weapon being used (determines wake and protection vs ship types)
   * @returns {Array<Array<number>>} Array of hit candidates [r, c, power] that can damage ships
   */
  #getHitCandidates (effect, weapon) {
    /** @type {Array<Array<number>>} */
    const candidates = []
    // @ts-ignore - bh.map is initialized at runtime
    const map = bh.map
    // @ts-ignore - bh.maps is initialized at runtime
    const maps = bh.maps
    if (!map || !maps) return candidates
    // @ts-ignore - effect is coordinate array at runtime, safe to iterate [y, x, power]
    for (const [y, x, power] of effect) {
      // @ts-ignore - map is MapType at runtime with all required properties
      if (this.#shouldAddCandidate(x, y, power, weapon, map, maps)) {
        candidates.push([y, x, power])
      }
    }
    return candidates
  }

  /**
   * Determines if a cell should be added as a hit candidate.
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @param {number} power - Weapon power
   * @param {Weapon|Object} weapon - The weapon being checked
   * @param {MapType} map - The map object
   * @param {Object} maps - The maps object with shapes
   * @returns {boolean} True if cell should be added as candidate
   */
  #shouldAddCandidate (x, y, power, weapon, map, maps) {
    // @ts-ignore - map is MapType at runtime
    if (!map?.isInBoundsAt) return false
    // @ts-ignore - isInBoundsAt method available at runtime on MapType
    if (!map.isInBoundsAt?.(x, y) || !this.score.isNewShot(x, y)) {
      return false
    }

    // Add wake effect
    // @ts-ignore - this.UI is Board at runtime
    const board = /** @type {Board} */ (this.UI)
    const cell = board.grid?.nodeAt(x, y)
    if (cell) {
      this.#addWake(cell, x, y, weapon)
    }

    // Check if free space (not occupied by ship)
    if (!this.#isFreeAt(x, y)) {
      return false
    }

    // Check protection
    const shipCell = this.#shipCellAt(x, y)
    // @ts-ignore - shapesByLetter available at runtime
    const shape = maps?.shapesByLetter?.[shipCell?.letter]
    // @ts-ignore - weapon is Weapon at runtime with letter property
    const protection = shape?.protectionAgainst?.(weapon?.letter)

    if (
      protection &&
      (power >= protection || (power === 1 && protection === 2))
    ) {
      return true
    }
    return false
  }
  /**
   * Adds wake visual to cell if applicable.
   * @param {HTMLElement} cell - The cell to add wake to
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @param {Weapon|Object} weapon - The weapon being used
   * @returns {void}
   */
  #addWake (cell, x, y, weapon) {
    // @ts-ignore - weapon is Weapon at runtime with hasWake property
    if (!weapon?.hasWake) return
    if (
      !cell.classList?.contains('frd-hit') &&
      !cell.classList?.contains('miss') &&
      !cell.classList?.contains('hit')
    ) {
      cell.classList?.add('wake')
      this.score.wakeReveal(x, y)
    }
  }
  /**
   * Checks if there are no hit candidates.
   * @param {Array<Array<number>>} hitCandidates - The hit candidates [r, c, power][].
   * @returns {boolean} True if no candidates.
   */
  hasNoHitCandidates (hitCandidates) {
    return hitCandidates.length < 1
  }

  /**
   * Handles the case when there are no hit candidates.
   * @param {Weapon|Object} weapon - The weapon
   * @param {AoePattern} effect - The effect
   * @param {LaunchOptions} [options] - Additional options
   * @returns {WeaponResult} The destruction result
   * @private
   */
  handleNoHits (weapon, effect, options = {}) {
    // @ts-ignore - options may have crashLoc at runtime
    if (!options?.crashLoc) {
      // No crash location: simple destruction with splash
      const splashEffect = this.selectSplashEffect(
        weapon,
        [0, 0],
        effect,
        options
      )
      // @ts-ignore - destroy expects [r,c,power][] array, cast at runtime
      return this.destroy(weapon, splashEffect, options)
    }

    // With crash location: use crash splash effect
    // @ts-ignore - options.crashLoc available at runtime
    const crashSplashEffect = this.getCrashSplash(
      weapon,
      options.crashLoc,
      effect,
      options
    )
    // @ts-ignore - destroy expects [r,c,power][] array, cast at runtime
    const firstResult = this.destroy(weapon, effect, options)
    // @ts-ignore - add isSplash property at runtime
    options.isSplash = true
    // @ts-ignore - accumulate result properly
    const splashResult = this.destroy(weapon, crashSplashEffect, options)
    this.accumulateResult(splashResult, firstResult)
    return firstResult
  }

  /**
   * Handles the case when there are hit candidates.
   * @param {Weapon|Object} weapon - The weapon
   * @param {AoePattern} effect - The effect
   * @param {Coord} target - The target
   * @param { Coord[]} hitCandidates - The hit candidates
   * @param {LaunchOptions} options - Additional options
   * @returns {WeaponResult} The destruction result
   * @private
   */
  handleHits (weapon, effect, target, hitCandidates, options) {
    const resolvedTarget = this.resolveTarget(target, hitCandidates)
    const splashEffect = this.selectSplashEffect(
      weapon,
      resolvedTarget,
      effect,
      options
    )
    // @ts-ignore - destroy method expects [r,c,power][] array, cast at runtime
    return this.destroy(weapon, splashEffect, options)
  }

  /**
   * Chooses the correct splash effect based on weapon state.
   * Determines whether to use crash splash or strike splash based on weapon configuration.
   *
   * @param {Weapon|Object} weapon - The weapon with splash configuration
   * @param {Coord} resolvedTarget - Resolved hit target [r, c]
   * @param {AoePattern} effect - The original effect array
   * @param {LaunchOptions} [options] - Additional options (may include crashLoc)
   * @returns {AoePattern} The splash effect as [r, c, power] array
   * @private
   */
  selectSplashEffect (weapon, resolvedTarget, effect, options = {}) {
    if (this.shouldUseCrashSplash(weapon, resolvedTarget, options)) {
      // @ts-ignore - weapon.crashOverSplash available at runtime
      // @ts-ignore - options.crashLoc available at runtime
      return this.getCrashSplash(weapon, options.crashLoc, effect, options)
    }
    // @ts-ignore - weapon.splash available at runtime
    return this.getStrikeSplash(weapon, resolvedTarget, effect, options)
  }
  /**
   * Initializes the steps event handlers.
   */
  initializeSteps () {
    // @ts-ignore - this.steps available at runtime
    if (this.steps) {
      this.steps.onEndTurn = this.handleEndTurn.bind(this)
      this.steps.onHint = this.handleHint.bind(this)
    }
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
   */
  async handleEndTurn () {
    if (this.cannotPassTurn) {
      return
    }
    // @ts-ignore - UI is Board at runtime
    const board = /** @type {Board} */ (this.UI)
    board.deactivateWeapons?.()
    // @ts-ignore - opponent.UI is Board at runtime
    const opponentBoard = this.opponent?.UI
      ? /** @type {Board} */ (/** @type {unknown} */ (this.opponent.UI))
      : null
    opponentBoard?.deactivateWeapons?.()
    // @ts-ignore - opponent may have _handleBeginTurn at runtime
    await this.opponent?._handleBeginTurn?.()
  }
  /**
   * Resolves the target from hit candidates.
   * @param {Coord|null} target - The provided target.
   * @param {Coord[]} hitCandidates - The candidates.
   * @returns {Coord} The resolved target.
   */
  resolveTarget (target, hitCandidates) {
    if (!target || target.length < 2) {
      // @ts-ignore - Random.element returns undefined for empty array, handled at runtime
      return Random.element(hitCandidates) || []
    }
    return target
  }
  /**
   * Destroys one target with the given weapon and effect.
   * @param {Weapon|Object} weapon - The weapon used
   * @param {AoePattern} effect - The effect coordinates
   * @param {Coord[]|null} [target] - Optional target coordinates
   * @param {LaunchOptions} [options] - Additional options for destruction
   * @returns {WeaponResult} The result of the destruction
   */
  destroyOne (weapon, effect, target = null, options = {}) {
    // @ts-ignore - weapon cast at runtime
    const hitCandidates = this.#getHitCandidates(effect, weapon)
    if (this.hasNoHitCandidates(hitCandidates)) {
      return this.handleNoHits(weapon, effect, options)
    }
    // @ts-ignore - hitCandidates assured to be non-null at runtime
    return this.handleHits(weapon, effect, target, hitCandidates, options)
  }

  /**
   * Checks if crash splash should be used.
   * @private
   * @param {Weapon|Object} weapon - The weapon
   * @param {Coord} resolvedTarget - The resolved target
   * @param {LaunchOptions} [options] - Additional firing options
   * @returns {boolean} True if crash splash
   */
  shouldUseCrashSplash (weapon, resolvedTarget, options = {}) {
    // @ts-ignore - weapon.crashOverSplash available at runtime
    if (!weapon?.crashOverSplash) return false
    // @ts-ignore - options.crashLoc available at runtime
    if (!options?.crashLoc) return false
    return (
      resolvedTarget[0] === options.crashLoc[0] &&
      resolvedTarget[1] === options.crashLoc[1]
    )
  }

  /**
   * Gets the strike splash effect.
   * @param {Weapon|Object} weapon - The weapon
   * @param {Coord} targetCoords - Target coordinates [r, c]
   * @param {AoePattern} effect - The original effect
   * @param {Object} [options] - Additional options
   * @returns {AoePattern} The splash effect
   * @private
   */
  getStrikeSplash (weapon, targetCoords, effect, options = {}) {
    this.animateStrikeSplash(targetCoords, weapon)
    // @ts-ignore - weapon.splash available at runtime
    // @ts-ignore - bh.map is initialized at runtime
    return weapon.splash(bh.map, targetCoords, effect, options)
  }

  /**
   * Animates the strike splash effect.
   * @param {Coord} targetCoords - Target coordinates [r, c]
   * @param {Weapon|Object} weapon - The weapon
   * @returns {Promise<void>}
   * @private
   */
  async animateStrikeSplash (targetCoords, weapon) {
    // @ts-ignore - this.UI is Board at runtime
    const board = /** @type {Board} */ (this.UI)
    const cellSize = board.cellSize?.()
    const targetCell = board.grid.nodeAt?.(targetCoords[1], targetCoords[0])
    // @ts-ignore - weapon.animateSplashExplode available at runtime
    if (cellSize && targetCell && weapon?.animateSplashExplode) {
      // @ts-ignore - animateSplashExplode available at runtime on Weapon objects
      await weapon.animateSplashExplode(targetCell, cellSize)
    }
  }

  /**
   * Gets the crash splash effect.
   * @param {Weapon|Object} weapon - The weapon
   * @param {Coord} targetCoords - Target coordinates [r, c]
   * @param {AoePattern} effect - The original effect
   * @param {Object} [options] - Additional options
   * @returns {AoePattern} The crash splash effect
   * @private
   */
  getCrashSplash (weapon, targetCoords, effect, options = {}) {
    this.animateStrikeSplash(targetCoords, weapon)
    // @ts-ignore - weapon.crashSplash available at runtime
    // @ts-ignore - bh.map is initialized at runtime
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
    return this.cellList().filter(
      (/** @type {any} */ c) => Number.parseInt(c?.dataset?.ammo || '0') > 0
    )
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
      (/** @type {any} */ c) =>
        Number.parseInt(c?.dataset?.ammo || '0') > 0 &&
        c?.dataset?.wletter === letter
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
    return [...(this.cellsOnBoard() || [])]
  }

  /**
   * Gets direct children elements of board (cell references).
   * Returns the HTMLCollection of board's immediate children.
   *
   * @returns {HTMLCollection} Live collection of board cell children
   */
  cellsOnBoard () {
    // @ts-ignore - this.UI is Board at runtime
    const board = /** @type {Board} */ (this.UI)
    return board.board?.children || []
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
    const cells = this.cellsOnBoard() || []
    for (const cell of cells) {
      // @ts-ignore - dataset property available on Element
      const cellId = cell?.dataset?.id ? Number.parseInt(cell.dataset.id) : null
      if (cellId === id) {
        // @ts-ignore - Element from HTMLCollection, cast to HTMLElement
        list.push(cell)
      }
    }
    return list
  }

  /**
   * Records an auto-miss at the given coordinates.
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @returns {void}
   * @private
   */
  recordAutoMiss (y, x) {
    const key = this.score.addAutoMiss(x, y)
    if (!key) return // already shot here
    // @ts-ignore - this.UI is Board at runtime
    const board = /** @type {GridBoard} */ (this.UI.grid)
    board.cellMiss?.(x, y)
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
    this.hideWaiting()
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
   * Checks if a cell is free (no ship occupies it).
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {boolean} True if the cell is empty, false if occupied by a ship
   */
  #isFreeAt (x, y) {
    return this.shipCellGrid.isEmpty(x, y)
  }

  /**
   * Checks if there is a ship at the given coordinates.
   * Public API for checking ship occupancy at a position.
   *
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {boolean} True if the cell is occupied by a ship, false otherwise
   */
  isShipAt (x, y) {
    return Boolean(this.shipCellGrid.isOccupied(x, y))
  }

  /**
   * Gets the ship cell object at the given coordinates.
   * Returns the ship cell object containing letter and ID information.
   *
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {Object|null|undefined} Ship cell object or undefined if no ship present
   */
  #shipCellAt (x, y) {
    return this.shipCellGrid.cellAt(x, y)
  }

  /**
   * Marks a ship as sunk and updates UI.
   * @param {Ship} ship - The sunk ship
   * @returns {void}
   * @private
   */
  markSunk (ship) {
    if (!ship) return
    // @ts-ignore - ship.cells property available at runtime
    const shipCells = ship.cells
    if (!shipCells) return
    // @ts-ignore - this.UI is Board at runtime
    const board = /** @type {Board} */ (this.UI)
    const grid = /** @type {GridBoard} */ (board?.grid)
    grid.displaySurround?.(
      shipCells,
      ship.letter,
      (/** @type {number} */ x, /** @type {number} */ y) =>
        this.recordAutoMiss(x, y),
      (
        /** @type {number} */ x,
        /** @type {number} */ y,
        /** @type {string} */ letter
      ) => board.cellSunkAt?.(x, y, letter)
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
   * Marks a cell as hit and updates UI display.
   * Records the hit in scoring system and displays visual feedback on the board.
   *
   * @param {number} x - Column coordinate of hit
   * @param {number} y - Row coordinate of hit
   * @param {boolean} damaged - Whether the cell was damaged (hit or miss)
   * @returns {void}
   * @private
   */
  markHit (x, y, damaged) {
    this.score.reveal.clear(x, y)
    // @ts-ignore - cellHit expects damaged as boolean string or value at runtime
    this.UI?.cellHit?.(x, y, damaged)
  }

  /**
   * Gets the ship associated with a ship cell.
   * Looks up the ship by ID from the ship cell to find the parent ship object.
   *
   * @param {Object|null|undefined} shipCell - The ship cell with id property
   * @returns {Ship|undefined} The ship or undefined if not found
   */
  #getShipFromCell (shipCell) {
    if (!shipCell) return undefined
    // @ts-ignore - shipCell.id available at runtime, ships array of Ship objects
    return this.ships.find((/** @type {any} */ s) => s.id === shipCell.id)
  }
  /**
   * Gets description text for a sunk ship.
   * Customizes message based on whether this is an opponent ship.
   *
   * @param {Object|null|undefined} ship - The sunk ship (may be null)
   * @returns {string} Description text (e.g., "Your Destroyer was sunk!")
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
    // @ts-ignore - bh.shipSunkText expects 2 args but handles 1 at runtime
    const desc = bh.shipSunkText?.(letter, true)
    return desc ?? ''
  }

  /**
   * Displays a sunk ship warning.
   * Shows a message about a destroyed ship to the player.
   *
   * @param {Ship|null|undefined} ship - The sunk ship (may be null)
   * @param {string} [info=''] - Additional info to prepend to sunk message
   * @returns {void}
   * @internal External API method for display purposes
   * @deprecated Currently unused, kept for potential external API compatibility
   */
  sunkWarning (ship, info = '') {
    if (!info) {
      info = ''
    }
    this.displayInfo(info + this.sunkDescription(ship))
  }

  /**
   * Checks whether a weapon fire results in a hit.
   * Determines hit/miss and applies protection rules based on weapon power and ship type.
   *
   * @param {Weapon} weapon - The weapon being fired with letter and protection properties
   * @param {number} x - Target column coordinate
   * @param {number} y - Target row coordinate
   * @param {number} power - Weapon power level for damage calculation
   * @param {Object|null|undefined} shipCell - The ship cell at target with letter property
   * @returns {WeaponResult} Hit result with hits, shots, sunk, info properties
   * @private
   */
  checkForHit (weapon, x, y, power, shipCell) {
    if (!shipCell) {
      return LoadOut.noResult
    }

    const hitShip = this.#getShipFromCell(shipCell)

    if (!hitShip) {
      // @ts-ignore - cellMiss method available at runtime on UI.grid
      this.UI.grid?.cellMiss?.(x, y)
      return LoadOut.missResult
    }

    // @ts-ignore - shapesByLetter available at runtime
    const shape = bh?.shapesByLetter?.(shipCell.letter)
    // @ts-ignore - protectionAgainst available at runtime on shape
    const protection = shape?.protectionAgainst?.(weapon.letter) || 0
    if (power === 1 && protection === 2 && hitShip) {
      this.score.shotReveal(x, y)
      // @ts-ignore - cellSemiReveal returns WeaponResult at runtime
      return this.UI?.cellSemiReveal?.(x, y) || LoadOut.noResult
    }

    if (protection > power) {
      return LoadOut.noResult
    }
    let shots = 0
    if (power < 1) {
      this.score.shot.set(x, y)
      shots = 1
    }

    return this.showHit(x, y, hitShip, shots)
  }

  /**
   * Shows and processes a hit on a ship.
   * Resolves hit results, updates ship state, and generates result object.
   *
   * @param {number} x - Hit column coordinate
   * @param {number} y - Hit row coordinate
   * @param {Ship} hitShip - The ship that was hit
   * @param {number} initialShots - Initial shot count (usually 0 or 1)
   * @returns {WeaponResult} Result with hits, shots, reveals, sunk, info
   */
  showHit (x, y, hitShip, initialShots) {
    // @ts-ignore - hitShip.hitAt available at runtime on Ship, returns ship hit result object
    const hitResult = hitShip.hitAt(this, x, y)

    // Extract and normalize properties from hit result
    // @ts-ignore - properties available at runtime, may be string values
    const letter = hitResult?.letter || ''
    // @ts-ignore - damaged can be string or boolean at runtime
    const damaged = Boolean(hitResult?.damaged)
    // @ts-ignore - info can be string or null at runtime
    const info = hitResult?.info || ''
    // @ts-ignore - hit/miss entries available at runtime, cast to proper type
    const hitEntries = hitResult?.list || []
    const missEntries = hitResult?.misses || []

    this.markHit(x, y, damaged)
    this.score.shotRevealFinalize(x, y)
    let totalHits = 1
    let totalShots = initialShots

    totalHits = this.#applyHitEntries(
      /** @type {any} */ (hitEntries),
      totalHits
    )
    totalShots += hitEntries.length
    totalShots = this.#applyMissEntries(
      /** @type {any} */ (missEntries),
      totalShots
    )

    // @ts-ignore - hitShip.sunk available at runtime on Ship
    if (hitShip.sunk) {
      this.markSunk(hitShip)
    }
    return {
      hits: totalHits,
      shots: totalShots,
      reveals: 0,
      sunk: letter,
      dtap: 0,
      info
    }
  }

  /**
   * Applies hit entries to score and display.
   * Updates scoring for each hit and marks cells as hit on the board.
   *
   * @param {Array<{cell: [number, number], damaged: boolean}>} hitEntries - Hit entry objects
   * @param {number} totalHits - Running total of hits
   * @returns {number} Updated hit total
   */
  #applyHitEntries (hitEntries, totalHits) {
    for (const entry of hitEntries) {
      // @ts-ignore - cell property available at runtime, cast to tuple
      const cell = /** @type {[number, number]} */ (entry.cell)
      const [y, x] = cell
      // @ts-ignore - damaged property available at runtime
      const damaged = entry.damaged
      this.score.shotRevealFinalize(x, y)
      this.score.shot.set(x, y)
      totalHits++
      this.markHit(x, y, damaged)
    }
    return totalHits
  }

  /**
   * Applies miss entries to score and display.
   * Updates scoring for each miss and marks cells as missed on the board.
   *
   * @param {Array<{cell: [number, number], damaged: boolean}>} missEntries - Miss entry objects
   * @param {number} totalShots - Running total of shots
   * @returns {number} Updated shot total
   */
  #applyMissEntries (missEntries, totalShots) {
    for (const entry of missEntries) {
      // @ts-ignore - cell property available at runtime, cast to tuple
      const cell = /** @type {[number, number]} */ (entry.cell)
      const [y, x] = cell
      // @ts-ignore - damaged property available at runtime
      const damaged = entry.damaged
      this.score.shot.set(x, y)
      totalShots++
      // @ts-ignore - cellMiss method available at runtime on UI.grid
      this.UI?.grid?.cellMiss?.(x, y, damaged)
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
      this.hideWaiting?.()
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
   * @proteced
   */
  updateMode (wps1, cursorInfo) {
    if (this.isEnded) {
      return
    }
    this.#updateWeaponButtons()
    this.updateWeaponStatus(wps1 || this.loadOut?.selectedWeapon, cursorInfo)
  }

  /**
   * Updates visibility of weapon buttons.
   * Shows/hides weapon buttons based on available ammunition.
   *
   * @returns {void}
   */
  #updateWeaponButtons () {
    // @ts-ignore - weaponBtns is defined at runtime on UI
    const btns = this.UI?.weaponBtns
    if (!btns) return

    for (const btn of btns) {
      // @ts-ignore - dataset property available at runtime on button elements
      const letter = btn.dataset?.letter
      // @ts-ignore - hasAmmoForWeaponLetter available at runtime on loadOut
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
   * and marks hits/misses on the board based on power penetration.
   *
   * @param {Weapon} weapon - The weapon firing (with letter property for protection matching)
   * @param {number} y - Target row coordinate
   * @param {number} x - Target column coordinate
   * @param {number} power - Weapon power level (determines penetration of protection)
   * @returns {WeaponResult} Result object with hits, shots, and sunk ship info
   */
  #fireShot (weapon, x, y, power) {
    if (this.#isFreeAt(x, y)) {
      if (power > 0) {
        this.UI.grid.cellMiss(x, y)
        return LoadOut.missResult
      }
      return LoadOut.noResult
    }
    // @ts-ignore - shipCell might be undefined at runtime, checked in checkForHit
    const shipCell = this.#shipCellAt(x, y)
    return this.checkForHit(weapon, x, y, power, shipCell)
  }

  /**
   * Gets description text for hit count.
   * @param {number} hits - Number of hits
   * @returns {string} Description text
   */
  #hitDescription (hits) {
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
   */
  #revealDescription (reveals) {
    if (this.opponent) {
      return this.preamble + 'revealed (x' + reveals.toString() + ')'
    }
    if (reveals === 1) {
      return 'Reveal'
    }
    return reveals.toString() + ' revealed'
  }

  /**
   * Updates result display for bomb/splash damage.
   * Updates bombing weapon result counters.
   * @param {Weapon} weapon - Bomb weapon being tracked
   * @param {WeaponResult} result - The result to update counters from
   * @returns {void}
   */
  updateResultsOfBomb (weapon, result) {
    if (!result) return
    const { hits, sunk, reveals, info } = result
    // @ts-ignore - sunk type compatibility; sunk is string|number but _dtaps parameter expects number
    this.#updateResultsOfTurn(weapon, hits, 0, sunk, reveals, info)
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
   */
  #buildResultMessage (weapon, hits, sunks, reveals = 0, messageInfo = '') {
    // No hits - report miss
    if (hits === 0) {
      return messageInfo + this.#buildMissMessage(weapon, reveals)
    }

    // Hits but no sunk ships
    if (sunks.length === 0) {
      let message = this.#hitDescription(hits)
      if (reveals > 0) {
        message += ` and ${this.#revealDescription(reveals)}`
      }
      return messageInfo + message
    }

    // Hits with sunk ships - single or multiple
    let message = this.#hitDescription(hits) + ','
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
   * @param {Weapon|Object} weapon - The weapon that missed (may not have all properties)
   * @param {number} [reveals] - Number of reveals
   * @returns {string|null} Miss message or null if no message needed
   */
  #buildMissMessage (weapon, reveals = 0) {
    if (reveals > 0) {
      return this.#revealDescription(reveals)
    }

    if (this.opponent) {
      const preamble1 = this.opponent.preamble1
      // @ts-ignore - weapon.letter available at runtime on Weapon objects
      if (weapon?.letter === '-') {
        // @ts-ignore - weapon.name available at runtime on Weapon objects
        return `${preamble1}${weapon.name} missed`
      }
      // @ts-ignore - weapon.name available at runtime on Weapon objects
      return `${preamble1}${weapon?.name} missed ${this.preamble0} ships`
    }

    // @ts-ignore - weapon.letter available at runtime on Weapon objects
    if (weapon?.letter === '-') {
      return null
    }

    // @ts-ignore - weapon.name available at runtime on Weapon objects
    return `The ${weapon?.name} missed everything!`
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
   */
  #displayResult (weapon, hits, sunks, reveals = 0, messageInfo = '') {
    const message = this.#buildResultMessage(
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
   */
  #updateResultsOfTurn (weapon, hits, _dtaps, sunks, reveals = 0, info = '') {
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
    this.#displayResult(weapon, hits, sunkArray, reveals, messageInfo)
  }

  /**
   * Flashes the board with burst animation.
   * @param {string} [long] - Animation duration
   * @returns {void}
   */
  #flash (long) {
    Animator.runId('battleship-game', 'flash')
    if (this.UI?.board) {
      // @ts-ignore - long may be undefined; Animator.run accepts optional duration
      Animator.run(this.UI.board, 'burst', long || undefined)
    }
  }

  /**
   * Plays flame animation at cell.
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @param {boolean} bomb - Whether it's a bomb animation
   * @returns {void}
   */
  #flame (x, y, bomb) {
    const cell = this.UI.grid.nodeAt(x, y)
    if (!cell) return
    if (bomb) {
      Animator.runWithRandomDelay(cell, undefined, undefined, 'flames', 'short')
    } else {
      Animator.run(cell, 'flames', 'long')
    }
  }
  /**
   * Checks if a cell was already shot (double tap).
   * Optionally plays flame animation for weapons with flame effects.
   * Records shot in score tracking.
   *
   * @param {number} y - Row coordinate of shot
   * @param {number} x - Column coordinate of shot
   * @param {number} power - Weapon power level
   * @param {boolean} hasFlame - Whether weapon has flame animation
   * @param {boolean} hasFlash - Whether weapon has flash effect
   * @returns {boolean} True if this cell was already shot (double tap), false otherwise
   * @protected
   */
  isDTap (x, y, power, hasFlame, hasFlash) {
    if (hasFlame && power > 0) {
      this.#flame(x, y, hasFlash)
    }
    const isOld = this.score.isOldShot(x, y)

    if (isOld) {
      return true
    }
    if (power > 0) {
      this.score.shot.set(x, y)
    }

    return false
  }

  /**
   * Applies weapon effect to area of effect.
   * Iterates through each coordinate in the effect and applies the weapon.
   *
   * @param { [number, number, number][] } effect - Array of [r, c, power] coordinates
   * @param {Weapon} weapon - The weapon being applied
   * @param {Object} options - Additional options (may include isSplash flag)
   * @returns {WeaponResult} Accumulated results object
   */
  #applyToAoE (effect, weapon, options) {
    // @ts-ignore - effect is [number, number, number][] at runtime after normalization
    const normalizedEffect = /** @type {[number, number, number][]} */ (
      this.#normalizeEffect(effect, weapon, options)
    )
    // @ts-ignore - LoadOut.noResult is WeaponResult-compatible at runtime
    let acc = /** @type {WeaponResult} */ (LoadOut.noResult)

    for (const [r, c, power] of normalizedEffect) {
      acc = this.#applyToPosition(r, c, weapon, power, acc)
    }
    return acc
  }

  /**
   * Normalizes an effect into a safely iterable shape array.
   * Validates that the effect is iterable and contains [r, c, power] triples.
   * Logs warning if malformed entries are detected.
   *
   * @param { [number, number, number][] | Iterable<number>} effect - Raw effect payload from a weapon (array of [r, c, power] entries)
   * @param {Weapon} weapon - The weapon generating the effect
   * @param {Object} options - Additional options and context
   * @returns { [number, number, number][] } Normalized effect payload as [r, c, power] array
   */
  #normalizeEffect (effect, weapon, options) {
    if (effect == null) {
      this.#warnInvalidEffect(effect, weapon, options)
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
      this.#warnInvalidEffect(effect, weapon, options)
      return []
    }

    const filtered = normalized.filter(
      (/** @type {any} */ item) => Array.isArray(item) && item.length >= 3
    )
    if (filtered.length !== normalized.length) {
      this.#warnInvalidEffect(effect, weapon, options)
    }
    // @ts-ignore - filtered contains items that passed Array check with length >= 3
    return /** @type {[number, number, number][]} */ (filtered)
  }

  /**
   * Warns when a weapon effect payload is malformed.
   * Only logs warnings when not in test environment to keep test output clean.
   *
   * @param {any} effect - Raw effect payload (may be null, invalid type, or malformed array)
   * @param {Weapon} weapon - The weapon generating the payload
   * @param {Object} options - Additional options and context
   * @returns {void}
   */
  #warnInvalidEffect (effect, weapon, options) {
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
   * Delegates to applyWeaponEffect for actual effect application.
   *
   * @param {Weapon} weapon - The weapon being used (contains splash/crash methods)
   * @param {[number, number, number][]} effect - Array of [row, col, power] cells affected by weapon
   * @param {Object} [options] - Additional firing context and options (may include crashLoc)
   * @returns {WeaponResult} Accumulated result with hits, dtaps, reveals, and sunk ships
   * @protected
   */
  destroy (weapon, effect, options) {
    if (!weapon || !effect) return LoadOut.noResult
    return this.applyWeaponEffect(weapon, effect, options)
  }

  /**
   * Applies the weapon effect to the area of effect.
   * Processes each affected cell and accumulates results from hits/misses.
   *
   * @param {Weapon} weapon - The weapon firing
   * @param {Array<Array<number>>} effect - Array of [row, col, power] coordinates
   * @param {Object} [options] - Additional options for firing
   * @returns {WeaponResult} Accumulated results object
   * @protected
   */
  applyWeaponEffect (weapon, effect, options = {}) {
    // @ts-ignore - effect is [number, number, number][] at runtime; array passed from weapon system
    const results = this.#applyToAoE(
      /** @type {[number, number, number][]} */ (effect),
      weapon,
      options
    )
    this.#flash(results.hits > 0 ? 'long' : undefined)

    this.score.dtaps += results.dtap || 0
    return results
  }

  /**
   * Applies weapon effect to a single position on the board.
   * Processes the shot if coordinates are within bounds, then accumulates results.
   *
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {Weapon} weapon - The weapon firing
   * @param {number} power - Weapon power level
   * @param {WeaponResult} acc - Accumulator object to update
   * @returns {WeaponResult} Updated accumulator
   */
  #applyToPosition (r, c, weapon, power, acc) {
    if (bh.inBounds(r, c)) {
      const result = this.#processShot(weapon, r, c, power)
      this.accumulateResult(result, acc)
    }
    return acc
  }

  /**
   * Processes a single shot at the given coordinates.
   * Checks for double-tap, then fires the shot and returns the result.
   *
   * @param {Weapon} weapon - The weapon firing (contains letter and animation properties)
   * @param {number} y - Row coordinate of the shot
   * @param {number} x - Column coordinate of the shot
   * @param {number} power - Weapon power level for penetration calculation
   * @returns {WeaponResult} Shot result with hits, shots fired, and sunk info
   */
  #processShot (weapon, y, x, power) {
    if (!bh.inBounds(y, x)) return LoadOut.noResult
    if (!weapon) return LoadOut.noResult
    // @ts-ignore - weapon.hasFlash may be undefined; isDTap handles falsy gracefully
    if (this.isDTap(x, y, power, true, weapon.hasFlash || false))
      return LoadOut.doubleTapResult

    const result = this.#fireShot(weapon, x, y, power)

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
    // @ts-ignore - counts() returns tuple type; spread requires array type conversion
    const display = this.UI.score.display
    // @ts-ignore - apply spreads array to rest parameters correctly at runtime
    display.apply(this.UI.score, [ships, ...this.score.counts()])
  }

  /**
   * Updates all UI elements.
   * @param {Ship[]} ships - Ships to display
   * @returns {void}
   * @internal External API method for UI updates
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
      // @ts-ignore - weaponSystems may be undefined; buildTally handles it gracefully
      this.UI.score.buildTally(ships, weaponSystems || [], this.UI)
    }
  }

  /**
   * Hides waiting state (subclass implementation point).
   * @returns {void}
   * @protected
   */
  stopSpinner () {
    /* only needs implementation if enemy */
  }

  /**
   * Hides waiting state (subclass implementation point).
   * @returns {void}
   */
  hideWaiting () {
    this.stopSpinner?.()
    // @ts-ignore - opponent type compatibility and hideWaiting method
    const opponent = /** @type {any} */ (this.opponent)
    opponent?.stopSpinner?.()
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
