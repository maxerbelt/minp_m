import { bh } from '../../terrains/all/js/bh.js'
import { dragNDrop } from '../../selection/dragndrop.js'

/**
 * @module waters/helpers/WeaponTallyBuilder
 * Builds and renders weapon ammo tally displays with state indicators and interactive features.
 *
 * @description
 * Manages the visual representation of weapon systems with ammo capacity indicators.
 * Renders weapon "bombs" (ammo boxes) showing ammunition availability, usage state,
 * damage status, and hit indicators. Supports drag-and-drop for unattached ammo
 * systems where multiple weapons can share ammunition pools.
 *
 * Display Features:
 * - Ammo capacity visualization via box grid (one box per ammo slot)
 * - Used ammo display with faded appearance (50% opacity)
 * - Hit state indicators for weapons that have struck targets
 * - Damage state indicators for weapons that have taken damage
 * - Drag-and-drop support for weapons with unattached ammo
 * - Terrain-specific weapon styling and color schemes
 * - Per-weapon sorting by ammo state (hit/damaged) for consistent display
 *
 * Ammo States:
 * - Available: Full opacity, weapon colors, clickable
 * - Used: Reduced opacity (45%), same colors, visual indication of consumption
 * - Hit: Additional 'hit' CSS class with visual feedback
 * - Damaged: Additional 'damaged' CSS class indicating weapon malfunction
 *
 * Weapon Hierarchies:
 * - Weapons can have leaf weapons (sub-weapons) with separate ammo systems
 * - Each leaf is rendered as separate ammo box row
 * - Leaves sorted by damage/hit/ammo state for consistent UI
 *
 * Drag-and-Drop Support:
 * - Only applies to weapons with unattached ammo systems
 * - Gated by terrain configuration (bh.terrain.hasUnattachedWeapons)
 * - Individual ammo boxes made draggable for ammunition management
 *
 * @exports WeaponTallyBuilder
 */

/**
 * Weapon type definition with display properties and ammo configuration.
 * Represents a weapon class or family with consistent properties across instances.
 *
 * @typedef {Object} Weapon
 * @property {string} letter - Single character representing the weapon type (M, P, S, B, etc.)
 * @property {boolean} isLimited - Whether the weapon has limited ammo capacity (true = show tally, false = unlimited)
 * @property {string} classname - CSS class name applied to tally row for weapon-specific styling (e.g., 'missile', 'plasma')
 */

/**
 * Weapon system instance with ammo state and health status.
 * Represents a single weapon installation on a ship with current operational state.
 *
 * @typedef {Object} WeaponSystem
 * @property {Weapon} weapon - The weapon type definition with letter and styling
 * @property {boolean} hit - Whether the weapon has recorded a hit on opponent
 * @property {boolean} damaged - Whether the weapon is damaged or malfunctioning
 * @property {string|number} id - Unique identifier for this weapon system (e.g., 'w-1', 'sys-42')
 * @property {number} ammoCapacity - Function that returns total ammo capacity for weapon (e.g., 4, 6, 8)
 * @property {number} ammoUsed - Function that returns amount of ammo consumed/fired
 * @property {number} ammoUnattached - Function that returns count of unattached/unloaded ammo (for shared pools)
 * @property {  WeaponSystem[]} leafWeapons - Function that returns array of sub-weapons (branches in weapon hierarchy)
 */

/**
 * Color mapping configuration for weapon visual styling.
 * Provides colors for rendering weapon ammo boxes by weapon letter.
 *
 * @typedef {Object} WeaponMaps
 * @property {Object<string, string>} shipColors - Maps weapon letters to background colors for ammo boxes (hex/rgba)
 * @property {Object<string, string>} shipLetterColors - Maps weapon letters to text colors for ammo boxes (hex/rgba)
 *
 * @example
 * // Example structure
 * {
 *   shipColors: { M: 'rgba(200,0,0,0.4)', P: 'rgba(0,200,0,0.4)', ... },
 *   shipLetterColors: { M: '#ffffff', P: '#000000', ... }
 * }
 */

/**
 * Configuration object for creating a single weapon ammo box.
 * Contains all parameters needed to render one ammo slot in a weapon tally row.
 *
 * @typedef {Object} WeaponBoxOptions
 * @property {number} ammoUnattached - Count of unattached/pool ammo available for this weapon
 * @property {*} viewModel - View model object for handling user interactions (drag-drop, click events)
 * @property {Weapon} weapon - Weapon type definition with letter and styling properties
 * @property {number} index - Zero-based index of this ammo box in the capacity sequence (0 = first, 1 = second, etc.)
 * @property {number} ammoUsed - Count of ammo slots that have been consumed/fired
 * @property {WeaponMaps} maps - Terrain color maps for weapon letter to color resolution
 * @property {WeaponSystem} weaponSystem - Weapon system with current hit/damage state
 * @property {HTMLElement} row - Parent row element to append this box to
 */

