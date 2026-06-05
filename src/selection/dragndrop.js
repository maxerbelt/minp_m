/**
 * @fileoverview Drag-and-drop system for ship placement, weapon management, and terrain painting.
 * Orchestrates drag state management, ghost preview generation, highlight rendering, and drop
 * operations across the game board. Provides unified coordination for multiple drag-drop types:
 * ship placement during setup, ship repositioning during gameplay, weapon dragging, and terrain
 * brush painting. Handles both mouse events and keyboard shortcuts for transformation controls.
 *
 * @module dragndrop
 * @requires src/terrains/all/js/bh.js - Terrain configuration and biome helpers
 * @requires src/selection/DraggedShip.js - Ghost ship preview class
 * @requires src/selection/Brush.js - Terrain brush painting class
 * @requires src/selection/cursor.js - Cursor management module
 * @requires src/core/utilities.js - Coordinate conversion and grid utilities
 *
 * @typedef {Object} DragDropEventData
 * @property {DraggedShip|DraggedWeapon|Brush|null} selection - Currently selected drag item
 * @property {[number, number]} lastEntered - Last entered cell coordinates [row, col]
 * @property {Object|null} clickedShip - Ship selected via UI for transforms
 * @property {string} lastModifier - Last keyboard modifier ('shift', 'ctrl', 'alt', etc.)
 * @property {number} dragCounter - Counter for nested drag events (dragenter/dragleave)
 *
 * @import type { ViewModel, ShipElement } from './types/ui.types.js';
 * @import type { Model, Weapon, PlacementData } from './types/placement.types.js';
 * @import type { Ship } from './types/domain.types.js';
 * @import type { CursorPosition } from './types/ui.types.js';
 */

import { bh } from '../terrains/all/js/bh.js'
import { xyFromCell } from '../core/utilities.js'
import { DraggedShip } from './DraggedShip.js'
import { Brush } from './Brush.js'
import { cursor } from './cursor.js'
import { CustomMap } from '../terrains/all/js/map.js'

function strictEqual (a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}
function pairEqual (a, b) {
  return a[0] === b[0] && a[1] === b[1]
}

/**
 * Manages drag-and-drop state for ships and weapons.
 * Encapsulates module-level state to avoid side effects and enable predictable state management.
 * Tracks currently selected item, modifier keys, cursor position, and nested drag events.
 *
 * @class DragDropState
 * @description Maintains mutable state for drag-and-drop operations including selection, last entered cell, and modifier keys.
 * Provides methods to reset and synchronize state after drag operations complete.
 */
class DragDropState {
  /**
   * Currently selected item being dragged (DraggedShip, DraggedWeapon, or Brush instance).
   * Set during dragstart, used during drag operations, cleared on dragend.
   * @type {DraggedShip|DraggedWeapon|Brush|null}
   * @private
   */
  selection = null

  /**
   * Last entered cell coordinates represented as [row, column] tuple.
   * Tracks cursor position to avoid duplicate highlight operations.
   * Used for keyboard navigation and highlight positioning.
   * @type {[number, number]}
   * @private
   */
  lastEntered = [-1, -1]

  /**
   * Currently clicked/selected ship for keyboard and UI transform controls (rotate, flip, transform).
   * Set when user clicks ship in tray, cleared when drag starts or ESC pressed.
   * Used for keyboard-based ship transformations.
   * @type {Object|null}
   * @private
   */
  clickedShip = null

  /**
   * Last modifier key effect detected during drag operation.
   * Values: 'link' (Control - rotate), 'copy' (Option - flip), 'move' (default - normal),
   * 'none' (Command - rotate left), or '' (no modifier).
   * Tracks which transformation was applied to avoid re-applying same transformation multiple times.
   * @type {string}
   * @private
   */
  lastModifier = ''

  /**
   * Counter for nested dragenter/dragleave events on board element.
   * Incremented on dragenter, decremented on dragleave.
   * Used to determine when mouse has truly left board (counter === 0).
   * Prevents premature ghost hide when dragging over nested child elements.
   * @type {number}
   * @private
   */
  dragCounter = 0

  /**
   * Resets modifier key effect and drag counter to initial state.
   * Called after drag operation completes to prepare for next drag.
   * @returns {void}
   */
  resetModifierAndCounter () {
    this.lastModifier = ''
    this.dragCounter = 0
  }

  /**
   * Resets only the modifier key effect without touching drag counter.
   * Used when drag continues but modifier key state changes.
   * @returns {void}
   */
  resetModifier () {
    this.lastModifier = ''
  }

  /**
   * Resets the selection and clicked ship to null state.
   * Calls remove() on current selection to clean up DOM elements.
   * Called after drag operations complete or when selection is cancelled.
   * @returns {void}
   */
  resetSelections () {
    if (this.selection) {
      this.selection.remove()
    }
    this.selection = null
    this.clickedShip = null
  }
}

/**
 * Represents a dragged weapon with optional ammo management.
 * Handles weapon drag operations for adding/removing weapons from map and updating ammo counts.
 * Unlike ships, weapons don't have visual DOM elements but are tracked through this class.
 *
 * @class DraggedWeapon
 * @description Wrapper for weapon drag state tracking ammo subtraction behavior (take vs place).
 */
class DraggedWeapon {
  /**
   * Creates a DraggedWeapon instance for drag-and-drop operations.
   * Stores weapon data and whether ammo should be decremented (take) or incremented (place) on drop.
   *
   * @param {Weapon} weapon - The weapon object with letter, tip, and ammo properties
   * @param {boolean} subtract - Whether to subtract ammo on drop (true for take operations, false for add)
   *
   * @returns {void}
   */
  constructor (weapon, subtract) {
    /**
     * @type {Weapon}
     * @description Weapon object being dragged containing letter, tip, and ammo properties
     * @private
     */
    this.weapon = weapon

    /**
     * @type {boolean}
     * @description Flag indicating ammo adjustment direction: true to decrement, false to increment
     * @private
     */
    this.subtract = subtract
  }

  /**
   * No-op remove method for interface compatibility with DraggedShip and Brush.
   * Weapons have no visual DOM elements to remove during cleanup.
   * @returns {void}
   */
  remove () {
    // nothing to remove
  }

  /**
   * Adds weapon to map, updating ammo count if weapon already exists on map.
   * If weapon is new (not in map), appends it to weapons array.
   * If weapon exists, applies ammo adjustment (decrement for take, increment for place).
   * Called on drop completion to finalize weapon placement or removal.
   *
   * @param {Object} [map] - Map object with weapons property; defaults to bh.map if omitted
   * Expects map.weapons to be Array<Weapon> with letter and ammo properties
   *
   * @returns {void}
   */
  addToMap (map) {
    map = map || bh.map
    const weapons = map.weapons

    const idx = weapons.findIndex(w => w.letter === this.weapon.letter)
    if (idx < 0) {
      weapons.push(this.weapon)
    } else if (this.subtract) {
      weapons[idx].ammo--
    } else {
      weapons[idx].ammo++
    }
    map.weapons = weapons
  }
}

