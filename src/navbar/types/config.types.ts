/**
 * Configuration and strategy option types
 * Used for initializing components and strategies
 */

import type {
  StringMap,
  ValueMap
} from './shared.types.js';
import type { VoidCallback, BeforeCallback, AfterCallback, ValueChangeCallback } from './callbacks.types.js';
import type { MapObject } from './domain.types.js';

// ============================================================================
// Navigation & Mode Configuration
// ============================================================================

/** Navigation mode configuration */
export interface NavigationModeConfig {
  /** Target page identifier */
  page: string;

  /** Analytics label for tracking */
  trackLabel: string;
}

/** Mode handler configuration */
export interface ModeConfig {
  /** Current tabs for this mode */
  current: readonly string[];

  /** Handler functions for this mode */
  handlers: StringMap<VoidCallback>;
}

/** Game modes */
export const GAME_MODES = {
  SEEK: 'seek',
  HIDE: 'hide',
  BUILD: 'build',
  LIST: 'list',
  RULES: 'rules',
  PRINT: 'print'
} as const;

export type GameMode = typeof GAME_MODES[keyof typeof GAME_MODES];

// ============================================================================
// Map Provider Configuration
// ============================================================================

/** Map provider options */
export interface MapProviderOptions {
  readonly maps?: MapObject[];
  readonly mapLists?: StringMap<MapObject[]>;
  readonly mapProvider?: any;
  readonly onMapLoad?: (map: MapObject) => void;
}

/** Map selection strategy options */
export interface MapSelectionOptions extends MapProviderOptions {
  readonly editable?: boolean;
  readonly searchable?: boolean;
  readonly defaultValue?: string;
}

// ============================================================================
// Value Strategy Configuration
// ============================================================================

/** Value validator for strategies */
export type ValueValidator = (value: any) => boolean;

/** Map value strategy options */
export interface MapValueStrategyOptions {
  readonly valueMap?: ValueMap;
  readonly defaultValue?: any;
  readonly onValueChange?: ValueChangeCallback;
  readonly validator?: ValueValidator | null;
}

/** Terrain strategy options */
export interface TerrainStrategyOptions extends MapValueStrategyOptions {
  readonly terrainTypes?: string[];
}

/** Water strategy options */
export interface WaterStrategyOptions extends MapValueStrategyOptions {
  readonly waterTypes?: string[];
}

/** Map edit strategy options */
export interface MapEditStrategyOptions {
  readonly maps?: MapObject[];
  readonly onMapSelect?: (map: MapObject) => void;
}

// ============================================================================
// Page Refresh Configuration
// ============================================================================

/** Page refresh strategy options */
export interface RefreshStrategyOptions {
  readonly beforeRefresh?: BeforeCallback;
  readonly afterRefresh?: AfterCallback;
}

/** State refresh strategy options */
export interface StateRefreshOptions extends RefreshStrategyOptions {
  readonly boardSetup?: VoidCallback;
  readonly clearStarfield?: VoidCallback;
}

/** Navigation state manager options */
export interface NavStateManagerOptions {
  readonly paramManager?: any;
  readonly refreshStrategy?: any;
  readonly navigationService?: any;
}

// ============================================================================
// UI Setup Configuration
// ============================================================================

/** UI setup strategy options */
export interface UISetupStrategyOptions {
  readonly stateDefaults?: StringMap<any>;
  readonly validators?: StringMap<Validator>;
}

/** Size control strategy options */
export interface SizeControlStrategyOptions extends UISetupStrategyOptions {
  readonly onSizeChange?: VoidCallback;
  readonly onBoardSetup?: VoidCallback;
  readonly onRefresh?: VoidCallback;
}

/** Dimension setup configuration */
export interface DimensionSetupConfig {
  readonly boardSetup?: VoidCallback;
  readonly refresh?: VoidCallback;
  readonly huntMode?: string;
  readonly paramManager?: any;
  readonly maps?: any;
  readonly mapWidth?: number;
  readonly mapHeight?: number;
}

// ============================================================================
// Component Loader Configuration
// ============================================================================

/** Component loader options */
export interface ComponentLoaderOptions {
  readonly cacheEnabled?: boolean;
  readonly maxCacheSize?: number;
  readonly timeout?: number;
  readonly retries?: number;
}

/** Component cache settings */
export interface ComponentCacheSettings {
  readonly enabled: boolean;
  readonly maxSize: number;
  readonly ttl?: number; // Time to live in ms
}

// ============================================================================
// Keyboard Shortcut Configuration
// ============================================================================

/** Keyboard shortcut definition */
export interface KeyboardShortcut {
  key: string | string[];
  handler: (event: KeyboardEvent) => void;
  description?: string;
}

/** Keyboard shortcut map */
export type ShortcutMap = StringMap<(event: KeyboardEvent) => void>;

/** Keyboard shortcut manager options */
export interface KeyboardShortcutManagerOptions {
  readonly shortcuts?: ShortcutMap;
  readonly autoActivate?: boolean;
}

// ============================================================================
// Dialog & Modal Configuration
// ============================================================================

/** Dialog configuration */
export interface DialogConfig {
  title?: string;
  message: string;
  buttons?: readonly string[];
  defaultButton?: number;
  cancelButton?: number;
  icon?: string;
  type?: 'info' | 'warning' | 'error' | 'success' | 'question';
}

/** Dialog button definition */
export interface DialogButton {
  label: string;
  onClick: VoidCallback;
  primary?: boolean;
  cancel?: boolean;
}

// ============================================================================
// Theme Configuration
// ============================================================================

/** Theme configuration */
export interface ThemeConfig {
  name: string;
  label: string;
  cssClass?: string;
  colors?: StringMap<string>;
  fonts?: StringMap<string>;
}

/** Theme manager options */
export interface ThemeManagerOptions {
  themes: ThemeConfig[];
  default?: string;
  storage?: 'localStorage' | 'sessionStorage' | 'memory';
}

// ============================================================================
// Analytics Configuration
// ============================================================================

/** Analytics tracking configuration */
export interface AnalyticsConfig {
  trackingId: string;
  debug?: boolean;
  sampleRate?: number;
}

/** Analytics event configuration */
export interface AnalyticsEventConfig {
  eventName: string;
  category?: string;
  label?: string;
  value?: number;
  [key: string]: any;
}

// ============================================================================
// Feature Flags
// ============================================================================

/** Feature flag configuration */
export interface FeatureFlagConfig {
  [feature: string]: boolean;
}

/** Feature flag manager options */
export interface FeatureFlagManagerOptions {
  flags: FeatureFlagConfig;
  allowOverride?: boolean;
}
