/**
 * @fileoverview Battle Building Module
 * Manages the ship placement and battle setup UI for custom map creation.
 * Handles drag-and-drop placement, keyboard shortcuts, button controls, and UI visibility.
 * @module battlebuild
 */

import { bh } from './terrains/all/js/bh.js'
import { customUI } from './waters/customUI.js'

/**
 * @typedef {Object} GridBoard
 * @property {HTMLElement} board - Main game board DOM element
 * @property {Function} nodeAt - Get cell at coordinates (x, y)
 * @property {Function} clearClasses - Clear CSS classes from cells
 * @property {Function} surroundCellElement - Get surrounding cell elements
 * @property {Function} displaySurround - Display surround cells
 * @property {Function} markPlaced - Mark ship as placed
 * @property {Function} makeAddDroppable - Make board cells droppable for ship addition
 * @property {Function} makeBrushable - Make board cells brushable for terrain editing
 */
/**
 * Represents the custom UI for battle building.
 * Manages board display, visual feedback, and user interface elements.
 * @typedef {Object} CustomUI
 * @property {GridBoard} grid - The grid board instance
 * @property {(width?: number, height?: number) => void} resetBoardSize - Resets board size display
 * @property {() => void} clearVisuals - Clears visual markers and overlays
 * @property {() => void} refreshAllColor - Refreshes all cell colors on board
 * @property {Object} score - Score tracking object with current stats
 * @property {Function} buildBoard - Builds the game board in UI
 * @property {(ships: Array) => void} addShipMode - Sets UI to ship addition mode
 * @property {(custom: any) => void} displayShipTrackingInfo - Shows ship tracking information
 * @property {() => void} handleReuse - Handles reuse of previous placement
 * @property {Function} undoBtn - Undo button element
 * @property {Function} resetBtn - Reset button element
 * @property {Array} placelistenCancellables - Array of event listeners to cancel
 */

/**
 * Represents the custom placement logic and state.
 * Manages ship placement, validation, and storage.
 * @typedef {Object} Custom
 * @property {() => void} resetShipCells - Resets grid cells to empty state
 * @property {() => Array} createCandidateShips - Creates and validates ships from current placement
 * @property {Object} shipCellGrid - Grid tracking where ship cells are positioned
 * @property {(map?: any) => void} setMap - Saves current map configuration
 * @property {Array} ships - Array of placed ships
 * @property {Array} [candidateShips] - Array of candidate ships being validated
 * @property {(isClearing?: boolean) => void} handleClear - Clears current placement
 * @property {() => void} removeAllPlacedShips - Removes all ships from placement
 * @property {() => void} handleUndo - Undoes the last placement action
 * @property {(editData?: any) => void} loadForEdit - Loads existing map for editing
 * @property {() => void} initializePlacement - Initializes new placement session
 * @property {(direction?: string) => void} moveCursor - Moves cursor in specified direction
 */

/**
 * Map of button names to their handler functions.
 * Used for declarative button management in build mode.
 * @typedef {Object.<string, (...args: any[]) => void>} ButtonHandlerMap
 */

/**
 * Map of keyboard shortcuts to their handler functions.
 * Supports both character keys and special keys (ArrowUp, Enter, Tab, etc).
 * @typedef {Object.<string, (event?: KeyboardEvent) => void>} KeyboardShortcutHandlerMap
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

/**
 * Initialize board display to default dimensions on module load.
 * Resets board size to accommodating viewport without specific dimensions.
 */
customUI.resetBoardSize(undefined, undefined)

/**
 * Registers the undo/redo functionality with UI button elements.
 * @type {PlacedShips}
 */
placedShipsInstance.registerUndo(customUI.undoBtn, customUI.resetBtn)

/**
 * Central state management system for build mode.
 * Coordinates mode switching, UI visibility, and manager lifecycle.
 * @type {GameStateManager}
 * @const
 */
const stateManager = new GameStateManager('build')

/**
 * UI visibility controller for managing element display state.
 * @type {UIVisibilityManager}
 * @const
 */
const uiManager = new UIVisibilityManager()

/**
 * Manager for button event handlers and UI interactions.
 * Initialized during build mode setup.
 * @type {?ButtonManager}
 */
let buttonManager = null

/**
 * Manager for keyboard shortcuts and input handling.
 * Initialized during build mode setup.
 * @type {?KeyboardShortcutManager}
 */
let keyboardManager = null

/**
 * Creates candidate ships from current placement and stores them in custom state.
 * Validates placement and prepares ships for addition to the board.
 * @returns {Array<Object>} Validated ship array ready for placement
 * @throws {Error} If ship validation fails
 * @private
 */
function _createAndValidateCandidateShips () {
  const ships = custom.createCandidateShips()
  custom.candidateShips = ships
  return ships
}

/**
 * Saves the edited map if in edit mode.
 * Persists changes to the map configuration when editing an existing map.
 * @param {boolean} isEditing - Whether map is currently being edited
 * @private
 */
function _saveMapIfEditing (isEditing) {
  if (isEditing) {
    custom.setMap()
  }
}

/**
 * Initializes the ship addition mode UI.
 * Prepares the board display and UI for adding ships to the placement.
 * @param {Array<Object>} ships - Validated ships to display in UI
 * @returns {void}
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
 * Sets up event listeners and droppable zones for adding ships to board.
 * @returns {void}
 * @private
 */
function _setupShipAdditionDragHandlers () {
  customUI.grid.makeAddDroppable(custom, customUI)
  setupDragHandlers(customUI)
  customUI.placelistenCancellables.push(
    dragOverAddingHandlerSetup(custom, customUI)
  )
}

