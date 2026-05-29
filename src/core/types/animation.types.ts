/**
 * Animation and DOM-related types for the Animator class and CSS animation management.
 */

import type { Position } from './common.types.js';

/**
 * Configuration and state for animation playback.
 * Used by Animator for managing animation execution.
 */
export interface AnimationState {
  /** Whether an animation is currently running */
  running: boolean;
  /** Optional delay for inner element animation (in milliseconds) */
  innerDelay: number | null;
}

/**
 * Element references used by Animator for animation orchestration.
 */
export interface AnimationElements {
  /** Main animation container element */
  el: HTMLDivElement;
  /** Optional nested element for complex animations */
  innerEl: HTMLDivElement | null;
  /** Optional parent container for positioning */
  container: HTMLElement | null;
}

/**
 * Animation playback configuration passed to animation methods.
 *
 * @example
 * const config: AnimationConfig = { duration: 300, delay: 100 }
 */
export interface AnimationConfig {
  /** Animation duration in milliseconds */
  duration?: number;
  /** Animation delay in milliseconds */
  delay?: number;
  /** CSS class names to apply for animation */
  classes?: string[];
}

/**
 * Result of animation wait operation.
 * Includes timing information and completion status.
 */
export interface AnimationResult {
  /** Whether animation completed (true) or timed out (false) */
  completed: boolean;
  /** Total elapsed time in milliseconds */
  elapsed: number;
}

/**
 * Target position for animation movement.
 * Alias for Position type for clarity in animation contexts.
 */
export type AnimationTarget = Position;

/**
 * Callback function triggered when animation ends.
 */
export type AnimationEndCallback = (event: AnimationEvent) => void;

/**
 * CSS class name(s) for animation.
 * Can be single string or space-separated list.
 */
export type AnimationClass = string;

/**
 * Computed animation timing from element's CSS styles.
 */
export interface AnimationTiming {
  /** Duration in milliseconds (from animationDuration CSS property) */
  duration: number;
  /** Delay in milliseconds (from animationDelay CSS property) */
  delay: number;
  /** Total time (duration + delay) */
  total: number;
}
