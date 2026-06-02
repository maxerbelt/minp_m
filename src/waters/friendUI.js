import { bh } from '../terrains/all/js/bh.js'
import { gameStatus } from './StatusUI.js'
import { PlacementUI } from './placementUI.js'
import { trackLevelEnd } from '../navbar/gtag.js'
import { CellClassManager } from './helpers/CellClassManager.js'
import { CellUI } from './cellUI.js'
/**
 * @callback CellCallback
 * @param {HTMLElement} cell - The grid cell element
 * @returns {void}
 */

/**
 * @typedef {Object} UIModesEnum
 * @property {string} PLACING - Ship placement phase
 * @property {string} READY - Game mode selection phase
 * @property {string} TESTING - Placement testing phase
 * @property {string} SEEKING - Active game play phase
 */

/**
 * @typedef {Object} UISelectorEnum
 * @property {string} CHOOSE_CONTROLS - CSS selector for game mode choice controls
 * @property {string} TAB_HIDE - CSS selector for hide game tab element
 */

/**
 * @typedef {Object} UIClassEnum
 * @property {string} HIDDEN - Hidden visibility class
 * @property {string} DESTROYED - Fleet destroyed state class
 * @property {string} HIT - Cell hit indicator class
 * @property {string} PLACED - Ship placed indicator class
 * @property {string} ACTIVE - Active element class
 * @property {string} EMPTY - Empty ammo cell class
 * @property {string} WEAPON - Armed weapon indicator class
 * @property {string} MEDIUM - Medium size style class
 * @property {string} SMALL - Small size style class
 * @property {string} ALT - Alternate panel styling class
 */

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
 * @property {string} config.tabText - Text label for the game mode tab
 * @property {boolean} config.showPlacingControls - Show ship placement controls
 * @property {boolean} config.showGameControls - Show game mode controls
 * @property {boolean} config.showShipTrays - Show ship selection trays
 * @property {boolean} config.showTransformBtns - Show ship transformation buttons
 * @property {boolean} config.showTips - Show game tips
 * @property {boolean} config.showStatus - Show game status display
 * @property {boolean} config.standardPanels - Use standard UI panels
 * @property {boolean} config.clearBoardCells - Clear board cell states
 * @property {boolean} config.addAltPanels - Add alternate panel styling
 */

/**
 * @typedef {Object} ScoreLabelVisibility
 * @property {boolean} placed - Show ships placed count label
 * @property {boolean} shots - Show shots fired count label
 * @property {boolean} hits - Show successful hits count label
 * @property {boolean} sunk - Show sunk ships count label
 * @property {boolean} reveals - Show revealed cells count label
 * @property {boolean} hints - Show hints used count label
 */

/**
 * @typedef {Object} ShipObject
 * @property {Array<Array<number>>} [cells] - Array of [column, row] cell positions for ship
 * @property {Function} [rackAt] - Method to check weapon slot at coordinates
 */

/**
 * Mode-to-tab-text mapping for UI display.
 * Maps each game mode to its corresponding tab label.
 * @type {Object<string, string>}
 * @readonly
 */
const MODE_TAB_TEXT = {
  [UI_MODES.PLACING]: 'Hide and Seek Game',
  [UI_MODES.READY]: 'Hide Game',
  [UI_MODES.TESTING]: 'Hide Game',
  [UI_MODES.SEEKING]: 'Hide and Seek Game'
}

/**
 * Score label keys for iteration and lookup.
 * Defines the order and names of score label properties.
 * @type {string[]}
 * @readonly
 */
const SCORE_LABEL_KEYS = ['placed', 'shots', 'hits', 'sunk', 'reveals', 'hints']

/**
 * Mode-to-score-label visibility mapping.
 * Defines which score labels are visible in each game mode.
 * @type {Object<string, ScoreLabelVisibility>}
 * @readonly
 */
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
 * Manages UI state transitions between placing, ready, testing, and seeking modes.
 * Extends PlacementUI with friendly-specific game mechanics and visual management.
 *
 * @class FriendUI
 * @extends PlacementUI
 */
