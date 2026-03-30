import { coordsFromCell, shuffleArray } from '../utilities.js'
import { Weapon, WeaponCatelogue } from '../weapon/Weapon.js'
import { getListCanvas } from '../grid/listCanvas.js'
import { Delay } from '../core/Delay.js'
export class Megabomb extends Weapon {
  constructor (ammo, name, letter) {
    super(name || 'Megabomb', letter || 'M', true, true, 1)
    this.ammo = ammo
    this.cursors = ['bomb']
    this.hints = ['Click On Square To Drop Bomb']
    this.buttonHtml = '<span class="shortcut">M</span>ega Bomb'
    this.tip =
      'drag a megabomb on to the map to increase the number of times you can drop bombs'
    this.hasFlash = true
    this.tag = 'mega'
    this.splashSize = 2.7
    this.nonAttached = true
    this.animateOnTarget = true
    this.explodeOnTarget = true
    this.animateOffsetY = 50
    this.splashCoords = this.aoe(null, [[2, 2]])
    this.dragShape = [
      [0, 0, 0],
      [0, 1, 0],
      [0, 2, 0],
      [1, 0, 0],
      [1, 1, 1],
      [1, 2, 0],
      [2, 0, 0],
      [2, 1, 0],
      [2, 2, 0]
    ]
  }
  clone (ammo) {
    ammo = ammo || this.ammo
    return new Megabomb(ammo)
  }

  redoCoords (_map, _base, coords) {
    return [[0, coords[0][1]], coords[0]]
  }

  aoe (_map, coords) {
    const r = coords[0][0]
    const c = coords[0][1]
    let result = this.boom(r, c)
    return result
  }

  boom (r, c) {
    let result = [[r, c, 2]]
    for (let i = -1; i < 2; i++) {
      for (let j = -1; j < 2; j++) {
        if (i !== 0 || j !== 0) {
          result.push([r + i, c + j, 1])
        }
      }
    }
    for (let i = -1; i < 2; i++) {
      result.push([r + i, c - 2, 0])
      result.push([r + i, c + 2, 0])
    }
    for (let j = -1; j < 2; j++) {
      result.push([r - 2, c + j, 0])
      result.push([r + 2, c + j, 0])
    }
    return result
  }
}
function getIntercepts (y1, x1, y2, x2) {
  const points = getListCanvas()
  return points.intercepts(x1, y1, x2, y2)
}
function getExtendedLinePoints (y1, x1, y2, x2, color) {
  const points = getListCanvas()
  points.drawLineInfinite(x1, y1, x2, y2, color)
  return points.list
}
function getLinePoints (y1, x1, y2, x2, color) {
  const points = getListCanvas()
  // points.drawSegmentTo(x1, y1, x2, y2, color)
  points.drawRay(x1, y1, x2, y2, color)
  return points.list
}
export class Kinetic extends Weapon {
  constructor (ammo, name, letter) {
    super(name || 'Kinetic Strike', letter || 'K', true, true, 2)
    this.ammo = ammo
    this.cursors = ['satelite', 'strike']

    this.totalCursors = 2
    this.hints = [
      'Click on square to start kinetic strike',
      'Click on square end kinetic strike'
    ]
    this.buttonHtml = '<span class="shortcut">K</span>inetic Strike'
    this.tip =
      'drag a kinetic on to the map to increase the number of times you can strike'
    this.isOneAndDone = true
    this.hasFlash = true
    this.splashSize = 1.65
    this.nonAttached = true
    this.animateOnTarget = true
    this.explodeOnTarget = false
    this.explodeOnSplash = true
    this.splashType = 'air'
    this.tag = 'kinetic'
    this.splashCoords = this.addOrthogonal(null, 2, 2, 0, [
      [2, 2, 2],
      [0, 0, 20],
      [1, 1, 20],
      [3, 3, 20],
      [4, 4, 20]
    ])

    this.dragShape = [
      [0, 0, 1],
      [0, 1, 0],
      [0, 2, 0],
      [0, 3, 0],
      [0, 4, 1]
    ]
    this.splashPower = 0
  }
  clone (ammo) {
    ammo = ammo || this.ammo
    return new Kinetic(ammo)
  }
  splashAoe (map, coords) {
    return this.aoe(map, coords, 20)
  }
  aoe (map, coords, power = 1) {
    const r = coords[0][0]
    const c = coords[0][1]

    const r1 = coords[1][0]
    const c1 = coords[1][1]

    return getExtendedLinePoints(r, c, r1, c1, power)
  }

  launchTo (coords, rr, cc, map, viewModel, opposingViewModel, model) {
    return this.launchRightTo(
      coords,
      rr,
      cc,
      map,
      viewModel,
      opposingViewModel,
      model
    )
  }

  redoCoords (map, base, coords) {
    const r = coords[0][0]
    const c = coords[0][1]

    const r1 = coords[1][0]
    const c1 = coords[1][1]
    const { x0, y0, x1, y1 } = getIntercepts(r, c, r1, c1)
    return [
      [y0, x0],
      [y1, x1]
    ]
  }

