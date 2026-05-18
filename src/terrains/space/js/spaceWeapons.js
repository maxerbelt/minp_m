import { WeaponCatelogue as WeaponCatalogue } from '../../../weapon/WeaponCatelogue.js'
import { Weapon } from '../../../weapon/Weapon.js'
import {
  addNeighborList,
  Bomb,
  Fish,
  Sensor,
  Strike
} from '../../../weapon/Bomb.js'
import { CellClassManager } from '../../../waters/helpers/CellClassManager.js'
import { coordToKey } from '../../../core/utilities.js'
/**
 * @typedef {[number, number]} Coord
 * @typedef {[number, number, number]} AoeCell
 * @typedef {AoeCell[]} AoePattern
 * @typedef {Record<string, AoeCell>} CoordBracket
 *
 * @typedef {Object} ViewModel
 * @property {(row: number, col: number) => HTMLElement} gridCellAt
 * @property {() => number} cellSize
 *
 * @typedef {ViewModel} OpposingViewModel
 *
 * @typedef {Object} GameModel
 * @property {() => any} getTarget
 *
 * @typedef {Object} TerrainMap
 * @property {number} rows
 * @property {number} cols
 * @property {(row: number, col: number) => boolean} [isLand]
 *
 * @typedef {Object} DualBoardCells
 * @property {HTMLElement} sourceCell1
 * @property {HTMLElement} targetCell1
 * @property {HTMLElement} sourceCell2
 * @property {HTMLElement} targetCell2
 */

// ============================================================================
// Helper Constants & Utility Functions
// ============================================================================

/** CSS class names for animation state management */
const CSS_CLASSES = {
  MARKER: 'marker',
  PORTAL: 'portal'
}

/**
 * Creates a square explosion pattern around a center point
 * @param {number} centerRow - Center row
 * @param {number} centerCol - Center column
 * @param {number} radius - Explosion radius (distance from center)
 * @param {number} centerPower - Power at center
 * @param {number} adjacentPower - Power for adjacent cells
 * @param {number} distancePower - Power for cells at distance
 * @returns {Array<[number, number, number]>} Explosion pattern
 */
function createSquareExplosion (
  centerRow,
  centerCol,
  radius,
  centerPower = 2,
  adjacentPower = 1,
  distancePower = 0
) {
  const pattern = [[centerRow, centerCol, centerPower]]

  // Add adjacent cells (3x3 around center)
  for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
    for (let colOffset = -1; colOffset <= 1; colOffset++) {
      if (rowOffset !== 0 || colOffset !== 0) {
        pattern.push([
          centerRow + rowOffset,
          centerCol + colOffset,
          adjacentPower
        ])
      }
    }
  }

  // Add cells at distance (forming larger square)
  for (let offset = -1; offset <= 1; offset++) {
    pattern.push(
      [centerRow + offset, centerCol - radius, distancePower],
      [centerRow + offset, centerCol + radius, distancePower],
      [centerRow - radius, centerCol + offset, distancePower],
      [centerRow + radius, centerCol + offset, distancePower]
    )
  }

  // Add cardinal cells at distance + 1 if radius > 1
  if (radius > 1) {
    pattern.push(
      [centerRow - (radius + 1), centerCol, distancePower],
      [centerRow + (radius + 1), centerCol, distancePower],
      [centerRow, centerCol - (radius + 1), distancePower],
      [centerRow, centerCol + (radius + 1), distancePower]
    )
  }

  return pattern
}

/**
 * Animation configuration for dual-board weapon launch
 * @typedef {Object} AnimationContext
 * @property {number} sourceRow - Source row coordinate
 * @property {number} sourceCol - Source column coordinate
 * @property {Object} viewModel - Primary view model
 * @property {Object} opposingViewModel - Opposing player view model
 */

/**
 * Handles launch animation for weapons with dual-board effects
 * @param {Object} weapon - The weapon instance
 * @param {number[][]} coords - Target coordinates
 * @param {AnimationContext} context - Animation context (source coords and view models)
 * @param {Object} map - Game map object
 * @param {Object} gameModel - Game model object
 * @param {Function} [animationCallback] - Optional custom animation callback
 * @returns {Promise} Launch promise
 */
