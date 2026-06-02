import { bh } from '../terrains/all/js/bh.js'
import { Terrain } from '../terrains/all/js/terrain.js'
import { WatersUI } from './WatersUI.js'
import { ClickedShip } from '../selection/selection.js'
import { cursor } from '../selection/cursor.js'
import { getShipIdFromElement, dragNDrop } from '../selection/dragndrop.js'
import { setCellCoords } from '../core/utilities.js'
import { gameStatus } from './StatusUI.js'
import { Mask } from '../grid/rectangle/mask.js'
import { Ship } from '../ships/Ship.js'
import { ElementCache } from './helpers/ElementCache.js'
import { TrayManager } from './helpers/TrayManager.js'
import { DirectionMovement } from './helpers/DirectionMovement.js'
import { UIElementBuilder } from './helpers/UIElementBuilder.js'
import { ShipCellDisplayer } from './helpers/ShipCellDisplayer.js'
/**
 * @fileoverview Placement UI Manager - Grid-based ship and weapon placement interface
 *
 * Manages the visual board and tray interface for placing ships and weapons during game setup.
 * Handles drag-and-drop interactions, cursor navigation, cell highlighting, and UI state management.
 * Provides methods for building and managing trays, displaying placement feedback, and coordinating
 * with the drag-and-drop system for interactive ship/weapon placement.
 *
 * Key responsibilities:
 * - Building and maintaining ship/weapon trays with drag previews
 * - Managing board cell highlighting and validation feedback
 * - Handling cursor-based navigation for keyboard input
 * - Displaying placement events (placement, addition, subtraction)
 * - Managing transformation button visibility and state
 * - Coordinating with ElementCache, TrayManager, and dragNDrop systems
 *
 * @module waters/placementUI
 * @requires waters/WatersUI
 * @requires grid/canvasGrid
 * @requires grid/ShipCellDisplayer
 * @requires selection/dragndrop
 * @requires ui/ElementCache
 * @requires ui/TrayManager
 * @requires ui/UIElementBuilder
 */

/**
 * Coordinate pair [row, column] for grid positions.
 * @typedef {[number, number]} CoordinatePair
 * @description Tuple representing a single grid cell position as [row, column]
 */

/**
 * Grid cell styling options for drag previews and board display.
 * Provides unified styling configuration for grid cell rendering.
 * @typedef {Object} GridCellOptions
 * @property {string} [bg] - Background color CSS value (hex or CSS color name)
 * @property {string} [fg] - Foreground (text) color CSS value for contrast
 * @property {string} [letter] - Text content to display in cell (ship/weapon identifier)
 * @property {boolean} [isSpecial=false] - Whether cell has special styling (affects display emphasis)
 * @property {string[]} [classes=[]] - Additional CSS class names to apply for styling variants
 */

/**
 * Ship information for tray building with counts.
 * Combines ship shape definition with quantity for tray display.
 * @typedef {Object} ShipInfo
 * @property {ShipShape} shape - Ship shape/form object with board, letter, and visual properties
 * @property {number} count - Number of ships of this type/form to display in tray
 */

/**
 * Weapon loadout configuration with ship weapons and settings.
 * Manages weapon system state and configuration for a single or multiple ships.
 * @typedef {Object} LoadOut
 * @property {Object<string, any>} shipWeapons - Map of ship weapons indexed by configuration key
 * @property {any} [settings] - Optional loadout settings for weapon behavior
 */

/**
 * Game model containing game state and configuration.
 * Central data object for placement phase with ships, weapons, and board state.
 * @typedef {Object} GameModel
 * @property {Ship[]} ships - Array of placed ships with cells and board positions
 * @property {Ship[]} candidateShips - Array of candidate ships available for placement
 * @property {Object<string, any>} shipCellGrid - Grid representation of ship cell positions for highlighting
 * @property {LoadOut} loadOut - Weapon loadout configuration and current state
 * @property {(map?: Object) => void} armWeapons - Method to configure and initialize weapons for ships
 * @property {() => boolean} hasPlayableShips - Method checking if game has playable ships
 * @property {() => boolean} hasFewShips - Method checking if ship count is below minimum
 * @property {() => number} calculateDisplacedArea - Method to calculate total displaced area of all ships
 */

/**
 * Board/mask object representing ship grid structure.
 * Provides grid data and access methods for ship board information.
 * @typedef {Object} BoardMask
 * @property {number} height - Board height in cells
 * @property {number} width - Board width in cells
 * @property {() => Array<CoordinatePair>} allXYlocations - Get all board cell positions
 * @property {(x: number, y: number) => number} at - Get cell value at position (color depth)
 */

/**
 * Weapon configuration and properties.
 * Complete weapon definition with splash effects and visual representation.
 * @typedef {Object} Weapon
 * @property {string} tag - Weapon identifier for lookups and CSS styling
 * @property {string} letter - Single character weapon identifier
 * @property {string} name - Human-readable weapon name
 * @property {number} splashPower - Splash damage power level (0-3: vulnerable/normal/hardened/immune)
 * @property {Array<[number, number, number]>} splashCoords - Splash effect cells as [row, col, power]
 * @property {Array<[number, number, number]>|undefined} [crashCoords] - Crash effect cells as [row, col, power] (optional)
 * @property {Array<[number, number, number]>} dragShape - Drag preview shape cells as [row, col, value]
 * @property {string} [tip] - Weapon tip/description text shown on selection
 */

/**
 * Terrain subtype configuration with styling information.
 * Terrain variation with visual styling for brush and placement display.
 * @typedef {Object} SubTerrain
 * @property {string} letter - Terrain letter identifier
 * @property {string} lightColor - Light theme color for checkerboard pattern
 * @property {string} [tag] - Optional terrain tag for specialized/themed styling
 */

/**
 * Cursor direction delta for arrow key navigation.
 * Direction vector for grid cursor movement.
 * @typedef {Object} CursorDirection
 * @property {number} dx - Row delta (-1, 0, or 1)
 * @property {number} dy - Column delta (-1, 0, or 1)
 */

/**
 * Ship shape definition with form and placement information.
 * Complete ship configuration including board, forms, and transformation data.
 * @typedef {Object} ShipShape
 * @property {string} symmetry - Symmetry type description
 * @property {string} letter - Ship letter identifier (S, A, M, T, etc.)
 * @property {Object<string, any>} weaponSystem - Weapon system configuration for ship
 * @property {string} [tallyGroup] - Tally group identifier for score display
 * @property {BoardMask} board - Board/mask object with height, width, and color data
 * @property {string} descriptionText - Human-readable ship description
 * @property {string} [tip] - Tip/notice text shown on ship selection
 * @property {boolean} [canTransform] - Whether ship can be transformed to alternate forms
 * @property {ShipShape[]} [forms] - Available transformation forms/variants
 * @property {(filter?: Function) => ShipShape[]} [placeables] - Get available placement variants with optional filter
 * @property {(variant: number, r: number, c: number) => CoordinatePair[]} [placeCells] - Calculate cell coordinates for variant placement
 * @property {(cellHeight: number) => {index: number, board: BoardMask}} [infoShrunkUnder] - Get form shrunk to fit under height limit
 */
