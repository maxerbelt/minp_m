import { Megabomb, Kinetic, Torpedo, Sweep } from '../sea/SeaWeapons.js'
import { WeaponCatelogue as WeaponCatalogue } from '../weapon/Weapon.js'
import { getListCanvas } from '../grid/listCanvas.js'

export class Missile extends Megabomb {
  constructor (ammo) {
    super(ammo, 'Missile', '+')
    this.plural = 'Missiles'
    this.unattachedCursor = 0 // = 1
    this.postSelectCursor = 0
    this.givesHint = true
    this.launchCursor = 'launch'
    this.totalCursors = 2
    this.cursors = ['missile'] //['launch', 'missile']
    this.animateOnTarget = true
    this.explodeOnTarget = true
    this.points = 1
    this.hints = ['Click On Square To Aim Missile']
    this.buttonHtml = '<span class="shortcut">M</span>issile'
    this.tip =
      'drag a missile on to the map to increase the number of times you can fire missiles'
    this.hasFlash = true
    this.splashCoords = this.aoe(null, [
      [-1, -1],
      [2, 2]
    ])
    this.tag = 'missile'
    this.volatile = true
  }
  clone (ammo) {
    ammo = ammo || this.ammo
    return new Missile(ammo)
  }

  launchTo (coords, r, c, onEnd, map, viewModel, opposingViewModel) {
    if (!opposingViewModel) {
      super.launchTo(coords, r, c, onEnd, map, viewModel, opposingViewModel)
      return
    }
    const target = coords[0]

    const start1 = opposingViewModel.gridCellAt(r, c)
    const end1 = viewModel.gridCellAt(target[0], target[1])

    this.animateFlying(
      start1,
      end1,
      viewModel.cellSizeScreen(),
      map,
      viewModel
    ).then(() => onEnd())
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
export class RailBolt extends Kinetic {
  constructor (ammo) {
    super(ammo, 'Rail Bolt', '|')
    this.plural = 'Rail Bolts'
    this.launchCursor = 'rail'
    this.postSelectCursor = 1
    this.totalCursors = 2
    this.cursors = ['rail', 'bolt']
    this.hints = [
      'Click on square to start rail bolt',
      'Click on square end rail bolt'
    ]
    this.buttonHtml = '<span class="shortcut">R</span>ail Bolt'
    this.tip =
      'drag a rail bolt on to the map to increase the number of times you can strike'
    this.isOneAndDone = true
    this.hasFlash = false
    this.tag = 'rail'
    this.dragShape = [
      [0, 0, 1],
      [0, 1, 0],
      [0, 2, 0],
      [0, 3, 0],
      [0, 4, 1]
    ]
  }
  clone (ammo) {
    ammo = ammo || this.ammo
    return new RailBolt(ammo)
  }
  launchTo (coords, rr, cc, onEnd, map, viewModel, opposingViewModel, model) {
    return this.launchRightTo(
      coords,
      rr,
      cc,
      onEnd,
      map,
      viewModel,
      opposingViewModel,
      model,
      this.boltLaunchTo.bind(this)
    )
  }
  boltLaunchTo (
    coords,
    rr,
    cc,
    onEnd,
    map,
    viewModel,
    opposingViewModel,
    model
  ) {
    if (!opposingViewModel) {
      super.launchTo(
        coords,
        rr,
        cc,
        onEnd,
        map,
        viewModel,
        opposingViewModel,
        model
      )
      return
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
    this.animateFlying(
      start1,
      end1,
      viewModel.cellSizeScreen(),
      map,
      opposingViewModel
    )
      .then(
        this.animateFlying.bind(
          this,
          start2,
          end2,
          viewModel.cellSizeScreen(),
          map,
          viewModel
        )
      )
      .then(() => {
        start1.classList.add('marker')
        end1.classList.remove('portal')
        start2.classList.remove('portal')
        start2.classList.add('portal')
        end2.classList.add('marker')
        onEnd()
      })
  }

  static get single () {
    return new RailBolt(1)
  }
}
function getLinePoints (y1, x1, y2, x2, color) {
  const points = getListCanvas()
  // points.drawSegmentTo(x1, y1, x2, y2, color)
  points.drawRay(x1, y1, x2, y2, color)
  return points.list
}
export class GuassRound extends Torpedo {
  constructor (ammo) {
    super(ammo)
    this.name = 'Gauss Round'
    this.letter = '^'
    this.cursors = ['rlaunch', 'round']
    this.hints = [
      'Click on square to start guass round',
      'Click on square aim guass round'
    ]
    this.buttonHtml = '<span class="shortcut">G</span>uass Round'
    this.tip =
      'drag a guass round on to the map to increase the number of times you can strike'
    this.isOneAndDone = true
    this.hasFlash = false
    this.tag = 'round'
    this.dragShape = [
      [1, 0, 1],
      [1, 1, 0],
      [1, 2, 0],
      [0, 3, 0],
      [2, 3, 0]
    ]
  }
  clone (ammo) {
    ammo = ammo || this.ammo
    return new GuassRound(ammo)
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

    result.push([r - 3, c, 0])
    result.push([r + 3, c, 0])

    result.push([r, c - 3, 0])
    result.push([r, c + 3, 0])
    return result
  }

  launchTo (coords, rr, cc, onEnd, map, viewModel, opposingViewModel, model) {
    return this.launchRightTo(
      coords,
      rr,
      cc,
      onEnd,
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
  roundLaunchTo (
    coords,
    rr,
    cc,
    onEnd,
    map,
    viewModel,
    opposingViewModel,
    model
  ) {
    if (!opposingViewModel) {
      super.launchTo(
        coords,
        rr,
        cc,
        onEnd,
        map,
        viewModel,
        opposingViewModel,
        model
      )
      return
    }
    const [[r, c], target] = this.redoCoords(map, [rr, cc], coords)
    const start1 = opposingViewModel.gridCellAt(r, c)
    const start2 = viewModel.gridCellAt(r, c)
    const end2 = viewModel.gridCellAt(target[0], target[1])
    start1.classList.add('portal')
    start2.classList.add('portal')
    this.animateFlying(
      start2,
      end2,
      viewModel.cellSizeScreen(),
      map,
      opposingViewModel
    )
      .then(
        this.animateFlying.bind(
          this,
          start1,
          end2,
          viewModel.cellSizeScreen(),
          map,
          viewModel
        )
      )
      .then(() => {
        start1.classList.remove('portal')
        start2.classList.remove('portal')
        onEnd()
      })
  }

  static get single () {
    return new GuassRound(1)
  }
}

export class Scan extends Sweep {
  constructor (ammo) {
    super(ammo)
    this.name = 'Scan'
    this.letter = 'Z'
    this.cursors = ['dish', 'sweep']
    this.hints = ['Click on square to startscan', 'Click on square end scan']
    this.buttonHtml = 's<span class="shortcut">W</span>eep'
    this.tip = ''
    this.isOneAndDone = false
    this.hasFlash = false
    this.tag = 'scan'
  }
  clone (ammo) {
    ammo = ammo || this.ammo
    return new Scan(ammo)
  }
}

export const spaceWeaponsCatalogue = new WeaponCatalogue([
  new Missile(1),
  new RailBolt(1)
])
