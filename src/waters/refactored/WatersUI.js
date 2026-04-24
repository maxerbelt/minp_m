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

/**
 * REFACTORING: Unified cell class manipulation to eliminate
 * duplicate class removal logic across clearCell, clearFriendCell, clearPlaceCell
 */
class CellClassManager {
  static CELL_CLASSES = {
    display: {
      hit: 'hit',
      friendlyHit: 'frd-hit',
      friendlySunk: 'frd-sunk',
      enemySunk: 'enm-sunk',
      miss: 'miss',
      semi: 'semi',
      wake: 'wake',
      semiMiss: 'semi-miss',
      placed: 'placed'
    },
    weapon: {
      weapon: 'weapon',
      active: 'active',
      contrast: 'contrast'
    },
    damage: {
      burnt: 'burnt',
      damaged: 'damaged',
      skull: 'skull'
    },
    placement: {
      empty: 'empty',
      turn2: 'turn2',
      turn3: 'turn3',
      turn4: 'turn4',
      launch: 'launch'
    },
    edge: {
      land: 'land',
      sea: 'sea',
      light: 'light',
      dark: 'dark',
      rightEdge: 'rightEdge',
      leftEdge: 'leftEdge',
      topEdge: 'topEdge',
      bottomEdge: 'bottomEdge'
    },
    hint: {
      hint: 'hint'
    }
  }

  static clearCellClasses (cell, classGroups) {
    const classesToRemove = classGroups.flatMap(group => Object.values(group))
    cell.classList.remove(...classesToRemove)
  }

  static getAllClasses (classGroups) {
    return classGroups.flatMap(group => Object.values(group))
  }

  static clearCell (cell) {
    this.clearCellClasses(cell, [
      this.CELL_CLASSES.display,
      this.CELL_CLASSES.damage
    ])
  }

  static clearFriendCell (cell) {
    this.clearCellClasses(cell, [
      this.CELL_CLASSES.display,
      this.CELL_CLASSES.damage,
      this.CELL_CLASSES.placement,
      this.CELL_CLASSES.hint
    ])
  }

  static clearPlaceCell (cell) {
    this.clearCellClasses(cell, [
      this.CELL_CLASSES.weapon,
      this.CELL_CLASSES.damage,
      this.CELL_CLASSES.placement,
      { weaponTags: true } // Placeholder: will be populated from bh.terrain.weapons.tags
    ])

    for (const key in cell.dataset) {
      if (key !== 'r' && key !== 'c') delete cell.dataset[key]
    }
  }
}

/**
 * REFACTORING: Consolidate board configuration logic
 * to eliminate duplication between resetBoardSize and resetBoardSizePrint
 */
class BoardConfigurator {
  static configureBoardGrid (board, map, cellSize) {
    board.style.setProperty('--cols', map?.cols || 18)
    board.style.setProperty('--rows', map?.rows || 8)
    board.style.setProperty('--boxSize', cellSize)
    board.innerHTML = ''
  }

  static resetBoardSize (board, map, cellSize) {
    if (!map) map = bh.map
    if (!cellSize)
      cellSize = board.cellSizeString ? board.cellSizeString() : '32px'
    this.configureBoardGrid(board, map, cellSize)
  }

  static resetBoardSizePrint (board, map, cellSizePrint) {
    if (!map) map = bh.map
    if (!cellSizePrint) cellSizePrint = 600 / (map.cols + 1) + 'px'

    board.style.setProperty('--cols', map.cols + 1)
    board.style.setProperty('--rows', map.rows + 1)
    board.style.setProperty('--boxSize', cellSizePrint)
    board.innerHTML = ''
  }
}

/**
 * REFACTORING: Extract surrounding cells logic to reduce duplication
 * across surround, surroundObj, surroundList methods
 */
class SurroundingCellsHelper {
  static forEachSurroundingCell (map, r, c, callback) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr
        const cc = c + dc
        if (map.inBounds(rr, cc)) {
          callback(rr, cc)
        }
      }
    }
  }

  static asKeySet (map, r, c) {
    const result = new Set()
    this.forEachSurroundingCell(map, r, c, (rr, cc) => {
      result.add(makeKey(rr, cc))
    })
    return result
  }

  static asObjectMap (map, r, c, maker) {
    const result = {}
    this.forEachSurroundingCell(map, r, c, (rr, cc) => {
      result[makeKey(rr, cc)] = maker(rr, cc)
    })
    return result
  }

  static asArray (map, r, c, maker) {
    const result = []
    this.forEachSurroundingCell(map, r, c, (rr, cc) => {
      result.push(maker(rr, cc))
    })
    return result
  }
}

/**
 * REFACTORING: Consolidate ship cell display logic to reduce
 * duplication across displayShipCellBase, displayLetterShipCell, visibleShipCell
 */
class ShipCellDisplayer {
  static setBaseAttributes (cell, ship) {
    const letter = ship?.letter || '-'
    cell.dataset.id = ship?.id
    cell.dataset.letter = letter
    return letter
  }

  static displayLetterCell (cell, ship, maps) {
    const letter = this.setBaseAttributes(cell, ship)
    cell.textContent = letter
    cell.style.color = maps.shipLetterColors[letter] || '#fff'
    cell.style.background = maps.shipColors[letter] || 'rgba(255,255,255,0.2)'
  }

