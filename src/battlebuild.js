/**
 * @fileoverview Battle Building Module
 * Manages the ship placement and battle setup UI for custom map creation.
 * Handles drag-and-drop placement, keyboard shortcuts, button controls, and UI visibility.
 *
 * This module coordinates build mode interaction through several key systems:
 * - GameStateManager: Centralized state and manager lifecycle
 * - ButtonManager: Declarative button event handler registration
 * - KeyboardShortcutManager: Keyboard input and navigation
 * - UIVisibilityManager: Dynamic UI element visibility control
 *
 * @module battlebuild
 * @requires terrains/all/js/bh
 * @requires waters/customUI
 * @requires selection/dragndrop
 * @requires selection/PlacedShips
 * @requires waters/custom
 * @requires navbar/navbar
 * @requires navbar/setupOptions
 * @requires navbar/setupTabs
 * @requires navbar/gtag
 * @requires navbar/headerUtils
 * @requires ui/ButtonManager
 * @requires navbar/KeyboardShortcutManager
 * @requires ui/UIVisibilityManager
 * @requires ui/GameStateManager
 */

import { bh } from './terrains/all/js/bh.js'
import { customUI } from './waters/customUI.js'

/**
 * @typedef {Object} GridBoard
 * @description Board grid management interface for game board operations
 * @property {HTMLElement} board - Main game board DOM element
 * @property {(x: number, y: number) => HTMLElement|null} nodeAt - Get cell element at coordinates
 * @property {() => void} clearClasses - Remove all CSS classes from cells
 * @property {(element: HTMLElement) => Array<HTMLElement>} surroundCellElement - Get surrounding cell elements
 * @property {(element: HTMLElement, className: string) => void} displaySurround - Display surrounding cells with styling
 * @property {(element: HTMLElement, shipData: Object) => void} markPlaced - Mark ship as placed on cell
 * @property {(custom: Object, customUI: Object) => void} makeAddDroppable - Enable drag-drop for ship addition
 * @property {(customUI: Object) => void} makeBrushable - Enable brush mode for terrain editing
 */

/**
 * @typedef {Object} CustomUI
 * @description Custom UI controller for build mode display and interaction
 * @property {GridBoard} grid - The grid board instance
 * @property {(width?: number, height?: number) => void} resetBoardSize - Reset board display size
 * @property {() => void} clearVisuals - Clear visual markers and overlays
 * @property {() => void} refreshAllColor - Refresh all cell colors on board
 * @property {Object} score - Score tracking object with placement statistics
 * @property {() => void} buildBoard - Build the game board in UI
 * @property {(ships: Array<Object>) => void} addShipMode - Enter ship addition mode
 * @property {(custom: Object) => void} displayShipTrackingInfo - Display ship placement tracking
 * @property {() => void} handleReuse - Handle reuse of previous placement
 * @property {HTMLElement} undoBtn - Undo button DOM element
 * @property {HTMLElement} resetBtn - Reset button DOM element
 * @property {Array<Function>} placelistenCancellables - Event listener cancellation functions
 */

/**
 * @typedef {Object} Custom
 * @description Custom map placement state and logic controller
 * @property {() => void} resetShipCells - Reset grid cells to empty state
 * @property {() => Array<Object>} createCandidateShips - Create and validate ships from current placement
 * @property {Object} shipCellGrid - Grid tracking ship cell positions
 * @property {(map?: Object) => void} setMap - Save current map configuration
 * @property {Array<Object>} ships - Array of placed ships
 * @property {Array<Object>} [candidateShips] - Candidate ships awaiting validation
 * @property {(isClearing?: boolean) => void} handleClear - Clear current placement session
 * @property {() => void} removeAllPlacedShips - Remove all ships from placement
 * @property {() => void} handleUndo - Undo last placement action
 * @property {(editData?: Object) => void} loadForEdit - Load existing map for editing
 * @property {() => void} initializePlacement - Initialize new placement session
 * @property {(direction?: 'ArrowUp'|'ArrowDown'|'ArrowLeft'|'ArrowRight') => void} moveCursor - Move cursor in direction
 */

/**
 * @typedef {Object.<string, (...args: any[]) => void>} ButtonHandlerMap
 * @description Map of button element IDs to their event handler functions
 * Handlers may accept optional event parameters or operate on module state directly.
 */

/**
 * @typedef {Object.<string, (event?: KeyboardEvent) => void>} KeyboardShortcutHandlerMap
 * @description Map of keyboard keys to their handler functions
 * Keys can be single characters ('a', 'r', 'f') or special keys ('ArrowUp', 'Enter', 'Tab').
 * Handlers receive optional KeyboardEvent for event details.
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
 * @returns {void}
 */
customUI.resetBoardSize(undefined, undefined)

/**
 * Registers the undo/redo functionality with UI button elements.
 * Integrates PlacedShips instance undo/redo system with build mode button controls.
 * @type {PlacedShips}
 * @const
 */
placedShipsInstance.registerUndo(customUI.undoBtn, customUI.resetBtn)

/**
 * Central state management system for build mode.
 * Coordinates mode switching, UI visibility, and manager lifecycle.
 * Orchestrates ButtonManager, KeyboardShortcutManager, and UIVisibilityManager.
 * @type {GameStateManager}
 * @const
 */
const stateManager = new GameStateManager('build')

