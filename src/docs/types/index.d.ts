/**
 * Type definitions for docs module
 *
 * Barrel export providing all type definitions used across print display,
 * rules, ship display, and weapon display modules.
 *
 * @module docs/types
 */

// Shared domain types
export type {
  ShipEntity,
  ShapeInfo,
  Ship,
  LoadOutEntity,
  LoadOut,
  ScoreTally,
  UIEntity,
  FleetEntity
} from './shared.types.d.ts'

// Weapon-specific types
export type {
  SplashTranslation,
  SplashLegend,
  SplashConfig,
  PowerGroups,
  Weapon,
  SplashPowerLevel,
  SplashDamageCodesType,
  PowerLevelResolver
} from './weapon.types.d.ts'

// Export constants
export { SPLASH_DAMAGE_CODES } from './weapon.types.d.ts'

// Print-specific types
export type {
  PrintMapConfig,
  PrintSetupResult,
  PrintDisplayCallbacks,
  PageContext,
  NavigationSetup
} from './print.types.d.ts'
