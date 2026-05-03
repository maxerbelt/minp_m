import { bh } from '../terrains/all/js/bh.js'
import { gameStatus } from './StatusUI.js'
import { PlacementUI } from './placementUI.js'

// Constants for UI strings to reduce duplication
/** @returns {string} */
const LAND_STRING = () =>
  bh.terrain?.landSubterrain?.title?.toLowerCase() || 'land'
/** @returns {string} */
const SEA_STRING = () =>
  bh.terrain?.defaultSubterrain?.title?.toLowerCase() || 'sea'
/** @type {string[]} */
const BRUSH_TIPS = [
  'Use shapes create land and sea',
  `drag blocks across map to create or destroy ${LAND_STRING()}`,
  `press accept button when the ${SEA_STRING()} and ${LAND_STRING()} is to your liking`
]
/** @type {string[]} */
const SHIP_TIPS = [
  'drag ships to the map grid to add them to your map',
  'drag weapons on to the map to increase the ammunition available',
  'drag weapons tally-boxes back to the tray to remove a weapon'
]

/**
 * UI class for custom map and ship placement mode.
 */
class CustomUI extends PlacementUI {
  /**
   * Initializes the custom UI with cached elements and initial tips.
   */
  constructor () {
    super('custom', 'Customizing')
    this._cacheElements() // Cache DOM elements for performance
    this.tips = BRUSH_TIPS.slice(0, 1) // Initial tips
  }

  /**
   * Returns a typed button by ID.
   * @param {string} id
   * @returns {HTMLButtonElement}
   * @private
   */
  _queryButton (id) {
    return /** @type {HTMLButtonElement} */ (document.getElementById(id))
  }

  /**
   * Returns a generic element by ID.
   * @param {string} id
   * @returns {HTMLElement|null}
   * @private
   */
  _queryElement (id) {
    return document.getElementById(id)
  }

  /**
   * Caches frequently accessed DOM elements.
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
   * @returns {string}
   * @private
   */
  _changeClearLabel () {
    const action = this.placingShips ? 'hange' : 'lear'
    return `<span class="shortcut">C</span>${action} ${bh.terrain.mapHeading}`
  }

  /**
   * Toggles visibility of multiple elements.
   * @param {Array<[HTMLElement|null, boolean]>} visibilityMap - Array of [element, show] pairs.
   * @private
   */
  _toggleElementVisibility (visibilityMap) {
    for (const [element, show] of visibilityMap) {
      if (element) element.classList.toggle('hidden', !show)
    }
  }

  /**
   * Configures brush mode element visibility.
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
   * @private
   */
  _clearCellClasses () {
    for (const cell of this.board.children) {
      cell.classList.remove('hit', 'placed')
    }
  }

  /**
   * Sets panels to standard state.
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
   * @param {Array<Function>} listeners - Array of cancellable listeners.
   * @private
   */
  _cancelListeners (listeners) {
    for (const cancellable of listeners) {
      cancellable()
    }
  }

  /**
   * Configures UI for adding ships.
   * @param {Array} ships - Ships to add.
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
   * @param {Array} ships - Ships to add.
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
