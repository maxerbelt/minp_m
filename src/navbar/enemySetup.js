import { bh } from '../terrains/all/js/bh.js'
import { enemy } from '../waters/enemy.js'
import { KeyboardShortcutManager } from './KeyboardShortcutManager.js'

/**
 * @typedef {Object} EnemyUI
 * @property {function(): void} refreshButtons
 * @property {Object<string, HTMLElement>} buttons
 * @property {Object<string, HTMLElement>} weaponBtns
 * @property {function(function, function, Object, Object): void} buildBoardHover
 * @property {function(): void} removeHighlightAoE
 */

/**
 * @typedef {Object} WeaponSystem
 * @property {Object} weapon
 */

/**
 * @typedef {Object} LoadOutModel
 * @property {Array<Array<number>>} [selectedCoordinates]
 * @property {Array<Array<number>>} [coordinates]
 * @property {Object} [selectedWeapon]
 * @property {function(): WeaponSystem} getCurrentWeaponSystem
 */

/**
 * @typedef {Object} BoardMap
 * @property {function(number, number): boolean} inBounds
 */

let cleanupOpponentBoard = null

/**
 * CRITICAL: bh.seekingMode semantic documentation
 * ================================================
 * bh.seekingMode indicates which PLAYER is in the hidden position:
 *
 * bh.seekingMode = true:
 *   - PLAYER (you) is SEEKING/HUNTING
 *   - OPPONENT (enemy) is HIDING with no visible ships
 *   - Click behavior: single-click targeting on empty board, reveal opponent ships as you hit
 *
 * bh.seekingMode = false:
 *   - PLAYER (you) are HIDING with visible ships
 *   - OPPONENT (friend) is SEEKING/HUNTING
 *   - Click behavior: two-click targeting on opponent board with visible ships
 *
 * REGRESSION PREVENTION:
 * A previous weapon selection bug occurred because code checked:
 *   bh.seekingMode && opponent?.hasAttachedWeapons
 * This was WRONG because in Hide mode (seekingMode=false), opponent.hasAttachedWeapons=true,
 * making the && condition impossible in Hide mode and breaking two-click targeting.
 *
 * CORRECT APPROACH: Always check opponent?.hasAttachedWeapons INDEPENDENTLY.
 * Do NOT couple weapon selection behavior to bh.seekingMode.
 * The mode only affects WHAT SHIPS ARE VISIBLE, not HOW TARGETING WORKS.
 *
 * LESSON: Game state flags should be checked for their specific meaning,
 * not combined with other flags in ways that create impossible conditions.
 */

/**
 * Start a new enemy game with optional opponent board setup.
 * Initializes game mode flag (seeking vs hiding) and sets up board state.
 *
 * @param {string} seek - Game mode indicator: 'seek' for seeking mode, anything else for hiding mode
 * @param {function(): void|null} opponentBoard - Cleanup function for previous board state
 * @param {Object|null} friendUI - Friend player UI (if available)
 */
export function newGame (seek, opponentBoard, friendUI) {
  // Set game mode flag: true if player is seeking, false if player is hiding
  // This determines what's visible and click behavior, but NOT weapon selection logic
  bh.seekingMode = seek === 'seek'

  // In seeking mode, enemy ships are hidden (player hasn't discovered them yet)
  // Clear the ships array so opponent board starts empty
  if (bh.seekingMode) {
    enemy.ships = []
  }

  // Reset enemy state machine and UI to initial game state
  enemy.resetModel()
  _updateEnemyTitle()
  _initializeOpponentBoard(opponentBoard, friendUI)
  _initializeEnemyBoardHover()

  // Configure board targeting for current game mode
  // (Does NOT affect weapon selection - that's determined by opponent?.hasAttachedWeapons)
  enemy.setBoardTargetingState(bh.seekingMode)

  // Initialize weapon button click handlers
  // This MUST happen regardless of bh.seekingMode value
  enemy.setupWeaponButtonHandlers()
}

/**
 * Update enemy title text using the current terrain heading.
 * @private
 */
function _updateEnemyTitle () {
  const title = document.getElementById('enemy-title')
  if (title) {
    title.textContent = 'Enemy ' + bh.terrain.mapHeading
  }
}

/**
 * Initialize the opponent board cleanup or arm weapons for a friend UI.
 * @private
 */
