import { bh } from '../terrains/all/js/bh.js'
import {
  randomElement,
  parsePair,
  keyListFromCell,
  parseTriple,
  findClosestCoord,
  coordsFromCell
} from '../core/utilities.js'
import { placedShipsInstance } from '../selection/PlacedShips.js'
import { Score } from './Score.js'
import { gameStatus } from './StatusUI.js'
import { assembleTerrains } from '../terrains/all/js/gameMaps.js'
import { randomPlaceShape } from '../core/utils.js'
import { LoadOut } from './LoadOut.js'
import { Ship } from '../ships/Ship.js'
import { WeaponSystem } from '../weapon/WeaponSystem.js'
import { steps } from './steps.js'
import { Animator } from '../core/Animator.js'

function popFirst (arr, predicate, obj) {
  // find index of first match
  const idx = arr.findIndex(predicate)

  let found = null
  if (idx !== -1) {
    // remove and store the object
    ;[found] = arr.splice(idx, 1)
  }
  if (found === null && obj) {
    console.log('not found : ', JSON.stringify(obj))
  }

  return found
}

export class Waters {
  constructor (ui) {
    assembleTerrains()
    this.ships = []
    this.score = new Score()
    this.opponent = null
    this.UI = ui
    this.shipCellGrid = []
    this.boardDestroyed = false
    this.preamble1 = 'You '
    this.preamble0 = 'Your'
    this.preamble = 'You were '
    this.steps = new steps()
    this.resetShipCells()
    this.displayInfo = gameStatus.info2.bind(gameStatus)
  }
  clipboardKey () {
    return 'geoffs-battleship.placed-ships'
  }

  placedShips () {
    return {
      ships: this.ships,
      shipCellGrid: this.shipCellGrid,
      map: bh.map.title
    }
  }

  store () {
    localStorage.setItem(
      this.clipboardKey(),
      JSON.stringify(this.placedShips())
    )
  }

  attemptToPlaceShips (
    ships,
    isPlacementSuccessful,
    onShipPlaced = Function.prototype,
    onPlacementReset = Function.prototype
  ) {
    // Ensure shipCellGrid is initialized before attempting placements
    this.checkShipGrid()
    const mask = bh.map.blankMask
    for (const ship of ships) {
      const placedCells = randomPlaceShape(ship, this.shipCellGrid, mask)
      if (!placedCells) {
        this.resetShipCells()
        onPlacementReset?.()
        this.UI.placeTally(ships)
        this.UI.displayShipInfo(ships)
        isPlacementSuccessful = false
        break
      }
      onShipPlaced?.(ship, placedCells)
      this.UI.placement(placedCells, this, ship)
    }
    return isPlacementSuccessful
  }
  checkShipGrid () {
    if (!this.shipCellGrid || !Array.isArray(this.shipCellGrid)) {
      this.resetShipCells()
    }
  }
  accumulateResult (result, acc) {
    if (result?.hits) acc.hits += result.hits
    if (result?.dtaps) acc.dtaps += result.dtaps
    if (result?.sunk) acc.sunk += result.sunk
    if (result?.reveals) acc.reveals += result.reveals
    if (result?.shots) acc.shots += result.shots
    if (result?.info) acc.info += result.info + ' '
  }
  autoPlace2 () {
    const ships = this.initShips()

    for (let attempt = 0; attempt < 100; attempt++) {
      let isPlacementSuccessful = true
      isPlacementSuccessful = this.attemptToPlaceShips(
        ships,
        isPlacementSuccessful,
        null,
        this.UI.clearPlaceVisuals.bind(this.UI)
      )
      if (isPlacementSuccessful) return true
    }
  }
  autoPlace () {
    const ships = this.initShips()

    for (let attempt = 0; attempt < 100; attempt++) {
      let isPlacementSuccessful = true
      isPlacementSuccessful = this.attemptToPlaceShips(
        ships,
        isPlacementSuccessful,
        ship => {
          placedShipsInstance.push(ship, ship.cells)
          ship.addToGrid(this.shipCellGrid)
        },
        () => {
          this.UI.clearVisuals()
          placedShipsInstance.reset()
        }
      )
      if (isPlacementSuccessful) return true
    }
  }

