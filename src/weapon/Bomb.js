import { RectListCanvas } from '../grid/rectangle/rectListCanvas.js'
import { drawPie } from '../grid/maskShape.js'
import { Weapon } from './Weapon.js'

/**
 * @typedef {[number, number]} Coord - A coordinate tuple [row, column]
 * @typedef {[number, number, number]} AoeCell - An area-of-effect cell [row, column, power]
 * @typedef {AoeCell[]} AoePattern - Array of area-of-effect cells with power values
 * @typedef {{ x0: number, y0: number, x1: number, y1: number }} LineIntercepts - Canvas line intercept points
 * @typedef {{ inBounds: (row: number, col: number) => boolean, isLand?: (row: number, col: number) => boolean, randomEdge?: Function }} MapLike - Game map interface for bounds/terrain checking
 * @typedef {(row: number, col: number) => boolean} TerrainCheck - Terrain validation function for filtering cells
 * @typedef {[number, number]} DirectionOffset - A direction offset [rowOffset, colOffset]
 */

/**
 * Cardinal direction offsets for orthogonal movement (up, down, left, right).
 * Used to identify 4-connected adjacent cells in grid patterns.
 * Format: [rowOffset, colOffset]
 * @type {DirectionOffset[]}
 * @constant
 * @private
 */
const CARDINAL_OFFSETS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
]

/**
 * Diagonal direction offsets for 8-connected movement (four corners).
 * Used to identify diagonal neighbors in grid patterns.
 * Format: [rowOffset, colOffset]
 * @type {DirectionOffset[]}
 * @constant
 * @private
 */
const DIAGONAL_OFFSETS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1]
]

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Weapon configuration registry for all weapon types.
 * Each configuration object defines visual, animation, and gameplay properties
 * for a specific weapon variant (Bomb, Strike, Fish, Sensor).
 *
 * Configuration properties:
 * - cursors {string[]} - Available cursor names for weapon selection
 * - splashSize {number} - Radius of explosion/effect splash
 * - hasFlash {boolean} - Whether weapon has flash animation on impact
 * - nonAttached {boolean} - Whether weapon is non-attached (separate from ship)
 * - animateOnTarget {boolean} - Whether animation plays on target hit
 * - explodeOnTarget {boolean} - Whether explosion triggers on target
 * - explodeOnSplash {boolean} - Whether explosion triggers on splash
 * - splashType {string} - Type of splash (e.g., 'air', 'sea')
 * - splashPower {number} - Damage power of splash effect
 * - isOneAndDone {boolean} - Whether weapon activates in single shot
 * - animateOffsetY {number} - Y-axis offset for animation
 * - dragShape {[number, number, number][]} - Weapon shape for drag/placement
 *
 * @type {Object.<string, Object>}
 * @constant
 * @private
 */
const WEAPON_CONFIGS = {
  BOMB: {
    cursors: ['bomb'],
    splashSize: 2.7,
    hasFlash: true,
    nonAttached: true,
    animateOnTarget: true,
    explodeOnTarget: true,
    animateOffsetY: 50,
    dragShape: [
      [0, 0, 0],
      [0, 1, 0],
      [0, 2, 0],
      [1, 0, 0],
      [1, 1, 1],
      [1, 2, 0],
      [2, 0, 0],
      [2, 1, 0],
      [2, 2, 0]
    ]
  },
  STRIKE: {
    cursors: ['launcher', 'strike'],
    splashSize: 1.8,
    hasFlash: true,
    nonAttached: true,
    animateOnTarget: true,
    explodeOnTarget: false,
    explodeOnSplash: true,
    splashType: 'air',
    splashPower: 0,
    isOneAndDone: true,
    dragShape: [
      [0, 0, 1],
      [0, 1, 0],
      [0, 2, 0],
      [0, 3, 0],
      [0, 4, 1]
    ]
  },
  FISH: {
    cursors: ['fish', 'periscope'],
    splashSize: 2.2,
    hasFlash: false,
    nonAttached: true,
    animateOnTarget: true,
    explodeOnSplash: true,
    splashType: 'sea',
    splashPower: 1,
    isOneAndDone: true,
    dragShape: [
      [1, 0, 1],
      [1, 1, 0],
      [1, 2, 0],
      [0, 3, 0],
      [2, 3, 0]
    ]
  },
  SENSOR: {
    cursors: ['dish', 'sweep'],
    isOneAndDone: false,
    hasFlash: false,
    dragShape: [
      [2, 0, 1],
      [1, 1, 0],
      [2, 1, 0],
      [2, 2, 0],
      [0, 2, 0],
      [1, 2, 1],
      [1, 3, 0]
    ]
  }
}

