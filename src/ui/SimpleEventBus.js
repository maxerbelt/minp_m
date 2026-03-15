/**
 * SimpleEventBus - Lightweight event emitter for decoupling components
 */
export class SimpleEventBus {
  constructor () {
    this.listeners = {}
  }

  /**
   * Register a listener for an event
   * @param {string} eventName - Name of the event
   * @param {Function} callback - Function to call when event is emitted
   */
  on (eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = []
    }
    this.listeners[eventName].push(callback)
  }

  /**
   * Register a one-time listener
   * @param {string} eventName - Name of the event
   * @param {Function} callback - Function to call once
   */
  once (eventName, callback) {
    const wrapper = (...args) => {
      callback(...args)
      this.off(eventName, wrapper)
    }
    this.on(eventName, wrapper)
  }

  /**
   * Emit an event to all listeners
   * @param {string} eventName - Name of the event
   * @param {*} data - Data to pass to listeners
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
   * Remove a listener
   * @param {string} eventName - Name of the event
   * @param {Function} callback - The callback to remove
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
   * Clear all listeners
   * @param {string} [eventName] - Optional: only clear listeners for this event
   */
  clear (eventName) {
    if (eventName) {
      delete this.listeners[eventName]
    } else {
      this.listeners = {}
    }
  }

  /**
   * Get all event names with listeners
   * @returns {string[]}
   */
  eventNames () {
    return Object.keys(this.listeners).filter(
      name => this.listeners[name].length > 0
    )
  }

  /**
   * Get count of listeners for an event
   * @param {string} eventName - Name of the event
   * @returns {number}
   */
  listenerCount (eventName) {
    return this.listeners[eventName]?.length || 0
  }
}
