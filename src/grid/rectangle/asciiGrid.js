import { GridBase } from '../gridBase.js'
import { RectangleShape } from './RectangleShape.js'
import { AsciiRepresentation } from '../AsciiRepresentation.js'

/**
 * Symbol representation mapping for grid display.
 * For simple empty/full representation, use two-element array: [emptyChar, fullChar]
 * For multi-value grids, use longer array mapping each value to a character.
 * @typedef {Array<string>} SymbolMap
 */

/**
 * Mask-like object interface for grid compatibility.
 * Any object providing these properties and methods can be used as a grid-like mask.
 * @typedef {Object} MaskLike
 * @property {number} width - Grid width in cells (positive integer, immutable)
 * @property {number} height - Grid height in cells (positive integer, immutable)
 * @property {Function} occupiedLocationsAndValues - Generator/iterator yielding [x, y, color] tuples for all non-empty cells
 */

/**
 * ASCII string-based grid with newline-separated rows.
 *
 * Stores grid state as a string where each row is separated by '\n'.
 * Cells are represented as characters: fillChar for empty cells, '#' for occupied/set cells.
 *
 * String Format: 'row1\nrow2\nrow3' where newlines are included in index calculations.
 * This allows direct string manipulation while maintaining 2D coordinate semantics.
 * Each row is (width) characters followed by a newline, except the last row.
 *
 * Index Calculation: For coordinate (x, y), linear index = y * (width + 1) + x
 * The +1 accounts for newline character at the end of each row.
 *
 * Useful for: Simple grid visualization, text-based game boards, ASCII art rendering,
 * memory-efficient grid storage as immutable strings.
 *
 * @extends GridBase
 * @class AsciiGrid
 * @example
 * const grid = new AsciiGrid(5, 3);
 * // Creates 5-wide, 3-tall grid filled with '.'
 * // Internal representation: '.....\n.....\n.....' (14 chars + 2 newlines)
 */
export class AsciiGrid extends GridBase {
  /**
   * Width stride (column count + 1 for newline character).
   * Used in index calculation since each row includes a trailing newline.
   * Formula: rowStride = width + 1 (the +1 is for the newline character)
   *
   * @type {number}
   */
  #rowStride

  /**
   * Creates a new ASCII grid with given dimensions and optional initial content.
   *
   * Initializes an ASCII-based rectangular grid. If no initial ASCII string is provided,
   * the grid is filled with the specified fillChar character. The resulting internal
   * string uses newlines to separate rows, with a row stride of (width + 1).
   *
   * @param {number} width - Grid width in cells/columns (must be positive integer)
   * @param {number} height - Grid height in cells/rows (must be positive integer)
   * @param {string|null} [ascii=null] - Optional pre-built ASCII string to use as initial content.
   *   If null, a new grid is built using fillChar. Must have correct format with newlines.
   * @param {string} [fillChar='.'] - Character used for empty/unset cells throughout the grid.
   *   Typically a visible character like '.' or ' ' (space).
   * @throws {Error} If width or height is not a positive integer
   *
   * @example
   * const grid = new AsciiGrid(5, 3);
   * // Creates 5x3 grid filled with '.'
   * // String: '.....\\n.....\\n.....' (newlines included)
   *
   * @example
   * const custom = new AsciiGrid(5, 3, null, ' ');
   * // Creates 5x3 grid filled with spaces
   * // String: '     \\n     \\n     '
   */
  constructor (width, height, ascii = null, fillChar = '.') {
    super(RectangleShape(width, height))
    this.fillChar = fillChar
    this.string = ascii || buildAsciiString(fillChar, width, height)
    this.#rowStride = width + 1 // +1 for newline
  }

  /**
   * Calculates linear index for 2D coordinates, accounting for newline characters.
   *
   * Converts (x, y) grid coordinates to a linear position in the internal ASCII string.
   * Each row occupies (width + 1) characters due to the trailing newline.
   * Formula: index = y * (width + 1) + x
   *
   * @param {number} x - Column coordinate (0-based, should be in [0, width))
   * @param {number} y - Row coordinate (0-based, should be in [0, height))
   * @returns {number} Linear position in the ASCII string (non-negative integer)
   * @example
   * const idx = grid.index(2, 1);  // Get string index for column 2, row 1
   * // On 5-wide grid: 1 * 6 + 2 = 8
   */
  index (x, y) {
    return y * this.#rowStride + x
  }

  /**
   * Retrieves the character at the given grid coordinates.
   *
   * Returns the single character at position (x, y) in the ASCII grid.
   * This character will be fillChar for empty cells or '#' for occupied cells.
   *
   * @param {number} x - Column coordinate (0-based)
   * @param {number} y - Row coordinate (0-based)
   * @returns {string} Single character at [x, y] position
   * @example
   * const char = grid.at(2, 1);  // Get cell at column 2, row 1
   * // Returns '.' or '#' depending on cell state
   */
  at (x, y) {
    const idx = this.index(x, y)
    return this.string.charAt(idx)
  }

