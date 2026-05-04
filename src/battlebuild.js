import { bh } from './terrains/all/js/bh.js'
import { customUI } from './waters/customUI.js'
import { moveCursorBase } from './waters/placementUI.js'

/**
 * @typedef {Object} CustomUI
 * @property {Function} resetBoardSize - Resets board size display
 * @property {Function} clearVisuals - Clears visual markers
 * @property {Function} refreshAllColor - Refreshes all cell colors
 * @property {Object} score - Score tracking object
 */

/**
 * @typedef {Object} Custom
 * @property {Function} resetShipCells - Resets grid cells
 * @property {Function} createCandidateShips - Creates ships from placement
 * @property {Object} shipCellGrid - Grid tracking ship cells
 * @property {Function} setMap - Saves current map
 * @property {Array} ships - Array of placed ships
 */
import {
  dragOverAddingHandlerSetup,
  onClickRotate,
  onClickFlip,
  onClickRotateLeft,
  onClickTransform,
  tabCursor,
  enterCursor,
  setupDragHandlers,
  setupDragBrushHandlers,
  dragNDrop
} from './selection/dragndrop.js'
import { placedShipsInstance } from './selection/PlacedShips.js'
import { custom } from './waters/custom.js'
import { switchToEdit, fetchNavBar } from './navbar/navbar.js'
import { setupBuildOptions } from './navbar/setupOptions.js'
import {
  hasMapOfCurrentSize,
  setNewMapToCorrectSize
} from './terrains/all/js/validSize.js'
import { tabs, switchTo } from './navbar/setupTabs.js'
import { trackLevelEnd } from './navbar/gtag.js'
import { show2ndBar } from './navbar/headerUtils.js'
import { ButtonManager } from './ui/ButtonManager.js'
import { KeyboardShortcutManager } from './navbar/KeyboardShortcutManager.js'
import { UIVisibilityManager } from './ui/UIVisibilityManager.js'
import { GameStateManager } from './ui/GameStateManager.js'

customUI.resetBoardSize()

placedShipsInstance.registerUndo(customUI.undoBtn, customUI.resetBtn)

// Initialize service managers and state manager
const stateManager = new GameStateManager('build')
const uiManager = new UIVisibilityManager()
let buttonManager = null
let keyboardManager = null

/**
 * Resets ship placement state (cells, visuals, score).
 * @param {boolean} [showNotice=false] - Whether to show user notice
 * @private
 */
function _resetShipPlacement (showNotice = false) {
  if (showNotice) {
    customUI.showNotice('ships removed')
  }
  custom.resetShipCells()
  customUI.clearVisuals()
  custom.score.reset()
}

/**
 * Undoes the last ship placement action.
 * Reverts state and removes the most recent ship from grid.
 * @private
 */
function onClickUndo () {
  _resetShipPlacement()
  placedShipsInstance.popAndRefresh(
    custom.shipCellGrid.grid,
    ship => {
      customUI.markPlaced(ship.cells, ship)
    },
    ship => {
      customUI.subtraction(custom, ship)
    }
  )
}

/**
 * Creates and validates candidate ships from current placement.
 * @returns {Array} Validated ship array
 * @private
 */
function _createAndValidateCandidateShips () {
  const ships = custom.createCandidateShips()
  custom.candidateShips = ships
  return ships
}

/**
 * Saves the edited map if in edit mode.
 * @param {boolean} isEditing - Whether map is being edited
 * @private
 */
function _saveMapIfEditing (isEditing) {
  if (isEditing) {
    custom.setMap()
  }
}

/**
 * Initializes the ship addition mode UI.
 * Sets up board for adding ships to placement.
 * @param {Array} ships - Ships to display
 * @private
 */
function _setupShipAdditionMode (ships) {
  custom.resetShipCells()
  customUI.buildBoard()
  customUI.addShipMode(ships)
  customUI.displayShipTrackingInfo(custom)
}

/**
 * Configures drag-and-drop handlers for ship addition.
 * @private
 */
function _setupShipAdditionDragHandlers () {
  customUI.makeAddDroppable(custom)
  setupDragHandlers(customUI)
  customUI.placelistenCancellables.push(
    dragOverAddingHandlerSetup(custom, customUI)
  )
}

/**
 * Accepts the current ship placement and optionally saves the edited map.
 * @param {boolean} editingMap - Whether map editing is enabled
 * @private
 */
function onClickAccept (editingMap) {
  const ships = _createAndValidateCandidateShips()
  _saveMapIfEditing(editingMap)
  _setupShipAdditionMode(ships)
  _setupShipAdditionDragHandlers()
}
/**
 * Resets map to correct size and refreshes display.
 * @private
 */
function onClickDefault () {
  setNewMapToCorrectSize()
  _refreshBuildDisplay()
}

/**
 * Clears all ships from the board and resets placement.
 * Removes all ships, resets state, and shows notification.
 * @private
 */
function _clearAllShips () {
  _resetShipPlacement(true)
  placedShipsInstance.popAll(ship => {
    customUI.subtraction(custom, ship)
  })
  custom.ships = []
}

/**
 * Reinitializes placement mode after clearing ships.
 * Restores UI state for fresh ship placement.
 * @private
 */
function _reinitializePlacementAfterClear () {
  _clearAllShips()
  customUI.trayManager.setTrays()
  _initializePlacement()
  customUI.displayShipTrackingInfo(custom)
}

/**
 * Clears map and refreshes display.
 * Removes blank maps and updates visual state.
 * @private
 */
function _clearMapAndRefresh () {
  bh.maps.clearBlank()
  _refreshBuildDisplay()
}

/**
 * Handles clear button click - clears ships or maps depending on mode.
 * @private
 */
