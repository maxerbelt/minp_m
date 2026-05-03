import { bh } from './terrains/all/js/bh.js'
import { fetchNavBar } from './navbar/navbar.js'
import { setupGameOptions } from './navbar/setupOptions.js'
import { setupEnemy, newGame } from './navbar/enemySetup.js'
import { enemyUI } from './waters/enemyUI.js'
import { UIVisibilityManager } from './ui/UIVisibilityManager.js'
import { GameStateManager } from './ui/GameStateManager.js'
import { AudioManager } from './core/AudioManager.js'

/**
 * @typedef {Object} EnemyUI
 * @property {Function} resetBoardSize - Resets enemy board display dimensions
 */

// Initialize UI manager for visibility control
const uiManager = new UIVisibilityManager()
const stateManager = new GameStateManager('seek')

/**
 * Prepares the board reset callback for game initialization.
 * @returns {Function} Bound reset function
 * @private
 */
function _getBoardResetCallback () {
  return enemyUI.resetBoardSize.bind(enemyUI)
}

/**
 * Creates the game start callback for use in setup.
 * @returns {Function} Callback to start new game
 * @private
 */
function _getGameStartCallback () {
  return () => newGame('seek')
}

/**
 * Configures game options with callbacks for board reset and game start.
 * @private
 */
function _setupGameConfiguration () {
  setupGameOptions(_getBoardResetCallback(), _getGameStartCallback())
}

/**
 * Sets up enemy player for seek mode gameplay.
 * @private
 */
function _setupEnemyPlayer () {
  setupEnemy()
}

/**
 * Starts a new game in seek mode.
 * Initializes the game state and begins play.
 * @private
 */
function _startSeekGame () {
  newGame('seek')
}

/**
 * Initializes seek mode gameplay.
 * Coordinates setup of game options, enemy player, and game start.
 * @private
 */
function _initializeSeekMode () {
  _setupGameConfiguration()
  _setupEnemyPlayer()
  _startSeekGame()
}

/**
 * Registers seek mode callbacks and UI configuration with state manager.
 * @private
 */
function _registerSeekMode () {
  stateManager.registerModeCallbacks('seek', {
    onInit: _initializeSeekMode,
    onExit: () => {
      // Cleanup happens automatically
    }
  })

  stateManager.saveUIVisibility('seek', {
    'choose-map-container': true
  })
}

/**
 * Initializes audio manager for seek mode.
 * Sets up audio playback and effects.
 * @private
 */
function _initializeAudio () {
  bh.audio = new AudioManager()
  bh.audio.init()
}

/**
 * Loads and applies seek mode UI from navbar.
 * Displays the navigation bar and applies saved UI visibility state.
 * @private
 */
async function _loadAndApplyUI () {
  await fetchNavBar('seek', "Geoff's Hidden Battle (Seek)")
  stateManager.applyUIVisibility(uiManager, 'seek')
}

/**
 * Initializes the seek game mode.
 * Orchestrates registration, audio setup, UI loading, and game initialization.
 * @private
 */
async function _initializeSeekGameMode () {
  _registerSeekMode()
  _initializeAudio()
  await _loadAndApplyUI()
  _initializeSeekMode()
}

// Start seek game initialization
_initializeSeekGameMode()