  /**
   * Sets a cell value at the given coordinates.
   *
   * Updates the character at position (x, y) based on the color value:
   * - Truthy color (including 1, true, any positive number) → '#' (occupied)
   * - Falsy color (0, false, null, etc.) → fillChar (empty)
   *
   * Modifies the internal ASCII string by replacing the character at the calculated index.
   * This operation creates a new string (immutable pattern) rather than modifying in place.
   *
   * @param {number} x - Column coordinate (0-based)
   * @param {number} y - Row coordinate (0-based)
   * @param {number|boolean} [color=1] - Cell state; truthy sets to '#', falsy to fillChar
   * @returns {void}
   * @example
   * grid.set(2, 1);        // Sets cell to '#' (default color=1)
   * grid.set(2, 1, 5);     // Sets cell to '#' (5 is truthy)
   * grid.set(2, 1, false); // Sets cell to fillChar (false is falsy)
   */
  set (x, y, color = 1) {
    const idx = this.index(x, y)
    const char = this.#cellCharacter(color)
    this.string = this.#replaceCharacterAt(idx, char)
  }

  /**
   * Creates a new grid with the same dimensions and fillChar, but initialized empty.
   *
   * Returns a new AsciiGrid instance with all cells set to fillChar.
   * This is a convenience property for quickly clearing a grid.
   * The new grid maintains the same dimensions and fillChar as the current instance.
   *
   * @type {AsciiGrid}
   * @returns {AsciiGrid} New empty grid with same dimensions
   * @example
   * const cleared = grid.empty;  // Get new empty grid matching grid's dimensions
   */
  get empty () {
    return this.#createGridWithFill('.')
  }

  /**
   * Creates a new grid with the same dimensions and fillChar, but initialized full.
   *
   * Returns a new AsciiGrid instance with all cells set to '#' (occupied).
   * This is a convenience property for creating fully-filled grids.
   * The new grid maintains the same dimensions and fillChar as the current instance.
   *
   * @type {AsciiGrid}
   * @returns {AsciiGrid} New full grid with same dimensions
   * @example
   * const filled = grid.full;  // Get new full grid matching grid's dimensions
   */
  get full () {
    return this.#createGridWithFill('#')
  }