function onClickClear () {
  if (customUI.placingShips) {
    _reinitializePlacementAfterClear()
    return
  }
  _clearMapAndRefresh()
}

/**
 * Refreshes build mode display and controls.
 * Updates colors and button states.
 * @private
 */
function _refreshBuildDisplay () {
  customUI.refreshAllColor()
  _refreshBuildControls()
}

/**
 * Tracks level completion and navigates to target mode.
 * Records analytics and switches game state.
 * @param {string} targetMode - Target game mode
 * @param {boolean} [trackAsComplete=true] - Whether to track as complete
 * @private
 */
function _navigateToMode (targetMode, trackAsComplete = true) {
  trackLevelEnd(bh.map, trackAsComplete)
  switchTo(targetMode, 'build')
}

/**
 * Switches to seek mode while preserving build progress.
 * @private
 */
function _onClickSeekMap () {
  _navigateToMode('battleseek')
}

/**
 * Publishes the current map and returns to the main index.
 * @private
 */
function _onClickPlayMap () {
  _navigateToMode('index')
}

/**
 * Saves the current map for later editing.
 * Records incomplete tracking and loads edit mode.
 * @private
 */
function _onClickSaveMap () {
  const saveMap = bh.map
  trackLevelEnd(saveMap, false)
  switchToEdit(saveMap, 'build')
}

/**
 * Setup button handlers using declarative ButtonManager
 * Registers all build mode button actions
 */
function _setupBuildButtons () {
  buttonManager = new ButtonManager(customUI)
  buttonManager.registerButtons({
    newPlacementBtn: onClickClear,
    acceptBtn: () => onClickAccept(false),
    reuseBtn: onClickDefault,
    resetBtn: _clearAllShips,
    publishBtn: _onClickPlayMap,
    saveBtn: _onClickSaveMap,
    rotateBtn: onClickRotate,
    rotateLeftBtn: onClickRotateLeft,
    flipBtn: onClickFlip,
    transformBtn: onClickTransform,
    undoBtn: onClickUndo
  })
  buttonManager.wireUp()
  dragNDrop.takeDrop(customUI, custom)
  stateManager.registerModeManager('build', buttonManager)
  return buttonManager
}

/**
 * Moves the cursor inside build mode.
 * @param {Event} event - The keyboard event.
 */
function moveCursor (event) {
  moveCursorBase(event, customUI, custom)
}

/**
 * Registers keyboard shortcuts for build mode.
 * @returns {KeyboardShortcutManager} The keyboard manager.
 */
function _setupBuildKeyboardShortcuts () {
  keyboardManager = new KeyboardShortcutManager()
  const shortcutHandlers = {
    a: () => onClickAccept(false),
    c: onClickClear,
    d: onClickDefault,
    r: onClickRotate,
    s: _clearAllShips,
    l: onClickRotateLeft,
    f: onClickFlip,
    x: onClickTransform,
    u: onClickUndo,
    p: _onClickPlayMap,
    v: _onClickSaveMap,
    ArrowUp: event => moveCursor(event),
    ArrowDown: event => moveCursor(event),
    ArrowLeft: event => moveCursor(event),
    ArrowRight: event => moveCursor(event),
    Tab: event => tabCursor(event, customUI, custom),
    Enter: event => enterCursor(event, customUI, custom)
  }

  keyboardManager.registerShortcuts(shortcutHandlers)
  keyboardManager.activate()
  stateManager.registerModeManager('build', keyboardManager)
  return keyboardManager
}

/**
 * Initialize new placement state
 * Setup board, UI, and brush controls for ship placement
 */
function _initializePlacement () {
  customUI.resetAdd(custom)
  customUI.buildBoard((_r, _c) => {})
  customUI.trayManager.showBrushTrays()
  customUI.makeBrushable()
  customUI.buildBrushTray(bh.terrain)
  customUI.brushMode()
  customUI.acceptBtn.disabled = false
  _setReuseButtonState()
  customUI.score.setupZoneInfo(custom, customUI)
  _disableBuildTransformButtons()
}

/**
 * Disable transform buttons during ship placement
 * @private
 */
function _disableBuildTransformButtons () {
  customUI.rotateBtn.disabled = true
  customUI.flipBtn.disabled = true
  customUI.rotateLeftBtn.disabled = true
  customUI.undoBtn.disabled = true
  customUI.resetBtn.disabled = true
}

/**
 * Update reuse button state based on available maps
 * @private
 */
function _setReuseButtonState () {
  customUI.reuseBtn.disabled = !hasMapOfCurrentSize()
}

// Register mode callbacks with GameStateManager
stateManager.registerModeCallbacks('build', {
  onInit: () => {
    _setupBuildButtons()
    _setupBuildKeyboardShortcuts()
  },
  onExit: () => {
    // Managers are auto-cleaned up by stateManager
  }
})

// Save UI visibility config for build mode
stateManager.saveUIVisibility('build', {
  'height-container': true,
  'width-container': true
})

// Initialize build mode UI
await fetchNavBar('build', 'Create Your Own Game')

show2ndBar()
stateManager.applyUIVisibility(uiManager, 'build')

const editing = setupBuildOptions(
  customUI.resetBoardSize.bind(customUI),
  _initializePlacement,
  'build',
  () => onClickAccept(true)
)

// Initialize managers for build mode
_setupBuildButtons()
_setupBuildKeyboardShortcuts()

if (editing) {
  custom.loadForEdit(editing)
} else {
  setupDragBrushHandlers(customUI)
  _initializePlacement()
}

tabs.hide?.overrideClickListener(_onClickPlayMap)
tabs.seek?.overrideClickListener(_onClickSeekMap)