async function launchWithDualBoardAnimation (
  weapon,
  coords,
  context,
  map,
  gameModel,
  animationCallback
) {
  const { sourceRow, sourceCol, viewModel, opposingViewModel } = context

  return await weapon.launchRightTo(
    coords,
    sourceRow,
    sourceCol,
    map,
    viewModel,
    opposingViewModel,
    gameModel,
    animationCallback
  )
}

/**
/**
 * Adds portal CSS classes to cells for dual-board animation.
 * @param {DualBoardCells} cells - Source and target cell references.
 * @returns {void}
 */
function addPortalClasses (cells) {
  // Apply the visual portal/marker classes symmetrically to both boards.
  // These classes are used only for animation decoration and must be removed
  // when the animation completes to avoid stale hover/cursor state.
  cells.sourceCell1.classList.add(CSS_CLASSES.MARKER)
  cells.targetCell1.classList.add(CSS_CLASSES.PORTAL)
  cells.sourceCell2.classList.add(CSS_CLASSES.PORTAL)
  cells.targetCell2.classList.add(CSS_CLASSES.MARKER)
}

/**
 * Removes portal CSS classes from cells after animation.
 * @param {DualBoardCells} cells - Source and target cell references.
 * @returns {void}
 */
function removePortalClasses (cells) {
  cells.sourceCell1.classList.remove(CSS_CLASSES.MARKER)
  cells.targetCell1.classList.remove(CSS_CLASSES.PORTAL)
  cells.sourceCell2.classList.remove(CSS_CLASSES.PORTAL)
  cells.targetCell2.classList.remove(CSS_CLASSES.MARKER)
}

/**
 * Performs portal-style dual-board animation for weapons
 * @param {Object} weapon - The weapon instance
 * @param {number[][]} coords - Target coordinates
 * @param {AnimationContext} context - Animation context (source coords and view models)
 * @param {Object} map - Game map object
 * @param {Object} gameModel - Game model object
 * @returns {Promise} Animation promise
 */
async function performPortalAnimation (weapon, coords, context, map, gameModel) {
  const { sourceRow, sourceCol, viewModel, opposingViewModel } = context

  if (!opposingViewModel) {
    return await weapon.launchRightTo(
      coords,
      sourceRow,
      sourceCol,
      map,
      viewModel,
      opposingViewModel,
      gameModel
    )
  }

  // Resolve the full infinite line endpoints for portal/marker placement.
  // RailBolt visuals should mark the full line across the board, not only the
  // selected rack-to-target segment. `redoCoords()` on Strike-derived weapons
  // normalizes the line to map intercepts, which is the intended portal path.
  const [[lineStartRow, lineStartCol], [lineEndRow, lineEndCol]] =
    weapon.redoCoords(map, [sourceRow, sourceCol], coords)

  // Resolve the actual hit target separately so launch semantics remain correct.
  // The portal markers are purely decorative: they do not affect whether the
  // weapon hits the selected target coordinate.
  const [, targetCoord, hasCandidates] = weapon.processCoords(
    map,
    [sourceRow, sourceCol],
    coords,
    gameModel
  )

  const cells = {
    sourceCell1: opposingViewModel.gridCellAt(lineStartRow, lineStartCol),
    targetCell1: opposingViewModel.gridCellAt(lineEndRow, lineEndCol),
    sourceCell2: viewModel.gridCellAt(lineStartRow, lineStartCol),
    targetCell2: viewModel.gridCellAt(lineEndRow, lineEndCol)
  }
  addPortalClasses(cells)

  try {
    await Weapon.prototype.animateFlyingOnVM.call(
      weapon,
      cells.sourceCell1,
      cells.targetCell1,
      viewModel
    )
    await Weapon.prototype.animateFlyingOnVM.call(
      weapon,
      cells.sourceCell2,
      cells.targetCell2,
      viewModel
    )
  } finally {
    removePortalClasses(cells)
  }

  return hasCandidates ? { target: targetCoord } : {}
}

// ============================================================================
// Missile - Area-of-Effect Explosive
// ============================================================================

/**
 * Missile - A targeted explosive weapon dealing splash damage
 * Extends Bomb with cross-board animation support
 * @extends Bomb
 */
