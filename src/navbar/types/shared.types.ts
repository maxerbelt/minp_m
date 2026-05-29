/**
 * Shared type definitions and utilities
 * Used across multiple modules in the navbar folder
 */

// ============================================================================
// Primitive & Common Types
// ============================================================================

/** Generic object with string keys */
export type StringMap<T = any> = Record<string, T>;

/** Nullable value type */
export type Nullable<T> = T | null | undefined;

/** Result of an operation that may succeed or fail */
export type Result<T> = T | null;

// ============================================================================
// DOM-Related Types
// ============================================================================

/** HTML element reference or element ID string */
export type ElementReference = HTMLElement | string;

/** Resolved DOM element or null if not found */
export type ResolvedElement = HTMLElement | null;

/** Element insert point - ID or DOM reference */
export type InsertPoint = string | Element;

// ============================================================================
// Error Handling
// ============================================================================

/** Generic error handler */
export type ErrorHandler = (error: Error) => void;

/** Optional error callback */
export type OptionalErrorHandler = ErrorHandler | null | undefined;

// ============================================================================
// Validation & State
// ============================================================================

/** Generic value validator function */
export type Validator<T = any> = (value: T) => T;

/** Generic change notification callback */
export type ChangeListener<T = any> = (value: T) => void;

/** Function that checks if a condition is met */
export type Predicate<T = any> = (value: T) => boolean;

// ============================================================================
// Collection Types
// ============================================================================

/** Mapping of keys to values */
export type ValueMap = StringMap<string | number>;

/** Set of flags by name */
export type FlagMap = StringMap<boolean>;

/** Array of normalized items */
export type NormalizedArray<T> = ReadonlyArray<T>;

// ============================================================================
// Factory & Provider Patterns
// ============================================================================

/** Generic factory function */
export type Factory<T> = () => T;

/** Factory with configuration */
export type ConfiguredFactory<T, Config> = (config: Config) => T;

/** Provider interface for accessing resources */
export interface Provider<T> {
  get(): T;
  getOrDefault(defaultValue: T): T;
}
