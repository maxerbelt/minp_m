/**
 * Weapon interface and type definitions
 * Core abstractions for all weapon types
 */

import type { Coord, CoordPair, PixelCoord } from './coordinates.types'
import type { AoePattern, AoeCell } from './aoe.types'
import type { MapLike, TerrainType } from './map.types'
import type { AnimationOptions, ExplodeOptions, AnimationResult, AnimatorContext } from './animation.types'
import type { LaunchContext } from './launcher.types'

/**
 * Core weapon interface
 * Abstract contract all weapons must fulfill
 */
export interface IWeapon {
  readonly name: string
  readonly letter: string
  readonly isLimited: boolean
  readonly destroys: boolean
  readonly points: number

  // Animation properties
  readonly hasFlash: boolean
  readonly animateOnTarget: boolean
  readonly explodeOnTarget: boolean
  readonly explodeOnSplash: boolean
  readonly splashSize: number

  // Gameplay properties
  readonly tag?: string
  readonly plural?: string
  readonly classname?: string
  readonly tip?: string
  readonly ammo?: number
  readonly isOneAndDone?: boolean

  // Methods
  aoe(map: MapLike | null, coords: readonly Coord[]): AoePattern
  splashAoe(map: MapLike | null, coords: readonly Coord[]): AoePattern
  splash(map: MapLike | null, target: Coord, effect: AoePattern, options?: any): AoePattern
  clone(ammo?: number): IWeapon
}

/**
 * Weapon extended interface
 * Includes animation and launch capabilities
 */
export interface IWeaponAnimatable extends IWeapon {
  animateFlying(
    source: HTMLElement,
    target: HTMLElement,
    cellSize: number,
    options?: AnimationOptions
  ): Promise<AnimationResult>

  animateExplode(
    target: HTMLElement,
    cellSize: number,
    options?: ExplodeOptions
  ): Promise<void>

  launchTo(
    coords: readonly Coord[],
    rr: number,
    cc: number,
    context: LaunchContext
  ): Promise<any>
}

/**
 * Weapon instance properties
 * Runtime state for a weapon instance
 */
export type WeaponInstance = {
  readonly name: string
  readonly letter: string
  readonly isLimited: boolean
  readonly destroys: boolean
  readonly points: number
  ammo?: number | null
  readonly tag?: string
  readonly cursors?: readonly string[]
  readonly launchCursor?: string
  readonly totalCursors?: number
  readonly tip?: string
  readonly hints?: readonly string[]
  readonly buttonHtml?: string
}

/**
 * Weapon lookup map
 * Mapping of weapon letters to weapon instances
 */
export type WeaponByLetterMap = {
  readonly [letter: string]: IWeapon
}

/**
 * Weapon metadata
 * Information about a weapon for UI/cataloging
 */
export type WeaponMetadata = {
  readonly letter: string
  readonly name: string
  readonly tag?: string
  readonly plural?: string
  readonly tip?: string
  readonly cursors?: readonly string[]
  readonly isLimited: boolean
  readonly destroys: boolean
  readonly points: number
  readonly ammo?: number
}

/**
 * Weapon effect info
 * Visual/audio configuration
 */
export type WeaponEffectInfo = {
  readonly hasFlash: boolean
  readonly animateOnTarget: boolean
  readonly explodeOnTarget: boolean
  readonly splashType?: TerrainType
  readonly splashPower?: number
  readonly soundFile?: string
}

/**
 * Weapon state snapshot
 * Persistent state for save/restore
 */
export type WeaponState = {
  readonly letter: string
  readonly ammo: number | null
  readonly hit: boolean
  readonly damaged: boolean
}
