/**
 * @fileoverview Battle Hide & Seek Game Mode
 * Manages the hide-and-seek game mode including ship placement, test mode, and battle initialization.
 * Handles UI transitions, keyboard shortcuts, button controls, and game state management.
 * @module battlehide
 */

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
 * @property {Object} UI - Friend player UI interface with board controls
 * @property {Function} test - Execute test mode for AI verification
 * @property {boolean} testContinue - Flag controlling test mode continuation
 * @property {Function} autoPlace2 - Automatically place remaining ships on board
 * @property {Function} load - Load previously saved player state and ships
 * @property {Function} updateUI - Refresh UI display with current game state
 * @property {Function} setupUntried - Initialize untried coordinate tracking for targeting
 * @property {Object} opponent - Reference to opposing player (Enemy)
 * @property {Array<Object>} ships - Array of placed ship objects
 * @property {Function} restartBoard - Restart board to initial state
 * @property {Function} resetModel - Reset internal player model state
 * @property {Function} resetShipCells - Clear ship cell placements from grid
 * @property {Object} shipCellGrid - Grid tracking cell-level ship placement
 * @property {Object} score - Player score tracking object
 * @property {Function} moveCursor - Move cursor in specified direction
 */

/**
 * @typedef {Object<string, Function>} ButtonHandlers
 * Map of button element IDs to their event handler functions
 */

/**
 * @typedef {Object<string, Function>} ShortcutHandlers
 * Map of keyboard keys/shortcuts to their handler functions
 */

/**
 * @typedef {Object} EnemyPlayer
 * @property {Object} UI - Enemy UI interface with board display
 * @property {Object} opponent - Reference to opposing player (Friend)
 * @property {Function} setupAttachedAim - Setup targeting reticle on friend board
 */

/**
 * @typedef {Object} GameStatusUI
 * @property {HTMLElement} line - Status message line element
 * @property {HTMLElement} chevron - Expandable chevron indicator element
 */

/**
 * @typedef {Object} ModeTransitionCallbacks
 * @property {?Function} onBefore - Callback executed before mode transition
 * @property {?Function} onAfter - Callback executed after mode transition
 */

/**
 * @typedef {Object<string, boolean>} UIVisibilityConfig
 * Map of UI element IDs to their visibility state (true=show, false=hide)
 */

/**
 * Friend player instance representing the human player.
 * Manages ship placement, board state, and player-specific game logic.
 * @type {FriendPlayer}
 */
const friend = makeFriend()
placedShipsInstance.registerUndo(friend.UI.undoBtn, friend.UI.newPlacementBtn)

/**
 * Friend player UI reference for convenient access to UI methods.
 * @type {Object}
 */
const friendUI = friend.UI

friendUI.resetBoardSize()

/**
 * Central state management system for hide-and-seek game modes.
 * Coordinates mode switching between placement and battle phases.
 * @type {GameStateManager}
 * @const
 */
const stateManager = new GameStateManager('hide-placement')

/**
 * UI visibility controller managing element display state across modes.
 * @type {UIVisibilityManager}
 * @const
 */
const uiManager = new UIVisibilityManager()

/**
 * Button event handler manager for placement mode.
 * Manages all button interactions and state integration.
 * @type {?ButtonManager}
 */
let buttonManager = null

/**
 * Keyboard shortcut manager for placement mode.
 * Handles single-key shortcuts and arrow navigation.
 * @type {?KeyboardShortcutManager}
 */
let keyboardManager = null

/**
 * Keyboard shortcut manager for seek/battle mode.
 * Handles keyboard shortcuts during active gameplay.
 * @type {?KeyboardShortcutManager}
 */
let seekKeyboardManager = null

/**
 * Flag preventing concurrent battle mode transitions.
 * Ensures only one transition occurs when auto-placing or accepting placement.
 * @type {boolean}
 */
let isBattleHideTransitioning = false

/**
 * Hides the enemy container UI element.
 * Removes enemy board and controls from display during placement phase.
 * @returns {void}
 * @private
 */
function hideEnemyContainer () {
  uiManager.hide('enemy-container')
}

/**
 * Moves the tally title back to the friend tally container.
 * Restores tally display to placement mode layout.
 * @returns {void}
 * @private
 */
function restoreTallyTitle () {
  const tallyTitle = document.getElementById('tally-title')
  const tallyBox = document.getElementById('friend-tally-container')
  tallyBox.prepend(tallyTitle)
}

