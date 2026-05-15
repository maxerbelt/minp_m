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
   * @returns {{reveal: HTMLButtonElement|null, place: HTMLButtonElement|null, restart: HTMLButtonElement|null, test: HTMLButtonElement|null, weapon: HTMLButtonElement|null}}
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
   * @returns {HTMLButtonElement|null}
   * @private
   */
  _getButtonById (id) {
    return /** @type {HTMLButtonElement|null} */ document.getElementById(id)
  }

  /**
   * Creates weapon buttons by cloning a template node for each weapon system.
   * @param {HTMLElement} node - The template node to clone.
   * @param {Array<EnemyWeaponSystem>|Object<string, EnemyWeaponSystem>} wpss - Weapon systems.
   * @param {WeaponButtonCallback} callback - Callback function called with weapon letter on click.
   * @returns {HTMLElement[]} Array of created button elements.
   */
  weaponButtons (node, wpss, callback) {
    const validation = this._validateWeaponButtonParams(node, wpss, callback)
    if (!validation.isValid) {
      return []
    }

    const { parent, cloneClass, weaponEntries } = validation
    this._removeWeaponButtonClones(parent, cloneClass)

    const weaponButtons = []
    let last = node
    weaponEntries.forEach(([index, wps]) => {
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
    })

    return weaponButtons
  }

  /**
   * Validates parameters for weapon button creation.
   * @param {HTMLElement} node
   * @param {Array<EnemyWeaponSystem>|Object<string, EnemyWeaponSystem>} wpss
   * @param {WeaponButtonCallback} callback
   * @returns {Object} Validation result with isValid, parent, cloneClass, weaponEntries.
   * @private
   */
  _validateWeaponButtonParams (node, wpss, callback) {
    if (!node || !wpss) {
      console.warn('Weapon buttons node or weapon systems not found')
      return { isValid: false }
    }

    if (typeof callback !== 'function') {
      console.warn('Weapon button callback is not a function')
      return { isValid: false }
    }

    const parent = node.parentNode
    if (!parent) {
      console.warn('Weapon button parent node not found')
      return { isValid: false }
    }

    const cloneClass = node.id ? `${node.id}-clone` : 'weapon-button-clone'
    const weaponEntries = this._weaponSystemEntries(wpss)
    if (weaponEntries.length === 0) {
      console.warn('No weapon systems provided for weapon buttons')
      return { isValid: false }
    }

    return { isValid: true, parent, cloneClass, weaponEntries }
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
    const clone = /** @type {HTMLElement} */ (template.cloneNode(true))
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
   * @returns {void}
   */
  displayFleetSunk () {
    gameStatus.showMode('Fleet Destroyed')
    gameStatus.addToQueue('All Units Destroyed - Well Done!', true)
    this.board.classList.add('destroyed')
    trackLevelEnd(bh.map, true)
  }

  /**
   * Switches to reveal mode, showing relevant buttons.
   * @returns {void}
   */
  revealMode () {
    this._setButtonHidden(['reveal', 'weapon'], true)
    this._setButtonHidden(['place', 'restart', 'test'], false)
    document
      .querySelectorAll('.weaponBtn-clone')
      .forEach(el => el.classList.add('hidden'))
  }

  /**
   * Switches to play mode, showing relevant buttons.
   * @returns {void}
   */
  playMode () {
    this._setButtonHidden(['reveal', 'weapon'], false)
    this._setButtonHidden(['place', 'restart', 'test'], true)
    document
      .querySelectorAll('.weaponBtn-clone')
      .forEach(el => el.classList.remove('hidden'))
  }

  /**
   * Shows or hides buttons by key.
   * @param {string[]} buttonKeys
   * @param {boolean} hidden
   * @private
   */
  _setButtonHidden (buttonKeys, hidden) {
    this._setButtonsProperty(buttonKeys, 'hidden', hidden)
  }

  /**
   * Disables or enables buttons by key.
   * @param {string[]} buttonKeys
   * @param {boolean} disabled
   * @private
   */
  _setButtonsDisabled (buttonKeys, disabled) {
    this._setButtonsProperty(buttonKeys, 'disabled', disabled)
  }

  /**
   * Sets a property on multiple buttons.
   * @param {string[]} buttonKeys
   * @param {string} property - 'hidden' or 'disabled'
   * @param {boolean} value
   * @private
   */
  _setButtonsProperty (buttonKeys, property, value) {
    buttonKeys.forEach(key => {
      const button = this.buttons[key]
      if (property === 'hidden') {
        this._toggleElementHidden(button, value)
      } else if (property === 'disabled') {
        button.disabled = value
      }
    })
  }

  /**
   * Toggles the 'hidden' class on an element.
   * @param {HTMLElement|null} element - The element to toggle.
   * @param {boolean} shouldHide - Whether to hide the element.
   * @private
   */
  _toggleElementHidden (element, shouldHide) {
    if (!element) return
    if (shouldHide) {
      element.classList.add('hidden')
    } else {
      element.classList.remove('hidden')
    }
  }

  /**
   * Enables all buttons.
   * @returns {void}
   */
  enableBtns () {
    this.disableBtns(false)
  }

  /**
   * Disables or enables all buttons.
   * @param {boolean} [isDisabled=true] - Whether to disable the buttons.
   * @returns {void}
   */
  disableBtns (isDisabled = true) {
    this._setButtonsProperty(Object.keys(this.buttons), 'disabled', isDisabled)
  }

  /**
   * Reveals all ships and switches to reveal mode.
   * @param {Array} ships - Array of ships to reveal.
   * @returns {void}
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
   * @param {HTMLDivElement} cell - The cell element.
   * @param {string} letter - The ship letter.
   * @returns {void}
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
   * Adds contrast to a cell.
   * @param {HTMLElement} cell - The cell element.
   */
  addContrast (cell) {
    cell.classList.add('contrast')
  }
}

export const enemyUI = new EnemyUI()
