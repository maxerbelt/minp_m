import { Mask } from '../grid/rectangle/mask.js'

export class SubShape {
  constructor (validator, zoneDetail, subterrain) {
    this.validator = validator
    this.zoneDetail = zoneDetail
    this.subterrain = subterrain
    this.faction = 1
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
      this.board = board
    }
  }

  setCells (allCells, secondary) {
    // Create masks from all cells and secondary cells
    // setBoardFromSecond will handle the filtering by removing secondary from occupancy
    const occupancyBoard = Mask.fromCoordsSquare(allCells)
    const secondaryBoard =
      secondary.board || Mask.empty(occupancyBoard.width, occupancyBoard.height)
    this.setBoardFromSecondary(occupancyBoard, secondaryBoard)
  }
}
export class SpecialCells extends SubShape {
  constructor (cells, validator, zoneDetail, subterrain) {
    super(validator, zoneDetail, subterrain)
    this.board = Mask.fromCoordsSquare(cells)
  }
}
