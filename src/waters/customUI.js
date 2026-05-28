import { bh } from '../terrains/all/js/bh.js'
import { gameStatus } from './StatusUI.js'
import { PlacementUI } from './placementUI.js'
import {
  hasMapOfCurrentSize,
  setNewMapToCorrectSize
} from '../terrains/all/js/validSize.js'
import { ButtonManager } from '../ui/ButtonManager.js'
import { placedShipsInstance } from '../selection/PlacedShips.js'

/**
 * @typedef {Object} ElementCache
 * @property {HTMLButtonElement} reuseBtn - Reuse button reference
 * @property {HTMLButtonElement} resetBtn - Reset button reference
 * @property {HTMLButtonElement} acceptBtn - Accept button reference
 * @property {HTMLButtonElement} stopBtn - Stop button reference
 * @property {HTMLButtonElement} undoBtn - Undo button reference
 * @property {HTMLButtonElement} publishBtn - Publish button reference
 * @property {HTMLButtonElement} saveBtn - Save button reference
 * @property {HTMLElement|null} heightContainer - Height control container
 * @property {HTMLElement|null} widthContainer - Width control container
 * @property {HTMLElement|null} tallyTitle - Tally display title
 */

/**
 * @typedef {Array<[HTMLElement|null, boolean]>} VisibilityMap
 */

// Constants for UI strings to reduce duplication
/**
 * Gets the terrain land subterrain title in lowercase.
 * @returns {string} Land terrain name or 'land' as default
 */
const LAND_STRING = () =>
  bh.terrain?.landSubterrain?.title?.toLowerCase() || 'land'

/**
 * Gets the terrain default subterrain title in lowercase.
 * @returns {string} Sea terrain name or 'sea' as default
 */
const SEA_STRING = () =>
  bh.terrain?.defaultSubterrain?.title?.toLowerCase() || 'sea'

/**
 * Tip messages for brush mode terrain editing.
 * @type {string[]}
 * @readonly
 */
const BRUSH_TIPS = [
  'Use shapes create land and sea',
  `drag blocks across map to create or destroy ${LAND_STRING()}`,
  `press accept button when the ${SEA_STRING()} and ${LAND_STRING()} is to your liking`
]

/**
 * Tip messages for ship placement mode.
 * @type {string[]}
 * @readonly
 */
const SHIP_TIPS = [
  'drag ships to the map grid to add them to your map',
  'drag weapons on to the map to increase the ammunition available',
  'drag weapons tally-boxes back to the tray to remove a weapon'
]

/**
 * UI class for custom map and ship placement mode.
 * Extends PlacementUI to manage terrain editing (brush mode) and ship placement workflows.
 *
 * @class CustomUI
 * @extends {PlacementUI}
 */
export class CustomUI extends PlacementUI {
  /**
   * Initializes the custom UI with cached elements and initial tips.
   * Sets up base placement UI state and caches frequently accessed DOM elements.
   *
   * @constructor
   */
  constructor () {
    super('custom', 'Customizing')
    this._cacheElements() // Cache DOM elements for performance
    this.tips = BRUSH_TIPS.slice(0, 1) // Initial tips
  }

  /**
   * Returns a typed button by ID.
   * Retrieves button element from DOM and casts to HTMLButtonElement.
   *
   * @param {string} id - The DOM element id to retrieve
   * @returns {HTMLButtonElement} The button element
   * @private
   */
  _queryButton (id) {
    return /** @type {HTMLButtonElement} */ (document.getElementById(id))
  }

  /**
   * Returns a generic element by ID.
   * Retrieves element from DOM without type casting.
   *
   * @param {string} id - The DOM element id to retrieve
   * @returns {HTMLElement|null} The element or null if not found
   * @private
   */
  _queryElement (id) {
    return document.getElementById(id)
  }

  /**
   * Caches frequently accessed DOM elements.
   * Stores button and container references for performance optimization.
   *
   * @returns {void}
   * @private
   */
  _cacheElements () {
    this.reuseBtn = this._queryButton('reuseBtn')
    this.resetBtn = this._queryButton('resetBtn')
    this.acceptBtn = this._queryButton('acceptBtn')
    this.stopBtn = this._queryButton('stopBtn')
    this.undoBtn = this._queryButton('undoBtn')
    this.publishBtn = this._queryButton('publishBtn')
    this.saveBtn = this._queryButton('saveBtn')
    this.heightContainer = this._queryElement('height-container')
    this.widthContainer = this._queryElement('width-container')
    this.tallyTitle = this._queryElement('tally-title')
  }