/**
 * Resets opponent references for both players.
 * Clears bidirectional opponent relationships.
 * @returns {void}
 * @private
 */
function resetOpponents () {
  enemy.opponent = null
  friend.opponent = null
}

/**
 * Shows the enemy container and adjusts status line styling.
 * Displays enemy board and updates status display for battle mode.
 * @returns {void}
 * @private
 */
function showEnemyContainer () {
  uiManager.show('enemy-container')
  gameStatus.line.classList.add('small')
  gameStatus.chevron.classList.remove('hidden')
}

/**
 * Moves the tally title to the place controls container.
 * Repositions tally display for battle mode layout.
 * @returns {void}
 * @private
 */
function moveTallyTitleToPlaceControls () {
  const tallyTitle = document.getElementById('tally-title')
  const placeControls = document.getElementById('place-controls')
  placeControls.appendChild(tallyTitle)
}

/**
 * Sets opponent references between friend and enemy players.
 * Establishes bidirectional player relationship for game interaction.
 * @returns {void}
 * @private
 */
function setOpponents () {
  enemy.opponent = friend
  friend.opponent = enemy
}

/**
 * Transitions to a game mode with optional callbacks.
 * Encapsulates common mode transition logic and state cleanup through GameStateManager.
 * @param {string} targetMode - Target mode identifier ('hide-placement' or 'hide-seek')
 * @param {?Function} [onBefore] - Callback executed before mode transition completes
 * @param {?Function} [onAfter] - Callback executed after mode transition completes
 * @returns {void}
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
 * Cleans up battle mode visuals and resets opponent references.
 * @returns {void}
 * @private
 */
function _prepareReturnToPlacement () {
  hideEnemyContainer()
  restoreTallyTitle()
  resetOpponents()
}

/**
 * Returns to ship placement mode from seek/battle mode.
 * Resets opponent relationships and reinitializes placement UI state.
 * @returns {void}
 * @private
 */
function handleReturnToPlacement () {
  _transitionToMode(
    'hide-placement',
    _prepareReturnToPlacement,
    _initializePlacement
  )
}

/**
 * Returns to placement mode after test play completes.
 * Triggers test play, then resets to placement state with test callbacks.
 * @returns {void}
 * @private
 */
function handleReturnFromTest () {
  _transitionToMode(
    'hide-placement',
    _prepareReturnToPlacement,
    _initializeTest
  )
}

/**
 * Executes friend player test mode.
 * Triggers AI verification test for ship placement strategy.
 * @returns {void}
 * @private
 */
function handleStartTestMode () {
  friend.test.bind(friend)()
}

/**
 * Resets and reinitializes the friend player's board.
 * Used for starting fresh games or resetting to clean board state.
 * @returns {void}
 * @private
 */
function _resetFriendBoard () {
  friend.restartBoard(true)
  friend.updateUI(friend.ships)
}

/**
 * Transitions to seek mode and initiates battle/hide gameplay.
 * Switches UI to seek mode and triggers battle initialization.
 * @returns {void}
 * @private
 */
function handleStartSeek () {
  friendUI.seekMode()
  _playBattleHide()
}

/**
 * Prepares UI for battle/seek mode initialization.
 * Toggles visibility, adjusts layout, and establishes opponent relationships for combat.
 * @returns {void}
 * @private
 */
function _prepareBattleUIState () {
  friendUI.seekMode()
  showEnemyContainer()
  moveTallyTitleToPlaceControls()
  setOpponents()
}

/**
 * Finalizes battle/seek mode by resetting boards and starting game.
 * Initializes enemy board, coordinates, and begins combat gameplay.
 * @returns {void}
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
 * Coordinates UI state changes and full game initialization for combat.
 * @returns {void}
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
 * Automatically positions remaining ships and prepares for combat if not testing.
 * @returns {void}
 * @private
 */
function handleAutoPlace () {
  friend.autoPlace2()
  _playBattleHide()
}

/**
 * Enters battle/hide mode if not in test mode.
 * Prevents transition to battle during test scenarios or concurrent transitions.
 * @returns {void}
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
 * Resets board state and score tracking.
 * @returns {void}
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
 * Clears test continuation flag and re-enables test button for new test.
 * @returns {void}
 * @private
 */
function handleStopTest () {
  friend.testContinue = false
  friendUI.readyMode()
  friendUI.testBtn.disabled = false
}

