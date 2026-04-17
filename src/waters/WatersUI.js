import { bh } from '../terrains/all/js/bh.js'
import { ScoreUI } from './ScoreUI.js'
import {
  addKeyToCell,
  coordsFromCell,
  makeKey,
  parsePair,
  setCellCoords
} from '../core/utilities.js'
import { LoadOut } from './LoadOut.js'
import { gameStatus } from './StatusUI.js'
import { Delay } from '../core/Delay.js'

export const gameHost = {
  containerWidth: 574
}
export const startCharCode = 65

export class WatersUI {
  constructor (terroritory, title) {
    this.board = document.getElementById(terroritory + '-board')
    this.score = new ScoreUI(terroritory)
    this.terroritory = terroritory
    this.terroritoryTitle = title
    this.placingShips = false
    this.containerWidth = gameHost.containerWidth
    this.isPrinting = false
    this.showShips = false
  }

  showTitle (name) {
    const titleEl = document.getElementById(this.terroritory + '-title')
    titleEl.textContent = this.terroritoryTitle + ' ' + name
  }
  showMapTitle () {
    this.showTitle(bh.mapHeading)
  }
  showFleetTitle () {
    this.showTitle(bh.fleetHeading)
  }

  cellSizeScreen (map) {
    map = map || bh.map
    return this.containerWidth / (map?.cols || 18)
  }
  cellSizeList () {
    return this.containerWidth / 22
  }
  cellSizePrint (map) {
    map = map || bh.map
    return 600 / (map.cols + 1)
  }

  cellUnit () {
    return 'px'
  }
  cellSize (map) {
    return this.isPrinting ? this.cellSizePrint(map) : this.cellSizeScreen()
  }

  cellSizeString () {
    return this.cellSize() + this.cellUnit()
  }

  cellSizeStringList () {
    return this.cellSizeList() + this.cellUnit()
  }
  cellSizeStringPrint () {
    return this.cellSizePrint() + this.cellUnit()
  }
  gridCellRawAt (r, c) {
    return this.board.children[r * bh.map.cols + c]
  }
  gridCellAt (r, c) {
    const result = this.gridCellRawAt(r, c)
    if (result?.classList) return result
    throw new Error(
      'Invalid cell' + JSON.stringify(result) + 'at ' + r + ',' + c
    )
  }
  *gridCellsForCoords (coords) {
    for (const [r, c] of coords) {
      yield this.gridCellAt(r, c)
    }
  }
  *cellsAndCoords (coords) {
    for (const [r, c, power] of coords) {
      yield [this.gridCellAt(r, c), r, c, power]
    }
  }
  async delayAsyncEffects (cells, effect, mindelay = 380, maxdelay = 730) {
    const promises = cells.map(([cell, , , power]) =>
      this.delayAsyncEffect(cell, effect, mindelay, maxdelay, power)
    )
    return await Promise.allSettled(promises)
  }

  async delayAsyncEffect (
    cell,
    effect,
    mindelay = 380,
    maxdelay = 730,
    power = null
  ) {
    await Delay.randomWait(mindelay, maxdelay)
    await effect(cell, power)
  }
  displayShipCellBase (cell, ship) {
    const letter = ship?.letter || '-'
    cell.dataset.id = ship?.id
    cell.dataset.letter = letter
    this.setShipCellColors(cell, letter)
  }

  displayLetterShipCell (ship, cell) {
    const letter = ship?.letter || '-'
    cell.dataset.letter = letter
    cell.textContent = letter
    this.displayShipCellBase(cell, ship)
  }

  visibleShipCell (ship, r, c, cell) {
    const w = ship?.rackAt(c, r)
    if (w) {
      this.displayArmedShipCell(ship, cell, w)
    } else {
      this.displayLetterShipCell(ship, cell)
    }
    this.displaySurroundShipCell(ship, cell)
  }

  surroundShipCellAt (ship, r, c) {
    const cell = this.gridCellAt(r, c)
    this.displaySurroundShipCell(ship, cell)
  }
  displaySurroundShipCell (ship, cell) {
    if (!ship.weapons || Object.values(ship.weapons).length === 0) return
    const letter = ship?.letter || '-'
    cell.dataset.sletter = letter
    const wletter = ship.getPrimaryWeapon().letter
    cell.dataset.wletters = wletter
    cell.dataset.variant = ship.variant
    const turn = ship.getTurn()
    if (turn && turn !== '') cell.classList.add(turn)
    cell.dataset.surround = ship.id
    const keyIds = ship.makeKeyIds()
    addKeyToCell(cell, 'keyIds', keyIds)
  }