  initShips () {
    this.resetShipCells()

    // Ensure ships are initialized from base shapes
    return this.initShipsForEdit()
  }

  initShipsForEdit () {
    if (!this.ships || this.ships.length === 0) {
      this.ships = this.createCandidateShips()
    }
    return this.ships
  }

  loadForEdit (map) {
    map = map || bh.map

    let placedShips = this.initShipsForEdit()
    placedShips = this.checkValidPlacement(placedShips, map)
    if (placedShips === null) {
      return
    }

    const matchableShips = this.placeMatchingShips(
      placedShips,
      this.placeMatchingShipForEdit.bind(this)
    )
    if (matchableShips.length !== 0) {
      console.log(`${matchableShips.length} ships not matched`)
    }
  }

  setWeaponFireHanders () {
    this.loadOut.onDestroy = this.destroy.bind(this)
    this.loadOut.onDestroyOneOfMany = this.destroyOne.bind(this)
  }

  placeMatchingShips (placedShips, placer) {
    const matchableShips = [...this.ships]
    for (const ship of placedShips.ships) {
      const matchingShip = popFirst(
        matchableShips,
        s => s.letter === ship.letter,
        ship
      )
      if (matchingShip) {
        this.applyExtraInfoToMatchingShip(matchingShip, ship)
        placer(matchingShip, ship)
      }
    }
    return matchableShips
  }

  placeMatchingShipForEdit (matchingShip, ship) {
    matchingShip.cells = ship.cells
    placedShipsInstance.push(matchingShip, ship.cells)
    matchingShip.addToGrid(this.shipCellGrid)
    this.UI.placement(ship.cells, this, matchingShip)
  }

  placeMatchingShip (matchingShip, ship) {
    matchingShip.placeAtCells(ship.cells)

    matchingShip.addToGrid(this.shipCellGrid)
    this.UI.placement(ship.cells, this, matchingShip)
    const dragship = this.UI.getTrayItem(ship.id)
    if (dragship) {
      this.UI.removeDragShip(dragship)
    } else {
      //    console.log('drag ship not found : ', JSON.stringify(ship))
    }
  }

  applyExtraInfoToMatchingShip (matchingShip, ship) {
    matchingShip.variant = ship.variant
    const values = Object.values(matchingShip.weapons)
    if (values.length > 0) {
      this.applyWeaponsToMatchingShip(ship, values, matchingShip)
    }
  }

  applyWeaponsToMatchingShip (ship, values, matchingShip) {
    const keys = Object.keys(ship.weapons)
    if (values.length === keys.length) {
      matchingShip.weapons = {}
      for (const [index, key] of keys.entries()) {
        matchingShip.weapons[key] = values[index]
      }
    }
  }
  checkValidPlacement (placed, map = bh.map) {
    const placedShips = placed || map.example

    if (placedShips?.ships == null || placedShips?.ships?.length === 0) {
      this.autoPlace()
      return null
    }
    return placedShips
  }
  load (placedShips) {
    const map = bh.map
    this.initShips()

    placedShips = this.getPlacedShips(placedShips, map)
    if (placedShips === null) {
      return
    }

    const { shipId, weaponId } = placedShips.ships.reduce(
      (a, s) => {
        a.shipId = Math.max(s.id, a.shipId)
        a.weaponId = Object.values(s.weapons).reduce(
          (aw, w) => Math.max(w.id, aw),
          a.weaponId
        )
        return a
      },
      { shipId: 1, weaponId: 1 }
    )
    Ship.id = shipId + 1
    WeaponSystem.id = weaponId + 1
    const matchableShips = this.placeMatchingShips(
      placedShips,
      this.placeMatchingShip.bind(this)
    )
    if (matchableShips.length === 0) {
      this.UI.resetTrays()
    } else {
      console.log(`${matchableShips.length} ships not matched`)
    }
  }

  getPlacedShips (placedShips, map) {
    placedShips =
      placedShips || JSON.parse(localStorage.getItem(this.clipboardKey()))

    // Check if placedShips is null or map doesn't match before trying to access it
    if (map.title !== placedShips?.map || '') {
      placedShips = null
    }
    placedShips = this.checkValidPlacement(placedShips, map)
    return placedShips
  }

