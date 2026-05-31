/**
 * Space Weapons Module
 *
 * Defines all weapon types for space terrain gameplay, including missiles, rail bolts,
 * Gauss rounds, laser blasts, and scanning equipment. Provides dual-board animation
 * support for cross-board weapon launches with portal effect visualization.
 *
 * Weapons implement area-of-effect (AOE) damage patterns with splash effects,
 * crash mechanics for terrain collision, and animated launch sequences.
 *
 * @module terrains/space/js/spaceWeapons
 * @note Uses @ts-nocheck due to complex type inference in weapon system interactions
 */

// @ts-nocheck: complex type inference issues in space weapons implementation
import { WeaponCatalogue } from '../../../weapon/WeaponCatalogue.js'
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
 * A coordinate pair representing a single cell on the game board.
 * Format: [row, col] where row is Y-axis and col is X-axis.
 * Used extensively for targeting, positioning, and layout calculations.
 *
 * @typedef {[number, number]} Coord
 */

/**
 * Area-of-effect damage cell with power/impact rating.
 * Format: [row, col, power] where power represents damage intensity or effect level.
 * Power values typically: 0 (no effect), 1 (secondary), 2 (primary), 3+ (special).
 *
 * @typedef {[number, number, number]} AoeCell
 */

/**
 * Complete area-of-effect pattern for a weapon.
 * Array of AoeCell tuples defining all affected cells and their damage power.
 * Used for damage calculation, visual effects, and targeting feedback.
 *
 * @typedef {AoeCell[]} AoePattern
 */

/**
 * Indexed bracket for fast coordinate lookup and deduplication.
 * Maps coordinate string keys to AoeCell tuples for efficient merging of overlapping patterns.
 * Created by coordToKey() function for string-based coordinate indexing.
 *
 * @typedef {Record<string, AoeCell>} CoordBracket
 */

/**
 * View model interface for rendering game board cells and managing UI state.
 * Provides methods to access HTML cell elements and retrieve cell sizing information.
 * Used for animation target selection and coordinate-to-element mapping.
 *
 * @typedef {Object} ViewModel
 * @property {(row: number, col: number) => HTMLElement} gridCellAt - Returns HTML element for board cell at coordinates
 * @property {() => number} cellSize - Returns size in pixels of each grid cell
 */

/**
 * Opposing player's view model for dual-board cross-animation.
 * Identical structure to ViewModel, represents opponent's board rendering interface.
 * Used exclusively in dual-board weapon animation contexts.
 *
 * @typedef {ViewModel} OpposingViewModel
 */

/**
 * Game model interface providing game logic and targeting functionality.
 * Central reference for coordinate transformation and target candidate lookup.
 * Bridges weapon calculations with game state management.
 *
 * @typedef {Object} GameModel
 * @property {(effect: AoePattern, weapon: Weapon) => (Coord|null)} getTarget - Looks up impact target from effect pattern
 */

/**
 * Terrain map definition with bounds and land classification.
 * Provides grid dimensions and optional terrain type checking for collision/splash calculations.
 * Used for boundary validation and land-based weapon mechanics (Gauss, Laser).
 *
 * @typedef {Object} TerrainMap
 * @property {number} rows - Number of rows in the game board
 * @property {number} cols - Number of columns in the game board
 * @property {(row: number, col: number) => boolean} [isLand] - Optional terrain check; true if cell is land
 */

/**
 * HTML cell element references for dual-board animation choreography.
 * Used to store source and target cell elements on both primary and opposing boards.
 * Essential for synchronized cross-board animation effects like portal markers.
 *
 * @typedef {Object} DualBoardCells
 * @property {HTMLElement} sourceCell1 - Source cell on primary board (board 1)
 * @property {HTMLElement} targetCell1 - Target cell on primary board (board 1)
 * @property {HTMLElement} sourceCell2 - Source cell on opposing board (board 2)
 * @property {HTMLElement} targetCell2 - Target cell on opposing board (board 2)
 */

// ============================================================================
// Helper Constants & Utility Functions
// ============================================================================

/**
 * Normalizes weapon launch coordinates into a consistent [source, target] format.
 *
 * Accepts multiple coordinate formats and produces a standardized [[source], [target]] pair.
 * This function ensures consistent coordinate handling regardless of input format,
 * simplifying downstream weapon launch logic.
 *
 * Supported input formats:
 * - [row, col] → [[rr, cc], [row, col]]
 * - [[row, col]] → [[rr, cc], [row, col]]
 * - [[row1, col1], [row2, col2]] → [[row1, col1], [row2, col2]] (pass-through)
 *
 * @param {number[]|number[][]} coords - Raw coordinates in various formats
 * @param {number} rr - Source row coordinate (used as baseline)
 * @param {number} cc - Source column coordinate (used as baseline)
 * @returns {number[][]} Normalized coordinate pair [[sourceRow, sourceCol], [targetRow, targetCol]]
 * @throws {TypeError} If coords format is invalid or unrecognized
 * @private
 */
function normalizeWeaponCoordinates (coords, rr, cc) {
  if (!Array.isArray(coords)) {
    throw new TypeError('coords must be an array')
  }
  if (coords.length === 2 && typeof coords[0] === 'number') {
    return [[rr, cc], coords]
  }
  if (coords.length === 1 && Array.isArray(coords[0])) {
    return [[rr, cc], coords[0]]
  }
  if (
    coords.length === 2 &&
    Array.isArray(coords[0]) &&
    Array.isArray(coords[1])
  ) {
    return coords
  }
  throw new TypeError('invalid coords shape for launch coordinates')
}