  displayArmedShipCell (ship, cell, w) {
    const letter = ship?.letter || '-'
    cell.dataset.id = ship?.id
    cell.dataset.letter = letter
    const wletter = w.weapon.letter
    const ammo = w.ammo
    cell.dataset.wletter = wletter
    cell.dataset.ammo = ammo
    cell.dataset.wid = w.id
    cell.dataset.variant = ship.variant
    cell.textContent = ''
    cell.classList.add('weapon')
    this.displayShipCellBase(cell, ship)
  }
  displaySunkCell (cell, letter) {
    this.setShipCellColors(cell, letter)
    cell.classList.add('enm-sunk')
    if (
      cell.classList.contains('burnt') ||
      cell.classList.contains('damaged') ||
      cell.classList.contains('skull')
    ) {
      cell.textContent = ''
    } else {
      cell.textContent = letter
    }
  }
  setShipCellColors (cell, letter) {
    const maps = bh.maps
    cell.style.color = maps.shipLetterColors[letter] || '#fff'
    cell.style.background = maps.shipColors[letter] || 'rgba(255,255,255,0.2)'
  }

  displayAsRevealed (cell, ship) {
    const letter = ship?.letter || '-'
    if (cell) {
      this.setShipCellColors(cell, letter)

      const [r, c] = coordsFromCell(cell)
      const w = ship?.rackAt(c, r)
      if (w) {
        cell.dataset.ammo = 1
        cell.classList.add('weapon')
        cell.textContent = ''
      } else {
        cell.textContent = letter
      }
    }
  }

  resetShips (ships) {
    for (const ship of ships) {
      ship.reset()
      this.revealShip(ship)
    }
  }
  revealShips (ships) {
    for (const ship of ships) {
      this.revealShip(ship)
    }
  }
  revealShip (ship) {
    for (const [c, r] of ship.cells) {
      const cell = this.gridCellAt(r, c)
      this.displayAsRevealed(cell, ship)
    }
  }

  clearCellContent (cell) {
    cell.textContent = ''
    this.clearCell(cell)
  }
  clearCellVisuals (cell, details, classClear) {
    const clear = classClear || this.clearCell.bind(this)
    if (details === 'content') {
      cell.textContent = ''
    } else if (details === 'all') {
      cell.textContent = ''
      cell.style.background = ''
      cell.style.color = ''
    }
    clear(cell)
  }

  clearPlaceCellVisuals (cell) {
    cell.textContent = ''
    cell.style.background = ''
    cell.style.color = ''
    this.clearPlaceCell(cell)
  }
  clearCell (cell) {
    cell.classList.remove(
      'hit',
      'frd-hit',
      'frd-sunk',
      'enm-sunk',
      'miss',
      'semi',
      'wake',
      'semi-miss',
      'placed'
    )
  }
  clearFriendCell (cell) {
    cell.classList.remove(
      'hit',
      'frd-hit',
      'frd-sunk',
      'miss',
      'semi',
      'wake',
      'semi-miss',
      'placed',
      'hint',
      'empty'
    )
  }
  clearPlaceCell (cell) {
    cell.classList.remove(
      'miss',
      'placed',
      'weapon',
      'burnt',
      'damaged',
      'skull',
      'empty',
      'turn2',
      'turn3',
      'turn4',
      'launch',
      ...bh.terrain.weapons.tags
    )
    for (const key in cell.dataset) {
      if (key !== 'r' && key !== 'c') delete cell.dataset[key]
    }
  }
  clearClasses () {
    for (const cell of this.board.children) {
      this.clearCell(cell)
    }
  }
  displayAsSunk (cell, _letter) {
    this.clearCell(cell)
    cell.classList.add('frd-sunk')
    this.cellHitBase(cell)
    cell.classList.remove('frd-hit')
  }

  cellHitBase (cell, damaged) {
    cell.classList.remove(
      'semi',
      'semi-miss',
      'wake',
      'weapon',
      'turn2',
      'turn3',
      'turn4',
      'empty',
      'active'
    )
    const tags = bh.terrain.weapons.tags
    const cursors = bh.terrain.weapons.cursors
    cell.classList.remove(...tags, ...cursors)
    cell.classList.add('frd-hit')
    if (damaged) {
      cell.classList.add(damaged)
    }
    cell.textContent = ''
  }
  cellSunkAt (r, c, letter) {
    const cell = this.gridCellAt(r, c)
    this.displayAsSunk(cell, letter)
  }

  cellHit (r, c, damage) {
    const cell = this.gridCellAt(r, c)

    cell.classList.remove(
      'semi',
      'semi-miss',
      'wake',
      'empty',
      'weapon',
      'active',
      ...bh.terrain.weapons.tags
    )
    cell.classList.add('hit')
    if (damage) {
      cell.classList.add(damage)
    }
    cell.textContent = ''
  }