  splash (map, coords) {
    const [r, c] = coords
    const newEffect = [coords]
    this.addOrthogonal(map, r, c, 0, newEffect)
    return newEffect
  }

  addSplash (map, r, c, power, newEffect) {
    const noCheck = map === null || map === undefined
    if (noCheck || map.inBounds(r, c)) newEffect.push([r, c, power])
  }
}

export class Torpedo extends Weapon {
  constructor (ammo) {
    super('Torpedo', '+', true, true, 2)
    this.ammo = ammo
    this.cursors = ['torpedo', 'periscope']
    this.totalCursors = 2
    this.hints = [
      'Click on square to start torpedo',
      'Click on square aim torpedo'
    ]
    this.buttonHtml = '<span class="shortcut">T</span>orpedo'
    this.tip =
      'drag a torpedo on to the map to increase the number of times you can strike'
    this.isOneAndDone = true
    this.hasFlash = false
    this.splashSize = 2.2
    this.nonAttached = true
    this.animateOnTarget = true
    this.explodeOnSplash = true
    this.splashType = 'sea'
    this.tag = 'torpedo'
    this.splashCoords = this.addOrthogonal(null, 3, 3, 1, [
      [3, 3, 2],
      [4, 2, 0],
      [2, 4, 0],
      [0, 0, 20],
      [1, 1, 20],
      [2, 2, 30],
      [4, 4, 30],
      [5, 5, 20],
      [6, 6, 20]
    ])
    this.dragShape = [
      [1, 0, 1],
      [1, 1, 0],
      [1, 2, 0],
      [0, 3, 0],
      [2, 3, 0]
    ]
    this.splashPower = 1
  }
  clone (ammo) {
    ammo = ammo || this.ammo
    return new Torpedo(ammo)
  }
  launchTo (coords, rr, cc, map, viewModel, opposingViewModel, model) {
    return this.launchRightTo(
      coords,
      rr,
      cc,
      map,
      viewModel,
      opposingViewModel,
      model
    )
  }

  splashAoe (map, coords) {
    return this.aoe(map, coords, 20)
  }
  aoe (map, coords, power = 1) {
    const r = coords[0][0]
    const c = coords[0][1]

    const r1 = coords[1][0]
    const c1 = coords[1][1]

    const line = getLinePoints(r, c, r1, c1, power)
    const landIdx = line.findIndex(([r, c]) => map.isLand(r, c))

    if (landIdx >= 0) {
      line.length = landIdx
    }
    return line
  }
  redoCoords (map, base, coords) {
    const line = this.aoe(map, coords)
    return [line[0], line.at(-1)]
  }

  addSplash (map, r, c, power, newEffect) {
    const noCheck = map === null || map === undefined
    if (noCheck || (map.inBounds(r, c) && !map.isLand(r, c)))
      newEffect.push([r, c, power])
  }

  splash (map, coords) {
    const [r, c] = coords
    const newEffect = [coords]

    this.addNeighbours(map, r, c, 1, 0, newEffect)
    return newEffect
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
    this.animateExplode(
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
  async animateTargetExplode (target, container, end, cellSize, map, viewModel) {
    const coord = coordsFromCell(target)
    const effects = this.aoe(map, [coord]).filter(([, , power]) => power > 0)
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
function getPieSegmentCells (x1, y1, x2, y2, radius = 4, spreadDeg = 22.5) {
  const points = getListCanvas()
  points.drawPie2(x1, y1, x2, y2, radius, this, spreadDeg)
  return points.list
}
export class Sweep extends Weapon {
  constructor (ammo) {
    super('Radar Sweep', 'W', true, false, 2)
    this.ammo = ammo
    this.cursors = ['dish', 'sweep']
    this.totalCursors = 2
    this.hints = [
      'Click on square to start radar scan',
      'Click on square end radar scan'
    ]
    this.buttonHtml = 's<span class="shortcut">W</span>eep'
    this.tip = ''
    this.isOneAndDone = false
    this.hasFlash = false
    this.tag = 'sweep'
    this.dragShape = [
      [2, 0, 1],
      [1, 1, 0],
      [2, 1, 0],
      [2, 2, 0],
      [0, 2, 0],
      [1, 2, 1],
      [1, 3, 0]
    ]
  }
  clone (ammo) {
    ammo = ammo || this.ammo
    return new Sweep(ammo)
  }

  aoe (_map, coords) {
    const r = coords[0][0]
    const c = coords[0][1]

    const r1 = coords[1][0]
    const c1 = coords[1][1]

    return getPieSegmentCells(r, c, r1, c1)
  }
}
export const seaWeaponsCatalogue = new WeaponCatelogue([
  new Megabomb(1),
  new Kinetic(1),
  new Flack(1),
  new Torpedo(1)
  //  new Sweep(1)
])