  resetMap (map) {
    this.boardDestroyed = false
    this.isRevealed = false
    this.setMap(map)
  }
  armWeapons (map) {
    map = map || bh.map
    const oppo = this.opponent
    this.weaponShips = this.ships.filter(s => s.hasWeapons())

    this.hasAttachedWeapons = this.weaponShips.length > 0
    if (bh.seekingMode && this.hasAttachedWeapons) {
      this.weaponShips = map.extraArmedFleetForMap
      this.loadOut = this.makeLoadOut(map, this.weaponShips)
    } else if (oppo) {
      const weaponShips = oppo.ships.filter(s => s.hasWeapons())
      this.loadOut = this.makeLoadOut(map, weaponShips)
    } else {
      this.loadOut = this.makeLoadOut(map)
    }

    if (this.cursorChange) {
      if (typeof this.cursorChange === 'function') {
        this.loadOut.onCursorChangeCallback = this.cursorChange.bind(this)
      } else {
        console.warn(
          'cursorChange property is not a function, ignoring cursor change callback assignment'
        )
      }
    }
  }
  makeLoadOut (map, ships) {
    ships = ships || this.weaponShips
    return new LoadOut(map.weapons, ships, this.UI)
  }
  autoSelectWarning (weaponName, currentShip) {
    this.displayInfo(
      `Auto-selected ${weaponName}, Click near ${
        currentShip.shape().descriptionText
      } to select a different ${weaponName}`
    )
  }
  randomWeaponId () {
    const armedShips = this.loadOut.getCurrentWeaponSystem().armedShips()
    const randomShip = randomElement(armedShips)
    if (randomShip) {
      this.steps.addShip(randomShip)
    } else {
      return {
        launchR: null,
        launchC: null,
        weaponId: null,
        hintR: null,
        hintC: null
      }
    }

    const [r, c] = this.randomSourceHint(randomShip, this.opponent)
    if (r === null || c === null) {
      return this.selectWeaponId(null, 0, 0, 'random', randomShip)
    }

    const cell = this.shadowSource(r, c)
    return this.selectWeaponId(cell, r, c, 'random', randomShip)
  }

  sourceHint (randomShip, oppo) {
    if (this.steps.sourceHint)
      return [this.steps.sourceHint.r, this.steps.sourceHint.c]
    const opponent = oppo || this.opponent

    return this.randomSourceHint(randomShip, opponent)
  }

  randomSourceHint (randomShip, opponent) {
    const surround = this.surround(randomShip, opponent)
    if (surround.length === 0) {
      console.warn(
        'no surround cells found for random weapon hint, using 0,0 as hint'
      )
      this.steps.addHint(this.UI, 0, 0, this.UI.gridCellAt(0, 0))
      return [null, null]
    }
    const hintKey = randomElement(surround)
    const [r, c] = parsePair(hintKey)
    this.steps.addHint(opponent.UI, r, c, opponent.UI.gridCellAt(r, c))
    return [r, c]
  }

  surround (randomShip, opponent) {
    if (!opponent) return []
    const cells = randomShip.cells
    const surround = [...opponent.UI.surroundCells(cells)]
    return surround
  }

  shadowSource (r, c, oppo) {
    const opponent = oppo || this.opponent
    if (opponent) {
      const oppoCell = opponent.UI.gridCellAt(r, c)
      this.steps.addShadow(opponent.UI, r, c, oppoCell)
      return oppoCell
    } else {
      // no shadow -  this.addShadow(this.UI, r, c, this.UI.gridCellAt(r, c))
      return this.UI.gridCellAt(r, c)
    }
  }

  selectAndArmWps (rack, oppo, launchR, launchC, hintR, hintC) {
    const weapon = rack?.weapon
    const letter = weapon?.letter

    this.addSource(oppo, launchR, launchC, rack)
    this.steps.addRack(
      rack,
      weapon,
      letter,
      weapon?.id,
      launchR,
      launchC,
      rack?.cell
    )
    if (letter) {
      this.loadOut.switchToWeapon(letter)
      if (weapon.postSelectCursor === 0) {
        this.loadOut.clearSelectedCoordinates()
      } else {
        this.loadOut.addSelectedCoordinates(launchR, launchC)
      }

      rack.launchCoord = [launchR, launchC]

      rack.hintCoord = [hintR, hintC]
      this.loadOut.launch = async coords => {
        this.steps.fire()
        return await this.launchTo(coords, hintR, hintC, rack)
      }
      this.loadOut.selectedWeapon = rack
    }
  }