/**
 * UI visibility controller for managing element display state.
 * Dynamically shows/hides UI elements based on build mode configuration.
 * @type {UIVisibilityManager}
 * @const
 */
const uiManager = new UIVisibilityManager()

/**
 * Manager for button event handlers and UI interactions.
 * Handles registration and wiring of all button click events.
 * @type {?ButtonManager}
 * @default null
 */
let buttonManager = null

/**
 * Manager for keyboard shortcuts and input handling.
 * Processes keyboard events and maps them to build mode actions.
 * @type {?KeyboardShortcutManager}
 * @default null
 */
let keyboardManager = null

/**
 * Creates candidate ships from current placement and stores them in custom state.
 * Validates placement by invoking custom module's ship creation logic.
 * Stores validated ships for later addition to board.
 * @returns {Array<Object>} Array of validated ship objects ready for placement
 * @throws {Error} If ship validation fails during creation
 * @private
 */
function _createAndValidateCandidateShips () {
  const ships = custom.createCandidateShips()
  custom.candidateShips = ships
  return ships
}

/**
 * Saves the edited map if in edit mode.
 * Persists changes to map configuration when editing existing maps.
 * Only performs save operation when actively editing.
 * @param {boolean} isEditing - Flag indicating whether map is currently being edited
 * @returns {void}
 * @private
 */
function _saveMapIfEditing (isEditing) {
  if (isEditing) {
    custom.setMap()
  }
}

/**
 * Initializes the ship addition mode UI.
 * Prepares board and UI components for interactive ship placement.
 * Resets ship cells, builds board display, and configures ship addition interface.
 * @param {Array<Object>} ships - Array of validated ship objects to display in UI
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
 * Enables grid cells as drop zones and attaches drag event listeners.
 * Registers cancellable event listeners for cleanup during mode transitions.
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
 * Accepts the current ship placement and optionally saves edited map.
 * Validates ships, saves map if editing, and transitions to ship addition mode.
 * Sets up drag-and-drop for placing ships on the board.
 * @param {boolean} editingMap - Flag indicating whether map editing is enabled
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
 * Records analytics event via gtag and switches game state.
 * @param {string} targetMode - Target game mode identifier ('battleseek', 'index', etc.)
 * @param {boolean} [trackAsComplete=true] - Whether to track this as completed level
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
 * Publishes the current map and returns to main index.
 * Finalizes map creation and completes build session.
 * @returns {void}
 * @private
 */
function _handlePlayMap () {
  _transitionToMode('index')
}

/**
 * Saves the current map for later editing.
 * Records incomplete tracking and transitions to edit mode.
 * Preserves current placement state for future modifications.
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
 * Wires up button elements and registers manager with state system.
 * @returns {ButtonManager} Configured button manager with all handlers registered
 * @throws {Error} If button element references are missing in DOM
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
 * Maps button element IDs to corresponding action handlers.
 * Includes handlers for: placement, rotation, flipping, transformation, undo/redo.
 * All functions are bound to correct context for operation.
 * @returns {ButtonHandlerMap} Map of button IDs to handler functions
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
 * Creates keyboard manager, registers all shortcut handlers, and integrates with state system.
 * Enables single-key shortcuts and arrow key navigation during build mode.
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
 * Maps keyboard inputs to their corresponding action handlers.
 * Supports single character shortcuts and arrow key navigation.
 *
 * Key mappings:
 * - a: accept, c: clear, d: reuse, r: rotate, s: reset
 * - l: rotate left, f: flip, x: transform, u: undo
 * - p: play/publish, v: save, arrows: navigate
 * - Tab: tab navigation, Enter: confirm cursor placement
 *
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
 * Handles setup and teardown of managers and UI state during mode transitions.
 * @typedef {Object} ModeCallbacks
 * @property {() => void} onInit - Called when entering build mode
 * @property {() => void} onExit - Called when exiting build mode
 */

/**
 * Register mode callbacks with GameStateManager.
 * Handles setup and teardown of build mode state and manager lifecycle.
 * @type {ModeCallbacks}
 */
stateManager.registerModeCallbacks('build', {
  /**
   * Called when entering build mode.
   * Initializes button handlers and keyboard shortcuts.
   * Wires up all UI controls and event listeners.
   * @returns {void}
   */
  onInit: () => {
    _setupBuildButtons()
    _setupBuildKeyboardShortcuts()
  },
  /**
   * Called when exiting build mode.
   * Automatic cleanup handled by state manager.
   * Deregisters event listeners and releases resources.
   * @returns {void}
   */
  onExit: () => {
    // Managers are auto-cleaned up by stateManager
  }
})

/**
 * UI visibility configuration for build mode.
 * Specifies which UI elements should be visible during build mode.
 * @type {Object<string, boolean>}
 * @const
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
 * Returns editing context when loading an existing map for modification.
 * @type {Object|null}
 * @const
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
 * Wires up all UI controls and event listeners.
 */
_setupBuildButtons()
_setupBuildKeyboardShortcuts()

/**
 * Load existing map configuration if editing, or initialize fresh placement session.
 * Restores previous map state or creates new empty placement canvas.
 * Sets up drag-and-brush handlers for terrain editing when creating new map.
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
 * Enables seamless navigation between build, seek, and main menu modes.
 */
tabs.hide?.overrideClickListener(_handlePlayMap)
tabs.seek?.overrideClickListener(_handleSeekMap)
