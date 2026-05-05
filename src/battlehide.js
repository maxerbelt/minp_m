import { bh } from './terrains/all/js/bh.js'
import { gameStatus } from './waters/StatusUI.js'
import { placedShipsInstance } from './selection/PlacedShips.js'
import { fetchNavBar } from './navbar/navbar.js'
import { setupGameOptions } from './navbar/setupOptions.js'
import {
  dragOverPlacingHandlerSetup,
  onClickRotate,
  onClickFlip,
  onClickRotateLeft,
  onClickTransform,
  tabCursor,
  enterCursor
} from './selection/dragndrop.js'
import { moveCursorBase } from './waters/placementUI.js'
import { enemy } from './waters/enemy.js'
import { setupEnemy, newGame } from './navbar/enemySetup.js'
import { makeFriend } from './navbar/headerUtils.js'
import { ButtonManager } from './ui/ButtonManager.js'
import { KeyboardShortcutManager } from './navbar/KeyboardShortcutManager.js'
import { UIVisibilityManager } from './ui/UIVisibilityManager.js'
import { GameStateManager } from './ui/GameStateManager.js'
import { AudioManager } from './core/AudioManager.js'

/**
 * @typedef {Object} FriendPlayer
 * @property {Object} UI - Friend UI interface
 * @property {Function} test - Test mode function
 * @property {boolean} testContinue - Flag for test continuation
 * @property {Function} autoPlace2 - Auto-place ships function
 * @property {Function} load - Load friend state
 * @property {Function} updateUI - Update UI display
 * @property {Function} setupUntried - Setup untried coordinates
 * @property {Object} opponent - Opponent reference
 * @property {Array} ships - Array of ships
 */

const friend = makeFriend()
placedShipsInstance.registerUndo(friend.UI.undoBtn)
const friendUI = friend.UI

friendUI.resetBoardSize()

// Initialize service managers and state manager
const stateManager = new GameStateManager('hide-placement')
const uiManager = new UIVisibilityManager()
let buttonManager = null
let keyboardManager = null
let seekKeyboardManager = null
let isBattleHideTransitioning = false

/**
 * Transitions to a game mode with optional callbacks.
 * Encapsulates common mode transition logic and state cleanup.
 * @param {string} targetMode - Target mode identifier
 * @param {Function} [onBefore] - Callback before transition
 * @param {Function} [onAfter] - Callback after transition
 * @private
 */
function _transitionToMode (targetMode, onBefore, onAfter) {
  stateManager.switchToMode(targetMode, {
    onBefore,
    onAfter
  })
}

/**
 * Prepares UI state for return to ship placement.
 * Cleans up battle mode and resets opponent references.
 * @private
 */
function _prepareReturnToPlacement () {
  uiManager.hide('enemy-container')
  const tallyTitle = document.getElementById('tally-title')
  const tallyBox = document.getElementById('friend-tally-container')
  tallyBox.prepend(tallyTitle)
  enemy.opponent = null
  friend.opponent = null
}

/**
 * Returns to ship placement mode from seek/battle mode.
 * Resets opponent relationships and reinitializes placement UI.
 * @private
 */
function _onClickReturnToPlacement () {
  _transitionToMode(
    'hide-placement',
    _prepareReturnToPlacement,
    _initializePlacement
  )
}

/**
 * Returns to placement mode after test play completes.
 * Triggers test play, then resets to placement state.
 * @private
 */
function _onClickReturnFromTest () {
  _transitionToMode(
    'hide-placement',
    _prepareReturnToPlacement,
    _initializeTest
  )
}

/**
 * Executes friend player test mode.
 * Tests AI behavior in placement context.
 * @private
 */
function _onClickStartTestMode () {
  friend.test.bind(friend)()
}

/**
 * Resets and reinitializes the friend player's board.
 * Used for starting fresh games or resetting board state.
 * @private
 */
function _resetFriendBoard () {
  friend.restartBoard(true)
  friend.updateUI(friend.ships)
}

/**
 * Transitions to seek mode and initiates battle/hide gameplay.
 * @private
 */
function _onClickStartSeek () {
  friendUI.seekMode()
  _playBattleHide()
}

/**
 * Prepares UI for battle/seek mode initialization.
 * Toggles visibility, adjusts layout, and establishes opponent relationships.
 * @private
 */
function _prepareBattleUIState () {
  friendUI.seekMode()
  uiManager.show('enemy-container')
  gameStatus.line.classList.add('small')
  gameStatus.chevron.classList.remove('hidden')

  const tallyTitle = document.getElementById('tally-title')
  const placeControls = document.getElementById('place-controls')
  placeControls.appendChild(tallyTitle)

  enemy.opponent = friend
  friend.opponent = enemy
}

