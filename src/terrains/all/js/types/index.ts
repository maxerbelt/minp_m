/**
 * @fileoverview Central Type Definition Exports for Terrain System
 *
 * Barrel export providing convenient access to all type definitions across
 * the terrain system. Organize types by category for clarity and maintainability.
 *
 * @module terrains/all/js/types/index
 */

// Shared types - DTOs, configs, utility types
export type {
  SubTerrainZone,
  TerrainValidator,
  RangeElement,
  TerrainObject,
  TerrainSoundConfig,
  BoundsCheckFunction,
  ShipBuilderFunction,
  FleetBuilderFunction,
  ShapesByLetterFunction,
  Constructor,
  UnitDescriptions,
  SplashTagsMap,
  ShipConfig,
  SoundConfig,
  AudioManager
} from './shared.types.js'

// Callback types - Function signatures for UI, events, and handlers
export type {
  TextContentRenderer,
  InnerHTMLRenderer,
  ClassPredicate,
  CustomizeUnitCallback,
  OnMapChangeCallback,
  SunkDescriptionFn,
  AddShapesFn,
  AddWeaponsFn
} from './callbacks.types.js'

// UI types - UI components and dimension management
export type {
  DimensionResult,
  UrlParams,
  DimensionInputUI,
  TerrainMapContainer
} from './ui.types.js'

// Map types - Map management and configuration
export type {
  TerrainMap,
  TerrainMapType,
  GameMapsRegistry,
  MapWithIndex,
  TerrainShipCatalogue,
  WeaponCatalogue
} from './maps.types.js'

// Terrain types - Terrain management and configuration
export type {
  TerrainManager,
  CustomMap,
  BattleHandler,
  Terrain
} from './terrain.types.js'

// Domain types - Class references and domain models
export type {
  SubTerrainBase,
  SubTerrain,
  Zone,
  BhMap,
  CustomMap as CustomMapDomain,
  CustomBlankMap,
  SavedCustomMap,
  EditedCustomMap,
  SubTerrainTracker,
  SubTerrainTrackers
} from './domain.types.js'
