import { bh } from '../../terrains/all/js/bh.js'
import { dragNDrop } from '../../selection/dragndrop.js'

/**
 * @typedef {Object} Weapon
 * @property {string} letter - Single character representing the weapon
 * @property {boolean} isLimited - Whether the weapon has limited ammo capacity
 * @property {string} classname - CSS class name for styling
 */

/**
 * @typedef {Object} WeaponSystem
 * @property {Weapon} weapon - The weapon object
 * @property {boolean} hit - Whether the weapon has hit
 * @property {boolean} damaged - Whether the weapon is damaged
 * @property {string|number} id - Unique identifier for the weapon system
 * @property {Function} ammoCapacity - Function that returns ammo capacity
 * @property {Function} ammoUsed - Function that returns ammo used count
 * @property {Function} ammoUnattached - Function that returns unattached ammo count
 * @property {Function} getLeafWeapons - Function that returns array of leaf weapons
 */

/**
 * @typedef {Object} WeaponMaps
 * @property {Object<string, string>} shipColors - Mapping of weapon letter to ship color
 * @property {Object<string, string>} shipLetterColors - Mapping of weapon letter to text color
 */

/**
 * @typedef {Object} WeaponBoxOptions
 * @property {number} ammoUnattached - Count of unattached ammo
 * @property {*} viewModel - View model for interactions
 * @property {Weapon} weapon - Weapon object with letter property
 * @property {number} index - Box index in ammo capacity
 * @property {number} ammoUsed - Count of ammo used
 * @property {WeaponMaps} maps - Terrain maps with color definitions
 * @property {WeaponSystem} weaponSystem - Weapon system with state
 * @property {HTMLElement} row - Parent row element
 */

/**
 * Builds and displays weapon tally rows with ammo indicators and state.
 * Manages weapon system display, ammo capacity visualization, and damage/hit states.
 *
 * @class WeaponTallyBuilder
 */
export class WeaponTallyBuilder {
  /**
   * Default CSS class names for weapon tally elements.
   *
   * @type {Object<string, string>}
   */
  static #CSS_CLASSES = {
    TALLY_ROW: 'tally-row',
    WEAPON: 'weapon',
    TALLY_BOX: 'tally-box',
    USED: 'used',
    HIT: 'hit',
    DAMAGED: 'damaged'
  }

  /**
   * Default styling for weapon tally elements.
   *
   * @type {Object<string, string>}
   */
  static #DEFAULT_STYLES = {
    FONT_SIZE: '105%',
    USED_OPACITY: '0.45',
    USED_COLOR: '#fff'
  }

  /**
   * Creates a single weapon ammo box with state visualization.
   * Shows ammo availability, damage, hit status, and interactive state.
   *
   * @param {WeaponBoxOptions} options - Configuration object containing ammo and weapon state
   * @returns {void}
   */
  static #createWeaponBox ({
    ammoUnattached,
    viewModel,
    weapon,
    index,
    ammoUsed,
    maps,
    weaponSystem,
    row
  }) {
    const hit = !bh.seekingMode && weaponSystem.hit
    const damaged = !bh.seekingMode && weaponSystem.damaged
    const wid = weaponSystem.id
    const letter = weapon.letter
    const box = document.createElement('div')

    // Enable drag-and-drop for unattached ammo
    if (bh.terrain.hasUnattachedWeapons && ammoUnattached > index) {
      dragNDrop.makeDraggable(viewModel, box, null, weapon, true)
    }

    box.dataset.wid = String(wid)
    box.dataset.index = index.toString()
    box.classList?.add(this.#CSS_CLASSES.TALLY_BOX)
    box.style.fontSize = this.#DEFAULT_STYLES.FONT_SIZE

    // Render used ammo slots (faded appearance)
    if (index < ammoUsed) {
      box.style.background = maps.shipColors[letter]
      box.style.opacity = this.#DEFAULT_STYLES.USED_OPACITY
      box.textContent = ''
      box.style.color = this.#DEFAULT_STYLES.USED_COLOR

      if (!hit && !damaged) {
        box.classList?.add(this.#CSS_CLASSES.USED)
      }
    } else {
      // Render available ammo slots (full appearance)
      box.textContent = ''
      box.style.background = maps.shipColors[letter]
      box.style.color = maps.shipLetterColors[letter]
    }

    // Add state indicators
    if (hit) {
      box.classList?.add(this.#CSS_CLASSES.HIT)
    }
    if (damaged) {
      box.classList?.add(this.#CSS_CLASSES.DAMAGED)
    }

    row.appendChild(box)
  }

  /**
   * Builds a sub-row of weapon ammo boxes for a single weapon system.
   * Creates boxes for full ammo capacity, styling based on ammo state.
   *
   * @param {WeaponSystem} weaponSystem - Weapon system with ammo data
   * @param {*} viewModel - View model for interactions
   * @param {Weapon} weapon - Weapon object with properties
   * @param {WeaponMaps} maps - Terrain maps with colors
   * @param {HTMLElement} row - Parent row element to append boxes to
   * @returns {void}
   */
  static #buildWeaponSubRow (weaponSystem, viewModel, weapon, maps, row) {
    const ammoCapacity = weaponSystem.ammoCapacity()
    const ammoUsed = weaponSystem.ammoUsed()
    const ammoUnattached = weaponSystem.ammoUnattached()

    for (let i = 0; i < ammoCapacity; i++) {
      this.#createWeaponBox({
        ammoUnattached,
        viewModel,
        weapon,
        index: i,
        ammoUsed,
        maps,
        weaponSystem,
        row
      })
    }
  }

  /**
   * Builds a complete bomb/weapon tally row for a weapon system.
   * Creates visual representation of weapon with full ammo capacity display.
   * Only displays if weapon has limited ammo (configured in weapon system).
   *
   * @param {HTMLElement} rowContainer - Container to append row to
   * @param {*} viewModel - View model for weapon interactions
   * @param {WeaponSystem} weaponSystem - Weapon system with ammo and state
   * @returns {void}
   */
  static buildBombRow (rowContainer, viewModel, weaponSystem) {
    if (!weaponSystem.weapon.isLimited) return

    const row = document.createElement('div')
    const maps = bh.maps
    const weapon = weaponSystem.weapon

    row.className = `${this.#CSS_CLASSES.TALLY_ROW} ${
      this.#CSS_CLASSES.WEAPON
    } ${weapon.classname}`

    // Sort leaf weapons by ammo for consistent display
    const leaves = weaponSystem
      .getLeafWeapons()
      .sort(
        (a, b) =>
          (b.hit ? 40 : 0) -
          (a.damage ? 20 : 0) +
          (b.damage ? 20 : 0) -
          (a.hit ? 40 : 0) +
          a.ammo -
          b.ammo
      )

    // Build ammo boxes for each weapon leaf
    for (const leaf of leaves) {
      this.#buildWeaponSubRow(leaf, viewModel, weapon, maps, row)
    }

    rowContainer.appendChild(row)
  }
}
