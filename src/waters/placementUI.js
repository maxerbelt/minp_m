import { bh } from '../terrains/all/js/bh.js'
import { Terrain } from '../terrains/all/js/terrain.js'
import { WatersUI } from './WatersUI.js'
import { ClickedShip } from '../selection/selection.js'
import { cursor } from '../selection/cursor.js'
import { getShipIdFromElement, dragNDrop } from '../selection/dragndrop.js'
import { setCellCoords } from '../core/utilities.js'
import { gameStatus } from './StatusUI.js'
import { Mask } from '../grid/rectangle/mask.js'
import { Ship } from '../ships/Ship.js'
export class PlacementUI extends WatersUI {
  constructor (terroritory, title) {
    super(terroritory, title)
    this.placingShips = true
    this.readyingShips = false

    this.newPlacementBtn = document.getElementById('newPlacement')
    this.rotateBtn = document.getElementById('rotateBtn')
    this.rotateLeftBtn = document.getElementById('rotateLeftBtn')
    this.flipBtn = document.getElementById('flipBtn')
    this.transformBtn = document.getElementById('transformBtn')
    this.testBtn = document.getElementById('testBtn')
    this.seekBtn = document.getElementById('seekBtn')
    this.stopBtn = document.getElementById('stopBtn')
    this.undoBtn = document.getElementById('undoBtn')
    this.autoBtn = document.getElementById('autoBtn')
    this.trays = document.getElementById('tray-container')
    this.shipTray = document.getElementById('shipTray')
    this.planeTray = document.getElementById('planeTray')
    this.specialTray = document.getElementById('specialTray')
    this.brushTray = document.getElementById('brushTray')
    this.weaponTray = document.getElementById('weaponTray')
    this.buildingTray = document.getElementById('buildingTray')
    this.tips = []
    this.addText = ' added'
    this.removeText = ' removed'
    this.brushlistenCancellables = []
    this.placelistenCancellables = []
  }
  showStatus () {
    gameStatus.game.classList.remove('hidden')
    gameStatus.mode.classList.remove('hidden')
    gameStatus.line.classList.remove('hidden', 'small')
    gameStatus.line.classList.add('medium')
    gameStatus.clearQueue()
  }
  standardPanels () {
    const panels = document.getElementsByClassName('panel')
    for (const panel of panels) {
      panel.classList.remove('alt')
    }
  }
  hideTransformBtns () {
    this.rotateBtn.classList.add('hidden')
    this.rotateLeftBtn.classList.add('hidden')
    this.transformBtn.classList.add('hidden')
    this.flipBtn.classList.add('hidden')
    this.undoBtn.classList.add('hidden')
    this.autoBtn.classList.add('hidden')
  }

  showTransformBtns () {
    this.rotateBtn.classList.remove('hidden')
    this.rotateLeftBtn.classList.remove('hidden')
    if (bh.terrain.hasTransforms) {
      this.transformBtn.classList.remove('hidden')
    } else {
      this.transformBtn.classList.add('hidden')
    }
    this.flipBtn.classList.remove('hidden')
    this.undoBtn.classList.remove('hidden')
    this.autoBtn.classList.remove('hidden')
  }

  markPlaced (cells, ship) {
    this.displaySurround(
      cells,
      ship,
      (r, c) => {
        this.cellMiss(r, c)
        this.surroundShipCellAt(ship, r, c)
      },
      (c, r, ship) => this.cellPlacedAt(r, c, ship)
    )
  }

  makeDroppable (model) {
    for (const cell of this.board.children) {
      this.clearCellContent(cell)
      dragNDrop.drop(cell, model, this)
      dragNDrop.dragEnter(cell, model, this)
    }
  }
  makeAddDroppable (model) {
    dragNDrop.addWeaponDrop(model, this)
    for (const cell of this.board.children) {
      this.clearCellContent(cell)
      dragNDrop.addDrop(cell, model, this)
      dragNDrop.dragEnter(cell, model, this)
    }
  }
  makeBrushable () {
    for (const cell of this.board.children) {
      dragNDrop.dragBrushEnter(cell, this)
    }
  }
  removeDragShip (dragShip) {
    const container = dragShip.parentElement
    dragShip.remove()
    if (
      container.classList.contains('drag-ship-container') &&
      container.children.length === 0
    )
      container.remove()

    this.checkTrays()
  }