  addSource (oppo, launchR, launchC, rack) {
    if (this.steps.source === null) {
      this.steps.addSource(oppo.UI, launchR, launchC, rack?.cell)
      console.warn(
        'no source found when selecting and arming weapon, adding source with launch coords'
      )
    }
    if (!bh.terrain.hasUnattachedWeapons && this.sourceShip === null) {
      console.warn(
        'Terrain does not have unattached weapons, but a weapon is without a source ship'
      )
      const ship = this.loadOut.getShipByWeaponId(rack?.id)
      this.steps.addShip(ship)
    }
  }

  selectAttachedWeapon (cell, r, c, oppo) {
    const { launchR, launchC, weaponId, hintR, hintC } = this.selectWeaponId(
      cell,
      r,
      c,
      false,
      null,
      oppo
    )

    this.selectAndArmWeaponId(weaponId, oppo, launchR, launchC, hintR, hintC)
  }

  randomAttachedWeapon (oppo) {
    const { launchR, launchC, weaponId, hintR, hintC } = this.randomWeaponId()

    this.selectAndArmWeaponId(weaponId, oppo, launchR, launchC, hintR, hintC)
  }

  selectAndArmWeaponId (weaponId, oppo, launchR, launchC, hintR, hintC) {
    if (weaponId < 1) {
      return
    }
    const rack = this.loadOut.getWeaponBySystemId(weaponId)
    this.selectAndArmWps(rack, oppo, launchR, launchC, hintR, hintC)
  }
  async launchRandomWeapon (r, c, autoSelectWarning = true) {
    const hasLaunched = await this.launchUnattachedWeapon(r, c)
    if (hasLaunched) return true
    return this.launchRandomWeaponBase(autoSelectWarning)
  }

  launchRandomWeaponBase (autoSelectWarning = true) {
    const current = this.loadOut.getCurrentWeaponSystem()
    const attached = current.hasAmmo()
    if (attached) {
      return this.launchRandomWeaponForWps(autoSelectWarning)
    }
    return false
  }

  selectWeaponId (cell, hintR, hintC, random, ship, oppo) {
    oppo = oppo || this.opponent
    if (ship) {
      const entries = ship.getAllWeaponEntries()
      const [key, weapon] = random
        ? randomElement(entries)
        : findClosestCoord(entries, hintR, hintC, ([k]) => parsePair(k))
      const [launchR, launchC] = parsePair(key)
      this.steps.addSource(
        oppo.UI,
        launchR,
        launchC,
        cell || oppo.UI.gridCellAt(launchR, launchC)
      )
      return { launchR, launchC, weaponId: weapon.id, hintR, hintC }
    }
    if (cell === null) {
      this.steps.addSource(this.UI, 0, 0, cell || this.UI.gridCellAt(0, 0))
      return { launchR: 0, launchC: 0, weaponId: -1, hintR, hintC }
    }
    const keyIds = keyListFromCell(cell, 'keyIds')
    if (!keyIds) {
      this.steps.addSource(this.UI, 0, 0, cell || this.UI.gridCellAt(0, 0))
      return { launchR: 0, launchC: 0, weaponId: -1, hintR, hintC }
    }
    const loaded = new Set(this.loadOut.getLoadedWeapons().map(w => w.id))
    const filteredKeyIds = keyIds.filter(k => {
      const [, , weaponId] = parseTriple(k)
      return loaded.has(weaponId)
    })
    const wkey = findClosestCoord(filteredKeyIds, hintR, hintC, k =>
      parseTriple(k)
    )
    if (!random && !wkey) {
      return this.randomWeaponId()
    }
    const [launchR, launchC, weaponId] = parseTriple(wkey)
    this.steps.addSource(
      oppo.UI,
      launchR,
      launchC,
      cell || oppo.UI.gridCellAt(launchR, launchC)
    )
    ship = this.loadOut.getShipByWeaponId(weaponId)
    if (ship) {
      this.steps.addShip(ship)
      const [r, c] = this.sourceHint(ship)
      this.shadowSource(r, c)
    }
    return { launchR, launchC, weaponId, hintR, hintC }
  }

