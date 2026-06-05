/**
 * @fileoverview Sea terrain weapon type definitions
 *
 * Type definitions for weapon mechanics, targeting, area-of-effect patterns,
 * and combat-related structures used in sea/land terrain combat.
 *
 * @module terrains/sea/types/weapon.types
 */

/**
 * Coordinate pair for board positioning.
 *
 * Represents a single point on the game board as [row, column].
 * Used for weapon targeting, hit detection, and board coordinates.
 *
 * @typedef {readonly [number, number]} Coord
 * @example
 * const targetCell: Coord = [3, 5] // row 3, column 5
 */
export type Coord = readonly [number, number]

/**
 * Area-of-effect cell with damage power.
 *
 * Represents a single cell affected by a weapon's area-of-effect blast.
 * Includes power level for determining damage severity.
 *
 * @typedef {readonly [number, number, number]} AoeCell
 * @property {number} [0] - Row coordinate
 * @property {number} [1] - Column coordinate
 * @property {number} [2] - Power level (0-2) for damage calculation
 *
 * @example
 * const centerCell: AoeCell = [5, 5, 2] // center of blast with power 2
 * const edgeCell: AoeCell = [4, 5, 1]   // edge of blast with power 1
 * const outerCell: AoeCell = [3, 5, 0]  // outer edge with no damage
 */
export type AoeCell = readonly [number, number, number]

/**
 * Area-of-effect pattern for weapon blast.
 *
 * Complete collection of cells affected by a single weapon blast,
 * with each cell having an associated power level for damage severity.
 *
 * @typedef {readonly AoeCell[]} AoePattern
 * @description
 * Typically organized with highest power at blast center,
 * decreasing to edges for graduated damage model.
 *
 * @example
 * const megabombBlast: AoePattern = [
 *   [5, 5, 2],  // center - full damage
 *   [4, 5, 1],  // edge - reduced damage
 *   [3, 5, 0]   // outer - splash only
 * ]
 */
export type AoePattern = readonly AoeCell[]

/**
 * Cell effect for animation rendering.
 *
 * Combines DOM element with coordinates and power for applying
 * weapon animation effects during combat visualization.
 *
 * @typedef {readonly [HTMLElement, number, number, number]} CellEffect
 * @property {HTMLElement} [0] - DOM element representing the cell
 * @property {number} [1] - Row coordinate of the cell
 * @property {number} [2] - Column coordinate of the cell
 * @property {number} [3] - Power level for animation intensity
 *
 * @example
 * const effect: CellEffect = [cellElement, 5, 5, 2]
 * // Apply visual effect to cellElement at (5,5) with power 2
 */
export type CellEffect = readonly [HTMLElement, number, number, number]

/**
 * Cell effect iterator for animation application.
 *
 * Iterable collection of cell effects to apply during weapon animation.
 * Allows batch application of animations across affected cells.
 *
 * @typedef {Iterable<CellEffect>} CellEffectIterator
 */
export type CellEffectIterator = Iterable<CellEffect>

/**
 * Weapon splash/area-of-effect configuration.
 *
 * Defines how a weapon's damage spreads across the board.
 * Controls impact radius and splash pattern visualization.
 *
 * @interface SplashConfig
 * @property {('air' | 'sea')} [type] - Impact environment (aerial or water)
 * @property {number} [power] - Splash damage multiplier (0-2)
 * @property {number} [size] - Splash radius size factor
 * @property {number} [min] - Minimum splash size
 * @property {number} [max] - Maximum splash size
 */
export interface SplashConfig {
  readonly type?: 'air' | 'sea'
  readonly power?: number
  readonly size?: number
  readonly min?: number
  readonly max?: number
}

/**
 * Weapon targeting cursor configuration.
 *
 * Defines cursor behavior and appearance during weapon targeting phases.
 * Supports multi-stage weapons with different cursors per stage.
 *
 * @interface CursorConfig
 * @property {readonly string[]} cursors - Cursor identifier names for each targeting stage
 * @property {number} [totalCursors] - Total number of targeting stages
 * @property {number} [postSelectCursor] - Cursor index after first selection
 * @property {number} [postSelectCoords] - Whether to show coordinates post-selection
 * @property {boolean} [postSelectShadow] - Whether to show targeting shadow post-selection
 */
export interface CursorConfig {
  readonly cursors: readonly string[]
  readonly totalCursors?: number
  readonly postSelectCursor?: number
  readonly postSelectCoords?: number
  readonly postSelectShadow?: boolean
}

/**
 * Weapon animation configuration.
 *
 * Defines how weapon movement and impact are visualized during gameplay.
 * Controls timing, effects, and animation behavior.
 *
 * @interface AnimationConfig
 * @property {boolean} [animateOnTarget] - Whether weapon animates to impact point
 * @property {boolean} [explodeOnTarget] - Whether weapon explodes on impact
 * @property {boolean} [hasFlash] - Whether explosion has visual flash effect
 * @property {number} [animateOffsetY] - Vertical offset for animation trails
 */
