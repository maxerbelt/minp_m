import { bh } from '../terrains/all/js/bh.js'
import { randomElement, shuffleArray } from '../core/utilities.js'
import { gameStatus } from './StatusUI.js'
import { setupDragHandlers } from '../selection/dragndrop.js'
import { Waters } from './Waters.js'
import { Player } from './steps.js'
import { LoadOut } from './LoadOut.js'
import { Delay } from '../core/Delay.js'

const SEEK_CONSTANTS = {
  IMPACT_MIN: 2,
  IMPACT_START: 9,
  BOMB_ATTEMPTS: 12,
  SEEK_MAX_ATTEMPTS: 13,
  SEEK_DELAY_MS: 420
}

export class Friend extends Waters {
  constructor (friendUI) {
    super(friendUI)
    this.testContinue = true
    this.friendlyWaters = true
    this.steps.player = Player.friend
    this.steps.onEndTurn = this.onEndTurn.bind(this)
  }

  get map () {
    return bh.map
  }

  get noResult () {
    return { weapon: this.loadOut.getSingleShot(), score: LoadOut.noResult }
  }

  onEndTurn () {
    this.opponent?.score.finishTurn()
    if (this?.opponent && !this.opponent.boardDestroyed) {
      this.opponent._handleBeginTurn()
    }
  }

  isCancelled () {
    return !this.testContinue
  }

  // ============ Location Selection ============

  getRandomHitCoordinate (hitCoordinates) {
    const totalHits = hitCoordinates.length
    if (totalHits < 1) return null
    if (totalHits === 1) return hitCoordinates[0]
    const randomIndex = Math.floor(Math.random() * totalHits)
    return hitCoordinates[randomIndex]
  }

  randomLocation (map) {
    const r = Math.floor(Math.random() * (map.rows - 2)) + 1
    const c = Math.floor(Math.random() * (map.cols - 2)) + 1
    return { r, c }
  }

  syncUntried () {
    this.untried = this.untried.take(this.score.shot)
  }

  randomLoc () {
    this.syncUntried()
    const locs = this.untried.toCoords
    return locs.length === 0 ? null : randomElement(locs)
  }

  randomLine () {
    this.syncUntried()
    const locs = this.untried.toCoords
    if (locs.length === 0) {
      console.warn('no more locations to choose from')
      return 0
    }

    const tally = locs.reduce((acc, [, y]) => {
      acc[y] = 1 + (acc[y] || 0)
      return acc
    }, {})

    const ordered = Object.entries(tally).sort((a, b) => b[1] - a[1])

    return ordered[0]
  }

  randomRowNum () {
    const r = this.randomLine()
    return Number.parseInt(r?.[0] || '0')
  }

  // ============ Destruction & Effects ============

