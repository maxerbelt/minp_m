import { bh } from '../../../terrains/all/js/bh.js'
import { Random } from '../../../core/Random.js'
import { coordsFromCell } from '../../../core/utilities.js'
import { Weapon } from '../../../weapon/Weapon.js'
import { WeaponCatelogue } from '../../../weapon/WeaponCatelogue.js'
import { Delay } from '../../../core/Delay.js'
import { Bomb, Fish, Sensor, Strike } from '../../../weapon/Bomb.js'

/**
 * @typedef {[number, number]} Coord
 * @typedef {[number, number, number]} AoeCell
 * @typedef {AoeCell[]} AoePattern
 */

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Sound file names for sea weapons
 * @enum {string}
 */
const SOUND_FILES = {
  MEGABOMB: 'bomb-flight.mp3',
  KINETIC: 'kinetic-flight.mp3',
  TORPEDO: 'torpedo-flight.mp3',
  FLACK: 'flack-flight.mp3'
}

/**
 * Base URL for sound assets
 * @type {string}
 */
const SOUND_BASE_URL = import.meta.url

const SEA_WEAPON_CONFIGS = {
  MEGABOMB: {
    hints: ['Click On Square To Drop Bomb'],
    buttonHtml: '<span class="shortcut">M</span>ega Bomb',
    tip: 'drag a megabomb on to the map to increase the number of times you can drop bombs',
    tag: 'mega'
  },
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
  TORPEDO: {
    hints: ['Click on square to start torpedo', 'Click on square aim torpedo'],
    buttonHtml: '<span class="shortcut">T</span>orpedo',
    tip: 'drag a torpedo on to the map to increase the number of times you can strike',
    splashType: 'sea',
    tag: 'torpedo',
    splashPower: 1
  },
  FLACK: {
    hints: ['Click on square to initiate flack'],
    buttonHtml: '<span class="shortcut">F</span>lack',
    tag: 'flack',
    animateOnTarget: true,
    explodeOnTarget: true,
    hasFlash: true
  },
  SWEEP: {
    hints: [
      'Click on square to start radar scan',
      'Click on square end radar scan'
    ],
    buttonHtml: 's<span class="shortcut">W</span>eep',
    tag: 'sweep',
    hasFlash: false
  }
}

/**
 * Resolves a sea weapon flight sound URL.
 * @param {string} soundFile - Name of the sound file.
 * @returns {URL} Sound URL for the weapon.
 */
function seaFlightSound (soundFile) {
  return Weapon.getFlightSoundUrl(soundFile, SOUND_BASE_URL)
}

// ============================================================================
// Weapon Classes
// ============================================================================

/**
 * Megabomb - An enhanced bomb weapon with increased destructive power
 * Extends Bomb with specialized configuration for mega explosions
 * @extends Bomb
 */
export class Megabomb extends Bomb {
  /**
   * Initializes megabomb with enhanced bomb configuration
   * @param {number} ammo - Number of megabombs available
   * @param {string} [name] - Display name (defaults to 'Megabomb')
   * @param {string} [letter] - Single character representation (defaults to 'M')
   */
  constructor (ammo, name, letter) {
    super(ammo, name || 'Megabomb', letter || 'M')
    this._applyWeaponConfig(SEA_WEAPON_CONFIGS.MEGABOMB)
  }

  /**
   * Gets the audio file for megabomb flight sound
   * @returns {URL} URL to megabomb flight sound asset
   */
  get flightSound () {
    return seaFlightSound(SOUND_FILES.MEGABOMB)
  }

  /**
   * Creates a clone of this megabomb with optional new ammo count
   * @param {number} [ammo] - Ammo count for cloned instance
   * @returns {Megabomb} New megabomb instance
   */
  clone (ammo) {
    return this.createClone(Megabomb, ammo)
  }
}

/**
 * Kinetic - A satellite-based kinetic strike weapon
 * Extends Strike with specialized configuration for orbital bombardment
 * @extends Strike
 */
export class Kinetic extends Strike {
  /**
   * Initializes kinetic strike with satellite targeting
   * @param {number} ammo - Number of kinetic strikes available
   * @param {string} [name] - Display name (defaults to 'Kinetic Strike')
   * @param {string} [letter] - Single character representation (defaults to 'K')
   */
  constructor (ammo, name, letter) {
    super(ammo, name || 'Kinetic Strike', letter || 'K', true, true, 2)
    this.cursors = ['satelite', 'strike']
    this.postSelectCursor = 1
    this.postSelectShadow = true
    this.totalCursors = 2
    this._applyWeaponConfig(SEA_WEAPON_CONFIGS.KINETIC)
  }

  /**
   * Gets the audio file for kinetic strike flight sound
   * @returns {URL} URL to kinetic strike flight sound asset
   */
  get flightSound () {
    return seaFlightSound(SOUND_FILES.KINETIC)
  }

  /**
   * Creates a clone of this kinetic strike with optional new ammo count
   * @param {number} [ammo] - Ammo count for cloned instance
   * @returns {Kinetic} New kinetic strike instance
   */
  clone (ammo) {
    return this.createClone(Kinetic, ammo)
  }
}

/**
 * Torpedo - An underwater projectile weapon
 * Extends Fish with specialized configuration for submarine warfare
 * @extends Fish
 */
