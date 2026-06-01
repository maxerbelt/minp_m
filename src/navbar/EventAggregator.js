/**
 * @typedef {import('./types/events.types.js').EventName} EventName
 * @typedef {import('./types/events.types.js').EventPayload} EventPayload
 * @typedef {import('./types/events.types.js').EventHandler} EventHandler
 * @typedef {import('./types/events.types.js').SubscriberMap} SubscriberMap
 */

/**
 * EventAggregator - Centralized event management system.
 * Provides publish-subscribe pattern (Observer pattern) for decoupled component communication.
 * Implements error isolation so failures in one handler don't prevent other handlers from executing.
 *
 * Key features:
 * - Event subscription and unsubscription with automatic cleanup
 * - Error isolation: exceptions in handlers are caught and logged
 * - No event propagation delay; handlers invoked synchronously
 * - Type-safe event handling via typedef imports
 * - Flexible event payload (any data type supported)
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
 */
export class EventAggregator {
  /**
   * Creates a new EventAggregator instance.
   * Initializes empty subscriber map for event management.
   *
   * @constructor
   */
  constructor () {
    /**
     * Map of event names to subscriber handler arrays.
     * Organized as { eventName: [handler1, handler2, ...] }
     *
     * @type {SubscriberMap}
     * @private
     */
    this.subscribers = {}
  }

  /**
   * Register a handler for an event.
   * Adds the handler to the subscriber list for the event.
   * Validates event name and handler function before subscribing.
   * Returns a cleanup function to automatically unsubscribe.
   *
   * @public
   * @param {EventName} eventName - The name of the event to subscribe to (non-empty string).
   * @param {EventHandler} handler - The handler function to invoke when event is published.
   * @returns {() => void} Unsubscribe function that removes this handler when called.
   * @throws {TypeError} If eventName is not a non-empty string.
   * @throws {TypeError} If handler is not a function.
   *
   * @example
   * const unsubscribe = aggregator.subscribe('user-login', (userData) => {
   *   console.log('User logged in:', userData.username);
   * });
   * unsubscribe(); // Remove subscription
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
   * Filters out the specified handler by identity (===) comparison.
   * If event or handler not found, operation is silent (no error thrown).
   *
   * @public
   * @param {EventName} eventName - The name of the event to unsubscribe from.
   * @param {EventHandler} handler - The exact handler function to remove (must be same reference).
   * @returns {void}
   *
   * @example
   * const handler = (data) => console.log(data);
   * aggregator.subscribe('event', handler);
   * aggregator.unsubscribe('event', handler); // Removes this specific handler
   */
  unsubscribe (eventName, handler) {
    const subscribers = this._getSubscribers(eventName)
    if (!subscribers.length) return

    this.subscribers[eventName] = subscribers.filter(h => h !== handler)
  }

  /**
   * Trigger all handlers registered for an event.
   * Invokes each handler synchronously with the provided data payload.
   * Errors in individual handlers are isolated (caught and logged) so other handlers still execute.
   * If no subscribers exist for the event, operation completes silently.
   *
   * @public
   * @param {EventName} eventName - The name of the event to publish.
   * @param {EventPayload} [data] - Optional data payload to pass to all handlers (any type).
   * @returns {void}
   *
   * @example
   * aggregator.publish('config-updated', { theme: 'dark', lang: 'en' });
   * aggregator.publish('button-clicked'); // No data needed
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
   * Useful for conditional event processing or debugging.
   * Returns true only if the event has at least one registered handler.
   *
   * @public
   * @param {EventName} eventName - The name of the event to check.
   * @returns {boolean} True if event has at least one subscriber, false otherwise.
   *
   * @example
   * if (aggregator.hasSubscribers('animation-end')) {
   *   aggregator.publish('animation-end', { duration: 500 });
   * }
   */
  hasSubscribers (eventName) {
    return this._getSubscribers(eventName).length > 0
  }

  /**
   * Remove all subscribers for a specific event.
   * Clears the handler array for the event while leaving other events unaffected.
   * After this call, publishing the event will have no effect (no subscribers).
   *
   * @public
   * @param {EventName} eventName - The name of the event to clear.
   * @returns {void}
   *
   * @example
   * aggregator.clearEvent('temp-event'); // All handlers for temp-event are removed
   */
  clearEvent (eventName) {
    if (this.subscribers[eventName]) {
      this.subscribers[eventName] = []
    }
  }

  /**
   * Remove all event subscribers across all events.
   * Performs a complete reset of the aggregator to initial state.
   * After this call, no events will have subscribers.
   *
   * @public
   * @returns {void}
   *
   * @example
   * aggregator.clearAll(); // All events cleared
   */
  clearAll () {
    this.subscribers = {}
  }