export class Missile extends Bomb {
  /**
   * Initializes missile with configuration
   * @param {number} ammo - Number of missiles available
   */
  constructor (ammo) {
    super(ammo, 'Missile', '+')

    // Cursor configuration for targeting sequence
    this.unattachedCursor = 0
    this.postSelectCursor = 0
    this.postSelectCoords = 1
    this.postUnattached = 1
    this.postSelectShadow = false
    this.launchCursor = 'launch'
    this.totalCursors = 2
    this.cursors = ['missile']
    this.volatile = true
    this.points = 2

    // Weapon behavior configuration
    this._applyWeaponConfig({
      hints: ['Click On Square To Aim Missile'],
      buttonHtml: '<span class="shortcut">M</span>issile',
      tip: 'drag a missile on to the map to increase the number of times you can fire missiles',
      tag: 'missile',
      animateOnTarget: true,
      explodeOnTarget: true,
      hasFlash: true
    })

    // Display and scoring configuration
    this.plural = 'Missiles'
    this.givesHint = true

    // Pre-compute splash damage pattern
    this.splashCoords = this.aoe(null, [
      [-1, -1],
      [2, 2]
    ])
  }

  /**
   * Gets the audio file for missile flight sound
   * @returns {URL} URL to missile flight sound asset
   */
  get flightSound () {
    return Weapon.getFlightSoundUrl('missile-flight.mp3', import.meta.url)
  }

  /**
   * Creates a clone of this missile with optional new ammo count
   * Implements weapon cloning protocol
   * @param {number} [ammo] - Ammo count for cloned instance
   * @returns {Missile} New missile instance
   */
  clone (ammo) {
    return this.createClone(Missile, ammo)
  }

  /**
   * Normalizes launch coordinates for missile targeting
   * Maps source and first target coordinate to launch pair format
   * @param {Object} _map - Game map (unused for missile)
   * @param {number[]} baseCoords - Source coordinates [row, col]
   * @param {number[][]} targetCoords - Array of target coordinates
   * @returns {number[][]} Transformed coordinate pair [baseCoords, targetCoords[0]]
   */
  redoCoords (_map, baseCoords, targetCoords) {
    return [baseCoords, targetCoords[0]]
  }

  /**
   * Calculates area-of-effect damage pattern from target coordinates
   * Delegates to inherited boom() method for standard explosion pattern
   * @param {Object} _map - Game map (unused for missile)
   * @param {number[][]} coords - Target coordinates [[row, col]]
   * @returns {Array<[number, number, number]>} Damage cells with power levels
   */
  aoe (_map, coords) {
    if (coords.length < 1) return []
    const [row, col] = coords.at(-1)
    return this.boom(row, col)
  }

  /**
   * Animates missile launch with cross-board support
   * Routes to parent launchTo if no opposing view model exists
   * @async
   * @param {number[][]} coords - Target coordinates [[row, col]]
   * @param {number} row - Source row coordinate
   * @param {number} col - Source column coordinate
   * @param {Object} map - Game map object
   * @param {Object} viewModel - Primary view model
   * @param {Object} [opposingViewModel] - Optional opposing player view model
   * @returns {Promise<Object>} Animation completion result
   */
  async launchTo (coords, row, col, map, viewModel, opposingViewModel) {
    if (!opposingViewModel) {
      return await super.launchTo(
        coords,
        row,
        col,
        map,
        viewModel,
        opposingViewModel
      )
    }
    // Resolve the normalized start and target coordinates so callers
    // receive the same target information this weapon used for animation.
    const [[startRow, startCol], targetCoord] = this.redoCoords(
      map,
      [row, col],
      coords
    )

    const sourceCell = opposingViewModel.gridCellAt(startRow, startCol)
    const targetCell = viewModel.gridCellAt(targetCoord[0], targetCoord[1])

    // Perform the animation (does not return target info), then
    // return the resolved target so upstream callers can use it
    // to determine hits/reveals consistently.
    await Weapon.prototype.animateFlyingOnVM.call(
      this,
      sourceCell,
      targetCell,
      viewModel
    )
    return { target: targetCoord }
  }