/**
 * Builds and manages visual tally displays for weapon systems with ammo state indicators.
 *
 * Primary Responsibilities:
 * - Render weapon ammo boxes showing capacity, usage, and state (hit/damaged)
 * - Manage visual representation of ammo consumption over time
 * - Support drag-and-drop for unattached ammo systems (terrain-configurable)
 * - Apply weapon-specific styling and colors from game theme
 * - Handle weapon hierarchies (leaf weapons) with independent ammo tracking
 * - Track and display damage/hit state on ammo boxes
 *
 * Rendering Pipeline:
 * 1. buildBombRow() - Entry point for building single weapon tally
 * 2. Get weapon and maps from global game state (bh)
 * 3. Create row div with weapon styling (CSS classes and theme)
 * 4. Get leaf weapons (sub-weapons) and sort by state
 * 5. For each leaf: Call buildWeaponSubRow() to render ammo boxes
 * 6. Append row to container
 *
 * Ammo Box States:
 * - Index < ammoUsed: Faded appearance (45% opacity), 'used' class if not hit/damaged
 * - Index >= ammoUsed: Full appearance (100% opacity), normal styling
 * - Hit/damaged: Additional CSS classes override normal styling
 *
 * Drag-and-Drop Integration:
 * - Only enabled if weapon.isLimited and bh.terrain.hasUnattachedWeapons
 * - Makes individual boxes draggable for unattached ammo
 * - Passes viewModel and weapon to dragNDrop.makeDraggable()
 *
 * Design Pattern:
 * - Static utility class (no instantiation)
 * - Private helpers organized by concern: creation (#createWeaponBox), building (#buildWeaponSubRow)
 * - Public entry point (buildBombRow) for external consumption
 * - Encapsulation of game state access (bh) in helper methods
 *
 * @class WeaponTallyBuilder
 * @static
 *
 * @example
 * // Build weapon tally for a single weapon system
 * const container = document.getElementById('weapon-tally');
 * WeaponTallyBuilder.buildBombRow(container, viewModel, weaponSystem);
 */
