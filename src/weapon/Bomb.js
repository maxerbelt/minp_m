import { RectListCanvas } from '../grid/rectangle/rectListCanvas.js'
import { Weapon } from './Weapon.js'

// ============================================================================
// Configuration Constants
// ============================================================================

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

/**
 * Applies a weapon configuration object to a weapon instance
 * Centralizes duplicate configuration initialization logic across all weapon types
 * @param {Weapon} weapon - Target weapon instance
 * @param {Object} config - Configuration properties to apply
 */
function _applyWeaponConfig (weapon, config) {
  Object.entries(config).forEach(([key, value]) => {
    weapon[key] = value
  })
}

// ============================================================================
// Utility Functions - Canvas Drawing Operations
// ============================================================================

/**
 * Gets intercept points for a line segment on the canvas
 * @param {number} row1 - Starting row
 * @param {number} col1 - Starting column
 * @param {number} row2 - Ending row
 * @param {number} col2 - Ending column
 * @returns {Object} Intercept points { x0, y0, x1, y1 }
 */
export function getIntercepts (row1, col1, row2, col2) {
  const points = RectListCanvas.BhMapList()
  return points.intercepts(col1, row1, col2, row2)
}

/**
 * Gets points along an infinite line (extended beyond segment endpoints)
 * Converts canvas coordinates to row/column and returns power-tagged cells
 * @param {number} row1 - Starting row
 * @param {number} col1 - Starting column
 * @param {number} row2 - Ending row
 * @param {number} col2 - Ending column
 * @param {number} power - Power level for cells
 * @returns {Array} Array of [row, column, power] tuples
 */
export function getExtendedLinePoints (row1, col1, row2, col2, power) {
  const points = RectListCanvas.BhMapList()
  points.drawLineInfinite(col1, row1, col2, row2, power)
  return points.list.map(([x, y, p]) => [y, x, p || power])
}

/**
 * Gets points along a ray (from start point through end point)
 * @param {number} row1 - Starting row
 * @param {number} col1 - Starting column
 * @param {number} row2 - Ending row
 * @param {number} col2 - Ending column
 * @param {number} power - Power level for cells
 * @returns {Array} Array of [row, column, power] tuples
 */
export function getLinePoints (row1, col1, row2, col2, power) {
  const points = RectListCanvas.BhMapList()
  points.drawRay(col1, row1, col2, row2, power)
  return points.list.map(([x, y, p]) => [y, x, p || power])
}

/**
 * Gets points within a pie-segment (swept area) from center to target
 * @param {number} centerCol - Center column (x coordinate)
 * @param {number} centerRow - Center row (y coordinate)
 * @param {number} targetCol - Target column (x coordinate)
 * @param {number} targetRow - Target row (y coordinate)
 * @param {number} [radius=4] - Radius of the pie
 * @param {number} [spreadDeg=22.5] - Spread angle in degrees
 * @returns {Array} Array of [row, column, power] tuples
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
  points.drawPie(
    centerCol,
    centerRow,
    targetCol,
    targetRow,
    radius,
    this,
    spreadDeg
  )
  return points.list
}

// ============================================================================
// Bomb Class - Simple Area-of-Effect Weapon
// ============================================================================

/**
 * Bomb - A simple explosive weapon that deals damage in a configurable pattern
 * Damages center cell heavily (power 2), surrounding 8 cells moderately (power 1),
 * and orthogonal cells at distance 2 lightly (power 0)
 * @extends Weapon
 */
export class Bomb extends Weapon {
  /**
   * @param {number} ammo - Number of bombs available
   * @param {string} [name] - Display name
   * @param {string} [letter] - Single character representation
   */
  constructor (ammo, name, letter) {
    super(name || 'Bomb', letter || '%', true, true, 1)
    this.ammo = ammo
    _applyWeaponConfig(this, WEAPON_CONFIGS.BOMB)
    this.splashCoords = this.aoe(null, [[2, 2]])
  }

  /**
   * Creates a clone of this bomb with optional new ammo count
   * @param {number} [ammo] - Ammo for cloned instance
   * @returns {Bomb} New bomb instance
   */
  clone (ammo) {
    return new Bomb(ammo ?? this.ammo)
  }

  /**
   * Normalizes coordinates for bomb placement (minimal transformation)
   * @param {Object} _map - Game map (unused)
   * @param {Object} _base - Base configuration (unused)
   * @param {Array} coords - Original coordinates
   * @returns {Array} Normalized coordinates
   */
  redoCoords (_map, _base, coords) {
    return [[0, coords[0][1]], coords[0]]
  }

