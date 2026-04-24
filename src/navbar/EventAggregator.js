/**
 * EventAggregator - Centralized event management system
 * Provides publish-subscribe pattern for decoupled component communication
 *
 * @class EventAggregator
 * @description Manages event subscriptions and publications with error isolation
 */
export class EventAggregator {
  constructor () {
    /** @type {Object<string, Function[]>} Subscribers organized by event name */
    this.subscribers = {}
  }

  /**
   * Register a handler for an event
   * @param {string} eventName - The name of the event to subscribe to
   * @param {Function} handler - The handler function to invoke when event is published
   * @returns {Function} Unsubscribe function that removes this handler
   * @throws {TypeError} If handler is not a function
   */
  subscribe (eventName, handler) {
    this._validateEventName(eventName)
    this._validateHandler(handler)

    if (!this.subscribers[eventName]) {
      this.subscribers[eventName] = []
    }

    this.subscribers[eventName].push(handler)

    // Return unsubscribe function for convenience
    return () => {
      this.unsubscribe(eventName, handler)
    }
  }

  /**
   * Remove a handler from an event's subscribers
   * @param {string} eventName - The name of the event to unsubscribe from
   * @param {Function} handler - The handler function to remove
   */
  unsubscribe (eventName, handler) {
    if (!this.subscribers[eventName]) return

    this.subscribers[eventName] = this.subscribers[eventName].filter(
      h => h !== handler
    )
  }

  /**
   * Trigger all handlers registered for an event
   * Isolates errors: failure in one handler does not prevent others from executing
   * @param {string} eventName - The name of the event to publish
   * @param {*} [data] - Optional data to pass to all handlers
   */
  publish (eventName, data) {
    if (!this.subscribers[eventName]) return

    const handlers = this.subscribers[eventName]
    for (const handler of handlers) {
      this._invokeHandler(handler, eventName, data)
    }
  }

  /**
   * Check if an event has active subscribers
   * @param {string} eventName - The name of the event to check
   * @returns {boolean} True if event has at least one subscriber
   */
  hasSubscribers (eventName) {
    return (this.subscribers[eventName] || []).length > 0
  }

  /**
   * Remove all subscribers for a specific event
   * @param {string} eventName - The name of the event to clear
   */
  clearEvent (eventName) {
    if (this.subscribers[eventName]) {
      this.subscribers[eventName] = []
    }
  }

  /**
   * Remove all event subscribers across all events
   */
  clearAll () {
    this.subscribers = {}
  }

  /**
   * Safely invoke a handler with error isolation
   * @private
   * @param {Function} handler - The handler to invoke
   * @param {string} eventName - The event name for error reporting
   * @param {*} data - Data to pass to handler
   */
  _invokeHandler (handler, eventName, data) {
    try {
      handler(data)
    } catch (error) {
      console.error(`Error in event handler for '${eventName}':`, error)
    }
  }

  /**
   * Validate event name is non-empty string
   * @private
   * @param {string} eventName - Event name to validate
   * @throws {TypeError} If eventName is not a non-empty string
   */
  _validateEventName (eventName) {
    if (typeof eventName !== 'string' || eventName.trim() === '') {
      throw new TypeError('Event name must be a non-empty string')
    }
  }

  /**
   * Validate handler is a function
   * @private
   * @param {Function} handler - Handler to validate
   * @throws {TypeError} If handler is not a function
   */
  _validateHandler (handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('Handler must be a function')
    }
  }
}

/**
 * NavbarEventAggregator - Specialized event manager for navbar components
 * Pre-defines common navbar events and provides strongly-typed publish/subscribe methods
 *
 * @class NavbarEventAggregator
 * @extends EventAggregator
 * @description Centralizes navbar event management with predefined event types
 */
export class NavbarEventAggregator extends EventAggregator {
  /**
   * Standard navbar events
   * @static
   * @readonly
   * @type {Object<string, string>}
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
   * Publish a size changed event
   * @param {*} size - The new size value
   * @returns {void}
   */
  publishSizeChanged (size) {
    this._publishEvent(NavbarEventAggregator.EVENTS.SIZE_CHANGED, size)
  }

  /**
   * Subscribe to size changed events
   * @param {Function} handler - Handler called when size changes
   * @returns {Function} Unsubscribe function
   */
  onSizeChanged (handler) {
    return this._subscribeToEvent(
      NavbarEventAggregator.EVENTS.SIZE_CHANGED,
      handler
    )
  }

  /**
   * Publish a map selected event
   * @param {string} mapName - The name of the selected map
   * @returns {void}
   */
  publishMapSelected (mapName) {
    this._publishEvent(NavbarEventAggregator.EVENTS.MAP_SELECTED, mapName)
  }

  /**
   * Subscribe to map selected events
   * @param {Function} handler - Handler called when map is selected
   * @returns {Function} Unsubscribe function
   */
  onMapSelected (handler) {
    return this._subscribeToEvent(
      NavbarEventAggregator.EVENTS.MAP_SELECTED,
      handler
    )
  }