  /**
   * Determines turn phase for missile variant
   * Maps variant ID to turn duration classes for animation pacing
   * @param {number} variant - Weapon variant identifier (0, 2, 3)
   * @param {number} _r - Row coordinate for turn calculation
   * @param {number} _c - Column coordinate for turn calculation
   * @returns {string} CSS turn class name ('turn4', 'turn2', 'turn3') or empty string
   */
  getTurn (variant, _r, _c) {
    const turnMap = {
      0: 'turn3',
      1: 'turn4',
      3: 'turn2'
    }
    return turnMap[variant] || ''
  }

  /**
   * Creates a single-missile instance for quick access
   * @static
   * @returns {Missile} Missile instance with 1 ammo
   */
  static get single () {
    return new Missile(1)
  }
}

// ============================================================================
// RailBolt - Line-based Strike Weapon with Cross-Board Animation
// ============================================================================

/**
 * RailBolt - A two-point targeting weapon with portal-style cross-board animation
 * Extends Strike with specialized dual-animation launch sequence
 * @extends Strike
 */
export class RailBolt extends Strike {
  /**
   * Initializes rail bolt with configuration
   * @param {number} ammo - Number of rail bolts available
   */
  constructor (ammo) {
    super(ammo, 'Rail Bolt', '|')

    // Cursor configuration for targeting sequence
    this.launchCursor = 'rail'
    this.postSelectCursor = 1
    this.postSelectCoords = 1
    this.postSelectShadow = true
    this.totalCursors = 2
    this.splashType = undefined
    this.cursors = ['rail', 'bolt']
    this.isOneAndDone = true

    // Weapon behavior configuration
    this._applyWeaponConfig({
      hints: [
        'Click on square to start rail bolt',
        'Click on square end rail bolt'
      ],
      buttonHtml: '<span class="shortcut">R</span>ail Bolt',
      tip: 'drag a rail bolt on to the map to increase the number of times you can strike',
      tag: 'rail',
      hasFlash: false
    })

    // Display configuration
    this.plural = 'Rail Bolts'

    // Drag-and-drop placement shape
    this.dragShape = [
      [0, 0, 1],
      [0, 1, 0],
      [0, 2, 0],
      [0, 3, 0],
      [0, 4, 1]
    ]
    this.splashCoords = addNeighborList(
      null,
      0,
      0,
      [[2, 2, 2]],
      [
        [0, 0, 20],
        [1, 1, 20],
        [1, 2, 0],
        [2, 1, 0],
        [2, 3, 0],
        [3, 2, 0],
        [3, 4, 0],
        [2, 2, 2],
        [3, 3, 31],
        [4, 3, 0],
        [4, 4, 30],
        [5, 5, 20]
      ]
    )
  }
  /**
   * Determines turn phase for missile variant
   * Maps variant ID to turn duration classes for animation pacing
   * @param {number} variant - Weapon variant identifier (0, 2, 3)
   * @param {number} r - Row coordinate for turn calculation
   * @param {number} c - Column coordinate for turn calculation
   * @returns {string} CSS turn class name ('turn4', 'turn2', 'turn3') or empty string
   */
  getTurn (variant, r, c) {
    if (r === 0 && c === 0) {
      return variant === 0 ? 'turn4' : ''
    }
    if (r === 0) return 'turn4'
    if (c === 0) return 'turn3'
    if (r === c) return 'turn2'
    if (r === -c) return ''
    if (variant === 0) {
      const r0 = Math.abs(r)
      const c0 = Math.abs(c)
      return c0 < r0 ? 'turn3' : 'turn4'
    }

    const d0 = Math.abs(r + c)
    const d1 = Math.abs(c - r)
    return d1 < d0 ? 'turn2' : ''
  }
  /**
   * Gets the audio file for rail bolt flight sound
   * @returns {URL} URL to rail bolt flight sound asset
   */
  get flightSound () {
    return Weapon.getFlightSoundUrl('rail-flight.mp3', import.meta.url)
  }

  /**
   * Creates a clone of this rail bolt with optional new ammo count
   * Implements weapon cloning protocol
   * @param {number} [ammo] - Ammo count for cloned instance
   * @returns {RailBolt} New rail bolt instance
   */
  clone (ammo) {
    return this.createClone(RailBolt, ammo)
  }

  aoePlus (map, coords) {
    const affectedArea = this.aoe(map, coords)
    const fullLine = affectedArea
    return { affectedArea, options: { fullLine } }
  }

