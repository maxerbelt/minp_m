import { bh } from '../terrains/all/js/bh.js'
import { gameStatus } from './StatusUI.js'
import { PlacementUI } from './placementUI.js'
import { trackLevelEnd } from '../navbar/gtag.js'
import { CellClassManager } from './helpers/CellClassManager.js'

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
 * Score label property names for iteration.
 * @type {Array<'placed'|'shots'|'hits'|'sunk'|'reveals'|'hints'>}
 * @readonly
 */
const SCORE_LABEL_KEYS = ['placed', 'shots', 'hits', 'sunk', 'reveals', 'hints']

/**
 * Mode-to-configuration mapping.
 * Centralized configuration for all game mode UI states.
 * Eliminates duplication across mode application methods.
 * @type {Object<string, FriendUIConfig & {modeSetupCallback?: (ui: FriendUI) => void}>}
 * @readonly
 */
const MODE_CONFIGURATIONS = {
  [UI_MODES.PLACING]: {
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
  },
  [UI_MODES.READY]: {
    tabText: 'Hide Game',
    showPlacingControls: false,
    showGameControls: true,
    showShipTrays: false,
    showTransformBtns: false,
    showTips: false,
    showStatus: true,
    standardPanels: true,
    clearBoardCells: true,
    addAltPanels: false,
    modeSetupCallback: _ui => {
      gameStatus.addToQueue(
        'test your placement or play a game against the computer',
        /** @type {boolean} */ (false)
      )
    }
  },
  [UI_MODES.TESTING]: {
    tabText: 'Hide Game',
    showPlacingControls: false,
    showGameControls: true,
    showShipTrays: false,
    showTransformBtns: false,
    showTips: false,
    showStatus: false,
    standardPanels: false,
    clearBoardCells: false,
    addAltPanels: false,
    modeSetupCallback: _ui => {
      gameStatus.line?.classList.add(UI_CLASSES.MEDIUM)
      gameStatus.game?.classList.remove(UI_CLASSES.HIDDEN)
      gameStatus.mode?.classList.remove(UI_CLASSES.HIDDEN)
      gameStatus.line?.classList.remove(UI_CLASSES.HIDDEN)
    }
  },
  [UI_MODES.SEEKING]: {
    tabText: 'Hide and Seek Game',
    showPlacingControls: false,
    showGameControls: false,
    showShipTrays: false,
    showTransformBtns: false,
    showTips: false,
    showStatus: false,
    standardPanels: false,
    clearBoardCells: false,
    addAltPanels: true,
    modeSetupCallback: _ui => {
      gameStatus.line?.classList.remove(UI_CLASSES.MEDIUM)
      gameStatus.line2?.classList.remove(UI_CLASSES.MEDIUM)
      gameStatus.line2?.classList.add(UI_CLASSES.SMALL)
    }
  }
}

/**
 * Mode-to-score-label visibility mapping.
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
 * UI for friendly game mode with ship placement and game state management.
 * Manages mode transitions between placing, ready, testing, and seeking phases.
 * Extends PlacementUI with friendly-specific mechanics and visual management.
 *
 * @class FriendUI
 * @extends PlacementUI
 */
export class FriendUI extends PlacementUI {
  /**
   * Initializes FriendUI with game mode and UI elements.
   * Sets up friendly game mode properties and caches DOM references.
   * Initializes help tips and mode-specific text strings.
   *
   * @constructor
   */
  constructor () {
    super('friend', 'Friendly')
    /** @type {string} Current game mode from UI_MODES */
    this.mode = UI_MODES.PLACING
    /** @type {boolean} Whether ships are visible on board */
    this.showShips = true
    /** @type {Array<string>} Help text tips for player guidance */
    this.tips = [
      'Drag ships from the trays onto the board.',
      'Click a ship in the tray to select it, then click on the buttons to rotate and flip',
      'While a ship is selected, use the rotate, rotate left and flip buttons to change its orientation.',
      'You can also use modifier keys while dragging: Control (or Command on Mac) to rotate left, Option (or Alt) to flip, Shift to rotate right.',
      'Use the undo button to remove the last placed ship.',
      'Once all ships are placed, you can test your placement or start a game against the computer.'
    ]
    /** @type {string} Text appended to ship name when placed */
    this.addText = ' placed'
    /** @type {string} Text appended to ship name when unplaced */
    this.removeText = ' unplaced'
    this._initializeUIElements()
    /** @type {Function|null} Callback to play battle hide game */
    this._playBattleHide = null
    /** @type {HTMLElement|null} DOM element for choose controls */
    this.chooseControls = null
    /** @type {HTMLElement|null} DOM element for hide tab */
    this.tabElement = null
    /** @type {Function|undefined} Callback when fleet is placed */
    this.onFleetPlaced = undefined
  }

