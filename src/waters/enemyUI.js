import { bh } from '../terrains/all/js/bh.js'
import { gameStatus } from './StatusUI.js'
import { WatersUI } from './WatersUI.js'
import { trackLevelEnd } from '../navbar/gtag.js'
class EnemyUI extends WatersUI {
  constructor () {
    super('enemy', 'Enemy')
    this.weaponBtn = document.getElementById('weaponBtn')
    this.revealBtn = document.getElementById('revealBtn')
  }
  displayFleetSunk () {
    gameStatus.showMode('Fleet Destroyed')
    gameStatus.addToQueue('All Units Destroyed - Well Done!', true)
    this.board.classList.add('destroyed')
    trackLevelEnd(bh.map, true)
  }

  revealAll (ships) {
    for (const ship of ships) {
      this.revealShip(ship)
    }

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
