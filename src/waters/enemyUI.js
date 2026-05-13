import { bh } from '../terrains/all/js/bh.js'
import { gameStatus } from './StatusUI.js'
import { WatersUI } from './WatersUI.js'
import { trackLevelEnd } from '../navbar/gtag.js'
import { ShipCellDisplayer } from './helpers/ShipCellDisplayer.js'

/**
 * @typedef {Object} EnemyWeaponDescriptor
 * @property {string} letter
 * @property {string} btnClass
 * @property {string} buttonHtml
 */

/**
 * @typedef {Object} EnemyWeaponSystem
 * @property {EnemyWeaponDescriptor} weapon
 */

/**
 * @callback WeaponButtonCallback
 * @param {string} letter
 * @returns {void}
 */

const ENEMY_BUTTON_IDS = {
  reveal: 'revealBtn',
  place: 'newPlace2',
  restart: 'newGame',
  test: 'test2Btn',
  weapon: 'weaponBtn'
}

/**
 * UI class for managing enemy board interactions and weapon selection.
 */
class EnemyUI extends WatersUI {
  /**
   * Initializes the enemy UI with DOM element references.
   */
  constructor () {
    super('enemy', 'Enemy')
    this.buttons = this._initializeButtons()
    this._refreshButtonAliases()
    this.playMode()
  }

  /**
   * Builds the enemy UI button references from DOM ids.
   * @returns {{reveal: HTMLElement|null, place: HTMLElement|null, restart: HTMLElement|null, test: HTMLElement|null, weapon: HTMLElement|null}}
   * @private
   */
  _initializeButtons () {
    return {
      reveal: this._getButtonById(ENEMY_BUTTON_IDS.reveal),
      place: this._getButtonById(ENEMY_BUTTON_IDS.place),
      restart: this._getButtonById(ENEMY_BUTTON_IDS.restart),
      test: this._getButtonById(ENEMY_BUTTON_IDS.test),
      weapon: this._getButtonById(ENEMY_BUTTON_IDS.weapon)
    }
  }

  /**
   * Refreshes button references from live DOM elements.
   * Useful when navbar content is loaded after UI initialization.
   */
  refreshButtons () {
    this.buttons = this._initializeButtons()
    this._refreshButtonAliases()
  }

  /**
   * Synchronizes shortcut button properties with the current button set.
   * @private
   */
  _refreshButtonAliases () {
    this.weaponBtn = this.buttons.weapon
    this.revealBtn = this.buttons.reveal
  }

  /**
   * Retrieves a button element by its DOM id.
   * @param {string} id
   * @returns {HTMLElement|null}
   * @private
   */
  _getButtonById (id) {
    return document.getElementById(id)
  }

  /**
   * Creates weapon buttons by cloning a template node for each weapon system.
   * @param {HTMLElement} node - The template node to clone.
   * @param {Array<EnemyWeaponSystem>|Object<string, EnemyWeaponSystem>} wpss - Weapon systems.
   * @param {WeaponButtonCallback} callback - Callback function called with weapon letter on click.
   * @returns {HTMLElement[]} Array of created button elements.
   */
  weaponButtons (node, wpss, callback) {
    const weaponButtons = []
    if (!node || !wpss) {
      console.warn('Weapon buttons node or weapon systems not found')
      return weaponButtons
    }

    if (typeof callback !== 'function') {
      console.warn('Weapon button callback is not a function')
      return weaponButtons
    }

    const parent = node.parentNode
    if (!parent) {
      console.warn('Weapon button parent node not found')
      return weaponButtons
    }

    const cloneClass = node.id ? `${node.id}-clone` : 'weapon-button-clone'
    this._removeWeaponButtonClones(parent, cloneClass)

    const weaponEntries = this._weaponSystemEntries(wpss)
    if (weaponEntries.length === 0) {
      console.warn('No weapon systems provided for weapon buttons')
      return weaponButtons
    }

    let last = node
    for (const [index, wps] of weaponEntries) {
      const clone = this._buildWeaponButtonClone(
        node,
        cloneClass,
        wps.weapon,
        index,
        callback
      )
      parent.insertBefore(clone, last.nextSibling)
      last = clone
      weaponButtons.push(clone)
    }

    return weaponButtons
  }

