import { bh } from '../terrains/all/js/bh.js'
import { furtherestFrom } from '../core/utilities.js'
import { Animator } from '../core/Animator.js'
import { Random } from '../core/Random.js'

export class Weapon {
  /**
   * Base class for all weapon types in the game.
   * Abstract class that cannot be instantiated directly - must be extended by weapon subclasses.
   * Handles weapon properties, animations, and launch mechanics.
   *
   * @constructor
   * @abstract
   * @param {string} name - Display name of the weapon
   * @param {string} letter - Single letter identifier for keyboard shortcuts
   * @param {boolean} isLimited - Whether ammunition is limited
   * @param {boolean} destroys - Whether weapon destroys terrain
   * @param {number} points - Victory points awarded when hitting enemy
   * @throws {Error} If instantiated directly rather than through subclass
   */
  constructor (name, letter, isLimited, destroys, points) {
    if (new.target === Weapon) {
      throw new Error(
        'base class cannot be instantiated directly. Please extend it.'
      )
    }
    this.name = name
    this.plural = name + 's'
    this.letter = letter
    this.isLimited = isLimited
    this.destroys = destroys
    this.points = points
    this.hasFlash = false
    this.totalCursors = 1
    this.tip = `drag on to the map to increase the tally of ${this.name}`
    this.isOneAndDone = false
    this.splashPower = -1
    this.splashType = null
    this.splashMin = null
    this.splashMax = null
    this.volatile = false
    this.unattachedCursor = 0
    this.postSelectCursor = 0
    this.postSelectCoords = 0
    this.explodeOnTarget = false
    this.explodeOnSplash = false
    this.explodeOnHit = false
    this.animateOnTarget = false
    this.animateOnAoe = false
    this.splashSize = 1.3
    this.nonAttached = false
    this.animateOffsetY = 0
    this.classname = this.name.toLowerCase().replaceAll(' ', '-')
  }
  /**
   * Applies a weapon configuration object to a weapon instance.
   * Centralizes duplicate configuration initialization logic across all weapon types.
   *
   * @protected
   * @param {Object} config - Configuration properties to apply
   * @returns {void}
   */
  _applyWeaponConfig (config) {
    Object.entries(config).forEach(([key, value]) => {
      this[key] = value
    })
  }
  /**
   * Gets the audio file for warning sound.
   *
   * @readonly
   * @returns {URL} URL to warning sound asset
   */
  get warnSound () {
    return new URL('../terrains/all/sounds/woodblock.mp3', import.meta.url)
  }
  /**
   * Play the warning sound for this weapon.
   * Plays sound after loading from configured URL.
   *
   * @returns {void}
   */
  playWarnSound () {
    bh.audio.playAfterLoad(this.name + '-warn', this.warnSound)
  }

  /**
   * Create a clone of this weapon with optional ammunition override.
   * Eliminates duplicate clone() implementations in subclasses.
   *
   * @param {Function} weaponClass - Constructor for the weapon type to instantiate
   * @param {number} [ammoOverride] - Optional ammo count for cloned weapon (defaults to this.ammo)
   * @returns {Weapon} New weapon instance with specified ammo
   */
  createClone (weaponClass, ammoOverride) {
    ammoOverride = ammoOverride || this.ammo
    return new weaponClass(ammoOverride)
  }

  /**
   * Initialize weapon properties from configuration object.
   * Consolidates repeated property assignments and reduces constructor complexity.
   *
   * @param {Object} config - Configuration object
   * @param {string[]} [config.hints] - Hint text for weapon usage
   * @param {string} [config.buttonHtml] - HTML for weapon selection button
   * @param {string} [config.tag] - Weapon tag identifier
   * @param {string} [config.tip] - Tooltip text
   * @param {string} [config.splashType] - Type of splash damage
   * @param {number} [config.splashPower] - Splash damage power
   * @param {string[]} [config.cursors] - Cursor graphics for targeting
   * @param {number} [config.totalCursors] - Total cursor count
   * @param {string} [config.launchCursor] - Launch cursor graphic
   * @param {boolean} [config.animateOnTarget] - Whether to animate on target
   * @param {boolean} [config.explodeOnTarget] - Whether to explode on target
   * @param {boolean} [config.hasFlash] - Whether weapon has flash effect
   * @returns {void}
   */
  setWeaponProperties (config) {
    if (config.hints) this.hints = config.hints
    if (config.buttonHtml) this.buttonHtml = config.buttonHtml
    if (config.tag) this.tag = config.tag
    if (config.tip) this.tip = config.tip
    if (config.splashType) this.splashType = config.splashType
    if (config.splashPower !== undefined) this.splashPower = config.splashPower
    if (config.cursors) this.cursors = config.cursors
    if (config.totalCursors) this.totalCursors = config.totalCursors
    if (config.launchCursor) this.launchCursor = config.launchCursor
    if (config.animateOnTarget !== undefined)
      this.animateOnTarget = config.animateOnTarget
    if (config.explodeOnTarget !== undefined)
      this.explodeOnTarget = config.explodeOnTarget
    if (config.hasFlash !== undefined) this.hasFlash = config.hasFlash
  }

