/**
 * Sea terrain weapons module.
 * Defines specialized weapon classes for sea/naval combat including bombs, strikes,
 * torpedoes, anti-aircraft flack, and radar scanning capabilities.
 *
 * Weapon Classes:
 * - Megabomb: Enhanced explosive with increased destructive radius
 * - Kinetic: Satellite-based orbital strike with multi-stage targeting
 * - Torpedo: Underwater projectile with submarine-specific mechanics
 * - Flack: Anti-aircraft burst with randomized cluster effects
 * - Sweep: Radar scanning for area reconnaissance
 *
 * @module SeaWeapons
 * @typedef {import('./types/weapon.types.js').Coord} Coord
 * @typedef {import('./types/weapon.types.js').AoeCell} AoeCell
 * @typedef {import('./types/weapon.types.js').AoePattern} AoePattern
 * @typedef {import('./types/weapon.types.js').CellEffect} CellEffect
 * @typedef {import('./types/weapon.types.js').SeaViewModel} SeaViewModel
 * @typedef {import('./types/config.types.js').WeaponConfig} WeaponConfig
 */

import { bh } from '../../../terrains/all/js/bh.js'
import { Random } from '../../../core/Random.js'
import { xyFromCell } from '../../../core/utilities.js'
import { Weapon } from '../../../weapon/Weapon.js'
import { WeaponCatalogue } from '../../../weapon/WeaponCatalogue.js'
import { Delay } from '../../../core/Delay.js'
import { Bomb, Fish, Sensor, Strike } from '../../../weapon/Bomb.js'

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Sound file names for sea weapons flight audio.
 * Maps weapon types to their corresponding MP3 audio files.
 * Each filename references an audio asset in the sounds directory.
 *
 * @typedef {Object} SoundFilesMap
 * @property {string} MEGABOMB - 'bomb-flight.mp3' - Enhanced bomb explosion sound
 * @property {string} KINETIC - 'kinetic-flight.mp3' - Satellite strike sound
 * @property {string} TORPEDO - 'torpedo-flight.mp3' - Underwater projectile sound
 * @property {string} FLACK - 'flack-flight.mp3' - Anti-aircraft burst sound
 *
 * @type {Readonly<SoundFilesMap>}
 * @readonly
 * @constant
 */
const SOUND_FILES = Object.freeze({
  MEGABOMB: 'bomb-flight.mp3',
  KINETIC: 'kinetic-flight.mp3',
  TORPEDO: 'torpedo-flight.mp3',
  FLACK: 'flack-flight.mp3'
})

/**
 * Base URL for sound assets, resolved from module URL.
 * Used to construct full paths to audio files in the sea terrain sounds directory.
 * Resolved at module load time from import.meta.url for ES6 module compatibility.
 *
 * @type {string}
 * @readonly
 * @constant
 */
const SOUND_BASE_URL = import.meta.url

/**
 * Sea weapon configuration definitions.
 * Maps weapon type identifiers to their display and behavior configurations.
 * Contains all weapon types used in sea/naval combat system.
 *
 * Configuration Structure:
 * - hints: string[] - UI hints shown during targeting phases
 * - buttonHtml?: string - HTML for weapon selection button with keyboard shortcut
 * - tip?: string - Tooltip text describing weapon function
 * - tag: string - Internal weapon identifier tag for gameplay mechanics
 * - splashType?: 'air' | 'sea' - Area effect type for damage calculations
 * - splashPower?: number - Splash damage multiplier (0-2 range)
 * - animateOnTarget?: boolean - Whether to animate weapon projectile to target
 * - explodeOnTarget?: boolean - Whether weapon explodes on impact location
 * - hasFlash?: boolean - Whether explosion has visual flash effect
 *
 * @type {Readonly<Record<string, WeaponConfig>>}
 * @readonly
 * @constant
 */
