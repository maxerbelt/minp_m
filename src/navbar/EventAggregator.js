/**
 * @typedef {string} EventName
 */

/**
 * @typedef {*} EventPayload
 */

/**
 * @callback EventHandler
 * @param {EventPayload} [payload]
 */

/**
 * @typedef {Object<string, EventHandler[]>} SubscriberMap
 */

/**
 * EventAggregator - Centralized event management system
 * Provides publish-subscribe pattern for decoupled component communication.
 *
 * @class EventAggregator
 * @description Manages event subscriptions and publications with error isolation.
 */
export class EventAggregator {
  constructor () {
    /** @type {SubscriberMap} Subscribers organized by event name */
    this.subscribers = {}
  }

  /**
   * Register a handler for an event.
   * @param {EventName} eventName - The name of the event to subscribe to.
   * @param {EventHandler} handler - The handler function to invoke when event is published.
   * @returns {Function} Unsubscribe function that removes this handler.
   * @throws {TypeError} If handler is not a function.
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
   * @param {EventName} eventName - The name of the event to unsubscribe from.
   * @param {EventHandler} handler - The handler function to remove.
   */
  unsubscribe (eventName, handler) {
    const subscribers = this._getSubscribers(eventName)
    if (!subscribers.length) return

    this.subscribers[eventName] = subscribers.filter(h => h !== handler)
  }

  /**
   * Trigger all handlers registered for an event.
   * Errors in individual handlers are isolated so other handlers still run.
   * @param {EventName} eventName - The name of the event to publish.
   * @param {EventPayload} [data] - Optional data to pass to all handlers.
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
   * @param {EventName} eventName - The name of the event to check.
   * @returns {boolean} True if event has at least one subscriber.
   */
  hasSubscribers (eventName) {
    return this._getSubscribers(eventName).length > 0
  }

  /**
   * Remove all subscribers for a specific event.
   * @param {EventName} eventName - The name of the event to clear.
   */
  clearEvent (eventName) {
    if (this.subscribers[eventName]) {
      this.subscribers[eventName] = []
    }
  }

  /**
   * Remove all event subscribers across all events.
   */
  clearAll () {
    this.subscribers = {}
  }

  /**
   * Return subscriber list for an event, or an empty array if none exist.
   * @private
   * @param {EventName} eventName
   * @returns {EventHandler[]}
   */
  _getSubscribers (eventName) {
    return this.subscribers[eventName] || []
  }

  /**
   * Ensure a subscriber list exists for an event and return it.
   * @private
   * @param {EventName} eventName
   * @returns {EventHandler[]}
   */
  _ensureSubscribers (eventName) {
    if (!this.subscribers[eventName]) {
      this.subscribers[eventName] = []
    }
    return this.subscribers[eventName]
  }

  /**
   * Safely invoke a handler with error isolation.
   * @private
   * @param {EventHandler} handler - The handler to invoke.
   * @param {EventName} eventName - The event name for error reporting.
   * @param {EventPayload} data - Data to pass to handler.
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
   * @private
   * @param {EventName} eventName - Event name to validate.
   * @throws {TypeError} If eventName is not a non-empty string.
   */
  _validateEventName (eventName) {
    if (typeof eventName !== 'string' || eventName.trim() === '') {
      throw new TypeError('Event name must be a non-empty string')
    }
  }

  /**
   * Validate handler is a function.
   * @private
   * @param {EventHandler} handler - Handler to validate.
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
 * Pre-defines common navbar events and provides publish/subscribe helpers.
 *
 * @class NavbarEventAggregator
 * @extends EventAggregator
 * @description Centralizes navbar event management with predefined event types.
 */
export class NavbarEventAggregator extends EventAggregator {
  /**
   * Standard navbar events.
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
   * Publish a size changed event.
   * @param {EventPayload} size - The new size value.
   */
  publishSizeChanged (size) {
    this.publish(NavbarEventAggregator.EVENTS.SIZE_CHANGED, size)
  }

  /**
   * Subscribe to size changed events.
   * @param {EventHandler} handler - Handler called when size changes.
   * @returns {Function} Unsubscribe function.
   */
  onSizeChanged (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.SIZE_CHANGED, handler)
  }

