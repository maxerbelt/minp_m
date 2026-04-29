import { WeaponCatelogue as WeaponCatalogue } from '../../../weapon/WeaponCatelogue.js'
import { RectListCanvas } from '../../../grid/rectangle/rectListCanvas.js'
import { Weapon } from '../../../weapon/Weapon.js'
import {
  addNeighbors,
  Bomb,
  Fish,
  Sensor,
  Strike
} from '../../../weapon/Bomb.js'
import { CellClassManager } from '../../../waters/helpers/CellClassManager.js'

// ============================================================================
// Helper Constants & Utility Functions
// ============================================================================

/** CSS class names for animation state management */
const CSS_CLASSES = {
  MARKER: 'marker',
  PORTAL: 'portal'
}

/**
 * Draws a ray line on canvas and returns point list
 * Converts canvas coordinates to grid coordinates with power tagging
 * @private
 * @param {number} rowStart - Starting row coordinate
 * @param {number} colStart - Starting column coordinate
 * @param {number} rowEnd - Ending row coordinate
 * @param {number} colEnd - Ending column coordinate
 * @param {number} power - Damage power level for each cell
 * @returns {Array<[number, number, number]>} Array of [row, column, power] tuples
 */
function drawRayLinePoints (rowStart, colStart, rowEnd, colEnd, power) {
  const canvas = RectListCanvas.BhMapList()
  canvas.drawRay(colStart, rowStart, colEnd, rowEnd, power)
  return canvas.list
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
 * Handles launch animation for weapons with dual-board effects
 * @param {Object} weapon - The weapon instance
 * @param {Array} coords - Target coordinates
 * @param {number} sourceRow - Source row
 * @param {number} sourceCol - Source column
 * @param {Object} map - Game map
 * @param {Object} viewModel - Primary view model
 * @param {Object} opposingViewModel - Opposing view model
 * @param {Object} gameModel - Game model
 * @param {Function} animationCallback - Custom animation callback
 * @returns {Promise} Launch promise
 */
async function launchWithDualBoardAnimation (
  weapon,
  coords,
  sourceRow,
  sourceCol,
  map,
  viewModel,
  opposingViewModel,
  gameModel,
  animationCallback
) {
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
 * Performs portal-style dual-board animation for rail bolt
 * @param {Object} weapon - The weapon instance
 * @param {Array} coords - Target coordinates
 * @param {number} sourceRow - Source row
 * @param {number} sourceCol - Source column
 * @param {Object} map - Game map
 * @param {Object} viewModel - Primary view model
 * @param {Object} opposingViewModel - Opposing view model
 * @param {Object} gameModel - Game model
 * @returns {Promise} Animation promise
 */
async function performPortalAnimation (
  weapon,
  coords,
  sourceRow,
  sourceCol,
  map,
  viewModel,
  opposingViewModel,
  gameModel
) {
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

  const [[startRow, startCol], targetCoord] = weapon.redoCoords(
    map,
    [sourceRow, sourceCol],
    coords
  )

  const sourceCell1 = opposingViewModel.gridCellAt(startRow, startCol)
  const targetCell1 = opposingViewModel.gridCellAt(
    targetCoord[0],
    targetCoord[1]
  )
  const sourceCell2 = viewModel.gridCellAt(startRow, startCol)
  const targetCell2 = viewModel.gridCellAt(targetCoord[0], targetCoord[1])

  // Apply portal CSS classes
  sourceCell1.classList.add(CSS_CLASSES.MARKER)
  targetCell1.classList.add(CSS_CLASSES.PORTAL)
  sourceCell2.classList.add(CSS_CLASSES.PORTAL)
  targetCell2.classList.add(CSS_CLASSES.MARKER)

  // Perform animations
  await Weapon.prototype.animateFlyingOnVM.call(
    weapon,
    sourceCell1,
    targetCell1,
    viewModel
  )
  await Weapon.prototype.animateFlyingOnVM.call(
    weapon,
    sourceCell2,
    targetCell2,
    viewModel
  )

  // Remove CSS classes
  sourceCell1.classList.remove(CSS_CLASSES.MARKER)
  targetCell1.classList.remove(CSS_CLASSES.PORTAL)
  sourceCell2.classList.remove(CSS_CLASSES.PORTAL)
  targetCell2.classList.remove(CSS_CLASSES.MARKER)
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
    this.launchCursor = 'launch'
    this.totalCursors = 2
    this.cursors = ['missile']
    this.volatile = true

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
    this.points = 1
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
    const [row, col] = coords[0]
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

    const targetCoord = coords[0]
    const sourceCell = opposingViewModel.gridCellAt(row, col)
    const targetCell = viewModel.gridCellAt(targetCoord[0], targetCoord[1])

    return await Weapon.prototype.animateFlyingOnVM.call(
      this,
      sourceCell,
      targetCell,
      viewModel
    )
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
    if (variant === 0) {
      const r0 = Math.abs(r)
      const c0 = Math.abs(c)
      if (r0 === c0) return ''
      return c0 < r0 ? 'turn3' : 'turn4'
    }
    const r0 = Math.abs(r + c)
    const c0 = Math.abs(c - r)
    if (r0 === c0) return 'turn4'
    return c0 < r0 ? 'turn2' : ''
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
    return await launchWithDualBoardAnimation(
      this,
      coords,
      sourceRow,
      sourceCol,
      map,
      viewModel,
      opposingViewModel,
      gameModel,
      performPortalAnimation.bind(null, this)
    )
  }

  /**
   * Executes dual-board rail bolt animation with portal effect
   * Routes to parent launchTo if no opposing view model exists
   * Performs bidirectional animation with marker/portal CSS transitions
   * @private
   * @async
   * @param {number[][]} coords - Target coordinates [[startRow, startCol], [endRow, endCol]]
   * @param {number} sourceRow - Source row coordinate
   * @param {number} sourceCol - Source column coordinate
   * @param {Object} map - Game map object
   * @param {Object} viewModel - Primary view model
   * @param {Object} [opposingViewModel] - Optional opposing player view model
   * @param {Object} [gameModel] - Optional game model
   * @returns {Promise<void>} Resolves when animations complete
   */
  async _performRailBoltAnimation (
    coords,
    sourceRow,
    sourceCol,
    map,
    viewModel,
    opposingViewModel,
    gameModel
  ) {
    if (!opposingViewModel) {
      return await super.launchTo(
        coords,
        sourceRow,
        sourceCol,
        map,
        viewModel,
        opposingViewModel,
        gameModel
      )
    }

    const [[startRow, startCol], targetCoord] = this.redoCoords(
      map,
      [sourceRow, sourceCol],
      coords
    )

    const sourceCell1 = opposingViewModel.gridCellAt(startRow, startCol)
    const targetCell1 = opposingViewModel.gridCellAt(
      targetCoord[0],
      targetCoord[1]
    )
    const sourceCell2 = viewModel.gridCellAt(startRow, startCol)
    const targetCell2 = viewModel.gridCellAt(targetCoord[0], targetCoord[1])

    // Perform dual-board animation with portal-style CSS classes
    sourceCell1.classList.add(CSS_CLASSES.MARKER)
    targetCell1.classList.add(CSS_CLASSES.PORTAL)
    sourceCell2.classList.add(CSS_CLASSES.PORTAL)
    targetCell2.classList.add(CSS_CLASSES.MARKER)

    await Weapon.prototype.animateFlyingOnVM.call(
      this,
      sourceCell1,
      targetCell1,
      viewModel
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
// GuassRound - Projectile with Land Detection
// ============================================================================

/**
 * GuassRound - A projectile weapon that stops at terrain boundaries
 * Extends Fish with land-detection trajectory and dual-animation launch
 * @extends Fish
 */
export class GuassRound extends Fish {
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
    const [[startRow, startCol], targetCoord, hasCandidates] =
      this.processCoords(map, [sourceRow, sourceCol], coords, gameModel)
    //const [[startRow, startCol], targetCoord] = weapon.redoCoords(
    //  map,
    //  [sourceRow, sourceCol],
    // coords
    //)

    const sourceCell1 = opposingViewModel.gridCellAt(startRow, startCol)
    const sourceCell2 = viewModel.gridCellAt(startRow, startCol)
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
   * Determines turn phase for missile variant
   * Maps variant ID to turn duration classes for animation pacing
   * @param {number} variant - Weapon variant identifier (0, 2, 3)
   * @param {number} r - Row coordinate for turn calculation
   * @param {number} c - Column coordinate for turn calculation
   * @returns {string} CSS turn class name ('turn4', 'turn2', 'turn3') or empty string
   */
  getTurn (variant, r, c) {
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
   * @returns {GuassRound} New Gauss round instance
   */
  clone (ammo) {
    return this.createClone(GuassRound, ammo)
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
   * Creates expanding square pattern: center → 3×3 → 5×5 → cardinal distance-3
   * @param {number} centerRow - Explosion center row
   * @param {number} centerCol - Explosion center column
   * @returns {Array<[number, number, number]>} Damage pattern as [row, col, power] tuples
   */
  boom (centerRow, centerCol) {
    return createSquareExplosion(centerRow, centerCol)
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
   * @param {Object} map - Game map for land/water checks
   * @param {Array} coords - Two-point coordinates [startCoord, endCoord]
   * @param {number} [power=1] - Power level for damage
   * @returns {Array} Cells along water path with damage power
   */
  aoe (map, coords, power = 1) {
    const effect = this.aoeRaw(map, coords, power, 1)
    //     this.crashLoc =
    //  landCollisionIndex >= 0 ? trajectoryLine[landCollisionIndex] : null

    return effect
  }
  aoePlus (map, coords) {
    const affectedArea = this.aoe(map, coords, 2)
    const crashLoc =
      affectedArea.length > 0 ? affectedArea[affectedArea.length - 1] : null
    const fullLine = this.aoeFull(coords)
    return { affectedArea, options: { crashLoc, fullLine } }
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
    let bracket = [resolvedTarget]
    if (fullLine) {
      const idx = fullLine.find(
        ([r, c]) => r === resolvedTarget[0] && c === resolvedTarget[1]
      )
      if (idx !== undefined) {
        let next2 = fullLine[idx - 2]
        let prev = fullLine[idx - 1]
        let next = fullLine[idx + 1]
        switch (idx) {
          case 0:
            next2 = fullLine[idx + 3]
            prev = fullLine[idx + 2]
            next = fullLine[idx + 1]
            break
          case 1:
            next2 = fullLine[idx + 2]
            prev = fullLine[idx - 1]
            next = fullLine[idx + 1]
            break
          case last:
            next2 = fullLine[idx + 1]
            prev = fullLine[idx - 2]
            next = fullLine[idx - 1]
            break
          default:
            next2 = fullLine[idx + 2]
            prev = fullLine[idx - 1]
            next = fullLine[idx + 1]
            break
        }

        if (prev) {
          prev[2] = 0
          bracket.push(prev)
        }
        if (next) {
          next[2] = 1
          bracket.push(next)
        }
        if (next2) {
          next2[2] = 0
          bracket.push(next2)
        }
      }
    }
    return bracket
  }

  /**
   * Calculates crash splash damage pattern around a terminal point when no hits are registered
 
   * @param {Object} map - Game map
   * @param {Array} resolvedTarget - Impact coordinate [row, col]
   * @param {Array} _effect - Damage effect coordinates
   * @param {Object} _options - Additional options
   * @returns {Array} Splash pattern
   */
  crashSplash (map, resolvedTarget, _effect, _options) {
    let pattern = []
    if (
      this.crashLoc &&
      resolvedTarget[0] === this.crashLoc[0] &&
      resolvedTarget[1] === this.crashLoc[1]
    ) {
      const [r, c] = this.crashLoc
      addNeighbors(map, r, c, pattern, [
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
    } else {
      console.log('Crash splash not triggered:', resolvedTarget, this.crashLoc)
    }
    return pattern
  }
  /*
  aoe (map, coords, power = 1) {
    const startRow = coords[0][1]
    const startCol = coords[0][0]
    const endRow = coords[1][1]
    const endCol = coords[1][0]

    const trajectoryLine = drawRayLinePoints(
      startRow,
      startCol,
      endRow,
      endCol,
      power
    )
    const landCollisionIndex = trajectoryLine.findIndex(([x, y]) =>
      map.isLand(y, x)
    )

    // Track crash location if trajectory hits land
    this.crashLoc =
      landCollisionIndex >= 0 ? trajectoryLine[landCollisionIndex] : null

    // Truncate trajectory at land boundary (inclusive)
    if (landCollisionIndex >= 0) {
      trajectoryLine.length = landCollisionIndex + 1
    }

    return trajectoryLine
  }
*/
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
    return await launchWithDualBoardAnimation(
      this,
      coords,
      sourceRow,
      sourceCol,
      map,
      viewModel,
      opposingViewModel,
      gameModel,
      this.performGaussRoundAnimation.bind(this)
    )
  }

  /**
   * Creates a single-Gauss-round instance for quick access
   * @static
   * @returns {GuassRound} GuassRound instance with 1 ammo
   */
  static get single () {
    return new GuassRound(1)
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
  new RailBolt(1)
])
