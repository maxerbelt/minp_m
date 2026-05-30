import { GridBase } from '../gridBase.js'
import { RectangleShape } from './RectangleShape.js'
import { AsciiRepresentation } from '../AsciiRepresentation.js'

/**
 * @typedef {Object} RectangleShape
 * Rectangle shape descriptor with grid dimensions.
 * @property {number} width - Grid width in cells (positive integer, typically 1-1000)
 * @property {number} height - Grid height in cells (positive integer, typically 1-1000)
 */

/**
 * @typedef {Array<string>} SymbolMap
 * Symbol representation mapping for custom grid display rendering.
 * Array where index i maps cell value i to a single-character representation.
 * Maps numeric cell values to single-character display representations.
 *
 * **Mapping Patterns:**
 * - Binary: [emptyChar, fullChar] = ['.', '#']
 *   - Index 0 (empty/false) → emptyChar
 *   - Index 1 (occupied/true) → fullChar
 *
 * - Intensity gradient: ['·', 'o', 'O', '●']
 *   - Index 0 → '·' (lightest)
 *   - Index 1 → 'o'
 *   - Index 2 → 'O'
 *   - Index 3 → '●' (darkest)
 *
 * - Hex notation: ['.', '1', '2', '3', ..., '9', 'a', 'b', 'c', 'd', 'e', 'f']
 *   - Maps values 0-15 for hexadecimal representation
 *
 * **Usage:**
 * - Each element must be a single character (length === 1)
 * - Array length determines maximum representable value
 * - Any value >= array length is undefined (will cause display error)
 * - Special characters allowed: unicode, block chars (█, ▓, ░), etc.
 *
 * @example
 * const binary = ['.', '#']
 * const intensity = ['·', 'o', 'O', '●']
 * const blocks = [' ', '█', '▓', '░']
 */

/**
 * @typedef {Object} MaskLike
 * Mask-like object interface for grid compatibility and interoperability.
 * Any object implementing this interface can be used as a mask in AsciiGrid operations.
 * Enables duck-typed polymorphism for grid-compatible objects.
 *
 * @property {number} width - Grid width in cells (positive integer, immutable, read-only)
 * @property {number} height - Grid height in cells (positive integer, immutable, read-only)
 * @property {Function} occupiedLocationsAndValues - Generator/iterator method returning occupied cell tuples
 *   Yields [x, y, color] tuples:
 *   - x (number): column index (0-based, range [0, width))
 *   - y (number): row index (0-based, range [0, height))
 *   - color (number|boolean): cell occupancy (truthy for occupied, falsy for empty)
 *
 *   Example yields:
 *   - [1, 0, 1] = column 1, row 0, occupied (value 1)
 *   - [2, 1, 2] = column 2, row 1, occupied (value 2)
 *   - [5, 2, true] = column 5, row 2, occupied (value true)
 *
 * **Contract:**
 * - width and height are non-zero positive integers
 * - All coordinates from occupiedLocationsAndValues must be in valid range
 * - Method must be iterable (supports for...of, spread operator, etc.)
 * - Called potentially multiple times; should be idempotent
 * - Color values are interpreted as truthy/falsy for cell state
 *
 * **Implementations:**
 * - Mask class (native grid masks)
 * - Custom grid objects
 * - Polyomino representations
 * - Any object satisfying duck-typing contract
 *
 * @example
 * const maskLike = {
 *   width: 5,
 *   height: 3,
 *   *occupiedLocationsAndValues() {
 *     yield [1, 0, 1]  // Occupied cell at (1, 0)
 *     yield [2, 1, 1]  // Occupied cell at (2, 1)
 *     yield [4, 2, 2]  // Occupied cell at (4, 2) with value 2
 *   }
 * }
 */

/**
 * ASCII string-based grid with newline-separated rows.
 *
 * Stores grid state as an immutable string where rows are separated by '\n' newlines.
 * Each cell is a single character: fillChar for empty, any other for occupied.
 *
 * ## String Format
 * Multi-line text: 'row0\nrow1\nrow2...rowN'
 * - Each row: exactly (width) characters
 * - Separator: '\n' between rows (no newline after last row)
 * - Total length: height * (width + 1) - 1
 *
 * ## Index Calculation
 * 2D (x, y) to linear string index: index = y * (width + 1) + x
 *
 * ## Example Grid (5x3)
 * .....\n#.#..\n..### (14 chars total)
 * Row 0: indices 0-4 ('.' chars) + index 5 (newline)
 * Row 1: indices 6-10 + index 11 (newline)
 * Row 2: indices 12-16 (no newline after last row)
 * Accessing (2,1): index = 1*6 + 2 = 8 ← character '#'
 *
 * ## Memory Profile
 * - Immutable strings (new string created on each set)
 * - No cell array; cells stored as characters
 * - Efficient for visualization and text rendering
 * - Fast coordinate-to-index conversion
 *
 * ## Use Cases
 * - Text-based UI grids and boards
 * - ASCII art generation
 * - Game board visualization
 * - Debug output and logging
 *
 * @extends GridBase
 * @class AsciiGrid
 */