const SEA_WEAPON_CONFIGS = Object.freeze({
  /**
   * Enhanced explosive bomb with wide area damage.
   * Shows single click hint. Used to disable terrain.
   * @type {Object}
   */
  MEGABOMB: {
    hints: ['Click On Square To Drop Bomb'],
    buttonHtml: '<span class="shortcut">M</span>ega Bomb',
    tip: 'drag a megabomb on to the map to increase the number of times you can drop bombs',
    tag: 'mega'
  },
  /**
   * Satellite-based kinetic strike with orbital targeting.
   * Multi-stage targeting with satellite cursor then strike location.
   * Air-based with no splash damage.
   * @type {Object}
   */
  KINETIC: {
    hints: [
      'Click on square to start kinetic strike',
      'Click on square end kinetic strike'
    ],
    buttonHtml: '<span class="shortcut">K</span>inetic Strike',
    tip: 'drag a kinetic on to the map to increase the number of times you can strike',
    splashType: 'air',
    tag: 'kinetic',
    splashPower: 0
  },
  /**
   * Underwater projectile targeting submarines and sea vessels.
   * Two-stage targeting with torpedo launch and aiming.
   * Sea-based with splash damage.
   * @type {Object}
   */
  TORPEDO: {
    hints: ['Click on square to start torpedo', 'Click on square aim torpedo'],
    buttonHtml: '<span class="shortcut">T</span>orpedo',
    tip: 'drag a torpedo on to the map to increase the number of times you can strike',
    splashType: 'sea',
    tag: 'torpedo',
    splashPower: 1
  },
  /**
   * Anti-aircraft burst weapon with cluster effects.
   * Explodes on target with delayed cluster bursts.
   * Produces visual flash on detonation.
   * @type {Object}
   */
  FLACK: {
    hints: ['Click on square to initiate flack'],
    buttonHtml: '<span class="shortcut">F</span>lack',
    tag: 'flack',
    animateOnTarget: true,
    explodeOnTarget: true,
    hasFlash: true
  },
  /**
   * Radar scanning weapon for area reconnaissance.
   * Two-stage targeting with dish placement and scan range.
   * Non-destructive detection weapon.
   * @type {Object}
   */
  SWEEP: {
    hints: [
      'Click on square to start radar scan',
      'Click on square end radar scan'
    ],
    buttonHtml: 's<span class="shortcut">W</span>eep',
    tag: 'sweep',
    hasFlash: false
  }
})

/**
 * Resolves a sea weapon flight sound URL from sound file name.
 * Constructs full audio asset path using weapon module base URL and file name.
 * Used for weapon projectile flight audio playback during combat.
 *
 * @param {string} soundFile - Name of the sound file (from SOUND_FILES object)
 * @returns {URL} Complete URL to weapon flight sound asset
 * @throws {Error} If sound file path resolution fails
 * @private
 * @static
 *
 * @example
 * const url = seaFlightSound(SOUND_FILES.MEGABOMB)
 * // Returns: file:///path/to/terrains/sea/sounds/bomb-flight.mp3
 */
function seaFlightSound (soundFile) {
  return Weapon.getFlightSoundUrl(soundFile, SOUND_BASE_URL)
}

// ============================================================================
// Weapon Classes
// ============================================================================

/**
 * Megabomb - Enhanced explosive bomb weapon with increased destructive radius.
 *
 * Extends Bomb with specialized configuration for mega explosions that can
 * disable terrain and structures with wide area damage. Used primarily for
 * strategic terrain modification during gameplay.
 *
 * @extends Bomb
 * @example
 * const megabomb = new Megabomb(3, 'Heavy Bomb', 'M');
 * megabomb.clone(2); // Create copy with 2 ammo
 */
export class Megabomb extends Bomb {
  /**
   * Initializes megabomb with enhanced bomb configuration.
   *
   * @param {number} ammo - Number of megabombs available for deployment
   * @param {string} [name='Megabomb'] - Display name for UI and tooltips
   * @param {string} [letter='M'] - Single character representation in game board
   */
  constructor (ammo, name, letter) {
    super(ammo, name || 'Megabomb', letter || 'M')
    this._applyWeaponConfig(SEA_WEAPON_CONFIGS.MEGABOMB)
  }

  /**
   * Gets the audio file for megabomb flight sound.
   *
   * @returns {URL} URL to megabomb flight sound asset
   * @readonly
   */
  get flightSound () {
    return seaFlightSound(SOUND_FILES.MEGABOMB)
  }

  /**
   * Creates a clone of this megabomb with optional new ammo count.
   *
   * @param {number} [ammo=1] - Ammo count for the cloned instance
   * @returns {Megabomb} New megabomb instance with identical configuration
   */
  clone (ammo) {
    return this.createClone(Megabomb, ammo)
  }
}

/**
 * Kinetic - Satellite-based kinetic strike weapon for orbital bombardment.
 *
 * Extends Strike with specialized configuration for precise orbital strikes.
 * Uses two-stage targeting: first select satellite position, then select
 * strike location. Orthogonally adjacent cells also destroyed on impact.
 *
 * @extends Strike
 * @example
 * const kinetic = new Kinetic(2, 'Rail Gun', 'K');
 * // Two-stage targeting: satellite placement, then strike area
 */
