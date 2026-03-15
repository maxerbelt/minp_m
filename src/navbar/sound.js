export const ctx = new AudioContext()
let gainNode = ctx.createGain()
gainNode.connect(ctx.destination)

export async function loadSound (url) {
  const res = await fetch(url)
  const buf = await res.arrayBuffer()
  return ctx.decodeAudioData(buf)
}
