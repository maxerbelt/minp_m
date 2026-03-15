import { Mask } from '../grid/mask.js'

export class SubShape {
  constructor (validator, zoneDetail, subterrain) {
    this.validator = validator
    this.zoneDetail = zoneDetail
    this.subterrain = subterrain
    this.faction = 1
  }
  get cells () {
    return this._cellsArray || this.board.toCoords
  }
  set cells (cells) {
    this._cellsArray = cells
    this.setBoard(Mask.fromCoordsSquare(cells))
  }
  setBoard (board) {
    this.board = board
    this.size = board.width
  }
  resetBoard () {
    this._cellsArray = []
    this.board = Mask.empty(0, 0)
    this.size = 0
  }
  clone () {
    return new SubShape(this.validator, this.zoneDetail, this.subterrain)
  }
}

export class StandardCells extends SubShape {
  constructor (validator, zoneDetail, subterrain) {
    super(validator, zoneDetail, subterrain)
    this.board = Mask.empty(0, 0)
    this.size = 0
  }

  // Override cells getter to always return from board, not from _cellsArray
  get cells () {
    return this.board.toCoords
  }

  setBoardFromSecondary (occupancyBoard, secondaryBoard) {
    // Handle both one-argument and two-argument cases
    if (secondaryBoard == null) {
      // Called from parent cells setter or directly with just occupancyBoard
      this.board = occupancyBoard
      this.size = occupancyBoard.width
    } else {
      // Called with both occupancy and secondary boards
      // Expand secondary board to match occupancy board dimensions if needed
      const expandedSecondary =
        secondaryBoard.width === occupancyBoard.width &&
        secondaryBoard.height === occupancyBoard.height
          ? secondaryBoard
          : secondaryBoard.expand(occupancyBoard.width, occupancyBoard.height)
      const board = occupancyBoard.take(expandedSecondary)
      this.setBoard(board)
    }
  }

  setBoardFromSpecials (occupancyBoard, secondaryBoards) {
    const board = occupancyBoard.takeManyMask(secondaryBoards)
    this.setBoard(board)
  }

  setCells (allCells, secondary) {
    // Create masks from all cells and secondary cells
    // setBoardFromSecond will handle the filtering by removing secondary from occupancy
    const occupancyBoard = Mask.fromCoordsSquare(allCells)
    const secondaryBoard = Mask.fromCoordsSquare(secondary.cells)
    this.setBoardFromSecondary(occupancyBoard, secondaryBoard)
  }
}
export class SpecialCells extends SubShape {
  constructor (cells, validator, zoneDetail, subterrain) {
    super(validator, zoneDetail, subterrain)
    this.cells = cells
  }
}