const state = new DragDropState()

// ============================================================================
// Click Handlers for Transform Controls
// ============================================================================

/**
 * Rotates clicked ship clockwise if the ship supports rotation.
 * Called when user clicks rotate button or presses rotate hotkey.
 * Delegates to clicked ship's rotate() method; does nothing if no ship clicked or rotation unavailable.
 *
 * @returns {void}
 */
export function onClickRotate () {
  if (state.clickedShip?.canRotate?.()) {
    state.clickedShip.rotate()
  }
}

/**
 * Rotates clicked ship counter-clockwise (left) if the ship supports rotation.
 * Called when user clicks left-rotate button or presses left-rotate hotkey.
 * Delegates to clicked ship's leftRotate() method; does nothing if no ship clicked or rotation unavailable.
 *
 * @returns {void}
 */
export function onClickRotateLeft () {
  if (state.clickedShip?.canRotate?.()) {
    state.clickedShip.leftRotate()
  }
}

/**
 * Flips clicked ship to mirror image if the ship supports flipping.
 * Called when user clicks flip button or presses flip hotkey.
 * Delegates to clicked ship's flip() method; does nothing if no ship clicked.
 *
 * @returns {void}
 */
export function onClickFlip () {
  if (state.clickedShip) {
    state.clickedShip.flip()
  }
}

/**
 * Transforms clicked ship to next form/variant if the ship supports transformation.
 * Called when user clicks transform button or presses transform hotkey.
 * Delegates to clicked ship's nextForm() method; does nothing if no ship clicked or transformation unavailable.
 *
 * @returns {void}
 */
export function onClickTransform () {
  if (state.clickedShip?.canTransform?.()) {
    state.clickedShip.nextForm()
  }
}

// ============================================================================
// Drag Enter/Leave Handlers
// ============================================================================

/**
 * Sets up dragenter/dragleave handlers for ship placement board.
 * Manages ghost visibility based on nesting level of dragenter/dragleave events.
 * Prevents ghost hide when dragging over nested child elements by using dragCounter.
 *
 * @param {ViewModel} viewModel - The view model providing board element and highlight management
 *
 * @returns {void}
 */
export function setupDragHandlers (viewModel) {
  dragNDrop.dragEnd(
    /** @type {HTMLElement} */ (/** @type {unknown} */ (document)),
    viewModel,
    () => {
      state.resetModifierAndCounter()
    }
  )

  viewModel.board.addEventListener('dragenter', e => {
    const isShip = e.dataTransfer.types.includes('ship')
    if (!isShip) return
    e.preventDefault()

    state.dragCounter++
    if (state.dragCounter > 1 || !state.selection) return
    state.selection.hide()
  })

  viewModel.board.addEventListener('dragleave', e => {
    const isShip = e.dataTransfer.types.includes('ship')
    if (!isShip) return
    e.preventDefault()
    state.dragCounter--
    if (state.dragCounter > 0) return

    viewModel.removeHighlight()

    if (!state.selection) return
    state.selection.show()
  })
}

/**
 * Sets up dragend handler for brush terrain painting operations.
 * Resets modifier key state when brush drag operation completes.
 *
 * @param {ViewModel} viewModel - The view model providing document reference for dragend listener
 *
 * @returns {void}
 */
export function setupDragBrushHandlers (viewModel) {
  dragNDrop.dragBrushEnd(
    /** @type {HTMLElement} */ (/** @type {unknown} */ (document)),
    viewModel,
    () => {
      state.resetModifier()
    }
  )
}

// ============================================================================
// Drag Over Handlers
// ============================================================================

/**
 * Sets up dragover handler for ship placement mode.
 * Attached directly to document to handle drag positioning and modifier key effects.
 * Calls _handleDragSelection on each dragover event.
 *
 * @param {Model} model - The model providing shipCellGrid for placement validation
 * @param {ViewModel} viewModel - The view model providing grid cell access
 *
 * @returns {void}
 */
export function dragOverPlacingHandlerSetup (model, viewModel) {
  document.addEventListener('dragover', e => {
    _handleDragSelection(e, viewModel, model)
  })
}

/**
 * Sets up dragover handler for ship addition mode.
 * Attached directly to document; returns cleanup function to remove listener.
 * Allows temporary attachment for addition mode with cleanup capability.
 *
 * @param {Model} model - The model providing shipCellGrid for placement validation
 * @param {ViewModel} viewModel - The view model providing grid cell access
 *
 * @returns {Function} Cleanup function to remove dragover listener when mode ends
 */
export function dragOverAddingHandlerSetup (model, viewModel) {
  const handler = e => {
    _handleDragSelection(e, viewModel, model)
  }
  document.addEventListener('dragover', handler)
  return () => document.removeEventListener('dragover', handler)
}

/**
 * Handles drag selection during dragover event.
 * Processes modifier key transformations, updates highlight, and moves ghost preview.
 * Called continuously during drag operation to track cursor and apply modifier effects.
 *
 * @param {DragEvent} event - The dragover event from mouse movement
 * @param {ViewModel} viewModel - The view model providing highlight and cell management
 * @param {Model} model - The model providing shipCellGrid for highlight positioning
 *
 * @returns {void}
 * @private
 */
function _handleDragSelection (event, viewModel, model) {
  event.preventDefault()

  const changed = _processModifierKeyTransformations(event)
  _updateHighlightIfNeeded(changed, viewModel, model)
  _updateGhostPosition(event)
}

/**
 * Processes modifier key effects and applies ship transformations.
 * Detects macOS Chrome modifier key combinations for rotation/flip/left-rotate.
 * Returns true if transformation was successfully applied.
 *
 * @param {DragEvent} event - The dragover event containing effectAllowed from modifier keys
 *
 * @returns {boolean} True if transformation was applied; false if unchanged or not applicable
 * @private
 */
function _processModifierKeyTransformations (event) {
  const allow = event.dataTransfer.effectAllowed
  if (state.lastModifier === allow) return false

  state.lastModifier = allow

  if (!state.selection || !(state.selection instanceof DraggedShip)) {
    return false
  }

  // macOS Chrome uses modifier keys for different transformations
  if (allow === 'link') {
    state.selection.rotate() // control = rotate clockwise
    return true
  } else if (allow === 'copy') {
    state.selection.flip() // option = flip
    return true
  } else if (allow === 'none') {
    state.selection.leftRotate() // command = rotate left
    return true
  }

  return false
}

/**
 * Updates highlight on board if transformation occurred and selection is hidden.
 * Re-highlights cells when modifier key causes transformation while ghost is hidden.
 * Ensures visual feedback of new placement after rotation/flip.
 *
 * @param {boolean} transformed - Whether transformation was applied by modifier key
 * @param {ViewModel} viewModel - The view model providing highlight management
 * @param {Model} model - The model providing shipCellGrid for new highlight positions
 *
 * @returns {void}
 * @private
 */