  destroy (weapon, effect) {
    this.updateUI()
    const acc = this.applyToAoE(effect, weapon)
    if (acc.hits > 0) this.flash('long')
    this.score.dtaps += acc.dtap
    return acc
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

  // ============ Random Actions ============

  async launchTo (coords, rr, cc, currentWeapon) {
    return await currentWeapon.weapon.cursorLaunchTo(
      coords,
      rr,
      cc,
      this.map,
      this.UI,
      this.opponent?.UI
    )
  }

  async launchRandomWeapon (r, c, shouldWait) {
    const wps = this.currentWeaponSystem
    const weapon = wps.weapon
    const score = await this.loadOut.aimWeapon(this.map, r, c, wps)
    return score === LoadOut.noResult
  }

  async randomBomb () {
    for (
      let impact = SEEK_CONSTANTS.IMPACT_START;
      impact > SEEK_CONSTANTS.IMPACT_MIN;
      impact--
    ) {
      for (let attempt = 0; attempt < SEEK_CONSTANTS.BOMB_ATTEMPTS; attempt++) {
        if (this.isCancelled()) return this.noResult
        const { r, c } = this.randomLocation(this.map)
        if (this.score.newShotKey(r, c)) {
          const hasLaunched = await this.launchRandomWeapon(r, c, false)
          if (!hasLaunched) {
            const wps = this.currentWeaponSystem
            const weapon = wps.weapon
            const score = await this.loadOut.aimWeapon(this.map, r, c, wps)
            return { weapon, score }
          }
          return LoadOut.noResult
        }
      }
    }
    return LoadOut.noResult
  }

  async randomDestroyOne () {
    if (this.isCancelled()) return this.noResult
    const r = this.randomRowNum()
    await this.launchRandomWeapon(r, 0, false)
    const wps = this.currentWeaponSystem
    const weapon = wps.weapon
    const score = await this.loadOut.aimWeapon(
      this.map,
      r,
      this.map.cols - 1,
      wps
    )
    return { weapon, score }
  }

  isHitValid (r, c) {
    return this.map.inBounds(r, c) && !this.isDTap(r, c, 4, false, false)
  }

  async randomSeek () {
    for (
      let attempt = 0;
      attempt < SEEK_CONSTANTS.SEEK_MAX_ATTEMPTS;
      attempt++
    ) {
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

  async randomScan () {
    this.loadOut.onReveal = this.scan.bind(this)
    if (this.isCancelled()) return this.noResult
    const { r, c } = this.randomLocation(this.map)
    const { r: r1, c: c1 } = this.randomLocation(this.map)
    const wps = this.currentWeaponSystem
    const weapon = wps.weapon
    await this.loadOut.aimWeapon(this.map, r, c)
    const score = await this.loadOut.aimWeapon(this.map, r1, c1, wps)
    return { weapon, score }
  }

  scan (weapon, effect) {
    this.updateUI()
    for (const position of effect) {
      const [r, c] = position
      if (this.map.inBounds(r, c)) {
        // reveal what is in this position
      }
    }
  }

  // ============ Effect Dispatch ============

  async randomEffect (effect) {
    const effectHandlers = {
      DestroyOne: () => this.randomDestroyOne(),
      Bomb: () => this.randomBomb(),
      Scan: () => this.randomScan(),
      Seek: () => this.randomSeek()
    }
    const handler = effectHandlers[effect]
    return handler ? await handler() : this.noResult
  }

  // ============ Shot Selection ============

  async tryFinishCondition (mask, finishAction) {
    if (mask?.occupancy > 0) {
      await finishAction(mask)
      return true
    }
    return false
  }

  async finishRevealed () {
    this.score.reveal = this.score.reveal.take(this.score.shot)
    return await this.tryFinishCondition(this.score.reveal, mask =>
      this.selectRandomCandidate(mask)
    )
  }

  async finishPartiallySunk (hits) {
    if (!hits?.occupancy) return false

    const shots = this.score.shot
    const cross = hits.clone.dilateCross()
    const candidates = cross.take(shots)

    if (
      await this.tryFinishCondition(candidates, m =>
        this.selectRandomCandidate(m)
      )
    ) {
      return true
    }

    const surround = hits.clone.dilate(1).take(shots)
    return await this.tryFinishCondition(surround, m =>
      this.selectRandomCandidate(m)
    )
  }

  async finishHints () {
    const numHints = this.score?.hint?.occupancy || 0
    if (numHints > 0) {
      const surroundHints = this.score.hint.clone
        .dilate(1)
        .take(this.score.shot)
      return await this.tryFinishCondition(surroundHints, m =>
        this.selectRandomCandidate(m)
      )
    }
    return false
  }

  async selectRandomCandidate (candidate) {
    this.loadOut.switchToSingleShot()
    const [c, r] = candidate.randomOccupied
    await this.launchSingleShot(r, c, false)
  }

  async selectShot (hits) {
    const finishMethods = [
      () => this.finishRevealed(),
      () => this.finishPartiallySunk(hits),
      () => this.finishHints()
    ]

    for (const finishMethod of finishMethods) {
      if (await finishMethod()) return
    }

    const op = this.loadOut.switchToPreferredWeapon()
    if (op) {
      return await this.randomEffect(op)
    } else {
      this.loadOut.switchToSingleShot()
      return await this.randomSeek()
    }
  }

  // ============ Board Management ============

  restartBoard (friendlyMode = false) {
    this.resetBase()
    this.UI.clearVisuals()
    if (friendlyMode) {
      this.UI.clearFriendVisuals()
    }
    this.UI.resetShips(this.ships)
    this.armWeapons()
  }

  setupUntried () {
    this.untried = this.map.fullMask
  }

  getHits () {
    const blankMask = this.map.blankMask
    return this.shipsUnsunk().reduce((acc, ship) => {
      const shipHits = ship.hits.toMask(blankMask.width, blankMask.height)
      return acc.join(shipHits)
    }, blankMask)
  }

  // ============ Test/Seek Loop ============

  test () {
    gameStatus.flush()
    this.UI.testMode()
    this.UI.testBtn.disabled = true
    this.UI.seekBtn.disabled = true
    this.UI.stopBtn.disabled = false

    this.restartBoard()
    this.seek()
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
    this.score.shot = this.map.blankMask
    this.setupUntried()

    while (!this.isCancelled()) {
      await Delay.wait(SEEK_CONSTANTS.SEEK_DELAY_MS)
      if (this.isCancelled()) return
      await this.seekStep()
    }
  }

  // ============ UI & Mode ============

  updateWeaponStatus () {
    /* only needs implementation if enemy */
  }

  updateMode (wps) {
    if (this.isRevealed || this.boardDestroyed) {
      return
    }
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
