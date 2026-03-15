import { bh } from '../terrain/bh.js'
import { shuffleArray, randomElement } from '../utilities.js'
import { gameStatus } from './StatusUI.js'
import { setupDragHandlers } from '../selection/dragndrop.js'
import { Waters } from './Waters.js'
import { Player } from './steps.js'

export class Friend extends Waters {
  constructor (friendUI) {
    super(friendUI)
    this.testContinue = true
    this.friendlyWaters = true
    this.steps.player = Player.friend
    this.steps.onEndTurn = this.onEndTurn.bind(this)
  }

  onEndTurn () {
    if (this?.opponent && !this.opponent.boardDestroyed) {
      this.opponent.onBeginTurn()
    }
  }

  getRandomHitCoordinate (hitCoordinates) {
    const totalHits = hitCoordinates.length
    if (totalHits < 1) return null
    if (totalHits === 1) return hitCoordinates[0]
    const randomIndex = Math.floor(Math.random() * totalHits)
    return hitCoordinates[randomIndex]
  }

  updateBombResultsFromResult (result) {
    if (!result) return
    const { hits, sunks, reveals, info, shots } = result
    this.updateResultsOfBomb(
      this.loadOut.SShot(),
      hits,
      sunks,
      reveals,
      info,
      shots
    )
  }
  isCancelled (seeking) {
    if (seeking && (!this.testContinue || this.boardDestroyed)) {
      clearInterval(seeking)
      return true
    }
    return false
  }

  sShot (r, c) {
    const sShot = this.loadOut.SShot()
    return this.seekHit(sShot, r, c, 4)
  }

  seekHit (weapon, r, c, power) {
    if (!bh.inBounds(r, c))
      return { hits: 0, shots: 0, reveals: 0, sunk: '', info: '' }

    if (power > 0) this.flame(r, c, weapon.hasFlash)
    const key =
      power > 0 ? this.score.createShotKey(r, c) : this.score.newShotKey(r, c)
    if (key === null) {
      // if we are here, it is because of carpet bomb, so we can just
      return { hits: 0, shots: 0, reveals: 0, sunk: '', info: '' }
    }

    const result = this.fireShot(weapon, r, c, power, key)
    this.updateUI(this.ships)
    return result
  }

  seekBomb (weapon, effect) {
    const { hits, sunks, reveals, info, shots } = this.seekBombRaw(
      weapon,
      effect
    )
    this.updateResultsOfBomb(weapon, hits, sunks, reveals, info, shots)
  }
  seekBombRaw (weapon, effect) {
    const map = bh.map
    this.updateUI()
    let hits = 0
    let reveals = 0
    let sunks = ''
    let info = ''
    let shots = 0
    for (const [r, c, power] of effect) {
      ;({ hits, sunks, reveals, shots, info } = this.applyToPosition(
        map,
        r,
        c,
        weapon,
        power,
        hits,
        sunks,
        reveals,
        shots,
        info
      ))
    }
    if (hits > 0) this.flash('long')
    return { hits, sunks, reveals, info, shots }
  }

  applyToPosition (map, r, c, weapon, power, hits, sunks, reveals, shots, info) {
    if (map.inBounds(r, c)) {
      const result = this.seekHit(weapon, r, c, power)
      if (result?.hits) hits += result.hits
      if (result?.sunk) sunks += result.sunk
      if (result?.reveals) reveals += result.reveals
      if (result?.shots) shots += result.shots
      if (result?.info) info += result.info + ' '
    }
    return { hits, sunks, reveals, shots, info }
  }

  randomBomb (seeking) {
    const map = bh.map
    this.loadOut.onDestroy = this.seekBomb.bind(this)

    for (let impact = 9; impact > 1; impact--)
      for (let attempt = 0; attempt < 12; attempt++) {
        if (this.isCancelled(seeking)) return
        const { r, c } = this.randomLocation(map)
        if (this.score.newShotKey(r, c)) {
          this.launchRandomWeapon(r, c, false)
          this.loadOut.aimWeapon(bh.map, r, c, this.loadOut.selectedWeapon)
          return
        }
      }
  }

