import { bh } from '../terrains/all/js/bh.js'
import { gameStatus } from './StatusUI.js'
import { PlacementUI } from './placementUI.js'
import { trackLevelEnd } from '../navbar/gtag.js'
import { CellClassManager } from './helpers/CellClassManager.js'

/** @enum {string} */
const UI_MODES = {
  PLACING: 'placing',
  READY: 'ready',
  TESTING: 'testing',
  SEEKING: 'seeking'
}

/** @enum {string} */
const UI_SELECTORS = {
  CHOOSE_CONTROLS: '#choose-controls',
  TAB_HIDE: '#tab-hide'
}

/** @enum {string} */
const UI_CLASSES = {
  HIDDEN: 'hidden',
  DESTROYED: 'destroyed',
  HIT: 'hit',
  PLACED: 'placed',
  ACTIVE: 'active',
  EMPTY: 'empty',
  WEAPON: 'weapon',
  MEDIUM: 'medium',
  SMALL: 'small',
  ALT: 'alt'
}

/**
 * @typedef {Object} FriendUIConfig
 * @property {string} tabText
 * @property {boolean} showPlacingControls
 * @property {boolean} showGameControls
 * @property {boolean} showShipTrays
 * @property {boolean} showTransformBtns
 * @property {boolean} showTips
 * @property {boolean} showStatus
 * @property {boolean} standardPanels
 * @property {boolean} clearBoardCells
 * @property {boolean} addAltPanels
 */

/**
 * @typedef {Object} ScoreLabelVisibility
 * @property {boolean} placed
 * @property {boolean} shots
 * @property {boolean} hits
 * @property {boolean} sunk
 * @property {boolean} reveals
 * @property {boolean} hints
 */

const MODE_TAB_TEXT = {
  [UI_MODES.PLACING]: 'Hide and Seek Game',
  [UI_MODES.READY]: 'Hide Game',
  [UI_MODES.TESTING]: 'Hide Game',
  [UI_MODES.SEEKING]: 'Hide and Seek Game'
}

const SCORE_LABEL_KEYS = ['placed', 'shots', 'hits', 'sunk', 'reveals', 'hints']

const MODE_SCORE_LABELS = {
  [UI_MODES.PLACING]: {
    placed: true,
    shots: false,
    hits: false,
    sunk: false,
    reveals: false,
    hints: false
  },
  [UI_MODES.READY]: {
    placed: false,
    shots: true,
    hits: true,
    sunk: true,
    reveals: true,
    hints: true
  }
}

/**
 * UI class for friendly game mode, handling ship placement and game states.
 */
export class FriendUI extends PlacementUI {
  /**
   * Initializes the FriendUI with default mode and UI elements.
   */
  constructor () {
    super('friend', 'Friendly')
    /** @type {string} */
    this.mode = UI_MODES.PLACING
    /** @type {boolean} */
    this.showShips = true
    /** @type {string[]} */
    this.tips = [
      'Drag ships from the trays onto the board.',
      'Click a ship in the tray to select it, then click on the buttons to rotate and flip',
      'While a ship is selected, use the rotate, rotate left and flip buttons to change its orientation.',
      'You can also use modifier keys while dragging: Control (or Command on Mac) to rotate left, Option (or Alt) to flip, Shift to rotate right.',
      'Use the undo button to remove the last placed ship.',
      'Once all ships are placed, you can test your placement or start a game against the computer.'
    ]

    /** @type {string} */
    this.addText = ' placed'
    /** @type {string} */
    this.removeText = ' unplaced'
    this._initializeUIElements()
    /** @type {Function|null} */
    this._playBattleHide = null
  }

  /**
   * Initializes UI elements by caching DOM references.
   * @private
   */
  _initializeUIElements () {
    this.chooseControls = document.querySelector(UI_SELECTORS.CHOOSE_CONTROLS)
    this.tabElement = document.querySelector(UI_SELECTORS.TAB_HIDE)
  }