export interface AnimationConfig {
  readonly animateOnTarget?: boolean
  readonly explodeOnTarget?: boolean
  readonly hasFlash?: boolean
  readonly animateOffsetY?: number
}

/**
 * Complete weapon splash coordinate pattern.
 *
 * Raw coordinate data for splash pattern visualization and damage calculation.
 * Format: [row, column, power] for each affected cell.
 *
 * @typedef {readonly AoeCell[]} SplashCoordinates
 *
 * @example
 * const flackPattern: SplashCoordinates = [
 *   [0, 0, 1],   // center
 *   [1, 1, 2],   // expanded damage
 *   [0, 2, 1],   // edge
 *   // ... more cells
 * ]
 */
export type SplashCoordinates = readonly AoeCell[]

/**
 * Weapon drag shape for UI rendering during placement.
 *
 * Visual representation of weapon effect area used during drag operations.
 * Shows players the potential impact zone before confirmation.
 *
 * @typedef {readonly AoeCell[]} DragShape
 *
 * @example
 * const dragShape: DragShape = [
 *   [0, 0, 0],  // visual indicator cells
 *   [1, 1, 1],
 *   [0, 2, 0]
 * ]
 */
export type DragShape = readonly AoeCell[]
/**
 * Sea view grid for board visualization and animation.
 *
 * Provides methods for converting weapon effects to visual representations
 * for rendering on the game board.
 *
 @interface SeaViewGrid
 * @property {(aoe: AoePattern) => CellEffectIterator} cellsForRClist
 * Converts an area-of-effect pattern to iterable cell effects for rendering
 */
export interface SeaViewGrid {
  cellsForRClist: (aoe: AoePattern) => CellEffectIterator
}


/**
 * Sea view model for board visualization and animation.
 *
 * Provides methods for converting weapon effects to visual representations
 * for rendering on the game board.
 *
 * @interface SeaViewModel
 * @property {SeaViewGrid} grid - Grid utility for converting AOE patterns to cell effects
 * Converts an area-of-effect pattern to iterable cell effects for rendering
 */
export interface SeaViewModel {
   readonly grid: SeaViewGrid
}


/**
 * Weapon instance properties for game mechanics.
 *
 * Defines the runtime state and behavior of a deployed weapon.
 *
 * @interface WeaponInstance
 * @property {string} name - Human-readable weapon name
 * @property {string} letter - Single character identifier
 * @property {number} ammo - Ammunition count remaining
 * @property {boolean} [isOneAndDone] - Whether weapon is single-use
 * @property {boolean} [nonAttached] - Whether weapon is not attached to ships
 * @property {number} [splashSize] - Blast radius size
 * @property {number} [splashMin] - Minimum splash size
 * @property {number} [splashMax] - Maximum splash size
 * @property {SplashCoordinates} [splashCoords] - Area-of-effect coordinates
 * @property {DragShape} [dragShape] - Visual drag representation
 */
export interface WeaponInstance {
  readonly name: string
  readonly letter: string
  ammo: number
  readonly isOneAndDone?: boolean
  readonly nonAttached?: boolean
  readonly splashSize?: number
  readonly splashMin?: number
  readonly splashMax?: number
  readonly splashCoords?: SplashCoordinates
  readonly dragShape?: DragShape
}

/**
 * Weapon targeting stage descriptor.
 *
 * Describes a single stage in multi-stage weapon targeting.
 * Used for complex weapons requiring multiple clicks/selections.
 *
 * @interface TargetingStage
 * @property {number} stage - Zero-indexed stage number
 * @property {string} cursorType - Cursor identifier for this stage
 * @property {string} hint - UI hint text for this stage
 * @property {boolean} requiresCoords - Whether this stage requires coordinate selection
 */
export interface TargetingStage {
  readonly stage: number
  readonly cursorType: string
  readonly hint: string
  readonly requiresCoords: boolean
}

/**
 * Multi-stage targeting configuration for complex weapons.
 *
 * Describes complete targeting sequence for weapons with multiple selection stages.
 *
 * @interface MultiStageTargeting
 * @property {readonly TargetingStage[]} stages - All targeting stages
 * @property {number} totalStages - Total number of stages in sequence
 */
export interface MultiStageTargeting {
  readonly stages: readonly TargetingStage[]
  readonly totalStages: number
}

/**
 * Weapon effect application context.
 *
 * Contextual information for applying weapon effects to the board.
 * Includes targeting information and blast parameters.
 *
 * @interface EffectContext
 * @property {Coord} targetCoord - Primary weapon target coordinate
 * @property {Coord} [secondaryCoord] - Secondary coordinate for multi-stage weapons
 * @property {AoePattern} aoePattern - Affected cells and damage
 * @property {('air' | 'sea')} impactType - Type of impact environment
 * @property {number} power - Base damage power
 */
export interface EffectContext {
  readonly targetCoord: Coord
  readonly secondaryCoord?: Coord
  readonly aoePattern: AoePattern
  readonly impactType: 'air' | 'sea'
  readonly power: number
}