  /**
   * Calculates area-of-effect damage pattern for bomb at given coordinates
   * @param {Object} _map - Game map (unused for bomb)
   * @param {Array} coords - Target coordinates [row, col, ...]
   * @returns {Array} Array of affected cells with damage power
   */
  aoe (_map, coords) {
    const [row, col] = coords[0]
    return this.boom(row, col)
  }

  /**
   * Public API: Calculates blast radius pattern (center, adjacent, distance-2 orthogonal cells)
   * Used by this class and subclasses (e.g., Missile)
   * @param {number} centerRow - Explosion center row
   * @param {number} centerCol - Explosion center column
   * @returns {Array} Damage pattern as [row, col, power] tuples
   */
  boom (centerRow, centerCol) {
    return this._calculateExplosionPattern(centerRow, centerCol)
  }

  /**
   * Calculates blast radius pattern: center (power 2) → adjacent cells (power 1)
   * → orthogonal distance-2 cells (power 0)
   * @private
   * @param {number} centerRow - Explosion center row
   * @param {number} centerCol - Explosion center column
   * @returns {Array} Damage pattern as [row, col, power] tuples
   */
  _calculateExplosionPattern (centerRow, centerCol) {
    const pattern = [[centerRow, centerCol, 2]]
    this._addAdjacentCells(pattern, centerRow, centerCol, 1)
    this._addOrthogonalDistanceTwoCells(pattern, centerRow, centerCol, 0)
    return pattern
  }

  /**
   * Adds all 8 adjacent (3×3 grid) cells to damage pattern, excluding center
   * @private
   * @param {Array} pattern - Pattern to accumulate into
   * @param {number} centerRow - Center row
   * @param {number} centerCol - Center column
   * @param {number} power - Damage power for these cells
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
   * Adds orthogonal cells at distance 2 (forming a + pattern beyond adjacent)
   * @private
   * @param {Array} pattern - Pattern to accumulate into
   * @param {number} centerRow - Center row
   * @param {number} centerCol - Center column
   * @param {number} power - Damage power for these cells
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

// ============================================================================
// Strike Class - Line-based Strike Weapon
// ============================================================================

/**
 * Strike - A two-point targeting weapon that creates damage along a line
 * Damages along a straight line from start to end point, with configurable power falloff
 * @extends Weapon
 */
export class Strike extends Weapon {
  /**
   * @param {number} ammo - Number of strikes available
   * @param {string} [name] - Display name
   * @param {string} [letter] - Single character representation
   */
  constructor (ammo, name, letter) {
    super(name || 'Strike', letter || '$', true, true, 2)
    this.ammo = ammo
    _applyWeaponConfig(this, WEAPON_CONFIGS.STRIKE)
    this.splashCoords = this.addOrthogonal(null, 2, 2, 0, [
      [2, 2, 2],
      [0, 0, 20],
      [1, 1, 20],
      [3, 3, 20],
      [4, 4, 20]
    ])
  }

  /**
   * Creates a clone of this strike with optional new ammo count
   * @param {number} [ammo] - Ammo for cloned instance
   * @returns {Strike} New strike instance
   */
  clone (ammo) {
    return new Strike(ammo ?? this.ammo)
  }

  /**
   * Normalizes coordinates between two map coordinates
   * Ensures actual line-of-sight boundaries are respected
   * @param {Object} map - Game map
   * @param {Array} base - Base coordinates
   * @param {Array} coords - Coordinates to normalize [start, end]
   * @returns {Array} Normalized coordinate pair [[startRow, startCol], [endRow, endCol]]
   */
  redoCoords (map, base, coords) {
    const [row1, col1] = coords[0]
    const [row2, col2] = coords[1]
    const { x0, y0, x1, y1 } = getIntercepts(row1, col1, row2, col2)
    return [
      [y0, x0],
      [y1, x1]
    ]
  }

  /**
   * Calculates standard area-of-effect along the strike line
   * @param {Object} map - Game map
   * @param {Array} coords - Two-point coordinates [startCoord, endCoord]
   * @param {number} [power=1] - Power level for damage
   * @returns {Array} Cells along the line with damage power
   */
  aoe (map, coords, power = 1) {
    const [row1, col1] = coords[0]
    const [row2, col2] = coords[1]
    return getExtendedLinePoints(row1, col1, row2, col2, power)
  }

  /**
   * Calculates area-of-effect for splash damage at higher power
   * @param {Object} map - Game map
   * @param {Array} coords - Target coordinates
   * @returns {Array} Splash cells with power 20
   */
  splashAoe (map, coords) {
    return this.aoe(map, coords, 20)
  }

