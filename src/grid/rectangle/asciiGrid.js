import { GridBase } from '../gridBase.js'
import { RectangleShape } from './RectangleShape.js'
import { AsciiRepresentation } from '../AsciiRepresentation.js'

/**
 * ASCII string-based grid with newline-separated rows.
 * Stores grid state as a string where each row is separated by '\n'.
 * Cells are represented as characters: fillChar for empty, '#' for set (color=1).
 *
 * The string format: 'row1\nrow2\nrow3' accounts for newlines in index calculations.
 * This allows direct string manipulation while maintaining coordinate semantics.
 *
 * @extends GridBase
 * @class AsciiGrid
 */
export class AsciiGrid extends GridBase {
  /**
   * Width stride (column count + 1 for newline character).
   * Used in index calculation since each row includes a trailing newline.
   *
   * @type {number}
   */
  #rowStride

  /**
   * Creates a new ASCII grid with given dimensions and optional initial content.
   *
   * @param {number} width - Grid width in cells (columns)
   * @param {number} height - Grid height in cells (rows)
   * @param {string|null} [ascii=null] - Initial ASCII string content.
   *   If null, grid is initialized empty using fillChar.
   * @param {string} [fillChar='.'] - Character for empty cells
   *
   * @example
   * const grid = new AsciiGrid(5, 3);
   * // Creates 5x3 grid filled with '.'
   *
   * @example
   * const custom = new AsciiGrid(5, 3, null, ' ');
   * // Creates 5x3 grid filled with spaces
   */
  constructor (width, height, ascii = null, fillChar = '.') {
    super(RectangleShape(width, height))
    this.fillChar = fillChar
    this.string = ascii || buildAsciiString(fillChar, width, height)
    this.#rowStride = width + 1 // +1 for newline
  }

  /**
   * Calculates linear index for 2D coordinates, accounting for newlines.
   * Formula: y * (width + 1) + x, where +1 is for the newline character at row end.
   *
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {number} Linear index in the string
   */
  index (x, y) {
    return y * this.#rowStride + x
  }

  /**
   * Retrieves the character at the given coordinates.
   *
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {string} Single character at [x, y]
   */
  at (x, y) {
    const idx = this.index(x, y)
    return this.string.charAt(idx)
  }

  /**
   * Sets a cell value at the given coordinates.
   * Sets the character to '#' if color is truthy, otherwise fillChar.
   *
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @param {number|boolean} [color=1] - Truthy sets to '#', falsy to fillChar
   * @returns {void}
   */
  set (x, y, color = 1) {
    const idx = this.index(x, y)
    const char = this.#cellCharacter(color)
    this.string = this.#replaceCharacterAt(idx, char)
  }

  /**
   * Creates a new grid with the same dimensions and fillChar,
   * but initialized to empty state (all cells = '.').
   *
   * @returns {AsciiGrid}
   */
  get empty () {
    return this.#createGridWithFill('.')
  }

  /**
   * Creates a new grid with the same dimensions and fillChar,
   * but initialized to full state (all cells = '#').
   *
   * @returns {AsciiGrid}
   */
  get full () {
    return this.#createGridWithFill('#')
  }

  /**
   * Factory method for creating a new grid with consistent dimensions but different fill.
   * Eliminates duplication between empty and full getters.
   *
   * @param {string} fillCharacter - Character to fill all cells with
   * @returns {AsciiGrid} New grid with given fill character
   */
  #createGridWithFill (fillCharacter) {
    const grid = new AsciiGrid(this.width, this.height, null, this.fillChar)
    grid.string = buildAsciiString(fillCharacter, this.width, this.height)
    return grid
  }

  /**
   * Returns the raw string representation.
   * Direct access to underlying ASCII format (rows separated by '\n').
   *
   * @returns {string}
   */
  get toAscii () {
    return this.string
  }

  /**
   * Converts grid to ASCII using custom symbol mappings via AsciiRepresentation.
   * Allows different visual representations of the same grid state.
   *
   * @param {Object} [symbols=AsciiRepresentation.defaultSymbols] - Custom symbol map
   * @returns {string} ASCII string with custom symbols
   *
   * @example
   * const ascii = grid.toAsciiWith({ empty: ' ', full: '█' });
   */
  toAsciiWith (symbols = AsciiRepresentation.defaultSymbols) {
    const repr = new AsciiRepresentation(this)
    return repr.toAsciiWith(symbols)
  }

  /**
   * Counts the number of non-empty cells (excluding fillChar and newlines).
   * Useful for determining grid occupancy/density.
   *
   * @returns {number}
   */
  get occupancy () {
    return [...this.string].filter(c => this.#isOccupiedCharacter(c)).length
  }

  /**
   * Maximum valid linear index (size - 1).
   * For a grid with stride = width + 1, last valid index is (width + 1) * height - 1.
   *
   * @type {number}
   */
  get indexMax () {
    return this.#rowStride * this.height - 1
  }

  /**
   * Width stride: the number of characters per row including the newline.
   * Overrides parent's columnStride which only returns width.
   *
   * @type {number}
   */
  get columnStride () {
    return this.#rowStride
  }

  /**
   * Creates an AsciiGrid from a mask object.
   * Iterates mask.occupiedLocationsAndValues() and copies set cells to the new grid.
   *
   * @static
   * @param {Object} mask - Mask object with width, height, and occupiedLocationsAndValues() method
   * @param {string} [fillChar='.'] - Character for empty cells
   * @returns {AsciiGrid} New grid populated from mask data
   *
   * @example
   * const grid = AsciiGrid.fromMask(myMask);
   */
  static fromMask (mask, fillChar = '.') {
    const grid = new AsciiGrid(mask.width, mask.height, null, fillChar)
    for (const [x, y, color] of mask.occupiedLocationsAndValues()) {
      grid.set(x, y, color)
    }
    return grid
  }

  /**
   * Convert an input color into its character representation.
   * @param {number|boolean} color - Color value to map
   * @returns {string} Character used for that color
   */
  #cellCharacter (color) {
    return color ? '#' : this.fillChar
  }

  /**
   * Replace a character at a specific linear index in the ASCII string.
   * @param {number} index - Linear index in the ASCII string
   * @param {string} char - Character to write
   * @returns {string} New ASCII string with the replacement
   */
  #replaceCharacterAt (index, char) {
    return (
      this.string.substring(0, index) + char + this.string.substring(index + 1)
    )
  }

  /**
   * Determine whether a character represents an occupied cell.
   * @param {string} char - Single character from the ASCII grid string
   * @returns {boolean}
   */
  #isOccupiedCharacter (char) {
    return char !== this.fillChar && char !== '\n'
  }
}

/**
 * Utility function to generate a filled ASCII grid string.
 * Creates a rectangular string with newlines, e.g.:
 *   '....\n....\n....' for a 4x3 grid
 *
 * @param {string} fillChar - Character to repeat
 * @param {number} width - Grid width (columns per row)
 * @param {number} height - Grid height (number of rows)
 * @returns {string} Multi-line ASCII string representation
 * @private
 */
function buildAsciiString (fillChar, width, height) {
  const row = fillChar.repeat(width)
  return Array.from({ length: height }, () => row).join('\n')
}