/**
 * Finalizes battle/seek mode by resetting boards and starting game.
 * @private
 */
function _finalizeBattleInitialization () {
  isBattleHideTransitioning = false
  enemy.UI.resetBoardSize()
  friend.setupUntried()
  newGame('hide', _resetFriendBoard, friendUI)
}

/**
 * Transitions to battle/seek mode and initializes gameplay.
 * Coordinates UI state changes and game initialization.
 * @private
 */
function _enterBattleHide () {
  _transitionToMode(
    'hide-seek',
    _prepareBattleUIState,
    _finalizeBattleInitialization
  )
}

/**
 * Auto-places ships and conditionally initiates battle mode.
 * @private
 */
function _onClickAutoPlace () {
  friend.autoPlace2()
  _playBattleHide()
}

/**
 * Enters battle/hide mode if not in test mode.
 * Prevents transition to battle during test scenarios.
 * @private
 */
function _playBattleHide () {
  if (
    bh.test ||
    stateManager.isMode('hide-seek') ||
    isBattleHideTransitioning
  ) {
    return
  }

  isBattleHideTransitioning = true
  _enterBattleHide()
}

/**
 * Undoes the last ship placement action.
 * Reverts UI state, removes ship from grid, and restores it to placement tray.
 * @private
 */
function onClickUndo () {
  if (!friendUI.placingShips) {
    friendUI.placeMode()
  }
  friend.resetShipCells()
  friendUI.clearPlaceVisuals()
  friend.score.reset()
  const ship = placedShipsInstance.popAndRefresh(
    friend.shipCellGrid,
    ship => {
      friendUI.markPlaced(ship.cells, ship)
    },
    ship => {
      friendUI.addShipToTrays(friend.ships, ship)
    }
  )
  friendUI.unplacement(friend, ship)
}

/**
 * Stops test mode and returns UI to ready state.
 * Clears test continuation flag and re-enables test button.
 * @private
 */
function _onClickStopTest () {
  friend.testContinue = false
  friendUI.readyMode()
  friendUI.testBtn.disabled = false
}

/**
 * Builds the button-to-handler mapping for placement mode.
 * Organizes all placement phase controls.
 * @returns {Object<string, Function>} Button ID to handler map
 * @private
 */
function _getPlacementButtonHandlers () {
  return {
    newPlacementBtn: _initializePlacement,
    rotateBtn: onClickRotate,
    rotateLeftBtn: onClickRotateLeft,
    transformBtn: onClickTransform,
    flipBtn: onClickFlip,
    undoBtn: onClickUndo,
    autoBtn: _onClickAutoPlace,
    testBtn: _onClickStartTestMode,
    seekBtn: _onClickStartSeek,
    stopBtn: _onClickStopTest
  }
}

/**
 * Initializes button handlers for placement mode using ButtonManager.
 * Registers handlers and establishes state manager integration.
 * @returns {ButtonManager} Configured button manager instance
 * @private
 */
function _setupHideButtons () {
  buttonManager = new ButtonManager(friendUI)
  buttonManager.registerButtons(_getPlacementButtonHandlers())
  buttonManager.wireUp()
  stateManager.registerModeManager('hide-placement', buttonManager)
  return buttonManager
}

/**
 * Wraps cursor movement with friend UI context.
 * @param {KeyboardEvent} event - Keyboard event triggering cursor move
 * @private
 */
function _moveCursor (event) {
  moveCursorBase(event, friendUI, friend)
}

/**
 * Builds keyboard shortcut handlers for placement/hide mode.
 * Maps keys to placement control functions.
 * @returns {Object<string, Function>} Key to handler map
 * @private
 */
function _getPlacementShortcutHandlers () {
  return {
    c: _initializePlacement,
    r: onClickRotate,
    l: onClickRotateLeft,
    f: onClickFlip,
    x: onClickTransform,
    t: _onClickStartTestMode,
    s: _onClickStopTest,
    u: onClickUndo,
    ArrowUp: event => _moveCursor(event),
    ArrowDown: event => _moveCursor(event),
    ArrowLeft: event => _moveCursor(event),
    ArrowRight: event => _moveCursor(event),
    Tab: event => tabCursor(event, friendUI, friend),
    Enter: event => enterCursor(event, friendUI, friend)
  }
}

/**
 * Initializes and registers a keyboard manager for a game mode.
 * Sets up shortcuts and integrates with state manager.
 * @param {KeyboardShortcutManager} manager - Manager instance
 * @param {string} mode - Mode identifier
 * @param {Object<string, Function>} shortcutHandlers - Key-to-handler map
 * @returns {KeyboardShortcutManager} Initialized manager
 * @private
 */
