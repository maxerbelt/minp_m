/**
 * Unified cell class manipulation to eliminate
 * duplicate class removal logic across clearCell, clearFriendCell, clearPlaceCell
 */
export class CellClassManager {
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
  static clearDisplayCell (cell) {
    this.clearCellClasses(cell, [this.CELL_CLASSES.display])
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
