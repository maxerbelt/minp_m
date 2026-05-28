/**
 * @file Hybrid.js - Multi-terrain hybrid ship implementation
 * @description Represents hybrid ships that span multiple terrain types (e.g., part water, part asteroid).
 * Extends Shape to handle composite ships with primary and secondary terrain-specific sub-components.
 * Manages displacement calculations across different terrain types and variant generation.
 */

import { errorMsg } from '../core/errorMsg.js'
import { mixed } from '../terrains/all/js/terrain.js'
import { Variant3 } from '../variants/Variant3.js'
import { Shape } from './Shape.js'

/** @typedef {import('../terrains/all/js/SubTerrain.js').SubTerrain} SubTerrain */
/** @typedef {import('../grid/rectangle/mask.js').Mask} Mask */

/**
 * Coordinate pair representing [x, y] position
 * @typedef {[number, number]} CoordinatePair
 */

/**
 * Sub-shape component within a hybrid ship
 * @typedef {Object} SubShape
 * @property {Mask} board - Board mask representing occupancy for this sub-shape component
 * @property {SubTerrain} subterrain - Terrain type (water, asteroid, etc.) for this component
 * @property {number} [faction] - Calculated fractional area contribution (occupancy / total area) after dimension normalization
 * @property {Function} [setBoardFromSecondary] - Method to merge secondary board into primary shape board
 * @property {Function} [expand] - Optional board expansion method for dimension matching during resize
 */

/**
 * Array of layer boards for multi-bit depth storage
 * @typedef {Array<Mask>} LayerBoards
 */

/**
 * Hybrid ship combining multiple sub-shapes across different terrain types
 *
 * Extends Shape to support composite ships that span multiple terrain regions.
 * Examples: Ships that occupy both water and asteroid, or sea and land areas.
 * Each sub-shape has its own terrain type and board representation.
 *
 * @class Hybrid
 * @extends Shape
 * @example
 * const hybrid = new Hybrid(
 *   'Amphibious Cruiser',
 *   'X',
 *   'diagonal',
 *   [[0,0], [0,1], [1,0], [1,1]],
 *   [primarySubShape, secondarySubShape]
 * )
 */
export class Hybrid extends Shape {
  /**
   * Creates a hybrid ship with multiple sub-groups spanning different terrain types
   *
   * Initializes sub-group references, processes boards for dimensional consistency,
   * and applies layer board merging. Sets ship type to 'mixed' terrain.
   *
   * @constructor
   * @param {string} description - Human-readable description (e.g., 'Amphibious Cruiser')
   * @param {string} letter - Single character identifier for ship type
   * @param {string} symmetry - Symmetry type: 'single', 'diagonal', 'orthogonal', etc.
   * @param {Array<CoordinatePair>} cells - Cell coordinates defining composite ship shape
   * @param {Array<SubShape>} subGroups - Sub-shape components with terrain-specific boards (first is primary)
   * @param {string} [tip] - Optional placement instruction text
   * @param {Set<string>|Array<string>|Array<CoordinatePair>|null} [racks] - Weapon rack positions
   * @throws {Error} If sub-group boards cannot be expanded to match primary dimensions
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
    this.notes = []
  }

  /**
   * Initializes and processes all sub-groups for dimensional consistency
   *
   * Orchestrates the entire sub-group initialization pipeline:
   * 1. Separates primary (first) and secondary sub-groups
   * 2. Processes secondary groups and builds layer boards
   * 3. Applies layer boards to primary board for multi-color support
   * 4. Processes primary sub-group
   * 5. Stores references for later access
   *
   * @param {Array<SubShape>} subGroups - All sub-shape components (first is primary)
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
   * Builds processed layer boards for secondary sub-groups
   *
   * Transforms secondary groups into layer boards by processing each against
   * the primary group board. Used for multi-color bitboard representation.
   *
   * @param {Array<SubShape>} secondaryGroups - Secondary sub-shape components to process
   * @param {SubShape} primaryGroup - Primary sub-shape for reference board dimensions
   * @returns {LayerBoards} Array of processed layer boards ready for application
   * @private
   */
  _buildSecondaryLayerBoards (secondaryGroups, primaryGroup) {
    return secondaryGroups.map(group =>
      this._processSecondaryGroup(group, primaryGroup)
    )
  }

  /**
   * Processes a secondary sub-group and returns its board
   *
   * Fixes dimensions and merges the secondary board into the primary board
   * using the sub-group's setBoardFromSecondary method. Returns the processed
   * secondary board for layer application.
   *
   * @param {SubShape} subGroup - Secondary sub-shape to process
   * @param {SubShape} primaryGroup - Primary sub-shape containing target board
   * @returns {Mask} The processed secondary board after board merging
   * @private
   */
  _processSecondaryGroup (subGroup, primaryGroup) {
    this._fixSubGroupDimensions(subGroup)
    primaryGroup.setBoardFromSecondary(this.board, subGroup.board)
    return subGroup.board
  }

