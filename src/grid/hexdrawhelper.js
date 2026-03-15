export function drawPolyhex (
  ctx,
  bb,
  hex,
  S,
  offsetX,
  offsetY,
  color = '#4caf50'
) {
  for (const [q, r] of hex.bitKeys(bb)) {
    const { x, y } = hexToPixel(q, r, S)
    drawHex(ctx, x + offsetX, y + offsetY, S, color)
  }
}

export function drawHexGrid (ctx, hex, S, offsetX, offsetY) {
  for (const [q, r, s] of hex.coords) {
    const { x, y } = hexToPixel(q, r, S)
    drawHex(ctx, x + offsetX, y + offsetY, S, 'transparent', '#ccc')
  }
}

export function hitTestPolyhex (px, py, S, offsetX, offsetY, hex, bb) {
  const x = px - offsetX
  const y = py - offsetY

  const [q, r, s] = pixelToHex(x, y, S)
  const i = hex.index.get(`${q},${r},${s}`)
  if (i === undefined) return null

  return (bb >> BigInt(i)) & 1n ? i : null
}

export function hexToPixel (q, r, S) {
  const x = S * Math.sqrt(3) * (q + r / 2)
  const y = S * 1.5 * r
  return { x, y }
}

export function pixelToHex (x, y, S) {
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / S
  const r = ((2 / 3) * y) / S
  return cubeRound(q, r, -q - r)
}

function cubeRound (q, r, s) {
  let rq = Math.round(q)
  let rr = Math.round(r)
  let rs = Math.round(s)

  const dq = Math.abs(rq - q)
  const dr = Math.abs(rr - r)
  const ds = Math.abs(rs - s)

  if (dq > dr && dq > ds) rq = -rr - rs
  else if (dr > ds) rr = -rq - rs
  else rs = -rq - rr

  return [rq, rr, rs]
}

export function drawHex (ctx, cx, cy, S, fill, stroke = '#333') {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30)
    const x = cx + S * Math.cos(a)
    const y = cy + S * Math.sin(a)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.stroke()
}
