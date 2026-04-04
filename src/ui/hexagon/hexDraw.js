import { MaskHex } from '../../grid/hexagon/maskHex.js'
import { drawHex, hexToPixel } from './hexdrawhelper.js'
import { DrawBase } from '../drawBase.js'

export class HexDraw extends DrawBase {
  constructor (
    canvasId,
    radius = 3,
    offsetX = 300,
    offsetY = 300,
    hexSize = 25
  ) {
    const mask = new MaskHex(radius)
    super(canvasId, mask, hexSize, offsetX, offsetY)

    this.mask = mask
    this.indexer = this.mask.indexer
    this.radius = radius
    this.hexSize = hexSize

    // Current bits being displayed (for drawing the shape)
    this.bits = 0n
  }

  /**
   * Set the bits to display on the hexagon grid
   */
  setBits (bits) {
    this.bits = bits
    this.redraw()
  }

  /**
   * Set bits from array of coordinates
   */
  setBitsFromCoords (coords) {
    this.mask.fromCoords(coords)
    this.bits = this.mask.bits
    this.redraw()
  }

  /**
   * Clear all bits
   */
  clear () {
    this.bits = 0n
    this.redraw()
  }

  /**
   * Main redraw function - coordinate override not needed
   */
  redraw () {
    this.clearCanvas()
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

  // ============================================================================
  // Grid Drawing
  // ============================================================================

  /**
   * Draw all hexes with color coding: set=green, unset=blue
   * @private
   */
  _drawGrid () {
    for (let i = 0; i < this.indexer.size; i++) {
      this._drawHexAtIndex(i)
    }
  }

  /**
   * Draw a single hex at the given index
   * @private
   */
  _drawHexAtIndex (index) {
    const [q, r] = this.indexer.coords[index]
    const color = this._getHexColorForIndex(index)
    this._drawHexCell(q, r, color)
  }

  /**
   * Determine hex color based on bit state
   * @private
   */
  _getHexColorForIndex (index) {
    const isSet = this._isBitSet(index)
    return isSet ? '#4caf50' : '#2196F3' // green for set, blue for unset
  }

  /**
   * Check if a bit at index is set
   * @private
   */
  _isBitSet (index) {
    return ((this.bits >> BigInt(index)) & 1n) === 1n
  }

  /**
   * Draw a hex cell at cube coordinates
   * @private
   */
  _drawHexCell (q, r, color = '#4caf50', strokeColor = '#333') {
    const { x, y } = hexToPixel(q, r, this.hexSize)
    drawHex(
      this.ctx,
      x + this.offsetX,
      y + this.offsetY,
      this.hexSize,
      color,
      strokeColor
    )
  }

  // ============================================================================
  // Hover Rendering
  // ============================================================================

  /**
   * Draw the hover hex if one is selected
   * @private
   */
  _drawHover () {
    if (this.hoverLocation !== null) {
      this._drawHoverCell()
    }
  }

  /**
   * Render the hover hex at current location
   * @private
   */
  _drawHoverCell () {
    const [q, r] = this.indexer.coords[this.hoverLocation]
    this._drawHexCell(q, r, '#FF9800') // orange for hover
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Toggle a hex on/off by index
   */
  toggleCell (index) {
    if (index !== null) {
      this._toggleBitAtIndex(index)
    }
  }

  /**
   * Toggle bit at index and redraw
   * @private
   */
  _toggleBitAtIndex (index) {
    const mask = 1n << BigInt(index)
    this.bits ^= mask
    this.redraw()
  }

  // ============================================================================
  // Mouse Event Handling - Hex-specific Hit Testing
  // ============================================================================

  /**
   * Override base class - uses hex-specific hit test
   */
  _bindMouseEvents () {
    this.canvas.addEventListener('mousemove', e => {
      const { x, y } = this.getCanvasMouseCoords(e)
      const hit = this._hitTest(x, y)
      this.redrawWithHover(hit)
    })

    this.canvas.addEventListener('mouseleave', () => {
      this.redrawWithHover(null)
    })

    this.canvas.addEventListener('click', e => {
      const { x, y } = this.getCanvasMouseCoords(e)
      const hit = this._hitTest(x, y)
      this.toggleCell(hit)
    })
  }

  /**
   * Hit test to find which hex is at the given pixel coordinates
   * @private
   */
  _hitTest (px, py) {
    const cubeCoords = this._pixelToCubeCoords(px, py)
    return this._findHexIndex(cubeCoords)
  }

  /**
   * Convert pixel coordinates to cube coordinates
   * @private
   */
  _pixelToCubeCoords (px, py) {
    const x = px - this.offsetX
    const y = py - this.offsetY
    const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / this.hexSize
    const r = ((2 / 3) * y) / this.hexSize
    const s = -q - r
    return this._roundCubeCoords(q, r, s)
  }

  /**
   * Round pixel coordinates to nearest cube coordinates
   * @private
   */
  _roundCubeCoords (q, r, s) {
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
   * Find hex index from cube coordinates
   * @private
   */
  _findHexIndex (cubeCoords) {
    const [q, r, s] = cubeCoords
    const i = this.indexer.qrsToI.get(`${q},${r},${s}`)
    return i !== undefined ? i : null
  }

  // ============================================================================
  // Utility Accessors
  // ============================================================================

  /**
   * Get indexed coordinates of the mask
   */
  get coords () {
    return this.indexer.coords
  }

  /**
   * Get bit indices for the current bits
   */
  *bitsIndices () {
    yield* this.indexer.bitsIndices(this.bits)
  }

  /**
   * Get bit keys (cube coordinates) for the current bits
   */
  *bitKeys () {
    yield* this.indexer.bitKeys(this.bits)
  }

  // ============================================================================
  // Backwards Compatibility - Legacy method names
  // ============================================================================

  /**
   * Legacy method name for pixel to cube conversion
   * @private
   */
  _pixelToHex (x, y) {
    return this._pixelToCubeCoords(x, y)
  }

  /**
   * Legacy method name for cube coordinate rounding
   * @private
   */
  _cubeRound (q, r, s) {
    return this._roundCubeCoords(q, r, s)
  }
}