  /**
   * Generate a URL for weapon sound file.
   * Eliminates duplicate URL generation patterns across weapon subclasses.
   *
   * @static
   * @param {string} soundFileName - Name of sound file (e.g., 'shot.mp3')
   * @param {string} moduleUrl - import.meta.url of calling module
   * @returns {URL} Resolved URL to sound file
   */
  static getFlightSoundUrl (soundFileName, moduleUrl) {
    return new URL(`../sounds/${soundFileName}`, moduleUrl)
  }

  /**
   * Internal: Determine source cell based on weapon state and view models.
   * Consolidates duplicate grid cell selection logic across launch methods.
   *
   * @private
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {any} viewModel - Primary view model with gridCellAt method
   * @param {any} [opposingViewModel] - Optional opposing player view model
   * @returns {any} Selected grid cell DOM element
   */
  #getSourceCell (r, c, viewModel, opposingViewModel) {
    if (this.nonAttached) {
      return viewModel.gridCellAt(r, c)
    }
    if (opposingViewModel) {
      return opposingViewModel.gridCellAt(r, c)
    }
    if (this.postSelectCursor > 0) {
      return viewModel.gridCellAt(r, c)
    }
    return viewModel.gridCellAt(0, 0)
  }

  /**
   * Internal: Calculate splash size modifier based on power.
   * Extracted from duplicated splash size calculation logic.
   *
   * @param {number|null} [power] - Explosion power value
   * @returns {number} Modifier value (1 if no power, 0.5 + power/2 otherwise)
   */
  calculateSplashModifier (power) {
    if (power == null) return 1
    return 0.5 + power / 2
  }

  /**
   * Get flight sound URL for this weapon.
   * Override in subclasses to provide weapon-specific sound.
   *
   * @readonly
   * @returns {URL|null} URL to flight sound file, or null if silent
   */
  get flightSound () {
    return null
  }

  /**
   * Get CSS class name for weapon selection button.
   * Automatically generated from weapon tag.
   *
   * @readonly
   * @returns {string} CSS class identifier for button
   */
  get btnClass () {
    return 'weapon-btn-' + this.tag
  }

  /**
   * Play the flight sound for this weapon if available.
   * Plays sound after loading from configured URL.
   *
   * @returns {void}
   */
  playFlightSound () {
    if (this.flightSound) {
      bh.audio.playAfterLoad(this.name + '-flight', this.flightSound)
    }
  }

  /**
   * Get boom/explosion sound URL for this weapon.
   * Override in subclasses to provide weapon-specific boom sound.
   *
   * @readonly
   * @returns {URL|null} URL to boom sound file, or null for default
   */
  get boomSound () {
    return null
  }

  /**
   * Determines turn phase for missile variant.
   * Maps variant ID to turn duration classes for animation pacing.
   *
   * @param {number} _variant - Weapon variant identifier (0, 2, 3)
   * @param {number} _x - Column coordinate for turn calculation
   * @param {number} _y - Row coordinate for turn calculation
   * @returns {string} CSS turn class name ('turn4', 'turn2', 'turn3') or empty string
   */
  getTurn (_variant, _x, _y) {
    let turn = ''
    return turn
  }

  /**
   * Get current step index for cursor animation.
   * Adjusts for seeking mode and multi-step launch sequences.
   *
   * @param {number} numCoords - Base coordinate count
   * @param {number} select - Selection cursor position
   * @returns {number} Adjusted step index for animation
   */
  stepIdx (numCoords, select) {
    if (bh.seekingMode) {
      return numCoords
    }
    if (this.launchCursor) {
      let selectOffset = select - this.postSelectCursor
      if (selectOffset < 0) selectOffset = 0
      return numCoords + selectOffset
    }
    return numCoords
  }

  /**
   * Get hint text for weapon step.
   *
   * @param {number} idx - Step index (0 for initial selection, 1+ for targeting)
   * @returns {string} Help text describing the action for this step
   */
  stepHint (idx) {
    if (idx === 0) {
      return this.launchCursor
        ? 'Click on square in Friendly ' + bh.mapHeading + ' to select weapon'
        : 'Click on square in Enemy ' +
            bh.mapHeading +
            ' to select launch point'
    }
    return 'Click on square in Enemy ' + bh.mapHeading + ' to aim and fire'
  }
  /**
   * Get total number of steps for weapon targeting sequence.
   *
   * @readonly
   * @returns {number} Number of targeting steps (seeking mode: cursor count, else: total cursors)
   */
  get numStep () {
    return bh.seekingMode ? this.cursors.length : this.totalCursors
  }

  /**
   * Check if weapon has extra/secondary selection cursor.
   * Differentiates between single-step and multi-step launch sequences.
   *
   * @readonly
   * @returns {boolean} True if launchCursor exists and differs from first cursor
   */
  get hasExtraSelectCursor () {
    return !!(this.launchCursor && this.launchCursor !== this.cursors[0])
  }

  /**
   * Get current ammunition status description.
   *
   * @param {number} [_ammoLeft] - Remaining ammunition (parameter kept for API compatibility)
   * @returns {string} Current weapon mode description
   */
  ammoStatus (_ammoLeft) {
    return `${this.name}  Mode`
  }

  /**
   * Get human-readable weapon information string.
   *
   * @returns {string} Weapon name with letter identifier
   */
  info () {
    return `${this.name} (${this.letter})`
  }
  /**
   * Get area-of-effect pattern.
   * Base implementation returns single target cell with default power.
   *
   * @param {Object} _map - Game map for bounds checking
   * @param {number[][]} coords - Source and target coordinates [row, col]
   * @returns {Array<[number, number, number]>} Damage cells as [row, col, power] tuples
   */
  aoe (_map, coords) {
    return [[coords[0][0], coords[0][1], 4]]
  }

  /**
   * Get area-of-effect pattern for splash damage.
   * Delegates to aoe() for standard implementations.
   *
   * @param {Object} map - Game map for bounds checking
   * @param {number[][]} coords - Target coordinates [row, col]
   * @returns {Array<[number, number, number]>} Damage cells as [row, col, power] tuples
   */
  splashAoe (map, coords) {
    return this.aoe(map, coords)
  }

  /**
   * Get area-of-effect with additional options for splash damage.
   * Delegates to aoe() for standard implementations.
   *
   * @param {Object} map - Game map for bounds checking
   * @param {number[][]} coords - Target coordinates [row, col]
   * @returns {{affectedArea: Array<[number, number, number]>, options: Object}} AOE pattern and options
   */
  aoePlus (map, coords) {
    const affectedArea = this.aoe(map, coords)
    return { affectedArea, options: {} }
  }

  /**
   * Calculates splash/secondary damage pattern around a point.
   * Base implementation returns empty (no splash).
   *
   * @param {Object} _map - Game map
   * @param {Array} _resolvedTarget - Impact coordinate [row, col]
   * @param {Array} _effect - Damage effect coordinates and power
   * @param {Object} _options - Additional options
   * @returns {Array<[number, number, number]>} Splash pattern cells as [row, col, power] tuples
   */
  splash (_map, _resolvedTarget, _effect, _options) {
    return []
  }

  /**
   * Calculates crash splash damage pattern around a terminal point when no hits are registered.
   * Base implementation returns empty (no splash).
   *
   * @param {Object} _map - Game map
   * @param {Array} _coords - Impact coordinate [row, col]
   * @param {Object} _options - Additional options
   * @returns {Array<[number, number, number]>} Splash pattern cells as [row, col, power] tuples
   */
  crashSplash (_map, _coords, _options) {
    return []
  }
  /**
   * Add splash damage for fish weapons by pushing valid cells into the effect list.
   * Used by addOrthogonal and addDiagonal during splash coordinate initialization.
   *
   * @param {Object|null} map - Game map for bounds checking
   * @param {number} row - Target row coordinate
   * @param {number} col - Target column coordinate
   * @param {number} power - Damage power level
   * @param {Array<[number, number, number]>} newEffect - Accumulating effect array
   * @returns {Array<[number, number, number]>} Updated effect array
   */
  addSplash (map, row, col, power, newEffect) {
    if (!map || map.inBounds(row, col)) {
      newEffect.push([row, col, power])
    }
    return newEffect
  }

  /**
   * Add neighbor damage effects (orthogonal + diagonal directions).
   * Standard 8-directional splash pattern for area weapons.
   *
   * @param {any} map - Game map
   * @param {number} r - Center row coordinate
   * @param {number} c - Center column coordinate
   * @param {number} p1 - Power for orthogonal neighbors (4 directions)
   * @param {number} p2 - Power for diagonal neighbors (4 directions)
   * @param {Array<[number, number, number]>} newEffect - Effect accumulator array
   * @returns {Array<[number, number, number]>} Updated effect with neighbor damage added
   */
  addNeighbours (map, r, c, p1, p2, newEffect) {
    this.addOrthogonal(map, r, c, p1, newEffect)
    this.addDiagonal(map, r, c, p2, newEffect)
    return newEffect
  }

  /**
   * Add diagonal splash damage (4 diagonal directions).
   *
   * @param {any} map - Game map
   * @param {number} r - Center row coordinate
   * @param {number} c - Center column coordinate
   * @param {number} power - Damage power for diagonal cells
   * @param {Array<[number, number, number]>} newEffect - Effect accumulator array
   * @returns {Array<[number, number, number]>} Updated effect with diagonal damage added
   */
  addDiagonal (map, r, c, power, newEffect) {
    this.addSplash(map, r + 1, c + 1, power, newEffect)
    this.addSplash(map, r - 1, c + 1, power, newEffect)
    this.addSplash(map, r + 1, c - 1, power, newEffect)
    this.addSplash(map, r - 1, c - 1, power, newEffect)
    return newEffect
  }

  /**
   * Add orthogonal splash damage (4 cardinal directions).
   *
   * @param {any} map - Game map
   * @param {number} r - Center row coordinate
   * @param {number} c - Center column coordinate
   * @param {number} power - Damage power for orthogonal cells
   * @param {Array<[number, number, number]>} newEffect - Effect accumulator array
   * @returns {Array<[number, number, number]>} Updated effect with orthogonal damage added
   */
  addOrthogonal (map, r, c, power, newEffect) {
    this.addSplash(map, r + 1, c, power, newEffect)
    this.addSplash(map, r - 1, c, power, newEffect)
    this.addSplash(map, r, c + 1, power, newEffect)
    this.addSplash(map, r, c - 1, power, newEffect)
    return newEffect
  }

  /**
   * Transform coordinates through optional game model processing.
   * Default implementation returns source and target coordinates with first target element.
   *
   * @param {any} _map - Game map object
   * @param {number[]} base - Base coordinates [row, col]
   * @param {number[][]} coords - Target coordinates array
   * @returns {number[][]} Transformed coordinate pair [base, coords[0]]
   */
  redoCoords (_map, base, coords) {
    return [base, coords[0]]
  }

  /**
   * Launch weapon with cursor animation sequence for seeking mode.
   * Combines cursor flight animation with ripple effect before actual launch.
   *
   * @async
   * @param {number[]} coords - Target coordinates for launch [row, col]
   * @param {number} rr - Source row coordinate
   * @param {number} cc - Source column coordinate
   * @param {any} map - Game map object
   * @param {any} viewModel - Primary view model
   * @param {any} [opposingViewModel] - Optional opposing player view model
   * @param {any} [model] - Optional game model for coordinate transformation
   * @returns {Promise<Object>} Result from subsequent launchTo call
   */
  async cursorLaunchTo (
    coords,
    rr,
    cc,
    map,
    viewModel,
    opposingViewModel,
    model
  ) {
    map = map || bh.map
    const [[r, c], target] = this.redoCoords(map, [rr, cc], coords)
    const [sr, sc] = map.randomEdge(...target)
    const sourceCell = opposingViewModel
      ? opposingViewModel.gridCellAt(sr, sc)
      : viewModel.gridCellAt(sr, sc)
    const endCell = viewModel.gridCellAt(...target)
    const flyCursor = this.letter === '-' ? 'crosshair' : this.cursors.at(-1)
    const options = {
      rotation: 0,
      duration: 0.9,
      classname: 'cursor ' + flyCursor,
      doesExplode: false,
      animateOnTarget: true
    }
    const { container, end } = await this.animateFlying(
      sourceCell,
      endCell,
      viewModel.cellSize(),
      options,
      viewModel
    )
    await this.animateRipple(endCell, container, end)
    return await this.launchTo(
      coords,
      r,
      c,
      map,
      viewModel,
      opposingViewModel,
      model
    )
  }

  /**
   * Right-aligned launch routing with optional coordinate transformation.
   * Handles post-targeting launch with optional game model processing.
   *
   * @async
   * @param {number[]} coords - Target coordinates [row, col]
   * @param {number} rr - Source row coordinate
   * @param {number} cc - Source column coordinate
   * @param {LaunchContext} context - Launch context containing map, view models, and handlers
   * @returns {Promise<Object>} Launch result from launchToRaw or custom launch handler
   */
  async launchRightTo (coords, rr, cc, context) {
    const { map, viewModel, opposingViewModel, model, launch } = context
    if (!launch) {
      return await this.launchToRaw(coords, rr, cc, {
        map,
        viewModel,
        opposingViewModel,
        model,
        processCoords: this.processCoords.bind(this)
      })
    }
    return await launch(coords, rr, cc, context)
  }

  /**
   * Process launch coordinates through game model targeting logic.
   * Allows model to transform target location based on game state.
   *
   * @param {any} map - Game map object
   * @param {number[]} base - Base/source coordinates [row, col]
   * @param {number[][]} coords - Target coordinates array [row, col]
   * @param {any} model - Game model for target lookup
   * @returns {number[]|[number[], number[], boolean]} Processed coordinate pair or triple with candidate flag
   */
  processCoords (map, [rr, cc], coords, model) {
    const effect = this.aoe(map, coords)
    const t = model.getTarget(effect, this)
    const list = this.redoCoords(map, [rr, cc], coords)
    if (t) {
      const source = furtherestFrom(t[0], t[1], list)
      return [source, t, true]
    }
    return list
  }
  /**
   * Standard weapon launch via context-aware forwarding.
   * Routes to launchToRaw with optional coordinate processing.
   *
   * @async
   * @param {number[]} coords - Target coordinates [row, col]
   * @param {number} rr - Source row coordinate
   * @param {number} cc - Source column coordinate
   * @param {LaunchContext} context - Launch context
   * @returns {Promise<Object>} Launch result with optional {target}
   */
  async launchTo (coords, rr, cc, context) {
    return await this.launchToRaw(coords, rr, cc, context)
  }

  /**
   * Core weapon launch implementation with optional coordinate transformation.
   * Consolidated method handling grid cell selection and animation for all launch types.
   *
   * @async
   * @param {number[]} coords - Target coordinates [row, col]
   * @param {number} rr - Source row coordinate
   * @param {number} cc - Source column coordinate
   * @param {LaunchContext} context - Launch context with map, view models, and processors
   * @returns {Promise<Object>} Result object with optional {target} if hasCandidates
   */
  async launchToRaw (coords, rr, cc, context) {
    const {
      map,
      viewModel,
      opposingViewModel,
      model,
      processCoords: processor
    } = context
    const processCoords = processor || this.redoCoords.bind(this)
    const [[r, c], target, hasCandidates] = processCoords(
      map,
      [rr, cc],
      coords,
      model
    )
    const sourceCell = this.#getSourceCell(r, c, viewModel, opposingViewModel)
    const targetCell = viewModel.gridCellAt(target[0], target[1])
    await this.animateFlyingOnVM(sourceCell, targetCell, viewModel)
    return hasCandidates ? { target } : {}
  }
  /**
   * Get center point of DOM element for animation positioning.
   * Calculates the midpoint of element's bounding rectangle.
   *
   * @param {HTMLElement} el - DOM element to measure
   * @returns {{x: number, y: number}} Center coordinates in pixels
   */
  centerOf (el) {
    const r = el.getBoundingClientRect()
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2
    }
  }

  /**
   * Conditionally animate splash explosion if enabled.
   * Used for area-of-effect damage visualization.
   *
   * @async
   * @param {any} target - Target element for splash animation
   * @param {number} cellSize - Grid cell size in pixels
   * @returns {Promise<void>} Resolves when animation completes (or immediately if disabled)
   */
  async animateSplashExplode (target, cellSize) {
    if (this.explodeOnSplash) {
      await this.animateExplodeRaw(target, cellSize, this.splashType)
    }
  }

  /**
   * Animate detonation explosion with enhanced effects.
   * Used for weapons that trigger secondary detonations.
   *
   * @async
   * @param {any} target - Target element for detonation
   * @param {number} cellSize - Grid cell size in pixels
   * @returns {Promise<void>} Resolves when detonation animation completes
   */
  async animateDetonation (target, cellSize) {
    await this.animateExplodeRaw(target, cellSize, 'plasma', 1, 'shake-heavy')
  }

  /**
   * Animate ripple effect at target location.
   * Used for secondary visual effects before explosions.
   *
   * @async
   * @param {any} target - Target element
   * @param {any} [container] - Optional animation container element
   * @param {{x: number, y: number}} [end] - Optional end coordinates; defaults to target center
   * @returns {Promise<void>} Resolves when ripple animation completes
   */
  async animateRipple (target, container, end) {
    end = end || this.centerOf(target)
    const type = bh.subTerrainTagFromCell(target)

    const animator = new Animator(
      'ripple-wrapper',
      'battleship-game-container',
      container,
      true,
      'ripple',
      type
    )

    animator.moveTo(end)
    animator.styleInner()
    await animator.run()
  }

  /**
   * Convenience wrapper for animateExplode with animator instance.
   *
   * @async
   * @param {any} target - Target element
   * @param {{x: number, y: number}} end - End position
   * @param {number} cellSize - Cell size in pixels
   * @param {Animator} [animator] - Optional animator instance to reuse
   * @param {any} [viewModel] - Optional view model
   * @returns {Promise<void>} Resolves when explosion animation completes
   */
  async animateExplodeWithAnimator (
    target,
    end,
    cellSize,
    animator = null,
    viewModel = null
  ) {
    return await this.animateExplode(target, cellSize, {
      end,
      animator,
      viewModel
    })
  }

  /**
   * Convenience wrapper for animateExplode with individual parameters.
   *
   * @async
   * @param {any} target - Target element
   * @param {number} cellSize - Cell size in pixels
   * @param {string} type - Terrain type for explosion styling
   * @param {number} power - Explosion power level
   * @param {string} [shake] - Shake animation type (default: 'shake')
   * @param {any} [viewModel] - Optional view model
   * @returns {Promise<void>} Resolves when explosion animation completes
   */
  async animateExplodeRaw (
    target,
    cellSize,
    type,
    power,
    shake = 'shake',
    viewModel = null
  ) {
    return await this.animateExplode(target, cellSize, {
      type,
      power,
      shake,
      viewModel
    })
  }

  /**
   * Animate explosion with options object.
   * Consolidated method handling all explosion animation parameters.
   *
   * @async
   * @param {any} target - Target element
   * @param {number} cellSize - Cell size in pixels
   * @param {ExplodeOptions} [options] - Explosion animation options
   * @returns {Promise<void>} Resolves when animation completes
   */
  async animateExplode (target, cellSize, options = {}) {
    const {
      container = null,
      end: endPos,
      type,
      power,
      shake = 'shake',
      animator: reuseAnimator,
      id
    } = options || {}
    let end = endPos || this.centerOf(target)
    const idTag = id ? ' explode-at-' + id : ''
    let typeTag = type || bh.subTerrainTagFromCell(target)
    bh.playBoom(typeTag)

    let animator =
      reuseAnimator ||
      new Animator(
        'explosion-wrapper' + idTag,
        'battleship-game-container',
        container,
        true,
        'explosion',
        typeTag
      )

    let mod = 1
    if (power != null) {
      mod = 0.5 + power / 2
    }
    let splash = this.splashSize
    if (this.splashMin !== null && this.splashMax !== null) {
      splash = Random.floatWithRange(this.splashMin, this.splashMax)
    }

    const scale = (cellSize * splash * mod) / 128

    animator.moveTo(end)
    animator.scaleInner(scale * 0.6, scale * 1.6)
    animator.styleInner()
    animator.shake(shake)
    await animator.run()
    animator.endShake(shake)
  }
  /**
   * Animate flying weapon from source to target on view model.
   * Convenience wrapper that extracts cell size and applies default options.
   *
   * @async
   * @param {any} source - Source element
   * @param {any} target - Target element
   * @param {any} viewModel - View model providing cell size and context
   * @returns {Promise<AnimationResult>} Animation container and end coordinates
   */
  async animateFlyingOnVM (source, target, viewModel) {
    return await this.animateFlying(
      source,
      target,
      viewModel.cellSize(),
      this.defaultAnimateOptions,
      viewModel
    )
  }

  /**
   * Get default animation options for flying weapon.
   * Creates base configuration for weapon flight animations.
   *
   * @readonly
   * @returns {AnimationOptions} Default animation parameters
   */
  get defaultAnimateOptions () {
    return {
      rotation: 0,
      duration: 0.7,
      classname: this.classname,
      doesExplode: true,
      animateOnTarget: this.animateOnTarget
    }
  }

  /**
   * Animate flying weapon from source to target location.
   * Core flying weapon animation with optional explosion on target/splash.
   *
   * @async
   * @param {any} source - Source element
   * @param {any} target - Target element
   * @param {number} cellSz - Cell size in pixels
   * @param {AnimationOptions} [options] - Animation options
   * @param {any} [viewModel] - Optional view model for event handling
   * @returns {Promise<AnimationResult>} Animation context with container, end coords, and cell size
   */
  async animateFlying (
    source,
    target,
    cellSz,
    options = this.defaultAnimateOptions,
    viewModel = null
  ) {
    const { rotation, duration, classname, doesExplode, animateOnTarget } =
      options
    const { animator, end, start, cellSize } = this.initAnimate(
      cellSz,
      target,
      source,
      classname
    )
    if (!animateOnTarget) {
      await this.checkAnimate(
        target,
        animator,
        end,
        cellSize,
        doesExplode,
        viewModel
      )
      return { container: animator.container, end, cellSize }
    }
    this.playFlightSound()
    this.animateFlyingBase(end, start, animator, rotation, duration)

    await this.finishAnimate(
      target,
      end,
      cellSize,
      doesExplode,
      animator,
      viewModel
    )
    return { container: animator.container, end, cellSize }
  }

  /**
   * Finalize flying animation with conditional explosion.
   * Handles animation delay and optional explosion on target.
   *
   * @async
   * @param {any} target - Target element
   * @param {{x: number, y: number}} end - End position
   * @param {number} cellSize - Cell size in pixels
   * @param {boolean} doesExplode - Whether to explode on landing
   * @param {Animator} animator - Animation instance
   * @param {any} [viewModel] - Optional view model
   * @returns {Promise<void>} Resolves when animation and optional explosion complete
   */
  async finishAnimate (
    target,
    end,
    cellSize,
    doesExplode,
    animator,
    viewModel = null
  ) {
    const explode = doesExplode && this.explodeOnTarget
    if (!explode) {
      animator.delayInner(5)
    }

    await animator.run()

    if (explode) {
      await this.animateExplodeWithAnimator(
        target,
        end,
        cellSize,
        animator,
        viewModel
      )
    }
  }

  /**
   * Check and conditionally apply explosion animation.
   * Used when animateOnTarget is false to handle immediate explosions.
   *
   * @async
   * @param {any} target - Target element
   * @param {Animator} animator - Animation instance
   * @param {{x: number, y: number}} end - End position
   * @param {number} cellSize - Cell size in pixels
   * @param {boolean} doesExplode - Whether weapon explodes on landing
   * @param {any} [_viewModel] - Optional view model (unused in early exit path)
   * @returns {Promise<boolean>} True if not animating on target, false if explosion applied
   */
  async checkAnimate (
    target,
    animator,
    end,
    cellSize,
    doesExplode,
    _viewModel = null
  ) {
    if (!this.animateOnTarget) {
      if (doesExplode) {
        await this.animateExplodeWithAnimator(
          target,
          end,
          cellSize,
          animator,
          _viewModel
        )
        return false
      }
    }
    return true
  }

  /**
   * Initialize animation setup with animator and coordinates.
   * Calculates start/end positions and creates animator instance.
   *
   * @param {number} cellSize - Cell size in pixels (default: 30)
   * @param {any} target - Target element
   * @param {any} source - Source element
   * @param {string} className - CSS classes for animator
   * @returns {AnimatorContext} Animation context with animator and coordinates
   */
  initAnimate (cellSize, target, source, className) {
    cellSize = cellSize || 30
    const classNames = className.split(' ')
    const animator = new Animator(
      'flying-weapon-wrapper',
      'battleship-game-container',
      null,
      true,
      'flying-weapon',
      ...classNames
    )

    const end = this.centerOf(target)
    const start = this.centerOf(source)
    start.y -= this.animateOffsetY
    return { animator, end, start, cellSize }
  }

  /**
   * Set up base flying animation properties.
   * Configures CSS custom properties for flight trajectory and rotation.
   *
   * @param {{x: number, y: number}} end - End coordinates in pixels
   * @param {{x: number, y: number}} start - Start coordinates in pixels
   * @param {Animator} animator - Animator instance
   * @param {number} [rotation] - Rotation angle in degrees (auto-calculated if 0 or falsy)
   * @param {number} [duration] - Animation duration in seconds (default: 0.7)
   * @returns {void}
   */
  animateFlyingBase (end, start, animator, rotation = 0, duration = 0.7) {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const angle = rotation || (Math.atan2(dy, dx) * 180) / Math.PI

    animator.setInnerProperty('--start-x', `${start.x}px`)
    animator.setInnerProperty('--start-y', `${start.y}px`)
    animator.setInnerProperty('--end-x', `${end.x}px`)
    animator.setInnerProperty('--end-y', `${end.y}px`)
    animator.setInnerProperty('--angle', `${angle}deg`)
    animator.setInnerProperty('--duration', `${duration}s`)
  }
}

