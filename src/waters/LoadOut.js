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
 * @property {Weapon} weapon - The weapon object
 * @property {number} ammo - Current ammo count
 * @property {function(): number} ammoCapacity - Total ammo capacity
 * @property {function(): number} hasAmmoRemaining - Remaining ammo count
 * @property {function(): void} useAmmo - Consumes ammo
 * @property {function(): Weapon} getUnattachedWeapon - Gets unattached weapon
 * @property {function(): boolean} hasAmmo - Checks if has ammo
 */

/**
 * @typedef {Object} ViewModel
 * @property {function(number, number): HTMLElement} gridCellAt - Gets grid cell at coordinates
 * @property {function(): number} cellSizeScreen - Gets cell size for screen
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
 * @property {WeaponSystem} weaponSystem - Current weapon system
 * @property {number} index - Current index
 */

/**
 * Manages weapon loadouts, ammo tracking, and firing logic for ships in the game.
 * Handles both attached and unattached weapons, cursor management, and weapon selection.
 */
export class LoadOut {
  /**
   * Initializes the LoadOut with weapons, ships, view model, and step count.
   * @param {Weapon[]} weapons - Array of unattached weapons
   * @param {Ship[]} ships - Array of ships with attached weapons
   * @param {ViewModel} viewModel - The view model for grid interactions
   * @param {{fire: () => void}} steps - The steps object
   */
  constructor (weapons, ships, viewModel, steps) {
    this.onOutOfAllAmmo = Function.prototype
    this.onOutOfAmmo = Function.prototype
    this.onCursorChangeCallback = Function.prototype
    this.onDestroy = LoadOut.givesNoResult
    this.steps = steps
    this.onReveal = LoadOut.givesNoResult
    this.onSound = Function.prototype
    this.currentWeaponIndex = 0
    this.viewModel = viewModel
    const hasAttachedWeapons = ships.length > 0
    this.hasAttachedWeapons = hasAttachedWeapons
    this.isRackSelectable = !bh.seekingMode && hasAttachedWeapons
    const hasUnattachedWeapons = weapons.length > 0
    this.hasUnattachedWeapons = hasUnattachedWeapons
    this.selectedWeapon = null
    this.hintCoordinates = []
    this.selectedCoordinates = []
    this.weaponDictionary = {}
    this.unattachedWeapons = weapons
    this.ships = ships
    this.loadWeapons()
    this.allWeaponSystems = [...this.weaponSystems]
    this.launch = LoadOut.launchDefault.bind(this, this.viewModel)
  }

  /**
   * Creates a standard fire result object.
   * @param {number} [shots=0] - Number of shots fired
   * @param {number} [doubleTap=0] - Double tap count
   * @returns {FireResult} The result object
   */
  static createResult (shots = 0, doubleTap = 0) {
    return { hits: 0, shots, reveals: 0, sunk: '', dtap: doubleTap, info: '' }
  }

  /** @returns {FireResult} Double tap result */
  static get doubleTapResult () {
    return this.createResult(0, 1)
  }

  /** @returns {FireResult} No result */
  static get noResult () {
    return this.createResult(0, 0)
  }

  /** @returns {FireResult} Miss result */
  static get missResult () {
    return this.createResult(1, 0)
  }

  /** @returns {function(): FireResult} Function returning no result */
  static get givesNoResult () {
    return () => {
      return this.noResult
    }
  }

  /**
   * Default launch animation for weapons.
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
      viewModel.cellSizeScreen(),
      null,
      null
    )
  }
  /**
   * Loads and organizes weapon systems from unattached weapons and ships.
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
   * @param {WeaponSystem[]} unattachedSystems - Unattached weapon systems
   * @returns {Object<string, WeaponSystem>} Weapon dictionary by letter
   */
  buildWeaponDictionary (unattachedSystems) {
    const weaponByLetter = this.createLetterMap(unattachedSystems)
    return this.addAttachedWeapons(weaponByLetter)
  }

  /**
   * Creates a map of weapon systems keyed by weapon letter.
   * @param {WeaponSystem[]} weaponSystems - Weapon systems to map
   * @returns {Object<string, WeaponSystem>} Letter-keyed map
   */
  createLetterMap (weaponSystems) {
    return weaponSystems.reduce((map, weaponSystem) => {
      map[weaponSystem.weapon.letter] = weaponSystem
      return map
    }, {})
  }

  /**
   * Adds attached weapons from ships to the dictionary.
   * @param {Object<string, WeaponSystem>} weaponByLetter - Existing dictionary
   * @returns {Object<string, WeaponSystem>} Updated dictionary
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
   * @param {Weapon[]} weapons - Weapons to convert
   * @returns {WeaponSystem[]} Weapon systems
   */
  static createWeaponSystems (weapons) {
    return weapons.map(weapon => new WeaponSystem(weapon))
  }