// ============================================================================
// Shared Utility - Configuration Application
// ============================================================================

// ============================================================================
// Utility Functions - Canvas Drawing Operations
// ============================================================================

/**
 * Gets intercept points for a line segment on the canvas
 * Converts row/column coordinates to canvas x/y intercepts.
 * @param {number} row1 - Starting row coordinate
 * @param {number} col1 - Starting column coordinate
 * @param {number} row2 - Ending row coordinate
 * @param {number} col2 - Ending column coordinate
 * @param {MapLike} map - Game map for intercept calculation
 * @returns {LineIntercepts} Intercept points { x0, y0, x1, y1 }
 * @public
 */
export function getIntercepts (row1, col1, row2, col2, map) {
  // @ts-ignore - BhMapList accepts BattleMap which has cols/rows; MapLike is compatible at runtime
  const points = RectListCanvas.BhMapList(map)
  // @ts-ignore - RectListCanvas.intercepts returns Object matching LineIntercepts at runtime
  return points.intercepts(col1, row1, col2, row2)
}

/**
 * Gets points along an infinite line (extended beyond segment endpoints)
 * Converts canvas coordinates to row/column and returns power-tagged cells.
 * Extends the line infinitely in both directions.
 * @param {number} row1 - Starting row coordinate
 * @param {number} col1 - Starting column coordinate
 * @param {number} row2 - Ending row coordinate
 * @param {number} col2 - Ending column coordinate
 * @param {number} power - Power level for cells
 * @returns {AoePattern} Array of [row, column, power] tuples
 * @public
 */
export function getExtendedLinePoints (row1, col1, row2, col2, power, map) {
  const points = RectListCanvas.BhMapList(map)
  points.drawLineInfinite(col1, row1, col2, row2, power)
  return points.list.map(([x, y, p]) => [y, x, p || power])
}

/**
 * Gets points along a ray (from start point through end point)
 * Creates a line from start coordinates through end coordinates.
 * @param {number} row1 - Starting row coordinate
 * @param {number} col1 - Starting column coordinate
 * @param {number} row2 - Ending row coordinate
 * @param {number} col2 - Ending column coordinate
 * @param {number} power - Power level for cells
 * @returns {AoePattern} Array of [row, column, power] tuples
 * @public
 */
export function getLinePoints (row1, col1, row2, col2, power, map) {
  const points = RectListCanvas.BhMapList(map)
  points.drawRay(col1, row1, col2, row2, power)
  return points.list.map(([x, y, p]) => [y, x, p || power])
}

/**
 * Gets points within a pie-segment (swept area) from center to target
 * Creates a sector-shaped area for scanning/detection weapons.
 * @param {number} centerCol - Center column (x coordinate)
 * @param {number} centerRow - Center row (y coordinate)
 * @param {number} targetCol - Target column (x coordinate)
 * @param {number} targetRow - Target row (y coordinate)
 * @param {number} [radius=4] - Radius of the pie segment in cells
 * @param {number} [spreadDeg=22.5] - Spread angle in degrees (±half spread)
 * @returns {AoePattern} Array of [row, column, power] tuples
 * @public
 */
export function getPieSegmentCells (
  centerCol,
  centerRow,
  targetCol,
  targetRow,
  radius = 4,
  spreadDeg = 22.5
) {
  const points = RectListCanvas.BhMapList()
  drawPie(
    centerCol,
    centerRow,
    targetCol,
    targetRow,
    radius,
    points,
    spreadDeg,
    1
  )
  return points.list.map(([x, y, p]) => [y, x, p || 1])
}
// ============================================================================
// Shared Helper Functions - Effect Pattern Calculations
// ============================================================================

/**
 * Checks whether a map cell is valid for inclusion in an effect pattern.
 * Validates both bounds and terrain constraints using map bounds checking
 * and optional terrain validation function.
 * @param {MapLike|null} map - Game map for bounds checking (null/undefined skips bounds check)
 * @param {number} row - Cell row coordinate
 * @param {number} col - Cell column coordinate
 * @param {TerrainCheck|null} [terrainCheck=null] - Optional terrain validation function
 * @returns {boolean} True if the cell is in bounds and passes terrain check, false otherwise
 * @private
 */
