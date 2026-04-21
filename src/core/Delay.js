import { Random } from './Random.js'

/**
 * @typedef {Function} CancellationCheck
 * @returns {boolean} True if loop should cancel
 */

/**
 * @typedef {Function} CancellationCallback
 * @returns {void}
 */

/**
 * @typedef {Function} ErrorCallback
 * @param {Error} error - The caught error
 * @returns {void}
 */

/**
 * @typedef {Function} CompletionCallback
 * @returns {void}
 */

/**
 * Delay utilities for async timing and cancellable loop management
 * Provides promise-based delays and a configurable async loop pattern
 */
export class Delay {
  // Default range for random wait (milliseconds)
  static DEFAULT_MIN_DELAY = 380
  static DEFAULT_MAX_DELAY = 730

  /**
   * Creates Delay instance with specified interval
   * @constructs
   * @param {number} delayMs - Default delay in milliseconds for runLoop
   */
  constructor (delayMs) {
    this.delayMs = delayMs
  }

  /**
   * Pause execution for specified milliseconds
   * @static
   * @async
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   */
  static wait (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Yield to allow other microtasks to execute (0ms timeout)
   * @static
   * @async
   * @returns {Promise<void>}
   */
  static async yield () {
    await Delay.wait(0)
  }

  /**
   * Wait for random duration between minDelay and maxDelay (inclusive)
   * @static
   * @async
   * @param {number} [minDelay=DEFAULT_MIN_DELAY] - Minimum milliseconds
   * @param {number} [maxDelay=DEFAULT_MAX_DELAY] - Maximum milliseconds
   * @returns {Promise<void>}
   */
  static async randomWait (
    minDelay = Delay.DEFAULT_MIN_DELAY,
    maxDelay = Delay.DEFAULT_MAX_DELAY
  ) {
    const delayMs = Random.integerWithRange(minDelay, maxDelay)
    await Delay.wait(delayMs)
  }

  /**
   * Run an async task repeatedly with delay, supporting cancellation and error handling
   * @async
   * @param {Function} iterationTask - Async function to execute each iteration
   * @param {number} [intervalMs=this.delayMs] - Milliseconds between iterations
   * @returns {Promise<void>}
   *
   * @description
   * Runs iterationTask in a loop with intervalMs delay between each execution.
   * Set callbacks for control flow:
   * - isCancelled: Function that returns true to break loop
   * - onCancel: Called when loop breaks via cancellation
   * - onError: Called if iterationTask throws (loop terminates)
   * - onComplete: Always called when loop ends (cancel, error, or normal)
   *
   * @example
   * const looper = new Delay(1000)
   * looper.isCancelled = () => someFlag
   * looper.onError = (err) => console.error(err)
   * looper.onComplete = () => console.log('Done')
   * await looper.runLoop(async () => { console.log('tick') })
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
      this._notifyError(err)
    } finally {
      this._notifyComplete()
    }
  }

  /**
   * Check if cancellation was requested
   * @private
   * @returns {boolean} True if isCancelled callback exists and returns true
   */
  _checkCancellation () {
    return typeof this.isCancelled === 'function' && this.isCancelled()
  }

  /**
   * Notify cancellation handler
   * @private
   * @returns {void}
   */
  _notifyCancel () {
    if (typeof this.onCancel === 'function') {
      this.onCancel()
    }
  }

  /**
   * Notify error handler
   * @private
   * @param {Error} err - The caught error
   * @returns {void}
   */
  _notifyError (err) {
    if (typeof this.onError === 'function') {
      this.onError(err)
    }
  }

  /**
   * Notify completion handler
   * @private
   * @returns {void}
   */
  _notifyComplete () {
    if (typeof this.onComplete === 'function') {
      this.onComplete()
    }
  }
}