  // ============ DOM Helpers ============

  /**
   * Sets the text content of the tab element.
   * @param {string} text - The text to set.
   */
  setTabText (text) {
    if (this.tabElement) {
      this.tabElement.textContent = text
    }
  }

  /**
   * Applies or removes CSS classes on an element based on a class map.
   * @param {HTMLElement} element - The element to modify.
   * @param {Object<string, boolean>} classMap - Map of class names to add/remove flags.
   */
  setClasses (element, classMap) {
    for (const [className, shouldAdd] of Object.entries(classMap)) {
      if (shouldAdd) {
        element?.classList.add(className)
      } else {
        element?.classList.remove(className)
      }
    }
  }

  /**
   * Toggles visibility of multiple elements.
   * @param {HTMLElement[]} elements - Array of elements to toggle.
   * @param {boolean} isVisible - Whether to show or hide the elements.
   */
  toggleElements (elements, isVisible) {
    elements.forEach(el => {
      this.setClasses(el, { [UI_CLASSES.HIDDEN]: !isVisible })
    })
  }

  // ============ Mode Management ============

  /**
   * Sets the current UI mode and applies the corresponding configuration.
   * @param {string} newMode - The mode to switch to (from UI_MODES).
   */
  setMode (newMode) {
    const modeHandlers = {
      [UI_MODES.PLACING]: () => this._applyPlacingMode(),
      [UI_MODES.READY]: () => this._applyReadyMode(),
      [UI_MODES.TESTING]: () => this._applyTestingMode(),
      [UI_MODES.SEEKING]: () => this._applySeekingMode()
    }

    const handler = modeHandlers[newMode]
    if (handler) {
      this.mode = newMode
      handler()
    }
  }

  /**
   * Synchronizes the tab text based on the current mode.
   */
  syncTab () {
    this.setTabText(MODE_TAB_TEXT[this.mode] || '')
  }

  /**
   * Applies common UI configuration for modes.
   * @param {FriendUIConfig} config - Configuration object.
   * @private
   */
  _applyCommonUIConfig (config) {
    this.setTabText(config.tabText)
    this._applyConfigState(
      config.showPlacingControls,
      this._showPlacingControls,
      this._hidePlacingControls
    )
    this._applyConfigState(
      config.showGameControls,
      this._showGameControls,
      this._hideGameControls
    )
    this._applyConfigState(
      config.showShipTrays,
      this.trayManager.showShipTrays.bind(this.trayManager),
      this.trayManager.hideShipTrays.bind(this.trayManager)
    )
    this._applyConfigState(
      config.showTransformBtns,
      this.showTransformBtns,
      this.hideTransformBtns
    )
    this._applyConfigState(config.showTips, this.showTips, this.hideTips)
    if (config.showStatus) {
      this.showStatus()
    }
    this._applyFeatureFlag(config.standardPanels, this.standardPanels)
    this._applyFeatureFlag(config.clearBoardCells, this._clearBoardCells)
    this._applyFeatureFlag(config.addAltPanels, this._addAltPanels)
  }

  /**
   * Calls the selected method based on a boolean feature flag.
   * @param {boolean} active
   * @param {Function} onMethod
   * @param {Function} offMethod
   * @private
   */
  _applyConfigState (active, onMethod, offMethod) {
    const callback = active ? onMethod : offMethod
    callback.call(this)
  }

  /**
   * Executes a method when a feature flag is enabled.
   * @param {boolean} active
   * @param {Function} method
   * @private
   */
  _applyFeatureFlag (active, method) {
    if (active) {
      method.call(this)
    }
  }

  /**
   * Applies the placing mode configuration.
   * @private
   */
  _applyPlacingMode () {
    this._applyCommonUIConfig({
      tabText: 'Hide and Seek Game',
      showPlacingControls: true,
      showGameControls: false,
      showShipTrays: true,
      showTransformBtns: true,
      showTips: true,
      showStatus: true,
      standardPanels: true,
      clearBoardCells: false,
      addAltPanels: false
    })
  }