function _updateHighlightIfNeeded (transformed, viewModel, model) {
  if (transformed && state.selection?.isNotShown?.()) {
    dragNDrop.highlight(viewModel, model.shipCellGrid.grid)
  }
}

/**
 * Updates ghost position to follow mouse cursor if ghost is currently shown.
 * Called on every dragover event to keep ghost preview aligned with cursor.
 * Uses optional chaining to safely handle case where ghost may be removed.
 *
 * @param {MouseEvent} event - The mouse event with clientX/clientY coordinates
 *
 * @returns {void}
 * @private
 */
function _updateGhostPosition (event) {
  if (state.selection?.shown) {
    state.selection.move(event)
  }
}

// ============================================================================
// Cursor Navigation
// ============================================================================

/**
 * Handles keyboard cursor entry onto grid during placing mode.
 * Validates placement mode is active, cursor is on grid, and not already dragging.
 * Drops ship at cursor position on grid when Enter pressed.
 *
 * @param {KeyboardEvent} event - The keyboard event (typically Enter key)
 * @param {ViewModel} viewModel - The view model providing grid cell access and ship handling
 * @param {Model} model - The model providing shipCellGrid for placement validation
 *
 * @returns {void}
 */
export function enterCursor (event, viewModel, model) {
  if (!viewModel.placingShips) return
  if (cursor.isDragging) return
  if (!cursor.isGrid) return
  event.preventDefault()
  const cell = viewModel.grid.nodeAt(cursor.x, cursor.y)
  dragNDrop.handleDropEvent(cell, model, viewModel)
}

/**
 * Toggles between keyboard cursor and grid placement modes.
 * In grid mode: disables keyboard ship selection and creates drag selection for placement.
 * In tray mode: removes selection and restores keyboard ship selection by cursor.
 * Allows player to switch between keyboard navigation and direct grid placement.
 *
 * @param {KeyboardEvent} event - The keyboard event (typically Tab key)
 * @param {ViewModel} viewModel - The view model providing UI management
 * @param {Model} model - The model providing available ships
 *
 * @returns {void}
 */
export function tabCursor (event, viewModel, model) {
  if (!viewModel.placingShips) return
  if (cursor.isDragging) return

  event.preventDefault()

  cursor.isGrid = !cursor.isGrid

  if (cursor.isGrid) {
    viewModel.disableRotateFlip()
    const shipId = state.clickedShip?.ship.id
    viewModel.removeClicked()
    state.clickedShip = null
    _createSelection(viewModel, model.ships, shipId)
  } else {
    _removeSelection()

    viewModel.removeHighlight()
    viewModel.assignByCursor('ArrowRight', model.ships)
  }
}

// ============================================================================
// Selection Management
// ============================================================================

/**
 * Extracts ship ID from HTML element dataset attribute.
 * Parses data-id attribute as integer for ship identification.
 * Returns 0 if data-id is missing or invalid (NaN from parseInt).
 *
 * @param {HTMLElement|null|undefined} shipElement - The element with data-id attribute
 *
 * @returns {number} The parsed ship ID, or 0 if missing/invalid
 */
export function getShipIdFromElement (shipElement) {
  return Number.parseInt(shipElement?.dataset?.id || '')
}

/**
 * Creates a new DraggedShip selection from ship object and position.
 * Initializes drag state including ghost preview, offset tracking, and variant.
 * Called during dragstart to create the dragged selection object.
 *
 * @param {Ship} ship - The ship object being dragged
 * @param {number} offsetX - X offset in pixels from ship element left edge to mouse position
 * @param {number} offsetY - Y offset in pixels from ship element top edge to mouse position
 * @param {ViewModel} viewModel - The view model providing cellSize and drag ship content builder
 * @param {HTMLElement} shipElement - The source tray element being dragged
 * @param {number} variantIndex - The selected variant index for rendering drag preview
 *
 * @returns {DraggedShip} The created dragged ship with initialized ghost preview
 * @private
 */
function _makeSelection (
  ship,
  offsetX,
  offsetY,
  viewModel,
  shipElement,
  variantIndex
) {
  return new DraggedShip(
    ship,
    offsetX,
    offsetY,
    viewModel.cellSize(),
    shipElement,
    variantIndex,
    viewModel.setDragShipContents.bind(viewModel)
  )
}

/**
 * Creates and initializes a ship selection from tray or keyboard cursor.
 * Sets up initial drag state with zero offset and hidden ghost.
 * Used in keyboard mode when Tab switches to grid navigation.
 *
 * @param {ViewModel} viewModel - The view model providing tray item access
 * @param {Array<Ship>} ships - Available ships for finding by ID
 * @param {number|null} shipId - ID of ship to select, or null to select first tray item
 *
 * @returns {void}
 * @private
 */
function _createSelection (viewModel, ships, shipId) {
  const shipElement =
    shipId === null
      ? viewModel.getFirstTrayItem()
      : viewModel.trayManager.getTrayItem(shipId)

  if (shipElement === null) return
  const id = shipId === null ? Number.parseInt(shipElement.dataset.id) : shipId
  const ship = ships.find(s => s.id === id)
  const variantIndex = Number.parseInt(shipElement.dataset.variant) || 0

  state.selection = _makeSelection(
    ship,
    0,
    0,
    viewModel,
    shipElement,
    variantIndex
  )
  state.selection.shown = false
  cursor.y = 0
  cursor.x = 0
}

/**
 * Removes current selection and cleans up resources.
 * Calls remove() on selection to clean up DOM ghost element.
 * Sets selection to null after cleanup.
 * Called after drag operations complete or when switching modes.
 *
 * @returns {void}
 * @private
 */
function _removeSelection () {
  if (!state.selection) return
  state.selection.remove()
  state.selection = null
}

// ============================================================================
// Main DragNDrop Handler Class
// ============================================================================

/**
 * Main class for managing all drag-and-drop operations.
 * Handles ship placement/addition, weapon management, and brush terrain painting.
 * Provides event listener setup, drag state management, highlight positioning, and drop handling.
 * Serves as central coordinator for drag-and-drop UI interactions.
 *
 * @class DragNDrop
 * @description Singleton manager orchestrating ship/weapon/brush drag-and-drop workflows.
 * Abstracts DOM event handling, grid positioning, and state coordination.
 */
class DragNDrop {
  /**
   * Gets the currently clicked/selected ship.
   * Ship selected from tray by user click, or by keyboard cursor navigation.
   * Used for keyboard-based rotation/flip/transform operations.
   *
   * @returns {Object|null} The clicked ship object, or null if no ship selected
   */
  getClickedShip () {
    return state.clickedShip
  }