export class AsciiGrid extends GridBase {
  /**
   * Width stride: characters per row including newline.
   * Used in index calculations to map 2D (x, y) to linear string index.
   *
   * **Calculation:**
   * - rowStride = width + 1
   * - width: number of cell characters per row
   * - +1: newline character at end of row (except after last row)
   *
   * **Critical for Index Formula:**
   * - Linear index = y × rowStride + x
   * - Accounts for newline characters in string layout
   * - Enables O(1) coordinate-to-index conversion
   *
   * **Example (5-wide grid):**
   * - rowStride = 6 (5 chars + 1 newline)
   * - Index of (3, 2) = 2 × 6 + 3 = 15
   *
   * @type {number}
   * @private
   * @readonly
   */
  #rowStride

  /**
   * Creates a new ASCII grid with given dimensions and optional initial content.
   *
   * Initializes an ASCII-based rectangular grid representation. If no pre-built ASCII string
   * is provided, the grid is filled with the specified fillChar character. The resulting
   * internal string uses newlines ('\n') to separate rows, with a fixed row stride of
   * (width + 1) to account for newline characters.
   *
   * **Initialization Modes:**
   * 1. **Fresh Grid (ascii=null)**: Creates new string filled with fillChar
   *    - All cells set to fillChar (typically '.')
   *    - Format: 'row1\nrow2\nrow3' with each row = width chars
   *
   * 2. **From Existing String (ascii provided)**: Uses provided ASCII string
   *    - Must match format: 'row1\nrow2\nrow3' (newline-separated)
   *    - Must have correct dimensions (width and height)
   *    - No validation performed; caller responsible for correctness
   *
   * **Internal State:**
   * - this.string: The actual ASCII string representation
   * - this.fillChar: Character used for empty cells (default '.')
   * - this.#rowStride: Computed as (width + 1) for index calculations
   *
   * **Performance:**
   * - Construction: O(width × height) for string building
   * - Sets up O(1) cell access via coordinate-to-index mapping
   *
   * @param {number} width - Grid width in cells/columns (must be positive integer, typically 1-1000)
   * @param {number} height - Grid height in cells/rows (must be positive integer, typically 1-1000)
   * @param {string|null} [ascii=null] - Optional pre-built ASCII string to use as initial content
   *   If null, a new grid is built using fillChar.
   *   If provided, must have correct format: 'row1\nrow2\nrow3' with newline separators.
   *   Must match width and height dimensions (no validation performed).
   * @param {string} [fillChar='.'] - Character used for empty/unset cells throughout the grid
   *   Typically a visible character like '.' (dot), ' ' (space), or '·' (middle dot).
   *   Used in set() when color is falsy, and in empty property.
   *   Single character only (length must be 1).
   * @throws {Error} If width or height is not a positive integer
   *
   * @example
   * // Create 5×3 grid filled with dots
   * const grid = new AsciiGrid(5, 3);
   * // String: '.....\\n.....\\n.....'
   * // Displays as:
   * // .....
   * // .....
   * // .....
   *
   * @example
   * // Create 5×3 grid filled with spaces
   * const custom = new AsciiGrid(5, 3, null, ' ');
   * // String: '     \\n     \\n     '
   *
   * @example
   * // Create grid from existing ASCII string
   * const ascii = '.....\\n#.#..\\n..###';
   * const grid = new AsciiGrid(5, 3, ascii);
   * // Grid initialized with provided pattern
   *
   * @see #string for accessing raw ASCII representation
   * @see #fillChar for the empty cell character
   */
  constructor (width, height, ascii = null, fillChar = '.') {
    super(RectangleShape(width, height))
    this.fillChar = fillChar
    this.string = ascii || buildAsciiString(fillChar, width, height)
    this.#rowStride = width + 1 // +1 for newline
  }

