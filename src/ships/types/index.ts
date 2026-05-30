/**
 * @file index.ts - Barrel export for ships type definitions
 * @description Central export point for all type definitions in the ships module
 */

// Coordinate types
export type {
  CoordinatePair,
  CoordPair,
  CellCoordinates,
  CoordinateKey,
} from "./coordinates.types.js";
export {
  makeCoordinateKey,
  parseCoordinateKey,
} from "./coordinates.types.js";

// Geometry types
export type {
  Mask,
  SubBoard,
  Board,
  LayerBoards,
  BoardDimensions,
  BoardMetrics,
} from "./geometry.types.js";

// Callback and validator types
export type {
  SubShapeValidator,
  AmmoBuilder,
  PlacementFilter,
  BoardExpander,
  BoardCallback,
  MetricCalculator,
  AnimationCallback,
  ResetCallback,
  AmmoChecker,
} from "./callbacks.types.js";

// External interface types
export type {
  SubTerrain,
  WeaponSystemRef,
  GameGrid,
  ShipCellGridInterface,
  UIViewModelInterface,
  GameModelInterface,
  Ship,
  VariantFactory,
} from "./interfaces.types.js";

// Weapon types
export type {
  RackInput,
  PositionedWeaponSystem,
  Rack,
  WeaponMap,
  WeaponEntry,
  WeaponAtPosition,
  RackConfiguration,
} from "./weapons.types.js";

// Placement and hit result types
export type {
  Placement,
  CellHitRecord,
  HitResult,
  DamageResult,
  MagazineHitResult,
  HitCoordinate,
  PlacementValidation,
  ShipPlacementRecord,
} from "./placement.types.js";

// Ship shape types
export type {
  SymmetryType,
  BaseShape,
  ShipShape,
  ProtectionLevel,
  DamageProfile,
  SubShapeComponent,
  SubShapeGroup,
  VariantConfig,
  ShapeDefinition,
} from "./shapes.types.js";

// Catalog and metadata types
export type {
  SunkDescriptionMap,
  UnitDescriptionMap,
  UnitInfoMap,
  ShipLetterColorMap,
  ShipDescriptionMap,
  ShipTypeMap,
  ShipColorMap,
  ShipGroupsContainer,
  CatalogueEntry,
  ShipCatalogueInterface,
} from "./catalog.types.js";

// Sub-shape types
export type {
  SubShapeConfig,
  SubShapeBase,
  StandardCellsSubShape,
  SpecialCellsSubShape,
  SubShape,
  BoardExpansionResult,
  DimensionNormalization,
} from "./subshape.types.js";
