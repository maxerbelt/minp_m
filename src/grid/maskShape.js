function* bresenhamSteps (x0, y0, dx, dy, sx, sy, width, height) {
  let err = dx - dy
  let steps = 1
  while (x0 >= 0 && x0 < width && y0 >= 0 && y0 < height) {
    yield [x0, y0, steps]
    steps++
    const e2 = 2 * err

    if (e2 > -dy) {
      err -= dy
      x0 += sx
    }
    if (e2 < dx) {
      err += dx
      y0 += sy
    }
  }
}

function dot (ax, ay, bx, by) {
  return ax * bx + ay * by
}

function len (x, y) {
  return Math.hypot(x, y)
}
function len2 (x, y) {
  return x * x + y * y
}
export function drawRay (x0, y0, x1, y1, canvas, color) {
  const { dxDir, dyDir } = direction(x1, x0, y1, y0)
  drawRayInDirection(x0, y0, dxDir, dyDir, canvas, color)
}
function drawRayInDirection (x0, y0, dxDir, dyDir, canvas, color) {
  const { dx, dy, sx, sy } = initLineDirectionParans(dxDir, dyDir)

  for (const [x, y] of bresenhamSteps(
    x0,
    y0,
    dx,
    dy,
    sx,
    sy,
    canvas.width,
    canvas.height
  )) {
    canvas.set(x, y, color)
  }
}
function interceptInDirection (x0, y0, dxDir, dyDir, canvas) {
  const { dx, dy, sx, sy } = initLineDirectionParans(dxDir, dyDir)
  let mx = x0
  let my = y0

  for (const [x, y] of bresenhamSteps(
    x0,
    y0,
    dx,
    dy,
    sx,
    sy,
    canvas.width,
    canvas.height
  )) {
    mx = x
    my = y
  }
  return [mx, my]
}
function interceptsInDirection (x, y, dxDir, dyDir, canvas) {
  const [x1, y1] = interceptInDirection(x, y, dxDir, dyDir, canvas)
  const [x0, y0] = interceptInDirection(x, y, -dxDir, -dyDir, canvas)
  return { x0, y0, x1, y1 }
}
export function intercepts (x0, y0, x1, y1, canvas) {
  const { dxDir, dyDir } = direction(x1, x0, y1, y0)
  return interceptsInDirection(x0, y0, dxDir, dyDir, canvas)
}
export function drawLineInfinite (sx, sy, ex, ey, canvas, color) {
  const { x0, y0, x1, y1 } = intercepts(sx, sy, ex, ey, canvas)
  drawSegmentTo(x0, y0, x1, y1, canvas, color)
}

export function drawSegmentTo (x0, y0, x1, y1, canvas, color) {
  const { dx, dy, sx, sy, dxDir, dyDir } = initLineParams(x1, x0, y1, y0)
  for (const [x, y] of bresenhamSteps(
    x0,
    y0,
    dx,
    dy,
    sx,
    sy,
    canvas.width,
    canvas.height
  )) {
    //if (!this.inBounds(x, y)) break
    canvas.set(x, y, color)
    if (x === dxDir && y === dyDir) break
  }
}
export function drawSegmentUpTo (x0, y0, x1, y1, canvas, color) {
  const { dx, dy, sx, sy, dxDir, dyDir } = initLineParams(x1, x0, y1, y0)
  for (const [x, y] of bresenhamSteps(
    x0,
    y0,
    dx,
    dy,
    sx,
    sy,
    canvas.width,
    canvas.height
  )) {
    //if (!this.inBounds(x, y)) break

    if (x === dxDir && y === dyDir) break
    canvas.set(x, y, color)
  }
}
function initLineParams (x1, x0, y1, y0) {
  const { dxDir, dyDir } = direction(x1, x0, y1, y0)
  return initLineDirectionParans(dxDir, dyDir)
}

function direction (x1, x0, y1, y0) {
  const dxDir = x1 - x0
  const dyDir = y1 - y0
  return { dxDir, dyDir }
}

function initLineDirectionParans (dxDir, dyDir) {
  const dx = Math.abs(dxDir)
  const dy = Math.abs(dyDir)
  const sx = Math.sign(dxDir)
  const sy = Math.sign(dyDir)
  return { dx, dy, sx, sy, dxDir, dyDir }
}

export function drawSegmentFor (x0, y0, x1, y1, distance, canvas, color) {
  const { dx, dy, sx, sy } = initLineParams(x1, x0, y1, y0)

  for (const [x, y, steps] of bresenhamSteps(
    x0,
    y0,
    dx,
    dy,
    sx,
    sy,
    canvas.width,
    canvas.height
  )) {
    //if (!this.inBounds(x, y)) break
    canvas.set(x, y, color)

    if (steps >= distance) break
    // if (x === dxDir && y === dyDir) break
  }
}