  /**
   * Return subscriber list for an event, or an empty array if none exist.
   * Safe to iterate over result even if event has never been published.
   *
   * @private
   * @param {EventName} eventName - The name of the event.
   * @returns {EventHandler[]} Array of handler functions (empty if no subscribers).
   */
  _getSubscribers (eventName) {
    return this.subscribers[eventName] || []
  }

  /**
   * Ensure a subscriber list exists for an event and return it.
   * Creates an empty array for the event if none exists yet.
   * Idempotent: calling multiple times on same event is safe.
   *
   * @private
   * @param {EventName} eventName - The name of the event.
   * @returns {EventHandler[]} The subscriber array for this event (never null).
   */
  _ensureSubscribers (eventName) {
    if (!this.subscribers[eventName]) {
      this.subscribers[eventName] = []
    }
    return this.subscribers[eventName]
  }

  /**
   * Safely invoke a handler with error isolation.
   * Wraps handler execution in try-catch to prevent exceptions from affecting other handlers.
   * Caught errors are logged to console.error with event name for debugging.
   *
   * @private
   * @param {EventHandler} handler - The handler function to invoke.
   * @param {EventName} eventName - The event name for error reporting and logging.
   * @param {EventPayload} data - Data payload to pass to the handler.
   * @returns {void}
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
   * Required to prevent invalid event names that could cause issues.
   * Trims whitespace to reject names that are only spaces.
   *
   * @private
   * @param {EventName} eventName - Event name to validate.
   * @returns {void}
   * @throws {TypeError} If eventName is not a string or is empty/whitespace only.
   */
  _validateEventName (eventName) {
    if (typeof eventName !== 'string' || eventName.trim() === '') {
      throw new TypeError('Event name must be a non-empty string')
    }
  }

  /**
   * Validate handler is a function.
   * Required to prevent invalid handler types from being stored.
   *
   * @private
   * @param {EventHandler} handler - Handler to validate.
   * @returns {void}
   * @throws {TypeError} If handler is not a function.
   */
  _validateHandler (handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('Handler must be a function')
    }
  }
}

/**
 * NavbarEventAggregator - Specialized event manager for navbar components.
 * Extends EventAggregator with predefined navbar-specific event types and convenience methods.
 * Provides type-safe event publishing and subscription with domain-specific semantics.
 *
 * Manages these standard navbar events:
 * - board:setup - Board initialized or reset
 * - size:changed - Grid dimensions changed
 * - map:selected - User selected a map
 * - maptype:changed - Map type switched (e.g., sea/land to space)
 * - terrain:changed - Terrain configuration updated
 * - water:changed - Water/wave configuration updated
 * - mode:changed - Game mode switched (seek/hide)
 * - params:updated - General parameters changed
 * - refresh:requested - UI refresh requested
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
 */
export class NavbarEventAggregator extends EventAggregator {
  /**
   * Standard navbar events enumeration.
   * Each event corresponds to a specific navbar action or state change.
   * Used as event names for publish/subscribe operations.
   *
   * @static
   * @readonly
   * @type {Object<string, string>}
   *
   * @property {string} BOARD_SETUP='board:setup' - Emitted when board is initialized or reset
   * @property {string} SIZE_CHANGED='size:changed' - Emitted when grid size changes
   * @property {string} MAP_SELECTED='map:selected' - Emitted when user selects a map
   * @property {string} MAP_TYPE_CHANGED='maptype:changed' - Emitted when map type is switched
   * @property {string} TERRAIN_CHANGED='terrain:changed' - Emitted when terrain is updated
   * @property {string} WATER_CHANGED='water:changed' - Emitted when water configuration is updated
   * @property {string} MODE_CHANGED='mode:changed' - Emitted when game mode changes
   * @property {string} PARAMS_UPDATED='params:updated' - Emitted when parameters are updated
   * @property {string} REFRESH_REQUESTED='refresh:requested' - Emitted when UI refresh is requested
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
 * Provides a convenient way to instantiate the event aggregator without using the `new` keyword.
 * Useful for functional-style code or dependency injection patterns.
 *
 * @function
 * @returns {NavbarEventAggregator} A new NavbarEventAggregator instance ready to manage navbar events.
 *
 * @example
 * const events = createNavbarEventAggregator();
 * events.onTerrainChanged((terrain) => { * ... * });
 */
export function createNavbarEventAggregator () {
  return new NavbarEventAggregator()
}
