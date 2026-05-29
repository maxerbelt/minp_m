/**
 * Callback and function type definitions
 * Used throughout navbar components for event handling and UI interactions
 */

// ============================================================================
// Generic Callbacks
// ============================================================================

/** Zero-argument void callback */
export type VoidCallback = () => void;

/** Callback with optional return value handling */
export type OptionalCallback<T = void> = (() => T | void) | null | undefined;

/** Async callback for deferred operations */
export type AsyncCallback = () => Promise<void>;

/** Error handler callback */
export type ErrorCallback = (error: Error) => void;

/** Safe error handler that won't throw */
export type SafeErrorCallback = (error: Error) => void | Promise<void>;

// ============================================================================
// UI Component Callbacks
// ============================================================================

/** Select dropdown change handler */
export type ChooseUIChangeCallback = (value: string | number, text: string | number) => void;

/** Numeric value change handler */
export type NumericChangeCallback = (value: number) => void;

/** String value change handler */
export type StringChangeCallback = (value: string) => void;

/** Generic value change handler */
export type ValueChangeCallback<T = any> = (value: T) => void;

/** Map selection callback */
export type MapSelectCallback = (map: any) => void;

// ============================================================================
// Component Loader Callbacks
// ============================================================================

/** Callback invoked when component loads successfully */
export type ComponentLoaderSuccessCallback = (html: string) => void | Promise<void>;

/** Callback invoked when component load fails */
export type ComponentLoaderErrorCallback = (error: Error) => void | Promise<void>;

// ============================================================================
// Keyboard & Event Callbacks
// ============================================================================

/** Keyboard event handler */
export type ShortcutHandler = (event: KeyboardEvent) => void;

/** Generic DOM event listener */
export type EventListener = (event: Event) => void;

/** Click event handler */
export type ClickHandler = (event?: MouseEvent) => void;

/** Change event handler */
export type ChangeHandler = (event: Event) => void;

// ============================================================================
// Form & Validation Callbacks
// ============================================================================

/** Form field validator - transforms and validates value */
export type ValidatorFn = (value: any) => any;

/** Form change handler - called after successful validation */
export type ChangeHandlerFn = (value: any) => void;

/** Form validator by field name */
export type FieldValidator = (field: string, value: any) => any;

// ============================================================================
// Setup & Initialization Callbacks
// ============================================================================

/** Generic setup function */
export type SetupCallback = () => void;

/** Board setup callback */
export type BoardSetupCallback = () => void;

/** UI refresh callback */
export type RefreshCallback = () => void;

/** Edit mode handler - called when editing existing item */
export type EditHandlerCallback<T = any> = (item: T) => void;

/** Setup function with error handling */
export type ErrorableSetupCallback = () => void | Promise<void>;

// ============================================================================
// Navigation & Mode Callbacks
// ============================================================================

/** Game mode switch handler */
export type ModeChangeCallback = (mode: string) => void;

/** Navigation callback with optional data */
export type NavigationCallback = (data?: any) => void;

// ============================================================================
// State & Data Callbacks
// ============================================================================

/** State initialization function */
export type StateInitializer<T = any> = () => T;

/** State change listener */
export type StateChangeListener<T = any> = (newState: T, oldState: T) => void;

/** Data selector function */
export type DataSelector<T = any, R = any> = (data: T) => R;

/** Data transformer function */
export type DataTransformer<T = any, R = any> = (data: T) => R;

// ============================================================================
// Lifecycle Callbacks
// ============================================================================

/** Callback executed before operation */
export type BeforeCallback<T = any> = (data?: T) => void;

/** Callback executed after operation */
export type AfterCallback<T = any> = (data?: T) => void;

/** Cleanup/disposal callback */
export type CleanupCallback = () => void;

// ============================================================================
// Map & Collection Callbacks
// ============================================================================

/** Iterator callback for collections */
export type IteratorCallback<T = any> = (item: T, index: number) => void;

/** Accumulator callback for reduce operations */
export type AccumulatorCallback<T = any, R = any> = (
  accumulator: R,
  item: T,
  index: number
) => R;

/** Predicate for filtering */
export type FilterPredicate<T = any> = (item: T) => boolean;

/** Mapper for transforming items */
export type MapperFn<T = any, R = any> = (item: T) => R;