function isValidCell (map, row, col, terrainCheck = null) {
  const noMapCheck = map == null
  const inBounds = noMapCheck || map.inBounds(row, col)
  const terrainOk = !terrainCheck || terrainCheck(row, col)
  return inBounds && terrainOk
}

/**
 * Adds a single cell to an effect pattern if valid.
 * Only adds if the cell passes bounds and terrain checks using isValidCell.
 * Mutates the provided effectPattern array by appending validated cell.
 * @param {MapLike|null} map - Game map for bounds checking
 * @param {number} row - Cell row coordinate
 * @param {number} col - Cell column coordinate
 * @param {number} power - Damage power value for the cell [row, col, power]
 * @param {AoePattern} effectPattern - Pattern array to accumulate into
 * @param {TerrainCheck|null} [terrainCheck=null] - Optional terrain validation function
 * @returns {AoePattern} Updated effect pattern (same object reference)
 * @public
 */
export function addCellToEffect (
  map,
  row,
  col,
  power,
  effectPattern,
  terrainCheck = null
) {
  if (isValidCell(map, row, col, terrainCheck)) {
    effectPattern.push([row, col, power])
  }
  return effectPattern
}

/**
 * Adds cells in a set of direction offsets to an effect pattern.
 * Applies radius multiplier to each direction vector, then adds resulting cells.
 * Supports optional terrain filtering via options parameter.
 * @param {MapLike|null} map - Game map for bounds checking
 * @param {number} centerRow - Center row coordinate
 * @param {number} centerCol - Center column coordinate
 * @param {number} power - Damage power for added cells
 * @param {AoePattern} effectPattern - Pattern array to accumulate into
 * @param {DirectionOffset[]} directions - Direction offset vectors [rowOffset, colOffset]
 * @param {Object} [options] - Optional configuration object
 * @param {TerrainCheck|null} [options.terrainCheck=null] - Optional terrain validation function
 * @param {number} [options.radius=1] - Offset multiplier for direction vectors
 * @returns {AoePattern} Updated effect pattern (same object reference)
 * @private
 */
function addDirectionalCells (
  map,
  centerRow,
  centerCol,
  power,
  effectPattern,
  directions,
  options = {}
) {
  const { terrainCheck = null, radius = 1 } = options
  directions.forEach(([rowOffset, colOffset]) => {
    addCellToEffect(
      map,
      centerRow + radius * rowOffset,
      centerCol + radius * colOffset,
      power,
      effectPattern,
      terrainCheck
    )
  })
  return effectPattern
}

/**
 * Adds orthogonal (cardinal) neighbors to an effect pattern.
 * Adds cells in up, down, left, right directions at specified radius multiplier.
 * Uses CARDINAL_OFFSETS for consistent direction vectors.
 * @param {MapLike|null} map - Game map for bounds checking
 * @param {number} centerRow - Center row coordinate
 * @param {number} centerCol - Center column coordinate
 * @param {number} power - Damage power for added cells
 * @param {AoePattern} effectPattern - Pattern array to accumulate into
 * @param {TerrainCheck|null} [terrainCheck=null] - Optional terrain validation function
 * @param {number} [radius=1] - Distance multiplier for orthogonal neighbors
 * @returns {AoePattern} Updated effect pattern (same object reference)
 * @public
 */
export function addOrthogonalNeighbors (
  map,
  centerRow,
  centerCol,
  power,
  effectPattern,
  terrainCheck = null,
  radius = 1
) {
  return addDirectionalCells(
    map,
    centerRow,
    centerCol,
    power,
    effectPattern,
    CARDINAL_OFFSETS,
    { terrainCheck, radius }
  )
}

/**
 * Adds diagonal neighbors to an effect pattern.
 * Adds cells in four diagonal directions (NW, NE, SW, SE).
 * Uses DIAGONAL_OFFSETS for consistent diagonal vectors.
 * @param {MapLike|null} map - Game map for bounds checking
 * @param {number} centerRow - Center row coordinate
 * @param {number} centerCol - Center column coordinate
 * @param {number} power - Damage power for added cells
 * @param {AoePattern} effectPattern - Pattern array to accumulate into
 * @param {TerrainCheck|null} [terrainCheck=null] - Optional terrain validation function
 * @returns {AoePattern} Updated effect pattern (same object reference)
 * @public
 */
