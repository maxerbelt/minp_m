/**
 * FormStateManager - Centralized form state management with validation
 * Provides state tracking, validation, change notifications, and reset functionality
 *
 * @class FormStateManager
 * @description Manages mutable form state with immutable snapshots for change detection
 */
export class FormStateManager {
  /**
   * Initialize form state manager
   * @param {Object} [initialState={}] - Initial state values
   */
  constructor (initialState = {}) {
    /** @type {Object} Current form state */
    this.state = { ...initialState }

    /** @type {Object} Snapshot of original state for change tracking */
    this.originalState = { ...initialState }

    /** @type {Object<string, Function>} Field-level validators */
    this.validators = {}

    /** @type {Object<string, Function>} Field change notification handlers */
    this.onChange = {}
  }

  /**
   * Register a validation function for a field
   * @param {string} field - Field name to validate
   * @param {Function} validator - Validator function: (value) => validatedValue
   * @throws {TypeError} If validator is not a function
   */
  registerValidator (field, validator) {
    this._validateCallback(validator, 'validator')
    this.validators[field] = validator
  }

  /**
   * Register a change handler callback for a field
   * @param {string} field - Field name to monitor
   * @param {Function} handler - Handler function: (value) => void
   * @throws {TypeError} If handler is not a function
   */
  registerChangeHandler (field, handler) {
    this._validateCallback(handler, 'handler')
    this.onChange[field] = handler
  }

  /**
   * Retrieve current value of a field
   * @param {string} field - Field name
   * @returns {*} Current field value
   */
  get (field) {
    return this.state[field]
  }

  /**
   * Set field value with validation and change notification
   * @param {string} field - Field name
   * @param {*} value - New field value
   * @returns {boolean} True if value was set successfully, false if validation failed
   */
  set (field, value) {
    const validated = this._validate(field, value)
    if (validated !== undefined && validated !== null) {
      this.state[field] = validated
      this._notifyChange(field, validated)
      return true
    }
    return false
  }

  /**
   * Update multiple fields at once
   * @param {Object} updates - Object with field names and values: { field: value, ... }
   * @returns {Object} Successfully updated fields with their new values
   */
  update (updates) {
    const result = {}
    for (const [field, value] of Object.entries(updates)) {
      if (this.set(field, value)) {
        result[field] = this.state[field]
      }
    }
    return result
  }

  /**
   * Get complete current state
   * @returns {Object} Copy of current state object
   */
  getAll () {
    return { ...this.state }
  }

  /**
   * Reset state to original values
   */
  reset () {
    this.state = { ...this.originalState }
  }

  /**
   * Check if any field has changed from original state
   * @returns {boolean} True if state differs from original
   */
  hasChanged () {
    return JSON.stringify(this.state) !== JSON.stringify(this.originalState)
  }

  /**
   * Get all fields that differ from original state
   * @returns {Object} Changed fields with their new values
   */
  getChangedFields () {
    const changed = {}
    for (const [key, value] of Object.entries(this.state)) {
      if (this.originalState[key] !== value) {
        changed[key] = value
      }
    }
    return changed
  }

  /**
   * Remove all registered change handlers
   */
  clearHandlers () {
    this.onChange = {}
  }

  /**
   * Validate a callback function for use as handler or validator
   * @private
   * @param {*} callback - Function to validate
   * @param {string} callbackType - Type of callback for error message
   * @throws {TypeError} If callback is not a function
   */
  _validateCallback (callback, callbackType) {
    if (typeof callback !== 'function') {
      throw new TypeError(
        `${callbackType} must be a function, received ${typeof callback}`
      )
    }
  }

  /**
   * Apply field validator and return validated value
   * @private
   * @param {string} field - Field name
   * @param {*} value - Value to validate
   * @returns {*} Validated value or original if no validator
   */
  _validate (field, value) {
    const validator = this.validators[field]
    if (validator) {
      return validator(value)
    }
    return value
  }

