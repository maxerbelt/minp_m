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
    // this.score.finishTurn()
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
    const { hits, sunk, reveals, info, shots } = result
    this.updateResultsOfBomb(
      this.loadOut.getSingleShot(),
      hits,
      sunk,
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

  seekHit (weapon, r, c, power) {
    if (this.isHitInvalid(r, c, power, true, weapon.hasFlash))
      return { hits: 0, shots: 0, reveals: 0, sunk: '', info: '' }

    const result = this.fireShot(weapon, r, c, power)
    this.updateUI(this.ships)
    return result
  }

  seekBomb (weapon, effect) {
    const { hits, sunk, reveals, info, shots } = this.seekBombRaw(
      weapon,
      effect
    )
    this.updateResultsOfBomb(weapon, hits, sunk, reveals, info, shots)
  }
  seekBombRaw (weapon, effect) {
    this.updateUI()
    let hits = 0
    let reveals = 0
    let sunk = ''
    let info = ''
    let shots = 0
    for (const [r, c, power] of effect) {
      ;({ hits, sunk, reveals, shots, info } = this.applyToPosition(
        r,
        c,
        weapon,
        power,
        hits,
        sunk,
        reveals,
        shots,
        info
      ))
    }
    if (hits > 0) this.flash('long')
    return { hits, sunk, reveals, info, shots }
  }

  applyToPosition (r, c, weapon, power, hits, sunk, reveals, shots, info) {
    if (bh.inBounds(r, c)) {
      const result = this.seekHit(weapon, r, c, power)
      if (result?.hits) hits += result.hits
      if (result?.sunk) sunk += result.sunk
      if (result?.reveals) reveals += result.reveals
      if (result?.shots) shots += result.shots
      if (result?.info) info += result.info + ' '
    }
    return { hits, sunk, reveals, shots, info }
  }

  async randomBomb (seeking) {
    const map = bh.map
    this.loadOut.onDestroy = this.seekBomb.bind(this)

    for (let impact = 9; impact > 1; impact--)
      for (let attempt = 0; attempt < 12; attempt++) {
        if (this.isCancelled(seeking)) return
        const { r, c } = this.randomLocation(map)
        if (this.score.newShotKey(r, c)) {
          if (!this.launchRandomWeapon(r, c, false)) {
            await this.loadOut.aimWeapon(
              bh.map,
              r,
              c,
              this.loadOut.selectedWeapon
            )
          }
          return
        }
      }
  }

  async destroyOne (weapon, effect, target) {
    const candidates = this.getHitCandidates(effect, weapon)
    if (candidates.length < 1) {
      await this.seekBomb(weapon, effect)
      return
    }
    if (target === null || target === undefined || target?.length < 2) {
      target = await this.randomElement(candidates)
    }
    const newEffect = this.getStrikeSplash(weapon, target)
    this.tryFireAt2(weapon, newEffect)
  }

  async randomDestroyOne (seeking) {
    const map = bh.map
    this.loadOut.destroyOneOfMany = this.destroyOne.bind(this)

    if (this.isCancelled(seeking)) return

    const r = this.randomLine()
    this.launchRandomWeapon(r, 0, false)
    await this.loadOut.aimWeapon(
      map,
      r,
      map.cols - 1,
      this.loadOut.selectedWeapon
    )
  }
  isHitValid (r, c) {
    return !this.isHitInvalid(r, c, 4, false, false)
  }
  randomSeek (seeking) {
    const maxAttempts = 13
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
      if (this.isHitValid(loc[0], loc[1])) {
        this.launchSingleShot(loc[0], loc[1])
        return
      }
    }
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
  async launchTo (coords, rr, cc, currentWeapon) {
    return await currentWeapon.weapon.cursorLaunchTo(
      coords,
      rr,
      cc,
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
    if (noOfLocs === 1) return locs[0]

    const idx = Math.floor(Math.random() * locs.length)

    return locs[idx]
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
      return line[0]
    }
    return line[Math.floor(Math.random() * (idx - 1))]
  }

  async seek () {
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

  async randomEffect (effect, seeking) {
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

  async selectShot (hits, seeking) {
    const hasRevealed = await this.finishRevealed()
    if (hasRevealed) {
      return
    }
    const hasPartialSunk = await this.finishPartiallySunk(hits)
    if (hasPartialSunk) {
      return
    }

    const hasHints = await this.finishHints()
    if (hasHints) {
      return
    }

    const op = this.loadOut.switchToPreferredWeapon()
    if (op) {
      await this.randomEffect(op)
    } else {
      this.loadOut.switchToSingleShot()
      this.randomSeek(seeking)
    }
  }

  async finishHints () {
    const numHints = this.score?.hint?.occupancy || 0
    if (numHints > 0) {
      const surroundHints = this.score.hint.clone
        .dilate(1)
        .take(this.score.shot)

      if (surroundHints.occupancy > 0) {
        await this.selectRandomCandidate(surroundHints)
        return true
      }
    }
    return false
  }

  async finishRevealed () {
    this.score.reveal = this.score.reveal.take(this.score.shot)
    if (this.score.reveal.occupancy > 0) {
      await this.selectRandomCandidate(this.score.reveal)
      return true
    }
    return false
  }

  async finishPartiallySunk (hits) {
    const numHits = hits ? hits.occupancy : 0
    if (numHits <= 0) return false
    const shots = this.score.shot
    console.log('shot', shots.occupancy, shots.toAscii)
    let cross = hits.clone.dilateCross()
    console.log('cross', cross.toAscii)
    cross = cross.take(shots)
    console.log('candidates', cross.toAscii)
    if (cross.occupancy > 0) {
      await this.selectRandomCandidate(cross)
      return true
    }

    const surround = hits.clone.dilate(1).take(this.score.shot)
    console.log('surround', surround.toAscii)
    if (surround.occupancy > 0) {
      await this.selectRandomCandidate(surround)
      return true
    }
  }

  async selectRandomCandidate (candidate) {
    this.loadOut.switchToSingleShot()
    const [c, r] = candidate.randomOccupied
    await this.launchSingleShot(r, c, false)
  }

  getHits () {
    const blankMask = bh.map.blankMask
    const hitss = this.shipsUnsunk().reduce((acc, ship) => {
      const hits = ship.hits
      const shipHits = hits.toMask(blankMask.width, blankMask.height)
      acc = acc.join(shipHits)
      return acc
    }, blankMask)
    return hitss
  }

  async seekStep (seeking) {
    const hits = this.getHits()

    await this.selectShot(hits, seeking)
    this.steps.endTurn()
  }
  updateWeaponStatus () {
    /* only needs implementation if enemy */
  }
  updateMode (wps) {
    if (this.isRevealed || this.boardDestroyed) {
      return
    }
    this.updateWeaponButton(wps)
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