export class Kinetic extends Strike {
  /**
   * Initializes kinetic strike with satellite targeting configuration.
   *
   * @param {number} ammo - Number of kinetic strikes available
   * @param {string} [name='Kinetic Strike'] - Display name for UI and tooltips
   * @param {string} [letter='K'] - Single character representation in game board
   */
  constructor (ammo, name, letter) {
    super(ammo, name || 'Kinetic Strike', letter || 'K', true, true, 2)
    this.cursors = ['satelite', 'strike']
    this.postSelectCursor = 1
    this.postSelectCoords = 1
    this.postSelectShadow = true
    this.totalCursors = 2
    this._applyWeaponConfig(SEA_WEAPON_CONFIGS.KINETIC)
  }

  /**
   * Gets the audio file for kinetic strike flight sound.
   *
   * @returns {URL} URL to kinetic strike flight sound asset
   * @readonly
   */
  get flightSound () {
    return seaFlightSound(SOUND_FILES.KINETIC)
  }

  /**
   * Creates a clone of this kinetic strike with optional new ammo count.
   *
   * @param {number} [ammo=1] - Ammo count for the cloned instance
   * @returns {Kinetic} New kinetic strike instance with identical configuration
   */
  clone (ammo) {
    return this.createClone(Kinetic, ammo)
  }
}

/**
 * Torpedo - Underwater projectile weapon for submarine warfare.
 *
 * Extends Fish with specialized configuration for targeting submarines and
 * underwater vessels. Uses two-stage targeting with torpedo launch from
 * surface or underwater position, then aiming at target.
 *
 * @extends Fish
 * @example
 * const torpedo = new Torpedo(4);
 * // Two-stage: launch point (torpedo), then target (periscope)
 */
export class Torpedo extends Fish {
  /**
   * Initializes torpedo with underwater targeting configuration.
   *
   * @param {number} ammo - Number of torpedoes available for deployment
   */
  constructor (ammo) {
    super(ammo, 'Torpedo', '+')
    this.cursors = ['torpedo', 'periscope']
    this.postSelectCursor = 1
    this.postSelectCoords = 1
    this.postSelectShadow = true
    this.totalCursors = 2
    this._applyWeaponConfig(SEA_WEAPON_CONFIGS.TORPEDO)
  }

  /**
   * Gets the audio file for torpedo flight sound.
   *
   * @returns {URL} URL to torpedo flight sound asset
   * @readonly
   */
  get flightSound () {
    return seaFlightSound(SOUND_FILES.TORPEDO)
  }

  /**
   * Creates a clone of this torpedo with optional new ammo count.
   *
   * @param {number} [ammo=1] - Ammo count for the cloned instance
   * @returns {Torpedo} New torpedo instance with identical configuration
   */
  clone (ammo) {
    return this.createClone(Torpedo, ammo)
  }
}

/**
 * Flack - Anti-aircraft burst weapon with delayed cluster effects.
 *
 * Extends Weapon with specialized configuration for aerial defense with
 * randomized cluster pattern explosions. Bursts produce multiple delayed
 * explosions in an extended area with variable power levels (high center,
 * medium edges). Visually distinct with flash effect on detonation.
 *
 * @extends Weapon
 * @example
 * const flack = new Flack(5);
 * // Creates randomized cluster burst pattern up to 16 cells
 */
export class Flack extends Weapon {
  /**
   * Initializes flack with cluster burst configuration.
   * Sets up splash coordinate pattern and drag shape for UI rendering.
   *
   * @param {number} ammo - Number of flack bursts available for deployment
   */
  constructor (ammo) {
    super('Flack', 'F', true, true, 1)
    this.ammo = ammo
    this.cursors = ['cluster']
    this.totalCursors = 1
    this.splashSize = 1.4
    this.splashMin = 1.2
    this.splashMax = 1.6
    this.isOneAndDone = false
    this.nonAttached = true
    this.animateOffsetY = 50
    this._applyWeaponConfig(SEA_WEAPON_CONFIGS.FLACK)
    this.splashCoords = [
      [0, 0, 1],
      [1, 1, 2],
      [0, 2, 1],
      [2, 0, 1],
      [2, 2, 1],
      [1, 3, 2],
      [0, 4, 1],
      [2, 4, 1],
      [0, 1, 0],
      [2, 3, 0]
    ]
    this.dragShape = [
      [0, 0, 0],
      [1, 1, 1],
      [0, 2, 0],
      [2, 0, 0],
      [2, 2, 0],
      [1, 3, 1],
      [0, 4, 0]
    ]
  }

