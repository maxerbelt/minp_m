import { bh } from '../../terrains/all/js/bh.js'

/**
 * @module waters/helpers/CellClassManager
 * Centralized helper for managing cell CSS classes and transient states.
 *
 * @description
 * This module exports the CellClassManager class which provides a centralized registry
 * for all CSS classes used in grid cells and methods to manipulate them. It handles:
 * - Managing visual display states (hits, misses, sunk ships)
 * - Managing weapon and animation states
 * - Managing damage indicators
 * - Managing board edge and terrain classification
 * - Clearing specific groups of classes while preserving others
 *
 * @exports CellClassManager
 */

/**
 * @typedef {Object.<string, string>} CellClassGroup
 * Represents a group of related CSS class definitions, where keys are semantic property names
 * and values are the actual CSS class names. Used to organize related CSS classes by category.
 *
 * @example
 * // Example of a CellClassGroup
 * {
 *   hit: 'hit',
 *   friendlyHit: 'frd-hit',
 *   miss: 'miss'
 * }
 */

/**
 * @typedef {Object} CellClassGroups
 * Registry of all CSS class groups organized by category.
 * Provides a single source of truth for all CSS classes used in the application.
 *
 * @property {CellClassGroup} display - Visual state indicators (hit, miss, semi, wake, placed, sunk)
 * @property {CellClassGroup} weapon - Weapon placement, targeting, and active states
 * @property {CellClassGroup} damage - Damage type indicators (burnt, damaged, skull)
 * @property {CellClassGroup} placement - Ship placement phase states
 * @property {CellClassGroup} edge - Board edge and terrain types (land, sea, light, dark, edges)
 * @property {CellClassGroup} hint - User hint indicators for suggested locations
 * @property {CellClassGroup} orientation - Ship rotation/orientation states (turn2, turn3, turn4)
 * @property {CellClassGroup} animation - Animated state indicators (marker, portal)
 */

/**
 * @typedef {Object} HitStateCellConfig
 * Configuration object for applying hit state to a cell.
 *
 * @property {string} displayClass - CSS class indicating cell state (e.g., 'hit', 'frd-hit')
 * @property {string|null} [damageType] - Optional damage indicator class (e.g., 'burnt', 'damaged', 'skull')
 */

/**
 * Default cell CSS classes to clear during hit cell state reset.
 * These represent transient visual states that should be removed when a cell's
 * hit state is reset, preserving only permanent visual indicators.
 *
 * @type {string[]}
 * @const
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
 * @class
 * @static
 * @description
 * Centralized registry and manager for all CSS classes applied to grid cells. Provides
 * methods to apply game states (hits, sinks, placement) and manage visual indicators.
 *
 * Responsibilities:
 * - Maintain centralized registry of all CSS classes used in cells (CELL_CLASSES constant)
 * - Provide methods to clear specific groups of classes from cells independently
 * - Manage cell dataset attributes for storing cell metadata
 * - Check for class presence in cells
 * - Apply game state to cell visual representation (hit states, sunk states, placement states)
 * - Handle transient animation and weapon-related visual effects
 *
 * Design Pattern:
 * - Single static class with grouped class constants prevents instantiation
 * - Reduces memory overhead by using shared static references
 * - Ensures consistent class definitions across the application
 * - Eliminates need for singleton pattern or dependency injection
 *
 * Hit State Management:
 * - Friendly hit vs enemy hit have different visual indicators ('frd-hit' vs 'hit')
 * - Both can have optional damage types (burnt, damaged, skull)
 * - Both reset transient weapon/animation classes first before applying state
 * - Uses resetHitCellState() to clear animation effects
 *
 * Sunk State Management:
 * - Friendly sunk vs enemy sunk have different indicators ('frd-sunk' vs 'enm-sunk')
 * - Both clear display indicators and reset hit state before applying sunk class
 * - Uses clearDisplayCell() and resetHitCellState() sequentially
 *
 * Placement Phase Management:
 * - clearPlaceCell() removes all visual and dataset attributes except coordinates
 * - Handles both class removal and dataset clearing in single operation
 * - Preserves row ('r') and column ('c') dataset keys for cell positioning
 *
 * @example
 * // Applying a hit with damage type
 * const cell = document.getElementById('cell-1-1');
 * CellClassManager.applyEnemyHitCellState(cell, 'burnt');
 *
 * @example
 * // Clearing specific class groups
 * CellClassManager.clearCellClasses(cell, [
 *   CellClassManager.CELL_CLASSES.weapon,
 *   CellClassManager.CELL_CLASSES.animation
 * ]);
 *
 * @example
 * // Checking for class presence
 * if (CellClassManager.hasClass(cell, CellClassManager.CELL_CLASSES.display)) {
 *   console.log('Cell has a display state');
 * }
 */
