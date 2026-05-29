/**
 * @typedef {import('./types/form.types.js').FormState} FormState
 * @typedef {import('./types/callbacks.types.js').ValidatorFn} ValidatorFn
 * @typedef {import('./types/callbacks.types.js').ChangeHandlerFn} ChangeHandlerFn
 */

/**
 * @typedef {Object} FieldValidatorMap
 * @property {string} [key] - Field name mapped to ValidatorFn
 * Custom validators for specific form fields.
 */

/**
 * @typedef {Object} FieldChangeHandlerMap
 * @property {string} [key] - Field name mapped to ChangeHandlerFn
 * Callbacks invoked when specific fields change values.
 */

/**
 * FormStateManager - Centralized form state management with validation.
 * Provides state tracking, validation, change notifications, and reset functionality.
 * Manages mutable form state while maintaining immutable snapshots for change detection.
 *
 * State model:
 * - `state`: Current form field values, mutable and subject to validation
 * - `originalState`: Snapshot of initial state for change tracking
 * - `validators`: Field-specific transformation/validation functions
 * - `changeHandlers`: Event callbacks invoked after successful field updates
 *
 * State changes are transactional - validators must succeed for state to update.
 * Change handlers are called after state changes but errors are isolated.
 *
 * @class FormStateManager
 * @description Manages form state with validation, change tracking, and event notifications.
 * Supports batch updates, field-level validators, and change detection via snapshots.
 */
export class FormStateManager {
  /**
   * Create a new FormStateManager instance.
   * Initializes state with provided initial values and creates a snapshot for change tracking.
   * All state properties are shallow-cloned to prevent external mutation of internal state.
   *
   * @param {FormState} [initialState={}] - Initial state values.
   *                                         If omitted, manager starts with empty state {}.
   *                                         All properties are shallow-copied internally.
   */
  constructor (initialState = {}) {
    /**
     * Current form field values.
     * Mutable state subject to validators and change handlers.
     * @type {FormState}
     */
    this.state = this._cloneState(initialState)

    /**
     * Snapshot of original state for change detection.
     * Used by hasChanged() and getChangedFields() to identify modified fields.
     * @type {FormState}
     */
    this.originalState = this._cloneState(initialState)

    /**
     * Map of field names to validator functions.
     * Validators are applied during set() operations to transform/validate values.
     * @type {FieldValidatorMap}
     */
    this.validators = {}

    /**
     * Map of field names to change handler callbacks.
     * Handlers are invoked after successful state updates with error isolation.
     * @type {FieldChangeHandlerMap}
     */
    this.changeHandlers = {}
  }

  /**
   * Register a validation function for a specific form field.
   * Validators are invoked before value assignment in set() operations.
   * A validator can transform, validate, or reject a value.
   *
   * @public
   * @param {string} field - Field name to associate with validator.
   *                         Must be a non-empty string identifier.
   * @param {ValidatorFn} validator - Function that validates/transforms field values.
   *                                  Called with value, returns validated/transformed value.
   *                                  Must be a function, not null or undefined.
   * @returns {void}
   * @throws {TypeError} If validator is not a function.
   *                     Error message: "validator must be a function, received [type]"
   */
  registerValidator (field, validator) {
    this._validateFunction(validator, 'validator')
    this.validators[field] = validator
  }

  /**
   * Register a change handler callback for a specific form field.
   * Handlers are invoked asynchronously after successful field state updates.
   * Handler errors are caught and logged; they do not affect state changes.
   *
   * @public
   * @param {string} field - Field name to monitor for changes.
   *                         Must be a non-empty string identifier.
   * @param {ChangeHandlerFn} handler - Callback invoked when field value changes.
   *                                    Called with new field value.
   *                                    Must be a function, not null or undefined.
   * @returns {void}
   * @throws {TypeError} If handler is not a function.
   *                     Error message: "handler must be a function, received [type]"
   */
  registerChangeHandler (field, handler) {
    this._validateFunction(handler, 'handler')
    this.changeHandlers[field] = handler
  }