  launchRandomWeaponForWps (autoSelectWarning = true) {
    this.randomAttachedWeapon(this.opponent)
    const currentWeapon = this.loadOut.selectedWeapon

    if (!currentWeapon) return false
    const currentShip = this.loadOut.getShipByWeaponId(currentWeapon.id)
    const weaponName = currentWeapon.weapon?.name || 'weapon'
    if (autoSelectWarning) this.autoSelectWarning(weaponName, currentShip)
    this.loadOut.launch = (coords, weapon, wps) => {
      return this.launchWeapon(wps, coords, weapon)
    }
    return true
  }
  async fireWeaponAt (
    row,
    col,
    weaponSystem = this.loadOut.selectedWeapon,
    launch = this.loadOut.launch
  ) {
    const result = await this.loadOut.aimWeapon(
      bh.map,
      row,
      col,
      weaponSystem,
      launch
    )
    this.updateResultsOfBomb(weaponSystem?.weapon, result)
  }
  async launchSelectedWeapon (r, c) {
    if (this.loadOut.isArmed()) {
      await this.fireWeaponAt(r, c, this.loadOut.selectedWeapon)
      return true
    }
    return false
  }

  async launchUnattachedWeapon (r, c) {
    const unAttached = this.getUnattachedWeaponSystem()
    if (unAttached) {
      const launch = async coords => {
        return await this.launchTo(coords, bh.map.rows - 1, 0, unAttached)
      }
      await this.fireWeaponAt(r, c, unAttached, launch)
      return true
    }
    return false
  }
  async launchSingleShot (r, c, sShot) {
    this.loadOut.onDestroy = (weapon, affectedArea) => {
      return this.processShot(weapon, ...(affectedArea?.[0] || []))
    }

    const { fireSingleShot, coordinates, wps } = this.loadOut.aimSingleShotInfo(
      sShot,
      r,
      c
    )
    await this.launchTo(coordinates, bh.map.rows - 1, 0, wps)
    const result = fireSingleShot()
    this.updateResultsOfSingleShot(result)
  }

  getUnattachedWeaponSystem () {
    if (bh.seekingMode) {
      return this.loadOut.getCurrentWeaponSystem().getLoadedWeapon()
    } else {
      return this.loadOut.getUnattachedWeaponSystem()
    }
  }

  async launchTo (coords, rr, cc, currentWps) {
    return await currentWps.weapon.launchTo(
      coords,
      rr,
      cc,
      bh.map,
      this.UI,
      this.opponent?.UI,
      this
    )
  }
  async launchWeapon (wps, coords) {
    const { r, c } = this.steps.sourceHint || { r: 0, c: 0 }
    this.steps.fire()
    return await this.launchTo(coords, r, c, wps)
  }

  setupAttachedAim () {
    const oppo = this.opponent
    if (bh.seekingMode || !this.loadOut || !oppo) return
    const armedShips = this.loadOut.getArmedShips()
    for (const ship of armedShips) {
      const cells = oppo.shipCells(ship.id)
      const surround = oppo.UI.surroundCellElement(cells)
      for (const cell of surround) {
        if (!cell.dataset.listen) {
          const [r, c] = coordsFromCell(cell)
          cell.addEventListener(
            'click',
            this.onClickOppoCell.bind(this, r, c, ship.id)
          )
          cell.dataset.listen = true
          const w = ship.getPrimaryWeapon()
          const cursor = w?.launchCursor
          if (cursor) cell.classList.add(cursor)
        }
      }
    }
  }
  resetBase () {
    this.boardDestroyed = false
    this.UI.board.classList.remove('destroyed')
    this.score.reset()
  }
  setMap (map) {
    map = map || bh.map
    if (!this.ships || this.ships.length === 0) {
      this.ships = map.newFleetForMap
      this.armWeapons(map)
    }
    for (const ship of this.ships) {
      ship.reset()
    }
  }
  onHint (r, c) {
    this.opponent?.score?.hintReveal?.(r, c)
  }
  getTarget (effect, weapon) {
    const candidates = this.getHitCandidates(effect, weapon)
    return randomElement(candidates)
  }
  getHitCandidates (effect, weapon) {
    const candidates = []
    const map = bh.map
    const maps = bh.maps
    for (const [r, c, power] of effect) {
      if (map.inBounds(r, c) && this.score.newShotKey(r, c) !== null) {
        const cell = this.UI.gridCellAt(r, c)
        this.addWake(cell, r, c)
        const shipCell = this.shipCellAt(r, c)
        if (shipCell !== null) {
          const shape = maps.shapesByLetter[shipCell.letter]
          const protection = shape.protectionAgainst(weapon.letter)

          if (power >= protection || (power === 1 && protection === 2)) {
            candidates.push([r, c, power])
          }
        }
      }
    }
    return candidates
  }
  addWake (cell, r, c) {
    if (
      !cell.classList.contains('frd-hit') &&
      !cell.classList.contains('miss') &&
      !cell.classList.contains('hit')
    ) {
      cell.classList.add('wake')
      this.score.wakeReveal(r, c)
    }
  }

