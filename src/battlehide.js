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
import { UIVisibilityManager } from './UIVisibilityManager.js'
import { GameStateManager } from './ui/GameStateManager.js'

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

/**
 * Execute friend test mode
 */
function onClickTest () {
  friend.test.bind(friend)()
}

/**
 * Return to ship placement from seek mode
 * Restores UI state and cleans up game state
 */
function _onClickReturnToPlacement () {
  stateManager.switchToMode('hide-placement', {
    onBefore: () => {
      uiManager.hide('enemy-container')
      const tallyTitle = document.getElementById('tally-title')
      const tallyBox = document.getElementById('friend-tally-container')
      tallyBox.prepend(tallyTitle)
      enemy.opponent = null
      friend.opponent = null
    },
    onAfter: _initializePlacement
  })
}

/**
 * Reset friend board for new game
 */
function _resetFriendBoard () {
  friend.restartFriendBoard()
  friend.updateUI(friend.ships)
}

/**
 * Transition to seek mode and start gameplay
 */
function _onClickSeek () {
  friendUI.seekMode()
  _playBattleHide()
}

/**
 * Start battle hide/seek gameplay
 * Transitions UI from placement to battle mode
 */
function __playBattleHide () {
  stateManager.switchToMode('hide-seek', {
    onBefore: () => {
      friendUI.seekMode()
      uiManager.show('enemy-container')
      gameStatus.line.classList.add('small')
      gameStatus.chevron.classList.remove('hidden')

      const tallyTitle = document.getElementById('tally-title')
      const placeControls = document.getElementById('place-controls')
      placeControls.appendChild(tallyTitle)

      enemy.opponent = friend
      friend.opponent = enemy
    },
    onAfter: () => {
      enemy.UI.resetBoardSize()
      friend.setupUntried()
      newGame('hide', _resetFriendBoard, friendUI)
    }
  })
}

/**
 * Auto-place ships and optionally start gameplay
 */
function _onClickAuto () {
  friend.autoPlace2()
  _playBattleHide()
}
function _playBattleHide () {
  if (!bh.test) {
    __playBattleHide()
  }
}

