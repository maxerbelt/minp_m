import { bh } from './terrains/all/js/bh.js'
import { customUI } from './waters/customUI.js'
import { moveCursorBase } from './waters/placementUI.js'
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
function onClickUndo () {
  custom.resetShipCells()
  customUI.clearVisuals()
  custom.score.reset()
  placedShipsInstance.popAndRefresh(
    custom.shipCellGrid,
    ship => {
      customUI.markPlaced(ship.cells, ship)
    },
    ship => {
      customUI.subtraction(custom, ship)
    }
  )
}

/**
 * Accepts the current ship placement and optionally saves the edited map.
 * @param {boolean} editingMap - Whether map editing is enabled.
 */
function onClickAccept (editingMap) {
  const ships = custom.createCandidateShips()
  custom.candidateShips = ships
  if (editingMap) {
    custom.setMap()
  }
  custom.resetShipCells()
  customUI.buildBoard()
  customUI.addShipMode(ships)
  customUI.displayShipTrackingInfo(custom)

  customUI.makeAddDroppable(custom)
  setupDragHandlers(customUI)
  customUI.placelistenCancellables.push(
    dragOverAddingHandlerSetup(custom, customUI)
  )
}
function onClickDefault () {
  setNewMapToCorrectSize()
  customUI.refreshAllColor()
  _refreshBuildControls()
}

function clearShips () {
  customUI.showNotice('ships removed')
  custom.resetShipCells()
  customUI.clearVisuals()
  custom.score.reset()
  placedShipsInstance.popAll(ship => {
    customUI.subtraction(custom, ship)
  })
  custom.ships = []
}

function onClickClear () {
  if (customUI.placingShips) {
    clearShips()
    customUI.trayManager.setTrays()
    _initializePlacement()
    customUI.displayShipTrackingInfo(custom)
    return
  }

  bh.maps.clearBlank()
  customUI.refreshAllColor()
  _refreshBuildControls()
}

/**
 * Refreshes build mode button and score controls.
 * @private
 */
function _refreshBuildControls () {
  customUI.score.displayZoneInfo()
  customUI.updateChangeClearButton()
}
/**
 * Switches to seek mode while preserving build progress.
 */
function seekMap () {
  trackLevelEnd(bh.map, true)
  switchTo('battleseek', 'build')
}

/**
 * Publishes the current map and returns to the main index.
 */
function playMap () {
  trackLevelEnd(bh.map, true)
  switchTo('index', 'build')
}

/**
 * Saves the current map for later editing.
 */
function saveMap () {
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
    resetBtn: clearShips,
    publishBtn: playMap,
    saveBtn: saveMap,
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
    s: clearShips,
    l: onClickRotateLeft,
    f: onClickFlip,
    x: onClickTransform,
    u: onClickUndo,
    p: playMap,
    v: saveMap,
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

tabs.hide?.overrideClickListener(playMap)
tabs.seek?.overrideClickListener(seekMap)
