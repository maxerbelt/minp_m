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
 * The build mode workflow:
 * 1. User draws terrain/obstacles on canvas via brush handlers
 * 2. User accepts terrain and enters ship placement phase
 * 3. Ships are placed via drag-and-drop from ship selection UI
 * 4. User confirms placement and publishes or saves the custom map
 *
 * Module initialization establishes:
 * - Board display with responsive sizing
 * - Button event handlers (11 actions)
 * - Keyboard shortcuts (15+ mappings including arrow keys)
 * - UI visibility rules and mode callbacks
 * - Undo/redo system integration
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
 * Drag-and-drop and input handling functions.
 * Provides UI interaction handlers for ship and terrain manipulation.
 * @typedef {Object} DragDropModule
 * @property {(custom: Custom, customUI: CustomUI) => Function} dragOverAddingHandlerSetup - Setup drag-over handler
 * @property {() => void} onClickRotate - Rotate ship clockwise
 * @property {() => void} onClickFlip - Flip ship horizontally
 * @property {() => void} onClickRotateLeft - Rotate ship counter-clockwise
 * @property {() => void} onClickTransform - Apply full transformation
 * @property {(event: KeyboardEvent, customUI: CustomUI, custom: Custom) => void} tabCursor - Tab cursor movement
 * @property {(event: KeyboardEvent, customUI: CustomUI, custom: Custom) => void} enterCursor - Enter cursor placement
 * @property {(customUI: CustomUI) => void} setupDragHandlers - Setup drag handlers for ship placement
 * @property {(customUI: CustomUI) => void} setupDragBrushHandlers - Setup brush handlers for terrain
 * @property {Object} dragNDrop - Drag-and-drop system controller
 */

/**
 * @typedef {Object} GridBoard
 * @description Board grid management interface for game board operations.
 * Provides cell manipulation, styling, and drag-drop functionality for the grid UI.
 * @property {HTMLElement} board - Main game board DOM element container
 * @property {(x: number, y: number) => HTMLElement|null} nodeAt - Get cell element at grid coordinates (x, y); returns null if invalid
 * @property {() => void} clearClasses - Remove all CSS classes from all cells in the grid
 * @property {(element: HTMLElement) => Array<HTMLElement>} surroundCellElement - Get array of surrounding cell elements (8 adjacent cells)
 * @property {(element: HTMLElement, className: string) => void} displaySurround - Apply styling class to surrounding cells for visual feedback
 * @property {(element: HTMLElement, shipData: Object) => void} markPlaced - Mark cell as occupied by placed ship with metadata
 * @property {(custom: Custom, customUI: CustomUI) => void} makeAddDroppable - Enable grid cells as drop zones for ship placement
 * @property {(customUI: CustomUI) => void} makeBrushable - Enable brush/terrain editing mode on grid cells
 */

/**
 * @typedef {Object} CustomUI
 * @description Custom UI controller for build mode display and interaction.
 * Manages board rendering, ship mode display, and UI element lifecycle.
 * @property {GridBoard} grid - The grid board instance for cell manipulation
 * @property {(width?: number, height?: number) => void} resetBoardSize - Reset board display size to optional dimensions or viewport
 * @property {() => void} clearVisuals - Clear all visual markers, overlays, and temporary styling
 * @property {() => void} refreshAllColor - Refresh all cell colors based on current game state
 * @property {Object} score - Score tracking object with placement statistics (ships, cells used)
 * @property {() => void} buildBoard - Build and render the game board DOM elements in UI
 * @property {(ships: Array<Object>) => void} addShipMode - Enter ship addition mode with available ship list
 * @property {(custom: Custom) => void} displayShipTrackingInfo - Display ship placement tracking and statistics
 * @property {() => void} handleReuse - Handle reuse of previous placement configuration
 * @property {HTMLElement} undoBtn - Undo button DOM element reference
 * @property {HTMLElement} resetBtn - Reset button DOM element reference
 * @property {Array<Function>} placelistenCancellables - Event listener cancellation functions for cleanup
 */

/**
 * @typedef {Object} Custom
 * @description Custom map placement state and logic controller.
 * Manages ship and terrain placement, validation, and persistence.
 * @property {() => void} resetShipCells - Reset all grid cells to empty state, clearing ship placements
 * @property {() => Array<Object>} createCandidateShips - Create and validate ships from current cell placement; throws on validation failure
 * @property {Object} shipCellGrid - Grid tracking ship cell positions and occupied cells
 * @property {(map?: Object) => void} setMap - Save current map configuration to persistent storage
 * @property {Array<Object>} ships - Array of currently placed ships
 * @property {Array<Object>} [candidateShips] - Candidate ships awaiting validation and placement
 * @property {(isClearing?: boolean) => void} handleClear - Clear current placement session; optional clearing flag
 * @property {() => void} removeAllPlacedShips - Remove all ships from current placement
 * @property {() => void} handleUndo - Undo last placement action (ship or terrain)
 * @property {(editData?: Object) => void} loadForEdit - Load existing map configuration for editing
 * @property {() => void} initializePlacement - Initialize new blank placement session
 * @property {(direction?: 'ArrowUp'|'ArrowDown'|'ArrowLeft'|'ArrowRight') => void} moveCursor - Move cursor in specified arrow direction
 */

