import { bh } from '../terrains/all/js/bh.js'
import { ScoreUI } from './ScoreUI.js'
import {
  coordsFromCell,
  makeKey,
  parsePair,
  setCellCoords
} from '../core/utilities.js'
import { LoadOut } from './LoadOut.js'
import { gameStatus } from './StatusUI.js'
import { Delay } from '../core/Delay.js'
import { CellClassManager } from './helpers/CellClassManager.js'
import { BoardConfigurator } from './helpers/BoardConfigurator.js'
import { SurroundingCellsHelper } from './helpers/SurroundingCellsHelper.js'
import { ShipCellDisplayer } from './helpers/ShipCellDisplayer.js'

export const gameHost = {
  containerWidth: 574
}
export const startCharCode = 65

const DEFAULT_CELL_CLEAN_CLASSES = [
  'semi',
  'semi-miss',
  'wake',
  'weapon',
  'portal',
  'marker',
  'turn2',
  'turn3',
  'turn4',
  'empty',
  'active'
]

const getBoardChildren = board => board?.children || []

export class WatersUI {
  /**
   * @param {string} territory
   * @param {string} title
   */
  constructor (territory, title) {
    this.board = document.getElementById(territory + '-board')
    this.score = new ScoreUI(territory)
    this.territory = territory
    this.territoryTitle = title
    this.placingShips = false
    this.containerWidth = gameHost.containerWidth
    this.isPrinting = false
    this.showShips = false
  }

  /**
   * @private
   * @param {HTMLElement} cell
   * @param {string[]} classNames
   */
  _removeClassesFromCell (cell, classNames) {
    if (classNames.length) {
      cell.classList.remove(...classNames)
    }
  }

  /**
   * @private
   * @param {HTMLElement} cell
   */
  _clearCellText (cell) {
    cell.textContent = ''
  }

  /**
   * @private
   * @param {HTMLElement} cell
   */
  _resetCellStyle (cell) {
    cell.style.background = ''
    cell.style.color = ''
  }

  /**
   * @private
   * @returns {string[]}
   */
  _weaponTags () {
    return bh.terrain?.weapons?.tags || []
  }

  /**
   * @private
   * @returns {string[]}
   */
  _cursorTags () {
    return bh.terrain?.weapons?.cursors || []
  }

  /**
   * @private
   * @param {function(HTMLElement): void} callback
   */
  _forEachBoardCell (callback) {
    for (const cell of getBoardChildren(this.board)) {
      callback(cell)
    }
  }

  /**
   * Set the board title text.
   * @param {string} name
   */
  showTitle (name) {
    const titleEl = document.getElementById(this.territory + '-title')
    titleEl.textContent = this.territoryTitle + ' ' + name
  }

  showMapTitle () {
    this.showTitle(bh.mapHeading)
  }

  showFleetTitle () {
    this.showTitle(bh.fleetHeading)
  }

  /**
   * @param {{cols:number}} [map]
   * @returns {number}
   */
  cellSizeScreen (map) {
    map = map || bh.map
    return this.containerWidth / (map?.cols || 18)
  }

  /**
   * @returns {number}
   */
  cellSizeList () {
    return this.containerWidth / 22
  }

  /**
   * @param {{cols:number}} [map]
   * @returns {number}
   */
  cellSizePrint (map) {
    map = map || bh.map
    return 600 / (map.cols + 1)
  }

  /**
   * @returns {string}
   */
  cellUnit () {
    return 'px'
  }

  /**
   * @param {{cols:number}} [map]
   * @returns {number}
   */
  cellSize (map) {
    return this.isPrinting ? this.cellSizePrint(map) : this.cellSizeScreen()
  }

  /**
   * @param {number} value
   * @returns {string}
   */
  formatCellSize (value) {
    return `${value}${this.cellUnit()}`
  }

  /**
   * @returns {string}
   */
  cellSizeString () {
    return this.formatCellSize(this.cellSize())
  }

  /**
   * @returns {string}
   */
  cellSizeStringList () {
    return this.formatCellSize(this.cellSizeList())
  }

  /**
   * @returns {string}
   */
  cellSizeStringPrint () {
    return this.formatCellSize(this.cellSizePrint())
  }

  /**
   * @param {number} r
   * @param {number} c
   * @returns {number}
   */
  _gridIndex (r, c) {
    return r * bh.map.cols + c
  }

  /**
   * @param {number} r
   * @param {number} c
   * @returns {HTMLElement|null}
   */
  gridCellRawAt (r, c) {
    return this.board?.children?.[this._gridIndex(r, c)] || null
  }

