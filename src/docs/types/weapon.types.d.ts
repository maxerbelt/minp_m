/**
 * Weapon and splash damage type definitions for weaponprint module
 *
 * Provides types for weapon configurations, splash damage calculations,
 * power group categorizations, and damage value translations.
 *
 * @module docs/types/weapon
 */

/**
 * Splash damage code translation map
 *
 * Maps original damage values to display values for splash damage visualization.
 * Used to transform internal damage codes into UI-friendly representations.
 *
 * @typedef {Object<number, number>} SplashTranslation
 */
export type SplashTranslation = Record<number, number>

/**
 * Splash damage code legend descriptions
 *
 * Maps splash damage codes to human-readable descriptions.
 * Describes what each damage code means in context (e.g., 'Vulnerable Destroyed').
 *
 * @typedef {Object<number, string>} SplashLegend
 */
export type SplashLegend = Record<number, string>

/**
 * Complete splash damage configuration with translation and legend
 *
 * Tuple containing [translation map, legend descriptions] for splash damage display.
 * Used to configure the UI with appropriate damage value mappings and descriptions.
 *
 * @typedef {[SplashTranslation, SplashLegend]} SplashConfig
 */
export type SplashConfig = [SplashTranslation, SplashLegend]

/**
 * Ship categorization based on weapon effectiveness levels
 *
 * Groups ships into power categories that determine how they're affected
 * by weapons with different splash damage power levels.
 *
 * @typedef {Object} PowerGroups
 * @property {string[]} vulnerable - Ships vulnerable to this weapon (power level 0)
 * @property {string[]} normal - Ships with normal resistance to this weapon (power level 1)
 * @property {string[]} hardened - Ships hardened against this weapon (power level 2)
 * @property {string[]} immune - Ships immune to this weapon (power level 3)
 */
export interface PowerGroups {
  readonly vulnerable: string[]
  readonly normal: string[]
  readonly hardened: string[]
  readonly immune: string[]
}

/**
 * Individual weapon with splash damage configuration and coordinates
 *
 * Represents a weapon in the game with its identifier, name, and splash damage
 * properties for display and calculation purposes.
 *
 * @typedef {Object} Weapon
 * @property {string} tag - Weapon identifier/tag
 * @property {string} letter - Single letter weapon identifier
 * @property {string} name - Display name for the weapon
 * @property {number} splashPower - Splash damage power level (0-3 for vulnerable/normal/hardened/immune)
 * @property {number[][]} splashCoords - Splash coordinate mappings [x, y, value]
 * @property {number[][] | undefined} [crashCoords] - Crash coordinate mappings (optional)
 */
export interface Weapon {
  readonly tag: string
  readonly letter: string
  readonly name: string
  readonly splashPower: number
  readonly splashCoords: readonly (readonly number[])[]
  readonly crashCoords?: readonly (readonly number[])[]
}

/**
 * Splash damage constants for code values
 *
 * Defines numeric constants used internally for splash damage calculations
 * and translations. These represent different damage outcomes for ship power levels.
 *
 * @typedef {Object} SplashDamageConstants
 */
export const SPLASH_DAMAGE_CODES = {
  /** Weapon path without damage effect */
  WEAPON_PATH: 20 as const,

  /** Weapon path with single effect (normal destroyed or hardened revealed) */
  WEAPON_PLUS: 30 as const,

  /** Weapon path with double effect (normal destroyed and hardened revealed) */
  WEAPON_PLUS2: 31 as const,

  /** Hardened ship destroyed by splash damage */
  HARDENED_DESTROYED: 2 as const,

  /** Hardened ship revealed (not destroyed) by splash damage */
  HARDENED_REVEALED: 12 as const,

  /** Normal-resistance ship destroyed by splash damage */
  NORMAL_DESTROYED: 1 as const,

  /** Normal-resistance ship revealed (not destroyed) by splash damage */
  NORMAL_REVEALED: 11 as const,

  /** Vulnerable ship destroyed by splash damage */
  VULNERABLE_DESTROYED: 0 as const,

  /** Vulnerable ship revealed (not destroyed) by splash damage */
  VULNERABLE_REVEALED: 10 as const,

  /** No splash damage effect on this cell */
  NO_EFFECT: -1 as const
} as const

/**
 * Type for splash damage code constants
 *
 * @typedef {typeof SPLASH_DAMAGE_CODES} SplashDamageCodesType
 */
export type SplashDamageCodesType = typeof SPLASH_DAMAGE_CODES

/**
 * Union type for valid splash power levels
 *
 * Represents the four power levels of splash damage weapons in the game.
 * 0 = affects vulnerable, 1 = affects vulnerable & normal, etc.
 *
 * @typedef {0 | 1 | 2 | 3} SplashPowerLevel
 */
export type SplashPowerLevel = 0 | 1 | 2 | 3

/**
 * Ship power level determination helper
 *
 * Returns which power level (0-3) a ship type falls into,
 * used for splash damage calculations and categorization.
 *
 * @typedef {Object} PowerLevelResolver
 */
export interface PowerLevelResolver {
  getPowerLevel: (shipType: string) => SplashPowerLevel
}
