/**
 * @typedef {Object} PlaybackOptions
 * (See types/audio.types.ts#PlaybackOptions for canonical TypeScript definition)
 * @property {number} [volume=1] - Volume level (0-1, clamped to valid range)
 */

/**
 * @typedef {Object} AudioNodes
 * (See types/audio.types.ts#AudioNodes for canonical TypeScript definition)
 * @property {AudioBufferSourceNode} bufferSource - The audio buffer source node for playback
 * @property {GainNode} gain - The gain/volume control node connected to destination
 */

/**
 * Manages Web Audio API context, buffer loading, and playback
 *
 * Provides a clean abstraction over the Web Audio API for common audio playback tasks:
 * - Audio context lifecycle management (init via resume)
 * - Async audio file loading with buffer caching (decode once, reuse many times)
 * - Synchronous playback with volume control via node graph
 * - Safe fallback when buffers aren't loaded (playIfLoaded)
 *
 * Architecture:
 * - Separates async loading (fetch/decode) from sync playback (node graph)
 * - Uses Map-based buffer cache for O(1) lookup and efficient memory reuse
 * - Each play() call creates new node instances for independent control
 * - Supports both eager load (load then play) and lazy load (playAfterLoad)
 *
 * Browser Compatibility:
 * - Requires support for Web Audio API (all modern browsers)
 * - AudioContext may start suspended due to autoplay policies
 * - Must call init() within user interaction handler before first playback
 *
 * Public Methods:
 * - constructor: Creates AudioManager with Web Audio context
 * - init(): Resume AudioContext if suspended (required by browser policies)
 * - load(): Fetch, decode, and cache audio buffer asynchronously
 * - play(): Create node graph and play from cache with volume control
 * - playIfLoaded(): Safe play that returns null if buffer not cached
 * - playAfterLoad(): Convenience method combining load and play
 *
 * Private Methods:
 * - _getBuffer(): Retrieve cached buffer by name
 * - _createAudioNodes(): Build bufferSource → gain → destination chain
 *
 * @class AudioManager
 * @example
 * // Initialize and load audio on first user interaction
 * const audioManager = new AudioManager();
 * document.addEventListener('click', async () => {
 *   await audioManager.init();
 *   await audioManager.load('click', '/sounds/click.wav');
 * });
 *
 * @example
 * // Play sound with volume control
 * const nodes = audioManager.play('click', { volume: 0.7 });
 * if (nodes) {
 *   // Can dynamically adjust volume: nodes.gain.gain.value = 0.5
 *   // Or stop playback: nodes.bufferSource.stop()
 * }
 *
 * @example
 * // Lazy load and play in one call
 * await audioManager.playAfterLoad('effect', '/sounds/effect.wav', { volume: 0.5 })
 */
export class AudioManager {
  /**
   * Creates a new AudioManager instance with Web Audio context
   *
   * Initializes the AudioContext which is the entry point to the Web Audio API.
   * The context may start in a suspended state due to browser autoplay policies
   * and must be resumed via user interaction before audio can play.
   *
   * AudioContext is a shared resource - only create one per application and reuse.
   * Multiple contexts consume system resources and may cause audio issues.
   */
  constructor () {
    /** @type {AudioContext} - Web Audio API context for audio processing and node creation */
    this.ctx = new AudioContext()
    /** @type {Map<string, AudioBuffer>} - Cache of decoded audio buffers keyed by name for O(1) lookup */
    this.buffers = new Map()
  }

  /**
   * Resume AudioContext if suspended (required for user interaction)
   *
   * Handles browser autoplay policies that suspend the AudioContext until
   * user interaction. Must be called within a user gesture handler (click, etc).
   *
   * @async
   * @returns {Promise<void>} Resolves when context is in 'running' state
   * @throws {Error} If context resume fails (rare, usually due to system audio issues)
   *
   * @example
   * await audioManager.init()  // Call on first user interaction
   */
  async init () {
    if (this.ctx.state !== 'running') {
      await this.ctx.resume()
    }
  }

  /**
   * Fetch and decode audio file, store in buffer cache
   *
   * Downloads audio from URL, decodes it using the Web Audio API, and caches
   * the decoded AudioBuffer for subsequent playback. Decoding is computationally
   * expensive, so the result is cached. If already cached, returns immediately
   * without refetch to avoid unnecessary downloads and decoding.
   *
   * Supports any audio format that the browser can decode (WAV, MP3, OGG, etc).
   * Errors in fetch or decode will propagate to caller for handling.
   *
   * @async
   * @param {string} name - Buffer name/identifier for caching and retrieval (e.g., 'click', 'explosion')
   * @param {string} url - URL to fetch audio from (must be same-origin or CORS-enabled)
   * @returns {Promise<void>} Resolves when buffer is loaded and cached
   * @throws {Error} If fetch fails, array buffer is invalid, or decoding fails
   *
   * @example
   * await audioManager.load('click', '/sounds/click.wav')
   * await audioManager.load('whoosh', '/audio/effects/whoosh.ogg')
   */
  async load (name, url) {
    if (this.buffers.has(name)) return
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    const audio = await this.ctx.decodeAudioData(buf)
    this.buffers.set(name, audio)
  }

