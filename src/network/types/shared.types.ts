/**
 * Shared type definitions used across the network module.
 * Contains callback signatures, token pairs, and common utility types.
 *
 * @module network/types/shared
 */

/**
 * Callback function signature for component loading operations.
 * Invoked after component insertion succeeds or when an error occurs.
 * When called with no error parameter, indicates successful operation.
 * When called with an error parameter, indicates operation failure.
 *
 * @callback ComponentCallback
 * @param {Error} [error] - Error object if operation failed, undefined on success
 * @returns {void}
 */
export type ComponentCallback = (error?: Error) => void

/**
 * Callback function signature for state update operations.
 * Generic callback used for triggering side effects after state changes.
 * May receive optional error context.
 *
 * @callback StateUpdateCallback
 * @param {Error} [error] - Optional error context for failed updates
 * @returns {void}
 */
export type StateUpdateCallback = (error?: Error) => void

/**
 * Key-value pair for template token replacement.
 * First element is the token key, second element is the replacement value.
 * Used in template string substitution operations.
 *
 * @typedef {readonly [key: string, value: string]} TokenPair
 */
export type TokenPair = readonly [key: string, value: string]

/**
 * Collection of token pairs for batch template substitution.
 * Array of key-value pairs that will be used to replace tokens in templates.
 *
 * @typedef {TokenPair[]} TokenMap
 */
export type TokenMap = TokenPair[]

/**
 * Query string parameter value.
 * Can be a string or undefined if parameter is not present.
 *
 * @typedef {string | undefined} ParamValue
 */
export type ParamValue = string | undefined