/**
 * @typedef {Object.<string, (...args: any[]) => void>} ButtonHandlerMap
 * @description Map of button element IDs to their event handler functions.
 * All 11 build mode button handlers are defined here.
 * Handlers may accept optional event parameters or operate on module state directly.
 * Supported buttons: newPlacementBtn, acceptBtn, reuseBtn, resetBtn, publishBtn,
 * saveBtn, rotateBtn, rotateLeftBtn, flipBtn, transformBtn, undoBtn.
 * @see {@link _createBuildButtonHandlers}
 */

/**
 * @typedef {Object.<string, (event?: KeyboardEvent) => void>} KeyboardShortcutHandlerMap
 * @description Map of keyboard keys to their handler functions.
 * Defines 15+ keyboard shortcuts for build mode interaction.
 * Keys can be single characters ('a', 'r', 'f') or special keys ('ArrowUp', 'Enter', 'Tab').
 * Handlers receive optional KeyboardEvent for event details and preventDefault capability.
 * Single-char shortcuts: a (accept), c (clear), d (reuse), r (rotate), s (reset),
 * l (left), f (flip), x (transform), u (undo), p (play), v (save).
 * Navigation shortcuts: ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Tab, Enter.
 * @see {@link _createBuildKeyboardShortcuts}
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

/**
 * PlacedShips instance for undo/redo management.
 * @typedef {Object} PlacedShipsInstance
 * @property {(undoBtn: HTMLElement, resetBtn: HTMLElement) => void} registerUndo - Register undo/redo buttons
 */
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
 * Called during module initialization phase before UI managers are set up.
 * @returns {void}
 * @memberof module:battlebuild
 */
customUI.resetBoardSize(undefined, undefined)

/**
 * Registers the undo/redo functionality with UI button elements.
 * Integrates PlacedShips instance undo/redo system with build mode button controls.
 * Must be called before button manager setup to ensure undo/redo buttons are functional.
 * @type {Object}
 * @const
 * @memberof module:battlebuild
 */
placedShipsInstance.registerUndo(customUI.undoBtn, customUI.resetBtn)

/**
 * Central state management system for build mode.
 * Coordinates mode switching, UI visibility, and manager lifecycle.
 * Orchestrates ButtonManager, KeyboardShortcutManager, and UIVisibilityManager.
 * Singleton instance that persists across build mode sessions.
 * @type {GameStateManager}
 * @const
 * @memberof module:battlebuild
 */
const stateManager = new GameStateManager('build')

/**
 * UI visibility controller for managing element display state.
 * Dynamically shows/hides UI elements based on build mode configuration.
 * Works in conjunction with stateManager to apply visibility rules.
 * @type {UIVisibilityManager}
 * @const
 * @memberof module:battlebuild
 */
const uiManager = new UIVisibilityManager()

/**
 * Manager for button event handlers and UI interactions.
 * Handles registration and wiring of all button click events (11 buttons).
 * Initialized during build mode setup and persists for mode lifetime.
 * @type {ButtonManager|null}
 * @default null
 * @memberof module:battlebuild
 */
let buttonManager = null

/**
 * Manager for keyboard shortcuts and input handling.
 * Processes keyboard events and maps them to build mode actions (15+ shortcuts).
 * Initialized during build mode setup and activated for input capture.
 * Deactivates when exiting build mode via state manager callbacks.
 * @type {KeyboardShortcutManager|null}
 * @default null
 * @memberof module:battlebuild
 */
let keyboardManager = null

/**
 * Creates candidate ships from current placement and stores them in custom state.
 * Validates placement by invoking custom module's ship creation logic.
 * Stores validated ships in custom.candidateShips for later addition to board.
 * This function acts as the validation bridge between terrain placement and ship placement phases.
 * @returns {Array<Object>} Array of validated ship objects ready for placement
 * @throws {Error} If ship validation fails during creation (invalid placement, collision, etc.)
 * @private
 * @memberof module:battlebuild
 */
function _createAndValidateCandidateShips () {
  const ships = custom.createCandidateShips()
  custom.candidateShips = ships
  return ships
}