  removeHighlight () {
    for (const el of this.board.children) {
      el.classList.remove('good', 'notgood', 'bad', 'worse')
    }
  }

  removeClicked () {
    const elements = document.getElementsByClassName('clicked')
    ;[...elements].forEach(element => {
      // Perform actions on each element
      element.classList.remove('clicked')
    })

    this.rotateBtn.disabled = true
    this.flipBtn.disabled = true
  }
  lastItem (tray) {
    const items = tray.children
    const l = items.length
    if (l === 0) return null
    else return items[l - 1]
  }

  getFirstTrayItem () {
    return (
      this.shipTray.children[0] ||
      this.planeTray.children[0] ||
      this.specialTray.children[0] ||
      this.buildingTray.children[0] ||
      this.weaponTray.children[0]
    )
  }
  getFirstTrayItemBottomUp () {
    return (
      this.weaponTray.children[0] ||
      this.buildingTray.children[0] ||
      this.specialTray.children[0] ||
      this.planeTray.children[0] ||
      this.shipTray.children[0]
    )
  }
  clickAssignByCursor (arrowkey) {
    let shipnode = null
    switch (arrowkey) {
      case 'ArrowDown':
      case 'ArrowRight':
        shipnode = this.getFirstTrayItem()
        break
      case 'ArrowUp':
        shipnode = this.getFirstTrayItemBottomUp()
        break
      case 'ArrowLeft':
        shipnode =
          this.lastItem(this.weaponTray) ||
          this.lastItem(this.buildingTray) ||
          this.lastItem(this.specialTray) ||
          this.lastItem(this.planeTray) ||
          this.lastItem(this.shipTray)
        break
    }
    return shipnode
  }
  moveToNextTrayItemToTheRight (trays, itemIndex, trayIndex) {
    let indexT = trayIndex
    let indexI = itemIndex
    const traysSize = trays.length
    do {
      const tray = trays[indexT]
      const l = tray.children.length
      indexI++
      if (indexI >= l) {
        indexT++
        indexI = -1
        if (indexT === trayIndex) return trays[trayIndex].children[itemIndex]
        if (indexT >= traysSize) {
          indexT = 0
        }
      } else {
        return tray.children[indexI]
      }
      // eslint-disable-next-line no-constant-condition
    } while (true)
  }
  moveToNextTrayItemDown (trays, itemIndex, trayIndex) {
    let indexT = trayIndex
    const traysSize = trays.length
    do {
      indexT++
      if (indexT === trayIndex && 0 === itemIndex)
        return trays[trayIndex].children[itemIndex]
      if (indexT >= traysSize) {
        indexT = 0
      }

      const tray = trays[indexT]
      const l = tray.children.length
      if (l > 0) return tray.children[0]
      // eslint-disable-next-line no-constant-condition
    } while (true)
  }
  moveToNextTrayItemUp (trays, itemIndex, trayIndex) {
    let indexT = trayIndex
    const traysSize = trays.length
    do {
      indexT--
      if (indexT === trayIndex && 0 === itemIndex)
        return trays[trayIndex].children[itemIndex]
      if (indexT < 0) {
        indexT = traysSize - 1
      }

      const tray = trays[indexT]
      const l = tray.children.length
      if (l > 0) return tray.children[0]
      // eslint-disable-next-line no-constant-condition
    } while (true)
  }
  moveToNextTrayItemToTheLeft (trays, itemIndex, trayIndex) {
    let indexT = trayIndex
    let indexI = itemIndex
    const traysSize = trays.length
    do {
      if (indexI > 0) {
        return trays[indexT].children[indexI - 1]
      } else {
        indexT--
        if (indexT < 0) {
          indexT = traysSize - 1
        }
        const tray = trays[indexT]
        const l = tray.children.length
        indexI = l
        if (indexT === trayIndex) return trays[trayIndex].children[itemIndex]
      }
      // eslint-disable-next-line no-constant-condition
    } while (true)
  }
  moveNextTrayItem (arrowKey, trays, itemIndex, trayIndex) {
    switch (arrowKey) {
      case 'ArrowRight':
        return this.moveToNextTrayItemToTheRight(trays, itemIndex, trayIndex)
      case 'ArrowDown':
        return this.moveToNextTrayItemDown(trays, itemIndex, trayIndex)
      case 'ArrowUp':
        return this.moveToNextTrayItemUp(trays, itemIndex, trayIndex)
      case 'ArrowLeft':
        return this.moveToNextTrayItemToTheLeft(trays, itemIndex, trayIndex)
      default:
        return null
    }
  }
  getTrays () {
    return [
      this.shipTray,
      this.planeTray,
      this.specialTray,
      this.buildingTray,
      this.weaponTray
    ]
  }