  /**
   * Factory method for creating a new grid with consistent dimensions but different fill.
   *
   * Internal helper method used to reduce duplication between empty and full properties.
   * Creates a new AsciiGrid with the same dimensions and fillChar, then replaces
   * the internal string with one filled using the specified fillCharacter.
   *
   * @param {string} fillCharacter - Character to fill all cells with (typically '.' or '#')
   * @returns {AsciiGrid} New grid with specified fill character for all cells
   */
  #createGridWithFill (fillCharacter) {
    const grid = new AsciiGrid(this.width, this.height, null, this.fillChar)
    grid.string = buildAsciiString(fillCharacter, this.width, this.height)
    return grid
  }

  /**
   * Returns the raw string representation of the grid.
   *
   * Direct access to the underlying ASCII format where rows are separated by '\n'.
   * The returned string can be printed directly to display the grid.
   * Format: 'row1\nrow2\nrow3' with each row being (width) characters.
   *
   * @type {string}
   * @returns {string} Raw ASCII grid string with newline separators
   * @example
   * const ascii = grid.toAscii;
   * console.log(ascii);  // Prints grid to console
   * // Output:
   * // .....
   * // .....
   * // .....
   */
  get toAscii () {
    return this.string
  }

  /**
   * Converts grid to ASCII using custom symbol mappings via AsciiRepresentation.
   *
   * Renders the grid using a custom symbol array to represent different cell values.
   * The symbols array maps numeric cell values to single-character representations.
   * For example, symbols[0] is used for empty (0), symbols[1] for occupied (1), etc.
   *
   * If no symbols are provided, uses AsciiRepresentation.defaultSymbols which maps:
   * 0→'.', 1→'1', 2→'2', ..., 9→'9', 10→'a', 11→'b', ..., 15→'f'
   *
   * This allows different visual representations of the same grid state.
   *
   * @param {Array<string>} [symbols=AsciiRepresentation.defaultSymbols] - Symbol array mapping numeric values to characters.
   *   Index i in the array is the character representation for cell value i.
   * @returns {string} ASCII string with custom symbols, rows separated by '\n'
   *
   * @example
   * const ascii = grid.toAsciiWith(['·', '#']);  // Use · for empty, # for occupied
   * // Returns string like '·····\n###··\n····· '
   *
   * @example
   * const fancy = grid.toAsciiWith([' ', '█', '▓', '░']);
   * // Use different block characters for different values
   */
  toAsciiWith (symbols = AsciiRepresentation.defaultSymbols) {
    const repr = new AsciiRepresentation(this)
    return repr.toAsciiWith(symbols)
  }

  /**
   * Counts the number of non-empty cells in the grid.
   *
   * Iterates through the internal ASCII string and counts all characters that are
   * NOT fillChar and NOT newline ('\n'). This gives the number of occupied cells.
   *
   * Useful for determining grid occupancy/density metrics.
   *
   * @type {number}
   * @returns {number} Count of occupied cells (excludes fillChar and newlines)
   * @example
   * const occupied = grid.occupancy;  // Returns number of '#' cells
   */
  get occupancy () {
    return [...this.string].filter(c => this.#isOccupiedCharacter(c)).length
  }

  /**
   * Maximum valid linear index (size - 1).
   *
   * For a grid with rowStride = (width + 1) and height rows, the last valid
   * character in the string is at index (rowStride * height - 1).
   * This accounts for all characters including newlines.
   *
   * Formula: indexMax = (width + 1) * height - 1
   *
   * @type {number}
   * @returns {number} Maximum valid index in the string (0-based)
   * @example
   * const max = grid.indexMax;  // On 5x3 grid: (5+1)*3 - 1 = 17
   */
  get indexMax () {
    return this.#rowStride * this.height - 1
  }

  /**
   * Width stride: the number of characters per row including the newline.
   *
   * Overrides parent's columnStride property which only returns width.
   * In AsciiGrid, each row takes up (width + 1) characters: width cells plus 1 newline.
   *
   * This is critical for accurate index calculations in the ASCII string.
   *
   * @type {number}
   * @returns {number} Row stride = width + 1 (includes newline character)
   */
  get columnStride () {
    return this.#rowStride
  }

  /**
   * Creates an AsciiGrid from a mask object.
   *
   * Constructs a new AsciiGrid initialized with data from a mask-like object.
   * Iterates through all occupied locations in the mask (via occupiedLocationsAndValues())
   * and sets the corresponding cells in the new grid.
   *
   * The mask can be any object with:
   * - `width` and `height` properties (grid dimensions)
   * - `occupiedLocationsAndValues()` method that yields [x, y, color] tuples
   *
   * @static
   * @param {MaskLike} mask - Mask object with grid dimensions and occupiedLocationsAndValues() iterator
   * @param {string} [fillChar='.'] - Character for empty cells in the new grid
   * @returns {AsciiGrid} New AsciiGrid populated from mask data
   *
   * @example
   * const grid = AsciiGrid.fromMask(myMask);
   * // Creates new grid matching myMask dimensions, copies all set cells
   *
   * @example
   * const grid = AsciiGrid.fromMask(myMask, ' ');
   * // Same, but uses space for empty cells instead of default '.'
   */
  static fromMask (mask, fillChar = '.') {
    const grid = new AsciiGrid(mask.width, mask.height, null, fillChar)
    for (const [x, y, color] of mask.occupiedLocationsAndValues()) {
      grid.set(x, y, color)
    }
    return grid
  }

  /**
   * Convert an input color value into its character representation.
   *
   * Maps a color value (numeric or boolean) to a grid character:
   * - Truthy colors (1, true, any positive number) → '#'
   * - Falsy colors (0, false, null, undefined, etc.) → fillChar
   *
   * Used by the set() method and other operations that need to display cell values.
   *
   * @param {number|boolean} color - Color value to map to a character
   * @returns {string} Character used for that color ('#' or fillChar)
   */
  #cellCharacter (color) {
    return color ? '#' : this.fillChar
  }

  /**
   * Replace a character at a specific linear index in the ASCII string.
   *
   * Creates a new string with the character at the specified index replaced.
   * Uses string slicing to construct: substring[0..index] + newChar + substring[index+1..end]
   *
   * This maintains immutability of the string while updating grid state.
   *
   * @param {number} index - Linear index in the ASCII string (0-based)
   * @param {string} char - Single character to write at the index
   * @returns {string} New ASCII string with the replacement applied
   */
  #replaceCharacterAt (index, char) {
    return (
      this.string.substring(0, index) + char + this.string.substring(index + 1)
    )
  }

  /**
   * Determine whether a character represents an occupied cell.
   *
   * Returns true if the character is neither fillChar nor newline ('\\n').
   * This is used by occupancy counting and other metrics.
   *
   * @param {string} char - Single character from the ASCII grid string
   * @returns {boolean} True if character represents an occupied cell (not fillChar or newline)
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