  static displayArmedCell (cell, ship, weapon, maps) {
    const letter = this.setBaseAttributes(cell, ship)
    const wletter = weapon.weapon.letter
    const ammo = weapon.ammo

    cell.dataset.wletter = wletter
    cell.dataset.ammo = ammo
    cell.dataset.wid = weapon.id
    cell.dataset.variant = ship.variant
    cell.textContent = ''
    cell.classList.add('weapon')

    cell.style.color = maps.shipLetterColors[letter] || '#fff'
    cell.style.background = maps.shipColors[letter] || 'rgba(255,255,255,0.2)'
  }

  static displaySurroundAttributes (cell, ship) {
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

  static displayAsRevealed (cell, ship, maps) {
    const letter = ship?.letter || '-'
    if (!cell) return

    cell.style.color = maps.shipLetterColors[letter] || '#fff'
    cell.style.background = maps.shipColors[letter] || 'rgba(255,255,255,0.2)'

    const [r, c] = coordsFromCell(cell)
    const weapon = ship?.rackAt(c, r)
    if (weapon) {
      cell.dataset.ammo = 1
      cell.classList.add('weapon')
      cell.textContent = ''
    } else {
      cell.textContent = letter
    }
  }
}

export class WatersUI {
  constructor (territory, title) {
    this.board = document.getElementById(territory + '-board')
    this.score = new ScoreUI(territory)
    this.territory = territory
    this.terroritoryTitle = title
    this.placingShips = false
    this.containerWidth = gameHost.containerWidth
    this.isPrinting = false
    this.showShips = false
  }

  showTitle (name) {
    const titleEl = document.getElementById(this.territory + '-title')
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

  /**
   * REFACTORING: Consolidated display logic using ShipCellDisplayer
   */
  visibleShipCell (ship, r, c, cell) {
    const maps = bh.maps
    const weapon = ship?.rackAt(c, r)

    if (weapon) {
      ShipCellDisplayer.displayArmedCell(cell, ship, weapon, maps)
    } else {
      ShipCellDisplayer.displayLetterCell(cell, ship, maps)
    }

    ShipCellDisplayer.displaySurroundAttributes(cell, ship)
  }

  surroundShipCellAt (ship, r, c) {
    const cell = this.gridCellAt(r, c)
    ShipCellDisplayer.displaySurroundAttributes(cell, ship)
  }

  displaySurroundShipCell (ship, cell) {
    ShipCellDisplayer.displaySurroundAttributes(cell, ship)
  }

  displayArmedShipCell (ship, cell, w) {
    const maps = bh.maps
    ShipCellDisplayer.displayArmedCell(cell, ship, w, maps)
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

  /**
   * REFACTORING: Consolidated display logic using ShipCellDisplayer
   */
  displayAsRevealed (cell, ship) {
    ShipCellDisplayer.displayAsRevealed(cell, ship, bh.maps)
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

  /**
   * REFACTORING: Unified cell clearing using CellClassManager
   */
  clearCell (cell) {
    CellClassManager.clearCell(cell)
  }

  /**
   * REFACTORING: Unified cell clearing using CellClassManager
   */
  clearFriendCell (cell) {
    CellClassManager.clearFriendCell(cell)
  }

  /**
   * REFACTORING: Unified cell clearing using CellClassManager
   */
  clearPlaceCell (cell) {
    CellClassManager.clearPlaceCell(cell)
    // Remove weapon tag classes
    const tags = bh.terrain?.weapons?.tags || []
    cell.classList.remove(...tags)
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

  /**
   * REFACTORING: Extracted surrounding cell logic to SurroundingCellsHelper
   */
  surround (map, r, c, container) {
    const keys = SurroundingCellsHelper.asKeySet(map || bh.map, r, c)
    keys.forEach(key => container.add(key))
  }

  /**
   * REFACTORING: Extracted surrounding cell logic to SurroundingCellsHelper
   */
  surroundObj (map, r, c, container, maker) {
    const obj = SurroundingCellsHelper.asObjectMap(map || bh.map, r, c, maker)
    Object.assign(container, obj)
  }

  /**
   * REFACTORING: Extracted surrounding cell logic to SurroundingCellsHelper
   */
  surroundList (map, r, c, container, maker) {
    const list = SurroundingCellsHelper.asArray(map || bh.map, r, c, maker)
    container.push(...list)
  }

  cellSet (cells) {
    let result = new Set()
    for (const [r, c] of cells) {
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

  /**
   * REFACTORING: Consolidated board initialization using BoardConfigurator
   */
  resetBoardSize (map, cellSize) {
    BoardConfigurator.resetBoardSize(this.board, map, cellSize)
  }

  /**
   * REFACTORING: Consolidated board initialization using BoardConfigurator
   */
  resetBoardSizePrint (map) {
    BoardConfigurator.resetBoardSizePrint(this.board, map)
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
    const edgeClasses = Object.values(CellClassManager.CELL_CLASSES.edge)
    cell.classList.remove(...edgeClasses)
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
    gameStatus._addToQueue(notice, false)
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
