import { WeaponCatelogue as WeaponCatalogue } from '../../../weapon/WeaponCatelogue.js'
import { RectListCanvas } from '../../../grid/rectangle/rectListCanvas.js'
import { Weapon } from '../../../weapon/Weapon.js'
import { Bomb, Fish, Sensor, Strike } from '../../../weapon/Bomb.js'

export class Missile extends Bomb {
  constructor (ammo) {
    super(ammo, 'Missile', '+')
    this.unattachedCursor = 0
    this.postSelectCursor = 0
    this.launchCursor = 'launch'
    this.totalCursors = 2
    this.cursors = ['missile']
    this.volatile = true
    this.setWeaponProperties({
      hints: ['Click On Square To Aim Missile'],
      buttonHtml: '<span class="shortcut">M</span>issile',
      tip: 'drag a missile on to the map to increase the number of times you can fire missiles',
      tag: 'missile',
      animateOnTarget: true,
      explodeOnTarget: true,
      hasFlash: true
    })
    this.plural = 'Missiles'
    this.points = 1
    this.splashCoords = this.aoe(null, [[-1, -1], [2, 2]])
  }

  get flightSound () {
    return Weapon.getFlightSoundUrl('missile-flight.mp3', import.meta.url)
  }

  clone (ammo) {
    return this.createClone(Missile, ammo)
  }

  async launchTo (coords, r, c, map, viewModel, opposingViewModel) {
    if (!opposingViewModel) {
      return await super.launchTo(
        coords,
        r,
        c,
        map,
        viewModel,
        opposingViewModel
      )
    }
    const target = coords[0]

    const start1 = opposingViewModel.gridCellAt(r, c)
    const end1 = viewModel.gridCellAt(target[0], target[1])

    return await this.animateFlyingOnVM(start1, end1, viewModel)
  }

  redoCoords (_map, base, coords) {
    return [base, coords[0]]
  }
  aoe (_map, coords) {
    if (coords.length < 1) return []
    const [r, c] = coords[0]
    let result = this.boom(r, c)
    return result
  }
  static get single () {
    return new Missile(1)
  }

  getTurn (variant) {
    let turn = ''
    switch (variant) {
      case 0:
        turn = 'turn4'
        break
      case 2:
        turn = 'turn2'
        break
      case 3:
        turn = 'turn3'
        break
      default:
        turn = ''
        break
    }
    return turn
  }
}
export class RailBolt extends Strike {
  constructor (ammo) {
    super(ammo, 'Rail Bolt', '|')
    this.launchCursor = 'rail'
    this.postSelectCursor = 1
    this.totalCursors = 2
    this.cursors = ['rail', 'bolt']
    this.isOneAndDone = true
    this.setWeaponProperties({
      hints: [
        'Click on square to start rail bolt',
        'Click on square end rail bolt'
      ],
      buttonHtml: '<span class="shortcut">R</span>ail Bolt',
      tip: 'drag a rail bolt on to the map to increase the number of times you can strike',
      tag: 'rail',
      hasFlash: false
    })
    this.plural = 'Rail Bolts'
    this.dragShape = [
      [0, 0, 1],
      [0, 1, 0],
      [0, 2, 0],
      [0, 3, 0],
      [0, 4, 1]
    ]
  }

  get flightSound () {
    return Weapon.getFlightSoundUrl('rail-flight.mp3', import.meta.url)
  }

  clone (ammo) {
    return this.createClone(RailBolt, ammo)
  }
  async launchTo (coords, rr, cc, map, viewModel, opposingViewModel, model) {
    return await this.launchRightTo(
      coords,
      rr,
      cc,
      map,
      viewModel,
      opposingViewModel,
      model,
      this.boltLaunchTo.bind(this)
    )
  }
  async boltLaunchTo (coords, rr, cc, map, viewModel, opposingViewModel, model) {
    if (!opposingViewModel) {
      return await super.launchTo(
        coords,
        rr,
        cc,
        map,
        viewModel,
        opposingViewModel,
        model
      )
    }
    const [[r, c], target] = this.redoCoords(map, [rr, cc], coords)
    const start1 = opposingViewModel.gridCellAt(r, c)
    const end1 = opposingViewModel.gridCellAt(target[0], target[1])
    const start2 = viewModel.gridCellAt(r, c)
    const end2 = viewModel.gridCellAt(target[0], target[1])

    start1.classList.add('marker')
    end1.classList.add('portal')
    start2.classList.add('portal')
    end2.classList.add('marker')
    await this.animateFlyingOnVM(start1, end1, viewModel)

    await this.animateFlyingOnVM(start2, end2, viewModel)

    start1.classList.add('marker')
    end1.classList.remove('portal')
    start2.classList.remove('portal')
    start2.classList.add('portal')
    end2.classList.add('marker')
  }

