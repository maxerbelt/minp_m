/**
 * @fileoverview Grid state query interface for mask capabilities and symmetry.
 *
 * Provides read-only access to grid mask properties including morphology operation
 * capabilities (dilate/erode/cross), geometric transform capabilities (rotate/flip),
 * and symmetry classification. All queries are non-mutating and handle missing optional
 * properties gracefully.
 *
 * @module core/GridState
 */

import {
  checkMorphologyState,
  isBitboardFull,
  bitsChanged
} from './MorphologyOps.js'

/**
 * @typedef {Object} MorphologyCapabilities
 * (See types/grid.types.ts#MorphologyCapabilities for canonical TypeScript definition)
 * Indicates which morphological operations would have an effect on the current mask.
 * @property {boolean} canDilate - Whether dilate operation would expand mask (add boundary cells)
 * @property {boolean} canErode - Whether erode operation would shrink mask (remove boundary cells)
 * @property {boolean} canCross - Whether cross operation (erosion followed by dilation) would change mask
 */

/**
 * @typedef {Object} TransformCapabilities
 * (See types/grid.types.ts#TransformCapabilities for canonical TypeScript definition)
 * Indicates which geometric transforms would have an effect on the current mask.
 * @property {boolean} canRotateCW - Whether 90° clockwise rotation would change mask
 * @property {boolean} canRotateCCW - Whether 90° counter-clockwise rotation would change mask
 * @property {boolean} canFlipH - Whether horizontal flip (mirror across Y axis) would change mask
 * @property {boolean} canFlipV - Whether vertical flip (mirror across X axis) would change mask
 */

/**
 * @typedef {'dilate'|'erode'|'cross'} MorphologyOperation
 * (See types/grid.types.ts#MorphologyOperation for canonical TypeScript definition)
 * Standard morphological operation type: dilate (expand), erode (shrink), or cross (both).
 */

/**
 * @typedef {Object} GridMask
 * (See types/grid.types.ts#GridMask for canonical TypeScript definition)
 * Complete mask object containing bitboard representation and transformation metadata.
 * @property {*} bits - Bitboard representing current mask state (number, bigint, or bitboard object)
 * @property {*} [fullMask] - Full mask bitboard for capacity checking (all cells occupied)
 * @property {*} [emptyMask] - Empty mask bitboard for comparison (no cells occupied)
 * @property {TransformActions|null} [actions] - Actions object for transforms and symmetry operations
 * @property {*} [clone] - Clone of the mask for non-mutating operations
 */

/**
 * @typedef {Object} TransformActions
 * (See types/grid.types.ts#TransformActions for canonical TypeScript definition)
 * Actions object containing transform maps and methods for symmetry/transform operations.
 * @property {Object<string, *>} transformMaps - Map keys to transformation data (e.g., 'r90', 'r270', 'fx', 'fy')
 * @property {*} template - Template bitboard used for transform comparison
 * @property {Function} [applyMap] - Function that applies a transform map and returns result bitboard
 * @property {Function} [classifyOrbitType] - Function that returns symmetry classification string (e.g., 'C4', 'D2')
 */

/**
 * Queries grid state and capabilities without side effects.
 *
 * Single source of truth for grid state queries. Provides read-only access to mask properties
 * and computes capabilities for morphology operations (dilate/erode/cross), transforms
 * (rotate/flip), and symmetry classification. All queries are non-mutating and stateless.
 *
 * The class works with GridMask objects which combine bitboard state with optional metadata
 * (transform maps, symmetry classification, clones). Query methods gracefully handle missing
 * optional properties by returning safe defaults.
 *
 * @class GridState
 * @example
 * // Create a state query interface
 * const state = new GridState(mask, indexer);
 *
 * @example
 * // Check what operations are available
 * const morphCaps = state.getMorphologyCapabilities();
 * if (morphCaps.canDilate) {
 *   // apply dilate
 * }
 *
 * @example
 * // Query transform capabilities
 * const transforms = state.getTransformCapabilities();
 * const symmetry = state.getSymmetry(); // 'C4', 'D2', etc. or 'n/a'
 */
export class GridState {
  /**
   * Initialize grid state query interface with mask and optional indexer.
   *
   * Creates a state query interface for a grid mask. The optional indexer can be used
   * for grid-specific operations or lookups. No state mutations occur during initialization.
   *
   * @constructor
   * @param {GridMask} mask - The mask object with bits and optional clone/fullMask/emptyMask/actions
   * @param {Object|null} [indexer=null] - Optional indexer for grid-specific operations
   * @returns {void}
   * @example
   * const state = new GridState(gridMask);
   * const stateWithIndexer = new GridState(gridMask, hexIndexer);
   */
  constructor (mask, indexer = null) {
    this.mask = mask
    this.indexer = indexer
  }