  getStrikeSplash (weapon, candidate) {
    const cellSize = this.UI.cellSizeScreen()
    const target = this.UI.gridCellAt(candidate[0], candidate[1])
    weapon.animateSplashExplode(target, cellSize)
    return weapon.splash(bh.map, candidate)
  }
  getCrashSplash (weapon, candidate) {
    const cellSize = this.UI.cellSizeScreen()
    const target = this.UI.gridCellAt(candidate[0], candidate[1])
    weapon.animateSplashExplode(target, cellSize)
    return weapon.crashSplash(bh.map, candidate)
  }
  shipsSunk () {
    return this.ships.filter(s => s.sunk)
  }
  shipsUnsunk () {
    return this.ships.filter(s => !s.sunk)
  }
  shapesUnsunk () {
    return [...new Set(this.shipsUnsunk().map(s => s.shape()))]
  }
  shapesCanBeOn (subterrain, zone) {
    return this.shapesUnsunk().filter(s => s.canBeOn(subterrain, zone))
  }

  createCandidateWeapons () {
    const candidates = bh.map.terrain.weapons.weapons

    return candidates
  }
  createCandidateShips () {
    const maps = bh.maps

    const baseShapes = maps.baseShapes
    const ships = Ship.createShipsFromShapes(baseShapes)
    return ships
  }
  resetShipCells () {
    this.shipCellGrid = bh.map.blankGrid
  }
  armedCells () {
    return this.cellList().filter(c => c.dataset.ammo > 0)
  }
  armedCellsWithWeapon (letter) {
    return this.cellList().filter(
      c => c.dataset.ammo > 0 && c.dataset.wletter === letter
    )
  }
  shipCells (id) {
    let list = []
    for (const cell of this.cellsOnBoard()) {
      if (Number.parseInt(cell.dataset.id) === id) {
        list.push(cell)
      }
    }
    return list
  }
  cellList () {
    return [...this.cellsOnBoard()]
  }
  cellsOnBoard () {
    return this.UI.board.children
  }

  recordAutoMiss (r, c) {
    const key = this.score.addAutoMiss(r, c)
    if (!key) return // already shot here
    this.UI.cellMiss(r, c)
  }
  recordFleetSunk () {
    this.displayInfo('All ' + this.preamble0 + ' Ships Destroyed!')
    this.UI.displayFleetSunk()
    this.boardDestroyed = true
    this.stopWaiting?.()
    this.opponent?.stopWaiting()
  }
  checkFleetSunk () {
    if (this.ships.every(s => s.sunk)) {
      this.recordFleetSunk()
    }
  }
  shipCellAt (r, c) {
    return this.shipCellGrid[r]?.[c]
  }
  markSunk (ship) {
    this.UI.displaySurround(
      ship.cells,
      ship.letter,
      (r, c) => this.recordAutoMiss(r, c),
      (c, r, letter) => this.UI.cellSunkAt(r, c, letter)
    )
    this.checkFleetSunk()
  }
  get onSunk () {
    return this.markSunk.bind(this)
  }

  markHit (r, c, damaged) {
    this.score.reveal.clear(r, c)
    this.UI.cellHit(r, c, damaged)
  }