/**
 * Saves the edited map if in edit mode.
 * Persists changes to map configuration when editing existing maps.
 * Only performs save operation when actively editing (isEditing=true).
 * Used during map acceptance to save edits without publishing.
 * @param {boolean} isEditing - Flag indicating whether map is currently being edited
 * @returns {void}
 * @private
 * @memberof module:battlebuild
 */
function _saveMapIfEditing (isEditing) {
  if (isEditing) {
    custom.setMap()
  }
}

/**
 * Initializes the ship addition mode UI.
 * Prepares board and UI components for interactive ship placement.
 * Transitions from terrain placement phase to ship placement phase.
 * Sequence: resets ship cells → builds board → enters add ship mode → displays tracking info.
 * @param {Array<Object>} ships - Array of validated ship objects to display in UI
 * @returns {void}
 * @private
 * @memberof module:battlebuild
 */
function _setupShipAdditionMode (ships) {
  custom.resetShipCells()
  customUI.buildBoard()
  customUI.addShipMode(ships)
  customUI.displayShipTrackingInfo(custom)
}

/**
 * Configures drag-and-drop handlers for ship addition.
 * Called after ship addition mode UI is initialized.
 * @returns {void}
 * @private
 * @memberof module:battlebuilds cancellable event listeners for cleanup during mode transitions.
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
 * Complete workflow: validate → save (if editing) → setup UI → setup drag handlers.
 * Used by 'acceptBtn' button and keyboard shortcut 'a'.
 * @param {boolean} editingMap - Flag indicating whether map editing is enabled
 * @returns {void}
 * @private
 * @memberof module:battlebuild
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
 * Core mode transition handler used by all navigation buttons and shortcuts.
 * @param {string} targetMode - Target game mode identifier ('battleseek', 'index', 'build', etc.)
 * @param {boolean} [trackAsComplete=true] - Whether to track this as completed level for analytics
 * @returns {void}
 * @private
 * @memberof module:battlebuild
 */
function _transitionToMode (targetMode, trackAsComplete = true) {
  trackLevelEnd(bh.map, trackAsComplete)
  switchTo(targetMode, 'build')
}

/**
 * Switches to seek mode while preserving build progress.
 * Transitions to battleseek mode with current map data.
 * Used by 'seekBtn' navigation and keyboard shortcut handling.
 * Maps the created custom map to battleseek mode for testing.
 * @returns {void}
 * @private
 * @memberof module:battlebuild
 */
function _handleSeekMap () {
  _transitionToMode('battleseek')
}

/**
 * Publishes the current map and returns to main index.
 * Finalizes map creation and completes build session.
 * Used by 'publishBtn' button and keyboard shortcut 'p'.
 * Marks map as published and enables navigation away from build mode.
 * @returns {void}
 * @private
 * @memberof module:battlebuild
 */
function _handlePlayMap () {
  _transitionToMode('index')
}

/**
 * Saves the current map for later editing.
 * Records incomplete tracking and transitions to edit mode.
 * Preserves current placement state for future modifications.
 * Used by 'saveBtn' button and keyboard shortcut 'v'.
 * Ensures map is saved before transitioning away from build mode.
 * @returns {void}
 * @private
 * @memberof module:battlebuild
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
 * Creates 11 button handlers and makes grid droppable.
 * Called during mode initialization and repeated if manager restart needed.
 * @returns {ButtonManager} Configured button manager with all handlers registered
 * @throws {Error} If button element references are missing in DOM
 * @private
 * @memberof module:battlebuild
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
 * All handler functions are bound to correct context for proper `this` reference.
 *
 * Button handlers (11 total):
 * - newPlacementBtn: Reset to new placement session
 * - acceptBtn: Accept terrain and enter ship addition
 * - reuseBtn: Reuse previous placement configuration
 * - resetBtn: Remove all placed ships
 * - publishBtn: Publish and return to index
 * - saveBtn: Save for editing and transition
 * - rotateBtn: Rotate ship clockwise
 * - rotateLeftBtn: Rotate ship counter-clockwise
 * - flipBtn: Flip ship horizontally
 * - transformBtn: Apply full transformation
 * - undoBtn: Undo last action
 *
 * @returns {ButtonHandlerMap} Map of button IDs to handler functions
 * @private
 * @memberof module:battlebuild
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
 * Keyboard manager is registered with stateManager for lifecycle management.
 * Called during mode initialization; automatically deactivated on mode exit.
 * @returns {KeyboardShortcutManager} Activated keyboard manager instance
 * @private
 * @memberof module:battlebuild
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
 * Complete key mappings (15+ shortcuts):
 * - Actions: a (accept), c (clear), d (reuse), r (rotate), s (reset),
 *            l (rotate left), f (flip), x (transform), u (undo),
 *            p (play/publish), v (save)
 * - Navigation: ArrowUp, ArrowDown, ArrowLeft, ArrowRight
 * - Cursor: Tab (tab cursor), Enter (place cursor)
 *
 * All handlers are bound to correct context and receive optional KeyboardEvent.
 * Tab and Enter handlers cast event to KeyboardEvent type for type safety.
 *
 * @returns {KeyboardShortcutHandlerMap} Map of keys to handler functions
 * @private
 * @memberof module:battlebuild
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
 * Provides onInit callback when entering build mode and onExit callback on exit.
 * @typedef {Object} ModeCallbacks
 * @property {() => void} onInit - Called when entering build mode; sets up managers
 * @property {() => void} onExit - Called when exiting build mode; cleanup via stateManager
 * @memberof module:battlebuild
 */

