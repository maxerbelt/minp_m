/**
 * @typedef {string} EventName
 * @description Non-empty string identifier for an event
 * Must not be empty or whitespace-only. Used to route published data to subscribed handlers.
 * Examples: 'data-updated', 'user-login', 'board:setup'
 */

/**
 * @typedef {*} EventPayload
 * @description Flexible data payload passed to event handlers
 * Can be any JavaScript value (object, primitive, array, null, undefined).
 * The payload is passed as the only argument to each handler function.
 */

/**
 * @typedef {Function} EventHandler
 * @description Function invoked when an event is published
 * @param {EventPayload} [data] - Optional data payload from the published event
 * @returns {void}
 * Handlers should not throw exceptions; errors are caught and logged by the aggregator.
 */

/**
 * @typedef {Object<EventName, EventHandler[]>} SubscriberMap
 * @description Mapping of event names to arrays of handler functions
 * Organized as { eventName: [handler1, handler2, ...] }.
 * Empty arrays indicate an event with no current subscribers.
 */

/**
 * EventAggregator - Centralized event management system.
 *
 * Provides publish-subscribe pattern (Observer pattern) for decoupled component communication.
 * Implements error isolation so failures in one handler don't prevent other handlers from executing.
 *
 * Key features:
 * - **Event subscription and unsubscription** with automatic cleanup via returned function
 * - **Error isolation**: exceptions in handlers are caught and logged, other handlers still execute
 * - **Synchronous delivery**: handlers invoked immediately when event is published (no queuing)
 * - **Type-safe event handling** with JSDoc typedef support
 * - **Flexible event payload**: supports any JavaScript value type
 * - **Memory safe**: handlers are stored by reference, unsubscribe removes exact references
 * - **Performance**: O(1) subscribe/unsubscribe, O(n) publish where n = handler count
 *
 * Performance Characteristics:
 * - Subscribe: O(1) - adds handler to array
 * - Publish: O(n) - invokes all n handlers for event sequentially
 * - Unsubscribe: O(n) - filters array to remove handler
 * - hasSubscribers: O(1) - checks if array has length > 0
 *
 * Error Handling:
 * All handler execution is wrapped in try-catch. If a handler throws:
 * - Error is logged to console.error with event name
 * - Other handlers continue to execute
 * - Error does not propagate to publish() caller
 *
 * Security Notes:
 * - Event names and handlers are not validated for security-sensitive operations
 * - Subscribers have full access to event payloads; validate untrusted data in handlers
 * - No CSRF/XSS protections; use framework security when handling user input
 *
 * @class EventAggregator
 * @description Manages event subscriptions and publications with error isolation.
 *
 * @example
 * const aggregator = new EventAggregator();
 * const unsubscribe = aggregator.subscribe('data-updated', (data) => {
 *   console.log('Data:', data);
 * });
 * aggregator.publish('data-updated', { value: 42 });
 * unsubscribe(); // Clean up subscription
 *
 * @example
 * // Check for subscribers before publishing expensive computations
 * if (aggregator.hasSubscribers('expensive-event')) {
 *   const result = expensiveComputation();
 *   aggregator.publish('expensive-event', result);
 * }
 */
export class EventAggregator {
  /**
   * Creates a new EventAggregator instance.
   *
   * Initializes an empty subscriber map for event management.
   * Each instance maintains its own independent set of event subscriptions.
   * No events are shared between instances unless explicitly shared by the application.
   *
   * @constructor
   * @returns {void}
   *
   * @example
   * const events = new EventAggregator();
   * // events is ready to accept subscriptions and publications
   *
   * @example
   * // Multiple instances are independent
   * const events1 = new EventAggregator();
   * const events2 = new EventAggregator();
   * // events1 and events2 do not share subscribers
   */
  constructor () {
    /**
     * Map of event names to subscriber handler arrays.
     *
     * Structure: { eventName: [handler1, handler2, ...] }
     * - eventName (string): non-empty string identifier for the event
     * - handlers (array): functions to invoke when event is published
     * - Empty arrays represent events with no current subscribers
     *
     * @type {SubscriberMap}
     * @private
     * @see subscribe
     * @see publish
     */
    this.subscribers = {}
  }