  /**
   * @param {number} r
   * @param {number} c
   * @returns {HTMLElement}
   */
  gridCellAt (r, c) {
    const result = this.gridCellRawAt(r, c)
    if (result?.classList) return result
    throw new Error(`Invalid cell at ${r},${c}: ${JSON.stringify(result)}`)
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

  /**
   * @param {Array<[HTMLElement, number, number, any]>} cells
   * @param {function(HTMLElement, any): Promise<void>} effect
   * @param {number} [mindelay=380]
   * @param {number} [maxdelay=730]
   * @returns {Promise<PromiseSettledResult<void>[]>}
   */
  async delayAsyncEffects (cells, effect, mindelay = 380, maxdelay = 730) {
    const promises = cells.map(([cell, , , power]) =>
      this.delayAsyncEffect(cell, effect, mindelay, maxdelay, power)
    )
    return await Promise.allSettled(promises)
  }

  /**
   * @param {HTMLElement} cell
   * @param {function(HTMLElement, any): Promise<void>} effect
   * @param {number} [mindelay=380]
   * @param {number} [maxdelay=730]
   * @param {any} [power=null]
   */
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

  /**
   * @param {HTMLElement} cell
   * @param {Object} ship
   */
  displayShipCellBase (cell, ship) {
    const letter = ship?.letter || '-'
    cell.dataset.id = ship?.id
    cell.dataset.letter = letter
    this.setShipCellColors(cell, letter)
  }

  /**
   * @param {Object} ship
   * @param {HTMLElement} cell
   */
  displayLetterShipCell (ship, cell) {
    const letter = ship?.letter || '-'
    cell.dataset.letter = letter
    cell.textContent = letter
    this.displayShipCellBase(cell, ship)
  }

  /**
   * @param {Object} ship
   * @param {number} r
   * @param {number} c
   * @param {HTMLElement} cell
   */
  visibleShipCell (ship, r, c, cell) {
    const maps = bh.maps
    const weapon = ship?.rackAt(c, r)
    if (weapon) {
      ShipCellDisplayer.displayArmedCell(cell, ship, weapon, maps)
    } else {
      ShipCellDisplayer.displayLetterCell(cell, ship, maps)
    }
    ShipCellDisplayer.displaySurroundAttributes(cell, ship, r, c)
  }

  /**
   * @param {Object} ship
   * @param {number} r
   * @param {number} c
   */
  surroundShipCellAt (ship, r, c) {
    const cell = this.gridCellAt(r, c)
    ShipCellDisplayer.displaySurroundAttributes(cell, ship, r, c)
  }

  /**
   * @param {HTMLElement} cell
   * @param {string} letter
   */
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

  /**
   * @param {HTMLElement} cell
   * @param {string} letter
   */
  setShipCellColors (cell, letter) {
    const maps = bh.maps
    cell.style.color = maps.shipLetterColors[letter] || '#fff'
    cell.style.background = maps.shipColors[letter] || 'rgba(255,255,255,0.2)'
  }

  /**
   * @param {Object[]} ships
   */
  resetShips (ships) {
    for (const ship of ships) {
      ship.reset()
      this.revealShip(ship)
    }
  }

  /**
   * @param {Object[]} ships
   */
  revealShips (ships) {
    for (const ship of ships) {
      this.revealShip(ship)
    }
  }

  /**
   * @param {Object} ship
   */
  revealShip (ship) {
    const map = bh.maps
    for (const [c, r] of ship.cells) {
      const cell = this.gridCellAt(r, c)
      ShipCellDisplayer.displayAsRevealed(cell, ship, map)
    }
  }

  /**
   * @param {HTMLElement} cell
   */
  clearCellContent (cell) {
    this._clearCellText(cell)
    this.clearCell(cell)
  }

  /**
   * @param {HTMLElement} cell
   * @param {'none'|'content'|'all'} details
   * @param {function(HTMLElement): void} [classClear]
   */
  clearCellVisuals (cell, details, classClear) {
    const clear = classClear || this.clearCell.bind(this)
    if (details === 'content') {
      this._clearCellText(cell)
    } else if (details === 'all') {
      this._clearCellText(cell)
      this._resetCellStyle(cell)
    }
    clear(cell)
  }

  /**
   * @param {HTMLElement} cell
   */
  clearPlaceCellVisuals (cell) {
    this._clearCellText(cell)
    this._resetCellStyle(cell)
    this.clearPlaceCell(cell)
  }

  /**
   * @param {HTMLElement} cell
   */
  clearCell (cell) {
    CellClassManager.clearCell(cell)
  }

  /**
   * @param {HTMLElement} cell
   */
  clearDisplayCell (cell) {
    CellClassManager.clearDisplayCell(cell)
  }

  /**
   * @param {HTMLElement} cell
   */
  clearFriendCell (cell) {
    CellClassManager.clearFriendCell(cell)
  }

  /**
   * @param {HTMLElement} cell
   */
  clearPlaceCell (cell) {
    CellClassManager.clearPlaceCell(cell)
    cell.classList.remove(...this._weaponTags())
  }

  /**
   * @param {HTMLElement} cell
   * @param {string} [_letter]
   */
  displayAsSunk (cell, _letter) {
    this.clearCell(cell)
    cell.classList.add('frd-sunk')
    this.cellHitBase(cell)
    cell.classList.remove('frd-hit')
  }

  clearClasses () {
    this._forEachBoardCell(cell => this.clearCell(cell))
  }

  /**
   * @param {HTMLElement} cell
   */
  resetHitCellState (cell) {
    this._removeClassesFromCell(cell, DEFAULT_CELL_CLEAN_CLASSES)
    this._removeClassesFromCell(cell, this._weaponTags())
    this._removeClassesFromCell(cell, this._cursorTags())
  }

  /**
   * @param {HTMLElement} cell
   * @param {string} [damaged]
   */
  cellHitBase (cell, damaged) {
    this.resetHitCellState(cell)
    cell.classList.add('frd-hit')
    if (damaged) {
      cell.classList.add(damaged)
    }
    this._clearCellText(cell)
  }

  /**
   * @param {number} r
   * @param {number} c
   * @param {string} letter
   */
  cellSunkAt (r, c, letter) {
    const cell = this.gridCellAt(r, c)
    this.displayAsSunk(cell, letter)
  }

  /**
   * @param {number} r
   * @param {number} c
   * @param {string} [damage]
   */
  cellHit (r, c, damage) {
    const cell = this.gridCellAt(r, c)

    this._removeClassesFromCell(cell, [
      'semi',
      'semi-miss',
      'wake',
      'empty',
      'weapon',
      'active',
      'portal',
      'marker',
      ...this._weaponTags()
    ])
    cell.classList.add('hit')
    if (damage) {
      cell.classList.add(damage)
    }
    this._clearCellText(cell)
  }

  /**
   * @param {number} r
   * @param {number} c
   */
  cellSemiReveal (r, c) {
    const cell = this.gridCellAt(r, c)

    if (
      cell.classList.contains('placed') ||
      cell.classList.contains('miss') ||
      cell.classList.contains('hit')
    ) {
      return LoadOut.noResult
    }
    cell.classList.add('semi')
    cell.classList.remove('wake')
    this._clearCellText(cell)
    return LoadOut.missResult
  }

  /**
   * @param {number} r
   * @param {number} c
   */
  cellHintReveal (r, c) {
    const cell = this.gridCellAt(r, c)

    if (
      cell.classList.contains('placed') ||
      cell.classList.contains('miss') ||
      cell.classList.contains('hit') ||
      cell.classList.contains('semi')
    ) {
      return
    }
    cell.classList.add('hint')
    cell.classList.remove('wake', 'temp-hint')
    this.deactivateTempHints()
    this._clearCellText(cell)
  }

  /**
   * @param {HTMLElement} _cell
   */
  addContrast (_cell) {
    /* only needs implementation if enemy */
  }

  /**
   * @param {HTMLElement} _cell
   */
  removeShadowWeapon (_cell) {
    /* only needs implementation if enemy */
  }

  /**
   * @param {number} r
   * @param {number} c
   * @param {string} turn
   * @param {string} [extra]
   */
  cellWeaponActive (r, c, turn, extra) {
    const cell = this.gridCellAt(r, c)
    cell.classList.add('weapon', 'active')
    this.addContrast(cell)

    if (extra) {
      cell.classList.add(extra)
    }
    if (turn) cell.classList.add(turn)
    cell.classList.remove('wake')
    this._clearCellText(cell)
  }

  /**
   * @param {number} r
   * @param {number} c
   */
  cellWeaponDeactivate (r, c) {
    const cell = this.gridCellAt(r, c)
    this.removeShadowWeapon(cell)
    deactivateWeapon(cell)
  }

  /**
   * @param {number} r
   * @param {number} c
   */
  cellHintDeactivate (r, c) {
    const cell = this.gridCellAt(r, c)
    deactivateTempHint(cell)
  }

  /**
   * @param {number} r
   * @param {number} c
   * @param {string} [damage]
   */
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
   * @param {Object} map
   * @param {number} r
   * @param {number} c
   * @param {Set<string>} container
   */
  surround (map, r, c, container) {
    const keys = SurroundingCellsHelper.asKeySet(map || bh.map, r, c)
    keys.forEach(key => container.add(key))
  }

  /**
   * @param {Object} map
   * @param {number} r
   * @param {number} c
   * @param {Object} container
   * @param {function(number, number): HTMLElement} maker
   */
  surroundObj (map, r, c, container, maker) {
    const obj = SurroundingCellsHelper.asObjectMap(map || bh.map, r, c, maker)
    Object.assign(container, obj)
  }

  /**
   * @param {Object} map
   * @param {number} r
   * @param {number} c
   * @param {Array<any>} container
   * @param {function(number, number): any} maker
   */
  surroundList (map, r, c, container, maker) {
    const list = SurroundingCellsHelper.asArray(map || bh.map, r, c, maker)
    container.push(...list)
  }

  /**
   * @param {Iterable<[number, number]>} cells
   * @returns {Set<string>}
   */
  cellSet (cells) {
    const result = new Set()
    for (const [r, c] of cells) {
      result.add(makeKey(r, c))
    }
    return result
  }

  /**
   * @param {Iterable<[number, number]>} cells
   * @returns {Set<string>}
   */
  hollowCells (cells) {
    return this.surroundCells(cells).difference(this.cellSet(cells))
  }

  /**
   * @param {Iterable<[number, number]>} cells
   * @returns {Set<string>}
   */
  surroundCells (cells) {
    const map = bh.map
    const surroundings = new Set()
    for (const [c, r] of cells) {
      this.surround(map, r, c, surroundings)
    }
    return surroundings
  }

  /**
   * @param {Iterable<HTMLElement>} cells
   * @param {Object} [container]
   * @returns {HTMLElement[]}
   */
  surroundCellElement (cells, container) {
    const map = bh.map
    const surroundings = container || {}
    for (const cell of cells) {
      const [r, c] = coordsFromCell(cell)
      this.surroundObj(map, r, c, surroundings, this.gridCellAt.bind(this))
    }
    return Object.values(surroundings)
  }

  /**
   * @param {Iterable<[number, number]>} cells
   * @param {Object} ship
   * @param {function(number, number): void} cellMiss
   * @param {function(number, number, Object): void} [display]
   */
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
    BoardConfigurator.resetBoardSize(this.board, map, cellSize)
  }

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
    this._forEachBoardCell(el => this.refreshColor(el))
  }

  /**
   * @param {HTMLElement} cell
   */
  refreshColor (cell) {
    const r = Number.parseInt(cell.dataset.r)
    const c = Number.parseInt(cell.dataset.c)
    this.uncolorCell(cell)
    this.colorizeCell(cell, r, c)
  }

  /**
   * @param {HTMLElement} cell
   */
  uncolorCell (cell) {
    const edgeClasses = Object.values(CellClassManager.CELL_CLASSES.edge)
    cell.classList.remove(...edgeClasses)
  }

  /**
   * @param {HTMLElement} cell
   * @param {number} r
   * @param {number} c
   */
  recolorCell (cell, r, c) {
    this.uncolorCell(cell)
    this.colorizeCell(cell, r, c)
  }

  /**
   * @param {HTMLElement} cell
   * @param {number} r
   * @param {number} c
   * @param {Object} [map]
   */
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
    cell.textContent = `${max - r}`
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
        if (onClickCell) {
          this.buildCell(r, c, onClickCell.bind(thisRef, r, c), map)
        } else {
          this.buildCell(r, c, null, map)
        }
      }
    }
  }

  removeHighlightAoE () {
    const tags = ['target', ...Object.values(bh.splashTags)]
    this._forEachBoardCell(el => el.classList.remove(...tags))
  }

  buildBoardHover (onEnter, onLeave, thisRef, weaponSource) {
    this._forEachBoardCell(el => {
      const [r, c] = coordsFromCell(el)
      el.addEventListener('mouseenter', onEnter.bind(null, weaponSource, r, c))
      el.addEventListener('mouseleave', onLeave.bind(thisRef, r, c))
    })
  }

  clearVisualsBase (details, classClear) {
    const clear = classClear || this.clearCell.bind(this)
    this._forEachBoardCell(el => this.clearCellVisuals(el, details, clear))
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
    this._forEachBoardCell(cell => deactivateWeapon(cell))
  }

  deactivateTempHints () {
    this._forEachBoardCell(cell => deactivateTempHint(cell))
  }
}

function deactivateWeapon (cell) {
  if (cell.classList.contains('contrast')) {
    cell.classList.remove(
      'active',
      'contrast',
      'turn2',
      'turn3',
      'turn4',
      ...bh.terrain.weapons.tags
    )
  } else {
    cell.classList.remove('active')
  }
}

function deactivateTempHint (cell) {
  cell.classList.remove('temp-hint')
}
