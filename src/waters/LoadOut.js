import { bh } from '../terrains/all/js/bh.js'
import { WeaponSystem, AttachedWeaponSystems } from '../weapon/WeaponSystem.js'

/**
 * @typedef {Object} Weapon
 * @property {string} letter - Weapon identifier letter
 * @property {boolean} isLimited - Whether the weapon has limited ammo
 * @property {number} points - Number of points required for firing
 * @property {string[]} cursors - Cursor types for selection
 * @property {function} aoe - Area of effect function
 * @property {boolean} destroys - Whether the weapon destroys targets
 * @property {boolean} isOneAndDone - Whether the weapon is single-use
 * @property {number} unattachedCursor - Cursor value for unattached weapons
 * @property {number} postSelectCursor - Cursor value after selection
 * @property {number} postSelectCoords - Number of coordinates after post-selection
 * @property {function(Object, number[]): Object} aoePlus - Computes affected area
 * @property {function(HTMLElement, number, null, null): Promise<Object>} animateExplodeRaw - Explosion animation
 */

/**
 * @typedef {Object} Ship
 * @property {string} id - Ship identifier
 * @property {function(): boolean} hasAmmoRemaining - Checks if ship has ammo
 * @property {function(): Weapon} getPrimaryWeapon - Gets the primary weapon
 * @property {function(string): Weapon} getWeaponBySystemId - Gets weapon by system ID
 * @property {function(): Weapon[]} getAllWeapons - Gets all weapons on ship
 * @property {function(): Weapon[]} getLoadedWeapons - Gets loaded weapons
 * @property {function(): Weapon} getFirstLoadedWeapon - Gets first loaded weapon
 */

/**
 * @typedef {Object} WeaponsSystem
 * @property {Weapon} weapon - The weapon object
 * @property {number} ammo - Current ammo count
 * @property {function(): number} ammoCapacity - Total ammo capacity
 * @property {function(): number} ammoRemaining - Remaining ammo count
 * @property {function(): boolean} hasAmmoRemaining - Checks if has ammo remaining
 * @property {function(): void} useAmmo - Consumes ammo
 * @property {function(): WeaponsSystem|undefined} getUnattachedWeapon - Gets unattached weapon
 * @property {function(): boolean} hasAmmo - Checks if has ammo
 */