  static get single () {
    return new RailBolt(1)
  }
}
function getLinePoints (y1, x1, y2, x2, color) {
  const points = RectListCanvas.BhMapList()
  // points.drawSegmentTo(x1, y1, x2, y2, color)
  points.drawRay(x1, y1, x2, y2, color)
  return points.list
}
export class GuassRound extends Fish {
  constructor (ammo) {
    super(ammo)
    this.name = 'Gauss Round'
    this.letter = '^'
    this.cursors = ['rlaunch', 'round']
    this.isOneAndDone = true
    this.setWeaponProperties({
      hints: [
        'Click on square to start guass round',
        'Click on square aim guass round'
      ],
      buttonHtml: '<span class="shortcut">G</span>uass Round',
      tip: 'drag a guass round on to the map to increase the number of times you can strike',
      tag: 'round',
      hasFlash: false
    })
    this.dragShape = [
      [1, 0, 1],
      [1, 1, 0],
      [1, 2, 0],
      [0, 3, 0],
      [2, 3, 0]
    ]
  }

  clone (ammo) {
    return this.createClone(GuassRound, ammo)
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

    result.push([r - 3, c, 0], [r + 3, c, 0], [r, c - 3, 0], [r, c + 3, 0])
    return result
  }
  get flightSound () {
    const url = new URL('../sounds/guass-flight.mp3', import.meta.url)
    return url
  }
  async launchTo (coords, rr, cc, map, viewModel, opposingViewModel, model) {
    await this.launchRightTo(
      coords,
      rr,
      cc,
      map,
      viewModel,
      opposingViewModel,
      model,
      this.boltLaunchTo.bind(this)
    )
  }

  aoe (map, coords, power = 1) {
    const r = coords[0][0]
    const c = coords[0][1]

    const r1 = coords[1][0]
    const c1 = coords[1][1]

    const line = getLinePoints(r, c, r1, c1, power)
    const landIdx = line.findIndex(([r, c]) => map.isLand(r, c))
    this.crashLoc = landIdx >= 0 ? line[landIdx] : null
    if (landIdx >= 0) {
      line.length = landIdx + 1
    }
    return line
  }
  async roundLaunchTo (
    coords,
    rr,
    cc,
    map,
    viewModel,
    opposingViewModel,
    model
  ) {
    if (!opposingViewModel) {
      return super.launchTo(
        coords,
        rr,
        cc,
        map,
        viewModel,
        opposingViewModel,
        model
      )
    }
    const [[r, c], target] = this.redoCoords(map, [rr, cc], coords)
    const start1 = opposingViewModel.gridCellAt(r, c)
    const start2 = viewModel.gridCellAt(r, c)
    const end2 = viewModel.gridCellAt(target[0], target[1])
    start1.classList.add('portal')
    start2.classList.add('portal')
    await this.animateFlyingOnVM(start2, end2, viewModel)
    await this.animateFlyingOnVM(start1, end2, viewModel)
    start1.classList.remove('portal')
    start2.classList.remove('portal')
  }

  static get single () {
    return new GuassRound(1)
  }
}

export class Scan extends Sensor {
  constructor (ammo) {
    super(ammo)
    this.name = 'Scan'
    this.letter = 'Z'
    this.cursors = ['dish', 'sweep']
    this.isOneAndDone = false
    this.setWeaponProperties({
      hints: ['Click on square to startscan', 'Click on square end scan'],
      buttonHtml: 's<span class="shortcut">W</span>eep',
      tag: 'scan',
      hasFlash: false
    })
  }

  clone (ammo) {
    return this.createClone(Scan, ammo)
  }
}

export const spaceWeaponsCatalogue = new WeaponCatalogue([
  new Missile(1),
  new RailBolt(1)
])