  /**
   * Calculates linear string index for 2D grid coordinates.
   *
   * Converts 2D grid coordinates (x, y) to a linear position in the internal ASCII string,
   * accounting for newline characters that separate rows.
   *
   * ## Algorithm
   * index = y * rowStride + x = y * (width + 1) + x\n   *\n   * Where:\n   * - y * rowStride: offset to start of target row\n   * - + x: offset within row to column x\n   *\n   * ## Example (5-wide grid)\n   * Row 0: indices 0-4 (cells), 5 (newline)\n   * Row 1: indices 6-10 (cells), 11 (newline)\n   * Row 2: indices 12-16 (cells, no newline)\n   * index(2, 1) = 1 * 6 + 2 = 8\n   *\n   * @param {number} x - Column coordinate (0-based, range [0, width))\n   * @param {number} y - Row coordinate (0-based, range [0, height))\n   * @returns {number} Linear string index (0-based)\n   *\n   * @see #rowStride\n   * @see #indexMax\n   */
  index (x, y) {
    return y * this.#rowStride + x
  }

  /**
   * Retrieves the character at the given grid coordinates.
   *
   * Returns the single character at position (x, y) in the ASCII grid string.
   * This character will be:
   * - fillChar for empty/unset cells
   * - '#' for occupied cells
   * - Custom character if modified via direct set() with custom color
   *
   * **Algorithm:**
   * 1. Calculate linear index using index(x, y) → rowStride calculation
   * 2. Extract character at that index from internal string
   * 3. Return character
   *
   * **Performance:** O(1) - constant time index calculation + charAt()
   *
   * **No Bounds Checking:**
   * - Does not validate coordinates
   * - Out-of-bounds access may return wrong character or throw
   * - Caller responsible for coordinate validation
   *
   * @param {number} x - Column coordinate (0-based, valid range [0, width))
   * @param {number} y - Row coordinate (0-based, valid range [0, height))
   * @returns {string} Single character at [x, y] position
   *   Typically '.' for empty or '#' for occupied, but may be any character
   *   set via set() method with custom color values.
   *
   * @example
   * const grid = new AsciiGrid(5, 3);
   * grid.set(2, 1);           // Set cell at (2, 1) to '#'
   * const char = grid.at(2, 1);  // Returns '#'
   * const empty = grid.at(0, 0); // Returns '.' (default fillChar)
   *
   * @see #set for setting cell values
   * @see #index for coordinate-to-index calculation
   * @see #fillChar for the empty cell character
   */
  at (x, y) {
    const idx = this.index(x, y)
    return this.string.charAt(idx)
  }

  /**
   * Sets a cell value at the given coordinates.
   *
   * Updates the character at position (x, y) in the ASCII grid string based on the color value.
   * The cell character is determined by truthiness of the color:
   * - Truthy color (1, true, any positive number, any non-zero value) → '#' (occupied)
   * - Falsy color (0, false, null, undefined, etc.) → fillChar (empty)
   *
   * **Immutability Pattern:**
   * - Creates new string with replacement rather than mutating in place
   * - Old string is discarded, new string assigned to this.string
   * - Immutable approach matches ES standards but creates GC pressure
   * - Suitable for grids that don't update frequently
   * - Performance: O(width × height) due to string construction
   *
   * **Algorithm:**
   * 1. Calculate linear index: idx = index(x, y)
   * 2. Determine character: char = color ? '#' : fillChar
   * 3. Create new string: substring[0..idx] + char + substring[idx+1..end]
   * 4. Assign new string: this.string = newString
   *
   * **No Bounds Checking:**
   * - Does not validate coordinates
   * - Out-of-bounds access may corrupt unrelated cells
   * - Caller responsible for coordinate validation
   *
   * **Performance Characteristics:**
   * - Time: O(width × height) for string construction
   * - Space: O(width × height) for new string
   * - Frequent updates should use array-based representation instead
   *
   * @param {number} x - Column coordinate (0-based, valid range [0, width))
   * @param {number} y - Row coordinate (0-based, valid range [0, height))
   * @param {number|boolean} [color=1] - Cell state value; truthy sets to '#', falsy to fillChar
   *   Typical values: 1 (set), 0 (clear), true (set), false (clear)
   *   Can be any truthy/falsy value; interpretation based on JavaScript truthiness
   * @returns {void}
   *
   * @example
   * const grid = new AsciiGrid(5, 3);
   * grid.set(2, 1);        // Sets cell to '#' (default color=1)
   * grid.set(2, 1, 5);     // Sets cell to '#' (5 is truthy)
   * grid.set(2, 1, false); // Sets cell to fillChar (false is falsy)
   * grid.set(3, 3, 0);     // Sets cell to fillChar (0 is falsy)
   *
   * @see #at for retrieving cell values
   * @see #index for coordinate-to-index calculation
   * @see #fillChar for the empty cell character
   * @see #replaceCharacterAt for internal string replacement
   */
  set (x, y, color = 1) {
    const idx = this.index(x, y)
    const char = this.#cellCharacter(color)
    this.string = this.#replaceCharacterAt(idx, char)
  }

