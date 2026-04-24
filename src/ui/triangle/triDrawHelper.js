const SQRT_THREE_OVER_TWO = Math.sqrt(3) / 2

/**
 * Draw a triangle with a fixed orientation.
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context.
 * @param {number} cx - Center x coordinate.
 * @param {number} cy - Center y coordinate.
 * @param {number} size - Triangle side length.
 * @param {string} fill - Fill color.
 * @param {string} [stroke='#333'] - Stroke color.
 * @param {'up'|'down'} [orientation='up'] - Triangle orientation.
 */
export function drawTri (
  ctx,
  cx,
  cy,
  size,
  fill,
  stroke = '#333',
  orientation = 'up'
) {
  const height = triangleHeight(size)
  const [y0, y1] = _getTriangleVerticalCoordinates(cy, height, orientation)

  ctx.beginPath()
  ctx.moveTo(cx, y0)
  ctx.lineTo(cx - size / 2, y1)
  ctx.lineTo(cx + size / 2, y1)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.stroke()
}

/**
 * Convert triangle grid coordinates to pixel coordinates.
 * @param {number} row - Triangle row index.
 * @param {number} column - Triangle column index.
 * @param {number} size - Triangle side length.
 * @returns {{x:number,y:number}}
 */
export function triToPixel (row, column, size) {
  const height = triangleHeight(size)
  return {
    x: (column - row) * (size / 2),
    y: row * height
  }
}

/**
 * Convert pixel coordinates to triangle grid coordinates.
 * @param {number} x - Pixel x coordinate.
 * @param {number} y - Pixel y coordinate.
 * @param {number} size - Triangle side length.
 * @returns {[number, number]} [row, column]
 */
export function pixelToTri (x, y, size) {
  const height = triangleHeight(size)
  const row = Math.round(y / height)
  const column = Math.round(x / (size / 2) + row)
  return [row, column]
}

/**
 * Compute the height of an equilateral triangle.
 * @param {number} size - Triangle side length.
 * @returns {number}
 */
export function triangleHeight (size) {
  return size * SQRT_THREE_OVER_TWO
}

/**
 * Compute top and base y coordinates for drawing a triangle.
 * @param {number} cy - Vertical center coordinate.
 * @param {number} height - Triangle height.
 * @param {'up'|'down'} orientation - Triangle orientation.
 * @returns {[number, number]} [tipY, baseY]
 * @private
 */
function _getTriangleVerticalCoordinates (cy, height, orientation) {
  if (orientation === 'up') {
    return [cy - (2 * height) / 3, cy + height / 3]
  }
  return [cy + (2 * height) / 3, cy - height / 3]
}