/**
 * Register mode callbacks with GameStateManager.
 * Handles setup and teardown of build mode state and manager lifecycle.
 * onInit() is called when entering build mode to activate button and keyboard managers.
 * onExit() is called when leaving build mode; stateManager auto-cleans up resources.
 * @type {ModeCallbacks}
 * @memberof module:battlebuild
 */
stateManager.registerModeCallbacks('build', {
  /**
   * Called when entering build mode.
   * Initializes button handlers and keyboard shortcuts.
   * Wires up all UI controls and event listeners for interaction.
   * Must be called after UI visibility is configured.
   * @returns {void}
   * @memberof module:battlebuild
   */
  onInit: () => {
    _setupBuildButtons()
    _setupBuildKeyboardShortcuts()
  },
  /**
   * Called when exiting build mode.
   * Automatic cleanup handled by state manager.
   * Deregisters event listeners and releases resources.
   * No manual cleanup required as stateManager handles manager deactivation.
   * @returns {void}
   * @memberof module:battlebuild
   */
  onExit: () => {
    // Managers are auto-cleaned up by stateManager
  }
})

/**
 * UI visibility configuration for build mode.
 * Specifies which UI elements should be visible during build mode operation.
 * Controls display of height and width configuration containers.
 * Applied via stateManager.applyUIVisibility() during initialization.
 * @type {Object<string, boolean>}
 * @const
 * @memberof module:battlebuild
 */
const buildModeUIConfig = {
  'height-container': true,
  'width-container': true
}
stateManager.saveUIVisibility('build', buildModeUIConfig)

/**
 * Initialize build mode UI by fetching navbar configuration and applying styling.
 * Fetches navbar layout, shows secondary bar, and applies UI visibility rules.
 * Awaits navbar load before proceeding with manager setup.
 * @async
 * @returns {Promise<void>} Resolves when navbar is fetched and loaded
 * @memberof module:battlebuild
 */
await fetchNavBar('build', 'Create Your Own Game')

/**
 * Apply UI visibility settings and display secondary navigation bar.
 * Shows secondary bar with mode-specific controls.
 * Applies visibility configuration registered for build mode.
 * @memberof module:battlebuild
 */
show2ndBar()
stateManager.applyUIVisibility(uiManager, 'build')

/**
 * Setup build options with callbacks for board size and placement initialization.
 * Configures responsive board sizing and initial placement setup.
 * Returns editing context when loading an existing map for modification.
 * Callback provided for accept button to handle map editing scenario.
 * @type {Object|null}
 * @const
 * @memberof module:battlebuild
 */
const editing = setupBuildOptions(
  customUI.resetBoardSize.bind(customUI),
  custom.initializePlacement.bind(custom),
  'build',
  () => _handleAccept(true)
)

/**
 * Initialize button and keyboard managers for build mode interaction.
 * Must be called after UI visibility is applied and board is sized.
 * Wires up all UI controls and event listeners.
 * Sets up 11 button handlers and 15+ keyboard shortcuts.
 * Called twice: once in mode callback and once in initialization sequence.
 * @memberof module:battlebuild
 */
_setupBuildButtons()
_setupBuildKeyboardShortcuts()

/**
 * Load existing map configuration if editing, or initialize fresh placement session.
 * Restores previous map state if editing variable is truthy.
 * Creates new empty placement canvas if starting fresh map creation.
 * Sets up drag-and-brush handlers for terrain editing when creating new map.
 * Conditional branch based on editing context from setupBuildOptions.
 * @memberof module:battlebuild
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
 * Overrides default tab behavior with custom transition logic.
 * Uses optional chaining (?.) to safely handle undefined tab references.
 * @memberof module:battlebuild
 */
tabs.hide?.overrideClickListener(_handlePlayMap)
tabs.seek?.overrideClickListener(_handleSeekMap)