  resetTrays () {
    let trays = this.getTrays()
    for (const tray of trays) {
      tray.innerHTML = ''
      tray.classList.add('empty')
    }
  }
  clearTrays () {
    let trays = this.getTrays()
    for (const tray of trays) {
      tray.innerHTML = ''
    }
  }
  setTrays () {
    let trays = this.getTrays()
    for (const tray of trays) {
      tray.innerHTML = ''
      tray.classList.remove('empty')
    }
  }
  showShipTrays () {
    let trays = this.getTrays()
    for (const tray of trays) {
      tray.innerHTML = ''
      tray.classList.remove('empty')
      tray.classList.remove('hidden')
    }
    if (this.brushTray) {
      this.brushTray.innerHTML = ''
      this.brushTray.classList.add('hidded')
    }
    this.trays.classList.remove('hidden')
  }
  hideShipTrays () {
    let trays = this.getTrays()
    for (const tray of trays) {
      tray.classList.add('hidden')
    }
    this.trays.classList.add('hidden')
  }
  showBrushTrays () {
    let trays = this.getTrays()
    for (const tray of trays) {
      tray.innerHTML = ''
      tray.classList.remove('empty')
      tray.classList.add('hidden')
    }
    this.brushTray.innerHTML = ''
    this.brushTray.classList.remove('hidded')

    this.trays.classList.remove('hidden')
  }
  forEachTrayItem (action) {
    let trays = this.getTrays()
    let itemIndex = 0
    let trayIndex = 0

    for (const tray of trays) {
      for (const child of tray.children) {
        action(child, trayIndex, itemIndex, trays)
        itemIndex++
      }
      trayIndex++
      itemIndex = 0
    }
    return null
  }

  getTrayItemInfo (shipId, adaptInfo) {
    let trays = this.getTrays()
    let itemIndex = 0
    let trayIndex = 0

    for (const tray of trays) {
      for (const child of tray.children) {
        const id = parseInt(child.dataset.id)
        if (id === shipId) {
          return adaptInfo(child, trayIndex, itemIndex, trays)
        }
        itemIndex++
      }
      trayIndex++
      itemIndex = 0
    }
    return null
  }

  getTrayItem (shipId) {
    const adaptInfo = (child /* , trayIndex, itemIndex, trays */) => {
      return child
    }
    return this.getTrayItemInfo(shipId, adaptInfo)
  }

  moveAssignByCursor (arrowKey, clickedShip) {
    let shipnode = clickedShip.source

    const shipId = parseInt(shipnode.dataset.id)
    if (shipId === null || shipnode === null) return null

    const adaptInfo = (child, trayIndex, itemIndex, trays) => {
      return this.moveNextTrayItem(arrowKey, trays, itemIndex, trayIndex)
    }

    return this.getTrayItemInfo(shipId, adaptInfo)
  }

  assignByCursor (arrowkey, ships) {
    let shipElement = null
    const clicked = dragNDrop.getClickedShip()
    if (clicked) shipElement = this.moveAssignByCursor(arrowkey, clicked)
    else shipElement = this.clickAssignByCursor(arrowkey)

    if (shipElement === null) return

    const shipId = getShipIdFromElement(shipElement)
    const ship = ships.find(s => s.id === shipId)
    if (ship && shipElement) this.assignClicked(ship, shipElement)
  }

  disableRotateFlip () {
    this.rotateBtn.disabled = true
    this.rotateLeftBtn.disabled = true
    this.flipBtn.disabled = true
  }
  assignClicked (ship, clicked) {
    const variantIndex = Number.parseInt(clicked.dataset.variant)
    this.removeClicked()
    const shape = ship.shape()
    this.showNotice(shape.tip)
    const clickedShip = new ClickedShip(
      ship,
      clicked,
      variantIndex,
      this.setDragShipContents.bind(this)
    )
    dragNDrop.setClickedShip(clickedShip)
    clicked.classList.add('clicked')
    this.rotateBtn.disabled = !clickedShip.canRotate()
    this.flipBtn.disabled = !clickedShip.canFlip()
    this.rotateLeftBtn.disabled = !clickedShip.canRotate()
    this.transformBtn.disabled = !clickedShip.canTransform()
  }
  assignClickedWeapon (weapon, clicked) {
    this.removeClicked()
    this.showNotice(weapon.tip)

    dragNDrop.setClickedShip(null)
    clicked.classList.add('clicked')
    this.rotateBtn.disabled = true
    this.flipBtn.disabled = true
    this.rotateLeftBtn.disabled = true
  }