  getShipFromCell (shipCell) {
    return this.ships.find(s => s.id === shipCell.id)
  }
  sunkDescription (ship) {
    if (this.opponent) {
      return this.preamble0 + ' ' + ship.sunkDescription(' was ')
    }
    return ship.sunkDescription()
  }
  sunkLetterDescription (letter) {
    if (this.opponent) {
      return this.preamble0 + ' ' + bh.terrain.sunkDescription(letter, ' was ')
    }
    return bh.shipSunkText(letter)
  }
  sunkWarning (ship, info = '') {
    if (!info) {
      info = ''
    }
    this.displayInfo(info + this.sunkDescription(ship))
  }

  checkForHit (weapon, r, c, power, shipCell) {
    if (!shipCell) {
      return LoadOut.noResult
    }

    const hitShip = this.getShipFromCell(shipCell)

    if (!hitShip) {
      this.UI.cellMiss(r, c)
      return LoadOut.missResult
    }

    const shape = bh.shapesByLetter(shipCell.letter)
    const protection = shape.protectionAgainst(weapon.letter)
    if (power === 1 && protection === 2 && hitShip) {
      this.score.shotReveal(r, c)
      return this.UI.cellSemiReveal(r, c)
    }

    if (protection > power) {
      return LoadOut.noResult
    }
    let shots = 0
    if (power < 1) {
      this.score.shot.set(r, c)
      shots = 1
    }

    return this.showHit(r, c, hitShip, shots)
  }

  showHit (row, col, hitShip, initialShots) {
    const {
      letter,
      info,
      damaged,
      list: hitEntries,
      misses: missEntries
    } = hitShip.hitAt(this, row, col)
    this.markHit(row, col, damaged)
    let totalHits = 1
    let totalShots = initialShots

    totalHits = this._applyHitEntries(hitEntries, totalHits)
    totalShots += hitEntries.length
    totalShots = this._applyMissEntries(missEntries, totalShots)

    if (hitShip.sunk) {
      this.markSunk(hitShip, info)
    }
    return {
      hits: totalHits,
      shots: totalShots,
      reveals: 0,
      sunk: letter,
      info
    }
  }

  _applyHitEntries (hitEntries, totalHits) {
    for (const { cell, damaged } of hitEntries) {
      this.score.shot.set(...cell)
      totalHits++
      this.markHit(cell[0], cell[1], damaged)
    }
    return totalHits
  }

  _applyMissEntries (missEntries, totalShots) {
    for (const { cell, damaged } of missEntries) {
      this.score.shot.set(...cell)
      totalShots++ //
      this.UI.cellMiss(cell[0], cell[1], damaged)
    }
    return totalShots
  }
  get isEnded () {
    if (this.isRevealed || this.boardDestroyed) {
      this.stopWaiting?.()
      this.opponent?.stopWaiting()
      this._oldWeaponLetter = null
      return true
    }
    return false
  }

  updateMode (wps1, cursorInfo) {
    if (this.isEnded) {
      return
    }
    this.updateWeaponButton(wps1, cursorInfo)

    this.updateWeaponStatus(wps1 || this.loadOut.selectedWeapon, cursorInfo)
  }
  updateWeaponButton (wps1, cursorInfo) {
    const wps = wps1 || cursorInfo?.wps || this.loadOut.getCurrentWeaponSystem()
    const letter = wps?.weapon?.letter
    if (letter === this._oldWeaponLetter) {
      return
    }
    this._oldWeaponLetter = letter
    const next = this.loadOut.getNextWeapon(letter)
    if (this.UI.weaponBtn) this.UI.weaponBtn.innerHTML = next.buttonHtml
  }

  fireShot (weapon, r, c, power) {
    const shipCell = this.shipCellAt(r, c)
    if (!shipCell) {
      if (power > 0) {
        this.UI.cellMiss(r, c)
        return LoadOut.missResult
      }
      return LoadOut.noResult
    }
    return this.checkForHit(weapon, r, c, power, shipCell)
  }