  /**
   * Register a handler for an event.
   *
   * Adds the handler to the subscriber list for the event.
   * Validates event name and handler function before subscribing.
   * Returns a cleanup function to automatically unsubscribe.
   *
   * Validation:
   * - Event name must be a non-empty string (after trim)
   * - Handler must be a function
   * Throws TypeError if validation fails.
   *
   * Memory Management:
   * - Handlers are stored by reference
   * - Same handler can be registered multiple times (will be invoked multiple times)
   * - Unsubscribe removes exact handler reference using === comparison
   *
   * Order Guarantee:
   * - Handlers are invoked in the order they were subscribed
   * - Modifying subscribers during handler execution may cause unexpected behavior
   *
   * @public
   * @param {EventName} eventName - The name of the event to subscribe to (non-empty string).
   *        Must be a non-empty string after whitespace trimming.
   *        Examples: 'user-login', 'board:setup', 'data-updated'
   * @param {EventHandler} handler - The handler function to invoke when event is published.
   *        Called with event payload as single argument.
   *        Should not throw; errors are caught and logged.
   * @returns {() => void} Unsubscribe function that removes this handler when called.
   *        Can be safely called multiple times; subsequent calls have no effect.
   * @throws {TypeError} If eventName is not a string or is empty/whitespace only.
   * @throws {TypeError} If handler is not a function.
   *
   * @example
   * const aggregator = new EventAggregator();
   * const unsubscribe = aggregator.subscribe('user-login', (userData) => {
   *   console.log('User logged in:', userData.username);
   * });
   * unsubscribe(); // Remove subscription
   *
   * @example
   * // Subscribe with arrow function
   * const unsub = aggregator.subscribe('counter', count => {
   *   document.getElementById('count').textContent = count;
   * });
   *
   * @example
   * // Error handling - throws on invalid input
   * try {
   *   aggregator.subscribe('', handler); // Empty string
   * } catch (e) {
   *   console.error('Invalid event name:', e.message);
   * }
   *
   * @example
   * // Same handler can subscribe multiple times
   * const handler = () => console.log('Triggered');
   * aggregator.subscribe('event1', handler);
   * aggregator.subscribe('event1', handler); // Same handler, different subscriptions
   * // If event1 is published, handler is called twice
   */
  subscribe (eventName, handler) {
    this._validateEventName(eventName)
    this._validateHandler(handler)

    const subscribers = this._ensureSubscribers(eventName)
    subscribers.push(handler)

    return () => this.unsubscribe(eventName, handler)
  }

  /**
   * Remove a handler from an event's subscriber list.
   *
   * Filters out the specified handler by identity (===) comparison.
   * If event or handler not found, operation is silent (no error thrown).
   *
   * Behavior:
   * - If event has no subscribers, this is a no-op
   * - If handler is not in subscriber list, this is a no-op
   * - Unsubscribe is O(n) where n is number of subscribers for that event
   * - Only removes the exact handler reference (by ===)
   * - Safe to call from within event handlers
   *
   * Idempotency:
   * - Can be called multiple times safely
   * - Second call will have no effect (handler already removed)
   *
   * @public
   * @param {EventName} eventName - The name of the event to unsubscribe from.
   *        Can be any string; if event doesn't exist, this is silently ignored.
   * @param {EventHandler} handler - The exact handler function to remove (must be same reference).
   *        Must be the exact same reference used in subscribe() call.
   *        Different function instances (even if functionally identical) will not be removed.
   * @returns {void}
   *
   * @example
   * const handler = (data) => console.log(data);
   * aggregator.subscribe('event', handler);
   * aggregator.unsubscribe('event', handler); // Removes this specific handler
   *
   * @example
   * // Using returned cleanup function (preferred)
   * const unsubscribe = aggregator.subscribe('event', handler);
   * unsubscribe(); // Equivalent to aggregator.unsubscribe('event', handler)
   *
   * @example
   * // Unsubscribe is idempotent
   * aggregator.unsubscribe('event', handler);
   * aggregator.unsubscribe('event', handler); // Safe, second call is no-op
   *
   * @example
   * // Handler must be same reference
   * const h1 = () => console.log('h1');
   * const h2 = () => console.log('h1'); // Functionally identical
   * aggregator.subscribe('event', h1);
   * aggregator.unsubscribe('event', h2); // Does not remove h1 (different reference)
   */
  unsubscribe (eventName, handler) {
    const subscribers = this._getSubscribers(eventName)
    if (!subscribers.length) return

    this.subscribers[eventName] = subscribers.filter(h => h !== handler)
  }

