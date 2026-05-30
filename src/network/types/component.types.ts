/**
 * Component loading and injection types.
 * Defines interfaces for HTML component fetching and DOM insertion operations.
 *
 * @module network/types/component
 */

import type { ComponentCallback } from './shared.types.js'

/**
 * Configuration for component loading operation.
 * Contains URL, target element ID, and optional callback.
 *
 * @typedef {Object} ComponentLoadConfig
 * @property {string} url - URL of the HTML component to fetch
 * @property {string} targetId - DOM element ID where component will be inserted
 * @property {ComponentCallback} [callback] - Optional callback after insertion
 * @property {AbortSignal} [signal] - Optional abort signal for cancellation
 */
export interface ComponentLoadConfig {
  readonly url: string
  readonly targetId: string
  readonly callback?: ComponentCallback
  readonly signal?: AbortSignal
}

/**
 * Result of component loading operation.
 * Contains success status and optional error details.
 *
 * @typedef {Object} ComponentLoadResult
 * @property {boolean} success - Whether component loaded successfully
 * @property {string | null} html - Component HTML content if successful
 * @property {Error | null} error - Error object if operation failed
 * @property {number} [statusCode] - HTTP status code if available
 */
export interface ComponentLoadResult {
  readonly success: boolean
  readonly html: string | null
  readonly error: Error | null
  readonly statusCode?: number
}

/**
 * Component response metadata.
 * Information about the loaded component.
 *
 * @typedef {Object} ComponentMetadata
 * @property {string} url - URL from which component was loaded
 * @property {number} size - Size of HTML content in bytes
 * @property {Date} loadedAt - Timestamp when component was loaded
 * @property {number} loadTime - Time taken to load component (ms)
 */
export interface ComponentMetadata {
  readonly url: string
  readonly size: number
  readonly loadedAt: Date
  readonly loadTime: number
}
