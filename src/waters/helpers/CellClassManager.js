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

/**
 * @typedef {Object} HitStateCellConfig
 * @property {string} displayClass - CSS class indicating cell state (e.g., 'hit', 'frd-hit')
 * @property {string|null} [damageType] - Optional damage indicator class (e.g., 'burnt', 'damaged')
 */

/**
 * Default cell CSS classes to clear during hit cell state reset.
 * These represent transient visual states that should be removed.
 * @type {string[]}
 * @private
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
 * - Apply game state to cell visual representation (hit states, sunk states, placement states)
 *
 * Design: Single static class with grouped class constants prevents instantiation,
 * reduces memory overhead, and ensures consistent class definitions across the application.
 *
 * Hit State Management:
 * - Friendly hit vs enemy hit have different visual indicators ('frd-hit' vs 'hit')
 * - Both can have optional damage types (burnt, damaged, skull)
 * - Both reset transient weapon/animation classes first
 *
 * Sunk State Management:
 * - Friendly sunk vs enemy sunk have different indicators ('frd-sunk' vs 'enm-sunk')
 * - Both clear display indicators and reset hit state before applying sunk class
 */
export class CellClassManager {
  /**
   * Dataset keys that should be preserved when clearing a cell's dataset.
   * 'r' = row index, 'c' = column index
   * @type {Set<string>}
   */
  static #PRESERVED_DATASET_KEYS = new Set(['r', 'c'])

  /**
   * Registry of all cell CSS classes, organized by category for maintainability.
   * Each group can be independently cleared or checked.
   * Single source of truth prevents class name synchronization bugs.
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
      contrast: 'contrast',
      tempHint: 'temp-hint'
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
   * Resets hit cell state by removing transient visual indicators.
   * Clears weapon-related classes and cursor classes added during targeting/animation.
   * Preserves display state (hit/miss) and damage indicators.
   *
   * @param {HTMLDivElement} cell - DOM element to reset
   * @returns {void}
   */
  static resetHitCellState (cell) {
    this.#removeWeaponAndAnimationClasses(cell)
    this.#removeCursorClasses(cell)
  }

  /**
   * Applies friendly board hit cell state.
   * Resets transient effects, adds friendly hit indicator, and optionally applies damage type.
   * Friendly hit states use 'frd-hit' class to distinguish from enemy perspective.
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @param {string} [damageType] - Optional damage indicator class (burnt, damaged, skull)
   * @returns {void}
   */
  static applyFriendlyHitCellState (cell, damageType) {
    this.#applyHitState(cell, 'frd-hit', damageType)
  }

  /**
   * Applies enemy board hit cell state.
   * Resets transient effects, adds hit indicator, and optionally applies damage type.
   * Enemy hit states use 'hit' class to show revealed targeting success.
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @param {string} [damageType] - Optional damage indicator class (burnt, damaged, skull)
   * @returns {void}
   */
  static applyEnemyHitCellState (cell, damageType) {
    this.#applyHitState(cell, 'hit', damageType)
  }

  /**
   * Applies friendly board sunk ship state.
   * Clears previous display state, resets animation effects, and applies friendly sunk indicator.
   *
   * @param {HTMLDivElement} cell - The friendly board cell to mark as sunk
   * @returns {void}
   */
  static applyFriendlySunkCellState (cell) {
    this.#applySunkState(cell, 'frd-sunk')
  }

  /**
   * Applies enemy board sunk ship state.
   * Clears previous display state, resets animation effects, and applies enemy sunk indicator.
   *
   * @param {HTMLDivElement} cell - The enemy board cell to mark as sunk
   * @returns {void}
   */
  static applyEnemySunkCellState (cell) {
    this.#applySunkState(cell, 'enm-sunk')
  }
  /**
   * Applies semi-reveal state (partially visible cell).
   * Only applies if cell is in clean state (no placement, hit, or miss markers).
   * Removes wake class when semi state is applied to represent more solid visibility.
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @returns {boolean} True if semi state was successfully applied, false if cell was in incompatible state
   */
  static applySemiRevealState (cell) {
    if (CellClassManager.hasAny(cell, ['placed', 'miss', 'hit'])) {
      return false
    }
    cell.classList.add('semi')
    cell.classList.remove('wake')
    return true
  }

