import { bh } from '../terrains/all/js/bh.js'
import { furtherestFrom } from '../core/utilities.js'
import { Animator } from '../core/Animator.js'
import { Random } from '../core/Random.js'
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
    this.splashMin = null
    this.splashMax = null
    this.volatile = false
    this.unattachedCursor = 0
    this.postSelectCursor = 0
    this.explodeOnTarget = false
    this.explodeOnSplash = false
    this.explodeOnHit = false
    this.animateOnTarget = false
    this.animateOnAoe = false
    this.splashSize = 1.3
    this.nonAttached = false
    this.animateOffsetY = 0
    this.classname = this.name.toLowerCase().replaceAll(' ', '-')
  }

  /**
   * REFACTORING: Helper to create clones of weapons with optional ammo override
   * Eliminates duplicate clone() methods in all subclasses
   */
  createClone (weaponClass, ammoOverride) {
    ammoOverride = ammoOverride || this.ammo
    return new weaponClass(ammoOverride)
  }

  /**
   * REFACTORING: Helper to initialize common weapon properties from config object
   * Reduces constructor bloat by consolidating repeated property assignments
   */
  setWeaponProperties (config) {
    if (config.hints) this.hints = config.hints
    if (config.buttonHtml) this.buttonHtml = config.buttonHtml
    if (config.tag) this.tag = config.tag
    if (config.tip) this.tip = config.tip
    if (config.splashType) this.splashType = config.splashType
    if (config.splashPower !== undefined) this.splashPower = config.splashPower
    if (config.cursors) this.cursors = config.cursors
    if (config.totalCursors) this.totalCursors = config.totalCursors
    if (config.launchCursor) this.launchCursor = config.launchCursor
    if (config.animateOnTarget !== undefined)
      this.animateOnTarget = config.animateOnTarget
    if (config.explodeOnTarget !== undefined)
      this.explodeOnTarget = config.explodeOnTarget
    if (config.hasFlash !== undefined) this.hasFlash = config.hasFlash
  }

  /**
   * REFACTORING: Static helper to generate flight sound URLs
   * Eliminates duplicate URL generation across all weapon subclasses
   */
  static getFlightSoundUrl (soundFileName, moduleUrl) {
    return new URL(`../sounds/${soundFileName}`, moduleUrl)
  }

  get flightSound () {
    return null
  }
  get btnClass () {
    return 'weapon-btn-' + this.tag
  }
  playFlightSound () {
    if (this.flightSound) {
      bh.audio.playAfterLoad(this.name + '-flight', this.flightSound)
    }
  }
  get boomSound () {
    return null
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
    let start1
    if (opposingViewModel) {
      start1 = opposingViewModel.gridCellAt(sr, sc)
    } else {
      start1 = viewModel.gridCellAt(sr, sc)
    }
    const end1 = viewModel.gridCellAt(...target)
    const flyCursor = this.letter === '-' ? 'crosshair' : this.cursors.at(-1)
    const options = this.defaultAnimateOptions
    options.classname = 'cursor ' + flyCursor
    options.duration = 0.9
    options.animateOnTarget = true
    options.doesExplode = false
    const { container, end } = await this.animateFlying(
      start1,
      end1,
      viewModel.cellSizeScreen(),
      options,
      viewModel
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
    launch = launch || this.launchToRaw.bind(this)
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
  processCoords (map, [rr, cc], coords, model) {
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
    const [[r, c], target, hasCandidates] = processCoords(
      map,
      [rr, cc],
      coords,
      model
    )
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
    await this.animateFlyingOnVM(sourceCell, targetCell, viewModel)
    return hasCandidates ? { target } : {}
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
      this.animateExplodeRaw(target, cellSize, this.splashType)
  }

  animateDetonation (target, cellSize) {
    this.animateExplodeRaw(target, cellSize, 'plasma', 1, 'shake-heavy')
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

  async animateExplodeWithAnimator (
    target,
    end,
    cellSize,
    animator = null,
    viewModel = null
  ) {
    return await this.animateExplode(
      target,
      animator?.container,
      end,
      cellSize,
      null,
      null,
      null,
      null,
      viewModel
    )
  }
  async animateExplodeRaw (target, cellSize, type, power, shake = 'shake') {
    return await this.animateExplode(
      target,
      null,
      null,
      cellSize,
      type,
      power,
      shake
    )
  }

  async animateExplode (
    target,
    container,
    end,
    cellSize,
    type,
    power,
    shake = 'shake',
    animator = null,
    viewModel = null,
    id = null
  ) {
    end = end || this.centerOf(target)
    const idTag = id ? ' explode-at-' + id : ''
    type = type || bh.subTerrainTagFromCell(target)
    bh.playBoom(type)
    // CREATE wrapper
    animator =
      animator ||
      new Animator(
        'explosion-wrapper' + idTag,
        'battleship-game-container',
        container,
        true,
        'explosion',
        type
      )

    let mod = 1
    if (power != null) {
      mod = 0.5 + power / 2
    }
    let splash = this.splashSize
    if (this.splashMin !== null && this.splashMax !== null) {
      splash = Random.floatWithRange(this.splashMin, this.splashMax)
    }

    const scale = (cellSize * splash * mod) / 128

    animator.moveTo(end)
    animator.scaleInner(scale * 0.6, scale * 1.6)
    animator.styleInner()
    animator.shake(shake)
    await animator.run()
    animator.endShake(shake)
  }
  async animateFlyingOnVM (source, target, viewModel) {
    return await this.animateFlying(
      source,
      target,
      viewModel.cellSizeScreen(),
      this.defaultAnimateOptions,
      viewModel
    )
  }
  get defaultAnimateOptions () {
    return {
      rotation: 0,
      duration: 0.7,
      classname: this.classname,
      doesExplode: true,
      animateOnTarget: this.animateOnTarget
    }
  }

  async animateFlying (
    source,
    target,
    cellSz,
    options = this.defaultAnimateOptions,
    viewModel = null
  ) {
    const { rotation, duration, classname, doesExplode, animateOnTarget } =
      options
    const { animator, end, start, cellSize } = this.initAnimate(
      cellSz,
      target,
      source,
      classname
    )
    if (!animateOnTarget) {
      await this.checkAnimate(
        target,
        animator,
        end,
        cellSize,
        doesExplode,
        viewModel
      )
      return { container: animator.container, end, cellSize }
    }
    this.playFlightSound()
    this.animateFlyingBase(end, start, animator, rotation, duration)

    await this.finishAnimate(
      target,
      end,
      cellSize,
      doesExplode,
      animator,
      viewModel
    )
    return { container: animator.container, end, cellSize }
  }

  async finishAnimate (
    target,
    end,
    cellSize,
    doesExplode,
    animator,
    viewModel = null
  ) {
    const explode = doesExplode && this.explodeOnTarget
    if (!explode) {
      animator.delayInner(500)
    }

    await animator.run()

    if (explode) {
      await this.animateExplodeWithAnimator(
        target,
        end,
        cellSize,
        animator,
        viewModel
      )
    }
  }

  async checkAnimate (
    target,
    animator,
    end,
    cellSize,
    doesExplode,
    viewModel = null
  ) {
    if (!this.animateOnTarget) {
      if (doesExplode) {
        await this.animateExplodeWithAnimator(
          target,
          end,
          cellSize,
          animator,
          viewModel
        )
        return false
      }
    }
    return true
  }

  initAnimate (cellSize, target, source, className) {
    cellSize = cellSize || 30
    const classNames = className.split(' ')
    const animator = new Animator(
      'flying-weapon-wrapper',
      'battleship-game-container',
      null,
      true,
      'flying-weapon',
      ...classNames
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
  get flightSound () {
    const url = new URL('../terrains/all/sounds/shot.mp3', import.meta.url)
    return url
  }

  aoe (_map, coords) {
    return [[coords[0][0], coords[0][1], 4]]
  }
  ammoStatus () {
    return `Single Shot Mode`
  }
}

export const standardShot = new StandardShot()