export class CellClassManager {
  /**
   * Dataset keys that should be preserved when clearing a cell's dataset.
   * These keys store critical cell positioning information that must survive
   * state resets and cleanup operations.
   *
   * Preserved keys:
   * - 'r' - Row index (0-based coordinate)
   * - 'c' - Column index (0-based coordinate)
   *
   * Used by clearPlaceCell() to reset cells while maintaining their position tracking.
   *
   * @type {Set<string>}
   * @const
   * @static
   */
  static #PRESERVED_DATASET_KEYS = new Set(['r', 'c'])

  /**
   * Registry of all cell CSS classes, organized by category for maintainability and reuse.
   * This is the single source of truth for CSS class names used throughout the application.
   * Each group can be independently cleared or checked without affecting others.
   *
   * Organization:
   * - Display states: Hit/miss/sunk indicators that show game board state
   * - Weapon states: Weapon placement, active states, and targeting indicators
   * - Damage types: Visual damage indicators (burnt, damaged, skull) applied to hits
   * - Orientation: Ship rotation states (turn2=90°, turn3=180°, turn4=270°)
   * - Placement: Ship placement phase states (empty placement slots)
   * - Edge: Board boundary and terrain classification (land/sea/light/dark/edges)
   * - Hint: User assistance indicators (suggested placement locations)
   * - Animation: Dynamic animation states (marker placement, portal effects)
   *
   * Benefits of centralized registry:
   * - Single point to update CSS class names when styling changes
   * - Prevents class name typos and synchronization bugs
   * - Enables bulk operations on related classes
   * - Improves code maintainability and IDE autocomplete support
   *
   * @type {CellClassGroups}
   * @const
   * @static
   * @readonly
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
   * Preserves display state (hit/miss) and damage indicators so the cell state remains
   * consistent while animation effects are removed.
   *
   * Operation sequence:
   * 1. Removes weapon-related classes (weapon tags and cursor tags)
   * 2. Removes animation/transient marker classes
   * 3. Removes cursor indicator classes
   *
   * @param {HTMLElement} cell - DOM element representing a grid cell to reset
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement
   * @see #removeHitTransientClasses
   * @see removeCursorClasses
   *
   * @example
   * const cell = document.getElementById('grid-cell-1-2');
   * CellClassManager.resetHitCellState(cell); // Removes weapon classes but keeps 'hit' class
   */
  static resetHitCellState (cell) {
    this.#removeHitTransientClasses(cell)
    this.removeCursorClasses(cell)
  }

  /**
   * Applies friendly board hit cell state.
   * Resets transient effects, adds friendly hit indicator, and optionally applies damage type.
   * Friendly hit states use 'frd-hit' class to distinguish from enemy board perspective.
   * Used when displaying the player's own board where they can see their ships.
   *
   * Operation sequence:
   * 1. Calls resetHitCellState() to clear animation/weapon effects
   * 2. Adds 'frd-hit' class to indicate friendly board hit
   * 3. Adds optional damage type class if provided
   *
   * @param {HTMLElement} cell - DOM element representing a grid cell on friendly board
   * @param {string} [damageType] - Optional damage indicator class ('burnt', 'damaged', or 'skull')
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement
   * @see applyEnemyHitCellState
   * @see #applyHitState
   *
   * @example
   * CellClassManager.applyFriendlyHitCellState(cell); // Hit with no damage
   * @example
   * CellClassManager.applyFriendlyHitCellState(cell, 'burnt'); // Hit with burnt damage
   */
  static applyFriendlyHitCellState (cell, damageType) {
    this.#applyHitState(cell, this.CELL_CLASSES.display.friendlyHit, damageType)
  }

