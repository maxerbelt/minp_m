/**
 * Domain types representing core game entities and concepts
 * Maps, coordinates, game states, and related structures
 */

import type { Nullable } from './shared.types.js';

// ============================================================================
// Coordinate System
// ============================================================================

/** 2D coordinate in the game grid */
export interface Coordinate {
  row: number;
  col: number;
}

/** 3D coordinate with power/damage level */
export type SplashCell = readonly [row: number, col: number, powerLevel: number];

// ============================================================================
// Map Objects & Structure
// ============================================================================

/** Map metadata and configuration */
export interface MapObject {
  /** Unique map identifier */
  name?: string;

  /** Display title for UI */
  title?: string;

  /** Human-readable label */
  displayName?: string;

  /** Whether this map can be edited */
  editable?: boolean;

  /** Map height in rows */
  rows?: number;

  /** Map width in columns */
  cols?: number;

  /** Terrain type identifier */
  terrain?: string;

  /** Water/sea type identifier */
  water?: string;

  /** Map type or category */
  mapType?: string;

  /** Custom data stored with map */
  [key: string]: any;
}

/** Size parameters for a map */
export interface SizeParams {
  readonly height: number;
  readonly width: number;
}

/** Dimension measurements */
export interface DimensionValues {
  mapWidth: number;
  mapHeight: number;
}

// ============================================================================
// Map Selection & Resolution
// ============================================================================

/** Result of resolving a map from parameters */
export interface MapSelectionResult {
  /** Resolved map name or undefined */
  mapName?: string;

  /** Map object when found, null otherwise */
  targetMap: MapObject | null;
}

/** Context for map editing operations */
export interface MapContext {
  /** The map being edited, if any */
  targetMap: MapObject | null;

  /** Template map for defaults */
  templateMap: MapObject | null;
}

// ============================================================================
// Board & Game State
// ============================================================================

/** Board bounds validation and splash calculation interface */
export interface BoardMap {
  /** Validate if coordinates are within bounds */
  inBounds(row: number, col: number): boolean;

  /** Calculate splash area of effect cells */
  splashAoe(map: BoardMap, targetCoordinates: number[][]): SplashCell[];
}

/** Weapon system data */
export interface Weapon {
  /** Number of cells required to fire */
  points: number;

  /** Calculate affected cells for splash damage */
  splashAoe(map: BoardMap, targetCoordinates: number[][]): SplashCell[];
}

/** Weapon system container */
export interface WeaponSystem {
  weapon: Weapon;
}

/** Ship game state */
export interface Ship {
  [key: string]: any;
}

// ============================================================================
// Maps Provider Interface
// ============================================================================

/** Maps manager interface */
export interface MapsInstance {
  getEditableMap(name?: string): MapObject | null;
  getMap(name?: string): MapObject | null;
  getCustomMap(name?: string): MapObject | null;
  getLastMap(): MapObject | null;
  getLastWidth(defaultWidth?: number): number;
  getLastHeight(defaultHeight?: number): number;
  setTo(name?: string): void;
  setToBlank(): void;
  storeLastWidth(width: number): void;
  storeLastHeight(height: number): void;
  storeLastMap(): void;
  mapTitles(): string[];
  onChange(callback: (map?: MapObject) => void): void;
}

// ============================================================================
// Map Provider Abstractions
// ============================================================================

/** Abstract interface for accessing map and terrain data */
export interface MapProvider {
  getCurrentMap(): MapObject | null;
  getMaps(): MapsInstance;
  getTerrain(): any;
}

/** Map selection callback */
export type MapSelectCallback = (map: MapObject) => void;

/** Handler for map import completion */
export type MapImportHandler = (map: MapObject) => void;
