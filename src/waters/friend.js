import { bh } from '../terrains/all/js/bh.js'
import { randomElement, shuffleArray } from '../core/utilities.js'
import { gameStatus } from './StatusUI.js'
import { setupDragHandlers } from '../selection/dragndrop.js'
import { Waters } from './Waters.js'
import { Player } from './steps.js'
import { LoadOut } from './LoadOut.js'
import { Delay } from '../core/Delay.js'

export class Friend extends Waters {
  constructor (friendUI) {
    super(friendUI)
    this.testContinue = true
    this.friendlyWaters = true
    this.steps.player = Player.friend
    this.steps.onEndTurn = this.onEndTurn.bind(this)
  }

  onEndTurn () {
    this.opponent?.score.finishTurn()
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

  isCancelled () {
    return !this.testContinue
  }

  destroy (weapon, effect) {
    this.updateUI()
    const acc = this.applyToAoE(effect, weapon)
    if (acc.hits > 0) this.flash('long')
    this.score.dtaps += acc.dtap
    return acc
  }

  async randomBomb () {
    const map = bh.map

    for (let impact = 9; impact > 1; impact--)
      for (let attempt = 0; attempt < 12; attempt++) {
        if (this.isCancelled()) return this.noResult
        const { r, c } = this.randomLocation(map)
        if (this.score.newShotKey(r, c)) {
          const hasLaunched = await this.launchRandomWeapon(r, c, false)
          if (!hasLaunched) {
            const wps = this.currentWeaponSystem
            const weapon = wps.weapon
            const score = await this.loadOut.aimWeapon(map, r, c, wps)
            return { weapon, score }
          }
          return LoadOut.noResult
        }
      }
    return LoadOut.noResult
  }

  destroyOne (weapon, effect, target) {
    const candidates = this.getHitCandidates(effect, weapon)
    if (candidates.length < 1) {
      return this.destroy(weapon, effect)
    }
    if (target === null || target === undefined || target?.length < 2) {
      target = randomElement(candidates)
    }
    const newEffect = this.getStrikeSplash(weapon, target)
    return this.destroy(weapon, newEffect)
  }
  get noResult () {
    return { weapon: this.loadOut.getSingleShot(), score: LoadOut.noResult }
  }
  async randomDestroyOne () {
    const map = bh.map

    if (this.isCancelled()) return this.noResult

    const r = this.randomRowNum()
    this.launchRandomWeapon(r, 0, false)
    const wps = this.currentWeaponSystem
    const weapon = wps.weapon
    const score = await this.loadOut.aimWeapon(map, r, map.cols - 1, wps)

    return { weapon, score }
  }
  isHitValid (r, c) {
    return bh.inBounds(r, c) && !this.isDTap(r, c, 4, false, false)
  }

  async randomSeek () {
    const maxAttempts = 13
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (this.isCancelled()) return this.noResult
      const loc = this.randomLoc()

      if (!loc) {
        this.UI.showNotice('something went wrong!')
        this.boardDestroyed = true
        this.testContinue = false
        return LoadOut.noResult
      }
      if (this.isHitValid(loc[1], loc[0])) {
        await this.launchSingleShot(loc[1], loc[0])
        return null
      }
    }
  }

  restartBoard () {
    this.resetBase()
    this.UI.clearVisuals()
    this.UI.resetShips(this.ships)
    this.armWeapons()
  }
  restartFriendBoard () {
    this.resetBase()
    this.UI.clearFriendVisuals()
    this.UI.resetShips(this.ships)
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
  randomRowNum () {
    const r = this.randomLine()
    return Number.parseInt(r?.[0] || '0')
  }
  randomLine () {
    this.syncUntried()
    let locs = this.untried.toCoords
    if (locs.length === 0) {
      console.warn('no more locations to choose from')
      return 0
    }

    const tally = locs.reduce((acc, [, y]) => {
      acc[y] = 1 + (acc[y] || 0)
      return acc
    }, {})

    const ordered = Object.entries(tally)
    let line = shuffleArray(ordered)
    line.sort((a, b) => b[1] - a[1])

    // const idx = line.findIndex(i => i[1] < line[0][1])

    //  if (idx < 3) {
    return line[0]
    // }
    // return line[Math.floor(Math.random() * (idx - 1))]
  }
  async seek () {
    await this.seekRaw()
    this.UI.testBtn.disabled = false
    this.UI.seekBtn.disabled = false
    this.UI.stopBtn.classList.add('hidden')
  }
  async seekRaw () {
    this.testContinue = true
    this.boardDestroyed = false
    this.armWeapons()
    this.score.shot = bh.map.blankMask
    this.setupUntried()

    while (!this.isCancelled()) {
      await Delay.wait(420)
      if (this.isCancelled()) return
      this.seekStep()
    }
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
  async randomScan () {
    const map = bh.map
    this.loadOut.onReveal = this.scan.bind(this)
    if (this.isCancelled()) return this.noResult
    const { r, c } = this.randomLocation(map)
    const { r1, c1 } = this.randomLocation(map)
    const wps = this.currentWeaponSystem
    const weapon = wps.weapon
    await this.loadOut.aimWeapon(map, r, c)
    const score = await this.loadOut.aimWeapon(map, r1, c1, wps)
    return { weapon, score }
  }
  randomLocation (map) {
    const r = Math.floor(Math.random() * (map.rows - 2)) + 1
    const c = Math.floor(Math.random() * (map.cols - 2)) + 1
    return { r, c }
  }

  async randomEffect (effect) {
    switch (effect) {
      case 'DestroyOne':
        return await this.randomDestroyOne()
      case 'Bomb':
        return await this.randomBomb()
      case 'Scan':
        return await this.randomScan()
      case 'Seek':
        return await this.randomSeek()
    }
  }

  async selectShot (hits) {
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
      return await this.randomEffect(op)
    } else {
      this.loadOut.switchToSingleShot()
      return await this.randomSeek()
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
    const cross = hits.clone.dilateCross()
    console.log('hits', hits.toAscii)
    console.log('cross', cross.toAscii)
    const candidates = cross.take(shots)
    console.log('candidates', candidates.toAscii)
    if (candidates.occupancy > 0) {
      await this.selectRandomCandidate(candidates)
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

  async seekStep () {
    const hits = this.getHits()
    this.setWeaponFireHanders()
    const result = await this.selectShot(hits)
    if (
      result &&
      result !== LoadOut.noResult &&
      result.score !== LoadOut.noResult
    ) {
      this.updateResultsOfBomb(result?.weapon, result.score)
    }
    this.steps.endTurn()
  }
  updateWeaponStatus () {
    /* only needs implementation if enemy */
  }
  updateMode (wps) {
    if (this.isRevealed || this.boardDestroyed) {
      return
    }
    // this.updateWeaponButton(wps)
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
