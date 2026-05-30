/**
 * Weapon configuration types
 * Type definitions for weapon initialization and configuration
 */

/**
 * Weapon base configuration
 * Shared properties for all weapons
 */
export type WeaponConfig = {
  readonly cursors?: readonly string[]
  readonly launchCursor?: string
  readonly tag?: string
  readonly name?: string
  readonly plural?: string
  readonly classname?: string
  readonly tip?: string
  readonly hints?: readonly string[]
  readonly buttonHtml?: string
  readonly totalCursors?: number
  readonly hasFlash?: boolean
  readonly isLimited?: boolean
  readonly destroys?: boolean
  readonly points?: number
  readonly animateOnTarget?: boolean
  readonly explodeOnTarget?: boolean
  readonly nonAttached?: boolean
}

/**
 * Area weapon configuration
 * Additional config for area-of-effect weapons
 */
export type AreaWeaponConfig = WeaponConfig & {
  readonly splashSize?: number
  readonly splashType?: string
  readonly splashPower?: number
  readonly splashMin?: number | null
  readonly splashMax?: number | null
  readonly animateOffsetY?: number
}

/**
 * Projectile weapon configuration
 * Config for weapons with projectile paths
 */
export type ProjectileWeaponConfig = AreaWeaponConfig & {
  readonly hasWake?: boolean
  readonly isOneAndDone?: boolean
  readonly explodeOnSplash?: boolean
  readonly dragShape?: readonly (readonly [number, number, number])[]
}

/**
 * Scanning weapon configuration
 * Config for detection/scanning weapons
 */
export type ScanningWeaponConfig = WeaponConfig & {
  readonly dragShape?: readonly (readonly [number, number, number])[]
}

/**
 * Drag shape definition
 * 3D array for weapon shape visualization
 * [row, col, weight/visibility]
 */
export type DragShape = readonly (readonly [row: number, col: number, weight: number])[]

/**
 * Weapon property configuration options
 * Flattened configuration for property assignment
 */
export type WeaponPropertyConfig = {
  readonly hints?: readonly string[]
  readonly buttonHtml?: string
  readonly tag?: string
  readonly tip?: string
  readonly splashType?: string
  readonly splashPower?: number
  readonly cursors?: readonly string[]
  readonly totalCursors?: number
  readonly launchCursor?: string
  readonly animateOnTarget?: boolean
  readonly explodeOnTarget?: boolean
  readonly hasFlash?: boolean
}

/**
 * Weapon configuration lookup
 * Mapping of weapon types to their configurations
 */
export type WeaponConfigMap = {
  readonly [key: string]: ProjectileWeaponConfig | WeaponConfig
}
