import { bh } from '../terrains/all/js/bh.js'
import { furtherestFrom } from '../core/utilities.js'
import { Animator } from '../core/Animator.js'
import { Random } from '../core/Random.js'
export class Weapon {
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
   * Create a clone of this weapon with optional ammunition override.
   * Eliminates duplicate clone() implementations in subclasses.
   *
   * @param {Function} weaponClass - Constructor for the weapon type to instantiate
   * @param {number} [ammoOverride=this.ammo] - Optional ammo count for cloned weapon
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
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {any} viewModel - Primary view model
   * @param {any} [opposingViewModel] - Optional opposing player view model
   * @returns {any} Selected grid cell element
   * @private
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
   * @param {number} [power] - Explosion power value
   * @returns {number} Modifier value (1 if no power, 0.5 + power/2 otherwise)
   * @private
   */
  #calculateSplashModifier (power) {
    if (power == null) return 1
    return 0.5 + power / 2
  }

  /**
   * Get flight sound URL for this weapon.
   * Override in subclasses to provide weapon-specific sound.
   *
   * @returns {URL|null} URL to flight sound file, or null if silent
   */
  get flightSound () {
    return null
  }

  /**
   * Get CSS class name for weapon selection button.
   * Automatically generated from weapon tag.
   *
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
   * @returns {URL|null} URL to boom sound file, or null for default
   */
  get boomSound () {
    return null
  }

  /**
   * Get turn/phase information for this weapon.
   * Override in subclasses for weapons with turn phases.
   *
   * @returns {string} Turn phase description (empty string for single-phase weapons)
   */
  getTurn () {
    let turn = ''
    return turn
  }

  /**
   * Get current step index for cursor animation.
   * Adjusts for seeking mode and multi-step launch sequences.\n   *
   * @param {number} numCoords - Base coordinate count
   * @param {number} select - Selection cursor position
   * @returns {number} Adjusted step index for animation\n   */
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
   * Get hint text for weapon step.\n   *
   * @param {number} idx - Step index (0 for initial, 1+ for targeting)\n   * @returns {string} Help text describing the action for this step\n   */
  stepHint (idx) {
    switch (idx) {
      case 0:
        return this.launchCursor
          ? 'Click on square in Friendly ' + bh.mapHeading + ' to select weapon'
          : 'Click on square in Enemy ' +
              bh.mapHeading +
              ' to select launch point'
      default:
        return 'Click on square in Enemy ' + bh.mapHeading + ' to aim and fire'
    }
  }
  /**
   * Get total number of steps for weapon targeting sequence.
   *
   * @returns {number} Number of targeting steps (seeking mode: cursor count, else: total cursors)
   */
  get numStep () {
    return bh.seekingMode ? this.cursors.length : this.totalCursors
  }

  /**
   * Check if weapon has extra/secondary selection cursor.
   * Differentiates between single-step and multi-step launch sequences.
   *
   * @returns {boolean} True if launchCursor exists and differs from first cursor
   */
  get hasExtraSelectCursor () {
    return !!(this.launchCursor && this.launchCursor !== this.cursors[0])
  }

  /**
   * Get ammunition status description (legacy).
   * Deprecated in favor of ammoStatus() without ammo count.
   *
   * @param {number} ammoLeft - Remaining ammunition count
   * @returns {string} Status text with remaining ammo
   * @deprecated Use ammoStatus() instead
   */
  ammoStatusOld (ammoLeft) {
    return `${this.name}  Mode (${ammoLeft} left)`
  }

  /**
   * Get current ammunition status description.
   *
   * @param {number} _ammoLeft - Remaining ammunition (parameter kept for API compatibility)
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
   * Get area-of-effect pattern for splash damage.
   * Delegates to aoe() for standard implementations.
   *
   * @param {any} map - Game map
   * @param {number[]} coords - Target coordinates
   * @returns {any} AOE pattern or damage locations
   */
  splashAoe (map, coords) {
    return this.aoe(map, coords)
  }

  /**
   * Apply splash damage at specific map location.
   * Must be overridden in subclasses to define splash behavior.
   *
   * @throws {Error} Always throws - must be implemented in derived class
   * @returns {void}
   */
  addSplash () {
    throw new Error('override in derided class')
  }

  /**
   * Add neighbor damage effects (orthogonal + diagonal directions).
   * Standard 8-directional splash pattern for area weapons.
   *
   * @param {any} map - Game map
   * @param {number} r - Center row coordinate
   * @param {number} c - Center column coordinate
   * @param {number} p1 - Power for orthogonal neighbors
   * @param {number} p2 - Power for diagonal neighbors
   * @param {any} newEffect - Effect accumulator object
   * @returns {any} Updated effect with neighbor damage added
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
   * @param {any} newEffect - Effect accumulator object
   * @returns {any} Updated effect with diagonal damage added
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
   * @param {any} newEffect - Effect accumulator object
   * @returns {any} Updated effect with orthogonal damage added
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
   * @param {any} map - Game map object
   * @param {number[]} base - Base coordinates [row, col]
   * @param {number[]} coords - Target coordinates [row, col]
   * @returns {number[][]} Transformed [base, coords[0]] pair
   */
  redoCoords (_map, base, coords) {
    return [base, coords[0]]
  }

  /**
   * Launch weapon with cursor animation sequence for seeking mode.
   * Combines cursor flight animation with ripple effect before actual launch.
   *
   * @async
   * @param {number[]} coords - Target coordinates for launch
   * @param {number} rr - Source row coordinate
   * @param {number} cc - Source column coordinate
   * @param {any} map - Game map object
   * @param {any} viewModel - Primary view model
   * @param {any} [opposingViewModel] - Optional opposing player view model
   * @returns {Promise<Object>} Result from subsequent launchTo call
   */
  async cursorLaunchTo (coords, rr, cc, map, viewModel, opposingViewModel) {
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
      viewModel.cellSizeScreen(),
      options,
      viewModel
    )
    await this.animateRipple(endCell, container, end)
    return await this.launchTo(coords, r, c, map, viewModel, opposingViewModel)
  }

  /**
   * Right-aligned launch routing with optional coordinate transformation.
   * Handles post-targeting launch with optional game model processing.
   *
   * @async
   * @param {number[]} coords - Target coordinates
   * @param {number} rr - Source row coordinate
   * @param {number} cc - Source column coordinate
   * @param {any} map - Game map object
   * @param {any} viewModel - Primary view model
   * @param {any} [opposingViewModel] - Optional opposing player view model
   * @param {any} [model] - Optional game model for coordinate transformation
   * @param {Function} [launch] - Optional launch function (defaults to launchToRaw)
   * @returns {Promise<Object>} Launch result
   */
  async launchRightTo (
    coords,
    rr,
    cc,
    map,
    viewModel,
    opposingViewModel,
    model,
    launch
  ) {
    launch = launch || this.launchToRaw.bind(this)
    return await launch(
      coords,
      rr,
      cc,
      map,
      viewModel,
      opposingViewModel,
      model,
      this.processCoords.bind(this)
    )
  }

  /**
   * Process launch coordinates through game model targeting logic.
   * Allows model to transform target location based on game state.
   *
   * @param {any} map - Game map object
   * @param {number[]} base - Base/source coordinates [row, col]
   * @param {number[]} coords - Target coordinates [row, col]
   * @param {any} model - Game model for target lookup
   * @returns {number[][]} Processed coordinate pair with candidate flag
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
   * @param {number[]} coords - Target coordinates
   * @param {number} rr - Source row coordinate
   * @param {number} cc - Source column coordinate
   * @param {any} map - Game map object
   * @param {any} viewModel - Primary view model
   * @param {any} [opposingViewModel] - Optional opposing player view model
   * @param {any} [model] - Optional target model
   * @param {Function} [processCoords] - Optional coordinate processor
   * @returns {Promise<Object>} Launch result with optional {target}
   */
  async launchTo (
    coords,
    rr,
    cc,
    map,
    viewModel,
    opposingViewModel,
    model,
    processCoords
  ) {
    return await this.launchToRaw(
      coords,
      rr,
      cc,
      map,
      viewModel,
      opposingViewModel,
      model,
      processCoords
    )
  }

  /**
   * Core weapon launch implementation with optional coordinate transformation.
   * Consolidated method handling grid cell selection and animation for all launch types.
   *
   * @async
   * @param {number[]} coords - Target coordinates
   * @param {number} rr - Source row coordinate
   * @param {number} cc - Source column coordinate
   * @param {any} map - Game map object
   * @param {any} viewModel - Primary view model
   * @param {any} [opposingViewModel] - Optional opposing player view model
   * @param {any} [model] - Optional target model for coordinate transformation
   * @param {Function} [processCoords] - Optional coordinate processor function
   * @returns {Promise<Object>} Result object with optional {target} if hasCandidates
   */
  async launchToRaw (
    coords,
    rr,
    cc,
    map,
    viewModel,
    opposingViewModel,
    model,
    processCoords
  ) {
    processCoords = processCoords || this.redoCoords.bind(this)
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
   * @returns {{x: number, y: number}} Center coordinates
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
   * @returns {Promise<void>} Resolves when animation completes
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
   * @param {any} [container] - Optional animation container
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

  async animateExplodeWithAnimator (
    target,
    end,
    cellSize,
    animator = null,
    viewModel = null
  ) {
    return await this.animateExplode(
      target,
      animator?.container,
      end,
      cellSize,
      null,
      null,
      null,
      null,
      viewModel
    )
  }
  async animateExplodeRaw (target, cellSize, type, power, shake = 'shake') {
    return await this.animateExplode(
      target,
      null,
      null,
      cellSize,
      type,
      power,
      shake
    )
  }

  async animateExplode (
    target,
    container,
    end,
    cellSize,
    type,
    power,
    shake = 'shake',
    animator = null,
    viewModel = null,
    id = null
  ) {
    end = end || this.centerOf(target)
    const idTag = id ? ' explode-at-' + id : ''
    type = type || bh.subTerrainTagFromCell(target)
    bh.playBoom(type)
    // CREATE wrapper
    animator =
      animator ||
      new Animator(
        'explosion-wrapper' + idTag,
        'battleship-game-container',
        container,
        true,
        'explosion',
        type
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
   * @returns {Promise<{container: any, end: {x: number, y: number}, cellSize: number}>} Animation container and end coordinates
   */
  async animateFlyingOnVM (source, target, viewModel) {
    return await this.animateFlying(
      source,
      target,
      viewModel.cellSizeScreen(),
      this.defaultAnimateOptions,
      viewModel
    )
  }

  /**
   * Get default animation options for flying weapon.
   * Creates base configuration for weapon flight animations.
   *
   * @returns {{rotation: number, duration: number, classname: string, doesExplode: boolean, animateOnTarget: boolean}} Default animation parameters
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
   * @param {Object} [options] - Animation options
   * @param {number} [options.rotation] - Rotation angle (auto-calculated if 0)
   * @param {number} [options.duration] - Animation duration in seconds
   * @param {string} [options.classname] - CSS class name for weapon
   * @param {boolean} [options.doesExplode] - Whether weapon explodes on impact
   * @param {boolean} [options.animateOnTarget] - Whether to animate on target hit
   * @param {any} [viewModel] - Optional view model for event handling
   * @returns {Promise<{container: any, end: {x: number, y: number}, cellSize: number}>} Animation context with container, end coords, and cell size
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
      animator.delayInner(500)
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
   * @param {boolean} doesExplode - Whether weapon explodes\n   * @param {any} [viewModel] - Optional view model
   * @returns {Promise<boolean>} Always returns true
   */
  async checkAnimate (
    target,
    animator,
    end,
    cellSize,
    doesExplode,
    viewModel = null
  ) {
    if (!this.animateOnTarget) {
      if (doesExplode) {
        await this.animateExplodeWithAnimator(
          target,
          end,
          cellSize,
          animator,
          viewModel
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
   * @returns {{animator: Animator, end: {x: number, y: number}, start: {x: number, y: number}, cellSize: number}} Animation context
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
   * @param {{x: number, y: number}} end - End coordinates
   * @param {{x: number, y: number}} start - Start coordinates
   * @param {Animator} animator - Animator instance
   * @param {number} [rotation] - Rotation angle (auto-calculated if 0 or falsy)
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

export class StandardShot extends Weapon {
  constructor () {
    super('Standard Shot', '-', false, true, 1)
    this.cursors = ['']
    this.launchCursor = 'crosshair'
    this.tag = 'single'
    this.hints = ['Click On Square To Fire']
    this.buttonHtml = '<span class="shortcut">S</span>ingle Shot'
  }
  get flightSound () {
    const url = new URL('../terrains/all/sounds/shot.mp3', import.meta.url)
    return url
  }

  aoe (_map, coords) {
    return [[coords[0][0], coords[0][1], 4]]
  }
  ammoStatus () {
    return `Single Shot Mode`
  }
}

export const standardShot = new StandardShot()
