/**
 * @fileoverview Validation and error type definitions.
 *
 * Provides type definitions for validation operations, error reporting,
 * and compatibility checking between masks and operations.
 */

/**
 * Validation error information.
 * Structured error reporting for mask validation failures.
 *
 * @interface ValidationError
 */
export interface ValidationError {
  /** Detailed validation error message */
  message: string;

  /** Error classification for programmatic handling */
  code: 'TYPE_MISMATCH' | 'DIMENSION_MISMATCH' | 'EMPTY_MASK' | 'FULL_MASK' | 'INVALID_STATE';

  /** Additional context or recovery suggestions */
  context?: Record<string, unknown>;
}

/**
 * Validation result with boolean outcome.
 * Simple pass/fail result from validation check.
 *
 * @interface ValidationResult
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Error details if validation failed */
  error?: ValidationError;
}

/**
 * Generic validation result with data payload.
 * Used when validation returns computed data on success.
 *
 * @interface ValidationResultWithData
 * @template T
 */
export interface ValidationResultWithData<T = unknown> extends ValidationResult {
  /** Computed data from validation (only present if valid) */
  data?: T;
}

/**
 * Compatibility check result.
 * Indicates whether two masks are compatible for operations.
 *
 * @interface CompatibilityCheck
 */
export interface CompatibilityCheck extends ValidationResult {
  /** Whether masks have same type */
  sameType?: boolean;

  /** Whether masks have compatible dimensions */
  sameDimensions?: boolean;

  /** Which type was expected */
  expectedType?: string;

  /** Which type was found */
  actualType?: string;
}

/**
 * Mask state validation result.
 * Checks the occupancy and validity state of a mask.
 *
 * @interface StateValidation
 */
export interface StateValidation extends ValidationResult {
  /** Whether mask is empty (no set bits) */
  isEmpty?: boolean;

  /** Whether mask is completely full (all bits set) */
  isFull?: boolean;

  /** Number of occupied cells */
  occupancy?: number;

  /** Occupancy as percentage (0-100) */
  occupancyPercent?: number;
}

/**
 * Dimension validation result.
 * Validates grid dimensions are valid and compatible.
 *
 * @interface DimensionValidation
 */
export interface DimensionValidation extends ValidationResult {
  /** Width of the grid */
  width?: number;

  /** Height of the grid */
  height?: number;

  /** Total cell count */
  size?: number;

  /** Whether dimensions form a valid rectangle */
  isValidRectangle?: boolean;
}

/**
 * Type of validation operation.
 * Indicates which aspect of the mask is being validated.
 *
 * @typedef {('compatibility' | 'state' | 'dimensions' | 'type')} ValidationType
 */
export type ValidationType = 'compatibility' | 'state' | 'dimensions' | 'type';

/**
 * Validation context information.
 * Provides context for error messages and recovery suggestions.
 *
 * @interface ValidationContext
 */
export interface ValidationContext {
  /** Type of validation being performed */
  type: ValidationType;

  /** Operation that triggered validation */
  operation?: string;

  /** Which mask is being validated */
  maskName?: string;

  /** Expected value or state */
  expected?: unknown;

  /** Actual value or state */
  actual?: unknown;
}
