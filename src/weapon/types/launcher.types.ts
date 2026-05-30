/**
 * Launch context and targeting types
 * Configuration for weapon launch operations
 */

import type { Coord, CoordPair } from './coordinates.types'
import type { MapLike } from './map.types'

/**
 * Launch context
 * Complete context for weapon launch operations
 */
export type LaunchContext = {
  readonly map: MapLike | null | undefined
  readonly viewModel: any
  readonly opposingViewModel?: any
  readonly model?: any
  readonly processCoords?: ((map: MapLike | null, base: Coord, coords: readonly Coord[], model?: any) => CoordPair | readonly [CoordPair[0], CoordPair[1], boolean]) | null
  readonly launch?: ((coords: readonly Coord[], rr: number, cc: number, context: LaunchContext) => Promise<any>) | null
}

/**
 * Coordinate processor function
 * Transforms raw coordinates through game logic
 */
export type CoordinateProcessor = (
  map: MapLike | null,
  base: Coord,
  coords: readonly Coord[],
  model?: any
) => CoordPair | readonly [start: Coord, end: Coord, hasCandidate: boolean]

/**
 * Launch result
 * Output from launch operation
 */
export type LaunchResult = {
  readonly target?: Coord
  readonly [key: string]: any
}

/**
 * Targeting mode
 * Different targeting strategies for weapons
 */
export enum TargetingMode {
  SINGLE = 'single',
  LINE = 'line',
  AREA = 'area',
  SEEKING = 'seeking',
  PROJECTILE = 'projectile'
}

/**
 * Launch parameters
 * Consolidated launch information
 */
export type LaunchParams = {
  readonly coords: readonly Coord[]
  readonly sourceRow: number
  readonly sourceCol: number
  readonly targetingMode: TargetingMode
  readonly context: LaunchContext
}

/**
 * Cursor launch state
 * Tracking for cursor-based targeting
 */
export type CursorLaunchState = {
  readonly step: number
  readonly totalSteps: number
  readonly coords: Coord[]
  readonly sourceCell: HTMLElement
  readonly targetCell: HTMLElement
}

/**
 * Post-targeting launch info
 * Configuration after target selection
 */
export type PostTargetLaunchInfo = {
  readonly source: Coord
  readonly target: Coord
  readonly hasCandidates: boolean
}
