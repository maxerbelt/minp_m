import { Random } from './Random.js'

/**
 * Callback function to check if loop should be cancelled
 *
 * @callback CancellationCheck
 * @returns {boolean} True if loop should cancel, false to continue
 */

/**
 * Callback function invoked when loop is cancelled by CancellationCheck
 *
 * @callback CancellationCallback
 * @returns {void}
 */

/**
 * Callback function invoked when loop encounters an error
 *
 * @callback ErrorCallback
 * @param {Error} error - The caught error from iterationTask
 * @returns {void}
 */

/**
 * Callback function invoked when loop completes (cancel, error, or natural end)
 *
 * @callback CompletionCallback
 * @returns {void}
 */

/**
 * Delay utilities for async timing and cancellable loop management
 *
 * Provides promise-based delays with static methods (wait, yield, randomWait)
 * and a configurable async loop pattern via runLoop(). The loop supports
 * cancellation checking, error handling, and completion callbacks for
 * managing long-running async operations.
 *
 * @class Delay
 */
export class Delay {
  /**
   * Default minimum delay for randomWait in milliseconds
   * @static
   * @type {number}
   */
  static DEFAULT_MIN_DELAY = 380

  /**
   * Default maximum delay for randomWait in milliseconds
   * @static
   * @type {number}
   */
  static DEFAULT_MAX_DELAY = 730

  /**
   * Creates a Delay instance with specified default interval
   *
   * Initializes instance callbacks to undefined. Set callbacks before calling runLoop()
   * to handle cancellation, errors, and completion events.
   *
   * @constructor
   * @param {number} delayMs - Default delay in milliseconds for runLoop iterations
   *
   * @example
   * const delay = new Delay(1000)
   * delay.isCancelled = () => shouldStop
   * delay.onError = (err) => console.error(err)
   */
  constructor (delayMs) {
    /** @type {number} - Default iteration interval in milliseconds */
    this.delayMs = delayMs
    /** @type {CancellationCheck|undefined} - Callback to check if loop should stop */
    this.isCancelled = undefined
    /** @type {CancellationCallback|undefined} - Callback when loop is cancelled */
    this.onCancel = undefined
    /** @type {ErrorCallback|undefined} - Callback when iterationTask throws error */
    this.onError = undefined
    /** @type {CompletionCallback|undefined} - Callback when loop ends (always called) */
    this.onComplete = undefined
  }

  /**
   * Pause execution for specified milliseconds
   *
   * Returns a promise that resolves after the given delay. Useful for
   * introducing timing delays in async code.
   *
   * @static
   * @async
   * @param {number} ms - Milliseconds to wait (0 for immediate execution)
   * @returns {Promise<void>} Resolves when timeout completes
   *
   * @example
   * await Delay.wait(1000)  // Wait 1 second
   */
  static wait (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Yield to allow other microtasks to execute (0ms timeout)
   *
   * Allows other pending microtasks and macrotasks to execute before continuing.
   * Useful for preventing long-running loops from blocking the event loop.
   *
   * @static
   * @async
   * @returns {Promise<void>} Resolves on next event loop tick
   *
   * @example
   * await Delay.yield()  // Give other tasks a chance to run
   */
  static async yield () {
    await Delay.wait(0)
  }

  /**
   * Wait for random duration between minDelay and maxDelay (inclusive)
   *
   * Generates a random delay within the specified range. Falls back to default
   * range if non-finite values are provided. Useful for introducing variation
   * in polling or retry delays.
   *
   * @static
   * @async
   * @param {number} [minDelay=DEFAULT_MIN_DELAY] - Minimum milliseconds (defaults to 380)
   * @param {number} [maxDelay=DEFAULT_MAX_DELAY] - Maximum milliseconds (defaults to 730)
   * @returns {Promise<void>} Resolves after random delay
   *
   * @example
   * await Delay.randomWait(100, 500)  // Wait 100-500ms
   */
  static async randomWait (
    minDelay = Delay.DEFAULT_MIN_DELAY,
    maxDelay = Delay.DEFAULT_MAX_DELAY
  ) {
    const min = Number.isFinite(minDelay) ? minDelay : Delay.DEFAULT_MIN_DELAY
    const max = Number.isFinite(maxDelay) ? maxDelay : Delay.DEFAULT_MAX_DELAY

    const delayMs = Random.integerWithRange(min, max)
    await Delay.wait(delayMs)
  }

  /**
   * Execute an async loop until cancelled, error occurs, or completes naturally
   *
   * Runs iterationTask repeatedly with intervalMs delay between executions.
   * Supports optional callbacks for cancellation, error handling, and completion.
   * Always calls onComplete() when loop ends, regardless of exit reason.
   *
   * Loop execution flow:
   * 1. Check isCancelled() - break and call onCancel() if true
   * 2. Execute iterationTask()
   * 3. Wait intervalMs
   * 4. Repeat from step 1
   *
   * If iterationTask throws, onError() is called and loop terminates.
   * Always calls onComplete() in finally block.
   *
   * @async
   * @param {() => Promise<void>} [iterationTask=async () => {}] - Async function to execute each iteration
   * @param {number} [intervalMs=this.delayMs] - Milliseconds between iterations
   * @returns {Promise<void>} Resolves when loop ends
   * @throws {Error} Does not throw; errors are passed to onError() callback
   *
   * @example
   * const looper = new Delay(1000)
   * looper.isCancelled = () => shouldStop
   * looper.onError = (err) => console.error('Loop error:', err)
   * looper.onComplete = () => console.log('Loop ended')
   * await looper.runLoop(async () => {
   *   console.log('tick')
   *   await someAsyncTask()
   * })
   */
  async runLoop (iterationTask = async () => {}, intervalMs = this.delayMs) {
    try {
      while (true) {
        if (this._checkCancellation()) {
          this._notifyCancel()
          break
        }

        await iterationTask()
        await Delay.wait(intervalMs)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this._notifyError(error)
    } finally {
      this._notifyComplete()
    }
  }

  /**
   * Check if cancellation was requested
   *
   * @private
   * @returns {boolean} True if isCancelled is a function and returns truthy value
   */
  _checkCancellation () {
    return typeof this.isCancelled === 'function' && this.isCancelled()
  }

  /**
   * Notify cancellation handler if defined
   *
   * @private
   * @returns {void}
   */
  _notifyCancel () {
    if (typeof this.onCancel === 'function') {
      this.onCancel()
    }
  }

  /**
   * Notify error handler if defined
   *
   * @private
   * @param {Error} err - The caught error from iterationTask
   * @returns {void}
   */
  _notifyError (err) {
    if (typeof this.onError === 'function') {
      this.onError(err)
    }
  }

  /**
   * Notify completion handler if defined
   *
   * Called from finally block to ensure notification even after cancellation or error.
   *
   * @private
   * @returns {void}
   */
  _notifyComplete () {
    if (typeof this.onComplete === 'function') {
      this.onComplete()
    }
  }
}