  /**
   * Gets all ships that have remaining ammo.
   * @returns {Ship[]} Array of armed ships
   */
  getArmedShips () {
    return this.ships.filter(ship => ship.hasAmmoRemaining())
  }
  getUnattachedWeaponSystem () {
    return this.getCurrentWeaponSystem()?.getUnattachedWeapon()
  }
  getLimitedWeaponSystems () {
    return this.weaponSystems.filter(wps => wps.weapon.isLimited)
  }
  getAllLimitedWeaponSystems () {
    return this.allWeaponSystems.filter(wps => wps.weapon.isLimited)
  }

  getAmmoCapacity () {
    return this.getLimitedWeaponSystems().reduce(
      (acc, wps) => acc + wps.ammoCapacity(),
      0
    )
  }
  ammoRemaining () {
    return this.getLimitedWeaponSystems().reduce(
      (acc, wps) => acc + wps.ammoRemaining(),
      0
    )
  }
  reloadWeapons (weapons) {
    this.unattachedWeapons = weapons
    this.loadWeapons()
  }
  /**
   * Gets the current weapon system.
   * @returns {WeaponSystem} Current weapon system
   */
  getCurrentWeaponSystem () {
    return this.weaponSystems[this.currentWeaponIndex]
  }
  getSingleShotWps () {
    return this.weaponSystems[0]
  }
  getSingleShot () {
    return this.weaponSystems[0].weapon
  }
  getCurrentWeapon () {
    return this.getCurrentWeaponSystem().weapon
  }
  hasWeaponByLetter (weaponLetter) {
    return weaponLetter in this.weaponByLetter
  }

  getNextWeapon (weaponLetter) {
    if (weaponLetter) {
      let idx = this.getWeaponIndexForLetter(weaponLetter)
      if (idx < 0) {
        idx = 0
      }
      const nextIdx = this.getNextWeaponIndex(idx)
      const nextWeaponSystem = this.weaponSystems[nextIdx]
      return nextWeaponSystem?.weapon
    }
    return this.getNextWeaponSystem().weapon
  }

  isOutOfAmmo () {
    return this.weaponSystems.length <= 1
  }
  hasNoCurrentAmmo () {
    return !this.hasCurrentAmmo()
  }
  /**
   * Checks if current weapon has ammo.
   * @returns {boolean} True if has current ammo
   */
  hasCurrentAmmo () {
    return this.weaponHasAmmo(this.getCurrentWeaponSystem())
  }

  /**
   * Checks if a weapon system has ammo.
   * @param {WeaponSystem} weaponSystem - Weapon system to check
   * @returns {boolean} True if has ammo
   */
  weaponHasAmmo (weaponSystem) {
    if (!weaponSystem?.weapon.isLimited) return true
    return weaponSystem.hasAmmoRemaining()
  }
  hasAllAmmo () {
    const currentWeaponSystem = this.getCurrentWeaponSystem()
    if (!currentWeaponSystem.weapon.isLimited) return true
    return this.ammoRemaining() > 0
  }
  useAmmo (weaponSystem) {
    const wps = weaponSystem || this.getCurrentWeaponSystem()
    if (!wps.weapon.isLimited) return
    wps.useAmmo()
    this.checkNoAmmo()
  }

  checkNoAmmo () {
    if (this.hasNoCurrentAmmo()) {
      this.removeCurrentWeaponSystem()
      return true
    }
    return false
  }
  checkAllAmmo () {
    for (const wps of this.getLimitedWeaponSystems()) {
      if (!wps.hasAmmoRemaining()) {
        this.removeCurrentWeaponSystem()
      }
    }
  }
  getAllCursors () {
    return this.weaponSystems
      .flatMap(wps => wps.weapon.cursors)
      .filter(cursor => cursor !== '')
  }
  /**
   * Gets current cursor information.
   * @returns {CursorInfo} Cursor info object
   */
  getCurrentCursorInfo () {
    const weaponSystem = this.getCurrentWeaponSystem()
    const weapon = weaponSystem.weapon
    const currentIndex = this.selectedCoordinates.length

    if (this.isCursorSelectionComplete(currentIndex, weapon)) {
      return { cursor: '', weaponSystem, index: -1 }
    }

    return {
      cursor: weapon.cursors[currentIndex],
      weaponSystem,
      index: currentIndex
    }
  }

