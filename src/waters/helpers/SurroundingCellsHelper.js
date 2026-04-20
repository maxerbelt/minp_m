import { makeKey } from '../../core/utilities.js'

/**
 * REFACTORING: Extract surrounding cells logic to reduce duplication
 * across surround, surroundObj, surroundList methods
 */
export class SurroundingCellsHelper {
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