  /**
   * Calculates splash/secondary damage pattern around a point
   * @param {Object} _map - Game map
   * @param {Array} resolvedTarget - Impact coordinate [row, col]
   * @param {Array} effect - Damage effect coordinates
   * @param {Object} options - Additional options
   * @returns {Array} Splash pattern
   */
  splash (_map, resolvedTarget, effect, options) {
    const last = (effect?.length || 1) - 1
    const { fullLine } = options
    resolvedTarget[2] = 2
    let bracket = {}
    addCoord(bracket, resolvedTarget)
    addOffset(bracket, resolvedTarget, [1, 0], 0)
    addOffset(bracket, resolvedTarget, [-1, 0], 0)
    addOffset(bracket, resolvedTarget, [0, 1], 0)
    addOffset(bracket, resolvedTarget, [0, -1], 0)
    let next
    if (fullLine) {
      const idx = fullLine.findIndex(
        ([r, c]) => r === resolvedTarget[0] && c === resolvedTarget[1]
      )
      if (idx !== undefined) {
        // Determine next point based on position in trajectory line
        if (idx === last) {
          next = fullLine[idx - 1]
        } else {
          next = fullLine[idx + 1]
        }

        if (next) {
          next[2] = 1

          addOffset(bracket, next, [0, 0], 1)
          addOffset(bracket, next, [1, 0], 0)
          addOffset(bracket, next, [-1, 0], 0)
          addOffset(bracket, next, [0, 1], 0)
          addOffset(bracket, next, [0, -1], 0)
        }
      }
    }
    return Object.values(bracket)
  }

  /**
   * Initiates rail bolt launch with coordinate transformation
   * Routes to launchRightTo for coordinate processing before dual-animation launch
   * @async
   * @param {number[][]} coords - Target coordinates [[startRow, startCol], [endRow, endCol]]
   * @param {number} sourceRow - Source row coordinate
   * @param {number} sourceCol - Source column coordinate
   * @param {Object} map - Game map object
   * @param {Object} viewModel - Primary view model
   * @param {Object} [opposingViewModel] - Optional opposing player view model
   * @param {Object} [gameModel] - Optional game model for coordinate transformation
   * @returns {Promise<Object>} Animation completion result
   */
  async launchTo (
    coords,
    sourceRow,
    sourceCol,
    map,
    viewModel,
    opposingViewModel,
    gameModel
  ) {
    const context = { sourceRow, sourceCol, viewModel, opposingViewModel }
    return await launchWithDualBoardAnimation(
      this,
      coords,
      context,
      map,
      gameModel,
      performPortalAnimation.bind(null, this, coords, context, map, gameModel)
    )
  }

  /**
   * Creates a single-rail-bolt instance for quick access
   * @static
   * @returns {RailBolt} RailBolt instance with 1 ammo
   */
  static get single () {
    return new RailBolt(1)
  }
}

// ============================================================================
// GaussRound - Projectile with Land Detection
// ============================================================================

/**
 * GaussRound - A projectile weapon that stops at terrain boundaries
 * Extends Fish with land-detection trajectory and dual-animation launch
 * @extends Fish
 */