  /**
   * Applies the ready mode configuration.
   * @private
   */
  _applyReadyMode () {
    this._applyCommonUIConfig({
      tabText: 'Hide Game',
      showPlacingControls: false,
      showGameControls: true,
      showShipTrays: false,
      showTransformBtns: false,
      showTips: false,
      showStatus: true,
      standardPanels: true,
      clearBoardCells: true,
      addAltPanels: false
    })
    gameStatus.addToQueue(
      'test your placement or play a game against the computer',
      false
    )
  }

  /**
   * Applies the testing mode configuration.
   * @private
   */
  _applyTestingMode () {
    this._applyCommonUIConfig({
      tabText: 'Hide Game',
      showPlacingControls: false,
      showGameControls: true,
      showShipTrays: false,
      showTransformBtns: false,
      showTips: false,
      showStatus: false,
      standardPanels: false,
      clearBoardCells: false,
      addAltPanels: false
    })
    gameStatus.line.classList.add(UI_CLASSES.MEDIUM)
    gameStatus.game.classList.remove(UI_CLASSES.HIDDEN)
    gameStatus.mode.classList.remove(UI_CLASSES.HIDDEN)
    gameStatus.line.classList.remove(UI_CLASSES.HIDDEN)
  }

  /**
   * Applies the seeking mode configuration.
   * @private
   */
  _applySeekingMode () {
    this._applyCommonUIConfig({
      tabText: 'Hide and Seek Game',
      showPlacingControls: false,
      showGameControls: false,
      showShipTrays: false,
      showTransformBtns: false,
      showTips: false,
      showStatus: false,
      standardPanels: false,
      clearBoardCells: false,
      addAltPanels: true
    })
    gameStatus.line.classList.remove(UI_CLASSES.MEDIUM)
    gameStatus.line2.classList.remove(UI_CLASSES.MEDIUM)
    gameStatus.line2.classList.add(UI_CLASSES.SMALL)
  }

  // ============ Control Visibility ============

  /**
   * Shows the placing-related controls.
   * @private
   */
  _showPlacingControls () {
    this.toggleElements([this.chooseControls, this.newPlacementBtn], true)
  }

  /**
   * Hides the placing-related controls.
   * @private
   */
  _hidePlacingControls () {
    this.toggleElements([this.chooseControls, this.newPlacementBtn], false)
  }

  /**
   * Shows the game-related controls.
   * @private
   */
  _showGameControls () {
    this._toggleGameControls(true)
  }

  /**
   * Hides the game-related controls.
   * @private
   */
  _hideGameControls () {
    this._toggleGameControls(false)
  }

  /**
   * Toggles the visibility of game controls.
   * @param {boolean} isVisible
   * @private
   */
  _toggleGameControls (isVisible) {
    this.toggleElements([this.testBtn, this.seekBtn], isVisible)
    this.toggleElements([this.stopBtn], false)
  }

  // ============ Score Labels ============

  /**
   * Updates the visibility of score labels based on the current mode.
   * @param {string} mode - The mode to configure labels for.
   * @private
   */
  _updateScoreLabels (mode) {
    const config = MODE_SCORE_LABELS[mode] || {}
    if (!this.score) {
      return
    }

    SCORE_LABEL_KEYS.forEach(labelKey => {
      const labelElement = this.score[`${labelKey}Label`]
      this.setClasses(labelElement, {
        [UI_CLASSES.HIDDEN]: !config[labelKey]
      })
    })
  }

  // ============ Visual Management ============

  /**
   * Clears hit and placed classes from all board cells.
   * @private
   */
  _clearBoardCells () {
    this._forEachBoardCell(cell => {
      cell.classList.remove(UI_CLASSES.HIT, UI_CLASSES.PLACED)
    })
  }