  /**
   * Applies enemy board hit cell state.
   * Resets transient effects, adds hit indicator, and optionally applies damage type.
   * Enemy hit states use 'hit' class to show revealed targeting success on opponent's board.
   * Used when displaying the opponent's board from the player's perspective.
   *
   * Operation sequence:
   * 1. Calls resetHitCellState() to clear animation/weapon effects
   * 2. Adds 'hit' class to indicate enemy board hit
   * 3. Adds optional damage type class if provided
   *
   * @param {HTMLElement} cell - DOM element representing a grid cell on enemy board
   * @param {string} [damageType] - Optional damage indicator class ('burnt', 'damaged', or 'skull')
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement
   * @see applyFriendlyHitCellState
   * @see #applyHitState
   *
   * @example
   * CellClassManager.applyEnemyHitCellState(cell); // Hit with no damage
   * @example
   * CellClassManager.applyEnemyHitCellState(cell, 'damaged'); // Hit with damaged status
   */
  static applyEnemyHitCellState (cell, damageType) {
    this.#applyHitState(cell, this.CELL_CLASSES.display.hit, damageType)
  }

  /**
   * Applies friendly board sunk ship state.
   * Clears previous display state, resets animation effects, and applies friendly sunk indicator.
   * Used when a player's own ship is sunk on the friendly board.
   *
   * Operation sequence:
   * 1. Calls clearDisplayCell() to remove previous hit/miss states
   * 2. Calls resetHitCellState() to clear animation/weapon effects
   * 3. Adds 'frd-sunk' class to indicate friendly sunk state
   *
   * @param {HTMLElement} cell - The friendly board cell element to mark as sunk
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement
   * @see applyEnemySunkCellState
   * @see #applySunkState
   *
   * @example
   * CellClassManager.applyFriendlySunkCellState(cell); // Mark ship as sunk on friendly board
   */
  static applyFriendlySunkCellState (cell) {
    this.#applySunkState(cell, this.CELL_CLASSES.display.friendlySunk)
  }

