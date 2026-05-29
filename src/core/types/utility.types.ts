/**
 * Utility function types for array operations, random selection, and string formatting.
 */

import type { Coordinate } from './common.types.js';

/**
 * Generic random selection from array.
 * @template T Array element type
 */
export interface RandomSelector<T> {
  /** Element or undefined if array is empty */
  element: T | undefined;
  /** Random index selected */
  index: number;
}

/**
 * Sorted and filtered coordinate list.
 * Result of distance-based sorting operations.
 */
export interface SortedCoordinates {
  /** Sorted coordinates list */
  coords: Coordinate[];
  /** Whether list is sorted by distance */
  sorted: boolean;
  /** Reference point used for sorting */
  reference?: Coordinate;
}

/**
 * Distance calculation result.
 */
export interface DistanceInfo {
  /** Euclidean distance from reference point */
  distance: number;
  /** Coordinates of the point */
  coords: Coordinate;
  /** Squared distance (for sorting without sqrt) */
  squared: number;
}

/**
 * Shuffle operation result.
 */
export interface ShuffleResult<T> {
  /** Shuffled array (same reference as input) */
  array: T[];
  /** Number of shuffles performed */
  swaps: number;
}

/**
 * CSV parsing configuration.
 */
export interface CSVParseOptions {
  /** Character to use as delimiter (default: ',') */
  delimiter?: string;
  /** Whether first row is headers */
  hasHeaders?: boolean;
  /** Whether to trim whitespace from values */
  trim?: boolean;
  /** Whether to parse numbers and booleans */
  parseValues?: boolean;
}

/**
 * CSV row representation.
 */
export type CSVRow = Record<string, string | number | boolean>;

/**
 * CSV data with headers and rows.
 */
export interface CSVData {
  /** Column headers */
  headers: string[];
  /** Data rows */
  rows: CSVRow[];
  /** Number of rows parsed */
  rowCount: number;
}

/**
 * Lazy property getter function.
 * @template T The property value type
 */
export type LazyProperty<T> = () => T;

/**
 * Lazy property cache entry.
 */
export interface LazyPropertyEntry<T> {
  /** Cached value */
  value: T;
  /** Whether value has been computed */
  computed: boolean;
  /** Getter function for the property */
  getter: LazyProperty<T>;
}

/**
 * Key-coordinate pair for grid lookups.
 */
export interface KeyCoordPair {
  /** Unique key identifier */
  key: string | number;
  /** Associated coordinates */
  coords: Coordinate;
}

/**
 * Coordinate range/bounds.
 */
export interface CoordinateRange {
  /** Start coordinate */
  start: Coordinate;
  /** End coordinate */
  end: Coordinate;
  /** Step/increment */
  step?: Coordinate;
}

/**
 * String case conversion type.
 */
export type StringCase =
  | 'lower'
  | 'upper'
  | 'title'
  | 'camel'
  | 'snake'
  | 'kebab'
  | 'pascal';

/**
 * Text alignment option.
 */
export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

/**
 * Padding configuration.
 */
export interface Padding {
  /** Top padding */
  top?: number;
  /** Right padding */
  right?: number;
  /** Bottom padding */
  bottom?: number;
  /** Left padding */
  left?: number;
}
