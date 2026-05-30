/**
 * @fileoverview Sea terrain type definitions barrel export
 *
 * Central export point for all sea terrain TypeScript type definitions.
 * Re-exports types from specialized type modules for convenient importing.
 *
 * Import patterns:
 * ```typescript
 * // Import specific types
 * import type { ZoneInfo, ShapeType } from '@terrains/sea/types'
 *
 * // Or import from specific modules
 * import type { WeaponConfig } from '@terrains/sea/types/config.types'
 * import type { AoePattern } from '@terrains/sea/types/weapon.types'
 * ```
 *
 * @module terrains/sea/types
 */

// ============================================================================
// Domain Types - Shape Hierarchy, Terrain Configuration
// ============================================================================

export type {
  ZoneInfo,
  SubTerrain,
  Zone,
  Terrain,
  ShapeValidator,
  ShapeType,
  DestructionDescription,
  ShapeProperties,
  PlacementNotes,
  CellCoordinate,
  CellCoordinates,
  RackCoordinates,
  ShapeConfig,
  HybridComponentConfig
} from './domain.types.js'

export type {
  // Interfaces
  SubTerrain as ISubTerrain,
  Zone as IZone,
  Terrain as ITerrain,
  ShapeProperties as IShapeProperties,
  ShapeConfig as IShapeConfig,
  HybridComponentConfig as IHybridComponentConfig
} from './domain.types.js'

// ============================================================================
// Configuration Types - Weapons, Ships, Sounds
// ============================================================================

export type {
  WeaponHint,
  WeaponConfig,
  WeaponConfigMap,
  ShipColor,
  ShipColorMap,
  ShipName,
  ShipNameMap,
  ShipSymmetry,
  ShipSymmetryMap,
  ShipBackground,
  ShipBackgroundMap,
  ShipSunkDescriptions,
  ShipUnitName,
  ShipUnitNameMap,
  ShipPlacementInfo,
  ShipPlacementInfoMap,
  TerrainRuleConfigs,
  WeaponSoundUrl,
  SoundFileNames
} from './config.types.js'

export type {
  // Interfaces
  WeaponConfig as IWeaponConfig,
  ShipCatalogueConfig as IShipCatalogueConfig,
  TerrainRuleConfig as ITerrainRuleConfig,
  WeaponSoundsConfig as IWeaponSoundsConfig,
  SoundFileNames as ISoundFileNames
} from './config.types.js'

// ============================================================================
// Weapon Types - Combat Mechanics, Area-of-Effect
// ============================================================================

export type {
  Coord,
  AoeCell,
  AoePattern,
  CellEffect,
  CellEffectIterator,
  SplashCoordinates,
  DragShape,
  WeaponInstance
} from './weapon.types.js'

export type {
  // Interfaces
  SplashConfig as ISplashConfig,
  CursorConfig as ICursorConfig,
  AnimationConfig as IAnimationConfig,
  SeaViewModel as ISeaViewModel,
  TargetingStage as ITargetingStage,
  MultiStageTargeting as IMultiStageTargeting,
  EffectContext as IEffectContext,
  WeaponInstance as IWeaponInstance
} from './weapon.types.js'

// ============================================================================
// Sound Types - Audio and Weapon Sound Effects
// ============================================================================

export type {
  AudioAsset,
  SoundType,
  FlightSound,
  SoundFileMapping,
  AudioAssetResolver
} from './sound.types.js'

export type {
  // Interfaces
  ExplosionSound as IExplosionSound,
  WeaponSoundConfig as IWeaponSoundConfig,
  AudioPlayerContext as IAudioPlayerContext,
  SeaWeaponSounds as ISeaWeaponSounds,
  AudioPlaybackEvent as IAudioPlaybackEvent,
  SoundPreloadConfig as ISoundPreloadConfig
} from './sound.types.js'

// ============================================================================
// Type Aliases for Common Patterns
// ============================================================================

/**
 * Combined type for all sea terrain types.
 * Useful for type guards and comprehensive type checking.
 *
 * @typedef {(SubTerrain | Zone | Terrain | ShapeValidator)} SeaTerrainType
 */
export type SeaTerrainType = SubTerrain | Zone | Terrain | ShapeValidator

/**
 * All weapon-related types bundled together.
 * Convenient for weapon processing and validation.
 *
 * @typedef {(Coord | AoeCell | AoePattern | WeaponInstance)} WeaponType
 */
export type WeaponType = Coord | AoeCell | AoePattern | WeaponInstance

/**
 * All configuration types for sea terrain.
 * Used for centralized configuration validation.
 *
 * @typedef {(WeaponConfig | ShipCatalogueConfig | TerrainRuleConfigs)} ConfigType
 */
export type ConfigType =
  | WeaponConfig
  | ShipCatalogueConfig
  | TerrainRuleConfigs

/**
 * All audio-related types.
 * Used for sound system integration.
 *
 * @typedef {(AudioAsset | FlightSound | ExplosionSound)} AudioType
 */
export type AudioType = AudioAsset | FlightSound | ExplosionSound

// ============================================================================
// Discriminated Union Types
// ============================================================================

/**
 * Coordinate union type supporting both full and reduced forms.
 *
 * @typedef {(Coord | readonly [number, number])} CoordinateLike
 */
export type CoordinateLike = Coord | readonly [number, number]

/**
 * Weapon configuration union supporting various config formats.
 *
 * @typedef {(WeaponConfig & Partial<SplashConfig & CursorConfig & AnimationConfig>)} FullWeaponConfig
 */
export type FullWeaponConfig = WeaponConfig &
  Partial<SplashConfig & CursorConfig & AnimationConfig>
