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
import { CellClassManager } from './helpers/CellClassManager.js'
import { ShipCellDisplayer } from './helpers/ShipCellDisplayer.js'

export class PlacementUI extends WatersUI {
  /**
   * CSS class names for styling and state management.
   * Centralizes string literals to prevent typos and enable consistency.
   * @type {Object<string, string>}
   * @private
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
   * @type {Object<string, string>}
   * @private
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
   * Consolidates type conversion logic in one place.
   * @type {Object<string, string>}
   * @private
   */
  static #UNIT_TYPE_MAP = {
    M: 'X',
    T: 'X'
  }

  /**
   * HTML element ID mappings for different unit type note sections.
   * Replaces switch statement with direct lookup.
   * @type {Object<string, string>}
   * @private
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
   * Centralizes user-facing descriptions.
   * @type {Object<string, string>}
   * @private
   */
  static #SPLASH_DESCRIPTIONS = {
    splash: 'splash damage on striking unit',
    crash: 'splash damage on missing all units and crashing into terrain'
  }

  /**
   * CSS highlight class names for cell validity states.
   * @type {string[]}
   * @private
   */
  static #HIGHLIGHT_CLASSES = ['good', 'notgood', 'bad', 'worse']

  /**
   * Brush size range for terrain brush generation.
   * @type {number[]}
   * @private
   */
  static #BRUSH_SIZES = [1, 2, 3]

  constructor (territory, title) {
    super(territory, title)
    this.placingShips = true
    this.readyingShips = false

    // Use ElementCache to eliminate repetitive document.getElementById() calls
    this.elements = new ElementCache()
    this.trayManager = new TrayManager(this.elements)

    // Initialize button references from cached elements
    this.#initializeButtonReferences()
    this.#initializeTrayReferences()

    this.tips = []
    this.addText = ' added'
    this.removeText = ' removed'
    this.brushlistenCancellables = []
    this.placelistenCancellables = []
  }

  /**
   * Initializes all button element references from element cache.
   * Extracted to reduce constructor complexity and improve maintainability.
   * All buttons are cast to HTMLButtonElement for type safety.
   *
   * @returns {void}
   * @private
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
   * All trays are cast to HTMLDivElement for type safety.
   *
   * @returns {void}
   * @private
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

  showStatus () {
    gameStatus.game.classList.remove(PlacementUI.#CSS_CLASSES.HIDDEN)
    gameStatus.mode.classList.remove(PlacementUI.#CSS_CLASSES.HIDDEN)
    gameStatus.line.classList.remove(PlacementUI.#CSS_CLASSES.HIDDEN, 'small')
    gameStatus.line.classList.add('medium')
    gameStatus.clearQueue()
  }

  /**
   * Removes 'alt' styling class from all panel elements to reset to standard appearance.
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
      this.transformBtn.classList.remove(PlacementUI.#CSS_CLASSES.HIDDEN)
    } else {
      this.transformBtn.classList.add(PlacementUI.#CSS_CLASSES.HIDDEN)
    }
  }

  /**
   * Adds or removes hidden class from button collection.
   * Helper to reduce code duplication in visibility control methods.
   *
   * @param {HTMLButtonElement[]} buttons - Array of button elements to update
   * @param {boolean} hide - If true, add hidden class; if false, remove it
   * @returns {void}
   * @private
   */
  #setButtonsVisibility (buttons, hide) {
    const action = hide ? 'add' : 'remove'
    buttons.forEach(btn =>
      btn.classList[action](PlacementUI.#CSS_CLASSES.HIDDEN)
    )
  }

  /**
   * Iterates every board cell and calls the provided callback function.
   * Centralizes board cell iteration to prevent code duplication.
   *
   * @param {(cell: HTMLElement) => void} callback - Function to invoke for each cell
   * @returns {void}
   * @private
   */
  #forEachBoardCell (callback) {
    for (const cell of this.board.children) {
      callback(/** @type {HTMLElement} */ (cell))
    }
  }

  /**
   * Applies a consistent grid layout style for draggable preview elements.
   * Centralizes grid CSS setup to ensure consistency and ease maintenance.
   * Sets grid-template-rows/columns, gap, and box-size CSS variable.
   *
   * @param {HTMLElement} element - Container element to style with grid layout
   * @param {number} rows - Number of rows for grid layout
   * @param {number} cols - Number of columns for grid layout
   * @param {string} [boxSize] - Size of each grid cell box (defaults to computed cell size)
   * @returns {void}
   * @private
   */
  #setGridDisplayStyle (element, rows, cols, boxSize = this.cellSizeString()) {
    element.setAttribute(
      'style',
      `display:grid;place-items: center;--boxSize:${boxSize};grid-template-rows:repeat(${rows}, var(--boxSize));grid-template-columns:repeat(${cols}, var(--boxSize));gap:0px;`
    )
  }

  /**
   * Sets disabled state on all placement control buttons (rotate, rotate-left, flip).
   * Consolidates button disabled state management.
   *
   * @param {boolean} disabled - If true, disables buttons; if false, enables them
   * @returns {void}
   * @private
   */
  #setPlacementControlsDisabled (disabled) {
    this.rotateBtn.disabled = disabled
    this.rotateLeftBtn.disabled = disabled
    this.flipBtn.disabled = disabled
  }

  /**
   * Configures board cells for ship placement with standard drop and drag-enter handlers.
   * Consolidated pattern used by placement and additional weapon scenarios.
   *
   * @param {Object} model - Game model containing placement rules and state
   * @param {Function} [additionalSetup] - Optional callback for additional cell configuration
   * @returns {void}
   * @private
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
   * @param {Object} model - Game model with placement configuration
   * @returns {void}
   */
  makeDroppable (model) {
    this.#configureBoardCellsForDrop(model)
  }

  /**
   * Prepares board cells for additional weapon placement with enhanced drop handlers.
   * Includes weapon-specific drop behavior in addition to standard handlers.
   *
   * @param {Object} model - Game model with weapon placement configuration
   * @returns {void}
   */
  makeAddDroppable (model) {
    dragNDrop.addWeaponDrop(model, this)
    this.#configureBoardCellsForDrop(model, cell => {
      dragNDrop.addDrop(cell, model, this)
    })
  }

  /**
   * Enables terrain brush dragging interactions on all board cells.
   * Prepares cells to respond to brush tool drag-enter events.
   *
   * @returns {void}
   */
  makeBrushable () {
    this.#forEachBoardCell(cell => {
      dragNDrop.dragBrushEnter(cell, this)
    })
  }

  /**
   * Removes a dragged ship element and its container if empty.
   * Cleans up DOM after dragged ship is dropped or discarded.
   * Triggers tray check to update visibility state.
   *
   * @param {HTMLElement} dragShip - Dragged ship element to remove
   * @returns {void}
   */
  removeDragShip (dragShip) {
    const container = dragShip.parentElement
    dragShip.remove()
    if (
      container.classList.contains(
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
   * Used for sequential item access and navigation.
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
   *
   * @param {string} direction - Direction constant from DirectionMovement.DIRECTIONS
   * @returns {Element|null} First item element in specified direction or null
   * @private
   */
  #getFirstTrayItemInDirection (direction) {
    return DirectionMovement.getFirstItem(
      direction,
      this.trayManager.elementCache.getAllTrays()
    )
  }

  /**
   * Gets the first tray item starting from the right (left-to-right navigation).
   *
   * @returns {Element|null} First tray item from right or null
   */
  getFirstTrayItem () {
    return this.#getFirstTrayItemInDirection(DirectionMovement.DIRECTIONS.RIGHT)
  }

  /**
   * Gets the first tray item starting from bottom (bottom-to-top navigation).
   *
   * @returns {Element|null} First tray item from bottom or null
   */
  getFirstTrayItemBottomUp () {
    return this.#getFirstTrayItemInDirection(DirectionMovement.DIRECTIONS.UP)
  }

  /**
   * Gets first tray item in direction specified by arrow key.
   * Converts arrow key to direction and retrieves corresponding item.
   *
   * @param {string} arrowkey - Arrow key code (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
   * @returns {Element|null} First item in specified direction or null
   */
  clickAssignByCursor (arrowkey) {
    const direction = DirectionMovement.fromArrowKey(arrowkey)
    return this.#getFirstTrayItemInDirection(direction)
  }

  /**
   * Moves to next tray item in specified direction with unified logic.
   * Delegates to DirectionMovement for consistent navigation behavior.
   *
   * @param {string} arrowKey - Arrow key code for direction
   * @param {HTMLElement[]} trays - Array of tray container elements
   * @param {number} itemIndex - Current item index within tray
   * @param {number} trayIndex - Current tray index within trays array
   * @returns {Element|null} Next item element or null if at boundary
   */
  moveNextTrayItem (arrowKey, trays, itemIndex, trayIndex) {
    const direction = DirectionMovement.fromArrowKey(arrowKey)
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
   *
   * @param {string} arrowKey - Arrow key code for direction
   * @param {Object} clickedShip - Currently selected ship with source element reference
   * @returns {Element|null} Next ship element or null if at boundary
   */
  moveAssignByCursor (arrowKey, clickedShip) {
    let shipnode = clickedShip.source
    const shipId = Number.parseInt(
      shipnode.dataset[PlacementUI.#DATA_ATTRIBUTES.ID]
    )

    if (shipId === null || shipnode === null) return null

    const adaptInfo = (child, trayIndex, itemIndex, trays) => {
      return this.moveNextTrayItem(arrowKey, trays, itemIndex, trayIndex)
    }

    return this.trayManager.getTrayItemInfo(shipId, adaptInfo)
  }

  /**
   * Assigns ship selection via cursor navigation (arrow keys).
   * Moves from currently selected ship or starts at first item if none selected.
   * Finds corresponding ship and updates UI state.
   *
   * @param {string} arrowkey - Arrow key code for direction
   * @param {Object[]} ships - Array of available ships to search
   * @returns {void}
   */
  assignByCursor (arrowkey, ships) {
    let shipElement = null
    const clicked = dragNDrop.getClickedShip()
    if (clicked) shipElement = this.moveAssignByCursor(arrowkey, clicked)
    else shipElement = this.clickAssignByCursor(arrowkey)

    if (shipElement === null) return

    const shipId = getShipIdFromElement(shipElement)
    const ship = ships.find(s => s.id === shipId)
    if (ship && shipElement) this.assignClicked(ship, shipElement)
  }

  /**
   * Disables rotation and flip controls.
   * Used when deselecting ships or transitioning between UI states.
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
   *
   * @param {Object} ship - Ship object with shape, id, and capability methods
   * @param {HTMLElement} clicked - Ship element in tray that was clicked
   * @returns {void}
   */
  assignClicked (ship, clicked) {
    const variantIndex = Number.parseInt(
      clicked.dataset[PlacementUI.#DATA_ATTRIBUTES.VARIANT]
    )
    this.removeClicked()
    const shape = ship.shape()
    this.showNotice(shape.tip)
    const clickedShip = new ClickedShip(
      ship,
      clicked,
      variantIndex,
      this.setDragShipContents.bind(this)
    )
    dragNDrop.setClickedShip(clickedShip)
    clicked.classList.add(PlacementUI.#CSS_CLASSES.CLICKED)
    this.#setPlacementControlsDisabled(!clickedShip.canRotate())
    this.flipBtn.disabled = !clickedShip.canFlip()
    this.transformBtn.disabled = !clickedShip.canTransform()
  }

  /**
   * Assigns a weapon as the currently selected item and updates UI state.
   * Disables all placement controls since weapons cannot be transformed like ships.
   *
   * @param {Object} weapon - Weapon object with tip property
   * @param {HTMLElement} clicked - Weapon element in tray that was clicked
   * @returns {void}
   */
  assignClickedWeapon (weapon, clicked) {
    this.removeClicked()
    this.showNotice(weapon.tip)
    dragNDrop.setClickedShip(null)
    clicked.classList.add(PlacementUI.#CSS_CLASSES.CLICKED)
    this.#setPlacementControlsDisabled(true)
  }

  /**
   * Populates a drag preview with ship grid cells.
   * Iterates through ship board locations and creates cells based on board color data.
   * Sets grid layout and calls cell creation for each position.
   *
   * @param {HTMLElement} dragShip - Container element for drag preview grid cells
   * @param {Object} board - Ship board object with height, width, and cell color data
   * @param {string} letter - Ship letter for color/style lookup
   * @returns {void}
   */
  setDragShipContents (dragShip, board, letter) {
    const maxR = board.height
    const maxC = board.width
    this.#setGridDisplayStyle(dragShip, maxR, maxC)

    for (const [c, r] of board.allXYlocations()) {
      const color = board.at(c, r)
      this.#createDragShipCell(dragShip, letter, r, c, color)
    }
  }

  /**
   * Calculates bounding extent (min/max rows/cols) of cell coordinate array.
   * Used to determine grid dimensions for splash effect visualization.
   *
   * @param {Array<[number, number, number]>} cells - Array of [row, col, value] tuples
   * @returns {Object} Object with minR, minC, rows, cols properties defining the extent
   * @private
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
   *
   * @param {HTMLElement} brush - Container element for brush grid
   * @param {number} size - Size of brush grid (size x size)
   * @param {Object} subterrain - Terrain object with lightColor and tag properties
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
   *
   * @param {HTMLElement} dragShip - Grid container for cell
   * @param {string} letter - Ship letter for color/style lookup
   * @param {number} r - Row position
   * @param {number} c - Column position
   * @param {number} color - Board color value (0=empty, >0=occupied, >1=special)
   * @returns {void}
   * @private
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
   *
   * @param {HTMLElement} dragShip - Grid container for cell
   * @param {Array<[number, number, number]>} cells - All splash cells in effect
   * @param {number} r - Row position
   * @param {number} c - Column position
   * @returns {void}
   * @private
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
   *
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {HTMLDivElement} New cell element with coordinates set
   * @private
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
   * Consolidates all grid cell styling logic.
   *
   * @param {HTMLElement} dragItem - Container element to append cell to
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {Object} [options] - Styling options
   * @param {string} [options.bg] - Background color CSS value
   * @param {string} [options.fg] - Foreground (text) color CSS value
   * @param {string} [options.letter] - Text content (ship/weapon letter)
   * @param {boolean} [options.isSpecial=false] - Whether cell is special (affects styling)
   * @param {string[]} [options.classes=[]] - Additional CSS class names to apply
   * @returns {void}
   * @private
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
   *
   * @param {HTMLElement} dragItem - Container element to append cell to
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {string} bg - Background color for non-tagged terrain
   * @param {string} tag - Terrain tag for specialized styling
   * @returns {void}
   * @private
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
   * Updates cell at specified board coordinates to display placed ship.
   * Convenience method combining grid lookup and display.
   *
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {Object} ship - Ship object to display
   * @returns {void}
   */
  cellPlacedAt (r, c, ship) {
    const cell = this.gridCellAt(r, c)
    ShipCellDisplayer.displayPlacedCell(ship, r, c, cell)
  }

  /**
   * Builds tray item display for single or transformable ship form.
   * Creates drag preview for each available form and counts.
   *
   * @param {Object} shipInfo - Ship information with shape and count
   * @param {Object} shipInfo.shape - Ship shape/form object
   * @param {number} shipInfo.count - Number of ships of this type
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
   *
   * @param {Array<[number, number, number]>} cells - Array of [row, col, power] for splash cells
   * @param {Object} weapon - Weapon object with tag property
   * @param {Object<string, string>} legend - Map of power level to legend text
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
   * Creates container, drag element, and appends to tray.
   *
   * @param {Object} shape - Shape object with board and letter properties
   * @param {number} count - Number of ships of this type/form
   * @param {HTMLElement} tray - Tray element to add item to
   * @returns {void}
   * @private
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
   *
   * @param {Array<[number, number, number]>} cells - Array of [row, col, power] for splash cells
   * @param {Object} weapon - Weapon object with name and tag properties
   * @param {string} [splashType='splash'] - Type of splash (splash or crash) for description
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
   * Sets up drag properties and initializes grid display for ship board.
   *
   * @param {Object[]} ships - All ships in game (for drag validation)
   * @param {Object} ship - Ship object to create drag element for
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
   * Creates a draggable weapon element with grid preview and metadata.
   * Converts weapon shape to mask for display grid setup.
   *
   * @param {Object} weapon - Weapon object with letter and dragShape properties
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
    dragNDrop.makeDraggable(this, dragShip, null, weapon)
    container.appendChild(dragShip)
  }

  /**
   * Adds a ship to appropriate tray based on its type.
   * Looks up tray by unit type and builds tray item with ship.
   *
   * @param {Object[]} ships - All ships for drag validation
   * @param {Object} ship - Ship to add to tray
   * @param {HTMLElement} tray - Tray element to add item to
   * @param {number} [cellHeight] - Optional cell height for sizing
   * @returns {void}
   */
  buildTrayItem (ships, ship, tray, cellHeight) {
    const container = UIElementBuilder.createDragContainer({
      className: PlacementUI.#CSS_CLASSES.DRAG_SHIP_CONTAINER,
      dataset: { [PlacementUI.#DATA_ATTRIBUTES.ID]: ship.id }
    })
    tray.dataset[PlacementUI.#DATA_ATTRIBUTES.CELL_HEIGHT] = cellHeight
    this.buildDragShip(ships, ship, container, cellHeight)
    UIElementBuilder.appendTrayItem(tray, container, null, null)
  }

  /**
   * Adds a weapon to weapon tray as draggable item.
   * Creates container and drag element for weapon preview.
   *
   * @param {Object} weapon - Weapon to add to tray
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
   *
   * @param {number} size - Brush size (1-3)
   * @param {Object} subterrain - Terrain configuration with letter and styling
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
    brush.dataset[PlacementUI.#DATA_ATTRIBUTES.SIZE] = size
    brush.dataset[PlacementUI.#DATA_ATTRIBUTES.ID] =
      subterrain + size.toString()
    this.setBrushContents(brush, size, subterrain)
    dragNDrop.makeBrushDraggable(brush, size, subterrain)
    UIElementBuilder.appendTrayItem(tray, brushContainer, brush, null)
  }

  /**
   * Rebuilds brush tray with all terrain variations and sizes.
   * Clears existing items and regenerates brush previews.
   *
   * @param {Object} terrain - Terrain object with subterrains array
   * @returns {void}
   */
  buildBrushTray (terrain) {
    this.brushTray.innerHTML = ''
    for (const size of PlacementUI.#BRUSH_SIZES) {
      for (const subterrain of terrain.subterrains) {
        this.buildBrush(size, subterrain, this.brushTray)
      }
    }
  }

  /**
   * Triggers tray visibility checks and updates.
   * Delegates to tray manager to validate and show/hide trays as needed.
   *
   * @returns {void}
   */
  checkTrays () {
    this.trayManager.checkTrays()
  }

  /**
   * Rebuilds all unit trays (ships, planes, etc.) from ship list.
   * Partitions ships by type, creates tray items, and checks tray visibility.
   *
   * @param {Object[]} ships - Array of all available ships
   * @returns {void}
   */
  buildTrays (ships) {
    const groups = this.#partitionShipsByType(ships)

    for (const type in groups) {
      const tray = this.getTrayOfType(type)
      tray.classList.remove(PlacementUI.#CSS_CLASSES.HIDDEN)
      const group = groups[type]
      const height = Ship.maxMinSizeIn(group)
      for (const ship of group) {
        this.buildTrayItem(ships, ship, tray, height)
      }
    }
    this.checkTrays()
  }

  /**
   * Partitions ships into groups by normalized unit type.
   * Consolidates type-based grouping logic with unit type normalization.
   *
   * @param {Object[]} ships - Array of ships to partition
   * @returns {Object<string, Object[]>} Map of unit type to ship group
   * @private
   */
  #partitionShipsByType (ships) {
    return ships.reduce((acc, ship) => {
      const type = this.#normalizeUnitType(ship.type())
      if (!acc[type]) acc[type] = []
      acc[type].push(ship)
      return acc
    }, {})
  }

  /**
   * Builds weapon tray if terrain has unattached weapons.
   * Iterates through weapon list and creates tray items.
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
   * Consolidates unit type conversion logic.
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
   *
   * @param {string} type - Unit type letter
   * @returns {HTMLElement} Tray element for type
   * @throws {Error} If type is unknown
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
   *
   * @param {string} type - Unit type letter
   * @returns {HTMLElement|null} Notes element for type or null if not found
   * @throws {Error} If type is unknown
   */
  getNotesOfType (type) {
    const noteId = PlacementUI.#NOTES_ID_MAP[type]
    if (!noteId) {
      throw new Error('Unknown type for ' + type)
    }
    return document.getElementById(noteId)
  }

  /**
   * Adds a ship to a group/map accumulator, incrementing count.
   * Used in reduce operations for grouping ships by letter.
   *
   * @param {Object<string, Object>} group - Accumulator map of ships by letter
   * @param {Object} ship - Ship to add to group
   * @returns {void}
   * @private
   */
  #addToGroup (group, ship) {
    const key = ship.letter
    let value = group[key] || { shape: ship.shape(), count: 0 }
    value.count++
    group[key] = value
  }

  /**
   * Splits ship array into groups by normalized unit type.
   * Creates a map of unit types to ship groups for categorization.
   *
   * @param {Object[]} ships - Array of ships to split
   * @returns {Object<string, Object>} Map of unit type to ship group map
   */
  splitUnits (ships) {
    return ships.reduce((acc, ship) => {
      const key = this.#normalizeUnitType(ship.type())
      const group = acc[key] || {}
      this.#addToGroup(group, ship)
      acc[key] = group
      return acc
    }, {})
  }

  /**
   * Hides unit containers that have no ships of their type.
   * Shows only containers with ship counts > 0.
   *
   * @param {Object[]} ships - Ships to count by type
   * @returns {void}
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
   * Looks up tray by ship type and creates tray item.
   *
   * @param {Object[]} ships - All ships for validation
   * @param {Object} ship - Ship to add
   * @returns {void}
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
   *
   * @param {Object} ship - Ship object with letter and cells properties
   * @returns {HTMLElement} Styled tally box element
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
   * Delegates to score component with ship display callback.
   *
   * @param {Object[]} ships - Ships to display in tally
   * @returns {void}
   */
  placeTally (ships) {
    this.score.buildShipTally(ships, this.placeShipBox.bind(this))
  }

  /**
   * Displays placement event: shows notice, marks placed cells, updates score.
   * Orchestrates UI updates when ship is placed during placement phase.
   *
   * @param {Array<[number, number]>} placed - Array of [row, col] placed cells
   * @param {Object} model - Game model with ship list
   * @param {Object} ship - Ship that was placed
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
   *
   * @param {Object} model - Game model with loadout and ships
   * @returns {void}
   */
  displayShipTrackingInfo (model) {
    this.score.buildTallyFromModel(model, this)
    this.displayAddInfo(model)
    this.score.displayAddZoneInfo(model)
  }

  /**
   * Displays addition event: adds ship to model and updates UI state.
   * Used for adding additional ships after initial placement (weapons/ships).
   *
   * @param {Array<[number, number]>} placed - Array of placed cells
   * @param {Object} model - Game model to update
   * @param {Object} ship - Ship to add to model
   * @returns {string|number} ID of newly added ship
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
   *
   * @param {Object} model - Game model to update
   * @param {Object} ship - Ship to remove from model
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
   *
   * @param {Object} model - Game model
   * @param {Object} ship - Ship that was unplaced
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
   *
   * @param {Object} model - Game model with ships and loadout
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
   *
   * @returns {number} Total ship count
   */
  noOfShips () {
    return this.ships.length
  }

  /**
   * Counts number of placed ships from array.
   * Filters ships with placed flag set to true.
   *
   * @param {Object[]} [ships=this.ships] - Ships to count, defaults to this.ships
   * @returns {number} Number of placed ships
   */
  noOfPlacedShips (ships = this.ships) {
    return ships.filter(s => s.placed).length
  }

  /**
   * Updates ship placement display in score area.
   * Shows placed/total count and triggers next stage callback if all placed.
   * Called whenever placement status changes.
   *
   * @param {Object[]} [ships=this.ships] - Ships to display, defaults to this.ships
   * @returns {void}
   */
  displayShipInfo (ships = this.ships) {
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
   * @param {Object[]} ships - Ships to display updated count for
   * @returns {void}
   */
  reset (ships) {
    this.board.innerHTML = ''
    this.trayManager.clearTrays()
    this.displayShipInfo(ships)
  }

  /**
   * Clears board and trays for addition phase, reinitializes weapons.
   * Called when transitioning to addition phase.
   *
   * @param {Object} model - Game model with weapons configuration
   * @returns {void}
   */
  resetAdd (model) {
    this.board.innerHTML = ''
    this.trayManager.clearTrays()
    model.armWeapons()
    this.displayAddInfo(model)
  }
  /**
   * Adds a marked-as-placed visual to ship cell and surroundings.
   * Calls display surround with callbacks to render miss/surround effects.
   *
   * @param {Array<[number, number]>} cells - Placed cell coordinates
   * @param {Object} ship - Ship that was placed
   * @returns {void}
   */
  markPlaced (cells, ship) {
    this.displaySurround(
      cells,
      ship,
      (r, c) => {
        this.cellMiss(r, c)
        this.surroundShipCellAt(ship, r, c)
      },
      (c, r, ship) => this.cellPlacedAt(r, c, ship)
    )
  }
}

/**
 * Cursor direction mappings for arrow key navigation.
 * Maps arrow keys to row/column delta values.
 * @type {Object<string, {dx: number, dy: number}>}
 * @private
 */
const CURSOR_DIRECTION_MAP = {
  ArrowUp: { dx: -1, dy: 0 },
  ArrowDown: { dx: 1, dy: 0 },
  ArrowLeft: { dx: 0, dy: -1 },
  ArrowRight: { dx: 0, dy: 1 }
}

/**
 * Handles grid cursor movement based on arrow key input.
 * Updates cursor position with wrapping at board boundaries.
 * Triggers grid highlighting for new position.
 *
 * @param {KeyboardEvent} event - Keyboard event with arrow key
 * @param {Object} shipCellGrid - Ship grid model for highlighting
 * @param {Object} viewModel - UI view model with cursor state
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
    if (cursor.x < 0) cursor.x = map.rows - 1
    if (cursor.x >= map.rows) cursor.x = 0
    if (cursor.y < 0) cursor.y = map.cols - 1
    if (cursor.y >= map.cols) cursor.y = 0

    dragNDrop.highlight(viewModel, shipCellGrid, cursor.x, cursor.y)
  }
}

/**
 * Handles cursor-based navigation and item selection with arrow keys.
 * Routes to grid cursor movement or tray item selection based on cursor mode.
 * Respects placement state and drag operation status.
 *
 * @param {KeyboardEvent} event - Arrow key event
 * @param {Object} viewModel - PlacementUI instance with cursor navigation methods
 * @param {Object} model - Game model with ship grid and ships
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

/**
 * Partitions array items into groups based on property getter function.
 * Utility function for array grouping/bucketing operations.
 * Used to organize ships by type, weapons by category, etc.
 *
 * @param {*[]} arr - Array to partition
 * @param {Function} propgetter - Function that returns grouping key for item
 * @returns {Object<string|number, *[]>} Map of key to items in group
 */
function partitionBy (arr, propgetter) {
  return arr.reduce((acc, item) => {
    const key = propgetter(item)
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})
}
