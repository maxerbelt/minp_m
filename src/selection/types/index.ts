/**
 * Barrel export for all selection system types.
 * Central location for importing all type definitions from the selection folder.
 *
 * Usage:
 * ```
 * import type {
 *   Ship,
 *   Board,
 *   Variants,
 *   ViewModel,
 *   MarkCallback,
 *   PlacementData,
 *   CursorPosition,
 * } from './types';
 * ```
 */

export type * from './domain.types';
export type * from './ui.types';
export type * from './events.types';
export type * from './placement.types';
export type * from './brush.types';
export type * from './cursor.types';
