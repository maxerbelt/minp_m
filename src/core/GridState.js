/**
 * @typedef {Object} MorphologyCapabilities
 * @property {boolean} canDilate - Whether dilate operation would expand mask (add boundary cells)
 * @property {boolean} canErode - Whether erode operation would shrink mask (remove boundary cells)
 * @property {boolean} canCross - Whether cross operation (erosion followed by dilation) would change mask
 */

/**
 * @typedef {Object} TransformCapabilities
 * @property {boolean} canRotateCW - Whether 90° clockwise rotation would change mask
 * @property {boolean} canRotateCCW - Whether 90° counter-clockwise rotation would change mask
 * @property {boolean} canFlipH - Whether horizontal flip (mirror across Y axis) would change mask
 * @property {boolean} canFlipV - Whether vertical flip (mirror across X axis) would change mask
 */

/**
 * @typedef {'dilate'|'erode'|'cross'} MorphologyOperation
 */

/**
 * @typedef {Object} GridMask
 * @property {*} bits - Bitboard representing current mask state
 * @property {*} [fullMask] - Full mask bitboard for capacity checking
 * @property {*} [emptyMask] - Empty mask bitboard for comparison
 * @property {TransformActions|null} [actions] - Actions object for transforms and symmetry operations
 * @property {*} [clone] - Clone of the mask for non-mutating operations
 */

/**
 * @typedef {Object} TransformActions
 * @property {Object<string, any>} transformMaps - Map keys to transformation data (e.g., 'r90', 'fx')
 * @property {*} template - Template bitboard used for transform comparison
 * @property {Function} [applyMap] - Function that applies a transform map and returns result
 * @property {Function} [classifyOrbitType] - Function that returns symmetry classification string
 */

/**
 * Queries grid state and capabilities without side effects
 *
 * Single source of truth for grid state queries. Provides read-only access to mask properties
 * and computes capabilities for morphology operations (dilate/erode/cross), transforms
 * (rotate/flip), and symmetry classification. All queries are non-mutating.
 *
 * @class GridState
 */
export class GridState {
  /**
   * Initialize grid state with mask and optional indexer
   *
   * Creates a state query interface for a grid mask. The optional indexer can be used
   * for grid-specific operations or lookups.
   *
   * @constructor
   * @param {GridMask} mask - The mask object with bits and optional clone/fullMask/emptyMask/actions
   * @param {Object|null} [indexer=null] - Optional indexer for grid operations or lookups
   */
  constructor (mask, indexer = null) {
    this.mask = mask
    this.indexer = indexer
  }

  /**
   * Get current actions from mask
   *
   * Retrieves the actions object containing transform maps and methods for symmetry
   * classification and transform application.
   *
   * @returns {TransformActions|null} Actions object with transform maps and methods, or null if unavailable
   */
  getCurrentActions () {
    return this.mask?.actions ?? null
  }

  /**
   * Check if morphology operation would change the mask
   *
   * Queries whether applying the specified morphology operation would result in a
   * different mask. Operation names correspond to standard morphological operations
   * on binary images: dilate expands, erode shrinks, cross applies both.
   *
   * @param {MorphologyOperation} operation - Operation name: 'dilate', 'erode', or 'cross'
   * @returns {boolean} True if operation would change mask, false if it would have no effect
   */
  canApplyMorphology (operation) {
    return checkMorphologyState(this.mask, operation)
  }

  /**
   * Get morphology operation capabilities
   *
   * Returns a snapshot of which morphology operations (dilate, erode, cross) would
   * currently have an effect on the mask. Useful for disabling UI buttons or
   * preventing no-op operations.
   *
   * @returns {MorphologyCapabilities} Object with boolean flags for each operation
   */
  getMorphologyCapabilities () {
    return {
      canDilate: this.canApplyMorphology('dilate'),
      canErode: this.canApplyMorphology('erode'),
      canCross: this.canApplyMorphology('cross')
    }
  }

  /**
   * Check if dilate is disabled (grid is at full capacity)
   *
   * Returns true if the grid has reached maximum size and cannot expand further.
   * This check uses the fullMask bitboard to determine if all cells are occupied.
   *
   * @returns {boolean} True if grid is at maximum size and cannot dilate
   */
  isDilateDisabled () {
    const mask = this.mask
    if (!mask?.fullMask) return false
    return isBitboardFull(mask.bits, mask.fullMask.bits)
  }

  /**
   * Get transform capabilities for rectangular grids
   *
   * Returns flags indicating which transforms (rotations and flips) would change
   * the current mask. Returns all false if transform maps are unavailable.
   * Used for both rectangular and hex grids with indexed transforms.
   *
   * @returns {TransformCapabilities} Object with boolean flags for each transform
   */
  getTransformCapabilities () {
    const actions = this._getActionsWithTransformMaps()
    if (!actions) {
      return {
        canRotateCW: false,
        canRotateCCW: false,
        canFlipH: false,
        canFlipV: false
      }
    }

    return {
      canRotateCW: this._canApplyIndexedTransform('r90', actions),
      canRotateCCW: this._canApplyIndexedTransform('r270', actions),
      canFlipH: this._canApplyIndexedTransform('fx', actions),
      canFlipV: this._canApplyIndexedTransform('fy', actions)
    }
  }