  /**
   * Returns an array of weapon system entries for iteration.
   * @param {Array<EnemyWeaponSystem>|Object<string, EnemyWeaponSystem>} wpss
   * @returns {Array<[string, EnemyWeaponSystem]>}
   * @private
   */
  _weaponSystemEntries (wpss) {
    if (!wpss || typeof wpss !== 'object') {
      return []
    }
    return Object.entries(wpss)
  }

  /**
   * Removes previously cloned weapon buttons from the DOM.
   * @param {ParentNode} parent
   * @param {string} cloneClass
   * @private
   */
  _removeWeaponButtonClones (parent, cloneClass) {
    parent.querySelectorAll(`.${cloneClass}`).forEach(el => el.remove())
  }

  /**
   * Builds a cloned weapon button with event wiring.
   * @param {HTMLElement} template
   * @param {string} cloneClass
   * @param {EnemyWeaponDescriptor} weapon
   * @param {string} index
   * @param {WeaponButtonCallback} callback
   * @returns {HTMLElement}
   * @private
   */
  _buildWeaponButtonClone (template, cloneClass, weapon, index, callback) {
    const clone = template.cloneNode(true)
    clone.classList.add(cloneClass, weapon.btnClass)
    clone.dataset.letter = weapon.letter
    clone.addEventListener('click', () => callback(weapon.letter))
    clone.innerHTML = weapon.buttonHtml

    if (clone.id && template.id) {
      clone.id = `${template.id}-${index}`
    }

    return clone
  }

  /**
   * Displays the fleet as sunk and updates game status.
   */
  displayFleetSunk () {
    gameStatus.showMode('Fleet Destroyed')
    gameStatus.addToQueue('All Units Destroyed - Well Done!', true)
    this.board.classList.add('destroyed')
    trackLevelEnd(bh.map, true)
  }

  /**
   * Switches to reveal mode, showing relevant buttons.
   */
  revealMode () {
    this._setButtonHidden(['reveal', 'weapon'], true)
    this._setButtonHidden(['place', 'restart', 'test'], false)
  }

  /**
   * Switches to play mode, showing relevant buttons.
   */
  playMode () {
    this._setButtonHidden(['reveal', 'weapon'], false)
    this._setButtonHidden(['place', 'restart', 'test'], true)
  }

  /**
   * Shows or hides buttons by key.
   * @param {string[]} buttonKeys
   * @param {boolean} hidden
   * @private
   */
  _setButtonHidden (buttonKeys, hidden) {
    buttonKeys.forEach(key =>
      this._toggleElementHidden(this.buttons[key], hidden)
    )
  }

  /**
   * Applies the hidden class to a target element.
   * @param {HTMLElement|null} element
   * @param {boolean} hidden
   * @private
   */
  _toggleElementHidden (element, hidden) {
    element?.classList.toggle('hidden', hidden)
  }

  /**
   * Disables or enables all buttons.
   * @param {boolean} [isDisabled=true] - Whether to disable the buttons.
   */
  disableBtns (isDisabled = true) {
    this._setButtonsDisabled(Object.values(this.buttons), isDisabled)
  }

  /**
   * Enables all buttons.
   */
  enableBtns () {
    this.disableBtns(false)
  }

  /**
   * Sets disabled state on a collection of buttons.
   * @param {Array<HTMLElement|null>} buttons
   * @param {boolean} disabled
   * @private
   */
  _setButtonsDisabled (buttons, disabled) {
    buttons.forEach(button => {
      if (button) {
        button.disabled = disabled
      }
    })
  }

  /**
   * Reveals all ships and switches to reveal mode.
   * @param {Array} ships - Array of ships to reveal.
   */
  revealAll (ships) {
    this.revealShips(ships)
    this.revealMode()
    gameStatus.showMode('Enemy Fleet Revealed')
    gameStatus.addToQueue('You Gave Up')
    this.board.classList.add('destroyed')
  }

  /**
   * Displays a cell as sunk.
   * @param {HTMLElement} cell - The cell element.
   * @param {string} letter - The ship letter.
   */
  displayAsSunk (cell, letter) {
    ShipCellDisplayer.displayEnemySunkCell(cell, letter)
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
    gameStatus.addToQueue('Click On Square To Fire', false)
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