  cellSemiReveal (r, c) {
    const cell = this.gridCellAt(r, c)

    if (
      cell.classList.contains('placed') ||
      cell.classList.contains('miss') ||
      cell.classList.contains('hit')
    )
      return LoadOut.noResult
    cell.classList.add('semi')
    cell.classList.remove('wake')
    cell.textContent = ''
    return LoadOut.missResult
  }

  cellHintReveal (r, c) {
    const cell = this.gridCellAt(r, c)

    if (
      cell.classList.contains('placed') ||
      cell.classList.contains('miss') ||
      cell.classList.contains('hit') ||
      cell.classList.contains('semi')
    )
      return
    cell.classList.add('hint')
    cell.classList.remove('wake')
    cell.textContent = ''
  }
  cellWeaponActive (r, c, turn, extra) {
    const cell = this.gridCellAt(r, c)
    cell.classList.add('weapon', 'active')
    this.addContrast(cell)

    if (extra) {
      cell.classList.add(extra)
    }
    if (turn && turn !== '') cell.classList.add(turn)
    cell.classList.remove('wake')
    cell.textContent = ''
  }

  cellWeaponDeactivate (r, c) {
    const cell = this.gridCellAt(r, c)

    this.removeShadowWeapon(cell)

    deactivateWeapon(cell)
  }