export class FriendUI extends PlacementUI {
  /**
   * Initializes the FriendUI with default mode and UI elements.
   * Sets up all necessary properties for friendly game mode management.
   * Caches DOM references and configures initial game state.
   *
   * @constructor
   */
  constructor () {
    super('friend', 'Friendly')
    /** @type {string} - Current UI mode from UI_MODES enum */
    this.mode = UI_MODES.PLACING
    /** @type {boolean} - Whether ships are visible on the board */
    this.showShips = true
    /** @type {Array<string>} - Help text tips for player guidance */
    this.tips = [
      'Drag ships from the trays onto the board.',
      'Click a ship in the tray to select it, then click on the buttons to rotate and flip',
      'While a ship is selected, use the rotate, rotate left and flip buttons to change its orientation.',
      'You can also use modifier keys while dragging: Control (or Command on Mac) to rotate left, Option (or Alt) to flip, Shift to rotate right.',
      'Use the undo button to remove the last placed ship.',
      'Once all ships are placed, you can test your placement or start a game against the computer.'
    ]

    /** @type {string} - Text appended to ship name when placed */
    this.addText = ' placed'
    /** @type {string} - Text appended to ship name when unplaced */
    this.removeText = ' unplaced'
    this._initializeUIElements()
    /** @type {Function|null} - Callback to play battle hide game */
    this._playBattleHide = null
    /** @type {HTMLElement|null} - DOM element for choose controls section */
    this.chooseControls = null
    /** @type {HTMLElement|null} - DOM element for hide tab */
    this.tabElement = null
    /** @type {Function|undefined} - Callback fired when fleet is successfully placed */
    this.onFleetPlaced = undefined
  }

  /**
   * Initializes UI elements by caching DOM references.
   * Queries the DOM once and stores references for performance.
   * Uses type assertions for accurate element typing.
   *
   * @private
   * @returns {void}
   */
  _initializeUIElements () {
    this.chooseControls = /** @type {HTMLElement|null} */ (
      document.querySelector(UI_SELECTORS.CHOOSE_CONTROLS)
    )
    this.tabElement = /** @type {HTMLElement|null} */ (
      document.querySelector(UI_SELECTORS.TAB_HIDE)
    )
  }

  // ============ DOM Helpers ============

  /**
   * Sets the text content of the tab element.
   * Updates the game mode display in the tab to reflect current mode.
   *
   * @public
   * @param {string} text - The text to set for the tab element
   * @returns {void}
   */
  setTabText (text) {
    if (this.tabElement) {
      this.tabElement.textContent = text
    }
  }

  /**
   * Applies or removes CSS classes on an element based on a class map.
   * Safely handles null elements using optional chaining for robustness.
   *
   * @public
   * @param {HTMLElement|null} element - The element to modify, nullable for safety
   * @param {Object<string, boolean>} classMap - Map of class names to boolean flags (true to add, false to remove)
   * @returns {void}
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
   * Adds or removes the hidden CSS class from each element in the array.
   *
   * @public
   * @param {Array<HTMLElement>} elements - Array of elements to toggle visibility on
   * @param {boolean} isVisible - True to show elements (removes hidden class), false to hide
   * @returns {void}
   */
  toggleElements (elements, isVisible) {
    elements.forEach(el => {
      this.setClasses(el, { [UI_CLASSES.HIDDEN]: !isVisible })
    })
  }

  // ============ Mode Management ============

  /**
   * Sets the current UI mode and applies the corresponding configuration.
   * Dispatcher that routes to appropriate mode setup method based on newMode.
   * Only changes mode if handler exists for the specified mode.
   *
   * @public
   * @param {string} newMode - The mode to switch to (must be a value from UI_MODES enum)
   * @returns {void}
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
   * Updates tab display to reflect active game mode from MODE_TAB_TEXT mapping.
   *
   * @public
   * @returns {void}
   */
  syncTab () {
    this.setTabText(MODE_TAB_TEXT[this.mode] || '')
  }

  /**
   * Applies common UI configuration for modes.
   * Central configuration handler for all mode transitions.
   * Applies visibility, button, and panel state based on config object.
   *
   * @private
   * @param {FriendUIConfig} config - Configuration object with UI state flags
   * @returns {void}
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
   * Applies conditional method invocation with proper context binding.
   * Ensures 'this' context is maintained in called methods.
   *
   * @private
   * @param {boolean} active - Whether the feature is active
   * @param {Function} onMethod - Method to invoke when active
   * @param {Function} offMethod - Method to invoke when inactive
   * @returns {void}
   */
  _applyConfigState (active, onMethod, offMethod) {
    const callback = active ? onMethod : offMethod
    callback.call(this)
  }

