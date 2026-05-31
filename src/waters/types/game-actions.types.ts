/**
 * @module waters/types/game-actions
 * Player action types and event payloads.
 *
 * Defines types for:
 * - Weapon launch results and status
 * - Cursor state and weapon mode indication
 * - Weapon rack parameters
 * - UI action parameters
 */

import type { Weapon, WeaponSystem, WeaponRack } from './domain.types'

/**
 * Result of launching/firing a weapon.
 * Returned after weapon selection and targeting to indicate firing status.
 */
export interface WeaponLaunchResult {
  /** Whether a targeted (non-single-shot) weapon was used */
  hasTargettedWeapon?: boolean

  /** Whether unattached weapon needs additional target selection */
  hasUnattached?: boolean

  /** The weapon object that was fired */
  weapon?: Weapon

  /** Score/result from the launch */
  score?: any
}

/**
 * Cursor state and weapon mode information.
 * Provides visual and functional feedback for weapon selection state.
 */
export interface CursorInfo {
  /** Weapon system being aimed/selected */
  wps?: WeaponSystem

  /** Cursor index for mode indicator display */
  idx?: number

  /** CSS class name for cursor display */
  cursor?: string
}

/**
 * Parameters for equipped weapon rack on a ship.
 * Represents a weapon attachment point with full configuration.
 */
export interface EquippedRack {
  /** The weapon rack object */
  rack: WeaponRack

  /** The weapon object */
  weapon: Weapon

  /** Single-letter weapon identifier */
  wletter: string

  /** Unique identifier for this weapon */
  weaponId: number

  /** Row coordinate of the weapon source/rack */
  r: number

  /** Column coordinate of the weapon source/rack */
  c: number

  /** DOM element of the source cell */
  cell: HTMLElement

  /** Row coordinate of weapon shadow/hint */
  shadowR: number

  /** Column coordinate of weapon shadow/hint */
  shadowC: number
}

/**
 * Parameters for adding a new weapon rack to the board.
 * Contains all information needed to display and activate a weapon position.
 */
export interface AddRackParams {
  /** The weapon rack object */
  rack: WeaponRack

  /** The weapon object */
  weapon: Weapon

  /** Single-letter weapon identifier */
  wletter: string

  /** Unique weapon ID */
  weaponId: number

  /** Row coordinate of weapon source */
  r: number

  /** Column coordinate of weapon source */
  c: number

  /** DOM element of the source cell */
  cell: HTMLElement

  /** Row coordinate of hint/preview location */
  hintR: number

  /** Column coordinate of hint/preview location */
  hintC: number
}

/**
 * Parameters for weapon activation on the board.
 * Used when making a weapon active/visible during targeting.
 */
export interface ActivateParams extends AddRackParams {
  // Inherits all properties from AddRackParams
}

/**
 * Information about firing action context.
 * Combines weapon system, coordinates, and firing methods.
 */
export interface FiringInfo {
  /** Target coordinates [r, c] pair (null if still selecting) */
  fireCoordinates?: Array<[number, number]> | null

  /** Method to fire the weapon */
  fireWeapon?: (context: any) => Promise<any>

  /** Weapon system being fired */
  wps?: WeaponSystem

  /** Weapon object being fired */
  weapon?: Weapon

  /** Whether unattached weapon is involved */
  hasUnattached?: boolean
}

/**
 * Information about firing weapon from a specific context.
 * Used during weapon activation and targeting steps.
 */
export interface FireWeaponInfoContext {
  /** Weapon system with ammo state */
  weaponSystem: WeaponSystem

  /** Current cursor information */
  cursorInfo: CursorInfo

  /** Whether in single-shot mode */
  isSingleShot: boolean

  /** Board UI reference */
  board: any
}

/**
 * Information about single-shot weapon mode.
 * Represents limited-range or restricted targeting mode.
 */
export interface SingleShotInfo {
  /** Number of remaining shots */
  remaining: number

  /** Maximum shots available */
  maximum: number

  /** Display label for UI */
  label: string
}

/**
 * Weapon system with ammo management.
 * Represents a complete weapon configuration on a player's board.
 */
export interface WeaponSystemWithAmmo {
  /** The weapon object */
  weapon: Weapon

  /** Current ammo count */
  ammo: number

  /** Returns remaining ammo capacity */
  ammoCapacity?: number

  /** Returns ammo already used */
  ammoRemaining?:   number;
  /** Checks if ammo remains */
  hasAmmoRemaining?: boolean

  /** ID for tracking */
  id?: string | number
}

/**
 * Validation result for weapon button creation.
 * Indicates success/failure and provides button details if valid.
 */
export interface WeaponButtonValidation {
  /** Whether validation passed */
  isValid: boolean

  /** Parent element if valid */
  parent?: ParentNode

  /** Clone class name for button styling */
  cloneClass?: string

  /** Weapon system entries for button iteration */
  weaponEntries?: Array<[string, any]>
}

/**
 * Callback for weapon button click events.
 * Called when player clicks a weapon button during selection.
 */
export type WeaponButtonCallback = (letter: string) => void