export function addDiagonalNeighbors (
  map,
  centerRow,
  centerCol,
  power,
  effectPattern,
  terrainCheck = null
) {
  return addDirectionalCells(
    map,
    centerRow,
    centerCol,
    power,
    effectPattern,
    DIAGONAL_OFFSETS,
    { terrainCheck }
  )
}

/**
 * Adds cells using explicit direction offsets and power values.
 * Each direction specification includes its own power value for fine-grained control.
 * Useful for custom patterns that don't follow standard orthogonal/diagonal grids.
 * @param {MapLike|null} map - Game map for bounds checking
 * @param {number} centerRow - Center row coordinate
 * @param {number} centerCol - Center column coordinate
 * @param {AoePattern} effectPattern - Pattern array to accumulate into
 * @param {AoeCell[]} directions - Offsets with power values [[rowOffset, colOffset, power], ...]
 * @param {TerrainCheck|null} [terrainCheck=null] - Optional terrain validation function
 * @returns {AoePattern} Updated effect pattern (same object reference)
 * @public
 */
export function addNeighborList (
  map,
  centerRow,
  centerCol,
  effectPattern,
  directions,
  terrainCheck = null
) {
  directions.forEach(([rowOffset, colOffset, power]) => {
    addCellToEffect(
      map,
      centerRow + rowOffset,
      centerCol + colOffset,
      power,
      effectPattern,
      terrainCheck
    )
  })
  return effectPattern
}
/**
 * Creates a splash effect pattern around a center point.
 * Adds center cell with full power, then orthogonal neighbors with same power.
 * Useful for creating symmetric cross-shaped damage patterns.
 * @param {MapLike|null} map - Game map for bounds checking
 * @param {Coord} centerCoords - Center coordinates [row, col]
 * @param {number} power - Damage power for all cells in splash
 * @param {TerrainCheck|null} [terrainCheck=null] - Optional terrain validation function
 * @returns {AoePattern} Splash effect pattern with center + orthogonal cells
 * @public
 */
export function createSplashEffect (
  map,
  centerCoords,
  power,
  terrainCheck = null
) {
  const [centerRow, centerCol] = centerCoords
  const effectPattern = /** @type {AoePattern} */ ([
    [centerRow, centerCol, power]
  ])
  addOrthogonalNeighbors(
    map,
    centerRow,
    centerCol,
    power,
    effectPattern,
    terrainCheck
  )
  return effectPattern
}

/**
 * Calculates area-of-effect along a line with optional power and terrain filtering.
 * Supports terrain-based stopping (e.g., land boundaries) with optional penetration.
 * Uses specified line calculation function for flexibility (infinite, ray, segment).
 * Handles invalid/degenerate coordinate input gracefully by logging and returning empty.
 * @param {number[][]} coords - Two-point coordinates [[startRow, startCol], [endRow, endCol]]
 * @param {number} [power=1] - Power level for damage cells
 * @param {(row1: number, col1: number, row2: number, col2: number, power: number, map: MapLike|null) => AoePattern} [lineFunction=getExtendedLinePoints] - Function to calculate line points
 * @param {TerrainCheck|null} [terrainFilter=null] - Optional terrain filter (stops at first match)
 * @param {number} [penetration=0] - Number of cells beyond filter to include
 * @returns {AoePattern} Cells along the line with damage power
 * @private
 */
function calculateLineAreaOfEffect (
  coords,
  power = 1,
  lineFunction = getExtendedLinePoints,
  terrainFilter = null,
  penetration = 0,
  map = null
) {
  // Defensive: ensure coords is a pair of coordinates
  if (!coords || !Array.isArray(coords) || coords.length < 2) {
    // log and return empty effect when called with invalid input
    // callers should pass [[r1,c1],[r2,c2]]; avoid throwing in UI runtime
    // to prevent breaking animations
    console.warn('calculateLineAreaOfEffect called with invalid coords', coords)
    return []
  }

  const [row1, col1] = coords[0]
  const [row2, col2] = coords[1]
  let line = lineFunction(row1, col1, row2, col2, power, map)

  if (terrainFilter) {
    const stopIndex = line.findIndex(([row, col]) => terrainFilter(row, col))
    if (stopIndex >= 0) {
      line = line.slice(0, stopIndex + penetration)
    }
  }
  return line
}

