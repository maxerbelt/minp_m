import { bh } from '../terrains/all/js/bh.js'
import { coordsFromCell } from '../core/utilities.js'
import { DraggedShip } from './DraggedShip.js'
import { Brush } from './Brush.js'
import { cursor } from './cursor.js'
import { CustomMap } from '../terrains/all/js/map.js'

/**
 * @typedef {Object} ViewModel
 * View model interface for UI interactions
 * @property {Function} removeHighlight - Removes highlight from cells
 * @property {boolean} placingShips - Whether in ship placement mode
 * @property {Function} gridCellAt - Gets cell element at coordinates
 * @property {Function} disableRotateFlip - Disables rotation/flip controls
 * @property {Function} removeClicked - Removes clicked state
 * @property {Function} assignByCursor - Assigns cursor to direction
 * @property {Function} getFirstTrayItem - Gets first tray item
 * @property {Function} trayManager - Tray manager object
 * @property {Function} setDragShipContents - Sets drag ship contents
 * @property {Function} addition - Handles ship addition
 * @property {Function} placement - Handles ship placement
 * @property {Function} removeDragShip - Removes drag ship
 * @property {Function} displayShipTrackingInfo - Displays ship info
 * @property {Function} checkTrays - Checks tray states
 * @property {Function} recolor - Recolors cell
 * @property {Function} score - Score object
 * @property {Function} updateChangeClearButton - Updates button
 * @property {Function} refreshAllColor - Refreshes colors
 * @property {Function} assignClicked - Assigns clicked ship
 * @property {Function} assignClickedWeapon - Assigns clicked weapon
 * @property {Function} showNotice - Shows notice
 * @property {HTMLElement} board - Board element
 * @property {HTMLElement} trays - Trays element
 * @property {Array} placelistenCancellables - Placement listeners
 * @property {Array} brushlistenCancellables - Brush listeners
 */

/**
 * @typedef {Object} Model
 * Model interface for game state
 * @property {Object} shipCellGrid - Ship cell grid
 * @property {Array} ships - Array of ships
 * @property {Function} armWeapons - Arms weapons
 */

/**
 * @typedef {Object} Ship
 * Ship object interface
 * @property {number} id - Ship ID
 * @property {Function} shape - Gets ship shape
 */

/**
 * @typedef {Object} Weapon
 * Weapon object interface
 * @property {string} letter - Weapon letter
 * @property {string} tip - Weapon tip text
 * @property {number} ammo - Weapon ammo count
 */

/**
 * @typedef {HTMLElement} ShipElement
 * Ship element interface extending HTMLElement
 * @property {DOMStringMap} dataset - HTML dataset
 * @property {CSSStyleDeclaration} style - Element styles
 * @property {Function} addEventListener - Add event listener
 * @property {Function} getBoundingClientRect - Get bounding rect
 * @property {Function} classList - Get classList
 */

/**
 * Manages drag-and-drop state for ships and weapons.
 * Encapsulates module-level state to avoid side effects.
 * @class DragDropState
 */
class DragDropState {
  /**
   * Currently selected item being dragged (DraggedShip, DraggedWeapon, or Brush)
   * @type {Object|null}
   */
  selection = null

  /**
   * Last entered cell coordinates [row, col]
   * @type {[number, number]}
   */
  lastEntered = [-1, -1]

  /**
   * Currently clicked ship for keyboard/UI interaction
   * @type {Object|null}
   */
  clickedShip = null

  /**
   * Last modifier key effect ('link', 'copy', 'move', 'none', or '')
   * @type {string}
   */
  lastModifier = ''

  /**
   * Counter for nested dragenter/dragleave events
   * @type {number}
   */
  dragCounter = 0

  /**
   * Resets modifier and drag counter
   * @returns {void}
   */
  resetModifierAndCounter () {
    this.lastModifier = ''
    this.dragCounter = 0
  }

  /**
   * Resets only the modifier
   * @returns {void}
   */
  resetModifier () {
    this.lastModifier = ''
  }

