/**
 * Space Weapon Sounds Module
 *
 * Provides audio resources and sound effects for space terrain weapon impacts and detonations.
 * Exports a catalogue of pre-constructed URL objects pointing to audio asset files.
 * Enables weapon systems to play appropriate sound effects based on terrain type and weapon class.
 *
 * Sound effects are organized by impact context (space vacuum, asteroid, plasma)
 * allowing different audio feedback for different gameplay scenarios.
 *
 * @module terrains/space/js/spaceWeaponSounds
 */

/**
 * Audio asset catalogue for weapon effects in space terrain.
 * Maps impact/terrain context types to their corresponding explosion/detonation sounds.
 *
 * Keys represent different gameplay contexts:
 * - 'space': Weapon impacts in vacuum/open space
 * - 'asteroid': Weapon impacts on solid asteroid terrain
 * - 'plasma': Specialized plasma weapon detonation effects
 *
 * Values are URL objects constructed relative to this module for proper asset loading.
 * Used by weapon systems during impact resolution and animation completion.
 *
 * @typedef {Object} WeaponSoundMap
 * @property {URL} space - Explosion sound effect for impacts in space terrain (space-explode.mp3)
 * @property {URL} asteroid - Explosion sound effect for impacts on asteroids (asteroid-explode.mp3)
 * @property {URL} plasma - Plasma weapon detonation sound effect (plasma-explode.mp3)
 */

/**
 * Pre-constructed weapon effect sound catalogue for space terrain.
 *
 * Contains three explosion/detonation sound effects optimized for different impact contexts.
 * All sounds are MP3 audio files relative to the sounds directory in space terrain assets.
 * Sounds are pre-loaded as URL objects for immediate playback during weapon impact.
 *
 * Usage:
 * - Retrieved by weapon classes during impact event handling
 * - Played by audio system for appropriate gameplay context
 * - Provides distinct audio feedback based on terrain/weapon type
 *
 * Sound contexts:
 * - **space**: Open space impacts (vacuum detonation)
 * - **asteroid**: Solid terrain impacts (rocky detonation)
 * - **plasma**: Plasma weapon effect (energy detonation)
 *
 * @type {WeaponSoundMap}
 * @const
 */
export const spaceWeaponSounds = {
  space: new URL('../sounds/space-explode.mp3', import.meta.url),
  asteroid: new URL('../sounds/asteroid-explode.mp3', import.meta.url),
  plasma: new URL('../sounds/plasma-explode.mp3', import.meta.url)
}
