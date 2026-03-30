class AudioManager {
  constructor () {
    this.ctx = new AudioContext()
    this.buffers = new Map()
  }

  async init () {
    if (this.ctx.state !== 'running') {
      await this.ctx.resume()
    }
  }

  async load (name, url) {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    const audio = await this.ctx.decodeAudioData(buf)
    this.buffers.set(name, audio)
  }

  play (name, { volume = 1 } = {}) {
    const buffer = this.buffers.get(name)
    if (!buffer) return

    const src = this.ctx.createBufferSource()
    const gain = this.ctx.createGain()

    gain.gain.value = volume

    src.buffer = buffer
    src.connect(gain)
    gain.connect(this.ctx.destination)

    src.start()

    return { src, gain }
  }
}
