import { bh } from '../terrains/all/js/bh.js'
import { WeaponSystem, AttachedWeaponSystems } from '../weapon/WeaponSystem.js'

/**
 * @typedef {Object} Weapon
 * @property {string} [id] - Weapon identifier
 * @property {string} letter - Weapon identifier letter
 * @property {string} name - Weapon display name
 * @property {boolean} isLimited - Whether the weapon has limited ammo
 * @property {boolean} hasExtraSelectCursor - Whether the weapon uses an extra select cursor
 * @property {number} numStep - Number of targeting steps (1 or 2)
 * @property {number} [postUnattached] - Post-unattached step offset
 * @property {string} classname - CSS class name for weapon icon styling
 * @property {(stepIndex: number) => string} stepHint - Returns hint text for given step
 * @property {(numCoords: number, stepIdxArg: number) => number} stepIdx - Calculates step index from coordinates and argument
 * @property {string} [tag] - Weapon tag used for styling and selection UI
 * @property {string[]} [cursors] - Cursor types for selection
 * @property {string} [launchCursor] - Cursor class for launch state
 * @property {number} [points] - Number of points required for firing
 * @property {boolean} [destroys] - Whether the weapon destroys targets
 * @property {boolean} [isOneAndDone] - Whether the weapon is single-use
 * @property {number} [unattachedCursor] - Cursor value for unattached weapons
 * @property {number} [postSelectCursor] - Cursor value after selection
 * @property {number} [postSelectCoords] - Number of coordinates after post-selection
 * @property {boolean} [postSelectShadow] - Whether the weapon displays a post-select shadow
 * @property {(map: Object, coords: number[][]) => Object} [aoePlus] - Computes affected area
 * @property {(cell: HTMLElement, size: number, unused1: ?Object, unused2: ?Object) => Promise<Object>} [animateExplodeRaw] - Explosion animation
 */

/**
 * @typedef {Object} Ship
 * @property {string} id - Ship identifier
 * @property {boolean} hasAmmoRemaining - Checks if ship has ammo
 * @property {Weapon} primaryWeapon - Gets the primary weapon
 * @property {(systemId: string) => Weapon} getWeaponBySystemId - Gets weapon by system ID
 * @property {Weapon[]} allWeapons - Gets all weapons on ship
 * @property {Weapon[]} loadedWeapons - Gets loaded weapons
 * @property {Weapon} firstLoadedWeapon - Gets first loaded weapon
 */

/**
 * @typedef {Object} WeaponsSystem
 * @property {Weapon} weapon - The weapon object
 * @property {number} ammo - Current ammo count
 * @property {number} ammoCapacity - Total ammo capacity
 * @property {number} ammoRemaining - Remaining ammo count
 * @property {boolean} hasAmmoRemaining - Checks if has ammo remaining
 * @property {() => void} useAmmo - Consumes ammo
 * @property {WeaponsSystem|undefined} firstUnattachedWeapon - Gets unattached weapon
 * @property {boolean} hasAmmo - Checks if has ammo
 */

/**
 * @typedef {Object} ViewModel
 * @property {() => number} cellSize - Gets cell size for screen
 * @property {Object} grid - Grid object for coordinate lookup
 */

/**
 * @typedef {Object} FireResult
 * @property {number} hits - Number of hits
 * @property {number} shots - Number of shots fired
 * @property {number} reveals - Number of reveals
 * @property {string} sunk - Sunk ship info
 * @property {number} dtap - Double tap count
 * @property {string} info - Additional info
 */

/**
 * @typedef {Object} CursorInfo
 * @property {string} cursor - Current cursor type
 * @property {WeaponsSystem} weaponSystem - Current weapon system
 * @property {number} index - Current index
 */
/**
 * @typedef {Object} WeaponResult
 * @property {number} hits - Number of hits
 * @property {number} [dtap] - Damage points
 */
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
 * @typedef {Object} FiringInfo
 * @property {Coord[]} [fireCoordinates] - Target coordinates
 * @property {(target: ?Object) => Promise<FireResult>} [fireWeapon] - Weapon firing function
 * @property {WeaponsSystem} [wps] - Weapon system being fired
 * @property {Weapon} [weapon] - Weapon being fired
 * @property {boolean} [hasUnattached] - Whether unattached weapon is involved
 */

/**
 * @typedef {Object} FireWeaponInfoContext
 * @property {Weapon} weapon - The weapon object
 * @property {AoePattern} affectedArea - Cells affected by weapon
 * @property {Object} options - Weapon-specific options
 */

/**
 * @typedef {Object} SingleShotInfo
 * @property {Weapon} weapon - The weapon object
 * @property {Coord[]} affectedLoc - Affected location
 * @property {WeaponsSystem} wps - Weapon system
 */

/**
 * Manages weapon loadouts, ammo tracking, and firing logic for ships in the game.
 * Handles both attached and unattached weapons, cursor management, and weapon selection.
 *
 * @class LoadOut
 * @description Coordinates weapon system state, selection tracking, and firing operations.
 * Separates concerns: weapon management, ammo validation, cursor state, and firing workflow.
 */
