/**
 * @typedef {Object} MorphologyCapabilities
 * @property {boolean} canDilate - Whether dilate operation would change mask
 * @property {boolean} canErode - Whether erode operation would change mask
 * @property {boolean} canCross - Whether cross operation would change mask
 */

/**
 * @typedef {Object} TransformCapabilities
 * @property {boolean} canRotateCW - Whether clockwise rotation would change mask
 * @property {boolean} canRotateCCW - Whether counter-clockwise rotation would change mask
 * @property {boolean} canFlipH - Whether horizontal flip would change mask
 * @property {boolean} canFlipV - Whether vertical flip would change mask
 */

/**
 * Single source of truth for grid state
 * Encapsulates all state queries without side effects
 */

import {
  checkMorphologyState,
  bitsChanged,
  isBitboardFull
} from './MorphologyOps.js'

/**
 * Queries grid state and capabilities without side effects
 * Supports morphology operations (dilate/erode), transforms (rotate/flip), and symmetry classification
 */
export class GridState {
  /**
   * Initialize grid state with mask and optional indexer
   * @param {Object} mask - The mask object with bits and clone capabilities
   * @param {?Object} indexer - Optional indexer for grid operations
   */
  constructor (mask, indexer = null) {
    this.mask = mask
    this.indexer = indexer
  }

  /**
   * Get current actions from mask
   * @returns {?Object} Actions object with transform maps and methods, or null if unavailable
   */
  getCurrentActions () {
    return this.mask.actions
  }

  /**
   * Check if morphology operation would change the mask
   * @param {string} operation - Operation name: 'dilate', 'erode', or 'cross'
   * @returns {boolean} True if operation would change mask
   */
  canApplyMorphology (operation) {
    return checkMorphologyState(this.mask, operation)
  }

  /**
   * Get morphology operation capabilities
   * @returns {MorphologyCapabilities} Object indicating which operations would change mask
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
   * @returns {boolean} True if grid is at maximum size and cannot dilate
   */
  isDilateDisabled () {
    const mask = this.mask
    if (!mask || !mask.fullMask) return false
    return isBitboardFull(mask.bits, mask.fullMask.bits)
  }

  /**
   * Get transform capabilities for rectangular grids
   * @returns {TransformCapabilities} Object indicating which transforms would change mask
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
   * @private
   * @returns {?Object} Actions object with transformMaps, or null if unavailable
   */
  _getActionsWithTransformMaps () {
    const actions = this.getCurrentActions()
    if (!actions || !actions.transformMaps) return null
    return actions
  }

  /**
   * Check if indexed transform map (rotation or flip) would change the mask
   * Consolidates logic for both canApplyRotation and canApplyFlip
   * @private
   * @param {string} mapKey - Transform key in transformMaps (e.g. 'r90', 'fx')
   * @param {Object} actions - Actions object from getCurrentActions
   * @returns {boolean} True if transform would change mask
   */
  _canApplyIndexedTransform (mapKey, actions) {
    const map = actions.transformMaps[mapKey]
    const template = actions.template
    return this._canApplyTransform(map, template, actions)
  }

  /**
   * Helper to check if a transform map would change the mask
   * @private
   * @param {?Object} map - Transform map to apply
   * @param {any} template - Original template to compare against
   * @param {Object} actions - Actions object with applyMap method
   * @returns {boolean} True if applying map changes template
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
   * Get rotation capability for hex grids using map index
   * @param {number} mapIndex - Index of rotation map in transformMaps array
   * @returns {boolean} True if rotation would change mask
   */
  canApplyRotation (mapIndex) {
    const actions = this._getActionsWithTransformMaps()
    if (!actions) return false

    const map = actions.transformMaps[mapIndex]
    const template = actions.template
    return this._canApplyTransform(map, template, actions)
  }

  /**
   * Get flip capability for hex grids using map index
   * @param {number} mapIndex - Index of flip map in transformMaps array
   * @returns {boolean} True if flip would change mask
   */
  canApplyFlip (mapIndex) {
    const actions = this._getActionsWithTransformMaps()
    if (!actions) return false

    const map = actions.transformMaps[mapIndex]
    const template = actions.template
    return this._canApplyTransform(map, template, actions)
  }

  /**
   * Get current symmetry classification
   * @returns {string} Symmetry class name or 'n/a' if unavailable
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
   * @returns {?any} Clone of mask.bits, or null if unavailable
   */
  cloneBits () {
    if (!this.mask || !this.mask.clone) return null
    return this.mask.clone
  }

  /**
   * Check if mask is empty (all bits unset, matches empty mask)
   * @returns {boolean} True if mask has no bits set
   */
  isEmpty () {
    if (!this.mask || !this.mask.bits) return true
    // isEmpty when bits equal emptyMask (no differences), so NOT changed
    return !bitsChanged(this.mask.bits, this.mask.emptyMask?.bits ?? 0)
  }

  /**
   * Check if mask is full (all bits set, matches full mask)
   * @returns {boolean} True if all bits are set in mask
   */
  isFull () {
    if (!this.mask) return false
    return isBitboardFull(this.mask.bits, this.mask.fullMask?.bits ?? -1)
  }
}
