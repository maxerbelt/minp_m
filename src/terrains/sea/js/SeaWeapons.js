import { bh } from '../../../terrains/all/js/bh.js'
import { coordsFromCell, shuffleArray } from '../../../core/utilities.js'
import { Weapon, WeaponCatelogue } from '../../../weapon/Weapon.js'
import { Delay } from '../../../core/Delay.js'
import { Bomb, Fish, Sensor, Strike } from '../../../weapon/Bomb.js'

export class Megabomb extends Bomb {
  constructor (ammo, name, letter) {
    super(ammo, name || 'Megabomb', letter || 'M')

    this.hints = ['Click On Square To Drop Bomb']
    this.buttonHtml = '<span class="shortcut">M</span>ega Bomb'
    this.tip =
      'drag a megabomb on to the map to increase the number of times you can drop bombs'

    this.tag = 'mega'
  }
  clone (ammo) {
    ammo = ammo || this.ammo
    return new Megabomb(ammo)
  }
}
export class Kinetic extends Strike {
  constructor (ammo, name, letter) {
    super(ammo, name || 'Kinetic Strike', letter || 'K', true, true, 2)
    this.cursors = ['satelite', 'strike']

    this.totalCursors = 2
    this.hints = [
      'Click on square to start kinetic strike',
      'Click on square end kinetic strike'
    ]
    this.buttonHtml = '<span class="shortcut">K</span>inetic Strike'
    this.tip =
      'drag a kinetic on to the map to increase the number of times you can strike'

    this.splashType = 'air'
    this.tag = 'kinetic'
    this.splashPower = 0
  }
  clone (ammo) {
    ammo = ammo || this.ammo
    return new Kinetic(ammo)
  }
}
export class Torpedo extends Fish {
  constructor (ammo) {
    super(ammo, 'Torpedo', '+')

    this.cursors = ['torpedo', 'periscope']
    this.totalCursors = 2
    this.hints = [
      'Click on square to start torpedo',
      'Click on square aim torpedo'
    ]
    this.buttonHtml = '<span class="shortcut">T</span>orpedo'
    this.tip =
      'drag a torpedo on to the map to increase the number of times you can strike'

    this.splashType = 'sea'
    this.tag = 'torpedo'
    this.splashPower = 1
  }
  clone (ammo) {
    ammo = ammo || this.ammo
    return new Torpedo(ammo)
  }
}

export class Flack extends Weapon {
  constructor (ammo) {
    super('Flack', 'F', true, true, 1)
    this.ammo = ammo
    this.cursors = ['cluster']
    this.totalCursors = 1
    this.hints = ['Click on square to initiate flack']
    this.buttonHtml = '<span class="shortcut">F</span>lack'
    this.tip = ''
    this.isOneAndDone = false
    this.nonAttached = true
    this.animateOnTarget = true
    this.explodeOnTarget = true
    this.hasFlash = true
    this.animateOffsetY = 50
    this.tag = 'flack'
    this.splashCoords = [
      [0, 0, 1],
      [1, 1, 2],
      [0, 2, 1],
      [2, 0, 1],
      [2, 2, 1],
      [1, 3, 2],
      [0, 4, 1],
      [2, 4, 1],
      [0, 1, 0],
      [2, 3, 0]
    ]
    this.dragShape = [
      [0, 0, 0],
      [1, 1, 1],
      [0, 2, 0],
      [2, 0, 0],
      [2, 2, 0],
      [1, 3, 1],
      [0, 4, 0]
    ]
  }
  clone (ammo) {
    ammo = ammo || this.ammo
    return new Flack(ammo)
  }
  redoCoords (_map, _base, coords) {
    return [[0, coords[0][1]], coords[0]]
  }

  async delayAsyncEffect (
    cell,
    mindelay = 380,
    maxdelay = 730,
    power = null,
    cellSize = 30
  ) {
    await Delay.randomWait(mindelay, maxdelay)
    await this.asyncEffect(cell, power, cellSize)
  }
  async asyncEffect (cell, power, cellSize) {
    super.animateExplode(
      cell,
      null,
      null,
      Function.prototype,
      cellSize,
      'air',
      power
    )
  }
  async delayAsyncEffects (cells, mindelay = 380, maxdelay = 730) {
    const promises = cells.map(([cell, , , power]) =>
      this.delayAsyncEffect(cell, mindelay, maxdelay, power)
    )
    return await Promise.allSettled(promises)
  }
  async animateExplode (
    target,
    container,
    end,
    cellSize,
    type,
    power,
    shake = 'shake',
    animator = null
  ) {
    const coord = coordsFromCell(target)
    const effects = this.aoe(bh.map, [coord]).filter(([, , power]) => power > 0)
    const cells = [...this.cellsAndCoords(effects)]

    await this.delayAsyncEffects(cells, 0, 500, cellSize)
  }

  aoe (map, coords) {
    const r = coords[0][0]
    const c = coords[0][1]
    let area = []

    for (let i = -1; i < 2; i++) {
      for (let j = -2; j < 2; j++) {
        area.push([r + i, c + j, 0])
      }
    }
    const middle = shuffleArray(area)
    const head = middle.slice(0, 2)
    const leftOver = middle.slice(3)

    for (let j = -1; j < 2; j++) {
      leftOver.push([r - 2, c + j, 0], [r + 2, c + j, 0])
    }
    for (let i = -1; i < 2; i++) {
      leftOver.push([r + i, c - 2, 0], [r + i, c + 2, 0])
    }
    const result = head.concat(shuffleArray(leftOver))
    for (let i = 0; i < 8; i++) {
      if (i < 2) {
        result[i][2] = 2
      } else {
        result[i][2] = 1
      }
    }
    result.length = 16
    return result.filter(([r, c]) => map.inBounds(r, c))
  }
}
export class Sweep extends Sensor {
  constructor (ammo) {
    super(ammo, 'Radar Sweep', 'W')

    this.cursors = ['dish', 'sweep']
    this.totalCursors = 2
    this.hints = [
      'Click on square to start radar scan',
      'Click on square end radar scan'
    ]
    this.buttonHtml = 's<span class="shortcut">W</span>eep'
    this.tip = ''
    this.tag = 'sweep'
  }
  clone (ammo) {
    ammo = ammo || this.ammo
    return new Sweep(ammo)
  }
}
export const seaWeaponsCatalogue = new WeaponCatelogue([
  new Megabomb(1),
  new Kinetic(1),
  new Flack(1),
  new Torpedo(1)
  //  new Sweep(1)
])
