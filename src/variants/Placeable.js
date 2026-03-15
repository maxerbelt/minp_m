import { CellsToBePlaced } from './CellsToBePlaced.js'
import { placingTarget } from './makeCell3.js'
import { Mask } from '../grid/mask.js'
export class Placeable {
  constructor (board, validator, zoneDetail, target) {
    this.board = board.clone.shrinkToOccupied()
    this.validator = validator
    this.zoneDetail = zoneDetail || 0
    this.target = target || placingTarget
  }
  get cells () {
    return this.board.toCoords
  }
  set cells (cells) {
    this.board = Mask.fromCoords(cells)
  }
  height () {
    return this.board.height
  }
  width () {
    return this.board.width
  }

  placeAt (row, col) {
    return new CellsToBePlaced(
      this.board,
      row,
      col,
      this.validator,
      this.zoneDetail,
      this.target
    )
  }

  inAllBounds (r, c) {
    try {
      const h = this.height()
      const w = this.width()
      return this.target.allBoundsChecker(r, c, h, w)
    } catch (error) {
      console.error(
        'An error occurred checking : ',
        JSON.stringify(this.cells),
        error.message
      )
      return false
    }
  }

  canPlace (r, c, shipCellGrid) {
    const placing = this.placeAt(r, c)
    return placing.canPlace(shipCellGrid)
  }
}
