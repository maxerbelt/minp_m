/**
 * Form state management and validation types
 * Used by FormStateManager and related components
 */

import type { ValidatorFn, ChangeHandlerFn } from './callbacks.types.js';
import type { StringMap } from './shared.types.js';

// ============================================================================
// Form State
// ============================================================================

/** Generic form state object */
export type FormState = StringMap<any>;

/** Immutable form state snapshot */
export type ImmutableFormState = Readonly<FormState>;

/** Changed fields tracking */
export type ChangedFields = StringMap<any>;

// ============================================================================
// Form State Manager
// ============================================================================

/** Form state manager interface */
export interface FormStateManager {
  /**
   * Register a validation function for a field
   */
  registerValidator(field: string, validator: ValidatorFn): void;

  /**
   * Register a change handler for a field
   */
  registerChangeHandler(field: string, handler: ChangeHandlerFn): void;

  /**
   * Get current value of a field
   */
  get(field: string): any;

  /**
   * Set field value with validation
   */
  set(field: string, value: any): boolean;

  /**
   * Update multiple fields
   */
  update(updates: FormState): FormState;

  /**
   * Get complete current state
   */
  getAll(): FormState;

  /**
   * Reset to original state
   */
  reset(): void;

  /**
   * Check if state has changed
   */
  hasChanged(): boolean;

  /**
   * Get all changed fields
   */
  getChangedFields(): ChangedFields;

  /**
   * Clear all change handlers
   */
  clearHandlers(): void;
}

// ============================================================================
// Game Board State
// ============================================================================

/** Game board configuration state */
export interface GameBoardState extends FormState {
  height?: number;
  width?: number;
  terrain?: string;
  water?: string;
  mapType?: string;
  mapName?: string;
}

/** Game board state manager */
export interface GameBoardStateManager extends FormStateManager {
  /**
   * Get board dimensions
   */
  getDimensions(): { height: number; width: number };

  /**
   * Set board dimensions
   */
  setDimensions(height: number, width: number): void;

  /**
   * Get terrain setting
   */
  getTerrain(): string | undefined;

  /**
   * Set terrain
   */
  setTerrain(terrain: string): void;

  /**
   * Get water setting
   */
  getWater(): string | undefined;

  /**
   * Set water
   */
  setWater(water: string): void;

  /**
   * Reset board state to defaults
   */
  resetBoard(): void;
}

// ============================================================================
// Form Validation
// ============================================================================

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: StringMap<string>;
  warnings?: StringMap<string>;
}

/** Validation schema for form fields */
export interface ValidationSchema {
  [field: string]: {
    required?: boolean;
    validate?: ValidatorFn;
    message?: string;
  };
}

/** Field validation error */
export interface FieldError {
  field: string;
  message: string;
  value?: any;
}

// ============================================================================
// Form Options & Configuration
// ============================================================================

/** Form state manager options */
export interface FormStateManagerOptions {
  readonly initialState?: FormState;
  readonly validators?: StringMap<ValidatorFn>;
  readonly changeHandlers?: StringMap<ChangeHandlerFn>;
}

/** Game board state manager options */
export interface GameBoardStateManagerOptions extends FormStateManagerOptions {
  readonly initialState?: GameBoardState;
}

// ============================================================================
// Parameter Management
// ============================================================================

/** URL search parameters wrapper */
export interface ParameterManager {
  /**
   * Get size parameters from URL
   */
  getSize(): { height?: number; width?: number };

  /**
   * Get map name parameter
   */
  getMapName(): string | undefined;

  /**
   * Get edit map name
   */
  getEditMap(): string | undefined;

  /**
   * Get map type parameter
   */
  getMapType(): string | undefined;

  /**
   * Get terrain parameter
   */
  getTerrain(): string | undefined;

  /**
   * Check if in edit mode
   */
  isEditMode(): boolean;

  /**
   * Set size parameters
   */
  setSize(height: number, width: number): void;

  /**
   * Set map name
   */
  setMapName(mapName: string): void;

  /**
   * Set terrain
   */
  setTerrain(terrain: string): void;

  /**
   * Set map type
   */
  setMapType(mapType: string): void;

  /**
   * Clear map parameters
   */
  clearMapParams(): void;

  /**
   * Update all parameters at once
   */
  setAll(params: StringMap<string | number | boolean>): void;

  /**
   * Delete multiple parameters
   */
  deleteAll(keys: string[]): void;

  /**
   * Update browser history
   */
  updateHistoryState(pageTitle?: string): void;
}

// ============================================================================
// Form Submission
// ============================================================================

/** Form submit handler */
export type FormSubmitHandler = (formData: FormState) => void | Promise<void>;

/** Form submit result */
export interface FormSubmitResult {
  success: boolean;
  errors?: FieldError[];
  message?: string;
}
