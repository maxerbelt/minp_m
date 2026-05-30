/**
 * Weapon system type definitions
 * Barrel export for all type modules
 *
 * This index provides centralized access to all weapon-related types,
 * reducing import complexity and promoting type consistency across modules.
 */

// Coordinate and direction types
export type { Coord, CoordPair, DirectionOffset, CardinalDirections, DiagonalDirections, PixelCoord, CoordinateValidation } from './coordinates.types'

// Area-of-effect types
export type { AoeCell, AoePattern, AoeResult, SplashConfig, LineAoeConfig, AoeOptions } from './aoe.types'

// Map and terrain types
export type { TerrainCheck, TerrainType, BoundsCheckResult, TerrainCheckWithRadius } from './map.types'
export type { MapLike } from './map.types'

// Animation types
export type { AnimationOptions, AnimationResult, AnimatorContext, ExplodeOptions, AnimationTiming, SplashAnimationConfig, RippleConfig, FlightAnimationState } from './animation.types'

// Launcher and targeting types
export { TargetingMode } from './launcher.types'
export type { LaunchContext, CoordinateProcessor, LaunchResult, LaunchParams, CursorLaunchState, PostTargetLaunchInfo } from './launcher.types'

// Weapon configuration types
export type { WeaponConfig, AreaWeaponConfig, ProjectileWeaponConfig, ScanningWeaponConfig, DragShape, WeaponPropertyConfig, WeaponConfigMap } from './config.types'

// Weapon types
export type { IWeapon, IWeaponAnimatable, WeaponInstance, WeaponByLetterMap, WeaponMetadata, WeaponEffectInfo, WeaponState } from './weapon.types'

// Weapon system types
export type { IWeaponSystem, CombinedSystemState, AttachedSystemState, WeaponSystemBuildOptions, WeaponSystemQueryResult, AmmoSnapshot, SystemHierarchyInfo, AggregationState } from './weapon-system.types'

// Geometry types
export type { LineIntercepts, LineSegment, PolarCoord, BoundingRect, PieSegmentParams, RotationAngle, ScaleFactor, VectorResult } from './geometry.types'
export type { CanvasContext } from './geometry.types'