  /**
   * Sets the currently clicked/selected ship.
   * Called when user clicks ship in tray or navigates with keyboard cursor.
   * Updates state and enables transform controls (rotate, flip) for new selection.
   *
   * @param {Object|null} clicked - The ship to click and select, or null to clear
   *
   * @returns {void}
   */
  setClickedShip (clicked) {
    state.clickedShip = clicked
  }

  /**
   * Extracts ship information from a drag event.
   * Returns ship ID, element, and flag indicating whether target is child element.
   * Used to determine if drag originated from ship element or child of ship element.
   *
   * @param {DragEvent} event - The drag event with currentTarget and target properties
   *
   * @returns {Object} Object with properties:
   *   - shipId: {number} Parsed ship ID from data-id attribute
   *   - shipElement: {HTMLElement} The ship element (currentTarget)
   *   - isNotShipElement: {boolean} True if target is child element, not ship itself
   */
  getShip (event) {
    const shipElement = /** @type {HTMLElement} */ (event.currentTarget)
    const shipId = getShipIdFromElement(shipElement)
    const isNotShipElement = !shipId && event.target !== shipElement

    return {
      shipId,
      shipElement,
      isNotShipElement
    }
  }

  // ============================================================================
  // Drop Handlers - Ships
  // ============================================================================

  /**
   * Handles drop event for placing ships on board (removing from placement).
   * Validates drop location, executes ship placement, and updates UI.
   * Clears selection and highlight after drop completes or fails.
   *
   * @param {HTMLElement} cell - The target cell element at drop location
   * @param {Model} model - The model providing shipCellGrid for placement validation
   * @param {ViewModel} viewModel - The view model for UI updates and ship handling
   * @param {DragEvent} [event] - Optional drag event (prevents default if provided)
   *
   * @returns {void}
   */
  handleDropEvent (cell, model, viewModel, event) {
    if (event) event.preventDefault()
    viewModel.removeHighlight()
    cursor.isDragging = false
    if (!state.selection) return

    if (state.selection instanceof DraggedShip) {
      this._handleShipDrop(cell, model, viewModel, false)
    } else if (state.selection instanceof DraggedWeapon) {
      state.selection.addToMap()
    }
    _removeSelection()
  }

  /**
   * Handles drop event for adding ships to board.
   * Validates drop location, executes ship addition, and updates UI.
   * Clears highlight and refreshes tray state after drop.
   *
   * @param {HTMLElement} cell - The target cell element at drop location
   * @param {Model} model - The model providing shipCellGrid for placement validation
   * @param {ViewModel} viewModel - The view model for UI updates and ship handling
   * @param {DragEvent} [event] - Optional drag event (prevents default if provided)
   *
   * @returns {void}
   */
  handleAddDropEvent (cell, model, viewModel, event) {
    if (event) event.preventDefault()

    if (!state.selection) return

    if (state.selection instanceof DraggedShip) {
      this._handleShipDrop(cell, model, viewModel, true)
    }

    if (state.selection instanceof DraggedWeapon) {
      this._handleWeaponDrop(model, viewModel)
    }

    this._refreshAfterAddition(model, viewModel)
  }

  /**
   * Handles weapon drop event for adding weapons to map.
   * Updates weapon array and re-arms all weapons.
   * Updates display after weapon addition.
   *
   * @param {Model} model - The model for arming weapons
   * @param {ViewModel} viewModel - The view model for display updates
   * @param {DragEvent} [event] - Optional drag event (prevents default if provided)
   *
   * @returns {void}
   */
  handleDropWeaponEvent (model, viewModel, event) {
    if (event) event.preventDefault()
    this._handleWeaponDrop(model, viewModel)
    this._refreshAfterAddition(model, viewModel)
  }

  /**
   * Handles weapon removal from map (take operation).
   * Subtracts ammo when weapon is taken from board and dragged to tray.
   * Updates ship tracking display and clears drag state.
   *
   * @param {Model} model - The model for weapon management
   * @param {ViewModel} viewModel - The view model for display updates
   * @param {DragEvent} [event] - Optional drag event (prevents default if provided)
   *
   * @returns {void}
   */
  handleTakeDropEvent (model, viewModel, event) {
    if (!state.selection) return

    if (state.selection instanceof DraggedWeapon && state.selection.subtract) {
      if (event) event.preventDefault()
      cursor.isDragging = false

      state.selection.addToMap()
      model.armWeapons()
    }
    viewModel.displayShipTrackingInfo(model)
  }

  /**
   * Handles ship drop operation (placement or addition).
   * Validates placement, calls placement/addition handler, and removes source element if successful.
   * Updates clicked ship state and source element dataset on successful addition.
   *
   * @param {HTMLElement} cell - The target cell element
   * @param {Model} model - The model providing shipCellGrid for validation
   * @param {ViewModel} viewModel - The view model for ship handling
   * @param {boolean} isAddition - True for addition mode, false for placement mode
   *
   * @returns {void}
   * @private
   */
  _handleShipDrop (cell, model, viewModel, isAddition) {
    const [x, y] = xyFromCell(cell)
    const placed = state.selection.place(x, y, model.shipCellGrid)

    if (!placed) {
      console.log(`Invalid placement at (${y}, ${x})`)
      return
    }

    if (isAddition) {
      const newId = viewModel.addition(placed, model, state.selection.ship)
      if (state.selection.source) {
        state.selection.source.dataset.id = newId
      }
    } else {
      viewModel.placement(placed, model, state.selection.ship)
      if (state.selection.source) {
        viewModel.removeDragShip(state.selection.source)
      }
    }

    state.clickedShip = null
  }

  /**
   * Handles weapon drop operation.
   * Adds weapon to map and re-arms all weapons.
   *
   * @param {Model} model - The model for weapon management
   * @param {ViewModel} _viewModel - The view model (unused but kept for interface consistency)
   *
   * @returns {void}
   * @private
   */
  _handleWeaponDrop (model, _viewModel) {
    if (!state.selection) return
    if (!(state.selection instanceof DraggedWeapon)) return

    state.selection.addToMap()
    model.armWeapons()
  }

  /**
   * Refreshes UI after addition operation.
   * Clears highlight, ends drag mode, updates display, and checks tray availability.
   * Called after ship or weapon addition completes.
   *
   * @param {Model} model - The model providing updated state
   * @param {ViewModel} viewModel - The view model for UI updates
   *
   * @returns {void}
   * @private
   */
  _refreshAfterAddition (model, viewModel) {
    viewModel.removeHighlight()
    cursor.isDragging = false
    viewModel.displayShipTrackingInfo(model)
    _removeSelection()
    viewModel.checkTrays()
  }

  // ============================================================================
  // Event Listener Setup
  // ============================================================================