  /**
   * Retrieve the current value of a form field.
   * Returns the value as stored in current state, without validation.
   * Returns undefined if field has not been set.
   *
   * @public
   * @param {string} field - Field name/identifier.
   * @returns {*} Current field value, or undefined if not set.
   *              Value is returned as-is from state, unchanged.
   */
  get (field) {
    return this.state[field]
  }

  /**
   * Set a form field value with validation and change notification.
   * Applies registered validator (if any), then stores value if valid.
   * Rejects null/undefined values even after validation.
   * Invokes registered change handler after successful update.
   *
   * @public
   * @param {string} field - Field name to update.
   * @param {*} value - New field value.
   * @returns {boolean} True if value was set and stored successfully;
   *                    false if validator rejected value or value is null/undefined.
   * @description State update is transactional - either entire update succeeds or fails.
   *              Change handler is only called on successful state update.
   */
  set (field, value) {
    const validated = this._validateField(field, value)
    if (!this._isValidValue(validated)) {
      return false
    }

    this.state[field] = validated
    this._notifyChange(field, validated)
    return true
  }

  /**
   * Update multiple form fields in a single operation.
   * Applies set() to each field independently; partial updates are possible.
   * If some fields fail validation, previously validated fields are still updated.
   *
   * @public
   * @param {FormState} updates - Object mapping field names to new values.
   *                              Each field is processed independently via set().
   * @returns {FormState} Object containing only fields that were successfully updated.
   *                      Failed fields are omitted from return value.
   * @description Iteration order may vary; use result object to determine success.
   *              All applicable validators are applied during batch update.
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
   * Get a copy of the complete current form state.
   * Returns a shallow clone to prevent external modification of internal state.
   *
   * @public
   * @returns {FormState} Shallow copy of current state object.
   *                      Safe to modify without affecting manager state.
   */
  getAll () {
    return this._cloneState(this.state)
  }

  /**
   * Reset form state to original values.
   * Restores all fields to their initial state values captured at construction.
   * Does not invoke change handlers for reset operations.
   *
   * @public
   * @returns {void}
   * @description Reset is not validated - original values are restored directly.
   *              Use hasChanged() to detect if reset had any effect.
   */
  reset () {
    this.state = this._cloneState(this.originalState)
  }

  /**
   * Check if any form field has changed from its original state.
   * Performs deep comparison using JSON serialization.
   * Returns true if any field differs from original or new fields exist.
   *
   * @public
   * @returns {boolean} True if current state differs from original state;
   *                    false if all fields match original values.
   * @description Uses JSON.stringify for comparison; works for plain objects.
   *              New fields added after construction are considered changes.
   */
  hasChanged () {
    return this._statesAreDifferent(this.state, this.originalState)
  }

  /**
   * Get all form fields that differ from their original values.
   * Compares current state against original state captured at construction.
   * Only fields with different values are included in result.
   *
   * @public
   * @returns {FormState} Object containing only fields with changed values.
   *                      Returns empty object {} if no changes detected.
   * @description Original fields with same values are omitted.
   *              New fields added after construction are included.
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
   * Remove all registered change handler callbacks.
   * Clears the changeHandlers map completely.
   * Validators are not affected.
   *
   * @public
   * @returns {void}
   * @description After this call, no change handlers will be invoked on state updates.
   *              Validators remain active until explicitly unregistered.
   */
  clearHandlers () {
    this.changeHandlers = {}
  }

  /**
   * Validate that a value is a callable function.
   * Throws TypeError if value is not a function type.
   * Used internally to validate validators and handlers before registration.
   *
   * @private
   * @param {*} func - Value to validate as function.
   * @param {string} label - Descriptive label used in error messages.
   *                         Example: 'validator', 'handler' for clarity.
   * @returns {void}
   * @throws {TypeError} If func is not typeof 'function'.
   *                     Error message: "[label] must be a function, received [type]"
   */
  _validateFunction (func, label) {
    if (typeof func !== 'function') {
      throw new TypeError(
        `${label} must be a function, received ${typeof func}`
      )
    }
  }