/**
 * @typedef {Object} ViewModel
 * @property {function(number, number): HTMLElement} gridCellAt - Gets grid cell at coordinates
 * @property {function(): number} cellSize - Gets cell size for screen
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
 * @typedef {Object} FiringInfo
 * @property {number[][]} fireCoordinates - Target coordinates
 * @property {function(Object): Promise<FireResult>} fireWeapon - Weapon firing function
 * @property {WeaponsSystem} [wps] - Weapon system being fired
 * @property {Weapon} [weapon] - Weapon being fired
 * @property {boolean} [hasUnattached] - Whether unattached weapon is involved
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
    this.currentWeaponIndex = 0
    this.selectedWeapon = null
    this.weaponDictionary = {}

    // Selection and targeting state
    this.selectedCoordinates = []
    this.hintCoordinates = []
    this.selectableWeapon = null

    // Data sources
    this.unattachedWeapons = weapons
    this.ships = ships

    // Capability flags
    const hasAttachedWeapons = ships.length > 0
    this.hasAttachedWeapons = hasAttachedWeapons
    this.isRackSelectable = !bh.seekingMode && hasAttachedWeapons
    this.hasUnattachedWeapons = weapons.length > 0

    // Firing mechanism binding
    this.launch = LoadOut.launchDefault.bind(this, this.viewModel)

    // Initialize weapon systems
    this.loadWeapons()
    this.allWeaponSystems = [...this.weaponSystems]
  }

  // ==================== Firing Workflow ====================

  /**
   * Aims weapon at target and executes firing if selection is complete.
   * HIGH-LEVEL: orchestrates the entire firing sequence.
   *
   * @param {Object} map - Game map
   * @param {number} row - Target row
   * @param {number} col - Target column
   * @param {WeaponsSystem} [weaponSystem] - Override weapon system
   * @param {function} [launch] - Custom launch animation (defaults to static method)
   * @returns {Promise<{weapon: Weapon, score: FireResult}|FiringInfo>} Firing result
   */
  async aimWeapon (map, row, col, weaponSystem, launch = this.launch) {
    const info = this.firingInfoIfReady(map, row, col, weaponSystem)
    if (info?.fireCoordinates) {
      const { fireCoordinates, fireWeapon, wps, weapon } = info

      this.steps.fire()
      const launchInfo = await launch(fireCoordinates, weapon, wps)
      const score = await fireWeapon(launchInfo?.target)
      return { weapon, score }
    }
    return info
  }

  /**
   * Builds firing info once weapon selection is complete.
   * CONSOLIDATED: unified firing info collection and validation.
   *
   * @param {Object} map - Game map
   * @param {number} row - Selected row
   * @param {number} col - Selected column
   * @param {WeaponsSystem} [weaponSystem] - Override weapon system
   * @returns {FiringInfo|null} Complete firing info if ready, null/partial if still selecting
   */
  firingInfoIfReady (map, row, col, weaponSystem) {
    let wps = weaponSystem || this.getCurrentWeaponSystem()
    const weapon = wps?.weapon
    this.addSelectedCoordinates(row, col, weapon)

    const unattachedWeaponSystem = this.getUnattachedWeaponSystem()
    const hasUnattached = unattachedWeaponSystem != null

    if (unattachedWeaponSystem) {
      this.selectedWeapon = unattachedWeaponSystem
      wps = unattachedWeaponSystem
    }

    // Selection complete - build firing info
    if (this._isSelectionComplete(wps, hasUnattached)) {
      const { fireCoordinates, fireWeapon } = this._buildFiringInfo(wps, map)
      return { fireCoordinates, fireWeapon, wps, weapon: wps.weapon }
    }

    // Still selecting - continue targeting
    this.steps?.targetting()

    if (unattachedWeaponSystem) {
      return { hasUnattached: true }
    }
    return null
  }

  /**
   * Checks if weapon selection is complete.
   * Compares selected coordinates against weapon point requirements.
   *
   * @param {WeaponsSystem} weaponSystem - Weapon being checked
   * @param {boolean} hasUnattached - Whether unattached weapon is involved
   * @returns {boolean} True if selection is complete
   * @privates
   */
  _isSelectionComplete (weaponSystem, hasUnattached) {
    const neededPoints = weaponSystem.weapon.points
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
    const fireCoordinates = structuredClone(this.selectedCoordinates)
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
   * @returns {function(Object): Promise<FireResult>} Function to execute firing
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
   * @param {Object} target - Target information
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
   *
   * @param {number[][]} coordinates - Target coordinates
   * @param {WeaponsSystem} weaponSystem - Weapon system
   * @param {Object} map - Game map
   * @returns {{weapon: Weapon, affectedArea: Array, options: Object}} Fire info
   * @private
   */
  _computeFireWeaponInfo (coordinates, weaponSystem, map) {
    const c = coordinates || this.selectedCoordinates
    const wps = weaponSystem || this.getCurrentWeaponSystem()
    const weapon = wps.weapon
    const { affectedArea, options } = weapon.aoePlus(map, c)
    return { weapon, affectedArea, options }
  }

  /**
   * Executes the area-of-effect firing.
   * IMPROVED: clearer routing logic for different weapon types.
   *
   * @param {Weapon} weapon - Weapon being fired
   * @param {Array} affectedArea - Affected cells
   * @param {Object} target - Target information
   * @param {Object} options - Weapon options
   * @returns {Promise<FireResult>} Result of execution
   * @private
   */
  _executeFireWeaponAoE (weapon, affectedArea, target, options) {
    if (weapon.destroys) {
      if (weapon.isOneAndDone) {
        return this.onDestroyOneOfMany(weapon, affectedArea, target, options)
      }
      return this.onDestroy(weapon, affectedArea, options)
    }
    return this.onReveal(weapon, affectedArea, options)
  }

  /**
   * Handles destruction of a single target from many (secondary weapon logic).
   *
   * @param {Weapon} weapon - Weapon being fired
   * @param {Array} affectedArea - Affected cells
   * @param {Object} target - Target information
   * @param {Object} options - Weapon options
   * @returns {Promise<FireResult>} Result of firing
   */
  onDestroyOneOfMany (weapon, affectedArea, target, options) {
    return this.onDestroy(weapon, affectedArea, target || options)
  }

  /**
   * Fires single-shot weapon at coordinates.
   *
   * @param {number[][]} coordinates - Target coordinates
   * @param {WeaponsSystem} [sShot] - Single shot weapon (defaults to index 0)
   * @returns {Promise<FireResult>} Result of firing
   */
  fireSingleShot (coordinates, sShot) {
    const { weapon, affectedLoc, wps } = this._buildSingleShotInfo(
      sShot,
      coordinates
    )
    return this.onDestroy(weapon, [affectedLoc], { isSingleShot: true, wps })
  }

  /**
   * Builds single-shot weapon firing info.
   *
   * @param {WeaponsSystem} [sShot] - Single shot weapon
   * @param {number[][]} [coordinates] - Target coordinates
   * @returns {{weapon: Weapon, affectedLoc: Array, wps: WeaponsSystem}} Single shot info
   * @private
   */
  _buildSingleShotInfo (sShot, coordinates) {
    sShot = sShot || this.getSingleShotWps()
    const c = coordinates || this.selectedCoordinates
    const weapon = sShot.weapon
    const affectedLoc = [...c, 4]
    return { weapon, affectedLoc, wps: sShot }
  }

  /**
   * Gets info for single-shot aiming interaction.
   *
   * @param {WeaponsSystem} [sShot] - Single shot weapon
   * @param {number} row - Target row
   * @param {number} col - Target column
   * @returns {{fireSingleShot: function, wps: WeaponsSystem, coordinates: number[][], weapon: Weapon}} Aim info
   */
  aimSingleShotInfo (sShot, row, col) {
    sShot = sShot || this.getSingleShotWps()
    const weapon = sShot.weapon
    const fireSingleShot = this.fireSingleShot.bind(this, [row, col], sShot)
    const coordinates = [[row, col, 4]]
    return { fireSingleShot, wps: sShot, coordinates, weapon }
  }

  // ==================== Ship/Rack Management ====================

  /**
   * Gets first loaded weapon from first ship.
   *
   * @returns {Weapon|undefined} First weapon or undefined
   */
  getFirstRack () {
    return this.ships[0]?.getFirstLoadedWeapon()
  }

  /**
   * Finds ship by weapon system ID.
   *
   * @param {string} weaponId - Weapon system ID
   * @returns {Ship|undefined} Ship with weapon
   */
  getShipByWeaponId (weaponId) {
    return this.ships.find(
      ship => ship.getWeaponBySystemId(weaponId) !== undefined
    )
  }

  /**
   * Gets weapon by system ID from loaded weapons.
   *
   * @param {string} rackId - Rack/weapon system ID
   * @returns {Weapon|undefined} Matching weapon
   */
  getWeaponBySystemId (rackId) {
    const loadedWeapons = this.getLoadedWeapons()
    const foundWeapon = loadedWeapons.find(rack => rack.id === rackId)
    return foundWeapon
  }

  /**
   * Gets all loaded weapons across all ships.
   *
   * @returns {Weapon[]} All loaded weapons
   */
  getLoadedWeapons () {
    return this.ships.flatMap(ship => ship.getLoadedWeapons())
  }

  /**
   * Gets all weapons across all ships.
   *
   * @returns {Weapon[]} All weapons
   */
  getAllRacks () {
    return this.ships.flatMap(ship => ship.getAllWeapons())
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

  /** @static @returns {FireResult} Double tap result */
  static get doubleTapResult () {
    return this.createResult(0, 1)
  }

  /** @static @returns {FireResult} No result */
  static get noResult () {
    return this.createResult(0, 0)
  }

  /** @static @returns {FireResult} Miss result */
  static get missResult () {
    return this.createResult(1, 0)
  }

  /** @static @returns {function(): FireResult} Function returning no result */
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
    const targetCoordinates = coordinates.at(-1)
    const targetCell = viewModel.gridCellAt(
      targetCoordinates[0],
      targetCoordinates[1]
    )
    return weapon.animateExplodeRaw(
      targetCell,
      viewModel.cellSize(),
      null,
      null
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
   * Attached weapons override unattached ones with the same letter.
   *
   * @param {WeaponsSystem[]} unattachedSystems - Unattached weapon systems
   * @returns {Object<string, WeaponsSystem>} Weapon dictionary indexed by letter
   * @private
   */
  buildWeaponDictionary (unattachedSystems) {
    const weaponByLetter = this.createLetterMap(unattachedSystems)
    return this.addAttachedWeapons(weaponByLetter)
  }

  /**
   * Creates a map of weapon systems keyed by weapon letter.
   *
   * @param {WeaponsSystem[]} weaponSystems - Weapon systems to map
   * @returns {Object<string, WeaponsSystem>} Letter-keyed map
   * @private
   */
  createLetterMap (weaponSystems) {
    return weaponSystems.reduce((map, weaponSystem) => {
      map[weaponSystem.weapon.letter] = weaponSystem
      return map
    }, {})
  }

  /**
   * Adds attached weapons from ships to the dictionary.
   * Attached weapons of same letter create multi-system entries.
   *
   * @param {Object<string, WeaponsSystem>} weaponByLetter - Existing dictionary
   * @returns {Object<string, WeaponsSystem>} Updated dictionary with attached weapons
   * @private
   */
  addAttachedWeapons (weaponByLetter) {
    return this.ships.reduce((map, ship) => {
      const weapon = ship.getPrimaryWeapon()
      if (weapon) {
        const key = weapon.letter
        map[key] = map[key]
          ? WeaponSystem.build(map[key], ship)
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
    return weapons.map(weapon => new WeaponSystem(weapon))
  }

  /**
   * Gets all ships with remaining ammo.
   *
   * @returns {Ship[]} Array of ships with ammo remaining
   */
  getArmedShips () {
    return this.ships.filter(ship => ship.hasAmmoRemaining())
  }

  /**
   * Gets the unattached weapon system for the current selection.
   *
   * @returns {WeaponsSystem|undefined} Unattached weapon system if available
   */
  getUnattachedWeaponSystem () {
    return this.getCurrentWeaponSystem()?.getUnattachedWeapon()
  }

  /**
   * Gets weapon systems that have limited ammo (current set).
   *
   * @returns {WeaponsSystem[]} Limited weapon systems in current arsenal
   */
  getLimitedWeaponSystems () {
    return this.weaponSystems.filter(wps => wps.weapon.isLimited)
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
      (acc, wps) => acc + wps.ammoCapacity(),
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
      (acc, wps) => acc + wps.ammoRemaining(),
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
    if (!weaponSystem?.weapon.isLimited) return true
    return weaponSystem.hasAmmoRemaining()
  }

  /**
   * Checks if a specific weapon letter has ammo available.
   * CONSOLIDATED: replaces duplicate ammo validation logic.
   *
   * @param {string} weaponLetter - Weapon letter to check
   * @returns {boolean} True if weapon exists and has ammo
   */
  hasAmmoForWeaponLetter (weaponLetter) {
    const weaponSystem = this.weaponByLetter[weaponLetter]
    if (!weaponSystem) return false
    return this._canWeaponFire(weaponSystem)
  }

  /**
   * Checks if a weapon is available for firing.
   * CONSOLIDATED: unifies weapon availability checks across different contexts.
   *
   * @param {WeaponsSystem} weaponSystem - Weapon system to check
   * @param {string} weaponLetter - Weapon letter to match
   * @returns {boolean} True if letter matches and weapon has ammo
   * @private
   */
  _isWeaponAvailable (weaponSystem, weaponLetter) {
    const isCorrectLetter = weaponSystem.weapon.letter === weaponLetter
    const hasAmmo = this._canWeaponFire(weaponSystem)
    return isCorrectLetter && hasAmmo
  }

  /**
   * Gets the current weapon system by index.
   *
   * @returns {WeaponsSystem} Current weapon system
   */
  getCurrentWeaponSystem () {
    return this.weaponSystems[this.currentWeaponIndex]
  }

  /**
   * Gets the current weapon.
   * CONSOLIDATED: replaces multiple similar getter methods.
   *
   * @returns {Weapon} Current weapon
   */
  getCurrentWeapon () {
    return this.getCurrentWeaponSystem().weapon
  }

  /**
   * Gets the first/single-shot weapon system (index 0).
   *
   * @returns {WeaponsSystem} Single shot weapon system
   */
  getSingleShotWps () {
    return this.weaponSystems[0]
  }

  /**
   * Gets the first/single-shot weapon.
   *
   * @returns {Weapon} Single shot weapon
   */
  getSingleShot () {
    return this.weaponSystems[0].weapon
  }

  /**
   * Gets next weapon system in rotation.
   *
   * @returns {WeaponsSystem} Next weapon system
   */
  getNextWeaponSystem () {
    return this.weaponSystems[this.getNextWeaponIndex()]
  }

  /**
   * Calculates next weapon index with wraparound.
   * UNIFIED: single source of truth for index rotation logic.
   *
   * @param {number} [currentIndex=null] - Starting index (defaults to current)
   * @returns {number} Next index with wraparound
   * @private
   */
  _getNextWeaponIndex (currentIndex = null) {
    const index = (currentIndex ?? this.currentWeaponIndex) + 1
    return index >= this.weaponSystems.length ? 0 : index
  }

  /**
   * Gets the next weapon based on current or specified starting point.
   *
   * @param {string} [weaponLetter] - Optional letter to find and advance from
   * @returns {Weapon|undefined} Next weapon or undefined if none available
   */
  getNextWeapon (weaponLetter) {
    if (weaponLetter) {
      let idx = this.getWeaponIndexForLetter(weaponLetter)
      if (idx < 0) {
        idx = 0
      }
      const nextIdx = this._getNextWeaponIndex(idx)
      const nextWeaponSystem = this.weaponSystems[nextIdx]
      return nextWeaponSystem?.weapon
    }
    return this.getNextWeaponSystem().weapon
  }

  /**
   * Gets the index of a weapon by its letter.
   *
   * @param {string} weaponLetter - Weapon letter to find
   * @returns {number} Index of weapon or -1 if not found
   * @private
   */
  _getWeaponIndexForLetter (weaponLetter) {
    return this.weaponSystems.findIndex(weaponSystem =>
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
    return weaponLetter in this.weaponByLetter
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
    const oldCursor = this.getCurrentCursor()
    this.currentWeaponIndex = idx
    this.notifyCursorChange(oldCursor)
  }

  /**
   * Switches to a weapon by letter.
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
   *
   * @returns {boolean} Always true (single shot always available)
   */
  switchToSingleShot () {
    this._setCurrentWeaponIndex(0)
    return true
  }

  /**
   * Switches to the next weapon in sequence.
   * Consolidates weapon switching logic: single responsibility method.
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
    return this.getCurrentWeapon()
  }

  /**
   * Switches to next weapon (alias for switchToNextWeaponSystem).
   *
   * @returns {Weapon} The new current weapon
   * @deprecated Use switchToNextWeaponSystem() instead
   */
  switchWeapon () {
    return this.switchToNextWeaponSystem()
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
   *
   * @returns {*} Operation associated with preferred weapon or null
   */
  switchToPreferredWeapon () {
    const preferences = bh.maps.weaponPreference
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
    return this.weaponSystems
      .flatMap(wps => wps.weapon.cursors)
      .filter(cursor => cursor !== '')
  }

  /**
   * Gets information about the current cursor state.
   * IMPROVED: clearer logic for determining which cursor should display.
   *
   * @returns {CursorInfo} Object with cursor, weapon system, and index
   */
  getCurrentCursorInfo () {
    const weaponSystem = this.getCurrentWeaponSystem()
    const weapon = weaponSystem.weapon
    const currentIndex = this.selectedCoordinates.length
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
    return (
      currentIndex >= weapon.points || currentIndex >= weapon.cursors.length
    )
  }

  /**
   * Gets current cursor identifier.
   *
   * @returns {string} Cursor identifier
   */
  getCurrentCursor () {
    return this.getCurrentCursorInfo().cursor
  }

  /**
   * Notifies listeners of cursor change.
   *
   * @param {string} oldCursor - Previous cursor value
   */
  notifyCursorChange (oldCursor) {
    this.onCursorChangeCallback(oldCursor, this.getCurrentCursorInfo())
  }

  /**
   * Determines if unattached weapon should advance cursor on selection clear.
   *
   * @param {WeaponsSystem|undefined} unattachedWeaponSystem - Weapon to check
   * @returns {boolean} True if weapon uses unattached cursor advancement
   * @private
   */
  _shouldAdvanceUnattachedCursor (unattachedWeaponSystem) {
    return (
      unattachedWeaponSystem &&
      unattachedWeaponSystem.weapon.unattachedCursor > 0
    )
  }

  /**
   * Handles cursor state after clearing selection coordinates.
   * IMPROVED: clearer logic separation for unattached cursor handling.
   *
   * @param {string} oldCursor - Previous cursor
   * @param {WeaponsSystem|undefined} unattachedWeaponSystem - Unattached weapon
   * @private
   */
  _handleUnattachedCursorSelection (oldCursor, unattachedWeaponSystem) {
    if (this._shouldAdvanceUnattachedCursor(unattachedWeaponSystem)) {
      this.addSelectedCoordinates(-1, -1, unattachedWeaponSystem?.weapon)
      return
    }
    this.notifyCursorChange(oldCursor)
    this.selectableWeapon = this.getFirstRack()
  }

  /**
   * Adds a selected coordinate and updates cursor.
   *
   * @param {number} row - Row coordinate
   * @param {number} col - Column coordinate
   * @param {Weapon} [weapon] - Weapon being selected (defaults to current)
   */
  addSelectedCoordinates (row, col, weapon = this.getCurrentWeapon()) {
    const oldCursor = this.getCurrentCursor()
    this.selectedCoordinates.push([row, col])
    this.notifyCursorChange(oldCursor)
  }

  /**
   * Clears all selected coordinates and resets cursor.
   *
   */
  clearSelectedCoordinates () {
    const oldCursor = this.getCurrentCursor()
    this.selectedCoordinates = []
    let unattachedWeaponSystem = this.getUnattachedWeaponSystem()
    if (bh.seekingMode && !unattachedWeaponSystem) {
      unattachedWeaponSystem = this.getFirstRack()
    }
    if (!unattachedWeaponSystem) return
    this._handleUnattachedCursorSelection(oldCursor, unattachedWeaponSystem)
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
   */
  dismissSelection () {
    this.clearSelectedCoordinates()
  }

  /**
   * Checks if weapon is ready to fire (armed).
   * In hide mode, unattached weapon must be selected with sufficient coordinates.
   *
   * @returns {boolean} True if armed and ready
   */
  isArmed () {
    const isHideMode = !bh.seekingMode
    const selected = this.selectedWeapon
    return (
      isHideMode &&
      selected &&
      this.selectedCoordinates.length >= selected.weapon.postSelectCursor
    )
  }

  /**
   * Checks if arming is not possible (no rack selectable).
   *
   * @returns {boolean} True if cannot arm
   */
  isNotArming () {
    return !this.isRackSelectable
  }

  /**
   * Checks if arming is in progress or possible.
   *
   * @returns {boolean} True if can arm
   */
  isArming () {
    return !this.isNotArming()
  }
  /**
   * Consumes ammo for a weapon system.
   * Automatically removes weapon if ammo depleted.
   *
   * @param {WeaponsSystem} [weaponSystem] - Weapon to consume ammo from (defaults to current)
   */
  useAmmo (weaponSystem) {
    const wps = weaponSystem || this.getCurrentWeaponSystem()
    if (!wps.weapon.isLimited) return
    wps.useAmmo()
    this._checkAndRemoveExpiredWeapon()
  }

  /**
   * Checks if current weapon has ammo remaining.
   *
   * @returns {boolean} True if current weapon can fire
   */
  hasCurrentAmmo () {
    return this._canWeaponFire(this.getCurrentWeaponSystem())
  }

  /**
   * Checks if current weapon is out of ammo.
   *
   * @returns {boolean} True if no ammo left
   */
  hasNoCurrentAmmo () {
    return !this.hasCurrentAmmo()
  }

  /**
   * Checks if any weapon has remaining ammo.
   *
   * @returns {boolean} True if arsenal has ammo
   */
  hasAllAmmo () {
    const currentWeaponSystem = this.getCurrentWeaponSystem()
    if (!currentWeaponSystem.weapon.isLimited) return true
    return this.ammoRemaining() > 0
  }

  /**
   * Checks if all weapons are depleted (only single-shot remains).
   *
   * @returns {boolean} True if no other weapons available
   */
  isOutOfAmmo () {
    return this.weaponSystems.length <= 1
  }

  /**
   * Removes current weapon system if it has no ammo.
   * CONSOLIDATED: unified weapon expiration check.
   *
   * @returns {boolean} True if weapon was removed
   * @private
   */
  _checkAndRemoveExpiredWeapon () {
    if (this.hasNoCurrentAmmo()) {
      this._removeCurrentWeaponSystem()
      return true
    }
    return false
  }

  /**
   * Removes limited weapon systems with no ammo remaining.
   *
   */
  checkAllAmmo () {
    for (const wps of this.getLimitedWeaponSystems()) {
      if (!wps.hasAmmoRemaining()) {
        this._removeCurrentWeaponSystem()
      }
    }
  }

  /**
   * Removes the current weapon system at current index.
   * Notifies listeners and resets index if needed.
   * CONSOLIDATED: single source of truth for weapon removal.
   *
   * @private
   */
  _removeCurrentWeaponSystem () {
    const oldCursor = this.getCurrentCursor()
    this._removeWeaponAtIndex(this.currentWeaponIndex)
    this._notifyWeaponRemoved(oldCursor)
  }

  /**
   * Removes a weapon system at specific index.
   * Adjusts current index if needed.
   *
   * @param {number} index - Index to remove
   * @private
   */
  _removeWeaponAtIndex (index) {
    this.weaponSystems.splice(index, 1)
    if (index >= this.weaponSystems.length) {
      this.currentWeaponIndex = 0
    }
  }

  /**
   * Notifies listeners of weapon removal.
   *
   * @param {string} oldCursor - Previous cursor
   * @private
   */
  _notifyWeaponRemoved (oldCursor) {
    this.notifyCursorChange(oldCursor)
    if (this.isOutOfAmmo()) {
      this.onOutOfAllAmmo()
    }
  }
}
