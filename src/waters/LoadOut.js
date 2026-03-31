import { bh } from '../terrain/bh.js'
import { WeaponSystem, AttachedWeaponSystems } from '../weapon/WeaponSystem.js'

export class LoadOut {
  constructor (weapons, ships, viewModel, steps) {
    this.onOutOfAllAmmo = Function.prototype
    this.onOutOfAmmo = Function.prototype
    this.stepCount = steps
    this.onDestroy = Function.prototype
    this.onReveal = Function.prototype
    this.onCursorChangeCallback = Function.prototype
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

  static launchDefault (viewModel, coordinates, weapon) {
    const targetCoordinates = coordinates.at(-1)
    const targetCell = viewModel.gridCellAt(
      targetCoordinates[0],
      targetCoordinates[1]
    )
    return weapon.animateExplode(
      targetCell,
      null,
      null,
      viewModel.cellSizeScreen(),
      null,
      null
    )
  }
  loadWeapons () {
    const unattachedWeaponSystems = LoadOut.createWeaponSystems(
      this.unattachedWeapons
    )
    const weaponByLetter = unattachedWeaponSystems.reduce((obj, wps) => {
      obj[wps.weapon.letter] = wps
      return obj
    }, {})
    const allWeaponByLetter = this.ships.reduce((racks, ship) => {
      const weapon = ship.getPrimaryWeapon()
      if (weapon) {
        const key = weapon.letter
        const previousRack = racks[key]
        racks[key] = previousRack
          ? WeaponSystem.build(previousRack, ship)
          : new AttachedWeaponSystems(ship)
      }
      return racks
    }, weaponByLetter)
    this.weaponByLetter = allWeaponByLetter
    this.weaponSystems = Object.values(weaponByLetter)
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
  hasCurrentAmmo () {
    const currentWeaponSystem = this.getCurrentWeaponSystem()
    if (!currentWeaponSystem.weapon.isLimited) return true
    return currentWeaponSystem.hasAmmoRemaining()
  }
  hasAllAmmo () {
    const currentWeaponSystem = this.getCurrentWeaponSystem()
    if (!currentWeaponSystem.weapon.isLimited) return true
    return this.hasAmmoRemaining()
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
  getCurrentCursorInfo () {
    const wps = this.getCurrentWeaponSystem()
    const weapon = wps.weapon
    const cursorCount = weapon.cursors.length
    if (
      this.selectedCoordinates.length >= weapon.points ||
      this.selectedCoordinates.length >= cursorCount
    )
      return { cursor: '', wps, idx: -1 }
    const index = this.selectedCoordinates.length
    return { cursor: weapon.cursors[index], wps, idx: index }
  }
  getCurrentCursor () {
    return this.getCurrentCursorInfo().cursor
  }
  notifyCursorChange (oldCursor) {
    this.onCursorChangeCallback(oldCursor, this.getCurrentCursorInfo())
  }
  removeCurrentWeaponSystem () {
    const oldCursor = this.getCurrentCursor()
    const idx = this.currentWeaponIndex
    this.weaponSystems.splice(idx, 1)
    if (idx >= this.weaponSystems.length) {
      this.currentWeaponIndex = 0
    }
    this.onOutOfAmmo()
    this.notifyCursorChange(oldCursor)
    this.onOutOfAmmo()
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
    return this.getLoadedWeapons().find(rack => rack.id === rackId)
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
  getWeaponIndexForLetter (weaponLetter) {
    let weaponIdx = this.weaponSystems.findIndex(
      wps =>
        wps.weapon.letter === weaponLetter &&
        (!wps.weapon.isLimited || wps.ammo > 0)
    )
    return weaponIdx
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

  getNextWeaponIndex (i) {
    let idx = i == null ? this.currentWeaponIndex : i
    idx++
    if (idx >= this.weaponSystems.length) {
      idx = 0
    }
    return idx
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
  async aimWeapon (map, row, col, weaponSystem) {
    const info = this.firingInfoIfReady(map, row, col, weaponSystem)
    if (info) {
      const { fireCoordinates, fireWeapon, wps, weapon } = info
      const result = await this.launch(fireCoordinates, weapon, wps)
      if (result?.hasCandidates) {
        fireWeapon(result?.target)
      } else {
        fireWeapon()
      }
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
  async aimSingleShot (map, row, col, sShot) {
    const { fireSingleShot, coordinates, wps, weapon } = this.aimSingleShotInfo(
      sShot,
      map,
      row,
      col
    )
    await this.launch(coordinates, weapon, wps)
    fireSingleShot()
  }

  aimSingleShotInfo (sShot, map, row, col) {
    sShot = sShot || this.getSingleShotWps()
    const weapon = sShot.weapon
    const fireSingleShot = this.fireSingleShot.bind(
      this,
      map,
      [row, col],
      sShot
    )
    const coordinates = [[row, col, 4]]
    return { fireSingleShot, wps: sShot, coordinates, weapon }
  }

  dismissSelection () {
    this.clearSelectedCoordinates()
  }
  fireSingleShot (map, coordinates, sShot) {
    sShot = sShot || this.getSingleShotWps()
    const c = coordinates || this.coord
    const weapon = sShot.weapon
    this.onDestroy(weapon, [[...c, 4]])
  }
  fireWeapon (map, coordinates, weaponSystem, target) {
    const c = coordinates || this.coord
    const wps = weaponSystem || this.getCurrentWeaponSystem()
    const weapon = wps.weapon
    const affectedArea = weapon.aoe(map, c)
    if (weapon.destroys) {
      if (weapon.isOneAndDone) {
        this.destroyOneOfMany(weapon, affectedArea, target)
      } else {
        this.onDestroy(weapon, affectedArea)
      }
    } else {
      this.onReveal(weapon, affectedArea)
    }
  }
  destroyOneOfMany (weapon, affectedArea, target) {
    // Implement the logic for destroying a single target
    // This method can be expanded for more granular control
    this.onDestroy(weapon, affectedArea, target)
  }
}