// ============================================================================

/**
 * CSS class names for weapon animation state management.
 * Applied to HTML cells during animated weapon launches for visual effects.
 * Must be removed after animation completes to prevent stale hover/cursor state.
 *
 * @type {Object<string, string>}
 * @const
 * @private
 */
const CSS_CLASSES = {
  /** Applied to source cells in portal animations */
  MARKER: 'marker',
  /** Applied to target cells in portal animations */
  PORTAL: 'portal'
}

/**
 * Creates a square explosion pattern around a center point.
 *
 * Generates a 3-layer damage pattern:
 * - Layer 1: Single center cell (power: centerPower)
 * - Layer 2: 3×3 adjacent cells surrounding center (power: adjacentPower)
 * - Layer 3: Distance ring at specified radius from center (power: distancePower)
 * - Layer 4 (if radius > 1): Cardinal directions at radius+1 (power: distancePower)
 *
 * Used by Missile.boom() and GaussRound.boom() for splash damage calculations.
 * Configurable power levels allow different weapon types to have distinct explosion signatures.
 *
 * @param {number} centerRow - Explosion center row coordinate
 * @param {number} centerCol - Explosion center column coordinate
 * @param {number} radius - Explosion radius (distance from center to outer ring)
 * @param {number} [centerPower=2] - Damage power at center cell (primary impact)
 * @param {number} [adjacentPower=1] - Damage power for 3×3 adjacent cells (secondary)
 * @param {number} [distancePower=0] - Damage power for distance ring cells (tertiary)
 * @returns {AoePattern} Explosion pattern as [row, col, power] tuples
 * @private
 */
