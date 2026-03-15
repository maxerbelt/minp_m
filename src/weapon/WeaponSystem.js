import { randomElement } from '../utilities.js'

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
  getRackById (id) {
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
    return this.ammoLeft() > 0
  }
  ammoLeft () {
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
    return this.ammoTotal() - this.ammoAttached()
  }

  ammoTotal () {
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
  ammoLeft () {
    return this.wpss.reduce((sum, w) => sum + w.ammoLeft(), 0)
  }
  ammoTotal () {
    return this.wpss.reduce((sum, w) => sum + w.ammoTotal(), 0)
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
  getRackById (id) {
    const weapon = this.wpss.find(w => w.getRackById(id) !== null)
    return weapon?.getRackById(id)
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
    super(ship.weapon(), -1)
    this.ships = [ship]
  }
  add (ship) {
    this.ships.push(ship)
    return this
  }
  armedShips () {
    return this.ships.filter(s => s.hasAmmoLeft())
  }
  getRacks () {
    const racks = this.ships.flatMap(s => s.loadedWeapons())
    return racks
  }
  getRack () {
    return this.ships.find(s => s.hasAmmoLeft()).loadedWeapon()
  }
  getUnattachedWeapon () {
    return null
  }
  getRackById (id) {
    const ship = this.ships.find(s => s.getRackById(id) !== null)
    return ship?.getRackById(id)
  }
  getShipById (id) {
    const ship = this.ships.find(s => s.id === id)
    return ship
  }
  ammoLeft () {
    return this.ships.reduce((total, s) => total + s.ammoLeft(), 0)
  }
  ammoTotal () {
    return this.ships.reduce((total, s) => total + s.ammoTotal(), 0)
  }
  ammoAttached () {
    return this.ammoTotal()
  }
  ammoUsed () {
    return this.ammoTotal() - this.ammoLeft()
  }
  getLoadedWeapons () {
    return this.ships.flatMap(s => s.loadedWeapons())
  }

  getLeafWeapons () {
    return this.ships.flatMap(s => s.weaponList())
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
