import { bh } from '../terrains/all/js/bh.js'
import { gameStatus } from './StatusUI.js'
import { PlacementUI } from './placementUI.js'
import { trackLevelEnd } from '../navbar/gtag.js'

export class FriendUI extends PlacementUI {
  constructor () {
    super('friend', 'Friendly')
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
    this.syncTab()
  }

  syncTab () {
    this.tab = document.getElementById('tab-hide')
  }

  displayFleetSunk () {
    gameStatus.flush()
    gameStatus.addToQueue('Enemy Fleet Revealed', 'You Gave Up')
    gameStatus.addToQueue('Your Fleet is Destroyed', true)
    this.board.classList.add('destroyed')
    trackLevelEnd(bh.map, false)
  }

  cellHit (r, c, damaged) {
    const cell = this.gridCellAt(r, c)
    this.cellHitBase(cell, damaged)
  }
  placeMode () {
    this.placingShips = true
    this.readyingShips = false
    this.hideNSeek()
    const chooseControls = document.getElementById('choose-controls')
    chooseControls.classList.remove('hidden')
    this.newPlacementBtn.classList.remove('hidden')
    this.testBtn.classList.add('hidden')
    this.seekBtn.classList.add('hidden')
    this.score.shotsLabel.classList.add('hidden')
    this.score.hitsLabel.classList.add('hidden')
    this.score.sunkLabel.classList.add('hidden')
    this.score.revealsLabel.classList.add('hidden')
    this.score.hintsLabel.classList.add('hidden')
    this.score.placedLabel.classList.remove('hidden')
    this.showTransformBtns()
    this.stopBtn.classList.add('hidden')
    this.showShipTrays()
    this.showStatus()
    this.standardPanels()
    this.showTips()
  }
  hideNSeek () {
    if (this.tab) this.tab.textContent = 'Hide and Seek Game'
  }
  hide () {
    if (this.tab) this.tab.textContent = 'Hide Game'
  }
  readyMode () {
    this.placingShips = false
    this.readyingShips = true
    this.hide()
    const chooseControls = document.getElementById('choose-controls')
    chooseControls.classList.add('hidden')
    this.testBtn.classList.remove('hidden')
    this.seekBtn.classList.remove('hidden')
    this.hideTransformBtns()
    this.stopBtn.classList.add('hidden')
    this.hideShipTrays()
    for (const cell of this.board.children) {
      cell.classList.remove('hit', 'placed')
    }
    this.showStatus()
    this.standardPanels()
    this.hideTips()
    gameStatus.addToQueue(
      'test your placement or play a game against the computer',
      false
    )
  }

  testMode () {
    this.placingShips = false
    this.readyingShips = false
    this.showTestBtns()
    this.unreadyMode()
    gameStatus.line.classList.add('medium')
    this.hide()
  }

  showTestBtns () {
    this.stopBtn.classList.remove('hidden')
    this.testBtn.classList.remove('hidden')
    this.seekBtn.classList.remove('hidden')
  }

  unreadyMode () {
    this.stopBtn.classList.remove('hidden')
    this.score.sunkLabel.classList.remove('hidden')
    this.score.placedLabel.classList.add('hidden')
    this.hideTransformBtns()
    this.hideShipTrays()
    this.hideTips()
    gameStatus.game.classList.remove('hidden')
    gameStatus.mode.classList.remove('hidden')
    gameStatus.line.classList.remove('hidden')
  }

  seekMode () {
    this.placingShips = false
    this.newPlacementBtn.classList.add('hidden')
    this.hideNSeek()
    this.unreadyMode()
    this.hideTestBtns()
    gameStatus.line.classList.remove('medium')
    gameStatus.line2.classList.remove('medium')
    gameStatus.line2.classList.add('small')
    const panels = document.getElementsByClassName('panel')
    for (const panel of panels) {
      panel.classList.add('alt')
    }
  }
  hideTestBtns () {
    this.testBtn.classList.add('hidden')
    this.stopBtn.classList.add('hidden')
    this.seekBtn.classList.add('hidden')
  }
  cellUseAmmo (r, c, damage) {
    const cell = this.gridCellAt(r, c)
    this.useAmmoInCell(cell, damage)
  }
  useAmmoInCell (cell, damage) {
    const dataset = cell.dataset
    cell.classList.remove('active')
    if (damage) {
      cell.classList.add(damage)
      cell.classList.remove('empty', 'weapon')
    } else {
      cell.classList.add('empty')
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
