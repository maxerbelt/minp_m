import { bh } from '../terrains/all/js/bh.js'
import { gameStatus } from './StatusUI.js'
import { WatersUI } from './WatersUI.js'
import { trackLevelEnd } from '../navbar/gtag.js'
import { ShipCellDisplayer } from './helpers/ShipCellDisplayer.js'

/**
 * @typedef {Object} EnemyWeaponDescriptor
 * @property {string} letter - Weapon identifier letter
 * @property {string} btnClass - CSS class for button styling
 * @property {string} buttonHtml - HTML content for the button
 */

/**
 * @typedef {Object} EnemyWeaponSystem
 * @property {EnemyWeaponDescriptor} weapon - Weapon descriptor object
 */

/**
 * @typedef {Object} EnemyButtonCollection
 * @property {HTMLButtonElement|null} reveal - Reveal button reference
 * @property {HTMLButtonElement|null} place - Place button reference
 * @property {HTMLButtonElement|null} restart - Restart button reference
 * @property {HTMLButtonElement|null} test - Test button reference
 * @property {HTMLButtonElement|null} weapon - Weapon button reference
 */

/**
 * @typedef {Object} WeaponButtonValidation
 * @property {boolean} isValid - Whether validation passed
 * @property {ParentNode} [parent] - Parent element if valid; guaranteed non-null when isValid is true
 * @property {string} [cloneClass] - Clone class name if valid; guaranteed non-null when isValid is true
 * @property {Array<[string, EnemyWeaponSystem]>} [weaponEntries] - Weapon entries if valid; guaranteed non-null when isValid is true
 */

/**
 * @callback WeaponButtonCallback
 * @param {string} letter - Weapon letter to process
 * @returns {void}
 */

/**
 * DOM element IDs for enemy UI buttons.
 * @type {Object<string, string>}
 * @readonly
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
 * Extends WatersUI to provide enemy-specific board visualization and weapon targeting.
 *
 * @class EnemyUI
 * @extends {WatersUI}
 */
class EnemyUI extends WatersUI {
  /**
   * Initializes the enemy UI with DOM element references.
   * Sets up buttons, UI state, and switches to play mode.
   *
   * @constructor
   */
  constructor () {
    super('enemy', 'Enemy')
    this.buttons = this._initializeButtons()
    this._refreshButtonAliases()
    this.playMode()
  }

  /**
   * Builds the enemy UI button references from DOM ids.
   * Retrieves button elements by their identifiers and returns a collection.
   *
   * @returns {EnemyButtonCollection} Button collection with references to all enemy UI buttons
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
   * Rebuilds all button references and updates shortcuts.
   *
   * @returns {void}
   */
  refreshButtons () {
    this.buttons = this._initializeButtons()
    this._refreshButtonAliases()
  }

  /**
   * Synchronizes shortcut button properties with the current button set.
   * Updates weapon and reveal button shortcuts for quick access.
   *
   * @returns {void}
   * @private
   */
  _refreshButtonAliases () {
    this.weaponBtn = this.buttons.weapon
    this.revealBtn = this.buttons.reveal
  }

  /**
   * Retrieves a button element by its DOM id.
   *
   * @param {string} id - The DOM element id to look up
   * @returns {HTMLButtonElement|null} The button element or null if not found
   * @private
   */
  _getButtonById (id) {
    return /** @type {HTMLButtonElement|null} */ (document.getElementById(id))
  }

