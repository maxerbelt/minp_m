import { placingTarget } from './makeCell3.js'

export class CellsToBePlaced {
  constructor (board, r0, c0, validator, zoneDetail, target) {
    board = board.embed(r0, c0)
    this.board = board
    this.notGood = board.emptyMask
    this.validator = validator
    this.zoneDetail = zoneDetail || 0
    this.target = target || placingTarget
  }
  get cells () {
    return this.board.toCoords
  }
  displacedArea (width, height) {
    return this.board.dilateExpand(1, 0).toMask(width, height)
  }
  isCandidate (r, c) {
    return this.board.at(r, c) > 0
  }
  zoneInfo (r, c, zoneDetail) {
    return this.target.getZone(r, c, zoneDetail || this.zoneDetail)
  }
  isInMatchingZone (r, c) {
    const zoneInfo = this.zoneInfo(r, c)
    return this.validator(zoneInfo)
  }

  noTouch (r, c, shipCellGrid) {
    for (let nr = r - 1; nr <= r + 1; nr++)
      for (let nc = c - 1; nc <= c + 1; nc++) {
        if (this.target.boundsChecker(nr, nc) && shipCellGrid[nr][nc] !== null)
          return false
      }
    return true
  }
  isWrongZone () {
    for (const [c, r] of this.board.locations()) {
      if (this.isInMatchingZone(r, c) === false) {
        return true
      }
    }
    return false
  }

  isNotInBounds () {
    for (const [c, r] of this.board.locations()) {
      if (!this.target.boundsChecker(r, c)) {
        return true
      }
    }
    return false
  }
  isOverlapping (shipCellGrid) {
    for (const [c, r] of this.board.locations()) {
      if (shipCellGrid[r][c] !== null) {
        return true
      }
    }
    return false
  }
  isTouching (shipCellGrid) {
    for (const [c, r] of this.board.locations()) {
      if (this.noTouch(r, c, shipCellGrid) === false) {
        return true
      }
    }
    return false
  }
  canPlace (shipCellGrid) {
    if (this.isNotInBounds()) {
      // console.log('out of bounds')
      return false
    }
    if (this.isWrongZone()) {
      //  console.log('wrong Zone')
      return false
    }

    if (this.isOverlapping(shipCellGrid)) {
      //  console.log('overlapping')
      return false
    }
    if (this.isTouching(shipCellGrid)) {
      //  console.log('touching')
      return false
    }
    // console.log('good')
    return true
  }
}