  /**
   * Trigger all handlers registered for an event.
   *
   * Invokes each handler synchronously with the provided data payload.
   * Errors in individual handlers are isolated (caught and logged) so other handlers still execute.
   * If no subscribers exist for the event, operation completes silently.
   *
   * Execution Model:
   * - **Synchronous**: All handlers execute in the same call stack
   * - **Sequential**: Handlers invoked in subscription order
   * - **Error Isolated**: Each handler execution is wrapped in try-catch
   * - **No Propagation**: Errors don't prevent other handlers from executing
   * - **Logging**: Caught errors logged to console.error with event name
   *
   * Performance:
   * - O(n) where n = number of handlers for this event
   * - No async/await overhead; handlers run immediately
   * - Pre-check with hasSubscribers() to avoid computation if no listeners
   *
   * Error Handling:
   * If a handler throws an exception:
   * 1. Exception is caught internally
   * 2. Error logged to console.error with event name for debugging
   * 3. Other handlers continue to execute
   * 4. Exception does NOT propagate to publish() caller
   * 5. publish() completes normally as if no error occurred
   *
   * @public
   * @param {EventName} eventName - The name of the event to publish.
   *        Must match event names used in subscribe() calls.
   *        Non-existent events are published silently (no error).
   * @param {EventPayload} [data] - Optional data payload to pass to all handlers (any type).
   *        If omitted, undefined is passed to handlers.
   *        Can be any JavaScript value: object, primitive, array, null, etc.
   * @returns {void}
   *
   * @example
   * aggregator.publish('config-updated', { theme: 'dark', lang: 'en' });
   * aggregator.publish('button-clicked'); // No data needed
   *
   * @example
   * // Error handling - exceptions in handlers don't break publish
   * aggregator.subscribe('event', () => { throw new Error('Handler error'); });
   * aggregator.subscribe('event', () => { console.log('This still runs'); });
   * aggregator.publish('event'); // First handler throws, second still executes
   *
   * @example
   * // Performance optimization - check before expensive computation
   * if (aggregator.hasSubscribers('expensive-event')) {
   *   const result = expensiveComputation(); // Only compute if someone is listening
   *   aggregator.publish('expensive-event', result);
   * }
   *
   * @example
   * // Publishing non-existent events is safe
   * aggregator.publish('nonexistent-event', data); // Silently does nothing
   * // No error thrown; not an error condition
   */
  publish (eventName, data) {
    const subscribers = this._getSubscribers(eventName)
    if (!subscribers.length) return

    for (const handler of subscribers) {
      this._invokeHandler(handler, eventName, data)
    }
  }

  /**
   * Check if an event has active subscribers.
   *
   * Useful for conditional event processing or debugging.
   * Returns true only if the event has at least one registered handler.
   *
   * Use Case:
   * Avoid expensive computations if no one is listening to the event:
   * ```
   * if (aggregator.hasSubscribers('expensive-event')) {
   *   const data = expensiveComputation();
   *   aggregator.publish('expensive-event', data);
   * }
   * ```
   *
   * Performance:
   * - O(1) - simple length check
   * - Useful before expensive computations
   *
   * @public
   * @param {EventName} eventName - The name of the event to check.
   *        Can be any string; non-existent events return false.
   * @returns {boolean} True if event has at least one subscriber, false otherwise.
   *
   * @example
   * if (aggregator.hasSubscribers('animation-end')) {
   *   aggregator.publish('animation-end', { duration: 500 });
   * }
   *
   * @example
   * // Check multiple related events
   * const hasListeners = aggregator.hasSubscribers('save-start') ||
   *                      aggregator.hasSubscribers('save-complete') ||
   *                      aggregator.hasSubscribers('save-error');
   *
   * @example
   * // Debug: verify subscriptions were registered
   * console.assert(aggregator.hasSubscribers('my-event'), 'Event has no subscribers!');
   */
  hasSubscribers (eventName) {
    return this._getSubscribers(eventName).length > 0
  }

  /**
   * Remove all subscribers for a specific event.
   *
   * Clears the handler array for the event while leaving other events unaffected.
   * After this call, publishing the event will have no effect (no subscribers).
   * This is useful for cleanup or resetting event state without destroying the aggregator.
   *
   * Behavior:
   * - Only affects the specified event
   * - Other events retain their subscribers
   * - Publishing the cleared event afterwards is a no-op
   * - Can be called multiple times safely (idempotent)
   *
   * Performance:
   * - O(1) - just replaces the handler array
   *
   * Common Use Cases:
   * - Cleanup when component/page is unloaded
   * - Reset event state for testing
   * - Prevent stale handlers from executing
   *
   * @public
   * @param {EventName} eventName - The name of the event to clear.
   *        If event has no subscribers, this is still a safe no-op.
   * @returns {void}
   *
   * @example
   * aggregator.clearEvent('temp-event'); // All handlers for temp-event are removed
   *
   * @example
   * // Cleanup before reloading
   * aggregator.clearEvent('old-handlers');
   * aggregator.publish('old-handlers', data); // No effect
   *
   * @example
   * // Safe to clear non-existent events
   * aggregator.clearEvent('never-used-event'); // No error
   */
  clearEvent (eventName) {
    if (this.subscribers[eventName]) {
      this.subscribers[eventName] = []
    }
  }

  /**
   * Remove all event subscribers across all events.
   *
   * Performs a complete reset of the aggregator to initial state.
   * After this call, no events will have subscribers.
   * This is useful for cleanup when the aggregator is no longer needed.
   *
   * Behavior:
   * - Removes all subscribers from ALL events
   * - Resets internal state to empty object
   * - Subsequent publishes will have no effect
   * - Equivalent to creating a new EventAggregator instance
   *
   * Performance:
   * - O(1) - just replaces the subscribers map
   *
   * Use Cases:
   * - Cleanup before page unload
   * - Reset for testing between test cases
   * - Memory cleanup when aggregator no longer needed
   * - Complete state reset
   *
   * @public
   * @returns {void}
   *
   * @example
   * aggregator.clearAll(); // All events cleared
   *
   * @example
   * // Test cleanup - clear between tests
   * afterEach(() => {
   *   aggregator.clearAll();
   *   // All subscriptions gone, ready for next test
   * });
   *
   * @example
   * // Compare with clearEvent - this affects ALL events
   * aggregator.clearEvent('event1'); // Only event1 cleared
   * aggregator.clearAll();            // All events cleared
   */
  clearAll () {
    this.subscribers = {}
  }

