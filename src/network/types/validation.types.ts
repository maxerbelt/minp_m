/**
 * Validation types for network module operations.
 * Provides discriminated union types for validation results and validation schema definitions.
 *
 * @module network/types/validation
 */

import type { MapDimensions, MapConfiguration } from './params.types.js'

/**
 * Successful validation result.
 * Discriminated union variant indicating validation passed.
 *
 * @typedef {Object} ValidationSuccess
 * @property {true} valid - Always true for this variant
 * @property {undefined} error - No error message
 */
interface ValidationSuccess {
  readonly valid: true
  readonly error: undefined
}

/**
 * Failed validation result.
 * Discriminated union variant indicating validation failed.
 *
 * @typedef {Object} ValidationFailure
 * @property {false} valid - Always false for this variant
 * @property {string} error - Detailed error message
 */
interface ValidationFailure {
  readonly valid: false
  readonly error: string
}

/**
 * Validation result discriminated union.
 * Use narrowing to handle success and failure cases.
 *
 * @typedef {ValidationSuccess | ValidationFailure} ValidationResult
 *
 * @example
 * const result = validateMapDimensions(height, width)
 * if (result.valid) {
 *   // result type is ValidationSuccess
 *   console.log('Dimensions valid')
 * } else {
 *   // result type is ValidationFailure
 *   console.error('Error:', result.error)
 * }
 */
export type ValidationResult = ValidationSuccess | ValidationFailure

/**
 * Extended validation result with validated data.
 * Includes the original input data along with validation status.
 *
 * @typedef {Object} ValidationResultWithData
 * @template T - Type of the validated data
 */
export interface ValidationResultWithData<T> extends ValidationResult {
  readonly data: T
}

/**
 * Configuration validator interface.
 * Provides contract for validation implementations.
 *
 * @typedef {Object} ConfigurationValidator
 */
export interface ConfigurationValidator {
  /**
   * Validates map dimensions.
   * @param {number} height - Height to validate
   * @param {number} width - Width to validate
   * @returns {ValidationResult} Validation result
   */
  validateDimensions(height: number, width: number): ValidationResult

  /**
   * Validates map name/title.
   * @param {string} title - Map title to validate
   * @returns {ValidationResult} Validation result
   */
  validateMapTitle(title: string): ValidationResult

  /**
   * Validates complete map configuration.
   * @param {MapConfiguration} config - Configuration to validate
   * @returns {ValidationResult} Validation result
   */
  validateConfiguration(config: MapConfiguration): ValidationResult
}

/**
 * Dimension validation rules.
 * Defines constraints for valid map dimensions.
 *
 * @typedef {Object} DimensionValidationRules
 * @property {number} [minHeight=1] - Minimum valid height
 * @property {number} [maxHeight=256] - Maximum valid height
 * @property {number} [minWidth=1] - Minimum valid width
 * @property {number} [maxWidth=256] - Maximum valid width
 */
export interface DimensionValidationRules {
  readonly minHeight?: number
  readonly maxHeight?: number
  readonly minWidth?: number
  readonly maxWidth?: number
}

/**
 * Map title validation rules.
 * Defines constraints for valid map names.
 *
 * @typedef {Object} TitleValidationRules
 * @property {number} [minLength=1] - Minimum title length
 * @property {number} [maxLength=100] - Maximum title length
 * @property {RegExp} [pattern] - Title must match pattern if provided
 * @property {string[]} [reservedNames] - Names that are not allowed
 */
export interface TitleValidationRules {
  readonly minLength?: number
  readonly maxLength?: number
  readonly pattern?: RegExp
  readonly reservedNames?: readonly string[]
}

/**
 * Parameter change validation schema.
 * Specifies which parameter changes are valid in which contexts.
 *
 * @typedef {Object} ParameterValidationSchema
 * @property {string[]} [requiredParameters] - Parameters that must be present
 * @property {string[]} [allowedParameters] - Parameters that are allowed
 * @property {Record<string, RegExp>} [parameterPatterns] - Patterns each parameter must match
 */
export interface ParameterValidationSchema {
  readonly requiredParameters?: readonly string[]
  readonly allowedParameters?: readonly string[]
  readonly parameterPatterns?: Readonly<Record<string, RegExp>>
}
