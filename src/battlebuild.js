import { bh } from './terrains/all/js/bh.js'
import { customUI } from './waters/customUI.js'

////** @typedef {import('./waters/customUI.js').CustomUI} CustomUI */
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

/**
 * @typedef {Object.<string, (...args: any[]) => void>} ButtonHandlerMap
 */

/**
 * @typedef {Object.<string, (event: Event) => void>} KeyboardShortcutHandlerMap
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
import { tabs, switchTo } from './navbar/setupTabs.js'
import { trackLevelEnd } from './navbar/gtag.js'
import { show2ndBar } from './navbar/headerUtils.js'
import { ButtonManager } from './ui/ButtonManager.js'
import { KeyboardShortcutManager } from './navbar/KeyboardShortcutManager.js'
import { UIVisibilityManager } from './ui/UIVisibilityManager.js'
import { GameStateManager } from './ui/GameStateManager.js'

customUI.resetBoardSize(undefined, undefined)

placedShipsInstance.registerUndo(customUI.undoBtn, customUI.resetBtn)

// Initialize service managers and state manager
const stateManager = new GameStateManager('build')
const uiManager = new UIVisibilityManager()
let buttonManager = null
let keyboardManager = null

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
function _handleAccept (editingMap) {
  const ships = _createAndValidateCandidateShips()
  _saveMapIfEditing(editingMap)
  _setupShipAdditionMode(ships)
  _setupShipAdditionDragHandlers()
}

/**
 * Tracks level completion and navigates to target mode.
 * Records analytics and switches game state.
 * @param {string} targetMode - Target game mode
 * @param {boolean} [trackAsComplete=true] - Whether to track as complete
 * @private
 */
function _transitionToMode (targetMode, trackAsComplete = true) {
  trackLevelEnd(bh.map, trackAsComplete)
  switchTo(targetMode, 'build')
}

/**
 * Switches to seek mode while preserving build progress.
 * @private
 */
function _handleSeekMap () {
  _transitionToMode('battleseek')
}

/**
 * Publishes the current map and returns to the main index.
 * @private
 */
function _handlePlayMap () {
  _transitionToMode('index')
}

/**
 * Saves the current map for later editing.
 * Records incomplete tracking and loads edit mode.
 * @private
 */
function _handleSaveMap () {
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
  buttonManager.registerButtons(_createBuildButtonHandlers())
  buttonManager.wireUp()
  dragNDrop.takeDrop(customUI, custom)
  stateManager.registerModeManager('build', buttonManager)
  return buttonManager
}

/**
 * @private
 * @returns {ButtonHandlerMap}
 */
function _createBuildButtonHandlers () {
  return {
    newPlacementBtn: custom.handleClear.bind(custom),
    acceptBtn: () => _handleAccept(false),
    reuseBtn: customUI.handleReuse.bind(customUI),
    resetBtn: custom.removeAllPlacedShips.bind(custom),
    publishBtn: _handlePlayMap,
    saveBtn: _handleSaveMap,
    rotateBtn: onClickRotate,
    rotateLeftBtn: onClickRotateLeft,
    flipBtn: onClickFlip,
    transformBtn: onClickTransform,
    undoBtn: custom.handleUndo.bind(custom)
  }
}

/**
 * Registers keyboard shortcuts for build mode.
 * @returns {KeyboardShortcutManager} The keyboard manager.
 */
function _setupBuildKeyboardShortcuts () {
  keyboardManager = new KeyboardShortcutManager()
  const shortcutHandlers = _createBuildKeyboardShortcuts()

  keyboardManager.registerShortcuts(shortcutHandlers)
  keyboardManager.activate()
  stateManager.registerModeManager('build', keyboardManager)
  return keyboardManager
}

/**
 * @private
 * @returns {KeyboardShortcutHandlerMap}
 */
function _createBuildKeyboardShortcuts () {
  return {
    a: () => _handleAccept(false),
    c: custom.handleClear.bind(custom),
    d: customUI.handleReuse.bind(customUI),
    r: onClickRotate,
    s: custom.removeAllPlacedShips.bind(custom),
    l: onClickRotateLeft,
    f: onClickFlip,
    x: onClickTransform,
    u: custom.handleUndo.bind(custom),
    p: _handlePlayMap,
    v: _handleSaveMap,
    ArrowUp: custom.moveCursor.bind(custom),
    ArrowDown: custom.moveCursor.bind(custom),
    ArrowLeft: custom.moveCursor.bind(custom),
    ArrowRight: custom.moveCursor.bind(custom),
    Tab: event =>
      tabCursor(/** @type {KeyboardEvent} */ (event), customUI, custom),
    Enter: event =>
      enterCursor(/** @type {KeyboardEvent} */ (event), customUI, custom)
  }
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
  custom.initializePlacement.bind(custom),
  'build',
  () => _handleAccept(true)
)

// Initialize managers for build mode
_setupBuildButtons()
_setupBuildKeyboardShortcuts()

if (editing) {
  custom.loadForEdit(editing)
} else {
  setupDragBrushHandlers(customUI)
  custom.initializePlacement()
}

tabs.hide?.overrideClickListener(_handlePlayMap)
tabs.seek?.overrideClickListener(_handleSeekMap)
