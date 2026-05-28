/**
 * @typedef {Function} EventListener
 * @param {*} data - Data passed from emitter
 * @returns {void}
 */

/**
 * @typedef {Object.<string, EventListener[]>} ListenerMap
 */

/**
 * SimpleEventBus - Lightweight event emitter for decoupling components
 * Provides pub/sub functionality for loose coupling between UI elements and game logic
 *
 * @class SimpleEventBus
 * @example
 *   const bus = new SimpleEventBus()
 *   bus.on('gameStart', (data) => console.log('Game started:', data))
 *   bus.emit('gameStart', { level: 1 })
 */
export class SimpleEventBus {
  /**
   * Create a new event bus instance
   */
  constructor () {
    /** @type {ListenerMap} Mapping of event names to listener arrays */
    this.listeners = {}
  }

  /**
   * Register a listener for an event
   * @param {string} eventName - Name of the event to listen for
   * @param {EventListener} callback - Function to call when event is emitted
   * @returns {void}
   */
  on (eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = []
    }
    this.listeners[eventName].push(callback)
  }

  /**
   * Register a one-time listener that automatically unsubscribes after first call
   * @param {string} eventName - Name of the event to listen for
   * @param {EventListener} callback - Function to call once and then remove
   * @returns {void}
   */
  once (eventName, callback) {
    const wrapper = (...args) => {
      callback(...args)
      this.off(eventName, wrapper)
    }
    this.on(eventName, wrapper)
  }

  /**
   * Emit an event to all registered listeners
   * Errors in individual listeners are caught and logged to prevent cascade failures
   * @param {string} eventName - Name of the event to emit
   * @param {*} [data] - Data to pass to all listeners
   * @returns {void}
   */
  emit (eventName, data) {
    if (!this.listeners[eventName]) {
      return
    }
    this.listeners[eventName].forEach(callback => {
      try {
        callback(data)
      } catch (err) {
        console.error(`Error in event listener for '${eventName}':`, err)
      }
    })
  }

  /**
   * Remove a specific listener from an event
   * @param {string} eventName - Name of the event
   * @param {EventListener} callback - The exact callback reference to remove
   * @returns {void}
   */
  off (eventName, callback) {
    if (!this.listeners[eventName]) {
      return
    }
    this.listeners[eventName] = this.listeners[eventName].filter(
      cb => cb !== callback
    )
  }

  /**
   * Clear all listeners for an event or all events
   * @param {string} [eventName] - Optional: if provided, only clear listeners for this event
   * @returns {void}
   */
  clear (eventName) {
    if (eventName) {
      delete this.listeners[eventName]
    } else {
      this.listeners = {}
    }
  }

  /**
   * Get all event names that have active listeners
   * @returns {string[]} Array of event names with one or more listeners
   */
  eventNames () {
    return Object.keys(this.listeners).filter(
      name => this.listeners[name].length > 0
    )
  }

  /**
   * Get the number of listeners registered for an event
   * @param {string} eventName - Name of the event to check
   * @returns {number} Number of listeners, 0 if event has no listeners
   */
  listenerCount (eventName) {
    return this.listeners[eventName]?.length || 0
  }
}
