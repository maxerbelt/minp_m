/**
 * Weapon sound effects configuration for sea and land terrain.
 * Maps terrain types to their corresponding explosion sound files.
 * @type {Object<string, URL>}
 */
export const seaWeaponSounds = {
  air: new URL('../sounds/air-explode.mp3', import.meta.url),
  land: new URL('../sounds/land-explode.mp3', import.meta.url),
  sea: new URL('../sounds/water-explode.mp3', import.meta.url)
}