  /**
   * Adds the 'alt' class to all panel elements.
   * @private
   */
  _addAltPanels () {
    const panels = document.getElementsByClassName('panel')
    for (const panel of panels) {
      panel.classList.add(UI_CLASSES.ALT)
    }
  }

  // ============ Public Mode Methods (for backward compatibility) ============

  /**
   * Switches to placing mode and updates score labels.
   */
  placeMode () {
    this._updateScoreLabels(UI_MODES.PLACING)
    this.setMode(UI_MODES.PLACING)
  }

  /**
   * Switches to ready mode and updates score labels.
   */
  readyMode () {
    this._updateScoreLabels(UI_MODES.READY)
    this.setMode(UI_MODES.READY)
  }

  /**
   * Switches to testing mode.
   */
  testMode () {
    this.setMode(UI_MODES.TESTING)
  }

  /**
   * Switches to seeking mode.
   */
  seekMode () {
    this.setMode(UI_MODES.SEEKING)
  }

  // ============ Lifecycle & Game State ============

  /**
   * Displays the fleet sunk state and tracks level end.
   */
  displayFleetSunk () {
    gameStatus.flush()
    gameStatus.addToQueue('Enemy Fleet Revealed', 'You Gave Up')
    gameStatus.addToQueue('Your Fleet is Destroyed', true)
    this.board.classList.add(UI_CLASSES.DESTROYED)
    trackLevelEnd(bh.map, false)
  }

  /**
   * Marks a cell as hit or damaged.
   * @param {number} r - Row index.
   * @param {number} c - Column index.
   * @param {boolean} damaged - Whether the cell is damaged.
   */
  cellHit (r, c, damaged) {
    const cell = this.gridCellAt(r, c)
    CellClassManager.applyFriendlyHitCellState(cell, damaged)
    this._clearCellText(cell)
  }

  /**
   * Uses ammo in a cell and applies damage.
   * @param {number} r - Row index.
   * @param {number} c - Column index.
   * @param {string} damage - Damage type or empty string.
   */
  cellUseAmmo (r, c, damage) {
    const cell = this.gridCellAt(r, c)
    this.useAmmoInCell(cell, damage)
  }

  /**
   * Applies ammo usage to a cell element.
   * @param {HTMLElement} cell - The cell element.
   * @param {string} damage - Damage type or empty string.
   */
  useAmmoInCell (cell, damage) {
    this._applyAmmoState(cell, damage)
  }

  /**
   * Applies ammo state classes and dataset values for an ammo cell.
   * @param {HTMLElement} cell
   * @param {string} damage
   * @private
   */
  _applyAmmoState (cell, damage) {
    cell.classList.remove(UI_CLASSES.ACTIVE)
    if (damage) {
      cell.classList.add(damage)
      cell.classList.remove(UI_CLASSES.EMPTY, UI_CLASSES.WEAPON)
    } else {
      cell.classList.add(UI_CLASSES.EMPTY)
    }
    cell.dataset.ammo = '0'
  }

  /**
   * Proceeds to the next stage after ship placement.
   */
  gotoNextStageAfterPlacement () {
    this.clearClasses()
    if (this.isTestEnvironment()) {
      this.setReadyModeAfterPlacement()
    } else {
      this.setReadyAndSeekModeAfterPlacement()
      this._playBattleHide?.()
    }
  }

  /**
   * Checks if the current environment is a test environment.
   * @returns {boolean} True if in test mode.
   */
  isTestEnvironment () {
    return bh.test
  }

  /**
   * Sets ready mode after placement.
   */
  setReadyModeAfterPlacement () {
    this.readyMode()
  }

  /**
   * Sets ready and seek modes after placement.
   */
  setReadyAndSeekModeAfterPlacement () {
    this.readyMode()
    this.seekMode()
  }
}
