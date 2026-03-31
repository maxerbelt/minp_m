import { bh } from '../terrain/bh.js'
import { furtherestFrom } from '../utilities.js'
import { Animator } from '../core/Animator.js'

export class Weapon {
  constructor (name, letter, isLimited, destroys, points) {
    if (new.target === Weapon) {
      throw new Error(
        'base class cannot be instantiated directly. Please extend it.'
      )
    }
    this.name = name
    this.plural = name + 's'
    this.letter = letter
    this.isLimited = isLimited
    this.destroys = destroys
    this.points = points
    this.hasFlash = false
    this.totalCursors = 1
    this.tip = `drag on to the map to increase the tally of ${this.name}`
    this.isOneAndDone = false
    this.splashPower = -1
    this.splashType = null
    this.volatile = false
    this.unattachedCursor = 0
    this.postSelectCursor = 0
    this.explodeOnTarget = false
    this.explodeOnSplash = false
    this.explodeOnHit = false
    this.animateOnTarget = false
    this.animateOnAoe = false
    this.splashSize = 1
    this.nonAttached = false
    this.animateOffsetY = 0
    this.classname = this.name.toLowerCase().replaceAll(' ', '-')
  }
  getTurn () {
    let turn = ''
    return turn
  }

  stepIdx (numCoords, select) {
    if (bh.seekingMode) {
      return numCoords
    }
    if (this.launchCursor) {
      let selectOffset = select - this.postSelectCursor
      if (selectOffset < 0) selectOffset = 0
      return numCoords + selectOffset
    }
    return numCoords
  }
  stepHint (idx) {
    switch (idx) {
      case 0:
        return this.launchCursor
          ? 'Click on square in Friendly ' + bh.mapHeading + ' to select weapon'
          : 'Click on square in Enemy ' +
              bh.mapHeading +
              ' to select launch point'
      default:
        return 'Click on square in Enemy ' + bh.mapHeading + ' to aim and fire'
    }
  }
  get numStep () {
    return bh.seekingMode ? this.cursors.length : this.totalCursors
  }
  get hasExtraSelectCursor () {
    // ensure a boolean is returned (previously returned '' when launchCursor was '')
    return !!(this.launchCursor && this.launchCursor !== this.cursors[0])
  }

  ammoStatusOld (ammoLeft) {
    return `${this.name}  Mode (${ammoLeft} left)`
  }
  ammoStatus (_ammoLeft) {
    return `${this.name}  Mode`
  }
  info () {
    return `${this.name} (${this.letter})`
  }
  splashAoe (map, coords) {
    return this.aoe(map, coords)
  }
  addSplash () {
    throw new Error('override in derided class')
  }

  addNeighbours (map, r, c, p1, p2, newEffect) {
    this.addOrthogonal(map, r, c, p1, newEffect)
    this.addDiagonal(map, r, c, p2, newEffect)
    return newEffect
  }

  addDiagonal (map, r, c, power, newEffect) {
    this.addSplash(map, r + 1, c + 1, power, newEffect)
    this.addSplash(map, r - 1, c + 1, power, newEffect)
    this.addSplash(map, r + 1, c - 1, power, newEffect)
    this.addSplash(map, r - 1, c - 1, power, newEffect)
    return newEffect
  }

  addOrthogonal (map, r, c, power, newEffect) {
    this.addSplash(map, r + 1, c, power, newEffect)
    this.addSplash(map, r - 1, c, power, newEffect)
    this.addSplash(map, r, c + 1, power, newEffect)
    this.addSplash(map, r, c - 1, power, newEffect)
    return newEffect
  }

  redoCoords (_map, base, coords) {
    return [base, coords[0]]
  }
  async cursorLaunchTo (coords, rr, cc, map, viewModel, opposingViewModel) {
    map = map || bh.map
    const [[r, c], target] = this.redoCoords(map, [rr, cc], coords)
    // const tt = target.toReversed()
    const [sr, sc] = map.randomEdge(...target)
    const start1 = opposingViewModel.gridCellAt(sr, sc)
    const end1 = viewModel.gridCellAt(...target)
    const flyCursor = this.letter === '-' ? 'crosshair' : this.cursors.at(-1)
    const { container, end } = await this.animateFlying(
      start1,
      end1,
      viewModel.cellSizeScreen(),
      map,
      viewModel,
      0,
      0.9,
      'cursor ' + flyCursor,
      false,
      true
    )
    await this.animateRipple(end1, container, end)
    return await this.launchTo(coords, r, c, map, viewModel, opposingViewModel)
  }

  async launchRightTo (
    coords,
    rr,
    cc,
    map,
    viewModel,
    opposingViewModel,
    model,
    launch
  ) {
    launch = launch || this.launchToRaw
    return await launch(
      coords,
      rr,
      cc,
      map,
      viewModel,
      opposingViewModel,
      model,
      this.processCoords.bind(this)
    )
  }
  processCoords (map, [rr, cc], coords) {
    const effect = this.aoe(map, coords)
    const t = model.getTarget(effect, this)
    const list = this.redoCoords(map, [rr, cc], coords)
    if (t) {
      const source = furtherestFrom(t[0], t[1], list)
      return [source, t, true]
    }
    return list
  }
  async launchTo (
    coords,
    rr,
    cc,
    map,
    viewModel,
    opposingViewModel,
    model,
    processCoords
  ) {
    return await this.launchToRaw(
      coords,
      rr,
      cc,
      map,
      viewModel,
      opposingViewModel,
      model,
      processCoords
    )
  }

