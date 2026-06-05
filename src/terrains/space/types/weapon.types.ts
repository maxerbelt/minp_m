/**
 * Weapon system type definitions for space terrain.
 *
 * Provides types for:
 * - Weapon targeting and area-of-effect calculations
 * - Damage patterns and weapon interactions
 * - Animation and visual effects coordination
 * - Cross-board weapon mechanics (dual-player boards)
 *
 * @module terrains/space/types/weapon.types
 */

import type { Coord, AoePattern } from './grid.types'

/**
 * Game model interface providing core gameplay logic and targeting.
 * Central reference for coordinate transformation and hit detection.
 *
 * @typedef {Object} GameModel
 * @property {(effect: AoePattern, weapon: any) => (Coord | null)} getTarget - Resolve weapon impact target from effect pattern
 */
export interface GameModel {
  readonly getTarget: (effect: AoePattern, weapon: any) => Coord | null
}

/**
 * View model interface for rendering game board cells and UI state.
 * Provides methods for accessing DOM elements and cell sizing information.
 *
 * Used for animation target selection and DOM-based coordinate mapping.
 *
 * @typedef {Object} ViewModel
 * @property {(row: number, col: number) => HTMLElement} gridCellAt - Get HTML element for cell at coordinates
 * @property {() => number} cellSize - Get pixel size of each cell
 */
export interface ViewModel {
  readonly gridCellAt: (row: number, col: number) => HTMLElement
  readonly cellSize: () => number
}

/**
 * Opposing player's view model for dual-board cross-animation.
 * Identical structure to ViewModel, represents opponent's board rendering.
 *
 * Used exclusively in dual-board weapon animation contexts for coordinating
 * simultaneous visual effects on both battlefield displays.
 *
 * @typedef {ViewModel} OpposingViewModel
 */
export type OpposingViewModel = ViewModel

/**
 * Terrain map definition with bounds and optional land classification.
 * Provides grid dimensions and terrain type checking for weapon mechanics.
 *
 * @typedef {Object} TerrainMap
 * @property {number} rows - Number of rows in the game board
 * @property {number} cols - Number of columns in the game board
 * @property {(row: number, col: number) => boolean} [isLand] - Optional: Check if cell is land/asteroid terrain
 *
 * @example
 * const terrainMap: TerrainMap = {
 *   rows: 20,
 *   cols: 20,
 *   isLand: (row, col) => landMask.cellAt(row, col)
 * }
 */
export interface TerrainMap {
  readonly rows: number
  readonly cols: number
  readonly isLand?: (row: number, col: number) => boolean
}

/**
 * HTML cell element references for dual-board animation choreography.
 * Stores source and target cell elements on both primary and opposing boards.
 *
 * Essential for synchronized cross-board animation effects like portal markers
 * and dual-impact visual feedback.
 *
 * @typedef {Object} DualBoardCells
 * @property {HTMLElement} sourceCell1 - Source cell on primary board
 * @property {HTMLElement} targetCell1 - Target cell on primary board
 * @property {HTMLElement} sourceCell2 - Source cell on opposing board
 * @property {HTMLElement} targetCell2 - Target cell on opposing board
 */
export interface DualBoardCells {
  readonly sourceCell1: HTMLElement
  readonly targetCell1: HTMLElement
  readonly sourceCell2: HTMLElement
  readonly targetCell2: HTMLElement
}

/**
 * Weapon launch context containing model references and configuration.
 * Provides game logic, view access, and terrain information for weapon execution.
 *
 * @typedef {Object} WeaponLaunchContext
 * @property {GameModel} gameModel - Game logic and targeting resolution
 * @property {ViewModel} viewModel - Board rendering and DOM access
 * @property {TerrainMap} terrainMap - Terrain bounds and classification
 * @property {ViewModel} [opposingViewModel] - Optional: Opposing board for dual-board attacks
 * @property {DualBoardCells} [dualBoardCells] - Optional: Cell references for cross-board effects
 */
export interface WeaponLaunchContext {
  readonly gameModel: GameModel
  readonly viewModel: ViewModel
  readonly terrainMap: TerrainMap
  readonly opposingViewModel?: ViewModel
  readonly dualBoardCells?: DualBoardCells
}

/**
 * Weapon configuration with damage characteristics.
 * Defines how a specific weapon behaves and what damage it inflicts.
 *
 * @typedef {Object} WeaponConfig
 * @property {string} code - Single character weapon identifier (e.g., '+', '|', '^')
 * @property {string} name - Display name of the weapon
 * @property {AoePattern} aoePattern - Area-of-effect damage pattern
 * @property {string} damageType - Type of damage ('Bomb', 'DestroyOne', 'Scan', etc.)
 * @property {boolean} [ignoresTerrain] - Whether weapon bypasses terrain obstacles
 */
export interface WeaponConfig {
  readonly code: string
  readonly name: string
  readonly aoePattern: AoePattern
  readonly damageType: string
  readonly ignoresTerrain?: boolean
}

/**
 * Weapon-specific sound configuration.
 * Maps gameplay contexts to audio resources for weapon effects.
 *
 * @typedef {Object} WeaponSoundConfig
 * @property {string | URL} space - Sound effect for impacts in space terrain
 * @property {string | URL} asteroid - Sound effect for impacts on asteroids
 * @property {string | URL} [plasma] - Optional: Sound for specialized plasma effects
 */
export interface WeaponSoundConfig {
  readonly space: string | URL
  readonly asteroid: string | URL
  readonly plasma?: string | URL
}

/**
 * Weapon variant with specific configuration (e.g., single, double, triple shots).
 * Represents a concrete weapon instance available for attachment to units.
 *
 * @typedef {Object} WeaponVariant
 * @property {string} id - Unique identifier for this variant
 * @property {string} variantName - Display name (e.g., 'Single', 'Double')
 * @property {WeaponConfig} config - Weapon configuration and damage info
 */
export interface WeaponVariant {
  readonly id: string
  readonly variantName: string
  readonly config: WeaponConfig
}

/**
 * Normalized weapon coordinates as [source, target] pair.
 * Standard representation for weapon launch calculations.
 *
 * @typedef {[Coord, Coord]} WeaponCoordinates
 *
 * @example
 * const coords: WeaponCoordinates = [
 *   [5, 5],   // Source (launcher position)
 *   [5, 15]   // Target (impact destination)
 * ]
 */
export type WeaponCoordinates = readonly [Coord, Coord]

/**
 * Hit detection result containing target cell and impact details.
 *
 * @typedef {Object} HitResult
 * @property {Coord} target - Impacted cell coordinates
 * @property {AoePattern} effects - Resulting area-of-effect pattern
 * @property {number} power - Damage power rating
 * @property {string} weaponType - Type of weapon that hit
 */
export interface HitResult {
  readonly target: Coord
  readonly effects: AoePattern
  readonly power: number
  readonly weaponType: string
}

/**
 * Splash damage configuration for when weapons detonate on terrain.
 * Defines secondary damage pattern when hitting non-target cells.
 *
 * @typedef {Object} SplashConfig
 * @property {boolean} enabled - Whether splash damage occurs
 * @property {AoePattern} pattern - Secondary damage pattern around impact
 * @property {number} power - Splash damage power rating
 * @property {number} [radius] - Splash effect radius in cells
 */
export interface SplashConfig {
  readonly enabled: boolean
  readonly pattern: AoePattern
  readonly power: number
  readonly radius?: number
}
