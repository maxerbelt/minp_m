/**
 * Audio API types for AudioManager and Web Audio API integration.
 */

/**
 * Options for audio playback.
 * Controls volume and other playback characteristics.
 */
export interface PlaybackOptions {
  /** Volume level from 0 (silent) to 1 (full), clamped to valid range (default: 1) */
  volume?: number;
}

/**
 * Web Audio API node graph for audio playback.
 * Represents the connected chain of audio nodes for a single playback instance.
 */
export interface AudioNodes {
  /** Source node containing the audio buffer data */
  bufferSource: AudioBufferSourceNode;
  /** Gain node for volume control */
  gain: GainNode;
}

/**
 * Audio buffer cache entry.
 * Stores a decoded audio buffer with metadata.
 */
export interface AudioBufferEntry {
  /** Decoded audio buffer ready for playback */
  buffer: AudioBuffer;
  /** URL the buffer was loaded from */
  url: string;
  /** Timestamp when buffer was loaded */
  loadedAt: number;
}

/**
 * Configuration for lazy audio loading.
 * Used by playAfterLoad to coordinate loading and playback.
 */
export interface LazyAudioConfig {
  /** Buffer name/identifier */
  name: string;
  /** URL to fetch audio from */
  url: string;
  /** Playback options (volume, etc.) */
  options?: PlaybackOptions;
}

/**
 * Result of audio playback operation.
 * Provides access to audio nodes and completion state.
 */
export interface AudioPlaybackResult {
  /** Audio nodes for this playback instance */
  nodes: AudioNodes;
  /** Whether playback has started */
  playing: boolean;
  /** Time when playback started */
  startedAt: number;
}

/**
 * Audio loading status.
 */
export type AudioLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Audio playback state.
 */
export type AudioPlaybackState = 'idle' | 'playing' | 'paused' | 'stopped';