function _initializeOpponentBoard (opponentBoard, friendUI) {
  if (cleanupOpponentBoard) {
    cleanupOpponentBoard()
    return
  }

  if (opponentBoard && friendUI) {
    cleanupOpponentBoard = opponentBoard
    friendUI.clearFriendClasses()
    enemy.opponent?.armWeapons()
  }
}

/**
 * Configure enemy board hover behavior.
 * @private
 */
function _initializeEnemyBoardHover () {
  enemy.UI.buildBoardHover(
    _highlightAreaOfEffect,
    enemy.UI.removeHighlightAoE,
    enemy.UI,
    enemy
  )
}

/**
 * Highlight the area of effect for the current selected weapon.
 * @param {Object} model
 * @param {number} r
 * @param {number} c
 */
function _highlightAreaOfEffect (model, r, c) {
  const map = bh.map
  if (!map.inBounds(r, c)) return

  const viewModel = model.UI
  const coordinates = _getActiveCoordinates(model)
  const weapon = _getActiveWeapon(model)

  viewModel.removeHighlightAoE()

  const targetCoordinates = [...coordinates, [r, c]]
  if (!weapon || weapon.points > targetCoordinates.length) return

  _applyAreaEffectHighlight(map, viewModel, weapon, targetCoordinates)
}

/**
 * Returns either selected coordinates or the default loadout coordinates.
 * @private
 * @param {Object} model
 * @returns {Array<Array<number>>}
 */
function _getActiveCoordinates (model) {
  return model.loadOut?.selectedCoordinates || model.loadOut?.coordinates || []
}

/**
 * Returns the current weapon object for the loaded model.
 * @private
 * @param {Object} model
 * @returns {Object|undefined}
 */
function _getActiveWeapon (model) {
  const selectedWeapon = model.loadOut?.selectedWeapon
  const weaponSystem = selectedWeapon || model.loadOut?.getCurrentWeaponSystem()
  return weaponSystem?.weapon
}

/**
 * Adds visual highlights for splash area of effect cells.
 * @private
 * @param {BoardMap} map
 * @param {Object} viewModel
 * @param {Object} weapon
 * @param {Array<Array<number>>} targetCoordinates
 */
function _applyAreaEffectHighlight (map, viewModel, weapon, targetCoordinates) {
  const cells = weapon.splashAoe(map, targetCoordinates)

  for (const [rr, cc, power] of cells) {
    if (!map.inBounds(rr, cc)) continue

    const cell = viewModel.gridCellAt(rr, cc)
    const cellClass = bh.splashTags[power]
    cell.classList.add(cellClass, 'target')
  }
}

/**
 * Setup keyboard shortcuts for seek mode.
 * Supports placement, test, new game, reveal, and weapon selection.
 * @private
 */
function _initializeSeekShortcuts (placementHandler, testHandler) {
  const shortcutMgr = new KeyboardShortcutManager()
  const shortcuts = _buildSeekShortcuts(placementHandler, testHandler)

  shortcutMgr.registerShortcuts(shortcuts)
  shortcutMgr.activate()

  return () => shortcutMgr.deactivate()
}

/**
 * Build the shortcuts object for seek mode.
 * @private
 */
function _buildSeekShortcuts (placementHandler, testHandler) {
  const shortcuts = {
    p: () => placementHandler?.(),
    t: () => testHandler?.(),
    r: () => newGame(),
    q: () => enemy.onClickReveal(),
    s: () => enemy.onClickSingleShotButton()
  }

  const weaponButtons = enemy.UI?.weaponBtns || {}
  for (const button of Object.values(weaponButtons)) {
    const letter = button.dataset.letter
    if (letter) {
      shortcuts[letter.toLowerCase()] = () => enemy.onClickWeaponButtons(letter)
    }
  }

  return shortcuts
}

/**
 * Add click handler to an element if it exists.
 * @private
 */
function _attachClickHandler (element, handler) {
  if (element?.addEventListener && typeof handler === 'function') {
    element.addEventListener('click', handler)
  }
}

export function setupEnemy (placementHandler, testHandler) {
  enemy.UI?.refreshButtons?.()

  _attachClickHandler(
    enemy.UI?.buttons?.restart,
    newGame.bind(null, 'seek', null)
  )
  enemy.wireupButtons()

  _attachClickHandler(enemy.UI?.buttons?.place, placementHandler)
  _attachClickHandler(enemy.UI?.buttons?.test, testHandler)

  return _initializeSeekShortcuts(placementHandler, testHandler)
}