export class PlacementUI extends WatersUI {
  /**
   * CSS class names for styling and state management.
   * Centralizes string literals to prevent typos and enable consistency.
   * Single source of truth for all CSS class names used in DOM manipulation.
   * @type {Object<string, string>}
   * @static
   * @readonly
   */
  static #CSS_CLASSES = {
    HIDDEN: 'hidden',
    CLICKED: 'clicked',
    CELL: 'cell',
    DRAG_SHIP: 'drag-ship',
    DRAG_SHIP_CONTAINER: 'drag-ship-container',
    DRAG_BRUSH_CONTAINER: 'drag-brush-container',
    DRAG_BRUSH: 'drag-brush',
    EMPTY: 'empty',
    SPECIAL: 'special',
    LIGHT: 'light',
    DARK: 'dark',
    PLACED: 'placed',
    GOOD: 'good',
    NOT_GOOD: 'notgood',
    BAD: 'bad',
    WORSE: 'worse',
    SPLASH_CONTAINER: 'splash-container',
    SPLASH_COL: 'splash-col',
    TALLY_BOX: 'tally-box',
    PANEL: 'panel',
    ALT: 'alt',
    SPLASH_CELLS: 'splash-cells'
  }

  /**
   * Dataset attribute names for storing component metadata.
   * Standardizes dataset key naming across all element operations.
   * Used for storing ship variant, type, id, and sizing information on DOM elements.
   * @type {Object<string, string>}
   * @static
   * @readonly
   */
  static #DATA_ATTRIBUTES = {
    ID: 'id',
    VARIANT: 'variant',
    TYPE: 'type',
    LETTER: 'letter',
    SIZE: 'size',
    CELL_HEIGHT: 'cellHeight'
  }

  /**
   * Unit type mappings for ship categorization.
   * Consolidates type conversion logic in one place for consistency.
   * Maps M (Missile) and T (Transport) types to X (special units).
   * @type {Object<string, string>}
   * @static
   * @readonly
   */
  static #UNIT_TYPE_MAP = {
    M: 'X',
    T: 'X'
  }

  /**
   * HTML element ID mappings for different unit type note sections.
   * Replaces switch statement with direct lookup for cleaner code.
   * Maps unit type letters to their corresponding info element IDs.
   * @type {Object<string, string>}
   * @static
   * @readonly
   */
  static #NOTES_ID_MAP = {
    A: 'planeNotes',
    S: 'shipNotes',
    M: 'specialNotes',
    T: 'specialNotes',
    X: 'specialNotes',
    G: 'buildingNotes',
    W: 'weaponNotes'
  }

  /**
   * Splash description text for different splash types.
   * Centralizes user-facing descriptions for consistency and easy localization.
   * Describes what each splash type represents in gameplay.
   * @type {Object<string, string>}
   * @static
   * @readonly
   */
  static #SPLASH_DESCRIPTIONS = {
    splash: 'splash damage on striking unit',
    crash: 'splash damage on missing all units and crashing into terrain'
  }

  /**
   * CSS highlight class names for cell validity states.
   * Represents different levels of placement validity for visual feedback.
   * @type {string[]}
   * @static
   * @readonly
   */
  static #HIGHLIGHT_CLASSES = ['good', 'notgood', 'bad', 'worse']

  /**
   * Brush size range for terrain brush generation.
   * Available sizes for terrain brush tools during placement.
   * @type {number[]}
   * @static
   * @readonly
   */
  static #BRUSH_SIZES = [1, 2, 3]

  /**
   * Initializes PlacementUI with UI elements, button references, and state.
   * Extends WatersUI base class with placement-specific initialization.
   * Caches all button and tray DOM elements for efficient repeated access.
   * Initializes ElementCache and TrayManager for comprehensive DOM management.
   * Sets up initial mode state and callback handler arrays.
   *
   * Side effects:
   * - Caches all button and tray DOM element references via #initializeButtonReferences and #initializeTrayReferences
   * - Creates ElementCache and TrayManager instances for efficient DOM access
   * - Sets placingShips=true, readyingShips=false for initial state
   * - Initializes empty arrays for tips and event listener cancellation handlers
   * - Sets up addText and removeText message suffixes
   *
   * @constructor
   * @param {string} territory - Territory identifier (e.g., 'friend', 'enemy', 'neutral')
   * @param {string} title - Display title for the placement UI panel
   * 
   * @property {boolean} placingShips - Whether currently in ship placement mode
   * @property {boolean} readyingShips - Whether ships are being finalized for battle
   * @property {ElementCache} elements - Cached DOM element references for efficient access
   * @property {TrayManager} trayManager - Tray visibility and item management system
   * @property {Array<any>} tips - Ship/weapon tip messages queue
   * @property {string} addText - Text appended to addition event messages
   * @property {string} removeText - Text appended to removal event messages
   * @property {Array<Function>} brushlistenCancellables - Brush event listener cancellation functions
   * @property {Array<Function>} placelistenCancellables - Placement event listener cancellation functions
   * @property {HTMLButtonElement|undefined} publishBtn - Publish/submit button element
   * @property {HTMLButtonElement|undefined} saveBtn - Save button element
   * @property {Array<Object>|undefined} ships - Array of available ships for placement
   */
  constructor (territory, title) {
    super(territory, title)
    this.placingShips = true
    this.readyingShips = false

    // Use ElementCache to eliminate repetitive document.getElementById() calls
    this.elements = new ElementCache()
    this.trayManager = new TrayManager(/** @type {any} */ (this.elements))

    // Initialize button references from cached elements
    this.#initializeButtonReferences()
    this.#initializeTrayReferences()

    this.tips = []
    this.addText = ' added'
    this.removeText = ' removed'
    this.brushlistenCancellables = []
    this.placelistenCancellables = []

    // Optional properties set by subclasses
    /** @type {HTMLButtonElement|undefined} */
    this.publishBtn = undefined
    /** @type {HTMLButtonElement|undefined} */
    this.saveBtn = undefined
    /** @type {Array<Object>|undefined} */
    this.ships = undefined
  }

  /**
   * Updates the state of change/clear button controls.
   * Base implementation is a no-op; subclasses (e.g., CustomUI) override as needed.
   * Called during drag-highlight operations to update UI state.
   *
   * @returns {void}
   */
  updateChangeClearButton () {
    // Base implementation - override in subclasses if needed
  }

  /**
   * Initializes all button element references from element cache.
   * Extracted to reduce constructor complexity and improve maintainability.
   * Casts all buttons to HTMLButtonElement for type safety.
   * Ensures all button properties are available for event binding and visibility control.
   *
   * Side effects:
   * - Assigns button properties (newPlacementBtn, rotateBtn, etc.) from this.elements.buttons
   * - Populates: newPlacementBtn, rotateBtn, rotateLeftBtn, flipBtn, transformBtn, testBtn, seekBtn, stopBtn, undoBtn, autoBtn
   *
   * @returns {void}
   */
  #initializeButtonReferences () {
    this.newPlacementBtn = /** @type {HTMLButtonElement} */ (
      this.elements.buttons.newPlacement
    )
    this.rotateBtn = /** @type {HTMLButtonElement} */ (
      this.elements.buttons.rotate
    )
    this.rotateLeftBtn = /** @type {HTMLButtonElement} */ (
      this.elements.buttons.rotateLeft
    )
    this.flipBtn = /** @type {HTMLButtonElement} */ (this.elements.buttons.flip)
    this.transformBtn = /** @type {HTMLButtonElement} */ (
      this.elements.buttons.transform
    )
    this.testBtn = /** @type {HTMLButtonElement} */ (this.elements.buttons.test)
    this.seekBtn = /** @type {HTMLButtonElement} */ (this.elements.buttons.seek)
    this.stopBtn = /** @type {HTMLButtonElement} */ (this.elements.buttons.stop)
    this.undoBtn = /** @type {HTMLButtonElement} */ (this.elements.buttons.undo)
    this.autoBtn = /** @type {HTMLButtonElement} */ (this.elements.buttons.auto)
  }

  /**
   * Initializes all tray element references from element cache.
   * Extracted to reduce constructor complexity and improve maintainability.
   * Casts all trays to HTMLDivElement for type safety.
   * Ensures all tray properties are available for item management.
   *
   * Side effects:
   * - Assigns tray properties (shipTray, planeTray, brushTray, weaponTray, etc.) from this.elements.trays
   * - Populates: trays, shipTray, planeTray, specialTray, brushTray, weaponTray, buildingTray
   *
   * @returns {void}
   */
  #initializeTrayReferences () {
    this.trays = /** @type {HTMLDivElement} */ (this.elements.trays.container)
    this.shipTray = /** @type {HTMLDivElement} */ (this.elements.trays.ship)
    this.planeTray = /** @type {HTMLDivElement} */ (this.elements.trays.plane)
    this.specialTray = /** @type {HTMLDivElement} */ (
      this.elements.trays.special
    )
    this.brushTray = /** @type {HTMLDivElement} */ (this.elements.trays.brush)
    this.weaponTray = /** @type {HTMLDivElement} */ (this.elements.trays.weapon)
    this.buildingTray = /** @type {HTMLDivElement} */ (
      this.elements.trays.building
    )
  }

  /**
   * Shows game status UI elements for current game mode and turn.
   * Removes hidden class from status elements and applies styling.
   *
   * Side effects:
   * - Shows gameStatus.game, gameStatus.mode, gameStatus.line elements
   * - Changes gameStatus.line from 'small' to 'medium' class
   * - Clears any queued status messages
   *
   * @returns {void}
   */
  showStatus () {
    gameStatus.game?.classList.remove(PlacementUI.#CSS_CLASSES.HIDDEN)
    gameStatus.mode?.classList.remove(PlacementUI.#CSS_CLASSES.HIDDEN)
    gameStatus.line?.classList.remove(PlacementUI.#CSS_CLASSES.HIDDEN, 'small')
    gameStatus.line?.classList.add('medium')
    gameStatus.clearQueue()
  }

  /**
   * Removes 'alt' styling class from all panel elements to reset to standard appearance.
   * Restores panels to normal theme when highlighted/focused state should be cleared.
   *
   * Side effects:
   * - Removes CSS class from all elements with PANEL class
   *
   * @returns {void}
   */
  standardPanels () {
    const panels = document.getElementsByClassName(
      PlacementUI.#CSS_CLASSES.PANEL
    )
    for (const panel of panels) {
      panel.classList.remove(PlacementUI.#CSS_CLASSES.ALT)
    }
  }

  /**
   * Hides all transformation control buttons (rotate, flip, undo, etc.).
   * Used to disable ship manipulation controls when no ship is selected.
   * All transformation is disabled until a new ship is selected.
   *
   * Side effects:
   * - Adds HIDDEN class to rotate, rotateLeft, transform, flip, undo, auto buttons via #setButtonsVisibility
   *
   * @returns {void}
   */
  hideTransformBtns () {
    const buttons = [
      this.rotateBtn,
      this.rotateLeftBtn,
      this.transformBtn,
      this.flipBtn,
      this.undoBtn,
      this.autoBtn
    ]
    this.#setButtonsVisibility(buttons, true)
  }

  /**
   * Shows transformation control buttons, conditionally showing transform button based on terrain capability.
   * Used when a ship is selected and manipulation is possible.
   * Enables rotation and flip controls. Transform button shown only if terrain supports transforms.
   *
   * Side effects:
   * - Removes HIDDEN class from rotate, rotateLeft, flip, undo, auto buttons via #setButtonsVisibility
   * - Conditionally shows/hides transform button based on bh.terrain.hasTransforms
   *
   * @returns {void}
   */
  showTransformBtns () {
    const buttons = [
      this.rotateBtn,
      this.rotateLeftBtn,
      this.flipBtn,
      this.undoBtn,
      this.autoBtn
    ]
    this.#setButtonsVisibility(buttons, false)

    if (bh.terrain.hasTransforms) {
      this.transformBtn?.classList.remove(PlacementUI.#CSS_CLASSES.HIDDEN)
    } else {
      this.transformBtn?.classList.add(PlacementUI.#CSS_CLASSES.HIDDEN)
    }
  }

  /**
   * Adds or removes hidden class from button collection.
   * Helper to reduce code duplication in visibility control methods.
   * Safely handles undefined buttons in the array.
   *
   * Side effects:
   * - Adds or removes HIDDEN class from all buttons based on hide parameter
   *
   * @param {(HTMLButtonElement|undefined)[]} buttons - Array of button elements to update
   * @param {boolean} hide - If true, add hidden class; if false, remove it
   * @returns {void}
   */
  #setButtonsVisibility (buttons, hide) {
    const action = hide ? 'add' : 'remove'
    buttons.forEach(btn => {
      if (btn) btn.classList[action](PlacementUI.#CSS_CLASSES.HIDDEN)
    })
  }

  /**
   * Iterates every board cell and calls the provided callback function.
   * Centralizes board cell iteration to prevent code duplication.
   * Early returns if board is not available.
   *
   * @param {(cell: HTMLElement) => void} callback - Function to invoke for each cell
   * @returns {void}
   */
  #forEachBoardCell (callback) {
    if (this.board) {
      for (const cell of this.board.children) {
        callback(/** @type {HTMLElement} */ (cell))
      }
    }
  }

  /**
   * Applies a consistent grid layout style for draggable preview elements.
   * Centralizes grid CSS setup to ensure consistency and ease maintenance.
   * Sets grid-template-rows/columns, gap, and box-size CSS variable for responsive sizing.
   *
   * Side effects:
   * - Sets element.style with grid layout attributes (display, grid-template-rows/columns, gap, CSS variables)
   * - Sets --boxSize CSS variable for use in grid calculations
   *
   * @param {HTMLElement} element - Container element to style with grid layout
   * @param {number} rows - Number of rows for grid layout
   * @param {number} cols - Number of columns for grid layout
   * @param {string} [boxSize] - Size of each grid cell box (defaults to computed cell size)
   * @returns {void}
   */
  #setGridDisplayStyle (element, rows, cols, boxSize = this.cellSizeString()) {
    element.setAttribute(
      'style',
      `display:grid;place-items: center;--boxSize:${boxSize};grid-template-rows:repeat(${rows}, var(--boxSize));grid-template-columns:repeat(${cols}, var(--boxSize));gap:0px;`
    )
  }

  /**
   * Sets disabled state on all placement control buttons (rotate, rotate-left, flip).
   * Consolidates button disabled state management into single call.
   * All three buttons always have the same disabled state.
   *
   * Side effects:
   * - Sets disabled property on rotateBtn, rotateLeftBtn, flipBtn
   *
   * @param {boolean} disabled - If true, disables buttons; if false, enables them
   * @returns {void}
   */
  #setPlacementControlsDisabled (disabled) {
    if (this.rotateBtn) this.rotateBtn.disabled = disabled
    if (this.rotateLeftBtn) this.rotateLeftBtn.disabled = disabled
    if (this.flipBtn) this.flipBtn.disabled = disabled
  }

  /**
   * Configures board cells for ship placement with standard drop and drag-enter handlers.
   * Consolidated pattern used by placement and additional weapon scenarios.
   * Clears existing styling and enables standard drag-drop interactions.
   *
   * Side effects:
   * - Clears visual styling from all board cells using ShipCellDisplayer.clearPlaceCell
   * - Invokes dragNDrop.drop() and dragNDrop.dragEnter() on each cell
   * - Calls additionalSetup callback on each cell if provided
   *
   * @param {GameModel} model - Game model containing placement rules and state
   * @param {(cell:HTMLElement)=>void} [additionalSetup] - Optional callback for additional cell configuration
   * @returns {void}
   */
  #configureBoardCellsForDrop (model, additionalSetup) {
    this.#forEachBoardCell(cell => {
      ShipCellDisplayer.clearPlaceCell(cell)
      if (additionalSetup) {
        additionalSetup(cell)
      }
      dragNDrop.drop(cell, model, this)
      dragNDrop.dragEnter(cell, model, this)
    })
  }

  /**
   * Prepares board cells for standard ship placement with drop handlers.
   * Clears existing visuals and enables drag-drop interactions.
   *
   * @param {GameModel} model - Game model with placement configuration
   * @returns {void}
   */
  makeDroppable (model) {
    this.#configureBoardCellsForDrop(model)
  }

  /**
   * Removes a dragged ship element and its container if empty.
   * Cleans up DOM after dragged ship is dropped or discarded.
   * Triggers tray check to update visibility state.
   *
   * Side effects:
   * - Removes dragShip from DOM
   * - Removes container if empty (no children left)
   * - Invokes trayManager.checkTrays() to validate visibility
   *
   * @param {HTMLElement} dragShip - Dragged ship element to remove
   * @returns {void}
   */
  removeDragShip (dragShip) {
    const container = dragShip.parentElement
    dragShip.remove()
    if (
      container?.classList.contains(
        PlacementUI.#CSS_CLASSES.DRAG_SHIP_CONTAINER
      ) &&
      container.children.length === 0
    ) {
      container.remove()
    }
    this.trayManager.checkTrays()
  }

  /**
   * Removes all visual highlight states from board cells.
   * Clears validity indicators (good/bad/worse classes).
   * Restores all cells to neutral appearance.
   *
   * Side effects:
   * - Removes all highlight CSS classes (good, notgood, bad, worse) from board cells
   *
   * @returns {void}
   */
  removeHighlight () {
    this.#forEachBoardCell(el => {
      PlacementUI.#HIGHLIGHT_CLASSES.forEach(cls => {
        el.classList.remove(cls)
      })
    })
  }

  /**
   * Removes clicked state from all elements and disables placement controls.
   * Resets UI to neutral state when selection is cleared.
   * Clears both visual selection and control state.
   *
   * Side effects:
   * - Removes CLICKED class from all elements with CLICKED class
   * - Disables all placement control buttons via #setPlacementControlsDisabled(true)
   *
   * @returns {void}
   */
  removeClicked () {
    const elements = document.getElementsByClassName(
      PlacementUI.#CSS_CLASSES.CLICKED
    )
    ;[...elements].forEach(element => {
      element.classList.remove(PlacementUI.#CSS_CLASSES.CLICKED)
    })

    this.#setPlacementControlsDisabled(true)
  }

  /**
   * Gets the last child element from a tray container.
   * Used for sequential item access and navigation through tray items.
   * Safe for empty trays (returns null).
   *
   * @param {HTMLElement} tray - Tray element to get last item from
   * @returns {Element|null} Last child element or null if tray is empty
   */
  lastItem (tray) {
    const items = tray.children
    const l = items.length
    return l === 0 ? null : items[l - 1]
  }

  /**
   * Gets the first tray item in the specified direction.
   * Convenience wrapper around DirectionMovement for consistent tray navigation.
   * Used for cursor-based item selection from directional input.
   *
   * @param {string} direction - Direction constant from DirectionMovement.DIRECTIONS
   * @returns {Element|null} First item element in specified direction or null
   */
  #getFirstTrayItemInDirection (direction) {
    if (!direction) return null
    return DirectionMovement.getFirstItem(
      direction,
      this.trayManager.elementCache.getAllTrays()
    )
  }

  /**
   * Gets the first tray item starting from the right (left-to-right navigation).
   * Delegates to #getFirstTrayItemInDirection for consistency.
   *
   * @returns {Element|null} First tray item from right or null
   */
  getFirstTrayItem () {
    return this.#getFirstTrayItemInDirection(DirectionMovement.DIRECTIONS.RIGHT)
  }

  /**
   * Gets the first tray item starting from bottom (bottom-to-top navigation).
   * Delegates to #getFirstTrayItemInDirection for consistency.
   *
   * @returns {Element|null} First tray item from bottom or null
   */
  getFirstTrayItemBottomUp () {
    return this.#getFirstTrayItemInDirection(DirectionMovement.DIRECTIONS.UP)
  }

  /**
   * Gets first tray item in direction specified by arrow key.
   * Converts arrow key to direction and retrieves corresponding item.
   * Used in tray navigation when cursor navigates directionally.
   *
   * @param {string} arrowkey - Arrow key code (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
   * @returns {Element|null} First item in specified direction or null
   */
  clickAssignByCursor (arrowkey) {
    const direction = DirectionMovement.fromArrowKey(arrowkey)
    if (!direction) return null
    return this.#getFirstTrayItemInDirection(direction)
  }

  /**
   * Moves to next tray item in specified direction with unified logic.
   * Delegates to DirectionMovement for consistent navigation behavior.
   * Used internally for arrow key navigation within trays.
   * Handles wrapping and boundary conditions.
   *
   * @param {string} arrowKey - Arrow key code for direction (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
   * @param {Array<HTMLDivElement>} trays - Array of tray container elements
   * @param {number} itemIndex - Current item index within current tray
   * @param {number} trayIndex - Current tray index within trays array
   * @returns {Element|null} Next item element or null if at boundary
   */
  moveNextTrayItem (arrowKey, trays, itemIndex, trayIndex) {
    const direction = DirectionMovement.fromArrowKey(arrowKey)
    if (!direction) return null
    return DirectionMovement.moveInDirection(
      direction,
      trays,
      itemIndex,
      trayIndex
    )
  }

  /**
   * Moves selection to next tray item based on arrow key, starting from currently selected ship.
   * Integrates with tray manager to get current ship position and apply directional movement.
   * Used for arrow key navigation starting from an already-selected ship.
   * Returns next item in specified direction or null if at boundary.
   *
   * @param {string} arrowKey - Arrow key code for direction (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
   * @param {any} clickedShip - Currently selected ship with source element reference
   * @returns {Element|null} Next ship element or null if at boundary
   */
  moveAssignByCursor (arrowKey, clickedShip) {
    const shipnode = clickedShip?.source
    if (!shipnode?.dataset) return null
    const shipId = Number.parseInt(
      shipnode.dataset[PlacementUI.#DATA_ATTRIBUTES.ID] || ''
    )

    if (!shipId || !shipnode) return null

    const adaptInfo = (
      /** @type {any} */ _child,
      /** @type {number} */ trayIndex,
      /** @type {number} */ itemIndex,
      /** @type {Array} */ trays
    ) => {
      return this.moveNextTrayItem(arrowKey, trays, itemIndex, trayIndex)
    }

    return /** @type {Element|null} */ (
      this.trayManager.getTrayItemInfo(shipId, adaptInfo)
    )
  }

  /**
   * Assigns ship selection via cursor navigation (arrow keys).
   * Moves from currently selected ship or starts at first item if none selected.
   * Finds corresponding ship in array and updates UI state with visual selection.
   * Early returns if element is invalid or ship not found.
   *
   * Side effects:
   * - Calls moveAssignByCursor or clickAssignByCursor to get next element
   * - Calls assignClicked to update selected ship state and UI
   *
   * @param {string} arrowkey - Arrow key code for direction (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
   * @param {Array<Ship>} ships - Array of available ships to search
   * @returns {void}
   */
  assignByCursor (arrowkey, ships) {
    let shipElement = null
    const clicked = dragNDrop.getClickedShip()
    if (clicked) shipElement = this.moveAssignByCursor(arrowkey, clicked)
    else shipElement = this.clickAssignByCursor(arrowkey)

    if (!shipElement || !(shipElement instanceof HTMLElement)) return

    const shipId = getShipIdFromElement(shipElement)
    const ship = ships.find(s => s?.id === shipId)
    if (ship && shipElement instanceof HTMLElement)
      this.assignClicked(ship, shipElement)
  }

  /**
   * Disables rotation and flip controls.
   * Used when deselecting ships or transitioning between UI states.
   * All transformation controls immediately disabled.
   *
   * Side effects:
   * - Disables rotateBtn, rotateLeftBtn, flipBtn via #setPlacementControlsDisabled(true)
   *
   * @returns {void}
   */
  disableRotateFlip () {
    this.#setPlacementControlsDisabled(true)
  }

  /**
   * Assigns a ship as the currently selected/clicked item and updates UI state.
   * Configures placement controls based on ship transformation capabilities.
   * Updates visual state and enables/disables relevant transformation buttons.
   * Initializes ClickedShip instance with callback for drag preview updates.
   *
   * Side effects:
   * - Removes previously clicked state via removeClicked()
   * - Shows ship tip/notice
   * - Creates and sets ClickedShip state via dragNDrop.setClickedShip()
   * - Adds CLICKED class to clicked element
   * - Updates button disabled states based on ship.canRotate(), ship.canFlip(), ship.canTransform()
   *
   * @param {Ship} ship - Ship object with shape() method and capability methods
   * @param {HTMLElement} clicked - Ship element in tray that was clicked
   * @returns {void}
   */
  assignClicked (ship, clicked) {
    const variantIndex = Number.parseInt(
      clicked.dataset[PlacementUI.#DATA_ATTRIBUTES.VARIANT] || '0'
    )
    this.removeClicked()
    const shape = ship?.shape?.()
    if (shape && 'tip' in shape && shape.tip) this.showNotice(shape.tip)
    const clickedShip = new ClickedShip(
      /** @type {any} */ (ship),
      clicked,
      variantIndex,
      this.setDragShipContents.bind(this)
    )
    dragNDrop.setClickedShip(clickedShip)
    clicked.classList.add(PlacementUI.#CSS_CLASSES.CLICKED)
    this.#setPlacementControlsDisabled(!clickedShip.canRotate())
    if (this.flipBtn) this.flipBtn.disabled = !clickedShip.canFlip()
    if (this.transformBtn)
      this.transformBtn.disabled = !clickedShip.canTransform()
  }

  /**
   * Assigns a weapon as the currently selected item and updates UI state.
   * Disables all placement controls since weapons cannot be transformed like ships.
   * Updates visual selection state and shows weapon tip/description.
   * Ensures ship selection is cleared when weapon is selected.
   *
   * Side effects:
   * - Removes previously clicked state via removeClicked()
   * - Shows weapon tip/notice
   * - Clears ship selection via dragNDrop.setClickedShip(null)
   * - Adds CLICKED class to clicked element
   * - Disables all placement control buttons via #setPlacementControlsDisabled(true)
   *
   * @param {Weapon} weapon - Weapon object with tip property
   * @param {HTMLElement} clicked - Weapon element in tray that was clicked
   * @returns {void}
   */
  assignClickedWeapon (weapon, clicked) {
    this.removeClicked()
    if (weapon?.tip) this.showNotice(weapon.tip)
    dragNDrop.setClickedShip(null)
    clicked.classList.add(PlacementUI.#CSS_CLASSES.CLICKED)
    this.#setPlacementControlsDisabled(true)
  }

  /**
   * Populates a drag preview with ship grid cells.
   * Iterates through ship board locations and creates cells based on board color data.
   * Sets grid layout and calls cell creation for each position.
   * Handles both occupied cells and empty cells.
   *
   * Side effects:
   * - Calls #setGridDisplayStyle to apply CSS grid layout
   * - Appends grid cells to dragShip for each board position via #createDragShipCell
   *
   * @param {HTMLElement} dragShip - Container element for drag preview grid cells
   * @param {Object} board - Ship board object with height, width, and cell color data
   * @param {string} letter - Ship letter for color/style lookup
   * @returns {void}
   */
  setDragShipContents (dragShip, board, letter) {
    const boardMask = /** @type {BoardMask} */ (board)
    const maxR = boardMask?.height || 0
    const maxC = boardMask?.width || 0
    this.#setGridDisplayStyle(dragShip, maxR, maxC)

    if (boardMask?.allXYlocations) {
      for (const [c, r] of boardMask.allXYlocations()) {
        const color = boardMask.at(c, r)
        this.#createDragShipCell(dragShip, letter, r, c, color)
      }
    }
  }

  /**
   * Calculates bounding extent (min/max rows/cols) of cell coordinate array.
   * Used to determine grid dimensions for splash effect visualization.
   * Computes dimensions based on cell positions.
   *
   * @param {Array<[number, number, number]>} cells - Array of [row, col, value] tuples
   * @returns {{minR: number, minC: number, rows: number, cols: number}} Object with extent dimensions
   */
  #getCellExtent (cells) {
    const minR = Math.min(...cells.map(s => s[0]))
    const minC = Math.min(...cells.map(s => s[1]))
    const maxR = Math.max(...cells.map(s => s[0])) + 1
    const maxC = Math.max(...cells.map(s => s[1])) + 1
    return {
      minR,
      minC,
      rows: maxR - minR,
      cols: maxC - minC
    }
  }

  /**
   * Populates drag preview with splash effect grid cells.
   * Calculates extent from cell array and creates grid with splash cells.
   * Displays splash damage pattern with power levels.
   *
   * Side effects:
   * - Calls #setGridDisplayStyle to apply CSS grid layout
   * - Appends splash cells to dragShip for each grid position
   *
   * @param {HTMLElement} dragShip - Container element for splash grid
   * @param {Array<[number, number, number]>} cells - Array of [row, col, power] tuples representing splash effect
   * @returns {void}
   */
  setSplashContents (dragShip, cells) {
    const { minR, minC, rows, cols } = this.#getCellExtent(cells)
    this.#setGridDisplayStyle(dragShip, rows, cols)

    for (let r = minR; r < minR + rows; r++) {
      for (let c = minC; c < minC + cols; c++) {
        this.#createSplashCell(dragShip, cells, r, c)
      }
    }
  }

  /**
   * Populates brush preview with terrain brush grid cells.
   * Creates checkerboard pattern with terrain-specific styling.
   * Shows brush size and terrain type in preview.
   *
   * Side effects:
   * - Calls #setGridDisplayStyle to apply CSS grid layout
   * - Appends brush cells via #appendBrushCell for each grid position
   *
   * @param {HTMLElement} brush - Container element for brush grid
   * @param {number} size - Size of brush grid (size x size)
   * @param {SubTerrain} subterrain - Terrain object with lightColor and tag properties
   * @returns {void}
   */
  setBrushContents (brush, size, subterrain) {
    this.#setGridDisplayStyle(brush, size, size)
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        this.#appendBrushCell(
          brush,
          r,
          c,
          subterrain.lightColor,
          subterrain.tag
        )
      }
    }
  }

  /**
   * Creates a single ship cell for drag preview grid.
   * Determines cell appearance based on board color value (empty vs occupied).
   * Uses ship colors from maps for consistent styling.
   *
   * Side effects:
   * - Appends grid cell to dragShip via #appendGridCell with appropriate styling
   *
   * @param {HTMLElement} dragShip - Grid container for cell
   * @param {string} letter - Ship letter for color/style lookup
   * @param {number} r - Row position
   * @param {number} c - Column position
   * @param {number} color - Board color value (0=empty, >0=occupied, >1=special)
   * @returns {void}
   */
  #createDragShipCell (dragShip, letter, r, c, color) {
    const maps = bh.maps

    if (color > 0) {
      this.#appendGridCell(dragShip, r, c, {
        bg: maps.shipColors[letter],
        fg: maps.shipLetterColors[letter],
        letter,
        isSpecial: color > 1
      })
    } else {
      this.#appendGridCell(dragShip, r, c, {
        classes: [PlacementUI.#CSS_CLASSES.EMPTY]
      })
    }
  }

  /**
   * Creates a splash effect cell for preview grid.
   * Finds matching cell from array and renders with splash tag or as empty.
   * Used in weapon splash effect visualization.
   *
   * Side effects:
   * - Appends grid cell to dragShip via #appendGridCell with splash styling or empty class
   *
   * @param {HTMLElement} dragShip - Grid container for cell
   * @param {Array<[number, number, number]>} cells - All splash cells in effect
   * @param {number} r - Row position
   * @param {number} c - Column position
   * @returns {void}
   */
  #createSplashCell (dragShip, cells, r, c) {
    const cell = cells.find(cell => cell[0] === r && cell[1] === c)
    if (cell && cell[2] >= 0) {
      this.#appendGridCell(dragShip, r, c, {
        classes: [bh.splashTags[cell[2]]]
      })
    } else {
      this.#appendGridCell(dragShip, r, c, {
        classes: [PlacementUI.#CSS_CLASSES.EMPTY]
      })
    }
  }

  /**
   * Creates a DOM element representing a single grid cell.
   * Initializes cell with CSS class and coordinate metadata.
   * Used as foundation for all grid cell creation.
   *
   * Side effects:
   * - Creates new div element and sets className and coordinates via setCellCoords
   *
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {HTMLDivElement} New cell element with coordinates set
   */
  #makeCell (r, c) {
    const cell = document.createElement('div')
    cell.className = PlacementUI.#CSS_CLASSES.CELL
    setCellCoords(cell, r, c)
    return cell
  }

  /**
   * Appends a styled grid cell to container with customizable appearance.
   * Unified cell creation method handling background, foreground, text, and classes.
   * Consolidates all grid cell styling logic for reuse across drag previews.
   *
   * Side effects:
   * - Creates cell via #makeCell
   * - Applies styling properties (bg, fg, letter, special class, additional classes)
   * - Appends cell to dragItem
   *
   * @param {HTMLElement} dragItem - Container element to append cell to
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {GridCellOptions} [options={}] - Styling options object
   * @returns {void}
   */
  #appendGridCell (
    dragItem,
    r,
    c,
    { bg, fg, letter, isSpecial = false, classes = [] } = {}
  ) {
    const cell = this.#makeCell(r, c)
    if (bg) cell.style.background = bg
    if (letter) cell.style.color = fg || '#ffd166'
    if (isSpecial) {
      cell.classList.add(PlacementUI.#CSS_CLASSES.SPECIAL)
    } else if (letter) {
      cell.textContent = letter
    }
    classes.forEach(className => {
      if (className) cell.classList.add(className)
    })
    dragItem.appendChild(cell)
  }

  /**
   * Appends a brush terrain cell with checkerboard pattern.
   * Creates alternating light/dark background based on coordinate parity.
   * Used to visualize brush size and terrain type.
   *
   * Side effects:
   * - Calls #appendGridCell to create and append cell with checkerboard styling (light/dark classes)
   *
   * @param {HTMLElement} dragItem - Container element to append cell to
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {string} bg - Background color for non-tagged terrain
   * @param {string} tag - Terrain tag for specialized styling
   * @returns {void}
   */
  #appendBrushCell (dragItem, r, c, bg, tag) {
    const checker = (r + c) % 2 === 0
    const classes = [
      checker ? PlacementUI.#CSS_CLASSES.LIGHT : PlacementUI.#CSS_CLASSES.DARK
    ]
    if (tag) classes.push(tag)
    this.#appendGridCell(dragItem, r, c, {
      bg: tag ? undefined : bg,
      classes
    })
  }

  /**
   * Builds tray item display for single or transformable ship form.
   * Creates drag preview for each available form with ship count.
   * Handles multi-form ships by creating separate items for each form.
   *
   * @param {ShipInfo} shipInfo - Ship information with shape and count
   * @param {HTMLElement} tray - Target tray element to add item to
   * @returns {void}
   */
  buildTrayItemPrint (shipInfo, tray) {
    const shape = shipInfo.shape
    if (shape.canTransform && shape.forms && shape.forms.length > 1) {
      for (const [index, form] of shape.forms.entries()) {
        this.#addTrayItem(form, index === 0 ? shipInfo.count : 1, tray)
      }
    } else {
      this.#addTrayItem(shape, shipInfo.count, tray)
    }
  }

  /**
   * Builds visual legend for weapon splash effects.
   * Creates grid showing each splash power level with label.
   * Displays all unique power levels found in splash cells.
   *
   * Side effects:
   * - Removes HIDDEN class on splash-legend element
   * - Appends splash visualization cells to tray organized by power level
   *
   * @param {Array<[number, number, number]>} cells - Array of [row, col, power] for splash cells
   * @param {Weapon} weapon - Weapon object with tag property
   * @param {Object<string, [number, number, number]>} legend - Map of power level to [r, c, power] tuple
   * @param {string} [splashType='splash'] - Type of splash (splash or crash)
   * @returns {void}
   */
  buildSplashLegend (cells, weapon, legend, splashType = 'splash') {
    const tray = document.getElementById(`${splashType}-legend-${weapon.tag}`)
    if (!tray) return
    tray.classList.remove(PlacementUI.#CSS_CLASSES.HIDDEN)
    let powerList = {}

    for (const cell of cells) {
      const power = cell[2]
      if (power >= 0) powerList[power] = [0, 0, power]
    }

    const splashCol = document.createElement('div')
    splashCol.className = PlacementUI.#CSS_CLASSES.SPLASH_COL
    for (const [key, [r, c, power]] of Object.entries(powerList)) {
      const dragShipContainer = UIElementBuilder.createDragContainer()
      dragShipContainer.className = PlacementUI.#CSS_CLASSES.SPLASH_CONTAINER
      const dragShip = UIElementBuilder.createDragElement(
        PlacementUI.#CSS_CLASSES.SPLASH_CELLS
      )
      dragShip.setAttribute(
        'style',
        `display:grid;place-items: center;--boxSize:${this.cellSizeString()};grid-template-rows:repeat(1, var(--boxSize));grid-template-columns:repeat(1, var(--boxSize));gap:0px;`
      )

      this.#createSplashCell(dragShip, [[r, c, power]], r, c)
      dragShipContainer.appendChild(dragShip)
      const label = UIElementBuilder.createLabel(legend[key])
      dragShipContainer.appendChild(label)
      splashCol.appendChild(dragShipContainer)
    }

    tray.appendChild(splashCol)
  }

  /**
   * Adds a ship or form to tray as draggable item with drag preview.
   * Simplified using UIElementBuilder to reduce duplication.
   * Creates container, drag element, and appends to tray with label.
   *
   * Side effects:
   * - Creates new DOM container and drag element
   * - Appends container to tray via UIElementBuilder.appendTrayItem
   * - Calls setDragShipContents to populate drag preview
   *
   * @param {ShipShape} shape - Shape object with board, letter, and descriptionText properties
   * @param {number} count - Number of ships of this type/form
   * @param {HTMLElement} tray - Tray element to add item to
   * @returns {void}
   */
  #addTrayItem (shape, count, tray) {
    const container = UIElementBuilder.createDragContainer({
      className: PlacementUI.#CSS_CLASSES.DRAG_SHIP_CONTAINER
    })
    const dragShip = UIElementBuilder.createDragElement()
    this.setDragShipContents(dragShip, shape.board, shape.letter)

    const labelText = shape.descriptionText + (count === 1 ? '' : ` x ${count}`)
    UIElementBuilder.appendTrayItem(tray, container, dragShip, labelText)
  }

  /**
   * Builds weapon splash effect display with title and splash pattern grid.
   * Creates visual representation of weapon's splash damage pattern.
   * Handles both splash and crash effect displays with consistent styling.
   *
   * Side effects:
   * - Sets splash title element innerHTML with weapon name and description
   * - Removes HIDDEN class on splash tray element
   * - Appends splash grid visualization container with label to tray
   * - Creates drag container and populates with splash grid cells
   *
   * @param {Array<[number, number, number]>} cells - Array of [row, col, power] for splash cells
   * @param {Weapon} weapon - Weapon object with name, tag, and letter properties
   * @param {string} [splashType='splash'] - Type of splash (splash or crash) for description lookup
   * @returns {void}
   */
  buildWeaponsSplashPrint (cells, weapon, splashType = 'splash') {
    const description = PlacementUI.#SPLASH_DESCRIPTIONS[splashType]

    const title = document.getElementById(`${splashType}-title-${weapon.tag}`)
    if (title) {
      title.classList.remove(PlacementUI.#CSS_CLASSES.HIDDEN)
      title.innerHTML = `<h5>${weapon.name} ${description}</h5>`
    }
    const tray = document.getElementById(`${splashType}-map-${weapon.tag}`)
    if (!tray) return
    tray.classList.remove(PlacementUI.#CSS_CLASSES.HIDDEN)

    const container = UIElementBuilder.createDragContainer({
      className: PlacementUI.#CSS_CLASSES.DRAG_SHIP_CONTAINER
    })
    const dragShip = UIElementBuilder.createDragElement()
    this.setSplashContents(dragShip, cells)
    UIElementBuilder.appendTrayItem(tray, container, dragShip, null)
  }

  /**
   * Creates a draggable ship element with grid preview and metadata.
   * Shrinks shape based on container height and creates drag element.
   * Handles ship variants for forms that vary by available space.
   *
   * Side effects:
   * - Creates new drag element DOM node
   * - Sets VARIANT, TYPE, ID data attributes on drag element
   * - Calls setDragShipContents to populate grid preview
   * - Invokes dragNDrop.makeDraggable to set up drag handlers
   * - Appends drag element to container
   *
   * @param {Array<Ship>} ships - All available ships for drag validation
   * @param {Ship} ship - Ship object with id, shape() method
   * @param {HTMLElement} container - Parent container to append drag element to
   * @param {number} cellHeight - Height to use for drag preview sizing
   * @returns {void}
   */
  buildDragShip (ships, ship, container, cellHeight) {
    const shape = ship.shape()
    const dragShip = document.createElement('div')
    dragShip.className = PlacementUI.#CSS_CLASSES.DRAG_SHIP
    const { index, board } = shape.infoShrunkUnder(cellHeight)
    dragShip.dataset[PlacementUI.#DATA_ATTRIBUTES.VARIANT] = index
    dragShip.dataset[PlacementUI.#DATA_ATTRIBUTES.TYPE] = 'ship'
    dragShip.dataset[PlacementUI.#DATA_ATTRIBUTES.ID] = ship.id
    this.setDragShipContents(dragShip, board, shape.letter)
    dragNDrop.makeDraggable(this, dragShip, ships)
    container.appendChild(dragShip)
  }

  /**
   * Builds weapon drag element with grid preview.
   * Converts weapon dragShape to mask for display grid setup.
   * Creates draggable preview for weapon placement.
   *
   * Side effects:
   * - Creates new drag element DOM node with DRAG_SHIP class
   * - Sets LETTER and TYPE ('weapon') data attributes on drag element
   * - Converts dragShape coordinates to Mask and calls setDragShipContents
   * - Invokes dragNDrop.makeDraggable to set up drag handlers for weapons
   * - Appends drag element to container
   *
   * @param {Weapon} weapon - Weapon object with letter, dragShape, and tag properties
   * @param {HTMLElement} container - Parent container to append drag element to
   * @returns {void}
   */
  buildDragWeapon (weapon, container) {
    const cells = weapon.dragShape.map(([r, c, value]) => [r, c, value + 1])
    const board = Mask.fromRCcoords(cells)
    const dragShip = document.createElement('div')
    dragShip.className = PlacementUI.#CSS_CLASSES.DRAG_SHIP
    dragShip.dataset[PlacementUI.#DATA_ATTRIBUTES.LETTER] = weapon.letter
    dragShip.dataset[PlacementUI.#DATA_ATTRIBUTES.TYPE] = 'weapon'

    this.setDragShipContents(dragShip, board, weapon.letter)
    dragNDrop.makeDraggable(this, dragShip, [], weapon)
    container.appendChild(dragShip)
  }

  /**
   * Adds a ship to appropriate tray based on its type.
   * Looks up tray by unit type and builds tray item with ship.
   * Routes ship to correct type-specific tray (ship, plane, special, etc.).
   *
   * Side effects:
   * - Creates new DOM container for ship item with ID data attribute
   * - Sets CELL_HEIGHT data attribute on tray
   * - Calls buildDragShip to populate drag preview
   *
   * @param {Array<Ship>} ships - All ships for drag validation
   * @param {Ship} ship - Ship to add to tray with id, type(), and properties
   * @param {HTMLElement} tray - Tray element to add item to
   * @param {number} [cellHeight] - Optional cell height for sizing
   * @returns {void}
   */
  buildTrayItem (ships, ship, tray, cellHeight) {
    const container = UIElementBuilder.createDragContainer({
      className: PlacementUI.#CSS_CLASSES.DRAG_SHIP_CONTAINER,
      dataset: { [PlacementUI.#DATA_ATTRIBUTES.ID]: ship.id }
    })
    tray.dataset[PlacementUI.#DATA_ATTRIBUTES.CELL_HEIGHT] = String(cellHeight)
    this.buildDragShip(ships, ship, container, cellHeight)
    UIElementBuilder.appendTrayItem(tray, container, null, null)
  }

  /**
   * Adds a weapon to weapon tray as draggable item.
   * Creates container and drag element for weapon preview.
   * Sets up draggable interaction for weapon placement.
   *
   * Side effects:
   * - Creates new DOM container with LETTER data attribute and appends to tray
   * - Calls buildDragWeapon to populate drag preview
   *
   * @param {Weapon} weapon - Weapon to add to tray with letter property
   * @param {HTMLElement} tray - Weapon tray element
   * @returns {void}
   */
  buildTrayItemWeapon (weapon, tray) {
    const container = UIElementBuilder.createDragContainer({
      className: PlacementUI.#CSS_CLASSES.DRAG_SHIP_CONTAINER,
      dataset: { [PlacementUI.#DATA_ATTRIBUTES.LETTER]: weapon.letter }
    })

    this.buildDragWeapon(weapon, container)
    UIElementBuilder.appendTrayItem(tray, container, null, null)
  }

  /**
   * Creates draggable brush element with preview grid.
   * Sets up brush size and terrain styling for drag operations.
   * Generates checkerboard preview showing brush size.
   *
   * Side effects:
   * - Creates brush container and drag element with size/ID data attributes
   * - Sets SIZE and ID data attributes on brush element
   * - Calls setBrushContents to populate checkerboard preview
   * - Invokes dragNDrop.makeBrushDraggable for interaction setup
   *
   * @param {number} size - Brush size (1-3)
   * @param {SubTerrain} subterrain - Terrain configuration with letter and styling
   * @param {HTMLElement} tray - Brush tray element to add item to
   * @returns {void}
   */
  buildBrush (size, subterrain, tray) {
    const brushContainer = UIElementBuilder.createDragContainer({
      className: PlacementUI.#CSS_CLASSES.DRAG_BRUSH_CONTAINER,
      dataset: {
        [PlacementUI.#DATA_ATTRIBUTES.ID]: subterrain.letter + size.toString()
      }
    })
    brushContainer.setAttribute(
      'style',
      'display: flex;justify-content: center;align-items: center;'
    )

    const brush = UIElementBuilder.createDragElement(
      PlacementUI.#CSS_CLASSES.DRAG_BRUSH
    )
    brush.dataset[PlacementUI.#DATA_ATTRIBUTES.SIZE] = String(size)
    brush.dataset[PlacementUI.#DATA_ATTRIBUTES.ID] =
      subterrain.letter + size.toString()
    this.setBrushContents(brush, size, subterrain)
    dragNDrop.makeBrushDraggable(brush, size, subterrain)
    UIElementBuilder.appendTrayItem(tray, brushContainer, brush, null)
  }

  /**
   * Rebuilds brush tray with all terrain variations and sizes.
   * Clears existing items and regenerates brush previews for all size/terrain combinations.
   * Handles missing brush tray gracefully.
   *
   * Side effects:
   * - Clears brushTray.innerHTML
   * - Appends brush items for each size in BRUSH_SIZES and each terrain variation
   *
   * @param {Object} terrain - Terrain object with subterrains array
   * @returns {void}
   */
  buildBrushTray (terrain) {
    if (!this.brushTray) return
    this.brushTray.innerHTML = ''
    const subterrains = terrain?.subterrains || []
    for (const size of PlacementUI.#BRUSH_SIZES) {
      for (const subterrain of subterrains) {
        this.buildBrush(size, subterrain, this.brushTray)
      }
    }
  }

  /**
   * Triggers tray visibility checks and updates.
   * Delegates to tray manager to validate and show/hide trays as needed.
   *
   * Side effects:
   * - Invokes trayManager.checkTrays() which may modify tray visibility
   *
   * @returns {void}
   */
  checkTrays () {
    this.trayManager.checkTrays()
  }

  /**
   * Rebuilds all unit trays (ships, planes, etc.) from ship list.
   * Partitions ships by type, creates tray items, and checks tray visibility.
   * Shows appropriate trays based on available ship types.
   *
   * Side effects:
   * - Removes HIDDEN class from appropriate trays by type
   * - Creates tray items for all ships via buildTrayItem
   * - Invokes checkTrays() to validate tray visibility and hide empty trays
   *
   * @param {Array<Ship>} ships - Array of all available ships with type() method
   * @returns {void}
   */
  buildTrays (ships) {
    const groups = this.#partitionShipsByType(ships)

    for (const type in groups) {
      const tray = this.getTrayOfType(type)
      tray.classList.remove(PlacementUI.#CSS_CLASSES.HIDDEN)
      const group = groups[type]
      const height = Ship.maxMinSizeIn(/** @type {any[]} */ (group))
      for (const ship of group) {
        this.buildTrayItem(ships, ship, tray, height)
      }
    }
    this.checkTrays()
  }

  /**
   * Partitions ships into groups by normalized unit type.
   * Consolidates type-based grouping logic with unit type normalization.
   * Maps M and T types to X (special unit) for consistent grouping.
   *
   * @param {Array<Ship>} ships - Array of ships to partition
   * @returns {Object<string, Array<Ship>>} Map of unit type to ship group
   */
  #partitionShipsByType (ships) {
    return /** @type {Object<string, Array<any>>} */ (
      ships.reduce((acc, ship) => {
        const type = this.#normalizeUnitType(ship.type())
        if (!acc[type]) acc[type] = []
        acc[type].push(ship)
        return acc
      }, {})
    )
  }

  /**
   * Builds weapon tray if terrain has unattached weapons.
   * Iterates through weapon list and creates tray items for each weapon.
   * Only builds tray if terrain.hasUnattachedWeapons is true.
   *
   * Side effects:
   * - Conditionally appends weapons to weaponTray
   * - Invokes buildTrayItemWeapon for each weapon in terrain.weapons.weapons
   *
   * @returns {void}
   */
  buildWeaponTray () {
    const thisTerrain = bh.terrain
    const weapons = thisTerrain.weapons.weapons
    if (thisTerrain.hasUnattachedWeapons) {
      for (const weapon of weapons) {
        this.buildTrayItemWeapon(weapon, this.weaponTray)
      }
    }
  }

  /**
   * Gets normalized unit type for ship, mapping M/T types to 'X'.
   * Consolidates unit type conversion logic for consistent categorization.
   * Used to group ships into logical tray categories.
   * Maps M (Missile) and T (Transport) to X (special unit group).
   *
   * @param {string} shipType - Ship type letter (S, A, M, T, G, etc.)
   * @returns {string} Normalized unit type, with M/T mapped to X
   * @private
   */
  #normalizeUnitType (shipType) {
    return PlacementUI.#UNIT_TYPE_MAP[shipType] || shipType
  }

  /**
   * Gets the tray element for a given unit type.
   * Looks up tray through element cache with error handling.
   * Used to find the correct tray for adding ships of specific types.
   * Supports all unit types: S (ship), A (aircraft), X (special), G (building).
   *
   * @param {string} type - Unit type letter (S, A, X for ships, G for buildings, etc.)
   * @returns {HTMLDivElement} Tray element for type
   * @throws {Error} If type is unknown or not found in element cache
   * @private
   */
  getTrayOfType (type) {
    return (
      this.elements.getTrayByType(type) ||
      (() => {
        throw new Error('Unknown type for ' + type)
      })()
    )
  }

  /**
   * Gets the notes/info element for a given unit type.
   * Returns appropriate info section for type using centralized mapping.
   * Used to update unit-specific information displays during placement.
   * Routes to planeNotes, shipNotes, specialNotes, buildingNotes, or weaponNotes.
   *
   * @param {string} type - Unit type letter (S, A, X, G for units, W for weapons)
   * @returns {HTMLDivElement} Notes element for type
   * @throws {Error} If type is unknown and not found in NOTES_ID_MAP
   * @private
   */
  getNotesOfType (type) {
    const noteId = PlacementUI.#NOTES_ID_MAP[type]
    if (!noteId) {
      throw new Error('Unknown type for ' + type)
    }
    return /** @type {HTMLDivElement} */ (document.getElementById(noteId))
  }

  /**
   * Splits ship array into groups by normalized unit type.
   * Creates a map of unit types to ship groups for categorization.
   * Used for organizing ships into unit-specific containers.
   * Normalizes types using #normalizeUnitType for consistency.
   *
   * @param {Array<Ship>} ships - Array of ships to split with type() method
   * @returns {Record<string, Record<string, {shape: ShipShape, count: number}>>} Map of unit type to ship group data
   * @private
   */
  splitUnits (ships) {
    return ships.reduce((acc, ship) => {
      const key = this.#normalizeUnitType(ship.type())
      const group = acc[key] || {}
      this.addShipToGroup(group, ship)
      acc[key] = group
      return acc
    }, {})
  }

  /**
   * Hides unit containers that have no ships of their type.
   * Shows only containers with ship counts > 0.
   * Updates UI visibility based on available ship inventory.
   * Invokes terrain module to control container visibility.
   *
   * Side effects:
   * - Counts ships by normalized type
   * - Invokes Terrain.showsUnits() to update container visibility for each type
   *
   * @param {Array<Ship>} ships - Ships to count by type with type() method
   * @returns {void}
   * @private
   */
  hideEmptyUnits (ships) {
    const counts = ships.reduce((acc, ship) => {
      const letter = this.#normalizeUnitType(ship.type())
      acc[letter] = (acc[letter] || 0) + 1
      return acc
    }, {})

    Terrain.showsUnits('-container', letter => {
      return counts[letter]
    })
  }

  /**
   * Adds a ship to the appropriate type tray.
   * Looks up tray by ship type and creates tray item with drag preview.
   * Routes ship to correct tray based on normalized type.
   * Handles height-based shrinking for ship variants.
   *
   * Side effects:
   * - Calls getTrayOfType to find target tray
   * - Calls buildTrayItem to create and append ship item to tray
   *
   * @param {Array<Ship>} ships - All ships for validation during drag
   * @param {Ship} ship - Ship to add with type() method and properties
   * @returns {void}
   * @throws {Error} If ship type is unknown or tray not found
   * @private
   */
  addShipToTrays (ships, ship) {
    const type = ship.type()
    if (type) {
      this.buildTrayItem(ships, ship, this.getTrayOfType(type))
    } else {
      throw new Error('Unknown type for ship ' + ship.letter)
    }
  }

  /**
   * Creates a tally box element displaying ship letter with ship colors.
   * Used in score display to show visual representation of placed ships.
   * Returns styled div with ship letter and color scheme from ship maps.
   *
   * Side effects:
   * - Creates new div element with TALLY_BOX class
   * - Sets text content to ship letter (or placeholder if no cells)
   * - Applies ship colors via ShipCellDisplayer.setShipCellColors
   *
   * @param {Ship} ship - Ship object with letter and cells properties
   * @returns {HTMLDivElement} Styled tally box element with ship letter and colors
   * @private
   */
  placeShipBox (ship) {
    const box = document.createElement('div')
    box.className = PlacementUI.#CSS_CLASSES.TALLY_BOX
    const letter = ship.letter
    if (ship.cells.length === 0) {
      box.textContent = ''
    } else {
      box.textContent = letter
    }
    ShipCellDisplayer.setShipCellColors(box, letter)
    return box
  }

  /**
   * Builds tally display of placed ships in score area.
   * Delegates to score component with custom ship display callback.
   * Shows visual representation of each placed ship in placement area.
   *
   * Side effects:
   * - Invokes this.score.buildShipTally() with placeShipBox callback
   *
   * @param {Array<Object>} ships - Ships to display in tally
   * @returns {void}
   * @private
   */
  placeTally (ships) {
    this.score.buildShipTally(ships, this.placeShipBox.bind(this))
  }

  /**
   * Displays placement event: shows notice, marks placed cells, updates score.
   * Orchestrates UI updates when ship is placed during initial placement phase.
   * Updates placement tally and ship info display with new placement.
   * Shows confirmation message to user.
   *
   * @param {Array<CoordinatePair>} placed - Array of [row, col] placed cells
   * @param {GameModel} model - Game model with ship list
   * @param {Ship} ship - Ship that was placed with letter, cells, and description
   * @returns {void}
   */
  placement (placed, model, ship) {
    this.showNotice(ship.getDescription() + this.addText)
    this.markPlaced(placed, ship)
    this.score.buildTallyFromModel(model, this)
    this.displayShipInfo(model.ships)
  }

  /**
   * Displays ship tracking information for additional placement phase.
   * Updates tally and zone info during weapon/addition phase.
   * Shows current add info and zone constraints for additional placements.
   *
   * @param {GameModel} model - Game model with loadout and ships
   * @returns {void}
   */
  displayShipTrackingInfo (model) {
    this.score.buildTallyFromModel(model, this)
    this.displayAddInfo(model)
    this.score.displayAddZoneInfo(model)
  }

  /**
   * Displays addition event: adds ship to model and updates UI state.
   * Used for adding additional ships after initial placement (weapons/ships phase).
   * Clones ship configuration and re-arms weapons for updated loadout.
   * Updates visual tally and placement info.
   *
   * Side effects:
   * - Shows notice with addition text suffix
   * - Marks placed cells on board via ShipCellDisplayer
   * - Adds ship to model.ships array
   * - Clones ship and updates candidateShips array
   * - Re-arms weapons for new ship configuration
   * - Updates score and add info display
   *
   * @param {Array<CoordinatePair>} placed - Array of [row, col] placed cells
   * @param {GameModel} model - Game model to update
   * @param {Ship} ship - Ship to add to model with id and clone method
   * @returns {string|number|undefined} ID of newly added ship clone
   */
  addition (placed, model, ship) {
    this.showNotice(ship.getDescription() + this.addText)
    this.markPlaced(placed, ship)

    model.ships.push(ship)
    const map = bh.map
    const newShip = ship.clone()
    const id = newShip.id
    map.addShips(model.ships)
    const index = model.candidateShips.findIndex(s => s.id === ship.id)
    model.candidateShips[index] = newShip

    model.armWeapons(map)
    return id
  }

  /**
   * Displays subtraction event: removes ship from model and updates UI.
   * Called when user removes an added ship during addition phase.
   * Updates display and recalculates weapon state after ship removal.
   *
   * Side effects:
   * - Shows notice with removal text suffix
   * - Removes ship from model.ships array by id match
   * - Re-arms weapons for updated ship configuration
   * - Updates score and add info display
   *
   * @param {GameModel} model - Game model to update
   * @param {Ship} ship - Ship to remove from model with id and description
   * @returns {void}
   */
  subtraction (model, ship) {
    this.showNotice(ship.getDescription() + this.removeText)
    const indexToRemove = model.ships.findIndex(s => s.id === ship.id)
    if (indexToRemove >= 0) model.ships.splice(indexToRemove, 1)
    model.armWeapons(bh.map)
    this.score.buildTallyFromModel(model, this)
    this.displayAddInfo(model)
    this.score.displayAddZoneInfo(model)
  }

  /**
   * Displays unplacement event: removes ship and updates score display.
   * Called when user removes ship during initial placement phase.
   * Updates ship info and placement tally with removal.
   *
   * @param {GameModel} model - Game model with ship list
   * @param {Ship} ship - Ship that was unplaced with description
   * @returns {void}
   */
  unplacement (model, ship) {
    this.showNotice(ship.getDescription() + this.removeText)
    this.score.buildTallyFromModel(model, this)
    this.displayShipInfo(model.ships)
  }

  /**
   * Updates additional placement UI with current model state.
   * Sets button disabled states and updates ship/ammo counts.
   * Called when model changes during addition phase.
   * Updates publish/save button states based on game readiness.
   *
   * @param {GameModel} model - Game model with ships and loadout
   * @returns {void}
   */
  displayAddInfo (model) {
    if (!model.ships) return
    this.publishBtn.disabled = model.hasPlayableShips()
    this.saveBtn.disabled = model.hasFewShips()
    this.score.placed.textContent = model.ships.length.toString()
    this.score.weaponsPlaced.textContent = model.loadOut.getAmmoCapacity()
  }

  /**
   * Gets total number of available ships.
   * Returns length of this.ships array.
   *
   * @returns {number} Total ship count available for placement
   */
  noOfShips () {
    return (this.ships ?? []).length
  }

  /**
   * Counts number of placed ships from array.
   * Filters ships with placed flag set to true.
   *
   * @param {Array<Object>} [ships] - Ships to count with placed property, defaults to this.ships
   * @returns {number} Number of placed ships
   */
  noOfPlacedShips (ships) {
    ships = ships ?? this.ships
    return ships.filter(s => s.placed).length
  }

  /**
   * Updates ship placement display in score area.
   * Shows placed/total count and triggers next stage callback if all placed.
   * Called whenever placement status changes to update UI.
   *
   * Side effects:
   * - Updates this.score.placed text content with placement count
   * - Calls gotoNextStageAfterPlacement() if all ships placed and placing mode active
   *
   * @param {Array<Object>} [ships] - Ships to display count for, defaults to this.ships
   * @returns {void}
   */
  displayShipInfo (ships) {
    ships = ships ?? this.ships
    if (!ships) return
    const total = ships.length
    const placed = this.noOfPlacedShips(ships)
    this.score.placed.textContent = `${placed} / ${total}`

    if (
      total === placed &&
      this.placingShips &&
      this.gotoNextStageAfterPlacement
    ) {
      this.gotoNextStageAfterPlacement()
    }
  }

  /**
   * Clears board and trays, resets UI to initial state.
   * Used when returning to placement phase or starting new game.
   *
   * Side effects:
   * - Clears board.innerHTML
   * - Clears all trays
   * - Updates ship count display
   *
   * @param {Array<any>} ships - Ships to display updated count for
   * @returns {void}
   */
  reset (ships) {
    if (this.board) this.board.innerHTML = ''
    this.trayManager.clearTrays()
    this.displayShipInfo(ships)
  }

  /**
   * Clears board and trays for addition phase, reinitializes weapons.
   * Called when transitioning to addition phase.
   *
   * Side effects:
   * - Clears board.innerHTML
   * - Clears all trays
   * - Invokes model.armWeapons() to reconfigure weapons
   * - Updates add info display
   *
   * @param {GameModel} model - Game model with weapons configuration and armWeapons method
   * @returns {void}
   */
  resetAdd (model) {
    if (this.board) this.board.innerHTML = ''
    this.trayManager.clearTrays()
    model.armWeapons?.()
    this.displayAddInfo(model)
  }
}

/**
 * Cursor direction mappings for arrow key navigation.
 * Maps arrow keys to row/column delta values for cursor movement with wrapping.
 * Used for grid cursor navigation with boundary wrapping.
 * @type {Object<string, CursorDirection>}
 * @private
 */
const CURSOR_DIRECTION_MAP = {
  ArrowUp: { dx: -1, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 }
}

/**
 * Handles grid cursor movement based on arrow key input.
 * Updates cursor position with wrapping at board boundaries.
 * Triggers grid highlighting for new position.
 * Integrates cursor movement with visual feedback system.
 *
 * Side effects:
 * - Modifies global cursor.x and cursor.y coordinates with boundary wrapping
 * - Invokes dragNDrop.highlight() to update visual feedback on board
 *
 * @param {KeyboardEvent} event - Keyboard event with arrow key property
 * @param {Object<string, any>} shipCellGrid - Ship grid model for highlighting with row/col dimensions
 * @param {PlacementUI} viewModel - UI view model with board and display methods
 * @returns {void}
 * @private
 */
function moveGridCursor (event, shipCellGrid, viewModel) {
  event.preventDefault()
  const map = bh.map
  const direction = CURSOR_DIRECTION_MAP[event.key]

  if (direction) {
    cursor.x += direction.dx
    cursor.y += direction.dy

    // Wrap cursor at board edges
    if (cursor.x < 0) cursor.x = map.cols - 1
    if (cursor.x >= map.cols) cursor.x = 0
    if (cursor.y < 0) cursor.y = map.rows - 1
    if (cursor.y >= map.rows) cursor.y = 0

    dragNDrop.highlight(viewModel, shipCellGrid, cursor.x, cursor.y)
  }
}

/**
 * Handles cursor-based navigation and item selection with arrow keys.
 * Routes to grid cursor movement or tray item selection based on cursor mode.
 * Respects placement state and drag operation status.
 * Supports both grid-based and tray-based cursor navigation.
 *
 * Early return conditions:
 * - viewModel.placingShips is false (not in placement mode)
 * - cursor.isDragging is true (drag operation in progress)
 *
 * @param {KeyboardEvent} event - Arrow key event (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
 * @param {PlacementUI} viewModel - PlacementUI instance with cursor navigation methods and placingShips flag
 * @param {GameModel} model - Game model with ship grid and ships array
 * @returns {void}
 */
export function moveCursorBase (event, viewModel, model) {
  if (!viewModel.placingShips || cursor.isDragging) return

  event.preventDefault()
  if (cursor.isGrid) {
    moveGridCursor(event, model.shipCellGrid, viewModel)
  } else {
    viewModel.assignByCursor(event.key, model.ships)
  }
}