/**
 * Normalizes coordinates between two points using line intercepts.
 * Ensures consistent start/end points regardless of input direction.
 * Handles degenerate cases (single point, invalid input) gracefully by returning safe defaults.
 * Accepts flat [row, col] as a degenerate line to both endpoints.
 * @param {number[][]|number[]} coords - Two-point coordinates [[row1, col1], [row2, col2]] or single point [row, col]
 * @param {MapLike} map - Game map for bounds checking
 * @returns {number[][]} Normalized coordinate pair [[startRow, startCol], [endRow, endCol]]
 * @private
 */
function normalizeLineCoordinates (coords, map) {
  if (!coords || !Array.isArray(coords) || coords.length === 0) {
    console.warn('normalizeLineCoordinates called with invalid coords', coords)
    return [
      [0, 0],
      [0, 0]
    ]
  }

  // Accept a flat coordinate pair [row, col] as a degenerate line.
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    return [
      [coords[0], coords[1]],
      [coords[0], coords[1]]
    ]
  }

  const start = coords[0]
  const end = coords[1] || start
  if (!Array.isArray(start) || start.length < 2) {
    console.warn(
      'normalizeLineCoordinates called with invalid start coord',
      coords
    )
    return [
      [0, 0],
      [0, 0]
    ]
  }
  if (!Array.isArray(end) || end.length < 2) {
    console.warn(
      'normalizeLineCoordinates called with invalid end coord, using start coord',
      coords
    )
    return [start, start]
  }

  const [row1, col1] = start
  const [row2, col2] = end
  const { x0, y0, x1, y1 } = getIntercepts(row1, col1, row2, col2, map)
  return [
    [y0, x0],
    [y1, x1]
  ]
}

// ============================================================================
// Bomb Class - Simple Area-of-Effect Weapon
// ============================================================================

/**
 * Bomb - A simple explosive weapon that deals damage in a configurable pattern.
 * Damages center cell heavily (power 2), surrounding 8 cells moderately (power 1),
 * and orthogonal cells at distance 2 lightly (power 0).
 * @extends {Weapon}
 * @class Bomb
 */
export class Bomb extends Weapon {
  /**
   * Creates a new Bomb instance.
   * @param {number} ammo - Number of bombs available
   * @param {string} [name='Bomb'] - Display name
   * @param {string} [letter='%'] - Single character representation
   * @public
   */
  constructor (ammo, name, letter) {
    super(name || 'Bomb', letter || '%', true, true, 1)
    this.ammo = ammo
    this._applyWeaponConfig(WEAPON_CONFIGS.BOMB)
    this.splashCoords = this.aoe(null, [[2, 2]])
  }

  /**
   * Creates a clone of this bomb with optional new ammo count.
   * @param {number} [ammo] - Ammo for cloned instance; uses current ammo if omitted
   * @returns {Bomb} New bomb instance
   * @public
   */
  clone (ammo) {
    return new Bomb(ammo ?? this.ammo)
  }

  /**
   * Normalizes coordinates for bomb placement (minimal transformation).
   * Overrides parent to return standard bomb targeting format.
   * @param {MapLike} _map - Game map (unused)
   * @param {number[]} _base - Base coordinates [row, col] (unused)
   * @param {number[][]} coords - Original coordinates [[row, col], ...]
   * @returns {number[][]} Normalized coordinates [[0, col], [row, col]]
   * @public
   */
  redoCoords (_map, _base, coords) {
    return [[0, coords[0][1]], coords[0]]
  }

  /**
   * Calculates area-of-effect damage pattern for bomb at given coordinates.
   * Delegates to boom() for blast radius calculation.
   * @param {MapLike|null} _map - Game map for bounds checking (unused for bombs)
   * @param {number[][]} coords - Source and Target coordinates [[sourceRow, sourceCol], [targetRow, targetCol]]
   * @returns {AoePattern} Damage cells with power levels
   * @public
   */
  // @ts-ignore - Parameter specialization from Object to MapLike|null valid at runtime
  aoe (/** @type {MapLike|null} */ _map, coords) {
    const [row, col] = coords[0]
    return this.boom(row, col)
  }

  /**
   * Calculates blast radius pattern (center, adjacent, distance-2 orthogonal cells).
   * Public API: Used by this class and subclasses (e.g., Missile).
   * @param {number} centerRow - Explosion center row coordinate
   * @param {number} centerCol - Explosion center column coordinate
   * @returns {AoePattern} Damage pattern as [row, col, power] tuples
   * @public
   */
  boom (centerRow, centerCol) {
    return this._calculateExplosionPattern(centerRow, centerCol)
  }