export class Torpedo extends Fish {
  /**
   * Initializes torpedo with underwater targeting
   * @param {number} ammo - Number of torpedoes available
   */
  constructor (ammo) {
    super(ammo, 'Torpedo', '+')
    this.cursors = ['torpedo', 'periscope']
    this.postSelectCursor = 1
    this.postSelectShadow = true
    this.totalCursors = 2
    this._applyWeaponConfig(SEA_WEAPON_CONFIGS.TORPEDO)
  }

  /**
   * Gets the audio file for torpedo flight sound
   * @returns {URL} URL to torpedo flight sound asset
   */
  get flightSound () {
    return seaFlightSound(SOUND_FILES.TORPEDO)
  }

  /**
   * Creates a clone of this torpedo with optional new ammo count
   * @param {number} [ammo] - Ammo count for cloned instance
   * @returns {Torpedo} New torpedo instance
   */
  clone (ammo) {
    return this.createClone(Torpedo, ammo)
  }
}

/**
 * Flack - An anti-aircraft burst weapon with delayed cluster effects
 * Extends Weapon with specialized configuration for aerial defense
 * @extends Weapon
 */
export class Flack extends Weapon {
  /**
   * Initializes flack with cluster burst configuration
   * @param {number} ammo - Number of flack bursts available
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
   * Gets the audio file for flack flight sound
   * @returns {URL} URL to flack flight sound asset
   */
  get flightSound () {
    return seaFlightSound(SOUND_FILES.FLACK)
  }

  /**
   * Creates a clone of this flack with optional new ammo count
   * @param {number} [ammo] - Ammo count for cloned instance
   * @returns {Flack} New flack instance
   */
  clone (ammo) {
    return this.createClone(Flack, ammo)
  }

  /**
   * Normalizes coordinates for flack targeting (single point)
   * @param {Object} _map - Game map (unused)
   * @param {Array} _base - Base coordinates (unused)
   * @param {Array} coords - Target coordinates
   * @returns {Array} Normalized coordinate pair
   */
  redoCoords (_map, _base, coords) {
    return [[0, coords[0][1]], coords[0]]
  }

  /**
   * Applies delayed async effect to a single cell
   * @param {HTMLElement} cell - Target cell element
   * @param {number} [mindelay=380] - Minimum delay in milliseconds
   * @param {number} [maxdelay=730] - Maximum delay in milliseconds
   * @param {number|null} [power=null] - Effect power level
   * @param {number} [cellSize=30] - Cell size in pixels
   * @param {string|null} [id=null] - Unique effect identifier
   * @returns {Promise} Promise resolving when effect completes
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
    return await this.asyncEffect(cell, power, cellSize, id)
  }

  /**
   * Applies async explosion effect to a cell
   * @param {HTMLElement} cell - Target cell element
   * @param {number|null} power - Effect power level
   * @param {number} cellSize - Cell size in pixels
   * @param {string|null} id - Unique effect identifier
   * @returns {Promise} Promise resolving when effect completes
   */
  async asyncEffect (cell, power, cellSize, id) {
    return await super.animateExplode(
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
   * Applies delayed async effects to multiple cells
   * @param {Array} cells - Array of [cell, row, col, power] tuples
   * @param {number} [mindelay=380] - Minimum delay in milliseconds
   * @param {number} [maxdelay=730] - Maximum delay in milliseconds
   * @param {number} [cellSize=30] - Cell size in pixels
   * @returns {Promise} Promise resolving when all effects complete
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
    return await Promise.allSettled(promises)
  }

  /**
   * Animates flack explosion with delayed cluster effects
   * @param {HTMLElement} target - Target cell element
   * @param {any} _container - Animation container (unused)
   * @param {any} _end - End coordinates (unused)
   * @param {number} cellSize - Cell size in pixels
   * @param {string} _type - Effect type (unused)
   * @param {number} _power - Effect power (unused)
   * @param {any} _shake - Shake effect (unused)
   * @param {any} _animator - Animator instance (unused)
   * @param {Object} viewModel - View model for cell access
   * @returns {Promise} Promise resolving when animation completes
   */
  async animateExplode (
    target,
    _container,
    _end,
    cellSize,
    _type,
    _power,
    _shake,
    _animator,
    viewModel = null
  ) {
    const coord = coordsFromCell(target)
    const aoe = this.aoe(bh.map, [coord]).filter(([, , power]) => power > 0)
    const cells = [...viewModel.cellsAndCoords(aoe)]

    return await this.delayAsyncEffects(cells, 0, 500, cellSize)
  }

  /**
   * Calculates area-of-effect for flack burst pattern
   * Creates randomized cluster pattern with high-power center bursts
   * @param {Object} map - Game map for bounds checking
   * @param {number[][]} coords - Source and Target coordinates
   * @returns {Array<[number, number, number]>} Damage cells with power levels
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
 * Sweep - A radar sweep scanning weapon
 * Extends Sensor with specialized configuration for area scanning
 * @extends Sensor
 */
export class Sweep extends Sensor {
  /**
   * Initializes radar sweep with scanning configuration
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
   * Creates a clone of this radar sweep with optional new ammo count
   * @param {number} [ammo] - Ammo count for cloned instance
   * @returns {Sweep} New radar sweep instance
   */
  clone (ammo) {
    return this.createClone(Sweep, ammo)
  }
}

// ============================================================================
// Weapon Catalogue
// ============================================================================

/**
 * Catalogue of sea terrain weapons
 * @type {WeaponCatelogue}
 */
export const seaWeaponsCatalogue = new WeaponCatelogue([
  new Megabomb(1),
  new Kinetic(1),
  new Flack(1),
  new Torpedo(1)
  //  new Sweep(1)
])
