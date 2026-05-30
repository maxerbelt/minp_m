/**
 * Operation and state change types for URL parameter manipulation.
 * Provides higher-level types that represent complete parameter operations
 * and state transitions in the network module.
 *
 * @module network/types/operation
 */

import type { ParamValue, TokenPair } from './shared.types.js'
import type { MapConfiguration, ParameterChanges } from './params.types.js'

/**
 * Represents a single URL parameter change operation.
 * Tracks the before/after state of a parameter modification.
 *
 * @typedef {Object} UrlParameterOperation
 * @property {ParamValue} previousValue - Parameter value before change (may be undefined)
 * @property {ParamValue} newValue - Parameter value after change (may be undefined)
 * @property {string} parameterKey - URL parameter key being changed
 * @property {Date} timestamp - When the change occurred
 */
export interface UrlParameterOperation {
  readonly previousValue: ParamValue
  readonly newValue: ParamValue
  readonly parameterKey: string
  readonly timestamp: Date
}

/**
 * Audit trail for a complete URL parameter update.
 * Records all parameter changes in a single operation with context.
 *
 * @typedef {Object} ParameterOperationAudit
 * @property {UrlParameterOperation[]} operations - Individual parameter changes
 * @property {string} operationType - Type of operation ('setSizeParams', 'setMapParams', etc.)
 * @property {boolean} success - Whether operation completed successfully
 * @property {Error | null} error - Error details if operation failed
 */
export interface ParameterOperationAudit {
  readonly operations: readonly UrlParameterOperation[]
  readonly operationType: string
  readonly success: boolean
  readonly error: Error | null
}

/**
 * Complete map state change with parameter updates.
 * Represents a transition from one map configuration to another.
 *
 * @typedef {Object} MapStateChange
 * @property {MapConfiguration} previousState - Map configuration before change
 * @property {MapConfiguration} newState - Map configuration after change
 * @property {ParameterChanges} parameterChanges - URL parameter modifications applied
 * @property {TokenPair[]} titleTokens - Tokens used to update page title
 * @property {Date} timestamp - When the state change occurred
 */
export interface MapStateChange {
  readonly previousState: MapConfiguration
  readonly newState: MapConfiguration
  readonly parameterChanges: ParameterChanges
  readonly titleTokens: readonly TokenPair[]
  readonly timestamp: Date
}

/**
 * Result of a parameter operation.
 * Indicates success/failure and provides state information.
 *
 * @typedef {Object} OperationResult<T>
 * @property {boolean} success - Whether operation succeeded
 * @property {T | null} data - Operation result data if successful
 * @property {Error | null} error - Error details if operation failed
 * @property {ParameterOperationAudit | null} audit - Audit trail if applicable
 */
export interface OperationResult<T> {
  readonly success: boolean
  readonly data: T | null
  readonly error: Error | null
  readonly audit: ParameterOperationAudit | null
}

/**
 * Configuration for parameter operation with audit logging.
 * Controls how parameter changes are tracked and validated.
 *
 * @typedef {Object} OperationOptions
 * @property {boolean} [audit=false] - Whether to record audit trail
 * @property {boolean} [validate=true] - Whether to validate parameters before applying
 * @property {boolean} [updateTitle=true] - Whether to update page title
 * @property {boolean} [pushHistory=true] - Whether to push to browser history
 */
export interface OperationOptions {
  readonly audit?: boolean
  readonly validate?: boolean
  readonly updateTitle?: boolean
  readonly pushHistory?: boolean
}
