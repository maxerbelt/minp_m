/**
 * @module waters/types/callbacks
 * Callback function signatures for game events and operations.
 *
 * Defines contract types for:
 * - Event handlers (weapon, turn, aim, select)
 * - Query operations (cell state, weapon info)
 * - Board operations (cell marking, visualization)
 */

import type { Weapon, WeaponSystem, Rack, Ship, Board } from './domain.types'
import type { Location, ShadowCoords } from './coordinates.types'
import type { WeaponLaunchResult, CursorInfo } from './game-actions.types'

/**
 * Callback for weapon change/switch events.
 * Fired when player switches to a different weapon.
 */
export type WeaponChangeCallback = (wletter: string) => void

/**
 * Callback for weapon activation on the board.
 * Fired when weapon is made active for targeting.
 */
export type WeaponActivationCallback = (
  rack: Rack,
  weapon: Weapon,
  wletter: string,
  weaponId: number,
  r: number,
  c: number,
  cell: HTMLElement,
  shadowR: number,
  shadowC: number
) => void

/**
 * Callback for weapon deactivation.
 * Fired when weapon targeting is cancelled or cleared.
 */
export type WeaponDeactivationCallback = (
  r: number,
  c: number,
  shadowR: number,
  shadowC: number
) => void

/**
 * Callback for hint/preview display.
 * Fired when weapon hint should be shown at coordinates.
 */
export type HintCallback = (r: number, c: number) => void

/**
 * Callback for turn start/end events.
 * Used for turn management and step progression.
 */
export type TurnCallback = (stepsInstance: any) => void

/**
 * Callback for aiming/targeting events.
 * Fired during weapon aiming phase.
 */
export type AimCallback = (stepsInstance: any, hasAttached: boolean) => void

/**
 * Callback for beginning a turn.
 * Fired at the start of a player's turn.
 */
export type BeginTurnCallback = () => void

/**
 * Callback for finishing turn/weapon firing.
 * Returns result of weapon launch or null if cancelled.
 */
export type FinishCallback = () => Promise<WeaponLaunchResult | null>

/**
 * Strategy function for autonomous seeking behavior.
 * Called during AI seeking to determine next target.
 */
export type FinishStrategy = () => Promise<WeaponLaunchResult | null>

/**
 * Callback handler for mask-based targeting conditions.
 * Used for complex weapon effect area calculations.
 */
export type MaskConditionHandler = (mask: any) => Promise<WeaponLaunchResult | null>

/**
 * Callback for getting weapon slot at coordinates.
 * Used to check if weapon exists at a ship cell position.
 */
export type RackAtCallback = (column: number, row: number) => any

/**
 * Callback for getting cell rotation/turn state.
 * Returns rotation class or null if no rotation.
 */
export type GetTurnCallback = (row: number, column: number) => string | null | undefined

/**
 * Callback for generating key identifiers.
 * Used for weapon effect cell identification.
 */
export type MakeKeyIdsCallback = () => string | string[]

/**
 * Callback for getting primary weapon.
 * Returns the main weapon of a ship/system.
 */
export type GetPrimaryWeaponCallback = () => Weapon | null | undefined

/**
 * Callback for displacement calculation.
 * Returns displacement for a specific terrain/subterrain.
 */
export type DisplacementForCallback = (subterrain: any) => number

/**
 * Callback for getting ship shape.
 * Returns shape configuration for displacement/placement calculations.
 */
export type ShapeCallback = () => any

/**
 * Callback for checking in-bounds condition.
 * Returns true if coordinates are within playable area.
 */
export type InBoundsCallback = (r: number, c: number) => boolean

/**
 * Callback for cell click events during gameplay.
 * Fired when player clicks on a board cell.
 */
export type CellClickCallback = (
  board: Board,
  r: number,
  c: number,
  cell: HTMLElement
) => void

/**
 * Callback for UI element visibility/classification.
 * Used for dynamic UI element selection and styling.
 */
export type ElementClassifyCallback = (element: HTMLElement) => boolean

/**
 * Callback for DOM element iteration.
 * Applies operation to each element in a collection.
 */
export type ElementIteratorCallback = (element: HTMLElement, index: number) => void

/**
 * Callback for zone recalculation.
 * Fired when zone sizes need to be recomputed.
 */
export type ZoneRecalcCallback = (map?: any) => void

/**
 * Callback for tray item adaptation/transformation.
 * Converts/adapts tray items for display.
 */
export type TrayItemAdapterCallback = (item: any) => any

/**
 * Callback for drag-and-drop operations.
 * Handles dragging of UI elements like ships and weapons.
 */
export type DragCallback = (source: HTMLElement, target: HTMLElement) => void

/**
 * Callback for validation of game state.
 * Returns true if state is valid for operation.
 */
export type ValidatorCallback = () => boolean

/**
 * Callback for UI update/refresh.
 * Refreshes display after state change.
 */
export type RefreshCallback = () => void

/**
 * Callback with optional error information.
 * Generic callback that may include error data.
 */
export type ErrorCallback = (error?: Error) => void

/**
 * Callback for board cell operations.
 * Generic callback for cell-based operations.
 */
export type CellOperationCallback = (r: number, c: number) => void