  /**
   * Helper to retrieve actions with transform maps, avoiding repetition
   *
   * Safely retrieves actions and checks for transformMaps availability.
   * Handles null/undefined gracefully.
   *
   * @private
   * @returns {TransformActions|null} Actions object with transformMaps, or null if unavailable
   */
  _getActionsWithTransformMaps () {
    const actions = this.getCurrentActions()
    if (!actions?.transformMaps) return null
    return actions
  }

  /**
   * Check if indexed transform map (rotation or flip) would change the mask
   *
   * Consolidates logic for checking if a specific indexed transform (identified by key)
   * would result in a different mask. Used internally for both rotation and flip checks.
   *
   * @private
   * @param {string} mapKey - Transform key in transformMaps (e.g., 'r90', 'r270', 'fx', 'fy')
   * @param {TransformActions} actions - Actions object from getCurrentActions()
   * @returns {boolean} True if transform would change mask, false otherwise
   */
  _canApplyIndexedTransform (mapKey, actions) {
    const map = actions.transformMaps[mapKey]
    const template = actions.template
    return this._canApplyTransform(map, template, actions)
  }

  /**
   * Helper to check if a transform map would change the mask
   *
   * Core logic for all transform capability checks. Applies the transform map to the
   * template and compares result. Returns false if map/template/applyMap are unavailable
   * or if an error occurs during application.
   *
   * @private
   * @param {any|null} map - Transform map to apply, or null
   * @param {*} template - Original template bitboard to compare against
   * @param {TransformActions} actions - Actions object with applyMap method
   * @returns {boolean} True if applying map changes template, false if no change or error
   */
  _canApplyTransform (map, template, actions) {
    if (!map) return false
    if (!actions.applyMap || typeof actions.applyMap !== 'function')
      return false

    try {
      return actions.applyMap(map) !== template
    } catch {
      return false
    }
  }

  /**
   * Get rotation or flip capability for hex grids using map index
   *
   * Checks if a transform at a specific index in the transformMaps array would
   * change the mask. This method supports indexed transforms for hexagonal grids
   * which may have multiple rotation/reflection variations.
   *
   * @param {number} mapIndex - Index or key of rotation/flip map in transformMaps array
   * @returns {boolean} True if transform would change mask, false if no change or unavailable
   */
  canApply (mapIndex) {
    const actions = this._getActionsWithTransformMaps()
    if (!actions) return false

    const map = actions.transformMaps[mapIndex]
    const template = actions.template
    return this._canApplyTransform(map, template, actions)
  }

  /**
   * Get current symmetry classification
   *
   * Queries the actions object for the current symmetry classification of the mask.
   * Uses the classifyOrbitType function if available. Returns 'n/a' if classification
   * is unavailable or if an error occurs.
   *
   * @returns {string} Symmetry class name (e.g., 'C4', 'D2') or 'n/a' if unavailable
   */
  getSymmetry () {
    try {
      const actions = this.getCurrentActions()
      if (
        actions?.classifyOrbitType &&
        typeof actions.classifyOrbitType === 'function'
      ) {
        return actions.classifyOrbitType()
      }
    } catch {
      // Silently handle error
    }
    return 'n/a'
  }

  /**
   * Clone the current state (for testing or branching)
   *
   * Returns a clone of the mask for non-mutating operations or branching state.
   * The clone is obtained from the mask's clone property if available.
   *
   * @returns {any|null} Clone of mask.bits, or null if unavailable
   */
  cloneBits () {
    if (!this.mask?.clone) return null
    return this.mask.clone
  }

  /**
   * Check if mask is empty (all bits unset, matches empty mask)
   *
   * Compares current bits against emptyMask to determine if no cells are occupied.
   * Returns true if mask equals empty state.
   *
   * @returns {boolean} True if mask has no bits set or matches emptyMask
   */
  isEmpty () {
    if (!this.mask?.bits) return true
    // isEmpty when bits equal emptyMask (no differences), so NOT changed
    return !bitsChanged(this.mask.bits, this.mask.emptyMask?.bits ?? 0)
  }

  /**
   * Check if mask is full (all bits set, matches full mask)
   *
   * Compares current bits against fullMask to determine if all cells are occupied.
   * Returns true if mask equals full state.
   *
   * @returns {boolean} True if all bits are set in mask or matches fullMask
   */
  isFull () {
    if (!this.mask) return false
    return isBitboardFull(this.mask.bits, this.mask.fullMask?.bits ?? -1)
  }
}