  /**
   * Checks if cursor selection is complete.
   * @param {number} currentIndex - Current selection index
   * @param {Weapon} weapon - Weapon to check
   * @returns {boolean} True if complete
   */
  isCursorSelectionComplete (currentIndex, weapon) {
    return (
      currentIndex >= weapon.points || currentIndex >= weapon.cursors.length
    )
  }
  getCurrentCursor () {
    return this.getCurrentCursorInfo().cursor
  }
  notifyCursorChange (oldCursor) {
    this.onCursorChangeCallback(oldCursor, this.getCurrentCursorInfo())
  }
  /**
   * Removes the current weapon system.
   */
  removeCurrentWeaponSystem () {
    const oldCursor = this.getCurrentCursor()
    this.removeWeaponAtIndex(this.currentWeaponIndex)
    this.notifyWeaponRemoved(oldCursor)
  }

  /**
   * Removes weapon at specific index.
   * @param {number} index - Index to remove
   */
  removeWeaponAtIndex (index) {
    this.weaponSystems.splice(index, 1)
    if (index >= this.weaponSystems.length) {
      this.currentWeaponIndex = 0
    }
  }

  /**
   * Notifies of weapon removal.
   * @param {string} oldCursor - Old cursor
   */
  notifyWeaponRemoved (oldCursor) {
    this.onOutOfAmmo()
    this.notifyCursorChange(oldCursor)
    if (this.isOutOfAmmo()) {
      this.onOutOfAllAmmo()
    }
  }

  getFirstRack () {
    return this.ships[0]?.getFirstLoadedWeapon()
  }
  getShipByWeaponId (weaponId) {
    return this.ships.find(
      ship => ship.getWeaponBySystemId(weaponId) !== undefined
    )
  }
  getWeaponBySystemId (rackId) {
    const loadedWeapons = this.getLoadedWeapons()
    const foundWeapon = loadedWeapons.find(rack => rack.id === rackId)
    return foundWeapon
  }
  getAllRacks () {
    return this.ships.flatMap(ship => ship.getAllWeapons())
  }
  getShipById (shipId) {
    return this.ships.find(ship => ship.id === shipId)
  }

  getLoadedWeapons () {
    return this.ships.flatMap(ship => ship.getLoadedWeapons())
  }
  switchToPreferredWeapon () {
    const preferences = bh.maps.weaponPreference
    for (const [letter, op] of preferences) {
      if (this.switchToWeapon(letter)) {
        return op
      }
    }
    return null
  }
  setCurrentWeaponIndex (idx) {
    const oldCursor = this.getCurrentCursor()
    this.currentWeaponIndex = idx
    this.onOutOfAmmo()
    this.notifyCursorChange(oldCursor)
  }
  /**
   * Gets weapon index for a letter.
   * @param {string} weaponLetter - Weapon letter
   * @returns {number} Index or -1
   */
  getWeaponIndexForLetter (weaponLetter) {
    return this.weaponSystems.findIndex(weaponSystem =>
      this.isWeaponAvailable(weaponSystem, weaponLetter)
    )
  }

  /**
   * Checks if weapon is available.
   * @param {WeaponSystem} weaponSystem - Weapon system
   * @param {string} weaponLetter - Weapon letter
   * @returns {boolean} True if available
   */
  isWeaponAvailable (weaponSystem, weaponLetter) {
    const isCorrectLetter = weaponSystem.weapon.letter === weaponLetter
    const hasAmmo = !weaponSystem.weapon.isLimited || weaponSystem.ammo > 0
    return isCorrectLetter && hasAmmo
  }
  /**
   * Checks if weapon letter has ammo.
   * @param {string} weaponLetter - Weapon letter
   * @returns {boolean} True if has ammo
   */
  hasAmmoForWeaponLetter (weaponLetter) {
    const weaponSystem = this.weaponByLetter[weaponLetter]
    if (!weaponSystem) return false
    return weaponSystem.hasAmmo ? weaponSystem.hasAmmo() : false
  }
  switchToWeapon (weaponLetter) {
    const idx = this.getWeaponIndexForLetter(weaponLetter)
    if (idx < 0) return false
    this.setCurrentWeaponIndex(idx)
    return true
  }
  get isSingleShot () {
    return this.currentWeaponIndex === 0
  }
  switchToSingleShot () {
    this.setCurrentWeaponIndex(0)
    return true
  }
  getNextWeaponSystem () {
    return this.weaponSystems[this.getNextWeaponIndex()]
  }
  moveToNextWeaponIndex () {
    this.setCurrentWeaponIndex(this.getNextWeaponIndex())
  }

  /**
   * Gets next weapon index.
   * @param {number} [currentIndex] - Current index
   * @returns {number} Next index
   */
  getNextWeaponIndex (currentIndex = null) {
    const index = (currentIndex ?? this.currentWeaponIndex) + 1
    return index >= this.weaponSystems.length ? 0 : index
  }

