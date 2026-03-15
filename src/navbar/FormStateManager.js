/**
 * FormStateManager - Manages form state with validation and updates
 * Provides centralized state management for UI forms
 */
export class FormStateManager {
  constructor (initialState = {}) {
    this.state = { ...initialState }
    this.originalState = { ...initialState }
    this.validators = {}
    this.onChange = {}
  }

  /**
   * Register a validator for a field
   */
  registerValidator (field, validator) {
    if (typeof validator === 'function') {
      this.validators[field] = validator
    }
  }

  /**
   * Register a change handler for a field
   */
  registerChangeHandler (field, handler) {
    if (typeof handler === 'function') {
      this.onChange[field] = handler
    }
  }

  /**
   * Get field value
   */
  get (field) {
    return this.state[field]
  }

  /**
   * Set field value with validation
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
   * Update multiple fields
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
   * Validate a field value
   * @private
   */
  _validate (field, value) {
    const validator = this.validators[field]
    if (validator) {
      return validator(value)
    }
    return value
  }

  /**
   * Notify field change handlers
   * @private
   */
  _notifyChange (field, value) {
    const handler = this.onChange[field]
    if (handler && typeof handler === 'function') {
      handler(value)
    }
  }

  /**
   * Get entire state
   */
  getAll () {
    return { ...this.state }
  }

  /**
   * Reset to original state
   */
  reset () {
    this.state = { ...this.originalState }
  }

  /**
   * Check if state has changed
   */
  hasChanged () {
    return JSON.stringify(this.state) !== JSON.stringify(this.originalState)
  }

  /**
   * Get changed fields
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
   * Clear all change handlers
   */
  clearHandlers () {
    this.onChange = {}
  }
}

/**
 * GameBoardStateManager - Specialized state manager for game board settings
 * Manages board-specific state (size, terrain, water, etc.)
 */
export class GameBoardStateManager extends FormStateManager {
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
   * Get board dimensions
   */
  getDimensions () {
    return {
      height: this.state.height,
      width: this.state.width
    }
  }

  /**
   * Set board dimensions
   */
  setDimensions (height, width) {
    return this.update({ height, width })
  }

  /**
   * Get terrain settings
   */
  getTerrainSettings () {
    return {
      terrain: this.state.terrain,
      water: this.state.water
    }
  }

  /**
   * Set terrain settings
   */
  setTerrainSettings (terrain, water) {
    return this.update({ terrain, water })
  }

  /**
   * Get map type
   */
  getMapType () {
    return this.state.mapType
  }

  /**
   * Set map type
   */
  setMapType (mapType) {
    return this.set('mapType', mapType)
  }

  /**
   * Validate dimensions are numeric and positive
   */
  validateDimensions (height, width) {
    return (
      Number.isInteger(height) &&
      height > 0 &&
      Number.isInteger(width) &&
      width > 0
    )
  }
}

/**
 * Create form state manager
 */
export function createFormStateManager (initialState = {}) {
  return new FormStateManager(initialState)
}

/**
 * Create game board state manager
 */
export function createGameBoardStateManager (initialState = {}) {
  return new GameBoardStateManager(initialState)
}
