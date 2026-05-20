import { MaskHex } from '../../grid/hexagon/maskHex.js'
import { drawHex, hexToPixel, pixelToHex } from './hexdrawhelper.js'
import { DrawBase } from '../drawBase.js'
import { BigOne } from '../../grid/bitStore/helpers/bigbits.js'

/**
 * HexDraw - Interactive hexagonal grid renderer
 *
 * Manages rendering and interaction for hexagonal grid layouts with:
 * - Canvas-based hexagon drawing
 * - Mouse event handling (hover, click) with hex-specific hit testing
 * - Bit manipulation for cell state
 * - Cube coordinate system for hex math
 * - Real-time visual feedback with color coding
 *
 * Color Scheme:
 * - Green (#4caf50): Set/filled hexagons
 * - Blue (#2196F3): Unset/empty hexagons
 * - Orange (#FF9800): Hover indication
 *
 * @class HexDraw
 * @extends {DrawBase}
 */
export class HexDraw extends DrawBase {
  /**
   * Initialize a hexagonal grid drawer
   *
   * Creates a hexagonal grid visualization with the specified dimensions
   * and positioning. The hexagon grid uses cube coordinates (q, r, s) for
   * efficient hex math operations.
   *
   * @param {string} canvasId - ID of the canvas element to render to
   * @param {number} [radius=3] - Radius of the hexagonal grid in hexes
   * @param {number} [offsetX=300] - X offset for grid positioning on canvas
   * @param {number} [offsetY=300] - Y offset for grid positioning on canvas
   * @param {number} [hexSize=25] - Size (distance from center to vertex) in pixels
   * @throws {Error} If canvas element not found or context unavailable
   */
  constructor (
    canvasId,
    radius = 3,
    offsetX = 300,
    offsetY = 300,
    hexSize = 25
  ) {
    const mask = new MaskHex(radius)
    super(canvasId, mask, hexSize, offsetX, offsetY)

    /** @type {MaskHex} */
    this.mask = mask
    /** @type {*} */
    this.indexer = this.mask.indexer
    /** @type {number} */
    this.radius = radius
    /** @type {number} */
    this.hexSize = hexSize

    /** @type {bigint} */
    this.bits = 0n
  }

  /**
   * Set the bits to display on the hexagon grid
   *
   * Updates the internal bit representation and triggers a full redraw
   * of the canvas with the new state.
   *
   * @param {bigint} bits - Bit mask where each bit position corresponds to a hex cell
   * @returns {void}
   */
  setBits (bits) {
    this.bits = bits
    this.redraw()
  }

  /**
   * Set bits from an array of grid coordinates
   *
   * Converts grid coordinates (cube coordinates: q, r, s) to bit representation
   * and updates the display.
   *
   * @param {Array<Array<number>>} coords - List of [q, r, s] cube coordinate triplets
   * @returns {void}
   */
  setBitsFromCoords (coords) {
    this.mask.fromCoords(coords)
    this.bits = this.mask.bits
    this.redraw()
  }

  /**
   * Clear all hexagon bits to zero
   *
   * Resets the entire grid to an empty state and redraws the canvas.
   *
   * @returns {void}
   */
  clear () {
    this.bits = 0n
    this.redraw()
  }

  // ============================================================================
  // Grid Drawing
  // ============================================================================

  /**
   * Draw all hexagons in the grid
   *
   * Iterates through all valid hex positions and renders them
   * with appropriate colors based on their bit state.
   *
   * @returns {void}
   * @protected
   */
  _drawGrid () {
    const indexerCoords = /** @type {any} */ (this.indexer).coords
    const indexerSize = indexerCoords?.length ?? 0
    for (let i = 0; i < indexerSize; i++) {
      this._drawHexAtIndex(i)
    }
  }

  /**
   * Draw a single hexagon at the given index
   *
   * Retrieves the cube coordinates for the hex at the specified index
   * and renders it with the appropriate color based on bit state.
   *
   * @param {number} index - Index of the hexagon in the grid
   * @returns {void}
   * @private
   */
  _drawHexAtIndex (index) {
    const indexerCoords = /** @type {any} */ (this.indexer).coords
    const [q, r] = indexerCoords[index]
    const color = this._getHexColorForIndex(index)
    this._drawHexCell(q, r, color)
  }

  /**
   * Determine hexagon fill color based on bit state
   *
   * Returns green for set (1) bits and blue for unset (0) bits.
   *
   * @param {number} index - Hexagon index to check
   * @returns {string} Hex color string for rendering
   * @private
   */
  _getHexColorForIndex (index) {
    const isSet = this._isBitSet(index)
    return isSet ? '#4caf50' : '#2196F3'
  }

  /**
   * Check whether a bit is set for a given hexagon index
   *
   * Tests a specific bit position in the bit field to determine
   * if that hexagon cell should appear as "filled" or "set".
   *
   * @param {number} index - Hexagon index to test
   * @returns {boolean} True if bit is set (1), false if unset (0)
   * @private
   */
  _isBitSet (index) {
    return ((this.bits >> BigInt(index)) & 1n) === 1n
  }