  /**
   * Gets the audio file for flack flight sound.
   *
   * @returns {URL} URL to flack flight sound asset
   * @readonly
   */
  get flightSound () {
    return seaFlightSound(SOUND_FILES.FLACK)
  }

  /**
   * Creates a clone of this flack with optional new ammo count.
   *
   * @param {number} [ammo=1] - Ammo count for the cloned instance
   * @returns {Flack} New flack instance with identical configuration
   */
  clone (ammo) {
    return this.createClone(Flack, ammo)
  }

  /**
   * Normalizes coordinates for flack targeting.
   * Flack targets a single point and converts multi-coordinate inputs
   * to a normalized coordinate pair for consistent aoe calculation.
   *
   * @param {Object} _map - Game map (unused, present for method override signature)
   * @param {Array} _base - Base coordinates (unused, present for method override signature)
   * @param {Coord[]} coords - Target coordinates provided by user
   * @returns {Coord[]} Normalized coordinate pair [anchor, target]
   * @private
   */
  redoCoords (_map, _base, coords) {
    return [[0, coords[0][1]], coords[0]]
  }

  /**
   * Applies delayed async effect to a single cell.
   * Waits random duration between min and max delay, then applies explosion.
   *
   * @param {HTMLElement} cell - Target cell DOM element
   * @param {number} [mindelay=380] - Minimum delay in milliseconds
   * @param {number} [maxdelay=730] - Maximum delay in milliseconds
   * @param {number|null} [power=null] - Effect power level (null, 1, or 2)
   * @param {number} [cellSize=30] - Cell size in pixels for animation scaling
   * @param {string|null} [id=null] - Unique effect identifier for tracking
   * @returns {Promise<void>} Promise resolving when effect completes
   * @private
   */
  async delayAsyncEffect (
    cell,
    mindelay = 380,
    maxdelay = 730,
    power = null,
    cellSize = 30,
    id = null
  ) {
    await Delay.randomWait(mindelay, maxdelay)
    return this.asyncEffect(cell, power, cellSize, id)
  }

  /**
   * Applies async explosion effect to a cell.
   * Delegates to parent class animateExplode with air splash type.
   *
   * @param {HTMLElement} cell - Target cell DOM element
   * @param {number|null} power - Effect power level (null, 1, or 2)
   * @param {number} cellSize - Cell size in pixels for animation scaling
   * @param {string|null} id - Unique effect identifier for tracking
   * @returns {Promise<void>} Promise resolving when effect completes
   * @private
   */
  async asyncEffect (cell, power, cellSize, id) {
    return super.animateExplode(
      cell,
      null,
      null,
      cellSize,
      'air',
      power,
      null,
      null,
      null,
      id
    )
  }

  /**
   * Applies delayed async effects to multiple cells.
   * Staggered execution with random delays for cluster effect.
   *
   * @param {CellEffect[]} cells - Array of [cell, row, col, power] tuples
   * @param {number} [mindelay=380] - Minimum delay between effects in milliseconds
   * @param {number} [maxdelay=730] - Maximum delay between effects in milliseconds
   * @param {number} [cellSize=30] - Cell size in pixels for animation scaling
   * @returns {Promise<PromiseSettledResult<any>[]>} Resolves when all effects complete
   * @private
   */
  async delayAsyncEffects (
    cells,
    mindelay = 380,
    maxdelay = 730,
    cellSize = 30
  ) {
    const promises = cells.map(([cell, r, c, power]) =>
      this.delayAsyncEffect(
        cell,
        mindelay,
        maxdelay,
        power,
        cellSize,
        `${r}-${c}`
      )
    )
    return Promise.allSettled(promises)
  }

  /**
   * Animates flack explosion with delayed cluster effects.
   * Calculates area-of-effect, converts to cell elements, then applies
   * staggered delayed explosion animations to each cell.
   *
   * @param {HTMLElement} target - Target cell DOM element for burst center
   * @param {...any} _args - Remaining animation parameters:
   *   _args[3] = cellSize: number, Cell size for animation scaling
   *   _args[8] = viewModel: SeaViewModel, For converting AoePattern to cell effects
   * @returns {Promise<PromiseSettledResult<any>[]>} Resolves when all cluster explosions complete
   */
  async animateExplode (target, ..._args) {
    const cellSize = _args[3]
    const viewModel = _args[8] || null
    const coord = coordsFromCell(target)
    const aoe = this.aoe(bh.map, [coord]).filter(([, , power]) => power > 0)
    const cells = viewModel ? [...viewModel.cellsAndCoords(aoe)] : []

    return this.delayAsyncEffects(cells, 0, 500, cellSize)
  }

