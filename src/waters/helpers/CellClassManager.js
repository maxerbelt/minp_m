/**
 * @typedef {Object} CellClassGroup
 * @property {string} [key] - Class names as string values
 */

/**
 * @typedef {Object} CellClassGroups
 * @property {CellClassGroup} display
 * @property {CellClassGroup} weapon
 * @property {CellClassGroup} damage
 * @property {CellClassGroup} placement
 * @property {CellClassGroup} edge
 * @property {CellClassGroup} hint
 */

/**
 * Manages CSS classes for grid cells in the game board.
 * Provides methods to clear specific groups of classes from cells and manage cell datasets.
 * Follows single responsibility principle by separating class clearing and dataset management.
 */
export class CellClassManager {
  /**
   * Static object containing all cell class definitions grouped by category.
   * @type {CellClassGroups}
   */
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

    orientation: {
      turn2: 'turn2',
      turn3: 'turn3',
      turn4: 'turn4'
    },
    placement: {
      empty: 'empty'
      //    launch: 'launch'
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
    },
    animation: {
      MARKER: 'marker',
      PORTAL: 'portal'
    }
  }

  /**
   * Clears specified groups of classes from a cell.
   * @param {HTMLElement} cell - The cell element to clear classes from.
   * @param {CellClassGroup[]} classGroups - Array of class group objects to clear.
   */
  static clearCellClasses (cell, classGroups) {
    const classesToRemove = classGroups.flatMap(group => Object.values(group))
    cell.classList.remove(...classesToRemove)
  }

  /**
   * Retrieves all class names from specified groups.
   * @param {CellClassGroup[]} classGroups - Array of class group objects.
   * @returns {string[]} Array of all class names.
   */
  static getAllClasses (classGroups) {
    return classGroups.flatMap(group => Object.values(group))
  }

  /**
   * Clears display and damage related classes from a cell.
   * @param {HTMLElement} cell - The cell element to clear.
   */
  static clearCell (cell) {
    this.clearCellClasses(cell, [
      this.CELL_CLASSES.display,
      this.CELL_CLASSES.damage
    ])
  }

  /**
   * Clears display related classes from a cell.
   * @param {HTMLElement} cell - The cell element to clear.
   */
  static clearDisplayCell (cell) {
    this.clearCellClasses(cell, [this.CELL_CLASSES.display])
  }

  /**
   * Clears display, damage, placement, and hint related classes from a cell.
   * @param {HTMLElement} cell - The cell element to clear.
   */
  static clearFriendCell (cell) {
    this.clearCellClasses(cell, [
      this.CELL_CLASSES.display,
      this.CELL_CLASSES.damage,
      this.CELL_CLASSES.placement,
      this.CELL_CLASSES.hint
    ])
  }

  /**
   * Clears weapon, damage, placement classes and weapon tags from a cell, and removes dataset attributes except 'r' and 'c'.
   * @param {HTMLElement} cell - The cell element to clear.
   */
  static clearPlaceCell (cell) {
    this.clearCellClasses(cell, [
      this.CELL_CLASSES.weapon,
      this.CELL_CLASSES.damage,
      this.CELL_CLASSES.placement,
      {} // Placeholder: will be populated from bh.terrain.weapons.tags
    ])

    this.#clearCellDataset(cell)
  }

  /**
   * Clears dataset attributes from a cell except for 'r' and 'c'.
   * @param {HTMLElement} cell - The cell element to clear dataset from.
   */
  static #clearCellDataset (cell) {
    for (const key in cell.dataset) {
      if (key !== 'r' && key !== 'c') delete cell.dataset[key]
    }
  }
}