export class GaussRound extends Fish {
  /**
   * Initializes Gauss round with configuration
   * @param {number} ammo - Number of Gauss rounds available
   */
  constructor (ammo) {
    super(ammo, 'Gauss Round', '^')

    // Cursor configuration for targeting sequence
    this.cursors = ['rlaunch', 'round']
    this.launchCursor = 'rlaunch'
    this.isOneAndDone = true
    this.postSelectCursor = 1
    this.postSelectCoords = 1
    this.postSelectShadow = true
    this.totalCursors = 2

    // Display and scoring configuration
    this.plural = 'Gauss Rounds'
    this.givesHint = true
    this.hasShadowAtHint = true
    this.crashOverSplash = false
    this.canCrash = true
    this.hasWake = false
    this.splashType = undefined

    // Weapon behavior configuration
    this._applyWeaponConfig({
      hints: [
        'Click on square to start gauss round',
        'Click on square aim gauss round'
      ],
      buttonHtml: '<span class="shortcut">G</span>auss Round',
      tip: 'drag a gauss round on to the map to increase the number of times you can strike',
      tag: 'round',
      hasFlash: false
    })

    // Drag-and-drop placement shape
    this.dragShape = [
      [1, 0, 1],
      [1, 1, 0],
      [1, 2, 0],
      [0, 3, 0],
      [2, 3, 0]
    ]
    this.splashCoords = addNeighborList(
      null,
      0,
      0,
      [[3, 3, 2]],
      [
        [0, 0, 20],
        [1, 1, 20],
        [2, 2, 30],
        [4, 4, 31],
        [5, 5, 30]
      ]
    )

    this.crashCoords = addNeighborList(
      null,
      30,
      0,
      [],
      [
        [0, 0, 20],
        [1, 1, 20],
        [2, 2, 30],
        [1, 3, 0],
        [2, 3, 1],
        [2, 4, 0],
        [3, 1, 0],
        [3, 2, 1],
        [3, 3, 2],
        [3, 4, 1],
        [3, 5, 0],
        [4, 2, 0],
        [4, 3, 1],
        [4, 4, 0],
        [5, 3, 0]
      ]
    )
    // Tracks crash location when round hits land
    this.crashLoc = null
  }
  /**
   * Performs Gauss round dual-board animation with portal effect on sources
   * Animates from source on opposing board to target on primary board
   * Then animates from source on primary board to target on primary board
   * @async
   
   * @param {number[][]} coords - Target coordinates
   * @param {number} sourceRow - Source row
   * @param {number} sourceCol - Source column
   * @param {Object} map - Game map
   * @param {Object} viewModel - Primary view model
   * @param {Object} opposingViewModel - Opposing view model
   * @param {Object} gameModel - Game model
   * @returns {Promise} Animation promise
   */
  async performGaussRoundAnimation (
    coords,
    sourceRow,
    sourceCol,
    map,
    viewModel,
    opposingViewModel,
    gameModel
  ) {
    if (!opposingViewModel) {
      return await this.launchRightTo(
        coords,
        sourceRow,
        sourceCol,
        map,
        viewModel,
        opposingViewModel,
        gameModel,
        this.processCoords.bind(this)
      )
    }
    const [, targetCoord, hasCandidates] = this.processCoords(
      map,
      [sourceRow, sourceCol],
      coords,
      gameModel
    )
    // Use the hint/source coordinates for portal decoration on both boards.
    // GaussRound portals should appear at the hinted launch source, not at a
    // normalized line origin if the path is adjusted separately for impact.
    const sourceCell1 = opposingViewModel.gridCellAt(sourceRow, sourceCol)
    const sourceCell2 = viewModel.gridCellAt(sourceRow, sourceCol)
    const targetCell2 = viewModel.gridCellAt(targetCoord[0], targetCoord[1])

    const oldClassName1 = sourceCell1.className
    const oldClassName2 = sourceCell2.className

    CellClassManager.clearFriendCell(sourceCell1)
    CellClassManager.clearFriendCell(sourceCell2)
    // Apply portal CSS classes to sources
    sourceCell1.classList.add(CSS_CLASSES.PORTAL)
    sourceCell2.classList.add(CSS_CLASSES.PORTAL)

    // Perform animations
    await this.animateFlyingOnVM(sourceCell2, targetCell2, viewModel)

    sourceCell1.className = oldClassName1
    sourceCell2.className = oldClassName2

    // Remove CSS classes
    sourceCell1.classList.remove(CSS_CLASSES.PORTAL)
    sourceCell2.classList.remove(CSS_CLASSES.PORTAL)
    return hasCandidates ? { target: targetCoord } : {}
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
      const source = list[0]
      return [source, t, true]
    }
    return list
  }
  /**
   * Determines turn phase for Gauss round variant
   * Maps variant ID to turn duration classes for animation pacing
   * @param {number} variant - Weapon variant identifier (1, 3)
   * @param {number} _r - Row coordinate (unused for Gauss round)
   * @param {number} _c - Column coordinate (unused for Gauss round)
   * @returns {string} CSS turn class name ('turn2') or empty string
   */
  getTurn (variant, _r, _c) {
    const turnMap = {
      1: 'turn2',
      3: 'turn2'
    }
    return turnMap[variant] || ''
  }

  /**
   * Creates a clone of this Gauss round with optional new ammo count
   * Implements weapon cloning protocol
   * @param {number} [ammo] - Ammo count for cloned instance
   * @returns {GaussRound} New Gauss round instance
   */
  clone (ammo) {
    return this.createClone(GaussRound, ammo)
  }

  /**
   * Gets the audio file for Gauss round flight sound
   * @returns {URL} URL to Gauss round flight sound asset
   */
  get flightSound () {
    return new URL('../sounds/guass-flight.mp3', import.meta.url)
  }

  /**
   * Computes blast radius pattern from explosion center
   * Creates expanding square pattern: center → 3×3 → 5×5 → cardinal distance
   * @param {number} centerRow - Explosion center row
   * @param {number} centerCol - Explosion center column
   * @returns {Array<[number, number, number]>} Damage pattern as [row, col, power] tuples
   */
  boom (centerRow, centerCol) {
    return createSquareExplosion(centerRow, centerCol, 2)
  }

  /**
   * Calculates trajectory path along ray line until land boundary
   * Stops at first land cell if detected; records crash location
   * @param {Object} map - Game map for terrain checking
   * @param {number[][]} coords - Start and end coordinates [[startRow, startCol], [endRow, endCol]]
   * @param {number} [power=1] - Power level for trajectory cells
   * @returns {Array<[number, number, number]>} Cells along trajectory with power levels
   */
  /**
   * Calculates area-of-effect along the fish's water path
   * Stops at land boundaries (map.isLand check)
   * @param {Object} map - Game map for bounds checking
   * @param {number[][]} coords - Source and Target coordinates
   * @returns {Array} Cells along water path with damage power
   */
  aoe (map, coords) {
    const effect = this.aoeRaw(map, coords, 2, 1)
    //     this.crashLoc =
    //  landCollisionIndex >= 0 ? trajectoryLine[landCollisionIndex] : null

    return effect
  }
  aoePlus (map, coords) {
    const affectedArea = this.aoe(map, coords)
    const crashLoc = affectedArea.length > 0 ? affectedArea.at(-1) : null
    const fullLine = this.aoeFull(coords)
    return { affectedArea, options: { crashLoc, fullLine } }
  }

  /**
   * Calculates splash/secondary damage pattern around a point
   * @param {Object} _map - Game map
   * @param {Coord} resolvedTarget - Impact coordinate [row, col]
   * @param {AoePattern} effect - Damage effect coordinates
   * @param {{fullLine?: Coord[]}} options - Additional options
   * @returns {AoePattern} Splash pattern
   */
  splash (_map, resolvedTarget, effect, options) {
    const last = (effect?.length || 1) - 1
    const { fullLine } = options
    resolvedTarget[2] = 2
    const bracket = [resolvedTarget]

    if (!fullLine) return bracket

    const idx = fullLine.findIndex(
      ([r, c]) => r === resolvedTarget[0] && c === resolvedTarget[1]
    )
    if (idx < 0) return bracket

    const isStart = idx === 0
    const isSecond = idx === 1
    const isEnd = idx === last

    let prev
    if (isStart) {
      prev = fullLine[2]
    } else if (isSecond) {
      prev = fullLine[0]
    } else {
      prev = fullLine[idx - 1]
    }
    const next = isEnd ? fullLine[idx - 1] : fullLine[idx + 1]
    const next2 = isEnd ? fullLine[idx + 1] : fullLine[idx + 2]

    const pushSplash = (cell, power) => {
      if (cell) {
        cell[2] = power
        bracket.push(cell)
      }
    }

    pushSplash(prev, 0)
    pushSplash(next, 1)
    pushSplash(next2, 0)

    return bracket
  }

  /**
   * Calculates crash splash damage pattern around a terminal point when no hits are registered
 
   * @param {Object} map - Game map
   * @param {Array} target - Impact coordinate [row, col]
   * @param {Array} _effect - Damage effect coordinates
   * @param {Object} _options - Additional options
   * @returns {Array} Splash pattern
   */
  crashSplash (map, target, _effect, _options) {
    let pattern = []

    const [r, c] = target
    addNeighborList(map, r, c, pattern, [
      [-1, 0, 1],
      [1, 0, 1],
      [0, -1, 1],
      [0, 1, 1],
      [-1, -1, 0],
      [-1, 1, 0],
      [1, -1, 0],
      [1, 1, 0],
      [-2, 0, 0],
      [2, 0, 0],
      [0, -2, 0],
      [0, 2, 0]
    ])

    return pattern
  }

  /**
   * Initiates Gauss round launch with coordinate transformation
   * Routes to launchRightTo for coordinate processing before dual-animation launch
   * @async
   * @param {number[][]} coords - Target coordinates [[startRow, startCol], [endRow, endCol]]
   * @param {number} sourceRow - Source row coordinate
   * @param {number} sourceCol - Source column coordinate
   * @param {Object} map - Game map object
   * @param {Object} viewModel - Primary view model
   * @param {Object} [opposingViewModel] - Optional opposing player view model
   * @param {Object} [gameModel] - Optional game model for coordinate transformation
   * @returns {Promise<void>} Resolves when animations complete
   */
  async launchTo (
    coords,
    sourceRow,
    sourceCol,
    map,
    viewModel,
    opposingViewModel,
    gameModel
  ) {
    const context = { sourceRow, sourceCol, viewModel, opposingViewModel }
    return await launchWithDualBoardAnimation(
      this,
      coords,
      context,
      map,
      gameModel,
      this.performGaussRoundAnimation.bind(
        this,
        coords,
        sourceRow,
        sourceCol,
        map,
        viewModel,
        opposingViewModel,
        gameModel
      )
    )
  }

  /**
   * Creates a single-Gauss-round instance for quick access
   * @static
   * @returns {GaussRound} GaussRound instance with 1 ammo
   */
  static get single () {
    return new GaussRound(1)
  }
}

