/**
 * Audio and sound effect type definitions for space terrain.
 *
 * Provides types for:
 * - Sound asset catalogues
 * - Audio context configuration
 * - Sound effect mapping
 *
 * @module terrains/space/types/audio.types
 */

/**
 * URL to an audio asset file or audio resource.
 * Represents a reference to a sound file for playback.
 *
 * @typedef {string | URL} AudioAsset
 *
 * @example
 * const spaceExplosion: AudioAsset = new URL('../sounds/space-explode.mp3', import.meta.url)
 * const asteroidExplosion: AudioAsset = 'sounds/asteroid-explode.mp3'
 */
export type AudioAsset = string | URL

/**
 * Audio context type for gameplay scenario.
 * Indicates the terrain or context in which a sound effect plays.
 *
 * Context values:
 * - 'space': Weapon impacts in open space/vacuum
 * - 'asteroid': Weapon impacts on solid asteroid terrain
 * - 'plasma': Specialized plasma weapon detonations
 *
 * @typedef {'space' | 'asteroid' | 'plasma'} AudioContext
 */
export type AudioContext = 'space' | 'asteroid' | 'plasma'

/**
 * Weapon sound effect catalogue mapping context to audio assets.
 * Provides appropriate sound effects based on impact terrain type.
 *
 * @typedef {Object} WeaponSoundMap
 * @property {AudioAsset} space - Explosion sound for space impacts
 * @property {AudioAsset} asteroid - Explosion sound for asteroid impacts
 * @property {AudioAsset} [plasma] - Optional: Plasma weapon detonation sound
 *
 * @example
 * const soundMap: WeaponSoundMap = {
 *   space: new URL('../sounds/space-explode.mp3', import.meta.url),
 *   asteroid: new URL('../sounds/asteroid-explode.mp3', import.meta.url),
 *   plasma: new URL('../sounds/plasma-explode.mp3', import.meta.url)
 * }
 */
export interface WeaponSoundMap {
  readonly space: AudioAsset
  readonly asteroid: AudioAsset
  readonly plasma?: AudioAsset
}

/**
 * Sound effect playback configuration.
 * Defines audio properties for weapon effect playback.
 *
 * @typedef {Object} SoundEffect
 * @property {AudioAsset} asset - Path or URL to audio file
 * @property {number} [volume] - Volume level (0.0 to 1.0)
 * @property {number} [duration] - Expected duration in milliseconds
 * @property {boolean} [loop] - Whether sound loops
 * @property {string} [type] - Sound classification (e.g., 'explosion', 'impact')
 */
export interface SoundEffect {
  readonly asset: AudioAsset
  readonly volume?: number
  readonly duration?: number
  readonly loop?: boolean
  readonly type?: string
}

/**
 * Complete audio resource pack for a game scenario.
 * Contains all sound effects needed for gameplay in a specific terrain.
 *
 * @typedef {Object} AudioResourcePack
 * @property {string} terrain - Terrain type identifier
 * @property {WeaponSoundMap} weaponSounds - Weapon impact sounds
 * @property {Record<string, SoundEffect>} [effects] - Additional sound effects
 * @property {Record<string, AudioAsset>} [ambient] - Ambient/background sounds
 */
export interface AudioResourcePack {
  readonly terrain: string
  readonly weaponSounds: WeaponSoundMap
  readonly effects?: Record<string, SoundEffect>
  readonly ambient?: Record<string, AudioAsset>
}

/**
 * Audio system manager interface.
 * Handles loading, caching, and playback of sound effects.
 *
 * @typedef {Object} AudioManager
 * @property {(asset: AudioAsset) => Promise<void>} preload - Pre-load audio asset
 * @property {(asset: AudioAsset, context?: AudioContext) => void} play - Play sound immediately
 * @property {(asset: AudioAsset, delay: number) => void} playDelayed - Play sound after delay
 * @property {(key: string) => void} stop - Stop playing sound
 * @property {(volume: number) => void} setVolume - Set master volume
 */
export interface AudioManager {
  readonly preload: (asset: AudioAsset) => Promise<void>
  readonly play: (asset: AudioAsset, context?: AudioContext) => void
  readonly playDelayed: (asset: AudioAsset, delay: number) => void
  readonly stop: (key: string) => void
  readonly setVolume: (volume: number) => void
}
