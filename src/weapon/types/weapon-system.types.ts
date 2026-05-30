/**
 * Weapon system and aggregation types
 * Type definitions for weapon system hierarchies
 */

import type { IWeapon } from './weapon.types'
import type { AoePattern } from './aoe.types'
import type { MapLike } from './map.types'
import type { Coord } from './coordinates.types'

/**
 * Weapon system interface
 * Contract for weapon system aggregation
 */
export interface IWeaponSystem {
  readonly id: number
  readonly weapon: IWeapon
  ammo: number | null
  hit: boolean
  damaged: boolean

  // State management
  reset(): void
  hasAmmo(): boolean
  hasAmmoRemaining(): boolean
  useAmmo(): void

  // Ammunition tracking
  ammoRemaining(): number | null
  ammoCapacity(): number
  ammoAttached(): number
  ammoUsed(): number

  // Weapon queries
  getLeafWeapons(): IWeaponSystem[]
  getLoadedWeapons(): IWeaponSystem[]
  getLoadedWeapon(): IWeaponSystem | null
  getWeaponBySystemId(systemId: number): IWeaponSystem | null
  getUnattachedWeapon(): IWeaponSystem | null

  // Ship queries
  armedShips(): any[]
  getShipById(shipId: number): any | null

  // Racks
  getRack(): any | null
  getRacks(): any[]

  // Effects
  splash(map: MapLike, target: Coord, effect: AoePattern, options?: any): AoePattern
}

/**
 * Combined weapon system type
 * Represents aggregation of multiple weapon subsystems
 */
export type CombinedSystemState = {
  readonly subsystems: IWeaponSystem[]
  readonly weapon: IWeapon
}

/**
 * Attached weapon system type
 * Represents weapons attached to ships
 */
export type AttachedSystemState = {
  readonly ships: any[]
  readonly weapon: IWeapon
}

/**
 * Weapon system factory options
 * Parameters for building weapon system hierarchies
 */
export type WeaponSystemBuildOptions = {
  readonly systems?: IWeaponSystem[]
  readonly ship?: any
  readonly combine?: boolean
}

/**
 * Weapon system query result
 * Result of weapon system search operations
 */
export type WeaponSystemQueryResult = {
  readonly system: IWeaponSystem | null
  readonly found: boolean
  readonly parentId?: number
}

/**
 * Ammunition state snapshot
 * Persistent state for ammunition tracking
 */
export type AmmoSnapshot = {
  readonly systemId: number
  readonly currentAmmo: number | null
  readonly capacity: number
  readonly attached: number
}

/**
 * Weapon system hierarchy info
 * Metadata about system structure
 */
export type SystemHierarchyInfo = {
  readonly rootId: number
  readonly leafCount: number
  readonly depth: number
  readonly type: 'simple' | 'combined' | 'attached'
}

/**
 * Aggregation state
 * Consolidated ammunition and weapon state
 */
export type AggregationState = {
  readonly totalAmmo: number | null
  readonly totalCapacity: number
  readonly totalAttached: number
  readonly weaponCount: number
  readonly loadedCount: number
}
