import { bh } from '../../terrains/all/js/bh.js'

/**
 * @typedef {Object.<string, string>} CellClassGroup
 * Represents a group of related CSS class definitions, where keys are semantic property names
 * and values are the actual CSS class names.
 */

/**
 * @typedef {Object} CellClassGroups
 * @property {CellClassGroup} display - Visual state indicators (hit, miss, etc.)
 * @property {CellClassGroup} weapon - Weapon placement and state
 * @property {CellClassGroup} damage - Damage indicators (burnt, damaged, etc.)
 * @property {CellClassGroup} placement - Ship placement states
 * @property {CellClassGroup} edge - Board edge and terrain types
 * @property {CellClassGroup} hint - User hint indicators
 * @property {CellClassGroup} orientation - Rotation states
 * @property {CellClassGroup} animation - Animated state indicators
 */
const DEFAULT_CELL_CLEAN_CLASSES = [
  'semi',
  'semi-miss',
  'wake',
  'weapon',
  'portal',
  'marker',
  'turn2',
  'turn3',
  'turn4',
  'empty',
  'active'
]
/**
 * Manages CSS classes for grid cells in the game board.
 *
 * Responsibilities:
 * - Maintain centralized registry of all CSS classes used in cells
 * - Provide methods to clear specific groups of classes from cells
 * - Manage cell dataset attributes
 * - Check for class presence in cells
 *
 * Design: Single static class with grouped class constants prevents instantiation,
 * reduces memory overhead, and ensures consistent class definitions across the application.
 */
export class CellClassManager {
  /**
   * Dataset keys that should be preserved when clearing a cell's dataset.
   * 'r' = row index, 'c' = column index
   * @type {Set<string>}
   * @private
   */
  static #PRESERVED_DATASET_KEYS = new Set(['r', 'c'])