  /**
   * Return subscriber list for an event, or an empty array if none exist.
   *
   * Safe to iterate over result even if event has never been published.
   * Never returns null; always returns an array (possibly empty).
   * This makes it safe to assume result is iterable.
   *
   * Implementation Detail:
   * - Returns reference to actual subscribers array (not a copy)
   * - Modifications to returned array affect actual subscribers
   * - Used internally; external code should not modify returned array
   *
   * Performance:
   * - O(1) - simple property lookup with fallback
   * - No array copying or allocation
   *
   * @private
   * @param {EventName} eventName - The name of the event.
   *        Can be any string; non-existent events return empty array.
   * @returns {EventHandler[]} Array of handler functions (empty if no subscribers).
   *        Never null. Modifications affect actual subscribers.
   *
   * @see subscribe
   * @see publish
   * @see unsubscribe
   */
  _getSubscribers (eventName) {
    return this.subscribers[eventName] || []
  }

  /**
   * Ensure a subscriber list exists for an event and return it.
   *
   * Creates an empty array for the event if none exists yet.
   * Idempotent: calling multiple times on same event is safe.
   * Guarantees a non-null array is returned that can be mutated.
   *
   * Implementation Detail:
   * - Lazy initialization: only creates array when first needed
   * - Returns reference to actual subscribers array (not a copy)
   * - Modifications to returned array affect actual subscribers
   * - Reduces memory when events have no subscribers
   *
   * Performance:
   * - O(1) - simple property assignment if needed
   * - No array copying
   *
   * Usage:
   * Used by subscribe() to get mutable array for pushing new handlers.
   *
   * @private
   * @param {EventName} eventName - The name of the event.
   *        If array doesn't exist, it is created.
   * @returns {EventHandler[]} The subscriber array for this event (never null).
   *        Guaranteed to be mutable and backed by actual storage.
   *
   * @see subscribe
   */
  _ensureSubscribers (eventName) {
    if (!this.subscribers[eventName]) {
      this.subscribers[eventName] = []
    }
    return this.subscribers[eventName]
  }

  /**
   * Safely invoke a handler with error isolation.
   *
   * Wraps handler execution in try-catch to prevent exceptions from affecting other handlers.
   * Caught errors are logged to console.error with event name for debugging.
   * This is the critical mechanism that enables error isolation in publish().
   *
   * Error Handling:
   * - All handler execution wrapped in try-catch
   * - Any exception (including non-Error objects) caught
   * - Error logged with event name for debugging
   * - Error does NOT propagate
   * - Execution continues normally after error
   *
   * Logging:
   * - Format: `Error in event handler for 'eventName': <error>`
   * - Sent to console.error (standard error stream)
   * - Includes full error object (stack trace if available)
   * - Event name included for context
   *
   * Performance:
   * - O(1) - single function call with try-catch wrapper
   * - Try-catch overhead negligible for function invocation
   * - Synchronous execution
   *
   * @private
   * @param {EventHandler} handler - The handler function to invoke.
   *        Must be a function; assumed validated before calling.
   * @param {EventName} eventName - The event name for error reporting and logging.
   *        Used in error message for debugging context.
   * @param {EventPayload} data - Data payload to pass to the handler as single argument.
   *        Can be any value, passed directly to handler.
   * @returns {void}
   *
   * @see publish
   * @see subscribe
   */
  _invokeHandler (handler, eventName, data) {
    try {
      handler(data)
    } catch (error) {
      console.error(`Error in event handler for '${eventName}':`, error)
    }
  }

  /**
   * Validate event name is a non-empty string.
   *
   * Required to prevent invalid event names that could cause issues.
   * Trims whitespace to reject names that are only spaces.
   * This validation prevents subtle bugs from empty or whitespace-only event names.
   *
   * Validation Rules:
   * 1. eventName must be a string (checked via typeof)
   * 2. After trim(), must have length > 0
   * 3. Rejects: null, undefined, numbers, objects, empty string, "  ", etc.
   *
   * Rationale:
   * - Empty event names are nonsensical and cause bugs
   * - Whitespace-only names (" ", "\t") are effectively empty
   * - trim() handles various whitespace: spaces, tabs, newlines, etc.
   * - TypeError is appropriate for type contract violation
   *
   * Error Message:
   * 'Event name must be a non-empty string' - clear, actionable message
   *
   * Performance:
   * - O(n) where n = length of eventName string (due to trim())
   * - Minimal overhead for validation
   * - Only called in subscribe() (public method)
   *
   * @private
   * @param {EventName} eventName - Event name to validate.
   *        Checked for type string and non-empty after trim.
   * @returns {void} No return value; validation passes silently.
   * @throws {TypeError} If eventName is not a string or is empty/whitespace only.
   *        Error message: 'Event name must be a non-empty string'
   *
   * @example
   * _validateEventName('my-event');     // OK - passes silently
   * _validateEventName('');             // Throws TypeError
   * _validateEventName('   ');          // Throws TypeError (whitespace only)
   * _validateEventName(123);            // Throws TypeError (not string)
   * _validateEventName(null);           // Throws TypeError
   * _validateEventName(undefined);      // Throws TypeError
   *
   * @see subscribe
   */
  _validateEventName (eventName) {
    if (typeof eventName !== 'string' || eventName.trim() === '') {
      throw new TypeError('Event name must be a non-empty string')
    }
  }