  /**
   * Adds drop listener to cell for ship addition.
   * Binds handleAddDropEvent to cell element with model and viewModel context.
   * Called for every cell in board when setting up drop zones.
   *
   * @param {HTMLElement} cell - The cell element to attach listener to
   * @param {Model} model - The model providing shipCellGrid for validation
   * @param {ViewModel} viewModel - The view model for UI updates
   *
   * @returns {void}
   */
  addDrop (cell, model, viewModel) {
    cell.addEventListener(
      'drop',
      this.handleAddDropEvent.bind(this, cell, model, viewModel)
    )
  }

  /**
   * Adds drop listener to weapon panel for weapon placement.
   * Attaches to panel-board element to receive weapon drops.
   *
   * @param {Model} model - The model for weapon management
   * @param {ViewModel} viewModel - The view model providing panel element reference
   *
   * @returns {void}
   */
  addWeaponDrop (model, viewModel) {
    const div = document.getElementById('panel-board')
    div.addEventListener(
      'drop',
      this.handleDropWeaponEvent.bind(this, model, viewModel)
    )
  }

  /**
   * Adds drop listener to trays for weapon removal (take operation).
   * Allows weapons to be dragged back to tray to remove from map and restore ammo.
   *
   * @param {ViewModel} viewModel - The view model providing trays element
   * @param {Model} model - The model for weapon management
   *
   * @returns {void}
   */
  takeDrop (viewModel, model) {
    viewModel.trays.addEventListener(
      'drop',
      this.handleTakeDropEvent.bind(this, model, viewModel)
    )
  }

  /**
   * Adds drop listener to cell for ship placement/removal.
   * Binds handleDropEvent (placement mode) to cell element.
   * Called for cells in board when setting up placement drop zones.
   *
   * @param {HTMLElement} cell - The cell element to attach listener to
   * @param {Model} model - The model providing shipCellGrid for validation
   * @param {ViewModel} viewModel - The view model for UI updates and ship handling
   *
   * @returns {void}
   */
  drop (cell, model, viewModel) {
    cell.addEventListener(
      'drop',
      this.handleDropEvent.bind(this, cell, model, viewModel)
    )
  }

  // ============================================================================
  // Highlight and Preview
  // ============================================================================