  /**
   * Initializes UI element references.
   * Caches DOM queries for performance optimization.
   *
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
   * Updates tab element text content.
   * Reflects current game mode in UI.
   *
   * @public
   * @param {string} text - Tab text to display
   * @returns {void}
   */
  setTabText (text) {
    if (this.tabElement) {
      this.tabElement.textContent = text
    }
  }

  /**
   * Sets CSS classes on element based on class map.
   * Safely handles null elements with optional chaining.
   * Uses destructuring for cleaner class application.
   *
   * @public
   * @param {HTMLElement|null} element - Element to modify (nullable)
   * @param {Object<string, boolean>} classMap - Classes to add/remove (true=add, false=remove)
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
   * Adds/removes hidden class based on isVisible flag.
   *
   * @public
   * @param {Array<HTMLElement>} elements - Elements to toggle
   * @param {boolean} isVisible - True to show, false to hide
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
   * Routes mode change through MODE_CONFIGURATIONS mapping for DRY principle.
   *
   * @public
   * @param {string} newMode - The mode to switch to (must be a value from UI_MODES enum)
   * @returns {void}
   */
  setMode (newMode) {
    const config = MODE_CONFIGURATIONS[newMode]
    if (config) {
      this.mode = newMode
      this.#applyModeConfiguration(config)
    }
  }

  /**
   * Synchronizes tab text to current mode.
   * Updates tab display based on active game mode.
   *
   * @public
   * @returns {void}
   */
  syncTab () {
    const modeText = MODE_CONFIGURATIONS[this.mode]?.tabText || ''
    this.setTabText(modeText)
  }

