import { standardShot } from './Weapon.js'

export class WeaponCatelogue {
  constructor (weapons) {
    this.weapons = weapons
    this.defaultWeapon = standardShot
  }
  addWeapons (weapons) {
    this.weapons = weapons
    this.weaponsByLetter = Object.fromEntries(weapons.map(w => [w.letter, w]))
  }
  get tags () {
    return this.weapons.map(w => w.tag)
  }

  get cursors () {
    return this.weapons.flatMap(w => {
      return [...w.cursors, w.launchCursor]
    })
  }
}