export class WeaponTallyBuilder {
  /**
   * Default CSS class names for weapon tally elements.
   * Immutable configuration object with standardized class identifiers.
   * Used throughout class to apply consistent styling and state indicators.
   *
   * Class Meanings:
   * - TALLY_ROW: Container row for one weapon's entire ammo display
   * - WEAPON: Marks element as weapon-related for weapon-specific styling
   * - TALLY_BOX: Individual ammo slot box (one per ammo capacity)
   * - USED: Indicates ammo has been consumed (faded state)
   * - HIT: Indicates weapon has scored hit on opponent
   * - DAMAGED: Indicates weapon is damaged or malfunctioning
   *
   * @type {Readonly<Object<string, string>>}
   * @private
   * @static
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
   * Default styling values for weapon tally boxes.
   * Immutable configuration object with hardcoded visual defaults.
   * Applied to ammo boxes during rendering for consistent appearance.
   *
   * Style Meanings:
   * - FONT_SIZE: Box text size (105% = slightly larger than base)
   * - USED_OPACITY: Opacity of consumed ammo boxes (0.45 = 45% faded)
   * - USED_COLOR: Text color for used ammo (white for contrast)
   *
   * @type {Readonly<Object<string, string>>}
   * @private
   * @static
   */
  static #DEFAULT_STYLES = {
    FONT_SIZE: '105%',
    USED_OPACITY: '0.45',
    USED_COLOR: '#fff'
  }

  /**
   * Creates a single weapon ammo box with state visualization.
   * Renders one ammo slot showing availability, usage, damage, and hit state.
   * Configures drag-drop, dataset attributes, styling, and CSS classes.
   *
   * Operation Sequence:
   * 1. Extract hit/damaged state flags (conditional on seeking mode)
   * 2. Create div element for ammo box
   * 3. Make draggable if unattached ammo available (terrain-gated)
   * 4. Set dataset attributes (weapon ID, index)
   * 5. Apply default styling (font size)
   * 6. If index < ammoUsed: Apply faded appearance (used ammo)
   * 7. If index >= ammoUsed: Apply full appearance (available ammo)
   * 8. Apply hit/damaged classes if present
   * 9. Append to row
   *
   * Used Ammo Appearance (index < ammoUsed):
   * - Background: Weapon color from maps
   * - Opacity: 45% (faded to show consumption)
   * - Text color: White
   * - 'used' class: Only if not hit and not damaged
   *
   * Available Ammo Appearance (index >= ammoUsed):
   * - Background: Weapon color from maps
   * - Opacity: 100% (full brightness)
   * - Text color: Weapon letter color from maps
   *
   * @param {WeaponBoxOptions} options - Configuration object with all ammo box parameters
   * @returns {void}
   * @throws {TypeError} If options lacks required properties or row is not HTMLElement
   * @private
   * @static
   *
   * @example
   * // Create second ammo box (index=1) for a missile weapon
   * WeaponTallyBuilder.#createWeaponBox({
   *   ammoUnattached: 2,
   *   viewModel: controller,
   *   weapon: missileWeapon,
   *   index: 1,
   *   ammoUsed: 1,
   *   maps: gameColorMaps,
   *   weaponSystem: missileSystem,
   *   row: rowElement
   * });
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
   * Renders full ammo capacity as grid of boxes with state-based styling.
   * Called for each leaf weapon in a weapon hierarchy.
   *
   * Operation:
   * 1. Get ammo capacity from weaponSystem.ammoCapacity
   * 2. Get ammo used from weaponSystem.ammoUsed
   * 3. Get ammo unattached from weaponSystem.ammoUnattached
   * 4. Loop from 0 to capacity-1
   * 5. For each index: Call #createWeaponBox() with all parameters
   * 6. Each box appended to row during creation
   *
   * Result: Row element contains 'capacity' number of ammo boxes,
   * with first 'ammoUsed' boxes in faded state and remainder in full state.
   *
   * @param {WeaponSystem} weaponSystem - Weapon system with ammo callback methods
   * @param {*} viewModel - View model object for user interactions and drag-drop
   * @param {Weapon} weapon - Weapon type definition with letter and classname
   * @param {WeaponMaps} maps - Color maps for weapon letter to color resolution
   * @param {HTMLElement} row - Parent row element to append boxes to
   * @returns {void}
   * @throws {TypeError} If row is not an HTMLElement or weaponSystem lacks callback methods
   * @private
   * @static
   *
   * @example
   * // Build ammo display for missile weapon with 4 capacity, 1 used
   * const row = document.createElement('div');
   * WeaponTallyBuilder.#buildWeaponSubRow(
   *   missileSystem,
   *   viewModel,
   *   missileWeapon,
   *   colorMaps,
   *   row
   * );
   * // row now contains 4 boxes: first faded (used), rest full (available)
   */
  static #buildWeaponSubRow (weaponSystem, viewModel, weapon, maps, row) {
    const ammoCapacity = weaponSystem.ammoCapacity
    const ammoUsed = weaponSystem.ammoUsed
    const ammoUnattached = weaponSystem.ammoUnattached

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
   * Entry point for external callers to render weapon tallies.
   * Only renders if weapon has limited ammo (configured via weapon.isLimited).
   *
   * Rendering Pipeline:
   * 1. Return early if weapon.isLimited is false (unlimited weapons skip tally display)
   * 2. Create row div element for weapon container
   * 3. Get color maps from bh.maps for weapon coloring
   * 4. Get weapon definition from weaponSystem.weapon
   * 5. Apply CSS classes: 'tally-row' + 'weapon' + weapon.classname (for weapon-specific styling)
   * 6. Get leaf weapons from weaponSystem.leafWeapons
   * 7. Sort leaves by damage/hit/ammo state for consistent display order
   * 8. For each leaf: Call #buildWeaponSubRow() to render ammo boxes
   * 9. Append completed row to container
   *
   * Sorting Logic (per leaf):
   * - Leaves with hits (b.hit=true) sort first (hit penalty = 40 priority)
   * - Leaves with damage (b.damage=true) sort second (damage penalty = 20 priority)
   * - Within same state: Sort by ammo count ascending (lowest ammo first)
   *
   * Conditional Rendering:
   * - weapon.isLimited = false: Row not created, function returns early (unlimited ammo)
   * - weapon.isLimited = true: Full row created with ammo boxes
   *
   * @param {HTMLElement} rowContainer - Container element to append weapon tally row to
   * @param {*} viewModel - View model for weapon interactions (passed to drag-drop system)
   * @param {WeaponSystem} weaponSystem - Weapon system with weapon definition, ammo state, and leaf weapons
   * @returns {void}
   * @throws {TypeError} If rowContainer is not an HTMLElement or weaponSystem lacks required methods
   * @public
   * @static
   *
   * @example
   * // Build tally for a limited-ammo missile weapon
   * const tallyContainer = document.getElementById('weapon-tallies');
   * const missileSystem = ship.weapons[0]; // Assumes limited ammo
   * WeaponTallyBuilder.buildBombRow(tallyContainer, gameViewModel, missileSystem);
   * // tallyContainer now contains visual ammo display for missile weapon
   *
   * @example
   * // Build tally for weapon with leaf weapons (multi-stage system)
   * WeaponTallyBuilder.buildBombRow(container, viewModel, multiStageWeapon);
   * // Creates separate ammo rows for each leaf weapon, sorted by state
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
    const leaves = weaponSystem.leafWeapons.sort(
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
