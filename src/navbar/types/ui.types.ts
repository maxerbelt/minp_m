/**
 * UI component type definitions
 * Tab management, form controls, and component interfaces
 */

import type { EventListener as DOMEventListener } from './callbacks.types.js';
import type { StringMap } from './shared.types.js';

// ============================================================================
// Tab Management
// ============================================================================

/** Configuration for tab initialization */
export interface TabConfig {
  /** Tab names to mark as current/active */
  readonly current?: readonly string[];

  /** Map of tab names to event handler functions */
  readonly handlers?: StringMap<DOMEventListener>;
}

/** Single tab instance */
export interface TabInstance {
  /** Tab name identifier */
  readonly name: string;

  /** DOM element for this tab or null if not found */
  readonly element: HTMLElement | null;

  /** Set of registered event handlers */
  readonly handlers: Set<DOMEventListener>;

  /** Add click listener while tracking for cleanup */
  addClickListener(handler: DOMEventListener): void;

  /** Replace all listeners with a new one */
  overrideClickListener(handler: DOMEventListener): void;

  /** Mark this tab as current/active */
  markAsCurrent(): void;

  /** Clean up and remove all listeners */
  cleanup(): void;
}

/** Tab manager interface */
export interface TabManagerInstance {
  /** Map of tab names to Tab instances */
  readonly tabs: StringMap<TabInstance>;

  /** Current active hunt mode or null */
  readonly currentMode: string | null;

  /** Initialize tabs from names */
  initializeTabs(tabNames: readonly string[]): void;

  /** Get tab instance by name */
  getTab(name: string): TabInstance | undefined;

  /** Set current hunt mode */
  setCurrentMode(huntMode: string): void;

  /** Get current hunt mode */
  getCurrentMode(): string | null;

  /** Check if mode matches current mode */
  isMode(mode: string): boolean;

  /** Configure tab behavior for mode */
  configureForMode(mode: string, config: TabConfig): void;

  /** Add event listener to tab */
  addListener(tabName: string, handler: DOMEventListener): void;

  /** Replace event listener on tab */
  replaceListener(tabName: string, handler: DOMEventListener): void;

  /** Clean up all tabs */
  cleanup(): void;
}

// ============================================================================
// UI Control Interfaces
// ============================================================================

/** Generic UI control */
export interface UIControl {
  setup(callback: Function, selectedValue?: any, selectedText?: any): void;
  [key: string]: any;
}

/** Select element UI control */
export interface SelectUIControl extends UIControl {
  selectElement?: HTMLSelectElement;
  choose?: HTMLSelectElement;
  clearOptions(): void;
  hasOptions(): boolean;
  numOptions(): number;
  addOption(id: string | number, label: string | number, selectedValue?: any, selectedText?: any): void;
}

/** Number picker control */
export interface NumberUIControl extends UIControl {
  min: number;
  max: number;
  step: number;
}

// ============================================================================
// Strategy & Setup Patterns
// ============================================================================

/** Strategy options for UI setup */
export interface StrategyOptions {
  /** Default state values by key */
  readonly stateDefaults?: StringMap<any>;

  /** Validation functions by key */
  readonly validators?: StringMap<Function>;
}

/** Options for size control strategy */
export interface SizeControlOptions extends StrategyOptions {
  /** Callback when size changes */
  onSizeChange?: () => void;

  /** Callback to setup board */
  onBoardSetup?: () => void;

  /** Callback to refresh display */
  onRefresh?: () => void;
}

// ============================================================================
// Form & Input Controls
// ============================================================================

/** HTML select element type */
export type SelectElement = HTMLSelectElement;

/** HTML option element type */
export type OptionElement = HTMLOptionElement;

/** HTML input element type */
export type InputElement = HTMLInputElement;

/** Input element reference or ID string */
export type InputReference = InputElement | string;

// ============================================================================
// Component Caching
// ============================================================================

/** Cache statistics for component loader */
export interface ComponentLoaderCacheStats {
  /** Number of components currently cached */
  readonly cachedComponents: number;

  /** Number of in-flight fetch operations */
  readonly loading: number;
}

// ============================================================================
// Dialog & Modal Types
// ============================================================================

/** Dialog/modal configuration */
export interface DialogOptions {
  title?: string;
  message: string;
  buttons?: readonly string[];
  defaultButton?: number;
  cancelButton?: number;
}

/** Dialog result */
export interface DialogResult {
  clicked: number;
  cancelled: boolean;
}

// ============================================================================
// Theme & Appearance
// ============================================================================

/** Theme configuration */
export interface ThemeConfig {
  name: string;
  colors?: StringMap<string>;
  cssClass?: string;
}

/** Visibility state */
export interface VisibilityState {
  hidden: boolean;
  visible: boolean;
  toggle(): void;
}