  /**
   * Creates a new empty grid with same dimensions and fillChar.
   *
   * Returns a new AsciiGrid instance with all cells set to fillChar (typically '.').
   * This is a convenience property for quickly clearing a grid or creating a blank
   * template. The new grid maintains the same dimensions and fillChar as the current instance,
   * but has no occupied cells.
   *
   * **Use Cases:**
   * - Clearing a grid without creating new instance from scratch
   * - Creating blank copies for comparison
   * - Generating new grids matching current dimensions
   * - Template generation
   *
   * **Immutability:** Creates a new independent grid instance; does not modify current grid
   *
   * @type {AsciiGrid}
   * @returns {AsciiGrid} New empty grid with same width, height, and fillChar
   *   All cells set to fillChar (empty state)
   *
   * @example
   * const grid = new AsciiGrid(5, 3);
   * grid.set(2, 1);        // Set a cell
   * const cleared = grid.empty;  // Create new empty grid
   * // cleared has all cells as '.'
   * // grid is unchanged
   *
   * @see #full for creating fully-occupied grid
   * @see #fillChar for the empty cell character
   */
  get empty () {
    return this.#createGridWithFill('.')
  }

  /**
   * Creates a new full grid with same dimensions and fillChar.
   *
   * Returns a new AsciiGrid instance with all cells set to '#' (fully occupied).
   * This is a convenience property for creating fully-filled/solid grids.
   * The new grid maintains the same dimensions and fillChar as the current instance,
   * but all cells are occupied.
   *
   * **Use Cases:**
   * - Creating filled backgrounds or templates
   * - Initializing obstacle maps
   * - Generating inverse/complement grids
   * - Creating fully-occupied comparison grids
   *
   * **Immutability:** Creates a new independent grid instance; does not modify current grid
   *
   * @type {AsciiGrid}
   * @returns {AsciiGrid} New full grid with same width, height, and fillChar
   *   All cells set to '#' (occupied state)
   *
   * @example
   * const grid = new AsciiGrid(5, 3);
   * const filled = grid.full;  // Create new full grid
   * // filled has all cells as '#'
   * // grid is unchanged
   *
   * @see #empty for creating empty grid
   * @see #fillChar for the empty cell character
   */
  get full () {
    return this.#createGridWithFill('#')
  }

