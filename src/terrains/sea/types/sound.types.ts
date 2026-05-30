/**
 * @fileoverview Sea terrain sound and audio type definitions
 *
 * Type definitions for weapon audio assets, sound configuration,
 * and audio-related gameplay mechanics in sea/land terrain.
 *
 * @module terrains/sea/types/sound.types
 */

/**
 * Audio file path or URL for weapon sound asset.
 *
 * Reference to an audio asset file used for weapon sound effects.
 * Can be a URL object or file path string depending on context.
 *
 * @typedef {URL | string} AudioAsset
 * @example
 * new URL('../sounds/bomb-flight.mp3', import.meta.url)
 * 'bomb-flight.mp3'
 */
export type AudioAsset = URL | string

/**
 * Sound type identifier for weapon impact environment.
 *
 * Categorizes sounds based on the environment where impact occurs.
 * Different environments use different audio feedback for immersion.
 *
 * @typedef {('air' | 'land' | 'sea')} SoundType
 *
 * Impact environments:
 * - 'air': Aerial explosions and anti-aircraft impacts
 * - 'land': Ground and structural explosions
 * - 'sea': Water explosions and underwater impacts
 */
export type SoundType = 'air' | 'land' | 'sea'

/**
 * Flight sound reference for weapon projectile movement.
 *
 * Audio played while weapon is traveling to target.
 * Creates audio feedback during weapon flight animation.
 *
 * @typedef {URL} FlightSound
 * @description
 * URL resolved from module location pointing to flight audio asset.
 * Each weapon class provides its own flightSound getter.
 */
export type FlightSound = URL

/**
 * Explosion sound configuration for weapon impact.
 *
 * Audio feedback played when weapon reaches target and explodes.
 * Maps different impact types to appropriate explosion sounds.
 *
 * @interface ExplosionSound
 * @property {AudioAsset} [air] - Sound for air-based impacts
 * @property {AudioAsset} [land] - Sound for ground-based impacts
 * @property {AudioAsset} [sea] - Sound for water-based impacts
 */
export interface ExplosionSound {
  readonly air?: AudioAsset
  readonly land?: AudioAsset
  readonly sea?: AudioAsset
}

/**
 * Weapon sound effect configuration for a single weapon type.
 *
 * Complete sound setup for a weapon including flight and impact sounds.
 *
 * @interface WeaponSoundConfig
 * @property {FlightSound} [flightSound] - Sound during projectile flight
 * @property {ExplosionSound} [explosionSound] - Sound at impact by environment
 */
export interface WeaponSoundConfig {
  readonly flightSound?: FlightSound
  readonly explosionSound?: ExplosionSound
}

/**
 * Sound file name mapping for weapon flight audio.
 *
 * Constants defining which audio files map to which weapons.
 * Used to load correct flight sounds for each weapon type.
 *
 * @typedef {readonly Record<string, string>} SoundFileMapping
 *
 * @example
 * {
 *   'MEGABOMB': 'bomb-flight.mp3',
 *   'KINETIC': 'kinetic-flight.mp3',
 *   'TORPEDO': 'torpedo-flight.mp3',
 *   'FLACK': 'flack-flight.mp3'
 * }
 */
export type SoundFileMapping = Readonly<Record<string, string>>

/**
 * Audio player context for weapon sound effects.
 *
 * Encapsulates audio playback functionality for weapon sounds.
 * Manages volume, timing, and cleanup of audio assets.
 *
 * @interface AudioPlayerContext
 * @property {(url: URL) => void} play - Play audio from URL
 * @property {(url: URL) => void} preload - Pre-cache audio asset
 * @property {(url: URL) => void} stop - Stop currently playing audio
 * @property {number} volume - Playback volume (0-1)
 * @property {boolean} enabled - Whether audio playback is enabled
 */
export interface AudioPlayerContext {
  play: (url: URL) => void
  preload: (url: URL) => void
  stop: (url: URL) => void
  readonly volume: number
  readonly enabled: boolean
}

/**
 * Sound asset bundle for sea terrain weapons.
 *
 * Groups all sound assets for different impact types.
 * Provides organized access to explosion audio for different environments.
 *
 * @interface SeaWeaponSounds
 * @property {URL} air - URL to aerial impact sound
 * @property {URL} land - URL to ground impact sound
 * @property {URL} sea - URL to water impact sound
 */
export interface SeaWeaponSounds {
  readonly air: URL
  readonly land: URL
  readonly sea: URL
}

/**
 * Audio playback event for weapon sound triggers.
 *
 * Event data triggered when weapon sound should play.
 * Contains information about which sound to play and where.
 *
 * @interface AudioPlaybackEvent
 * @property {SoundType} soundType - Type of sound to play (air/land/sea)
 * @property {URL} assetUrl - URL of audio asset to play
 * @property {number} [volume] - Optional volume override (0-1)
 * @property {number} [delay] - Optional playback delay in milliseconds
 */
export interface AudioPlaybackEvent {
  readonly soundType: SoundType
  readonly assetUrl: URL
  readonly volume?: number
  readonly delay?: number
}

/**
 * Audio asset resolver function type.
 *
 * Function to resolve audio asset paths to playable URLs.
 * Handles module-relative path resolution and URL construction.
 *
 * @typedef {(fileName: string, baseUrl: string | URL) => URL} AudioAssetResolver
 * @example
 * const url = resolver('bomb-flight.mp3', import.meta.url)
 * // Returns: file:///path/to/terrains/sea/sounds/bomb-flight.mp3
 */
export type AudioAssetResolver = (
  fileName: string,
  baseUrl: string | URL
) => URL

/**
 * Sound preload configuration for startup optimization.
 *
 * Specifies which weapon sounds should be pre-loaded at game startup
 * to avoid latency when weapons first fire.
 *
 * @interface SoundPreloadConfig
 * @property {readonly string[]} weaponFlights - Weapon flight sounds to preload
 * @property {readonly SoundType[]} explosionTypes - Explosion types to preload
 * @property {boolean} [eager] - Whether to preload immediately vs on-demand
 */
export interface SoundPreloadConfig {
  readonly weaponFlights: readonly string[]
  readonly explosionTypes: readonly SoundType[]
  readonly eager?: boolean
}