export class LoadOut {
  /**
   * Initializes the LoadOut with weapons, ships, view model, and step callbacks.
   *
   * @param {Weapon[]} weapons - Array of unattached weapons (single-shot style)
   * @param {Ship[]} ships - Array of ships with attached weapon systems
   * @param {ViewModel} viewModel - The view model for grid interactions
   * @param {{fire: () => void, targetting: (hasAttached?: boolean) => void}} steps - Lifecycle callbacks
   * @throws {Error} If weapons or ships contain invalid weapon definitions
   */
  constructor (weapons, ships, viewModel, steps) {
    // Event callbacks for external listeners
    this.onOutOfAllAmmo = Function.prototype
    this.onOutOfAmmo = Function.prototype
    this.onCursorChangeCallback = Function.prototype
    this.onDestroy = LoadOut.givesNoResult
    this.onReveal = LoadOut.givesNoResult
    this.onSound = Function.prototype

    // Lifecycle management
    this.steps = steps
    this.viewModel = viewModel

    // Weapon system state
    /** @type {number} */
    this.currentWeaponIndex = 0
    /** @type {?WeaponsSystem} */
    this.selectedWeapon = null
    /** @type {Object<string, WeaponsSystem>} */
    this.weaponDictionary = {}

    // Selection and targeting state
    /** @type {number[][]} */
    this.selectedCoordinates = []
    /** @type {number[][]} */
    this.hintCoordinates = []
    /** @type {?Weapon} */
    this.selectableWeapon = null

    // Data sources
    /** @type {Weapon[]} */
    this.unattachedWeapons = weapons || []
    /** @type {Ship[]} */
    this.ships = ships || []

    // Capability flags
    const hasAttachedWeapons = this.ships.length > 0
    /** @type {boolean} */
    this.hasAttachedWeapons = hasAttachedWeapons
    /** @type {boolean} */
    // @ts-ignore - bh.seekingMode exists at runtime
    this.isRackSelectable = !(bh?.seekingMode ?? false) && hasAttachedWeapons
    /** @type {boolean} */
    this.hasUnattachedWeapons = this.unattachedWeapons.length > 0

    // Firing mechanism binding
    /** @type {Function} */
    this.launch = LoadOut.launchDefault.bind(this, this.viewModel)

    // Initialize weapon systems
    this.loadWeapons()
    /** @type {WeaponsSystem[]} */
    this.allWeaponSystems = [...(this.weaponSystems || [])]
  }

  // ==================== Firing Workflow ====================

  /**
   * Aims weapon at target and executes firing if selection is complete.
   * HIGH-LEVEL: orchestrates the entire firing sequence.
   *
   * @param {Object} map - Game map
   * @param {number} row - Target row
   * @param {number} col - Target column
   * @param {?WeaponsSystem} [weaponSystem] - Override weapon system
   * @param {?Function} [launch] - Custom launch animation (defaults to static method)
   * @returns {Promise<{weapon: Weapon, score: FireResult} | FiringInfo>} Firing result
   */
  async aimWeapon (map, row, col, weaponSystem = null, launch = null) {
    const launchFn = launch ?? this.launch
    const info = this.firingInfoIfReady(map, row, col, weaponSystem)
    if (info?.fireCoordinates) {
      const { fireCoordinates, fireWeapon, wps, weapon } = info

      this.steps.fire()
      const launchInfo = launchFn
        ? await launchFn(fireCoordinates, weapon, wps)
        : {}
      const score = fireWeapon
        ? await fireWeapon(launchInfo?.target)
        : { hits: 0, shots: 0, reveals: 0, sunk: '', dtap: 0, info: '' }
      return { weapon, score }
    }
    // @ts-ignore - FiringInfo or FireResult type compatibility
    return info
  }

  /**
   * Builds firing info once weapon selection is complete.
   * CONSOLIDATED: unified firing info collection and validation.
   * HIGH-LEVEL: orchestrates selection validation and firing preparation.
   *
   * @param {Object} map - Game map
   * @param {number} row - Selected row
   * @param {number} col - Selected column
   * @param {?WeaponsSystem} [weaponSystem] - Override weapon system
   * @returns {?FiringInfo} Complete firing info if ready, null/partial if still selecting
   */
  firingInfoIfReady (map, row, col, weaponSystem) {
    const wps = weaponSystem || this.currentWeaponSystem
    const weapon = wps?.weapon

    this.addSelectedCoordinates(row, col, weapon)
    const unattachedWeaponSystem = this.firstUnattachedWeaponSystem

    if (unattachedWeaponSystem) {
      this.selectedWeapon = unattachedWeaponSystem
    }

    return this.#resolveFiringState(wps, unattachedWeaponSystem, map)
  }

  /**
   * Determines the current firing state and returns appropriate info.
   * Routes to firing info building or continuation depending on selection state.
   *
   * @param {?WeaponsSystem} wps - Current weapon system
   * @param {?WeaponsSystem} unattachedWeaponSystem - Unattached weapon if present
   * @param {Object} map - Game map
   * @returns {?FiringInfo} Firing info or continuation signal
   */
  #resolveFiringState (wps, unattachedWeaponSystem, map) {
    if (!wps?.weapon) {
      return null
    }
    const hasUnattached = unattachedWeaponSystem != null

    // Selection complete - build firing info
    if (this.#isSelectionComplete(wps, hasUnattached)) {
      const { fireCoordinates, fireWeapon } = this._buildFiringInfo(wps, map)
      // @ts-ignore - Function type compatibility with fireWeapon
      return { fireCoordinates, fireWeapon, wps, weapon: wps.weapon }
    }

    // Still selecting - continue targeting
    this.steps?.targetting()