  /**
   * Validate handler is a function.
   *
   * Required to prevent invalid handler types from being stored.
   * This validation prevents bugs from accidentally storing non-function values
   * as handlers, which would cause runtime errors during publish().
   *
   * Validation Rule:
   * - handler must be a function (checked via typeof)
   * - Rejects: null, undefined, strings, numbers, objects, etc.
   * - Accepts: regular functions, arrow functions, async functions, etc.
   *
   * Rationale:
   * - Non-function handlers cannot be invoked
   * - Error caught at subscribe() time, not publish() time (fail fast)
   * - TypeError is appropriate for type contract violation
   * - typeof 'function' is the standard JavaScript check
   *
   * Error Message:
   * 'Handler must be a function' - clear, actionable message
   *
   * Performance:
   * - O(1) - simple typeof check
   * - Minimal overhead for validation
   * - Only called in subscribe() (public method)
   *
   * @private
   * @param {EventHandler} handler - Handler to validate.
   *        Checked via typeof to ensure it's callable.
   * @returns {void} No return value; validation passes silently.
   * @throws {TypeError} If handler is not a function.
   *        Error message: 'Handler must be a function'
   *
   * @example
   * _validateHandler(() => {});           // OK - passes silently
   * _validateHandler(function() {});      // OK - regular function
   * _validateHandler(async () => {});     // OK - async function
   * _validateHandler('callback');        // Throws TypeError
   * _validateHandler(123);                // Throws TypeError
   * _validateHandler(null);               // Throws TypeError
   * _validateHandler(undefined);          // Throws TypeError
   * _validateHandler({ call: () => {} }); // Throws TypeError (object, not function)
   *
   * @see subscribe
   */
  _validateHandler (handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('Handler must be a function')
    }
  }
}

/**
 * NavbarEventAggregator - Specialized event manager for navbar components.
 *
 * Extends EventAggregator with predefined navbar-specific event types and convenience methods.
 * Provides type-safe event publishing and subscription with domain-specific semantics.
 * Eliminates magic strings and provides semantic method names for navbar events.
 *
 * Architecture:
 * - Inherits all error isolation and pub/sub logic from EventAggregator
 * - Adds static EVENTS enum for standard navbar event names
 * - Provides convenience methods for each event type (e.g., onTerrainChanged, publishTerrainChanged)
 * - Type-safe through JSDoc typedefs
 * - Single responsibility: navbar-specific event management
 *
 * Managed Events:
 * - **board:setup** - Board initialized or reset (no data)
 * - **size:changed** - Grid dimensions changed (data: new size)
 * - **map:selected** - User selected a map (data: map name/id)
 * - **maptype:changed** - Map type switched, e.g., sea/land to space (data: new map type)
 * - **terrain:changed** - Terrain configuration updated (data: new terrain config)
 * - **water:changed** - Water/wave configuration updated (data: new water config)
 * - **mode:changed** - Game mode switched, e.g., seek to hide (data: new mode)
 * - **params:updated** - General parameters changed (data: new parameters object)
 * - **refresh:requested** - UI refresh requested (no data)
 *
 * Convenience Methods:
 * For each event, two methods are provided:
 * - `on<Event>()` - Subscribe with optional data (returns unsubscribe function)
 * - `publish<Event>()` - Publish event with optional data
 *
 * Example pairs:
 * - onSizeChanged() / publishSizeChanged()
 * - onTerrainChanged() / publishTerrainChanged()
 * - onBoardSetup() / publishBoardSetup()
 *
 * Benefits of Convenience Methods:
 * - **Type Safety**: JSDoc guides correct usage
 * - **No Magic Strings**: IDE autocomplete, refactoring support
 * - **Semantic Names**: Code is self-documenting
 * - **Single Responsibility**: Each method handles one event
 * - **Consistency**: All navbar events handled uniformly
 *
 * Performance:
 * - No overhead vs. EventAggregator (methods just delegate)
 * - Same O(1) subscribe, O(n) publish characteristics
 *
 * Usage Pattern:
 * ```
 * const navbar = new NavbarEventAggregator();
 * navbar.onTerrainChanged((terrain) => updateUI(terrain));
 * navbar.publishTerrainChanged({ type: 'hexagon', size: 10 });
 * ```
 *
 * @class NavbarEventAggregator
 * @extends EventAggregator
 * @description Centralizes navbar event management with predefined event types and pub/sub helpers.
 *
 * @example
 * const events = new NavbarEventAggregator();
 * events.onTerrainChanged((terrain) => {
 *   console.log('Terrain:', terrain);
 * });
 * events.publishTerrainChanged({ mapType: 'hexagon', size: 10 });
 *
 * @example
 * // Multiple listeners, error isolation
 * events.onBoardSetup(() => console.log('Board ready'));
 * events.onBoardSetup(() => { throw new Error('Init error'); }); // Doesn't prevent other handlers
 * events.publishBoardSetup(); // Both handlers called, error logged but not thrown
 *
 * @example
 * // Check for listeners before expensive operations
 * if (events.hasSubscribers(NavbarEventAggregator.EVENTS.TERRAIN_CHANGED)) {
 *   const terrain = computeTerrainExpensively();
 *   events.publishTerrainChanged(terrain);
 * }
 */
