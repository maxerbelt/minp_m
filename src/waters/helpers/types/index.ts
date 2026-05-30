/**
 * @module waters/helpers/types
 * Barrel export for all type definitions.
 *
 * This module provides centralized exports for all TypeScript type definitions
 * used across the waters/helpers module. Organized by category for easy discovery
 * and maintenance.
 *
 * @example
 * ```typescript
 * import type { Ship, Weapon } from './types/index.ts'
 * import type { ElementCache, TrayManager } from './types/index.ts'
 * ```
 */

// Domain types: Ships, weapons, displacement, terrain
export type {
  Weapon,
  WeaponSlot,
  WeaponSystem,
  Ship,
  ShipShape,
  DisplacementThreshold,
  TerrainGroup,
  TallyCount,
  ColorMaps,
  WeaponMaps
} from './domain.types'

// UI types: Elements, caching, tray management
export type {
  ElementCacheButtons,
  ElementCacheTrays,
  ElementCache,
  TrayStateOptions,
  TrayManagerElementCache,
  TrayAction,
  TrayItemAdapter,
  TallyTrack,
  DragContainerOptions
} from './ui.types'

// Callback signatures: Functional contracts across modules
export type {
  RackAtCallback,
  GetTurnCallback,
  MakeKeyIdsCallback,
  GetPrimaryWeaponCallback,
  DisplacementForCallback,
  ShapeCallback,
  InBoundsCallback,
  CellCallback,
  CellReducer,
  ZoneRecalcCallback,
  ZoneSizesCallback
} from './callbacks.types'

// CSS types: Class registries and style configurations
export type {
  CellClassGroup,
  CellClassGroups,
  HitStateCellConfig,
  TallyCSSClasses,
  WeaponCSSClasses,
  TrayCSSClasses,
  ShipCellCSSClasses,
  DirectionConstants,
  StyleDefaults,
  ZoneStyleDefaults,
  SunkStyleConfig,
  WeaponStyleDefaults,
  ColorStyleDefaults
} from './css.types'

// Geometry types: Grid, coordinates, spatial operations
export type {
  GridMap,
  DimensionedGridMap,
  MapConfig,
  NeighborhoodSpan,
  Coordinate,
  CellWithData,
  ZoneSizes,
  ShapeWithSize,
  ShapeObject,
  BoardConfig,
  PrintBoardConfig,
  IterationOptions,
  GridDimensions
} from './geometry.types'

// Shared types: Utility types and configurations
export type {
  ZoneTracker,
  ZoneEntry,
  WeaponBoxOptions,
  CellDataAttributes,
  NavigationDirections,
  GameModel,
  CSSGridConfig,
  Container,
  PositionedElement,
  Range,
  BoundingBox
} from './shared.types'
