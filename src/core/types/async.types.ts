/**
 * Asynchronous callback and timing types for Delay and loop management.
 */

/**
 * Check function to determine if an async loop should cancel.
 * Evaluated on each iteration before executing the iteration task.
 *
 * @returns True if loop should cancel, false to continue
 */
export type CancellationCheck = () => boolean;

/**
 * Callback invoked when an async loop is cancelled by CancellationCheck.
 */
export type CancellationCallback = () => void;

/**
 * Callback invoked when an async loop encounters an error during iteration.
 *
 * @param error The caught error from iterationTask
 */
export type ErrorCallback = (error: Error) => void;

/**
 * Callback invoked when an async loop completes.
 * Called regardless of exit reason (cancel, error, or natural end).
 */
export type CompletionCallback = () => void;

/**
 * Async task function executed in a loop iteration.
 * Should perform a single iteration of work.
 *
 * @returns Promise that resolves when iteration completes
 */
export type IterationTask = () => Promise<void>;

/**
 * Configuration for an async loop.
 * Combines iteration task, timing, and callback handlers.
 */
export interface LoopConfig {
  /** Task to execute each iteration */
  task?: IterationTask;
  /** Milliseconds between iterations */
  interval?: number;
  /** Function to check if loop should cancel */
  isCancelled?: CancellationCheck;
  /** Callback when loop is cancelled */
  onCancel?: CancellationCallback;
  /** Callback when loop encounters an error */
  onError?: ErrorCallback;
  /** Callback when loop completes */
  onComplete?: CompletionCallback;
}

/**
 * Result of a completed async loop.
 */
export interface LoopResult {
  /** How the loop ended: 'complete', 'cancelled', or 'error' */
  exitReason: 'complete' | 'cancelled' | 'error';
  /** Total iterations executed */
  iterations: number;
  /** Total elapsed time in milliseconds */
  elapsed: number;
  /** Error if exit reason was 'error' */
  error?: Error;
}

/**
 * Timing parameters for async operations.
 */
export interface TimingConfig {
  /** Minimum delay in milliseconds */
  min?: number;
  /** Maximum delay in milliseconds */
  max?: number;
  /** Fixed delay in milliseconds */
  fixed?: number;
}

/**
 * Random delay range.
 */
export interface DelayRange {
  /** Minimum delay in milliseconds (inclusive) */
  min: number;
  /** Maximum delay in milliseconds (inclusive) */
  max: number;
}
