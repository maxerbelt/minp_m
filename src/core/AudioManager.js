/**
 * @typedef {Object} PlaybackOptions
 * @property {number} [volume=1] - Volume level (0-1)
 */

/**
 * @typedef {Object} AudioNodes
 * @property {AudioBufferSourceNode} bufferSource - The audio buffer source
 * @property {GainNode} gain - The gain/volume control node
 */

/**
 * Manages Web Audio API context, buffer loading, and playback
 * Separates concerns: loading (async fetch/decode) and playback (node graph creation)
 */
export class AudioManager {
  /**
   * Creates a new AudioManager instance with Web Audio context
   * @constructs
   */
  constructor () {
    this.ctx = new AudioContext()
    this.buffers = new Map()
  }

  /**
   * Resume AudioContext if suspended (required for user interaction)
   * @async
   * @returns {Promise<void>}
   */
  async init () {
    if (this.ctx.state !== 'running') {
      await this.ctx.resume()
    }
  }

  /**
   * Fetch and decode audio file, store in buffer cache
   * @async
   * @param {string} name - Buffer name/identifier
   * @param {string} url - URL to fetch audio from
   * @returns {Promise<void>}
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
   * @private
   * @param {string} name - Buffer name/identifier
   * @returns {?AudioBuffer} The cached buffer, or null if not found
   */
  _getBuffer (name) {
    return this.buffers.get(name) || null
  }

  /**
   * Create and connect audio node graph (bufferSource → gain → destination)
   * @private
   * @param {AudioBuffer} buffer - The audio buffer to source from
   * @param {number} volume - Volume level (0-1)
   * @returns {AudioNodes} Object with bufferSource and gain nodes
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
   * @param {string} name - Buffer name/identifier
   * @param {PlaybackOptions} [options] - Playback options
   * @returns {?AudioNodes} Audio nodes if successful, null if buffer not found
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
   * @async
   * @param {string} name - Buffer name/identifier
   * @param {string} url - URL to fetch audio from
   * @param {PlaybackOptions} [options] - Playback options
   * @returns {Promise<?AudioNodes>} Audio nodes if successful
   */
  async playAfterLoad (name, url, options) {
    await this.load(name, url)
    return this.play(name, options)
  }

  /**
   * Create audio node graph and start playback
   * @param {string} name - Buffer name/identifier
   * @param {PlaybackOptions} [options] - Playback options
   * @returns {?AudioNodes} Audio nodes, or null if buffer not found
   */
  play (name, { volume = 1 } = {}) {
    const buffer = this._getBuffer(name)
    if (!buffer) return null

    const { bufferSource, gain } = this._createAudioNodes(buffer, volume)
    bufferSource.start()

    return { bufferSource, gain }
  }
}
