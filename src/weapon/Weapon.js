import { bh } from '../terrain/bh.js'
import { furtherestFrom } from '../utilities.js'
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
    throw Error('override in derided class')
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

  launchRightTo (
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
    return launch(
      coords,
      rr,
      cc,
      map,
      viewModel,
      opposingViewModel,
      model,
      (map, [rr, cc], coords) => {
        const effect = this.aoe(map, coords)
        const t = model.getTarget(effect, this)
        const list = this.redoCoords(map, [rr, cc], coords)
        if (t) {
          const source = furtherestFrom(t[0], t[1], list)
          return [source, t, true]
        }
        return list
      }
    )
  }

  launchTo (
    coords,
    rr,
    cc,
    map,
    viewModel,
    opposingViewModel,
    model,
    processCoords
  ) {
    return this.launchToRaw(
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
    await this.animateFlying(
      sourceCell,
      targetCell,
      viewModel.cellSizeScreen(),
      map,
      viewModel
    )
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
    container =
      container || document.getElementById('battleship-game-container')
    end = end || this.centerOf(target)
    const classlist = target.classList
    const wanted = ['space', 'asteroid', 'sea', 'land']

    const type = wanted.find(cls => classlist.contains(cls))

    // CREATE wrapper
    const explody1 = document.createElement('div')
    const explody = document.createElement('div')

    explody1.className = 'ripple-wrapper'
    explody.className = 'ripple ' + type

    // Convert viewport coordinates to container-relative coordinates
    const containerRect = container.getBoundingClientRect()
    const relX = end.x - containerRect.left
    const relY = end.y - containerRect.top
    explody1.style.setProperty('--x', `${relX}px`)
    explody1.style.setProperty('--y', `${relY}px`)

    // Position explosion to fill wrapper (override fixed position from CSS)
    explody.style.position = 'absolute'
    explody.style.inset = '0'
    explody.style.transform = 'none'
    explody.style.width = '100%'
    explody.style.height = '100%'

    // append inner explosion to wrapper and add to DOM so wrapper positioning is used
    explody1.appendChild(explody)

    // DESTROY at end
    return new Promise(resolve => {
      explody.addEventListener(
        'animationend',
        () => {
          explody1.remove()
          resolve()
        },
        { once: true }
      )
      container.appendChild(explody1)
      // force style recalc then start animation
      explody.getBoundingClientRect()
      requestAnimationFrame(() => {
        explody.classList.add('play')
      })
    })
  }

  async animateExplode (
    target,
    container,
    end,
    cellSize,
    type,
    power,
    shake = 'shake'
  ) {
    container =
      container || document.getElementById('battleship-game-container')
    end = end || this.centerOf(target)
    const classlist = target.classList
    const wanted = ['space', 'asteroid', 'sea', 'land']

    type = type || wanted.find(cls => classlist.contains(cls))

    // CREATE wrapper
    const explody1 = document.createElement('div')
    const explody = document.createElement('div')
    let mod = 1
    if (power !== undefined) {
      mod = 0.5 + power / 2
    }
    const scale = (cellSize * this.splashSize * mod) / 128
    explody1.className = 'explosion-wrapper'
    explody.className = 'explosion ' + type

    // Convert viewport coordinates to container-relative coordinates
    const containerRect = container.getBoundingClientRect()
    const relX = end.x - containerRect.left
    const relY = end.y - containerRect.top
    explody1.style.setProperty('--x', `${relX}px`)
    explody1.style.setProperty('--y', `${relY}px`)
    explody.style.setProperty('--scale-start', `${scale * 0.6}`)
    explody.style.setProperty('--scale-end', `${scale * 1.6}`)

    // Position explosion to fill wrapper (override fixed position from CSS)
    explody.style.position = 'absolute'
    explody.style.inset = '0'
    explody.style.transform = 'none'
    explody.style.width = '100%'
    explody.style.height = '100%'

    // append inner explosion to wrapper and add to DOM so wrapper positioning is used
    explody1.appendChild(explody)

    container.classList.add(shake)
    // DESTROY at end
    return new Promise(resolve => {
      explody.addEventListener(
        'animationend',
        () => {
          container.classList.remove(shake)
          explody1.remove()
          resolve()
        },
        { once: true }
      )
      container.appendChild(explody1)
      // force style recalc then start animation
      explody.getBoundingClientRect()
      requestAnimationFrame(() => {
        explody.classList.add('play')
      })
    })
  }

  async animateFlying (
    source,
    target,
    cellSz,
    map,
    viewModel,
    rotation = 0,
    duration = 0.7,
    classname = this.classname,
    doesExplode = true,
    animateOnTarget = this.animateOnTarget
  ) {
    const { container, end, start, cellSize } = this.initAnimate(
      cellSz,
      target,
      source
    )
    if (!animateOnTarget) {
      await this.checkAnimate(
        target,
        container,
        end,
        cellSize,
        map,
        viewModel,
        doesExplode
      )
      return { container, end, cellSize }
    }

    const pointer = this.animateFlyingBase(
      end,
      start,
      container,
      rotation,
      duration,
      classname
    )

    await this.finishAnimate(
      pointer,
      target,
      container,
      end,
      cellSize,
      map,
      viewModel,
      doesExplode
    )
    return { container, end, cellSize }
  }

  async finishAnimate (
    pointer,
    target,
    container,
    end,
    cellSize,
    map,
    viewModel,
    doesExplode
  ) {
    await new Promise(resolve => {
      pointer.addEventListener('animationend', resolve, { once: true })
    })
    if (doesExplode && this.explodeOnTarget) {
      pointer.remove()
      await this.animateTargetExplode(
        target,
        container,
        end,
        cellSize,
        map,
        viewModel
      )
      return
    }
    await new Promise(resolve => setTimeout(resolve, 500))
    pointer.remove()
  }

  async checkAnimate (
    target,
    container,
    end,
    cellSize,
    map,
    viewModel,
    doesExplode
  ) {
    if (!this.animateOnTarget) {
      if (doesExplode) {
        await this.animateTargetExplode(
          target,
          container,
          end,
          cellSize,
          map,
          viewModel
        )
        return false
      }
    }
    return true
  }

  async animateTargetExplode (target, container, end, cellSize) {
    return this.animateExplode(target, container, end, cellSize)
  }
  initAnimate (cellSize, target, source) {
    cellSize = cellSize || 30
    const container = document.getElementById('battleship-game-container')
    const end = this.centerOf(target)
    const start = this.centerOf(source)
    start.y -= this.animateOffsetY
    return { container, end, start, cellSize }
  }

  animateFlyingBase (
    end,
    start,
    container,
    rotation = 0,
    duration = 0.7,
    classname = this.classname
  ) {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const angle = rotation || (Math.atan2(dy, dx) * 180) / Math.PI

    const pointer = document.createElement('div')

    pointer.className = 'flying-weapon ' + classname

    pointer.style.setProperty('--start-x', `${start.x}px`)
    pointer.style.setProperty('--start-y', `${start.y}px`)
    pointer.style.setProperty('--end-x', `${end.x}px`)
    pointer.style.setProperty('--end-y', `${end.y}px`)
    pointer.style.setProperty('--angle', `${angle}deg`)
    pointer.style.setProperty('--duration', `${duration}s`)
    container.appendChild(pointer)
    return pointer
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