  /**
   * Registry of all cell CSS classes, organized by category for maintainability.
   * Each group can be independently cleared or checked.
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
   * Gets weapon CSS class tags defined in current terrain configuration.
   * Returns empty array if terrain not yet loaded.
   *
   * @returns {string[]} Array of weapon-related CSS class names
   */
  static #weaponTags () {
    return bh.terrain?.weapons?.tags || []
  }

  /**
   * Gets weapon cursor CSS class tags defined in current terrain configuration.
   * Returns empty array if terrain not yet loaded.
   *
   * @returns {string[]} Array of cursor-related CSS class names
   */
  static #cursorTags () {
    return bh.terrain?.weapons?.cursors || []
  }
  /**
   * Resets hit cell state by removing transient visual indicators.
   * Clears weapon, cursor, and temporary animation classes.
   *
   * @param {HTMLElement} cell - DOM element to reset
   * @returns {void}
   */
  static resetHitCellState (cell) {
    this.#removeClassesFromCell(cell, this.#hitCleanupClasses())
    this.#removeClassesFromCell(cell, this.#cursorTags())
  }
  static applyFriendlyHitCellState (cell, damageType) {
    CellClassManager.resetHitCellState(cell)
    cell.classList.add('frd-hit')
    if (damageType) {
      cell.classList.add(damageType)
    }
  }
  static applyEnemyHitCellState (cell, damageType) {
    this.#removeClassesFromCell(cell, this.#hitCleanupClasses())
    cell.classList.add('hit')
    if (damageType) {
      cell.classList.add(damageType)
    }
  }

  static applyFriendlySunkCellState (cell) {
    CellClassManager.clearDisplayCell(cell)
    CellClassManager.resetHitCellState(cell)
    cell.classList.add('frd-sunk')
  }
  static applyEnemySunkCellState (cell) {
    CellClassManager.clearDisplayCell(cell)
    CellClassManager.resetHitCellState(cell)
    cell.classList.add('enm-sunk')
  }
  applySemiRevealState (cell) {
    if (this.hasAny(cell, ['placed', 'miss', 'hit'])) {
      return false
    }
    cell.classList.add('semi')
    cell.classList.remove('wake')
    return true
  }

  applyHintState (cell) {
    if (this.hasAny(cell, ['placed', 'miss', 'hit', 'semi'])) {
      return false
    }
    cell.classList.add('hint')
    cell.classList.remove('wake', 'temp-hint')
    return true
  }
  /**
   * Clears specified class groups from a cell element.
   * Filters out empty group objects to handle edge cases.
   *
   * @param {HTMLElement} cell - The cell element to clear classes from
   * @param {CellClassGroup[]} classGroups - Array of class group objects to remove from cell
   * @returns {void}
   */
  static clearCellClasses (cell, classGroups) {
    const classesToRemove = classGroups
      .filter(group => Object.keys(group).length > 0)
      .flatMap(group => Object.values(group))

    cell.classList.remove(...classesToRemove)
  }

  /**
   * Checks if a cell contains any class from a specific class group.
   *
   * @param {HTMLElement} cell - The cell element to check
   * @param {CellClassGroup} classGroup - The class group to check against
   * @returns {boolean} True if cell has any class from the group
   */
  static hasClass (cell, classGroup) {
    const groupClasses = Object.values(classGroup)
    return this.hasAny(cell, groupClasses)
  }
  static hasAny (cell, classes) {
    const cellClasses = cell.classList
    return classes.some(cls => cellClasses.contains(cls))
  }

  /**
   * Checks if a cell contains any class from any of the specified class groups.
   * Convenience method combining multiple group checks.
   *
   * @param {HTMLElement} cell - The cell element to check
   * @param {CellClassGroup[]} classGroups - Array of class groups to check against
   * @returns {boolean} True if cell has any class from any group
   */
  static hasAnyClass (cell, classGroups) {
    return classGroups.some(group => this.hasClass(cell, group))
  }

  /**
   * Extracts all class names from specified class groups.
   * Useful for bulk operations or validation.
   *
   * @param {CellClassGroup[]} classGroups - Array of class group objects to extract from
   * @returns {string[]} Flattened array of all class names from all groups
   */
  static getAllClasses (classGroups) {
    return classGroups.flatMap(group => Object.values(group))
  }

  /**
   * Clears cell state after battle action resolution.
   * Removes both visual indicators (display) and damage markers.
   *
   * @param {HTMLElement} cell - The cell element to clear
   * @returns {void}
   */
  static clearCell (cell) {
    this.clearCellClasses(cell, [
      this.CELL_CLASSES.display,
      this.CELL_CLASSES.damage
    ])
  }
  /**
   * Removes specified CSS classes from a cell element.
   * No-op if classNames array is empty to avoid unnecessary DOM updates.
   *
   * @param {HTMLElement} cell - DOM element to remove classes from
   * @param {string[]} classNames - Array of class names to remove
   * @returns {void}
   */
  static #removeClassesFromCell (cell, classNames) {
    if (classNames.length) {
      cell.classList.remove(...classNames)
    }
  }

  /**
   * Adds specified CSS classes to a cell element.
   * No-op if classNames array is empty to avoid unnecessary DOM updates.
   *
   * @param {HTMLElement} cell - DOM element to add classes to
   * @param {string[]} classNames - Array of class names to add
   * @returns {void}
   * @private
   */
  static #addClassesToCell (cell, classNames) {
    if (classNames.length) {
      cell.classList.add(...classNames)
    }
  }
  /**
   * Gets CSS classes to clear during hit cell state reset.
   * Combines default cleanup classes with current terrain weapon tags.
   *
   * @returns {string[]} Array of class names to remove from hit cells
   */
  static #hitCleanupClasses () {
    return [...DEFAULT_CELL_CLEAN_CLASSES, ...this.#weaponTags()]
  }

  /**
   * Clears only visual display classes from a cell.
   * Preserves damage indicators and other persistent state.
   *
   * @param {HTMLElement} cell - The cell element to clear
   * @returns {void}
   */
  static clearDisplayCell (cell) {
    this.clearCellClasses(cell, [this.CELL_CLASSES.display])
  }

  /**
   * Clears friendly board cell state comprehensively.
   * Removes display, damage, placement hints, and user aids.
   * Used when resetting friendly board cells for new placement.
   *
   * @param {HTMLElement} cell - The friendly board cell to clear
   * @returns {void}
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
   * Clears cell state during ship placement phase.
   * Removes all visual indicators and resets cell dataset except coordinates.
   * Used when aborting or canceling ship placement.
   *
   * @param {HTMLElement} cell - The placement cell to clear
   * @returns {void}
   */
  static clearPlaceCell (cell) {
    this.clearCellClasses(cell, [
      this.CELL_CLASSES.weapon,
      this.CELL_CLASSES.damage,
      this.CELL_CLASSES.placement,
      this.CELL_CLASSES.display,
      this.CELL_CLASSES.orientation
    ])
    this.#removeClassesFromCell(cell, this.#weaponTags())
    this.#clearCellDatasetExceptCoordinates(cell)
  }

  /**
   * Clears all dataset attributes from a cell except row and column coordinates.
   * Coordinates are preserved because they define the cell's position on the grid.
   *
   * @param {HTMLElement} cell - The cell element whose dataset will be cleared
   * @returns {void}
   * @private
   */
  static #clearCellDatasetExceptCoordinates (cell) {
    for (const key in cell.dataset) {
      if (!this.#PRESERVED_DATASET_KEYS.has(key)) {
        delete cell.dataset[key]
      }
    }
  }
}
