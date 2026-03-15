/**
 * EventAggregator - Centralized event management system
 * Allows multiple components to publish and subscribe to events
 */
export class EventAggregator {
  constructor () {
    this.subscribers = {}
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Name of event to subscribe to
   * @param {Function} handler - Handler function to execute
   * @returns {Function} Unsubscribe function
   */
  subscribe (eventName, handler) {
    if (!this.subscribers[eventName]) {
      this.subscribers[eventName] = []
    }

    this.subscribers[eventName].push(handler)

    // Return unsubscribe function
    return () => {
      this.unsubscribe(eventName, handler)
    }
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Name of event to unsubscribe from
   * @param {Function} handler - Handler function to remove
   */
  unsubscribe (eventName, handler) {
    if (!this.subscribers[eventName]) return

    this.subscribers[eventName] = this.subscribers[eventName].filter(
      h => h !== handler
    )
  }

  /**
   * Publish an event to all subscribers
   * @param {string} eventName - Name of event to publish
   * @param {*} data - Data to pass to subscribers
   */
  publish (eventName, data) {
    if (!this.subscribers[eventName]) return

    for (const handler of this.subscribers[eventName]) {
      try {
        handler(data)
      } catch (error) {
        console.error(`Error in event handler for ${eventName}:`, error)
      }
    }
  }

  /**
   * Check if event has subscribers
   */
  hasSubscribers (eventName) {
    return (this.subscribers[eventName] || []).length > 0
  }

  /**
   * Clear all subscribers for an event
   */
  clearEvent (eventName) {
    if (this.subscribers[eventName]) {
      this.subscribers[eventName] = []
    }
  }

  /**
   * Clear all events
   */
  clearAll () {
    this.subscribers = {}
  }
}

/**
 * NavbarEventAggregator - Specialized aggregator for navbar events
 * Pre-defines common navbar events
 */
export class NavbarEventAggregator extends EventAggregator {
  // Common navbar events
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
   * Publish size changed event
   */
  publishSizeChanged (size) {
    this.publish(NavbarEventAggregator.EVENTS.SIZE_CHANGED, size)
  }

  /**
   * Subscribe to size changed event
   */
  onSizeChanged (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.SIZE_CHANGED, handler)
  }

  /**
   * Publish map selected event
   */
  publishMapSelected (mapName) {
    this.publish(NavbarEventAggregator.EVENTS.MAP_SELECTED, mapName)
  }

  /**
   * Subscribe to map selected event
   */
  onMapSelected (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.MAP_SELECTED, handler)
  }

  /**
   * Publish terrain changed event
   */
  publishTerrainChanged (terrain) {
    this.publish(NavbarEventAggregator.EVENTS.TERRAIN_CHANGED, terrain)
  }

  /**
   * Subscribe to terrain changed event
   */
  onTerrainChanged (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.TERRAIN_CHANGED, handler)
  }

  /**
   * Publish board setup event
   */
  publishBoardSetup () {
    this.publish(NavbarEventAggregator.EVENTS.BOARD_SETUP)
  }

  /**
   * Subscribe to board setup event
   */
  onBoardSetup (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.BOARD_SETUP, handler)
  }

  /**
   * Publish refresh requested event
   */
  publishRefreshRequested () {
    this.publish(NavbarEventAggregator.EVENTS.REFRESH_REQUESTED)
  }

  /**
   * Subscribe to refresh requested event
   */
  onRefreshRequested (handler) {
    return this.subscribe(
      NavbarEventAggregator.EVENTS.REFRESH_REQUESTED,
      handler
    )
  }

  /**
   * Publish params updated event
   */
  publishParamsUpdated (params) {
    this.publish(NavbarEventAggregator.EVENTS.PARAMS_UPDATED, params)
  }

  /**
   * Subscribe to params updated event
   */
  onParamsUpdated (handler) {
    return this.subscribe(NavbarEventAggregator.EVENTS.PARAMS_UPDATED, handler)
  }
}

/**
 * Create a new navbar event aggregator
 */
export function createNavbarEventAggregator () {
  return new NavbarEventAggregator()
}
