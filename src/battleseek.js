/**
 * @fileoverview Battle Seek Game Mode
 * Manages the seek game mode where the player searches for enemy ships.
 * Handles UI initialization, enemy setup, game configuration, and mode lifecycle.
 * @module battleseek
 */

import { bh } from './terrains/all/js/bh.js'
import { fetchNavBar } from './navbar/navbar.js'
import { setupGameOptions } from './navbar/setupOptions.js'
import { setupEnemy, newGame } from './navbar/enemySetup.js'
import { enemyUI } from './waters/enemyUI.js'
import { UIVisibilityManager } from './ui/UIVisibilityManager.js'
import { GameStateManager } from './ui/GameStateManager.js'
import { AudioManager } from './core/AudioManager.js'

/**
 * Represents the enemy player UI interface.
 * Manages enemy board display and interaction elements.
 * @typedef {Object} EnemyUI
 * @property {Function} resetBoardSize - Resets enemy board display to default dimensions
 * @property {Object} [board] - Enemy game board reference
 * @property {Array} [controls] - Array of enemy board UI control elements
 */

/**
 * Represents mode lifecycle callbacks for state management.
 * Executes custom logic during mode transitions.
 * @typedef {Object} ModeCallbacks
 * @property {Function} onInit - Executed when entering a game mode for initialization
 * @property {Function} onExit - Executed when exiting a game mode for cleanup
 */

/**
 * Represents UI visibility configuration for a game mode.
 * Maps UI element IDs to their visibility state.
 * @typedef {Object<string, boolean>} UIVisibilityConfig
 */

/**
 * Represents audio manager for game sound and music control.
 * @typedef {Object} AudioManager
 * @property {Function} init - Initialize audio system
 * @property {Function} play - Play sound effect
 * @property {Function} stop - Stop sound playback
 */

/**
 * Game mode identifier for seek/battle phase.
 * @type {string}
 * @const
 */
const SEEK_MODE = 'seek'

/**
 * Navigation bar title displayed during seek mode.
 * @type {string}
 * @const
 */
const NAVBAR_TITLE = "Geoff's Hidden Battle (Seek)"

/**
 * UI visibility controller managing element display state across game modes.
 * Controls which UI elements are shown or hidden during seek mode.
 * @type {UIVisibilityManager}
 * @const
 */
const uiManager = new UIVisibilityManager()

/**
 * Central state management system for seek mode.
 * Coordinates mode initialization, transitions, and lifecycle callbacks.
 * @type {GameStateManager}
 * @const
 */
const stateManager = new GameStateManager(SEEK_MODE)

/**
 * Creates a bound callback for resetting the enemy board size.
 * Returns a function that can be called to reset enemy board dimensions.
 * @returns {Function} Bound reset board size callback function
 * @private
 */
function _createBoardResetCallback () {
  return enemyUI.resetBoardSize.bind(enemyUI)
}

/**
 * Creates a callback that starts the seek game mode.
 * Returns a function that initializes and begins seek mode gameplay.
 * @returns {Function} Callback function that starts the game
 * @private
 */
function _createGameStartCallback () {
  return () => newGame(SEEK_MODE, () => {}, null)
}

/**
 * Configures game options for seek mode.
 * Sets up board reset and game start callbacks for gameplay initialization.
 * @returns {void}
 * @private
 */
function _configureSeekGameOptions () {
  setupGameOptions(_createBoardResetCallback(), _createGameStartCallback())
}

/**
 * Creates the seek mode lifecycle callbacks.
 * Builds object with initialization and exit handlers for mode transitions.
 * @returns {ModeCallbacks} Object containing onInit and onExit callback functions
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
 * Sets up mode lifecycle handlers and UI visibility configuration for seek phase.
 * @returns {void}
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
 * Initializes enemy player state and AI for seeking phase.
 * @returns {void}
 * @private
 */
function _setupEnemyPlayer () {
  setupEnemy()
}

/**
 * Initializes audio services for seek mode.
 * Creates and initializes the global audio manager for sound effects and music.
 * @returns {void}
 * @private
 */
function _initializeAudio () {
  bh.audio = new AudioManager()
  bh.audio.init()
}

/**
 * Loads the navigation bar and applies saved visibility state.
 * Fetches navbar UI components and applies mode-specific visibility configuration.
 * @returns {Promise<void>}
 * @private
 */
async function _loadSeekUI () {
  await fetchNavBar(SEEK_MODE, NAVBAR_TITLE)
  stateManager.applyUIVisibility(uiManager, SEEK_MODE)
}

/**
 * Initializes seek mode state and starts the game.
 * Configures game options, sets up enemy, and begins gameplay.
 * @returns {void}
 * @private
 */
function _initializeSeekMode () {
  _configureSeekGameOptions()
  _setupEnemyPlayer()
  newGame(SEEK_MODE, () => {}, null)
}

/**
 * Bootstraps the seek game mode.
 * Orchestrates complete initialization sequence including mode registration, audio setup, UI loading, and game initialization.
 * @returns {Promise<void>}
 * @private
 */
async function _initializeSeekGameMode () {
  _registerSeekMode()
  _initializeAudio()
  await _loadSeekUI()
  _initializeSeekMode()
}

/**
 * Initialize seek game mode on module load.
 * Orchestrates async setup of all game systems and UI.
 */
await _initializeSeekGameMode()