  /**
   * Calculates area-of-effect for flack burst pattern.
   * Creates randomized cluster pattern with high-power center bursts and
   * extended range medium-power cells. Total of 16 cells within map bounds.
   *
   * Pattern structure:
   * - 2 highest-power cells (power=2): center burst
   * - ~6 medium-power cells (power=1): primary cluster
   * - ~8 low-power cells (power=0): extended range falloff
   *
   * @param {{inBounds: (row: number, col: number) => boolean}} map
   * Game map with inBounds validation method
   * @param {Coord[]} coords - Source coordinates [startRow, startCol]
   * @returns {AoePattern} Array of [row, col, power] for damage cells,
   * limited to 16 cells and filtered to map bounds
   */
  aoe (map, coords) {
    const r = coords[0][0]
    const c = coords[0][1]
    let area = []

    // Generate base area (3x3 extended)
    for (let i = -1; i < 2; i++) {
      for (let j = -2; j < 2; j++) {
        area.push([r + i, c + j, 0])
      }
    }

    // Shuffle and select high-power cells
    const middle = Random.shuffleArray(area)
    const head = middle.slice(0, 2)
    const leftOver = middle.slice(3)

    // Add extended range cells
    for (let j = -1; j < 2; j++) {
      leftOver.push([r - 2, c + j, 0], [r + 2, c + j, 0])
    }
    for (let i = -1; i < 2; i++) {
      leftOver.push([r + i, c - 2, 0], [r + i, c + 2, 0])
    }

    // Combine and assign power levels
    const result = head.concat(Random.shuffleArray(leftOver))
    for (let i = 0; i < 8; i++) {
      result[i][2] = i < 2 ? 2 : 1
    }

    // Limit to 16 cells and filter bounds
    result.length = 16
    return result.filter(([r, c]) => map.inBounds(r, c))
  }
}

/**
 * Sweep - Radar scanning weapon for area reconnaissance.
 *
 * Extends Sensor with specialized configuration for non-destructive
 * scanning. Uses two-stage targeting: radar dish placement followed by
 * scan range selection. Provides visibility without causing damage.
 *
 * @extends Sensor
 * @example
 * const sweep = new Sweep(3);
 * // Two-stage: place radar dish, then select scan range
 */
export class Sweep extends Sensor {
  /**
   * Initializes radar sweep with scanning configuration.
   * Sets up two-cursor system for dish placement and range selection.
   *
   * @param {number} ammo - Number of radar sweeps available
   */
  constructor (ammo) {
    super(ammo, 'Radar Sweep', 'W')
    this.cursors = ['dish', 'sweep']
    this.totalCursors = 2
    this._applyWeaponConfig({
      hints: [
        'Click on square to start radar scan',
        'Click on square end radar scan'
      ],
      buttonHtml: 's<span class="shortcut">W</span>eep',
      tag: 'sweep'
    })
  }

  /**
   * Creates a clone of this radar sweep with optional new ammo count.
   *
   * @param {number} [ammo=1] - Ammo count for the cloned instance
   * @returns {Sweep} New radar sweep instance with identical configuration
   */
  clone (ammo) {
    return this.createClone(Sweep, ammo)
  }
}

// ============================================================================
// Weapon Catalogue
// ============================================================================

/**
 * Catalogue of sea terrain weapons.
 *
 * Contains all available weapon types for the sea/naval combat system:
 * - Megabomb (M): Enhanced explosive with wide area damage
 * - Kinetic (K): Satellite-based orbital strike
 * - Flack (F): Anti-aircraft burst with cluster effects
 * - Torpedo (+): Underwater projectile for submarine warfare
 *
 * Each weapon instance is initialized with 1 ammo. The catalogue can be
 * cloned and ammo counts adjusted per battle scenario and player loadout.
 *
 * Note: Sweep (W) radar weapon is currently disabled but available for future use.
 *
 * @type {WeaponCatalogue}
 * @readonly
 */
export const seaWeaponsCatalogue = new WeaponCatalogue([
  new Megabomb(1),
  new Kinetic(1),
  new Flack(1),
  new Torpedo(1)
  //  new Sweep(1)
])
