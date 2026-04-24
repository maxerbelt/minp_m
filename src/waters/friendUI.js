import { bh } from '../terrains/all/js/bh.js'
import { gameStatus } from './StatusUI.js'
import { PlacementUI } from './placementUI.js'
import { trackLevelEnd } from '../navbar/gtag.js'

const UI_MODES = {
  PLACING: 'placing',
  READY: 'ready',
  TESTING: 'testing',
  SEEKING: 'seeking'
}

const UI_SELECTORS = {
  CHOOSE_CONTROLS: '#choose-controls',
  TAB_HIDE: '#tab-hide'
}

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

export class FriendUI extends PlacementUI {
  constructor () {
    super('friend', 'Friendly')
    this.mode = UI_MODES.PLACING
    this.showShips = true
    this.tips = [
      'Drag ships from the trays onto the board.',
      'Click a ship in the tray to select it, then click on the buttons to rotate and flip',
      'While a ship is selected, use the rotate, rotate left and flip buttons to change its orientation.',
      'You can also use modifier keys while dragging: Control (or Command on Mac) to rotate left, Option (or Alt) to flip, Shift to rotate right.',
      'Use the undo button to remove the last placed ship.',
      'Once all ships are placed, you can test your placement or start a game against the computer.'
    ]

    this.addText = ' placed'
    this.removeText = ' unplaced'
    this._initializeUIElements()
  }

  _initializeUIElements () {
    this.chooseControls = document.querySelector(UI_SELECTORS.CHOOSE_CONTROLS)
    this.tabElement = document.querySelector(UI_SELECTORS.TAB_HIDE)
  }

  // ============ DOM Helpers ============

  setTabText (text) {
    if (this.tabElement) {
      this.tabElement.textContent = text
    }
  }

  setClasses (element, classMap) {
    for (const [className, shouldAdd] of Object.entries(classMap)) {
      if (shouldAdd) {
        element?.classList.add(className)
      } else {
        element?.classList.remove(className)
      }
    }
  }

  toggleElements (elements, isVisible) {
    elements.forEach(el => {
      this.setClasses(el, { [UI_CLASSES.HIDDEN]: !isVisible })
    })
  }

  // ============ Mode Management ============

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

  syncTab () {
    const tabTextMap = {
      [UI_MODES.PLACING]: 'Hide and Seek Game',
      [UI_MODES.READY]: 'Hide Game',
      [UI_MODES.TESTING]: 'Hide Game',
      [UI_MODES.SEEKING]: 'Hide and Seek Game'
    }
    this.setTabText(tabTextMap[this.mode])
  }

  _applyPlacingMode () {
    this.setTabText('Hide and Seek Game')
    this._showPlacingControls()
    this._hideGameControls()
    this.showShipTrays()
    this.showTransformBtns()
    this.showTips()
    this.showStatus()
    this.standardPanels()
  }

  _applyReadyMode () {
    this.setTabText('Hide Game')
    this._hidePlacingControls()
    this._showGameControls()
    this.hideShipTrays()
    this.hideTransformBtns()
    this._clearBoardCells()
    this.hideTips()
    this.showStatus()
    this.standardPanels()
    gameStatus._addToQueue(
      'test your placement or play a game against the computer',
      false
    )
  }

  _applyTestingMode () {
    this._showGameControls()
    gameStatus.line.classList.add(UI_CLASSES.MEDIUM)
    this.setTabText('Hide Game')
    this.hideShipTrays()
    this.hideTransformBtns()
    this.hideTips()
    gameStatus.game.classList.remove(UI_CLASSES.HIDDEN)
    gameStatus.mode.classList.remove(UI_CLASSES.HIDDEN)
    gameStatus.line.classList.remove(UI_CLASSES.HIDDEN)
  }

  _applySeekingMode () {
    this.setTabText('Hide and Seek Game')
    this.hideShipTrays()
    this.hideTransformBtns()
    this.hideTips()
    this._hidePlacingControls()
    this._hideGameControls()
    gameStatus.line.classList.remove(UI_CLASSES.MEDIUM)
    gameStatus.line2.classList.remove(UI_CLASSES.MEDIUM)
    gameStatus.line2.classList.add(UI_CLASSES.SMALL)
    this._addAltPanels()
  }

  // ============ Control Visibility ============

  _showPlacingControls () {
    this.toggleElements([this.chooseControls, this.newPlacementBtn], true)
  }

  _hidePlacingControls () {
    this.toggleElements([this.chooseControls, this.newPlacementBtn], false)
  }

  _showGameControls () {
    this.toggleElements([this.testBtn, this.seekBtn], true)
    this.toggleElements([this.stopBtn], false)
  }

  _hideGameControls () {
    this.toggleElements([this.testBtn, this.seekBtn, this.stopBtn], false)
  }

  // ============ Score Labels ============

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

  _clearBoardCells () {
    for (const cell of this.board.children) {
      cell.classList.remove(UI_CLASSES.HIT, UI_CLASSES.PLACED)
    }
  }

  _addAltPanels () {
    const panels = document.getElementsByClassName('panel')
    for (const panel of panels) {
      panel.classList.add(UI_CLASSES.ALT)
    }
  }

  // ============ Public Mode Methods (for backward compatibility) ============

  placeMode () {
    this._updateScoreLabels(UI_MODES.PLACING)
    this.setMode(UI_MODES.PLACING)
  }

  readyMode () {
    this._updateScoreLabels(UI_MODES.READY)
    this.setMode(UI_MODES.READY)
  }

  testMode () {
    this.setMode(UI_MODES.TESTING)
  }

  seekMode () {
    this.setMode(UI_MODES.SEEKING)
  }

  // ============ Lifecycle & Game State ============

  displayFleetSunk () {
    gameStatus.flush()
    gameStatus._addToQueue('Enemy Fleet Revealed', 'You Gave Up')
    gameStatus._addToQueue('Your Fleet is Destroyed', true)
    this.board.classList.add(UI_CLASSES.DESTROYED)
    trackLevelEnd(bh.map, false)
  }

  cellHit (r, c, damaged) {
    const cell = this.gridCellAt(r, c)
    this.cellHitBase(cell, damaged)
  }

  cellUseAmmo (r, c, damage) {
    const cell = this.gridCellAt(r, c)
    this.useAmmoInCell(cell, damage)
  }

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

  addContrast () {}

  removeShadowWeapon () {}

  gotoNextStageAfterPlacement () {
    if (this.isTestEnvironment()) {
      this.setReadyModeAfterPlacement()
    } else {
      this.setReadyAndSeekModeAfterPlacement()
      this._playBattleHide?.()
    }
  }

  isTestEnvironment () {
    return bh.test
  }

  setReadyModeAfterPlacement () {
    this.readyMode()
  }

  setReadyAndSeekModeAfterPlacement () {
    this.readyMode()
    this.seekMode()
  }
}