  /**
   * Updates the reset/clear button based on placement state.
   * Sets label to "Change" when placing ships, "Clear" otherwise.
   * Disables button when not placing ships and no zone information exists.
   *
   * @returns {void}
   */
  updateChangeClearButton () {
    const newPlacementBtn = /** @type {HTMLButtonElement} */ (
      this.newPlacementBtn
    )
    newPlacementBtn.innerHTML = this._changeClearLabel()
    newPlacementBtn.disabled = !this.placingShips && !this.score.hasZoneInfo()
  }

  /**
   * Builds the current label for the change/clear button.
   * Returns "Change" when placing ships, "Clear" otherwise.
   *
   * @returns {string} HTML label for the button
   * @private
   */
  _changeClearLabel () {
    const action = this.placingShips ? 'hange' : 'lear'
    return `<span class="shortcut">C</span>${action} ${bh.terrain.mapHeading}`
  }

  /**
   * Toggles visibility of multiple elements.
   * Applies the 'hidden' class based on visibility flags.
   *
   * @param {VisibilityMap} visibilityMap - Array of [element, show] pairs
   * @returns {void}
   * @private
   */
  _toggleElementVisibility (visibilityMap) {
    for (const [element, show] of visibilityMap) {
      if (element) element.classList.toggle('hidden', !show)
    }
  }

  /**
   * Configures brush mode element visibility.
   * Shows terrain controls and hide ship-related UI elements.
   *
   * @returns {void}
   * @private
   */
  _setBrushModeVisibility () {
    this._toggleElementVisibility([
      [this.heightContainer, true],
      [this.widthContainer, true],
      [this.tallyTitle, false],
      [this.reuseBtn, true],
      [this.resetBtn, false],
      [this.acceptBtn, true],
      [this.publishBtn, false],
      [this.saveBtn, false],
      [this.testBtn, false],
      [this.seekBtn, false],
      [this.stopBtn, false],
      [this.undoBtn, false]
    ])
  }

  /**
   * Configures ship placement mode element visibility.
   * Hides terrain controls and shows ship-related UI elements.
   *
   * @returns {void}
   * @private
   */
  _setShipModeVisibility () {
    this._toggleElementVisibility([
      [this.heightContainer, false],
      [this.widthContainer, false],
      [this.tallyTitle, false],
      [this.reuseBtn, false],
      [this.resetBtn, true],
      [this.acceptBtn, false],
      [this.publishBtn, true],
      [this.saveBtn, true],
      [this.testBtn, false],
      [this.seekBtn, false],
      [this.stopBtn, false],
      [this.undoBtn, false]
    ])
  }

  /**
   * Configures UI for brush mode.
   * Sets up terrain editing interface with appropriate button visibility and state.
   *
   * @returns {void}
   * @private
   */
  _configureBrushUI () {
    this.showMapTitle()
    this.placingShips = false
    this.updateChangeClearButton()
    this._setBrushModeVisibility()

    this.hideTransformBtns()
    this.score.placed.textContent = 'None Yet'
    this.score.weaponsPlaced.textContent = 'None Yet'
    this._clearCellClasses()
    this._standardPanels()
  }

  /**
   * Clears hit and placed classes from cells.
   * Iterates through board cells and removes visual state classes.
   *
   * @returns {void}
   * @private
   */
  _clearCellClasses () {
    for (const cell of this.board.children) {
      cell.classList.remove('hit', 'placed')
    }
  }

  /**
   * Refreshes build mode button and score controls.
   * Updates score display and button state.
   *
   * @returns {void}
   * @private
   */
  _refreshBuildControls () {
    this.score.displayZoneInfo()
    this.updateChangeClearButton()
  }

  /**
   * Refreshes build mode display and controls.
   * Updates all colors and refreshes button states.
   *
   * @returns {void}
   * @private
   */
  _refreshBuildUI () {
    this.refreshAllColor()
    this._refreshBuildControls()
  }

  /**
   * Clears map and refreshes display.
   * Removes blank maps and updates visual state.
   *
   * @returns {void}
   * @private
   */
  _clearMapAndRefresh () {
    bh.maps.clearBlank()
    this._refreshBuildUI()
  }