export class NavbarEventAggregator extends EventAggregator {
  /**
   * Standard navbar events enumeration.
   *
   * Each event corresponds to a specific navbar action or state change.
   * Used as event names for publish/subscribe operations through EventAggregator methods.
   *
   * Purpose:
   * - **Centralize event names** in one place (single source of truth)
   * - **Enable IDE autocomplete** and refactoring (NavbarEventAggregator.EVENTS.<TAB>)
   * - **Prevent typos** in event names (const event = NavbarEventAggregator.EVENTS.BOARD_SETUP)
   * - **Documentation** via property descriptors
   * - **Static type checking** support through JSDoc
   *
   * Usage:
   * ```
   * // Instead of magic string
   * aggregator.publish('board:setup', data);
   *
   * // Use enum
   * aggregator.publish(NavbarEventAggregator.EVENTS.BOARD_SETUP, data);
   * ```
   *
   * Naming Convention:
   * - Property name: UPPER_SNAKE_CASE (e.g., BOARD_SETUP)
   * - Event value: kebab-case with namespace (e.g., 'board:setup')
   * - Colon ':' separator indicates namespace-like grouping
   *
   * Notes:
   * - Static property is shared across all instances
   * - readonly modifier prevents accidental modification
   * - Convenience methods like publishBoardSetup() use these constants internally
   *
   * @static
   * @readonly
   * @const
   * @type {Object<string, string>}
   *
   * @property {string} BOARD_SETUP='board:setup'
   *           Emitted when board is initialized or reset.
   *           No data payload (undefined passed to handlers).
   *           Useful for resetting UI or reinitializing components.
   *
   * @property {string} SIZE_CHANGED='size:changed'
   *           Emitted when grid dimensions change.
   *           Data: the new size value (typically a number or {width, height}).
   *           Listeners update UI components that depend on size.
   *
   * @property {string} MAP_SELECTED='map:selected'
   *           Emitted when user selects a map from the UI.
   *           Data: map name or identifier (string).
   *           Listeners load and display the selected map.
   *
   * @property {string} MAP_TYPE_CHANGED='maptype:changed'
   *           Emitted when map type is switched (e.g., sea/land to space).
   *           Data: new map type identifier (string).
   *           Listeners reinitialize terrain and display settings.
   *
   * @property {string} TERRAIN_CHANGED='terrain:changed'
   *           Emitted when terrain configuration is updated.
   *           Data: new terrain configuration object.
   *           Listeners update terrain-dependent UI and grid rendering.
   *
   * @property {string} WATER_CHANGED='water:changed'
   *           Emitted when water/wave configuration is updated (sea terrain only).
   *           Data: new water configuration object (see terrain config structure).
   *           Listeners update water-dependent rendering and physics.
   *
   * @property {string} MODE_CHANGED='mode:changed'
   *           Emitted when game mode changes (e.g., seek to hide, or hide to seek).
   *           Data: new mode identifier ('seek', 'hide', etc.).
   *           Listeners update game rules, UI mode indicators, and validation logic.
   *
   * @property {string} PARAMS_UPDATED='params:updated'
   *           Emitted when general parameters are updated.
   *           Data: parameters object with updated keys/values.
   *           Listeners apply parameter changes to game logic or UI settings.
   *
   * @property {string} REFRESH_REQUESTED='refresh:requested'
   *           Emitted when a UI refresh has been requested.
   *           No data payload (undefined passed to handlers).
   *           Listeners perform full UI refresh or page reload if needed.
   */
  static EVENTS = {
    BOARD_SETUP: 'board:setup',
    SIZE_CHANGED: 'size:changed',
    MAP_SELECTED: 'map:selected',
    MAP_TYPE_CHANGED: 'maptype:changed',
    TERRAIN_CHANGED: 'terrain:changed',
    WATER_CHANGED: 'water:changed',
    MODE_CHANGED: 'mode:changed',
    PARAMS_UPDATED: 'params:updated',
    REFRESH_REQUESTED: 'refresh:requested'
  }

