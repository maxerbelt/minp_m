import { bh } from '../terrain/bh.js'
import { enemy } from '../waters/enemy.js'
import { KeyboardShortcutManager } from './KeyboardShortcutManager.js'

let otherboard = null
const newGameBtn = document.getElementById('newGame')
export function newGame (seek, opponentBoard, friendUI) {
  bh.seekingMode = seek === 'seek'
  if (bh.seekingMode) {
    enemy.ships = []
  }
  enemy.resetModel()
  enemy.resetUI(enemy.ships)
  enemy.updateMode()
  const title = document.getElementById('enemy-title')
  title.textContent = 'Enemy ' + bh.terrain.mapHeading

  if (otherboard) {
    otherboard()
  } else if (opponentBoard && friendUI) {
    otherboard = opponentBoard
    friendUI.clearFriendClasses()
    enemy.setupAttachedAim()
  }
}

/**
 * Setup keyboard shortcuts for seek mode
 * Supports placement (P), new game (R), reveal (V), and mode toggle (M/S)
 * @private
 */
function _setupSeekShortcuts (placement) {
  // Create keyboard shortcut manager with seek mode handlers
  const shortcutMgr = new KeyboardShortcutManager()

  // Register shortcut handlers
  const shortcuts = {
    p: () => {
      if (placement) placement()
    },
    r: () => newGame(),
    v: () => enemy.onClickReveal(),
    m: () => enemy.onClickWeaponMode(),
    s: () => enemy.onClickWeaponMode()
  }

  shortcutMgr.registerShortcuts(shortcuts)
  shortcutMgr.activate()

  // Return cleanup function
  return () => shortcutMgr.deactivate()
}

export function setupEnemy (placement) {
  // Wire button handlers
  newGameBtn.addEventListener('click', newGame.bind(null, 'seek', null))
  enemy.wireupButtons()

  // Setup optional placement button if provided
  if (placement) {
    const newPlaceBtn = document.getElementById('newPlace2')
    if (newPlaceBtn) {
      newPlaceBtn.addEventListener('click', placement)
    }
  }

  // Setup keyboard shortcuts and return cleanup function
  return _setupSeekShortcuts(placement)
}
