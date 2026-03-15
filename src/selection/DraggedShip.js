import { Ghost } from './Ghost.js'
import { SelectedShip } from './SelectedShip.js'
import { placedShipsInstance } from './PlacedShips.js'

export class DraggedShip extends SelectedShip {
  constructor (
    ship,
    offsetX,
    offsetY,
    cellSize,
    source,
    variantIndex,
    contentBuilder
  ) {
    super(ship, variantIndex, contentBuilder)
    const row = Math.floor(offsetY / cellSize)
    const col = Math.floor(offsetX / cellSize)
    this.source = source
    this.cursor = [row, col]
    this.offset = [offsetX, offsetY]
    this.ghost = new Ghost(super.board(), ship.letter, contentBuilder)
    this.shown = true
  }
  isNotShown () {
    return !this.shown
  }
  hide () {
    this.shown = false
    this.ghost?.hide()
  }
  show () {
    this.shown = true
    this.ghost?.show()
  }
  remove () {
    this.ghost?.remove()
    this.ghost = null
  }
  moveTo (x, y) {
    this.ghost?.moveTo(x, y)
  }
  move (e) {
    this.moveTo(
      e.clientX - this.offset[0] - 13,
      e.clientY - this.offset[1] - 13
    )
  }

  setGhostVariant () {
    this.ghost?.setVariant(this.board())
  }

  rotate () {
    this.resetOffset()
    super.rotate()
    this.setGhostVariant()
  }
  resetOffset () {
    this.offset = [0, 0]
    this.cursor = [0, 0]
  }
  leftRotate () {
    this.resetOffset()
    super.leftRotate()
    this.setGhostVariant()
  }
  flip () {
    this.resetOffset()
    super.flip()
    this.setGhostVariant()
  }
  canPlaceRaw (r, c, shipCellGrid) {
    const placeable = this.placeable()
    if (this.ghost) {
      // && placeable.inAllBounds(r, c))
      return placeable.canPlace(r, c, shipCellGrid)
    }
    return false
  }

  addPlaceableToShipCells (placeable, r, c, shipCellGrid) {
    this.ship.placeVariant(placeable, r, c)
    this.ship.addToGrid(shipCellGrid)
    return this.ship.cells
  }
  addCurrentToShipCells (r, c, shipCellGrid) {
    return this.addPlaceableToShipCells(this.placeable(), r, c, shipCellGrid)
  }
  offsetCell (r, c) {
    const r0 = r - this.cursor[0]
    const c0 = c - this.cursor[1]
    return [r0, c0]
  }
  canPlace (r, c, shipCellGrid) {
    const r0 = r - this.cursor[0]
    const c0 = c - this.cursor[1]
    return this.canPlaceRaw(r0, c0, shipCellGrid)
  }
  placeCells (r, c, shipCellGrid) {
    const r0 = r - this.cursor[0]
    const c0 = c - this.cursor[1]
    if (this.canPlaceRaw(r0, c0, shipCellGrid)) {
      return this.addCurrentToShipCells(r0, c0, shipCellGrid)
    }
    return null
  }
  place (r, c, shipCellGrid) {
    const placed = this.placeCells(r, c, shipCellGrid)
    if (placed) {
      return placedShipsInstance.push(this.ship, placed)
    }
    return null
  }
}
