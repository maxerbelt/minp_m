/**
 * Barrel export for all space terrain type definitions.
 *
 * Centralizes type exports for clean, organized imports throughout the space terrain module.
 * Enables consistent type usage and simplifies import statements.
 *
 * @module terrains/space/types
 */

// Grid and coordinate types
export type {
  Coord,
  GridSize,
  UnitCell,
  CellLayout,
  RackPosition,
  RackLayout,
  AoeCell,
  AoePattern,
  CoordBracket,
  AsteroidLayout
} from './grid.types'

// Configuration types
export type {
  ZoneConfig,
  SubTerrainConfig,
  ShipCountMap,
  ShipCountConfig,
  MapConfig,
  SpaceTerrainConfig,
  TerrainMapConfiguration,
  WeaponDamageMapping,
  MapSizeCode,
  MapScenario
} from './config.types'

export interface {
  ZoneConfig,
  SubTerrainConfig,
  ShipCountMap,
  MapConfig,
  SpaceTerrainConfig,
  TerrainMapConfiguration,
  MapScenario
} from './config.types'

// Domain types
export type {
  ShipTypeCode,
  SinkDescription,
  GroupName,
  PlacementRule,
  ShipTypeCodeMapping,
  PlacementValidator,
  SpecialProperties,
  UnitNotes
} from './domain.types'

export interface {
  ShipTypeMapping,
  ShipGroupsConfig
} from './domain.types'

// Weapon system types
export type {
  OpposingViewModel,
  WeaponCoordinates
} from './weapon.types'

export interface {
  GameModel,
  ViewModel,
  TerrainMap,
  DualBoardCells,
  WeaponLaunchContext,
  WeaponConfig,
  WeaponSoundConfig,
  WeaponVariant,
  HitResult,
  SplashConfig
} from './weapon.types'

// Shape and fleet types
export type {
  ShapeConstructor,
  WeaponFactory,
  RailgunConfig,
  FleetUnit,
  SpaceFleet
} from './shape.types'

export interface {
  CellConfig,
  VesselConfig,
  ShuttleConfig,
  InstallationConfig,
  ArmedShapeConfig,
  CellConfigLayer,
  HybridShipConfig,
  TransformerFormConfig,
  TransformerConfig
} from './shape.types'

// Audio types
export type {
  AudioAsset,
  AudioContext
} from './audio.types'

export interface {
  WeaponSoundMap,
  SoundEffect,
  AudioResourcePack,
  AudioManager
} from './audio.types'
