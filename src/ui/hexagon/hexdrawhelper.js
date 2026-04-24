/**
 * Draw multiple hexes from bit keys.
 * @param {CanvasRenderingContext2D} ctx - Canvas context.
 * @param {bigint} bb - Bitboard.
 * @param {Object} hex - Hex indexer.
 * @param {number} S - Size.
 * @param {number} offsetX - X offset.
 * @param {number} offsetY - Y offset.
 * @param {string} [color='#4caf50'] - Color.
 */
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

/**
 * Draw hex grid outline.
 * @param {CanvasRenderingContext2D} ctx - Canvas context.
 * @param {Object} hex - Hex indexer.
 * @param {number} S - Size.
 * @param {number} offsetX - X offset.
 * @param {number} offsetY - Y offset.
 */
export function drawHexGrid (ctx, hex, S, offsetX, offsetY) {
  for (const [q, r, s] of hex.coords) {
    const { x, y } = hexToPixel(q, r, S)
    drawHex(ctx, x + offsetX, y + offsetY, S, 'transparent', '#ccc')
  }
}

/**
 * Hit test for polyhex.
 * @param {number} px - Pixel x.
 * @param {number} py - Pixel y.
 * @param {number} S - Size.
 * @param {number} offsetX - X offset.
 * @param {number} offsetY - Y offset.
 * @param {Object} hex - Hex indexer.
 * @param {bigint} bb - Bitboard.
 * @returns {number|null} Index or null.
 */
export function hitTestPolyhex (px, py, S, offsetX, offsetY, hex, bb) {
  const x = px - offsetX
  const y = py - offsetY

  const [q, r, s] = pixelToHex(x, y, S)
  const i = hex.index.get(`${q},${r},${s}`)
  if (i === undefined) return null

  return (bb >> BigInt(i)) & 1n ? i : null
}

/**
 * Convert cube coordinates to pixel.
 * @param {number} q - Q coord.
 * @param {number} r - R coord.
 * @param {number} S - Size.
 * @returns {Object} {x, y}
 */
export function hexToPixel (q, r, S) {
  const x = S * Math.sqrt(3) * (q + r / 2)
  const y = S * 1.5 * r
  return { x, y }
}

/**
 * Convert pixel coordinates to cube coordinates for hexagonal grid.
 * @param {number} x - Pixel x coordinate.
 * @param {number} y - Pixel y coordinate.
 * @param {number} S - Size of hexagons.
 * @param {number} [offsetX=0] - X offset.
 * @param {number} [offsetY=0] - Y offset.
 * @returns {Array<number>} [q, r, s] cube coordinates.
 */
export function pixelToHex (x, y, S, offsetX = 0, offsetY = 0) {
  const adjustedX = x - offsetX
  const adjustedY = y - offsetY
  const q = ((Math.sqrt(3) / 3) * adjustedX - (1 / 3) * adjustedY) / S
  const r = ((2 / 3) * adjustedY) / S
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

/**
 * Draw a hexagon on the canvas.
 * @param {CanvasRenderingContext2D} ctx - Canvas context.
 * @param {number} cx - Center x.
 * @param {number} cy - Center y.
 * @param {number} S - Size.
 * @param {string} fill - Fill color.
 * @param {string} [stroke='#333'] - Stroke color.
 */
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