  /**
   * Get current actions object from mask.
   *
   * Retrieves the actions object containing transform maps, symmetry classification,
   * and methods for applying transforms. Returns null if actions are unavailable.
   *
   * @function getCurrentActions
   * @returns {TransformActions|null} Actions object with transform maps and methods, or null
   * @private
   */
  getCurrentActions () {
    return this.mask?.actions ?? null
  }

  /**
   * Check if morphology operation would change the current mask.
   *
   * Queries whether applying the specified morphology operation (dilate, erode, or cross)
   * would result in a different mask. Uses checkMorphologyState for the determination.
   *
   * @function canApplyMorphology
   * @param {MorphologyOperation} operation - Operation name: 'dilate', 'erode', or 'cross'
   * @returns {boolean} True if operation would change mask, false if it would have no effect
   * @example
   * if (state.canApplyMorphology('dilate')) {
   *   // Grid can be expanded
   * }
   */
  canApplyMorphology (operation) {
    return checkMorphologyState(this.mask, operation)
  }

  /**
   * Get morphology operation capabilities for current mask.
   *
   * Returns a snapshot of which morphology operations (dilate, erode, cross) would
   * currently have an effect on the mask. Useful for disabling UI buttons or
   * preventing no-op operations. Safe to call even if mask is unavailable.
   *
   * @function getMorphologyCapabilities
   * @returns {MorphologyCapabilities} Object with boolean flags for each operation
   * @example
   * const caps = state.getMorphologyCapabilities();
   * buttonDilate.disabled = !caps.canDilate;
   * buttonErode.disabled = !caps.canErode;
   * buttonCross.disabled = !caps.canCross;
   */
  getMorphologyCapabilities () {
    return {
      canDilate: this.canApplyMorphology('dilate'),
      canErode: this.canApplyMorphology('erode'),
      canCross: this.canApplyMorphology('cross')
    }
  }

  /**
   * Check if dilate operation is disabled due to grid at full capacity.
   *
   * Returns true if the grid has reached maximum size and cannot expand further.
   * This check uses the fullMask bitboard to determine if all cells are occupied.
   * Returns false if fullMask is unavailable (no capacity limit).
   *
   * @function isDilateDisabled
   * @returns {boolean} True if grid is at maximum size and dilate is disabled
   * @example
   * if (state.isDilateDisabled()) {
   *   // Grid is completely full, cannot expand
   * }
   */
  isDilateDisabled () {
    const mask = this.mask
    if (!mask?.fullMask) return false
    return isBitboardFull(mask.bits, mask.fullMask?.bits ?? -1)
  }

  /**
   * Get transform capabilities for current mask.
   *
   * Returns flags indicating which transforms (rotations and flips) would change
   * the current mask. Returns all false if transform maps are unavailable.
   * Handles errors gracefully by returning safe defaults.
   *
   * @function getTransformCapabilities
   * @returns {TransformCapabilities} Object with boolean flags for each transform
   * @example
   * const caps = state.getTransformCapabilities();
   * console.log(`Can rotate CW: ${caps.canRotateCW}`);
   * console.log(`Can flip horizontal: ${caps.canFlipH}`);
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
   * Retrieve actions object with transform maps available.
   *
   * Safely retrieves actions and verifies that transformMaps are available.
   * Handles null/undefined gracefully and prevents repeated property access.
   *
   * @function _getActionsWithTransformMaps
   * @returns {TransformActions|null} Actions object with transformMaps, or null if unavailable
   * @private
   */
  _getActionsWithTransformMaps () {
    const actions = this.getCurrentActions()
    if (!actions?.transformMaps) return null
    return actions
  }

  /**
   * Check if indexed transform map would change the mask.
   *
   * Consolidates logic for checking if a specific indexed transform (rotation or flip)
   * identified by key would result in a different mask. Used internally for both
   * rotation and flip capability checks.
   *
   * @function _canApplyIndexedTransform
   * @param {string} mapKey - Transform key in transformMaps ('r90', 'r270', 'fx', 'fy')
   * @param {TransformActions} actions - Actions object from getCurrentActions()
   * @returns {boolean} True if transform would change mask, false otherwise
   * @private
   */
  _canApplyIndexedTransform (mapKey, actions) {
    const map = actions.transformMaps[mapKey]
    const template = actions.template
    return this._canApplyTransform(map, template, actions)
  }