  /**
   * Factory method for creating a new grid with modified fill character.
   *
   * Internal helper method that reduces duplication between empty and full properties.
   * Creates a new AsciiGrid with the same dimensions and fillChar as current instance,
   * but then replaces the internal string with one filled using the specified fillCharacter.
   *
   * **Algorithm:**
   * 1. Create new AsciiGrid with same dimensions and fillChar
   * 2. Replace internal string with buildAsciiString(fillCharacter, width, height)
   * 3. Return modified grid
   *
   * **Purpose:**
   * - DRY principle: avoids duplicating grid creation logic in empty/full properties
   * - Creates fully-initialized grid in single operation
   * - Allows flexible fill character specification
   *
   * @param {string} fillCharacter - Character to fill all cells with
   *   Typically '.' for empty or '#' for full, but any single character supported
   * @returns {AsciiGrid} New grid with all cells filled with fillCharacter
   * @private
   *
   * @see #empty for creating empty grids
   * @see #full for creating full grids
   * @see #buildAsciiString for string generation function
   */
  #createGridWithFill (fillCharacter) {
    const grid = new AsciiGrid(this.width, this.height, null, this.fillChar)
    grid.string = buildAsciiString(fillCharacter, this.width, this.height)
    return grid
  }

  /**
   * Returns the raw string representation of the grid.
   *
   * Direct access to the underlying internal ASCII string where rows are separated by '\n' (newline).
   * The returned string is the raw multi-line text representation and can be printed or
   * logged directly to display the grid in its text form. This is the most efficient
   * way to access the full grid state for rendering or serialization.
   *
   * **Format:** 'row1\nrow2\nrow3'
   * - Each row is exactly `width` characters
   * - Rows separated by newline characters ('\n')
   * - No newline after final row
   * - Total length: width × height + (height - 1) characters
   *
   * **Usage Patterns:**
   * - Direct console output: console.log(grid.toAscii)
   * - String serialization/export
   * - Comparison between grids
   * - Efficient memory access (no copying)
   *
   * **Example Output (5×3 grid):**
   * ```
   * .....
   * ##..#
   * ..###
   * ```
   *
   * **Note:** This is the raw internal string, not a rendered version
   * with custom symbols. Use toAsciiWith(symbols) for custom rendering.
   *
   * @type {string}
   * @returns {string} Raw ASCII grid string with newline separators between rows
   *
   * @example
   * const ascii = grid.toAscii;
   * console.log(ascii);  // Prints grid to console
   * // Output:
   * // .....
   * // #.#..
   * // ..###
   *
   * @example
   * // Get grid dimensions and content
   * const rows = grid.toAscii.split('\\n');
   * const height = rows.length;
   * const width = rows[0].length;
   *
   * @see #toAsciiWith for custom symbol rendering
   * @see #at for individual cell access
   * @see #string for the internal string property
   */
  get toAscii () {
    return this.string
  }

  /**
   * Converts grid to ASCII using custom symbol mappings via AsciiRepresentation.
   *
   * Renders the grid using a custom symbol array to represent different cell values.
   * The symbols array maps numeric cell values to single-character representations,
   * enabling flexible visualization of grid state using any character set.
   *
   * **Symbol Mapping:**
   * - symbols[0]: character for cell value 0 (empty/falsy)
   * - symbols[1]: character for cell value 1 (occupied/truthy)
   * - symbols[2], symbols[3], etc.: characters for higher values
   * - Array index directly corresponds to cell value displayed
   *
   * **Default Symbols:**
   * If no symbols provided, uses AsciiRepresentation.defaultSymbols:
   * - Hex notation: 0→'.', 1→'1', 2→'2', ..., 9→'9', 10→'a', 11→'b', ..., 15→'f'
   * - Allows displaying up to 16 different cell values
   * - Suitable for color or intensity representation
   *
   * **Symbol Sets:**
   * - Binary: ['.',  '#'] - Simple empty/occupied display
   * - Intensity: ['·', 'o', 'O', '●'] - Gradient representation
   * - Blocks: [' ', '█', '▓', '░'] - Unicode block characters
   * - Dots: ['.', 'o', 'O'] - Dot gradient
   * - Numbers: ['0', '1', '2', '3', '4', '5'] - Numeric values
   *
   * **Output Format:**
   * Returns ASCII string with same layout as raw grid but using custom symbols.
   * Rows still separated by '\n' newlines, same dimensions.
   *
   * **Performance:**
   * - Time: O(width × height) to iterate and render
   * - Space: O(width × height) for new output string
   * - Creates new AsciiRepresentation instance for rendering
   *
   * **Comparison with toAscii:**
   * - toAscii: Raw internal representation ('#' and fillChar only)
   * - toAsciiWith(symbols): Rendered version with custom symbols for visualization
   *
   * @param {Array<string>} [symbols=AsciiRepresentation.defaultSymbols] - Symbol array mapping numeric values to characters
   *   Index i in the array is the character representation for cell value i.
   *   Must have enough elements to cover all cell values used.
   * @returns {string} ASCII string with custom symbols, rows separated by '\n'
   *   Same layout and dimensions as raw grid, different character representations
   *
   * @example
   * const grid = new AsciiGrid(5, 3);
   * grid.set(2, 1);      // Set some cells
   * grid.set(3, 1);
   *
   * // Use simple binary symbols
   * const binary = grid.toAsciiWith(['·', '#']);
   * // Returns: '·····\\n··##·\\n·····'
   * // Displays as:
   * // ·····
   * // ··##·
   * // ·····
   *
   * @example
   * // Use fancy block characters
   * const fancy = grid.toAsciiWith([' ', '█', '▓', '░']);
   * // Returns grid with block characters instead of '#' and fillChar
   *
   * @example
   * // Use default hex symbols
   * const hex = grid.toAsciiWith();
   * // Uses AsciiRepresentation.defaultSymbols for 16 different values
   *
   * @see AsciiRepresentation for rendering implementation
   * @see AsciiRepresentation.defaultSymbols for default symbol array
   * @see #toAscii for raw grid representation
   */
  toAsciiWith (symbols = AsciiRepresentation.defaultSymbols) {
    const repr = new AsciiRepresentation(this)
    return repr.toAsciiWith(symbols)
  }

  /**
   * Counts the number of non-empty cells in the grid.
   *
   * Iterates through the internal ASCII string and counts all characters that are
   * NOT fillChar and NOT newline ('\n'). This gives the total number of occupied cells
   * in the grid, useful for determining grid occupancy and density metrics.
   *
   * **Algorithm:**
   * 1. Convert string to array of characters using spread operator
   * 2. Filter to keep only characters that are:
   *    - NOT fillChar (e.g., not '.')
   *    - NOT newline ('\n')
   * 3. Return length of filtered array
   *
   * **Performance:**
   * - Time: O(width × height) - must scan all characters
   * - Space: O(width × height) for intermediate array
   * - Suitable for infrequent counting; not for per-frame updates
   *
   * **Definition of "Occupied":**
   * - Any character that is not fillChar and not newline
   * - Typically '#' but can be any non-fillChar value
   * - Consistent with set() method: truthy color → '#', falsy → fillChar
   *
   * **Use Cases:**
   * - Determining grid density
   * - Calculating occupancy percentage
   * - Validating grid state
   * - Performance metrics
   *
   * **Note:** Counts only characters; if grid has been modified via direct string
   * manipulation or custom symbols, count reflects current string state, not original
   * cell values.
   *
   * @type {number}
   * @returns {number} Count of occupied cells (>= 0, <= width × height)
   *
   * @example
   * const grid = new AsciiGrid(5, 3);  // 15 total cells
   * console.log(grid.occupancy);       // Returns 0 (all empty)
   * grid.set(1, 1);                    // Set one cell
   * grid.set(2, 1);
   * console.log(grid.occupancy);       // Returns 2 (2 occupied cells)
   *
   * @example
   * // Calculate occupancy percentage
   * const totalCells = grid.width * grid.height;
   * const percentFilled = (grid.occupancy / totalCells) * 100;
   * console.log(`Grid is ${percentFilled}% filled`);
   *
   * @see #fillChar for the empty cell character
   * @see #set for setting cell values
   * @see #_isOccupiedCharacter for occupancy test function
   */
  get occupancy () {
    return [...this.string].filter(c => this.#isOccupiedCharacter(c)).length
  }

  /**
   * Maximum valid linear index in the internal ASCII string.
   *
   * Represents the index of the last character in the internal ASCII string.
   * For a grid with rowStride = (width + 1) and height rows, this computes to:
   * `indexMax = rowStride × height - 1 = (width + 1) × height - 1`
   *
   * This accounts for all characters including newline separators between rows.
   *
   * **Derivation:**
   * - Total characters in string: rowStride × height
   *   - rowStride characters per row: width cells + 1 newline
   *   - height rows total
   * - Maximum index (0-based): (total characters - 1)
   * - Formula: (width + 1) × height - 1
   *
   * **Example (5×3 grid):**
   * - rowStride = 6 (5 + 1 for newline)
   * - total = 6 × 3 = 18 characters
   * - indexMax = 18 - 1 = 17
   * - Valid indices: [0, 17]
   * - String length: 18
   *
   * **String Layout:**
   * ```
   * Indices: 0-4 (row 0 cells), 5 (newline), 6-10 (row 1 cells), 11 (newline), 12-16 (row 2 cells)
   * indexMax points to index 16 (last character of last row)
   * ```
   *
   * **Usage:**
   * - Bounds checking: index <= indexMax ensures validity
   * - Validation of calculated indices
   * - String slicing operations
   * - Grid size calculations
   *
   * @type {number}
   * @returns {number} Maximum valid index in string (0-based)
   *   Range: [width - 1, width × height - 1] for valid grids
   *
   * @example
   * const grid = new AsciiGrid(5, 3);
   * console.log(grid.indexMax);      // Outputs: 17
   * console.log(grid.string.length); // Outputs: 18 (17 + 1 for length vs index)
   *
   * @example
   * // Validate calculated index
   * const idx = grid.index(x, y);
   * if (idx > grid.indexMax) {
   *   throw new Error('Index out of bounds');
   * }
   *
   * @see #index for coordinate-to-index calculation
   * @see #columnStride (rowStride) for row width calculation
   * @see #string for the internal ASCII string
   */
  get indexMax () {
    return this.#rowStride * this.height - 1
  }

  /**
   * Width stride: characters per row including the newline character.
   *
   * Overrides parent GridBase's columnStride property to account for newline characters
   * in the ASCII string representation. In AsciiGrid, each row occupies (width + 1) characters:
   * - width characters for cell data
   * - 1 character for newline separator (except after last row, but calculation still uses +1)
   *
   * This is critical for accurate index calculations when converting 2D (x, y) coordinates
   * to linear string indices, as the formula `index = y × columnStride + x` depends on
   * columnStride including the newline.
   *
   * **Comparison:**
   * - GridBase.columnStride: returns width (cell characters only)
   * - AsciiGrid.columnStride: returns width + 1 (includes newline)
   *
   * **Formula:**
   * - columnStride = width + 1
   * - Used in: index(x, y) = y × columnStride + x
   *
   * **Example (5-wide grid):**
   * - columnStride = 6
   * - index(2, 1) = 1 × 6 + 2 = 8 (correct position in string)
   * - Without +1: index(2, 1) = 1 × 5 + 2 = 7 (incorrect, overlaps newline)
   *
   * @type {number}
   * @returns {number} Row stride in characters (width + 1, includes newline)
   *
   * @example
   * const grid = new AsciiGrid(5, 3);
   * console.log(grid.columnStride);  // Outputs: 6 (5 cells + 1 newline)
   *
   * @see #index for usage in coordinate-to-index calculation
   * @see #rowStride for the private field version
   */
  get columnStride () {
    return this.#rowStride
  }

  /**
   * Creates an AsciiGrid from a mask object with dimensions and occupancy data.
   *
   * Constructs a new AsciiGrid initialized with data from a mask-like object.
   * Iterates through all occupied locations in the mask via its occupiedLocationsAndValues() method
   * and sets the corresponding cells in the new grid. This enables seamless conversion
   * between different grid representations.
   *
   * **Algorithm:**
   * 1. Create new empty AsciiGrid with mask's width and height
   * 2. Iterate through mask.occupiedLocationsAndValues()
   * 3. For each [x, y, color] tuple, call grid.set(x, y, color)
   * 4. Return populated grid
   *
   * **Mask Contract:**
   * The mask object must implement:
   * - `width` property: grid width in cells
   * - `height` property: grid height in cells
   * - `occupiedLocationsAndValues()` method: generator/iterator yielding [x, y, color] tuples
   *
   * **Flexibility:**
   * - Works with any object satisfying duck-typed MaskLike interface
   * - Supports different grid representations (Mask, custom objects, etc.)
   * - Preserves color values (truthy → '#', falsy → fillChar)
   *
   * **Performance:**
   * - Time: O(occupancy count) + O(width × height) for grid creation
   * - Space: O(width × height) for new grid
   * - Efficient: only processes occupied cells, creates grid once
   *
   * **Use Cases:**
   * - Converting Mask objects to AsciiGrid for visualization
   * - Importing from other grid representations
   * - Creating text-based display of mask data
   * - Serializing masks as ASCII strings
   *
   * **fillChar Parameter:**
   * - Default '.': standard empty cell marker
   * - Customizable for different visual styles
   * - Passed to grid constructor, used for falsy cell values
   *
   * @static
   * @param {MaskLike} mask - Mask object with grid dimensions and occupiedLocationsAndValues() iterator
   *   Must have width, height properties and occupiedLocationsAndValues() method.
   *   See MaskLike typedef for contract details.
   * @param {string} [fillChar='.'] - Character for empty cells in the new grid
   *   Typically '.' but can be any single character ('·', ' ', etc.)
   * @returns {AsciiGrid} New AsciiGrid populated from mask data
   *   Same dimensions as mask, with occupied cells set based on mask data
   *
   * @example
   * // Convert mask to ASCII grid for display
   * const mask = { width: 5, height: 3, *occupiedLocationsAndValues() {
   *   yield [1, 1, 1];
   *   yield [2, 1, 1];
   * }}
   * const grid = AsciiGrid.fromMask(mask);
   * console.log(grid.toAscii);
   * // Output:
   * // .....
   * // .##..
   * // .....
   *
   * @example
   * // Use custom fillChar for different style
   * const grid = AsciiGrid.fromMask(mask, ' ');
   * // Grid uses space ' ' for empty cells instead of '.'
   *
   * @see MaskLike for mask interface specification
   * @see #toAscii for getting ASCII representation
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
   * Maps a color value (numeric or boolean) to a grid character based on truthiness:
   * - Truthy colors (1, true, any positive number, any non-zero value) → '#' (occupied)
   * - Falsy colors (0, false, null, undefined, empty string, etc.) → fillChar (empty)
   *
   * This is the standard conversion used by set() and other methods that write cell values.
   * Implements the core cell-value-to-character mapping for the grid.
   *
   * **Truthiness in JavaScript:**
   * Truthy: any non-zero number, true, non-empty strings, objects, arrays, etc.
   * Falsy: 0, false, null, undefined, empty string '', NaN
   *
   * **Inverse Operation:**
   * - #isOccupiedCharacter() checks if character is not fillChar or newline
   * - This method maps value → character (forward)
   * - isOccupiedCharacter maps character → boolean (reverse)
   *
   * **Performance:** O(1) - simple ternary operation
   *
   * @param {number|boolean} color - Color value to map to a character
   *   Can be any value; interpretation based on JavaScript truthiness
   * @returns {string} Character used for that color
   *   '#' if color is truthy, fillChar (e.g., '.') if falsy
   * @private
   *
   * @example
   * grid._cellCharacter(1)      // Returns '#' (1 is truthy)
   * grid._cellCharacter(0)      // Returns '.' (0 is falsy)
   * grid._cellCharacter(5)      // Returns '#' (5 is truthy)
   * grid._cellCharacter(true)   // Returns '#' (true is truthy)
   * grid._cellCharacter(false)  // Returns '.' (false is falsy)
   * grid._cellCharacter(null)   // Returns '.' (null is falsy)
   *
   * @see #set for usage in cell setting
   * @see #fillChar for the empty cell character
   */
  #cellCharacter (color) {
    return color ? '#' : this.fillChar
  }

  /**
   * Replace a character at a specific linear index in the ASCII string.
   *
   * Creates a new string (immutable pattern) with the character at the specified index replaced.
   * Uses string slicing to construct a new string:
   * `newString = substring[0..index] + newChar + substring[index+1..end]`
   *
   * This maintains immutability of the string while enabling grid state updates.
   * The old string is discarded and replaced with the new one.
   *
   * **Algorithm:**
   * 1. Slice string from 0 to index (characters before replacement)
   * 2. Concatenate new character
   * 3. Slice string from index+1 to end (characters after replacement)
   * 4. Return combined new string
   *
   * **Immutability Pattern:**
   * - Does not modify this.string directly
   * - Returns new string for caller to assign
   * - Caller (usually set()) assigns result back to this.string
   * - Enables functional programming patterns
   *
   * **Performance:**
   * - Time: O(width × height) - must create new string
   * - Space: O(width × height) - new string allocation
   * - Suitable for occasional updates
   * - Not suitable for high-frequency updates
   *
   * **Example (5-character string):**
   * ```
   * original: '.#...' (indices 0-4)
   * index: 2, char: '#'
   * result: substring(0,2) + '#' + substring(3,5)
   *       = '.#' + '#' + '..'
   *       = '.##..'
   * ```
   *
   * @param {number} index - Linear index in the ASCII string (0-based)
   * @param {string} char - Single character to write at the index
   * @returns {string} New ASCII string with the replacement applied
   * @private
   *
   * @example
   * const grid = new AsciiGrid(5, 3);
   * const newString = grid._replaceCharacterAt(8, '#');
   * // Returns new string with character at index 8 replaced
   *
   * @see #set for usage in cell setting
   * @see #index for index calculation
   */
  #replaceCharacterAt (index, char) {
    return (
      this.string.substring(0, index) + char + this.string.substring(index + 1)
    )
  }

  /**
   * Determine whether a character represents an occupied cell.
   *
   * Tests if a character from the ASCII string represents an occupied cell.
   * Returns true if and only if the character is:
   * - NOT fillChar (e.g., not '.' or ' ')
   * - NOT newline ('\n')
   *
   * This is the inverse of #cellCharacter(): identifies which characters should
   * count as occupancy when scanning the grid string.
   *
   * **Definition of Occupied:**
   * - Any character that is not fillChar and not newline
   * - Typically '#' but can be any character set via set() method
   * - Used by occupancy counting (count non-empty cells)
   *
   * **Edge Cases:**
   * - Newline characters: false (separator, not cell)
   * - fillChar (e.g., '.'): false (explicitly empty)
   * - '#': true (typically occupied)
   * - Any other character: true (treated as occupied)
   *
   * **Usage:**
   * - occupancy property filtering
   * - Grid density calculations
   * - Cell scanning operations
   * - State validation
   *
   * **Performance:** O(1) - simple character comparison
   *
   * @param {string} char - Single character from the ASCII grid string
   * @returns {boolean} True if character represents an occupied cell
   *   (not fillChar and not newline), false otherwise
   * @private
   *
   * @example
   * grid._isOccupiedCharacter('.')   // Returns false (fillChar)
   * grid._isOccupiedCharacter('#')   // Returns true (occupied marker)
   * grid._isOccupiedCharacter('\\n') // Returns false (newline)
   * grid._isOccupiedCharacter('X')   // Returns true (non-fillChar)
   *
   * @see #occupancy for usage in counting occupied cells
   * @see #cellCharacter for the inverse operation
   * @see #fillChar for the empty cell character
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