  /**
   * Calculates splash/secondary damage pattern around a point
   * Adds orthogonal neighbors of the impact point
   * @param {Object} map - Game map
   * @param {Array} coords - Impact coordinate [row, col]
   * @returns {Array} Splash pattern
   */
  splash (map, coords) {
    const [r, c] = coords
    const newEffect = [coords]
    this._addOrthogonalNeighbors(map, r, c, 0, newEffect)
    return newEffect
  }

  /**
   * Adds orthogonal neighbors (4-connectivity) to effect pattern
   * @private
   * @param {Object} map - Game map (or null for no bounds checking)
   * @param {number} row - Center row
   * @param {number} col - Center column
   * @param {number} power - Damage power for neighbor cells
   * @param {Array} effectPattern - Pattern array to accumulate into
   */
  _addOrthogonalNeighbors (map, row, col, power, effectPattern) {
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1] // up, down, left, right
    ]
    directions.forEach(([rowOffset, colOffset]) => {
      this._addCellToEffect(
        map,
        row + rowOffset,
        col + colOffset,
        power,
        effectPattern
      )
    })
  }

  /**
   * Adds a single cell to effect pattern if in bounds
   * @private
   * @param {Object} map - Game map (null means no bounds check)
   * @param {number} row - Cell row
   * @param {number} col - Cell column
   * @param {number} power - Damage power
   * @param {Array} effectPattern - Pattern to add to
   */
  _addCellToEffect (map, row, col, power, effectPattern) {
    const noCheck = map === null || map === undefined
    if (noCheck || map.inBounds(row, col)) {
      effectPattern.push([row, col, power])
    }
  }

  /**
   * Handles strike launch animation/projectile
   * @param {Array} coords - Strike coordinates
   * @param {number} rr - Target row
   * @param {number} cc - Target column
   * @param {Object} map - Game map
   * @param {Object} viewModel - Current player view model
   * @param {Object} opposingViewModel - Opposing player view model
   * @param {Object} model - Game model
   * @returns {Promise} Launch animation promise
   */
  async launchTo (coords, rr, cc, map, viewModel, opposingViewModel, model) {
    return await this.launchRightTo(
      coords,
      rr,
      cc,
      map,
      viewModel,
      opposingViewModel,
      model
    )
  }

  redoCoords (map, base, coords) {
    const r = coords[0][0]
    const c = coords[0][1]

    const r1 = coords[1][0]
    const c1 = coords[1][1]
    const { x0, y0, x1, y1 } = getIntercepts(r, c, r1, c1)
    return [
      [y0, x0],
      [y1, x1]
    ]
  }

  splash (map, coords) {
    const [r, c] = coords
    const newEffect = [coords]
    this.addOrthogonal(map, r, c, 0, newEffect)
    return newEffect
  }

  addSplash (map, r, c, power, newEffect) {
    const noCheck = map === null || map === undefined
    if (noCheck || map.inBounds(r, c)) newEffect.push([r, c, power])
  }
}
export class Fish extends Weapon {
  /**
   * @param {number} ammo - Number of fish available
   * @param {string} [name='Fish'] - Display name
   * @param {string} [letter='+'] - Single character representation
   */
  constructor (ammo, name = 'Fish', letter = '+') {
    super(name, letter, true, true, 2)
    this.ammo = ammo
    _applyWeaponConfig(this, WEAPON_CONFIGS.FISH)
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
   * Creates a clone of this fish with optional new ammo count
   * @param {number} [ammo] - Ammo for cloned instance
   * @returns {Fish} New fish instance
   */
  clone (ammo) {
    return new Fish(ammo ?? this.ammo)
  }

  /**
   * Calculates area-of-effect along the fish's water path
   * Stops at land boundaries (map.isLand check)
   * @param {Object} map - Game map for land/water checks
   * @param {Array} coords - Two-point coordinates [startCoord, endCoord]
   * @param {number} [power=1] - Power level for damage
   * @returns {Array} Cells along water path with damage power
   */
  aoe (map, coords, power = 1) {
    const [row1, col1] = coords[0]
    const [row2, col2] = coords[1]
    const line = getLinePoints(row1, col1, row2, col2, power)

    // Find first land cell (stops fish trajectory)
    const landIndex = line.findIndex(([row, col]) => map.isLand(row, col))

    // Truncate line at land boundary
    if (landIndex >= 0) {
      line.length = landIndex
    }
    return line
  }

  /**
   * Calculates area-of-effect for splash damage at higher power
   * @param {Object} map - Game map
   * @param {Array} coords - Target coordinates
   * @returns {Array} Splash cells with power 20
   */
  splashAoe (map, coords) {
    return this.aoe(map, coords, 20)
  }

  /**
   * Normalizes coordinates by recalculating actual trajectory line
   * Returns first and last cells of the valid water path
   * @param {Object} map - Game map for trajectory validation
   * @param {Object} base - Base configuration (unused)
   * @param {Array} coords - Original coordinates
   * @returns {Array} Normalized coordinate pair [start, end]
   */
  redoCoords (map, base, coords) {
    const line = this.aoe(map, coords)
    return [line[0], line.at(-1)]
  }

  addSplash (map, r, c, power, newEffect) {
    const noCheck = map === null || map === undefined
    if (noCheck || (map.inBounds(r, c) && !map.isLand(r, c)))
      newEffect.push([r, c, power])
  }

  splash (map, coords) {
    const [r, c] = coords
    const newEffect = [coords]
    this._addAdjacentWaterCells(map, r, c, 1, newEffect)
    return newEffect
  }

  /**
   * Adds cells to effect if they're in water (not land)
   * @private
   * @param {Object} map - Game map for land/water checks
   * @param {number} row - Cell row
   * @param {number} col - Cell column
   * @param {number} power - Damage power
   * @param {Array} effectPattern - Pattern to add to
   */
  _addCellToWaterEffect (map, row, col, power, effectPattern) {
    const noCheck = map === null || map === undefined
    if (noCheck || (map.inBounds(row, col) && !map.isLand(row, col))) {
      effectPattern.push([row, col, power])
    }
  }

  /**
   * Adds adjacent water cells (4-connectivity) to effect pattern
   * @private
   * @param {Object} map - Game map
   * @param {number} row - Center row
   * @param {number} col - Center column
   * @param {number} power - Damage power
   * @param {Array} effectPattern - Pattern to accumulate into
   */
  _addAdjacentWaterCells (map, row, col, power, effectPattern) {
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1] // up, down, left, right
    ]
    directions.forEach(([rowOffset, colOffset]) => {
      this._addCellToWaterEffect(
        map,
        row + rowOffset,
        col + colOffset,
        power,
        effectPattern
      )
    })
  }

  /**
   * Override addSplash for water-only splash damage (no land hits)
   * @param {Object} map - Game map for land/water checks
   * @param {number} row - Cell row
   * @param {number} col - Cell column
   * @param {number} power - Damage power
   * @param {Array} newEffect - Effect pattern to add to
   */
  addSplash (map, row, col, power, newEffect) {
    this._addCellToWaterEffect(map, row, col, power, newEffect)
  }

  /**
   * Handles fish launch animation/projectile
   * @param {Array} coords - Fish coordinates
   * @param {number} rr - Target row
   * @param {number} cc - Target column
   * @param {Object} map - Game map
   * @param {Object} viewModel - Current player view model
   * @param {Object} opposingViewModel - Opposing player view model
   * @param {Object} model - Game model
   * @returns {Promise} Launch animation promise
   */
  async launchTo (coords, rr, cc, map, viewModel, opposingViewModel, model) {
    return await this.launchRightTo(
      coords,
      rr,
      cc,
      map,
      viewModel,
      opposingViewModel,
      model
    )
  }
}