  /**
   * Publish a size changed event.
   * Notifies all subscribers that the grid/board size has changed.
   *
   * @public
   * @param {EventPayload} size - The new size value or object (type depends on context).
   * @returns {void}
   *
   * @example
   * aggregator.publishSizeChanged(10);
   */
  publishSizeChanged (size) {
    this.publish(NavbarEventAggregator.EVENTS.SIZE_CHANGED, size)
  }

  /**
   * Subscribe to size changed events.
   * Handler is called whenever the size changes with the new size as parameter.
   *
   * @public
   * @param {EventHandler} handler - Handler called with new size when size changes.
   * @returns {() => void} Unsubscribe function to stop listening.
   *
   * @example
   * const unsub = aggregator.onSizeChanged((size) => console.log(size));
   */
  onSizeChanged (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.SIZE_CHANGED, handler)
  }

  /**
   * Publish a map selected event.
   * Notifies all subscribers that a map has been selected by the user.
   *
   * @public
   * @param {EventPayload} mapName - The name or identifier of the selected map.
   * @returns {void}
   *
   * @example
   * aggregator.publishMapSelected('seaMap1');
   */
  publishMapSelected (mapName) {
    this.publish(NavbarEventAggregator.EVENTS.MAP_SELECTED, mapName)
  }

  /**
   * Subscribe to map selected events.
   * Handler is called whenever a map is selected with the map name/id as parameter.
   *
   * @public
   * @param {EventHandler} handler - Handler called with map name when map is selected.
   * @returns {() => void} Unsubscribe function to stop listening.
   *
   * @example
   * const unsub = aggregator.onMapSelected((mapName) => console.log(mapName));
   */
  onMapSelected (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.MAP_SELECTED, handler)
  }

  /**
   * Publish a terrain changed event.
   * Notifies all subscribers that the terrain configuration has been updated.
   *
   * @public
   * @param {EventPayload} terrain - The new terrain configuration object or descriptor.
   * @returns {void}
   *
   * @example
   * aggregator.publishTerrainChanged({ type: 'hexagon', size: 10 });
   */
  publishTerrainChanged (terrain) {
    this.publish(NavbarEventAggregator.EVENTS.TERRAIN_CHANGED, terrain)
  }

  /**
   * Subscribe to terrain changed events.
   * Handler is called whenever terrain configuration changes with the new terrain as parameter.
   *
   * @public
   * @param {EventHandler} handler - Handler called with terrain config when terrain changes.
   * @returns {() => void} Unsubscribe function to stop listening.
   *
   * @example
   * const unsub = aggregator.onTerrainChanged((terrain) => console.log(terrain));
   */
  onTerrainChanged (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.TERRAIN_CHANGED, handler)
  }

  /**
   * Publish a board setup event.
   * Notifies all subscribers that the board has been initialized or reset.
   *
   * @public
   * @returns {void}
   *
   * @example
   * aggregator.publishBoardSetup();
   */
  publishBoardSetup () {
    this.publish(NavbarEventAggregator.EVENTS.BOARD_SETUP)
  }

  /**
   * Subscribe to board setup events.
   * Handler is called whenever the board is initialized or reset.
   *
   * @public
   * @param {EventHandler} handler - Handler called when board is set up.
   * @returns {() => void} Unsubscribe function to stop listening.
   *
   * @example
   * const unsub = aggregator.onBoardSetup(() => console.log('Board ready'));
   */
  onBoardSetup (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.BOARD_SETUP, handler)
  }

  /**
   * Publish a refresh requested event.
   * Notifies all subscribers that a UI refresh has been requested.
   *
   * @public
   * @returns {void}
   *
   * @example
   * aggregator.publishRefreshRequested();
   */
  publishRefreshRequested () {
    this.publish(NavbarEventAggregator.EVENTS.REFRESH_REQUESTED)
  }

  /**
   * Subscribe to refresh requested events.
   * Handler is called whenever a UI refresh is requested.
   *
   * @public
   * @param {EventHandler} handler - Handler called when refresh is requested.
   * @returns {() => void} Unsubscribe function to stop listening.
   *
   * @example
   * const unsub = aggregator.onRefreshRequested(() => { location.reload(); });
   */
  onRefreshRequested (handler) {
    return this.subscribe(
      NavbarEventAggregator.EVENTS.REFRESH_REQUESTED,
      handler
    )
  }

  /**
   * Publish a params updated event.
   * Notifies all subscribers that parameters have been updated.
   *
   * @public
   * @param {EventPayload} params - Updated parameters object or value.
   * @returns {void}
   *
   * @example
   * aggregator.publishParamsUpdated({ theme: 'dark', language: 'en' });
   */
  publishParamsUpdated (params) {
    this.publish(NavbarEventAggregator.EVENTS.PARAMS_UPDATED, params)
  }

  /**
   * Subscribe to params updated events.
   * Handler is called whenever parameters are updated with the new params as parameter.
   *
   * @public
   * @param {EventHandler} handler - Handler called with params when they are updated.
   * @returns {() => void} Unsubscribe function to stop listening.
   *
   * @example
   * const unsub = aggregator.onParamsUpdated((params) => console.log(params));
   */
  onParamsUpdated (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.PARAMS_UPDATED, handler)
  }

  /**
   * Publish a map type changed event.
   * Notifies all subscribers that the map type has been switched (e.g., sea/land to space).
   *
   * @public
   * @param {EventPayload} mapType - The new map type identifier or object.
   * @returns {void}
   *
   * @example
   * aggregator.publishMapTypeChanged('space');
   */
  publishMapTypeChanged (mapType) {
    this.publish(NavbarEventAggregator.EVENTS.MAP_TYPE_CHANGED, mapType)
  }

  /**
   * Subscribe to map type changed events.
   * Handler is called whenever the map type changes with the new map type as parameter.
   *
   * @public
   * @param {EventHandler} handler - Handler called with map type when map type changes.
   * @returns {() => void} Unsubscribe function to stop listening.
   *
   * @example
   * const unsub = aggregator.onMapTypeChanged((mapType) => console.log(mapType));
   */
  onMapTypeChanged (handler) {
    return this.subscribe(
      NavbarEventAggregator.EVENTS.MAP_TYPE_CHANGED,
      handler
    )
  }

  /**
   * Publish a water changed event.
   * Notifies all subscribers that water/wave configuration has been updated.
   *
   * @public
   * @param {EventPayload} water - The new water configuration object or descriptor.
   * @returns {void}
   *
   * @example
   * aggregator.publishWaterChanged({ waveHeight: 5, direction: 'north' });
   */
  publishWaterChanged (water) {
    this.publish(NavbarEventAggregator.EVENTS.WATER_CHANGED, water)
  }

  /**
   * Subscribe to water changed events.
   * Handler is called whenever water configuration changes with the new water config as parameter.
   *
   * @public
   * @param {EventHandler} handler - Handler called with water config when water changes.
   * @returns {() => void} Unsubscribe function to stop listening.
   *
   * @example
   * const unsub = aggregator.onWaterChanged((water) => console.log(water));
   */
  onWaterChanged (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.WATER_CHANGED, handler)
  }

  /**
   * Publish a mode changed event.
   * Notifies all subscribers that the game mode has changed (e.g., seek to hide).
   *
   * @public
   * @param {EventPayload} mode - The new game mode identifier or object.
   * @returns {void}
   *
   * @example
   * aggregator.publishModeChanged('hide');
   */
  publishModeChanged (mode) {
    this.publish(NavbarEventAggregator.EVENTS.MODE_CHANGED, mode)
  }

  /**
   * Subscribe to mode changed events.
   * Handler is called whenever the game mode changes with the new mode as parameter.
   *
   * @public
   * @param {EventHandler} handler - Handler called with mode when mode changes.
   * @returns {() => void} Unsubscribe function to stop listening.
   *
   * @example
   * const unsub = aggregator.onModeChanged((mode) => console.log('New mode:', mode));
   */
  onModeChanged (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.MODE_CHANGED, handler)
  }
}