  destroyOne (weapon, effect, target) {
    const candidates = this.getHitCandidates(effect, weapon)
    if (candidates.length < 1) {
      this.seekBomb(weapon, effect)
      return
    }
    if (target === null || target === undefined || target?.length < 2) {
      target = randomElement(candidates)
    }
    const newEffect = this.getStrikeSplash(weapon, target)
    this.tryFireAt2(weapon, newEffect)
  }

  randomDestroyOne (seeking) {
    const map = bh.map
    this.loadOut.destroyOneOfMany = this.destroyOne.bind(this)

    if (this.isCancelled(seeking)) return

    const r = this.randomLine()
    this.launchRandomWeapon(r, 0, false)
    this.loadOut.aimWeapon(map, r, map.cols - 1, this.loadOut.selectedWeapon)
  }

  randomSeek (seeking) {
    const maxAttempts = 13
    let result = null
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (this.isCancelled(seeking)) return
      const loc = this.randomLoc()

      if (!loc) {
        this.UI.showNotice('something went wrong!')
        clearInterval(seeking)
        this.boardDestroyed = true
        this.testContinue = false
        return
      }
      result = this.sShot(loc[0], loc[1], false)
      if (result?.shots && result.shots > 0) return
    }
    const { hits, sunks, reveals, info, shots } = result
    this.updateResultsOfBomb(
      this.loadOut.SShot(),
      hits,
      sunks,
      reveals,
      info,
      shots
    )
  }

  restartBoard () {
    this.resetBase()
    this.UI.clearVisuals()
    for (const ship of this.ships) {
      ship.reset()
      this.UI.revealShip(ship)
    }
    this.armWeapons()
  }
  restartFriendBoard () {
    this.resetBase()
    this.UI.clearFriendVisuals()
    for (const ship of this.ships) {
      ship.reset()
      this.UI.revealShip(ship)
    }
    this.armWeapons()
  }
  launchTo (coords, rr, cc, currentWeapon, onEnd) {
    currentWeapon.weapon.cursorLaunchTo(
      coords,
      rr,
      cc,
      onEnd,
      bh.map,
      this.UI,
      this.opponent?.UI
    )
  }
  test () {
    gameStatus.flush()
    this.UI.testMode()
    this.UI.testBtn.disabled = true
    this.UI.seekBtn.disabled = true
    this.UI.stopBtn.disabled = false

    this.restartBoard()

    this.seek()
  }
  setupUntried () {
    this.untried = bh.map.fullMask
  }
  syncUntried () {
    this.untried = this.untried.take(this.score.shot)
  }

  randomLoc () {
    this.syncUntried()
    const locs = this.untried.toCoords
    const noOfLocs = locs.length

    if (noOfLocs === 0) return null
    if (noOfLocs === 1) return locs[0].split(',').map(x => Number.parseInt(x))

    const idx = Math.floor(Math.random() * locs.length)

    return locs[idx].split(',').map(x => Number.parseInt(x))
  }

  randomLine () {
    this.syncUntried()
    let locs = this.untried.toCoords
    if (locs.length === 0) {
      console.warn('no more locations to choose from')
      return 0
    }

    const tally = locs.reduce((acc, [r]) => {
      acc[r] = 1 + (acc[r] || 0)
      return acc
    }, {})

    const ordered = Object.entries(tally)
    let line = shuffleArray(ordered)
    line.sort((a, b) => b[1] - a[1])

    const idx = line.findIndex(i => i[1] < line[0][1])

    if (idx < 3) {
      return Number.parseInt(line[0])
    }
    return Number.parseInt(line[Math.floor(Math.random() * (idx - 1))])
  }

  seek () {
    this.testContinue = true
    this.boardDestroyed = false
    this.armWeapons()
    this.score.shot = bh.map.blankMask
    this.setupUntried()

    let seeking = setInterval(() => {
      if (this.isCancelled(seeking)) {
        this.UI.testBtn.disabled = false
        this.UI.seekBtn.disabled = false
        this.UI.stopBtn.classList.add('hidden')
        seeking = null
      } else {
        this.seekStep(seeking)
      }
    }, 270)
  }
  scan (weapon, effect) {
    this.updateUI()
    const map = bh.map
    for (const position of effect) {
      const [r, c] = position

      if (map.inBounds(r, c)) {
        /// reveal  what is in this position
      }
    }
    /// reveal
  }
  randomScan (seeking) {
    const map = bh.map
    this.loadOut.reveal = this.scan.bind(this)
    if (this.isCancelled(seeking)) return
    const { r, c } = this.randomLocation(map)
    const { r1, c1 } = this.randomLocation(map)

    this.loadOut.aimWeapon(map, r, c)
    this.loadOut.aimWeapon(map, r1, c1)
  }
  randomLocation (map) {
    const r = Math.floor(Math.random() * (map.rows - 2)) + 1
    const c = Math.floor(Math.random() * (map.cols - 2)) + 1
    return { r, c }
  }

  randomEffect (effect, seeking) {
    switch (effect) {
      case 'DestroyOne':
        this.randomDestroyOne(seeking)
        break
      case 'Bomb':
        this.randomBomb(seeking)
        break
      case 'Scan':
        this.randomScan(seeking)
        break
      case 'Seek':
        this.randomSeek(seeking)
        break
    }
  }

  selectShot (hits, seeking) {
    this.score.reveal = this.score.reveal.take(this.score.shot)
    if (this.score.reveal.occupancy > 0) {
      this.selectRandomCandidate(this.score.reveal)
      return
    }
    if (hits && hits.occupancy > 0) {
      const cross = hits.clone.dilateCross().take(this.score.shot)
      if (cross.occupancy > 0) {
        this.selectRandomCandidate(cross)
        return
      }

      const surround = hits.clone.dilate(1).take(this.score.shot)
      if (surround.occupancy > 0) {
        this.selectRandomCandidate(surround)
        return
      }
    }
    if (this.score.hints && this.score.hints.occupancy > 0) {
      const surroundHints = this.score.hints.clone
        .dilate(1)
        .take(this.score.shot)
      if (surroundHints.occupancy > 0) {
        this.selectRandomCandidate(surroundHints)
        return
      }
    }
    const op = this.loadOut.switchToPreferredWeapon()
    if (op) {
      this.randomEffect(op)
    } else {
      this.loadOut.switchToSingleShot()
      this.randomSeek(seeking)
    }
  }

  selectRandomCandidate (candidate) {
    this.loadOut.switchToSingleShot()
    const [r, c] = candidate.randomOccupied
    const result = this.sShot(r, c, false)
    const { hits, sunks, reveals, info, shots } = result
    this.updateResultsOfBomb(
      this.loadOut.getSingleShot(),
      hits,
      sunks,
      reveals,
      info,
      shots
    )
  }

  getHits () {
    const hitss = this.shipsUnsunk().flatMap(s => [...s.hits])
    if (hitss.length === 0) return bh.map.blankMask
    const hits = hitss.map(h => {
      const [r, c] = h.split(',').map(n => Number.parseInt(n))
      return [r, c]
    })
    let results = bh.map.blankMask.fromCoords(hits)
    return results
  }

  getHints () {
    const hints = this.score.hint
    return [...hints].map(h => {
      const [r, c] = h.split(',').map(n => Number.parseInt(n))
      return [r, c]
    })
  }
  seekStep (seeking) {
    const hits = this.getHits()
    this.selectShot(hits, seeking)
    this.steps.endTurn()
  }
  updateWeaponStatus () {
    /* only needs implementation if enemy */
  }
  updateMode (wps) {
    if (this.isRevealed || this.boardDestroyed) {
      return
    }
    this.updateWeapon(wps)
  }
  stopWaiting () {
    /* only needs implementation if enemy */
  }
  deactivateWeapon () {
    /* only needs implementation if enemy */
  }
  resetModel () {
    this.score.reset()
    this.resetMap()
  }
  buildBoard () {
    this.UI.buildBoard()
    this.resetShipCells()
    this.UI.makeDroppable(this)
    setupDragHandlers(this.UI)
  }

  resetUI (ships) {
    this.resetBase()
    ships = ships || this.ships
    this.UI.reset(ships)
    this.buildBoard()
    this.UI.buildTrays(ships, this.shipCellGrid)
    this.updateUI(ships)
  }
}