  /**
   * Applies mode configuration to UI.
   * Central handler for all mode transitions with SRP.
   * Updates tab, controls, trays, buttons, and custom mode setup.
   *
   * @param {FriendUIConfig & {modeSetupCallback?: Function}} config - Mode configuration
   * @returns {void}
   */
  #applyModeConfiguration (config) {
    this.setTabText(config.tabText)
    this.#updateControlVisibility(
      config.showPlacingControls,
      config.showGameControls
    )
    this.#updateTraysVisibility(config.showShipTrays)
    this.#updateButtonsVisibility(config.showTransformBtns, config.showTips)
    if (config.showStatus) this.showStatus()
    if (config.standardPanels) this.standardPanels()
    if (config.clearBoardCells) this.#clearBoardCells()
    if (config.addAltPanels) this.#addAltPanels()
    if (config.modeSetupCallback) config.modeSetupCallback(this)
  }

  /**
   * Updates placement and game control visibility.
   * Consolidated control visibility management.
   *
   * @param {boolean} showPlacing - Show placement controls
   * @param {boolean} showGame - Show game controls
   * @returns {void}
   */
  #updateControlVisibility (showPlacing, showGame) {
    this.toggleElements(
      [this.chooseControls, this.newPlacementBtn].filter(el => el != null),
      showPlacing
    )
    this._toggleGameControls(showGame)
  }

  /**
   * Updates ship tray visibility.
   *
   * @param {boolean} isVisible - Show or hide trays
   * @returns {void}
   */
  #updateTraysVisibility (isVisible) {
    // @noInspection JSMethodCanBeStatic - Method intentionally uses conditional logic
    if (isVisible) {
      this.trayManager.showShipTrays()
    } else {
      this.trayManager.hideShipTrays()
    }
  }

  /**
   * Updates ship transformation buttons and tips visibility.
   *
   * @param {boolean} showBtns - Show transformation buttons
   * @param {boolean} showTipsFlag - Show help tips
   * @returns {void}
   */
  #updateButtonsVisibility (showBtns, showTipsFlag) {
    if (showBtns) {
      this.showTransformBtns()
    } else {
      this.hideTransformBtns()
    }
    if (showTipsFlag) {
      this.showTips()
    } else {
      this.hideTips()
    }
  }

  /**
   * Toggles the visibility of game controls.
   * Shows or hides test/seek buttons and stop button based on isVisible flag.
   *
   * @param {boolean} isVisible - True to show controls, false to hide
   * @returns {void}
   */
  _toggleGameControls (isVisible) {
    this.toggleElements(
      [this.testBtn, this.seekBtn].filter(el => el != null),
      isVisible
    )
    this.toggleElements(
      [this.stopBtn].filter(el => el != null),
      false
    )
  }

  // ============ Score Labels ============

  /**
   * Updates score label visibility for the given mode.
   * Shows/hides score elements based on MODE_SCORE_LABELS configuration.
   *
   * @param {string} mode - The game mode to configure labels for
   * @returns {void}
   */
  #updateScoreLabels (mode) {
    if (!this.score) return
    const config = MODE_SCORE_LABELS[mode] || {}
    SCORE_LABEL_KEYS.forEach(labelKey => {
      const labelElement = this.score[`${labelKey}Label`]
      this.setClasses(labelElement, { [UI_CLASSES.HIDDEN]: !config[labelKey] })
    })
  }

  // ============ Visual Management ============

  /**
   * Clears visual state indicators from all board cells.
   * Removes hit/placed classes for clean mode transitions.
   *
   * @returns {void}
   */
  #clearBoardCells () {
    const cells = this.board?.querySelectorAll('[data-row]')
    if (!cells) return
    for (const cell of cells) {
      CellClassManager.clearDisplayCell(/** @type {HTMLElement} */ (cell))
    }
  }

  /**
   * Applies alternate panel styling for seeking mode.
   * Adds 'alt' class to all panel elements.
   *
   * @returns {void}
   */
  #addAltPanels () {
    const panels = document.getElementsByClassName('panel')
    for (const panel of panels) {
      panel.classList.add(UI_CLASSES.ALT)
    }
  }

  // ============ Public Mode Methods ============

  /**
   * Switches to placing mode.
   * Entry point for ship placement phase.
   *
   * @public
   * @returns {void}
   */
  placeMode () {
    this.#updateScoreLabels(UI_MODES.PLACING)
    this.setMode(UI_MODES.PLACING)
  }

  /**
   * Switches to ready mode.
   * Transitions to game mode selection after placement.
   *
   * @public
   * @returns {void}
   */
  readyMode () {
    this.#updateScoreLabels(UI_MODES.READY)
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
   * Displays fleet destroyed state and tracks game end.
   * Shows defeat messages and applies destroyed styling.
   * Triggers analytics tracking for level completion.
   *
   * @public
   * @returns {void}
   */
  displayFleetSunk () {
    gameStatus.flush()
    gameStatus.addToQueue('Enemy Fleet Revealed', true)
    gameStatus.addToQueue('Your Fleet is Destroyed', true)
    this.board?.classList.add(UI_CLASSES.DESTROYED)
    trackLevelEnd(bh.map || undefined, false)
  }

  /**
   * Marks a cell as hit (override of parent method).
   * Applies visual state to friendly board cell.
   * Delegates to CellClassManager for consistent state management.
   *
   * @public
   * @param {number} x - Column index (0-based)
   * @param {number} y - Row index (0-based)
   * @param {string} [damageType] - Damage type or empty string
   * @returns {void}
   */
  cellHit (x, y, damageType) {
    const cell = this.grid.node(x, y)
    CellClassManager.applyFriendlyHitCellState(cell, damageType)
  }

  /**
   * Depletes ammo from a cell and applies damage visual state.
   * Updates cell to reflect ammo consumption.
   *
   * @public
   * @param {number} x - Column index (0-based)
   * @param {number} y - Row index (0-based)
   * @param {string} damage - Damage type or empty string
   * @returns {void}
   */
  cellUseAmmo (x, y, damage) {
    const cell = this.grid.node(x, y)
    this.#applyAmmoState(cell, damage)
  }

  /**
   * Applies ammo depletion state to cell element.
   * Updates classes and dataset based on damage type.
   *
   * @param {HTMLElement} cell - Cell DOM element to modify
   * @param {string} damage - Damage type or empty string
   * @returns {void}
   */
  #applyAmmoState (cell, damage) {
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
   * Proceeds to next stage after ship placement.
   * Clears grid and transitions to ready or seeking mode.
   * In production, launches battle game.
   *
   * @public
   * @returns {void}
   */
  gotoNextStageAfterPlacement () {
    this.grid.clearClasses()
    if (this.isTestEnvironment()) {
      this.readyMode()
    } else {
      this.readyMode()
      this.seekMode()
      this._playBattleHide?.()
    }
  }

  /**
   * Checks if environment is test mode.
   * Queries board helper test flag.
   *
   * @public
   * @returns {boolean} True if in test mode
   */
  isTestEnvironment () {
    // @ts-ignore - bh.test is a dynamic property set at runtime
    return bh.test || false
  }
}