  hitDescription (hits) {
    if (this.opponent) {
      return this.preamble + 'Hit (x' + hits.toString() + ')'
    } else {
      return hits.toString() + 'Hits'
    }
  }
  revealDescription (reveals) {
    if (this.opponent) {
      return this.preamble + 'revealed (x' + reveals.toString() + ')'
    } else {
      return reveals.toString() + 'revealed'
    }
  }
  displayMisses (weapon, reveals = 0, messageInfo = '') {
    if (reveals > 0) {
      this.displayInfo(messageInfo + this.revealDescription(reveals))
    } else {
      // if (weapon.letter === '-') return // don't display miss for single shot
      let missMessage
      if (this.opponent) {
        if (weapon.letter === '-') {
          missMessage = `${this.opponent.preamble1}missed`
        } else {
          missMessage = `${this.opponent.preamble1}${weapon.name} missed ${this.preamble0} ships`
        }
      } else {
        if (weapon.letter === '-') {
          return // don't display miss for single shot
        } else {
          missMessage = `${this.opponent.preamble1} ${weapon.name} missed everything!`
        }
        this.displayInfo(messageInfo + `The ${weapon.name} missed everything!`)
      }
      this.displayInfo(messageInfo + missMessage)
    }
  }
  updateResultsOfSingleShot (result) {
    if (!result) return
    const { hits, dtaps, sunk, reveals, info, shots } = result
    this.updateResultsOfTurn(
      this.loadOut.getSingleShot(),
      hits,
      dtaps,
      sunk,
      reveals,
      info,
      shots
    )
  }
  updateResultsOfBomb (weapon, result) {
    if (!result) return
    const { hits, dtaps, sunk, reveals, info, shots } = result
    this.updateResultsOfTurn(weapon, hits, dtaps, sunk, reveals, info, shots)
  }
  updateResultsOfTurn (weapon, hits, dtaps, sunks, reveals = 0, info = '') {
    const messageInfo = info ? info + ' ' : ''
    if (this.boardDestroyed) {
      return
    }
    if (hits === 0) {
      this.displayMisses(weapon, reveals, messageInfo)
      return
    }
    if (sunks.length === 0) {
      let message = this.hitDescription(hits)
      if (reveals > 0) {
        message += ` and ${this.revealDescription(reveals)}`
      }
      this.displayInfo(messageInfo + message)
      return
    }
    if (sunks.length === 1) {
      this.displayInfo(
        messageInfo +
          this.hitDescription(hits) +
          ' and ' +
          this.sunkLetterDescription(sunks)
      )
      return
    }

    let message = this.hitDescription(hits) + ','
    for (let sunk of sunks) {
      message += ' and ' + this.sunkLetterDescription(sunk)
    }
    message += ' Destroyed'
    this.displayInfo(messageInfo + message)
  }

  flash (long) {
    Animator.runId('battleship-game', 'flash')
    Animator.run(this.UI.board, 'burst', long)
  }
  flame (r, c, bomb) {
    const cell = this.UI.gridCellAt(r, c)
    if (bomb) {
      Animator.runWithRandomDelay(cell, null, null, 'flames', 'short')
    } else {
      Animator.run(cell, 'flames', 'long')
    }
  }
  isDTap (r, c, power, hasFlame, hasFlash) {
    if (hasFlame && power > 0) this.flame(r, c, hasFlash)
    const key =
      power > 0 ? this.score.createShotKey(r, c) : this.score.newShotKey(r, c)
    return key === null
  }
  applyToAoE (effect, weapon) {
    let acc = LoadOut.noResult
    for (const [r, c, power] of effect) {
      acc = this.applyToPosition(r, c, weapon, power, acc)
    }
    return acc
  }
  applyToPosition (r, c, weapon, power, acc) {
    if (bh.inBounds(r, c)) {
      const result = this.processShot(weapon, r, c, power)
      this.accumulateResult(result, acc)
    }
    return acc
  }
  processShot (weapon, r, c, power) {
    if (!bh.inBounds(r, c)) return LoadOut.noResult
    if (this.isDTap(r, c, power, true, weapon.hasFlash))
      return LoadOut.doubleTapResult

    const result = this.fireShot(weapon, r, c, power)

    this.updateUI(this.ships)
    return result
  }

  updateUI (ships) {
    this.updateTally(ships, this.loadOut.getAllLimitedWeaponSystems())
  }
  updateTally (ships, weaponSystems) {
    ships = ships || this.ships
    if (this.UI.placing && this.UI.placeTally) {
      this.UI.placeTally(ships)
    } else {
      this.UI.score.display(ships, ...this.score.counts())
      this.UI.score.buildTally(ships, weaponSystems, this.UI)
    }
  }
}