function createSquareExplosion (
  centerRow,
  centerCol,
  radius,
  centerPower = 2,
  adjacentPower = 1,
  distancePower = 0
) {
  /** @type {AoePattern} */
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
 * Animation context for dual-board weapon launch operations.
 * Bundles all necessary coordinate and rendering references for synchronized cross-board animation.
 *
 * @typedef {Object} AnimationContext
 * @property {number} sourceRow - Source row coordinate on primary board
 * @property {number} sourceCol - Source column coordinate on primary board
 * @property {ViewModel} viewModel - Primary board view model (player's perspective)
 * @property {OpposingViewModel} opposingViewModel - Opposing board view model (opponent's perspective)
 */

/**
 * Performs a dual-board weapon launch with optional animation callback.
 *
 * Routes weapon launch to launchRightTo with animation context preserved.
 * Provides unified entry point for cross-board weapon animations with flexible callback support.
 * Callback can perform custom coordinate transformation or animation sequencing before impact.
 *
 * @param {Weapon} weapon - The weapon instance being launched
 * @param {number[]|number[][]} coords - Launch target coordinates in various formats
 * @param {AnimationContext} context - Animation context containing source coords and view models
 * @param {TerrainMap} map - Game map object for bounds/terrain checking
 * @param {GameModel} gameModel - Game model object for targeting logic and candidate lookup
 * @param {(weapon: Weapon, coords: number[]|number[][], context: AnimationContext, map: TerrainMap, gameModel: GameModel) => Promise<Object>} [animationCallback] - Optional custom animation callback for coordinate transformation or effect visualization
 * @returns {Promise<Object>} Launch completion result with optional {target: Coord} property containing resolved impact location
 * @async
 * @private
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

  return await weapon.launchRightTo(coords, sourceRow, sourceCol, {
    map,
    viewModel,
    opposingViewModel,
    model: gameModel,
    launch: animationCallback
  })
}

/**
 * Adds portal CSS classes to cells for dual-board animation decoration.
 *
 * Applies marker and portal classes symmetrically across both boards for visual portal effect.
 * Marker classes signal animation source points, portal classes mark destinations.
 * Used exclusively for animation decoration; must be cleaned up afterward to avoid stale state.
 *
 * Animation decoration pattern:
 * - sourceCell1 (primary board source): MARKER class
 * - targetCell1 (primary board target): PORTAL class
 * - sourceCell2 (opposing board source): PORTAL class
 * - targetCell2 (opposing board target): MARKER class
 *
 * @param {DualBoardCells} cells - Source and target cell references on both boards
 * @returns {void}
 * @private
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
 * Removes portal CSS classes from cells after animation completion.
 *
 * Cleans up animation decoration classes to restore original cell styling and state.
 * Essential for preventing stale hover/cursor state after animation completes.
 * Removes both MARKER and PORTAL classes to fully restore cell appearance.
 *
 * @param {DualBoardCells} cells - Source and target cell references on both boards
 * @returns {void}
 * @private
 */
function removePortalClasses (cells) {
  cells.sourceCell1.classList.remove(CSS_CLASSES.MARKER)
  cells.targetCell1.classList.remove(CSS_CLASSES.PORTAL)
  cells.sourceCell2.classList.remove(CSS_CLASSES.PORTAL)
  cells.targetCell2.classList.remove(CSS_CLASSES.MARKER)
}

/**
 * Performs portal-style dual-board animation for line-based weapons.
 *
 * Visualizes weapon trajectory as portal markers (line start and end) across both boards.
 * Specifically designed for line-based weapons like RailBolt that trace infinite lines.
 * Portal markers are purely decorative and do NOT affect hit registration logic.
 *
 * Animation sequence:
 * 1. Normalize target to full infinite line endpoints via redoCoords()
 * 2. Resolve actual hit target separately for hit registration
 * 3. Apply portal markers at line endpoints
 * 4. Animate on both boards
 * 5. Remove portal markers
 *
 * @param {Weapon} weapon - The weapon instance (typically Strike-derived like RailBolt)
 * @param {number[]|number[][]} coords - Target coordinates
 * @param {AnimationContext} context - Animation context with source coords and view models
 * @param {TerrainMap} map - Game map object for line normalization
 * @param {GameModel} gameModel - Game model object for candidate target lookup
 * @returns {Promise<Object>} Animation completion result: {target: Coord} if has candidates, else {}
 * @async
 * @private
 */
async function performPortalAnimation (weapon, coords, context, map, gameModel) {
  const { sourceRow, sourceCol, viewModel, opposingViewModel } = context

  if (!opposingViewModel) {
    return await weapon.launchRightTo(coords, sourceRow, sourceCol, {
      map,
      viewModel,
      opposingViewModel,
      model: gameModel
    })
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
 * Missile - A targeted explosive weapon dealing splash damage.
 *
 * Extends Bomb with cross-board animation support for dual-board gameplay.
 * Single-target area-of-effect explosive with 3-layer splash pattern.
 *
 * Gameplay mechanics:
 * - Single click to target cell
 * - Detonates at target location
 * - 3-layer splash: center (power 2), adjacent (power 1), distance (power 0)
 * - Volatile weapon (triggers on impact)
 * - Award 2 points per successful launch
 *
 * Animation:
 * - Animates on target (shows flight path)
 * - Explodes on target with flash effect
 * - Supports cross-board animation via launchTo override
 *
 * @extends Bomb
 * @class Missile
 * @public
 */
export class Missile extends Bomb {
  /**
   * Initializes missile with configuration and targeting sequence.
   *
   * Sets up:
   * - Two-state targeting cursors for aim sequence
   * - UI button, hints, and tooltip text
   * - Splash damage pattern pre-computation
   * - Volatile flag for impact triggering
   *
   * @param {number} ammo - Number of missiles available in this instance
   * @public
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
   * Gets the audio file URL for missile flight sound effect.
   * Returns asset URL relative to this module for use during animation.
   *
   * @returns {URL} URL to missile flight sound asset (missile-flight.mp3)
   * @public
   */
  get flightSound () {
    return Weapon.getFlightSoundUrl('missile-flight.mp3', import.meta.url)
  }

  /**
   * Creates an independent clone of this missile.
   *
   * Implements weapon cloning protocol for creating new instances with independent state.
   * If ammo is omitted, uses current ammo count of original missile.
   *
   * @param {number} [ammo] - Ammo count for cloned instance (defaults to this.ammo)
   * @returns {Missile} New missile instance with specified ammo and fresh state
   * @public
   */
  clone (ammo) {
    return this.createClone(Missile, ammo)
  }

  /**
   * Normalizes launch coordinates for missile targeting.
   *
   * Maps source and first target coordinate to standard launch pair format.
   * For missiles, only the first (and usually only) target in array is used.
   *
   * @param {TerrainMap} _map - Game map (unused for missile single-target)
   * @param {number[]} baseCoords - Source coordinates [row, col]
   * @param {number[][]} targetCoords - Array of target coordinates (uses first element)
   * @returns {number[][]} Transformed coordinate pair [baseCoords, targetCoords[0]]
   * @public
   */
  redoCoords (_map, baseCoords, targetCoords) {
    return [baseCoords, targetCoords[0]]
  }

  /**
   * Calculates area-of-effect damage pattern from target coordinates.
   *
   * Delegates to inherited boom() method for standard explosion pattern.
   * For missiles, AOE is always computed at the last/primary target coordinate.
   *
   * @param {TerrainMap} _map - Game map (unused for missile)
   * @param {number[][]} coords - Target coordinates [[row, col], ...] (uses last element)
   * @returns {AoePattern} Damage cells with power levels [row, col, power]
   * @public
   */
  aoe (_map, coords) {
    if (coords.length < 1) return []
    const target = coords.at(-1)
    if (!target) return []
    const [row, col] = target
    return this.boom(row, col)
  }

  /**
   * Animates missile launch with cross-board support.
   *
   * Performs animation on both primary and opposing boards if available.
   * Routes to parent launchTo if no opposing view model exists (single-board mode).
   * Single-target missile seeks impact location and returns it for hit registration.
   *
   * Animation flow:
   * 1. Normalize target coordinate
   * 2. Animate flight on primary board
   * 3. Return resolved target for hit registration
   *
   * @async
   * @param {number[]|number[][]} coords - Target coordinates [[row, col]] or flat coordinate
   * @param {number} row - Source row coordinate
   * @param {number} col - Source column coordinate
   * @param {TerrainMap} map - Game map object
   * @param {ViewModel} viewModel - Primary view model
   * @param {OpposingViewModel} [opposingViewModel] - Optional opposing player view model
   * @returns {Promise<{target: Coord}>} Animation completion result with resolved target coordinate
   * @public
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
   * Determines turn phase for missile animation timing.
   *
   * Maps variant ID to CSS turn classes for controlling animation playback duration.
   * Different variants have different flight animation speeds for visual variety.
   *
   * Variant mapping:
   * - 0: turn3 (medium speed)
   * - 1: turn4 (slowest)
   * - 3: turn2 (fastest)
   *
   * @param {number} variant - Weapon variant identifier (0, 1, 3)
   * @param {number} _x - Column coordinate (unused for missile)
   * @param {number} _y - Row coordinate (unused for missile)
   * @returns {string} CSS turn class name ('turn4', 'turn2', 'turn3') or empty string if no mapping
   * @public
   */
  getTurn (variant, _x, _y) {
    const turnMap = {
      0: 'turn3',
      1: 'turn4',
      3: 'turn2'
    }
    return turnMap[variant] || ''
  }

  /**
   * Creates a single-missile instance for convenient quick access.
   *
   * Factory method for creating a single-ammo missile instance.
   * Commonly used in demonstrations or for weapon configuration templates.
   *
   * @static
   * @returns {Missile} Missile instance with 1 ammo
   * @public
   */
  static get single () {
    return new Missile(1)
  }
}

// ============================================================================
// RailBolt - Line-based Strike Weapon with Cross-Board Animation
// ============================================================================

/**
 * RailBolt - A two-point targeting weapon with portal-style cross-board animation.
 *
 * Extends Strike with specialized dual-animation launch sequence.
 * Displays portal markers at line endpoints for visual feedback across dual boards.
 *
 * Gameplay mechanics:
 * - Two-point targeting (click start, then end position)
 * - Traces infinite line between points
 * - Line intersection with target cells determines damage
 * - Portal markers show trajectory visualization
 * - One-and-done weapon (single use per ammo)
 *
 * Line mechanics:
 * - Full infinite line normalized across board boundaries
 * - Impact determined by target lookup via processCoords()
 * - Splash pattern based on trajectory direction
 *
 * Animation:
 * - Portal markers at line start and end
 * - Synchronized animation on both boards
 * - Markers are purely decorative, don't affect hit registration
 *
 * @extends Strike
 * @class RailBolt
 * @public
 */
export class RailBolt extends Strike {
  /**
   * Initializes rail bolt with configuration for line-based targeting.
   *
   * Sets up:
   * - Two-point targeting cursors
   * - Portal animation and line normalization support
   * - Drag-and-drop shape for placement hints
   * - Splash damage pattern configuration
   *
   * @param {number} ammo - Number of rail bolts available in this instance
   * @public
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
   * Determines turn phase for rail bolt based on geometric position.
   *
   * Complex geometric calculation for animation pacing based on position relative to trajectory line.
   * Returns different turn phases for orthogonal vs diagonal vs arbitrary offsets.
   * Enables visual variation in animation timing based on distance from line.
   *
   * Position-based mapping:
   * - (0, 0): turn4 if variant 0, else empty
   * - (0, x != 0): turn4 (on horizontal line)
   * - (y != 0, 0): turn3 (on vertical line)
   * - (y == x): turn2 (on main diagonal)
   * - (y == -x): empty (on anti-diagonal)
   * - Variant-dependent for arbitrary positions
   *
   * @param {number} variant - Weapon variant identifier (0, 1, 2, 3)
   * @param {number} x - Column offset from line origin
   * @param {number} y - Row offset from line origin
   * @returns {string} CSS turn class name ('turn4', 'turn2', 'turn3') or empty string if no mapping
   * @public
   */
  getTurn (variant, x, y) {
    if (y === 0 && x === 0) {
      return variant === 0 ? 'turn4' : ''
    }
    if (y === 0) return 'turn4'
    if (x === 0) return 'turn3'
    if (y === x) return 'turn2'
    if (y === -x) return ''
    if (variant === 0) {
      const y0 = Math.abs(y)
      const x0 = Math.abs(x)
      return x0 < y0 ? 'turn3' : 'turn4'
    }

    const d0 = Math.abs(y + x)
    const d1 = Math.abs(x - y)
    return d1 < d0 ? 'turn2' : ''
  }
  /**
   * Gets the audio file URL for rail bolt flight sound effect.
   * Distinct audio from other weapons for audio feedback variety.
   *
   * @returns {URL} URL to rail bolt flight sound asset (rail-flight.mp3)
   * @public
   */
  get flightSound () {
    return Weapon.getFlightSoundUrl('rail-flight.mp3', import.meta.url)
  }

  /**
   * Creates an independent clone of this rail bolt.
   *
   * Implements weapon cloning protocol for creating new instances with independent state.
   * If ammo is omitted, uses current ammo count of original rail bolt.
   *
   * @param {number} [ammo] - Ammo count for cloned instance (defaults to this.ammo)
   * @returns {RailBolt} New rail bolt instance with specified ammo and fresh state
   * @public
   */
  clone (ammo) {
    return this.createClone(RailBolt, ammo)
  }

  /**
   * Calculates area-of-effect with auxiliary trajectory data for splash.
   *
   * Returns affected area (cells along line) plus full line for directional splash calculation.
   * Full line enables splash() to determine direction of impact for proper damage pattern orientation.
   *
   * @param {Object} map - Game map object
   * @param {number[][]} coords - Target coordinates [[row1, col1], [row2, col2]]
   * @returns {{affectedArea: AoePattern, options: {fullLine: AoePattern}}} Effect data with complete trajectory
   * @public
   */
  aoePlus (map, coords) {
    const affectedArea = this.aoe(map, coords)
    const fullLine = affectedArea
    return { affectedArea, options: { fullLine } }
  }

  /**
   * Calculates splash/secondary damage pattern around an impact point.
   *
   * Creates cross-shaped splash pattern with directional forward/backward damaging cells.
   * Splash direction determined by impact position relative to full line trajectory.
   * At line start: forward cells receive damage. At end: backward cells receive damage.
   *
   * Pattern structure:
   * - Impact cell: power 2 (primary)
   * - Orthogonal adjacent: power 0
   * - Directional cell: power 1 (secondary forward/backward)
   * - Directional adjacent cells: power 0
   *
   * @param {TerrainMap} map - Game map (unused in RailBolt, used in subclasses)
   * @param {Coord} resolvedTarget - Impact coordinate [row, col]
   * @param {AoePattern} effect - Damage effect coordinates (full trajectory line)
   * @param {{fullLine: AoePattern}} options - Additional options with trajectory line
   * @returns {AoePattern} Splash pattern [row, col, power] tuples
   * @public
   */
  splash (map, resolvedTarget, effect, options) {
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
      if (idx >= 0) {
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
   * Initiates rail bolt launch with coordinate transformation.
   *
   * Routes to launchWithDualBoardAnimation for portal-style animation.
   * Displays portal markers at line start and end for visual trajectory feedback.
   *
   * Launch sequence:
   * 1. Normalize target to infinite line via redoCoords()
   * 2. Perform portal animation with markers at line endpoints
   * 3. Return resolved target for hit registration
   *
   * @async
   * @param {number[][]} coords - Target coordinates [[startRow, startCol], [endRow, endCol]]
   * @param {number} sourceRow - Source row coordinate
   * @param {number} sourceCol - Source column coordinate
   * @param {TerrainMap} map - Game map object for line normalization
   * @param {ViewModel} viewModel - Primary view model
   * @param {OpposingViewModel} [opposingViewModel] - Optional opposing player view model
   * @param {GameModel} [gameModel] - Optional game model for candidate target lookup
   * @returns {Promise<{target: Coord}|{}>} Animation result with resolved target or empty object
   * @public
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
   * Creates a single-rail-bolt instance for convenient quick access.
   *
   * Factory method for creating a single-ammo rail bolt instance.
   * Commonly used in demonstrations or for weapon configuration templates.
   *
   * @static
   * @returns {RailBolt} RailBolt instance with 1 ammo
   * @public
   */
  static get single () {
    return new RailBolt(1)
  }
}

// ============================================================================
// GaussRound - Projectile with Land Detection
// ============================================================================

/**
 * GaussRound - A projectile weapon with land collision detection.
 *
 * Extends Fish with land-detection trajectory and dual-animation launch.
 * Implements crash damage mechanics on terrain collision with secondary splash patterns.
 * Projectile stops when hitting land boundaries; alternate to Laser for land physics.
 *
 * Gameplay mechanics:
 * - Two-point targeting (click source, then target)
 * - Detects terrain collision via map.isLand() checks
 * - Crash damage on land contact instead of splash
 * - Portal animation from source on both boards
 * - One-and-done weapon (single use per ammo)
 *
 * Damage patterns:
 * - Primary splash: 3-layer square (power 2, 1, 0)
 * - Crash splash: orthogonal (power 1), diagonals/distance 2 (power 0)
 *
 * Animation:
 * - Portal markers appear at source on both boards
 * - Animated flight from source to impact
 * - Supports cross-board dual-board rendering
 *
 * @extends Fish
 * @class GaussRound
 * @public
 */
export class GaussRound extends Fish {
  /**
   * Initializes Gauss round with land-detection projectile configuration.
   *
   * Sets up:
   * - Two-point targeting cursors
   * - Land-collision detection and crash mechanics
   * - Dual-animation launch with portal effects
   * - Drag-and-drop shape for placement hints
   * - Both splash and crash damage patterns
   *
   * @param {number} ammo - Number of Gauss rounds available in this instance
   * @public
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
   * Performs Gauss round dual-board animation with source portal effects.
   *
   * Animates from source on opposing board to target on primary board,
   * then from source on primary board to target on primary board.
   * Portal markers appear at source coordinates on both boards (not line endpoints like RailBolt).
   *
   * Animation sequence:
   * 1. Process coordinates through game model for target lookup
   * 2. Apply portal CSS classes to source cells on both boards
   * 3. Clear cell state (friendly markers, etc)
   * 4. Animate on both boards
   * 5. Remove portal markers and restore cell state
   *
   * @async
   * @param {number[][]} coords - Target coordinates [[startRow, startCol], [endRow, endCol]]
   * @param {number} sourceRow - Source row coordinate (portal source on both boards)
   * @param {number} sourceCol - Source column coordinate (portal source on both boards)
   * @param {TerrainMap} map - Game map object
   * @param {ViewModel} viewModel - Primary view model
   * @param {OpposingViewModel} opposingViewModel - Opposing view model
   * @param {GameModel} gameModel - Game model for target lookup
   * @returns {Promise<{target: Coord}|{}>} Animation result with resolved target or empty object
   * @private
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
      return await this.launchRightTo(coords, sourceRow, sourceCol, {
        map,
        viewModel,
        opposingViewModel,
        model: gameModel
      })
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
   *
   * Allows game model to transform target location based on game state.
   * Returns source, resolved target, and flag indicating candidate availability.
   * Used for coordinate normalization and hit registration validation.
   *
   * @param {TerrainMap} map - Game map object
   * @param {number[]} _sourceCoords - Source coordinates [row, col] (extracted via destructuring)
   * @param {number[]|number[][]} coords - Target coordinates [row, col]
   * @param {GameModel} model - Game model for target lookup
   * @returns {[number[], Coord, boolean]} Tuple with [source, resolvedTarget, hasCandidates]
   * @private
   */
  processCoords (map, [rr, cc], coords, model) {
    const normalizedCoords = normalizeWeaponCoordinates(coords, rr, cc)
    const effect = this.aoe(map, normalizedCoords)
    const t = model.getTarget(effect, this)
    const list = this.redoCoords(map, [rr, cc], normalizedCoords)
    if (t) {
      const source = list[0]
      return [source, t, true]
    }
    return list
  }
  /**
   * Determines turn phase for Gauss round animation timing.
   *
   * Maps variant ID to CSS turn classes for controlling animation playback duration.
   * Limited variants compared to other weapons; asymmetric variants animate faster.
   *
   * Variant mapping:
   * - 1: turn2 (fast)
   * - 3: turn2 (fast)
   *
   * @param {number} variant - Weapon variant identifier (1, 3)
   * @param {number} _x - Column coordinate (unused for Gauss round)
   * @param {number} _y - Row coordinate (unused for Gauss round)
   * @returns {string} CSS turn class name ('turn2') or empty string if no mapping
   * @public
   */
  getTurn (variant, _x, _y) {
    const turnMap = {
      1: 'turn2',
      3: 'turn2'
    }
    return turnMap[variant] || ''
  }

  /**
   * Creates an independent clone of this Gauss round.
   *
   * Implements weapon cloning protocol for creating new instances with independent state.
   * If ammo is omitted, uses current ammo count of original Gauss round.
   *
   * @param {number} [ammo] - Ammo count for cloned instance (defaults to this.ammo)
   * @returns {GaussRound} New Gauss round instance with specified ammo and fresh state
   * @public
   */
  clone (ammo) {
    return this.createClone(GaussRound, ammo)
  }

  /**
   * Gets the audio file URL for Gauss round flight sound effect.
   * Distinct audio from Laser for weapon feedback variety.
   *
   * @returns {URL} URL to Gauss round flight sound asset (gauss-flight.mp3)
   * @public
   */
  get flightSound () {
    return new URL('../sounds/gauss-flight.mp3', import.meta.url)
  }

  /**
   * Computes blast radius pattern from explosion center.
   *
   * Creates expanding square pattern via createSquareExplosion with radius 2.
   * Generates 3-layer splash: center, 3×3 adjacent, distance ring.
   *
   * @param {number} centerRow - Explosion center row
   * @param {number} centerCol - Explosion center column
   * @returns {AoePattern} Damage pattern as [row, col, power] tuples
   * @public
   */
  boom (centerRow, centerCol) {
    return createSquareExplosion(centerRow, centerCol, 2)
  }

  /**
   * Calculates area-of-effect along the Gauss round's land-stopping path.
   *
   * Inherits land-detection from Fish parent class.
   * Adds penetration distance (2) for crash mechanics calculation.
   * Stops at land boundaries (map.isLand check) with optional penetration.
   *
   * @param {TerrainMap} map - Game map for bounds/terrain checking
   * @param {number[][]} coords - Source and Target coordinates [[startRow, startCol], [endRow, endCol]]
   * @returns {AoePattern} Cells along trajectory path with damage power [row, col, power]
   * @public
   */
  aoe (map, coords) {
    const effect = this.aoeRaw(map, coords, 2, 1)
    //     this.crashLoc =
    //  landCollisionIndex >= 0 ? trajectoryLine[landCollisionIndex] : null

    return effect
  }
  /**
   * Calculates area-of-effect with auxiliary data for splash and crash calculations.
   *
   * Returns affected area plus full line and crash location for damage determination.
   * Crash location enables proper crash splash pattern application on terrain collision.
   * Full line provides trajectory information for directional splash calculations.
   *
   * @param {TerrainMap} map - Game map object
   * @param {number[][]} coords - Target coordinates [[row1, col1], [row2, col2]]
   * @returns {{affectedArea: AoePattern, options: {crashLoc: (Coord|null), fullLine: AoePattern}}} Effect data with trajectory info
   * @public
   */
  aoePlus (map, coords) {
    const affectedArea = this.aoe(map, coords)
    const crashLoc = affectedArea.length > 0 ? affectedArea.at(-1) : null
    const fullLine = this.aoeFull(coords)
    return { affectedArea, options: { crashLoc, fullLine } }
  }

  /**
   * Calculates splash/secondary damage pattern around an impact point.
   *
   * Creates directional splash based on trajectory position (start, middle, end).
   * At trajectory start: forward cells receive damage. At end: backward cells receive damage.
   * Middle positions: symmetrical secondary damage pattern.
   *
   * Impact cell always receives power 2. Directional cells receive power 1.
   * Perpendicular cells and distance cells receive power 0.
   *
   * @param {TerrainMap} _map - Game map (unused)
   * @param {Coord} resolvedTarget - Impact coordinate [row, col]
   * @param {AoePattern} effect - Damage effect coordinates along trajectory
   * @param {{fullLine: AoePattern}} options - Additional options with full trajectory line
   * @returns {AoePattern} Splash pattern [row, col, power] tuples
   * @public
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
   * Calculates crash splash damage pattern around a terrain collision point.
   *
   * Applied when Gauss round hits terrain boundary with no targets registered.
   * Creates symmetric pattern optimized for land collision physics.
   *
   * Pattern structure:
   * - Orthogonal adjacent cells (power 1): direct contact damage
   * - Diagonal adjacent cells (power 0): minimal splash
   * - Distance 2 cells (power 0): edge effect
   *
   * @param {TerrainMap} map - Game map for bounds checking
   * @param {Coord} target - Impact coordinate [row, col]
   * @param {AoePattern} _effect - Damage effect coordinates (unused)
   * @param {Object} _options - Additional options (unused)
   * @returns {AoePattern} Crash splash pattern [row, col, power] tuples
   * @public
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
   * Initiates Gauss round launch with coordinate transformation.
   *
   * Routes to launchRightTo for coordinate processing before dual-animation launch.
   * Portal markers appear at source coordinates on both boards for visual feedback.
   *
   * Launch sequence:
   * 1. Transform coordinates through game model
   * 2. Perform Gauss animation with portal effects at source
   * 3. Return resolved target for hit registration
   *
   * @async
   * @param {number[][]} coords - Target coordinates [[startRow, startCol], [endRow, endCol]]
   * @param {number} sourceRow - Source row coordinate
   * @param {number} sourceCol - Source column coordinate
   * @param {TerrainMap} map - Game map object
   * @param {ViewModel} viewModel - Primary view model
   * @param {OpposingViewModel} [opposingViewModel] - Optional opposing player view model
   * @param {GameModel} [gameModel] - Optional game model for coordinate transformation
   * @returns {Promise<{target: Coord}|{}>} Animation result with resolved target or empty object
   * @override
   * @public
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
   * Creates a single-GaussRound instance for convenient quick access.
   *
   * Factory method for creating a single-ammo Gauss round instance.
   * Commonly used in demonstrations or for weapon configuration templates.
   *
   * @static
   * @returns {GaussRound} GaussRound instance with 1 ammo
   * @public
   */
  static get single () {
    return new GaussRound(1)
  }
}

/**
 * Laser - A projectile weapon with identical mechanics to Gauss rounds.
 *
 * Extends Fish with land-detection trajectory and dual-animation launch.
 * Implements identical crash damage mechanics and patterns to GaussRound.
 * Uses different visual/audio assets for weapon variety.
 *
 * Gameplay mechanics:
 * - Two-point targeting (click source, then target)
 * - Detects terrain collision via map.isLand() checks
 * - Crash damage on land contact identical to Gauss rounds
 * - Portal animation from source on both boards
 * - One-and-done weapon (single use per ammo)
 *
 * Damage patterns:
 * - Primary splash: 3-layer square (identical to Gauss)
 * - Crash splash: orthogonal (power 1), diagonals/distance 2 (power 0)
 *
 * Differences from Gauss:
 * - Visual representation as '!' instead of '^'
 * - Flight sound: laser-flight.mp3 instead of gauss-flight.mp3
 * - All gameplay mechanics identical; functionally interchangeable
 *
 * @extends Fish
 * @class Laser
 * @public
 */
export class Laser extends Fish {
  /**
   * Initializes Laser with identical configuration to Gauss rounds.
   *
   * Sets up:
   * - Two-point targeting cursors
   * - Land-collision detection and crash mechanics (identical to Gauss)
   * - Dual-animation launch with portal effects
   * - Drag-and-drop shape for placement hints
   * - Both splash and crash damage patterns (identical to Gauss)
   *
   * @param {number} ammo - Number of Laser Blasts available in this instance
   * @public
   */
  constructor (ammo) {
    super(ammo, 'Laser Blast', '!')

    // Cursor configuration for targeting sequence
    this.cursors = ['llaunch', 'reticule']
    this.launchCursor = 'llaunch'
    this.isOneAndDone = true
    this.postSelectCursor = 1
    this.postSelectCoords = 1
    this.postSelectShadow = true
    this.totalCursors = 2

    // Display and scoring configuration
    this.plural = 'Laser Blasts'
    this.givesHint = true
    this.hasShadowAtHint = true
    this.crashOverSplash = false
    this.canCrash = true
    this.hasWake = false
    this.splashType = undefined

    // Weapon behavior configuration
    this._applyWeaponConfig({
      hints: [
        'Click on square to start laser blast',
        'Click on square aim laser blast'
      ],
      buttonHtml: '<span class="shortcut">L</span>aser Blast',
      tip: 'drag a laser blast on to the map to increase the number of times you can strike',
      tag: 'laser-blast',
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
    // Tracks crash location when laser hits land
    this.crashLoc = null
  }
  /**
   * Determines turn phase for laser animation timing.
   *
   * Maps variant ID to CSS turn classes for controlling animation playback duration.
   * Different variants have different flight animation speeds for visual variety.
   *
   * Variant mapping:
   * - 0: turn2 (fast)
   * - 1: turn3 (medium)
   * - 2: turn4 (slow)
   * - 3: empty (no animation adjustment)
   *
   * @param {number} variant - Weapon variant identifier (0, 1, 2, 3)
   * @param {number} _x - Column coordinate (unused for laser)
   * @param {number} _y - Row coordinate (unused for laser)
   * @returns {string} CSS turn class name ('turn4', 'turn2', 'turn3') or empty string if no mapping
   * @public
   */
  getTurn (variant, _x, _y) {
    const turnMap = {
      0: 'turn2',
      1: 'turn3',
      2: 'turn4'
    }
    return turnMap[variant] || ''
  }

  /**
   * Creates an independent clone of this Laser.
   *
   * Implements weapon cloning protocol for creating new instances with independent state.
   * If ammo is omitted, uses current ammo count of original Laser.
   *
   * @param {number} [ammo] - Ammo count for cloned instance (defaults to this.ammo)
   * @returns {Laser} New Laser instance with specified ammo and fresh state
   * @public
   */
  clone (ammo) {
    return this.createClone(Laser, ammo)
  }

  /**
   * Gets the audio file URL for Laser blast flight sound effect.
   * Distinct audio from Laser blast  for weapon feedback variety.
   *
   * @returns {URL} URL to Laser blast flight sound asset (laser-flight.mp3)
   * @override
   * @public
   */
  get flightSound () {
    return new URL('../sounds/laser-flight.mp3', import.meta.url)
  }

  /**
   * Creates a single-Laser-blast instance for convenient quick access.
   *
   * Factory method for creating a single-ammo Laser instance.
   * Commonly used in demonstrations or for weapon configuration templates.
   *
   * @static
   * @returns {Laser} Laser instance with 1 ammo
   * @public
   */
  static get single () {
    return new Laser(1)
  }
}

// ============================================================================
// Scan - Pie-segment Scanning Weapon
// ============================================================================

/**
 * Scan - A detection/scanning weapon generating pie-segment patterns.
 *
 * Extends Sensor for radar-like sweep visualization with sweep animation.
 * Used for terrain scanning and reconnaissance with two-point targeting sweep.
 * Supports cross-board dual-board rendering for full game board coverage.
 *
 * Gameplay mechanics:
 * - Two-point targeting for sweep arc
 * - Generates pie-segment detection pattern
 * - Non-lethal (detection/scanning only)
 * - Reusable weapon (not one-and-done)
 *
 * Animation:
 * - Dish-shaped sweep visualization
 * - Sweep animation between two points
 * - Used for reconnaissance and target identification
 *
 * @extends Sensor
 * @class Scan
 * @public
 */
export class Scan extends Sensor {
  /**
   * Initializes radar scan with configuration for detection sweep.
   *
   * Sets up:
   * - Two-point targeting sweep with pie-segment pattern
   * - Non-lethal detection mechanics
   * - Reusable weapon configuration
   * - UI button and hint text
   *
   * @param {number} ammo - Number of scans available
   * @public
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
   * Creates an independent clone of this scan.
   *
   * Implements weapon cloning protocol for creating new instances with independent state.
   * If ammo is omitted, uses current ammo count of original scan.
   *
   * @param {number} [ammo] - Ammo count for cloned instance (defaults to this.ammo)
   * @returns {Scan} New scan instance with specified ammo and fresh state
   * @override
   * @public
   */
  clone (ammo) {
    return this.createClone(Scan, ammo)
  }
}

// ============================================================================
// Weapon Catalogue - Space Terrain Weapons Export
// ============================================================================

/**
 * Pre-configured catalogue of space terrain weapons.
 *
 * Provides standard loadout with one of each primary space weapon type.
 * Used as the main weapon arsenal for space terrain battles.
 * Includes all major weapon systems: explosives, line weapons, and projectiles.
 *
 * Weapons included:
 * - Missile: Single-target area-of-effect explosive
 * - RailBolt: Line-based strike weapon with portal animation
 * - GaussRound: Land-detecting projectile with crash mechanics
 *
 * Note: Laser blasts and Scan weapons can be added separately to create variant loadouts.
 *
 * @type {WeaponCatalogue}
 * @const
 */
export const spaceWeaponsCatalogue = new WeaponCatalogue([
  new Missile(1),
  new RailBolt(1),
  new GaussRound(1)
])

/**
 * Adds a coordinate tuple into an indexed bracket for fast deduplication lookup.
 *
 * Stores coordinate data keyed by its string representation for O(1) lookup.
 * Enables efficient merging of overlapping damage patterns without iteration.
 * Essential for combining multiple AOE patterns from different sources.
 *
 * @param {CoordBracket} bracket - Coordinate dictionary keyed by string ID via coordToKey()
 * @param {AoeCell} coord - Coordinate tuple [row, col, power]
 * @returns {void}
 * @private
 */
function addCoord (bracket, coord) {
  bracket[coordToKey(...coord)] = coord
}

/**
 * Adds or upgrades a coordinate in a bracket using offset and power value.
 *
 * Updates the bracket with new coordinates at offset position.
 * Preferring higher power values for same cell to prevent power degradation.
 * Essential for merging overlapping damage patterns without losing information.
 *
 * Logic:
 * - Calculates new coordinate by applying offset to base
 * - Checks if coordinate already exists in bracket
 * - If exists and new power is higher: upgrades to new power
 * - If exists and new power is lower: preserves existing higher power
 * - If not exists: adds new coordinate
 *
 * @param {CoordBracket} bracket - Coordinate dictionary keyed by string ID
 * @param {AoeCell} coord - Base coordinate tuple [row, col, power]
 * @param {[number, number]} offset - Offset [rowDelta, colDelta] to apply to base
 * @param {number} power - Power value for the new coordinate at offset
 * @returns {void}
 * @private
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