    if (unattachedWeaponSystem) {
      return { hasUnattached: true, wps: unattachedWeaponSystem }
    }
    return null
  }

  /**
   * Checks if weapon selection is complete.
   * Compares selected coordinates against weapon point requirements.
   *
   * @param {?WeaponsSystem} weaponSystem - Weapon being checked
   * @param {boolean} hasUnattached - Whether unattached weapon is involved
   * @returns {boolean} True if selection is complete
   */
  #isSelectionComplete (weaponSystem, hasUnattached) {
    if (!weaponSystem?.weapon) {
      return false
    }
    const neededPoints = weaponSystem.weapon.points ?? 0
    const totalPoints =
      this.selectedCoordinates.length +
      (hasUnattached ? weaponSystem.weapon.postUnattached || 0 : 0)
    return neededPoints <= totalPoints
  }

  /**
   * Builds firing metadata: coordinates and firing function.
   * CONSOLIDATED: single method for all firing prep.
   *
   * @param {WeaponsSystem} wps - Weapon being fired
   * @param {Object} map - Game map
   * @returns {{fireCoordinates: number[][], fireWeapon: function}} Firing data
   * @private
   */
  _buildFiringInfo (wps, map) {
    // Filter out invalid sentinel coordinates ([-1, -1]) used for unattached cursor tracking
    const fireCoordinates = structuredClone(this.selectedCoordinates).filter(
      ([r, c]) => r >= 0 && c >= 0
    )
    this.selectedWeapon = null
    this.useAmmo(wps)
    const fireWeapon = this._createFireWeaponFunction(map, fireCoordinates, wps)
    this.clearSelectedCoordinates()
    return { fireCoordinates, fireWeapon }
  }

  /**
   * Creates the firing function for a weapon.
   *
   * @param {Object} map - Game map
   * @param {number[][]} fireCoordinates - Coordinates to fire at
   * @param {WeaponsSystem} wps - Weapon system
   * @returns {(target: ?Object) => Promise<FireResult>} Function to execute firing
   * @private
   */
  _createFireWeaponFunction (map, fireCoordinates, wps) {
    return this.fireWeapon.bind(this, map, fireCoordinates, wps)
  }

  /**
   * Fires a weapon at given coordinates.
   * IMPROVED: clearer separation of concerns (info collection vs execution).
   *
   * @param {Object} map - Game map
   * @param {number[][]} coordinates - Target coordinates
   * @param {WeaponsSystem} weaponSystem - Weapon system
   * @param {?Object} [target] - Target information
   * @returns {Promise<FireResult>} Result of firing
   */
  fireWeapon (map, coordinates, weaponSystem, target) {
    const {
      weapon,
      affectedArea,
      options: weaponOptions
    } = this._computeFireWeaponInfo(coordinates, weaponSystem, map)
    return this._executeFireWeaponAoE(
      weapon,
      affectedArea,
      target,
      weaponOptions
    )
  }

  /**
   * Computes affected area and options for firing.
   * CONSOLIDATED: single method for all firing computation.
   *
   * @param {number[][]} coordinates - Target coordinates
   * @param {WeaponsSystem} weaponSystem - Weapon system
   * @param {Object} map - Game map
   * @returns {FireWeaponInfoContext} Fire context with weapon, area, and options
   * @private
   */
  _computeFireWeaponInfo (coordinates, weaponSystem, map) {
    const resolvedCoordinates = this._resolveTargetCoordinates(coordinates)
    const resolvedWeaponSystem = this._resolveWeaponSystem(weaponSystem)
    // @ts-ignore - resolvedWeaponSystem null check on next line
    const weapon = resolvedWeaponSystem.weapon
    const result = weapon.aoePlus?.(map, resolvedCoordinates) || {
      affectedArea: [],
      options: {}
    }
    // @ts-ignore - result type compatibility for destructuring
    const { affectedArea, options } = result
    return { weapon, affectedArea, options }
  }

  /**
   * Resolves target coordinates, defaulting to current selection.
   *
   * @param {?number[][]} [coordinates] - Target coordinates
   * @returns {number[][]} Resolved coordinates
   * @private
   */
  _resolveTargetCoordinates (coordinates) {
    return coordinates || this.selectedCoordinates
  }

  /**
   * Resolves weapon system, defaulting to current weapon.
   *
   * @param {?WeaponsSystem} [weaponSystem] - Weapon system
   * @returns {?WeaponsSystem} Resolved weapon system
   * @private
   */
  _resolveWeaponSystem (weaponSystem) {
    // @ts-ignore - Type compatibility between WeaponsSystem interface and implementation
    return weaponSystem ?? this.currentWeaponSystem
  }

  /**
   * Executes the area-of-effect firing.
   * IMPROVED: clearer routing logic for different weapon types.
   *
   * @param {Weapon} weapon - Weapon being fired
   * @param {Array<*>} affectedArea - Affected cells
   * @param {Object} options - Weapon options
   * @param {?Object} [target] - Target information
   * @returns {Promise<FireResult>} Result of execution
   * @private
   */
  _executeFireWeaponAoE (weapon, affectedArea, options, target = null) {
    if (weapon.destroys) {
      if (weapon.isOneAndDone) {
        // @ts-ignore - onDestroyOneOfMany callback type compatibility
        const result = this.onDestroyOneOfMany?.(
          weapon,
          affectedArea,
          options,
          target ?? undefined
        )
        // @ts-ignore - Promise wrapping for callback result
        return (
          result ??
          Promise.resolve({
            hits: 0,
            shots: 0,
            reveals: 0,
            sunk: '',
            dtap: 0,
            info: ''
          })
        )
      }
      // @ts-ignore - onDestroy callback type compatibility
      const result = this.onDestroy?.(weapon, affectedArea, options)
      // @ts-ignore - Promise wrapping for callback result
      return (
        result ??
        Promise.resolve({
          hits: 0,
          shots: 0,
          reveals: 0,
          sunk: '',
          dtap: 0,
          info: ''
        })
      )
    }
    // @ts-ignore - onReveal callback type compatibility
    const result = this.onReveal?.(weapon, affectedArea, options)
    // @ts-ignore - Promise wrapping for callback result
    return (
      result ??
      Promise.resolve({
        hits: 0,
        shots: 0,
        reveals: 0,
        sunk: '',
        dtap: 0,
        info: ''
      })
    )
  }

  /**
   * Handles destruction of a single target from many (secondary weapon logic).
   *
   * @param {Weapon} weapon - Weapon being fired
   * @param {AoePattern} affectedArea - Affected cells
   * @param {Object} options - Weapon options
   * @param {?Coord[]} [target] - Target information
   * @returns {Promise<FireResult>} Result of firing
   */
  onDestroyOneOfMany (weapon, affectedArea, options, target = null) {
    // @ts-ignore - onDestroy callback type compatibility
    return Promise.resolve(
      this.onDestroy?.(weapon, affectedArea, options) ?? {
        hits: 0,
        shots: 0,
        reveals: 0,
        sunk: '',
        dtap: 0,
        info: ''
      }
    )
  }

  /**
   * Fires single-shot weapon at coordinates.
   *
   * @param {number[][]} coordinates - Target coordinates
   * @param {?WeaponsSystem} [sShot] - Single shot weapon (defaults to index 0)
   * @returns {Promise<FireResult>} Result of firing
   */
  fireSingleShot (coordinates, sShot = null) {
    const { weapon, affectedLoc, wps } = this._buildSingleShotInfo(
      sShot ?? undefined,
      coordinates
    )
    // @ts-ignore - onDestroy callback type compatibility
    const result = this.onDestroy?.(weapon, [affectedLoc], {
      isSingleShot: true,
      wps
    })
    // @ts-ignore - Promise wrapping for callback result
    return (
      result ??
      Promise.resolve({
        hits: 0,
        shots: 0,
        reveals: 0,
        sunk: '',
        dtap: 0,
        info: ''
      })
    )
  }

  /**
   * Builds single-shot weapon firing info.
   *
   * @param {?WeaponsSystem} [sShot] - Single shot weapon
   * @param {?number[][]} [coordinates] - Target coordinates
   * @returns {SingleShotInfo} Single shot info
   * @private
   */
  _buildSingleShotInfo (sShot = null, coordinates = null) {
    const resolvedSShot =
      sShot ?? this.getSingleShotWps() ?? this.currentWeaponSystem
    const weapon = resolvedSShot?.weapon ?? this.currentWeapon
    const c = coordinates ?? this.selectedCoordinates
    const affectedLoc = [...(c || []), 4]
    // @ts-ignore - Type compatibility for return object
    return { weapon: weapon ?? {}, affectedLoc, wps: resolvedSShot ?? {} }
  }

  /**
   * Gets info for single-shot aiming interaction.
   *
   * @param {number} row - Target row
   * @param {number} col - Target column
   * @param {?WeaponsSystem} [sShot] - Single shot weapon
   * @returns {{fireSingleShot: Function, wps: ?WeaponsSystem, coordinates: number[][], weapon: ?Weapon}} Aim info
   */
  aimSingleShotInfo (row, col, sShot = null) {
    const resolvedSShot =
      sShot ?? this.getSingleShotWps() ?? this.currentWeaponSystem
    const weapon = resolvedSShot?.weapon ?? this.currentWeapon
    const fireSingleShot = this.fireSingleShot.bind(
      this,
      [[row, col]],
      resolvedSShot ?? undefined
    )
    const coordinates = [[row, col, 4]]
    // @ts-ignore - Type compatibility for return object
    return { fireSingleShot, wps: resolvedSShot, coordinates, weapon }
  }

  // ==================== Ship/Rack Management ====================

  /**
   * Gets first loaded weapon from first ship.
   *
   * @returns {Weapon|undefined} First weapon or undefined
   */
  getFirstRack () {
    return this.ships[0]?.firstLoadedWeapon
  }

  /**
   * Finds ship by weapon system ID.
   *
   * @param {string} weaponId - Weapon system ID
   * @returns {?Ship} Ship with weapon
   */
  getShipByWeaponId (weaponId) {
    return (
      this.ships.find(ship => ship.getWeaponBySystemId?.(weaponId) != null) ??
      null
    )
  }

  /**
   * Gets weapon by system ID from loaded weapons.
   *
   * @param {string} rackId - Rack/weapon system ID
   * @returns {Weapon|undefined} Matching weapon
   */
  getWeaponBySystemId (rackId) {
    return this._findWeaponInCollection(this.loadedWeapons, rackId)
  }

  /**
   * Finds weapon in a collection by system ID.
   *
   * @param {Weapon[]} weaponCollection - Collection to search
   * @param {string} weaponId - Weapon system ID
   * @returns {?Weapon} Matching weapon or undefined
   * @private
   */
  _findWeaponInCollection (weaponCollection, weaponId) {
    return (
      (weaponCollection || []).find(weapon => weapon.id === weaponId) || null
    )
  }

  /**
   * Gets all loaded weapons across all ships.
   *
   * @returns {Weapon[]} All loaded weapons
   */
  get loadedWeapons () {
    return this.ships.flatMap(ship => ship.loadedWeapons)
  }

  /**
   * Gets all weapons across all ships.
   *
   * @returns {Weapon[]} All weapons
   */
  getAllRacks () {
    return this.ships.flatMap(ship => ship.allWeapons)
  }

  /**
   * Finds ship by ID.
   *
   * @param {string} shipId - Ship ID
   * @returns {Ship|undefined} Matching ship
   */
  getShipById (shipId) {
    return this.ships.find(ship => ship.id === shipId)
  }

  // ==================== Static Fire Result Factories ====================

  /**
   * Creates a standard fire result object.
   *
   * @static
   * @param {number} [shots=0] - Number of shots fired
   * @param {number} [doubleTap=0] - Double tap count
   * @returns {FireResult} Result object with default values
   */
  static createResult (shots = 0, doubleTap = 0) {
    return { hits: 0, shots, reveals: 0, sunk: '', dtap: doubleTap, info: '' }
  }

  /**
   * @static
   * @returns {FireResult} Double tap result
   */
  static get doubleTapResult () {
    return this.createResult(0, 1)
  }

  /**
   * @static
   * @returns {FireResult} No result
   */
  static get noResult () {
    return this.createResult(0, 0)
  }

  /**
   * @static
   * @returns {FireResult} Miss result
   */
  static get missResult () {
    return this.createResult(1, 0)
  }

  /**
   * @static
   * @returns {() => FireResult} Function returning no result
   */
  static get givesNoResult () {
    return () => {
      return this.noResult
    }
  }

  /**
   * Default launch animation for weapons.
   *
   * @static
   * @param {ViewModel} viewModel - The view model
   * @param {number[][]} coordinates - Target coordinates
   * @param {Weapon} weapon - The weapon being fired
   * @returns {Promise<Object>} Launch animation result
   */
  static launchDefault (viewModel, coordinates, weapon) {
    const targetCoordinates = coordinates.at(-1) || [0, 0]
    // @ts-ignore - WeaponSystem type compatibility with Object index signature
    const targetCell = viewModel.grid?.nodeAt(
      targetCoordinates[1],
      targetCoordinates[0]
    )
    return (
      weapon.animateExplodeRaw?.(
        targetCell,
        viewModel.cellSize?.(),
        null,
        null
      ) || Promise.resolve({})
    )
  }
  /**
   * Loads and organizes weapon systems from unattached weapons and ships.
   * Builds the weapon dictionary indexed by letter for quick lookup.
   *
   * @private
   */
  loadWeapons () {
    const unattachedWeaponSystems = LoadOut.createWeaponSystems(
      this.unattachedWeapons
    )
    this.weaponByLetter = this.buildWeaponDictionary(unattachedWeaponSystems)
    this.weaponSystems = Object.values(this.weaponByLetter)
  }

  /**
   * Builds the weapon dictionary from unattached systems and attached weapons.
   * Entry point for dictionary construction.
   *
   * @param {WeaponsSystem[]} unattachedSystems - Unattached weapon systems
   * @returns {Object<string, WeaponsSystem>} Weapon dictionary indexed by letter
   * @public
   */
  buildWeaponDictionary (unattachedSystems) {
    const weaponByLetter = this._createUnattachedWeaponMap(unattachedSystems)
    return this._mergeAttachedWeapons(weaponByLetter)
  }

  /**
   * Creates initial map from unattached weapon systems.
   *
   * @param {WeaponsSystem[]} weaponSystems - Weapon systems to map
   * @returns {Object<string, WeaponsSystem>} Letter-keyed map of unattached weapons
   * @private
   */
  _createUnattachedWeaponMap (weaponSystems) {
    return weaponSystems.reduce((map, weaponSystem) => {
      const letter = weaponSystem.weapon.letter
      // @ts-ignore - Object index signature for string keys
      map[letter] = weaponSystem
      return map
    }, {})
  }

  /**
   * Merges attached weapons from ships into the weapon dictionary.
   * Attached weapons of same letter create multi-system entries.
   *
   * @param {Object<string, WeaponsSystem>} weaponByLetter - Existing dictionary
   * @returns {Object<string, WeaponsSystem>} Updated dictionary with attached weapons
   * @private
   */
  _mergeAttachedWeapons (weaponByLetter) {
    return this.ships.reduce((map, ship) => {
      const weapon = ship.primaryWeapon
      if (weapon) {
        const key = weapon.letter
        const existing = map[key]
        // @ts-ignore - Type compatibility for WeaponSystem construction
        map[key] = existing
          ? WeaponSystem.build(existing, ship)
          : new AttachedWeaponSystems(ship)
      }
      return map
    }, weaponByLetter)
  }

  /**
   * Creates weapon systems from weapons.
   *
   * @static
   * @param {Weapon[]} weapons - Weapons to convert
   * @returns {WeaponsSystem[]} Weapon systems
   */
  static createWeaponSystems (weapons) {
    // @ts-ignore - WeaponSystem type compatibility from internal construction
    return weapons.map(weapon => new WeaponSystem(weapon)) || []
  }

  /**
   * Gets all ships with remaining ammo.
   *
   * @returns {Ship[]} Array of ships with ammo remaining
   */
  getArmedShips () {
    return this.ships.filter(ship => ship.hasAmmoRemaining)
  }

  /**
   * Gets the unattached weapon system for the current selection.
   *
   * @returns {?WeaponsSystem} Unattached weapon system if available
   */
  get firstUnattachedWeapon () {
    return this.currentWeaponSystem?.firstUnattachedWeapon ?? null
  }

  /**
   * Alias for firstUnattachedWeapon (for compatibility).
   *
   * @returns {?WeaponsSystem} Unattached weapon system if available
   */
  get firstUnattachedWeaponSystem () {
    return this.firstUnattachedWeapon
  }

  /**
   * Gets weapon systems that have limited ammo (current set).
   *
   * @returns {WeaponsSystem[]} Limited weapon systems in current arsenal
   */
  getLimitedWeaponSystems () {
    return (this.weaponSystems || []).filter(wps => wps.weapon.isLimited)
  }

  /**
   * Gets all weapon systems that have limited ammo (all-time).
   * Includes weapons that may have been depleted.
   *
   * @returns {WeaponsSystem[]} All limited weapon systems
   */
  getAllLimitedWeaponSystems () {
    return this.allWeaponSystems.filter(wps => wps.weapon.isLimited)
  }

  /**
   * Gets the total ammunition capacity for limited weapons.
   *
   * @returns {number} Total ammo capacity across all limited weapons
   */
  getAmmoCapacity () {
    return this.getLimitedWeaponSystems().reduce(
      (acc, wps) => acc + wps.ammoCapacity,
      0
    )
  }

  /**
   * Gets the total remaining ammo for limited weapons.
   *
   * @returns {number} Remaining ammo count across all limited weapons
   */
  ammoRemaining () {
    return this.getLimitedWeaponSystems().reduce(
      (acc, wps) => acc + (wps?.ammoRemaining ?? 0),
      0
    )
  }

  /**
   * Reloads unattached weapons and rebuilds weapon systems.
   * Used when weapon loadout changes mid-game.
   *
   * @param {Weapon[]} weapons - New unattached weapons
   */
  reloadWeapons (weapons) {
    this.unattachedWeapons = weapons
    this.loadWeapons()
  }

  /**
   * Validates whether a weapon system has usable ammo.
   * UNIFIED ammo validation: encapsulates the logic for checking if a weapon can fire.
   *
   * @param {WeaponsSystem} weaponSystem - Weapon system to check
   * @returns {boolean} True if the weapon can fire (unlimited weapons always fire-ready)
   * @private
   */
  _canWeaponFire (weaponSystem) {
    if (!weaponSystem?.weapon) return false
    if (!weaponSystem.weapon.isLimited) return true
    return weaponSystem.hasAmmoRemaining
  }

  /**
   * Checks if a specific weapon letter has ammo available.
   * CONSOLIDATED: replaces duplicate ammo validation logic.
   *
   * @param {string} weaponLetter - Weapon letter to check
   * @returns {boolean} True if weapon exists and has ammo
   */
  hasAmmoForWeaponLetter (weaponLetter) {
    const weaponSystem = this.weaponByLetter?.[weaponLetter]
    if (!weaponSystem) return false
    return this._canWeaponFire(weaponSystem)
  }

  /**
   * Checks if a weapon is available for firing.
   * CONSOLIDATED: unifies weapon availability checks across different contexts.
   *
   * @param {?WeaponsSystem} weaponSystem - Weapon system to check
   * @param {string} weaponLetter - Weapon letter to match
   * @returns {boolean} True if letter matches and weapon has ammo
   * @private
   */
  _isWeaponAvailable (weaponSystem, weaponLetter) {
    if (!weaponSystem) return false
    const isCorrectLetter = weaponSystem.weapon?.letter === weaponLetter
    const hasAmmo = this._canWeaponFire(weaponSystem)
    return isCorrectLetter && hasAmmo
  }

  /**
   * Gets the current weapon system by index.
   *
   * @returns {?WeaponsSystem} Current weapon system
   */
  get currentWeaponSystem () {
    return this.weaponSystems?.[this.currentWeaponIndex] || null
  }

  /**
   * Gets the current weapon.
   * CONSOLIDATED: replaces multiple similar getter methods.
   *
   * @returns {?Weapon} Current weapon
   */
  get currentWeapon () {
    const weaponSystem = this.currentWeaponSystem
    return weaponSystem?.weapon || null
  }

  /**
   * Gets the first/single-shot weapon system (index 0).
   *
   * @returns {?WeaponsSystem} Single shot weapon system
   */
  getSingleShotWps () {
    return this.weaponSystems?.[0] || null
  }

  /**
   * Gets the first/single-shot weapon.
   *
   * @returns {?Weapon} Single shot weapon
   */
  getSingleShot () {
    return this.weaponSystems?.[0]?.weapon || null
  }

  /**
   * Gets next weapon system in rotation.
   *
   * @returns {?WeaponsSystem} Next weapon system
   */
  getNextWeaponSystem () {
    return this.weaponSystems?.[this._getNextWeaponIndex()] || null
  }

  /**
   * Calculates next weapon index with wraparound.
   * UNIFIED: single source of truth for index rotation logic.
   *
   * @param {?number} [currentIndex] - Starting index (defaults to current)
   * @returns {number} Next index with wraparound
   * @private
   */
  _getNextWeaponIndex (currentIndex) {
    const idx =
      currentIndex !== undefined && currentIndex !== null
        ? currentIndex
        : this.currentWeaponIndex
    const nextIdx = idx + 1
    const maxLength = this.weaponSystems?.length || 1
    return nextIdx >= maxLength ? 0 : nextIdx
  }

  /**
   * Gets the next weapon based on current or specified starting point.
   *
   * @param {?string} [weaponLetter] - Optional letter to find and advance from
   * @returns {?Weapon} Next weapon or undefined if none available
   */
  getNextWeapon (weaponLetter) {
    if (weaponLetter) {
      let idx = this.getWeaponIndexForLetter(weaponLetter)
      if (idx < 0) {
        idx = 0
      }
      const nextIdx = this._getNextWeaponIndex(idx)
      const nextWeaponSystem = this.weaponSystems?.[nextIdx]
      return nextWeaponSystem?.weapon || null
    }
    const nextSystem = this.getNextWeaponSystem()
    return nextSystem?.weapon || null
  }

  /**
   * Gets the index of a weapon by letter.
   *
   * @param {string} weaponLetter - Weapon letter to find
   * @returns {number} Index of weapon or -1 if not found
   */
  getWeaponIndexForLetter (weaponLetter) {
    return this._getWeaponIndexForLetter(weaponLetter)
  }

  /**
   * Gets the index of a weapon by its letter.
   * UNIFIED: single source for weapon lookup by letter.
   *
   * @param {string} weaponLetter - Weapon letter to find
   * @returns {number} Index of weapon or -1 if not found
   * @private
   */
  _getWeaponIndexForLetter (weaponLetter) {
    return this._findWeaponIndexByLetterAndAmmo(weaponLetter)
  }

  /**
   * Finds weapon index by letter with ammo validation.
   *
   * @param {string} weaponLetter - Weapon letter
   * @returns {number} Index if found and has ammo, -1 otherwise
   * @private
   */
  _findWeaponIndexByLetterAndAmmo (weaponLetter) {
    return (this.weaponSystems || []).findIndex(weaponSystem =>
      this._isWeaponAvailable(weaponSystem, weaponLetter)
    )
  }

  /**
   * Checks if a weapon letter exists in the dictionary.
   *
   * @param {string} weaponLetter - Weapon letter
   * @returns {boolean} True if available
   */
  hasWeaponByLetter (weaponLetter) {
    return weaponLetter in (this.weaponByLetter || {})
  }

  /**
   * Updates the current weapon index and notifies listeners.
   * CONSOLIDATED: unified entry point for weapon index changes.
   * Triggers cursor change notifications.
   *
   * @param {number} idx - Index to set
   * @private
   */
  _setCurrentWeaponIndex (idx) {
    const oldCursor = this.currentCursor
    this.currentWeaponIndex = idx
    this.notifyCursorChange(oldCursor)
  }

  /**
   * Switches to a weapon by letter.
   * UNIFIED: consolidated entry point for weapon switching by letter.
   *
   * @param {string} weaponLetter - Weapon letter to switch to
   * @returns {boolean} True if switch successful, false if weapon not available
   */
  switchToWeapon (weaponLetter) {
    const idx = this._getWeaponIndexForLetter(weaponLetter)
    if (idx < 0) return false
    this._setCurrentWeaponIndex(idx)
    return true
  }

  /**
   * Switches to the first/single-shot weapon.
   * UNIFIED: guaranteed to succeed (single-shot always available).
   *
   * @returns {boolean} Always true (single shot always available)
   */
  switchToSingleShot () {
    this._setCurrentWeaponIndex(0)
    return true
  }

  /**
   * Switches to the next weapon in sequence.
   * CONSOLIDATED: private helper for weapon rotation.
   *
   * @private
   */
  _moveToNextWeaponIndex () {
    this._setCurrentWeaponIndex(this._getNextWeaponIndex())
  }

  /**
   * Switches to next weapon system and clears selection.
   * HIGH-LEVEL: compound operation for UI weapon switching.
   *
   * @returns {Weapon} The new current weapon
   */
  switchToNextWeaponSystem () {
    this._moveToNextWeaponIndex()
    this.clearSelectedCoordinates()
    return this.currentWeapon
  }

  /**
   * Checks if current weapon is the single-shot weapon.
   *
   * @returns {boolean} True if at index 0
   */
  get isSingleShot () {
    return this.currentWeaponIndex === 0
  }

  /**
   * Switches to preferred weapon based on game settings.
   * UNIFIED: consolidated preference-based weapon switching.
   *
   * @returns {*} Operation associated with preferred weapon or null
   */
  switchToPreferredWeapon () {
    const preferences = bh?.maps?.weaponPreference ?? []
    if (!Array.isArray(preferences)) return null
    for (const [letter, op] of preferences) {
      if (this.switchToWeapon(letter)) {
        return op
      }
    }
    return null
  }

  /**
   * Gets all cursor values from all weapons.
   *
   * @returns {string[]} Unique cursor identifiers
   */
  getAllCursors () {
    return (this.weaponSystems || [])
      .flatMap(wps => wps.weapon?.cursors || [])
      .filter(cursor => cursor != null && cursor !== '')
  }

  /**
   * Gets information about the current cursor state.
   * IMPROVED: clearer logic for determining which cursor should display.
   * HIGH-LEVEL: consolidated cursor state determination.
   *
   * @returns {?CursorInfo} Object with cursor, weapon system, and index
   */
  get currentCursorInfo () {
    const weaponSystem = this.currentWeaponSystem
    if (!weaponSystem) {
      return null
    }
    const weapon = weaponSystem.weapon
    const currentIndex = this.selectedCoordinates.length

    return this._resolveCursorState(weapon, weaponSystem, currentIndex)
  }

  /**
   * Determines the correct cursor based on selection state.
   *
   * @param {Weapon} weapon - Current weapon
   * @param {WeaponsSystem} weaponSystem - Current weapon system
   * @param {number} currentIndex - Number of coordinates selected
   * @returns {CursorInfo} Resolved cursor info
   * @private
   */
  _resolveCursorState (weapon, weaponSystem, currentIndex) {
    const numcur = weapon.cursors.length

    // If we've selected all cursors, stay on the last one
    if (numcur === currentIndex) {
      return {
        cursor: weapon.cursors[numcur - 1],
        weaponSystem,
        index: currentIndex
      }
    }

    // If selection is complete, return empty cursor (firing ready)
    if (this._isCursorSelectionComplete(currentIndex, weapon)) {
      return { cursor: '', weaponSystem, index: -1 }
    }

    // Otherwise return the next cursor to select
    return {
      cursor: weapon.cursors[currentIndex],
      weaponSystem,
      index: currentIndex
    }
  }

  /**
   * Checks if cursor selection requirements are met.
   * CONSOLIDATED: unified completion check.
   *
   * @param {number} currentIndex - Number of coordinates selected
   * @param {Weapon} weapon - Weapon being used
   * @returns {boolean} True if selection is complete
   * @private
   */
  _isCursorSelectionComplete (currentIndex, weapon) {
    const points = weapon?.points ?? 0
    const cursorsLength = weapon?.cursors?.length ?? 0
    return currentIndex >= points || currentIndex >= cursorsLength
  }

  /**
   * Gets current cursor identifier.
   *
   * @returns {string} Cursor identifier
   */
  get currentCursor () {
    const cursorInfo = this.currentCursorInfo
    return cursorInfo?.cursor || ''
  }

  /**
   * Notifies listeners of cursor change.
   *
   * @param {string} oldCursor - Previous cursor value
   */
  notifyCursorChange (oldCursor) {
    const cursorInfo = this.currentCursorInfo
    if (cursorInfo) {
      this.onCursorChangeCallback(oldCursor, cursorInfo)
    }
  }

  /**
   * Determines if unattached weapon should advance cursor on selection clear.
   *
   * @param {?WeaponsSystem} unattachedWeaponSystem - Weapon to check
   * @returns {boolean} True if weapon uses unattached cursor advancement
   */
  #shouldAdvanceUnattachedCursor (unattachedWeaponSystem) {
    return (
      unattachedWeaponSystem != null &&
      (unattachedWeaponSystem.weapon?.unattachedCursor ?? 0) > 0
    )
  }

  /**
   * Handles cursor state after clearing selection coordinates.
   * IMPROVED: clearer logic separation for unattached cursor handling.
   *
   * @param {string} oldCursor - Previous cursor
   * @param {?WeaponsSystem} unattachedWeaponSystem - Unattached weapon
   * @returns {void}
   */
  #handleUnattachedCursorSelection (oldCursor, unattachedWeaponSystem) {
    if (this.#shouldAdvanceUnattachedCursor(unattachedWeaponSystem)) {
      this.addSelectedCoordinates(-1, -1, unattachedWeaponSystem?.weapon)
      return
    }
    this.notifyCursorChange(oldCursor)
    const firstRack = this.getFirstRack()
    this.selectableWeapon = firstRack ?? null
  }

  /**
   * Adds a selected coordinate and updates cursor.
   *
   * @param {number} row - Row coordinate
   * @param {number} col - Column coordinate
   * @param {?Weapon} [_weapon] - Weapon being selected (defaults to current)
   * @returns {void}
   */
  addSelectedCoordinates (row, col, _weapon = this.currentWeapon) {
    const oldCursor = this.currentCursor
    this.selectedCoordinates.push([row, col])
    this.notifyCursorChange(oldCursor)
  }

  /**
   * Clears all selected coordinates and resets cursor.
   * HIGH-LEVEL: compound operation for clearing selection state.
   *
   * @returns {void}
   */
  clearSelectedCoordinates () {
    const oldCursor = this.currentCursor
    this.selectedCoordinates = []

    const unattachedWeaponSystem = this._resolveUnattachedWeaponForClear()
    if (!unattachedWeaponSystem) {
      this.notifyCursorChange(oldCursor)
      return
    }

    this.#handleUnattachedCursorSelection(oldCursor, unattachedWeaponSystem)
  }

  /**
   * Resolves which unattached weapon to use when clearing selection.
   *
   * @returns {?WeaponsSystem} Unattached weapon system if applicable
   * @private
   */
  _resolveUnattachedWeaponForClear () {
    let unattachedWeaponSystem = this.firstUnattachedWeapon
    if ((bh?.seekingMode ?? false) && !unattachedWeaponSystem) {
      unattachedWeaponSystem = this.getFirstRack()
        ? { weapon: this.getFirstRack() }
        : null
    }
    return unattachedWeaponSystem
  }

  /**
   * Gets current selection index.
   *
   * @returns {number} Number of coordinates selected
   */
  getCursorIndex () {
    return this.selectedCoordinates.length
  }

  /**
   * Dismisses current selection without firing.
   *
   * @returns {void}
   */
  dismissSelection () {
    this.clearSelectedCoordinates()
  }

  /**
   * Checks if weapon is ready to fire (armed).
   * In hide mode, unattached weapon must be selected with sufficient coordinates.
   * In seeking mode with all attached weapons, armed when weapon is selected and ready.
   * UNIFIED: consolidated armament state check.
   *
   * @returns {boolean} True if armed and ready
   */
  get isArmed () {
    const isInHideMode =
      this._isHideMode && this._isWeaponSelected && this._hasSufficientSelection

    // In seeking mode with all attached weapons, allow firing if weapon is selected
    const hasAttachedWeapons = bh?.terrain?.hasAttachedWeapons ?? false
    // @ts-ignore - bh.seekingMode exists at runtime
    const isInSeekingWithAttached =
      (bh?.seekingMode ?? false) && hasAttachedWeapons && this._isWeaponSelected

    return isInHideMode || isInSeekingWithAttached
  }

  /**
   * Checks if game is in hide mode (not seeking mode).
   *
   * @returns {boolean} True if hide mode active
   * @private
   */
  get _isHideMode () {
    // @ts-ignore - bh.seekingMode exists at runtime
    return !(bh?.seekingMode ?? false)
  }

  /**
   * Checks if a weapon is selected for firing.
   *
   * @returns {boolean} True if weapon selected
   * @private
   */
  get _isWeaponSelected () {
    return this.selectedWeapon != null
  }

  /**
   * Checks if enough coordinates selected for current weapon.
   *
   * @returns {boolean} True if sufficient selection
   * @private
   */
  get _hasSufficientSelection () {
    return (
      this.selectedCoordinates.length >=
      (this.selectedWeapon?.weapon?.postSelectCursor ?? 0)
    )
  }

  /**
   * Checks if arming is not possible (no rack selectable).
   *
   * @returns {boolean} True if cannot arm
   */
  get isNotArming () {
    return !this.isRackSelectable
  }

  /**
   * Checks if arming is in progress or possible.
   *
   * @returns {boolean} True if can arm
   */
  get isArming () {
    return !this.isNotArming
  }
  /**
   * Consumes ammo for a weapon system.
   * Automatically removes weapon if ammo depleted.
   *
   * @param {?WeaponsSystem} [weaponSystem] - Weapon to consume ammo from (defaults to current)
   * @returns {void}
   */
  useAmmo (weaponSystem) {
    const wps = weaponSystem ?? this.currentWeaponSystem
    if (!wps?.weapon?.isLimited) return
    wps.useAmmo?.()
    this._checkAndRemoveExpiredWeapon()
  }

  /**
   * Checks if current weapon has ammo remaining.
   * UNIFIED: single check for current weapon ammo state.
   *
   * @returns {boolean} True if current weapon can fire
   */
  get hasCurrentAmmo () {
    const wps = this.currentWeaponSystem
    return wps ? this._canWeaponFire(wps) : false
  }

  /**
   * Checks if current weapon is out of ammo.
   *
   * @returns {boolean} True if no ammo left
   */
  get hasNoCurrentAmmo () {
    return !this.hasCurrentAmmo
  }

  /**
   * Checks if any weapon has remaining ammo.
   * UNIFIED: consolidated ammo state check across arsenal.
   *
   * @returns {boolean} True if arsenal has ammo
   */
  get hasAllAmmo () {
    const currentWeaponSystem = this.currentWeaponSystem
    if (!currentWeaponSystem?.weapon?.isLimited) return true
    return this.hasArsenalAmmo
  }

  /**
   * Checks if arsenal has any remaining ammo.
   *
   * @returns {boolean} True if any limited weapon has ammo
   */
  get hasArsenalAmmo () {
    const remaining = this.ammoRemaining
    return remaining > 0
  }

  /**
   * Checks if all weapons are depleted (only single-shot remains).
   *
   * @returns {boolean} True if no other weapons available
   */
  get isOutOfAmmo () {
    return (this.weaponSystems?.length ?? 0) <= 1
  }

  /**
   * Removes current weapon system if it has no ammo.
   * CONSOLIDATED: unified weapon expiration check.
   *
   * @returns {boolean} True if weapon was removed
   * @private
   */
  _checkAndRemoveExpiredWeapon () {
    if (this.hasNoCurrentAmmo) {
      this._removeCurrentWeaponSystem()
      return true
    }
    return false
  }

  /**
   * Removes limited weapon systems with no ammo remaining.
   * CONSOLIDATED: unified ammo depletion checking.
   *
   * @returns {void}
   */
  checkAllAmmo () {
    const expiredWeapons = this._findExpiredWeapons()
    expiredWeapons.forEach(() => this._removeCurrentWeaponSystem())
  }

  /**
   * Finds all expired (depleted) limited weapons.
   *
   * @returns {WeaponsSystem[]} Array of depleted weapons
   * @private
   */
  _findExpiredWeapons () {
    return this.getLimitedWeaponSystems().filter(wps => !wps.hasAmmoRemaining)
  }

  /**
   * Removes the current weapon system at current index.
   * Notifies listeners and resets index if needed.
   * CONSOLIDATED: single source of truth for weapon removal.
   *
   * @private
   */
  _removeCurrentWeaponSystem () {
    const oldCursor = this.currentCursor
    this._removeWeaponAtIndex(this.currentWeaponIndex)
    this._notifyWeaponRemoved(oldCursor)
  }

  /**
   * Removes a weapon system at specific index.
   * Adjusts current index if needed.
   *
   * @param {number} index - Index to remove
   * @returns {void}
   * @private
   */
  _removeWeaponAtIndex (index) {
    if (!this.weaponSystems) return
    this.weaponSystems.splice(index, 1)
    if (index >= (this.weaponSystems?.length ?? 0)) {
      this.currentWeaponIndex = this._calculateAdjustedIndex(index)
    }
  }

  /**
   * Calculates adjusted index after removal.
   *
   * @param {number} removedIndex - Index that was removed
   * @returns {number} Safe index for current selection
   * @private
   */
  _calculateAdjustedIndex (removedIndex) {
    return removedIndex > 0 ? removedIndex - 1 : 0
  }

  /**
   * Notifies listeners of weapon removal.
   *
   * @param {string} oldCursor - Previous cursor
   * @returns {void}
   * @private
   */
  _notifyWeaponRemoved (oldCursor) {
    this.notifyCursorChange(oldCursor)
    if (this.isOutOfAmmo) {
      this.onOutOfAllAmmo()
    }
  }
}