  /**
   * Publish a map selected event.
   * @param {EventPayload} mapName - The name of the selected map.
   */
  publishMapSelected (mapName) {
    this.publish(NavbarEventAggregator.EVENTS.MAP_SELECTED, mapName)
  }

  /**
   * Subscribe to map selected events.
   * @param {EventHandler} handler - Handler called when map is selected.
   * @returns {Function} Unsubscribe function.
   */
  onMapSelected (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.MAP_SELECTED, handler)
  }

  /**
   * Publish a terrain changed event.
   * @param {EventPayload} terrain - The new terrain configuration.
   */
  publishTerrainChanged (terrain) {
    this.publish(NavbarEventAggregator.EVENTS.TERRAIN_CHANGED, terrain)
  }

  /**
   * Subscribe to terrain changed events.
   * @param {EventHandler} handler - Handler called when terrain changes.
   * @returns {Function} Unsubscribe function.
   */
  onTerrainChanged (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.TERRAIN_CHANGED, handler)
  }

  /**
   * Publish a board setup event.
   */
  publishBoardSetup () {
    this.publish(NavbarEventAggregator.EVENTS.BOARD_SETUP)
  }

  /**
   * Subscribe to board setup events.
   * @param {EventHandler} handler - Handler called when board is set up.
   * @returns {Function} Unsubscribe function.
   */
  onBoardSetup (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.BOARD_SETUP, handler)
  }

  /**
   * Publish a refresh requested event.
   */
  publishRefreshRequested () {
    this.publish(NavbarEventAggregator.EVENTS.REFRESH_REQUESTED)
  }

  /**
   * Subscribe to refresh requested events.
   * @param {EventHandler} handler - Handler called when refresh is requested.
   * @returns {Function} Unsubscribe function.
   */
  onRefreshRequested (handler) {
    return this.subscribe(
      NavbarEventAggregator.EVENTS.REFRESH_REQUESTED,
      handler
    )
  }

  /**
   * Publish a params updated event.
   * @param {EventPayload} params - Updated parameters.
   */
  publishParamsUpdated (params) {
    this.publish(NavbarEventAggregator.EVENTS.PARAMS_UPDATED, params)
  }

  /**
   * Subscribe to params updated events.
   * @param {EventHandler} handler - Handler called when params are updated.
   * @returns {Function} Unsubscribe function.
   */
  onParamsUpdated (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.PARAMS_UPDATED, handler)
  }

  /**
   * Publish a map type changed event.
   * @param {EventPayload} mapType - The new map type.
   */
  publishMapTypeChanged (mapType) {
    this.publish(NavbarEventAggregator.EVENTS.MAP_TYPE_CHANGED, mapType)
  }

  /**
   * Subscribe to map type changed events.
   * @param {EventHandler} handler - Handler called when map type changes.
   * @returns {Function} Unsubscribe function.
   */
  onMapTypeChanged (handler) {
    return this.subscribe(
      NavbarEventAggregator.EVENTS.MAP_TYPE_CHANGED,
      handler
    )
  }

  /**
   * Publish a water changed event.
   * @param {EventPayload} water - The new water configuration.
   */
  publishWaterChanged (water) {
    this.publish(NavbarEventAggregator.EVENTS.WATER_CHANGED, water)
  }

  /**
   * Subscribe to water changed events.
   * @param {EventHandler} handler - Handler called when water changes.
   * @returns {Function} Unsubscribe function.
   */
  onWaterChanged (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.WATER_CHANGED, handler)
  }

  /**
   * Publish a mode changed event.
   * @param {EventPayload} mode - The new mode value.
   */
  publishModeChanged (mode) {
    this.publish(NavbarEventAggregator.EVENTS.MODE_CHANGED, mode)
  }

  /**
   * Subscribe to mode changed events.
   * @param {EventHandler} handler - Handler called when mode changes.
   * @returns {Function} Unsubscribe function.
   */
  onModeChanged (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.MODE_CHANGED, handler)
  }
}

/**
 * Factory function to create a new NavbarEventAggregator instance.
 * @returns {NavbarEventAggregator} A new event aggregator for navbar events.
 */
export function createNavbarEventAggregator () {
  return new NavbarEventAggregator()
}