  async launchToRaw (
    coords,
    rr,
    cc,
    map,
    viewModel,
    opposingViewModel,
    model,
    processCoords
  ) {
    processCoords = processCoords || this.redoCoords
    const [[r, c], target, hasCandidates] = processCoords(map, [rr, cc], coords)
    let sourceCell = null
    if (this.nonAttached) {
      sourceCell = viewModel.gridCellAt(r, c)
    } else if (opposingViewModel) {
      sourceCell = opposingViewModel.gridCellAt(r, c)
    } else if (this.postSelectCursor > 0) {
      sourceCell = viewModel.gridCellAt(r, c)
    } else {
      sourceCell = viewModel.gridCellAt(0, 0)
    }
    const targetCell = viewModel.gridCellAt(target[0], target[1])
    await this.animateFlying(sourceCell, targetCell, viewModel.cellSizeScreen())
    return { hasCandidates, target }
  }
  centerOf (el) {
    const r = el.getBoundingClientRect()
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2
    }
  }
  animateSplashExplode (target, cellSize) {
    if (this.explodeOnSplash)
      this.animateExplode(target, null, null, cellSize, this.splashType)
  }

  animateDetonation (target, cellSize) {
    this.animateExplode(
      target,
      null,
      null,
      cellSize,
      'plasma',
      1,
      'shake-heavy'
    )
  }
  async animateRipple (target, container, end) {
    end = end || this.centerOf(target)

    console.log('animateRipple', { target, end })

    const type = bh.subTerrainTagFromCell(target)

    // CREATE wrapper
    const animator = new Animator(
      'ripple-wrapper',
      'battleship-game-container',
      container,
      true,
      'ripple',
      type
    )

    animator.moveTo(end)
    animator.styleInner()
    await animator.run()
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
    end = end || this.centerOf(target)

    type = type || bh.subTerrainTagFromCell(target)

    // CREATE wrapper
    animator =
      animator ||
      new Animator(
        'explosion-wrapper',
        'battleship-game-container',
        container,
        true,
        'explosion',
        type
      )

    let mod = 1
    if (power !== undefined) {
      mod = 0.5 + power / 2
    }
    const scale = (cellSize * this.splashSize * mod) / 128

    animator.moveTo(end)
    animator.scaleInner(scale * 0.6, scale * 1.6)
    animator.styleInner()
    animator.shake(shake)
    await animator.run()
    animator.endShake(shake)
  }

  async animateFlying (
    source,
    target,
    cellSz,
    rotation = 0,
    duration = 0.7,
    classname = this.classname,
    doesExplode = true,
    animateOnTarget = this.animateOnTarget
  ) {
    const { animator, end, start, cellSize } = this.initAnimate(
      cellSz,
      target,
      source,
      classname
    )
    if (!animateOnTarget) {
      await this.checkAnimate(target, animator, end, cellSize, doesExplode)
      return { container: animator.container, end, cellSize }
    }

    this.animateFlyingBase(end, start, animator, rotation, duration)

    await this.finishAnimate(target, end, cellSize, doesExplode, animator)
    return { container: animator.container, end, cellSize }
  }

  async finishAnimate (target, end, cellSize, doesExplode, animator) {
    const explode = doesExplode && this.explodeOnTarget
    if (!explode) {
      animator.delayInner(500)
    }

    await animator.run()

    if (explode) {
      await this.animateExplode(target, animator.container, end, cellSize)
    }
  }

  async checkAnimate (target, animator, end, cellSize, doesExplode) {
    if (!this.animateOnTarget) {
      if (doesExplode) {
        await this.animateExplode(
          target,
          animator.container,
          end,
          cellSize,
          null,
          null,
          null,
          animator
        )
        return false
      }
    }
    return true
  }

  initAnimate (cellSize, target, source, className) {
    cellSize = cellSize || 30

    const animator = new Animator(
      'flying-weapon-wrapper',
      'battleship-game-container',
      null,
      true,
      'flying-weapon',
      className
    )

    const end = this.centerOf(target)
    console.log('initAnimateFlying', { target, end })
    const start = this.centerOf(source)
    start.y -= this.animateOffsetY
    return { animator, end, start, cellSize }
  }

  animateFlyingBase (end, start, animator, rotation = 0, duration = 0.7) {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const angle = rotation || (Math.atan2(dy, dx) * 180) / Math.PI

    animator.setInnerProperty('--start-x', `${start.x}px`)
    animator.setInnerProperty('--start-y', `${start.y}px`)
    animator.setInnerProperty('--end-x', `${end.x}px`)
    animator.setInnerProperty('--end-y', `${end.y}px`)
    animator.setInnerProperty('--angle', `${angle}deg`)
    animator.setInnerProperty('--duration', `${duration}s`)
  }
}

export class StandardShot extends Weapon {
  constructor () {
    super('Standard Shot', '-', false, true, 1)
    this.cursors = ['']
    this.launchCursor = 'crosshair'
    this.tag = 'single'
    this.hints = ['Click On Square To Fire']
    this.buttonHtml = '<span class="shortcut">S</span>ingle Shot'
  }

  aoe (_map, coords) {
    return [[coords[0][0], coords[0][1], 4]]
  }
  ammoStatus () {
    return `Single Shot Mode`
  }
}

export const standardShot = new StandardShot()

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
