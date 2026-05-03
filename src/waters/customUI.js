import { bh } from '../terrains/all/js/bh.js'
import { gameStatus } from './StatusUI.js'
import { PlacementUI } from './placementUI.js'

// Constants for UI strings to reduce duplication
const LAND_STRING = () =>
  bh.terrain?.landSubterrain?.title?.toLowerCase() || 'land'
const SEA_STRING = () =>
  bh.terrain?.defaultSubterrain?.title?.toLowerCase() || 'sea'
const BRUSH_TIPS = [
  'Use shapes create land and sea',
  `drag blocks across map to create or destroy ${LAND_STRING()}`,
  `press accept button when the ${SEA_STRING()} and ${LAND_STRING()} is to your liking`
]
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
   * Caches frequently accessed DOM elements.
   * @private
   */
  _cacheElements () {
    this.reuseBtn = document.getElementById('reuseBtn')
    this.resetBtn = document.getElementById('resetBtn')
    this.acceptBtn = document.getElementById('acceptBtn')
    this.stopBtn = document.getElementById('stopBtn')
    this.undoBtn = document.getElementById('undoBtn')
    this.publishBtn = document.getElementById('publishBtn')
    this.saveBtn = document.getElementById('saveBtn')
  }

  /**
   * Updates the reset/clear button based on placement state.
   */
  updateChangeClearButton () {
    if (this.placingShips) {
      this.newPlacementBtn.disabled = false
      this.newPlacementBtn.innerHTML = `<span class="shortcut">C</span>hange ${bh.terrain.mapHeading}`
    } else {
      this.newPlacementBtn.innerHTML = `<span class="shortcut">C</span>lear ${bh.terrain.mapHeading}`
      this.newPlacementBtn.disabled = !this.score.hasZoneInfo()
    }
  }

  /**
   * Toggles visibility of multiple elements.
   * @param {Array<Array>} visibilityMap - Array of [element, show] pairs.
   * @private
   */
  _toggleElementVisibility (visibilityMap) {
    for (const [element, show] of visibilityMap) {
      if (element) element.classList.toggle('hidden', !show)
    }
  }

  /**
   * Configures UI for brush mode.
   * @private
   */
  _configureBrushUI () {
    this.showMapTitle()
    this.placingShips = false
    this.updateChangeClearButton()
    this._toggleElementVisibility([
      [document.getElementById('height-container'), true],
      [document.getElementById('width-container'), true],
      [document.getElementById('tally-title'), false],
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
    this._toggleElementVisibility([
      [document.getElementById('height-container'), false],
      [document.getElementById('width-container'), false],
      [this.reuseBtn, false],
      [this.resetBtn, true],
      [this.acceptBtn, false],
      [this.testBtn, false],
      [this.seekBtn, false],
      [this.stopBtn, false],
      [this.undoBtn, false]
    ])
    this.newPlacementBtn.disabled = false
    this.score.placedLabel.classList.remove('hidden')
    this.score.weaponsLabel.classList.remove('hidden')
    this.showTransformBtns()
    this.autoBtn.classList.add('hidden')
    this.publishBtn.classList.remove('hidden')
    this.saveBtn.classList.remove('hidden')
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
