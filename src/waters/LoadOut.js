import { bh } from '../terrains/all/js/bh.js'
import { WeaponSystem, AttachedWeaponSystems } from '../weapon/WeaponSystem.js'

export class LoadOut {
  constructor (weapons, ships, viewModel, steps) {
    this.onOutOfAllAmmo = Function.prototype
    this.onOutOfAmmo = Function.prototype
    this.onCursorChangeCallback = Function.prototype
    this.stepCount = steps
    this.onDestroy = LoadOut.givesNoResult
    this.onReveal = LoadOut.givesNoResult
    this.onSound = Function.prototype
    this.currentWeaponIndex = 0
    this.viewModel = viewModel
    const hasAttachedWeapons = ships.length > 0
    this.hasAttachedWeapons = hasAttachedWeapons
    this.isRackSelectable = !bh.seekingMode && hasAttachedWeapons
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
   * REFACTORING: Consolidated result object factory to eliminate duplication
   * All result objects follow same pattern with only minor variations
   */
  static createResult (shots = 0, doubleTap = 0) {
    return { hits: 0, shots, reveals: 0, sunk: '', dtap: doubleTap, info: '' }
  }

  static get doubleTapResult () {
    return this.createResult(0, 1)
  }

  static get noResult () {
    return this.createResult(0, 0)
  }

  static get missResult () {
    return this.createResult(1, 0)
  }
  static get givesNoResult () {
    return () => {
      return this.noResult
    }
  }
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
   * REFACTORING: Split weapon loading into focused steps
   * Improves testability and clarity
   */
  loadWeapons () {
    const unattachedWeaponSystems = LoadOut.createWeaponSystems(
      this.unattachedWeapons
    )
    this.weaponByLetter = this.buildWeaponDictionary(
      unattachedWeaponSystems
    )
    this.weaponSystems = Object.values(this.weaponByLetter)
  }

  /**
   * REFACTORING: Extract dictionary building logic from loadWeapons
   * Separates concerns: weapon system creation vs organization
   */
  buildWeaponDictionary (unattachedSystems) {
    const weaponByLetter = this.createLetterMap(unattachedSystems)
    return this.addAttachedWeapons(weaponByLetter)
  }

  /**
   * REFACTORING: Create letter-indexed map from unattached weapon systems
   */
  createLetterMap (weaponSystems) {
    return weaponSystems.reduce((map, weaponSystem) => {
      map[weaponSystem.weapon.letter] = weaponSystem
      return map
    }, {})
  }

  /**
   * REFACTORING: Merge attached weapons into the dictionary
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
  static createWeaponSystems (weapons) {
    return weapons.map(weapon => new WeaponSystem(weapon))
  }

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
      (acc, wps) => acc + wps.hasAmmoRemaining(),
      0
    )
  }
  reloadWeapons (weapons) {
    this.unattachedWeapons = weapons
    this.loadWeapons()
  }
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
   * REFACTORING: Simplified using helper to check ammo for any weapon system
   */
  hasCurrentAmmo () {
    return this.weaponHasAmmo(this.getCurrentWeaponSystem())
  }

  /**
   * REFACTORING: Extract weapon ammo checking logic used in multiple methods
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
   * REFACTORING: Improved naming and readability
   * Renamed wps to weaponSystem, idx to index for clarity
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
   * REFACTORING: Extract cursor completion check
   */
  isCursorSelectionComplete (currentIndex, weapon) {
    return currentIndex >= weapon.points || currentIndex >= weapon.cursors.length
  }
  getCurrentCursor () {
    return this.getCurrentCursorInfo().cursor
  }
  notifyCursorChange (oldCursor) {
    this.onCursorChangeCallback(oldCursor, this.getCurrentCursorInfo())
  }
  /**
   * REFACTORING: Split weapon removal into state mutation and notification
   * Improves clarity and reduces side effects
   */
  removeCurrentWeaponSystem () {
    const oldCursor = this.getCurrentCursor()
    this.removeWeaponAtIndex(this.currentWeaponIndex)
    this.notifyWeaponRemoved(oldCursor)
  }

  /**
   * REFACTORING: Extract index management from removal logic
   */
  removeWeaponAtIndex (index) {
    this.weaponSystems.splice(index, 1)
    if (index >= this.weaponSystems.length) {
      this.currentWeaponIndex = 0
    }
  }

  /**
   * REFACTORING: Extract notification logic from removal
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
   * REFACTORING: Improved naming and extracted validation logic
   */
  getWeaponIndexForLetter (weaponLetter) {
    return this.weaponSystems.findIndex(weaponSystem =>
      this.isWeaponAvailable(weaponSystem, weaponLetter)
    )
  }

  /**
   * REFACTORING: Extract weapon availability check
   * Clarifies the criteria: correct letter and has ammo if limited
   */
  isWeaponAvailable (weaponSystem, weaponLetter) {
    const isCorrectLetter = weaponSystem.weapon.letter === weaponLetter
    const hasAmmo = !weaponSystem.weapon.isLimited || weaponSystem.ammo > 0
    return isCorrectLetter && hasAmmo
  }
  /**
   * REFACTORING: Improved naming (wps -> weaponSystem)
   * Consistent return type handling
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
   * REFACTORING: Improved naming and clarity
   * Explicit parameter name and clearer logic
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
      const launchInfo = await launch(fireCoordinates, weapon, wps)
      return fireWeapon(launchInfo?.target)
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
