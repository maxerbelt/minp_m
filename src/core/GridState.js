/**
 * Single source of truth for grid state
 * Encapsulates all state queries without side effects
 */

import {
  checkMorphologyState,
  computeMorphologyState,
  bitsChanged,
  isBitboardFull
} from './MorphologyOps.js'

export class GridState {
  /**
   * Initialize grid state with mask and optional indexer
   * @param {Object} mask - The mask object with bits and clone capabilities
   * @param {Object} indexer - Optional indexer for grid operations
   */
  constructor (mask, indexer = null) {
    this.mask = mask
    this.indexer = indexer
  }

  /**
   * Get current actions from mask
   * @returns {Object} Actions object with transform maps and methods
   */
  getCurrentActions () {
    return this.mask.actions
  }

  /**
   * Check if morphology operation would change the mask
   * @param {string} operation - 'dilate', 'erode', or 'cross'
   * @returns {boolean} True if operation would change mask
   */
  canApplyMorphology (operation) {
    return checkMorphologyState(this.mask, operation)
  }

  /**
   * Get morphology operation capabilities
   * @returns {Object} { canDilate, canErode, canCross }
   */
  getMorphologyCapabilities () {
    return {
      canDilate: this.canApplyMorphology('dilate'),
      canErode: this.canApplyMorphology('erode'),
      canCross: this.canApplyMorphology('cross')
    }
  }

  /**
   * Check if dilate is disabled (grid is full)
   * @returns {boolean} True if grid is at full capacity
   */
  isDilateDisabled () {
    const mask = this.mask
    if (!mask || !mask.fullMask) return false
    return isBitboardFull(mask.bits, mask.fullMask.bits)
  }

  /**
   * Get transform capabilities for rectangular grids
   * @returns {Object} { canRotateCW, canRotateCCW, canFlipH, canFlipV }
   */
  getTransformCapabilities () {
    const actions = this.getCurrentActions()
    if (!actions || !actions.transformMaps) {
      return {
        canRotateCW: false,
        canRotateCCW: false,
        canFlipH: false,
        canFlipV: false
      }
    }

    const maps = actions.transformMaps
    const template = actions.template

    return {
      canRotateCW: this._canApplyTransform(maps.r90, template, actions),
      canRotateCCW: this._canApplyTransform(maps.r270, template, actions),
      canFlipH: this._canApplyTransform(maps.fx, template, actions),
      canFlipV: this._canApplyTransform(maps.fy, template, actions)
    }
  }

  /**
   * Helper to check if a transform map would change the mask
   * @private
   */
  _canApplyTransform (map, template, actions) {
    if (!map) return false
    try {
      if (actions.applyMap) {
        return actions.applyMap(map) !== template
      }
    } catch {
      return false
    }
    return false
  }

  /**
   * Get rotation capability for hex grids
   * @param {number} mapIndex - Index of rotation map
   * @returns {boolean} True if rotation would change mask
   */
  canApplyRotation (mapIndex) {
    const actions = this.getCurrentActions()
    if (!actions || !actions.transformMaps) return false

    const maps = actions.transformMaps
    const map = maps[mapIndex]
    const template = actions.template

    return this._canApplyTransform(map, template, actions)
  }

  /**
   * Get flip capability for hex grids
   * @param {number} mapIndex - Index of flip map
   * @returns {boolean} True if flip would change mask
   */
  canApplyFlip (mapIndex) {
    const actions = this.getCurrentActions()
    if (!actions || !actions.transformMaps) return false

    const maps = actions.transformMaps
    const map = maps[mapIndex]
    const template = actions.template

    return this._canApplyTransform(map, template, actions)
  }

  /**
   * Get current symmetry classification
   * @returns {string} Symmetry class name or 'n/a'
   */
  getSymmetry () {
    try {
      const actions = this.getCurrentActions()
      if (
        actions?.classifyActionGroup &&
        typeof actions.classifyActionGroup === 'function'
      ) {
        return actions.classifyActionGroup()
      }
    } catch {
      // Silently handle error
    }
    return 'n/a'
  }

  /**
   * Clone the current state (for testing or branching)
   * @returns {Object} Clone of mask.bits
   */
  cloneBits () {
    if (!this.mask || !this.mask.clone) return null
    return this.mask.clone
  }

  /**
   * Check if mask is empty
   * @returns {boolean} True if no bits are set
   */
  isEmpty () {
    if (!this.mask || !this.mask.bits) return true
    return bitsChanged(this.mask.bits, this.mask.emptyMask?.bits ?? 0)
  }

  /**
   * Check if mask is full
   * @returns {boolean} True if all bits are set
   */
  isFull () {
    if (!this.mask) return false
    return isBitboardFull(this.mask.bits, this.mask.fullMask?.bits ?? -1)
  }
}