  /**
   * Creates weapon buttons by cloning a template node for each weapon system.
   * Removes existing clones, validates input, and generates new button elements
   * with event listeners wired to the provided callback.
   *
   * @param {HTMLElement} node - The template node to clone for each weapon
   * @param {Array<EnemyWeaponSystem>|Object<string, EnemyWeaponSystem>} wpss - Weapon systems collection
   * @param {WeaponButtonCallback} callback - Callback function called with weapon letter on click
   * @returns {HTMLElement[]} Array of created button elements
   */
  weaponButtons (node, wpss, callback) {
    const validation = this._validateWeaponButtonParams(node, wpss, callback)
    if (!validation.isValid) {
      return []
    }

    const parent = /** @type {ParentNode} */ (validation.parent)
    const cloneClass = /** @type {string} */ (validation.cloneClass)
    const weaponEntries = /** @type {Array<[string, EnemyWeaponSystem]>} */ (
      validation.weaponEntries
    )

    this._removeWeaponButtonClones(parent, cloneClass)

    /** @type {HTMLElement[]} */
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
   * Checks for valid node, weapon systems collection, callback function, and parent element.
   *
   * @param {HTMLElement} node - Template node to validate
   * @param {Array<EnemyWeaponSystem>|Object<string, EnemyWeaponSystem>} wpss - Weapon systems to validate
   * @param {WeaponButtonCallback} callback - Callback to validate
   * @returns {WeaponButtonValidation} Validation result with parsed data if valid
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
   * Converts weapon systems object or array to entries format.
   *
   * @param {Array<EnemyWeaponSystem>|Object<string, EnemyWeaponSystem>} wpss - Weapon systems collection
   * @returns {Array<[string, EnemyWeaponSystem]>} Array of [key, value] entries
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
   * Queries parent for elements matching the clone class and removes them.
   *
   * @param {ParentNode} parent - Parent element to query
   * @param {string} cloneClass - CSS class identifying cloned buttons
   * @returns {void}
   * @private
   */
  _removeWeaponButtonClones (parent, cloneClass) {
    parent.querySelectorAll(`.${cloneClass}`).forEach(el => el.remove())
  }

  /**
   * Builds a cloned weapon button with event wiring.
   * Clones template, applies styling, sets data attributes, and attaches click handler.
   *
   * @param {HTMLElement} template - Template element to clone
   * @param {string} cloneClass - CSS class to add to clone
   * @param {EnemyWeaponDescriptor} weapon - Weapon descriptor with styling and content
   * @param {string} index - Index for ID generation
   * @param {WeaponButtonCallback} callback - Click event handler
   * @returns {HTMLElement} Configured clone element
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
   * Adds destroyed visual state to board and tracks level completion.
   *
   * @returns {void}
   */
  displayFleetSunk () {
    gameStatus.showMode('Fleet Destroyed')
    gameStatus.addToQueue('All Units Destroyed - Well Done!', true)
    if (this.board) {
      this.board.classList.add('destroyed')
    }
    const currentMap = bh.map ?? undefined
    if (currentMap) {
      trackLevelEnd(/** @type {any} */ (currentMap), true)
    }
  }

  /**
   * Switches to reveal mode, showing relevant buttons.
   * Hides reveal and weapon buttons, shows place/restart/test buttons.
   * Hides all weapon button clones.
   *
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
   * Shows reveal and weapon buttons, hides place/restart/test buttons.
   * Shows all weapon button clones.
   *
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
   * Updates the hidden state of buttons referenced in the buttons collection.
   *
   * @param {string[]} buttonKeys - Button keys from the buttons collection
   * @param {boolean} hidden - Whether to hide the buttons
   * @returns {void}
   * @private
   */
  _setButtonHidden (buttonKeys, hidden) {
    this._setButtonsProperty(buttonKeys, 'hidden', hidden)
  }

  /**
   * Sets a property on multiple buttons.
   * Handles both 'hidden' class toggling and 'disabled' attribute setting.
   *
   * @param {string[]} buttonKeys - Button keys from the buttons collection
   * @param {string} property - Property type: 'hidden' or 'disabled'
   * @param {boolean} value - Value to set for the property
   * @returns {void}
   * @private
   */
  _setButtonsProperty (buttonKeys, property, value) {
    buttonKeys.forEach(key => {
      const button = /** @type {any} */ (this.buttons)[key]
      if (!button) return
      if (property === 'hidden') {
        this._toggleElementHidden(button, value)
      } else if (property === 'disabled') {
        button.disabled = value
      }
    })
  }

  /**
   * Toggles the 'hidden' class on an element.
   * Safely handles null elements by returning early.
   *
   * @param {HTMLElement|null} element - The element to toggle
   * @param {boolean} shouldHide - Whether to hide the element
   * @returns {void}
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
   * Convenience method that calls disableBtns(false).
   *
   * @returns {void}
   */
  enableBtns () {
    this.disableBtns(false)
  }

  /**
   * Disables or enables all buttons.
   * Sets the disabled attribute on all button references.
   *
   * @param {boolean} [isDisabled=true] - Whether to disable the buttons
   * @returns {void}
   */
  disableBtns (isDisabled = true) {
    this._setButtonsProperty(Object.keys(this.buttons), 'disabled', isDisabled)
  }

  /**
   * Reveals all ships and switches to reveal mode.
   * Displays fleet, updates game status to indicate surrender, and adds destroyed styling.
   *
   * @param {Array<Object>} ships - Array of ship objects to reveal
   * @returns {void}
   */
  revealAll (ships) {
    this.grid.revealShips(/** @type {any} */ (ships))
    this.revealMode()
    gameStatus.showMode('Enemy Fleet Revealed')
    gameStatus.addToQueue('You Gave Up')
    if (this.board) {
      this.board.classList.add('destroyed')
    }
  }

  /**
   * Displays a cell as sunk.
   * Delegates to ShipCellDisplayer to apply appropriate styling for sunk enemy ship cell.
   *
   * @param {HTMLDivElement} cell - The cell element to display as sunk
   * @param {string} letter - The ship letter identifier
   * @returns {void}
   */
  displayAsSunk (cell, letter) {
    ShipCellDisplayer.displayEnemySunkCell(cell, letter)
  }

  /**
   * Resets the board and game status.
   * Clears board HTML, removes destroyed styling, and resets game message.
   *
   * @returns {void}
   */
  reset () {
    if (this.board) {
      this.board.innerHTML = ''
      this.board.classList.remove('destroyed')
    }
    gameStatus.showMode('Single Shot')
    gameStatus.addToQueue('Click On Square To Fire', false)
  }

  /**
   * Uses ammo at specific coordinates.
   * Retrieves cell by grid coordinates and applies damage styling.
   *
   * @param {number} y - Row index (0-based)
   * @param {number} x - Column index (0-based)
   * @param {string} damage - Damage type/class name to apply
   * @returns {void}
   */
  cellUseAmmo (y, x, damage) {
    const cell = this.grid.nodeAt(x, y)
    if (cell) {
      this.useAmmoInCell(cell, damage)
    }
  }

  /**
   * Applies ammo usage to a cell.
   * Adds damage class to cell for visual feedback.
   *
   * @param {HTMLElement} cell - The cell element
   * @param {string} damage - Damage type/class name to apply
   * @returns {void}
   */
  useAmmoInCell (cell, damage) {
    if (damage) {
      cell.classList.add(damage)
    }
  }

  /**
   * Adds contrast to a cell.
   * Adds 'contrast' class to cell for visual highlighting.
   *
   * @param {HTMLDivElement} cell - The cell element
   * @returns {void}
   */
  addContrast (cell) {
    cell.classList.add('contrast')
  }
}

export { EnemyUI }
export const enemyUI = new EnemyUI()