  /**
   * Apply field-specific validator if registered.
   * If no validator registered for field, returns value unchanged.
   * Validators are applied during set() operations.
   *
   * @private
   * @param {string} field - Field name to look up validator for.
   * @param {*} value - Value to validate/transform.
   * @returns {*} Value returned from validator if registered;
   *              original value if no validator exists for field.
   * @description Validators can transform, validate, or reject values.
   *              Return undefined/null from validator to reject the value.
   */
  _validateField (field, value) {
    const validator = this.validators[field]
    return validator ? validator(value) : value
  }

  /**
   * Check if a value is valid for storage in form state.
   * Rejects null and undefined values; accepts all other types.
   * Called after validation to ensure state never stores null/undefined.
   *
   * @private
   * @param {*} value - Value to validate for storage.
   * @returns {boolean} True if value is non-null and non-undefined;
   *                    false otherwise.
   */
  _isValidValue (value) {
    return value !== undefined && value !== null
  }

  /**
   * Invoke the change handler for a field with error isolation.
   * Handlers are called synchronously after successful state update.
   * If handler throws, error is logged to console but does not affect state.
   * If no handler registered for field, returns silently.
   *
   * @private
   * @param {string} field - Field name whose handler to invoke.
   * @param {*} value - New field value passed to handler.
   * @returns {void}
   * @description Handler errors are caught and logged; state update is not rolled back.
   *              Non-existent handlers are silently ignored.
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
   * Create a shallow copy of a state object.
   * Uses object spread operator for shallow cloning.
   * Suitable for plain objects with primitive values or simple references.
   *
   * @private
   * @param {FormState} state - State object to clone.
   * @returns {FormState} Shallow copy of state object.
   *                      Top-level properties are copied; nested objects are referenced.
   */
  _cloneState (state) {
    return { ...state }
  }

  /**
   * Compare two state objects for deep equality.
   * Serializes both objects to JSON and compares string representations.
   * Works reliably for plain objects with primitive values.
   *
   * @private
   * @param {FormState} left - First state object to compare.
   * @param {FormState} right - Second state object to compare.
   * @returns {boolean} True if JSON serializations differ (states not equal);
   *                    false if serializations match (states are equal).
   * @description Method: JSON.stringify(left) !== JSON.stringify(right)
   *              Does not work for objects with functions, Dates, or circular references.
   */
  _statesAreDifferent (left, right) {
    return JSON.stringify(left) !== JSON.stringify(right)
  }
}

/**
 * GameBoardStateManager - Specialized form state manager for game board configuration.
 * Manages board-specific state: dimensions (height, width), terrain type, water type, map type.
 * Provides domain-specific accessors and validation for game board properties.
 *
 * Preset defaults:
 * - height: 10 cells
 * - width: 10 cells
 * - terrain: 'standard'
 * - water: 'standard'
 * - mapType: 'rectangular'
 *
 * All dimensions must be positive integers; validation is enforced in setDimensions().
 *
 * @class GameBoardStateManager
 * @extends FormStateManager
 * @description Specializes FormStateManager with game board defaults and convenience methods.
 * Provides type-safe dimension validation and terrain configuration accessors.
 */
export class GameBoardStateManager extends FormStateManager {
  /**
   * Create a new GameBoardStateManager instance with preset game board defaults.
   * Initializes with standard board configuration and allows field overrides.
   *
   * @param {Object} [initialState={}] - Override default board state values.
   *                                      Any omitted fields use preset defaults.
   * @param {number} [initialState.height=10] - Board height in cells (positive integer).
   * @param {number} [initialState.width=10] - Board width in cells (positive integer).
   * @param {string} [initialState.terrain='standard'] - Terrain type identifier.
   * @param {string} [initialState.water='standard'] - Water type identifier.
   * @param {string} [initialState.mapType='rectangular'] - Map geometry type.
   * @description All unspecified fields receive preset values before inheritance.
   *              Override specific fields by providing partial initialState.
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
   * Get the current board dimensions (height and width).
   * Retrieves both dimension values in a single object.
   *
   * @public
   * @returns {Object} Object with numeric dimension properties.
   * @returns {number} height - Current board height in cells.
   * @returns {number} width - Current board width in cells.
   */
  getDimensions () {
    return {
      height: this.state.height,
      width: this.state.width
    }
  }

