const interaction = {
  dragging: false,
  rotating: false,
  previewShape: null,
  previewValid: false,
  dragStartPixel: null,
  dragStartHex: null,
  originalShape: null,
  currentTransform: 0
}
canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect()
  const [q, r, s] = pixelToHex(
    e.clientX - rect.left - offsetX,
    e.clientY - rect.top - offsetY,
    S
  )
  const i = hex.index.get(`${q},${r},${s}`)
  if (i !== undefined) {
    shape ^= 1n << BigInt(i)
    redraw()
  }
})
canvas.addEventListener('mousedown', e => {
  e.preventDefault()

  const rect = canvas.getBoundingClientRect()
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top

  const [q, r, s] = pixelToHex(px - offsetX, py - offsetY, S)
  const i = hex.index.get(`${q},${r},${s}`)

  if (i === undefined) return

  interaction.dragStartPixel = { x: px, y: py }
  interaction.dragStartHex = { q, r }
  interaction.originalShape = shape

  if (e.button === 0) {
    interaction.dragging = true
  } else if (e.button === 2) {
    interaction.rotating = true
  }
})
canvas.addEventListener('mouseup', () => {
  interaction.dragging = false
  interaction.rotating = false
})

canvas.addEventListener('mousemove', e => {
  if (!interaction.dragging && !interaction.rotating) return

  const rect = canvas.getBoundingClientRect()
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top

  const [q, r] = pixelToHex(px - offsetX, py - offsetY, S)

  if (interaction.dragging) {
    const dq = q - interaction.dragStartHex.q
    const dr = r - interaction.dragStartHex.r
    shape = translateShape(interaction.originalShape, dq, dr, hex)
    redraw()
  }

  if (interaction.rotating) {
    const dx = px - interaction.dragStartPixel.x
    const step = Math.floor(dx / 40)
    const k = ((step % 6) + 6) % 6
    shape = applyTransform(interaction.originalShape, transforms[k])
    redraw()
  }
})

canvas.addEventListener('contextmenu', e => e.preventDefault())

canvas.addEventListener('mouseup', () => {
  interaction.dragging = false
  interaction.rotating = false
})

window.addEventListener('keydown', e => {
  if (e.key === 'r') {
    shape = applyTransform(shape, transforms[1])
  }
  if (e.key === 'f') {
    shape = applyTransform(shape, transforms[6])
  }
  redraw()
})

function drawOrigin (ctx, hex, S) {
  const { x, y } = hexToPixel(0, 0, S)
  drawHex(ctx, x + offsetX, y + offsetY, S, 'rgba(0,0,255,0.2)')
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
function pixelToSnappedHex (x, y, S) {
  const [q, r, s] = pixelToHex(x, y, S)
  return cubeRound(q, r, s)
}

function isPlacementLegal (bb) {
  // 1) inside board
  forEachBit(bb, i => {
    if (!boardMaskHas(i)) return false
  })

  // 2) no collision
  return (bb & occupiedMask) === 0n
}

function pixelToSnappedHex (x, y, S) {
  const [q, r, s] = pixelToHex(x, y, S)
  return cubeRound(q, r, s)
}

function computeGhost (px, py) {
  const [q, r, s] = pixelToSnappedHex(px - offsetX, py - offsetY, S)

  const dq = q - interaction.dragStartHex.q
  const dr = r - interaction.dragStartHex.r

  let ghost = interaction.originalShape

  if (interaction.rotating) {
    ghost = applyTransform(ghost, transforms[interaction.currentTransform])
  }

  ghost = translateShape(ghost, dq, dr, hex)

  interaction.previewShape = ghost
  interaction.previewValid = isPlacementLegal(ghost)
}

canvas.addEventListener('mousemove', e => {
  if (!interaction.dragging && !interaction.rotating) return

  const rect = canvas.getBoundingClientRect()
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top

  computeGhost(px, py)
  redraw()
})

canvas.addEventListener('mouseup', () => {
  if (interaction.previewValid) {
    shape = interaction.previewShape
  }

  interaction.dragging = false
  interaction.rotating = false
  interaction.previewShape = null

  redraw()
})

function drawGhost (ctx, bb, valid) {
  ctx.globalAlpha = 0.4
  forEachBit(bb, i => {
    const [q, r] = hex.coords[i]
    const { x, y } = hexToPixel(q, r, S)
    drawHex(ctx, x + offsetX, y + offsetY, S, valid ? '#00ff88' : '#ff4444')
  })
  ctx.globalAlpha = 1.0
}
/*
Call during render:

if (interaction.previewShape) {
  drawGhost(ctx,
    interaction.previewShape,
    interaction.previewValid
  );
}
interaction.currentTransform =
  ((step % 6) + 6) % 6;
Display orientation index overlay:

ctx.fillText(
  `rot ${interaction.currentTransform}`,
  10, 20
);
10) UX polish ideas
Small tweaks that matter:

draw shadow outline under ghost

show invalid cells blinking

snap rotation every 30° (hex-friendly)

lock drag axis with Shift

center-of-mass snapping instead of first cell
*/