// ============================================================================
// Sensor Class - Pie-segment Scanning Weapon
// ============================================================================

/**
 * Sensor - A scanning weapon that generates a pie-segment area from center to target
 * Used for detection/scanning; no explosion effects
 * @extends Weapon
 */
export class Sensor extends Weapon {
  /**
   * @param {number} ammo - Number of scans available
   * @param {string} [name='Sensor'] - Display name
   * @param {string} [letter='<'] - Single character representation
   */
  constructor (ammo, name = 'Sensor', letter = '<') {
    super(name, letter, true, false, 2)
    this.ammo = ammo
    _applyWeaponConfig(this, WEAPON_CONFIGS.SENSOR)
  }

  /**
   * Creates a clone of this sensor with optional new ammo count
   * @param {number} [ammo] - Ammo for cloned instance
   * @returns {Sensor} New sensor instance
   */
  clone (ammo) {
    return new Sensor(ammo ?? this.ammo)
  }

  /**
   * Calculates area-of-effect as a pie segment from center to target
   * Swept area represents sensor scan coverage
   * @param {Object} _map - Game map (unused for sensor scanning)
   * @param {Array} coords - Two-point coordinates [centerCoord, targetCoord]
   * @returns {Array} Cells within the pie segment
   */
  aoe (_map, coords) {
    const [centerRow, centerCol] = coords[0]
    const [targetRow, targetCol] = coords[1]
    return getPieSegmentCells(centerCol, centerRow, targetCol, targetRow)
  }
}