  /**
   * Applies hint state to indicate suggested cell location.
   * Only applies if cell is in clean state (no placement, hit, miss, or semi markers).
   * Removes wake and temporary hint classes to update hint indication.
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @returns {boolean} True if hint state was successfully applied, false if cell was in incompatible state
   */
  static applyHintState (cell) {
    if (CellClassManager.hasAny(cell, ['placed', 'miss', 'hit', 'semi'])) {
      return false
    }
    cell.classList.add('hint')
    cell.classList.remove('wake', 'temp-hint')
    return true
  }
  /**
   * Clears specified class groups from a cell element.
   * Filters out empty group objects to handle edge cases gracefully.
   * No-op if all groups are empty to avoid unnecessary DOM manipulation.
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
   * Utility method for batch checking related classes.
   *
   * @param {HTMLElement} cell - The cell element to check
   * @param {CellClassGroup} classGroup - The class group to check against
   * @returns {boolean} True if cell has any class from the group
   */
  static hasClass (cell, classGroup) {
    const groupClasses = Object.values(classGroup)
    return this.hasAny(cell, groupClasses)
  }

  /**
   * Checks if a cell contains any class from a list of class names.
   * Low-level check method used by other hasClass methods.
   *
   * @param {HTMLElement} cell - The cell element to check
   * @param {string[]} classes - Array of class names to check for
   * @returns {boolean} True if cell has any of the specified classes
   */
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
   * Useful for bulk operations, validation, or debugging.
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
   * Preserves weapon-related, placement, and orientation classes.
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
   * Clears only visual display classes from a cell.
   * Preserves damage indicators and other persistent state.
   * Used when updating cell appearance without clearing permanent marks.
   *
   * @param {HTMLElement} cell - The cell element to clear
   * @returns {void}
   */
  static clearDisplayCell (cell) {
    this.clearCellClasses(cell, [this.CELL_CLASSES.display])
  }

  /**
   * Clears friendly board cell state comprehensively.
   * Removes display indicators, damage marks, placement hints, and user aids.
   * Used when resetting friendly board cells for new ship placement or game state reset.
   * Preserves coordinate dataset attributes.
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
   * Removes all visual indicators including weapon markers, animations, and orientation.
   * Resets cell dataset except for row/column coordinates.
   * Used when aborting or canceling ship placement.
   *
   * @param {HTMLDivElement} cell - The placement cell to clear
   * @returns {void}
   */
  static clearPlaceCell (cell) {
    this.#clearPlacementClasses(cell)
    this.#clearPlacementDataset(cell)
  }

  /**
   * Clears all dataset attributes from a cell except row and column coordinates.
   * Coordinates are preserved because they define the cell's position on the grid.
   *
   * @param {HTMLElement} cell - The cell element whose dataset will be cleared
   * @returns {void}
   */
  static #clearCellDatasetExceptCoordinates (cell) {
    for (const key in cell.dataset) {
      if (!this.#PRESERVED_DATASET_KEYS.has(key)) {
        delete cell.dataset[key]
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS - Terrain Configuration Accessors
  // ──────────────────────────────────────────────────────────────────

  /**
   * Gets weapon CSS class tags defined in current terrain configuration.
   * Returns empty array if terrain not yet loaded to handle initialization order.
   *
   * @returns {string[]} Array of weapon-related CSS class names from terrain config
   */
  static #weaponTags () {
    return bh.terrain?.weapons?.tags || []
  }

  /**
   * Gets weapon cursor CSS class tags defined in current terrain configuration.
   * Returns empty array if terrain not yet loaded to handle initialization order.
   *
   * @returns {string[]} Array of cursor-related CSS class names from terrain config
   */
  static #cursorTags () {
    return bh.terrain?.weapons?.cursors || []
  }

  // ──────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS - Class & Dataset Manipulation
  // ──────────────────────────────────────────────────────────────────

  /**
   * Removes specified CSS classes from a cell element.
   * No-op if classNames array is empty to avoid unnecessary DOM updates.
   * Always safe to call with empty array.
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
   * Gets all weapon-related CSS class names, including weapon tags and cursor tags.
   * Used for bulk operations on weapon-related classes.
   *
   * @returns {string[]} Array of all weapon and cursor class names
   */
  static #getAllWeaponRelatedClasses () {
    return [...this.#weaponTags(), ...this.#cursorTags()]
  }

  /**
   * Clears all weapon-related classes from a cell.
   * Removes both weapon tags and cursor tags.
   *
   * @param {HTMLElement} cell - The cell element to clear weapon classes from
   * @returns {void}
   */
  static clearWeaponRelatedClasses (cell) {
    this.#removeClassesFromCell(cell, this.#getAllWeaponRelatedClasses())
  }

  /**
   * Gets CSS classes to clear during hit cell state reset.
   * Combines default cleanup classes with current terrain-specific weapon tags.
   * Used to remove transient animation and weapon-related classes.
   *
   * @returns {string[]} Array of class names to remove from hit cells
   */
  static #getTransientClassesForHit () {
    return [...DEFAULT_CELL_CLEAN_CLASSES, ...this.#weaponTags()]
  }
   *
   * @param {HTMLElement} cell - The cell element to clear
   * @returns {void}
   */
  static clearShadowWeaponClasses (cell) {
    this.clearWeaponRelatedClasses(cell)
    this.clearCellClasses(cell, [this.CELL_CLASSES.display])
  }