  /**
   * Set board dimensions with strict integer and positivity validation.
   * Both height and width must be positive integers (> 0).
   * Updates state only if both dimensions pass validation.
   *
   * @public
   * @param {number} height - Board height in cells (must be positive integer).
   * @param {number} width - Board width in cells (must be positive integer).
   * @returns {FormState} Updated state object with new height and width.
   * @throws {Error} If either dimension is not a positive integer.
   *                 Error message: "Invalid dimensions: height=[h], width=[w].
   *                                  Both must be positive integers."
   * @description Both dimensions are validated together; partial update fails
   *              if either dimension is invalid. Validation uses Number.isInteger().
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
   * Get the current terrain and water type configuration.
   * Retrieves both terrain settings in a single object.
   *
   * @public
   * @returns {Object} Object with terrain configuration properties.
   * @returns {string} terrain - Current terrain type identifier.
   * @returns {string} water - Current water type identifier.
   */
  getTerrainSettings () {
    return {
      terrain: this.state.terrain,
      water: this.state.water
    }
  }

  /**
   * Set terrain and water type configuration for the game board.
   * Updates both terrain and water type identifiers in a single operation.
   *
   * @public
   * @param {string} terrain - Terrain type identifier (e.g., 'standard', 'space').
   * @param {string} water - Water type identifier (e.g., 'standard', 'asteroid').
   * @returns {FormState} Object with successfully updated terrain settings.
   *                      Returns {terrain, water} properties if both succeed.
   * @description Both fields are updated independently via update();
   *              partial success is possible if one field fails validation.
   */
  setTerrainSettings (terrain, water) {
    return this.update({ terrain, water })
  }

  /**
   * Get the current map geometry type.
   * Returns the map type identifier used for board layout.
   *
   * @public
   * @returns {string} Map type identifier (e.g., 'rectangular', 'hexagonal').
   */
  getMapType () {
    return this.state.mapType
  }

  /**
   * Set the map geometry type for the game board.
   * Updates the board layout type (e.g., rectangular, hexagonal, triangular).
   *
   * @public
   * @param {string} mapType - Map geometry type identifier.
   * @returns {FormState} Object with updated mapType if successful.
   */
  setMapType (mapType) {
    return this.update({ mapType })
  }

  /**
   * Validate that dimensions are positive integers.
   * Checks both height and width must be integers and greater than 0.
   * Used by setDimensions() to enforce board size constraints.
   *
   * @private
   * @param {number} height - Height value to validate (must be positive integer).
   * @param {number} width - Width value to validate (must be positive integer).
   * @returns {boolean} True if both height and width are valid positive integers;
   *                    false otherwise.
   * @description Validation: Number.isInteger(height) && height > 0 &&
   *              Number.isInteger(width) && width > 0
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
 * Provides a convenient way to instantiate the manager without 'new' keyword.
 *
 * @public
 * @param {FormState} [initialState={}] - Initial state values.
 *                                         If omitted, creates empty state manager.
 * @returns {FormStateManager} A new FormStateManager instance.
 *                             Ready for field registration and state management.
 */
export function createFormStateManager (initialState = {}) {
  return new FormStateManager(initialState)
}

/**
 * Factory function to create a new GameBoardStateManager instance.
 * Provides convenient instantiation with preset board defaults.
 *
 * @public
 * @param {FormState} [initialState={}] - Override initial board state values.
 *                                         Any omitted fields use preset defaults.
 * @returns {GameBoardStateManager} A new GameBoardStateManager instance.
 *                                  Configured with game board defaults and ready for use.
 */
export function createGameBoardStateManager (initialState = {}) {
  return new GameBoardStateManager(initialState)
}