  /**
   * Resets the selection and clicked ship
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
 * Represents a dragged weapon with optional ammo subtraction.
 * @class DraggedWeapon
 */
class DraggedWeapon {
  /**
   * Creates a DraggedWeapon instance.
   * @param {Object} weapon - The weapon object with letter property
   * @param {boolean} subtract - Whether to subtract ammo on drop
   */
  constructor (weapon, subtract) {
    this.weapon = weapon
    this.subtract = subtract
  }

  /**
   * No-op remove method (weapons have no visual element to remove)
   * @returns {void}
   */
  remove () {
    // nothing to remove
  }

  /**
   * Adds weapon to map, updating ammo if weapon already exists.
   * @param {Object} [map] - Map object (defaults to bh.map)
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
 * Rotates clicked ship clockwise if capable.
 * @returns {void}
 */
export function onClickRotate () {
  if (state.clickedShip?.canRotate()) {
    state.clickedShip.rotate()
  }
}

/**
 * Rotates clicked ship counter-clockwise if capable.
 * @returns {void}
 */
export function onClickRotateLeft () {
  if (state.clickedShip?.canRotate()) {
    state.clickedShip.leftRotate()
  }
}

/**
 * Flips clicked ship if possible.
 * @returns {void}
 */
export function onClickFlip () {
  if (state.clickedShip) {
    state.clickedShip.flip()
  }
}

/**
 * Transforms clicked ship to next form if capable.
 * @returns {void}
 */
export function onClickTransform () {
  if (state.clickedShip?.canTransform()) {
    state.clickedShip.nextForm()
  }
}

// ============================================================================
// Drag Enter/Leave Handlers
// ============================================================================

/**
 * Sets up dragenter/dragleave handlers for ship placement board.
 * Hides/shows selection ghost based on nesting level.
 * @param {Object} viewModel - The view model
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
 * Sets up dragend handler for brush operations.
 * Resets modifier on brush drag completion.
 * @param {Object} viewModel - The view model
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
 * @param {Object} model - The model
 * @param {Object} viewModel - The view model
 * @returns {void}
 */
export function dragOverPlacingHandlerSetup (model, viewModel) {
  document.addEventListener('dragover', e => {
    _handleDragSelection(e, viewModel, model)
  })
}

/**
 * Sets up dragover handler for ship adding mode.
 * Returns cleanup function to remove listener.
 * @param {Object} model - The model
 * @param {Object} viewModel - The view model
 * @returns {Function} Cleanup function to remove listener
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
 * Processes modifier key transformations and moves ghost preview.
 * @param {DragEvent} event - The dragover event
 * @param {Object} viewModel - The view model
 * @param {Object} model - The model
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
 * Processes modifier key effects and applies transformations.
 * Returns true if transformation was applied.
 * @param {DragEvent} event - The dragover event
 * @returns {boolean} True if transformation was applied
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
 * @param {boolean} transformed - Whether transformation occurred
 * @param {Object} viewModel - The view model
 * @param {Object} model - The model
 * @returns {void}
 * @private
 */
function _updateHighlightIfNeeded (transformed, viewModel, model) {
  if (transformed && state.selection?.isNotShown?.()) {
    dragNDrop.highlight(viewModel, model.shipCellGrid.grid)
  }
}

/**
 * Updates ghost position to track mouse cursor if shown.
 * @param {MouseEvent} event - The mouse event
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
 * @param {KeyboardEvent} event - The keyboard event
 * @param {Object} viewModel - The view model
 * @param {Object} model - The model
 * @returns {void}
 */
export function enterCursor (event, viewModel, model) {
  if (!viewModel.placingShips) return
  if (cursor.isDragging) return
  if (!cursor.isGrid) return
  event.preventDefault()
  const cell = viewModel.gridCellAt(cursor.x, cursor.y)
  dragNDrop.handleDropEvent(cell, model, viewModel)
}

/**
 * Toggles between keyboard cursor and grid placement modes.
 * @param {KeyboardEvent} event - The keyboard event
 * @param {Object} viewModel - The view model
 * @param {Object} model - The model
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
 * Extracts ship ID from HTML element dataset.
 * @param {HTMLElement} shipElement - The element with data-id attribute
 * @returns {number} The ship ID
 */
export function getShipIdFromElement (shipElement) {
  return Number.parseInt(shipElement?.dataset?.id || '')
}

/**
 * Creates a new DraggedShip selection.
 * @param {Object} ship - The ship object
 * @param {number} offsetX - X offset in pixels
 * @param {number} offsetY - Y offset in pixels
 * @param {Object} viewModel - The view model
 * @param {HTMLElement} shipElement - The source element
 * @param {number} variantIndex - The variant index
 * @returns {DraggedShip} The created dragged ship
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
 * Creates and initializes a ship selection from tray.
 * @param {Object} viewModel - The view model
 * @param {Array} ships - Available ships
 * @param {number|null} shipId - ID of ship to select, or null for first item
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
 * Removes current selection and cleans up.
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
 * Handles ship placement, weapon management, and brush painting.
 * @class DragNDrop
 */
class DragNDrop {
  /**
   * Gets the currently clicked ship.
   * @returns {Object|null} The clicked ship or null
   */
  getClickedShip () {
    return state.clickedShip
  }

