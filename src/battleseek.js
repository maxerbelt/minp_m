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
 * @property {Function} resetBoardSize - Resets enemy board display dimensions.
 */

/**
 * @typedef {Object} ModeCallbacks
 * @property {Function} onInit - Called when a mode is initialized.
 * @property {Function} onExit - Called when a mode is exited.
 */

const SEEK_MODE = 'seek'
const NAVBAR_TITLE = "Geoff's Hidden Battle (Seek)"

const uiManager = new UIVisibilityManager()
const stateManager = new GameStateManager(SEEK_MODE)

/**
 * Creates a bound callback for resetting the enemy board size.
 * @returns {Function} Bound reset callback.
 * @private
 */
function _createBoardResetCallback () {
  return enemyUI.resetBoardSize.bind(enemyUI)
}

/**
 * Creates a callback that starts the seek game mode.
 * @returns {Function} Start game callback.
 * @private
 */
function _createGameStartCallback () {
  return () => newGame(SEEK_MODE, () => {}, null)
}

/**
 * Configures game options for seek mode.
 * @private
 */
function _configureSeekGameOptions () {
  setupGameOptions(_createBoardResetCallback(), _createGameStartCallback())
}

/**
 * Creates the seek mode lifecycle callbacks.
 * @returns {ModeCallbacks} Mode callback handlers.
 * @private
 */
function _buildSeekModeCallbacks () {
  return {
    onInit: _initializeSeekMode,
    onExit: () => {
      // No explicit cleanup required for seek mode.
    }
  }
}

/**
 * Registers seek mode callbacks and visible UI state.
 * @private
 */
function _registerSeekMode () {
  stateManager.registerModeCallbacks(SEEK_MODE, _buildSeekModeCallbacks())
  stateManager.saveUIVisibility(SEEK_MODE, {
    'choose-map-container': true
  })
}

/**
 * Loads enemy configuration for seek mode.
 * @private
 */
function _setupEnemyPlayer () {
  setupEnemy()
}

/**
 * Initializes audio services for seek mode.
 * @private
 */
function _initializeAudio () {
  bh.audio = new AudioManager()
  bh.audio.init()
}

/**
 * Loads the navigation bar and applies saved visibility state.
 * @private
 */
async function _loadSeekUI () {
  await fetchNavBar(SEEK_MODE, NAVBAR_TITLE)
  stateManager.applyUIVisibility(uiManager, SEEK_MODE)
}

/**
 * Initializes seek mode state and starts the game.
 * @private
 */
function _initializeSeekMode () {
  _configureSeekGameOptions()
  _setupEnemyPlayer()
  newGame(SEEK_MODE, () => {}, null)
}

/**
 * Bootstraps the seek game mode.
 * @private
 */
async function _initializeSeekGameMode () {
  _registerSeekMode()
  _initializeAudio()
  await _loadSeekUI()
  _initializeSeekMode()
}

await _initializeSeekGameMode()