  /**
   * Retrieve cached audio buffer by name
   *
   * Performs O(1) lookup in the buffer cache Map. Returns null if buffer is not found,
   * allowing safe fallback behavior (see playIfLoaded for example).
   *
   * @private
   * @param {string} name - Buffer name/identifier to look up
   * @returns {AudioBuffer|null} The cached buffer, or null if not found
   */
  _getBuffer (name) {
    return this.buffers.get(name) || null
  }

  /**
   * Create and connect audio node graph (bufferSource → gain → destination)
   *
   * Builds the audio processing chain:
   * 1. Create BufferSource from audio buffer (holds decoded sample data)
   * 2. Create Gain node for volume/amplitude control
   * 3. Connect: bufferSource → gain → context.destination (system output)
   *
   * Each play() call creates fresh node instances for independent control.
   * Nodes are not reused between plays to allow concurrent playback and individual control.
   *
   * @private
   * @param {AudioBuffer} buffer - The audio buffer to source from (decoded audio data)
   * @param {number} volume - Volume level (0-1, where 1 is full volume, 0 is silent)
   * @returns {AudioNodes} Object with bufferSource and gain nodes ready for playback
   */
  _createAudioNodes (buffer, volume) {
    const bufferSource = this.ctx.createBufferSource()
    const gain = this.ctx.createGain()

    bufferSource.buffer = buffer
    gain.gain.value = volume

    bufferSource.connect(gain)
    gain.connect(this.ctx.destination)

    return { bufferSource, gain }
  }

  /**
   * Play audio from loaded buffer if available
   *
   * Safely attempts to play audio from the cache. If buffer is not found,
   * logs a warning and returns null. This is a safe method for optional audio
   * playback scenarios where missing audio shouldn't break the application
   * (e.g., user interaction sounds, background effects).
   *
   * Useful for "fire and forget" audio where you don't need to track playback.
   *
   * @param {string} name - Buffer name/identifier to look up in cache
   * @param {PlaybackOptions} [options={}] - Playback options with optional volume (default 1)
   * @returns {AudioNodes|null} Audio nodes if successful and buffer found, null if buffer not found
   *
   * @example
   * // Safe fire-and-forget audio
   * audioManager.playIfLoaded('click', { volume: 0.5 })
   *
   * @example
   * // With control over playback
   * const nodes = audioManager.playIfLoaded('effect', { volume: 0.7 })
   * if (nodes) {
   *   // Can adjust volume: nodes.gain.gain.value = 0.3
   *   // Or stop: nodes.bufferSource.stop()
   * }
   */
  playIfLoaded (name, options) {
    const buffer = this._getBuffer(name)
    if (!buffer) {
      console.warn(`Audio buffer for ${name} not loaded`)
      return null
    }
    return this.play(name, options)
  }

  /**
   * Load audio file then play it
   *
   * Convenience method that combines loading and playback in sequence.
   * Fetches from URL, decodes, caches the AudioBuffer, and then plays it in one call.
   * Useful for streaming audio or when you don't need to load audio upfront.
   *
   * If called multiple times with the same name, only the first call decodes the audio.
   * Subsequent calls retrieve from cache immediately before playing.
   *
   * @async
   * @param {string} name - Buffer name/identifier for caching and retrieval
   * @param {string} url - URL to fetch audio from (same-origin or CORS-enabled)
   * @param {PlaybackOptions} [options={}] - Playback options with optional volume (default 1)
   * @returns {Promise<AudioNodes|null>} Audio nodes if successful, null if buffer creation failed
   * @throws {Error} If fetch fails or decode fails
   *
   * @example
   * // One-shot sound effect
   * await audioManager.playAfterLoad('whoosh', '/sounds/whoosh.wav', { volume: 0.7 })
   *
   * @example
   * // With playback control
   * const nodes = await audioManager.playAfterLoad('bell', '/sounds/bell.mp3')
   * if (nodes) {
   *   // Can control playback
   *   nodes.gain.gain.value = 0.4
   * }
   */
  async playAfterLoad (name, url, options) {
    await this.load(name, url)
    return this.play(name, options)
  }

  /**
   * Create audio node graph and start playback
   *
   * Creates the processing chain and immediately starts playback. The audio will play
   * from the beginning to the end unless stopped externally via the returned nodes.
   * Each call to play() creates new node instances, enabling concurrent playback
   * of the same sound effect multiple times simultaneously.
   *
   * Returns null if buffer not found (call load() or playAfterLoad() first).
   *
   * @param {string} name - Buffer name/identifier to look up in cache
   * @param {PlaybackOptions} [options={}] - Playback options with optional volume (default 1)
   * @returns {AudioNodes|null} Audio nodes for playback control, or null if buffer not found
   *
   * @example
   * // Simple playback
   * audioManager.play('click')
   *
   * @example
   * // With volume control
   * const nodes = audioManager.play('effect', { volume: 0.75 })
   * if (nodes) {
   *   // Dynamically adjust volume during playback
   *   nodes.gain.gain.value = 0.5
   *   // Or stop playback
   *   nodes.bufferSource.stop()
   * }
   *
   * @example
   * // Concurrent playback of same sound
   * audioManager.play('pop', { volume: 0.5 })  // First instance
   * audioManager.play('pop', { volume: 0.5 })  // Second instance, plays concurrently
   */
  play (name, { volume = 1 } = {}) {
    const buffer = this._getBuffer(name)
    if (!buffer) return null

    const { bufferSource, gain } = this._createAudioNodes(buffer, volume)
    bufferSource.start()

    return { bufferSource, gain }
  }
}
