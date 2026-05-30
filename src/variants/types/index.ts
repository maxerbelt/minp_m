/**
 * @fileoverview Consolidated barrel export for all variants system types.
 * Re-exports all type definitions from dedicated type modules for convenient access.
 * Enables single-import usage: `import type { PlacementValidator, Board } from './types'`
 *
 * @module variants/types
 */

// Callback and function signature types
export type {
  BoundsChecker,
  AreaBoundsChecker,
  ZoneInfoGetter,
  PlacementValidator,
  VariantTransitionFn,
  OnChangeCallback
} from './callbacks.types'

// Placement and board interface types
export type {
  ZoneInfo,
  PlacementTarget,
  Board,
  ShipCellGrid
} from './placement.types'

// Variant system types
export type {
  VariantIndex,
  ZoneDetailType,
  VariantGroup,
  VariantTypeHandler,
  SymmetryType,
  VariantBoard,
  VariantCapabilities,
  VariantState,
  Weapon,
  WeaponCellMap,
  SubGroupPlaced
} from './variants.types'

// Shared utility types
export type {
  MaskType,
  SubBoardType,
  Coordinates2D,
  CoordinatesWithValues,
  Dimensions,
  Position,
  Rectangle,
  OperationResult,
  StringMap,
  Nullable,
  Optional,
  Constructor
} from './shared.types'