  /**
   * Processes the primary sub-group dimensions
   *
   * Ensures primary sub-group board dimensions match the main ship board.
   * Sets the faction value for displacement calculations.
   *
   * @param {SubShape} primaryGroup - Primary sub-shape to process
   * @private
   */
  _processPrimarySubGroup (primaryGroup) {
    this._fixSubGroupDimensions(primaryGroup)
  }

  /**
   * Fixes sub-group board dimensions to match main ship board
   *
   * Expands or validates sub-group board to match main board width/height.
   * Calculates and stores faction (area ratio) for displacement calculations.
   *
   * @param {SubShape} subGroup - Sub-group board needing dimension normalization
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
   *
   * Checks that the sub-group board has an expand method, then resizes
   * the board to match the main ship board dimensions.
   *
   * @param {SubShape} subGroup - Sub-group to expand
   * @param {number} width - Required board width in cells
   * @param {number} height - Required board height in cells
   * @private
   */
  _validateAndExpandSubGroupBoard (subGroup, width, height) {
    this._assertBoardCanExpand(subGroup)
    subGroup.board = subGroup.board.expand(width, height)
  }

  /**
   * Validates that sub-group board supports expansion
   *
   * Ensures the sub-group board has an expand method required for
   * dimension matching. Throws error if expansion is not supported.
   *
   * @param {SubShape} subGroup - Sub-group board to validate
   * @throws {Error} If board lacks expand method or is invalid
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
   * Applies layer boards to the main hybrid board
   *
   * Merges multiple layer boards (representing different terrain types)
   * into the main board for multi-color bitboard representation.
   * Called when layer boards exist and need to be integrated.
   *
   * @param {LayerBoards} layerBoards - Layer boards to merge into main board
   * @private
   */
  _applyLayerBoards (layerBoards) {
    if (layerBoards.length > 0) {
      this.board.addLayers(layerBoards)
    }
  }

  /**
   * Stores sub-group references for later hybrid operations
   *
   * Saves primary, secondary, and all sub-groups for use in
   * displacement calculations and variant generation.
   *
   * @param {SubShape} primaryGroup - Primary sub-shape (index 0)
   * @param {Array<SubShape>} secondaryGroups - Secondary sub-shapes (index 1+)
   * @param {Array<SubShape>} subGroups - Complete list of all sub-shapes
   * @private
   */
  _saveSubGroupReferences (primaryGroup, secondaryGroups, subGroups) {
    this.primary = primaryGroup
    this.secondary = secondaryGroups[0]
    this.subGroups = subGroups
  }

  /**
   * Calculates displacement contribution for a specific terrain type
   *
   * Sums displacement contributions from all sub-groups matching the given terrain type.
   * Used to determine ship displacement when partially on different terrain types.
   * Formula: sum(group.faction * this.displacement) for matching groups
   *
   * @param {SubTerrain} subterrain - Terrain type to calculate displacement for
   * @returns {number} Total displacement contribution from matching sub-groups (0 if none match)
   * @example
   * const waterDisplacement = hybrid.displacementFor(waterTerrain)
   * const asteroidDisplacement = hybrid.displacementFor(asteroidTerrain)
   */
  displacementFor (subterrain) {
    const groups = this.subGroups.filter(g => g.subterrain === subterrain)
    return groups.reduce(
      (accumulator, group) => accumulator + group.faction * this.displacement,
      0
    )
  }

  /**
   * Gets variant factory for generating hybrid ship rotations
   *
   * Creates or returns cached Variant3 factory for generating ship variants
   * based on primary and secondary sub-groups. Caches result for performance.
   *
   * @returns {Variant3} Variant factory supporting primary/secondary transformations
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
   * Checks if hybrid ship can be placed on a terrain type
   *
   * Hybrid ships can be placed on any terrain type since they span
   * multiple terrain regions with terrain-specific sub-components.
   *
   * @param {SubTerrain} _subterrain - Terrain type (unused, hybrid works on all terrains)
   * @returns {boolean} Always returns true for hybrid ships
   */
  canBeOn (_subterrain) {
    return true
  }

  /**
   * Gets hybrid ship type identifier
   *
   * @returns {string} Type code 'M' for mixed/hybrid terrain ship
   */
  type () {
    return 'M'
  }

  /**
   * Gets sunk status description for hybrid ships
   *
   * @returns {string} Status description when hybrid ship is destroyed ('Destroyed')
   */
  sunkDescription () {
    return 'Destroyed'
  }

  /**
   * Gets human-readable description of the hybrid ship
   *
   * @returns {string} Description text (e.g., 'Amphibious Cruiser')
   */
  description () {
    return this.descriptionText
  }
}
