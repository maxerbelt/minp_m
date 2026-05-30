/**
 * @module waters/types/enums
 * Enumeration types for game modes, players, and weapon effects.
 *
 * Provides type-safe constants for:
 * - Player identification (FRIEND vs ENEMY)
 * - Weapon targeting modes (SELECT, AIM, OTHERS)
 * - Weapon effect types (DestroyOne, Bomb, Scan, Seek)
 * - UI display modes (placing, ready, testing, seeking)
 */

/**
 * Player identification enum for distinguishing between friendly and enemy players.
 * Used for player state, turn management, and UI targeting.
 */
export enum Player {
  friend = 'FRIEND',
  enemy = 'ENEMY'
}

/**
 * Weapon targeting and selection mode enumeration.
 * Controls the current step in the weapon selection/aiming workflow.
 */
export enum WeaponMode {
  sourceSelect = 'SELECT',
  targetAim = 'AIM',
  othersTurn = 'OTHERS'
}

/**
 * Weapon effect type enumeration.
 * Classifies the type of effect a weapon produces when fired.
 */
export type EffectType = 'DestroyOne' | 'Bomb' | 'Scan' | 'Seek'

/**
 * Game UI mode enumeration for display state during play.
 * Controls which UI panels and controls are visible to the player.
 */
export enum UIMode {
  placing = 'placing',
  ready = 'ready',
  testing = 'testing',
  seeking = 'seeking'
}

/**
 * CSS class names for UI state management.
 * Used for styling and visibility control across UI components.
 */
export enum UIClass {
  hidden = 'hidden',
  destroyed = 'destroyed',
  hit = 'hit',
  placed = 'placed',
  active = 'active',
  empty = 'empty',
  weapon = 'weapon',
  medium = 'medium',
  small = 'small',
  alt = 'alt'
}