  /**
   * Publish a terrain changed event
   * @param {*} terrain - The new terrain configuration
   * @returns {void}
   */
  publishTerrainChanged (terrain) {
    this._publishEvent(NavbarEventAggregator.EVENTS.TERRAIN_CHANGED, terrain)
  }

  /**
   * Subscribe to terrain changed events
   * @param {Function} handler - Handler called when terrain changes
   * @returns {Function} Unsubscribe function
   */
  onTerrainChanged (handler) {
    return this._subscribeToEvent(
      NavbarEventAggregator.EVENTS.TERRAIN_CHANGED,
      handler
    )
  }

  /**
   * Publish a board setup event
   * @returns {void}
   */
  publishBoardSetup () {
    this._publishEvent(NavbarEventAggregator.EVENTS.BOARD_SETUP)
  }

  /**
   * Subscribe to board setup events
   * @param {Function} handler - Handler called when board is set up
   * @returns {Function} Unsubscribe function
   */
  onBoardSetup (handler) {
    return this._subscribeToEvent(
      NavbarEventAggregator.EVENTS.BOARD_SETUP,
      handler
    )
  }

  /**
   * Publish a refresh requested event
   * @returns {void}
   */
  publishRefreshRequested () {
    this._publishEvent(NavbarEventAggregator.EVENTS.REFRESH_REQUESTED)
  }

  /**
   * Subscribe to refresh requested events
   * @param {Function} handler - Handler called when refresh is requested
   * @returns {Function} Unsubscribe function
   */
  onRefreshRequested (handler) {
    return this._subscribeToEvent(
      NavbarEventAggregator.EVENTS.REFRESH_REQUESTED,
      handler
    )
  }

  /**
   * Publish a params updated event
   * @param {Object} params - Updated parameters
   * @returns {void}
   */
  publishParamsUpdated (params) {
    this._publishEvent(NavbarEventAggregator.EVENTS.PARAMS_UPDATED, params)
  }

  /**
   * Subscribe to params updated events
   * @param {Function} handler - Handler called when params are updated
   * @returns {Function} Unsubscribe function
   */
  onParamsUpdated (handler) {
    return this._subscribeToEvent(
      NavbarEventAggregator.EVENTS.PARAMS_UPDATED,
      handler
    )
  }

  /**
   * Publish a map type changed event
   * @param {*} mapType - The new map type
   * @returns {void}
   */
  publishMapTypeChanged (mapType) {
    this._publishEvent(NavbarEventAggregator.EVENTS.MAP_TYPE_CHANGED, mapType)
  }

  /**
   * Subscribe to map type changed events
   * @param {Function} handler - Handler called when map type changes
   * @returns {Function} Unsubscribe function
   */
  onMapTypeChanged (handler) {
    return this._subscribeToEvent(
      NavbarEventAggregator.EVENTS.MAP_TYPE_CHANGED,
      handler
    )
  }

  /**
   * Publish a water changed event
   * @param {*} water - The new water configuration
   * @returns {void}
   */
  publishWaterChanged (water) {
    this._publishEvent(NavbarEventAggregator.EVENTS.WATER_CHANGED, water)
  }

  /**
   * Subscribe to water changed events
   * @param {Function} handler - Handler called when water changes
   * @returns {Function} Unsubscribe function
   */
  onWaterChanged (handler) {
    return this._subscribeToEvent(
      NavbarEventAggregator.EVENTS.WATER_CHANGED,
      handler
    )
  }

  /**
   * Publish a mode changed event
   * @param {*} mode - The new mode value
   * @returns {void}
   */
  publishModeChanged (mode) {
    this._publishEvent(NavbarEventAggregator.EVENTS.MODE_CHANGED, mode)
  }

  /**
   * Subscribe to mode changed events
   * @param {Function} handler - Handler called when mode changes
   * @returns {Function} Unsubscribe function
   */
  onModeChanged (handler) {
    return this._subscribeToEvent(
      NavbarEventAggregator.EVENTS.MODE_CHANGED,
      handler
    )
  }

  /**
   * Generic event publisher - internal helper to reduce duplication
   * @private
   * @param {string} eventName - The event name from EVENTS object
   * @param {*} [data] - Optional data to publish with event
   */
  _publishEvent (eventName, data) {
    this.publish(eventName, data)
  }

  /**
   * Generic event subscriber - internal helper to reduce duplication
   * @private
   * @param {string} eventName - The event name from EVENTS object
   * @param {Function} handler - Handler function to subscribe
   * @returns {Function} Unsubscribe function
   */
  _subscribeToEvent (eventName, handler) {
    return this.subscribe(eventName, handler)
  }
}

/**
 * Factory function to create a new NavbarEventAggregator instance
 * @returns {NavbarEventAggregator} A new event aggregator for navbar events
 */
export function createNavbarEventAggregator () {
  return new NavbarEventAggregator()
}