  cellMiss (r, c, damage) {
    const cell = this.gridCellAt(r, c)

    if (cell.classList.contains('placed')) return
    cell.classList.add('miss')
    if (damage) {
      cell.classList.add(damage)
    }
    cell.classList.remove('wake')
  }
  surrounder (map, r, c, adder) {
    const m = map || bh.map
    // surrounding water misses
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr
        const cc = c + dc
        if (m.inBounds(rr, cc)) {
          adder(rr, cc)
        }
      }
  }
  surround (map, r, c, container) {
    this.surrounder(map, r, c, (rr, cc) => {
      container.add(makeKey(rr, cc))
    })
  }
  surroundObj (map, r, c, container, maker) {
    this.surrounder(map, r, c, (rr, cc) => {
      container[makeKey(rr, cc)] = maker(rr, cc)
    })
  }
  surroundList (map, r, c, container, maker) {
    this.surrounder(map, r, c, (rr, cc) => {
      container.push(maker(rr, cc))
    })
  }

  cellSet (cells) {
    let result = new Set()
    for (const [r, c] of cells) {
      // surrounding water misses
      result.add(makeKey(r, c))
    }
    return result
  }
  hollowCells (cells) {
    return this.surroundCells(cells).difference(this.cellSet(cells))
  }
  surroundCells (cells) {
    const map = bh.map
    let surroundings = new Set()
    for (const [c, r] of cells) {
      // surrounding water misses
      this.surround(map, r, c, surroundings)
    }
    return surroundings
  }
  surroundCellElement (cells, container) {
    const map = bh.map
    let surroundings = container || {}
    for (const cell of cells) {
      const [r, c] = coordsFromCell(cell)
      this.surroundObj(map, r, c, surroundings, this.gridCellAt.bind(this))
    }
    return Object.values(surroundings)
  }
  displaySurround (cells, ship, cellMiss, display) {
    const surround = this.hollowCells(cells)
    const surroundings = [...surround].map(p => parsePair(p))
    for (const [r, c] of surroundings) {
      cellMiss(r, c)
    }
    if (display) {
      for (const [r, c] of cells) {
        display(r, c, ship)
      }
    }
  }
  resetBoardSize (map, cellSize) {
    if (!map) map = bh.map
    cellSize = cellSize || this.cellSizeString()
    this.board.style.setProperty('--cols', map?.cols || 18)
    this.board.style.setProperty('--rows', map?.rows || 8)
    this.board.style.setProperty('--boxSize', cellSize)
    this.board.innerHTML = ''
  }
  resetBoardSizePrint (map) {
    if (!map) map = bh.map
    const cellSize = this.cellSizeStringPrint()
    this.board.style.setProperty('--cols', map.cols + 1)
    this.board.style.setProperty('--rows', map.rows + 1)
    this.board.style.setProperty('--boxSize', cellSize)
    this.board.innerHTML = ''
  }
  colorize (r, c) {
    this.colorizeCell(this.gridCellRawAt(r, c), r, c)
  }

  recolor (r, c) {
    this.recolorCell(this.gridCellRawAt(r, c), r, c)
  }
  refreshAllColor () {
    for (const el of this.board.children) {
      this.refreshColor(el)
    }
  }
  refreshColor (cell) {
    const r = Number.parseInt(cell.dataset.r)
    const c = Number.parseInt(cell.dataset.c)
    this.uncolorCell(cell)
    this.colorizeCell(cell, r, c)
  }
  uncolorCell (cell) {
    cell.classList.remove(
      'land',
      'sea',
      'light',
      'dark',
      'rightEdge',
      'leftEdge',
      'topEdge',
      'bottomEdge'
    )
  }
  recolorCell (cell, r, c) {
    this.uncolorCell(cell)
    this.colorizeCell(cell, r, c)
  }
  colorizeCell (cell, r, c, map) {
    if (!map) map = bh.map

    map.tagCell(cell.classList, r, c)

    const land = map.isLand(r, c)
    const c1 = c + 1
    const r1 = r + 1
    if (!land && c1 < map.cols && map.isLand(r, c1)) {
      cell.classList.add('rightEdge')
    }

    if (c !== 0 && !land && map.isLand(r, c - 1)) {
      cell.classList.add('leftEdge')
    }
    if (r1 < map.rows && land !== map.isLand(r1, c)) {
      cell.classList.add('bottomEdge')
    }
    if (r !== 0 && !land && map.isLand(r - 1, c)) {
      cell.classList.add('topEdge')
    }
  }

  buildEmptyCell () {
    const cell = document.createElement('div')
    cell.className = 'cell empty'
    this.board.appendChild(cell)
  }

  buildRowLabel (max, r) {
    const cell = document.createElement('div')
    cell.className = 'cell row-label'
    cell.dataset.r = r
    cell.textContent = max - r
    this.board.appendChild(cell)
  }
  buildColLabel (c) {
    const cell = document.createElement('div')
    cell.className = 'cell col-label'
    cell.dataset.c = c
    cell.textContent = String.fromCodePoint(startCharCode + c)
    this.board.appendChild(cell)
  }
  buildCell (r, c, onClickCell, map) {
    const cell = document.createElement('div')
    cell.className = 'cell'
    this.colorizeCell(cell, r, c, map)
    setCellCoords(cell, r, c)

    if (onClickCell) {
      cell.addEventListener('click', onClickCell)
    }
    this.board.appendChild(cell)
  }
  buildBoardPrint (map) {
    map = map || bh.map
    this.board.innerHTML = ''
    this.buildEmptyCell()

    for (let c = 0; c < map.cols; c++) {
      this.buildColLabel(c)
    }
    for (let r = 0; r < map.rows; r++) {
      this.buildRowLabel(map.rows, r)
      for (let c = 0; c < map.cols; c++) {
        this.buildCell(r, c, null, map)
      }
    }
  }
  buildBoard (onClickCell, thisRef, map) {
    map = map || bh.map
    this.board.innerHTML = ''
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        if (onClickCell)
          this.buildCell(r, c, onClickCell.bind(thisRef, r, c), map)
        else this.buildCell(r, c, null, map)
      }
    }
  }
  removeHighlightAoE () {
    for (const el of this.board.children) {
      el.classList.remove('target', ...Object.values(bh.splashTags))
    }
  }
  buildBoardHover (onEnter, onLeave, thisRef, weaponSource) {
    for (const el of this.board.children) {
      const [r, c] = coordsFromCell(el)
      el.addEventListener('mouseenter', onEnter.bind(null, weaponSource, r, c))
      el.addEventListener('mouseleave', onLeave.bind(thisRef, r, c))
    }
  }

  clearVisualsBase (details, classClear) {
    const clear = classClear || this.clearCell.bind(this)
    const children = this.board?.children
    if (!children) return
    for (const el of children) {
      this.clearCellVisuals(el, details, clear)
    }
  }
  clearVisuals () {
    this.clearVisualsBase('all')
  }

  clearFriendVisuals () {
    this.clearVisualsBase('all', this.clearFriendCell.bind(this))
  }
  clearFriendClasses () {
    this.clearVisualsBase('none', this.clearFriendCell.bind(this))
  }
  clearPlaceVisuals () {
    this.clearVisualsBase('all', this.clearPlaceCell.bind(this))
  }
  showNotice (notice) {
    gameStatus.addToQueue(notice, false)
  }
  showTips () {
    gameStatus.setTips(this.tips, null)
  }
  hideTips () {
    gameStatus.clearQueue()
  }
  deactivateWeapons () {
    for (const cell of this.board.children) {
      deactivateWeapon(cell)
    }
  }
}

function deactivateWeapon (cell) {
  cell.classList.remove('active', 'contrast', ...bh.terrain.weapons.tags)
}