  /**
   * Calculates blast radius pattern: center (power 2) → adjacent cells (power 1)
   * → orthogonal distance-2 cells (power 0).
   * Internal pattern construction method used by boom().
   * @private
   * @param {number} centerRow - Explosion center row coordinate
   * @param {number} centerCol - Explosion center column coordinate
   * @returns {AoePattern} Damage pattern as [row, col, power] tuples
   */
  _calculateExplosionPattern (centerRow, centerCol) {
    const pattern = /** @type {AoePattern} */ ([[centerRow, centerCol, 2]])
    this._addAdjacentCells(pattern, centerRow, centerCol, 1)
    this._addOrthogonalDistanceTwoCells(pattern, centerRow, centerCol, 0)
    return pattern
  }

  /**
   * Adds all 8 adjacent (3×3 grid) cells to damage pattern, excluding center.
   * Forms a ring around the center cell for adjacent damage.
   * @private
   * @param {AoePattern} pattern - Pattern array to accumulate into
   * @param {number} centerRow - Center row coordinate
   * @param {number} centerCol - Center column coordinate
   * @param {number} power - Damage power for adjacent cells
   * @returns {void}
   */
  _addAdjacentCells (pattern, centerRow, centerCol, power) {
    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
      for (let colOffset = -1; colOffset <= 1; colOffset++) {
        if (rowOffset !== 0 || colOffset !== 0) {
          pattern.push([centerRow + rowOffset, centerCol + colOffset, power])
        }
      }
    }
  }

  /**
   * Adds orthogonal cells at distance 2 (forming a + pattern beyond adjacent).
   * Creates extended damage in cardinal directions, adding 12 cells total:
   * 3 cells in each of 4 cardinal directions at distance 2 from center.
   * @private
   * @param {AoePattern} pattern - Pattern array to accumulate into
   * @param {number} centerRow - Center row coordinate
   * @param {number} centerCol - Center column coordinate
   * @param {number} power - Damage power for distance-2 cells
   * @returns {void}
   */
  _addOrthogonalDistanceTwoCells (pattern, centerRow, centerCol, power) {
    const DISTANCE_2 = 2
    // Add cells in each cardinal direction at distance 2
    for (let offset = -1; offset <= 1; offset++) {
      pattern.push(
        [centerRow + offset, centerCol - DISTANCE_2, power],
        [centerRow + offset, centerCol + DISTANCE_2, power],
        [centerRow - DISTANCE_2, centerCol + offset, power],
        [centerRow + DISTANCE_2, centerCol + offset, power]
      )
    }
  }
}
/**
 * WeaponWithPath - Base class for weapons with projectile launch animations.
 * Provides launch trajectory animation support for line-based weapons.
 * Note: Class name has intentional typo (Weappon) matching parent convention.
 * @extends {Weapon}
 * @class WeaponWithPath
 */
export class WeapponWithPath extends Weapon {
  /**
   * Handles weapon launch animation/projectile trajectory.
   * Routes launch arguments directly to launchRightTo for trajectory processing.
   * @param {...any} args - Launch arguments:
   *   - coords {number[][]} - Weapon target coordinates
   *   - rr {number} - Source row coordinate
   *   - cc {number} - Source column coordinate
   *   - map {MapLike} - Game map
   *   - viewModel {Object} - Player board view model
   *   - opposingViewModel {Object} - Opponent board view model
   *   - model {Object} - Game model
   *   - launch {Function} - Launch callback function
   * @returns {Promise<Object>} Launch animation result
   * @public
   */
  async launchTo (...args) {
    const [coords, rr, cc, map, viewModel, opposingViewModel, model, launch] =
      args
    return await this.launchRightTo(coords, rr, cc, {
      map,
      viewModel,
      opposingViewModel,
      model,
      launch
    })
  }
}
// ============================================================================
// Strike Class - Line-based Strike Weapon
// ============================================================================

/**
 * Strike - A two-point targeting weapon that creates damage along a line.
 * Damages along a straight line from start to end point, with configurable power falloff.
 * @extends {WeapponWithPath}
 * @class Strike
 */
