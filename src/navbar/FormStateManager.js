/**
 * @typedef {Object<string, any>} FormState
 */

/**
 * @callback ValidatorFn
 * @param {*} value
 * @returns {*}
 */

/**
 * @callback ChangeHandlerFn
 * @param {*} value
 * @returns {void}
 */

/**
 * FormStateManager - Centralized form state management with validation.
 * Provides state tracking, validation, change notifications, and reset functionality.
 *
 * @class FormStateManager
 * @description Manages mutable form state with immutable snapshots for change detection.
 */
export class FormStateManager {
  /**
   * @param {FormState} [initialState={}] - Initial state values.
   */
  constructor (initialState = {}) {
    /** @type {FormState} Current form state. */
    this.state = this._cloneState(initialState)

    /** @type {FormState} Snapshot of original state for change tracking. */
    this.originalState = this._cloneState(initialState)

    /** @type {Object<string, ValidatorFn>} Field-level validators. */
    this.validators = {}

    /** @type {Object<string, ChangeHandlerFn>} Field change notification handlers. */
    this.changeHandlers = {}
    this.onChange = this.changeHandlers
  }

  /**
   * Register a validation function for a field.
   * @param {string} field - Field name to validate.
   * @param {ValidatorFn} validator - Validator function.
   * @throws {TypeError} If validator is not a function.
   */
  registerValidator (field, validator) {
    this._validateFunction(validator, 'validator')
    this.validators[field] = validator
  }

  /**
   * Register a change handler callback for a field.
   * @param {string} field - Field name to monitor.
   * @param {ChangeHandlerFn} handler - Handler function.
   * @throws {TypeError} If handler is not a function.
   */
  registerChangeHandler (field, handler) {
    this._validateFunction(handler, 'handler')
    this.changeHandlers[field] = handler
  }

  /**
   * Retrieve current value of a field.
   * @param {string} field - Field name.
   * @returns {*} Current field value.
   */
  get (field) {
    return this.state[field]
  }

  /**
   * Set field value with validation and change notification.
   * @param {string} field - Field name.
   * @param {*} value - New field value.
   * @returns {boolean} True if value was set successfully, false if validation failed.
   */
  set (field, value) {
    const validated = this._validateField(field, value)
    if (!this._isAcceptableValue(validated)) {
      return false
    }

    this.state[field] = validated
    this._notifyChange(field, validated)
    return true
  }

  /**
   * Update multiple fields at once.
   * @param {FormState} updates - Object with field names and values.
   * @returns {FormState} Successfully updated fields with their new values.
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
   * Get complete current state.
   * @returns {FormState} Copy of current state object.
   */
  getAll () {
    return this._cloneState(this.state)
  }

  /**
   * Reset state to original values.
   */
  reset () {
    this.state = this._cloneState(this.originalState)
  }

  /**
   * Check if any field has changed from original state.
   * @returns {boolean} True if state differs from original.
   */
  hasChanged () {
    return this._statesAreDifferent(this.state, this.originalState)
  }

  /**
   * Get all fields that differ from original state.
   * @returns {FormState} Changed fields with their new values.
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
   * Remove all registered change handlers.
   */
  clearHandlers () {
    this.changeHandlers = {}
    this.onChange = this.changeHandlers
  }

  /**
   * @private
   * @param {*} func
   * @param {string} label
   */
  _validateFunction (func, label) {
    if (typeof func !== 'function') {
      throw new TypeError(`${label} must be a function, received ${typeof func}`)
    }
  }

  /**
   * @private
   * @param {string} field
   * @param {*} value
   * @returns {*}
   */
  _validateField (field, value) {
    const validator = this.validators[field]
    return validator ? validator(value) : value
  }

  /**
   * @private
   * @param {*} value
   * @returns {boolean}
   */
  _isAcceptableValue (value) {
    return value !== undefined && value !== null
  }

  /**
   * @private
   * @param {string} field
   * @param {*} value
   */
  _notifyChange (field, value) {
    const handler = this.changeHandlers[field]
    if (typeof handler !== 'function') {
      return
    }

    try {
      handler(value)
    } catch (error) {
      console.error(`Error in change handler for field '${field}':`, error)
    }
  }

  /**
   * @private
   * @param {FormState} state
   * @returns {FormState}
   */
  _cloneState (state) {
    return { ...state }
  }

  /**
   * @private
   * @param {FormState} left
   * @param {FormState} right
   * @returns {boolean}
   */
  _statesAreDifferent (left, right) {
    return JSON.stringify(left) !== JSON.stringify(right)
  }
}

/**
 * GameBoardStateManager - Specialized form state manager for game board configuration.
 * Manages board-specific state: dimensions (height, width), terrain type, water type, map type.
 *
 * @class GameBoardStateManager
 * @extends FormStateManager
 * @description Centralizes game board settings with predefined defaults and convenience accessors.
 */
export class GameBoardStateManager extends FormStateManager {
  /**
   * @param {Object} [initialState={}] - Override initial board state.
   * @param {number} [initialState.height=10] - Board height in cells.
   * @param {number} [initialState.width=10] - Board width in cells.
   * @param {string} [initialState.terrain='standard'] - Terrain type.
   * @param {string} [initialState.water='standard'] - Water type.
   * @param {string} [initialState.mapType='rectangular'] - Map geometry type.
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
   * Get current board dimensions.
   * @returns {Object} Object with height and width properties.
   */
  getDimensions () {
    return {
      height: this.state.height,
      width: this.state.width
    }
  }

  /**
   * Set board dimensions with validation.
   * @param {number} height - Board height in cells (must be positive integer).
   * @param {number} width - Board width in cells (must be positive integer).
   * @returns {FormState} Successfully updated dimensions.
   * @throws {Error} If dimensions validation fails.
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
   * Get current terrain configuration.
   * @returns {Object} Object with terrain and water properties.
   */
  getTerrainSettings () {
    return {
      terrain: this.state.terrain,
      water: this.state.water
    }
  }

  /**
   * Set terrain configuration.
   * @param {string} terrain - Terrain type identifier.
   * @param {string} water - Water type identifier.
   * @returns {FormState} Successfully updated terrain settings.
   */
  setTerrainSettings (terrain, water) {
    return this.update({ terrain, water })
  }

  /**
   * Get current map type.
   * @returns {string} Map type identifier (e.g., 'rectangular', 'hexagonal').
   */
  getMapType () {
    return this.state.mapType
  }

  /**
   * Set map type.
   * @param {string} mapType - Map geometry type.
   * @returns {FormState} Successfully updated map type.
   */
  setMapType (mapType) {
    return this.update({ mapType })
  }

  /**
   * Validate board dimensions are numeric and positive.
   * @private
   * @param {number} height - Height to validate.
   * @param {number} width - Width to validate.
   * @returns {boolean} True if dimensions are valid.
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
 * Factory function to create a new FormStateManager instance.
 * @param {FormState} [initialState={}] - Initial state values.
 * @returns {FormStateManager} A new form state manager.
 */
export function createFormStateManager (initialState = {}) {
  return new FormStateManager(initialState)
}

/**
 * Factory function to create a new GameBoardStateManager instance.
 * @param {FormState} [initialState={}] - Override initial board state.
 * @returns {GameBoardStateManager} A new game board state manager.
 */
export function createGameBoardStateManager (initialState = {}) {
  return new GameBoardStateManager(initialState)
}