// ============================================================================
// Scan - Pie-segment Scanning Weapon
// ============================================================================

/**
 * Scan - A detection/scanning weapon generating pie-segment patterns
 * Extends Sensor for radar-like sweep visualization
 * @extends Sensor
 */
export class Scan extends Sensor {
  /**
   * Initializes radar scan with configuration
   * @param {number} ammo - Number of scans available
   */
  constructor (ammo) {
    super(ammo)

    // Weapon identity
    this.name = 'Scan'
    this.letter = 'Z'

    // Cursor configuration for targeting sequence
    this.cursors = ['dish', 'sweep']
    this.isOneAndDone = false

    // Weapon behavior configuration
    this._applyWeaponConfig({
      hints: ['Click on square to start scan', 'Click on square end scan'],
      buttonHtml: 's<span class="shortcut">W</span>eep',
      tag: 'scan',
      hasFlash: false
    })
  }

  /**
   * Creates a clone of this scan with optional new ammo count
   * Implements weapon cloning protocol
   * @param {number} [ammo] - Ammo count for cloned instance
   * @returns {Scan} New scan instance
   */
  clone (ammo) {
    return this.createClone(Scan, ammo)
  }
}

// ============================================================================
// Weapon Catalogue - Space Terrain Weapons Export
// ============================================================================