export class Strike extends WeapponWithPath {
  /**
   * Creates a new Strike instance.
   * @param {number} ammo - Number of strikes available
   * @param {string} [name='Strike'] - Display name
   * @param {string} [letter='$'] - Single character representation
   * @public
   */
  constructor (ammo, name, letter) {
    super(name || 'Strike', letter || '$', true, true, 2)
    this.ammo = ammo
    this.hasWake = true
    this._applyWeaponConfig(WEAPON_CONFIGS.STRIKE)
    this.splashCoords = this.addOrthogonal(null, 2, 2, 0, [
      [2, 2, 2],
      [0, 0, 20],
      [1, 1, 20],
      [3, 3, 20],
      [4, 4, 20]
    ])
  }

  /**
   * Creates a clone of this strike with optional new ammo count.
   * @param {number} [ammo] - Ammo for cloned instance; uses current ammo if omitted
   * @returns {Strike} New strike instance
   * @public
   */
  clone (ammo) {
    return new Strike(ammo ?? this.ammo)
  }

  /**
   * Normalizes coordinates between two map coordinates.
   * Ensures actual line-of-sight boundaries are respected using line intercepts.
   * @param {MapLike} map - Game map for bounds checking
   * @param {number[]} _base - Base coordinates [row, col] (unused)
   * @param {number[][]} coords - Coordinates to normalize [[row1, col1], [row2, col2]]
   * @returns {number[][]} Normalized coordinate pair [[startRow, startCol], [endRow, endCol]]
   * @public
   */
  redoCoords (map, _base, coords) {
    return normalizeLineCoordinates(coords, map)
  }

  /**
   * Calculates standard area-of-effect along the strike line.
   * Uses extended infinite line calculation for maximum range.
   * @param {MapLike|null} _map - Game map for bounds checking (unused)
   * @param {number[][]} coords - Source and Target coordinates [[sourceRow, sourceCol], [targetRow, targetCol]]
   * @returns {AoePattern} Damage cells with power levels
   * @public
   */
  // @ts-ignore - Parameter specialization from Object to MapLike|null valid at runtime
  aoe (/** @type {MapLike|null} */ map, coords) {
    return calculateLineAreaOfEffect(
      coords,
      2,
      getExtendedLinePoints,
      null,
      0,
      map
    )
  }

  /**
   * Calculates splash/secondary damage pattern around a point.
   * Creates a small cross pattern around the impact point with no power.
   * @param {MapLike} map - Game map for bounds checking
   * @param {Coord} resolvedTarget - Impact coordinate [row, col]
   * @param {AoePattern} _effect - Damage effect coordinates (unused)
   * @param {Object} _options - Additional options (unused)
   * @returns {AoePattern} Splash pattern with power 0
   * @public
   */
  splash (map, resolvedTarget, _effect, _options) {
    return createSplashEffect(map, resolvedTarget, 0)
  }
}
/**
 * Fish - A projectile weapon that travels through water with splash effects.
 * Fires along water cells, stops at land boundaries, creates water-based splash.
 * @extends {WeapponWithPath}
 * @class Fish
 */
export class Fish extends WeapponWithPath {
  /**
   * Creates a new Fish instance.
   * @param {number} ammo - Number of fish available
   * @param {string} [name='Fish'] - Display name
   * @param {string} [letter='+'] - Single character representation
   * @public
   */
  constructor (ammo, name = 'Fish', letter = '+') {
    super(name, letter, true, true, 2)
    this.ammo = ammo
    this.hasWake = true
    this._applyWeaponConfig(WEAPON_CONFIGS.FISH)
    this.splashCoords = this.addOrthogonal(null, 3, 3, 1, [
      [3, 3, 2],
      [4, 2, 0],
      [2, 4, 0],
      [0, 0, 20],
      [1, 1, 20],
      [2, 2, 30],
      [4, 4, 30],
      [5, 5, 20],
      [6, 6, 20]
    ])
  }

  /**
   * Creates a clone of this fish with optional new ammo count.
   * @param {number} [ammo] - Ammo for cloned instance; uses current ammo if omitted
   * @returns {Fish} New fish instance
   * @public
   */
  clone (ammo) {
    return new Fish(ammo ?? this.ammo)
  }

  /**
   * Calculates full area-of-effect along the fish's path without terrain filtering.
   * Returns all cells along the line regardless of terrain.
   * @param {number[][]} coords - Source and Target coordinates [[sourceRow, sourceCol], [targetRow, targetCol]]
   * @param {number} [power=1] - Power level for damage cells
   * @returns {AoePattern} Full path cells with damage power
   * @public
   */
  aoeFull (coords, power = 1) {
    return calculateLineAreaOfEffect(coords, power, getLinePoints, null)
  }

