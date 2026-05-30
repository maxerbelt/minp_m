/**
 * Barrel export for all network module types.
 * Central entry point for type imports across the application.
 *
 * Organized by concern:
 * - shared: Common callback and utility types
 * - params: URL parameter extraction and configuration types
 * - terrain: Terrain system configuration types
 * - component: Component loading and injection types
 * - operation: High-level operation and state change types
 * - validation: Validation result and validator interface types
 * - terrain-integrations: External terrain system adapter types
 *
 * @module network/types
 */

export type {
  ComponentCallback,
  StateUpdateCallback,
  TokenPair,
  TokenMap,
  ParamValue
} from './shared.types.js'

export type {
  MapDimensions,
  ParameterChanges,
  ParameterResult,
  MapConfiguration,
  ParameterMode,
  ParamKey
} from './params.types.js'

export { PARAM_KEYS, PARAM_DEFAULTS } from './params.types.js'

export type {
  TerrainData,
  TerrainState,
  TerrainMap,
  TerrainType,
  TerrainContext
} from './terrain.types.ts'

export { TERRAIN_TYPES, TERRAIN_DEFAULTS } from './terrain.types.js'

export type {
  ComponentLoadConfig,
  ComponentLoadResult,
  ComponentMetadata
} from './component.types.js'

export type {
  UrlParameterOperation,
  ParameterOperationAudit,
  MapStateChange,
  OperationResult,
  OperationOptions
} from './operation.types.js'

export type {
  ValidationResult,
  ValidationResultWithData,
  ConfigurationValidator,
  DimensionValidationRules,
  TitleValidationRules,
  ParameterValidationSchema
} from './validation.types.js'

export type {
  TerrainHandler,
  TerrainMap as TerrainIntegrationMap,
  TerrainCatalog,
  ValidatedTerrainContext,
  TerrainFallbackStrategy,
  TerrainInitOptions,
  TerrainInitResult
} from './terrain-integrations.types.js'
