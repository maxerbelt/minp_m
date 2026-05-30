/**
 * @file Hybrid.js - Multi-terrain hybrid ship implementation
 * @description Represents hybrid ships that span multiple terrain types (e.g., part water, part asteroid).
 * Extends Shape to handle composite ships with primary and secondary terrain-specific sub-components.
 * Manages displacement calculations across different terrain types and variant generation.
 * @author Game Engine Team
 * @version 1.0.0
 */

/** @typedef {Object} SubGroupObject - Internal sub-group reference object */
/** @typedef {Object} VariantFactory - Cached variant generation factory */
/** @typedef {Object<string, number>} DisplacementMap - Terrain-to-displacement mapping */

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
 * @property {number} [faction] - Calculated fractional area contribution (occupancy / total area) after dimension normalization (0.0-1.0)
 * @property {Function} [setBoardFromSecondary] - Method to merge secondary board into primary shape board
 * @property {Function} [expand] - Optional board expansion method for dimension matching during resize
 * @property {string} [description] - Optional terrain-specific description text
 */

/**
 * Array of layer boards for multi-bit depth storage
 * @typedef {Array<Mask>} LayerBoards
 */

/**
 * Hybrid ship variant factory for generating rotations/reflections
 * @typedef {Object} Variant3Factory
 * @property {Function} totalVariants - Getter for total available variants
 * @property {Function} variant - Method to retrieve variant at index
 * @property {Function} boardFor - Method to get board for variant at index
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
   * Validates that sub-group boards can be expanded to match primary board dimensions.
   *
   * @constructor
   * @param {string} description - Human-readable description (e.g., 'Amphibious Cruiser')
   * @param {string} letter - Single character identifier for ship type (A-Z)
   * @param {string} symmetry - Symmetry type: 'single', 'diagonal', 'orthogonal', etc.
   * @param {Array<CoordinatePair>} cells - Cell coordinates defining composite ship shape ([x, y] pairs)
   * @param {Array<SubShape>} subGroups - Sub-shape components with terrain-specific boards (minimum 2: primary + secondary)
   * @param {string} [tip] - Optional placement instruction text
   * @param {Set<string>|Array<string>|Array<CoordinatePair>|null} [racks] - Weapon rack positions
   * @throws {TypeError} If sub-group board lacks expand method or is invalid
   * @see Shape for parent class implementation
   * @see Variant3 for variant generation details
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
    /**
     * Human-readable description of the hybrid ship
     * @type {string}
     * @private
     */
    this.descriptionText = description

    /**
     * Terrain type for this hybrid (always 'mixed')
     * @type {SubTerrain}
     * @public
     */
    this.subterrain = mixed

    /**
     * Array of optional notes or metadata
     * @type {Array<string>}
     * @public
     */
    this.notes = []
  }

  /**
   * Primary sub-group component
   * @type {SubShape}
   * @public
   */
  primary

  /**
   * Secondary sub-group component (first secondary group)
   * @type {SubShape|undefined}
   * @public
   */
  secondary

  /**
   * All sub-group components (primary + secondary)
   * @type {Array<SubShape>}
   * @public
   */
  subGroups

  /**
   * Cached variant factory for performance
   * @type {Variant3Factory|undefined}
   * @private
   */
  _variants

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
   * @param {Array<SubShape>} subGroups - All sub-shape components (first is primary, minimum length 1)
   * @returns {void}
   * @throws {TypeError} If sub-groups cannot be properly initialized
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
   * Each secondary group is processed and its board is added to the result array.
   *
   * @param {Array<SubShape>} secondaryGroups - Secondary sub-shape components to process (can be empty)
   * @param {SubShape} primaryGroup - Primary sub-shape for reference board dimensions
   * @returns {LayerBoards} Array of processed layer boards ready for application (ordered by secondary index)
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
   * secondary board for layer application. Updates sub-group faction value.
   *
   * @param {SubShape} subGroup - Secondary sub-shape to process (must have board and setBoardFromSecondary)
   * @param {SubShape} primaryGroup - Primary sub-shape containing target board
   * @returns {Mask} The processed secondary board after board merging (never null)
   * @throws {TypeError} If subGroup.board lacks expand method
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
   * Sets the faction value for displacement calculations based on occupancy.
   *
   * @param {SubShape} primaryGroup - Primary sub-shape to process (must have board)
   * @returns {void}
   * @throws {TypeError} If primaryGroup.board lacks expand method or is invalid
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
   * Faction represents the fraction of total occupancy this sub-group contributes.
   *
   * @param {SubShape} subGroup - Sub-group board needing dimension normalization (must have board)
   * @returns {void}
   * @throws {TypeError} If subGroup.board.expand method is not available
   * @private
   */
  _fixSubGroupDimensions (subGroup) {
    const width = this.board.width
    const height = this.board.height

    if (subGroup.board.width !== width || subGroup.board.height !== height) {
      this._validateAndExpandSubGroupBoard(subGroup, width, height)
    }

    // Calculate faction: occupancy ratio for displacement calculations
    subGroup.faction = subGroup.board.occupancy / this.area
  }

  /**
   * Validates and expands sub-group board to required dimensions
   *
   * Checks that the sub-group board has an expand method, then resizes
   * the board to match the main ship board dimensions. Mutates the subGroup's board.
   *
   * @param {SubShape} subGroup - Sub-group to expand (must have valid board)
   * @param {number} width - Required board width in cells (>= 0)
   * @param {number} height - Required board height in cells (>= 0)
   * @returns {void}
   * @throws {TypeError} If board lacks expand method
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
   * dimension matching. Throws TypeError if expansion is not supported.
   * This is a type safety check to prevent invalid board states.
   *
   * @param {SubShape} subGroup - Sub-group board to validate (must not be null/undefined)
   * @returns {void}
   * @throws {TypeError} If board lacks expand method (type incompatibility)
   * @private
   */
  _assertBoardCanExpand (subGroup) {
    if (typeof subGroup?.board?.expand !== 'function') {
      throw new TypeError(
        errorMsg('Subgroup board must have an expand method', subGroup.board)
      )
    }
  }

  /**
   * Applies layer boards to the main hybrid board
   *
   * Merges multiple layer boards (representing different terrain types)
   * into the main board for multi-color bitboard representation.
   * Only applies if layer boards array is non-empty. Mutates this.board.
   *
   * @param {LayerBoards} layerBoards - Layer boards to merge into main board (can be empty)
   * @returns {void}
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
   * displacement calculations and variant generation. Initializes
   * instance properties with normalized references.
   *
   * @param {SubShape} primaryGroup - Primary sub-shape (index 0, must not be null)
   * @param {Array<SubShape>} secondaryGroups - Secondary sub-shapes (index 1+, can be empty)
   * @param {Array<SubShape>} subGroups - Complete list of all sub-shapes (must include primaryGroup)
   * @returns {void}
   * @private
   */
  _saveSubGroupReferences (primaryGroup, secondaryGroups, subGroups) {
    this.primary = primaryGroup
    this.secondary = secondaryGroups[0] // undefined if no secondary groups
    this.subGroups = subGroups
  }

  /**
   * Calculates displacement contribution for a specific terrain type
   *
   * Sums displacement contributions from all sub-groups matching the given terrain type.
   * Used to determine ship displacement when partially on different terrain types.
   * Formula: sum(group.faction * this.displacement) for all groups where group.subterrain === subterrain
   *
   * @param {SubTerrain} subterrain - Terrain type to calculate displacement for (must be valid SubTerrain)
   * @returns {number} Total displacement contribution from matching sub-groups (range: 0.0 to this.displacement)
   * @example
   * const waterDisplacement = hybrid.displacementFor(waterTerrain)
   * const asteroidDisplacement = hybrid.displacementFor(asteroidTerrain)
   * const totalDisplacement = waterDisplacement + asteroidDisplacement // Should equal this.displacement
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
   * Lazy initialization on first call.
   *
   * @returns {Variant3Factory} Variant factory supporting primary/secondary transformations (never null)
   * @see Variant3 for factory implementation details
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
   * This method is implemented as required by the Shape interface.
   *
   * @param {SubTerrain} _subterrain - Terrain type (unused, hybrid works on all terrains)
   * @returns {boolean} Always returns true for hybrid ships (placement universal)
   * @override
   */
  canBeOn (_subterrain) {
    return true
  }

  /**
   * Gets hybrid ship type identifier
   *
   * @returns {string} Type code 'M' for mixed/hybrid terrain ship (mixed terrain identifier)
   * @override
   */
  type () {
    return 'M'
  }

  /**
   * Gets sunk status description for hybrid ships
   *
   * @returns {string} Status description when hybrid ship is destroyed ('Destroyed')
   * @override
   */
  sunkDescription () {
    return 'Destroyed'
  }

  /**
   * Gets human-readable description of the hybrid ship
   *
   * Returns the descriptive text provided during construction.
   * Examples: 'Amphibious Cruiser', 'Terrain Hopper', etc.
   *
   * @returns {string} Description text set in constructor (never null or empty)
   * @override
   */
  description () {
    return this.descriptionText
  }
}