/**
 * Builds the button-to-handler mapping for placement mode.
 * Organizes all placement phase controls including rotation, flip, transforms, and mode transitions.
 * @returns {ButtonHandlers} Map of button IDs to their handler functions
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
    autoBtn: handleAutoPlace,
    testBtn: handleStartTestMode,
    seekBtn: handleStartSeek,
    stopBtn: handleStopTest
  }
}

/**
 * Initializes button handlers for placement mode using ButtonManager.
 * Registers all handlers and establishes state manager integration for button lifecycle.
 * @returns {ButtonManager} Configured button manager instance with all handlers wired up
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
 * Builds keyboard shortcut handlers for placement/hide mode.
 * Maps keys to placement control functions including transforms, navigation, and mode changes.
 * Key mappings: c=clear, r=rotate, l=rotateLeft, f=flip, x=transform, t=test, s=stopTest, u=undo.
 * @returns {ShortcutHandlers} Map of keyboard keys to their handler functions
 * @private
 */
function _getPlacementShortcutHandlers () {
  return {
    c: _initializePlacement,
    r: onClickRotate,
    l: onClickRotateLeft,
    f: onClickFlip,
    x: onClickTransform,
    t: handleStartTestMode,
    s: handleStopTest,
    u: onClickUndo,
    ArrowUp: friend.moveCursor.bind(friend),
    ArrowDown: friend.moveCursor.bind(friend),
    ArrowLeft: friend.moveCursor.bind(friend),
    ArrowRight: friend.moveCursor.bind(friend),
    Tab: event => tabCursor(event, friendUI, friend),
    Enter: event => enterCursor(event, friendUI, friend)
  }
}

/**
 * Initializes and registers a keyboard manager for a game mode.
 * Sets up shortcuts, activates manager, and integrates with state manager lifecycle.
 * @param {KeyboardShortcutManager} manager - Manager instance to configure
 * @param {string} mode - Mode identifier ('hide-placement' or 'hide-seek')
 * @param {ShortcutHandlers} shortcutHandlers - Map of keyboard keys to handler functions
 * @returns {KeyboardShortcutManager} Initialized and activated manager
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
 * Initializes and registers keyboard manager with placement-specific shortcuts.
 * @returns {KeyboardShortcutManager} Activated placement mode keyboard manager
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
 * Initializes and registers keyboard manager with seek-specific shortcuts.
 * @returns {KeyboardShortcutManager} Activated seek mode keyboard manager
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
 * Prevents transform operations (rotate, flip, etc.) during initial placement setup.
 * @param {Object} ui - UI object with button element references
 * @returns {void}
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
 * Resets board state, clears visuals, and sets up placement UI with fresh canvas.
 * @returns {void}
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
 * Starts AI verification test execution.
 * @returns {void}
 * @private
 */
function _initializeTest () {
  friend.test()
}

/**
 * Loads previously placed ships and transitions to battle mode.
 * Restores saved ship configuration and initiates battle/hide gameplay.
 * @returns {void}
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
 * Shows map selection UI, initializes placement, or loads saved state based on config.
 * @returns {void}
 * @private
 */
function _onNavBarReady () {
  uiManager.show('choose-map-container')
  friendUI.onFleetPlaced = () => enemy.setupAttachedAim()
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
 * Sets up mode lifecycle handlers and determines which UI elements display in placement phase.
 * @returns {void}
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
 * Sets up mode lifecycle handlers and determines which UI elements display in battle phase.
 * @returns {void}
 * @private
 */
function _registerBattleMode () {
  stateManager.registerModeCallbacks('hide-seek', {
    onInit: () => {
      _setupSeekKeyboardShortcuts()
      setupEnemy(handleReturnToPlacement, handleReturnFromTest)
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
 * Initializes all service managers, event handlers, and audio systems.
 * Sets up button managers, drag handlers, keyboard shortcuts, and audio engine.
 * @returns {Promise<void>}
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
 * Registers modes, initializes services, fetches navbar, and starts initial game state.
 * Orchestrates complete game mode setup sequence.
 * @returns {Promise<void>}
 * @private
 */
async function _initializeHideGameMode () {
  _registerPlacementMode()
  _registerBattleMode()
  await _initializeGameServices()
  await fetchNavBar('hide', "Geoff's Hidden Battle (Hide & Seek)")
  _onNavBarReady()
}

/**
 * Initialize the hide-and-seek game mode on module load.
 * Orchestrates async setup of all game systems and UI.
 */
await _initializeHideGameMode()