  /**
   * Sets the currently clicked ship.
   * @param {Object|null} clicked - The ship to click or null
   * @returns {void}
   */
  setClickedShip (clicked) {
    state.clickedShip = clicked
  }

  /**
   * Extracts ship information from a drag event.
   * @param {DragEvent} event - The drag event
   * @returns {Object} Object with shipId, shipElement, and isNotShipElement
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
   * Handles drop event for placing ships on board.
   * @param {HTMLElement} cell - The target cell element
   * @param {Object} model - The model
   * @param {Object} viewModel - The view model
   * @param {DragEvent} [event] - Optional drag event
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
   * @param {HTMLElement} cell - The target cell element
   * @param {Object} model - The model
   * @param {Object} viewModel - The view model
   * @param {DragEvent} [event] - Optional drag event
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
   * Handles weapon drop event.
   * @param {Object} model - The model
   * @param {Object} viewModel - The view model
   * @param {DragEvent} [event] - Optional drag event
   * @returns {void}
   */
  handleDropWeaponEvent (model, viewModel, event) {
    if (event) event.preventDefault()
    this._handleWeaponDrop(model, viewModel)
    this._refreshAfterAddition(model, viewModel)
  }

  /**
   * Handles weapon removal from map (take operation).
   * @param {Object} model - The model
   * @param {Object} viewModel - The view model
   * @param {DragEvent} [event] - Optional drag event
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
   * @param {HTMLElement} cell - The target cell element
   * @param {Object} model - The model
   * @param {Object} viewModel - The view model
   * @param {boolean} isAddition - Whether this is an addition operation
   * @returns {void}
   * @private
   */
  _handleShipDrop (cell, model, viewModel, isAddition) {
    const [r, c] = coordsFromCell(cell)
    const placed = state.selection.place(r, c, model.shipCellGrid)

    if (!placed) return

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
   * @param {Object} model - The model
   * @param {Object} _viewModel - The view model (unused)
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
   * @param {Object} model - The model
   * @param {Object} viewModel - The view model
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
   * Adds drop listener to cell for ship placement.
   * @param {HTMLElement} cell - The cell element
   * @param {Object} model - The model
   * @param {Object} viewModel - The view model
   * @returns {void}
   */
  addDrop (cell, model, viewModel) {
    cell.addEventListener(
      'drop',
      this.handleAddDropEvent.bind(this, cell, model, viewModel)
    )
  }

  /**
   * Adds drop listener to weapon panel.
   * @param {Object} model - The model
   * @param {Object} viewModel - The view model
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
   * Adds drop listener to trays for weapon removal.
   * @param {Object} viewModel - The view model
   * @param {Object} model - The model
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
   * @param {HTMLElement} cell - The cell element
   * @param {Object} model - The model
   * @param {Object} viewModel - The view model
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
   * Highlights cells showing where ship would be placed.
   * @param {ViewModel} viewModel - The view model
   * @param {Object} shipCellGrid - The ship cell grid
   * @param {number} [r] - Row coordinate (uses lastEntered if null)
   * @param {number} [c] - Column coordinate (uses lastEntered if null)
   * @returns {void}
   */
  highlight (viewModel, shipCellGrid, r, c) {
    if (!state.selection?.ghost) return

    const { row, col } = this._getCoordinates(r, c)
    const { c0, r0 } = this._calculatePlacementPosition(row, col)
    if (!bh.map.inBounds(c0, r0)) return

    viewModel.removeHighlight()

    const { placing, canPlace, cells } = this._getPlacingAndCells(
      r0,
      c0,
      shipCellGrid
    )
    this._applyHighlights(viewModel, cells, canPlace, placing)
  }

  /**
   * Gets coordinates, using lastEntered if null.
   * @param {number|null} r - Row
   * @param {number|null} c - Column
   * @returns {Object} Object with row and col
   * @private
   */
  _getCoordinates (r, c) {
    const row = r === null ? state.lastEntered[0] : r
    const col = c === null ? state.lastEntered[1] : c
    return { row, col }
  }

  /**
   * Calculates placement position with offset.
   * @param {number} row - Row
   * @param {number} col - Column
   * @returns {Object} Object with c0 and r0
   * @private
   */
  _calculatePlacementPosition (row, col) {
    const [c0, r0] = state.selection.offsetCell(row, col)
    return { c0, r0 }
  }

  /**
   * Gets placing object, canPlace flag, and occupied cells.
   * @param {number} r0 - Offset row
   * @param {number} c0 - Offset column
   * @param {Object} shipCellGrid - Ship cell grid
   * @returns {Object} Object with placing, canPlace, cells
   * @private
   */
  _getPlacingAndCells (r0, c0, shipCellGrid) {
    const placing = state.selection.placeable().placeAt(r0, c0)
    const canPlace = placing.canPlace(shipCellGrid)
    const cells = [...placing.board.occupiedLocations()]
    return { placing, canPlace, cells }
  }

  /**
   * Applies highlight classes to cells.
   * @param {ViewModel} viewModel - The view model
   * @param {Array} cells - Occupied cells
   * @param {boolean} isPlacementValid - Whether placement is valid
   * @param {Object} placing - The placement object
   * @returns {void}
   * @private
   */
  _applyHighlights (viewModel, cells, isPlacementValid, placing) {
    for (const [cc, rr] of cells) {
      if (bh.map.inBounds(rr, cc)) {
        const cell = viewModel.gridCellAt(rr, cc)
        const cellClass = this._getHighlightClass(
          isPlacementValid,
          placing,
          cc,
          rr
        )
        cell.classList.add(cellClass)
      }
    }
  }

  /**
   * Determines CSS class for highlighted cell based on placement validity.
   * @param {boolean} isPlacementValid - Whether placement is valid
   * @param {Object} placing - The placement object
   * @param {number} c - Column coordinate
   * @param {number} r - Row coordinate
   * @returns {string} CSS class name ('good', 'notgood', or 'bad')
   * @private
   */
  _getHighlightClass (isPlacementValid, placing, c, r) {
    if (isPlacementValid) {
      return 'good'
    } else if (placing.notGood.at(c, r) > 0) {
      return 'notgood'
    } else {
      return 'bad'
    }
  }

  // ============================================================================
  // Drag Enter Handlers
  // ============================================================================

  /**
   * Adds dragenter listener for ship cell highlighting.
   * @param {HTMLElement} cell - The cell element
   * @param {Object} model - The model
   * @param {Object} viewModel - The view model
   * @returns {void}
   */
  dragEnter (cell, model, viewModel) {
    cell.addEventListener('dragenter', e => {
      e.preventDefault()
      const isShip = e.dataTransfer.types.includes('ship')
      if (!isShip) return

      const el = /** @type {HTMLElement} */ (e.target)
      const [r, c] = coordsFromCell(el)
      if (state.lastEntered[0] === r && state.lastEntered[1] === c) return

      state.lastEntered = [r, c]
      this.highlight(viewModel, model.shipCellGrid, r, c)
    })
  }

  /**
   * Adds dragenter listener for brush painting.
   * @param {HTMLElement} cell - The cell element
   * @param {Object} viewModel - The view model
   * @returns {void}
   */
  dragBrushEnter (cell, viewModel) {
    const handler = e => {
      e.preventDefault()
      const isBrush = e.dataTransfer.types.includes('brush')
      if (!isBrush) return
      const el = e.target
      const [r, c] = coordsFromCell(el)
      if (state.lastEntered[0] === r && state.lastEntered[1] === c) return

      state.lastEntered = [r, c]

      this._applyBrushOperation(viewModel, r, c)
      viewModel.score.displayZoneInfo()
      viewModel.updateChangeClearButton()
    }
    cell.addEventListener('dragenter', handler)
  }

  /**
   * Applies brush painting operation to map.
   * @param {Object} viewModel - The view model
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {void}
   * @private
   */
  _applyBrushOperation (viewModel, r, c) {
    const size = state.selection?.size
    const subterrain = state.selection?.subterrain
    const map = bh.map

    if (!(size && subterrain && map instanceof CustomMap)) return

    const min = size > 2 ? -1 : 0
    const max = size < 2 ? 1 : 2

    this._setLandCells(r, c, min, max, map, subterrain)
    this._recolorCells(viewModel, r, c, min, max, map)
  }

  /**
   * Sets land terrain cells in square area.
   * @param {number} r - Center row
   * @param {number} c - Center column
   * @param {number} min - Min offset from center
   * @param {number} max - Max offset from center
   * @param {Object} map - The map
   * @param {string} subterrain - The subterrain type
   * @returns {void}
   * @private
   */
  _setLandCells (r, c, min, max, map, subterrain) {
    for (let i = min; i < max; i++) {
      for (let j = min; j < max; j++) {
        if (map.inBounds(r + i, c + j)) {
          map.setLand(r + i, c + j, subterrain)
        }
      }
    }
  }

  /**
   * Recolors cells after land terrain change.
   * @param {Object} viewModel - The view model
   * @param {number} r - Center row
   * @param {number} c - Center column
   * @param {number} min - Min offset from center
   * @param {number} max - Max offset from center
   * @param {Object} map - The map
   * @returns {void}
   * @private
   */
  _recolorCells (viewModel, r, c, min, max, map) {
    for (let i = min - 1; i < max + 1; i++) {
      for (let j = min - 1; j < max + 1; j++) {
        if (map.inBounds(r + i, c + j)) {
          viewModel.recolor(r + i, c + j)
        }
      }
    }
  }

  // ============================================================================
  // Drag End Handlers
  // ============================================================================

  /**
   * Adds dragend listener for ship placement completion.
   * @param {HTMLElement} div - The container element
   * @param {Object} viewModel - The view model
   * @param {Function} [callback] - Optional callback on drag completion
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
   * Adds dragend listener for brush operation completion.
   * @param {HTMLElement} div - The container element
   * @param {Object} viewModel - The view model
   * @param {Function} [callback] - Optional callback on drag completion
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
   * Adds dragstart listener for ship dragging.
   * @param {HTMLElement} dragShip - The ship element
   * @param {Array} ships - Available ships
   * @param {Object} viewModel - The view model
   * @returns {void}
   */
  dragStart (viewModel, dragShip, ships) {
    dragShip.addEventListener(
      'dragstart',
      this._handleShipDragStart.bind(this, viewModel, ships)
    )
  }

  /**
   * Handles ship drag start event.
   * @param {ViewModel} viewModel - The view model
   * @param {Array<Ship>} ships - Available ships
   * @param {DragEvent} event - The dragstart event
   * @returns {void}
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
   * @param {Array<Ship>} ships - Available ships
   * @param {number} shipId - Ship ID
   * @param {ShipElement} shipElement - Ship element
   * @returns {Object} Object with ship and variantIndex
   * @private
   */
  _getShipAndVariant (ships, shipId, shipElement) {
    const ship = ships.find(s => s.id === shipId)
    const variantIndex = Number.parseInt(shipElement.dataset.variant)
    return { ship, variantIndex }
  }

  /**
   * Calculates drag offsets from event and element.
   * @param {DragEvent} event - The drag event
   * @param {ShipElement} shipElement - Ship element
   * @returns {Object} Object with offsetX and offsetY
   * @private
   */
  _calculateOffsets (event, shipElement) {
    const rect = shipElement.getBoundingClientRect()
    const offsetX = event.clientX - rect.left
    const offsetY = event.clientY - rect.top
    return { offsetX, offsetY }
  }

  /**
   * Prepares UI for drag operation.
   * @param {ViewModel} viewModel - The view model
   * @param {Ship} ship - The ship
   * @param {DragEvent} event - The drag event
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
   * Creates and positions the dragged ship selection.
   * @param {Ship} ship - The ship
   * @param {number} offsetX - X offset
   * @param {number} offsetY - Y offset
   * @param {ViewModel} viewModel - The view model
   * @param {ShipElement} shipElement - Ship element
   * @param {number} variantIndex - Variant index
   * @param {DragEvent} event - The drag event
   * @returns {DraggedShip} The created selection
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
   * @param {Object} viewModel - The view model
   * @param {HTMLElement} dragShip - The ship/weapon element
   * @param {Object} weapon - The weapon object
   * @param {boolean} subtract - Whether to subtract ammo
   * @returns {void}
   */
  dragStartWeapon (viewModel, dragShip, weapon, subtract) {
    dragShip.addEventListener(
      'dragstart',
      this._handleWeaponDragStart.bind(this, viewModel, weapon, subtract)
    )
  }

  /**
   * Handles weapon drag start event.
   * @param {Object} viewModel - The view model
   * @param {Object} weapon - The weapon object
   * @param {boolean} subtract - Whether to subtract ammo
   * @param {DragEvent} event - The dragstart event
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
   * Makes brush element draggable.
   * @param {HTMLElement} brush - The brush element
   * @param {number} size - The brush size
   * @param {string} subterrain - The subterrain type
   * @returns {void}
   */
  makeBrushDraggable (brush, size, subterrain) {
    brush.className = 'draggable'
    brush.setAttribute('draggable', 'true')
    this.dragBrushStart(brush, size, subterrain)
  }

  /**
   * Adds dragstart listener for brush dragging.
   * @param {HTMLElement} brush - The brush element
   * @param {number} size - The brush size
   * @param {string} subterrain - The subterrain type
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
   * @param {DragEvent} event - The drag event
   * @returns {Object} { shipId, shipElement, isNotShipElement }
   */
  _getShip (event) {
    const shipElement = /** @type {HTMLElement} */ (event.currentTarget)
    const shipId = getShipIdFromElement(shipElement)
    const isNotShipElement = event.target !== shipElement && !shipId

    return { shipId, shipElement, isNotShipElement }
  }

  /**
   * Removes draggable class from element.
   * @param {HTMLElement} dragShip - The element
   * @returns {void}
   */
  makeUndraggable (dragShip) {
    dragShip.classList.remove('draggable')
    dragShip.setAttribute('draggable', 'false')
  }

  /**
   * Makes element draggable with appropriate listeners.
   * Sets up dragstart and click listeners for ships or weapons.
   * @param {Object} viewModel - The view model
   * @param {HTMLElement} dragShip - The element
   * @param {Array} ships - Available ships
   * @param {Object} [weapon] - Optional weapon object
   * @param {boolean} [subtract] - Whether to subtract ammo
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
   * @param {Object} viewModel - The view model
   * @param {HTMLElement} dragShip - The element
   * @param {Array} ships - Available ships
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
   * @param {Object} viewModel - The view model
   * @param {HTMLElement} dragShip - The element
   * @param {Object} weapon - The weapon
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
 * @type {DragNDrop}
 */
export const dragNDrop = new DragNDrop()