  /**
   * Calculates area-of-effect with terrain-based stopping (land boundaries).
   * Stops at first land cell, optionally penetrating by specified distance.
   * @param {MapLike} map - Game map for land checking
   * @param {number[][]} coords - Source and Target coordinates [[sourceRow, sourceCol], [targetRow, targetCol]]
   * @param {number} [power=1] - Power level for damage cells
   * @param {number} [penetration=0] - Cells beyond land boundary to include
   * @returns {AoePattern} Path cells up to land with damage power
   * @public
   */
  aoeRaw (map, coords, power = 1, penetration = 0) {
    return calculateLineAreaOfEffect(
      coords,
      power,
      getLinePoints,
      (row, col) => map.isLand?.(row, col) || false,
      penetration
    )
  }

  /**
   * Calculates area-of-effect along the fish's water path.
   * Stops at land boundaries (map.isLand check).
   * @param {MapLike} map - Game map for bounds checking
   * @param {number[][]} coords - Source and Target coordinates [[sourceRow, sourceCol], [targetRow, targetCol]]
   * @returns {AoePattern} Damage cells with power levels
   * @public
   */
  aoe (map, coords) {
    return this.aoeRaw(map, coords, 2, 0)
  }

  /**
   * Normalizes coordinates by recalculating actual trajectory line.
   * Returns first and last cells of the valid water path.
   * @param {MapLike} _map - Game map for trajectory validation
   * @param {number[]} _base - Base coordinates [row, col] (unused)
   * @param {number[][]} coords - Original coordinates [[row1, col1], [row2, col2]]
   * @returns {number[][]} Normalized coordinate pair [start, end]
   * @public
   */
  redoCoords (_map, _base, coords) {
    const line = this.aoe(_map, coords)
    // @ts-ignore - line is guaranteed to have at least one element from aoe calculation
    return [line[0], line.at(-1)]
  }

  /**
   * Calculates splash/secondary damage pattern around a point.
   * Only affects water cells (not land).
   * @param {MapLike} map - Game map for land checking
   * @param {Coord} resolvedTarget - Impact coordinate [row, col]
   * @param {AoePattern} _effect - Damage effect coordinates (unused)
   * @param {Object} _options - Additional options (unused)
   * @returns {AoePattern} Water-based splash pattern with power 1
   * @public
   */
  splash (map, resolvedTarget, _effect, _options) {
    return createSplashEffect(
      map,
      resolvedTarget,
      1,
      (row, col) => !(map.isLand?.(row, col) || false)
    )
  }
}

// ============================================================================
// Sensor Class - Pie-segment Scanning Weapon
// ============================================================================

/**
 * Sensor - A scanning weapon that generates a pie-segment area from center to target.
 * Used for detection/scanning; no explosion effects.
 * @extends {Weapon}
 * @class Sensor
 */
export class Sensor extends Weapon {
  /**
   * Creates a new Sensor instance.
   * @param {number} ammo - Number of scans available
   * @param {string} [name='Sensor'] - Display name
   * @param {string} [letter='<'] - Single character representation
   * @public
   */
  constructor (ammo, name = 'Sensor', letter = '<') {
    super(name, letter, true, false, 2)
    this.ammo = ammo
    this._applyWeaponConfig(WEAPON_CONFIGS.SENSOR)
  }

  /**
   * Creates a clone of this sensor with optional new ammo count.
   * @param {number} [ammo] - Ammo for cloned instance; uses current ammo if omitted
   * @returns {Sensor} New sensor instance
   * @public
   */
  clone (ammo) {
    return new Sensor(ammo ?? this.ammo)
  }

  /**
   * Calculates area-of-effect as a pie segment from center to target.
   * Swept area represents sensor scan coverage.
   * @param {MapLike|null} _map - Game map for bounds checking (unused)
   * @param {number[][]} coords - Source and Target coordinates [[centerRow, centerCol], [targetRow, targetCol]]
   * @returns {AoePattern} Scan cells with power levels
   * @public
   */
  // @ts-ignore - Parameter specialization from Object to MapLike|null valid at runtime
  aoe (/** @type {MapLike|null} */ _map, coords) {
    const [centerRow, centerCol] = coords[0]
    const [targetRow, targetCol] = coords[1]
    return getPieSegmentCells(centerCol, centerRow, targetCol, targetRow)
  }
}