  /**
   * Executes a method when a feature flag is enabled.
   * Conditional method invocation for feature gates.
   * Safely calls method with correct 'this' binding.
   *
   * @private
   * @param {boolean} active - Whether the feature flag is active
   * @param {Function} method - Method to execute if active
   * @returns {void}
   */
  _applyFeatureFlag (active, method) {
    if (active) {
      method.call(this)
    }
  }

  /**
   * Applies the placing mode configuration.
   * Shows ship placement controls and trays during setup phase.
   * Configures UI for initial fleet placement workflow.
   *
   * @private
   * @returns {void}
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
   * Shows game mode selection controls after ship placement.
   * Displays options to test or play against computer.
   *
   * @private
   * @returns {void}
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
      /** @type {boolean} */ (false)
    )
  }

  /**
   * Applies the testing mode configuration.
   * Displays game status during placement testing phase.
   * Shows mode, game, and line status elements.
   *
   * @private
   * @returns {void}
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
   * Activates alternate panel styling for seeking game phase.
   * Prepares UI for active multiplayer game play.
   *
   * @private
   * @returns {void}
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
   * Displays placement button and controls panel for ship placement.
   *
   * @private
   * @returns {void}
   */
  _showPlacingControls () {
    this.toggleElements([this.chooseControls, this.newPlacementBtn], true)
  }

  /**
   * Hides the placing-related controls.
   * Hides placement button and controls panel during other modes.
   *
   * @private
   * @returns {void}
   */
  _hidePlacingControls () {
    this.toggleElements([this.chooseControls, this.newPlacementBtn], false)
  }

  /**
   * Shows the game-related controls.
   * Displays test and seek mode buttons for gameplay selection.
   *
   * @private
   * @returns {void}
   */
  _showGameControls () {
    this._toggleGameControls(true)
  }

  /**
   * Hides the game-related controls.
   * Hides test and seek mode buttons during placement phase.
   *
   * @private
   * @returns {void}
   */
  _hideGameControls () {
    this._toggleGameControls(false)
  }

  /**
   * Toggles the visibility of game controls.
   * Shows or hides test/seek buttons and stop button based on isVisible flag.
   *
   * @private
   * @param {boolean} isVisible - True to show controls, false to hide
   * @returns {void}
   */
  _toggleGameControls (isVisible) {
    this.toggleElements([this.testBtn, this.seekBtn], isVisible)
    this.toggleElements([this.stopBtn], false)
  }

  // ============ Score Labels ============

  /**
   * Updates the visibility of score labels based on the current mode.
   * Shows/hides score UI elements according to MODE_SCORE_LABELS configuration.
   * Iterates through all score label keys and applies visibility settings.
   *
   * @private
   * @param {string} mode - The game mode to configure labels for
   * @returns {void}
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
   * Removes visual state indicators from all cells for mode transitions.
   * Safely checks for board existence before querying cells.
   *
   * @private
   * @returns {void}
   */
  _clearBoardCells () {
    const cells = this.board?.querySelectorAll('[data-row]')
    if (!cells) return
    for (const cell of cells) {
      CellClassManager.clearDisplayCell(/** @type {HTMLElement} */ (cell))
    }
  }

  /**
   * Adds the 'alt' class to all panel elements.
   * Applies alternate styling for seeking game mode.
   * Iterates through all panel elements in the DOM.
   *
   * @private
   * @returns {void}
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
   * Entry point for ship placement phase. Configures UI for initial setup.
   *
   * @public
   * @returns {void}
   */
  placeMode () {
    this._updateScoreLabels(UI_MODES.PLACING)
    this.setMode(UI_MODES.PLACING)
  }

  /**
   * Switches to ready mode and updates score labels.
   * Transitions to game mode selection after placement complete.
   *
   * @public
   * @returns {void}
   */
  readyMode () {
    this._updateScoreLabels(UI_MODES.READY)
    this.setMode(UI_MODES.READY)
  }

  /**
   * Switches to testing mode.
   * Allows player to test ship placement before starting game.
   *
   * @public
   * @returns {void}
   */
  testMode () {
    this.setMode(UI_MODES.TESTING)
  }

  /**
   * Switches to seeking mode.
   * Transitions to active game play with alternate panel layout.
   *
   * @public
   * @returns {void}
   */
  seekMode () {
    this.setMode(UI_MODES.SEEKING)
  }

  // ============ Lifecycle & Game State ============

  /**
   * Displays the fleet sunk state and tracks level end.
   * Updates UI to show game over state with tracking for analytics.
   * Flushes previous messages and shows defeat/enemy reveal messages.
   *
   * @public
   * @returns {void}
   */
  displayFleetSunk () {
    gameStatus.flush()
    gameStatus.addToQueue('Enemy Fleet Revealed', /** @type {boolean} */ (true))
    gameStatus.addToQueue(
      'Your Fleet is Destroyed',
      /** @type {boolean} */ (true)
    )
    this.board.classList.add(UI_CLASSES.DESTROYED)
    trackLevelEnd(bh.map, false)
  }

  /**
   * Marks a cell as hit or damaged (override of parent method).
   * Applies visual state to friendly board cell indicating hit/damage status.
   * Delegates to CellClassManager for consistent cell state management.
   *
   * @public
   * @param {number} r - Row index of the cell (0-based)
   * @param {number} c - Column index of the cell (0-based)
   * @param {string} [damageType] - Type of damage or empty string (matches parent signature)
   * @returns {void}
   */
  cellHit (r, c, damageType) {
    const cell = this.gridCellAt(r, c)
    CellClassManager.applyFriendlyHitCellState(cell, damageType)
  }

  /**
   * Uses ammo in a cell and applies damage.
   * Applies ammo depletion visual state to specified cell.
   *
   * @public
   * @param {number} r - Row index of the cell (0-based)
   * @param {number} c - Column index of the cell (0-based)
   * @param {string} damage - Damage type classification or empty string
   * @returns {void}
   */
  cellUseAmmo (r, c, damage) {
    const cell = this.gridCellAt(r, c)
    this.useAmmoInCell(cell, damage)
  }

  /**
   * Applies ammo usage to a cell element.
   * Updates cell state to reflect ammo consumption.
   * Delegates to internal ammo state application method.
   *
   * @public
   * @param {HTMLElement} cell - The cell DOM element to update
   * @param {string} damage - Damage type classification or empty string
   * @returns {void}
   */
  useAmmoInCell (cell, damage) {
    this._applyAmmoState(cell, damage)
  }

  /**
   * Applies ammo state classes and dataset values for an ammo cell.
   * Updates cell classes based on damage state and removes active/active status.
   * Sets ammo dataset to '0' when consumed.
   *
   * @private
   * @param {HTMLElement} cell - The cell DOM element to modify
   * @param {string} damage - Damage type classification or empty string
   * @returns {void}
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
   * Transitions to ready or seeking mode based on test environment status.
   * In production, fires onFleetPlaced callback and launches battle game.
   *
   * @public
   * @returns {void}
   */
  gotoNextStageAfterPlacement () {
    this.grid.clearClasses()
    if (this.isTestEnvironment()) {
      this.setReadyModeAfterPlacement()
    } else {
      this.setReadyAndSeekModeAfterPlacement()
      this._playBattleHide?.()
    }
  }

  /**
   * Checks if the current environment is a test environment.
   * Queries board helper test flag to determine execution context.
   *
   * @public
   * @returns {boolean} True if in test mode
   */
  isTestEnvironment () {
    return bh.test
  }

  /**
   * Sets ready mode after placement.
   * Transitions UI to ready state without seeking mode.
   * Used for test environment transitions.
   *
   * @public
   * @returns {void}
   */
  setReadyModeAfterPlacement () {
    this.readyMode()
  }

  /**
   * Sets ready and seek modes after placement.
   * Transitions to seeking mode and fires onFleetPlaced callback if defined.
   * Used for production environment transitions to active gameplay.
   *
   * @public
   * @returns {void}
   */
  setReadyAndSeekModeAfterPlacement () {
    this.readyMode()
    this.seekMode()

    //   this.onFleetPlaced?.()
  }
}