/**
 * Standard single-shot weapon.
 * Basic weapon that fires once to target location with no splash damage.
 *
 * @class
 */
export class StandardShot extends Weapon {
  /**
   * Create a standard shot weapon.
   *
   * @constructor
   */
  constructor () {
    super('Standard Shot', '-', false, true, 1)
    this.cursors = ['']
    this.launchCursor = 'crosshair'
    this.tag = 'single'
    this.hints = ['Click On Square To Fire']
    this.buttonHtml = '<span class="shortcut">S</span>ingle Shot'
  }
  /**
   * Get flight sound URL for standard shot.
   *
   * @readonly
   * @returns {URL} URL to standard shot flight sound
   */
  get flightSound () {
    const url = new URL('../terrains/all/sounds/shot.mp3', import.meta.url)
    return url
  }

  /**
   * Get area-of-effect pattern for standard shot.
   * Single cell impact with standard power.
   *
   * @param {Object} _map - Game map for bounds checking
   * @param {number[][]} coords - Source and target coordinates
   * @returns {Array<[number, number, number]>} Single impact cell [row, col, power]
   */
  aoe (_map, coords) {
    return [[coords[0][0], coords[0][1], 4]]
  }

  /**
   * Get ammunition status description for standard shot.
   *
   * @returns {string} Weapon mode description
   */
  ammoStatus () {
    return `Single Shot Mode`
  }
  /**
   * Apply splash damage at specific map location.
   * Standard shot does not support splash damage - throws error if attempted.
   *
   * @throws {Error} Always throws - splash damage not applicable for standard shot
   * @param {Object|null} _map - Game map for bounds checking
   * @param {number} _row - Target row coordinate
   * @param {number} _col - Target column coordinate
   * @param {number} _power - Damage power level
   * @param {Array<[number, number, number]>} _newEffect - Accumulating effect array
   * @returns {Array<[number, number, number]>} Never returns - always throws
   */
  addSplash (_map, _row, _col, _power, _newEffect) {
    throw new Error('Not Applicable: Standard Shot does not have splash damage')
  }
}

export const standardShot = new StandardShot()