/**
 * Accepts the current ship placement and optionally saves the edited map.
 * Validates placement, updates UI, and prepares for ship addition.
 * @param {boolean} editingMap - Whether map editing is enabled
 * @returns {void}
 * @private
 */
function _handleAccept (editingMap) {
  const ships = _createAndValidateCandidateShips()
  _saveMapIfEditing(editingMap)
  _setupShipAdditionMode(ships)
  _setupShipAdditionDragHandlers()
}

/**
 * Tracks level completion and navigates to target game mode.
 * Records analytics event and switches game state to specified mode.
 * @param {string} targetMode - Target game mode to switch to ('battleseek', 'index', etc.)
 * @param {boolean} [trackAsComplete=true] - Whether to track this as a completed level
 * @returns {void}
 * @private
 */
function _transitionToMode (targetMode, trackAsComplete = true) {
  trackLevelEnd(bh.map, trackAsComplete)
  switchTo(targetMode, 'build')
}

/**
 * Switches to seek mode while preserving build progress.
 * Transitions to battleseek mode with current map data.
 * @returns {void}
 * @private
 */
function _handleSeekMap () {
  _transitionToMode('battleseek')
}

/**
 * Publishes the current map and returns to the main index.
 * Finalizes map creation and transitions to main navigation.
 * @returns {void}
 * @private
 */
function _handlePlayMap () {
  _transitionToMode('index')
}

/**
 * Saves the current map for later editing.
 * Records incomplete tracking and loads the map in edit mode.
 * @returns {void}
 * @private
 */
function _handleSaveMap () {
  const saveMap = bh.map
  trackLevelEnd(saveMap, false)
  switchToEdit(saveMap, 'build')
}

/**
 * Sets up button handlers using declarative ButtonManager.
 * Registers all build mode button actions and initializes drag-and-drop.
 * @returns {ButtonManager} Configured button manager instance with all handlers registered
 * @private
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
 * Creates all button handler functions for build mode.
 * Maps button IDs to their corresponding action handlers.
 * Supports: placement, rotation, flipping, transformation, undo/redo operations.
 * @returns {ButtonHandlerMap} Map of button names to handler functions
 * @private
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
 * Registers and activates keyboard shortcuts for build mode.
 * Sets up keyboard event handlers and integrates with state manager.
 * Enables single-key shortcuts and arrow key navigation.
 * @returns {KeyboardShortcutManager} Activated keyboard manager instance
 * @private
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
 * Creates all keyboard shortcut handlers for build mode.
 * Maps keyboard keys to their corresponding action handlers.
 * Includes single-character shortcuts and arrow key navigation.
 * Key mappings: a=accept, c=clear, d=reuse, r=rotate, s=reset, l=rotateLeft, f=flip, x=transform, u=undo, p=play, v=save.
 * @returns {KeyboardShortcutHandlerMap} Map of keys to handler functions
 * @private
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

// ============================================================================
// BUILD MODE INITIALIZATION
// ============================================================================

/**
 * Mode lifecycle callbacks for build mode.
 * Handles setup and teardown of managers and UI state.
 * @typedef {Object} ModeCallbacks
 * @property {Function} onInit - Called when entering build mode
 * @property {Function} onExit - Called when exiting build mode
 */

/**
 * Register mode callbacks with GameStateManager
 * Handles setup and teardown of build mode state and managers
 */
stateManager.registerModeCallbacks('build', {
  /**
   * Called when entering build mode.
   * Initializes button handlers and keyboard shortcuts.
   * @returns {void}
   */
  onInit: () => {
    _setupBuildButtons()
    _setupBuildKeyboardShortcuts()
  },
  /**
   * Called when exiting build mode.
   * Managers are automatically cleaned up by stateManager.
   * @returns {void}
   */
  onExit: () => {
    // Managers are auto-cleaned up by stateManager
  }
})

/**
 * Save UI visibility configuration for build mode.
 * Specifies which UI elements should be visible during build mode.
 * @type {Object<string, boolean>}
 */
const buildModeUIConfig = {
  'height-container': true,
  'width-container': true
}
stateManager.saveUIVisibility('build', buildModeUIConfig)

/**
 * Initialize build mode UI by fetching navbar configuration and applying styling.
 * Fetches navbar, shows secondary bar, and applies UI visibility rules.
 * @returns {Promise<void>}
 */
await fetchNavBar('build', 'Create Your Own Game')

show2ndBar()
stateManager.applyUIVisibility(uiManager, 'build')

/**
 * Setup build options with callbacks for board size and placement initialization.
 * Configures responsive board sizing and initial placement setup.
 * @type {Object}
 */
const editing = setupBuildOptions(
  customUI.resetBoardSize.bind(customUI),
  custom.initializePlacement.bind(custom),
  'build',
  () => _handleAccept(true)
)

/**
 * Initialize button and keyboard managers for build mode interaction.
 * Must be called after UI visibility is applied.
 */
_setupBuildButtons()
_setupBuildKeyboardShortcuts()

/**
 * Load existing map configuration if editing, or initialize fresh placement session.
 * Restores previous map state or creates new empty placement canvas.
 */
if (editing) {
  custom.loadForEdit(editing)
} else {
  setupDragBrushHandlers(customUI)
  custom.initializePlacement()
}

/**
 * Override tab click listeners with game flow handlers.
 * Connects navigation tabs to mode transition functions.
 */
tabs.hide?.overrideClickListener(_handlePlayMap)
tabs.seek?.overrideClickListener(_handleSeekMap)
