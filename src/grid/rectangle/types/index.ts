/**
 * Rectangle Grid Type Definitions - Barrel Export
 * 
 * Central export point for all type definitions in the rectangle grid module.
 * Enables clean imports: import type { Coordinate, TransformMaps } from './types'
 * 
 * Organized by domain:
 * - Geometry: Coordinates, directions, dimensions
 * - Grid: Shape config, indexes, connectivity
 * - Callbacks: Function signatures for algorithms
 * - Transformation: D4 symmetry group operations
 * - Coverage: Line drawing and Bresenham algorithms
 * - Masks: Bitboard storage and mask interfaces
 * - Ship: Ship placement and grid management
 * - Redelmeier: Polyomino generation
 */

// Geometry Types
export type {
  Location,
  Coordinate,
  ValidatedCoordinates,
  CoordinateWithValue,
  NeighborOffset,
  DirectionVector,
  GridDimensions,
  BoundingBox,
  BoundingBoxResult
} from './geometry.types'

// Grid Types
export type {
  RectangleShapeConfig,
  BattleMap,
  CoordinateTuple,
  SymbolMap,
  MaskLike,
  CoverTypes,
  ConnectionTypes,
  TransformCapabilities
} from './grid.types'

// Callback Types
export type {
  CoordinateValidator,
  CoordinateIndexer,
  ExitCondition,
  CornerHandler,
  CellIteratorCallback,
  CellPredicateCallback,
  CoordinateTransform,
  IndexTransformer,
  TransformWithData
} from './callbacks.types'

// Transformation Types
export {
  D4TransformName,
  OrbitType
} from './transformation.types'

export type {
  TransformMap,
  TransformMaps,
  TransformMapObject,
  TransformMapArray,
  SymmetryGroup,
  CanonicalForm,
  TransformComposition
} from './transformation.types'

// Coverage Types
export type {
  StepResult,
  DeltaAndDirectionInfo,
  LineTraversalState,
  RayConfiguration,
  SegmentConfiguration,
  CircleConfiguration,
  PolygonConfiguration,
  CoverageStats
} from './coverage.types'

export type { CoverageMode } from './coverage.types'

// Masks Types
export type {
  BitboardStore,
  GridIndexer,
  RectangleMask,
  MorphologicalOps,
  BlitOperationInterface
} from './masks.types'

// Ship Types
export type {
  ShipCell,
  ShipCellEntry,
  ShipCellRow,
  ShipCellGridData,
  Ship,
  Placement,
  Placeable,
  ShapeInfo,
  PlacementAttempt,
  FleetConfiguration,
  FleetPlacement,
  RandomPlacementOptions
} from './ship.types'

// Redelmeier Types
export type {
  RedelmeierBitStore,
  RedelmeierState,
  Polyomino,
  CanonicalFormId,
  RedelmeierOptions,
  RedelmeierResult,
  FrontierCell,
  PolyominoSymmetry,
  PolyominoComparison
} from './redelmeier.types'

export type { RedelmeierOptions as RedelmeierGenerationOptions } from './redelmeier.types'
