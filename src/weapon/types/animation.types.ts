/**
 * Animation and visual effect types
 * Configuration and result types for weapon animations
 */

import type { PixelCoord } from './coordinates.types'

/**
 * Animation configuration options
 * Parameters for weapon flight animations
 */
export type AnimationOptions = {
  readonly rotation?: number
  readonly duration?: number
  readonly classname?: string
  readonly doesExplode?: boolean
  readonly animateOnTarget?: boolean
}

/**
 * Animation result
 * Output of animation operation containing container and coordinates
 */
export type AnimationResult = {
  readonly container: HTMLElement
  readonly end: PixelCoord
  readonly cellSize: number
}

/**
 * Animator context
 * Setup information for animation initialization
 */
export type AnimatorContext = {
  readonly animator: any // Animator instance type
  readonly end: PixelCoord
  readonly start: PixelCoord
  readonly cellSize: number
}

/**
 * Explosion animation options
 * Extended configuration for explosion effects
 */
export type ExplodeOptions = {
  readonly container?: HTMLElement | null
  readonly end?: PixelCoord
  readonly type?: string
  readonly power?: number
  readonly shake?: 'shake' | 'shake-heavy' | string
  readonly animator?: any // Animator instance
  readonly viewModel?: any
  readonly id?: string | null
}

/**
 * Animation timing configuration
 */
export type AnimationTiming = {
  readonly duration: number
  readonly delay?: number
  readonly easing?: string
}

/**
 * Splash animation metadata
 */
export type SplashAnimationConfig = {
  readonly terrainType: string
  readonly center: PixelCoord
  readonly radius?: number
  readonly power?: number
}

/**
 * Ripple effect configuration
 */
export type RippleConfig = {
  readonly center: PixelCoord
  readonly terrainType: string
  readonly container?: HTMLElement
}

/**
 * Flight animation state
 */
export type FlightAnimationState = {
  readonly source: PixelCoord
  readonly target: PixelCoord
  readonly angle: number
  readonly duration: number
  readonly classname: string
}