  /**
   * Render a single hexagon cell on the canvas
   *
   * Calculates pixel coordinates from cube coordinates and invokes
   * the drawing helper to render the hexagon with appropriate color
   * and stroke styling.
   *
   * @param {number} q - First cube coordinate
   * @param {number} r - Second cube coordinate
   * @param {string} [color='#4caf50'] - Fill color as CSS color string
   * @param {string} [strokeColor='#333'] - Stroke color as CSS color string
   * @returns {void}
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
   * Draw the hover hexagon highlight if one is active
   *
   * Renders the hovered hexagon with its special hover color to provide
   * visual feedback to the user. Only draws if hoverLocation is set.
   *
   * @returns {void}
   * @protected
   */
  _drawHover () {
    if (this.hoverLocation !== null) {
      this._drawHoverCell()
    }
  }

  /**
   * Render the hover hexagon at current location
   *
   * Draws the hexagon at the current hover location with the orange
   * hover color to indicate visual selection.
   *
   * @returns {void}
   * @private
   */
  _drawHoverCell () {
    const indexerCoords = /** @type {any} */ (this.indexer).coords
    const [q, r] = indexerCoords[this.hoverLocation]
    this._drawHexCell(q, r, '#FF9800')
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Toggle the bit state of a hexagon cell
   *
   * Flips the bit at the specified index (0→1 or 1→0) and redraws
   * the canvas. If index is null, performs no operation.
   *
   * @param {number|null} index - Hexagon index to toggle, or null for no-op
   * @returns {void}
   */
  toggleCell (index) {
    if (index !== null) {
      this._toggleBitAtIndex(index)
    }
  }

  /**
   * Toggle the bit at a specific index
   *
   * Uses XOR operation with a single-bit mask to flip the target bit,
   * then triggers a redraw to reflect the state change.
   *
   * @param {number} index - Hexagon index to toggle
   * @returns {void}
   * @private
   */
  _toggleBitAtIndex (index) {
    this.bits ^= BigOne.bitMaskByPos(index)
    this.redraw()
  }

  // ============================================================================
  // Mouse Event Handling - Hex-specific Hit Testing
  // ============================================================================

  /**
   * Find hexagon index from pixel coordinates using hit testing
   *
   * Converts pixel coordinates to cube coordinates and validates
   * that they fall within the hexagonal grid bounds. Returns the
   * corresponding hexagon index or null if outside grid.
   *
   * @param {number} px - Pixel X coordinate
   * @param {number} py - Pixel Y coordinate
   * @returns {number|null} Hexagon index if hit, null if miss
   * @protected
   */
  _hitTest (px, py) {
    const cubeCoords = pixelToHex(
      px,
      py,
      this.hexSize,
      this.offsetX,
      this.offsetY
    )
    return this._findHexIndex(cubeCoords)
  }

  /**
   * Find hexagon index from cube coordinates
   *
   * Looks up the hexagon index corresponding to the given cube
   * coordinates using the indexer's lookup map.
   *
   * @param {Array<number>} cubeCoords - [q, r, s] cube coordinates
   * @returns {number|null} Hexagon index if found, null otherwise
   * @private
   */
  _findHexIndex (cubeCoords) {
    const [q, r, s] = cubeCoords
    const qrsToI = /** @type {any} */ (this.indexer).qrsToI
    const i = qrsToI?.get(`${q},${r},${s}`)
    return i ?? null
  }

  // ============================================================================
  // Utility Accessors
  // ============================================================================

  /**
   * Get indexed coordinates of the mask
   *
   * Returns the coordinate array containing cube coordinate pairs
   * for all hexagons in the grid.
   *
   * @returns {Array<Array<number>>} Array of [q, r] coordinate pairs
   */
  get coords () {
    return /** @type {any} */ (this.indexer).coords
  }

  /**
   * Generator: yields bit indices for the current bits
   *
   * Iterates over all bit positions that are set (1) in the
   * current bit field, yielding each index in order.
   *
   * @generator
   * @yields {number} Index of each set bit
   */
  *bitsIndices () {
    const bitsIndices = /** @type {any} */ (this.indexer).bitsIndices
    if (bitsIndices) {
      yield* bitsIndices.call(this.indexer, this.bits)
    }
  }

  /**
   * Generator: yields bit keys (cube coordinates) for the current bits
   *
   * Iterates over all set bits and yields their corresponding
   * cube coordinates as [q, r, s] triplets.
   *
   * @generator
   * @yields {Array<number>} Cube coordinate triplet [q, r, s] for each set bit
   */
  *bitKeys () {
    const bitKeys = /** @type {any} */ (this.indexer).bitKeys
    if (bitKeys) {
      yield* bitKeys.call(this.indexer, this.bits)
    }
  }
}
