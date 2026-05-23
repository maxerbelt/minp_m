/**
 * @typedef {Object} PlaybackOptions
 * @property {number} [volume=1] - Volume level (0-1, clamped to valid range)
 */

/**
 * @typedef {Object} AudioNodes
 * @property {AudioBufferSourceNode} bufferSource - The audio buffer source node
 * @property {GainNode} gain - The gain/volume control node connected to destination
 */

/**
 * Manages Web Audio API context, buffer loading, and playback
 *
 * Separates concerns between async loading (fetch/decode) and synchronous playback
 * (node graph creation and playback control). Uses a Map-based buffer cache for
 * efficient reuse of decoded audio buffers.
 *
 * @class AudioManager
 */
export class AudioManager {
  /**
   * Creates a new AudioManager instance with Web Audio context
   *
   * Initializes the AudioContext which is the entry point to the Web Audio API.
   * The context may start in a suspended state due to browser autoplay policies
   * and must be resumed via user interaction before audio can play.
   *
   * @constructor
   */
  constructor () {
    /** @type {AudioContext} - Web Audio API context for audio processing */
    this.ctx = new AudioContext()
    /** @type {Map<string, AudioBuffer>} - Cache of decoded audio buffers keyed by name */
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
   * the decoded AudioBuffer. If already cached, returns immediately without refetch.
   *
   * @async
   * @param {string} name - Buffer name/identifier for caching and retrieval
   * @param {string} url - URL to fetch audio from (must be same-origin or CORS-enabled)
   * @returns {Promise<void>} Resolves when buffer is loaded and cached
   * @throws {Error} If fetch fails, array buffer is invalid, or decode fails
   *
   * @example
   * await audioManager.load('click', '/sounds/click.wav')
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
   * Builds the audio processing chain: buffer source is connected to a gain node
   * for volume control, which is then connected to the context's destination
   * (system speakers/output).
   *
   * @private
   * @param {AudioBuffer} buffer - The audio buffer to source from
   * @param {number} volume - Volume level (0-1, where 1 is full volume)
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
   * Attempts to play audio from the cache. If buffer is not found, logs a warning
   * and returns null. This is a safe method for optional audio playback.
   *
   * @param {string} name - Buffer name/identifier
   * @param {PlaybackOptions} [options] - Playback options with optional volume
   * @returns {AudioNodes|null} Audio nodes if successful, null if buffer not found
   *
   * @example
   * const nodes = audioManager.playIfLoaded('click', { volume: 0.5 })
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
   * Fetches, decodes, caches, and plays the audio in one call.
   *
   * @async
   * @param {string} name - Buffer name/identifier for caching
   * @param {string} url - URL to fetch audio from
   * @param {PlaybackOptions} [options] - Playback options with optional volume
   * @returns {Promise<AudioNodes|null>} Audio nodes if successful, null if buffer creation failed
   * @throws {Error} If fetch or decode fails
   *
   * @example
   * const nodes = await audioManager.playAfterLoad('click', '/sounds/click.wav')
   */
  async playAfterLoad (name, url, options) {
    await this.load(name, url)
    return this.play(name, options)
  }

  /**
   * Create audio node graph and start playback
   *
   * Creates the processing chain and immediately starts playback. The audio
   * will play from the beginning to the end unless stopped externally.
   *
   * @param {string} name - Buffer name/identifier to play
   * @param {PlaybackOptions} [options] - Playback options with optional volume (default 1)
   * @returns {AudioNodes|null} Audio nodes for playback control, or null if buffer not found
   *
   * @example
   * const nodes = audioManager.play('click', { volume: 0.75 })
   * if (nodes) {
   *   // Can control playback: nodes.gain.gain.value = 0.5
   *   // Or stop: nodes.bufferSource.stop()
   * }
   */
  play (name, { volume = 1 } = {}) {
    const buffer = this._getBuffer(name)
    if (!buffer) return null

    const { bufferSource, gain } = this._createAudioNodes(buffer, volume)
    bufferSource.start()

    return { bufferSource, gain }
  }
}