/**
 * Pre-configured catalogue of space terrain weapons
 * @type {WeaponCatalogue}
 */
export const spaceWeaponsCatalogue = new WeaponCatalogue([
  new Missile(1),
  new RailBolt(1),
  new GaussRound(1)
])

/**
 * Adds a coordinate tuple into an indexed bracket for fast lookup.
 * @param {CoordBracket} bracket - Coordinate dictionary keyed by string ID.
 * @param {Coord} coord - Coordinate tuple [row, col, power].
 * @returns {void}
 */
function addCoord (bracket, coord) {
  bracket[coordToKey(...coord)] = coord
}

/**
 * Adds or upgrades a coordinate in a bracket using an offset and power value.
 * @param {CoordBracket} bracket - Coordinate dictionary keyed by string ID.
 * @param {Coord} coord - Base coordinate tuple [row, col, power].
 * @param {[number, number]} offset - Offset to apply to the base coordinate.
 * @param {number} power - Power value for the new coordinate.
 * @returns {void}
 */
function addOffset (bracket, coord, offset, power) {
  const newCoord = [coord[0] + offset[0], coord[1] + offset[1], power]
  const newKey = coordToKey(...newCoord)
  const oldValue = bracket[newKey]
  if (oldValue) {
    if (oldValue[2] < power) {
      bracket[coordToKey(...newCoord)] = newCoord
    }
  } else {
    bracket[coordToKey(...newCoord)] = newCoord
  }
}
