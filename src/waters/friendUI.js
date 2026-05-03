import { bh } from '../terrains/all/js/bh.js'
import { gameStatus } from './StatusUI.js'
import { PlacementUI } from './placementUI.js'
import { trackLevelEnd } from '../navbar/gtag.js'

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
    const tabTextMap = {
      [UI_MODES.PLACING]: 'Hide and Seek Game',
      [UI_MODES.READY]: 'Hide Game',
      [UI_MODES.TESTING]: 'Hide Game',
      [UI_MODES.SEEKING]: 'Hide and Seek Game'
    }
    this.setTabText(tabTextMap[this.mode])
  }

  /**
   * Applies common UI configuration for modes.
   * @param {Object} config - Configuration object.
   * @param {string} config.tabText - Text for the tab.
   * @param {boolean} config.showPlacingControls - Whether to show placing controls.
   * @param {boolean} config.showGameControls - Whether to show game controls.
   * @param {boolean} config.showShipTrays - Whether to show ship trays.
   * @param {boolean} config.showTransformBtns - Whether to show transform buttons.
   * @param {boolean} config.showTips - Whether to show tips.
   * @param {boolean} config.showStatus - Whether to show status.
   * @param {boolean} config.standardPanels - Whether to use standard panels.
   * @param {boolean} config.clearBoardCells - Whether to clear board cells.
   * @param {boolean} config.addAltPanels - Whether to add alt panels.
   * @private
   */
  _applyCommonUIConfig (config) {
    this.setTabText(config.tabText)
    if (config.showPlacingControls) {
      this._showPlacingControls()
    } else {
      this._hidePlacingControls()
    }
    if (config.showGameControls) {
      this._showGameControls()
    } else {
      this._hideGameControls()
    }
    if (config.showShipTrays) {
      this.trayManager.showShipTrays()
    } else {
      this.trayManager.hideShipTrays()
    }
    if (config.showTransformBtns) {
      this.showTransformBtns()
    } else {
      this.hideTransformBtns()
    }
    if (config.showTips) {
      this.showTips()
    } else {
      this.hideTips()
    }
    if (config.showStatus) {
      this.showStatus()
    }
    if (config.standardPanels) {
      this.standardPanels()
    }
    if (config.clearBoardCells) {
      this._clearBoardCells()
    }
    if (config.addAltPanels) {
      this._addAltPanels()
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
    this.toggleElements([this.testBtn, this.seekBtn], true)
    this.toggleElements([this.stopBtn], false)
  }

  /**
   * Hides the game-related controls.
   * @private
   */
  _hideGameControls () {
    this.toggleElements([this.testBtn, this.seekBtn, this.stopBtn], false)
  }

  // ============ Score Labels ============

  /**
   * Updates the visibility of score labels based on the current mode.
   * @param {string} mode - The mode to configure labels for.
   * @private
   */
  _updateScoreLabels (mode) {
    const labelMap = {
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

    const config = labelMap[mode] || {}
    if (this.score) {
      this.setClasses(this.score.placedLabel, {
        [UI_CLASSES.HIDDEN]: !config.placed
      })
      this.setClasses(this.score.shotsLabel, {
        [UI_CLASSES.HIDDEN]: !config.shots
      })
      this.setClasses(this.score.hitsLabel, {
        [UI_CLASSES.HIDDEN]: !config.hits
      })
      this.setClasses(this.score.sunkLabel, {
        [UI_CLASSES.HIDDEN]: !config.sunk
      })
      this.setClasses(this.score.revealsLabel, {
        [UI_CLASSES.HIDDEN]: !config.reveals
      })
      this.setClasses(this.score.hintsLabel, {
        [UI_CLASSES.HIDDEN]: !config.hints
      })
    }
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
    this.cellHitBase(cell, damaged)
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
    const dataset = cell.dataset
    cell.classList.remove(UI_CLASSES.ACTIVE)
    if (damage) {
      cell.classList.add(damage)
      cell.classList.remove(UI_CLASSES.EMPTY, UI_CLASSES.WEAPON)
    } else {
      cell.classList.add(UI_CLASSES.EMPTY)
    }
    dataset.ammo = 0
  }

  /**
   * Proceeds to the next stage after ship placement.
   */
  gotoNextStageAfterPlacement () {
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
