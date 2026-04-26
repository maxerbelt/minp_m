import { bh } from '../../terrains/all/js/bh.js'
import { dragNDrop } from '../../selection/dragndrop.js'

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
   * @private
   * @param {Object} options - Configuration object
   * @param {number} options.ammoUnattached - Count of unattached ammo
   * @param {Object} options.viewModel - View model for interactions
   * @param {Object} options.weapon - Weapon object with letter property
   * @param {number} options.index - Box index in ammo capacity
   * @param {number} options.ammoUsed - Count of ammo used
   * @param {Object} options.maps - Terrain maps with color definitions
   * @param {Object} options.weaponSystem - Weapon system with state
   * @param {HTMLElement} options.row - Parent row element
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
    const hit = weaponSystem.hit
    const damaged = weaponSystem.damaged
    const wid = weaponSystem.id
    const letter = weapon.letter
    const box = document.createElement('div')

    // Enable drag-and-drop for unattached ammo
    if (bh.terrain.hasUnattachedWeapons && ammoUnattached > index) {
      dragNDrop.makeDraggable(viewModel, box, null, weapon, true)
    }

    box.dataset.wid = wid
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
   * @private
   * @param {Object} weaponSystem - Weapon system with ammo data
   * @param {Object} viewModel - View model for interactions
   * @param {Object} weapon - Weapon object
   * @param {Object} maps - Terrain maps with colors
   * @param {HTMLElement} row - Parent row element
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
   * @param {Object} viewModel - View model for weapon interactions
   * @param {Object} weaponSystem - Weapon system with ammo and state
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
    const leaves = weaponSystem.getLeafWeapons().sort((a, b) => a.ammo - b.ammo)

    // Build ammo boxes for each weapon leaf
    for (const leaf of leaves) {
      this.#buildWeaponSubRow(leaf, viewModel, weapon, maps, row)
    }

    rowContainer.appendChild(row)
  }
}
