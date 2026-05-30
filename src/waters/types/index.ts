/**
 * @module waters/types
 * Barrel export for all Waters game type definitions.
 *
 * This module provides centralized exports for all TypeScript type definitions
 * used across the waters game module. Organized by category for easy discovery
 * and maintenance.
 *
 * @example
 * ```typescript
 * import type { Ship, Weapon, WeaponSystem } from './types'
 * import type { WeaponResult, HitResult } from './types'
 * import type { Player, WeaponMode } from './types'
 * ```
 */

// ============================================================================
// Enumerations & Type Aliases
// ============================================================================
export { Player, WeaponMode, UIMode, UIClass } from './enums.types'
export type { EffectType } from './enums.types'

// ============================================================================
// Coordinate & Location Types
// ============================================================================
export type { GridCoordinate, CursorDirection, SelectedCoordinates, ShadowCoords } from './coordinates.types'
export type { Location, BoardContext } from './coordinates.types'

// ============================================================================
// Core Domain Types
// ============================================================================
export type {
  Weapon,
  WeaponSlot,
  WeaponSystem,
  WeaponRack,
  Ship,
  Board,
  MapType,
  Score,
  ShipShape,
  Bitmask
} from './domain.types'

// ============================================================================
// Game State & Results
// ============================================================================
export type {
  WeaponResult,
  WeaponSelection,
  ShipPlacement,
  HitResult,
  TargetResolutionContext,
  EffectNormalizationResult,
  Mask,
  MapInfo,
  SeekLoopContext,
  EffectConstantsConfig
} from './game-state.types'

// ============================================================================
// Game Actions & Events
// ============================================================================
export type {
  WeaponLaunchResult,
  CursorInfo,
  EquippedRack,
  AddRackParams,
  ActivateParams,
  FiringInfo,
  FireWeaponInfoContext,
  SingleShotInfo,
  WeaponSystemWithAmmo,
  WeaponButtonValidation
} from './game-actions.types'
export type { WeaponButtonCallback } from './game-actions.types'

// ============================================================================
// UI Models & Display
// ============================================================================
export type {
  GameModel,
  ViewModel,
  ElementCache,
  WaterDisplayElements,
  ShipStats,
  VisibilityMap,
  GridCellOptions,
  ShipInfo,
  FriendUIConfig,
  ScoreLabelVisibility,
  WeaponBoxOptions,
  ElementCacheIDs
} from './ui-models.types'

// ============================================================================
// Placement Types
// ============================================================================
export type {
  PlacementUI,
  CustomUI,
  CustomMapData,
  ShipShapeForPlacement,
  PlacementWeapon,
  PlacementGameModel
} from './placement.types'
export namespace PlacementCallbacks {
  export type OnShipPlaced = import('./placement.types').PlacementCallbacks.OnShipPlaced
  export type OnShipRemoved = import('./placement.types').PlacementCallbacks.OnShipRemoved
  export type OnPlacementComplete = import('./placement.types').PlacementCallbacks.OnPlacementComplete
  export type OnPlacementClear = import('./placement.types').PlacementCallbacks.OnPlacementClear
}

// ============================================================================
// Callback Function Signatures
// ============================================================================
export type {
  WeaponChangeCallback,
  WeaponActivationCallback,
  WeaponDeactivationCallback,
  HintCallback,
  TurnCallback,
  AimCallback,
  BeginTurnCallback,
  FinishCallback,
  FinishStrategy,
  MaskConditionHandler,
  RackAtCallback,
  GetTurnCallback,
  MakeKeyIdsCallback,
  GetPrimaryWeaponCallback,
  DisplacementForCallback,
  ShapeCallback,
  InBoundsCallback,
  CellClickCallback,
  ElementClassifyCallback,
  ElementIteratorCallback,
  ZoneRecalcCallback,
  TrayItemAdapterCallback,
  DragCallback,
  ValidatorCallback,
  RefreshCallback,
  ErrorCallback,
  CellOperationCallback
} from './callbacks.types'