function onClickUndo () {
  if (!friendUI.placingShips) {
    friendUI.placeMode()
  }
  friend.resetShipCells()
  friendUI.clearVisuals()
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
 * Stop test mode and return to ready state
 */
function _onClickStop () {
  friend.testContinue = false
  friendUI.readyMode()
  friendUI.testBtn.disabled = false
}

/**
 * Setup button handlers using declarative ButtonManager
 * Registers all hide mode button actions
 */
function _setupHideButtons () {
  buttonManager = new ButtonManager(friendUI)
  buttonManager.registerButtons({
    newPlacementBtn: _initializePlacement,
    rotateBtn: onClickRotate,
    rotateLeftBtn: onClickRotateLeft,
    transformBtn: onClickTransform,
    flipBtn: onClickFlip,
    undoBtn: onClickUndo,
    autoBtn: _onClickAuto,
    testBtn: onClickTest,
    seekBtn: _onClickSeek,
    stopBtn: _onClickStop
  })
  buttonManager.wireUp()
  stateManager.registerModeManager('hide-placement', buttonManager)
  return buttonManager
}

function moveCursor (event) {
  moveCursorBase(event, friendUI, friend)
}

/**
 * Setup keyboard shortcuts for hide mode using declarative mapping
 * Supports rotation, flipping, transformations, and cursor navigation
 */
function _setupHideKeyboardShortcuts () {
  keyboardManager = new KeyboardShortcutManager()
  const shortcutHandlers = {
    c: _initializePlacement,
    r: onClickRotate,
    l: onClickRotateLeft,
    f: onClickFlip,
    x: onClickTransform,
    t: onClickTest,
    s: _onClickStop,
    u: onClickUndo,
    ArrowUp: event => moveCursor(event),
    ArrowDown: event => moveCursor(event),
    ArrowLeft: event => moveCursor(event),
    ArrowRight: event => moveCursor(event),
    Tab: event => tabCursor(event, friendUI, friend),
    Enter: event => enterCursor(event, friendUI, friend)
  }

  keyboardManager.registerShortcuts(shortcutHandlers)
  keyboardManager.activate()
  stateManager.registerModeManager('hide-placement', keyboardManager)
  return keyboardManager
}

/**
 * Setup keyboard shortcuts for hide-seek mode
 */
function _setupSeekKeyboardShortcuts () {
  seekKeyboardManager = new KeyboardShortcutManager()
  const shortcutHandlers = {
    c: _initializePlacement,
    r: onClickRotate,
    l: onClickRotateLeft,
    f: onClickFlip,
    x: onClickTransform,
    t: onClickTest,
    s: _onClickStop,
    u: onClickUndo,
    ArrowUp: event => moveCursor(event),
    ArrowDown: event => moveCursor(event),
    ArrowLeft: event => moveCursor(event),
    ArrowRight: event => moveCursor(event),
    Tab: event => tabCursor(event, friendUI, friend),
    Enter: event => enterCursor(event, friendUI, friend)
  }

  seekKeyboardManager.registerShortcuts(shortcutHandlers)
  seekKeyboardManager.activate()
  stateManager.registerModeManager('hide-seek', seekKeyboardManager)
  return seekKeyboardManager
}

/**
 * Initialize new ship placement state
 * Setup board, UI, and controls for ship placement
 */
function _initializePlacement () {
  friend.testContinue = false
  friendUI.testBtn.disabled = false
  friendUI.seekBtn.disabled = false
  friend.ships = []
  friendUI.clearVisuals()
  friendUI.placeMode()
  friend.resetModel()
  friend.resetUI(friend.ships)

  _disableHideTransformButtons()
  friendUI.showMapTitle()
}

/**
 * Disable transform buttons during ship placement
 * @private
 */
function _disableHideTransformButtons () {
  friendUI.rotateBtn.disabled = true
  friendUI.flipBtn.disabled = true
  friendUI.rotateLeftBtn.disabled = true
  friendUI.transformBtn.disabled = true
  friendUI.undoBtn.disabled = true
}

/**
 * Initialize game mode after navbar is loaded
 * Sets up game options and either starts fresh placement or loads saved state
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
    friend.load(null)
    friend.updateUI(friend.ships)
    friendUI.gotoNextStageAfterPlacement()
    _playBattleHide()
  } else {
    friendUI._playBattleHide = _playBattleHide
  }
}

// Register mode callbacks for hide-placement (ship placement phase)
stateManager.registerModeCallbacks('hide-placement', {
  onInit: () => {
    _setupHideButtons()
    _setupHideKeyboardShortcuts()
  },
  onExit: () => {
    // Managers are auto-cleaned up by stateManager
  }
})

// Register mode callbacks for hide-seek (battle phase)
stateManager.registerModeCallbacks('hide-seek', {
  onInit: () => {
    // Setup seek mode keyboard shortcuts and enemy setup
    _setupSeekKeyboardShortcuts()
    setupEnemy(_onClickReturnToPlacement)
  },
  onExit: () => {
    // Managers are auto-cleaned up by stateManager
  }
})

// Save UI visibility config for hide placement mode
stateManager.saveUIVisibility('hide-placement', {
  'enemy-container': false
})

// Save UI visibility config for hide seek mode
stateManager.saveUIVisibility('hide-seek', {
  'enemy-container': true
})

// Initialize service managers and event handlers
_setupHideButtons()
dragOverPlacingHandlerSetup(friend, friendUI)
_setupHideKeyboardShortcuts()

// Initialize hide mode UI with navbar, then setup game mode
fetchNavBar('hide', "Geoff's Hidden Battle (Hide & Seek)", _onNavBarReady)
