import { bh } from '../terrains/all/js/bh.js'
import { gameStatus } from './StatusUI.js'
import { WatersUI } from './WatersUI.js'
import { trackLevelEnd } from '../navbar/gtag.js'

/**
 * UI class for managing enemy board interactions and weapon selection.
 */
class EnemyUI extends WatersUI {
  /**
   * Initializes the enemy UI with DOM element references.
   */
  constructor () {
    super('enemy', 'Enemy')
    this.revealBtn = document.getElementById('revealBtn')
    this.placeBtn = document.getElementById('newPlace2')
    this.restartBtn = document.getElementById('newGame')
    this.testBtn = document.getElementById('test2Btn')
    this.weaponBtn = document.getElementById('weaponBtn')
    this.playMode()
  }

  /**
   * Creates weapon buttons by cloning a template node for each weapon system.
   * @param {HTMLElement} node - The template node to clone.
   * @param {Array} wpss - Array of weapon systems.
   * @param {function(string): void} callback - Callback function called with weapon letter on click.
   * @returns {Array<HTMLElement>} Array of created button elements.
   */
  weaponButtons (node, wpss, callback) {
    const weaponButtons = []
    if (!node || !wpss) {
      console.warn('Weapon buttons node or weapon systems not found')
      return weaponButtons
    }

    const numWeapons = wpss?.length || 0
    if (numWeapons === 0) {
      console.warn('No weapon systems provided for weapon buttons')
      return weaponButtons
    }

    const parent = node?.parentNode
    const cloneClass = `${node.id}-clone`

    // 1. Remove existing clones
    parent.querySelectorAll(`.${cloneClass}`).forEach(el => el.remove())

    // 2. Create new clones
    let last = node
    const entries = Object.entries(wpss)
    for (const [i, wps] of entries) {
      const weapon = wps.weapon
      const letter = weapon.letter
      const clone = node.cloneNode(true)

      // add class to root clone
      clone.classList.add(cloneClass, weapon.btnClass)
      clone.dataset.letter = letter
      clone.addEventListener('click', () => callback(letter))
      clone.innerHTML = weapon.buttonHtml

      // update root id
      if (clone?.id) {
        clone.id = `${node.id}-${i}`
      }

      // insert after previous
      parent.insertBefore(clone, last.nextSibling)
      last = clone
      weaponButtons.push(clone)
    }
    return weaponButtons
  }

  /**
   * Displays the fleet as sunk and updates game status.
   */
  displayFleetSunk () {
    gameStatus.showMode('Fleet Destroyed')
    gameStatus._addToQueue('All Units Destroyed - Well Done!', true)
    this.board.classList.add('destroyed')
    trackLevelEnd(bh.map, true)
  }

  /**
   * Switches to reveal mode, showing relevant buttons.
   */
  revealMode () {
    this.revealBtn?.classList?.add('hidden')
    this.placeBtn?.classList?.remove('hidden')
    this.restartBtn?.classList?.remove('hidden')
    this.testBtn?.classList?.remove('hidden')
    this.weaponBtn?.classList?.add('hidden')
  }

  /**
   * Switches to play mode, showing relevant buttons.
   */
  playMode () {
    this.revealBtn?.classList?.remove('hidden')
    this.placeBtn?.classList?.add('hidden')
    this.restartBtn?.classList?.add('hidden')
    this.testBtn?.classList?.add('hidden')
    this.weaponBtn?.classList?.remove('hidden')
  }

  /**
   * Disables or enables all buttons.
   * @param {boolean} [isDisabled=true] - Whether to disable the buttons.
   */
  disableBtns (isDisabled = true) {
    if (this.revealBtn) this.revealBtn.disabled = isDisabled
    if (this.placeBtn) this.placeBtn.disabled = isDisabled
    if (this.restartBtn) this.restartBtn.disabled = isDisabled
    if (this.testBtn) this.testBtn.disabled = isDisabled
    if (this.weaponBtn) this.weaponBtn.disabled = isDisabled
  }

  /**
   * Enables all buttons.
   */
  enableBtns () {
    this.disableBtns(false)
  }

  /**
   * Reveals all ships and switches to reveal mode.
   * @param {Array} ships - Array of ships to reveal.
   */
  revealAll (ships) {
    this.revealShips(ships)
    this.revealMode()
    gameStatus.showMode('Enemy Fleet Revealed')
    gameStatus._addToQueue('You Gave Up')
    this.board.classList.add('destroyed')
  }

  /**
   * Displays a cell as sunk.
   * @param {HTMLElement} cell - The cell element.
   * @param {string} letter - The ship letter.
   */
  displayAsSunk (cell, letter) {
    this.clearDisplayCell(cell)
    this.displaySunkCell(cell, letter)
  }

  /**
   * Marks a cell at coordinates as sunk.
   * @param {number} r - Row index.
   * @param {number} c - Column index.
   * @param {string} letter - Ship letter.
   */
  cellSunkAt (r, c, letter) {
    const cell = this.gridCellAt(r, c)
    this.displayAsSunk(cell, letter)
  }

  /**
   * Resets the board and game status.
   */
  reset () {
    this.board.innerHTML = ''
    this.board.classList.remove('destroyed')
    gameStatus.showMode('Single Shot')
    gameStatus._addToQueue('Click On Square To Fire', false)
  }

  /**
   * Uses ammo at specific coordinates.
   * @param {number} r - Row index.
   * @param {number} c - Column index.
   * @param {string} damage - Damage type.
   */
  cellUseAmmo (r, c, damage) {
    const cell = this.gridCellAt(r, c)
    this.useAmmoInCell(cell, damage)
  }

  /**
   * Applies ammo usage to a cell.
   * @param {HTMLElement} cell - The cell element.
   * @param {string} damage - Damage type.
   */
  useAmmoInCell (cell, damage) {
    if (damage) {
      cell.classList.add(damage)
    }
  }

  /**
   * Removes weapon shadow from a cell.
   * @param {HTMLElement} cell - The cell element.
   */
  removeShadowWeapon (cell) {
    cell.classList.remove('weapon', 'contrast')
  }

  /**
   * Adds contrast to a cell.
   * @param {HTMLElement} cell - The cell element.
   */
  addContrast (cell) {
    cell.classList.add('contrast')
  }
}

export const enemyUI = new EnemyUI()