  /**
   * Safely invoke field change handler
   * @private
   * @param {string} field - Field name
   * @param {*} value - New field value
   */
  _notifyChange (field, value) {
    const handler = this.onChange[field]
    if (handler && typeof handler === 'function') {
      try {
        handler(value)
      } catch (error) {
        console.error(`Error in change handler for field '${field}':`, error)
      }
    }
  }
}

/**
 * GameBoardStateManager - Specialized form state manager for game board configuration
 * Manages board-specific state: dimensions (height, width), terrain type, water type, map type
 *
 * @class GameBoardStateManager
 * @extends FormStateManager
 * @description Centralizes game board settings with predefined defaults and convenience accessors
 */
export class GameBoardStateManager extends FormStateManager {
  /**
   * Initialize game board state with predefined board settings
   * @param {Object} [initialState={}] - Override initial board state
   * @param {number} [initialState.height=10] - Board height in cells
   * @param {number} [initialState.width=10] - Board width in cells
   * @param {string} [initialState.terrain='standard'] - Terrain type
   * @param {string} [initialState.water='standard'] - Water type
   * @param {string} [initialState.mapType='rectangular'] - Map geometry type
   */
  constructor (initialState = {}) {
    super({
      height: 10,
      width: 10,
      terrain: 'standard',
      water: 'standard',
      mapType: 'rectangular',
      ...initialState
    })
  }

  /**
   * Get current board dimensions
   * @returns {Object} Object with height and width properties
   */
  getDimensions () {
    return {
      height: this.state.height,
      width: this.state.width
    }
  }

  /**
   * Set board dimensions with validation
   * @param {number} height - Board height in cells (must be positive integer)
   * @param {number} width - Board width in cells (must be positive integer)
   * @returns {Object} Successfully updated dimensions
   * @throws {Error} If dimensions validation fails
   */
  setDimensions (height, width) {
    if (!this._validateDimensions(height, width)) {
      throw new Error(
        `Invalid dimensions: height=${height}, width=${width}. Both must be positive integers.`
      )
    }
    return this.update({ height, width })
  }

  /**
   * Get current terrain configuration
   * @returns {Object} Object with terrain and water properties
   */
  getTerrainSettings () {
    return {
      terrain: this.state.terrain,
      water: this.state.water
    }
  }

  /**
   * Set terrain configuration
   * @param {string} terrain - Terrain type identifier
   * @param {string} water - Water type identifier
   * @returns {Object} Successfully updated terrain settings
   */
  setTerrainSettings (terrain, water) {
    return this.update({ terrain, water })
  }

  /**
   * Get current map type
   * @returns {string} Map type identifier (e.g., 'rectangular', 'hexagonal')
   */
  getMapType () {
    return this.state.mapType
  }

  /**
   * Set map type
   * @param {string} mapType - Map geometry type
   * @returns {Object} Successfully updated map type
   */
  setMapType (mapType) {
    return this.update({ mapType })
  }

  /**
   * Validate board dimensions are numeric and positive
   * @private
   * @param {number} height - Height to validate
   * @param {number} width - Width to validate
   * @returns {boolean} True if dimensions are valid
   */
  _validateDimensions (height, width) {
    return (
      Number.isInteger(height) &&
      height > 0 &&
      Number.isInteger(width) &&
      width > 0
    )
  }
}

/**
 * Factory function to create a new FormStateManager instance
 * @param {Object} [initialState={}] - Initial state values
 * @returns {FormStateManager} A new form state manager
 */
export function createFormStateManager (initialState = {}) {
  return new FormStateManager(initialState)
}

/**
 * Factory function to create a new GameBoardStateManager instance
 * @param {Object} [initialState={}] - Override initial board state
 * @returns {GameBoardStateManager} A new game board state manager
 */
export function createGameBoardStateManager (initialState = {}) {
  return new GameBoardStateManager(initialState)
}