  /**
   * Applies enemy board sunk ship state.
   * Clears previous display state, resets animation effects, and applies enemy sunk indicator.
   * Used when an opponent's ship is sunk, revealed on the enemy board.
   *
   * Operation sequence:
   * 1. Calls clearDisplayCell() to remove previous hit/miss states
   * 2. Calls resetHitCellState() to clear animation/weapon effects
   * 3. Adds 'enm-sunk' class to indicate enemy sunk state
   *
   * @param {HTMLElement} cell - The enemy board cell element to mark as sunk
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement
   * @see applyFriendlySunkCellState
   * @see #applySunkState
   *
   * @example
   * CellClassManager.applyEnemySunkCellState(cell); // Mark ship as sunk on enemy board
   */
  static applyEnemySunkCellState (cell) {
    this.#applySunkState(cell, this.CELL_CLASSES.display.enemySunk)
  }
  /**
   * Applies semi-reveal state indicating a partially visible cell.
   * Only applies if cell is in clean state without permanent placement or combat markers.
   * Removes wake class when semi state is applied to represent more solid visibility.
   * Returns false if cell is ineligible to prevent state conflicts.
   *
   * Eligibility checks prevent conflicting states:
   * - Cell must not have 'placed' class (placement marker)
   * - Cell must not have 'miss' class (combat marker)
   * - Cell must not have 'hit' class (combat marker)
   *
   * State changes:
   * - Adds 'semi' class
   * - Removes 'wake' class (more visible than wake)
   *
   * @param {HTMLElement} cell - DOM element representing a grid cell
   * @returns {boolean} True if semi state was successfully applied, false if cell was in incompatible state
   * @throws {TypeError} If cell is not a valid HTMLElement
   * @see #isEligibleForTransientState
   * @see applyHintState
   *
   * @example
   * const success = CellClassManager.applySemiRevealState(cell);
   * if (success) {
   *   console.log('Cell is now semi-revealed');
   * } else {
   *   console.log('Cell cannot be semi-revealed due to existing state');
   * }
   */
  static applySemiRevealState (cell) {
    if (
      !this.#isEligibleForTransientState(cell, [
        this.CELL_CLASSES.display.placed,
        this.CELL_CLASSES.display.miss,
        this.CELL_CLASSES.display.hit
      ])
    ) {
      return false
    }

    cell.classList.add(this.CELL_CLASSES.display.semi)
    cell.classList.remove(this.CELL_CLASSES.display.wake)
    return true
  }

  /**
   * Applies hint state indicating a suggested cell location.
   * Only applies if cell is in clean state without placement or combat markers.
   * Removes wake and temporary hint classes to provide clear hint indication.
   * Returns false if cell is ineligible to prevent state conflicts.
   *
   * Eligibility checks prevent conflicting states:
   * - Cell must not have 'placed' class (placement marker)
   * - Cell must not have 'miss' class (combat marker)
   * - Cell must not have 'hit' class (combat marker)
   * - Cell must not have 'semi' class (semi-reveal already applied)
   *
   * State changes:
   * - Adds 'hint' class
   * - Removes 'wake' class (clearer indication)
   * - Removes 'temp-hint' class (replaces temporary hint)
   *
   * @param {HTMLElement} cell - DOM element representing a grid cell
   * @returns {boolean} True if hint state was successfully applied, false if cell was in incompatible state
   * @throws {TypeError} If cell is not a valid HTMLElement
   * @see #isEligibleForTransientState
   * @see applySemiRevealState
   * @see deactivateTempHint
   *
   * @example
   * const success = CellClassManager.applyHintState(cell);
   * if (success) {
   *   console.log('Cell now shows hint for player guidance');
   * } else {
   *   console.log('Cell cannot display hint due to existing state');
   * }
   */
  static applyHintState (cell) {
    if (
      !this.#isEligibleForTransientState(cell, [
        this.CELL_CLASSES.display.placed,
        this.CELL_CLASSES.display.miss,
        this.CELL_CLASSES.display.hit,
        this.CELL_CLASSES.display.semi
      ])
    ) {
      return false
    }

    cell.classList.add(this.CELL_CLASSES.hint.hint)
    cell.classList.remove(
      this.CELL_CLASSES.display.wake,
      this.CELL_CLASSES.weapon.tempHint
    )
    return true
  }
  /**
   * Clears specified class groups from a cell element.
   * Extracts all class names from the provided groups and removes them in a single operation.
   * Filters out empty group objects to handle edge cases gracefully.
   * No-op if all groups are empty to avoid unnecessary DOM manipulation.
   *
   * Performance note: Batches class removal to minimize DOM reflows.
   *
   * @param {HTMLElement} cell - The cell element to clear classes from
   * @param {CellClassGroup[]} classGroups - Array of class group objects whose classes should be removed
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement or classGroups is not an array
   * @see #extractClassNames
   * @see #removeClassNames
   *
   * @example
   * // Clear weapon and animation classes
   * CellClassManager.clearCellClasses(cell, [
   *   CellClassManager.CELL_CLASSES.weapon,
   *   CellClassManager.CELL_CLASSES.animation
   * ]);
   *
   * @example
   * // Clear all display-related classes
   * CellClassManager.clearCellClasses(cell, [CellClassManager.CELL_CLASSES.display]);
   */
  static clearCellClasses (cell, classGroups) {
    this.#removeClassNames(cell, this.#extractClassNames(classGroups))
  }

  /**
   * Checks if a cell contains any class from a specific class group.
   * Utility method for batch checking related classes without checking individual names.
   * Returns true on first match for performance (early exit).
   *
   * @param {HTMLElement} cell - The cell element to check
   * @param {CellClassGroup} classGroup - The class group object whose classes will be checked
   * @returns {boolean} True if cell has any class from the group, false otherwise
   * @throws {TypeError} If cell is not a valid HTMLElement
   * @see hasAny
   * @see hasAnyClass
   *
   * @example
   * if (CellClassManager.hasClass(cell, CellClassManager.CELL_CLASSES.damage)) {
   *   console.log('Cell has damage indicator');
   * }
   */
  static hasClass (cell, classGroup) {
    const groupClasses = Object.values(classGroup)
    return this.hasAny(cell, groupClasses)
  }

  /**
   * Checks if a cell contains any class from a list of class names.
   * Low-level check method used by other hasClass methods.
   * Provides early exit optimization by returning true on first match.
   *
   * @param {HTMLElement} cell - The cell element to check
   * @param {string[]} classes - Array of class names to check for in the cell
   * @returns {boolean} True if cell has any of the specified classes, false if none found
   * @throws {TypeError} If cell is not a valid HTMLElement or classes is not an array
   * @see hasClass
   * @see hasAnyClass
   *
   * @example
   * const hasVisualState = CellClassManager.hasAny(cell, ['hit', 'miss', 'semi']);
   */
  static hasAny (cell, classes) {
    const cellClasses = cell.classList
    return classes.some(cls => cellClasses.contains(cls))
  }

  /**
   * Checks if a cell contains any class from any of the specified class groups.
   * Convenience method combining multiple group checks for comprehensive state queries.
   * Returns true on first match across any group.
   *
   * @param {HTMLElement} cell - The cell element to check
   * @param {CellClassGroup[]} classGroups - Array of class groups to check
   * @returns {boolean} True if cell has any class from any provided group, false if none found
   * @throws {TypeError} If cell is not a valid HTMLElement or classGroups is not an array
   * @see hasClass
   * @see hasAny
   *
   * @example
   * if (CellClassManager.hasAnyClass(cell, [
   *   CellClassManager.CELL_CLASSES.weapon,
   *   CellClassManager.CELL_CLASSES.animation
   * ])) {
   *   console.log('Cell has weapon or animation state');
   * }
   */
  static hasAnyClass (cell, classGroups) {
    return classGroups.some(group => this.hasClass(cell, group))
  }

  /**
   * Extracts all class names from specified class groups into a flat array.
   * Useful for bulk operations, validation, debugging, or creating class name lists.
   * Preserves order from the class groups.
   *
   * @param {CellClassGroup[]} classGroups - Array of class group objects to extract from
   * @returns {string[]} Flattened array of all class names from all provided groups
   * @throws {TypeError} If classGroups is not an array
   * @see clearCellClasses
   *
   * @example
   * const allWeaponClasses = CellClassManager.getAllClasses([
   *   CellClassManager.CELL_CLASSES.weapon,
   *   CellClassManager.CELL_CLASSES.orientation
   * ]);
   * // Returns: ['weapon', 'active', 'contrast', 'temp-hint', 'turn2', 'turn3', 'turn4']
   */
  static getAllClasses (classGroups) {
    return classGroups.flatMap(group => Object.values(group))
  }

  /**
   * Clears cell state after battle action resolution.
   * Removes both visual display indicators (hit, miss, sunk) and damage markers (burnt, damaged, skull).
   * Preserves weapon-related classes, placement classes, and orientation to maintain targeting context.
   * Used after resolving an attack to clean up temporary visual feedback.
   *
   * Classes preserved:
   * - Weapon states (for targeting preview)
   * - Placement markers (for placement phase)
   * - Orientation markers (for rotation indication)
   * - Edge and terrain classes (for board definition)
   *
   * @param {HTMLElement} cell - The cell element to clear
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement
   * @see clearDisplayCell
   * @see clearFriendCell
   * @see clearPlaceCell
   *
   * @example
   * // After resolving an attack
   * CellClassManager.clearCell(cell); // Removes hit/miss/damage but keeps targeting preview
   */
  static clearCell (cell) {
    this.clearCellClasses(cell, [
      this.CELL_CLASSES.display,
      this.CELL_CLASSES.damage
    ])
  }

  /**
   * Clears only visual display classes from a cell.
   * Removes display state indicators (hit, miss, semi, wake, placed, sunk, friendlyHit, enemySunk).
   * Preserves all other classes including:
   * - Damage indicators (burnt, damaged, skull)
   * - Weapon states (weapon, active, contrast)
   * - Placement and orientation markers
   *
   * Used when updating cell appearance without clearing permanent marks or weapon states.
   * Useful for resetting visible hit/miss indicators while maintaining game state.
   *
   * @param {HTMLElement} cell - The cell element to clear
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement
   * @see clearCell
   * @see clearFriendCell
   *
   * @example
   * // Remove hit/miss indicators but keep damage markers
   * CellClassManager.clearDisplayCell(cell);
   */
  static clearDisplayCell (cell) {
    this.clearCellClasses(cell, [this.CELL_CLASSES.display])
  }

  /**
   * Clears friendly board cell state comprehensively.
   * Removes all visual, damage, placement, and hint classes from a friendly board cell.
   * Used when resetting friendly board cells for new ship placement or game state reset.
   * Preserves coordinate dataset attributes (row 'r' and column 'c') for cell positioning.
   *
   * Classes removed:
   * - Display classes (hit, miss, sunk, etc.)
   * - Damage indicators (burnt, damaged, skull)
   * - Placement markers (empty slots)
   * - Hint indicators (suggested placements)
   *
   * Classes preserved:
   * - Coordinate dataset attributes
   * - Edge/terrain classifications (land, sea, light, dark)
   * - Any weapon or animation states
   *
   * @param {HTMLElement} cell - The friendly board cell element to clear
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement
   * @see clearPlaceCell
   * @see clearCell
   * @see #clearDatasetExceptCoordinates
   *
   * @example
   * // Reset friendly board after game or placement phase
   * CellClassManager.clearFriendCell(cell);
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
   * Clears cell state during ship placement phase comprehensively.
   * Removes all visual indicators including weapon markers, animations, and orientation.
   * Resets cell dataset attributes except for row/column coordinates which are preserved.
   * Used to return cells to clean state for ship placement interaction.
   *
   * Classes removed:
   * - Weapon states (weapon, active, contrast, temp-hint)
   * - Damage indicators (burnt, damaged, skull)
   * - Placement markers (empty)
   * - Display states (hit, miss, sunk, etc.)
   * - Orientation markers (turn2, turn3, turn4)
   * - Terrain-specific weapon classes (from bh.terrain configuration)
   *
   * Dataset properties preserved:
   * - 'r' (row index)
   * - 'c' (column index)
   *
   * Dataset properties cleared:
   * - All custom properties (e.g., ship ID, placement data)
   *
   * @param {HTMLElement} cell - The placement cell element to clear
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement
   * @see #clearPlacementClasses
   * @see #clearDatasetExceptCoordinates
   * @see clearFriendCell
   *
   * @example
   * // Reset cell for new ship placement
   * CellClassManager.clearPlaceCell(cell);
   */
  static clearPlaceCell (cell) {
    this.#clearPlacementClasses(cell)
    this.#clearDatasetExceptCoordinates(cell)
  }

  /**
   * Clears all dataset attributes from a cell except row and column coordinates.
   * Coordinates are preserved because they define the cell's position on the grid.
   * Used during placement phase cleanup to remove temporary placement metadata.
   *
   * Preserved dataset keys: 'r' (row), 'c' (column)
   * Cleared dataset keys: All others
   *
   * @param {HTMLElement} cell - The cell element whose dataset will be cleared
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement
   * @see #PRESERVED_DATASET_KEYS
   * @see clearPlaceCell
   */
  static #clearDatasetExceptCoordinates (cell) {
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
   * Returns empty array if terrain not yet loaded to handle initialization order gracefully.
   * Used to identify weapon-related classes specific to the current game terrain.
   *
   * Accesses: bh.terrain?.weapons?.tags
   *
   * @returns {string[]} Array of weapon-related CSS class names from terrain config, or empty array
   * @see #cursorTags
   * @see clearWeaponRelatedClasses
   */
  static #weaponTags () {
    return bh.terrain?.weapons?.tags ?? []
  }

  /**
   * Gets weapon cursor CSS class tags defined in current terrain configuration.
   * Returns empty array if terrain not yet loaded to handle initialization order gracefully.
   * Used to identify cursor-related classes applied during weapon targeting preview.
   *
   * Accesses: bh.terrain?.weapons?.cursors
   *
   * @returns {string[]} Array of cursor-related CSS class names from terrain config, or empty array
   * @see #weaponTags
   * @see removeCursorClasses
   */
  static #cursorTags () {
    return bh.terrain?.weapons?.cursors ?? []
  }

  // ──────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS - Class & Dataset Manipulation
  // ──────────────────────────────────────────────────────────────────

  /**
   * Removes specified CSS classes from a cell element in batch.
   * No-op if classNames array is empty to avoid unnecessary DOM updates.
   * Always safe to call with empty array.
   * Batches removal to minimize DOM reflows.
   *
   * @param {HTMLElement} cell - DOM element to remove classes from
   * @param {string[]} classNames - Array of CSS class names to remove from the cell
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement or classNames is not an array
   */
  static #removeClassNames (cell, classNames) {
    if (classNames.length) {
      cell.classList.remove(...classNames)
    }
  }

  /**
   * Gets all weapon-related CSS class names including both weapon tags and cursor tags.
   * Used for bulk operations on all weapon-related classes in one call.
   * Returns combined array of both terrain-specific weapon tags and cursor tags.
   *
   * @returns {string[]} Array of all weapon and cursor class names
   * @see #weaponTags
   * @see #cursorTags
   * @see clearWeaponRelatedClasses
   */
  static #getAllWeaponRelatedClasses () {
    return [...this.#weaponTags(), ...this.#cursorTags()]
  }

  /**
   * Clears all weapon-related classes from a cell.
   * Removes both weapon tags (from placement/selection) and cursor tags (from targeting preview).
   * Single operation for comprehensive weapon state cleanup.
   *
   * @param {HTMLElement} cell - The cell element to clear weapon classes from
   * @returns {void}
   * @private
   * @see #getAllWeaponRelatedClasses
   * @see clearWeaponRelatedClasses
   */
  static clearWeaponRelatedClasses (cell) {
    this.#removeClassNames(cell, this.#getAllWeaponRelatedClasses())
  }

  /**
   * Gets CSS classes to clear during hit cell state reset.
   * Combines default cleanup classes with current terrain-specific weapon tags.
   * Used to remove transient animation and weapon-related classes while preserving hit state.
   *
   * @returns {string[]} Array of all class names to remove from hit cells
   * @see #weaponTags
   * @see #removeHitTransientClasses
   */
  static #getHitResetClasses () {
    return [...DEFAULT_CELL_CLEAN_CLASSES, ...this.#weaponTags()]
  }

  /**
   * Clears shadow weapon classes and display classes from a cell.
   * Used for resetting weapon-related visual states when canceling weapon preview.
   * Removes weapon classes, cursor classes, and display indicators.
   *
   * Classes removed:
   * - All weapon-related classes (weapon tags and cursors)
   * - All display state classes (hit, miss, semi, wake, placed, sunk)
   *
   * @param {HTMLElement} cell - The cell element to clear
   * @returns {void}
   * @public
   * @see clearWeaponRelatedClasses
   * @see clearCellClasses
   *
   * @example
   * // Clear weapon preview display
   * CellClassManager.clearShadowWeaponClasses(cell);
   */
  static clearShadowWeaponClasses (cell) {
    this.clearWeaponRelatedClasses(cell)
    this.clearCellClasses(cell, [this.CELL_CLASSES.display])
  }

  /**
   * Deactivates weapon state on a cell.
   * Behavior depends on cell's current state indicated by 'contrast' class:
   * - If 'contrast' class present: Clears all weapon-related and orientation classes
   * - If 'contrast' class absent: Removes only 'active' class for less aggressive deactivation
   *
   * Used when clicking on weapon targets or completing weapon preview.
   *
   * @param {HTMLElement} cell - The cell element to deactivate
   * @returns {void}
   * @public
   * @see clearWeaponRelatedClasses
   * @see clearCellClasses
   * @see deactivateTempHint
   *
   * @example
   * // Deactivate weapon on target cell
   * CellClassManager.deactivateWeapon(cell);
   */
  static deactivateWeapon (cell) {
    if (cell.classList.contains(this.CELL_CLASSES.weapon.contrast)) {
      this.clearWeaponRelatedClasses(cell)
      this.clearCellClasses(cell, [
        this.CELL_CLASSES.weapon,
        this.CELL_CLASSES.orientation
      ])
    } else {
      cell.classList.remove(this.CELL_CLASSES.weapon.active)
    }
  }

  /**
   * Deactivates temporary hint state on a cell.
   * Removes the 'temp-hint' class applied during weapon targeting preview.
   * Used to clear temporary visual feedback when exiting targeting mode.
   *
   * @param {HTMLElement} cell - The cell element to update
   * @returns {void}
   * @public
   * @see applyHintState
   * @see deactivateWeapon
   *
   * @example
   * // Clear temporary hint after targeting preview
   * CellClassManager.deactivateTempHint(cell);
   */
  static deactivateTempHint (cell) {
    cell.classList.remove(this.CELL_CLASSES.weapon.tempHint)
  }

  /**
   * Removes weapon and animation-related classes from a cell.
   * Part of semantic split of resetHitCellState into focused concerns.
   * Clears weapon markers, portal effects, and animation states.
   * Used during hit state application to clean transient effects.
   *
   * Classes removed:
   * - Weapon tags (terrain-specific weapon classes)
   * - Default transient animation classes (marker, portal, semi, semi-miss, etc.)
   *
   * @param {HTMLElement} cell - The cell element to update
   * @returns {void}
   * @see #getHitResetClasses
   * @see resetHitCellState
   */
  static #removeHitTransientClasses (cell) {
    this.#removeClassNames(cell, this.#getHitResetClasses())
  }

  /**
   * Removes cursor-related classes from a cell.
   * Clears cursor indicator classes added during weapon targeting preview.
   * Called as part of resetHitCellState to clear all preview effects.
   *
   * @param {HTMLElement} cell - The cell element to update
   * @returns {void}
   * @public
   * @see #cursorTags
   * @see resetHitCellState
   *
   * @example
   * // Clear targeting cursor indicators
   * CellClassManager.removeCursorClasses(cell);
   */
  static removeCursorClasses (cell) {
    this.#removeClassNames(cell, this.#cursorTags())
  }

  // ──────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS - State Application (Hit & Sunk)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Generic hit state application helper consolidating common logic between friendly and enemy hits.
   * Both friendly and enemy hit states follow the same pattern:
   * 1. Reset transient weapon/animation classes via resetHitCellState()
   * 2. Add hit state indicator class (parameterized for friendly/enemy distinction)
   * 3. Apply optional damage type class if provided
   *
   * This helper eliminates code duplication between applyFriendlyHitCellState and applyEnemyHitCellState.
   * Damage types (burnt, damaged, skull) stack with the hit state class.
   *
   * @param {HTMLElement} cell - The cell element to update
   * @param {string} stateClass - CSS class indicating hit state (e.g., 'hit' or 'frd-hit')
   * @param {string} [damageType] - Optional damage indicator class (burnt, damaged, skull)
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement or stateClass is not a string
   * @see applyFriendlyHitCellState
   * @see applyEnemyHitCellState
   * @see resetHitCellState
   */
  static #applyHitState (cell, stateClass, damageType) {
    this.resetHitCellState(cell)
    cell.classList.add(stateClass)
    if (damageType) {
      cell.classList.add(damageType)
    }
  }

  /**
   * Generic sunk state application helper consolidating common logic between friendly and enemy sinks.
   * Both friendly and enemy sunk states follow the same pattern:
   * 1. Clear previous display states via clearDisplayCell() to remove hit/miss classes
   * 2. Reset animation/weapon effects via resetHitCellState()
   * 3. Apply sunk state class (parameterized for friendly/enemy distinction)
   *
   * This helper eliminates code duplication between applyFriendlySunkCellState and applyEnemySunkCellState.
   * Clean sunk state provides unambiguous visual feedback of ship destruction.
   *
   * @param {HTMLElement} cell - The cell element to update
   * @param {string} sunkClass - CSS class indicating sunk state (e.g., 'enm-sunk' or 'frd-sunk')
   * @returns {void}
   * @throws {TypeError} If cell is not a valid HTMLElement or sunkClass is not a string
   * @see applyFriendlySunkCellState
   * @see applyEnemySunkCellState
   * @see clearDisplayCell
   * @see resetHitCellState
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
   * Also clears terrain-specific weapon-related classes from bh.terrain configuration.
   * Comprehensive cleanup for transitioning cells out of placement phase.
   *
   * Class groups cleared:
   * - Weapon states (weapon, active, contrast, temp-hint)
   * - Damage indicators (burnt, damaged, skull)
   * - Placement markers (empty)
   * - Display states (hit, miss, semi, wake, placed, sunk)
   * - Orientation markers (turn2, turn3, turn4)
   * - Terrain-specific weapon classes
   *
   * @param {HTMLElement} cell - The placement cell to clear
   * @returns {void}
   * @see clearWeaponRelatedClasses
   * @see clearCellClasses
   * @see clearPlaceCell
   */
  static #clearPlacementClasses (cell) {
    this.clearCellClasses(cell, [
      this.CELL_CLASSES.weapon,
      this.CELL_CLASSES.damage,
      this.CELL_CLASSES.placement,
      this.CELL_CLASSES.display,
      this.CELL_CLASSES.orientation
    ])
    this.clearWeaponRelatedClasses(cell)
  }

  /**
   * Clears weapon-related classes from a cell (deprecated public method).
   * Maintained for backward compatibility. New code should use clearWeaponRelatedClasses().
   * Calls clearWeaponRelatedClasses internally.
   *
   * @param {HTMLElement} cell - The cell element to clear
   * @returns {void}
   * @public
   * @deprecated Use clearWeaponRelatedClasses instead
   * @see clearWeaponRelatedClasses
   */
  static clearWeaponClasses (cell) {
    this.clearWeaponRelatedClasses(cell)
  }

  /**
   * Checks whether a cell is eligible for transient state application.
   * Prevents overlapping state classes such as hits, misses, and hints.
   * Used to validate state transitions before applying semi-reveal or hint states.
   *
   * @param {HTMLElement} cell - The cell element to check
   * @param {string[]} forbiddenClasses - Array of class names that disallow the transient state
   * @returns {boolean} True if the state may be applied safely, false if forbidden classes present
   * @see hasAny
   * @see applySemiRevealState
   * @see applyHintState
   */
  static #isEligibleForTransientState (cell, forbiddenClasses) {
    return !this.hasAny(cell, forbiddenClasses)
  }

  /**
   * Extracts class names from class group definitions, filtering empty groups.
   * Utility for converting class group objects to flat class name arrays.
   * Used internally by clearCellClasses and other bulk operation methods.
   *
   * @param {CellClassGroup[]} classGroups - Array of class group objects to extract from
   * @returns {string[]} Flattened array of all class names from all groups
   * @see getAllClasses
   * @see clearCellClasses
   */
  static #extractClassNames (classGroups) {
    return classGroups.flatMap(group => Object.values(group))
  }
}