  setDragShipContents (dragShip, board, letter) {
    const maxR = board.height
    const maxC = board.width

    dragShip.setAttribute(
      'style',
      `display:grid;place-items: center;--boxSize:${this.cellSizeString()};grid-template-rows:repeat(${maxR}, var(--boxSize));grid-template-columns:repeat(${maxC}, var(--boxSize));gap:0px;`
    )
    for (const [c, r] of board.cells()) {
      const color = board.at(c, r)
      this.createDragShipCell(dragShip, letter, r, c, color)
    }
  }
  setSplashContents (dragShip, cells) {
    const maxR = Math.max(...cells.map(s => s[0])) + 1
    const maxC = Math.max(...cells.map(s => s[1])) + 1
    const minR = Math.min(...cells.map(s => s[0]))
    const minC = Math.min(...cells.map(s => s[1]))

    dragShip.setAttribute(
      'style',
      `display:grid;place-items: center;--boxSize:${this.cellSizeString()};grid-template-rows:repeat(${
        maxR - minR
      }, var(--boxSize));grid-template-columns:repeat(${
        maxC - minC
      }, var(--boxSize));gap:0px;`
    )
    for (let r = minR; r < maxR; r++) {
      for (let c = minC; c < maxC; c++) {
        this.createSplashCell(dragShip, cells, r, c)
      }
    }
  }

