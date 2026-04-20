/**
 * REFACTORING: Direction-based movement abstraction eliminates
 * four nearly-identical moveToNextTrayItem* methods
 */
export class DirectionMovement {
  static DIRECTIONS = {
    RIGHT: 'RIGHT',
    DOWN: 'DOWN',
    UP: 'UP',
    LEFT: 'LEFT'
  }

  static moveInDirection (direction, trays, itemIndex, trayIndex) {
    switch (direction) {
      case this.DIRECTIONS.RIGHT:
        return this.moveRight(trays, itemIndex, trayIndex)
      case this.DIRECTIONS.DOWN:
        return this.moveDown(trays, itemIndex, trayIndex)
      case this.DIRECTIONS.UP:
        return this.moveUp(trays, itemIndex, trayIndex)
      case this.DIRECTIONS.LEFT:
        return this.moveLeft(trays, itemIndex, trayIndex)
      default:
        return null
    }
  }

  static moveRight (trays, itemIndex, trayIndex) {
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
        if (indexT >= traysSize) indexT = 0
      } else {
        return tray.children[indexI]
      }
    } while (true) // eslint-disable-line no-constant-condition
  }

  static moveDown (trays, itemIndex, trayIndex) {
    let indexT = trayIndex
    const traysSize = trays.length

    do {
      indexT++
      if (indexT === trayIndex && itemIndex === 0) {
        return trays[trayIndex].children[itemIndex]
      }
      if (indexT >= traysSize) indexT = 0

      const tray = trays[indexT]
      if (tray.children.length > 0) return tray.children[0]
    } while (true) // eslint-disable-line no-constant-condition
  }

  static moveUp (trays, itemIndex, trayIndex) {
    let indexT = trayIndex
    const traysSize = trays.length

    do {
      indexT--
      if (indexT === trayIndex && itemIndex === 0) {
        return trays[trayIndex].children[itemIndex]
      }
      if (indexT < 0) indexT = traysSize - 1

      const tray = trays[indexT]
      if (tray.children.length > 0) return tray.children[0]
    } while (true) // eslint-disable-line no-constant-condition
  }

  static moveLeft (trays, itemIndex, trayIndex) {
    let indexT = trayIndex
    let indexI = itemIndex
    const traysSize = trays.length

    do {
      if (indexI > 0) {
        return trays[indexT].children[indexI - 1]
      } else {
        indexT--
        if (indexT < 0) indexT = traysSize - 1
        const tray = trays[indexT]
        const l = tray.children.length
        indexI = l
        if (indexT === trayIndex) return trays[trayIndex].children[itemIndex]
      }
    } while (true) // eslint-disable-line no-constant-condition
  }

  /**
   * REFACTORING: Simplified key-to-direction mapping
   */
  static fromArrowKey (arrowKey) {
    const keyMap = {
      ArrowRight: this.DIRECTIONS.RIGHT,
      ArrowDown: this.DIRECTIONS.DOWN,
      ArrowUp: this.DIRECTIONS.UP,
      ArrowLeft: this.DIRECTIONS.LEFT
    }
    return keyMap[arrowKey]
  }

  static getFirstItem (direction, trays) {
    const allItems = trays.flatMap(t => [...t.children])
    if (allItems.length === 0) return null

    return direction === this.DIRECTIONS.UP ||
      direction === this.DIRECTIONS.LEFT
      ? allItems[allItems.length - 1]
      : allItems[0]
  }
}
