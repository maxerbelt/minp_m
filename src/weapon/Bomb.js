import { RectListCanvas } from '../grid/rectangle/rectListCanvas.js'
import { Weapon } from './Weapon.js'

export class Bomb extends Weapon {
  constructor (ammo, name, letter) {
    super(name || 'Bomb', letter || '%', true, true, 1)
    this.ammo = ammo
    this.cursors = ['bomb']
    this.hints = ['Click On Square To Drop Bomb']
    this.buttonHtml = '<span class="shortcut">B</span>omb'
    this.tip =
      'drag a bomb on to the map to increase the number of times you can drop bombs'
    this.hasFlash = true
    this.tag = 'bomb'
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
    return new Bomb(ammo)
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
      result.push([r + i, c - 2, 0], [r + i, c + 2, 0])
    }
    for (let j = -1; j < 2; j++) {
      result.push([r - 2, c + j, 0], [r + 2, c + j, 0])
    }
    return result
  }
}
export function getIntercepts (y1, x1, y2, x2) {
  const points = RectListCanvas.BhMapList()
  return points.intercepts(x1, y1, x2, y2)
}
export function getExtendedLinePoints (y1, x1, y2, x2, color) {
  const points = RectListCanvas.BhMapList()
  points.drawLineInfinite(x1, y1, x2, y2, color)
  return points.list
}
export function getLinePoints (y1, x1, y2, x2, color) {
  const points = RectListCanvas.BhMapList()
  // points.drawSegmentTo(x1, y1, x2, y2, color)
  points.drawRay(x1, y1, x2, y2, color)
  return points.list
}

export class Strike extends Weapon {
  constructor (ammo, name, letter) {
    super(name || 'Strike', letter || '$', true, true, 2)
    this.ammo = ammo
    this.cursors = ['launcher', 'strike']

    this.totalCursors = 2
    this.hints = [
      'Click on square to start strike',
      'Click on square endstrike'
    ]
    this.buttonHtml = '<span class="shortcut">S</span>trike'
    this.tip =
      'drag a strike on to the map to increase the number of times you can strike'
    this.isOneAndDone = true
    this.hasFlash = true
    this.splashSize = 1.8
    this.nonAttached = true
    this.animateOnTarget = true
    this.explodeOnTarget = false
    this.explodeOnSplash = true
    this.splashType = 'air'
    this.tag = 'strike'
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
    return new Strike(ammo)
  }

  splashAoe (map, coords) {
    return this.aoe(map, coords, 20)
  }
  aoe (map, coords, power = 1) {
    const r = coords[0][0]
    const c = coords[0][1]

    const r1 = coords[1][0]
    const c1 = coords[1][1]

    return getExtendedLinePoints(r, c, r1, c1, power).map(([x, y, p]) => [
      y,
      x,
      p || power
    ])
  }

  async launchTo (coords, rr, cc, map, viewModel, opposingViewModel, model) {
    return await this.launchRightTo(
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
export class Fish extends Weapon {
  constructor (ammo, name = 'Fish', letter = '+') {
    super(name, letter, true, true, 2)
    this.ammo = ammo
    this.cursors = ['fish', 'periscope']
    this.totalCursors = 2
    this.hints = ['Click on square to start fish', 'Click on square aim fish']
    this.buttonHtml = '<span class="shortcut">F</span>ish'
    this.tip =
      'drag a fish on to the map to increase the number of times you can strike'
    this.isOneAndDone = true
    this.hasFlash = false
    this.splashSize = 2.2
    this.nonAttached = true
    this.animateOnTarget = true
    this.explodeOnSplash = true
    this.splashType = 'sea'
    this.tag = 'fish'
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
    return new Fish(ammo)
  }
  async launchTo (coords, rr, cc, map, viewModel, opposingViewModel, model) {
    return await this.launchRightTo(
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

    const line = getLinePoints(r, c, r1, c1, power).map(([x, y, p]) => [
      y,
      x,
      p || power
    ])

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
function getPieSegmentCells (x1, y1, x2, y2, radius = 4, spreadDeg = 22.5) {
  const points = RectListCanvas.BhMapList()
  points.drawPie2(x1, y1, x2, y2, radius, this, spreadDeg)
  return points.list
}
export class Sensor extends Weapon {
  constructor (ammo, name = 'Sensor', letter = '<') {
    super(name, letter, true, false, 2)
    this.ammo = ammo
    this.cursors = ['dish', 'sweep']
    this.totalCursors = 2
    this.hints = ['Click on square to start scan', 'Click on square end scan']
    this.buttonHtml = 's<span class="shortcut">C</span>an'
    this.tip = ''
    this.isOneAndDone = false
    this.hasFlash = false
    this.tag = 'scan'
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
    return new Sensor(ammo)
  }

  aoe (_map, coords) {
    const r = coords[0][0]
    const c = coords[0][1]

    const r1 = coords[1][0]
    const c1 = coords[1][1]

    return getPieSegmentCells(r, c, r1, c1)
  }
}