  setBrushContents (brush, size, subterrain) {
    brush.setAttribute(
      'style',
      `display:grid;place-items: center;--boxSize:${
        this.cellSize().toString() + 'px'
      };grid-template-rows:repeat(${size}, var(--boxSize));grid-template-columns:repeat(${size}, var(--boxSize));gap:0px;`
    )
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        this.appendBrushCell(brush, r, c, subterrain.lightColor, subterrain.tag)
      }
    }
  }
  createDragShipCell (dragShip, letter, r, c, color) {
    const maps = bh.maps

    if (color > 0) {
      this.appendCell(
        dragShip,
        r,
        c,
        maps.shipColors[letter],
        maps.shipLetterColors[letter],
        letter,
        color > 1
      )
    } else {
      this.appendEmptyCell(dragShip, r, c)
    }
  }

  createSplashCell (dragShip, cells, r, c) {
    const cell = cells.find(cell => cell[0] === r && cell[1] === c)
    if (cell && cell[2] >= 0) {
      this.appendSplashCell(dragShip, cell[2])
    } else {
      this.appendEmptyCell(dragShip, r, c)
    }
  }

  makeCell (r, c) {
    const cell = document.createElement('div')
    cell.className = 'cell'
    setCellCoords(cell, r, c)
    return cell
  }
  appendEmptyCell (dragItem, r, c) {
    const cell = this.makeCell(r, c)
    cell.classList.add('empty')
    dragItem.appendChild(cell)
  }
  appendBrushCell (dragItem, r, c, bg, tag) {
    const cell = this.makeCell(r, c)

    const checker = (r + c) % 2 === 0
    cell.classList.add(checker ? 'light' : 'dark')
    if (tag) {
      cell.classList.add(tag)
    } else {
      cell.style.background = bg || 'rgba(255, 209, 102, 0.3)'
    }
    dragItem.appendChild(cell)
  }
  appendCell (dragItem, r0, c0, bg, fg, letter, isSpecial) {
    const cell = this.makeCell()

    cell.style.background = bg || 'rgba(255, 209, 102, 0.3)'
    if (letter) cell.style.color = fg || '#ffd166'
    if (isSpecial) {
      cell.classList.add('special')
    } else {
      cell.textContent = letter
    }
    dragItem.appendChild(cell)
  }

  appendSplashCell (dragItem, power) {
    const cell = this.makeCell()
    cell.classList.add(bh.spashTags[power])
    dragItem.appendChild(cell)
  }

  displayAsPlaced (cell, ship, r, c) {
    this.visibleShipCell(ship, r, c, cell)
    this.clearCell(cell)
    cell.classList.add('placed')
  }

  cellPlacedAt (r, c, ship) {
    const cell = this.gridCellAt(r, c)
    this.displayAsPlaced(cell, ship, r, c)
  }

  buildTrayItemPrint (shipInfo, tray) {
    const shape = shipInfo.shape
    if (shape.canTransform && shape.forms && shape.forms.length > 1) {
      for (const [index, form] of shape.forms.entries()) {
        this.addtrayitem(form, index === 0 ? shipInfo.count : 1, tray)
      }
    } else {
      this.addtrayitem(shape, shipInfo.count, tray)
    }
  }

  buildSplashLegend (cells, weapon, legend) {
    const tray = document.getElementById('splash-legend-' + weapon.tag)
    if (!tray) return
    tray.classList.remove('hidden')
    let powerList = {}

    for (const cell of cells) {
      const power = cell[2]
      if (power >= 0) powerList[power] = [0, 0, power]
    }

    const splashCol = document.createElement('div')
    splashCol.className = 'splash-col'
    for (const [key] of Object.entries(powerList)) {
      const dragShipContainer = document.createElement('div')

      dragShipContainer.className = 'splash-container'
      const dragShip = document.createElement('div')
      dragShip.className = 'splash-cells'
      dragShip.setAttribute(
        'style',
        `display:grid;place-items: center;--boxSize:${this.cellSizeString()};grid-template-rows:repeat(1, var(--boxSize));grid-template-columns:repeat(1, var(--boxSize));gap:0px;`
      )
      this.appendSplashCell(dragShip, key)
      dragShipContainer.appendChild(dragShip)
      const label = document.createElement('div')
      label.textContent = legend[key]

      dragShipContainer.appendChild(label)
      splashCol.appendChild(dragShipContainer)
    }

    tray.appendChild(splashCol)
  }

  addtrayitem (shape, count, tray) {
    const dragShipContainer = document.createElement('div')

    dragShipContainer.className = 'drag-ship-container'

    const dragShip = document.createElement('div')
    dragShip.className = 'drag-ship'
    this.setDragShipContents(dragShip, shape.board, shape.letter)
    dragShipContainer.appendChild(dragShip)

    const label = document.createElement('div')
    label.textContent =
      shape.descriptionText + (count === 1 ? '' : ` x ${count}`)

    dragShipContainer.appendChild(label)
    tray.appendChild(dragShipContainer)
  }

  buildWeaponsSplashPrint (cells, weapon) {
    const tray = document.getElementById('splash-map-' + weapon.tag)
    if (!tray) return
    tray.classList.remove('hidden')
    const dragShipContainer = document.createElement('div')

    dragShipContainer.className = 'drag-ship-container'

    const dragShip = document.createElement('div')
    dragShip.className = 'drag-ship'
    this.setSplashContents(dragShip, cells)
    dragShipContainer.appendChild(dragShip)
    tray.appendChild(dragShipContainer)
  }

  buildDragShip (ships, ship, container, cellHeight) {
    const shape = ship.shape()
    const dragShip = document.createElement('div')
    dragShip.className = 'drag-ship'
    const { index, board } = shape.infoShrunkUnder(cellHeight)
    dragShip.dataset.variant = index
    dragShip.dataset.type = 'ship'
    dragShip.dataset.id = ship.id
    this.setDragShipContents(dragShip, board, shape.letter)
    dragNDrop.makeDraggable(this, dragShip, ships)
    container.appendChild(dragShip)
  }

  buildDragWeapon (weapon, container) {
    const cells = weapon.dragShape.map(([r, c, value]) => [r, c, value + 1])
    const board = Mask.fromCoordsInv(cells)
    const dragShip = document.createElement('div')
    dragShip.className = 'drag-ship'
    dragShip.dataset.letter = weapon.letter
    dragShip.dataset.type = 'weapon'

    this.setDragShipContents(dragShip, board, weapon.letter)
    dragNDrop.makeDraggable(this, dragShip, null, weapon)
    container.appendChild(dragShip)
  }

  buildTrayItem (ships, ship, tray, cellHeight) {
    const dragShipContainer = document.createElement('div')

    dragShipContainer.className = 'drag-ship-container'
    dragShipContainer.dataset.id = ship.id
    tray.dataset.cellHeight = cellHeight
    this.buildDragShip(ships, ship, dragShipContainer, cellHeight)

    tray.appendChild(dragShipContainer)
    tray.classList.remove('empty')
  }
  buildTrayItemWeapon (weapon, tray) {
    const dragShipContainer = document.createElement('div')

    dragShipContainer.className = 'drag-ship-container'
    dragShipContainer.dataset.letter = weapon.letter

    this.buildDragWeapon(weapon, dragShipContainer)

    tray.appendChild(dragShipContainer)
    tray.classList.remove('empty')
  }
  buildBrush (size, subterrain, tray) {
    const brushContainer = document.createElement('div')
    const id = subterrain.letter + size.toString()

    brushContainer.className = 'drag-brush-container'
    brushContainer.dataset.id = id
    brushContainer.setAttribute(
      'style',
      'display: flex;justify-content: center;align-items: center;'
    )
    const brush = document.createElement('div')
    brush.className = 'drag-brush'
    brush.dataset.size = size
    brush.dataset.id = subterrain + size.toString()
    this.setBrushContents(brush, size, subterrain)
    dragNDrop.makeBrushDraggable(brush, size, subterrain)
    brushContainer.appendChild(brush)
    tray.appendChild(brushContainer)
  }
  buildBrushTray (terrain) {
    this.brushTray.innerHTML = ''
    for (let i = 1; i < 4; i++) {
      for (const subterrain of terrain.subterrains) {
        this.buildBrush(i, subterrain, this.brushTray)
      }
    }
  }
  checkTrays () {
    const trays = this.getTrays()
    for (const tray of trays) {
      if (tray.children.length === 0) {
        tray.classList.add('empty')
      } else {
        tray.classList.remove('empty')
      }
    }
  }
  buildTrays (ships) {
    const groups = partitionBy(ships, s => s.type())

    for (const type in groups) {
      const tray = this.getTrayOfType(type)
      tray.classList.remove('hidden')
      const group = groups[type]
      const height = Ship.maxMinSizeIn(group)
      for (const ship of group) {
        this.buildTrayItem(ships, ship, tray, height)
      }
    }
    this.checkTrays()
  }
  buildWeaponTray () {
    const thisTerrain = bh.terrain
    const weapons = thisTerrain.weapons.weapons
    if (thisTerrain.hasUnattachedWeapons) {
      for (const weapon of weapons) {
        this.buildTrayItemWeapon(weapon, this.weaponTray)
      }
    }
  }
  getUnitType (ship) {
    const type = ship.type()
    if (type === 'M' || type === 'T') return 'X'

    return type
  }

  getTrayOfType (type) {
    switch (type) {
      case 'A':
        return this.planeTray
      case 'S':
        return this.shipTray
      case 'M':
      case 'T':
      case 'X':
        return this.specialTray
      case 'G':
        return this.buildingTray
      case 'W':
        return this.weaponTray

      default:
        throw new Error('Unknown type for ' + type)
    }
  }

  getNotesOfType (type) {
    switch (type) {
      case 'A':
        return document.getElementById('planeNotes')
      case 'S':
        return document.getElementById('shipNotes')
      case 'M':
      case 'T':
      case 'X':
        return document.getElementById('specialNotes')
      case 'G':
        return document.getElementById('buildingNotes')
      default:
        throw new Error('Unknown type for ' + type)
    }
  }

  addToGroup (group, ship) {
    const key = ship.letter
    let value = group[key] || { shape: ship.shape(), count: 0 }
    value.count++
    group[key] = value
  }

  splitUnits (ships) {
    return ships.reduce((acc, ship) => {
      const key = this.getUnitType(ship)
      const group = acc[key] || {}
      this.addToGroup(group, ship)
      acc[key] = group
      return acc
    }, {})
  }

  hideEmptyUnits (ships) {
    const counts = ships.reduce((acc, ship) => {
      const letter = this.getUnitType(ship)
      acc[letter] = (acc[letter] || 0) + 1
      return acc
    }, {})

    Terrain.showsUnits('-container', letter => {
      return counts[letter]
    })
  }

  addShipToTrays (ships, ship) {
    const type = ship.type()
    if (type) {
      this.buildTrayItem(ships, ship, this.getTrayOfType(type))
    } else {
      throw new Error('Unknown type for ship ' + ship.letter)
    }
  }

  placeShipBox (ship) {
    const box = document.createElement('div')
    box.className = 'tally-box'
    const letter = ship.letter
    if (ship.cells.length === 0) {
      box.textContent = ''
    } else {
      box.textContent = letter
    }
    this.setShipCellColors(box, letter)
    return box
  }

  placeTally (ships) {
    this.score.buildShipTally(ships, this.placeShipBox.bind(this))
    // no bombs row
  }

  placement (placed, model, ship) {
    this.showNotice(ship.getDescription() + this.addText)
    this.markPlaced(placed, ship)
    this.score.buildTallyFromModel(model, this)
    this.displayShipInfo(model.ships)
  }

  displayShipTrackingInfo (model) {
    this.score.buildTallyFromModel(model, this)
    this.displayAddInfo(model)
    this.score.displayAddZoneInfo(model)
  }
  addition (placed, model, ship) {
    this.showNotice(ship.getDescription() + this.addText)
    this.markPlaced(placed, ship)

    model.ships.push(ship)
    const map = bh.map
    const newShip = ship.clone()
    const id = newShip.id
    map.addShips(model.ships)
    const index = model.candidateShips.findIndex(s => s.id === ship.id)
    model.candidateShips[index] = newShip

    model.armWeapons(map)
    return id
  }

  subtraction (model, ship) {
    this.showNotice(ship.getDescription() + this.removeText)
    const indexToRemove = model.ships.findIndex(s => s.id === ship.id)
    if (indexToRemove >= 0) model.ships.splice(indexToRemove, 1)
    model.armWeapons(bh.map)
    this.score.buildTallyFromModel(model, this)
    this.displayAddInfo(model)
    this.score.displayAddZoneInfo(model)
  }

  unplacement (model, ship) {
    this.showNotice(ship.getDescription() + this.removeText)
    this.score.buildTallyFromModel(model, this)
    this.displayShipInfo(model.ships)
  }

  displayAddInfo (model) {
    if (!model.ships) return
    this.publishBtn.disabled = model.hasPlayableShips()
    this.saveBtn.disabled = model.hasFewShips()
    this.score.placed.textContent = model.ships.length.toString()
    this.score.weaponsPlaced.textContent = model.loadOut.getAmmoCapacity()
  }
  noOfShips () {
    return this.ships.length
  }
  noOfPlacedShips (ships = this.ships) {
    return ships.filter(s => s.placed).length
  }
  displayShipInfo (ships = this.ships) {
    if (!ships) return
    const total = ships.length
    const placed = this.noOfPlacedShips(ships)
    this.score.placed.textContent = `${placed} / ${total}`

    if (
      total === placed &&
      this.placingShips &&
      this.gotoNextStageAfterPlacement
    ) {
      this.gotoNextStageAfterPlacement()
    }
  }
  reset (ships) {
    this.board.innerHTML = ''
    this.clearTrays()
    this.displayShipInfo(ships)
  }
  resetAdd (model) {
    this.board.innerHTML = ''
    this.clearTrays()
    model.armWeapons()
    this.displayAddInfo(model)
  }
}