  /**
   * Deactivates weapon state on a cell.
   * If cell has 'contrast' class, clears weapon-related classes and weapon/orientation groups.
   * Otherwise, removes only the 'active' class.
   *
   * @param {HTMLElement} cell - The cell element to deactivate
   * @returns {void}
   */
  static deactivateWeapon (cell) {
    if (cell.classList.contains('contrast')) {
      this.clearWeaponRelatedClasses(cell)
      this.clearCellClasses(cell, [
        this.CELL_CLASSES.weapon,
        this.CELL_CLASSES.orientation
      ])
    } else {
      cell.classList.remove('active')
    }
  }

  /**
   * Deactivates temporary hint state on a cell.
   * Removes the 'temp-hint' class.
   *
   * @param {HTMLElement} cell - The cell element to update
   * @returns {void}
   */
  static deactivateTempHint (cell) {
    cell.classList.remove('temp-hint')
  }
  /**
   * Removes weapon and animation-related classes from a cell.
   * Part of splitting resetHitCellState into semantic concerns.
   * Clears weapon markers, portal, and animation states.
   *
   * @param {HTMLDivElement} cell - The cell element to update
   * @returns {void}
   */
  static #removeWeaponAndAnimationClasses (cell) {
    this.#removeClassesFromCell(cell, this.#getTransientClassesForHit())
  }

  /**
   * Removes cursor-related classes from a cell.
   * Clears cursor indicators added during targeting/preview.
   *
   * @param {HTMLElement} cell - The cell element to update
   * @returns {void}
   */
  static #removeCursorClasses (cell) {
    this.#removeClassesFromCell(cell, this.#cursorTags())
  }
  // ──────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS - State Application (Hit & Sunk)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Generic hit state application helper.
   * Consolidates common logic for both friendly and enemy hit states.
   * Pattern:
   * 1. Reset transient weapon/animation classes
   * 2. Add hit state indicator class (friendly vs enemy)
   * 3. Apply optional damage type
   *
   * @param {HTMLDivElement} cell - The cell element to update
   * @param {string} stateClass - CSS class indicating hit state ('hit' or 'frd-hit')
   * @param {string} [damageType] - Optional damage indicator class (burnt, damaged, skull)
   * @returns {void}
   */
  static #applyHitState (cell, stateClass, damageType) {
    this.resetHitCellState(cell)
    cell.classList.add(stateClass)
    if (damageType) {
      cell.classList.add(damageType)
    }
  }

  /**
   * Generic sunk state application helper.
   * Consolidates common logic for both friendly and enemy sunk states.
   * Pattern:
   * 1. Clear previous display states
   * 2. Reset animation/weapon effects
   * 3. Apply sunk state class (friendly vs enemy)
   *
   * @param {HTMLDivElement} cell - The cell element to update
   * @param {string} sunkClass - CSS class indicating sunk state ('enm-sunk' or 'frd-sunk')
   * @returns {void}
   */
  static #applySunkState (cell, sunkClass) {
    this.clearDisplayCell(cell)
    this.resetHitCellState(cell)
    cell.classList.add(sunkClass)
  }

  // ──────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS - Placement Phase Cleanup
  // ──────────────────────────────────────────────────────────────────

  /**
   * Clears all class groups used during ship placement phase.
   * Removes weapon markers, damage indicators, placement hints, display states, and orientation.
   * Extracted from clearPlaceCell to separate class concerns from dataset concerns.
   *
   * @param {HTMLDivElement} cell - The placement cell to clear
   * @returns {void}
   */
  static #clearPlacementClasses (cell) {
    this.clearCellClasses(cell, [
      this.CELL_CLASSES.weapon,
      this.CELL_CLASSES.damage,
      this.CELL_CLASSES.placement,
      this.CELL_CLASSES.display,
      this.CELL_CLASSES.orientation
    ])
    this.clearWeaponClasses(cell)
  }

  /**
   * Clears weapon-related classes from a cell.
   * Alias for clearWeaponRelatedClasses for backward compatibility.
   *
   * @param {HTMLElement} cell - The cell element to clear
   * @returns {void}
   */
  static clearWeaponClasses (cell) {
    this.clearWeaponRelatedClasses(cell)
  }

  /**
   * Clears cell dataset during ship placement phase cleanup.
   * Removes all dataset attributes except row/column coordinates.
   * Extracted from clearPlaceCell to separate dataset concerns from class concerns.
   *
   * @param {HTMLDivElement} cell - The placement cell to clear
   * @returns {void}
   */
  static #clearPlacementDataset (cell) {
    this.#clearCellDatasetExceptCoordinates(cell)
  }
}
