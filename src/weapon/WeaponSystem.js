import { randomElement } from '../core/utilities.js'

export class WeaponSystem {
  constructor (weapon, id) {
    this.ammo = weapon.isLimited ? weapon.ammo : null
    this.weapon = weapon
    this.hit = false
    this.id = id || WeaponSystem.getId()
  }

  static id = 1

  static next () {
    WeaponSystem.id++
  }
  static getId () {
    const id = WeaponSystem.id
    WeaponSystem.next()
    return id
  }

  get letter () {
    return this.weapon.letter
  }
  reset () {
    this.ammo = this.weapon.ammo
    this.hit = false
  }
  armedShips () {
    return []
  }
  getRack () {
    return null
  }
  getRacks () {
    return []
  }
  getWeaponBySystemId (id) {
    return this.id === id ? this : null
  }
  getLeafWeapons () {
    return [this]
  }
  getLoadedWeapons () {
    return this.hasAmmo() ? [this] : []
  }
  getLoadedWeapon () {
    return this.hasAmmo() ? this : null
  }
  getShipById () {
    return null
  }
  hasAmmo () {
    if (!this.weapon.isLimited) return true
    return this.hasAmmoRemaining()
  }
  hasAmmoRemaining () {
    return this.ammo > 0
  }

  ammoRemaining () {
    return this.ammo
  }
  useAmmo () {
    if (!this.weapon.isLimited) return
    this.ammo--
    if (this.ammo < 0) this.ammo = 0
  }
  ammoAttached () {
    return 0
  }
  ammoUnattached () {
    return this.ammoCapacity() - this.ammoAttached()
  }

  ammoCapacity () {
    return this.weapon.ammo
  }

  ammoUsed () {
    return this.weapon.ammo - this.ammo
  }
  getUnattachedWeapon () {
    return this
  }
  static build (wps, ship) {
    if (wps instanceof AttachedWeaponSystems) {
      return wps.add(ship)
    }
    const shipwps = new AttachedWeaponSystems(ship)

    if (wps instanceof CombinedWeaponSystem) {
      return wps.add(shipwps)
    }
    if (wps instanceof WeaponSystem) {
      return new CombinedWeaponSystem([wps, shipwps])
    }
    return null
  }
}
export class CombinedWeaponSystem extends WeaponSystem {
  constructor (wpss) {
    super(wpss[0].weapon, -1)
    this.wpss = wpss
  }

  armedShips () {
    return this.wpss.flatMap(w => w.armedShips())
  }
  getRacks () {
    return this.wpss.flatMap(w => w.getRacks())
  }
  hasAmmoRemaining () {
    return this.wpss.some(w => w.hasAmmoRemaining())
  }

  ammoRemaining () {
    return this.wpss.reduce((sum, w) => sum + w.ammoRemaining(), 0)
  }
  ammoCapacity () {
    return this.wpss.reduce((sum, w) => sum + w.ammoCapacity(), 0)
  }
  ammoAttached () {
    return this.wpss.reduce((sum, w) => sum + w.ammoAttached(), 0)
  }
  ammoUsed () {
    return this.wpss.reduce((sum, w) => sum + w.ammoUsed(), 0)
  }
  add (wps) {
    this.wpss.push(wps)
    return this
  }
  getLeafWeapons () {
    return this.wpss.flatMap(w => w.getLeafWeapons())
  }
  getLoadedWeapon () {
    return this.wpss.find(w => w.hasAmmo())
  }
  getLoadedWeapons () {
    return this.wpss.flatMap(w => w.getLoadedWeapons())
  }
  getRack () {
    const ships = this.wpss.find(
      w => w instanceof AttachedWeaponSystems && w.hasAmmo()
    )
    return ships?.getRack()
  }
  getWeaponBySystemId (id) {
    const weapon = this.wpss.find(w => w.getWeaponBySystemId(id) !== null)
    return weapon?.getWeaponBySystemId(id)
  }
  getShipById (id) {
    const weapon = this.wpss.find(
      w => !(w instanceof AttachedWeaponSystems) && w.getShipById(id) !== null
    )
    return weapon?.getShipById(id)
  }

  getUnattachedWeapon () {
    return this.wpss.find(
      w => !(w instanceof AttachedWeaponSystems) && w.hasAmmo()
    )
  }
  useAmmo () {
    if (!this.weapon.isLimited) return
    const wps = this.getUnattachedWeapon()
    if (wps) {
      wps.useAmmo()
    } else {
      const wps2 = this.getLoadedWeapon()
      if (wps2) {
        wps2.useAmmo()
      }
    }
  }
  static build (wpss) {
    if (wpss[0] instanceof CombinedWeaponSystem) {
      return wpss[0].add(wpss.slice(1))
    }
    return new CombinedWeaponSystem(wpss)
  }
}

export class AttachedWeaponSystems extends WeaponSystem {
  constructor (ship) {
    super(ship.getPrimaryWeapon(), -1)
    this.ships = [ship]
  }
  add (ship) {
    this.ships.push(ship)
    return this
  }
  armedShips () {
    return this.ships.filter(s => s.hasAmmoRemaining())
  }
  getRacks () {
    const racks = this.ships.flatMap(s => s.loadedWeapons())
    return racks
  }
  getRack () {
    return this.ships.find(s => s.hasAmmoRemaining()).loadedWeapon()
  }
  getUnattachedWeapon () {
    return null
  }
  getWeaponBySystemId (id) {
    const ship = this.ships.find(s => s.getWeaponBySystemId(id) !== null)
    return ship?.getWeaponBySystemId(id)
  }
  getShipById (id) {
    const ship = this.ships.find(s => s.id === id)
    return ship
  }
  hasAmmoRemaining () {
    return this.ships.some(s => s.hasAmmoRemaining())
  }
  ammoRemaining () {
    return this.ships.reduce((total, s) => total + s.ammoRemainingTotal(), 0)
  }
  ammoCapacity () {
    return this.ships.reduce((total, s) => total + s.ammoCapacityTotal(), 0)
  }
  ammoAttached () {
    return this.ammoCapacity()
  }
  ammoUsed () {
    return this.ammoCapacity() - this.ammoRemaining()
  }
  getLoadedWeapons () {
    return this.ships.flatMap(s => s.loadedWeapons())
  }

  getLeafWeapons () {
    return this.ships.flatMap(s => s.getAllWeapons())
  }
  getLoadedWeapon () {
    return randomElement(this.getLoadedWeapons())
  }

  useAmmo () {
    const wps2 = this.getLoadedWeapon()
    if (wps2) {
      wps2.useAmmo()
    }
  }
}
