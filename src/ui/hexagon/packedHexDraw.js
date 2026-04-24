import { PackedHex } from '../../grid/hexagon/packedHex.js'
import { drawHex, hexToPixel, pixelToHex } from './hexdrawhelper.js'
import { DrawBase } from '../drawBase.js'

/**
 * Interactive packed hex grid drawer for PackedHex class
 * Supports multi-bit hex cells with value cycling
 * Color intensity based on cell value
 */
export class PackedHexDraw extends DrawBase {
  constructor (
    canvasId,
    radius = 3,
    offsetX = 300,
    offsetY = 300,
    hexSize = 25,
    depth = 4
  ) {
    const packedHex = new PackedHex(radius, undefined, undefined, depth)
    super(canvasId, packedHex, hexSize, offsetX, offsetY)

    this.packedHex = packedHex
    this.indexer = this.packedHex.indexer
    this.radius = radius
    this.hexSize = hexSize
    this.depth = depth
    // depth counts values, not bits
    this.maxValue = depth - 1
  }

  /**
   * Set hex value at cube coordinates
   */
  setHexValue (q, r, s, value) {
    this.packedHex.set(q, r, s, value)
    this.redraw()
  }

  /**
   * Get hex value at cube coordinates
   */
  getHexValue (q, r, s) {
    return this.packedHex.at(q, r, s)
  }

  /**
   * Set values from array of coordinates
   * Format: [[q, r, s, value], ...]
   */
  setBitsFromCoords (coords) {
    for (const coord of coords) {
      const [q, r, s, value = this.maxValue] = coord
      if (this.indexer.index(q, r, s) !== undefined) {
        this.packedHex.set(q, r, s, value)
      }
    }
    this.redraw()
  }

  /**
   * Clear all hex values
   */
  clear () {
    this.packedHex.bits = this.packedHex.store.empty
    this.redraw()
  }

  /**
   * Main redraw function
   */
  redraw () {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this._drawGrid()
    this._drawHover()
  }

  /**
   * Redraw with hover state (called on mousemove)
   */
  redrawWithHover (hoverIndex = null) {
    this.hoverLocation = hoverIndex
    this.redraw()
  }

  /**
   * Draw all hexes with color coding based on value
   * @private
   */
  _drawGrid () {
    for (let i = 0; i < this.indexer.size; i++) {
      const [q, r] = this.indexer.coords[i]
      const { x, y } = hexToPixel(q, r, this.hexSize)
      const value = this.packedHex.at(q, r, -q - r)
      const color = this._valueToColor(value)
      drawHex(this.ctx, x + this.offsetX, y + this.offsetY, this.hexSize, color)
    }
  }

  /**
   * Convert cell value to color (intensity gradient)
   * 0=blue, max=green. Override in subclass for custom colors.
   * @private
   */
  _valueToColor (value) {
    if (value === 0) {
      return '#2196F3' // blue for empty
    }
    const intensity = Math.round((value / this.maxValue) * 255)
    const green = Math.round(intensity * 0.8)
    const red = Math.round(intensity * 0.3)
    return `rgb(${red}, ${green}, 50)`
  }

  /**
   * Draw the hover hex if one is selected
   * @private
   */
  _drawHover () {
    if (this.hoverLocation !== null) {
      const [q, r] = this.indexer.coords[this.hoverLocation]
      const { x, y } = hexToPixel(q, r, this.hexSize)
      drawHex(
        this.ctx,
        x + this.offsetX,
        y + this.offsetY,
        this.hexSize,
        '#FF9800' // orange for hover
      )
    }
  }

  /**
   * Cycle hex value on click (0 -> 1 -> ... -> max -> 0)
   */
  toggleCell (index) {
    if (index !== null) {
      const [q, r] = this.indexer.coords[index]
      const s = -q - r
      const current = this.packedHex.at(q, r, s)
      const next = (current + 1) % (this.maxValue + 1)
      this.packedHex.set(q, r, s, next)
      this.redraw()
    }
  }

  /**
   * Override base class - uses hex-specific hit test
   */
  _bindMouseEvents () {
    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect()
      const hit = this._hitTest(e.clientX - rect.left, e.clientY - rect.top)
      this.redrawWithHover(hit)
    })

    this.canvas.addEventListener('mouseleave', () => {
      this.redrawWithHover(null)
    })

    this.canvas.addEventListener('click', e => {
      const rect = this.canvas.getBoundingClientRect()
      const hit = this._hitTest(e.clientX - rect.left, e.clientY - rect.top)
      this.toggleCell(hit)
    })
  }

  /**
   * Hit test to find which hex is at the given pixel coordinates
   * @private
   */
  _hitTest (px, py) {
    const [q, r, s] = pixelToHex(
      px,
      py,
      this.hexSize,
      this.offsetX,
      this.offsetY
    )
    const i = this.indexer.qrsToI.get(`${q},${r},${s}`)
    return i !== undefined ? i : null
  }

  /**
   * Convert pixel coordinates to cube coordinates
   * @private
   */
  _pixelToHex (x, y) {
    const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / this.hexSize
    const r = ((2 / 3) * y) / this.hexSize
    return this._cubeRound(q, r, -q - r)
  }

  /**
   * Round pixel coordinates to nearest cube coordinates
   * @private
   */
  _cubeRound (q, r, s) {
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
   * Convert pixel coordinates to cube coordinates
   * @private
   */
  _pixelToHex (x, y) {
    const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / this.hexSize
    const r = ((2 / 3) * y) / this.hexSize
    return this._cubeRound(q, r, -q - r)
  }

  /**
   * Round pixel coordinates to nearest cube coordinates
   * @private
   */
  _cubeRound (q, r, s) {
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
   * Get indexed coordinates of the hex mask
   */
  get coords () {
    return this.indexer.coords
  }

  /**
   * Get bit indices for the current packed bits
   */
  *bitsIndices () {
    yield* this.indexer.bitsIndices(this.packedHex.bits)
  }

  /**
   * Get bit keys (cube coordinates) for the current packed bits
   */
  *bitKeys () {
    yield* this.indexer.bitKeys(this.packedHex.bits)
  }
}