  /**
   * Highlights cells showing where ship would be placed based on current cursor position.
   * Validates bounds, computes placement offset, applies CSS classes for valid/invalid positions.
   * Called during dragenter and when transformations occur to update visual feedback.
   * Applies 'good' class for valid placements, 'notgood' for terrain conflicts, 'bad' for collisions.
   *
   * @param {ViewModel} viewModel - The view model providing gridCellAt and removeHighlight
   * @param {Object} shipCellGrid - The multi-bit grid for collision detection and placement validation
   * @param {number} [cursorX] - Column coordinate; uses state.lastEntered[1] if null/undefined
   * @param {number} [cursorY] - Row coordinate; uses state.lastEntered[0] if null/undefined
   *
   * @returns {void}
   */
  highlight (viewModel, shipCellGrid, cursorX, cursorY) {
    if (!state.selection?.ghost) return

    const { x, y } = this.#calculatePlacementPosition(cursorX, cursorY)
    if (!bh.map.isInBoundsAt(x, y)) {
      console.log(`Placement 1 out of bounds at (${x}, ${y})`)
      return
    }

    viewModel.removeHighlight()

    const { placement, canPlace, cells } = this.#getPlacingAndCells(
      x,
      y,
      shipCellGrid
    )
    this.#applyHighlights(viewModel, cells, canPlace, placement)
  }

  /**
   * Gets coordinates from parameters or falls back to last entered state.
   * Used to determine cursor position when dragenter event doesn't provide coordinates.
   *
   * @param {number|null} cursorX - Column coordinate; null to use state.lastEntered[1]
   * @param {number|null} cursorY - Row coordinate; null to use state.lastEntered[0]
   *
   * @returns {[number, number]} Array [x, y] with resolved coordinates
   * @private
   */
  #getCoordinates (cursorX, cursorY) {
    const y = cursorY === null ? state.lastEntered[1] : cursorY
    const x = cursorX === null ? state.lastEntered[0] : cursorX
    return [x, y]
  }

  /**
   * Calculates placement position by applying ship's cursor offset to coordinates.
   * Converts from grid-space cursor coordinates to placement-space coordinates.
   * Used to position highlight preview based on ship's current orientation and offset.
   *
   * @param {number|null} cursorX - Grid column coordinate
   * @param {number|null} cursorY - Grid row coordinate
   *
   * @returns {Object} Object with x and y properties containing adjusted placement coordinates
   * @private
   */
  #calculatePlacementPosition (cursorX, cursorY) {
    const [x0, y0] = this.#getCoordinates(cursorX, cursorY)
    const [x, y] = state.selection.offsetCell(x0, y0)
    return { x, y }
  }

  /**
   * Gets placement object, validity flag, and occupied cells for highlighting.
   * Calls ship's placeable interface to validate placement at coordinates.
   * Logs warning if placement is invalid describing reason for rejection.
   *
   * @param {number} x - Placement column coordinate (adjusted for ship offset)
   * @param {number} y - Placement row coordinate (adjusted for ship offset)
   * @param {Object} shipCellGrid - Multi-bit grid for collision detection
   *
   * @returns {Object} Object with properties:
   *   - placement: {PlacementData} Placement object with board and constraint data
   *   - canPlace: {boolean} True if placement valid, false if collides or out of bounds
   *   - cells: {Array<[number, number]>} Array of [col, row] occupied cells to highlight
   * @private
   */
  #getPlacingAndCells (x, y, shipCellGrid) {
    const placement = state.selection.placeable().placeAt(x, y)
    const canPlace = placement.canPlace(shipCellGrid)
    if (!canPlace) {
      const warning = placement.cantPlaceReason(shipCellGrid)
      console.warn('Cannot place ship:', warning)
      console.log(`Invalid placement 2 at (${x}, ${y})`)
    }
    const cells = [...placement.board.occupiedLocations()]
    return { placement, canPlace, cells }
  }

  /**
   * Applies highlight CSS classes to all cells occupied by ship preview.
   * Iterates through cells, validates bounds, adds 'good'/'notgood'/'bad' class.
   * Skips cells outside map bounds to prevent console errors.
   *
   * @param {ViewModel} viewModel - The view model providing gridCellAt for DOM access
   * @param {Array<[number, number]>} cells - Array of [col, row] cells to highlight
   * @param {boolean} isPlacementValid - Whether placement is valid (determines class type)
   * @param {Object} placement - Placement object with notGood constraint grid
   *
   * @returns {void}
   * @private
   */
  #applyHighlights (viewModel, cells, isPlacementValid, placement) {
    for (const [x, y] of cells) {
      if (bh.map.isInBoundsAt(x, y)) {
        const cell = viewModel.grid.nodeAt(x, y)
        const cellClass = this.#getHighlightClass(
          isPlacementValid,
          placement,
          cc,
          rr
        )
        cell.classList.add(cellClass)
      }
    }
  }

  /**
   * Determines CSS class for highlighted cell based on placement validity.
   * Returns 'good' for valid placements, delegates to _getInvalidHighlightClass for invalid.
   *
   * @param {boolean} isPlacementValid - Whether placement is valid
   * @param {Object} placement - Placement object with constraint data
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   *
   * @returns {string} CSS class: 'good' (valid), 'notgood' (terrain conflict), 'bad' (collision)
   * @private
   */
  #getHighlightClass (isPlacementValid, placement, x, y) {
    if (!isPlacementValid) {
      return this._getInvalidHighlightClass(placement, x, y)
    }
    return 'good'
  }

  /**
   * Gets the highlight class for invalid placement.
   * Checks notGood grid: > 0 means terrain conflict (notgood), 0 means collision (bad).
   * Used to provide visual distinction between different placement failure reasons.
   *
   * @param {Object} placement - Placement object containing notGood constraint grid
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   *
   * @returns {string} CSS class: 'notgood' (terrain conflict) or 'bad' (collision)
   * @private
   */
  _getInvalidHighlightClass (placement, x, y) {
    if (placement.notGood.at(x, y) > 0) {
      return 'notgood'
    }
    return 'bad'
  }

  // ============================================================================
  // Drag Enter Handlers
  // ============================================================================

  /**
   * Adds dragenter listener for ship cell highlighting.
   * Detects when dragging over new cell and updates highlight preview.
   * Prevents duplicate highlights for same cell using state.lastEntered comparison.
   *
   * @param {HTMLElement} cell - The cell element to attach listener to
   * @param {Model} model - The model providing shipCellGrid for highlight generation
   * @param {ViewModel} viewModel - The view model for grid access and highlight management
   *
   * @returns {void}
   */
  dragEnter (cell, model, viewModel) {
    cell.addEventListener('dragenter', e => {
      e.preventDefault()
      const isShip = e.dataTransfer.types.includes('ship')
      if (!isShip) return

      const el = /** @type {HTMLElement} */ (e.target)
      const coords = xyFromCell(el)
      if (strictEqual(coords, state.lastEntered)) return

      state.lastEntered = coords
      this.highlight(viewModel, model.shipCellGrid, ...coords)
    })
  }

  /**
   * Adds dragenter listener for brush terrain painting.
   * Detects when dragging brush over new cell and applies terrain changes and recoloring.
   * Prevents duplicate brush operations for same cell using state.lastEntered comparison.
   *
   * @param {HTMLElement} cell - The cell element to attach listener to
   * @param {ViewModel} viewModel - The view model for grid access and cell recoloring
   *
   * @returns {void}
   */
  dragBrushEnter (cell, viewModel) {
    const handler = e => {
      e.preventDefault()
      const isBrush = e.dataTransfer.types.includes('brush')
      if (!isBrush) return
      const el = e.target
      const coords = xyFromCell(el)
      if (pairEqual(state.lastEntered, coords)) return

      state.lastEntered = coords

      this.#applyBrushOperation(viewModel, ...coords)
      viewModel.score.displayZoneInfo()
      viewModel.updateChangeClearButton()
    }
    cell.addEventListener('dragenter', handler)
  }

  /**
   * Applies brush painting operation to map at specified coordinates.
   * Sets land terrain cells in square area around cursor based on brush size.
   * Only applies to CustomMap instances (not default maps).
   * Called on each dragenter event during brush drag operation.
   *
   * @param {ViewModel} viewModel - The view model for cell recoloring
   * @param {number} x - Center row coordinate for brush operation
   * @param {number} y - Center column coordinate for brush operation
   *
   * @returns {void}
   * @private
   */
  #applyBrushOperation (viewModel, x, y) {
    const size = state.selection?.size
    const subterrain = state.selection?.subterrain
    const map = bh.map

    if (!(size && subterrain && map instanceof CustomMap)) return

    const min = size > 2 ? -1 : 0
    const max = size < 2 ? 1 : 2

    this.#setLandCells(viewModel, x, y, min, max, map, subterrain)
  }

  /**
   * Sets land terrain cells in square area around brush center.
   * Iterates through min to max offsets from center applying subterrain type.
   * Validates bounds before each assignment to prevent errors.
   * Recolors cells after land terrain change to reflect new terrain type.
   * Recolors area larger than paint area (extended by 1) to update adjacent cells.
   * Called by _applyBrushOperation to paint terrain.
   *
   * @param {ViewModel} viewModel - The view model providing recolor method
   * @param {number} y - Center row coordinate
   * @param {number} x - Center column coordinate
   * @param {number} min - Minimum offset from center (-1, 0, or -0.5)
   * @param {number} max - Maximum offset from center (1, 2, or 1.5)
   * @param {Object} map - CustomMap instance with setLand method
   * @param {string} subterrain - Terrain type identifier to paint
   *
   * @returns {void}
   */
  #setLandCells (viewModel, x, y, min, max, map, subterrain) {
    for (let i = min; i < max; i++) {
      for (let j = min; j < max; j++) {
        if (map.isInBoundsAt(x + i, y + j)) {
          map.setLand(x + i, y + j, subterrain)
          viewModel.recolor(x + i, y + j)
        }
      }
    }
  }

  // ============================================================================
  // Drag End Handlers
  // ============================================================================

  /**
   * Adds dragend listener for ship placement operation completion.
   * Handles cleanup after drop: removes highlight, restores opacity, clears selection.
   * Distinguishes between successful drop (dropEffect !== 'none') and cancelled drag (dropEffect === 'none').
   * On cancel, re-selects the ship; on success, disables transform controls.
   *
   * @param {HTMLElement} div - Container element (document) to attach dragend listener to
   * @param {ViewModel} viewModel - The view model for UI updates and cleanup
   * @param {Function} [callback] - Optional callback executed after cleanup completes
   *
   * @returns {void}
   */
  dragEnd (div, viewModel, callback) {
    const handler = e => {
      const isShip = e.dataTransfer.types.includes('ship')
      if (!isShip) return

      const shipElement = e.target
      if (shipElement?.style) shipElement.style.opacity = ''

      for (const el of viewModel.board.children) {
        el.classList.remove('good', 'bad', 'notgood')
      }

      cursor.isDragging = false
      if (e.dataTransfer.dropEffect === 'none') {
        // Drag was canceled
        viewModel.assignClicked(state.selection?.ship, shipElement)
      } else {
        // Drag was successful
        viewModel.disableRotateFlip()
      }

      _removeSelection()
      viewModel.removeHighlight()
      if (callback) callback()
    }
    div.addEventListener('dragend', handler)
    viewModel.placelistenCancellables.push(() => {
      div.removeEventListener('dragend', handler)
    })
  }

  /**
   * Adds dragend listener for brush terrain painting operation completion.
   * Refreshes all board colors to reflect terrain changes made during drag.
   * Called after brush drag operation completes.
   *
   * @param {HTMLElement} div - Container element (document) to attach dragend listener to
   * @param {ViewModel} viewModel - The view model for color refresh
   * @param {Function} [callback] - Optional callback executed after refresh completes
   *
   * @returns {void}
   */
  dragBrushEnd (div, viewModel, callback) {
    const handler = e => {
      const isBrush = e.dataTransfer.types.includes('brush')
      if (!isBrush) return

      viewModel.refreshAllColor()
      if (callback) callback()
    }
    div.addEventListener('dragend', handler)
    viewModel.brushlistenCancellables.push(() => {
      div.removeEventListener('dragend', handler)
    })
  }

  // ============================================================================
  // Drag Start Handlers - Ships
  // ============================================================================

  /**
   * Adds dragstart listener to ship element for drag-and-drop initiation.
   * Sets up ship dragging with initialization of DraggedShip state and ghost preview.
   *
   * @param {ViewModel} viewModel - The view model for drag UI preparation
   * @param {HTMLElement} dragShip - The ship tray element to attach listener to
   * @param {Array<Ship>} ships - Array of available ships for lookup by ID
   *
   * @returns {void}
   */
  dragStart (viewModel, dragShip, ships) {
    dragShip.addEventListener(
      'dragstart',
      this._handleShipDragStart.bind(this, viewModel, ships)
    )
  }

  /**
   * Handles ship dragstart event initiation.
   * Extracts ship data, calculates mouse offset, prepares UI, creates dragged selection with ghost preview.
   * Called when user starts dragging a ship from tray.
   *
   * @param {ViewModel} viewModel - The view model for drag UI and ghost content
   * @param {Array<Ship>} ships - Available ships for finding ship by ID
   * @param {DragEvent} event - The dragstart event
   *
   * @returns {void}
   * @private
   */
  _handleShipDragStart (viewModel, ships, event) {
    ships = ships || []
    const { shipId, shipElement, isNotShipElement } = this._getShip(event)
    if (isNotShipElement) return

    const { ship, variantIndex } = this._getShipAndVariant(
      ships,
      shipId,
      shipElement
    )
    const { offsetX, offsetY } = this._calculateOffsets(event, shipElement)

    this._prepareDragUI(viewModel, ship, event)
    state.selection = this._createAndPositionSelection(
      ship,
      offsetX,
      offsetY,
      viewModel,
      shipElement,
      variantIndex,
      event
    )
    shipElement.style.opacity = '0.6'
  }

  /**
   * Gets ship and variant index from ship ID and element.
   * Finds ship in array by ID, parses variant index from element data attribute.
   *
   * @param {Array<Ship>} ships - Available ships array
   * @param {number} shipId - Ship ID from data-id attribute
   * @param {HTMLElement} shipElement - Ship tray element with variant data
   *
   * @returns {Object} Object with properties:
   *   - ship: {Ship} The ship object from array
   *   - variantIndex: {number} Variant index parsed from element data attribute
   * @private
   */
  _getShipAndVariant (ships, shipId, shipElement) {
    const ship = ships.find(s => s.id === shipId)
    const variantIndex = Number.parseInt(shipElement.dataset.variant)
    return { ship, variantIndex }
  }

  /**
   * Calculates mouse offset from element boundaries.
   * Computes where mouse clicked relative to element's top-left corner.
   * Used to position ghost preview with correct offset from cursor.
   *
   * @param {DragEvent} event - The dragstart event with clientX/clientY
   * @param {HTMLElement} shipElement - The ship element being dragged
   *
   * @returns {Object} Object with properties:
   *   - offsetX: {number} X pixels from element left edge to mouse
   *   - offsetY: {number} Y pixels from element top edge to mouse
   * @private
   */
  _calculateOffsets (event, shipElement) {
    const rect = shipElement.getBoundingClientRect()
    const offsetX = event.clientX - rect.left
    const offsetY = event.clientY - rect.top
    return { offsetX, offsetY }
  }

  /**
   * Prepares UI state for ship drag operation.
   * Sets dataTransfer data, displays notice, clears previous selection, configures drag image and cursor.
   * Called at start of ship drag to initialize UI before creating ghost.
   *
   * @param {ViewModel} viewModel - The view model for notice display
   * @param {Ship} ship - The ship being dragged
   * @param {DragEvent} event - The dragstart event for dataTransfer configuration
   *
   * @returns {void}
   * @private
   */
  _prepareDragUI (viewModel, ship, event) {
    event.dataTransfer.setData('ship', ship.id.toString())
    viewModel.showNotice(ship.shape().tip)
    viewModel.removeClicked()
    event.dataTransfer.effectAllowed = 'all'
    event.dataTransfer.setDragImage(new Image(), 0, 0)
    cursor.isDragging = true
  }

  /**
   * Creates dragged ship selection and positions ghost preview at cursor.
   * Initializes DraggedShip with drag offsets and ghost, positions ghost at current cursor location.
   * Called after UI preparation to set up visual feedback.
   *
   * @param {Ship} ship - The ship object being dragged
   * @param {number} offsetX - X offset from ship element to mouse click point
   * @param {number} offsetY - Y offset from ship element to mouse click point
   * @param {ViewModel} viewModel - The view model for ghost content setup
   * @param {HTMLElement} shipElement - The source ship element for tracking
   * @param {number} variantIndex - Variant index for ghost rendering
   * @param {DragEvent} event - The dragstart event with cursor position
   *
   * @returns {DraggedShip} The created dragged ship with positioned ghost
   * @private
   */
  _createAndPositionSelection (
    ship,
    offsetX,
    offsetY,
    viewModel,
    shipElement,
    variantIndex,
    event
  ) {
    const selection = _makeSelection(
      ship,
      offsetX,
      offsetY,
      viewModel,
      shipElement,
      variantIndex
    )
    selection.moveTo(event.clientX, event.clientY)
    return selection
  }

  // ============================================================================
  // Drag Start Handlers - Weapons
  // ============================================================================

  /**
   * Adds dragstart listener for weapon dragging.
   * Sets up weapon drag with ammo adjustment mode (take vs place).
   *
   * @param {ViewModel} viewModel - The view model for UI preparation
   * @param {HTMLElement} dragShip - The weapon element to attach listener to
   * @param {Weapon} weapon - The weapon object being dragged
   * @param {boolean} subtract - True for take operation (decrements ammo), false for place (increments)
   *
   * @returns {void}
   */
  dragStartWeapon (viewModel, dragShip, weapon, subtract) {
    dragShip.addEventListener(
      'dragstart',
      this._handleWeaponDragStart.bind(this, viewModel, weapon, subtract)
    )
  }

  /**
   * Handles weapon dragstart event initiation.
   * Creates DraggedWeapon state, sets dataTransfer data, displays notice, configures cursor.
   * Called when user starts dragging a weapon from tray.
   *
   * @param {ViewModel} viewModel - The view model for notice display
   * @param {Weapon} weapon - The weapon being dragged
   * @param {boolean} subtract - Ammo adjustment mode: true to decrement, false to increment
   * @param {DragEvent} event - The dragstart event
   *
   * @returns {void}
   * @private
   */
  _handleWeaponDragStart (viewModel, weapon, subtract, event) {
    const { shipElement, isNotShipElement } = this._getShip(event)
    if (isNotShipElement) return

    event.dataTransfer.setData('weapon', weapon.letter)
    viewModel.showNotice(weapon.tip)
    viewModel.removeClicked()

    event.dataTransfer.effectAllowed = 'all'
    cursor.isDragging = true
    state.selection = new DraggedWeapon(weapon, subtract)
    shipElement.style.opacity = '0.6'
  }

  // ============================================================================
  // Drag Start Handlers - Brush
  // ============================================================================

  /**
   * Makes brush element draggable and sets up drag listeners.
   * Initializes brush element with draggable state and dragstart listener.
   *
   * @param {HTMLElement} brush - The brush UI element to make draggable
   * @param {number} size - The brush size identifier (1-3 typically)
   * @param {string} subterrain - The terrain subtype to paint (sand, grass, etc.)
   *
   * @returns {void}
   */
  makeBrushDraggable (brush, size, subterrain) {
    brush.className = 'draggable'
    brush.setAttribute('draggable', 'true')
    this.dragBrushStart(brush, size, subterrain)
  }

  /**
   * Adds dragstart listener for brush terrain painting.
   * Creates Brush state on drag start, sets dataTransfer data with terrain info, configures cursor.
   *
   * @param {HTMLElement} brush - The brush element to attach listener to
   * @param {number} size - The brush size identifier for paint area
   * @param {string} subterrain - The terrain type identifier for painting
   *
   * @returns {void}
   */
  dragBrushStart (brush, size, subterrain) {
    brush.addEventListener('dragstart', e => {
      if (e.target !== e.currentTarget) return

      e.dataTransfer.setData('brush', subterrain + size.toString())
      e.dataTransfer.effectAllowed = 'all'

      cursor.isDragging = true
      state.selection = new Brush(size, subterrain)
      const el = /** @type {HTMLElement} */ (e.currentTarget)
      el.style.opacity = '0.6'
    })
  }

  // ============================================================================
  // Element Utilities
  // ============================================================================

  /**
   * Extracts ship information from drag event target.
   * Used to determine if drag originated from ship element itself or child element.
   * Helper method for validating drag start events on ship/weapon elements.
   *
   * @param {DragEvent} event - The drag event with currentTarget and target
   *
   * @returns {Object} Object with properties:
   *   - shipId: {number} Parsed ship ID from data-id, 0 if missing
   *   - shipElement: {HTMLElement} The ship element (currentTarget)
   *   - isNotShipElement: {boolean} True if target is child element or missing ID
   * @private
   */
  _getShip (event) {
    const shipElement = /** @type {HTMLElement} */ (event.currentTarget)
    const shipId = getShipIdFromElement(shipElement)
    const isNotShipElement = event.target !== shipElement && !shipId

    return { shipId, shipElement, isNotShipElement }
  }

  /**
   * Removes draggable state from element.
   * Resets className and draggable attribute to disable drag operations.
   * Called when element is no longer draggable or is removed from tray.
   *
   * @param {HTMLElement} dragShip - The element to make non-draggable
   *
   * @returns {void}
   */
  makeUndraggable (dragShip) {
    dragShip.classList.remove('draggable')
    dragShip.setAttribute('draggable', 'false')
  }

  /**
   * Makes element draggable with appropriate listeners for ships or weapons.
   * Attaches dragstart listeners and click handlers based on element type.
   * Avoids duplicate listener attachment using dragListen class check.
   * Called when ship/weapon elements are added to tray.
   *
   * @param {ViewModel} viewModel - The view model for UI handlers
   * @param {HTMLElement} dragShip - The element to make draggable
   * @param {Array<Ship>} ships - Available ships (null for weapons)
   * @param {Weapon} [weapon] - Optional weapon object; if present, configures as weapon
   * @param {boolean} [subtract] - Ammo adjustment mode for weapons (true = take, false = place)
   *
   * @returns {void}
   */
  makeDraggable (viewModel, dragShip, ships, weapon, subtract) {
    const alreadyListened = dragShip.classList?.contains('dragListen')
    dragShip.className = 'draggable dragListen'
    dragShip.setAttribute('draggable', 'true')

    if (weapon) {
      if (!alreadyListened) {
        this.dragStartWeapon(viewModel, dragShip, weapon, subtract)
      }
      if (!subtract) this._setupWeaponClickHandler(viewModel, dragShip, weapon)
    } else {
      if (!alreadyListened) {
        this.dragStart(viewModel, dragShip, ships)
      }
      this._setupShipClickHandler(viewModel, dragShip, ships)
    }
  }

  /**
   * Sets up click handler for ship tray items.
   * Called when user clicks ship element in tray to select/activate it.
   * Validates click is on ship element or child, finds ship by ID, delegates to viewModel.
   *
   * @param {ViewModel} viewModel - The view model for ship selection
   * @param {HTMLElement} dragShip - The ship element with listener
   * @param {Array<Ship>} ships - Available ships for finding ship by ID
   *
   * @returns {void}
   * @private
   */
  _setupShipClickHandler (viewModel, dragShip, ships) {
    dragShip.addEventListener('click', e => {
      const shipElement = /** @type {HTMLElement} */ (e.currentTarget)
      const shipId = Number.parseInt(shipElement.dataset.id)
      if (e.target !== shipElement && !shipId) return

      const ship = ships.find(s => s.id === shipId)
      viewModel.assignClicked(ship, shipElement)
    })
  }

  /**
   * Sets up click handler for weapon tray items.
   * Called when user clicks weapon element in tray to select/activate it.
   * Validates click is on weapon element or child, delegates to viewModel for selection.
   *
   * @param {ViewModel} viewModel - The view model for weapon selection
   * @param {HTMLElement} dragShip - The weapon element with listener
   * @param {Weapon} weapon - The weapon object associated with element
   *
   * @returns {void}
   * @private
   */
  _setupWeaponClickHandler (viewModel, dragShip, weapon) {
    dragShip.addEventListener('click', e => {
      const shipElement = /** @type {HTMLElement} */ (e.currentTarget)
      const letter = shipElement.dataset.letter
      if (e.target !== shipElement && !letter) return

      viewModel.assignClickedWeapon(weapon, shipElement)
    })
  }
}

/**
 * Singleton instance of DragNDrop manager.
 * Provides centralized drag-and-drop coordination for the entire application.
 * Handles ship placement/addition, weapon management, and brush terrain painting.
 * Maintains state through DragDropState for consistent drag operation behavior.
 *
 * @type {DragNDrop}
 */
export const dragNDrop = new DragNDrop()
