/**
 * Central type definitions barrel export for grid module.
 * 
 * Provides a single entry point for all type imports from the grid system:
 * 
 * ```ts
 * import type { Coordinate, ShapeConfig, GridIndexer } from './types'
 * ```
 * 
 * Organized by category for clarity and maintainability.
 * 
 * @module grid/types
 */

// ============================================================================
// Shared Coordinate & Geometry Types
// ============================================================================
export type {
  Coordinate,
  Location,
  CoordinateWithValue,
  CoordinateWithIndex,
  GridEntry,
  NeighborOffset,
  ValidatedCoordinate,
  CoordinateList,
  CoordinateValueList,
} from './shared.types.js';

export type { DirectionVector, GridDimensions } from './shared.types.js';

export type {
  BoundingBox,
  BoundingBoxResult,
  LineParameters,
  InterceptResult,
  PlacementPosition,
} from './shared.types.js';

// ============================================================================
// Core Interface Types (Stores, Indexers, Masks)
// ============================================================================
export type {
  BitboardStore,
  GridIndexer,
  CubeHelper,
  TransformMap,
  TransformMapObject,
  TransformMaps,
  MaskLike,
  CanvasSurface,
} from './interfaces.types.js';

// ============================================================================
// Callback Function Signatures
// ============================================================================
export type {
  CoordinateValidator,
  CoordinateIndexer,
  ExitCondition,
  CoordinateTransform,
  IndexTransformer,
  TransformWithData,
  CellCallback,
  CellReducer,
  CellPredicate,
  CellTransform,
  InBoundsCallback,
  CornerHandler,
  LineParametersCalculator,
  PieDrawer,
  VariantHandler,
  CoordinateGenerator,
} from './callbacks.types.js';

// ============================================================================
// Configuration Objects
// ============================================================================
export type {
  ShapeConfig,
  ShapeIndexer,
  RectangleShapeConfig,
  HexagonShapeConfig,
  TriangleShapeConfig,
  TriangleRectConfig,
  MaskConfig,
  ActionsConfig,
  PlacementConstraints,
  CanvasDrawConfig,
  SubMaskConfig,
  SubBoardConfig,
} from './config.types.js';

// ============================================================================
// Drawing & Shape Types
// ============================================================================
export type {
  CanvasSurface as DrawingCanvas,
  PieDrawConfig,
  RayDrawConfig,
  LineDrawConfig,
  BresenhamState,
  LineDrawResult,
  Shape,
  ShapeVariant,
  ShapeInfo,
  Polyomino,
  PolyominoInfo,
  BoundaryIntercept,
  AsymptoticLineHelper,
} from './drawing.types.js';

// ============================================================================
// Re-exports for convenience (commonly used together)
// ============================================================================
export type { CanvasSurface as DrawTarget } from './interfaces.types.js';