  clearSelectedCoordinates () {
    const oldCursor = this.getCurrentCursor()
    this.selectedCoordinates = []
    let unattachedWeaponSystem = this.getUnattachedWeaponSystem()
    if (bh.seekingMode && !unattachedWeaponSystem) {
      unattachedWeaponSystem = this.getFirstRack()
    }
    if (
      unattachedWeaponSystem &&
      unattachedWeaponSystem.weapon.unattachedCursor > 0
    ) {
      this.addSelectedCoordinates(-1, -1)
      return
    }
    this.notifyCursorChange(oldCursor)
    this.selectableWeapon = this.getFirstRack()
  }
  addSelectedCoordinates (row, col) {
    const oldCursor = this.getCurrentCursor()
    this.selectedCoordinates.push([row, col])
    this.notifyCursorChange(oldCursor)
  }
  switchToNextWeaponSystem () {
    this.moveToNextWeaponIndex()
    this.clearSelectedCoordinates()
  }
  switchWeapon () {
    this.switchToNextWeaponSystem()
    return this.getCurrentWeapon()
  }
  getCursorIndex () {
    return this.selectedCoordinates.length
  }
  isArmed () {
    const isHideMode = !bh.seekingMode
    const selected = this.selectedWeapon
    return (
      isHideMode &&
      selected &&
      this.selectedCoordinates.length >= selected.weapon.postSelectCursor
    )
  }
  isNotArming () {
    return !this.isRackSelectable
  }
  isArming () {
    return !this.isNotArming()
  }
  async aimWeapon (map, row, col, weaponSystem, launch = this.launch) {
    const info = this.firingInfoIfReady(map, row, col, weaponSystem)
    if (info) {
      const { fireCoordinates, fireWeapon, wps, weapon } = info

      this.steps.fire()
      const launchInfo = await launch(fireCoordinates, weapon, wps)
      const score = fireWeapon(launchInfo?.target)
      return { weapon, score }
    }
  }
  firingInfo (wps, map) {
    const fireCoordinates = structuredClone(this.selectedCoordinates)
    this.selectedWeapon = null
    this.clearSelectedCoordinates()
    this.useAmmo(wps)
    this.checkNoAmmo()
    const fireWeapon = this.fireWeapon.bind(this, map, fireCoordinates, wps)
    return { fireCoordinates, fireWeapon }
  }
  firingInfoIfReady (map, row, col, weaponSystem) {
    const wps = weaponSystem || this.getCurrentWeaponSystem()
    const weapon = wps.weapon
    const requiredPoints = weapon.points
    this.addSelectedCoordinates(row, col)

    if (this.hasUnattachedWeapons) {
      this.selectedWeapon = wps
    }
    if (this.selectedCoordinates.length === requiredPoints) {
      const { fireCoordinates, fireWeapon } = this.firingInfo(wps, map)
      return { fireCoordinates, fireWeapon, wps, weapon }
    }

    return null
  }

  aimSingleShotInfo (sShot, row, col) {
    sShot = sShot || this.getSingleShotWps()
    const weapon = sShot.weapon
    const fireSingleShot = this.fireSingleShot.bind(this, [row, col], sShot)
    const coordinates = [[row, col, 4]]
    return { fireSingleShot, wps: sShot, coordinates, weapon }
  }

  dismissSelection () {
    this.clearSelectedCoordinates()
  }
  fireSingleShot (coordinates, sShot) {
    const { weapon, affectedLoc } = this.fireSingleShotInfo(sShot, coordinates)
    return this.onDestroy(weapon, [affectedLoc])
  }
  fireSingleShotInfo (sShot, coordinates) {
    sShot = sShot || this.getSingleShotWps()
    const c = coordinates || this.coord
    const weapon = sShot.weapon
    const affectedLoc = [...c, 4]
    return { weapon, affectedLoc, sShot }
  }

  fireWeapon (map, coordinates, weaponSystem, target) {
    const { weapon, affectedArea } = this.fireWeaponInfo(
      coordinates,
      weaponSystem,
      map
    )

    return this.fireAoE(weapon, affectedArea, target)
  }
  fireAoE (weapon, affectedArea, target) {
    if (weapon.destroys) {
      if (weapon.isOneAndDone) {
        return this.onDestroyOneOfMany(weapon, affectedArea, target)
      }
      return this.onDestroy(weapon, affectedArea)
    }
    return this.onReveal(weapon, affectedArea)
  }
  fireWeaponInfo (coordinates, weaponSystem, map) {
    const c = coordinates || this.coord
    const wps = weaponSystem || this.getCurrentWeaponSystem()
    const weapon = wps.weapon
    const affectedArea = weapon.aoe(map, c)
    return { weapon, affectedArea }
  }

  onDestroyOneOfMany (weapon, affectedArea, target) {
    // Implement the logic for destroying a single target
    // This method can be expanded for more granular control
    return this.onDestroy(weapon, affectedArea, target)
  }
}
