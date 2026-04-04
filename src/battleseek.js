import { fetchNavBar } from './navbar/navbar.js'
import { setupGameOptions } from './navbar/setupOptions.js'
import { setupEnemy, newGame } from './navbar/enemySetup.js'
import { enemyUI } from './waters/enemyUI.js'
import { UIVisibilityManager } from './ui/UIVisibilityManager.js'
import { GameStateManager } from './ui/GameStateManager.js'

// Initialize UI manager for visibility control
const uiManager = new UIVisibilityManager()
const stateManager = new GameStateManager('seek')

/**
 * Initialize seek mode gameplay
 * Setup map selection and enemy board
 */
function _initializeSeekMode () {
  setupGameOptions(enemyUI.resetBoardSize.bind(enemyUI), () => newGame('seek'))
  setupEnemy()

  // Start the game
  newGame('seek')
}

// Register mode callbacks for seek mode
stateManager.registerModeCallbacks('seek', {
  onInit: _initializeSeekMode,
  onExit: () => {
    // Cleanup happens automatically
  }
})

// Save UI visibility config for seek mode
stateManager.saveUIVisibility('seek', {
  'choose-map-container': true
})

// Setup seek mode UI
fetchNavBar('seek', "Geoff's Hidden Battle (Seek)", function () {
  stateManager.applyUIVisibility(uiManager, 'seek')
  _initializeSeekMode()
})