function drawPieBase (x0, y0, x1, y1, radius, canvas, drawer, spreadDeg = 22.5) {
  const ox = x0
  const oy = y0
  const dx = x1 - x0
  const dy = y1 - y0
  const dirLen = len(dx, dy)
  const cosLimit = Math.cos((spreadDeg * Math.PI) / 180)

  const r2 = radius * radius

  const { minY, maxY, minX, maxX } = pieBounds(ox, radius, oy, canvas)

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const vx = x - ox
      const vy = y - oy

      const d2 = len2(vx, vy)
      if (d2 > r2 || d2 === 0) continue

      const vLen = Math.sqrt(d2)
      const cosAngle = dot(vx, vy, dx, dy) / (vLen * dirLen)

      if (cosAngle >= cosLimit) {
        drawer(canvas, cosAngle, vLen, x, y)
        //      canvas.set(x, y, color)
      }
    }
  }
}

export function drawPie (
  x0,
  y0,
  x1,
  y1,
  radius,
  canvas,
  spreadDeg = 22.5,
  color = 1
) {
  drawPieBase(
    x0,
    y0,
    x1,
    y1,
    radius,
    canvas,
    (canvas, cosAngle, vLen, x, y) => {
      canvas.set(x, y, color)
    },
    spreadDeg
  )
}

export function drawPie2 (
  x0,
  y0,
  x1,
  y1,
  radius,
  canvas,
  spread = 22.5,
  narrowSpread = 8
) {
  const narrowLimit = Math.cos((narrowSpread * Math.PI) / 180)
  //  const spreadLimit = Math.cos((spread * Math.PI) / 180)
  drawPieBase(
    x0,
    y0,
    x1,
    y1,
    radius,
    canvas,
    (canvas, cosAngle, vLen, x, y) => {
      if (cosAngle > narrowLimit) {
        canvas.set(x, y, 2)
      } //if (cosAngle > spreadLimit)
      else {
        canvas.set(x, y, 1)
      }
    },
    spread
  )
}

/*
    function createPieSegment (
    sourceX,
    sourceY,
    directionX,
    directionY,
    radius,
    spreadDeg,
    canvas,
    narrowSpread = 8,
  ) {
    let mask = 0n

    // Normalize direction
    const dLen = Math.hypot(directionX, directionY)
    if (dLen === 0) return 0n

    const dxDir = directionX / dLen
    const dyDir = directionY / dLen

    const cosLimit = Math.cos((spreadDeg * Math.PI) / 180)
    const r2 = radius * radius

    // Bounding box (tight)
    const { minY, maxY, minX, maxX } = pieBounds(sourceX, radius, sourceY, canvas )

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - sourceX
        const dy = y - sourceY

        const dist2 = dx * dx + dy * dy
        if (dist2 === 0 || dist2 > r2) continue

        const invLen = 1 / Math.sqrt(dist2)
        const nx = dx * invLen
        const ny = dy * invLen

        const dot = nx * dxDir + ny * dyDir
        if (dot < cosLimit) continue

        mask |= 1n << BigInt(y * canvas.width + x)
      }
    }

    return mask
  }

  function getPieSegmentCells (x1, y1, x2, y2, radius = 4, spreadDeg = 22.5) {
  const cells = []

  // Compute the main direction angle
  const angle = Math.atan2(y2 - y1, x2 - x1)

  const spread = (spreadDeg * Math.PI) / 180 // convert to radians
  const halfSpread = spread // ±spreadDeg
  const narrowSpread = (8 * Math.PI) / 180

  // Bounding box to limit checks
  const minX = Math.floor(x1 - radius)
  const maxX = Math.ceil(x1 + radius)
  const minY = Math.floor(y1 - radius)
  const maxY = Math.ceil(y1 + radius)

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - x1
      const dy = y - y1
      const dist = Math.hypot(dx, dy)

      if (dist > radius) continue // outside circle

      const cellAngle = Math.atan2(dy, dx)
      let delta = cellAngle - angle

      // Normalize to [-PI, PI]
      delta = Math.abs(((delta + Math.PI) % (2 * Math.PI)) - Math.PI)
      if (delta <= narrowSpread) {
        cells.push([x, y, 2])
      } else if (delta <= halfSpread) {
        cells.push([x, y, 1])
      }
    }
}
  }
*/

function pieBounds (sourceX, radius, sourceY, canvas) {
  const minX = Math.max(0, sourceX - radius)
  const maxX = Math.min(canvas.width - 1, sourceX + radius)
  const minY = Math.max(0, sourceY - radius)
  const maxY = Math.min(canvas.height - 1, sourceY + radius)
  return { minY, maxY, minX, maxX }
}