/**
 * Factory function to create a new NavbarEventAggregator instance.
 *
 * Provides a convenient way to instantiate the event aggregator without using the `new` keyword.
 * Useful for functional-style code, dependency injection patterns, or when `new` is undesirable.
 *
 * Equivalent to:
 * ```javascript
 * const events = new NavbarEventAggregator();
 * ```
 *
 * Rationale for Factory Pattern:
 * - **Consistency**: uniform instantiation across codebase
 * - **Testability**: easier to mock/override in tests
 * - **DI Compatibility**: fits dependency injection frameworks
 * - **Future Flexibility**: can add initialization logic later without breaking caller code
 *
 * Performance:
 * - Negligible overhead over direct `new` constructor call
 * - Just delegates to constructor
 *
 * @function
 * @returns {NavbarEventAggregator} A new NavbarEventAggregator instance ready to manage navbar events.
 *         Each call creates a new independent instance with no shared state.
 *
 * @example
 * // Factory function style (preferred for DI)
 * const events = createNavbarEventAggregator();
 * events.onTerrainChanged((terrain) => { console.log('Terrain:', terrain); });
 *
 * @example
 * // Equivalent to constructor style
 * const events1 = new NavbarEventAggregator();
 * const events2 = createNavbarEventAggregator();
 * // events1 and events2 are independent instances
 *
 * @example
 * // Using in dependency injection
 * function setupNavbar(eventFactory = createNavbarEventAggregator) {
 *   const events = eventFactory();
 *   // Configure events
 *   return events;
 * }
 */
export function createNavbarEventAggregator () {
  return new NavbarEventAggregator()
}
