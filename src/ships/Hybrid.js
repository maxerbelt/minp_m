import { errorMsg } from '../core/errorMsg.js'
import { mixed } from '../terrains/all/js/terrain.js'
import { Variant3 } from '../variants/Variant3.js'
import { Mask } from '../grid/rectangle/mask.js'
import { Shape } from './Shape.js'

/**
 * @typedef {[number, number]} CoordinatePair
 */

/**
 * @typedef {Object} SubShape
 * @property {Mask} board - Board representing the sub-shape occupancy
 * @property {string} subterrain - Terrain type for this sub-shape
 * @property {number} [faction] - Fractional area contribution after dimension fix
 * @property {Function} [setBoardFromSecondary] - Method to attach secondary board into primary shape
 * @property {Function} [expand] - Optional board expand method when resizing is required
 */

/**
 * @typedef {Array<Mask>} LayerBoards
 */

/**
 * Hybrid - A ship that combines multiple sub-shapes with different terrain requirements
 * Extends Shape to handle composite ships with primary and secondary components
 * @extends Shape
 */
export class Hybrid extends Shape {
  /**
   * Creates a hybrid ship with multiple sub-groups
   * @param {string} description - Human-readable description of the hybrid ship
   * @param {string} letter - Single character identifier for the ship
   * @param {string} symmetry - Symmetry type for variant generation
   * @param {Array<[number, number]>} cells - Cell coordinates defining ship shape
   * @param {Array<SubShape>} subGroups - Array of sub-shapes with different terrain requirements
   * @param {string} [tip] - Optional placement tip
   * @param {Set<string>|Array<string>|Array<[number, number]>|null} [racks] - Weapon rack coordinates
   */
  constructor (description, letter, symmetry, cells, subGroups, tip, racks) {
    super(
      letter,
      symmetry,
      cells,
      'X',
      tip || `place ${description} so that the parts are in the correct area`,
      racks
    )

    this._initializeSubGroups(subGroups)
    this.descriptionText = description
    this.subterrain = mixed
  }

  /**
   * Initializes and processes all sub-groups
   * @param {Array<SubShape>} subGroups - Array of sub-shapes to process
   * @private
   */
  _initializeSubGroups (subGroups) {
    const [head, ...tail] = subGroups
    const layerBoards = this._buildSecondaryLayerBoards(tail, head)

    this._applyLayerBoards(layerBoards)
    this._processPrimarySubGroup(head)
    this._saveSubGroupReferences(head, tail, subGroups)
  }

  /**
   * Builds processed layer boards for secondary sub-groups.
   * @param {Array<SubShape>} secondaryGroups - Secondary sub-groups
   * @param {SubShape} primaryGroup - Primary group for board reference
   * @returns {LayerBoards} Array of layer boards
   * @private
   */
  _buildSecondaryLayerBoards (secondaryGroups, primaryGroup) {
    return secondaryGroups.map(group =>
      this._processSecondaryGroup(group, primaryGroup)
    )
  }

  /**
   * Processes a secondary sub-group and returns its board.
   * @param {SubShape} subGroup - Secondary sub-group to process
   * @param {SubShape} primaryGroup - Primary sub-group for board reference
   * @returns {Mask} The processed secondary board
   * @private
   */
  _processSecondaryGroup (subGroup, primaryGroup) {
    this._fixSubGroupDimensions(subGroup)
    primaryGroup.setBoardFromSecondary(this.board, subGroup.board)
    return subGroup.board
  }

  /**
   * Processes the primary sub-group
   * @param {SubShape} primaryGroup - Primary sub-group to process
   * @private
   */
  _processPrimarySubGroup (primaryGroup) {
    this._fixSubGroupDimensions(primaryGroup)
  }

  /**
   * Fixes sub-group board dimensions to match main board
   * @param {SubShape} subGroup - Sub-group whose board needs dimension fixing
   * @private
   */
  _fixSubGroupDimensions (subGroup) {
    const width = this.board.width
    const height = this.board.height

    if (subGroup.board.width !== width || subGroup.board.height !== height) {
      this._validateAndExpandSubGroupBoard(subGroup, width, height)
    }

    subGroup.faction = subGroup.board.occupancy / this.area
  }

  /**
   * Validates and expands sub-group board to required dimensions
   * @param {SubShape} subGroup - Sub-group to expand
   * @param {number} width - Required width
   * @param {number} height - Required height
   * @private
   */
  _validateAndExpandSubGroupBoard (subGroup, width, height) {
    this._assertBoardCanExpand(subGroup)
    subGroup.board = subGroup.board.expand(width, height)
  }

  /**
   * Internal: Assert that the subgroup board supports expansion.
   * @param {SubShape} subGroup - Subgroup being validated
   * @throws {Error} If the subgroup board cannot be expanded
   * @private
   */
  _assertBoardCanExpand (subGroup) {
    if (typeof subGroup?.board?.expand !== 'function') {
      console.warn(
        'Subgroup board does not have an expand method:',
        subGroup.board
      )
      throw new Error(
        errorMsg('Subgroup board must have an expand method', subGroup.board)
      )
    }
  }

  /**
   * Applies a set of layer boards to the hybrid main board.
   * @param {LayerBoards} layerBoards - Layer boards to attach to the main board
   * @private
   */
  _applyLayerBoards (layerBoards) {
    if (layerBoards.length > 0) {
      this.board.addLayers(layerBoards)
    }
  }

  /**
   * Store subgroup references for later hybrid behavior.
   * @param {SubShape} primaryGroup - Primary subgroup
   * @param {Array<SubShape>} secondaryGroups - Secondary subgroups
   * @param {Array<SubShape>} subGroups - Original subgroup list
   * @private
   */
  _saveSubGroupReferences (primaryGroup, secondaryGroups, subGroups) {
    this.primary = primaryGroup
    this.secondary = secondaryGroups[0]
    this.subGroups = subGroups
  }

  /**
   * Calculates displacement contribution for a specific subterrain type
   * @param {string} subterrain - Subterrain type to calculate displacement for
   * @returns {number} Displacement contribution from matching sub-groups
   */
  displacementFor (subterrain) {
    const groups = this.subGroups.filter(g => g.subterrain === subterrain)
    return groups.reduce(
      (accumulator, group) => accumulator + group.faction * this.displacement,
      0
    )
  }

  /**
   * Gets variant factory for hybrid ship
   * @returns {Variant3} Variant factory with primary and secondary sub-groups
   */
  variants () {
    if (this._variants) return this._variants
    this._variants = new Variant3(
      this.board,
      [this.primary, this.secondary],
      this.symmetry
    )
    return this._variants
  }

  /**
   * @param {string} _subterrain - Subterrain to match (ignored for hybrid)
   * @returns {boolean} True for all subterrain types in hybrid ships
   */
  canBeOn (_subterrain) {
    return true
  }

  /**
   * Gets hybrid ship type identifier
   * @returns {string} Type code 'M' for mixed/hybrid
   */
  type () {
    return 'M'
  }

  /**
   * Gets sunk description for hybrid ships
   * @returns {string} Sunk status description
   */
  sunkDescription () {
    return 'Destroyed'
  }

  /**
   * Gets human-readable description
   * @returns {string} Ship description text
   */
  description () {
    return this.descriptionText
  }
}
