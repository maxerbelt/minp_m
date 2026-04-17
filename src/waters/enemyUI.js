import { bh } from '../terrains/all/js/bh.js'
import { gameStatus } from './StatusUI.js'
import { WatersUI } from './WatersUI.js'
import { trackLevelEnd } from '../navbar/gtag.js'
class EnemyUI extends WatersUI {
  constructor () {
    super('enemy', 'Enemy')
    this.revealBtn = document.getElementById('revealBtn')
    this.placeBtn = document.getElementById('newPlace2')
    this.restartBtn = document.getElementById('newGame')
    this.testBtn = document.getElementById('test2Btn')
    this.weaponBtn = document.getElementById('weaponBtn')
    this.playMode()
  }
  displayFleetSunk () {
    gameStatus.showMode('Fleet Destroyed')
    gameStatus.addToQueue('All Units Destroyed - Well Done!', true)
    this.board.classList.add('destroyed')
    trackLevelEnd(bh.map, true)
  }
  revealMode () {
    this.revealBtn?.classList?.add('hidden')
    this.placeBtn?.classList?.remove('hidden')
    this.restartBtn?.classList?.remove('hidden')
    this.testBtn?.classList?.remove('hidden')
    this.weaponBtn?.classList?.add('hidden')
  }
  playMode () {
    this.revealBtn?.classList?.remove('hidden')
    this.placeBtn?.classList?.add('hidden')
    this.restartBtn?.classList?.add('hidden')
    this.testBtn?.classList?.add('hidden')
    this.weaponBtn?.classList?.remove('hidden')
  }
  disableBtns (isDisabled = true) {
    if (this.revealBtn) this.revealBtn.disabled = isDisabled
    if (this.placeBtn) this.placeBtn.disabled = isDisabled
    if (this.restartBtn) this.restartBtn.disabled = isDisabled
    if (this.testBtn) this.testBtn.disabled = isDisabled
    if (this.weaponBtn) this.weaponBtn.disabled = isDisabled
  }
  enableBtns () {
    this.disableBtns(false)
  }
  revealAll (ships) {
    this.revealShips(ships)
    this.revealMode()
    gameStatus.showMode('Enemy Fleet Revealed')
    gameStatus.addToQueue('You Gave Up')
    this.board.classList.add('destroyed')
  }

  displayAsSunk (cell, letter) {
    this.clearCell(cell)
    this.displaySunkCell(cell, letter)
  }

  cellSunkAt (r, c, letter) {
    const cell = this.gridCellAt(r, c)
    this.displayAsSunk(cell, letter)
  }
  reset () {
    this.board.innerHTML = ''
    this.board.classList.remove('destroyed')
    gameStatus.showMode('Single Shot')
    gameStatus.addToQueue('Click On Square To Fire', false)
  }

  cellUseAmmo (r, c, damage) {
    const cell = this.gridCellAt(r, c)
    this.useAmmoInCell(cell, damage)
  }
  useAmmoInCell (cell, damage) {
    if (damage) {
      cell.classList.add(damage)
    }
  }

  removeShadowWeapon (cell) {
    cell.classList.remove('weapon')
  }
  addContrast (cell) {
    cell.classList.add('contrast')
  }
}
export const enemyUI = new EnemyUI()