  /**
   * Core helper to check if a transform map would change the mask.
   *
   * Core logic for all transform capability checks. Applies the transform map to the
   * template and compares result. Returns false if map/template/applyMap are unavailable
   * or if an error occurs during application. Errors are silently caught and treated
   * as "transform unavailable" (safe default).
   *
   * @function _canApplyTransform
   * @param {*|null} map - Transform map to apply, or null
   * @param {*} template - Original template bitboard to compare against
   * @param {TransformActions} actions - Actions object with applyMap method
   * @returns {boolean} True if applying map changes template, false if no change or error
   * @private
   */
  _canApplyTransform (map, template, actions) {
    if (!map) return false
    if (!actions.applyMap || typeof actions.applyMap !== 'function')
      return false

    try {
      return actions.applyMap(map) !== template
    } catch {
      // Silently handle error and treat as "no change"
      return false
    }
  }

  /**
   * Get rotation or flip capability using indexed transform map.
   *
   * Checks if a transform at a specific index/key in the transformMaps object would
   * change the mask. This method supports indexed transforms for hexagonal grids
   * which may have multiple rotation/reflection variations. Returns false if
   * actions or map are unavailable.
   *
   * @function canApply
   * @param {number|string} mapIndex - Index or key of rotation/flip map in transformMaps
   * @returns {boolean} True if transform would change mask, false if no change or unavailable
   * @example
   * if (state.canApply('r90')) {
   *   // Grid can be rotated 90° clockwise
   * }
   */
  canApply (mapIndex) {
    const actions = this._getActionsWithTransformMaps()
    if (!actions) return false

    const map = actions.transformMaps[mapIndex]
    const template = actions.template
    return this._canApplyTransform(map, template, actions)
  }

  /**
   * Get current symmetry classification of the mask.
   *
   * Queries the actions object for the current symmetry classification of the mask.
   * Uses the classifyOrbitType function if available. Returns 'n/a' if classification
   * is unavailable, if the method doesn't exist, or if an error occurs during evaluation.
   * Common symmetry classes include 'C1', 'C2', 'C4', 'D1', 'D2', 'D4' for rectangular grids
   * and additional classes for hexagonal grids.
   *
   * @function getSymmetry
   * @returns {string} Symmetry class name (e.g., 'C4', 'D2') or 'n/a' if unavailable
   * @throws {void} Silently catches errors and returns 'n/a'
   * @example
   * const symmetry = state.getSymmetry();
   * console.log(`Mask has ${symmetry} symmetry`);
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
   * Clone the current mask state for non-mutating operations.
   *
   * Returns a clone of the mask for non-mutating operations or branching state.
   * The clone is obtained from the mask's clone property if available. Useful
   * for creating separate state branches without modifying the original.
   *
   * @function cloneBits
   * @returns {*|null} Clone of mask.bits, or null if unavailable
   * @example
   * const cloned = state.cloneBits();
   * if (cloned !== null) {
   *   // Perform operations on cloned state without affecting original
   * }
   */
  cloneBits () {
    if (!this.mask?.clone) return null
    return this.mask.clone
  }

  /**
   * Check if mask is empty (no cells occupied).
   *
   * Compares current bits against emptyMask to determine if no cells are occupied.
   * Returns true if mask equals empty state or if bits are undefined/falsy.
   * If emptyMask is unavailable, defaults to comparing against 0.
   *
   * @function isEmpty
   * @returns {boolean} True if mask has no bits set or matches emptyMask
   * @example
   * if (state.isEmpty()) {
   *   console.log('Grid is empty, no cells occupied');
   * }
   */
  isEmpty () {
    if (!this.mask?.bits) return true
    // isEmpty when bits equal emptyMask (no differences), so NOT changed
    return !bitsChanged(this.mask.bits, this.mask.emptyMask?.bits ?? 0)
  }

  /**
   * Check if mask is full (all cells occupied).
   *
   * Compares current bits against fullMask to determine if all cells are occupied.
   * Returns false if mask is unavailable. If fullMask is unavailable, defaults to
   * comparing against -1 (all bits set in typical bitboard representation).
   *
   * @function isFull
   * @returns {boolean} True if all bits are set in mask or matches fullMask
   * @example
   * if (state.isFull()) {
   *   console.log('Grid is completely full');
   * }
   */
  isFull () {
    if (!this.mask) return false
    return isBitboardFull(this.mask.bits, this.mask.fullMask?.bits ?? -1)
  }
}