function _registerKeyboardManager (manager, mode, shortcutHandlers) {
  manager.registerShortcuts(shortcutHandlers)
  manager.activate()
  stateManager.registerModeManager(mode, manager)
  return manager
}

/**
 * Sets up keyboard shortcuts for placement mode.
 * @returns {KeyboardShortcutManager} Placement mode keyboard manager
 * @private
 */
function _setupPlacementKeyboardShortcuts () {
  keyboardManager = _registerKeyboardManager(
    new KeyboardShortcutManager(),
    'hide-placement',
    _getPlacementShortcutHandlers()
  )
  return keyboardManager
}

/**
 * Sets up keyboard shortcuts for seek/battle mode.
 * @returns {KeyboardShortcutManager} Seek mode keyboard manager
 * @private
 */
function _setupSeekKeyboardShortcuts () {
  seekKeyboardManager = _registerKeyboardManager(
    new KeyboardShortcutManager(),
    'hide-seek',
    _getPlacementShortcutHandlers()
  )
  return seekKeyboardManager
}

/**
 * Disables placement control buttons.
 * Used to prevent transforms during placement mode.
 * @param {Object} ui - UI object with button references
 * @private
 */
function _disablePlacementButtons (ui) {
  ui.rotateBtn.disabled = true
  ui.flipBtn.disabled = true
  ui.rotateLeftBtn.disabled = true
  ui.transformBtn.disabled = true
  ui.undoBtn.disabled = true
}

/**
 * Initializes ship placement mode.
 * Resets board state, clears visuals, and sets up placement UI.
 * @private
 */
function _initializePlacement () {
  friend.testContinue = false
  friendUI.testBtn.disabled = false
  friendUI.seekBtn.disabled = false
  friend.ships = []
  friendUI.clearPlaceVisuals()
  friendUI.placeMode()
  friend.resetModel()

  _disablePlacementButtons(friendUI)
  friendUI.showMapTitle()
}

/**
 * Initializes test mode for friend player.
 * Starts AI test execution.
 * @private
 */
function _initializeTest () {
  friend.test()
}

/**
 * Loads previously placed ships and transitions to battle mode.
 * @private
 */
function _loadSavedShipsAndStartBattle () {
  friend.load(null)
  friend.updateUI(friend.ships)
  friendUI.gotoNextStageAfterPlacement()
  _playBattleHide()
}

/**
 * Finalizes navbar initialization and game setup.
 * Shows map selection UI and initializes placement or loads saved state.
 * @private
 */
function _onNavBarReady () {
  uiManager.show('choose-map-container')

  const placedShips = setupGameOptions(
    friendUI.resetBoardSize.bind(friendUI),
    _initializePlacement
  )

  _initializePlacement()

  if (placedShips) {
    _loadSavedShipsAndStartBattle()
  } else {
    friendUI._playBattleHide = _playBattleHide
  }
  friendUI.syncTab()
}

/**
 * Registers placement mode callbacks and UI visibility configuration.
 * @private
 */
function _registerPlacementMode () {
  stateManager.registerModeCallbacks('hide-placement', {
    onInit: () => {
      _setupHideButtons()
      _setupPlacementKeyboardShortcuts()
    },
    onExit: () => {
      // Managers are auto-cleaned up by stateManager
    }
  })

  stateManager.saveUIVisibility('hide-placement', {
    'enemy-container': false
  })
}

/**
 * Registers battle/seek mode callbacks and UI visibility configuration.
 * @private
 */
function _registerBattleMode () {
  stateManager.registerModeCallbacks('hide-seek', {
    onInit: () => {
      _setupSeekKeyboardShortcuts()
      setupEnemy(_onClickReturnToPlacement, _onClickReturnFromTest)
    },
    onExit: () => {
      // Managers are auto-cleaned up by stateManager
    }
  })

  stateManager.saveUIVisibility('hide-seek', {
    'enemy-container': true
  })
}

/**
 * Initializes all service managers, event handlers, and audio.
 * Starts async UI initialization with navbar and game setup.
 * @private
 */
async function _initializeGameServices () {
  _setupHideButtons()
  dragOverPlacingHandlerSetup(friend, friendUI)
  _setupPlacementKeyboardShortcuts()
  bh.audio = new AudioManager()
  bh.audio.init()
}

/**
 * Initializes the hide-and-seek game mode.
 * Loads UI components and prepares initial game state.
 * @private
 */
async function _initializeHideGameMode () {
  _registerPlacementMode()
  _registerBattleMode()
  await _initializeGameServices()
  await fetchNavBar('hide', "Geoff's Hidden Battle (Hide & Seek)")
  _onNavBarReady()
}

// Start game initialization
_initializeHideGameMode()
