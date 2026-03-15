// helper functions for drawing triangular grid cells with alternating orientation

export function drawTri (
  ctx,
  cx,
  cy,
  S,
  fill,
  stroke = '#333',
  orientation = 'up'
) {
  const h = (S * Math.sqrt(3)) / 2
  let y0, y1
  if (orientation === 'up') {
    // centroid-based coordinates assuming upward-pointing triangle
    y0 = cy - (2 * h) / 3
    y1 = cy + h / 3
  } else {
    // downward-pointing triangle
    y0 = cy + (2 * h) / 3
    y1 = cy - h / 3
  }
  ctx.beginPath()
  ctx.moveTo(cx, y0)
  ctx.lineTo(cx - S / 2, y1)
  ctx.lineTo(cx + S / 2, y1)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.stroke()
}

export function triToPixel (r, c, S) {
  const h = (S * Math.sqrt(3)) / 2
  // new coordinate system: each row r has 2r+1 cells with spacing S/2
  const x = (c - r) * (S / 2)
  const y = r * h
  return { x, y }
}

export function pixelToTri (x, y, S) {
  const h = (S * Math.sqrt(3)) / 2
  const r = Math.round(y / h)
  const c = Math.round(x / (S / 2) + r)
  return [r, c]
}