function moveGridCursor (event, shipCellGrid, viewModel) {
  event.preventDefault()
  const map = bh.map
  switch (event.key) {
    case 'ArrowUp':
      cursor.x--
      if (cursor.x < 0) cursor.x = map.rows - 1
      dragNDrop.highlight(viewModel, shipCellGrid, cursor.x, cursor.y)
      break
    case 'ArrowDown':
      cursor.x++
      if (cursor.x >= map.rows) cursor.x = 0
      dragNDrop.highlight(viewModel, shipCellGrid, cursor.x, cursor.y)
      break
    case 'ArrowLeft':
      cursor.y--
      if (cursor.y < 0) cursor.y = map.cols - 1
      dragNDrop.highlight(viewModel, shipCellGrid, cursor.x, cursor.y)
      break
    case 'ArrowRight':
      cursor.y++
      if (cursor.y >= map.cols) cursor.y = 0
      dragNDrop.highlight(viewModel, shipCellGrid, cursor.x, cursor.y)
      break
  }
}

export function moveCursorBase (event, viewModel, model) {
  if (!viewModel.placingShips || cursor.isDragging) return

  event.preventDefault()
  if (cursor.isGrid) {
    moveGridCursor(event, model.shipCellGrid, viewModel)
  } else {
    viewModel.assignByCursor(event.key, model.ships)
  }
}
function partitionBy (arr, propgetter) {
  return arr.reduce((acc, item) => {
    const key = propgetter(item)
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})
}