  /**
   * Update reuse button state based on available maps.
   * Disables button if no map of current size exists.
   *
   * @returns {void}
   * @private
   */
  _setReuseButtonState () {
    this.reuseBtn.disabled = !hasMapOfCurrentSize()
  }

  /**
   * Initialize new placement state.
   * Sets up board, UI, and brush controls for terrain editing and ship placement.
   *
   * @returns {void}
   */
  initializePlacement () {
    this.buildBoard((_r, _c) => {})
    this.trayManager.showBrushTrays()
    this.makeBrushable()
    this.buildBrushTray(bh.terrain)
    this.brushMode()
    this.acceptBtn.disabled = false
    this._setReuseButtonState()
    this.score.setupZoneInfo()
    this._disableBuildTransformButtons()
  }

  /**
   * Disable transform buttons during build mode.
   * Prevents transformation operations while editing terrain.
   *
   * @returns {void}
   * @private
   */
  _disableBuildTransformButtons () {
    ButtonManager.setButtonsDisabled(
      [
        this.rotateBtn,
        this.flipBtn,
        this.rotateLeftBtn,
        this.undoBtn,
        this.resetBtn
      ],
      true
    )
  }

  /**
   * Clears all ships from the board and resets placement.
   * Removes all ships, resets state, and shows notification.
   *
   * @param {Object} model - The model context for subtraction operation
   * @returns {void}
   */
  removeAllPlacedShips (model) {
    placedShipsInstance.popAll(ship => {
      customUI.subtraction(model, ship)
    })
  }

  /**
   * Clears map and refreshes display.
   * Removes blank maps and updates visual state.
   *
   * @returns {void}
   */
  clearMapAndRefresh () {
    bh.maps.clearBlank()
    this._refreshBuildUI()
  }

  /**
   * Resets map to correct size and refreshes display.
   * Reinitializes map dimensions and updates visual state.
   *
   * @returns {void}
   */
  handleReuse () {
    setNewMapToCorrectSize()
    this._refreshBuildUI()
  }

  /**
   * Sets panels to standard state.
   * Removes 'alt' class from all panel elements.
   *
   * @returns {void}
   * @private
   */
  _standardPanels () {
    const panels = document.getElementsByClassName('panel')
    for (const panel of panels) {
      panel.classList.remove('alt')
    }
  }

  /**
   * Sets up brush mode.
   * Initializes terrain editing interface with brush tools and tips.
   *
   * @returns {void}
   */
  brushMode () {
    this._cancelListeners(this.placelistenCancellables)
    this.placelistenCancellables = []
    this._configureBrushUI()
    gameStatus.setTips(this.tips, BRUSH_TIPS[1])
    this.tips = BRUSH_TIPS.slice(1)
    this.showTips()
  }

  /**
   * Cancels listeners.
   * Executes all cancellable listener functions to clean up event handlers.
   *
   * @param {Array<Function>} listeners - Array of cancellable listener functions
   * @returns {void}
   * @private
   */
  _cancelListeners (listeners) {
    for (const cancellable of listeners) {
      cancellable()
    }
  }

  /**
   * Configures UI for adding ships.
   * Sets up ship placement interface with trays and controls.
   *
   * @param {Array<Object>} ships - Ships to add to placement interface
   * @returns {void}
   * @private
   */
  _configureShipUI (ships) {
    this.showFleetTitle()
    this.placingShips = true
    this.updateChangeClearButton()
    this.trayManager.showShipTrays()
    this._setShipModeVisibility()
    this.score.placedLabel.classList.remove('hidden')
    this.score.weaponsLabel.classList.remove('hidden')
    this.showTransformBtns()
    this.autoBtn.classList.add('hidden')
    const newPlacementBtn = /** @type {HTMLButtonElement} */ (
      this.newPlacementBtn
    )
    newPlacementBtn.disabled = false
    this.buildTrays(ships)
    this.buildWeaponTray()
    this.showStatus()
    this._standardPanels()
  }

  /**
   * Sets up add ship mode.
   * Initializes ship placement interface with trays and tips.
   *
   * @param {Array<Object>} ships - Ships available for placement
   * @returns {void}
   */
  addShipMode (ships) {
    this._cancelListeners(this.brushlistenCancellables)
    this.brushlistenCancellables = []
    this._configureShipUI(ships)
    gameStatus.setTips(this.tips, SHIP_TIPS[0])
    this.tips = SHIP_TIPS
  }
}

export const customUI = new CustomUI()
