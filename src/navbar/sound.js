/**
 * @fileoverview Audio context and sound management utilities.
 * Handles AudioContext creation, gain node configuration, and audio file loading/decoding.
 */

/** @type {AudioContext} Global audio context for sound playback and processing */
export const ctx = new AudioContext()

/** @type {GainNode} Gain node connected to audio context destination for volume control */
let gainNode = ctx.createGain()
gainNode.connect(ctx.destination)

/**
 * Load and decode an audio file from the given URL.
 * Fetches the audio file as an ArrayBuffer and decodes it using the global AudioContext.
 *
 * @async
 * @param {string} url - The URL of the audio file to load
 * @returns {Promise<AudioBuffer>} A promise that resolves to the decoded audio data
 * @throws {TypeError} If url is not a valid string
 * @throws {Error} If the fetch request fails or decoding fails
 *
 * @example
 * const audioBuffer = await loadSound('path/to/sound.mp3')
 * const source = ctx.createBufferSource()
 * source.buffer = audioBuffer
 * source.connect(ctx.destination)
 * source.start(0)
 */
export async function loadSound (url) {
  const res = await fetch(url)
  const buf = await res.arrayBuffer()
  return ctx.decodeAudioData(buf)
}
