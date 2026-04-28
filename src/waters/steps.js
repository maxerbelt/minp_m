import { bh } from '../terrains/all/js/bh.js'

export const Player = Object.freeze({
  friend: 'FRIEND',
  enemy: 'ENEMY'
})

export const WeaponMode = Object.freeze({
  sourceSelect: 'SELECT',
  targetAim: 'AIM',
  othersTurn: 'OTHERS'
})
export class Steps {
  constructor (player) {
    this.player = player
    this.wletter = null
    this.sourceRack = null
    this.source = null
    this.sourceShip = null
    this.sourceHint = null
    this.sourceShadow = null
    this.target = null
    this.mode = WeaponMode.othersTurn
    this.onChangeWeapon = Function.prototype
    this.onActivate = Function.prototype
    this.onDeactivate = Function.prototype
    this.onHint = Function.prototype
  }

  shouldChangeWeapon (wletter) {
    return wletter !== this.sourceRack?.wletter
  }

  shouldDeactivatePreviousRack (weaponId) {
    return (
      this.sourceRack &&
      this.sourceRack.weaponId !== -1 &&
      weaponId !== this.sourceRack.weaponId
    )
  }

  shouldActivateNewRack (weapon, weaponId) {
    return (
      weapon !== undefined &&
      weaponId !== -1 &&
      weaponId !== this.sourceRack?.weaponId
    )
  }
  deactivateOnNewRack (weaponId) {
    if (weaponId !== this.sourceRack?.weaponId) {
      this.deactivateCurrentSourceRack()
    }
  }
  deactivateCurrentSourceRack () {
    if (this.sourceRack && this.sourceRack.weaponId !== -1) {
      this.onDeactivate(
        this.sourceRack.r,
        this.sourceRack.c,
        this.sourceRack.shadowR,
        this.sourceRack.shadowC
      )
    }
  }

  resetSourceState () {
    this.source = null
    this.sourceShip = null
    this.sourceHint = null
    this.sourceShadow = null
    this.sourceRack = null
  }
  select () {
    this.mode = WeaponMode.targetAim
    this.onSelect(this)
  }

  fire () {
    if (!bh.terrain.hasUnattachedWeapons && this.sourceShip === null) {
      console.warn(
        `${bh.terrain.name} does not have unattached weapons, but a weapon was fired without a source ship`
      )
    }
    if (!this.source) return
    this.deactivateCurrentSourceRack()
    this.source.board.cellUseAmmo(this.source.r, this.source.c)
    if (this.sourceRack?.weapon?.givesHint) {
      this.sourceHint.board.cellHintReveal(this.sourceHint.r, this.sourceHint.c)
      this.onHint(this.sourceHint.r, this.sourceHint.c)
    }
  }
  addRack (rack, weapon, wletter, weaponId, r, c, cell, hintR, hintC) {
    weaponId = weaponId || rack.id
    if (bh.terrain.hasAttachedWeapons && this.shouldChangeWeapon(wletter)) {
      this.onChangeWeapon(wletter)
    }
    const [shadowR, shadowC] = weapon.hasShadowAtHint ? [hintR, hintC] : [r, c]
    this.activate(weaponId, weapon, rack, wletter, r, c, cell, shadowR, shadowC)
    this.sourceRack = {
      rack,
      weapon,
      wletter,
      weaponId,
      r,
      c,
      cell,
      shadowR,
      shadowC
    }
    this.select()
    return { shadowR, shadowC }
  }
  activate (weaponId, weapon, rack, wletter, r, c, cell, shadowR, shadowC) {
    this.deactivateOnNewRack(weaponId)
    if (this.shouldActivateNewRack(weapon, weaponId)) {
      this.onActivate(
        rack,
        weapon,
        wletter,
        weaponId,
        r,
        c,
        cell,
        shadowR,
        shadowC
      )
    }
  }

  clearSource () {
    this.deactivateCurrentSourceRack()
    this.resetSourceState()
  }

  addShip (ship) {
    this.sourceShip = ship
    if (bh.terrain.hasAttachedWeapons) {
      const letter = ship.getPrimaryWeapon().letter
      if (letter !== this.sourceRack?.wletter) {
        this.onChangeWeapon(letter)
      }
      this.wletter = letter
    } else {
      console.warn(
        'Terrain does not have attached weapons, but a ship was added to steps'
      )
    }
  }

  addHint (board, r, c, cell) {
    this.sourceHint = { board, r, c, cell }
  }
  addShadow (board, r, c, cell) {
    this.sourceShadow = { board, r, c, cell }
  }

  addSource (board, r, c, cell) {
    this.source = { board, r, c, cell }
  }

  endTurn () {
    //  this.source = null
    this.mode = WeaponMode.othersTurn
    this.onEndTurn(this)
  }
  beginTurn () {
    //  this.source = null
    this.mode = WeaponMode.sourceSelect
    this.onBeginTurn(this)
  }
  onEndTurn = Function.prototype
  onBeginTurn = Function.prototype
  onAim = Function.prototype
  onSelect = Function.prototype
}
