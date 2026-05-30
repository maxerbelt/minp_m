/**
 * Weapon sound effects configuration for sea and land terrain.
 *
 * Maps explosion types to their corresponding audio asset URLs.
 * Provides sound effects for different impact environments during
 * weapon detonations and combat effects.
 *
 * Sound Types:
 * - air: Explosion in aerial combat (anti-aircraft effects)
 * - land: Explosion on ground or structures
 * - sea: Explosion in water or underwater (torpedoes, depth charges)
 *
 * @module seaWeaponSounds
 * @typedef {import('./types/sound.types.js').SeaWeaponSounds} SeaWeaponSounds
 */

/**
 * Weapon explosion sound effects mapped by impact environment.
 *
 * Each sound file is loaded as a URL object relative to the module location,
 * allowing for dynamic asset resolution. Used by weapon classes to provide
 * audio feedback for different explosion types during combat.
 *
 * @typedef {Object} WeaponSounds
 * @property {URL} air - Sound for air-based explosions and aerial impacts
 * @property {URL} land - Sound for ground and structure explosions
 * @property {URL} sea - Sound for water and underwater explosions
 */

/**
 * Weapon explosion sound effects configuration for sea and land terrain.
 *
 * Maps explosion environments (air, land, sea) to their corresponding
 * audio asset files using module-relative URL resolution.
 *
 * Usage:
 * - Weapon classes retrieve appropriate sound based on splash type
 * - Sound URLs are loaded once and cached for performance
 * - Relative paths are resolved to absolute URLs for audio playback
 *
 * @type {WeaponSounds}
 * @readonly
 */
export const seaWeaponSounds = {
  air: new URL('../sounds/air-explode.mp3', import.meta.url),
  land: new URL('../sounds/land-explode.mp3', import.meta.url),
  sea: new URL('../sounds/water-explode.mp3', import.meta.url)
}
